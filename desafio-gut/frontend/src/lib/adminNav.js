// Modelo de navegação do painel ADM — dados puros, sem React.
//
// MC89.6 (Fase 0 / D-NAV). Ficar como DADOS, e não espalhado por JSX, tem duas
// consequências que valem o ficheiro:
//   · a navegação e as rotas de `App.jsx` saem da MESMA lista, logo não podem
//     divergir (um link para uma rota que não existe é impossível por construção);
//   · o modelo testa-se com `node:test`, que é a única forma de testar navegação
//     neste projeto — não há runner de React (ver docs/MC89.6-DECISOES.txt, T-1).
//
// Mesmo padrão do `navModel.jsx` do MC44, noutro domínio.
//
// ⚠️ D-NAV: a Visão Geral é o ÍNDICE de /admin (`index: true`), não um separador
// entre outros. Sete separadores numa linha não cabem num telemóvel, e truncar
// rótulos foi a lição do MC89.4.
//
// MC89.44 acrescenta uma SEGUNDA lista, `GRUPOS_ADMIN` (no fim do ficheiro):
// as telas agrupam-se pela pergunta do administrador — Quem · Dinheiro ·
// Sistema. É de lá que a navegação se constrói. `TELAS_ADMIN` continua a ser a
// lista canónica de ROTAS; os grupos são a lista canónica de APRESENTAÇÃO, e
// um teste exige que cubram todas as rotas.

/**
 * @typedef {object} EntradaAdmin
 * @property {string}  id        identificador estável (usado em testes e chaves)
 * @property {string}  rota      caminho RELATIVO a /admin ("" = índice)
 * @property {string}  href      caminho absoluto, para os links
 * @property {string}  label     rótulo curto — tem de caber num telemóvel
 * @property {string}  ficheiro  componente em pages/admin/
 * @property {boolean} index     é a rota de índice?
 * @property {boolean} pronta    já tem conteúdo real, ou é esqueleto?
 * @property {string}  [nota]    porque é que está aqui, quando não é óbvio
 */

/** @type {EntradaAdmin[]} */
export const TELAS_ADMIN = [
  {
    id: "visao", rota: "", href: "/admin", label: "Visão Geral",
    ficheiro: "VisaoGeral.jsx", index: true, pronta: true,
  },
  {
    id: "usuarios", rota: "usuarios", href: "/admin/usuarios", label: "Usuários",
    ficheiro: "GestaoUsuarios.jsx", index: false, pronta: true,  // MC89.14 (Fase 4)
  },
  {
    id: "financeiro", rota: "financeiro", href: "/admin/financeiro", label: "Financeiro",
    ficheiro: "GestaoFinanceira.jsx", index: false, pronta: true,  // MC89.16 (Fase 5)
  },
  {
    id: "operacoes", rota: "operacoes", href: "/admin/operacoes", label: "Operações",
    ficheiro: "Operacoes.jsx", index: false, pronta: true,  // MC89.12 (Fase 3)
  },
  {
    id: "logs", rota: "logs", href: "/admin/logs", label: "Logs",
    ficheiro: "LogsAuditoria.jsx", index: false, pronta: true,  // MC89.22
  },
  {
    id: "notificacoes", rota: "notificacoes", href: "/admin/notificacoes", label: "Notificações",
    ficheiro: "Comunicacao.jsx", index: false, pronta: true,  // MC89.18 (Fase 6)
  },
  {
    id: "configuracoes", rota: "configuracoes", href: "/admin/configuracoes", label: "Config",
    ficheiro: "ConfiguracoesAdmins.jsx", index: false, pronta: true,
  },

  // ── Herdadas do AdminPanel, fora da estrutura aprovada de 7 telas ─────────
  // T-2 do MC89.6 — RESOLVIDO no MC89.44: ambas passaram a pertencer ao grupo
  // "Quem" (ver GRUPOS_ADMIN). `nota` fica como registo de ORIGEM, não como
  // estado por decidir.
  {
    id: "aprovacoes", rota: "aprovacoes", href: "/admin/aprovacoes", label: "Aprovações",
    ficheiro: "Aprovacoes.jsx", index: false, pronta: true,
    nota: "herdada do AdminPanel (T-2 do MC89.6); arrumada em «Quem» no MC89.44",
  },
  {
    id: "cotas", rota: "cotas", href: "/admin/cotas", label: "Cotas",
    ficheiro: "Cotas.jsx", index: false, pronta: true,
    nota: "herdada do AdminPanel (T-2 do MC89.6); arrumada em «Quem» no MC89.44",
  },
];

