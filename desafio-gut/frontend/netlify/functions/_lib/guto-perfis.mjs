// _lib/guto-perfis.mjs — MC15.5
// Tom (system prompt do LLM) + dicionário de respostas do GUTO por PERFIL.
// Sem autenticação e sem IO: este módulo só FORMATA texto. A deteção de perfil
// e a recolha de dados ficam no chatbot.mjs (fonte de verdade no backend — R4).
//
// Perfis: "visitante" | "comum" | "corporativo" | "admin".
// Regra de tom (MC15.5 §D3 / critério): visitante/comum = amigável com emojis;
// corporativo/admin = SEM emojis (profissional / operacional, formato relatório).
//
// NOTA (desvio consciente do exemplo do brief): os exemplos de admin no pedido
// traziam emojis ("Show!…🚀"); o critério acordado é "zero emojis em
// corporativo/admin". Seguimos o critério (gate de validação), não o exemplo.

// ── System prompts por perfil (usados como `system` na chamada ao LLM) ───────

const SYS_BASE = `Você é o GUTO, o mascote do DESAFIOGUT. Fala como um amigo — frases curtas,
tom leve e animado. Nada de textos longos ou técnicos.

Regras:
- Máximo 2-3 frases por resposta.
- Usa palavras simples. Nada de "adicionalmente", "consequentemente", "no entanto".
- Lê o que a pessoa disse antes e segue o assunto. Não recomeças do zero.
- Se não souberes algo: "Poxa, essa não sei! Mas posso ajudar com..." e puxa para o DESAFIOGUT.
- Usa interjeições naturais: "Olha!", "Boa!", "Hum...", "Ah!" — como gente.
- Emojis só de vez em quando, não em toda a frase.

Responde APENAS com base no regulamento do DESAFIOGUT.`;

const PROMPT_SYSTEMS = {
  // Visitante: acolhedor, incentiva o registo, pode usar emojis.
  visitante: `${SYS_BASE}

PERFIL: VISITANTE (não autenticado). Sê acolhedor e convida a criar conta para
participar dos leilões. Não reveles dados internos nem comandos de administração.`,

  // Comum: amigável e didático, emojis leves (= tom base do GUTO).
  comum: `${SYS_BASE}

PERFIL: UTILIZADOR COMUM (autenticado). Amigável e didático. Ajuda com lances,
senhas e regras. Não reveles comandos de administração.`,

  // Corporativo (Lojista): profissional, direto, SEM emojis.
  corporativo: `Você é o GUTO, assistente do DESAFIOGUT a falar com um LOJISTA (perfil corporativo).
Tom PROFISSIONAL e direto. NÃO uses emojis. Frases objetivas.
Foca em planos, cotas comerciais, banners e no Painel Lojista. Dá informação precisa
e remete para o Painel quando fizer sentido. Responde com base no regulamento do DESAFIOGUT.`,

  // Admin/coordenação: conciso, operacional, formato relatório, ZERO emojis.
  admin: `Você é o GUTO em modo OPERACIONAL para um ADMINISTRADOR/coordenação do DESAFIOGUT.
Tom CONCISO e técnico, formato de relatório. ZERO emojis. Sem floreados.
Podes referir estados de edições, ids, prazos e auditoria. Responde com base no
regulamento e nos dados fornecidos.`,
};

/** Devolve o system prompt do perfil (fallback: visitante). */
export function obterPromptSystem(perfil) {
  return PROMPT_SYSTEMS[perfil] || PROMPT_SYSTEMS.visitante;
}

// ── Helpers de formatação ────────────────────────────────────────────────────

/** Guard: devolve fallback se o valor for null/undefined/"". */
const g = (v, fb = "—") => (v === null || v === undefined || v === "" ? fb : v);

