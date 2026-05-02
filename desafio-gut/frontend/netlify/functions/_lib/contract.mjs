// Wrapper ethers para a coordenação chamar `adicionarSenhas` on-chain.
//
// Pré-requisitos (process.env):
//   - RPC_URL                  → Alchemy/Infura Sepolia
//   - COORDENACAO_PRIVATE_KEY  → chave privada da wallet `coordenacao` no contrato
//   - CONTRATO_SEPOLIA         → opcional; default abaixo
//
// Importante (segurança):
//   - PRIVATE_KEY NUNCA é exposta no bundle frontend (esse arquivo só é
//     importado por functions, que rodam em Lambda).
//   - Erros são logados com .message, NÃO com `err` cru — alguns providers
//     incluem o RPC URL completo em err.info, e queremos minimizar superfície.

import { Contract, JsonRpcProvider, Wallet } from "ethers";

const ABI = [
  "function adicionarSenhas(address usuario, uint256 quantidade) public",
  "function saldoSenhas(address) public view returns (uint256)",
  "function coordenacao() public view returns (address)",
  "event SenhasCreditadas(address indexed usuario, uint256 quantidade)",
];

export const CONTRATO_ADDRESS =
  process.env.CONTRATO_SEPOLIA ||
  "0x273Ef96f5be04601FD39DAcDFB039d6fB552445e";

let _provider;
let _wallet;
let _contract;
let _coordenacaoCache;   // cache do `coordenacao()` para evitar RPC em todo confirm

function ensureEnv() {
  if (!process.env.RPC_URL) throw new Error("RPC_URL não configurado");
  if (!process.env.COORDENACAO_PRIVATE_KEY) throw new Error("COORDENACAO_PRIVATE_KEY não configurado");
}

function getInstance() {
  if (_contract) return { provider: _provider, wallet: _wallet, contract: _contract };
  ensureEnv();
  _provider = new JsonRpcProvider(process.env.RPC_URL);
  _wallet   = new Wallet(process.env.COORDENACAO_PRIVATE_KEY, _provider);
  _contract = new Contract(CONTRATO_ADDRESS, ABI, _wallet);
  return { provider: _provider, wallet: _wallet, contract: _contract };
}

// Provider read-only (sem signer) — usado para leituras que não exigem privkey.
function getReadOnlyContract() {
  ensureEnv();
  const provider = new JsonRpcProvider(process.env.RPC_URL);
  return new Contract(CONTRATO_ADDRESS, ABI, provider);
}

/** Lê saldoSenhas[endereco] on-chain. Retorna Number (cabe em MAX_SAFE_INTEGER). */
export async function lerSaldoSenhas(endereco) {
  const ro = getReadOnlyContract();
  const raw = await ro.saldoSenhas(endereco);
  return Number(raw);
}

/** Sanity: confirma que a wallet configurada == coordenacao() do contrato. */
export async function verificarCoordenacao() {
  const { contract, wallet } = getInstance();
  if (_coordenacaoCache) return _coordenacaoCache === wallet.address.toLowerCase();
  const coord = (await contract.coordenacao()).toLowerCase();
  _coordenacaoCache = coord;
  return coord === wallet.address.toLowerCase();
}

/**
 * Chama adicionarSenhas(endereco, qtd) on-chain. Aguarda 1 confirmação.
 * Lança se a tx reverter (ex: wallet não é coordenacao).
 *
 * @returns {{ txHash: string, blockNumber: number, gasUsed: bigint }}
 */
export async function creditarSenhas(endereco, qtd) {
  const { contract } = getInstance();
  if (!(await verificarCoordenacao())) {
    const { wallet } = getInstance();
    throw new Error(`wallet ${wallet.address} não é coordenacao do contrato ${CONTRATO_ADDRESS}`);
  }
  const tx = await contract.adicionarSenhas(endereco, qtd);
  const receipt = await tx.wait(1);
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}

/** Endereço da coordenacao (apenas leitura, não retorna a privkey). */
export function getCoordenacaoAddress() {
  const { wallet } = getInstance();
  return wallet.address;
}
