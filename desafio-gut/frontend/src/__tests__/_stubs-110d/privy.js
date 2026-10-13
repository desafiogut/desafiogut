// _stubs-110d/privy.js — UTAC110d-front. Duplo de `@privy-io/react-auth` para o CardLance REAL.
//
// O CardLance só usa `useWallets()` (a carteira embedded para assinar a mensagem de auth do lance
// Relâmpago). Este duplo tem UMA carteira Privy com as 2 chamadas que o fluxo faz
// (`switchChain`, `getEthereumProvider`) — sem rede, sem browser. A assinatura sai do duplo de
// `web3` (`getSignerFromProvider`).
const carteira = Object.freeze({
  walletClientType: "privy",
  switchChain: async () => {},
  getEthereumProvider: async () => ({}),
});
export const useWallets = () => ({ wallets: [carteira], ready: true });
export const usePrivy = () => ({ ready: true, authenticated: true, user: null, login: () => {}, logout: async () => {} });
