// _stubs/leilaoLock.js — UTAC108d. Duplo de `src/lib/leilaoLock.js` para os testes da página do MLC.
// O `EM_BREVE_MODE` real é uma CONSTANTE `true` (o ramo «há edição» seria inalcançável em teste); aqui é uma
// ligação viva que o teste muda com `definirEmBreve()`. O runner SSR do Vite lê o export por propriedade
// a cada render, logo a mudança vê-se no render seguinte. Mesma forma pública do original.
export let EM_BREVE_MODE = true;
export const EM_BREVE_LABEL = "EM BREVE";
export function displayTimer(fallback) { return EM_BREVE_MODE ? EM_BREVE_LABEL : fallback; }
export function definirEmBreve(v) { EM_BREVE_MODE = v; }
