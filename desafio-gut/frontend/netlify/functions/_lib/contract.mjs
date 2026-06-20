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

import { Contract, JsonRpcProvider } from "ethers";
import {
  resolverChaveCoordenacao,
  obterSignerCoordenacao,
  backendAssinatura,
  getCoordenacaoAddressCache,
} from "./signer.mjs";

const ABI = [
  "function adicionarSenhas(address usuario, uint256 quantidade) public",
  "function saldoSenhas(address) public view returns (uint256)",
  "function coordenacao() public view returns (address)",
  "event SenhasCreditadas(address indexed usuario, uint256 quantidade)",
  // Evento emitido por darLance(idEdicao, valorEmCentavos) — usado pelo
  // monitor-onchain.mjs para detectar padrões anômalos (Mega Comando 3 / Item 4).
  "event LanceDado(string idEdicao, address indexed lancador, uint256 valorEmCentavos, bool repetido, uint256 timestamp)",
  // ── MC28.1: blindagem de privacidade (Compromisso Cego A2) ─────────────────
  "function comprometerLance(string idEdicao, address lancador, bytes32 hashLance) public",
  "function consolidarResultado(string idEdicao, address vencedor, uint256 menorUnico) public",
  "function edicaoNonce(string) view returns (uint256)",
  "function resultados(string) view returns (uint256 menorUnico, address vencedor, bool consolidado)",
  "event LanceComprometido(string idEdicao, address indexed lancador, bytes32 hashLance)",
  "event ResultadoConsolidado(string idEdicao, address indexed vencedor, uint256 menorUnico, uint256 nonce)",
];

// MC17.5.1 — resolução ROBUSTA do contrato. Aceita a variável de backend
// (CONTRATO_SEPOLIA) e, como fallback, a do frontend (VITE_CONTRATO_SEPOLIA),
// garantindo que o backend NUNCA credita num contrato diferente do que a UI lê
// o saldo. Só recorre ao endereço fixo quando NENHUMA env existe. Aditivo e
// zero-regressão: com CONTRATO_SEPOLIA definido, o comportamento é idêntico.
const _CONTRATO_FONTE =
  process.env.CONTRATO_SEPOLIA       ? "CONTRATO_SEPOLIA" :
  process.env.VITE_CONTRATO_SEPOLIA  ? "VITE_CONTRATO_SEPOLIA" : "fallback-hardcoded";
export const CONTRATO_ADDRESS =
  process.env.CONTRATO_SEPOLIA ||
  process.env.VITE_CONTRATO_SEPOLIA ||
  "0x273Ef96f5be04601FD39DAcDFB039d6fB552445e";

let _instancePromise;    // cache do { provider, signer, contract } resolvido
let _coordenacaoCache;   // cache do `coordenacao()` para evitar RPC em todo confirm
let _coordWalletAddress = null; // endereço público (sync para getCoordenacaoAddress)

function ensureEnv() {
  if (!process.env.RPC_URL) throw new Error("RPC_URL não configurado");
  // A chave bruta só é exigida no backend 'local-key' (testnet/dev). No backend
  // 'biconomy' (mainnet) o owner vive no KMS e NÃO está no env (MC30.1/MC30.2.1).
  if (backendAssinatura() === "local-key" && !resolverChaveCoordenacao()) {
    throw new Error("COORDENACAO_PRIVATE_KEY não configurado");
  }
}

