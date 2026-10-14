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
// ⭐ UTAC110c-1 (2026-10-12) — O REGULAMENTO INTEGRAL PASSA A VIR NO PROMPT.
// O texto vive em `./guto-regulamento.mjs` (ficheiro derivado de `docs/GUTO-REGULAMENTO.md`)
// porque as Netlify Functions são empacotadas pelo esbuild a partir de `netlify/functions/`:
// um `readFileSync("../../../../docs/…")` funcionaria nos testes e daria ENOENT em Lambda.
import { REGULAMENTO_TEXTO } from "./guto-regulamento.mjs";

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
  // ⭐ UTAC110c-1: «senhas» saiu (modelo antigo). O Regulamento 5.0 não tem senhas — o produto
  // digital é o Passe Desafio e o que se acumula são pontos de fidelidade. Sem esta correcção o
  // prompt do perfil contradizia o documento que segue no fim do mesmo prompt.
  comum: `${SYS_BASE}

PERFIL: UTILIZADOR COMUM (autenticado). Amigável e didático. Ajuda com lances, passes,
pontos de fidelidade e regras. Não reveles comandos de administração.`,

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
//
// ⭐ UTAC110c-1: o texto interior passou a Via B — saíram «torneio» e «senhas» (modelo antigo,
// que o Regulamento 5.0 não conhece). A REGRA testada pelo `mcsorteio01a` fica INTACTA: continua
// a haver a frase «Sobre prazos de entrega, trocas e devoluções, NÃO prometa …» com o
// EMAIL_SUPORTE — é isso que impede o LLM de inventar prazos (oferta ao consumidor, CDC art. 30).
const PROMPT_CONFORMIDADE = `Você é o GUTO, assistente do DESAFIOGUT nesta versão do app (loja de e-commerce).
Nesta versão as Ofertas NÃO estão disponíveis — elas funcionam na versão Web (PWA),
acessível pelo navegador em desafiogut.com.

Regras:
- Frases curtas, simpáticas, no máximo 2-3 por resposta.
- Se perguntarem sobre as Ofertas (Relâmpago ou Programada), lances, carteira, passes ou
  pontos de fidelidade: informe com honestidade que isso está disponível na versão Web
  (desafiogut.com) e ofereça ajuda com a loja. NUNCA diga que as Ofertas não existem — diga
  apenas onde encontrá-las.
- Ajude com dúvidas sobre os produtos. Sobre prazos de entrega, trocas e devoluções, NÃO prometa prazos nem condições: encaminhe para o suporte em ${EMAIL_SUPORTE}.
- Não invente regras nem dados. Não trate comandos de administração.`;

/**
 * Devolve o system prompt do perfil (fallback: visitante).
 * MC29.1: se `conformidade` for true, devolve o prompt de loja (independente do
 * perfil) — usado quando o leilão não está ativo na plataforma do utilizador.
 */
// ⭐ UTAC110c-1 (2026-10-12) — REESCRITA PARA O MODELO «VIA B» (Regulamento Oficial 5.0).
//
// O que sai e porquê (causa medida no UTAC110b/110b.1): o texto anterior ensinava o modelo
// ANTIGO — «torneio de habilidade», «Portaria SPA/MF 1.207/2024» — que o NORTE DO PRODUTO
// Via B superou (programa de fidelidade gamificado; SPA/MF NÃO se aplica). O GUTO respondia
// com uma moldura legal que já não descreve o produto; com o regulamento v5 no prompt, a
// moldura antiga passou a CONTRADIZER a fonte.
//
// A LISTA DE PALAVRAS PROIBIDAS mantém-se INTEIRA (`leilão`, `jogo de azar`, `aposta`, `bet`,
// `sorte`): é o objectivo do MC96.2 — o erro que a produção mostrou a 2026-09-25 — e continua
// a valer. O que muda é só o VOCABULÁRIO DE SUBSTITUIÇÃO.
//
// ⚠️ O RAG FOI RETIRADO. A justificação histórica do MC96.2 dizia que «o 'leilão' vive nos
// chunks do RAG, fora do repositório»; isso deixou de ser verdade — o índice foi removido e a
// única fonte que o GUTO lê é o Regulamento Oficial, que está neste prompt. A defesa continua a
// ser esta regra explícita.
export const REGRA_LINGUAGEM = `

REGRA DE LINGUAGEM (obrigatória):
- O DesafioGUT é um PROGRAMA DE FIDELIDADE GAMIFICADO. NUNCA o chames leilão.
- PALAVRAS PROIBIDAS: "leilão", "leilões", "jogo de azar", "aposta", "bet", "sorte". Isto vale
  para ti E para quem escreve: se o utilizador disser "leilão", corrige com naturalidade
  ("é um programa de fidelidade, não é leilão") e continua com o termo correcto — não repitas
  a palavra dele.
- USA sempre: "programa de fidelidade", "competição de habilidade", "Oferta Relâmpago",
  "Oferta Programada", "Passe Desafio", "pontos de fidelidade", "lance", "palpite", "ECOQUILDO".
- NUNCA enquadres a Oferta Relâmpago em autorização governamental, em regulação de apostas ou em
  "quota fixa": o DesafioGUT NÃO depende de nenhuma dessas autorizações. Não fales disso nem para
  o justificar — o Regulamento, que tens no fim, não o diz.
- Vale MESMO que os textos que recebes usem outro termo: a forma de falar é tua.`;

