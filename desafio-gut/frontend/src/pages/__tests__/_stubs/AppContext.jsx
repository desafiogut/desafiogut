// _stubs/AppContext.jsx — MC94. Duplo do AppContext, só para testar a página.
//
// PORQUÊ UM DUPLO, E PORQUÊ ELE É MAGRO
// `useAppContext` LANÇA sem `<AppProvider>` (`AppContext.jsx:138`), e o provider
// real faz I/O: Privy, Blobs, on-chain, notificações. Renderizar a página com o
// provider verdadeiro seria testar a rede, não a tela.
// O duplo é injectado por `resolve.alias` do Vite no arnês de teste — **nenhum
// ficheiro do projeto é alterado** para isto funcionar.
//
// ⚠️ LIÇÃO QUE O PROJETO JÁ PAGOU (MC93-B/C/D): um duplo que aceita mais do que o
// original esconde o defeito que devia apanhar. Por isso este duplo:
//   • devolve EXACTAMENTE as chaves que `MeusAtivos.jsx` desestrutura, nem mais;
//   • e `useAppContext()` LANÇA se o teste se esquecer de definir os valores,
//     como o original lança sem provider.

let valores = null;

/** Define o que `useAppContext()` vai devolver no próximo render. */
export function definirContexto(v) {
  valores = v;
}

export function useAppContext() {
  if (!valores) {
    throw new Error(
      "duplo do AppContext usado sem `definirContexto()` — "
      + "o original também lança fora do provider",
    );
  }
  return valores;
}

/** Presente só para o caso de algum import o procurar. */
export function AppProvider({ children }) {
  return children ?? null;
}

export function useAppTimer() {
  return { segundosRestantes: 0, prazo: null };
}

export default { useAppContext, AppProvider, definirContexto };