/**
 * As sete telas do plano do MC89.5, sem as duas herdadas.
 *
 * ⚠️ HISTÓRICO. NÃO CONSTRUIR NAVEGAÇÃO A PARTIR DAQUI — foi exatamente isso
 * que causou o defeito que o MC89.44 corrigiu: `NavAdminPersistente` filtrava
 * `!t.nota` e, durante todo o MC89.24→MC89.43, «Aprovações» e «Cotas» tiveram
 * rota, componente e backend a funcionar sem uma única entrada no menu. Num
 * APK, onde não há barra de endereços, isso é o mesmo que não existirem.
 * A navegação constrói-se de GRUPOS_ADMIN, que cobre as nove por construção.
 */
export const TELAS_DO_PLANO = TELAS_ADMIN.filter((t) => !t.nota);

// ── Agrupamento por PERGUNTA do administrador ───────────────────────────────
//
// MC89.44 (P1-A). Nove pastilhas iguais em fila obrigam a ler a fila toda de
// cada vez. O critério de agrupamento NÃO é a tabela do backend — é a pergunta
// que traz o ADM ao painel:
//
//     QUEM ....... "quem está na plataforma, e o que preciso de despachar?"
//     DINHEIRO ... "quanto entrou, quanto saiu, e fecha?"
//     SISTEMA .... "isto está de pé, e quem mexeu no quê?"
//
// A ordem dos grupos é a ordem de importância dada pelo operador e não deve
// ser reordenada por conveniência de layout.
//
// ⚠️ «Dinheiro» tem UMA tela, e fica assim de propósito. É a pergunta de maior
// risco do painel e merece porta própria mesmo com um só ecrã atrás — é onde
// aterram a reconciliação e a exportação do P2, e os lances quando existirem.
// Enchê-lo agora com «Cotas» só para o equilibrar seria arrumar pela silhueta
// do menu em vez de pelo assunto: em «Cotas» o objeto é o LOJISTA (tier,
// aprovação, contacto), e o dinheiro é atributo dele.

/**
 * @typedef {object} GrupoAdmin
 * @property {string}   id        identificador estável
 * @property {string}   label     cabeçalho curto — cabe num telemóvel
 * @property {string}   pergunta  a pergunta que o grupo responde (copy de UI)
 * @property {string[]} telas     ids de TELAS_ADMIN, pela ordem de apresentação
 */

/** @type {GrupoAdmin[]} */
export const GRUPOS_ADMIN = [
  {
    id: "quem", label: "Quem", pergunta: "Quem está na plataforma",
    telas: ["usuarios", "aprovacoes", "cotas"],
  },
  {
    id: "dinheiro", label: "Dinheiro", pergunta: "Quanto entrou e saiu",
    telas: ["financeiro"],
  },
  {
    id: "sistema", label: "Sistema", pergunta: "Estado, rasto e definições",
    telas: ["operacoes", "logs", "notificacoes", "configuracoes"],
  },
];

/** As telas de um grupo, já resolvidas em entradas (ignora ids desconhecidos). */
export function telasDoGrupo(idGrupo) {
  const g = GRUPOS_ADMIN.find((x) => x.id === idGrupo);
  if (!g) return [];
  return g.telas.map((id) => TELAS_ADMIN.find((t) => t.id === id)).filter(Boolean);
}

/** A que grupo pertence uma tela? O índice não pertence a nenhum. */
export function grupoDaTela(idTela) {
  return GRUPOS_ADMIN.find((g) => g.telas.includes(idTela)) || null;
}

/**
 * O grupo a abrir para um caminho.
 *
 * Fora do painel devolve null; no ÍNDICE devolve o primeiro grupo. O índice
 * abrir com um grupo aberto não é enfeite: é o que evita que a única tela onde
 * o ADM sempre aterra seja também a única onde tudo fica a dois toques.
 */
export function grupoAtivo(caminho) {
  const tela = telaAtiva(caminho);
  if (!tela) return null;
  if (tela.index) return GRUPOS_ADMIN[0];
  return grupoDaTela(tela.id);
}

/** A entrada de índice de /admin. */
export function telaIndice() {
  return TELAS_ADMIN.find((t) => t.index) || null;
}

/**
 * Qual a tela ativa para um caminho? Usado para marcar o item da navegação.
 *
 * Casa o segmento a seguir a "/admin" e não por prefixo: com `startsWith`,
 * "/admin" casaria com tudo e o índice ficaria sempre marcado como ativo.
 */
export function telaAtiva(caminho) {
  const limpo = String(caminho || "").replace(/\/+$/, "");
  // Só "/admin" (e "/admin/", já normalizado) é o índice. NÃO se pode aceitar a
  // string vazia aqui: "/" também normaliza para "", e o índice do painel
  // ficaria marcado como ativo na raiz da aplicação.
  if (limpo === "/admin") return telaIndice();
  const segmento = limpo.startsWith("/admin/") ? limpo.slice("/admin/".length).split("/")[0] : null;
  if (!segmento) return null;
  return TELAS_ADMIN.find((t) => t.rota === segmento) || null;
}
