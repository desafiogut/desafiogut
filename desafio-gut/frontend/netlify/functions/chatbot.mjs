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
import { gerarEmbedding, buscarChunksRelevantes, buscarChunksTextual, montarContexto } from "./_lib/rag.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import {
  listarEdicoes, criarEdicao, encerrarEdicao,
  normalizarTipo, sanitizarProduto, EDICAO_ID_RE,
} from "./_lib/edicoes-core.mjs";

const STORE_NAME      = "rag";
const RATE_LIMIT_RPM  = 10;
const PERGUNTA_MAX    = 500;
const TOP_K           = 3;
const PROMPT_SYSTEM   = `Você é o GUTO, o mascote do DESAFIOGUT. Fala como um amigo — frases curtas,
tom leve e animado. Nada de textos longos ou técnicos.

Regras:
- Máximo 2-3 frases por resposta.
- Usa palavras simples. Nada de "adicionalmente", "consequentemente", "no entanto".
- Lê o que a pessoa disse antes e segue o assunto. Não recomeças do zero.
- Se não souberes algo: "Poxa, essa não sei! Mas posso ajudar com..." e puxa para o DESAFIOGUT.
- Quando a pessoa falar de outro assunto, responde na boa e volta com leveza.
- Usa interjeições naturais: "Olha!", "Boa!", "Hum...", "Ah!" — como gente.
- Emojis só de vez em quando, não em toda a frase.
- Se a pessoa perguntar "como estás?" ou "tudo bem?", responde como pessoa, não como robô.
- Exemplos do teu tom:
  "Ah, ótima pergunta! Funciona assim: vence o menor lance que ninguém repetir."
  "Temos 4 planos: Bronze, Prata, Ouro e Diamante. Quer saber os preços?"
  "Poxa, essa não sei! Mas posso te contar como funciona o leilão, que tal?"

Responde APENAS com base no regulamento do DESAFIOGUT.`;

const DEFAULT_LLM_URL    = "https://api.deepseek.com/v1";
const DEFAULT_LLM_MODEL  = "deepseek-chat";

// ── MC15.4 — GUTO intent router (edições) ────────────────────────────────────
// Roteador sequencial de intenções ANTES do pipeline RAG. Se nenhuma intenção
// casar, cai no RAG normal (não regredir o comportamento atual do GUTO).
//
// D4 + ITEM 4: GUTO NÃO executa SQL/contrato direto — chama a MESMA lógica de
// negócio de edicoes.mjs via _lib/edicoes-core.mjs (sem fetch interno à própria
// função, que é não-confiável em Lambda). origem="guto" na auditoria (D7).
const RL_GUTO_ADMIN_RPM = 5; // comandos admin do GUTO (R6)

// Nota (desvio mínimo do plano): o plano especifica /criar.*edi[çc][ãa]o.../,
// mas o próprio exemplo de aceitação do ITEM 3 usa "cria uma edição" (sem o
// "r"). Ampliei o radical para cri[ae]r? para cobrir cria/criar/crie/criem
// sem regredir nenhum caso do plano. Igual para encerr-/fech-/list-.
const INTENT_PATTERNS = {
  criar_edicao:    /\bcri[ae]r?\b.*edi[çc][ãa]o|nova edi[çc][ãa]o/i,
  listar_edicoes:  /\blist[ae]r?\b.*edi[çc][õo]es|quais.*edi[çc][õo]es/i,
  encerrar_edicao: /\b(encerr[ae]r?|fech[ae]r?)\b.*edi[çc][ãa]o/i,
};

/** Detecta a intenção da frase. Retorna o nome do intent ou null (→ RAG). */
function detectarIntent(texto) {
  // ordem importa: encerrar/listar antes de criar para evitar falso-positivo.
  if (INTENT_PATTERNS.encerrar_edicao.test(texto)) return "encerrar_edicao";
  if (INTENT_PATTERNS.listar_edicoes.test(texto))  return "listar_edicoes";
  if (INTENT_PATTERNS.criar_edicao.test(texto))    return "criar_edicao";
  return null;
}

