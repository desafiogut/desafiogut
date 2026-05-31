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
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
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

// MC15.4.3 — Padrões operam sobre texto SEM acentos + minúsculas (ver
// detectarIntent, que normaliza ANTES de testar). Cobrem variações naturais:
//   criar:    cria/criar/crie/criem, abre/abra/abrir, "nova edição"
//   listar:   lista/listar/liste, mostra/mostrar, quais
//   encerrar: encerra/encerrar, fecha/fechar, finaliza/finalizar
// "edição"/"edições" → "edicao"/"edicoes" após desacentuar. Encerrar também
// casa quando vem só o id (ex.: "encerra RELAMP-2", sem a palavra "edição").
const INTENT_PATTERNS = {
  criar_edicao:    /\b(cri[ae]r?|abr[ae]|abrir)\b.*\bedic(ao|oes)\b|nova edic(ao|oes)/,
  listar_edicoes:  /\b(list[ae]r?|mostr[ae]r?|quais)\b.*\bedic(ao|oes)\b/,
  encerrar_edicao: /\b(encerr[ae]r?|fech[ae]r?|finaliz[ae]r?)\b.*\b(edic(ao|oes)|(?:prog|relamp)-\d)/,
};

/**
 * Detecta a intenção da frase. Retorna o nome do intent ou null (→ RAG).
 *
 * MC15.4.3 — BUG corrigido: input Unicode NFD-decomposto ("edição" como
 * e,d,i,c,U+0327,a,U+0303,o) NÃO casava edi[çc][ãa]o e caía no RAG genérico.
 * Agora removemos os diacríticos combinantes (NFD → strip U+0300–U+036F) e
 * passamos a minúsculas ANTES de testar, então NFC e NFD casam igual. A
 * extração de parâmetros (extrairProduto/Tipo/Duracao/EdicaoId) continua a
 * usar o texto ORIGINAL — só a DETECÇÃO normaliza.
 */
function detectarIntent(texto) {
  const t = String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos combinantes (NFD)
    .toLowerCase();
  // ordem importa: encerrar/listar antes de criar para evitar falso-positivo.
  if (INTENT_PATTERNS.encerrar_edicao.test(t)) return "encerrar_edicao";
  if (INTENT_PATTERNS.listar_edicoes.test(t))  return "listar_edicoes";
  if (INTENT_PATTERNS.criar_edicao.test(t))    return "criar_edicao";
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
 * Confirma admin para o intent-router do GUTO (MC15.4.2).
 *
 * Diferente do endpoint /edicoes (estrito: admin-access JWT), o GUTO é usado
 * por utilizadores logados normalmente — que possuem um JWT de *user-session*
 * (de /auth-user), não um admin-access JWT (só emitido pelo painel /admin).
 * Por isso aceitamos DOIS caminhos:
 *   1) autenticarAdmin → admin-access JWT ou x-admin-token legado (preferido).
 *   2) user-session JWT válido cujo endereço ∈ admin-list (getAdminAddresses).
 * Sem token, ou endereço fora da admin-list → { ok:false } (recusa). Segurança
 * preservada: o user-session é assinado (JWT_SECRET) e o gate de admin-list é o
 * mesmo do resto do sistema. O endpoint /edicoes POST continua estrito.
 *
 * @returns {Promise<{ ok: boolean, endereco?: string|null }>}
 */
async function confirmarAdminChat(req) {
  // 1) Caminho estrito (admin-access JWT / x-admin-token legado).
  const adm = await autenticarAdmin(req);
  if (adm.ok) return { ok: true, endereco: adm.endereco || null };

  // 2) Caminho user-session + admin-list (GUTO usado por admin logado normal).
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearer) return { ok: false };
  try {
    const payload = await verificarUserSession(bearer);
    const endereco = String(payload?.endereco || "").toLowerCase();
    if (!endereco) return { ok: false };
    const admins = await getAdminAddresses();
    if (admins.includes(endereco)) return { ok: true, endereco };
  } catch {
    // token inválido/expirado → trata como não-admin (recusa silenciosa).
  }
  return { ok: false };
}

// MC15.5 — store das cotas corporativas (cliente_id = endereço para "autenticado").
const STORE_COTAS = "cotas";

/**
 * MC15.5 — Determina o perfil do utilizador a partir do pedido.
 *
 * Perfis: "visitante" | "comum" | "corporativo" | "admin".
 *
 * IMPORTANTE (V1 do MC15.5): o JWT (user-session E admin-access) só carrega
 * { endereco, tipo, mfa_verified? } — NÃO existe role/metadata. Por isso o
 * "corporativo" NÃO se lê do token: faz-se LOOKUP no Blob "cotas"
 * (campo tipo === "corporativo"). O caso "admin" reutiliza confirmarAdminChat
 * (mesmo gate de segurança do MC15.4.2 — zero regressão, R0/R2).
 *
 * Fonte de verdade é SEMPRE o backend (R4): nunca confiar em role enviado pelo cliente.
 *
 * @returns {Promise<{ perfil: "visitante"|"comum"|"corporativo"|"admin", endereco: string|null }>}
 */
async function detectarPerfil(req) {
  // 1) admin — admin-access JWT / x-admin-token / user-session ∈ admin-list.
  const adm = await confirmarAdminChat(req);
  if (adm.ok) return { perfil: "admin", endereco: adm.endereco || null };

  // 2) sem Bearer → visitante.
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearer) return { perfil: "visitante", endereco: null };

  // 3) user-session válido? (token inválido/expirado → visitante, nunca 500).
  let endereco;
  try {
    const payload = await verificarUserSession(bearer);
    endereco = String(payload?.endereco || "").toLowerCase();
  } catch {
    return { perfil: "visitante", endereco: null };
  }
  if (!endereco) return { perfil: "visitante", endereco: null };

  // 4) corporativo? lookup TOLERANTE no Blob "cotas" (falha/ausente → comum).
  try {
    const store = getStore({ name: STORE_COTAS, consistency: "strong" });
    const cota = await store.get(endereco, { type: "json" });
    if (cota && cota.tipo === "corporativo") {
      return { perfil: "corporativo", endereco };
    }
  } catch (err) {
    console.warn("[chatbot] lookup cotas falhou (trata como comum):", err?.message);
  }

  // 5) default: comum (autenticado, sem cota corporativa, ∉ admin-list).
  return { perfil: "comum", endereco };
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

  // Confirma admin: admin-access JWT/x-admin-token OU user-session com
  // endereço ∈ admin-list (GUTO é usado por admin logado normalmente — MC15.4.2).
  const auth = await confirmarAdminChat(req);
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
