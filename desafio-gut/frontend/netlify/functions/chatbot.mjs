// Endpoint /chatbot — Mega Comando 9 / Item 2 (IA Cognitiva RAG).
//
// POST handler: recebe { pergunta }, gera embedding, busca top-3 chunks no
// índice RAG (Blob store `rag`), monta prompt com contexto + pergunta e
// chama um LLM compatível com OpenAI Chat Completions (default: DeepSeek
// V4 Flash). Retorna { resposta, fontes }.
//
// Variáveis de ambiente:
//   CHATBOT_ATIVO    on|off (default on) — desligado retorna 503
//   OPENAI_API_KEY   embeddings (text-embedding-3-small)
//   OPENAI_BASE_URL  opcional (default https://api.openai.com/v1)
//   LLM_API_KEY      chat completions (DeepSeek/OpenAI/Anthropic-compat)
//   LLM_BASE_URL     default https://api.deepseek.com/v1
//   LLM_MODEL        default deepseek-chat
//
// Rate limit: 10 reqs/min/IP (padrão MC1 para endpoints públicos).

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { gerarEmbedding, buscarChunksRelevantes, montarContexto } from "./_lib/rag.mjs";

const STORE_NAME      = "rag";
const RATE_LIMIT_RPM  = 10;
const PERGUNTA_MAX    = 500;
const TOP_K           = 3;
const PROMPT_SYSTEM   = `Você é o assistente oficial do DESAFIOGUT (leilão de menor lance único na Sepolia testnet).
Responda em português, de forma direta e curta (máximo 4 parágrafos curtos).
Use APENAS o contexto fornecido. Se a pergunta não for coberta pelo contexto, diga claramente:
"Não tenho essa informação no regulamento. Para detalhes específicos, contate suporte@desafiogut.com.br."
Nunca invente regras, valores ou prazos.`;

const DEFAULT_LLM_URL    = "https://api.deepseek.com/v1";
const DEFAULT_LLM_MODEL  = "deepseek-chat";

function chatbotAtivo() {
  const raw = String(process.env.CHATBOT_ATIVO ?? "on").toLowerCase();
  return raw === "on" || raw === "true" || raw === "1";
}

function abrirStore() {
  try { return getStore({ name: STORE_NAME, consistency: "strong" }); }
  catch (err) {
    console.warn("[chatbot] Blobs rag indisponível:", err?.message);
    return null;
  }
}

async function chamarLLM(pergunta, contexto, opts = {}) {
  const apiKey  = opts.apiKey  || process.env.LLM_API_KEY;
  const baseUrl = (opts.baseUrl || process.env.LLM_BASE_URL || DEFAULT_LLM_URL).replace(/\/$/, "");
  const model   = opts.model   || process.env.LLM_MODEL || DEFAULT_LLM_MODEL;
  if (!apiKey) throw new Error("LLM_API_KEY ausente");

  const url  = `${baseUrl}/chat/completions`;
  const userContent = contexto
    ? `Contexto extraído do regulamento DESAFIOGUT:\n\n${contexto}\n\nPergunta do usuário: ${pergunta}`
    : `Pergunta do usuário (sem contexto encontrado): ${pergunta}`;

  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: PROMPT_SYSTEM },
      { role: "user",   content: userContent  },
    ],
    temperature: 0.2,
    max_tokens:  512,
    stream:      false,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 30_000);
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`llm_http_${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const conteudo = data?.choices?.[0]?.message?.content;
  if (typeof conteudo !== "string" || !conteudo.trim()) {
    throw new Error("llm_resposta_vazia");
  }
  return conteudo.trim();
}

export default async (req) => {
  if (!chatbotAtivo()) {
    return jsonError(503, "feature_desligada", "chatbot temporariamente desligado (CHATBOT_ATIVO=off)");
  }
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  const rl = await aplicarRateLimit(req, "chatbot", RATE_LIMIT_RPM);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com 'pergunta'");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const pergunta = typeof body.pergunta === "string" ? body.pergunta.trim() : "";
  if (!pergunta) return jsonError(400, "pergunta_obrigatoria", "campo 'pergunta' obrigatório");
  if (pergunta.length > PERGUNTA_MAX) {
    return jsonError(400, "pergunta_longa", `máximo ${PERGUNTA_MAX} caracteres`);
  }

  // 1. Embedding da pergunta.
  let embedding;
  try { embedding = await gerarEmbedding(pergunta); }
  catch (err) {
    console.error("[chatbot] gerarEmbedding falhou:", err?.message);
    return jsonError(503, "embedding_indisponivel", "não foi possível gerar embedding (configure OPENAI_API_KEY)");
  }

  // 2. Busca top-K chunks. Se o índice estiver vazio, segue sem contexto
  // (o LLM cairá no fallback "não tenho essa informação...").
  const store = abrirStore();
  let chunks = [];
  if (store) {
    try { chunks = await buscarChunksRelevantes(store, embedding, TOP_K); }
    catch (err) { console.warn("[chatbot] buscarChunks falhou:", err?.message); }
  }
  const contexto = montarContexto(chunks);

  // 3. Chama LLM.
  let resposta;
  try { resposta = await chamarLLM(pergunta, contexto); }
  catch (err) {
    console.error("[chatbot] LLM falhou:", err?.message);
    return jsonError(502, "llm_indisponivel", "não foi possível gerar resposta agora — tente novamente em instantes");
  }

  const fontes = chunks.map((c) => ({ id: c.id, score: Number(c.score.toFixed(4)) }));
  console.info("[chatbot] resposta gerada", {
    perguntaLen: pergunta.length, chunks: chunks.length, scoreTop: fontes[0]?.score,
  });
  return jsonResponse({ resposta, fontes });
};
