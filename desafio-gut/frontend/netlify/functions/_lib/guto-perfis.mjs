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

// MC88.44 — ENDEREÇO DE SUPORTE, num sítio só.
//
// O G1 do MC88.41 nasceu de o endereço estar ESCRITO À MÃO em vários sítios: o
// regulamento (que alimenta o índice RAG) dizia `suporte@desafiogut.com.br`, um
// domínio que devolve NXDOMAIN, enquanto a app inteira já usava este. Quem tinha
// dinheiro preso escrevia para o vazio.
//
// Decisão do operador no MC88.44: desafiogut01@gmail.com — o endereço que o
// rodapé, a página de exclusão de conta, o contacto do DPO e os Termos já usam.
//
// ⚠️ Isto governa a resposta DETERMINÍSTICA do intent `suporte`. O que o LLM
// cita quando cai no RAG vem do índice de embeddings (Blob store `rag`), que só
// muda quando `scripts/build-rag-index.mjs` for corrido sobre o regulamento
// corrigido. Ver desafio-gut/docs/MC88.44-EMAIL-DIAGNOSTICO.txt §1.
export const EMAIL_SUPORTE = "desafiogut01@gmail.com";

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
participar das edições. Não reveles dados internos nem comandos de administração.`,

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
Nesta versão as edições NÃO estão disponíveis — eles funcionam na versão Web (PWA),
acessível pelo navegador em desafiogut.com.

Regras:
- Frases curtas, simpáticas, no máximo 2-3 por resposta.
- Se perguntarem sobre o torneio, lances, carteira, saldo ou senhas: informe com
  honestidade que isso está disponível na versão Web (desafiogut.com) e ofereça
  ajuda com a loja. NUNCA diga que o torneio não existe — diga apenas onde encontrá-lo.
- Ajude com produtos, prazos de entrega, trocas e devoluções.
- Não invente regras nem dados. Não trate comandos de administração.`;

/**
 * Devolve o system prompt do perfil (fallback: visitante).
 * MC29.1: se `conformidade` for true, devolve o prompt de loja (independente do
 * perfil) — usado quando o leilão não está ativo na plataforma do utilizador.
 */
// MC96.2 — REGRA DE LINGUAGEM, obrigatória em TODOS os perfis.
//
// Porque existe (medido, não suposto): a 2026-09-25, em produção, o GUTO respondia
// «o DESAFIOGUT é tipo um leilão sim, mas diferente…» e «posso te explicar como funcionam os
// leilões por aqui». Substituir as strings da PERSONA NÃO chegou — e não podia chegar: quem
// escreve a resposta é o LLM, que lê os chunks do RAG (onde o «leilão» vive, fora do
// repositório) e espelha esse vocabulário. A única defesa eficaz DENTRO do repositório é uma
// regra explícita no prompt do sistema. Sem ela, o objectivo #10 do MC96 não se cumpre naquilo
// que o testador vê — que é onde conta.
export const REGRA_LINGUAGEM = `

REGRA DE LINGUAGEM (obrigatória — Portaria SPA/MF 1.207/2024):
- O DesafioGUT é um TORNEIO DE HABILIDADE com ranking acumulado. NUNCA o chames leilão.
- PALAVRAS PROIBIDAS: "leilão", "leilões", "jogo de azar", "aposta", "bet", "sorte". Isto vale
  para ti E para quem escreve: se o utilizador disser "leilão", corrige com naturalidade ("é um
  torneio de habilidade") e continua com o termo correcto — não repitas a palavra dele.
- USA sempre: "torneio de habilidade", "edição", "lance", "menor lance único", "estratégia",
  "saldo", "senha".
- Vale MESMO que os textos que recebes usem outro termo: a forma de falar é tua.`;

