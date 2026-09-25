// _stubs/hooks.js — MC94. Duplos de `useRanking` e `useFeedback`.
//
// Os hooks reais fazem `apiGet` dentro de `useEffect`, e em SSR o efeito não
// corre — o teste veria sempre o estado inicial. Substituí-los por duplos com
// estado controlado é o que permite exercitar os quatro estados de cada secção
// (vazio, a carregar, erro, com dados) na PÁGINA inteira.
// (Os hooks REAIS são testados a correr em `src/hooks/__tests__/hooks-torneio.test.mjs`,
// com um condutor de hooks próprio e um duplo de `fetch`.)
//
// ⚠️ ESTE DUPLO REGISTA OS ARGUMENTOS, e isso não é conveniência.
// A primeira versão ignorava-os: `useRanking()` devolvia os dados combinados
// aconteça o que acontecer. Uma página que chamasse `useRanking(undefined)` ou
// `useFeedback(ciclo, undefined, undefined)` — isto é, que se esquecesse de ligar
// `address` ou `authToken` — passava TODOS os testes. É exactamente a classe de
// duplo permissivo que este projeto já pagou três vezes (MC93-B: mock que
// ignorava o argumento deu verde a um endpoint avariado a 100%; MC93-C: duplo que
// aceitava `.eq(col,null)`; MC93-D: 8 de 16 métodos divergentes, todos na direcção
// permissiva). Registar os argumentos é o que torna a cablagem observável.

let estado = null;
let chamadas = { ranking: [], feedback: [] };

/** Define o que os hooks devolvem no próximo render, e limpa o registo. */
export function definirHooks(e) {
  estado = e;
  chamadas = { ranking: [], feedback: [] };
}

/** Argumentos com que a página chamou cada hook, na ordem em que os chamou. */
export function argumentos() {
  return chamadas;
}

function exigir(qual) {
  if (!estado) throw new Error("duplo dos hooks usado sem `definirHooks()`");
  return estado[qual];
}

export function useRanking(...args) {
  chamadas.ranking.push(args);
  return exigir("ranking");
}

export function useFeedback(...args) {
  chamadas.feedback.push(args);
  return exigir("feedback");
}

export default { useRanking, useFeedback, definirHooks, argumentos };
