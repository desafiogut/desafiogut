// Motor RAG (Retrieval-Augmented Generation) — Mega Comando 9 / Item 2.
//
// Componentes (sem deps externas além de fetch):
//   - splitIntoChunks(texto, tamanho, overlap): chunking baseado em "palavras"
//     (whitespace tokens) com overlap entre chunks consecutivos.
//   - cosineSimilarity(a, b): produto escalar normalizado por magnitudes.
//   - buscarChunksRelevantes(store, embeddingPergunta, topK): varre Blob
//     `rag:meta` (índice de chunk_ids) e lê cada `rag:{id}` para ranquear.
//   - gerarEmbedding(texto, opts): chamada HTTP a um endpoint compatível com
//     OpenAI Embeddings (default: text-embedding-3-small). Retorna float[1536].
//
// Convenções de Blobs (store "rag"):
//   rag:meta             → { totalChunks, dimensao, modelo, criadoEm, fonte }
//   rag:{n}              → { id, ordem, texto, embedding: number[] }
//
// O endpoint chatbot.mjs e o script build-rag-index.mjs consomem este módulo.
// Tudo aqui é puro Node ESM — funciona tanto em Lambda do Netlify quanto em
// `node scripts/build-rag-index.mjs` local.

import { pipeline } from "@xenova/transformers";

const DEFAULT_EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_EMBED_URL   = "https://api.openai.com/v1/embeddings";

/**
 * Divide um texto longo em chunks de aproximadamente `tamanho` "palavras"
 * (whitespace tokens), com `overlap` palavras de sobreposição entre chunks
 * consecutivos. Usar palavras como unidade é uma aproximação razoável para
 * tokens de embedding (1 palavra ≈ 1.3 tokens em pt-br).
 *
 * @param {string} texto
 * @param {number} tamanho   palavras por chunk (default: 500)
 * @param {number} overlap   palavras de sobreposição (default: 50)
 * @returns {string[]}
 */
export function splitIntoChunks(texto, tamanho = 500, overlap = 50) {
  if (typeof texto !== "string" || texto.trim().length === 0) return [];
  if (!Number.isInteger(tamanho) || tamanho <= 0) throw new Error("tamanho inválido");
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= tamanho) {
    throw new Error("overlap inválido (0 ≤ overlap < tamanho)");
  }
  const palavras = texto.split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];
  if (palavras.length <= tamanho) return [palavras.join(" ")];

  const chunks = [];
  const passo  = tamanho - overlap;
  for (let i = 0; i < palavras.length; i += passo) {
    const slice = palavras.slice(i, i + tamanho);
    if (slice.length === 0) break;
    chunks.push(slice.join(" "));
    if (i + tamanho >= palavras.length) break;
  }
  return chunks;
}

/**
 * Similaridade do cosseno entre dois vetores de mesma dimensão.
 * Retorna NaN se algum vetor é zero (não force divisão por zero silenciosa
 * — o caller deve tratar). Aceita arrays normais ou Float32Array.
 *
 * @param {ArrayLike<number>} a
 * @param {ArrayLike<number>} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) {
    throw new Error("vetores devem ter mesma dimensão");
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na  += x * x;
    nb  += y * y;
  }
  if (na === 0 || nb === 0) return NaN;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Lê metadata + chunks do store e retorna os top-K mais similares à pergunta.
 * O store é o `getStore({ name: "rag" })` do @netlify/blobs (consistency
 * "strong" recomendada). Retorna `[{ id, ordem, texto, score }]` ordenado por
 * score desc.
 *
 * @param {object} store         Netlify Blobs store já aberto
 * @param {number[]} embedding   vetor da pergunta (mesma dim do modelo)
 * @param {number} topK          quantos chunks retornar (default 3)
 * @returns {Promise<Array<{id:string,ordem:number,texto:string,score:number}>>}
 */
export async function buscarChunksRelevantes(store, embedding, topK = 3) {
  if (!store) throw new Error("store_obrigatorio");
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("embedding_invalido");
  }
  let meta;
  try { meta = await store.get("rag:meta", { type: "json" }); }
  catch (err) {
    console.warn("[rag] leitura rag:meta falhou:", err?.message);
    return [];
  }
  if (!meta || !Number.isInteger(meta.totalChunks) || meta.totalChunks <= 0) {
    return [];
  }
  if (meta.dimensao && meta.dimensao !== embedding.length) {
    // Mismatch — emite warning e segue: cosineSimilarity ainda pode rodar se
    // por algum motivo as dimensões baterem na prática, mas é sinal de bug.
    console.warn("[rag] dimensão divergente entre pergunta e índice:", {
      pergunta: embedding.length, indice: meta.dimensao,
    });
  }
  const scores = [];
  for (let i = 0; i < meta.totalChunks; i++) {
    const key = `rag:${i}`;
    let chunk;
    try { chunk = await store.get(key, { type: "json" }); }
    catch { chunk = null; }
    if (!chunk || !Array.isArray(chunk.embedding)) continue;
    if (chunk.embedding.length !== embedding.length) continue;
    let sim;
    try { sim = cosineSimilarity(chunk.embedding, embedding); }
    catch { continue; }
    if (!Number.isFinite(sim)) continue;
    scores.push({ id: key, ordem: chunk.ordem ?? i, texto: chunk.texto || "", score: sim });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, Math.max(1, topK));
}

/**
 * Gera embedding localmente usando @xenova/transformers (modelo
 * Xenova/all-MiniLM-L6-v2). Retorna float[384].
 *
 * Sem dependências externas (sem API key, sem rede). O modelo é baixado
 * uma única vez no primeiro uso e cacheado pelo @xenova/transformers.
 *
 * @param {string} texto
 * @returns {Promise<number[]>}
 */
let _embedderPromise = null;
function getEmbedder() {
  if (!_embedderPromise) {
    _embedderPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return _embedderPromise;
}

export async function gerarEmbedding(texto, opts = {}) {
  if (typeof texto !== "string" || !texto.trim()) {
    throw new Error("texto_obrigatorio");
  }
  const embedder = await getEmbedder();
  const result = await embedder(texto, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

/**
 * Helper de conveniência usado tanto pelo build script quanto pelo endpoint:
 * concatena chunks vencedores num "contexto" pronto para injeção no prompt.
 */
export function montarContexto(chunks, maxCaracteres = 4000) {
  if (!Array.isArray(chunks) || chunks.length === 0) return "";
  let out = "";
  for (const c of chunks) {
    const trecho = (c?.texto || "").trim();
    if (!trecho) continue;
    const sep = out ? "\n\n---\n\n" : "";
    if (out.length + sep.length + trecho.length > maxCaracteres) {
      const restante = maxCaracteres - out.length - sep.length;
      if (restante > 100) out += sep + trecho.slice(0, restante) + "…";
      break;
    }
    out += sep + trecho;
  }
  return out;
}