// ⭐ UTAC110c-1 (2026-10-12) — REESCRITO PARA O MODELO «VIA B» E PARA O REGULAMENTO 5.0.
//
// O que era e porque já não serve: o MC96.3 copiou 10 artigos do `docs/REGULAMENTO-v4.md` porque
// o GUTO **não tinha acesso ao documento** — esse resumo era a única âncora normativa que ele
// tinha. Isso deixou de ser verdade: desde este UTAC o **Regulamento INTEIRO vai no prompt**
// (`REGULAMENTO_TEXTO`), e é ELE a fonte. O antigo bloco ensinava «senhas», «Programado (consome
// SENHAS)» e «Portaria SPA/MF 1.207/2024» — modelo superado pelo NORTE DO PRODUTO Via B.
//
// O que este mapa passa a SER: uma **ÂNCORA DE CITAÇÃO** — um índice curto artigo → frase, para o
// modelo citar depressa. **NÃO é conhecimento independente**: cada âncora tem de ser um excerto
// VERBATIM do artigo correspondente, e `_tests/mc963-guto-regulamento.test.mjs` verifica-o artigo
// a artigo contra `docs/GUTO-REGULAMENTO.md`. Se um dia divergirem, o teste cai — não se descobre
// em produção.
//
// ⚠️ O NOME `ARTIGOS_V4` é HISTÓRICO e mantém-se de propósito: é citado pelos guardas da série
// (`mc962`, `mc963`). O conteúdo é do Regulamento **5.0** — o nome NÃO é uma afirmação de versão.
// (Renomear a export obrigaria a mexer em guardas que não fazem parte do escopo deste UTAC.)
//
// ⚠️ As âncoras escrevem os VALORES na forma correcta (`R$ 2,00`), não na forma **defeituosa** que
// o PDF oficial imprime (`R\$ 2,00`, `1\text{ ponto}`). Ver a secção **ERRATA DA FONTE** no topo
// de `docs/GUTO-REGULAMENTO.md`: é um defeito do documento de origem, declarado, não uma
// divergência destas âncoras. O teste compara-as com a fonte **já sem esse defeito**
// (`semEscapesDaFonte`, abaixo).
export const ARTIGOS_V4 = {
  "1":  "O DesafioGUT é um programa de fidelidade gamificado operado pela Associação Recreativa dos Nordestinos no Amazonas",
  "6":  "O Passe Desafio é o produto digital adquirido pelo utilizador, com preço fixo de R$ 2,00 (dois reais), nas modalidades Passe Relâmpago e Passe Programado.",
  "8":  "Cada Passe Desafio adquirido concede ao utilizador 10 (dez) pontos de fidelidade.",
  "9":  "A cada 50 (cinquenta) pontos de fidelidade acumulados, o utilizador poderá adquirir 1 (um) cartão colecionável físico da Família Quildo.",
  "12": "A Oferta Relâmpago é patrocinada pelos patrocinadores que adquirem as Cotas Bronze e Cotas Prata",
  "14": "A Oferta Relâmpago é uma competição de habilidade: vence o participante que apresentar o menor valor em pontos de lance que ninguém mais escolheu (menor lance único).",
  "17": "Os pontos de lance não são comprados com dinheiro real — são ganhos por atividade no aplicativo.",
  "18": "à razão de 1 ponto = R$ 0,01 (um centavo)",
  "24": "A Oferta Programada é patrocinada pelos patrocinadores que adquirem as Cotas Ouro e Cotas Diamante",
  "27": "Vence o palpite que ficar mais próximo do número real de lances apurado pela Associação.",
  "33": "O palpite vencedor concede, como bónus de fidelidade, +2 (dois) pontos de fidelidade ao participante.",
  "34": "Os pontos de bónus do palpite não contam para o resgate do cartão colecionável",
  "37": "1 (um) Passe Desafio = 10 (dez) pontos de fidelidade",
  "47": "O ECOQUILDO é uma moeda social interna do Grupo União e Trabalho, com lastro em reais à razão de 1 ECOQUILDO = R$ 1,00 (um real).",
  "52": "será realizada exclusivamente por meio do sistema de faturamento do Google Play (Google Play Billing)",
};

