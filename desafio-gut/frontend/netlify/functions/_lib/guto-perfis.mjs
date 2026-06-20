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

// MC29.1 — modo de conformidade (app das lojas, leilão indisponível na
// plataforma). Transparente: o GUTO NUNCA nega o leilão — informa que está na
// versão Web e ajuda com a loja. Sobrepõe-se ao tom do perfil.
const PROMPT_CONFORMIDADE = `Você é o GUTO, assistente do DESAFIOGUT nesta versão do app (loja de e-commerce).
Nesta versão os leilões NÃO estão disponíveis — eles funcionam na versão Web (PWA),
acessível pelo navegador em desafiogut.com.

Regras:
- Frases curtas, simpáticas, no máximo 2-3 por resposta.
- Se perguntarem sobre leilões, lances, carteira, saldo ou senhas: informe com
  honestidade que isso está disponível na versão Web (desafiogut.com) e ofereça
  ajuda com a loja. NUNCA diga que o leilão não existe — diga apenas onde encontrá-lo.
- Ajude com produtos, prazos de entrega, trocas e devoluções.
- Não invente regras nem dados. Não trate comandos de administração.`;

/**
 * Devolve o system prompt do perfil (fallback: visitante).
 * MC29.1: se `conformidade` for true, devolve o prompt de loja (independente do
 * perfil) — usado quando o leilão não está ativo na plataforma do utilizador.
 */
