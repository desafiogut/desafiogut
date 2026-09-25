// _stubs/BotaoLoginPrincipal.jsx — MC94.
// O componente real arrasta o SDK do Privy (2,68 MB, medido no MC88.36), que em
// SSR estoura a heap do node. O duplo renderiza o MESMO texto visível, que é o
// que o teste de não-regressão do convite a entrar precisa de afirmar.
export default function BotaoLoginPrincipal({ onClick }) {
  return <button type="button" onClick={onClick}>Entrar no DesafioGUT</button>;
}