// MC30.1 — a assinatura é delegada ao módulo central _lib/signer.mjs, que
// seleciona o backend (local-key | biconomy). getInstance passa a ser async
// porque o backend Biconomy resolve o signer via Smart Account (owner KMS).
async function getInstance() {
  if (_instancePromise) return _instancePromise;
  ensureEnv();
  _instancePromise = (async () => {
    const { provider, signer, address } = await obterSignerCoordenacao(process.env.RPC_URL);
    _coordWalletAddress = address;
    const contract = new Contract(CONTRATO_ADDRESS, ABI, signer);
    // [LOG] — revela contrato/backend resolvidos (NUNCA loga a chave/segredo).
    console.log("[MC30.1] contract.getInstance", {
      contrato: CONTRATO_ADDRESS,
      fonteContrato: _CONTRATO_FONTE,
      backend: backendAssinatura(),
      temRpc: !!process.env.RPC_URL,
    });
    return { provider, signer, contract, address };
  })().catch((err) => { _instancePromise = undefined; throw err; });
  return _instancePromise;
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
  const { contract, address } = await getInstance();
  if (_coordenacaoCache) return _coordenacaoCache === address.toLowerCase();
  const coord = (await contract.coordenacao()).toLowerCase();
  _coordenacaoCache = coord;
  return coord === address.toLowerCase();
}

/**
 * Chama adicionarSenhas(endereco, qtd) on-chain. Aguarda 1 confirmação.
 * Lança se a tx reverter (ex: wallet não é coordenacao).
 *
 * @returns {{ txHash: string, blockNumber: number, gasUsed: bigint }}
 */
export async function creditarSenhas(endereco, qtd) {
  const { contract, address } = await getInstance();
  if (!(await verificarCoordenacao())) {
    throw new Error(`wallet ${address} não é coordenacao do contrato ${CONTRATO_ADDRESS}`);
  }
  const tx = await contract.adicionarSenhas(endereco, qtd);
  const receipt = await tx.wait(1);
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}

/**
 * Endereço da coordenacao (apenas leitura, não retorna a privkey). Síncrono:
 * devolve o endereço em cache resolvido na última assinatura (ou null se ainda
 * não houve nenhuma). Em _lib/credito.mjs é chamado após `creditarSenhas`, que
 * já resolveu o signer — logo o cache está preenchido.
 */
export function getCoordenacaoAddress() {
  return _coordWalletAddress || getCoordenacaoAddressCache();
}

/**
 * Lê eventos LanceDado do contrato em um intervalo de blocos.
 * Usa o provider read-only — não exige COORDENACAO_PRIVATE_KEY.
 *
 * @param {number|"latest"} fromBlock
 * @param {number|"latest"} toBlock
 * @returns {Promise<Array<{lancador: string, valor: number, repetido: boolean, idEdicao: string, blockNumber: number, txHash: string, timestamp: number}>>}
 */
export async function getLanceDadoEvents(fromBlock, toBlock = "latest") {
  const ro = getReadOnlyContract();
  const filter = ro.filters.LanceDado();
  const logs = await ro.queryFilter(filter, fromBlock, toBlock);
  return logs.map((log) => {
    const args = log.args || [];
    return {
      idEdicao:    String(args[0] ?? ""),
      lancador:    String(args[1] ?? "").toLowerCase(),
      valor:       Number(args[2] ?? 0),
      repetido:    Boolean(args[3]),
      timestamp:   Number(args[4] ?? 0),
      blockNumber: log.blockNumber,
      txHash:      log.transactionHash,
    };
  });
}

/** Obtém o bloco atual via provider read-only. */
export async function getBlocoAtual() {
  ensureEnv();
  const provider = new JsonRpcProvider(process.env.RPC_URL);
  return await provider.getBlockNumber();
}

// ── MC28.1: blindagem de privacidade (Compromisso Cego A2) ───────────────────

/**
 * Submete o compromisso cego on-chain em nome do participante (Abordagem A2).
 * A coordenação (relayer) assina; o hash aponta para o endereço real `lancador`.
 * @returns {{ txHash: string, blockNumber: number }}
 */
export async function comprometerLanceOnchain(idEdicao, lancador, hashLance) {
  const { contract } = await getInstance();
  const tx = await contract.comprometerLance(idEdicao, lancador, hashLance);
  const receipt = await tx.wait(1);
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/** Lê o nonce atual da edição (domínio EIP-712 + anti-replay da consolidação). */
export async function lerEdicaoNonce(idEdicao) {
  const ro = getReadOnlyContract();
  return Number(await ro.edicaoNonce(idEdicao));
}
