// _lib/pulso.mjs — MC15.6 ITEM 6 (Relatórios de Pulso — 4 métricas vitais)
//
// Calcula as 4 métricas a partir de lances-relampago + edicoes-metadata (D5):
//   1) volumePorMin   — lances por minuto desde o início da edição (aquecimento)
//   2) licitantesUnicos — nº de endereços distintos que lançaram
//   3) valorizacaoPct — dinâmica de preço: % do MENOR lance sobre a base
//                       (valorBaseCentavos da edição). null se não houver base.
//   4) abandonoCheckoutPct — taxa de abandono de checkout (vencedores/pedidos
//                       sem pagamento confirmado). Sem store próprio de checkout
//                       no MVP → retorna null (campo presente, honesto).
//
// Função PURA (calcularPulso) + wrapper que lê os Blobs (obterMetricasPulso).
// 100% fail-soft. Sem dependências externas.

import { getStore } from "@netlify/blobs";

const BLOB_LANCES   = "lances-relampago";
const STORE_EDICOES = "edicoes-metadata";

/** Parse ISO → epoch ms, ou null. */
function ms(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : null;
}

/**
 * Função PURA — calcula as 4 métricas.
 * @param {Array<{endereco?:string, valorCentavos:number, processadoEm?:string}>} lances
 * @param {object} edicao  metadata da edição ({ criadoEm, termino_em, valorBaseCentavos })
 * @param {number} agoraMs
 */
export function calcularPulso(lances, edicao, agoraMs = Date.now()) {
  const lista = Array.isArray(lances) ? lances : [];
  const totalLances = lista.length;

  // 1) volume por minuto desde o início (criadoEm; fallback: 1º lance).
  const inicioMs =
    ms(edicao?.criadoEm) ??
    lista.map((l) => ms(l?.processadoEm)).filter((x) => x != null).sort((a, b) => a - b)[0] ??
    null;
  let minutosDecorridos = null;
  if (inicioMs != null) minutosDecorridos = Math.max(1, (agoraMs - inicioMs) / 60000);
  const volumePorMin = minutosDecorridos != null
    ? Number((totalLances / minutosDecorridos).toFixed(2))
    : null;

  // 2) licitantes únicos.
  const enderecos = new Set();
  for (const l of lista) {
    const e = String(l?.endereco || "").toLowerCase();
    if (e) enderecos.add(e);
  }
  const licitantesUnicos = enderecos.size;

  // 3) valorização: % do menor lance sobre a base.
  let menor = null;
  for (const l of lista) {
    const v = Number(l?.valorCentavos);
    if (Number.isInteger(v) && (menor === null || v < menor)) menor = v;
  }
  const base = Number.isInteger(edicao?.valorBaseCentavos) ? edicao.valorBaseCentavos : null;
  let valorizacaoPct = null;
  if (base != null && base > 0 && menor != null) {
    valorizacaoPct = Number((((menor - base) / base) * 100).toFixed(1));
  }

  // 4) abandono de checkout — sem fonte de dados no MVP.
  const abandonoCheckoutPct = null;

  return {
    totalLances,
    volumePorMin,
    licitantesUnicos,
    valorizacaoPct,
    abandonoCheckoutPct,
    menorLanceCentavos: menor,
    baseCentavos: base,
  };
}

/** Lê a metadata de uma edição (fail-soft → null). */
async function lerEdicao(edicaoId) {
  try {
    const store = getStore({ name: STORE_EDICOES, consistency: "strong" });
    return await store.get(edicaoId, { type: "json" });
  } catch (err) {
    console.warn("[pulso] leitura edicao falhou:", err?.message);
    return null;
  }
}

/** Lê os lances de uma edição (fail-soft → []). */
async function lerLances(edicaoId) {
  try {
    const store = getStore({ name: BLOB_LANCES, consistency: "strong" });
    const doc = await store.get(edicaoId, { type: "json" });
    return Array.isArray(doc?.lances) ? doc.lances : [];
  } catch (err) {
    console.warn("[pulso] leitura lances falhou:", err?.message);
    return [];
  }
}

/**
 * Calcula o pulso de uma edição a partir dos Blobs. Fail-soft.
 * @param {string} edicaoId
 */
export async function obterMetricasPulso(edicaoId) {
  const id = String(edicaoId || "R-1");
  const [edicao, lances] = await Promise.all([lerEdicao(id), lerLances(id)]);
  return { edicaoId: id, ...calcularPulso(lances, edicao || {}, Date.now()) };
}
