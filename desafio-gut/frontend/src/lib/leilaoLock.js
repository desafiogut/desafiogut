// MC67 — trava global "EM BREVE" dos cronômetros (item 9 do plano MC66).
//
// Enquanto EM_BREVE_MODE = true, TODOS os cronômetros do app exibem "EM BREVE" no
// lugar da contagem viva. É uma trava de APRESENTAÇÃO — NÃO altera a lógica de
// negócio, a contagem, nem o estado `encerrado`. Fonte única de verdade: mude aqui
// para reativar todos os cronômetros de uma vez quando o leilão abrir.
//
// Coerente com a decisão MC65 (Hero "EM BREVE" permanente na aba Lances).

export const EM_BREVE_MODE = true;
export const EM_BREVE_LABEL = "EM BREVE";

/** Rótulo travado quando o modo "em breve" está ligado; senão devolve o fallback. */
export function displayTimer(fallback) {
  return EM_BREVE_MODE ? EM_BREVE_LABEL : fallback;
}
