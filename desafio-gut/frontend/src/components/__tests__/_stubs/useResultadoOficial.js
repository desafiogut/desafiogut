// _stubs/useResultadoOficial.js — UTAC000.9. Duplo do resultado OFICIAL para os testes de
// COMPONENTE (a versão usada pelos testes de página vive em `src/pages/__tests__/_stubs/`; a
// convenção do projeto é um `_stubs` por pasta de testes).
//
// ⚠️ REGISTA O ARGUMENTO (`edicaoId`): um duplo que o ignorasse daria verde a um componente que
// se esqueceu de pedir o resultado da EDIÇÃO CERTA (lição do `hooks.js`, MC94).

let resultado = null;
let chamadas = [];

export function definirResultadoOficial(r) {
  resultado = r;
  chamadas = [];
}

export function argumentos() {
  return chamadas;
}

export function useResultadoOficial(edicaoId) {
  chamadas.push(edicaoId);
  return resultado;
}
