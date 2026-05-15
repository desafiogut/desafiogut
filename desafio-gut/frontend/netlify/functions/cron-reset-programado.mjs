// Cron Reset Programado — REQ-10 (MVP off-chain).
//
// Esta função é destinada a ser disparada às 00:00 (fuso configurável) por
// um cron externo (GitHub Actions / cron-job.org / Netlify Scheduled Functions).
// Não chama TX on-chain — a re-abertura da edição segue manual pela
// coordenação. O que este endpoint faz:
//
//   1. Lê snapshot atual dos lances do blob (programado, edicaoId padrão).
//   2. Apura "menor lance único" off-chain a partir do snapshot.
//   3. Persiste resultado em blob `resultado-programado:{edicaoId}:{dataIso}`.
//   4. Marca "resetado hoje" em blob `ultimo-reset-programado` para idempotência.
//   5. Limpa o blob de lances do programado (lances-programado:{edicaoId})
//      OU dispara `purge-lances` para zerar o estado off-chain. Aqui usamos
//      o store próprio de programado para não interferir com flash.
//
// Idempotência: chamada repetida no mesmo dia (mesma data ISO no fuso config.)
// retorna { ok:true, idempotent:true } sem reprocessar.
//
// Auth: gated por x-admin-token. Sem ADMIN_TOKEN no env → 503.
//
// GET ?dryRun=1 → retorna o que SERIA feito sem persistir.
// POST           → executa o reset.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const BLOB_RESULTADO        = "resultado-programado";
const BLOB_ULTIMO_RESET     = "ultimo-reset-programado";
const BLOB_LANCES_PROGRAMADO = "lances-programado";
const EDICAO_PADRAO         = "R-1";

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[cron-reset] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function dataIsoNoFuso(timezone) {
  const tz = timezone || "America/Sao_Paulo";
  // Formato YYYY-MM-DD no fuso especificado.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz,
  });
  return fmt.format(new Date()); // "2026-05-12"
}

function apurarMenorLanceUnico(lances) {
  // Mesma regra de Vitrine/MercadoLances: menor valor que aparece exatamente 1×.
  if (!Array.isArray(lances) || lances.length === 0) return null;
  const contagem = new Map();
  for (const l of lances) {
    const v = Number(l?.valorCentavos ?? l?.valor);
    if (!Number.isFinite(v)) continue;
    contagem.set(v, (contagem.get(v) || 0) + 1);
  }
  const unicos = [...contagem.entries()]
    .filter(([, c]) => c === 1)
    .map(([v]) => v)
    .sort((a, b) => a - b);
  if (unicos.length === 0) return null;
  const menor = unicos[0];
  const lanceVencedor = lances.find((l) => Number(l?.valorCentavos ?? l?.valor) === menor);
  return {
    valorCentavos: menor,
    endereco:      lanceVencedor?.endereco || null,
    nomeExibicao:  lanceVencedor?.nomeExibicao || null,
    txHash:        lanceVencedor?.txHash || lanceVencedor?.lanceId || null,
  };
}

async function executar({ edicaoId, timezone, dryRun }) {
  const dataIso = dataIsoNoFuso(timezone);
  const storeUltimo = abrirStore(BLOB_ULTIMO_RESET);
  // Idempotência por data no fuso.
  if (storeUltimo) {
    try {
      const reg = await storeUltimo.get(edicaoId, { type: "json" });
      if (reg?.ultimaDataIso === dataIso) {
        return { ok: true, idempotent: true, edicaoId, dataIso, ultimoReset: reg };
      }
    } catch (err) {
      console.warn("[cron-reset] leitura ultimo-reset falhou:", err?.message);
    }
  }

  // 1. Ler snapshot dos lances do programado.
  const storeLances = abrirStore(BLOB_LANCES_PROGRAMADO);
  let snapshot = { lances: [] };
  if (storeLances) {
    try {
      const dados = await storeLances.get(edicaoId, { type: "json" });
      if (dados) snapshot = dados;
    } catch (err) {
      console.warn("[cron-reset] leitura lances-programado falhou:", err?.message);
    }
  }

  // 2. Apurar vencedor off-chain.
  const vencedor = apurarMenorLanceUnico(snapshot.lances || []);

  if (dryRun) {
    return {
      ok: true, dryRun: true,
      edicaoId, dataIso,
      qtdLances: snapshot.lances?.length || 0,
      vencedor,
      acoes: ["persistir resultado", "marcar reset do dia", "limpar lances"],
    };
  }

  // 3. Persistir resultado.
  const resultado = {
    edicaoId,
    dataIso,
    apuradoEm:     new Date().toISOString(),
    qtdLances:     snapshot.lances?.length || 0,
    vencedor,
    snapshot:      snapshot.lances || [],
  };
  const storeResultado = abrirStore(BLOB_RESULTADO);
  if (storeResultado) {
    try { await storeResultado.setJSON(`${edicaoId}:${dataIso}`, resultado); }
    catch (err) { console.warn("[cron-reset] persistir resultado falhou:", err?.message); }
  }

  // 4. Marcar reset do dia.
  if (storeUltimo) {
    try {
      await storeUltimo.setJSON(edicaoId, {
        edicaoId, ultimaDataIso: dataIso,
        ultimoEm: new Date().toISOString(),
        qtdLancesApurados: resultado.qtdLances,
        vencedorEndereco:  vencedor?.endereco ?? null,
      });
    } catch (err) {
      console.warn("[cron-reset] marcar reset falhou:", err?.message);
    }
  }

  // 5. Limpar lances do programado (deixa flash intacto).
  if (storeLances) {
    try { await storeLances.delete(edicaoId); }
    catch (err) { console.warn("[cron-reset] limpar lances falhou:", err?.message); }
  }

  console.info("[cron-reset] concluído", { edicaoId, dataIso, qtdLances: resultado.qtdLances, vencedor: !!vencedor });
  return { ok: true, idempotent: false, edicaoId, dataIso, resultado };
}

export default async (req) => {
  const rl = await aplicarRateLimit(req, "cron-reset", 10);
  if (rl) return rl;
  // Auth: admin (Bearer admin-JWT preferido OR x-admin-token legado).
  const denied = await guardAdmin(req);
  if (denied) return denied;

  const url      = new URL(req.url);
  const edicaoId = url.searchParams.get("edicaoId") || EDICAO_PADRAO;
  const timezone = url.searchParams.get("tz") || process.env.RESET_TIMEZONE || "America/Sao_Paulo";

  if (req.method === "GET") {
    const dryRun = url.searchParams.get("dryRun") === "1";
    const out = await executar({ edicaoId, timezone, dryRun: dryRun || true });
    return jsonResponse(out);
  }

  if (req.method === "POST") {
    const out = await executar({ edicaoId, timezone, dryRun: false });
    return jsonResponse(out);
  }

  return jsonError(405, "metodo_invalido", "use GET (dryRun) ou POST", { allowed: ["GET", "POST"] });
};