// MC96.3 — LIGAÇÃO AO REGULAMENTO v4.
//
// Medido no SEG-1: `Art.N = 0` em `chatbot.mjs` e em `guto-perfis.mjs` — o GUTO não citava
// artigo nenhum. As respostas sobre regras vinham dos chunks do RAG (que o operador ainda não
// ingeriu na versão v2), logo o GUTO respondia "de memória" e sem âncora normativa.
//
// ⚠️ Os textos abaixo foram COPIADOS de `docs/REGULAMENTO-v4.md` (medido, não suposto). Se o
// v4 mudar, estes factos têm de mudar com ele — é o que o teste bidireccional verifica.
export const ARTIGOS_V4 = {
  "5":  "O interessado deverá se cadastrar gratuitamente para participar do DesafioGUT.",
  "6":  "O(a) cadastrado(a) deverá ser obrigatoriamente maior de idade e receberá um código único, intransferível e exclusivo de acesso para realizar lances.",
  // ⚠️ Corrigido pelo teste bidireccional: o Art. 7 NÃO usa a expressão «torneio de habilidade»
  // (essa está nos Arts. 1º e 38º). O Art. 7º define a MECÂNICA: a pergunta «QUANTO VOCÊ OFERTA
  // POR... este produto ou serviço?», o menor lance único, e o resultado determinado pela
  // ESTRATÉGIA do participante — não por aleatoriedade.
  "7":  "O DesafioGUT funciona por aplicativo, pela pergunta \"QUANTO VOCÊ OFERTA POR... este produto ou serviço?\". Vence quem realizar o menor lance único, sendo o resultado determinado pela estratégia do participante e não por mecanismos de aleatoriedade.",
  "8":  "O(a) participante poderá ofertar lances por meio de: (i) saldo em dinheiro, na modalidade Relâmpago; (ii) senhas, na modalidade Programado.",
  "20": "As senhas, quando utilizadas na modalidade Programado, têm custo unitário de R$ 2,00 (dois reais).",
  "26": "O participante poderá ofertar qualquer valor de lance a partir de R$ 0,01 (um centavo), sempre com o máximo de 2 (duas) casas decimais.",
  "27": "O participante ganhador é aquele identificado pelo sistema como autor do menor lance único.",
  // Art. 38º — o artigo que sustenta a TESE JURÍDICA (e que o briefing do MC NÃO listava).
  // É aqui que o v4 diz «torneio de habilidade nos termos da Portaria SPA/MF nº 1.207/2024» e
  // nega expressamente «aposta de quota fixa, jogo de azar, loteria». Sem ele, o GUTO cita
  // factos de mecânica mas não a base legal — que é o que a defesa do modelo exige.
  "38": "O DesafioGUT constitui torneio de habilidade nos termos da Portaria SPA/MF nº 1.207/2024, sendo o resultado determinado majoritariamente pela estratégia do participante. Não se trata de aposta de quota fixa, jogo de azar, loteria ou qualquer modalidade de sorte.",
  "1":  "Atividade comercial operada como torneio de habilidade no aplicativo DesafioGUT.",
};

export const REGRA_REGULAMENTO = `

REGULAMENTO (v4 — a versão que vai a cartório):
Quando responderes sobre regras, CITA o artigo que fundamenta a resposta, assim: «segundo o
Art. 26º do Regulamento». Factos verificados que deves usar (não inventes números nem artigos):
- Cadastro: GRATUITO, e é obrigatório ser maior de idade (Arts. 5º e 6º).
- A mecânica: a pergunta «QUANTO VOCÊ OFERTA POR... este produto ou serviço?» e o menor lance
  único, decidido pela ESTRATÉGIA do participante — não por aleatoriedade (Art. 7º).
- A base legal: é um TORNEIO DE HABILIDADE nos termos da Portaria SPA/MF nº 1.207/2024, e NÃO
  uma aposta de quota fixa, jogo de azar ou loteria (Art. 38º).
- Duas modalidades: Relâmpago (debita SALDO em dinheiro) e Programado (consome SENHAS) (Art. 8º).
- Senha: R$ 2,00 cada, e SÓ na modalidade Programado — o Relâmpago NÃO gasta senhas (Art. 20º).
- Lance: qualquer valor A PARTIR de R$ 0,01, com no máximo 2 casas decimais (Art. 26º).
- Vence o MENOR LANCE ÚNICO (Art. 27º).
- Dúvidas oficiais: contato@grupouniaoetrabalho.com.br (Art. 36º).
NUNCA cites um artigo que não esteja aqui e nunca inventes o número de um artigo.`;

export function obterPromptSystem(perfil, { conformidade = false } = {}) {
  const base = conformidade ? PROMPT_CONFORMIDADE : (PROMPT_SYSTEMS[perfil] || PROMPT_SYSTEMS.visitante);
  return base + REGRA_LINGUAGEM + REGRA_REGULAMENTO; // MC96.2 + MC96.3
}

// ── Helpers de formatação ────────────────────────────────────────────────────

/** Guard: devolve fallback se o valor for null/undefined/"". */
const g = (v, fb = "—") => (v === null || v === undefined || v === "" ? fb : v);

// MC89.2 — centavos → "R$ x,xx". null/undefined dá "—", NUNCA "R$ 0,00": num
// relatório de administração, um zero é uma afirmação e "não medi" não é zero.
const brl = (centavos) =>
  centavos === null || centavos === undefined || !Number.isFinite(Number(centavos))
    ? "—"
    : `R$ ${(Number(centavos) / 100).toFixed(2)}`;

