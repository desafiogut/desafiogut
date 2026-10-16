// _stubs-110i1/useRecursosApp.js — UTAC110i.1 (FRENTE D). Duplo CONTROLÁVEL de `useRecursosApp`
// para o teste da BIFURCAÇÃO do `useComprarPasse` (PIX vs Google Play Billing).
//
// ⚠️ FIDELIDADE (T3): devolve EXACTAMENTE as chaves do hook real (`useRecursosApp.js` l.141-146 +
// `DEFAULT_FLAGS_TRANSICAO`), nem uma a mais. O que varia é só `isPagamentoNativoAtivo`, que é o
// objecto do teste — e `isLoading:false`, porque o arnês corre sem I/O (o real arranca a `true`).
//
// ⚠️ O estado vive no `globalThis` porque este ficheiro é avaliado DUAS vezes (o grafo do Vite do
// hook e o do teste) — estado de módulo daria duas instâncias e o teste controlaria uma enquanto o
// alvo lia a outra (falso verde).

const G = globalThis;
if (G.__stub110i1Recursos === undefined) G.__stub110i1Recursos = { isPagamentoNativoAtivo: false, plataforma: "pwa" };

export function definirRecursos(o = {}) {
  Object.assign(G.__stub110i1Recursos, { isPagamentoNativoAtivo: false, plataforma: "pwa" }, o);
}

export function useRecursosApp() {
  const s = G.__stub110i1Recursos;
  return {
    isLeilaoAtivo: s.plataforma !== "pwa",
    isPagamentoNativoAtivo: s.isPagamentoNativoAtivo === true,
    plataforma: s.plataforma,
    isProgramadaSenhasAtiva: true,
    isTorneioVisivel: true,
    isSenhaBonusAtiva: true,
    isCampanhaIndicacaoAtiva: false,
    limitePassesIndicacao: 5,
    isLoading: false,
  };
}

export default { useRecursosApp };
