// _stubs/useRecursosApp.js — UTAC000.10. Duplo do hook de recursos para o teste da PÁGINA.
//
// PORQUE: `MercadoLances.jsx` só chega ao overlay do vencedor depois de passar dois gates —
// `if (recursosCarregando) return <MercadoSkeleton/>` e `if (!isLeilaoAtivo) return
// <MercadoConformidade/>`. O hook real começa em `isLoading: true` e só resolve com I/O
// (`/.netlify/functions/recursos-app`), que em SSR NÃO corre (não há efeitos) → a página ficaria
// permanentemente no esqueleto e o overlay nunca seria alcançável.
//
// ⚠️ FIDELIDADE (lição MC93-B/C/D: um duplo que aceita mais do que o original esconde defeitos):
// devolve EXACTAMENTE as mesmas chaves que o real (`useRecursosApp.js` l.141-146 e
// `DEFAULT_FLAGS_TRANSICAO`), nem uma a mais. O único valor que difere é o `isLoading` — que é
// o ponto do duplo, declarado aqui.

export function useRecursosApp() {
  return {
    isLeilaoAtivo: true,
    isPagamentoNativoAtivo: false,
    plataforma: "pwa",
    isProgramadaSenhasAtiva: false,
    isTorneioVisivel: false,
    isSenhaBonusAtiva: false,
    isCampanhaIndicacaoAtiva: false,
    limitePassesIndicacao: 0,
    isLoading: false, // ← o ponto do duplo (o real arranca a `true` e resolve por I/O)
  };
}

export default { useRecursosApp };
