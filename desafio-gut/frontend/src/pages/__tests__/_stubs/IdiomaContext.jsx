// _stubs/IdiomaContext.jsx — MC94. Duplo do IdiomaContext para testar a página.
// O original não exporta o objecto de contexto e `useIdioma()` lança sem
// provider. O duplo devolve o FALLBACK de cada chamada, que é exactamente o que
// o utilizador vê em PT — logo os testes afirmam sobre o texto real.
export function useT() {
  return (_chave, fallback) => fallback;
}
export function useIdioma() {
  return { lang: "pt", setLang: () => {}, t: (_k, f) => f, SUPPORTED: ["pt"] };
}
export function IdiomaProvider({ children }) { return children ?? null; }
export default { useT, useIdioma, IdiomaProvider };