/**
 * Remove o DEFEITO DE ORIGEM do Regulamento (ver **ERRATA DA FONTE** no topo de
 * `docs/GUTO-REGULAMENTO.md`): o PDF oficial imprime `R\$` onde quer dizer `R$` e `N\text{ X}`
 * onde quer dizer `N X` (9 escapes, nos artigos dos valores).
 *
 * Serve para CONFERIR âncoras/afirmações contra a fonte sem que o defeito do documento as faça
 * parecer divergentes. **O texto transcrito NÃO é alterado** — é com o escape que ele vai no
 * prompt, tal como está impresso no documento oficial.
 *
 * @param {string} t
 * @returns {string}
 */
export const semEscapesDaFonte = (t) =>
  // ⚠️ O limite `{0,200}` NÃO é decorativo: sem ele, uma ocorrência de `\text{` SEM fechar chave
  // (ex.: citada em prosa, como aconteceu na ERRATA deste próprio ficheiro) engolia tudo até ao
  // próximo `}` — 4 646 caracteres, medidos — e transformava o Art. 18 num texto mutilado. Foi um
  // erro de instrumento, apanhado pelo teste, não em produção.
  String(t).replace(/\\text\{([^}]{0,200})\}/g, "$1").replace(/\\\$/g, "$");

// ⭐ UTAC110c-1 (2026-10-12) — REESCRITA PARA O MODELO «VIA B» (Regulamento Oficial 5.0).
//
// O bloco anterior dizia «REGULAMENTO (v4 — a versão que vai a cartório)» e ensinava, como
// FACTOS: «base legal: torneio de habilidade nos termos da Portaria SPA/MF nº 1.207/2024»,
// «Programado (consome SENHAS)», «Senha: R$ 2,00 cada», «saldo em dinheiro (Art. 8º)».
// **Tudo isso é o modelo ANTIGO**, superado pelo NORTE DO PRODUTO Via B — e, a partir de agora,
// directamente CONTRADITÓRIO com o documento que segue no prompt. Um prompt que contradiz a
// própria fonte produz exactamente o defeito que este UTAC veio corrigir.
//
// A mudança de fundo: este bloco deixou de trazer os factos em prosa. O **Regulamento INTEIRO**
// segue no fim do prompt (`REGULAMENTO_TEXTO`) e é a ÚNICA fonte. Aqui ficam as **instruções de
// uso** dele e o índice de âncoras para citação.
export const REGRA_REGULAMENTO = `

REGULAMENTO OFICIAL (versão 5.0) — COMO USAR:
O texto INTEGRAL do Regulamento Oficial do DesafioGUT segue no fim deste prompt. É a TUA ÚNICA
FONTE sobre regras, produtos e mecânica — não tens outra e não precisas de outra.
- Quando responderes sobre regras, CITA o artigo que fundamenta a resposta, assim: «segundo o
  Art. 26º do Regulamento».
- NUNCA cites um artigo que não esteja no texto abaixo e nunca inventes o número de um artigo.
- Se a resposta NÃO estiver no Regulamento, di-lo com naturalidade e dá uma saída
  (${EMAIL_SUPORTE}) — não inventes regras, valores nem prazos.
- Responde CURTO: a regra que interessa, o artigo, e a saída. Não despejes capítulos.

MODELO DE HOJE (Via B): o produto digital é o Passe Desafio (R$ 2,00) — Passe Relâmpago (1 lance)
e Passe Programado (1 palpite). Cada Passe dá 10 pontos de fidelidade; 50 pontos = 1 cartão
colecionável físico. Há também a moeda social ECOQUILDO. Descreve SÓ o que o Regulamento diz:
não acrescentes produtos, créditos ou preços que ele não tenha.

⚠️ DEFEITO CONHECIDO DA FONTE (ver a secção «ERRATA DA FONTE» no texto do Regulamento): o
documento oficial imprime por engano as marcas «R\\$» e «N\\text{ X}». LÊ-SE «R$» e «N X». Usa
sempre os valores em reais — nunca repitas «R\\$» nem «\\text{» ao utilizador.

ÂNCORAS DE CITAÇÃO (índice curto; o que MANDA é o texto do Regulamento no fim):
${Object.entries(ARTIGOS_V4).map(([n, t]) => `- Art. ${n}º — ${t}`).join("\n")}`;