export function obterPromptSystem(perfil, { conformidade = false } = {}) {
  if (conformidade) return PROMPT_CONFORMIDADE;
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

  // MC15.6 ITEM 10 — memória operacional (admin-only; sem emoji).
  memoria: {
    visitante: () => "O histórico operacional é restrito à administração.",
    comum: () => "O histórico operacional é restrito à administração.",
    corporativo: () => "O histórico operacional é restrito à coordenação.",
    admin: (p) => p?.achou
      ? `Em situações anteriores (${g(p.trigger)}), você aplicou: ${g(p.action)} (em ${g(p.quando)}). Deseja repetir? [${g(p.total, "0")} decisões no histórico.]`
      : `Sem decisões semelhantes no histórico${p?.total ? ` (${p.total} registadas)` : ""}.`,
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

  // MC15.8.1 ITEM 10 — Indique e Ganhe (comum/corporativo/admin). Visitante: CTA.
  // comum: amigável com emoji; corporativo/admin: sem emoji.
  indique_e_ganhe: {
    visitante: () => "Indique e Ganhe é para membros! Cria a tua conta e, por cada amigo que se registar com o teu código, ganhas +1 senha na hora (e o teu amigo também). 😊",
    comum: (p) => `Aqui está o teu Indique e Ganhe! 🎁 Partilha o teu link: por cada amigo que criar a conta com o teu código, ganhas +1 senha na hora (e o teu amigo também) — já não é preciso esperar pelo primeiro lance. Código: ${g(p.codigo)}.`,
    corporativo: (p) => `Indique e Ganhe — código ${g(p.codigo)}. Por cada indicado que crie a conta com o seu código: +1 senha para si e +1 para o indicado, creditadas imediatamente no registo. Indicados: ${g(p.total_indicados, "0")}; convertidos: ${g(p.total_convertidos, "0")}; senhas ganhas: ${g(p.senhas_ganhas, "0")}.`,
    admin: (p) => `Indique e Ganhe — código ${g(p.codigo)}. Indicados: ${g(p.total_indicados, "0")}; convertidos: ${g(p.total_convertidos, "0")}; senhas: ${g(p.senhas_ganhas, "0")}.`,
  },

  // MC15.8.1 ITEM 8 — relatório de indicações (admin-only; sem emoji, formato relatório).
  relatorio_indicacoes: {
    visitante: () => "Os relatórios de indicação são internos. Cria uma conta para participar! 😊",
    comum: () => "Os relatórios de indicação são da coordenação. Posso ajudar com os teus lances! 🙂",
    corporativo: () => "Os relatórios consolidados de indicação são da coordenação.",
    admin: (p) => g(p.relatorio, "Sem dados de indicações para hoje."),
  },

  // MC17.1 — saldo de senhas de troco (comum/corporativo/admin). Visitante: CTA.
  // Inclui o aviso de expiração (5 dias) quando aplicável.
  meu_saldo: {
    visitante: () => "O saldo de senhas é para membros. Cria a tua conta e participa dos leilões! 😊",
    comum: (p) =>
      (Number(p.senhasExpiradasAgora) > 0 ? `${p.senhasExpiradasAgora} senhas expiraram hoje. ` : "") +
      `Tens ${g(p.saldoTroco, "0")} senha(s) válida(s).` +
      (Number(p.expiramEmBreve) > 0 ? ` Atenção: tens ${p.expiramEmBreve} senhas que expiram em 5 dias. Usa-as nos leilões! 🙂` : " 🙂"),
    corporativo: (p) =>
      (Number(p.senhasExpiradasAgora) > 0 ? `${p.senhasExpiradasAgora} senhas expiraram hoje. ` : "") +
      `Saldo de senhas de troco: ${g(p.saldoTroco, "0")} (válidas 30 dias, consumo FIFO).` +
      (Number(p.expiramEmBreve) > 0 ? ` Tens ${p.expiramEmBreve} senhas que expiram em 5 dias. Usa-as nos leilões.` : "") +
      " Converta e licite em Carteira do Lojista.",
    admin: (p) => `Troco de ${g(p.endereco)}: ${g(p.saldoTroco, "0")} ativas; ${g(p.expiramEmBreve, "0")} a expirar em 5 dias.`,
  },

  // MC17.1 — contratar cota comercial (lojista). Valores oficiais (REQ-04..07).
  comprar_cotas: {
    visitante: () => "Para anunciar e obter senhas, torna-te parceiro. Cria uma conta! 😊",
    comum: () => "A contratação de cotas é para lojistas. Posso ajudar com os teus lances! 🙂",
    corporativo: () => "Contrate a sua cota comercial em Carteira do Lojista: Bronze R$ 2.640, Prata R$ 5.600, Ouro R$ 11.000 ou Diamante R$ 18.000. Pagamento por PIX com confirmação da coordenação. As senhas para licitar vêm do excedente da cota.",
    admin: () => "Contratação de cota: o lojista solicita no Painel (Adesão/PIX) e a coordenação confirma. As senhas vêm do excedente da cota (não há compra avulsa).",
  },

  // MC17.1 — preços/pacotes das cotas comerciais.
  pacotes_cotas: {
    visitante: () => "Temos 4 cotas: Bronze, Prata, Ouro e Diamante. Cria uma conta para contratar! 😊",
    comum: () => "As cotas comerciais são para lojistas: Bronze, Prata, Ouro e Diamante. 🙂",
    corporativo: () => "Cotas comerciais: Bronze R$ 2.640 (produto mín. R$ 660), Prata R$ 5.600 (R$ 1.350), Ouro R$ 11.000 (R$ 2.250), Diamante R$ 18.000 (R$ 4.500). Produto abaixo do mínimo gera senhas de troco (R$ 2 cada, válidas 30 dias).",
    admin: () => "Cotas (contrato/produto-mín): Bronze 2640/660, Prata 5600/1350, Ouro 11000/2250, Diamante 18000/4500. Excedente do produto -> senhas de troco (30d, FIFO).",
  },

  // MC17.1 — relatório de compras/senhas para o admin.
  relatorio_compras: {
    visitante: () => "Os relatórios de compras são internos. Cria uma conta para participar! 😊",
    comum: () => "Os relatórios de compras são da coordenação. Posso ajudar com os teus lances! 🙂",
    corporativo: () => "Os relatórios consolidados de compras são da coordenação. No Painel tens os teus próprios dados.",
    admin: (p) => `Relatório de senhas — troco ativo: ${g(p.senhasAtivas, "0")} senha(s) em ${g(p.lojistas, "0")} lojista(s). Expiradas (acumulado): ${g(p.senhasExpiradas, "0")}.`,
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
