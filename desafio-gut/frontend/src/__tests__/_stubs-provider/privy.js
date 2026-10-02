// _stubs-provider/privy.js — UTAC000.15 (DEBT-010). Duplo MÍNIMO de `@privy-io/react-auth`.
//
// Só o que o `AppProvider` usa (`AppContext.jsx` l. 444-446): `usePrivy()` → `{ ready, authenticated,
// user, login, logout }` e `useWallets()` → `{ wallets }`. Estado = visitante NÃO autenticado e SDK
// pronto (o caso de quem abre o app sem sessão). Nada de rede, nada de browser, nenhum pacote novo.
// ⚠️ Fidelidade declarada: o SDK real tem mais campos e estados transitórios (ready=false no arranque,
// login a meio); o vencedor exposto pelo Provider NÃO depende de nenhum deles.
const chamadas = { login: 0, logout: 0 };
export const usePrivy = () => ({
  ready: true,
  authenticated: false,
  user: null,
  login: () => { chamadas.login += 1; },
  logout: async () => { chamadas.logout += 1; },
});
export const useWallets = () => ({ wallets: [], ready: true });
export const chamadasPrivy = () => ({ ...chamadas });
