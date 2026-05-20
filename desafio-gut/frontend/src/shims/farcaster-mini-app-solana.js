// MC11.16 — Shim para a dep opcional `@farcaster/mini-app-solana` que o
// Privy SDK referencia mas não está (nem precisa estar) instalada neste
// projeto, que só usa wallet embedded EVM (Sepolia). Sem este shim, o
// bundle contém um `throw Error(...)` que pode disparar em runtime se
// algum caminho do Privy fizer import dinâmico do adapter Farcaster Solana.
// Ref: docs.privy.io/troubleshooting/vite

const noop = () => {};
export const FarcasterSolanaProvider = () => null;
export const useFarcasterSolanaWallet = () => ({
  wallet: null,
  connect: noop,
  disconnect: noop,
});
export default {};
