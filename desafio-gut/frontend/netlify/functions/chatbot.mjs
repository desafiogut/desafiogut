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
import { respostaPreflight } from "./_lib/cors.mjs";

const STORE_NAME      = "rag";
const RATE_LIMIT_RPM  = 10;
const PERGUNTA_MAX    = 500;
const TOP_K           = 3;

// MC88.20 (P1) — orçamento do excerto no fallback SEM LLM. Um chunk, não três:
// o formato antigo (3 × 600 chars + cabeçalhos de relevância) era o "dar texto".
const LIMITE_TRECHO_TEMPLATE = 400;

// MC88.20 (P3) — o `PROMPT_SYSTEM` genérico que vivia aqui foi REMOVIDO. Duplicava
// o SYS_BASE de _lib/guto-perfis.mjs (segunda fonte de verdade para o tom do GUTO)
// e servia de fallback silencioso em chamarLLM: qualquer call-site que esquecesse
// `systemPrompt` perdia a personalidade sem erro visível. Agora `systemPrompt` é
// OBRIGATÓRIO e a falta dele falha alto.

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
  // ── MC89.2 — MÉTRICAS DO SISTEMA (admin) ──────────────────────────────────
  //
  // ⚠️ COLISÕES QUE ESTES PADRÕES TÊM DE EVITAR (verificadas uma a uma):
  //   `pulso_edicao`  já casa a palavra solta "metricas" → estes padrões NÃO a
  //                   casam sozinha. "Pulso" é sobre a EDIÇÃO; isto é sobre o
  //                   SISTEMA, e por isso exige "sistema"/"plataforma".
  //   `auditoria`     já casa "estatisticas" → não tocamos nessa palavra.
  //   `meu_saldo`     casa "meu saldo" e é testado ANTES → "saldo em circulacao"
  //                   não colide porque não tem "meu".
  //   `pacotes_cotas` casa "quanto custam as cotas" e é testado ANTES.
  // Há teste a afirmar que os 6 casos acima continuam a ir para o intent antigo.
  metricas_usuarios:  /quantos? (utilizadores|usuarios)|(utilizadores|usuarios) (ativos|com atividade|registados|cadastrados)|quantas pessoas/,
  metricas_financeiro: /saldo em circulacao|quanto (ja )?(foi )?(arrecadado|creditado|recebido)|total (de |em )?creditos|financeiro (do|da) (sistema|plataforma)/,
  // "como esta a FILA" não colide com o "como esta a EDICAO" do pulso_edicao:
  // este exige a palavra "fila", que o outro não tem.
  metricas_fila:      /tamanho da fila|fila (pendente|de tarefas)|quantos? (itens|pedidos|tarefas) na fila|estado da fila|fila esta|como esta a fila/,
  metricas_eoa:       /saldo da (coordenadora|coordenacao|eoa)|carteira coordenadora|(tem|ha) gas|quanto (de )?eth/,
  metricas_geral:     /(status|estado|resumo|panorama|visao geral) (geral )?(do |da )?(sistema|plataforma)|painel de controle|como esta o sistema/,

  // MC88.44 — pedido de contacto humano. Testado POR ÚLTIMO em detectarIntent,
  // de propósito: nunca rouba um intent mais específico ("meu saldo", "quero
  // uma cota"). Só apanha quem está mesmo a pedir para falar com alguém.
  // Padrão sobre texto JÁ desacentuado e em minúsculas (ver detectarIntent).
  // MC89.9 — Comando ALFA (admin). Prefixo fixo + ação. Testado DENTRO de
  // detectarIntent e não por ordem de definição: o padrão só captura se a frase
  // começar com "ALFA:" (case-insensitive). Captura ação e parâmetros opcionais.
  comando_alfa: /^ALFA:\s*(\w+)(?:\s+(.*))?$/i,

  suporte: /\bsuporte\b|\bconta[ct]to\b|falar com (alguem|voces|humano|atendente|a coordenacao)|\batendimento\b|reclama(r|cao)|\bouvidoria\b|e-?mail (de |para )?(contato|suporte|voces)|como (falo|entro em contato|reclamo)/,
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
    .replace(/[\u0300-\u036f]/g, "") // remove acentos combinantes (NFD)
    .toLowerCase();
  // ordem importa: específicos (auditoria/dados) antes; encerrar/listar antes de criar.
  if (INTENT_PATTERNS.relatorio_compras.test(t)) return "relatorio_compras";
  if (INTENT_PATTERNS.relatorio_indicacoes.test(t)) return "relatorio_indicacoes";
  if (INTENT_PATTERNS.indique_e_ganhe.test(t)) return "indique_e_ganhe";
  if (INTENT_PATTERNS.pacotes_cotas.test(t))   return "pacotes_cotas";
  if (INTENT_PATTERNS.comprar_cotas.test(t))   return "comprar_cotas";
  if (INTENT_PATTERNS.meu_saldo.test(t))       return "meu_saldo";
  // MC89.2 — métricas do SISTEMA antes de `auditoria` e `pulso_edicao`, que são
  // sobre outra coisa (registo de ações e desempenho da EDIÇÃO). Os padrões
  // acima são estreitos de propósito para não roubar frases que já eram delas.
  if (INTENT_PATTERNS.metricas_geral.test(t))     return "metricas_geral";
  if (INTENT_PATTERNS.metricas_usuarios.test(t))  return "metricas_usuarios";
  if (INTENT_PATTERNS.metricas_financeiro.test(t)) return "metricas_financeiro";
  if (INTENT_PATTERNS.metricas_fila.test(t))      return "metricas_fila";
  if (INTENT_PATTERNS.metricas_eoa.test(t))       return "metricas_eoa";
  if (INTENT_PATTERNS.auditoria.test(t))       return "auditoria";
  if (INTENT_PATTERNS.dados_mercado.test(t))   return "dados_mercado";
  if (INTENT_PATTERNS.simular_vencedor.test(t)) return "simular_vencedor";
  if (INTENT_PATTERNS.pulso_edicao.test(t))    return "pulso_edicao";
  // MC89.9 — ALFA é prefixo FIXO e ancorado (^ALFA:). Nenhum outro padrão
  // casa "ALFA:<acao>", mas panic/unpanic têm `panic\b` e `unpanic\b` que
  // casam SUBSTRING em "alfa:panic". Por isso ALFA é testado ANTES de panic.
  if (INTENT_PATTERNS.comando_alfa.test(t))   return "comando_alfa";
  if (INTENT_PATTERNS.unpanic.test(t))         return "unpanic";
  if (INTENT_PATTERNS.panic.test(t))           return "panic";
  if (INTENT_PATTERNS.memoria.test(t))         return "memoria";
  if (INTENT_PATTERNS.encerrar_edicao.test(t)) return "encerrar_edicao";
  if (INTENT_PATTERNS.listar_edicoes.test(t))  return "listar_edicoes";
  if (INTENT_PATTERNS.criar_edicao_wizard.test(t)) return "criar_edicao_wizard";
  if (INTENT_PATTERNS.criar_edicao.test(t))    return "criar_edicao";
  // MC88.44 — ÚLTIMO de propósito. Um pedido de suporte que também mencione um
  // assunto concreto ("quero falar com voces sobre o meu saldo") deve cair no
  // intent do assunto, que responde com dados reais. Aqui fica quem só quer
  // saber com quem falar — e esse não pode receber um endereço inexistente.
  if (INTENT_PATTERNS.suporte.test(t))         return "suporte";
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

