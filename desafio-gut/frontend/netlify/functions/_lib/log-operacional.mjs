// _lib/log-operacional.mjs — MC15.6 ITEM 9 (RAG Evolutivo / Memória Operacional)
//
// Log estruturado das decisões/ações do admin, persistido em Blob "log-decisoes"
// (1 entrada por chave). FIFO: ao exceder MAX_ENTRADAS (500), removem-se as mais
// antigas. Chave = `${timestamp}-${rand}` → ordenação lexicográfica ≈ cronológica.
//
// Entrada: { id, timestamp (ISO), trigger, action, user_id }.
//
// 100% fail-soft: erro de Blob nunca propaga (a ação principal não pode falhar
// por causa do log). Usado por chatbot.mjs (criar/encerrar/wizard/panic/unpanic).

import { getStore } from "@netlify/blobs";

export const STORE_LOG = "log-decisoes";
export const MAX_ENTRADAS = 500;

function abrirStore() {
  try { return getStore({ name: STORE_LOG, consistency: "strong" }); }
  catch (err) {
    console.warn("[log-operacional] Blobs indisponível:", err?.message);
    return null;
  }
}

/**
 * Regista uma decisão/ação do admin. Fail-soft (retorna a entrada ou null).
 * @param {object} args
 * @param {string} args.trigger  o que disparou (ex.: "criar_edicao", "panic")
 * @param {string} args.action   o que foi feito (ex.: "RELAMP-7 criada")
 * @param {string|null} [args.userId] endereço do admin
 */
export async function registrarDecisao({ trigger, action, userId = null }) {
  const store = abrirStore();
  if (!store) return null;
  const agora = Date.now();
  const id = `${agora}-${Math.random().toString(36).slice(2, 8)}`;
  const entrada = {
    id,
    timestamp: new Date(agora).toISOString(),
    trigger: String(trigger || "").slice(0, 120),
    action: String(action || "").slice(0, 300),
    user_id: userId || null,
  };
  try {
    await store.setJSON(id, entrada);
    await podarFIFO(store);
    return entrada;
  } catch (err) {
    console.warn("[log-operacional] registrar falhou (não-fatal):", err?.message);
    return null;
  }
}

/** Remove as entradas mais antigas até restarem no máximo MAX_ENTRADAS. */
async function podarFIFO(store) {
  try {
    const { blobs } = await store.list();
    if (blobs.length <= MAX_ENTRADAS) return;
    const chaves = blobs.map((b) => b.key).sort(); // asc → mais antigas primeiro
    const excedente = chaves.slice(0, chaves.length - MAX_ENTRADAS);
    for (const k of excedente) {
      await store.delete(k).catch(() => {});
    }
  } catch (err) {
    console.warn("[log-operacional] poda FIFO falhou (não-fatal):", err?.message);
  }
}

/**
 * Lê as últimas N entradas (mais recentes primeiro). Fail-soft → [].
 * @param {number} [n=500]
 */
export async function lerDecisoes(n = MAX_ENTRADAS) {
  const store = abrirStore();
  if (!store) return [];
  try {
    const { blobs } = await store.list();
    const chaves = blobs.map((b) => b.key).sort().reverse().slice(0, n);
    const entradas = [];
    for (const k of chaves) {
      try {
        const e = await store.get(k, { type: "json" });
        if (e) entradas.push(e);
      } catch { /* ignora entrada corrompida */ }
    }
    return entradas;
  } catch (err) {
    console.warn("[log-operacional] leitura falhou:", err?.message);
    return [];
  }
}
