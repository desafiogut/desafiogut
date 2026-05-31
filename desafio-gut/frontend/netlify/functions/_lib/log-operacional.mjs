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

// MC15.6 ITEM 10 — stopwords PT para a similaridade simples por keywords.
const STOPWORDS = new Set([
  "a","o","os","as","de","da","do","das","dos","e","ou","um","uma","para","por",
  "com","no","na","nos","nas","que","como","esta","este","isso","ao","aos","se",
  "foi","ser","sao","the","of","to","in","is","como","resolvi","resolveu","fiz",
]);

/** Tokeniza: NFD-desacentua, minúsculas, remove stopwords e tokens curtos. */
function tokenizar(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * MC15.6 ITEM 10 — Busca a decisão passada mais semelhante ao `trigger` por
 * sobreposição simples de keywords (sem embeddings). Devolve { entrada, score,
 * total } ou null se não houver histórico/relevância. Fail-soft.
 *
 * @param {string} trigger texto/keywords do problema atual
 * @param {number} [minScore=1] mínimo de tokens em comum para considerar relevante
 */
export async function buscarDecisaoSemelhante(trigger, minScore = 1) {
  const alvo = new Set(tokenizar(trigger));
  if (alvo.size === 0) return null;
  const entradas = await lerDecisoes(MAX_ENTRADAS);
  if (entradas.length === 0) return null;

  let melhor = null;
  let melhorScore = 0;
  for (const e of entradas) {
    const toks = new Set(tokenizar(`${e.trigger} ${e.action}`));
    let score = 0;
    for (const t of alvo) if (toks.has(t)) score++;
    // desempate por recência: entradas já vêm desc, então > (não >=) mantém a 1ª.
    if (score > melhorScore) { melhorScore = score; melhor = e; }
  }
  if (!melhor || melhorScore < minScore) return null;
  return { entrada: melhor, score: melhorScore, total: entradas.length };
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