export function obterPromptSystem(perfil, { conformidade = false } = {}) {
  const base = conformidade ? PROMPT_CONFORMIDADE : (PROMPT_SYSTEMS[perfil] || PROMPT_SYSTEMS.visitante);
  // UTAC110c-1 — o GUTO deixou de ter um índice de 3 excertos (RAG, Blob `rag`) e passou a levar o
  // Regulamento INTEIRO. Ordem: persona → regras de linguagem → instruções de uso → o documento
  // (por último, e por isso o bloco mais próximo da pergunta: é a fonte que o modelo deve citar).
  // MC96.2 + MC96.3 mantêm-se identificáveis no histórico; o conteúdo é Via B / Regulamento 5.0.
  return base + REGRA_LINGUAGEM + REGRA_REGULAMENTO + "\n\n" + REGULAMENTO_TEXTO;
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
  // UTAC110h.1 (R18-110h.1-C) — deixou de prometer «+1 senha» (modelo antigo). Diz o que o app
  // credita HOJE: +50 pontos de lance ao indicante e ao indicado (UTAC110f, `_lib/fontes-lance.mjs`
  // PONTOS_INDICACAO / LIMITE_INDICACOES_MES — há teste que amarra estes números às constantes).
  // ⚠️ PENDENTE: o Regulamento v5.0, Art. 51º, fala em 2 ECOQUILDO ao indicante e 1 ao indicado;
  // esse crédito ainda não está ligado no backend — quando estiver, este texto muda com ele.
  indique_e_ganhe: {
    visitante: () => "Indique e Ganhe é para membros! Crie a sua conta e, por cada amigo que se cadastrar com o seu código, você ganha +50 pontos de lance (e o seu amigo também). 😊",
    comum: (p) => `Aqui está o seu Indique e Ganhe! 🎁 Compartilhe o seu link: por cada amigo que criar a conta com o seu código, você ganha +50 pontos de lance na hora (e o seu amigo também), até 10 indicações por mês. Código: ${g(p.codigo)}.`,
    corporativo: (p) => `Indique e Ganhe — código ${g(p.codigo)}. Por cada indicado que crie a conta com o seu código: +50 pontos de lance para si e +50 para o indicado, creditados no cadastro (até 10 indicações creditadas por mês). Indicados: ${g(p.total_indicados, "0")}; convertidos: ${g(p.total_convertidos, "0")}.`,
    admin: (p) => `Indique e Ganhe — código ${g(p.codigo)}. Indicados: ${g(p.total_indicados, "0")}; convertidos: ${g(p.total_convertidos, "0")}. Recompensa: +50 pontos de lance ao indicante e ao indicado (até 10 por mês por indicante).`,
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

  // ⭐ UTAC110c-1 — MODELO VIA B. As antigas «cotas comerciais para lojista» (Bronze R$ 2.640,
  // Prata R$ 5.600, Ouro R$ 11.000, Diamante R$ 18.000, com senhas de troco do excedente) já não
  // existem: o lojista saiu do app (UTAC108f) e o Regulamento 5.0 estabelece que as Cotas são
  // adquiridas por **PATROCINADORES**, com condições definidas em **contrato privado de patrocínio
  // que NÃO integra o Regulamento** (Arts. 12º e 24º). O GUTO não pode citar valores que o
  // Regulamento não fixa — antes citava-os (tabela de preços completa), e passava a contradizer a
  // fonte que agora tem no prompt. Passa a remeter ao contrato e à coordenação.
  comprar_cotas: {
    visitante: () => "O patrocínio das Ofertas é falado com a coordenação. Cria a tua conta e fala com a gente! 😊",
    comum: () => "O patrocínio das Ofertas é falado com a coordenação. Posso ajudar-te com os teus lances e passes! 🙂",
    corporativo: () => `O patrocínio das Ofertas é contratado directamente com a coordenação: as condições das Cotas (valores, prazos, visibilidade e obrigações) constam de contrato privado de patrocínio e NÃO integram o Regulamento (Arts. 12º e 24º). Contacto: ${EMAIL_SUPORTE}.`,
    admin: () => `Patrocínio por contrato privado entre a Associação e cada patrocinador (Arts. 12º e 24º do Regulamento) — as condições NÃO integram o Regulamento e o GUTO não as cita. Cota Bronze/Prata -> Oferta Relâmpago; Cota Ouro/Diamante -> Oferta Programada.`,
  },

  // MC17.1 — preços/pacotes das cotas comerciais. (Via B desde o UTAC110c-1 — ver acima.)
  pacotes_cotas: {
    visitante: () => "O patrocínio das Ofertas é falado com a coordenação. Cria uma conta para participar! 😊",
    comum: () => "O patrocínio das Ofertas é falado com a coordenação. 🙂",
    corporativo: () => `São duas famílias de Cota: Bronze e Prata patrocinam a Oferta Relâmpago; Ouro e Diamante patrocinam a Oferta Programada (Arts. 12º e 24º do Regulamento). Valores e demais condições são definidos em contrato privado de patrocínio, fora do Regulamento — pede a tabela à coordenação (${EMAIL_SUPORTE}).`,
    admin: () => "Cotas: Bronze/Prata -> patrocínio da Oferta Relâmpago; Ouro/Diamante -> patrocínio da Oferta Programada. Valores e condições só no contrato privado — não estão no Regulamento e o GUTO não os cita.",
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