// MC15.6 ITEM 5 — texto da simulação (admin/corporativo, sem emoji).
function formatarSimulacao(p) {
  if (p?.erro) return `Não foi possível ler os lances da edição ${g(p.edicaoId)} agora.`;
  if (!p?.ok) {
    return `Edição ${g(p.edicaoId)} — sem vencedor provisório: nenhum lance único entre ${g(p.totalLances, "0")} lance(s).`;
  }
  return `Se a edição terminasse agora, o vencedor provisório da edição ${g(p.edicaoId)} seria ${g(p.vencedor)} com lance único de ${g(p.valor)}. (${g(p.totalLances, "0")} lances, ${g(p.lancesUnicos, "0")} únicos.)`;
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
    visitante: () => "A simulação de vencedor é uma função interna. Cria uma conta para participar das edições! 😊",
    comum: () => "A simulação de vencedor é exclusiva da coordenação e parceiros. Posso ajudar com os teus lances! 🙂",
    corporativo: (p) => formatarSimulacao(p),
    admin: (p) => formatarSimulacao(p),
  },

  // MC15.6 ITEM 6 — pulso (admin + corporativo; sem emoji). Inferiores: recusa.
  pulso_edicao: {
    visitante: () => "Os relatórios de pulso são internos. Cria uma conta para participar das edições! 😊",
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
    visitante: () => "Auditoria é uma função administrativa. Cria uma conta para participar das edições! 😊",
    comum: () => "Essa informação é administrativa. Posso ajudar com as edições! 🙂",
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
    visitante: () => "O saldo de senhas é para membros. Cria a tua conta e participa das edições! 😊",
    comum: (p) =>
      (Number(p.senhasExpiradasAgora) > 0 ? `${p.senhasExpiradasAgora} senhas expiraram hoje. ` : "") +
      `Tens ${g(p.saldoTroco, "0")} senha(s) válida(s).` +
      (Number(p.expiramEmBreve) > 0 ? ` Atenção: tens ${p.expiramEmBreve} senhas que expiram em 5 dias. Usa-as nas edições! 🙂` : " 🙂"),
    corporativo: (p) =>
      (Number(p.senhasExpiradasAgora) > 0 ? `${p.senhasExpiradasAgora} senhas expiraram hoje. ` : "") +
      `Saldo de senhas de troco: ${g(p.saldoTroco, "0")} (válidas 30 dias, consumo FIFO).` +
      (Number(p.expiramEmBreve) > 0 ? ` Tens ${p.expiramEmBreve} senhas que expiram em 5 dias. Usa-as nas edições.` : "") +
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

  // MC88.20 (P1) — resposta quando o LLM está INDISPONÍVEL. Antes este texto vivia
  // hardcoded no chatbot.mjs e era o MESMO para os 4 perfis: emojis e um pitch
  // comercial dos planos (Bronze/Prata/Ouro/Diamante) chegavam ao admin e ao
  // corporativo, que por regra são "ZERO emojis, tom operacional"; e o caminho com
  // chunks despejava ~1.800 chars de regulamento cru MAIS a frase "peça pro
  // administrador configurar LLM_API_KEY no Netlify", que expunha configuração
  // interna ao utilizador final. Sem LLM não há system prompt, logo era ESTE texto
  // — e só ele — que definia a personalidade. Agora é por perfil, como tudo o resto.
  //
  // `trecho`: excerto JÁ limitado pelo chamador (chatbot.mjs), ou "" se não houve
  // correspondência. Aqui não se corta texto: quem sabe o orçamento é quem o monta.
  fallback_sem_llm: {
    // MC96.2 — HARD GATE 4: NUNCA despejar o chunk bruto. Havendo trecho, enquadra-se com a
    // fonte e o contacto; não havendo, uma frase natural com saída. O tom de cada perfil mantém-se.
    visitante: (p) => (p.trecho
      ? `Encontrei isto no regulamento: «${p.trecho}». Se não responder ao que precisas, escreve para contato@grupouniaoetrabalho.com.br.`
      : "Poxa, essa não achei no regulamento! 😅 Tenta perguntar de outra forma — ou escreve para contato@grupouniaoetrabalho.com.br."),
    comum: (p) => (p.trecho
      ? `Encontrei isto no regulamento: «${p.trecho}». Se precisares de mais detalhe, escreve para contato@grupouniaoetrabalho.com.br.`
      : "Essa não encontrei no regulamento. Tenta de outra forma — ou escreve para contato@grupouniaoetrabalho.com.br."),
    corporativo: (p) => (p.trecho
      ? `Do regulamento: «${p.trecho}» Mais detalhe no Painel Lojista ou em contato@grupouniaoetrabalho.com.br.`
      : "Não encontrei isso no regulamento. Reformula a pergunta, consulta o Painel Lojista ou escreve para contato@grupouniaoetrabalho.com.br."),
    admin: (p) => (p.trecho
      ? `Regulamento: «${p.trecho}»`
      : "Sem correspondência no regulamento para essa consulta. Consulta a coordenação ou o Painel Lojista."),
  },

  // Wrapper do RAG: respostaRAG é a resposta gerada; cada perfil acrescenta o seu enquadramento.
  fallback_rag: {
    // MC88.20 (P2) — o convite era acrescentado SEMPRE, mesmo quando o LLM já tinha
    // convidado, e saía "…que tal criar uma conta e dar um lance? Cria uma conta
    // para participar dos leilões! 😊" — dois CTAs seguidos, observado em 2 de 3
    // sondas ao vivo. Agora só se acrescenta quando ainda não há convite.
    visitante: (p) => {
      const base = `${g(p.respostaRAG, "")}`.trim();
      const jaConvida = /\bcri(?:a|ar|e|es)\b[^.!?]{0,40}\bconta\b|\bregist(?:a|ar|e|o|re)\w*\b|\bparticipar?\b/i.test(base);
      return jaConvida ? base : `${base} Cria uma conta para participar das edições! 😊`.trim();
    },
    comum: (p) => `${g(p.respostaRAG, "")}`.trim(),
    corporativo: (p) => `${g(p.respostaRAG, "")}`.trim(),
    admin: (p) => `${g(p.respostaRAG, "")}`.trim(),
  },

  // ── MC89.2 — MÉTRICAS DO SISTEMA (admin) ──────────────────────────────────
  //
  // Todas saem de `_lib/admin-metricas.obterMetricas()`, a MESMA função que o
  // endpoint `admin-stats` usa e que o separador "Visão Geral" mostra. Se o GUTO
  // e o painel dissessem números diferentes sobre a mesma coisa, seria o B4 do
  // MC88.41 outra vez — noutro domínio.
  //
  // Tom: admin é relatório. Sem emojis (regra MC15.5 §D3).
  //
  // ⚠️ `—` NUNCA é 0. Quando uma fonte falha, o agregador põe o nome dela em
  // `parciais` e o campo fica null; aqui isso vira "—" e a frase diz que a fonte
  // está indisponível. Um zero inventado num painel de administração faz alguém
  // agir sobre um número que ninguém mediu.
  metricas_usuarios: {
    visitante: () => "Esses dados são internos da coordenação. Cria uma conta para participar das edições! 😊",
    comum: () => "Esses números são da coordenação. Posso ajudar-te com os teus lances e senhas! 🙂",
    corporativo: () => "Os totais da plataforma são da coordenação. No teu Painel tens os dados da tua cota.",
    admin: (p) => {
      if (p.utilizadores == null) return `Utilizadores: indisponível (fonte em baixo: ${g(p.parciais, "?")}).`;
      const f = p.fontes || {};
      return `Utilizadores com atividade: ${p.utilizadores}. `
        + `São endereços distintos vistos nos nossos dados (cotas ${g(f.cotas, "—")}, saldo ${g(f.saldo, "—")}, `
        + `creditos ${g(f.creditos, "—")}, lances ${g(f.lances, "—")}). `
        + `NAO e o total de registados: a identidade vive no Privy e quem nunca fez nada nao aparece aqui.`;
    },
  },

  metricas_financeiro: {
    visitante: () => "Esses dados são internos da coordenação. Cria uma conta para participar! 😊",
    comum: () => "Os totais da plataforma são da coordenação. Vês o teu saldo na Carteira! 🙂",
    corporativo: () => "Os totais consolidados são da coordenação. No teu Painel tens os teus próprios dados.",
    admin: (p) => {
      if (p.financeiro == null) return `Financeiro: indisponível (fonte em baixo: ${g(p.parciais, "?")}).`;
      const f = p.financeiro;
      return `Saldo em circulacao: ${brl(f.saldoTotalCentavos)}. `
        + `Ja creditado: ${brl(f.creditadoCentavos)} em ${g(f.creditos, "—")} credito(s), `
        + `${g(f.creditosJanela, "—")} nos ultimos ${g(p.janelaDias, 30)} dias.`;
    },
  },

  metricas_fila: {
    visitante: () => "Isso é do sistema interno. Cria uma conta para participar das edições! 😊",
    comum: () => "A fila de processamento é interna. Se estás à espera de senhas, elas chegam sozinhas! 🙂",
    corporativo: () => "A fila de processamento é interna da coordenação.",
    admin: (p) => {
      if (p.fila == null) return `Fila: indisponível (fonte em baixo: ${g(p.parciais, "?")}).`;
      const f = p.fila;
      const estados = Object.entries(f.porEstado || {}).map(([k, v]) => `${k}=${v}`).join(", ") || "vazia";
      return `Fila de tarefas: ${g(f.pendentes, "—")} pendente(s), ${g(f.falhadas, "—")} falhada(s), `
        + `${g(f.total, "—")} no total (${estados}).`
        + (f.atualizadaEm ? ` Ultima alteracao: ${f.atualizadaEm}.` : "");
    },
  },

  metricas_eoa: {
    visitante: () => "Isso é da operação interna. Cria uma conta para participar! 😊",
    comum: () => "Essa é a carteira da coordenação. As tuas senhas aparecem na Carteira! 🙂",
    corporativo: () => "A carteira da coordenação é interna.",
    admin: (p) => {
      if (p.erro) return `Saldo da coordenadora: indisponível (${p.erro}).`;
      const s = p.saldoEth == null ? "indisponivel (nao lido — NAO e zero)" : `${p.saldoEth} ETH`;
      return `EOA coordenadora ${g(p.eoa, "?")}: ${s}.`
        + (p.bloco != null ? ` Bloco ${p.bloco}.` : "")
        + ` E esta carteira que credita as senhas on-chain: sem gas, a compra deixa de ser creditada.`;
    },
  },

  metricas_geral: {
    visitante: () => "O estado do sistema é interno. Cria uma conta para participar das edições! 😊",
    comum: () => "O estado interno é da coordenação. Posso ajudar-te com as edições! 🙂",
    corporativo: () => "O estado consolidado do sistema é da coordenação.",
    admin: (p) => {
      const linhas = [];
      linhas.push(p.utilizadores == null
        ? "Utilizadores: indisponivel."
        : `Utilizadores com atividade: ${p.utilizadores}.`);
      linhas.push(p.financeiro == null
        ? "Financeiro: indisponivel."
        : `Saldo em circulacao ${brl(p.financeiro.saldoTotalCentavos)}, ja creditado ${brl(p.financeiro.creditadoCentavos)}.`);
      linhas.push(p.cotas == null
        ? "Cotas: indisponivel."
        : `Cotas: ${p.cotas.total} (${p.cotas.comCarteira} com carteira, ${p.cotas.vendidas} vendida(s)).`);
      linhas.push(p.fila == null
        ? "Fila: indisponivel."
        : `Fila: ${g(p.fila.pendentes, "—")} pendente(s), ${g(p.fila.falhadas, "—")} falhada(s).`);
      if (p.parciais?.length) linhas.push(`Fontes em baixo: ${p.parciais}.`);
      return linhas.join(" ");
    },
  },

  // MC88.44 — SUPORTE. Determinístico de propósito: o G1 do MC88.41 apanhou o
  // GUTO a mandar utilizadores para `suporte@desafiogut.com.br`, um domínio que
  // devolve NXDOMAIN — incluindo em "paguei o PIX e não recebi as senhas" e numa
  // acusação de roubo. Quem tem dinheiro preso não pode depender do que o
  // modelo escolher citar do índice: esta resposta não passa pelo LLM.
  // O endereço vem de EMAIL_SUPORTE (uma constante, um sítio).
  suporte: {
    visitante: () => `Para falar com a coordenação: ${EMAIL_SUPORTE} 📧 Se for sobre pagamento ou senhas, diz o teu e-mail de registo e a data — ajuda a encontrar mais depressa.`,
    comum: () => `Para falar com a coordenação: ${EMAIL_SUPORTE} 📧 Se for sobre pagamento ou senhas, junta o comprovativo do PIX e o endereço da tua carteira — resolve-se mais depressa assim. 🙂`,
    corporativo: () => `Contacto da coordenação: ${EMAIL_SUPORTE} 📧 Para assuntos de cota, banner ou faturação, indica a empresa e a categoria da cota.`,
    admin: () => `Canal de suporte ao utilizador: ${EMAIL_SUPORTE}. Emergência de segurança: canal #incidentes interno. LGPD/eliminação: por e-mail com prova de identidade.`,
  },

  saudacao: {
    visitante: "Olá! Sou o GUTO, assistente do DESAFIOGUT. Cria uma conta para participar das edições! 😊",
    comum: "Olá! Sou o GUTO. Como posso ajudar com as edições hoje? 😊",
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
