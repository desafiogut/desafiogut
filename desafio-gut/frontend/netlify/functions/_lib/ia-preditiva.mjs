// Motor IA Preditiva — Mega Comando 8 / Item 3.
//
// Lê os Blobs `analytics:{minuto}:{visitorId}` produzidos por analytics.mjs,
// agrega métricas dos últimos 15 min, compara com média de 60 min e decide se
// dispara um leilão relâmpago automático via _lib/contract.mjs.
//
// Feature flag IA_PREDICTIVA controla o comportamento (env var):
//   - off  → só observa (log)
//   - warn → registra decisão em Sentry + Blob `ia-decisao:{ts}` (default)
//   - auto → executa abrirEdicao() on-chain como coordenacao
//
// Decisão (todas precisam bater):
//   1) usuarios_ativos > 2× média dos últimos 60 min  (excluindo última janela)
//   2) taxa_clique_compra > 15%                       (cliques / ativos da janela)
//   3) tendencia > 0                                  (janela atual > janela anterior)
//
// Cron wrapper: ia-preditiva-scheduled.mjs invoca analisarEngajamento() a cada
// 5 min. Toda execução grava `ia-execucao:{ts}` para auditoria (com ou sem ação).

import { getStore } from "@netlify/blobs";
import { Contract } from "ethers";
import { captureSecurityAlert } from "./sentry-server.mjs";
import { CONTRATO_ADDRESS } from "./contract.mjs";
import { obterSignerCoordenacao, backendAssinatura, resolverChaveCoordenacao } from "./signer.mjs";

const STORE_ANALYTICS = "analytics";
const STORE_DECISOES  = "ia-decisoes";

const JANELA_AVALIACAO_MIN  = 15;
const JANELA_BASELINE_MIN   = 60;

// Thresholds (decidido em DECISÕES TÉCNICAS do MC8).
const THRESHOLD_FATOR_ATIVOS = 2;     // ativos > 2× média da última hora
const THRESHOLD_TAXA_CLIQUE  = 0.15;  // 15%
const THRESHOLD_TENDENCIA    = 0;     // estritamente positivo

// ABI mínimo para abrirEdicao — coerente com CLAUDE.md (3 params).
const ABRIR_EDICAO_ABI = [
  "function abrirEdicao(string idEdicao, string nome, uint256 duracaoSegundos) public",
  "function coordenacao() public view returns (address)",
];