// MC15.6 ITEM 5 — texto da simulação (admin/corporativo, sem emoji).
function formatarSimulacao(p) {
  if (p?.erro) return `Não foi possível ler os lances da edição ${g(p.edicaoId)} agora.`;
  if (!p?.ok) {
    return `Edição ${g(p.edicaoId)} — sem vencedor provisório: nenhum lance único entre ${g(p.totalLances, "0")} lance(s).`;
  }
  return `Se o leilão terminasse agora, o vencedor provisório da edição ${g(p.edicaoId)} seria ${g(p.vencedor)} com lance único de ${g(p.valor)}. (${g(p.totalLances, "0")} lances, ${g(p.lancesUnicos, "0")} únicos.)`;
}

// MC15.6 ITEM 6 — texto do pulso (admin/corporativo, sem emoji). 4 métricas.
function formatarPulso(p) {
  const vol = p?.volumePorMin == null ? "—" : `${p.volumePorMin}/min`;
  const lic = g(p?.licitantesUnicos, "0");
  const val = p?.valorizacaoPct == null ? "n/d (sem base)" : `${p.valorizacaoPct}%`;
  const aba = p?.abandonoCheckoutPct == null ? "n/d" : `${p.abandonoCheckoutPct}%`;
  return `Pulso da edição ${g(p?.edicaoId)} — Volume: ${vol}. Licitantes únicos: ${lic}. Valorização (menor lance sobre base): ${val}. Abandono de checkout: ${aba}. Total de lances: ${g(p?.totalLances, "0")}.`;
}

// ── Dicionário de respostas por intent × perfil ──────────────────────────────
// Funções recebem `params` e devolvem string. Para `saudacao` são strings fixas.

