// UTAC107g.3 (DEBT-021) — MC17: `?rc=1` dava acesso direto ao painel do lojista sem sessão
// Privy, logo após o cadastro. Lido pela CorporativoRoute (App.jsx).
//
// UTAC107g.4 — a exceção `rc=1` foi FECHADA. A função passa a devolver `false` SEMPRE:
//   · Ninguém no app gera esse endereço — 0 produtores em `src/` e `netlify/functions/`
//     (medido no UTAC107g, de novo no 107g.1 e no 107g.3); o último produtor
//     (`SejaNossoParceiro` → `/corp`/`?rc=1`) foi substituído no MC99.1 e a rota `/corp`
//     saiu no UTAC107g. Logo, o único efeito de manter a exceção era deixar um ANÓNIMO
//     passar a guarda das 8 rotas do lojista de `CorporativoRoute`.
//   · A função MANTÉM-SE (não se remove) como ponto único de verdade: se algum dia for
//     necessário reabrir o acesso directo, é AQUI — e com um novo teste de segurança.
//   · A ASSINATURA mantém-se, pelo que `App.jsx:149` continua a chamá-la sem alteração
//     (`if (!temAcessoDiretoCadastro(window.location.search)) return <Navigate to="/" replace />;`).
//   · Contexto: DEBT-021 (fechada sem resíduo neste UTAC) e UTAC107g.3.
export function temAcessoDiretoCadastro(search) {
  // A assinatura é preservada de propósito; o parâmetro deixa de ser consultado.
  void search;
  return false;
}
