// _stubs/usePontos.js — UTAC107c. Duplo do `usePontos` para o Dashboard.
//
// PORQUÊ: em SSR os efeitos NÃO correm, logo o hook real fica para sempre em `loading: true`
// e o tile «Passe Desafio» mostraria só o skeleton — os estados «dados», «vazio» e «erro»
// nunca seriam exercitados.
//
// ⚠️ Devolve a MESMA forma do real (`src/hooks/usePontos.js`). Por omissão é a forma VAZIA (tudo a
// 0); os testes que provam o campo certo definem `pontos` (total) e `pontosCartao` (só compras)
// DISTINTOS de propósito — um tile ligado ao campo errado mostra outro número e o teste apanha-o.

const BASE = Object.freeze({
  pontos: 0, pontosCartao: 0, bonusPalpite: 0,
  historico: [], palpites: [], pontosParaCartao: 50, podeResgatarCartao: false,
  loading: false, erro: "",
});

let estado = { ...BASE };
let chamadas = 0;

/** Define o que o hook devolve no próximo render (por cima da forma VAZIA do real). */
export function definirPontos(parcial = {}) {
  estado = { ...BASE, ...parcial };
  chamadas = 0;
}

/** Quantas vezes a página chamou o hook desde o último `definirPontos`. */
export function chamadasPontos() {
  return chamadas;
}

export function usePontos() {
  chamadas += 1;
  return { ...estado, refetch: async () => null };
}
