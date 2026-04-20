import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { argon2id } from "hash-wasm";

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
 * Envia a transação darLance() para o contrato na rede Sepolia.
 */
export async function enviarLance(signer, contratoEndereco, idEdicao, valorEmCentavos) {
  const contrato = new Contract(contratoEndereco, ABI, signer);
  const tx = await contrato.darLance(idEdicao, valorEmCentavos);
  const receipt = await tx.wait();
  return receipt;
}

/**
 * Lê o prazo (timestamp Unix) da edição diretamente da blockchain Sepolia.
 * Usa window.ethereum se disponível, ou JsonRpcProvider público como fallback.
 * Retorna null em caso de erro (UI usa localStorage como fallback).
 */
export async function getEdicaoPrazo(idEdicao) {
  try {
    // Privy embedded wallet não injeta window.ethereum; usa RPC público como fallback
    const provider = window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider("https://rpc2.sepolia.org");
    const contrato = new Contract(CONTRATO_SEPOLIA, ABI, provider);
    const result = await contrato.edicoes(idEdicao);
    const prazo = Number(result[2]); // index 2 = uint256 prazo
    return prazo > 0 ? prazo : null;
  } catch {
    return null;
  }
}

/**
 * Consulta o saldo de senhas de um endereço.
 */
export async function consultarSaldo(walletProvider, contratoEndereco, address) {
  const { provider } = await getSignerFromProvider(walletProvider);
  const contrato = new Contract(contratoEndereco, ABI, provider);
  const saldo = await contrato.saldoSenhas(address);
  return Number(saldo);
}
