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
import { obterResposta, obterPromptSystem } from "./_lib/guto-perfis.mjs";
import { getConfig } from "./_lib/data-store.mjs";
import { resolverRecursos } from "./_lib/recursos-app-config.mjs";
import { gerarCodigoIndicacao, estatisticasIndicador, gerarRelatorioIndicacoes, referralAtivo } from "./_lib/referral.mjs";
import { lerSessaoWizard, salvarSessaoWizard, limparSessaoWizard } from "./_lib/wizard-session.mjs";
import { simularVencedorMenorLance, rotuloVencedor, brlCentavos } from "./_lib/simulador.mjs";
import { obterMetricasPulso } from "./_lib/pulso.mjs";
import { escreverEstadoSistema, lerEstadoSistema } from "./_lib/system-state.mjs";
import { registrarDecisao, buscarDecisaoSemelhante } from "./_lib/log-operacional.mjs";
// MC17.1 — saldo de senhas de troco do lojista + resumo para o admin.
import { lerTroco, resumoTrocoAdmin } from "./_lib/troco-senhas.mjs";

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
  // MC15.6.2 — wizard é agora o fluxo PADRÃO de criação. Captura tanto os
  // gatilhos explícitos (wizard/setup/assistente) como o pedido genérico de
  // criação ("quero criar", "criar edição", "novo leilão", "nova edição").
  // Testado ANTES de criar_edicao em detectarIntent → qualquer pedido de
  // criação inicia o fluxo guiado de 3 passos. encerrar/listar são testados
  // ANTES (ordem em detectarIntent), portanto não há colisão com este padrão.
  criar_edicao_wizard: /\bwizard\b|\bsetup\b|assistente|passo a passo|novo leilao|quero criar|\b(cri[ae]r?|abr[ae]|abrir)\b.*\bedic(ao|oes)\b|nova edic(ao|oes)|criar.*guiad|edicao guiad/,
  // Mantido como fallback legado (one-shot). Após MC15.6.2 os pedidos de
  // criação caem no wizard acima; este padrão fica como rede de segurança.
  criar_edicao:    /\b(cri[ae]r?|abr[ae]|abrir)\b.*\bedic(ao|oes)\b|nova edic(ao|oes)/,
  listar_edicoes:  /\b(list[ae]r?|mostr[ae]r?|quais)\b.*\bedic(ao|oes)\b/,
  encerrar_edicao: /\b(encerr[ae]r?|fech[ae]r?|finaliz[ae]r?)\b.*\b(edic(ao|oes)|(?:prog|relamp)-\d)/,
  // MC15.5 — dados diferenciados: auditoria (admin) e dados_mercado (corporativo).
  auditoria:       /\bauditoria\b|log de edic(ao|oes)|estatisticas?/,
  dados_mercado:   /volume de lances|cotas comerciais|relatorio de mercado|dados de mercado/,
  // MC15.6 ITEM 5 — simulação de vencedor (admin + corporativo).
  simular_vencedor: /quem (ganha|ganharia|venceria|vence)|vencedor provisorio|se (o leilao )?terminasse agora|simul[ae]r?( o)? (resultado|vencedor)|apurar( agora)?/,
  // MC15.6 ITEM 6 — relatório de pulso (admin + corporativo).
  pulso_edicao: /\bpulso\b|como esta (a edicao|o leilao|indo)|metric[ao]s|relatorio de (pulso|desempenho)|desempenho da edicao/,
  // MC15.6 ITEM 7 — kill switch (admin-only). unpanic ANTES de panic na ordem.
  unpanic: /\/?unpanic\b|retomar( sistema)?|reativar( sistema)?|sair do (modo )?panico|despausar/,
  panic:   /\/?panic\b|modo panico|parar tudo|congelar (sistema|tudo)|emergencia/,
  // MC15.6 ITEM 10 — memória operacional (admin-only).
  memoria: /memoria( operacional| evolutiva)?|historico de (decis|acoe)|como (resolvi|resolveu|fiz)( isso)?( antes)?|decis(ao|oes) (passad|anterior)|o que (fiz|fizemos) (antes|da ultima)/,
  // MC15.8.1 ITEM 8 — relatório de indicações (admin-only). Testado ANTES de
  // auditoria para "estatisticas de indicacoes" cair aqui (e não em auditoria).
  relatorio_indicacoes: /relatorio.*indica|indica.*relatorio|indique e ganhe relatorio|como estao as indica|estatisticas? de indica/,
  // MC15.8.1 ITEM 10 — Indique e Ganhe (comum/corporativo/admin). Testado DEPOIS
  // de relatorio_indicacoes, para "indique e ganhe relatorio" cair no relatório.
  indique_e_ganhe: /indique e ganh|codigo de indicac|meu (codigo|link)|link de indicac|ganhar (senhas? )?(com |por )?indicac|programa de indicac|minhas indicac|como indic|convidar amigo/,
  // MC17.1 — relatório de compras/senhas (admin-only).
  relatorio_compras: /relatorio de (compras|vendas)|quem comprou (cotas|senhas)|vendas de senhas|senhas (vendidas|expiradas)|relatorio de senhas/,
  // MC17.1 — preços/pacotes das cotas comerciais (lojista).
  pacotes_cotas: /pacotes? de cota|precos? das cotas|quanto custa[m]? (a |as )?cotas?|planos de cota|tabela de cotas|valores das cotas/,
  // MC17.1 — contratar cota comercial (lojista).
  comprar_cotas: /comprar (uma )?cota|contratar (uma )?cota|quero (uma )?cota|adquirir cota|contratar (bronze|prata|ouro|diamante)/,
  // MC17.1 — saldo de senhas de troco (perfis autenticados).
  meu_saldo: /\bmeu saldo\b|minhas senhas|quantas senhas (eu )?tenho|saldo de (senhas|troco)|senhas de troco/,
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
export function detectarIntent(texto) {
  const t = String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos combinantes (NFD)
    .toLowerCase();
  // ordem importa: específicos (auditoria/dados) antes; encerrar/listar antes de criar.
  if (INTENT_PATTERNS.relatorio_compras.test(t)) return "relatorio_compras";
  if (INTENT_PATTERNS.relatorio_indicacoes.test(t)) return "relatorio_indicacoes";
  if (INTENT_PATTERNS.indique_e_ganhe.test(t)) return "indique_e_ganhe";
  if (INTENT_PATTERNS.pacotes_cotas.test(t))   return "pacotes_cotas";
  if (INTENT_PATTERNS.comprar_cotas.test(t))   return "comprar_cotas";
  if (INTENT_PATTERNS.meu_saldo.test(t))       return "meu_saldo";
  if (INTENT_PATTERNS.auditoria.test(t))       return "auditoria";
  if (INTENT_PATTERNS.dados_mercado.test(t))   return "dados_mercado";
  if (INTENT_PATTERNS.simular_vencedor.test(t)) return "simular_vencedor";
  if (INTENT_PATTERNS.pulso_edicao.test(t))    return "pulso_edicao";
  if (INTENT_PATTERNS.unpanic.test(t))         return "unpanic";
  if (INTENT_PATTERNS.panic.test(t))           return "panic";
  if (INTENT_PATTERNS.memoria.test(t))         return "memoria";
  if (INTENT_PATTERNS.encerrar_edicao.test(t)) return "encerrar_edicao";
  if (INTENT_PATTERNS.listar_edicoes.test(t))  return "listar_edicoes";
  if (INTENT_PATTERNS.criar_edicao_wizard.test(t)) return "criar_edicao_wizard";
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
 * MC15.5 — Lê as últimas N entradas do Blob "auditoria" (mais recentes primeiro).
 * Chaves = `${Date.now()}-${rand}` → ordenação lexicográfica desc ≈ cronológica.
 * Read-only; fail-soft (falha → { qtd:0, linhas:"" }).
 */
async function lerAuditoria(n = 5) {
  try {
    const store = getStore({ name: "auditoria", consistency: "strong" });
    const { blobs } = await store.list();
    const chaves = blobs.map((b) => b.key).sort().reverse().slice(0, n);
    const linhas = [];
    for (const k of chaves) {
      try {
        const r = await store.get(k, { type: "json" });
        if (r) linhas.push(`${r.acao} ${r.edicaoId} (${r.origem})`);
      } catch { /* ignora entrada corrompida */ }
    }
    return { qtd: linhas.length, linhas: linhas.join("; ") };
  } catch (err) {
    console.warn("[chatbot] leitura de auditoria falhou:", err?.message);
    return { qtd: 0, linhas: "" };
  }
}

// ── MC15.6 ITEM 3 — Wizard de criação de edição (máquina de 3 passos) ────────
const WIZARD_INCREMENTO_PADRAO_CENTAVOS = 500; // R$ 5,00 (sugestão D4)

/** Parseia um valor monetário em centavos. "R$ 50" → 5000; "5,50" → 550. */
function parseDinheiroCentavos(texto) {
  const m = String(texto || "").match(/r?\$?\s*([0-9]{1,9}(?:[.,][0-9]{1,2})?)\s*(?:reais|brl)?/i);
  if (!m) return null;
  let raw = m[1];
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", "."); // BR: ponto=milhar, vírgula=decimal
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

function normalizarTexto(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function ehCancelar(texto) { return /\b(cancela|cancelar|abortar|sair|desistir)\b/.test(normalizarTexto(texto)); }
function ehConfirmar(texto) { return /\b(publicar|publica|confirmar|confirma|criar|cria|sim|ok)\b/.test(normalizarTexto(texto)); }

/** Formata centavos como BRL "R$ 5,00". */
function brl(centavos) {
  if (!Number.isInteger(centavos)) return "—";
  return "R$ " + (centavos / 100).toFixed(2).replace(".", ",");
}

const WIZ_Q1 = "Passo 1/3 — Qual o produto e o valor mínimo (base)? Ex.: iPhone 15, R$ 50.";
const WIZ_Q2 = "Passo 2/3 — Tipo e duração? Relâmpago ou Programado, e por quanto tempo (ex.: relâmpago, 30 min).";
function wizQ3() { return `Passo 3/3 — Valor mínimo de incremento? Sugestão: ${brl(WIZARD_INCREMENTO_PADRAO_CENTAVOS)}. Responda com o valor ou 'padrão'.`; }

/** Resposta de um passo do wizard (modoResposta "wizard" + payload p/ UI). */
function respostaWizard(perfil, msg, wizard) {
  return jsonResponse({
    resposta: obterResposta("criar_edicao_wizard", perfil, { msg }),
    fontes: [], modoBusca: "intent", modoResposta: "wizard",
    intent: "criar_edicao_wizard", perfil, wizard,
  });
}

async function iniciarWizard(perfil, endereco) {
  await salvarSessaoWizard(endereco, { etapa: 1 });
  return respostaWizard(perfil, WIZ_Q1, { etapa: 1, passo: "1/3", opcoes: ["Cancelar"] });
}

/** Continua o wizard com a sessão ativa (admin). Retorna sempre um Response. */
async function continuarWizard(req, pergunta, perfil, endereco, sessao) {
  if (ehCancelar(pergunta)) {
    await limparSessaoWizard(endereco);
    return respostaWizard(perfil, "Assistente cancelado. Nenhuma edição foi criada.", { etapa: "cancelado", concluido: true });
  }

  // Passo 1 — produto + valor base.
  if (sessao.etapa === 1) {
    const valorBaseCentavos = parseDinheiroCentavos(pergunta);
    let produto = String(pergunta || "").replace(/r?\$?\s*[0-9]{1,9}(?:[.,][0-9]{1,2})?\s*(?:reais|brl)?/ig, " ");
    produto = sanitizarProduto(produto.replace(/[,;]+/g, " "));
    if (!produto || !Number.isInteger(valorBaseCentavos) || valorBaseCentavos < 1) {
      return respostaWizard(perfil, "Não consegui ler o produto e a base. " + WIZ_Q1, { etapa: 1, passo: "1/3", opcoes: ["Cancelar"] });
    }
    await salvarSessaoWizard(endereco, { ...sessao, etapa: 2, produto, valorBaseCentavos });
    return respostaWizard(perfil, WIZ_Q2, { etapa: 2, passo: "2/3", opcoes: ["Relâmpago", "Programado", "Cancelar"] });
  }

  // Passo 2 — tipo + duração.
  if (sessao.etapa === 2) {
    const tipo = normalizarTipo(pergunta);
    const duracaoSegundos = extrairDuracaoSegundos(pergunta);
    if (!tipo || !duracaoSegundos) {
      return respostaWizard(perfil, "Preciso do tipo e da duração. " + WIZ_Q2, { etapa: 2, passo: "2/3", opcoes: ["Relâmpago", "Programado", "Cancelar"] });
    }
    await salvarSessaoWizard(endereco, { ...sessao, etapa: 3, tipo, duracaoSegundos });
    return respostaWizard(perfil, wizQ3(), { etapa: 3, passo: "3/3", opcoes: ["Padrão (R$ 5)", "Cancelar"] });
  }

  // Passo 3 — incremento (default R$ 5).
  if (sessao.etapa === 3) {
    const t = normalizarTexto(pergunta);
    let incrementoCentavos = parseDinheiroCentavos(pergunta);
    if (incrementoCentavos == null && /\b(padrao|default|sugest|sim|ok)\b/.test(t)) {
      incrementoCentavos = WIZARD_INCREMENTO_PADRAO_CENTAVOS;
    }
    if (!Number.isInteger(incrementoCentavos) || incrementoCentavos < 1) {
      incrementoCentavos = WIZARD_INCREMENTO_PADRAO_CENTAVOS;
    }
    const sessaoFinal = { ...sessao, etapa: "confirmacao", incrementoCentavos };
    await salvarSessaoWizard(endereco, sessaoFinal);
    const resumo = {
      produto: sessaoFinal.produto,
      tipo: sessaoFinal.tipo,
      duracaoMin: Math.round(sessaoFinal.duracaoSegundos / 60),
      valorBase: brl(sessaoFinal.valorBaseCentavos),
      incremento: brl(sessaoFinal.incrementoCentavos),
    };
    const msg = `Resumo — Produto: ${resumo.produto}. Tipo: ${resumo.tipo}. Duração: ${resumo.duracaoMin} min. Base: ${resumo.valorBase}. Incremento: ${resumo.incremento}. Confirmar publicação?`;
    return respostaWizard(perfil, msg, { etapa: "confirmacao", passo: "3/3", resumo, opcoes: ["Publicar Agora", "Cancelar"] });
  }

  // Confirmação — publicar ou re-perguntar.
  if (sessao.etapa === "confirmacao") {
    if (!ehConfirmar(pergunta)) {
      return respostaWizard(perfil, "Responda 'publicar agora' para criar ou 'cancelar'.", { etapa: "confirmacao", opcoes: ["Publicar Agora", "Cancelar"] });
    }
    const rl = await aplicarRateLimit(req, "guto-admin", RL_GUTO_ADMIN_RPM);
    if (rl) return respostaWizard(perfil, "Limite de comandos administrativos atingido. Aguarde um minuto.", { etapa: "confirmacao", opcoes: ["Publicar Agora", "Cancelar"] });
    const res = await criarEdicao({
      tipo: sessao.tipo, produto: sessao.produto, duracaoSegundos: sessao.duracaoSegundos,
      criadoPor: endereco, origem: "guto",
      valorBaseCentavos: sessao.valorBaseCentavos, incrementoCentavos: sessao.incrementoCentavos,
    });
    await limparSessaoWizard(endereco);
    if (!res.ok) {
      return respostaWizard(perfil, `Não foi possível criar a edição: ${res.message}`, { etapa: "erro", concluido: true });
    }
    // ITEM 9 — log de decisão (fail-soft).
    await registrarDecisao({ trigger: "criar_edicao_wizard", action: `${res.edicao.id} criada (${res.edicao.tipo})`, userId: endereco });
    return jsonResponse({
      resposta: obterResposta("criar_edicao", "admin", {
        id: res.edicao.id, tipo: res.edicao.tipo, produto: res.edicao.produto, termino: res.edicao.termino_em,
      }),
      fontes: [], modoBusca: "intent", modoResposta: "acao",
      intent: "criar_edicao_wizard", perfil, edicao: res.edicao,
      wizard: { etapa: "publicado", concluido: true },
    });
  }

  // etapa desconhecida/corrompida → limpa e cai no fluxo normal.
  await limparSessaoWizard(endereco);
  return null;
}

// ── Helpers de resposta do intent-router (MC39.22.1) ─────────────────────────
// Toda resposta de intent partilha o shape { resposta, fontes:[], modoBusca:
// "intent", modoResposta, intent, perfil, ...extra }. Antes repetido ~39× inline
// (e o bloco recusa-perfil 12× verbatim) — agora dois helpers + tabela declarativa.
const RL_MSG_ADMIN = "Limite de comandos administrativos atingido. Aguarde um minuto e tente novamente.";

function intentResp(perfil, intent, { resposta, modoResposta, ...extra }) {
  return jsonResponse({ resposta, fontes: [], modoBusca: "intent", modoResposta, intent, perfil, ...extra });
}

/** Recusa por perfil (modoResposta "recusa-perfil"). NUNCA executa lógica nem vaza dados. */
function recusa(perfil, intent, data = {}) {
  return intentResp(perfil, intent, {
    resposta: obterResposta(intent, perfil, data),
    modoResposta: "recusa-perfil",
  });
}

// Predicados de perfil (gate declarativo por intent).
const ehAdminPerfil  = (perfil) => perfil === "admin";
const ehCorpOuAdmin  = (perfil) => perfil === "admin" || perfil === "corporativo";
const ehAutenticado  = (perfil, endereco) => perfil !== "visitante" && !!endereco;
const qualquerPerfil = () => true;

// kill switch (panic/unpanic) — ADMIN-ONLY. Handler único (MC15.6 ITEM 7).
async function killSwitch(intent, perfil, endereco) {
  const novoStatus = intent === "panic" ? "paused" : "active";
  try {
    const estado = await escreverEstadoSistema(novoStatus, intent === "panic" ? "acionado via GUTO" : null);
    // ITEM 9 — log de decisão (fail-soft).
    await registrarDecisao({ trigger: intent, action: `sistema ${novoStatus}`, userId: endereco });
    return intentResp(perfil, intent, {
      resposta: obterResposta(intent, "admin", { timestamp: estado.timestamp }),
      modoResposta: "acao", systemState: estado,
    });
  } catch (err) {
    console.warn("[chatbot] kill switch falhou:", err?.message);
    return intentResp(perfil, intent, {
      resposta: `Não foi possível ${intent === "panic" ? "pausar" : "reativar"} o sistema agora: ${err?.message || "erro"}.`,
      modoResposta: "erro", erro: "system_state_falhou",
    });
  }
}

// ── Tabela de despacho declarativa (MC39.22.1) ───────────────────────────────
// Substitui a cadeia de ~16 `if (intent === ...)`. Cada intent declara: o gate
// de perfil (`gate`), se a recusa usa um tom de perfil diferente (`recusaRole`,
// p.ex. indique_e_ganhe/meu_saldo recusam sempre como "visitante"), se exige
// rate-limit admin (`rl`), e o handler de SUCESSO (`run`). O gate, a recusa e o
// rate-limit são aplicados de forma UNIFORME em tratarIntentEdicoes — a ordem de
// teste é irrelevante porque detectarIntent devolve exatamente UM intent (D7).
// Gates/segurança e shapes de resposta preservados 1:1 face ao MC17.1 (R0/SUPERPERS).
const INTENT_HANDLERS = {
  // MC15.6 ITEM 3 — início do wizard (gatilho explícito; admin-only).
  criar_edicao_wizard: {
    gate: ehAdminPerfil, rl: true,
    run: ({ perfil, endereco }) => iniciarWizard(perfil, endereco),
  },

  // MC15.5 — auditoria (admin-only): dados reais do Blob "auditoria".
  auditoria: {
    gate: ehAdminPerfil,
    run: async ({ perfil }) => {
      const { qtd, linhas } = await lerAuditoria(5);
      return intentResp(perfil, "auditoria", {
        resposta: obterResposta("auditoria", "admin", { qtd, linhas }),
        modoResposta: "acao",
      });
    },
  },

  // MC15.8.1 ITEM 8 — relatório de indicações (admin-only). Read-only, informativo.
  relatorio_indicacoes: {
    gate: ehAdminPerfil,
    run: async ({ perfil }) => {
      let relatorio = "";
      try { relatorio = (await gerarRelatorioIndicacoes()).texto; }
      catch (err) {
        console.warn("[chatbot] gerarRelatorioIndicacoes falhou:", err?.message);
        relatorio = "Nao foi possivel compilar o relatorio de indicacoes agora.";
      }
      return intentResp(perfil, "relatorio_indicacoes", {
        resposta: obterResposta("relatorio_indicacoes", "admin", { relatorio }),
        modoResposta: "acao",
      });
    },
  },

  // MC15.8.1 ITEM 10 — Indique e Ganhe (comum/corporativo/admin). Visitante (ou
  // sem endereço) recebe CTA de registo. Devolve `indicacao` → card roxo no front.
  indique_e_ganhe: {
    gate: ehAutenticado, recusaRole: "visitante",
    run: async ({ perfil, endereco }) => {
      if (!referralAtivo()) {
        return intentResp(perfil, "indique_e_ganhe", {
          resposta: "O programa Indique e Ganhe está temporariamente desligado. Volta em breve!",
          modoResposta: "feature-off",
        });
      }
      let indicacao = null;
      try {
        const codigoInfo = await gerarCodigoIndicacao(endereco);
        const stats = await estatisticasIndicador(endereco);
        indicacao = {
          codigo: codigoInfo.codigo,
          total_indicados:   stats.total_indicados,
          total_convertidos: stats.total_convertidos,
          senhas_ganhas:     stats.senhas_ganhas,
        };
      } catch (err) {
        console.warn("[chatbot] indique_e_ganhe dados falharam:", err?.message);
        return intentResp(perfil, "indique_e_ganhe", {
          resposta: "Não consegui buscar o teu código de indicação agora. Tenta daqui a pouco!",
          modoResposta: "erro",
        });
      }
      return intentResp(perfil, "indique_e_ganhe", {
        resposta: obterResposta("indique_e_ganhe", perfil, indicacao),
        modoResposta: "perfil", indicacao,
      });
    },
  },

  // MC15.5 — dados_mercado (corporativo + admin): resumo seguro (edições ativas).
  dados_mercado: {
    gate: ehCorpOuAdmin,
    run: async ({ perfil }) => {
      const { edicoes } = await listarEdicoes();
      const edicoesAtivas = Object.values(edicoes).filter((e) => e.status === "aberto").length;
      return intentResp(perfil, "dados_mercado", {
        resposta: obterResposta("dados_mercado", perfil, { edicoesAtivas }),
        modoResposta: "perfil",
      });
    },
  },

  // MC17.1 — relatório de compras/senhas (admin-only): total ativo e expirado.
  relatorio_compras: {
    gate: ehAdminPerfil,
    run: async ({ perfil }) => {
      let resumo = { lojistas: 0, senhasAtivas: 0, senhasExpiradas: 0 };
      try { resumo = await resumoTrocoAdmin(); }
      catch (err) { console.warn("[chatbot] resumoTrocoAdmin falhou:", err?.message); }
      return intentResp(perfil, "relatorio_compras", {
        resposta: obterResposta("relatorio_compras", "admin", resumo),
        modoResposta: "acao",
      });
    },
  },

  // MC17.1 — saldo de senhas de troco (autenticados; visitante recebe CTA).
  meu_saldo: {
    gate: ehAutenticado, recusaRole: "visitante",
    run: async ({ perfil, endereco }) => {
      let troco = { saldoTroco: 0, expiramEmBreve: 0 };
      try { troco = await lerTroco(endereco); }
      catch (err) { console.warn("[chatbot] lerTroco falhou:", err?.message); }
      return intentResp(perfil, "meu_saldo", {
        resposta: obterResposta("meu_saldo", perfil, { ...troco, endereco }),
        modoResposta: "perfil",
      });
    },
  },

  // MC17.1 — contratar cota comercial / pacotes (informativo, por perfil).
  comprar_cotas: {
    gate: qualquerPerfil,
    run: ({ perfil }) => intentResp(perfil, "comprar_cotas", {
      resposta: obterResposta("comprar_cotas", perfil, {}), modoResposta: "perfil",
    }),
  },
  pacotes_cotas: {
    gate: qualquerPerfil,
    run: ({ perfil }) => intentResp(perfil, "pacotes_cotas", {
      resposta: obterResposta("pacotes_cotas", perfil, {}), modoResposta: "perfil",
    }),
  },

  // MC15.6 ITEM 5 — simular_vencedor (admin + corporativo). Menor lance único.
  simular_vencedor: {
    gate: ehCorpOuAdmin,
    run: async ({ perfil, pergunta }) => {
      const edicaoId = extrairEdicaoId(pergunta) || "R-1";
      const sim = await simularVencedorMenorLance(edicaoId);
      return intentResp(perfil, "simular_vencedor", {
        resposta: obterResposta("simular_vencedor", perfil, {
          edicaoId,
          ok: sim.ok,
          erro: !!sim.erro,
          vencedor: sim.ok ? rotuloVencedor(sim) : null,
          valor: sim.ok ? brlCentavos(sim.valorCentavos) : null,
          totalLances: sim.totalLances,
          lancesUnicos: sim.lancesUnicos,
        }),
        modoResposta: "acao", simulacao: sim,
      });
    },
  },

  // MC15.6 ITEM 10 — memória operacional (ADMIN-ONLY): decisão semelhante.
  memoria: {
    gate: ehAdminPerfil,
    run: async ({ perfil, pergunta }) => {
      let achado = null;
      try { achado = await buscarDecisaoSemelhante(pergunta); }
      catch (err) { console.warn("[chatbot] buscarDecisaoSemelhante falhou:", err?.message); }
      return intentResp(perfil, "memoria", {
        resposta: obterResposta("memoria", "admin", {
          achou: !!achado,
          trigger: achado?.entrada?.trigger || null,
          action: achado?.entrada?.action || null,
          quando: achado?.entrada?.timestamp || null,
          total: achado?.total || 0,
        }),
        modoResposta: "acao", memoria: achado,
      });
    },
  },

  // MC15.6 ITEM 7 — kill switch (ADMIN-ONLY): /panic e /unpanic.
  panic:   { gate: ehAdminPerfil, rl: true, run: ({ perfil, endereco }) => killSwitch("panic", perfil, endereco) },
  unpanic: { gate: ehAdminPerfil, rl: true, run: ({ perfil, endereco }) => killSwitch("unpanic", perfil, endereco) },

  // MC15.6 ITEM 6 — pulso_edicao (admin + corporativo). 4 métricas vitais.
  pulso_edicao: {
    gate: ehCorpOuAdmin,
    run: async ({ perfil, pergunta }) => {
      const edicaoId = extrairEdicaoId(pergunta) || "R-1";
      const m = await obterMetricasPulso(edicaoId);
      return intentResp(perfil, "pulso_edicao", {
        resposta: obterResposta("pulso_edicao", perfil, {
          edicaoId,
          volumePorMin: m.volumePorMin,
          licitantesUnicos: m.licitantesUnicos,
          valorizacaoPct: m.valorizacaoPct,
          abandonoCheckoutPct: m.abandonoCheckoutPct,
          totalLances: m.totalLances,
        }),
        modoResposta: "acao", pulso: m,
      });
    },
  },

  // listar_edicoes: lista é PÚBLICA (GET /edicoes). Logados veem-na no tom do
  // perfil; visitante recebe convite (não é dado sensível).
  listar_edicoes: {
    gate: qualquerPerfil,
    run: async ({ perfil }) => {
      let lista = "";
      let total = 0;
      if (perfil !== "visitante") {
        const { edicoes } = await listarEdicoes();
        const ids = Object.keys(edicoes);
        total = ids.length;
        lista = ids.map((id) => `${id} (${edicoes[id].tipo}, ${edicoes[id].status})`).join("; ");
      }
      return intentResp(perfil, "listar_edicoes", {
        resposta: obterResposta("listar_edicoes", perfil, { lista, total }),
        modoResposta: perfil === "admin" ? "acao" : "perfil",
      });
    },
  },

  // encerrar_edicao: comando MUTANTE → admin-only + rate-limit (gate inalterado).
  encerrar_edicao: {
    gate: ehAdminPerfil, rl: true,
    run: async ({ perfil, pergunta, endereco }) => {
      const id = extrairEdicaoId(pergunta);
      if (!EDICAO_ID_RE.test(id)) {
        return intentResp(perfil, "encerrar_edicao", {
          resposta: "Para encerrar, indique o id da edição (ex.: PROG-3 ou RELAMP-7).",
          modoResposta: "faltam-dados",
        });
      }
      const res = await encerrarEdicao({ edicaoId: id, endereco, origem: "guto" });
      if (!res.ok) {
        return intentResp(perfil, "encerrar_edicao", {
          resposta: `Não foi possível encerrar ${id}: ${res.message}`,
          modoResposta: "erro", erro: res.code,
        });
      }
      // ITEM 9 — log de decisão (fail-soft).
      await registrarDecisao({ trigger: "encerrar_edicao", action: `${res.edicao.id} encerrada`, userId: endereco });
      return intentResp(perfil, "encerrar_edicao", {
        resposta: obterResposta("encerrar_edicao", "admin", { id: res.edicao.id }),
        modoResposta: "acao", edicao: res.edicao,
      });
    },
  },

  // criar_edicao (one-shot legado): comando MUTANTE → admin-only + rate-limit.
  criar_edicao: {
    gate: ehAdminPerfil, rl: true,
    run: async ({ perfil, pergunta, endereco }) => {
      const tipo = extrairTipo(pergunta);
      const duracaoSegundos = extrairDuracaoSegundos(pergunta);
      const produto = extrairProduto(pergunta);
      if (!tipo || !duracaoSegundos || !produto) {
        const faltam = [
          !tipo ? "o tipo (relâmpago ou programado)" : null,
          !duracaoSegundos ? "a duração (ex.: 30 min)" : null,
          !produto ? "o produto" : null,
        ].filter(Boolean).join(", ");
        return intentResp(perfil, "criar_edicao", {
          resposta: `Para criar a edição preciso de: ${faltam}.`,
          modoResposta: "faltam-dados",
        });
      }
      const res = await criarEdicao({ tipo, produto, duracaoSegundos, criadoPor: endereco, origem: "guto" });
      if (!res.ok) {
        return intentResp(perfil, "criar_edicao", {
          resposta: `Não foi possível criar a edição: ${res.message}`,
          modoResposta: "erro", erro: res.code,
        });
      }
      // ITEM 9 — log de decisão (fail-soft).
      await registrarDecisao({ trigger: "criar_edicao", action: `${res.edicao.id} criada (${res.edicao.tipo})`, userId: endereco });
      return intentResp(perfil, "criar_edicao", {
        resposta: obterResposta("criar_edicao", "admin", {
          id: res.edicao.id, tipo: res.edicao.tipo, produto: res.edicao.produto, termino: res.edicao.termino_em,
        }),
        modoResposta: "acao", edicao: res.edicao,
      });
    },
  },
};

/**
 * Intent-router do GUTO (MC15.4+). Confirma admin via Authorization repassado
 * pelo ChatbotWidget. Mantém o shape de resposta backward-compatible.
 *
 * Fluxo: (1) wizard ativo intercepta; (2) detectarIntent; (3) tabela de despacho
 * aplica gate de perfil → recusa-perfil; rate-limit admin (se `rl`); handler.
 *
 * @returns {Promise<Response|null>} Response do GUTO se tratada; null → RAG.
 */
export async function tratarIntentEdicoes(req, pergunta, perfil, adminEndereco) {
  const ehAdmin = perfil === "admin";

  // MC15.6 ITEM 3 — Wizard: se há sessão ativa para este admin, a mensagem é a
  // resposta ao passo corrente (intercepta ANTES do roteamento por intent).
  if (ehAdmin && adminEndereco) {
    try {
      const sessao = await lerSessaoWizard(adminEndereco);
      if (sessao) return await continuarWizard(req, pergunta, perfil, adminEndereco, sessao);
    } catch (err) {
      console.warn("[chatbot] wizard ativo falhou (ignora):", err?.message);
    }
  }

  const intent = detectarIntent(pergunta);
  if (!intent) return null; // sem intenção → RAG normal (anti-regressão)

  const spec = INTENT_HANDLERS[intent];
  if (!spec) return null; // intent sem handler → RAG (fail-soft)

  // Gate de perfil declarativo. Não-admin/perfil insuficiente → recusa-perfil
  // (NUNCA executa, NUNCA vaza dados). recusaRole força o tom (ex.: "visitante").
  if (!spec.gate(perfil, adminEndereco)) {
    return recusa(spec.recusaRole || perfil, intent);
  }

  // Rate-limit de comandos admin mutantes (R6) — só para intents marcados `rl`.
  if (spec.rl) {
    const limited = await aplicarRateLimit(req, "guto-admin", RL_GUTO_ADMIN_RPM);
    if (limited) {
      return intentResp(perfil, intent, { resposta: RL_MSG_ADMIN, modoResposta: "rate-limit" });
    }
  }

  return spec.run({ req, pergunta, perfil, endereco: adminEndereco });
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

  const systemPrompt = opts.systemPrompt || PROMPT_SYSTEM;
  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
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
  // MC15.5 — perfil determina TOM, dados e capacidades. Derivado só no backend (R4).
  // Fail-soft: se a deteção falhar, trata como visitante (nunca quebra o GUTO).
  let perfil = "visitante";
  let perfilEndereco = null;
  try {
    const p = await detectarPerfil(req);
    perfil = p.perfil;
    perfilEndereco = p.endereco;
  } catch (err) {
    console.warn("[chatbot] detectarPerfil falhou, assume visitante:", err?.message);
  }

  // MC29.1 — modo de conformidade: se o leilão não está ativo na plataforma do
  // utilizador (app das lojas), o GUTO assume a persona de loja e informa que o
  // leilão está na versão Web. Fail-soft: erro de leitura → leilão ativo (PWA),
  // nunca degrada o utilizador real.
  let modoConformidade = false;
  try {
    const plataforma = typeof body.plataforma === "string" ? body.plataforma : "pwa";
    const config = await getConfig("recursos_app");
    modoConformidade = !resolverRecursos(config, plataforma).isLeilaoAtivo;
  } catch (err) {
    console.warn("[chatbot] resolução de plataforma falhou (fail-soft → leilão ativo):", err?.message);
  }

  try {
    const intentResp = await tratarIntentEdicoes(req, pergunta, perfil, perfilEndereco);
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
    resposta = await chamarLLM(pergunta, contexto, { systemPrompt: obterPromptSystem(perfil, { conformidade: modoConformidade }) });
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

  // MC15.5 — enquadra a resposta RAG conforme o perfil (visitante recebe convite;
  // demais perfis recebem a resposta tal qual, já no tom do system prompt do perfil).
  const respostaFinal = obterResposta("fallback_rag", perfil, { respostaRAG: resposta });

  const fontes = chunks.map((c) => ({ id: c.id, score: Number(c.score.toFixed(4)) }));
  console.info("[chatbot] resposta gerada", {
    perguntaLen: pergunta.length,
    chunks: chunks.length,
    scoreTop: fontes[0]?.score,
    modoBusca,
    modoResposta,
    perfil,
  });
  return jsonResponse({ resposta: respostaFinal, fontes, modoBusca, modoResposta, perfil });
};
