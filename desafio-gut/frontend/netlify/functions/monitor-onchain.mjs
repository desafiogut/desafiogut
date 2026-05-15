// Monitor On-Chain — Mega Comando 3 / Item 4.
//
// Função admin-gated, idealmente disparada a cada 30 min por cron externo
// (GitHub Actions / cron-job.org). Mesmo padrão de cron-reset-programado.mjs
// — Netlify Scheduled Functions NÃO estão configuradas neste projeto.
//
// O que faz:
//   1. Lê o `ultimo-bloco-processado:R-1` no Blob (retomada incremental).
//      Se ausente: arranca de (blocoAtual - JANELA_BLOCOS) para evitar
//      sobrecarregar o RPC na primeira execução.
//   2. Busca eventos LanceDado entre (ultimoBloco+1) e blocoAtual.
//   3. Anomalia 1 (burst): >5 lances do mesmo `lancador` na janela →
//      Sentry.captureMessage(level=warning, tag=onchain_burst).
//   4. Anomalia 2 (outlier de valor): atualiza a média/desvio padrão
//      históricos em `onchain-stats:R-1`. Qualquer valor fora de 3σ vira
//      `onchain_outlier`.
//   5. Persiste `ultimo-bloco-processado:R-1 = blocoAtual` para o próximo run.
//
// GET  ?dryRun=1 → não persiste estado nem dispara alertas, só retorna o que faria.
// POST           → executa e persiste.
//
// Env exigido: RPC_URL (já usado por _lib/contract.mjs). SENTRY_DSN opcional —
// sem ele, captureSecurityAlert vira console.warn estruturado.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { captureSecurityAlert } from "./_lib/sentry-server.mjs";
import { getLanceDadoEvents, getBlocoAtual } from "./_lib/contract.mjs";

const EDICAO_PADRAO       = "R-1";
const BLOB_ULTIMO         = "ultimo-bloco-processado";
const BLOB_STATS          = "onchain-stats";
const JANELA_BLOCOS       = 150;   // ~30 min em Sepolia (~12s/bloco)
const LIMIAR_BURST        = 5;     // lances/lancador na janela
const SIGMA_OUTLIER       = 3;     // valores fora de 3σ disparam alerta
const MIN_AMOSTRAS_STATS  = 20;    // só dispara outlier após N históricos

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[monitor-onchain] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function calcularBurstPorAddr(eventos) {
  const por = new Map();
  for (const ev of eventos) {
    const arr = por.get(ev.lancador) || [];
    arr.push(ev);
    por.set(ev.lancador, arr);
  }
  const bursts = [];
  for (const [lancador, lances] of por) {
    if (lances.length > LIMIAR_BURST) {
      bursts.push({ lancador, count: lances.length, txHashes: lances.map((l) => l.txHash) });
    }
  }
  return bursts;
}

// Atualiza média e desvio padrão running (Welford online algorithm) a partir
// das amostras já persistidas + novas amostras do batch atual.
function atualizarStats(statsAntes, novosValores) {
  let { count, mean, m2 } = statsAntes || { count: 0, mean: 0, m2: 0 };
  for (const v of novosValores) {
    if (!Number.isFinite(v)) continue;
    count += 1;
    const delta  = v - mean;
    mean        += delta / count;
    const delta2 = v - mean;
    m2          += delta * delta2;
  }
  const variancia = count > 1 ? m2 / (count - 1) : 0;
  const sigma     = Math.sqrt(variancia);
  return { count, mean, m2, sigma };
}

function detectarOutliers(eventos, stats) {
  if (!stats || stats.count < MIN_AMOSTRAS_STATS || stats.sigma === 0) return [];
  const out = [];
  for (const ev of eventos) {
    const z = Math.abs((ev.valor - stats.mean) / stats.sigma);
    if (z > SIGMA_OUTLIER) {
      out.push({
        lancador:    ev.lancador,
        valor:       ev.valor,
        z,
        media:       stats.mean,
        sigma:       stats.sigma,
        blockNumber: ev.blockNumber,
        txHash:      ev.txHash,
      });
    }
  }
  return out;
}

