// MC28.1 — Stateless Key-Per-Bid.
// Cada lance é UMA chave isolada e imutável → ZERO read-modify-write, logo
// elimina a race condition do blob único (G-3 do MC28.txt). Inclui leitura
// exaustiva por cursor (SEGMENTO 5.1) + paralelismo limitado (SEGMENTO 5.2).
//
// Chave: bid:{edicaoId}:{endereco}:{sufixo aleatório}
//   - o sufixo crypto.randomUUID().slice(0,8) (NÃO Date.now()) garante que dois
//     lances do mesmo utilizador no MESMO milissegundo nunca colidem (ITEM 2.2).
// Marcador de fecho: bid:{edicaoId}:consolidado  (idempotência da consolidação).

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

const STORE        = "bids";
const LOTE_LEITURA = 75; // concorrência de leitura por lote (50–100, SEGMENTO 5.2)

function abrir() {
  return getStore({ name: STORE, consistency: "strong" });
}

/** Monta a chave Key-Per-Bid com sufixo aleatório (anti-colisão). */
export function montarChaveBid(edicaoId, endereco) {
  return `bid:${edicaoId}:${String(endereco).toLowerCase()}:${randomUUID().slice(0, 8)}`;
}

/** Grava um lance numa chave única e imutável. NUNCA sobrescreve outro lance. */
export async function gravarBid({ edicaoId, endereco, registro }) {
  const key = montarChaveBid(edicaoId, endereco);
  await abrir().setJSON(key, { ...registro, key });
  return key;
}

/** Lista exaustiva das chaves de lance de uma edição (paginação por cursor). */
export async function listarChavesBids(edicaoId, store = abrir()) {
  const prefix = `bid:${edicaoId}:`;
  const chaves = [];
  let cursor;
  do {
    const page = await store.list({ prefix, cursor });
    for (const b of page.blobs || []) {
      if (b.key.endsWith(":consolidado")) continue; // ignora o marcador de fecho
      chaves.push(b.key);
    }
    cursor = page.cursor; // undefined quando não há mais páginas → termina o laço
  } while (cursor);
  return chaves;
}

/** Lê TODOS os lances de uma edição, em lotes paralelos limitados (anti-timeout). */
export async function listarBids(edicaoId) {
  const store  = abrir();
  const chaves = await listarChavesBids(edicaoId, store);
  const out    = [];
  for (let i = 0; i < chaves.length; i += LOTE_LEITURA) {
    const lote  = chaves.slice(i, i + LOTE_LEITURA);
    const lidos = await Promise.all(lote.map((k) => store.get(k, { type: "json" })));
    for (const v of lidos) if (v) out.push(v);
  }
  return out;
}

/**
 * Lista as EDIÇÕES em que um endereço deu lance (UTAC000.17a).
 *
 * Aproveita o Key-Per-Bid existente: o endereço está DENTRO da chave
 * (`bid:{edicaoId}:{endereco}:{sufixo}`), logo as participações deduzem-se de uma
 * única listagem de chaves — SEM ler um único valor (custo mínimo e zero exposição
 * de dados de lance). Não é precisa migração nem índice novo.
 *
 * @returns {Promise<Array<{edicaoId: string, lances: number}>>} ordenado por edicaoId.
 */
export async function listarEdicoesPorEndereco(endereco, store = abrir()) {
  const alvo = `:${String(endereco).toLowerCase()}:`;
  const contagem = new Map();
  let cursor;
  do {
    const page = await store.list({ prefix: "bid:", cursor });
    for (const b of page.blobs || []) {
      const partes = b.key.split(":");           // ["bid", edicaoId, endereco, sufixo]
      if (partes.length !== 4) continue;         // ignora marcadores (ex.: bid:{edicao}:consolidado)
      if (`:${partes[2]}:` !== alvo) continue;   // não é este endereço (endereços não têm ":")
      contagem.set(partes[1], (contagem.get(partes[1]) || 0) + 1);
    }
    cursor = page.cursor;                        // undefined quando não há mais páginas
  } while (cursor);
  return [...contagem.entries()]
    .map(([edicaoId, lances]) => ({ edicaoId, lances }))
    .sort((a, b) => String(a.edicaoId).localeCompare(String(b.edicaoId)));
}

/** Marca a edição como consolidada (idempotência de fecho). */
export async function marcarConsolidado(edicaoId, resultado) {
  await abrir().setJSON(`bid:${edicaoId}:consolidado`, {
    ...resultado,
    consolidadoEm: new Date().toISOString(),
  });
}

/** Retorna o marcador de consolidação da edição (ou null se ainda aberta). */
export async function estaConsolidado(edicaoId) {
  return (await abrir().get(`bid:${edicaoId}:consolidado`, { type: "json" })) || null;
}