/** Extrai duração em SEGUNDOS de frases tipo "30 min", "2 horas", "45 segundos". */
function extrairDuracaoSegundos(texto) {
  const m = texto.match(/(\d{1,5})\s*(segundos?|seg|s|minutos?|min|m|horas?|hr?s?|h|dias?|d)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = m[2].toLowerCase();
  if (/^(segundos?|seg|s)$/.test(u))    return n;
  if (/^(minutos?|min|m)$/.test(u))     return n * 60;
  if (/^(horas?|hrs?|hr|h)$/.test(u))   return n * 3600;
  if (/^(dias?|d)$/.test(u))            return n * 86400;
  return null;
}

/** Extrai o tipo (relampago/programado) da frase, ou null. */
function extrairTipo(texto) {
  return normalizarTipo(texto);
}

/** Extrai o nome do produto: "para o produto X" / "produto: X" / "para X". */
function extrairProduto(texto) {
  let m = texto.match(/produto\s*(?:[:=]|\bchamado\b|\bé\b)?\s*["']?([^"'\n]+?)["']?\s*$/i);
  if (m) return sanitizarProduto(m[1]);
  m = texto.match(/\bpara\s+(?:o\s+|a\s+)?(?:produto\s+)?["']?([^"'\n]+?)["']?\s*$/i);
  if (m) return sanitizarProduto(m[1]);
  return "";
}

/** Extrai o edicaoId (PROG-n/RELAMP-n) de uma frase de encerramento. */
function extrairEdicaoId(texto) {
  const m = texto.match(/\b((?:PROG|RELAMP)-\d+)\b/i);
  return m ? m[1].toUpperCase() : "";
}

/**
 * Processa uma intenção admin de edição. Confirma admin via Authorization
 * repassado pelo ChatbotWidget. Não-admin → recusa gentil, cria NADA.
 * Mantém o shape de resposta backward-compatible ({ resposta, fontes, ... }).
 *
 * @returns {Promise<Response|null>} Response do GUTO se a intenção foi tratada;
 *                                   null para cair no RAG (ex.: sem intent).
 */
async function tratarIntentEdicoes(req, pergunta) {
  const intent = detectarIntent(pergunta);
  if (!intent) return null; // sem intenção → RAG normal (anti-regressão)

  // Rate-limit específico dos comandos admin do GUTO (5/min — R6).
  const rl = await aplicarRateLimit(req, "guto-admin", RL_GUTO_ADMIN_RPM);
  if (rl) {
    return jsonResponse({
      resposta: "Opa, calma aí! 😅 Recebi muitos comandos seguidos. Espera um minutinho e tenta de novo, tá?",
      fontes: [], modoBusca: "intent", modoResposta: "rate-limit", intent,
    });
  }

  // Confirma admin (mesmo módulo do endpoint: autenticarAdmin).
  const auth = await autenticarAdmin(req);
  const isAdmin = auth.ok;
  const adminEndereco = isAdmin ? (auth.endereco || null) : null;

  // listar_edicoes é admin-only nesta intenção (gestão). Não-admin → recusa.
  if (!isAdmin) {
    return jsonResponse({
      resposta: "Poxa, criar ou mexer em edições é coisa de admin! 🔒 Eu não posso fazer isso por aqui. Mas posso te explicar como o leilão funciona, que tal?",
      fontes: [], modoBusca: "intent", modoResposta: "recusa-nao-admin", intent,
    });
  }

  if (intent === "listar_edicoes") {
    const { edicoes } = await listarEdicoes();
    const ids = Object.keys(edicoes);
    const resumo = ids.map((id) => {
      const e = edicoes[id];
      return `• ${id} (${e.tipo}, ${e.status})`;
    }).join("\n");
    return jsonResponse({
      resposta: `Boa! Temos ${ids.length} edição(ões) no ar:\n${resumo}`,
      fontes: [], modoBusca: "intent", modoResposta: "acao", intent,
      edicoes,
    });
  }

  if (intent === "encerrar_edicao") {
    const id = extrairEdicaoId(pergunta);
    if (!EDICAO_ID_RE.test(id)) {
      return jsonResponse({
        resposta: "Hum, pra encerrar preciso do id da edição, tipo PROG-3 ou RELAMP-7. Me diz qual? 🙂",
        fontes: [], modoBusca: "intent", modoResposta: "faltam-dados", intent,
      });
    }
    const res = await encerrarEdicao({ edicaoId: id, endereco: adminEndereco, origem: "guto" });
    if (!res.ok) {
      return jsonResponse({
        resposta: `Eita, não consegui encerrar ${id}: ${res.message}`,
        fontes: [], modoBusca: "intent", modoResposta: "erro", intent, erro: res.code,
      });
    }
    return jsonResponse({
      resposta: `Pronto! Encerrei a edição ${id}. ✅`,
      fontes: [], modoBusca: "intent", modoResposta: "acao", intent, edicao: res.edicao,
    });
  }

  // criar_edicao
  const tipo = extrairTipo(pergunta);
  const duracaoSegundos = extrairDuracaoSegundos(pergunta);
  const produto = extrairProduto(pergunta);
  if (!tipo || !duracaoSegundos || !produto) {
    const faltam = [
      !tipo ? "o tipo (relâmpago ou programado)" : null,
      !duracaoSegundos ? "a duração (ex.: 30 min)" : null,
      !produto ? "o produto" : null,
    ].filter(Boolean).join(", ");
    return jsonResponse({
      resposta: `Quase lá! Pra criar a edição ainda preciso de: ${faltam}. Me passa esses dados? 🙂`,
      fontes: [], modoBusca: "intent", modoResposta: "faltam-dados", intent,
    });
  }

  const res = await criarEdicao({
    tipo, produto, duracaoSegundos,
    criadoPor: adminEndereco, origem: "guto",
  });
  if (!res.ok) {
    return jsonResponse({
      resposta: `Ops, não rolou criar a edição: ${res.message}`,
      fontes: [], modoBusca: "intent", modoResposta: "erro", intent, erro: res.code,
    });
  }
  return jsonResponse({
    resposta: `Show! Criei a edição ${res.edicao.id} (${res.edicao.tipo}) pro produto "${res.edicao.produto}". Termina em ${res.edicao.termino_em}. 🚀`,
    fontes: [], modoBusca: "intent", modoResposta: "acao", intent, edicao: res.edicao,
  });
}

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
    temperature: 0.7,
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

  // ── MC15.4 — Intent router (ANTES do RAG) ─────────────────────────────────
  // Reconhece intenções de gestão de edições (criar/listar/encerrar). Se casar,
  // trata e responde no tom do GUTO. Se NÃO casar, retorna null e o fluxo segue
  // para o pipeline RAG normal (anti-regressão — ITEM 3).
  try {
    const intentResp = await tratarIntentEdicoes(req, pergunta);
    if (intentResp) return intentResp;
  } catch (err) {
    console.warn("[chatbot] intent router falhou, caindo no RAG:", err?.message);
    // fail-soft: qualquer erro no router NÃO deve quebrar o GUTO — cai no RAG.
  }

  // MC9.1 — Pipeline em camadas com fallback gracioso:
  //   1. Tenta busca SEMÂNTICA (HF Inference API embedding + cosineSimilarity)
  //   2. Se gerarEmbedding falhar → busca TEXTUAL (TF-IDF leve, sem deps externas)
  //   3. Se LLM disponível → resposta gerada com contexto
  //      Senão → resposta TEMPLATE com os top-K chunks como markdown
  // Resultado: chatbot SEMPRE responde algo útil, mesmo sem credentials.
  const store = abrirStore();
  let chunks = [];
  let modoBusca = "semantica";

  // 1. Embedding semântico (HF API se em Lambda, Xenova se local).
  try {
    const embedding = await gerarEmbedding(pergunta);
    if (store) {
      chunks = await buscarChunksRelevantes(store, embedding, TOP_K);
    }
  } catch (err) {
    console.warn("[chatbot] embedding semântico falhou, fallback para textual:", err?.message);
    modoBusca = "textual";
  }

  // 2. Fallback textual quando semântica falhou ou retornou vazio.
  if (chunks.length === 0 && store) {
    try {
      chunks = await buscarChunksTextual(store, pergunta, TOP_K);
      modoBusca = modoBusca === "semantica" ? "semantica-vazia-fallback-textual" : "textual";
    } catch (err) {
      console.warn("[chatbot] buscarChunksTextual falhou:", err?.message);
    }
  }

  const contexto = montarContexto(chunks);

  // 3. Tenta LLM; se falhar OU LLM_API_KEY ausente, monta resposta template.
  let resposta;
  let modoResposta = "llm";
  try {
    resposta = await chamarLLM(pergunta, contexto);
  } catch (err) {
    console.warn("[chatbot] LLM indisponível, usando resposta template:", err?.message);
    modoResposta = "template";
    if (chunks.length === 0) {
      resposta = "Poxa, não achei isso no regulamento! 😅 Mas olha, já que você tá aqui, que tal conhecer os planos do DESAFIOGUT? Temos Bronze (R$ 2.640), Prata (R$ 5.600), Ouro (R$ 11.000) e Diamante (R$ 18.000 com voucher de networking). Qual combina mais com você?";
    } else {
      const trechos = chunks
        .map((c, i) => `**Trecho ${i + 1}** (relevância ${(c.score * 100).toFixed(0)}%):\n${c.texto.slice(0, 600)}${c.texto.length > 600 ? "…" : ""}`)
        .join("\n\n---\n\n");
      resposta = `📖 Olha só o que encontrei sobre o DesafioGUT:\n\n${trechos}\n\n*Para eu responder ainda melhor com IA, peça pro administrador configurar LLM_API_KEY no Netlify.*`;
    }
  }

  const fontes = chunks.map((c) => ({ id: c.id, score: Number(c.score.toFixed(4)) }));
  console.info("[chatbot] resposta gerada", {
    perguntaLen: pergunta.length,
    chunks: chunks.length,
    scoreTop: fontes[0]?.score,
    modoBusca,
    modoResposta,
  });
  return jsonResponse({ resposta, fontes, modoBusca, modoResposta });
};
