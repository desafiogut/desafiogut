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
  // Evento emitido por darLance(idEdicao, valorEmCentavos) — usado pelo
  // monitor-onchain.mjs para detectar padrões anômalos (Mega Comando 3 / Item 4).
  "event LanceDado(string idEdicao, address indexed lancador, uint256 valorEmCentavos, bool repetido, uint256 timestamp)",
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

let _provider;
let _wallet;
let _contract;
let _coordenacaoCache;   // cache do `coordenacao()` para evitar RPC em todo confirm

// MC17.5.1 — aceita o nome canónico COORDENACAO_PRIVATE_KEY e, como fallback,
// COORDENACAO_PRIVATE (variante sem o sufixo _KEY usada nalguns ambientes).
// Aditivo: se a chave canónica existir, é a usada (zero-regressão).
function resolverChaveCoordenacao() {
  return process.env.COORDENACAO_PRIVATE_KEY || process.env.COORDENACAO_PRIVATE || null;
}

function ensureEnv() {
  if (!process.env.RPC_URL) throw new Error("RPC_URL não configurado");
  if (!resolverChaveCoordenacao()) throw new Error("COORDENACAO_PRIVATE_KEY não configurado");
}

function getInstance() {
  if (_contract) return { provider: _provider, wallet: _wallet, contract: _contract };
  ensureEnv();
  _provider = new JsonRpcProvider(process.env.RPC_URL);
  _wallet   = new Wallet(resolverChaveCoordenacao(), _provider);
  _contract = new Contract(CONTRATO_ADDRESS, ABI, _wallet);
  // MC17.5.1 [LOG TEMPORÁRIO] — revela o contrato/chave resolvidos para
  // diagnosticar desalinhamento de ambiente (NUNCA loga o valor da chave).
  console.log("[MC17.5.1] contract.getInstance", {
    contrato: CONTRATO_ADDRESS,
    fonteContrato: _CONTRATO_FONTE,
    chaveCoordenacao: process.env.COORDENACAO_PRIVATE_KEY ? "COORDENACAO_PRIVATE_KEY"
      : process.env.COORDENACAO_PRIVATE ? "COORDENACAO_PRIVATE" : "ausente",
    temRpc: !!process.env.RPC_URL,
  });
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