export const respostasPorPerfil = {
  criar_edicao: {
    visitante: () => "Criar edições é exclusivo para administradores. Cria uma conta para participar! 😊",
    comum: () => "Só a coordenação pode criar edições. Mas podes dar lances nas edições ativas! 🙂",
    corporativo: () => "A criação de edições é feita pela coordenação. Como lojista, podes acompanhar as edições no Painel.",
    // admin: sucesso operacional (zero emoji). Recebe a edição criada.
    admin: (p) => `Edição criada. Id: ${g(p.id)}. Tipo: ${g(p.tipo)}. Produto: ${g(p.produto)}. Termina em: ${g(p.termino)}.`,
  },

  // MC15.6 ITEM 3 — Wizard de criação (admin). Perfis inferiores: recusa adequada.
  // Para admin, o chatbot compõe o texto de cada passo e passa em params.msg
  // (mantém o gate por perfil aqui, sem emoji para admin).
  criar_edicao_wizard: {
    visitante: () => "Criar edições é exclusivo para administradores. Cria uma conta para participar! 😊",
    comum: () => "Só a coordenação pode criar edições. Mas podes dar lances nas edições ativas! 🙂",
    corporativo: () => "A criação de edições é feita pela coordenação. Como lojista, acompanhe as edições no Painel.",
    admin: (p) => g(p.msg, "Assistente de criação de edição iniciado."),
  },

  // MC15.6 ITEM 5 — simulação de vencedor (admin + corporativo; sem emoji).
  // Perfis inferiores: recusa adequada.
  simular_vencedor: {
    visitante: () => "A simulação de vencedor é uma função interna. Cria uma conta para participar dos leilões! 😊",
    comum: () => "A simulação de vencedor é exclusiva da coordenação e parceiros. Posso ajudar com os teus lances! 🙂",
    corporativo: (p) => formatarSimulacao(p),
    admin: (p) => formatarSimulacao(p),
  },

  // MC15.6 ITEM 6 — pulso (admin + corporativo; sem emoji). Inferiores: recusa.
  pulso_edicao: {
    visitante: () => "Os relatórios de pulso são internos. Cria uma conta para participar dos leilões! 😊",
    comum: () => "Os relatórios de pulso são exclusivos da coordenação e parceiros. Posso ajudar com os teus lances! 🙂",
    corporativo: (p) => formatarPulso(p),
    admin: (p) => formatarPulso(p),
  },

  // MC15.6 ITEM 7 — kill switch (admin-only; sem emoji). Inferiores: recusa.
  panic: {
    visitante: () => "Esse comando é restrito à administração.",
    comum: () => "Esse comando é restrito à administração.",
    corporativo: () => "Esse comando é restrito à coordenação.",
    admin: (p) => `Sistema PAUSADO (modo pânico). Novos lances serão rejeitados. Em: ${g(p.timestamp)}. Use /unpanic para reativar.`,
  },
  unpanic: {
    visitante: () => "Esse comando é restrito à administração.",
    comum: () => "Esse comando é restrito à administração.",
    corporativo: () => "Esse comando é restrito à coordenação.",
    admin: (p) => `Sistema REATIVADO. Lances voltam a ser aceites. Em: ${g(p.timestamp)}.`,
  },

  listar_edicoes: {
    visitante: () => "Temos edições a decorrer! Cria uma conta para ver os detalhes e participar. 😊",
    comum: (p) => `As edições ativas são: ${g(p.lista)}. Queres saber mais sobre alguma? 🙂`,
    corporativo: (p) => `Edições ativas: ${g(p.lista)}. Para volume de lances e cotas, consulta o Painel Lojista.`,
    admin: (p) => `Edições: ${g(p.lista)}. Total: ${g(p.total, "0")}.`,
  },

  encerrar_edicao: {
    visitante: () => "Encerrar edições é exclusivo para administradores. Cria uma conta para participar! 😊",
    comum: () => "Só a coordenação pode encerrar edições. Fica atento ao fim dos cronómetros! 🙂",
    corporativo: () => "O encerramento de edições é feito pela coordenação. Os resultados são publicados no Painel.",
    admin: (p) => `Edição ${g(p.id)} encerrada.`,
  },

  // Dados diferenciados (ITEM 4). Perfis inferiores recebem recusa adequada.
  dados_mercado: {
    visitante: () => "Dados de mercado são para lojistas. Quer tornar-se parceiro? Cria uma conta! 😊",
    comum: () => "Dados de mercado são exclusivos do Painel Lojista. Posso ajudar com lances e regras! 🙂",
    corporativo: (p) => `Mercado — edições ativas: ${g(p.edicoesAtivas, "0")}. ${g(p.nota, "Detalhe completo de cotas/banners no Painel Lojista.")}`,
    admin: (p) => `Mercado — edições ativas: ${g(p.edicoesAtivas, "0")}.`,
  },

  auditoria: {
    visitante: () => "Auditoria é uma função administrativa. Cria uma conta para participar dos leilões! 😊",
    comum: () => "Essa informação é administrativa. Posso ajudar com os leilões! 🙂",
    corporativo: () => "Auditoria é uma função da coordenação. No Painel Lojista tens os teus relatórios comerciais.",
    admin: (p) => `Auditoria (últimas ${g(p.qtd, "0")}): ${g(p.linhas, "sem registos")}.`,
  },

  // Wrapper do RAG: respostaRAG é a resposta gerada; cada perfil acrescenta o seu enquadramento.
  fallback_rag: {
    visitante: (p) => `${g(p.respostaRAG, "")} Cria uma conta para participar dos leilões! 😊`.trim(),
    comum: (p) => `${g(p.respostaRAG, "")}`.trim(),
    corporativo: (p) => `${g(p.respostaRAG, "")}`.trim(),
    admin: (p) => `${g(p.respostaRAG, "")}`.trim(),
  },

  saudacao: {
    visitante: "Olá! Sou o GUTO, assistente do DESAFIOGUT. Cria uma conta para participar dos leilões! 😊",
    comum: "Olá! Sou o GUTO. Como posso ajudar com os leilões hoje? 😊",
    corporativo: "Olá. Sou o GUTO. Painel Lojista ativo. Posso dar informação sobre edições, cotas e banners.",
    admin: "GUTO em modo operacional. Perfil: administrador. Comandos: criar/listar/encerrar edição, auditoria.",
  },
};

/**
 * Devolve a resposta formatada para (intent, perfil, params).
 * Fallback de perfil: comum → visitante. Intent inexistente → "".
 * @returns {string}
 */
export function obterResposta(intent, perfil, params = {}) {
  const grupo = respostasPorPerfil[intent];
  if (!grupo) return "";
  const item = grupo[perfil] || grupo.comum || grupo.visitante;
  return typeof item === "function" ? item(params) : String(item || "");
}
