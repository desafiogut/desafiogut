// _stubs/leilaoLock.js — UTAC110a. Duplo de `src/lib/leilaoLock.js` para os testes de COMPONENTE
// (convenção do repo: um `_stubs` por pasta de testes; o gémeo vive em `src/pages/__tests__/_stubs/`).
//
// PORQUE É PRECISO: a constante real `EM_BREVE_MODE` é `true` em produção, logo
// `getEstadoEdicao` devolveria SEMPRE «em breve» e os outros 3 estados seriam inalcançáveis —
// o teste do contraste seria verde sem medir nada. Aqui é uma ligação viva que o teste muda com
// `definirEmBreve()`. Mesma forma pública do original.
export let EM_BREVE_MODE = true;
export const EM_BREVE_LABEL = "EM BREVE";
export function displayTimer(fallback) { return EM_BREVE_MODE ? EM_BREVE_LABEL : fallback; }
export function definirEmBreve(v) { EM_BREVE_MODE = v; }
