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
    ficheiro: "GestaoFinanceira.jsx", index: false, pronta: false,
  },
  {
    id: "operacoes", rota: "operacoes", href: "/admin/operacoes", label: "Operações",
    ficheiro: "Operacoes.jsx", index: false, pronta: true,  // MC89.12 (Fase 3)
  },
  {
    id: "logs", rota: "logs", href: "/admin/logs", label: "Logs",
    ficheiro: "LogsAuditoria.jsx", index: false, pronta: false,
  },
  {
    id: "notificacoes", rota: "notificacoes", href: "/admin/notificacoes", label: "Notificações",
    ficheiro: "Comunicacao.jsx", index: false, pronta: false,
  },
  {
    id: "configuracoes", rota: "configuracoes", href: "/admin/configuracoes", label: "Config",
    ficheiro: "ConfiguracoesAdmins.jsx", index: false, pronta: true,
  },

  // ── Funcionalidades vivas SEM lugar na estrutura aprovada de 7 telas ───────
  // T-2 do MC89.6. Ambas funcionam hoje e deixá-las cair seria uma regressão
  // silenciosa. Ficam autónomas — o estado que não perde nada — até o operador
  // decidir se pertencem a "Usuários" e a "Financeiro" ou se o painel tem nove.
  {
    id: "aprovacoes", rota: "aprovacoes", href: "/admin/aprovacoes", label: "Aprovações",
    ficheiro: "Aprovacoes.jsx", index: false, pronta: true,
    nota: "funcionalidade viva; lugar na estrutura de 7 telas por decidir (T-2)",
  },
  {
    id: "cotas", rota: "cotas", href: "/admin/cotas", label: "Cotas",
    ficheiro: "Cotas.jsx", index: false, pronta: true,
    nota: "funcionalidade viva; lugar na estrutura de 7 telas por decidir (T-2)",
  },
];

/** As sete telas do plano aprovado, sem as duas herdadas. */
export const TELAS_DO_PLANO = TELAS_ADMIN.filter((t) => !t.nota);

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
