// _stubs/hooks.js — MC94. Duplos de `useRanking` e `useFeedback`.
//
// Os hooks reais fazem `apiGet` dentro de `useEffect`, e em SSR o efeito não
// corre — o teste veria sempre o estado inicial. Substituí-los por duplos com
// estado controlado é o que permite exercitar os quatro estados de cada secção
// (vazio, a carregar, erro, com dados) na PÁGINA inteira.
let estado = null;
export function definirHooks(e) { estado = e; }
function exigir(qual) {
  if (!estado) throw new Error("duplo dos hooks usado sem `definirHooks()`");
  return estado[qual];
}
export function useRanking()  { return exigir("ranking"); }
export function useFeedback() { return exigir("feedback"); }
export default { useRanking, useFeedback, definirHooks };
