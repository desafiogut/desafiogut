// _stubs/useResultadoOficial.js — UTAC000.8. Duplo do resultado OFICIAL da edição.
//
// PORQUÊ: em SSR os efeitos NÃO correm. Sem duplo, o hook real devolveria sempre `null` e o
// ramo do resultado oficial nunca seria exercitado — o teste passaria sem testar nada.
//
// ⚠️ REGISTA O ARGUMENTO (`edicaoId`) de propósito: é a lição do `hooks.js` (MC94) — um duplo
// que ignora o argumento dá verde a uma página que se esqueceu de ligar a edição certa.
// A página TEM de pedir o resultado da edição activa; o teste verifica-o.

let resultado = null;
let chamadas = [];

/** Define o que o hook devolve no próximo render, e limpa o registo de chamadas. */
export function definirResultadoOficial(r) {
  resultado = r;
  chamadas = [];
}

/** Edições com que a página pediu o resultado, na ordem em que as pediu. */
export function argumentos() {
  return chamadas;
}

export function useResultadoOficial(edicaoId) {
  chamadas.push(edicaoId);
  return resultado;
}
