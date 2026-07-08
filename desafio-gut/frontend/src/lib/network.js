// MC59.2 (B-4) — Fonte ÚNICA de configuração de rede/contrato/explorer do frontend.
//
// Derivada de env (Vite `import.meta.env`). Objetivo: eliminar literais de rede
// espalhados (chainId, endereço de contrato, URL do explorer) e o fallback
// perigoso para um contrato ANTIGO. Assim, o flip para mainnet passa a ser uma
// mudança de ENV (operador), não de código.
//
// Decisões (MC59.2, escopo "só centralizar config"):
//   • CONTRATO: SEM fallback hardcoded. Se `VITE_CONTRATO_SEPOLIA` faltar,
//     CONTRATO fica "" e os call-sites falham ALTO (em vez de apontar em silêncio
//     para um contrato abandonado). O endereço implantado continua no env do
//     operador — este módulo não o altera.
//   • CHAIN_ID / EXPLORER: default Sepolia, sobrescrevíveis por env
//     (`VITE_CHAIN_ID`, `VITE_EXPLORER_URL`) para o flip de mainnet.

const env = import.meta.env ?? {};

/** Endereço do contrato ativo. "" (vazio) se a env não estiver configurada. */
export const CONTRATO = String(env.VITE_CONTRATO_SEPOLIA ?? env.VITE_CONTRATO ?? "").trim();

/** chainId decimal — default Sepolia (11155111); sobrescrevível por VITE_CHAIN_ID. */
export const CHAIN_ID_DEC = (() => {
  const n = Number(env.VITE_CHAIN_ID ?? 11155111);
  return Number.isFinite(n) && n > 0 ? n : 11155111;
})();

/** chainId hexadecimal (ex.: "0xaa36a7"), derivado de CHAIN_ID_DEC. */
export const CHAIN_ID_HEX = "0x" + CHAIN_ID_DEC.toString(16);

/** Base do explorer — default Sepolia; sobrescrevível por VITE_EXPLORER_URL. */
export const EXPLORER_URL = String(env.VITE_EXPLORER_URL ?? "https://sepolia.etherscan.io").replace(/\/+$/, "");

export const explorerTx = (hash) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerAddress = (addr) => `${EXPLORER_URL}/address/${addr}`;