function abrirStore(name) {
  try { return getStore({ name, consistency: "eventual" }); }
  catch (err) {
    console.warn(`[ia-preditiva] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function lerFlag() {
  const raw = String(process.env.IA_PREDICTIVA || "warn").toLowerCase();
  if (raw === "off" || raw === "warn" || raw === "auto") return raw;
  return "warn";
}

/**
 * Soma os registros de analytics dentro de uma janela [minutoInicio, minutoFim].
 * Retorna `{ ativos: Set, eventos: { evento -> count } }`.
 *
 * Observação: minuto é Math.floor(ts/60000). Janela é INCLUSIVA dos dois lados.
 */
async function agregarJanela(store, minutoInicio, minutoFim) {
  const ativos  = new Set();
  const eventos = { pageview: 0, click_botao_comprar: 0, tempo_sessao: 0, scroll: 0 };
  if (!store) return { ativos, eventos };

  // O Netlify Blobs API expõe `list({ prefix })` mas o prefixo "analytics:{min}:"
  // muda a cada minuto. Listamos por minuto individual para minimizar tráfego.
  for (let m = minutoInicio; m <= minutoFim; m++) {
    let resp;
    try { resp = await store.list({ prefix: `analytics:${m}:` }); }
    catch (err) {
      console.warn("[ia-preditiva] list falhou:", { m, message: err?.message });
      continue;
    }
    const blobs = resp?.blobs || [];
    for (const b of blobs) {
      let reg;
      try { reg = await store.get(b.key, { type: "json" }); }
      catch { reg = null; }
      if (!reg) continue;
      if (reg.visitorId) ativos.add(reg.visitorId);
      const evs = reg.eventos || {};
      for (const k of Object.keys(eventos)) {
        eventos[k] += Number(evs[k] || 0);
      }
    }
  }
  return { ativos, eventos };
}

/**
 * Calcula a média de usuarios_ativos por janela de JANELA_AVALIACAO_MIN dentro
 * dos últimos JANELA_BASELINE_MIN minutos (excluindo a janela atual). Resultado
 * em "ativos médios por janela equivalente".
 */
async function mediaBaseline(store, minutoFim) {
  // Janelas históricas: [fim-60, fim-15) divididas em buckets de 15 min.
  const baselineInicio = minutoFim - JANELA_BASELINE_MIN;
  const baselineFim    = minutoFim - JANELA_AVALIACAO_MIN;
  if (baselineFim < baselineInicio) return 0;

  let somaAtivos = 0;
  let janelas    = 0;
  for (let inicio = baselineInicio; inicio <= baselineFim; inicio += JANELA_AVALIACAO_MIN) {
    const fim = Math.min(inicio + JANELA_AVALIACAO_MIN - 1, baselineFim);
    const { ativos } = await agregarJanela(store, inicio, fim);
    somaAtivos += ativos.size;
    janelas += 1;
  }
  return janelas > 0 ? somaAtivos / janelas : 0;
}

/**
 * Avalia engajamento, decide ação por feature flag e persiste auditoria.
 * Retorna sempre — nunca throw — para que o cron não exploda em loop.
 *
 * @returns {Promise<{
 *   modo: "off"|"warn"|"auto",
 *   metricas: object,
 *   threshold: object,
 *   disparado: boolean,
 *   acao: string|null,
 *   erro: string|null,
 * }>}
 */
export async function analisarEngajamento() {
  const inicioMs = Date.now();
  const modo     = lerFlag();
  const minutoAgora      = Math.floor(inicioMs / 60_000);
  const janelaInicio     = minutoAgora - JANELA_AVALIACAO_MIN + 1;
  const janelaAnteriorIn = janelaInicio - JANELA_AVALIACAO_MIN;
  const janelaAnteriorFim= janelaInicio - 1;

  const storeAnalytics = abrirStore(STORE_ANALYTICS);
  let metricas = {
    usuarios_ativos:    0,
    cliques_compra:     0,
    taxa_clique_compra: 0,
    ativos_anterior:    0,
    tendencia:          0,
    media_baseline:     0,
    fator_ativos:       0,
    janela_minutos:     JANELA_AVALIACAO_MIN,
    minuto_inicio:      janelaInicio,
    minuto_fim:         minutoAgora,
  };
  let erro = null;

  try {
    const atual = await agregarJanela(storeAnalytics, janelaInicio, minutoAgora);
    const anterior = await agregarJanela(storeAnalytics, janelaAnteriorIn, janelaAnteriorFim);
    const baseline = await mediaBaseline(storeAnalytics, minutoAgora);

    const ativos    = atual.ativos.size;
    const cliques   = atual.eventos.click_botao_comprar || 0;
    const taxa      = ativos > 0 ? cliques / ativos : 0;
    const ativosAnt = anterior.ativos.size;
    const tendencia = ativos - ativosAnt;
    const fator     = baseline > 0 ? ativos / baseline : 0;

    metricas = {
      ...metricas,
      usuarios_ativos:    ativos,
      cliques_compra:     cliques,
      taxa_clique_compra: Number(taxa.toFixed(4)),
      ativos_anterior:    ativosAnt,
      tendencia,
      media_baseline:     Number(baseline.toFixed(2)),
      fator_ativos:       Number(fator.toFixed(2)),
    };
  } catch (err) {
    erro = err?.message || "agregacao_falhou";
    console.warn("[ia-preditiva] agregação falhou:", erro);
  }

  const threshold = {
    fator_ativos_min: THRESHOLD_FATOR_ATIVOS,
    taxa_clique_min:  THRESHOLD_TAXA_CLIQUE,
    tendencia_min:    THRESHOLD_TENDENCIA,
    bate_ativos:      metricas.fator_ativos       > THRESHOLD_FATOR_ATIVOS,
    bate_clique:      metricas.taxa_clique_compra > THRESHOLD_TAXA_CLIQUE,
    bate_tendencia:   metricas.tendencia          > THRESHOLD_TENDENCIA,
  };
  threshold.condicoes_batidas = [
    threshold.bate_ativos, threshold.bate_clique, threshold.bate_tendencia,
  ].filter(Boolean).length;
  const disparado = !erro && threshold.condicoes_batidas === 3;

  let acao = null;
  try {
    acao = await executarAcao(modo, metricas, threshold, disparado);
  } catch (err) {
    erro = err?.message || String(err);
    console.error("[ia-preditiva] executarAcao falhou:", erro);
  }

  // Auditoria: TODA execução, com ou sem disparo (ia-execucao:{ts}).
  // Disparo gravado também em ia-decisao:{ts} pelo modo warn/auto.
  const store = abrirStore(STORE_DECISOES);
  if (store) {
    try {
      await store.setJSON(`ia-execucao:${inicioMs}`, {
        timestamp: inicioMs,
        modo, disparado, acao, erro,
        metricas, threshold,
        duracaoMs: Date.now() - inicioMs,
      });
    } catch (err) {
      console.warn("[ia-preditiva] gravar ia-execucao falhou:", err?.message);
    }
  }

  return { modo, metricas, threshold, disparado, acao, erro };
}

/**
 * Executa a ação correspondente ao modo da feature flag.
 * Retorna o nome da ação executada ("log", "warn", "abrirEdicao", "skip-no-trigger").
 */
export async function executarAcao(modo, metricas, threshold, disparado) {
  if (!disparado) {
    console.info("[ia-preditiva] sem disparo", {
      modo, condicoes: threshold.condicoes_batidas, metricas,
    });
    return "skip-no-trigger";
  }

  if (modo === "off") {
    console.info("[ia-preditiva] DISPARO (modo=off, no-op)", { metricas, threshold });
    return "log";
  }

  if (modo === "warn") {
    // Sentry alert + Blob de decisão.
    await captureSecurityAlert("ia_preditiva_disparo", {
      modo, metricas, threshold,
    }, "warning").catch(() => {});
    const store = abrirStore(STORE_DECISOES);
    if (store) {
      try {
        const ts = Date.now();
        await store.setJSON(`ia-decisao:${ts}`, {
          timestamp: ts, modo: "warn", metricas, threshold,
        });
      } catch (err) {
        console.warn("[ia-preditiva] gravar ia-decisao falhou:", err?.message);
      }
    }
    return "warn";
  }

  if (modo === "auto") {
    // Auto: dispara abrirEdicao() on-chain via coordenacao.
    return await dispararEdicaoAutomatica(metricas, threshold);
  }

  return "modo-desconhecido";
}

/**
 * Chama abrirEdicao(idEdicao, nome, duracaoSegundos) on-chain como coordenacao.
 * Sequência id: "FLASH-AUTO-{ts}" para evitar colisão; duracao = 30 min (1800s).
 */
async function dispararEdicaoAutomatica(metricas, threshold) {
  const backend = backendAssinatura();
  const semCreds =
    !process.env.RPC_URL ||
    (backend === "local-key" && !resolverChaveCoordenacao()) ||
    (backend === "defender" && (!process.env.DEFENDER_API_KEY || !process.env.DEFENDER_API_SECRET));
  if (semCreds) {
    console.error("[ia-preditiva] modo=auto sem credenciais de assinatura — abortando");
    await captureSecurityAlert("ia_preditiva_auto_sem_creds", {
      metricas, threshold,
    }, "error").catch(() => {});
    return "abort-no-creds";
  }
  const { signer, address } = await obterSignerCoordenacao(process.env.RPC_URL);
  const contrato = new Contract(CONTRATO_ADDRESS, ABRIR_EDICAO_ABI, signer);

  // Sanity: confirma que o signer é coordenacao.
  try {
    const coord = (await contrato.coordenacao()).toLowerCase();
    if (coord !== address.toLowerCase()) {
      throw new Error(`wallet ${address} não é coordenacao (${coord})`);
    }
  } catch (err) {
    console.error("[ia-preditiva] verificarCoordenacao falhou:", err?.message);
    await captureSecurityAlert("ia_preditiva_coord_mismatch", {
      err: err?.message, metricas, threshold,
    }, "error").catch(() => {});
    return "abort-coord-mismatch";
  }

  const ts        = Date.now();
  const idEdicao  = `FLASH-AUTO-${ts}`;
  const nome      = "Leilão Relâmpago Automático (IA)";
  const duracao   = 1800; // 30 min

  let txHash = null;
  try {
    const tx      = await contrato.abrirEdicao(idEdicao, nome, duracao);
    const receipt = await tx.wait(1);
    txHash = receipt.hash;
  } catch (err) {
    console.error("[ia-preditiva] abrirEdicao on-chain falhou:", err?.message);
    await captureSecurityAlert("ia_preditiva_tx_falhou", {
      idEdicao, err: err?.message, metricas, threshold,
    }, "error").catch(() => {});
    return "abort-tx-falhou";
  }

  const store = abrirStore(STORE_DECISOES);
  if (store) {
    try {
      await store.setJSON(`ia-decisao:${ts}`, {
        timestamp: ts, modo: "auto", idEdicao, txHash, duracao,
        metricas, threshold,
      });
    } catch (err) {
      console.warn("[ia-preditiva] gravar ia-decisao(auto) falhou:", err?.message);
    }
  }
  await captureSecurityAlert("ia_preditiva_edicao_aberta", {
    idEdicao, txHash, duracao, metricas, threshold,
  }, "warning").catch(() => {});
  return "abrirEdicao";
}