// MC88.20 (P0) — o STORE_COTAS ("cotas" em Netlify Blobs) foi REMOVIDO daqui:
// as cotas vivem em Supabase desde o MC36/MC37 e o acesso passa por
// _lib/cotas-store.mjs (getCota). Deixar a constante seria um convite a
// reintroduzir a leitura no store errado.

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
export async function detectarPerfil(req) {  // export: testado em _tests/mc8820-guto-personalidades
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

  // 4) corporativo? lookup TOLERANTE (falha/ausente → comum).
  //
  // MC88.20 (P0) — ANTES isto lia o Blob "cotas" diretamente. Com o
  // DATA_STORE_BACKEND já em "supabase", as cotas passaram a viver no Postgres
  // (MC36/MC37) e este lookup deixou de encontrar QUALQUER lojista: a cascata
  // caía no default e devolvia "comum". Resultado: a personalidade corporativa
  // nunca ativava — sem erro, sem log, sem sintoma além do tom errado.
  // Agora usa `getCota` de _lib/cotas-store.mjs, a MESMA função que cotas.mjs
  // (fonte de verdade) usa. Import dinâmico para não puxar o cliente Supabase
  // para o arranque de quem só faz uma pergunta ao GUTO.
  try {
    const { getCota } = await import("./_lib/cotas-store.mjs");
    const cota = await getCota(endereco);
    if (cota && cota.tipo === "corporativo") {
      return { perfil: "corporativo", endereco };
    }
    // Distinguir "não tem cota" de "não consegui ler" — indistinguíveis antes,
    // e foi essa ambiguidade que escondeu o defeito acima durante toda a migração.
    console.info("[chatbot] sem cota corporativa para o endereço — perfil comum");
  } catch (err) {
    console.warn("[chatbot] lookup de cota FALHOU (trata como comum):", err?.message);
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
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

// ── MC89.9 — Comando ALFA ──────────────────────────────────────────────────
// Tabela de comandos conhecidos. Cada entrada: o que faz, se é possível hoje, e
// como responder. Comandos impossíveis respondem com honestidade — nunca com
// "executado" quando não foi.

const COMANDOS_ALFA = {
  status:   "Métricas agregadas do sistema (admin-stats + on-chain).",
  fila:     "Estado atual da fila de tarefas.",
  panic:    "Pausar o sistema (kill switch).",
  unpause:  "Reativar o sistema após pausa.",
  ajuda:    "Listar comandos ALFA disponíveis.",
  reindexar_rag: "O índice RAG é construído fora do repositório pelo operador. "
    + "Execute `build-rag-index.mjs` localmente.",
  limpar_cache: "O cache Redis não está configurado (REDIS_URL ausente). "
    + "As consultas vão sempre à fonte.",
};

/**
 * Executa um comando ALFA. Todas as dependências são importadas sob demanda
 * para não pesar o cold start de quem não usa ALFA.
 */
async function executarAlfa(acao, params, { perfil, endereco }) {
  // ── Comandos que funcionam hoje ──────────────────────────────────────────
  if (acao === "status") {
    const [{ obterMetricas }, { obterSaldoEoa }] = await Promise.all([
      import("./_lib/admin-metricas.mjs"),
      import("./_lib/admin-metricas.mjs"),
    ]);
    const [metrica, eoa] = await Promise.allSettled([
      obterMetricas(),
      obterSaldoEoa().catch(() => ({ erro: "cadeia indisponível" })),
    ]);
    const m = metrica.status === "fulfilled" ? metrica.value : null;
    const e = eoa.status === "fulfilled" ? eoa.value : { erro: "cadeia indisponível" };
    const u = m?.utilizadores?.comAtividade ?? "—";
    const f = m?.financeiro;
    const fila = m?.operacao?.fila;
    return [
      `📊 STATUS DO SISTEMA`,
      ``,
      `Utilizadores com atividade ..... ${u}`,
      `Saldo em circulação ........... ${f ? `R$ ${((f.saldoTotalCentavos || 0) / 100).toFixed(2)}` : "—"}`,
      `Créditos (30 d) ............... ${f?.creditosJanela ?? "—"}`,
      `Fila — pendentes / falhadas ... ${fila?.pendentes ?? "—"} / ${fila?.falhadas ?? "—"}`,
      `Saldo EOA ..................... ${e?.saldoEth ? `${e.saldoEth} ETH` : e?.erro || "—"}`,
      `Bloco atual ................... ${e?.bloco ?? "—"}`,
      ``,
      `Gerado às ${new Date().toLocaleTimeString("pt-BR")}. Use ALFA:ajuda para ver outros comandos.`,
    ].join("\n");
  }

  if (acao === "fila") {
    const { getSupabaseReadOnly } = await import("./_lib/supabase-client.mjs");
    const sb = getSupabaseReadOnly();
    const { data, error } = await sb.from("fila_tarefas")
      .select("tipo,status,atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(10);
    if (error) return `Não foi possível ler a fila: ${error.message}`;
    if (!data?.length) return "A fila de tarefas está vazia.";
    const linhas = data.map((t) =>
      `  ${t.tipo || "?"} · ${t.status} · ${new Date(t.atualizado_em).toLocaleString("pt-BR")}`).join("\n");
    return `📋 FILA DE TAREFAS (últimas 10)\n\n${linhas}`;
  }

  if (acao === "panic") {
    try {
      const { escreverEstadoSistema } = await import("./_lib/system-state.mjs");
      const { registrarDecisao } = await import("./_lib/log-operacional.mjs");
      const estado = await escreverEstadoSistema("paused", "acionado via ALFA:" + acao);
      await registrarDecisao({ trigger: "alfa:panic", action: "sistema paused", userId: endereco });
      return `⏸️ Sistema PAUSADO às ${new Date(estado.timestamp).toLocaleTimeString("pt-BR")}. Use ALFA:unpause para reativar.`;
    } catch (err) {
      return `Não foi possível pausar o sistema: ${err?.message || "erro"}.`;
    }
  }
  if (acao === "unpause") {
    try {
      const { escreverEstadoSistema } = await import("./_lib/system-state.mjs");
      const { registrarDecisao } = await import("./_lib/log-operacional.mjs");
      const estado = await escreverEstadoSistema("active", null);
      await registrarDecisao({ trigger: "alfa:unpause", action: "sistema active", userId: endereco });
      return `▶️ Sistema REATIVADO às ${new Date(estado.timestamp).toLocaleTimeString("pt-BR")}.`;
    } catch (err) {
      return `Não foi possível reativar o sistema: ${err?.message || "erro"}.`;
    }
  }

  if (acao === "ajuda") {
    const cmds = Object.entries(COMANDOS_ALFA)
      .map(([nome, desc]) => `  ALFA:${nome.padEnd(18)} ${desc.split(".")[0]}.`)
      .join("\n");
    return `🤖 COMANDOS ALFA DISPONÍVEIS\n\n${cmds}\n\nDigite ALFA:<comando> para executar. Comandos que afetam o sistema (panic, unpause) são executados de imediato.`;
  }

  // ── Comandos IMPOSSÍVEIS (respondem com honestidade) ────────────────────
  if (COMANDOS_ALFA[acao]) {
    return `⛔ ALFA:${acao} — não executável. ${COMANDOS_ALFA[acao]}`;
  }

  // ── Comando desconhecido ─────────────────────────────────────────────────
  const nomes = Object.keys(COMANDOS_ALFA).map((c) => `ALFA:${c}`).join(", ");
  return `❓ Comando ALFA desconhecido: "${acao}". Comandos disponíveis: ${nomes}. Use ALFA:ajuda para descrições.`;
}

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
// ── MC89.2 — os 5 intents de métricas, construídos a partir de uma tabela ────
//
// São cinco handlers com a MESMA forma; escrevê-los cinco vezes à mão era pedir
// que divergissem. Cada um diz só de que parte das métricas precisa.
//
// `obterMetricas()` é chamada UMA vez por pedido e só quando o perfil é admin —
// nenhum número é lido para quem não o pode ver. É a mesma função que alimenta
// o endpoint `admin-stats` e o separador "Visão Geral": se aqui e lá dissessem
// números diferentes, era o B4 do MC88.41 outra vez, noutro domínio.
// `export` para o teste poder correr os extratores REAIS contra as respostas
// reais — é ali que vive o defeito que ninguém vê: o handler extrair um objeto
// onde a tabela espera um número, e a resposta sair com "[object Object]".
export const MAPA_METRICAS = {
  // intent            → o que a resposta recebe a partir das métricas agregadas
  metricas_usuarios:   (m) => ({ utilizadores: m.utilizadores?.comAtividade ?? null,
                                 fontes: m.utilizadores?.fontes, parciais: m.parciais.join(", ") }),
  metricas_financeiro: (m) => ({ financeiro: m.financeiro, janelaDias: m.janelaDias,
                                 parciais: m.parciais.join(", ") }),
  metricas_fila:       (m) => ({ fila: m.operacao?.fila ?? null, parciais: m.parciais.join(", ") }),
  metricas_geral:      (m) => ({ utilizadores: m.utilizadores?.comAtividade ?? null,
                                 financeiro: m.financeiro, cotas: m.cotas,
                                 fila: m.operacao?.fila ?? null,
                                 parciais: m.parciais.length ? m.parciais.join(", ") : null }),
};

function construirIntentsMetricas() {
  const out = {};

  for (const [intent, extrair] of Object.entries(MAPA_METRICAS)) {
    out[intent] = {
      gate: qualquerPerfil, // a diferenciação está na tabela de respostas, não aqui
      run: async ({ perfil }) => {
        if (!ehAdminPerfil(perfil)) {
          // Não-admin: resposta educada da tabela, e NENHUMA leitura de métricas.
          return intentResp(perfil, intent, {
            resposta: obterResposta(intent, perfil, {}), modoResposta: "perfil",
          });
        }
        let dados;
        try {
          const { obterMetricas } = await import("./_lib/admin-metricas.mjs");
          dados = extrair(await obterMetricas());
        } catch (err) {
          console.warn(`[chatbot] ${intent} falhou:`, err?.message);
          // Fail-soft com a verdade: "não consegui" e não um zero.
          dados = { parciais: "agregacao indisponivel" };
        }
        return intentResp(perfil, intent, {
          resposta: obterResposta(intent, perfil, dados), modoResposta: "perfil",
        });
      },
    };
  }

  // O saldo da EOA é o único que vai à rede — leitura própria, para a lentidão
  // ou a falha do RPC não contaminar as outras quatro respostas.
  out.metricas_eoa = {
    gate: qualquerPerfil,
    run: async ({ perfil }) => {
      if (!ehAdminPerfil(perfil)) {
        return intentResp(perfil, "metricas_eoa", {
          resposta: obterResposta("metricas_eoa", perfil, {}), modoResposta: "perfil",
        });
      }
      let dados;
      try {
        const { obterSaldoEoa } = await import("./_lib/admin-metricas.mjs");
        dados = await obterSaldoEoa();
      } catch (err) {
        console.warn("[chatbot] metricas_eoa falhou:", err?.message);
        dados = { erro: err?.code === "rpc_nao_configurado" ? "RPC nao configurado" : "cadeia indisponivel" };
      }
      return intentResp(perfil, "metricas_eoa", {
        resposta: obterResposta("metricas_eoa", perfil, dados), modoResposta: "perfil",
      });
    },
  };

  return out;
}

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

  // ── MC89.2 — métricas do sistema. Gate de ADMIN, leitura pura ─────────────
  //
  // `gate: qualquerPerfil` de propósito, com a diferenciação NA RESPOSTA e não
  // no gate: os perfis não-admin recebem uma recusa educada da tabela
  // declarativa (e nunca um número), em vez do "recusa-perfil" seco. Nenhum
  // número atravessa: `obterMetricas()` só é chamada quando o perfil é admin.
  //
  // Sem `rl` de comando: é leitura, não é ação. O rate-limit geral do chatbot
  // (aplicado antes, em chatbot.mjs) já protege o custo.
  ...construirIntentsMetricas(),

  // MC88.44 — suporte. Sem gate (qualquer perfil, incluindo visitante) e sem
  // rate-limit de admin: é informação de contacto, não é ação. Não passa pelo
  // LLM nem pelo índice RAG — é por isso que existe. Ver EMAIL_SUPORTE.
  suporte: {
    gate: qualquerPerfil,
    run: ({ perfil }) => intentResp(perfil, "suporte", {
      resposta: obterResposta("suporte", perfil, {}), modoResposta: "perfil",
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

  // MC89.9 — Comando ALFA (admin). Prefixo fixo: "ALFA: <ação> [params]".
  // Dispara ações administrativas via chat. Cada ação é testada contra uma
  // lista de comandos conhecidos — o que não existe responde com honestidade
  // (nunca com "comando executado" quando não foi).
  comando_alfa: {
    gate: ehAdminPerfil, rl: true,
    run: async ({ perfil, endereco, pergunta }) => {
      const m = pergunta.match(INTENT_PATTERNS.comando_alfa);
      const acao = (m?.[1] || "").toLowerCase();
      const params = (m?.[2] || "").trim();
      const resposta = await executarAlfa(acao, params, { perfil, endereco });
      return intentResp(perfil, "comando_alfa", { resposta, modoResposta: "acao" });
    },
  },

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

export async function chamarLLM(pergunta, contexto, opts = {}) {  // export: testado em _tests/mc8820-guto-personalidades
  const apiKey  = opts.apiKey  || process.env.LLM_API_KEY;
  const baseUrl = (opts.baseUrl || process.env.LLM_BASE_URL || DEFAULT_LLM_URL).replace(/\/$/, "");
  const model   = opts.model   || process.env.LLM_MODEL || DEFAULT_LLM_MODEL;
  if (!apiKey) throw new Error("LLM_API_KEY ausente");

  const url  = `${baseUrl}/chat/completions`;
  const userContent = contexto
    ? `Contexto extraído do regulamento DESAFIOGUT:\n\n${contexto}\n\nPergunta do usuário: ${pergunta}`
    : `Pergunta do usuário (sem contexto encontrado): ${pergunta}`;

  // MC88.20 (P3) — sem fallback: um systemPrompt em falta é bug de call-site, e
  // degradar em silêncio custaria a personalidade do perfil sem ninguém dar por isso.
  const systemPrompt = opts.systemPrompt;
  if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
    const e = new Error("systemPrompt obrigatório em chamarLLM (use obterPromptSystem(perfil))");
    e.code = "systemprompt_ausente";  // marcado para o caller NÃO o confundir com indisponibilidade
    throw e;
  }
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
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

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
    // MC88.20 (P3) — o catch existe para INDISPONIBILIDADE do LLM. Um systemPrompt
    // em falta é bug de programação: se fosse engolido aqui, o sintoma seria "o GUTO
    // perdeu a personalidade" sem nada a apontar para a causa. Falha alto.
    if (err?.code === "systemprompt_ausente") throw err;
    console.warn("[chatbot] LLM indisponível, usando resposta template:", err?.message);
    modoResposta = "template";
    // MC88.20 (P1) — o texto passou para _lib/guto-perfis.mjs, por PERFIL. Aqui fica
    // só o orçamento: UM excerto (o de maior score), limitado. Antes eram os 3 chunks
    // a 600 chars cada (~1.800) com cabeçalhos de relevância — o "dar texto" relatado.
    const melhor = chunks[0]?.texto ? String(chunks[0].texto).replace(/\s+/g, " ").trim() : "";
    const trecho = melhor.length > LIMITE_TRECHO_TEMPLATE
      ? `${melhor.slice(0, LIMITE_TRECHO_TEMPLATE)}…`
      : melhor;
    resposta = obterResposta("fallback_sem_llm", perfil, { trecho });
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