async function executar({ edicaoId, dryRun }) {
  const blocoAtual = await getBlocoAtual();

  const storeUltimo = abrirStore(BLOB_ULTIMO);
  let ultimo = null;
  if (storeUltimo) {
    try { ultimo = await storeUltimo.get(edicaoId, { type: "json" }); }
    catch (err) { console.warn("[monitor-onchain] leitura ultimo falhou:", err?.message); }
  }
  const fromBlock = ultimo?.bloco ? ultimo.bloco + 1 : Math.max(0, blocoAtual - JANELA_BLOCOS);
  if (fromBlock > blocoAtual) {
    return {
      ok: true, idempotent: true, edicaoId, blocoAtual, fromBlock,
      message: "fromBlock > blocoAtual — nada a processar",
    };
  }

  // 1) Busca eventos LanceDado.
  let eventos = [];
  try {
    eventos = await getLanceDadoEvents(fromBlock, blocoAtual);
  } catch (err) {
    console.error("[monitor-onchain] getLanceDadoEvents falhou:", err?.message);
    return { ok: false, error: "rpc_falhou", message: err?.message };
  }
  // Filtra somente a edição configurada (o contrato é único e cobre múltiplas edicoes).
  eventos = eventos.filter((ev) => ev.idEdicao === edicaoId);

  // 2) Estatística histórica (recuperar + atualizar).
  const storeStats = abrirStore(BLOB_STATS);
  let statsAntes = null;
  if (storeStats) {
    try { statsAntes = await storeStats.get(edicaoId, { type: "json" }); }
    catch (err) { console.warn("[monitor-onchain] leitura stats falhou:", err?.message); }
  }

  // 3) Análises.
  const bursts   = calcularBurstPorAddr(eventos);
  const outliers = detectarOutliers(eventos, statsAntes);
  const statsDepois = atualizarStats(statsAntes, eventos.map((e) => e.valor));

  // 4) Alertas.
  if (!dryRun) {
    for (const b of bursts) {
      captureSecurityAlert("onchain_burst", {
        edicaoId, lancador: b.lancador, count: b.count,
        limiar: LIMIAR_BURST, txHashes: b.txHashes.slice(0, 10),
      }).catch(() => {});
    }
    for (const o of outliers) {
      captureSecurityAlert("onchain_outlier", {
        edicaoId, lancador: o.lancador, valor: o.valor,
        z: Number(o.z.toFixed(2)),
        media: Number(o.media.toFixed(2)),
        sigma: Number(o.sigma.toFixed(2)),
        blockNumber: o.blockNumber,
        txHash: o.txHash,
      }).catch(() => {});
    }
  }

  // 5) Persistência (skip em dryRun).
  if (!dryRun) {
    if (storeUltimo) {
      try {
        await storeUltimo.setJSON(edicaoId, {
          bloco: blocoAtual,
          processadoEm: new Date().toISOString(),
          eventosNoBatch: eventos.length,
        });
      } catch (err) { console.warn("[monitor-onchain] persistir ultimo falhou:", err?.message); }
    }
    if (storeStats) {
      try {
        await storeStats.setJSON(edicaoId, {
          ...statsDepois,
          atualizadoEm: new Date().toISOString(),
        });
      } catch (err) { console.warn("[monitor-onchain] persistir stats falhou:", err?.message); }
    }
  }

  const sumario = {
    ok: true, edicaoId, fromBlock, blocoAtual,
    eventosProcessados: eventos.length,
    bursts: bursts.length,
    outliers: outliers.length,
    statsAntes:  statsAntes ? { count: statsAntes.count, mean: statsAntes.mean, sigma: statsAntes.sigma } : null,
    statsDepois: { count: statsDepois.count, mean: statsDepois.mean, sigma: statsDepois.sigma },
    dryRun,
  };
  console.info("[monitor-onchain] concluído", sumario);
  return { ...sumario, detalhes: { bursts, outliers } };
}

export default async (req) => {
  const rl = await aplicarRateLimit(req, "monitor-onchain", 6);
  if (rl) return rl;
  const denied = await guardAdmin(req);
  if (denied) return denied;

  const url    = new URL(req.url);
  const edicaoId = url.searchParams.get("edicaoId") || EDICAO_PADRAO;
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    if (req.method === "GET") {
      return jsonResponse(await executar({ edicaoId, dryRun: true }));
    }
    if (req.method === "POST") {
      return jsonResponse(await executar({ edicaoId, dryRun }));
    }
    return jsonError(405, "metodo_invalido", "use GET (dryRun) ou POST", { allowed: ["GET", "POST"] });
  } catch (err) {
    console.error("[monitor-onchain] erro inesperado:", err?.message);
    return jsonError(500, "erro_interno", err?.message || "falha no monitor on-chain");
  }
};
