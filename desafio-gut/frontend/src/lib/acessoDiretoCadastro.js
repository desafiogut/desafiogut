// UTAC107g.3 (DEBT-021) — MC17: `?rc=1` dá acesso direto ao painel do lojista sem
// sessão Privy, logo após o cadastro. Lido pela CorporativoRoute (App.jsx).
//
// Match EXATO do parâmetro `rc`. Antes era `search.includes("rc=1")` (substring):
// `?src=1`, `?arc=10`, `?rc=10` e `?xrc=1` também abriam a UI das 8 rotas do lojista
// a um anónimo. Os dados continuam protegidos no servidor; isto fecha só a UI.
export function temAcessoDiretoCadastro(search) {
  if (typeof search !== "string") return false;
  return new URLSearchParams(search).get("rc") === "1";
}
