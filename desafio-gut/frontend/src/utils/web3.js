import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { argon2id } from "hash-wasm";
import { getFichasProgramadas } from "./saldoInterno.js";

// ─── ABI mínimo do contrato LeilaoGUT ───────────────────────────────────────
export const ABI = [
  "function darLance(string idEdicao, uint256 valorEmCentavos) public",
  "function apurarVencedor(string idEdicao) public view returns (uint256, address)",
  "function saldoSenhas(address) public view returns (uint256)",
  "function coordenacao() public view returns (address)",
  "function abrirEdicao(string idEdicao, string nome, uint256 duracaoSegundos) public",
  "function edicoes(string) view returns (string nome, bool ativa, uint256 prazo)",
];

export const CONTRATO_SEPOLIA =
  import.meta.env.VITE_CONTRATO_SEPOLIA ?? "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

/**
 * Retorna um ethers BrowserProvider + Signer a partir de qualquer
 * provider EIP-1193 (Privy embedded wallet, MetaMask, etc.).
 */
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

async function ensureSepolia() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === SEPOLIA_CHAIN_ID) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (err) {
    if (err.code === 4902) {
      throw new Error(
        "Rede Sepolia não encontrada na carteira. Adicione-a manualmente (chainId 11155111)."
      );
    }
    throw new Error(
      "Troca de rede recusada. Mude para Ethereum Sepolia (chainId 11155111) para continuar."
    );
  }

  // Confirma que a troca foi efetivada
  const newChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (newChainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      "Rede incorreta após troca. Selecione Sepolia (chainId 11155111) manualmente na carteira."
    );
  }
}

export async function connectMetaMask() {
  if (!window.ethereum) throw new Error("MetaMask não encontrada. Instale em metamask.io.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureSepolia();
  return accounts[0] ?? null;
}

export async function getSignerFromProvider(walletProvider) {
  const raw = walletProvider ?? window.ethereum;
  if (!raw) throw new Error("Carteira não encontrada. Faça login para continuar.");
  const provider = new BrowserProvider(raw);
  const signer = await provider.getSigner();
  return { provider, signer };
}

/**
 * Gera hash Argon2id do lance para fins de auditoria/log off-chain.
 * Prova de intenção imutável — não substitui verificação on-chain.
 */
export async function hashLance(address, idEdicao, valorEmCentavos) {
  const payload = `${address.toLowerCase()}:${idEdicao}:${valorEmCentavos}:${Date.now()}`;
  const hash = await argon2id({
    password: payload,
    salt: address.slice(2, 18),   // 16 bytes do endereço como salt
    parallelism: 1,
    iterations: 2,
    memorySize: 512,              // 512 KB — leve para browser
    hashLength: 32,
    outputType: "hex",
  });
  return hash;
}

/**
 * Assina uma mensagem humanamente legível com a carteira conectada (EIP-191).
 * Abre notificação no telemóvel quando conectado via WalletConnect.
 */
export async function assinarLance(signer, idEdicao, valorEmCentavos) {
  const mensagem = [
    "DESAFIOGUT — Confirmação de Lance",
    `Edição: ${idEdicao}`,
    `Valor: R$ ${(valorEmCentavos / 100).toFixed(2)}`,
    `Data: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "Ao assinar, confirmo que li e aceito o regulamento DESAFIOGUT.",
  ].join("\n");

  const assinatura = await signer.signMessage(mensagem);
  return { mensagem, assinatura };
}

/**
 * Lê o prazo (timestamp Unix) da edição diretamente da blockchain Sepolia.
 * Usa window.ethereum se disponível, ou JsonRpcProvider público como fallback.
 * Retorna null em caso de erro (UI usa localStorage como fallback).
 */
const ALCHEMY_RPC =
  import.meta.env.VITE_ALCHEMY_URL ||
  "https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B";

export async function getEdicaoPrazo(idEdicao) {
  try {
    // Privy embedded wallet não injeta window.ethereum; usa Alchemy como fallback
    const provider = window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(ALCHEMY_RPC);
    const contrato = new Contract(CONTRATO_SEPOLIA, ABI, provider);
    const result = await contrato.edicoes(idEdicao);
    const prazo = Number(result[2]); // index 2 = uint256 prazo
    return prazo > 0 ? prazo : null;
  } catch {
    return null;
  }
}

/**
 * Consulta fichas do usuário.
 * Beta: lê do localStorage via saldoInterno — sem chamada on-chain.
 */
export function consultarSaldo(_walletProvider, _contratoEndereco, _address) {
  return Promise.resolve(getFichasProgramadas());
}

/**
 * Registra um lance localmente (Beta).
 * Substitui enviarLance on-chain — gera receipt com hash sintético.
 */
export async function enviarLance(_signer, _contratoEndereco, _idEdicao, _valorEmCentavos) {
  await new Promise((r) => setTimeout(r, 420)); // latência realista
  const hash =
    "0xBETA" +
    Date.now().toString(16).toUpperCase() +
    Math.random().toString(16).slice(2, 10).toUpperCase();
  return { hash };
}
