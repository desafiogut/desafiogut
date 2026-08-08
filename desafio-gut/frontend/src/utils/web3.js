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
  "event LanceDado(string idEdicao, address indexed lancador, uint256 valorEmCentavos, bool repetido, uint256 timestamp)",
  "event EdicaoAberta(string idEdicao, string nome, uint256 prazo)",
  "event SenhasCreditadas(address indexed usuario, uint256 quantidade)",
  // ── MC28.1: blindagem de privacidade (Compromisso Cego A2) — aditivo ───────
  // darLance permanece para o legado Sepolia/localhost (R9). Estas entradas
  // expõem só leitura/eventos da nova camada; o commit on-chain é feito pelo
  // backend (coordenação), nunca pelo utilizador.
  "function resultados(string) view returns (uint256 menorUnico, address vencedor, bool consolidado)",
  "function edicaoNonce(string) view returns (uint256)",
  "event LanceComprometido(string idEdicao, address indexed lancador, bytes32 hashLance)",
  "event ResultadoConsolidado(string idEdicao, address indexed vencedor, uint256 menorUnico, uint256 nonce)",
];

// MC59.2 (B-4) — contrato e chainId vêm da config central (sem fallback antigo).
import { CONTRATO as CONTRATO_SEPOLIA, CHAIN_ID_HEX } from "@/lib/network.js";
export { CONTRATO_SEPOLIA };

/**
 * Retorna um ethers BrowserProvider + Signer a partir de qualquer
 * provider EIP-1193 (Privy embedded wallet, MetaMask, etc.).
 */
const SEPOLIA_CHAIN_ID = CHAIN_ID_HEX; // MC59.2 (B-4): da config (default 0xaa36a7)

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
        "Rede Sepolia não encontrada na carteira. Adicione-a manualmente (chainId 11155111).",
        { cause: err }
      );
    }
    throw new Error(
      "Troca de rede recusada. Mude para Ethereum Sepolia (chainId 11155111) para continuar.",
        { cause: err }
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

// MC88.31 (Achado 1 do MC88.30) — provider único e partilhado.
// Antes: cada função criava `new JsonRpcProvider`, cada um com deteção de rede
// própria e sondagem de 4s por omissão do ethers → 61 pedidos RPC/min com o app
// PARADO. Agora: uma instância, rede estática (sem eth_chainId a cada provider)
// e sondagem de 15s.
// ATENÇÃO: por ser partilhado, NENHUM consumidor pode chamar provider.destroy().
// MC88.34 (P2) — contrato de LEITURA partilhado.
// O MC88.33 mediu 15 pedidos RPC/min em repouso. A causa não é a cadência (já
// são 15 s desde o MC88.31) mas o NÚMERO DE FILTROS: cada `new Contract` tem o
// seu próprio ciclo de sondagem, e havia dois a ouvir `LanceDado`
// (subscribeLanceDado e subscribeSaldoSenhas) mais um `SenhasCreditadas` = 3
// ciclos. Partilhando UMA instância, vários listeners do MESMO evento passam a
// custar UM só filtro → 3 ciclos passam a 2.
//
// Preferiu-se isto a subir o pollingInterval para 30 s: o listener é o que
// avisa o utilizador de que as senhas foram creditadas depois de um PIX, e
// dobrar a latência aí agravaria uma queixa já conhecida (MC88.15).
let _contratoLeitura = null;
function getContratoLeitura() {
  if (!_contratoLeitura) {
    _contratoLeitura = new Contract(CONTRATO_SEPOLIA, ABI, getProvider());
  }
  return _contratoLeitura;
}

let _provider = null;
export function getProvider() {
  if (!_provider) {
    _provider = new JsonRpcProvider(ALCHEMY_RPC, undefined, {
      staticNetwork: true,
      pollingInterval: 15_000,
    });
    _provider.pollingInterval = 15_000; // reforço: propriedade de AbstractProvider
  }
  return _provider;
}

/**
 * MC59.6 — lê o receipt de uma tx e classifica para o polling de crédito
 * assíncrono (resposta 202). Read-only via Alchemy; não exige carteira.
 * @returns {Promise<"confirmado"|"revertido"|"pendente">}
 */
export async function verificarCreditoOnchain(txHash) {
  if (!txHash) return "pendente";
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return "pendente";               // ainda não minerou
  return Number(receipt.status) === 1 ? "confirmado" : "revertido";
}

export async function getEdicaoPrazo(idEdicao) {
  try {
    // Privy embedded wallet não injeta window.ethereum; usa Alchemy como fallback
    const provider = window.ethereum
      ? new BrowserProvider(window.ethereum)
      : getProvider();
    const contrato = new Contract(CONTRATO_SEPOLIA, ABI, provider);
    const result = await contrato.edicoes(idEdicao);
    const prazo = Number(result[2]); // index 2 = uint256 prazo
    return prazo > 0 ? prazo : null;
  } catch {
    return null;
  }
}

/**
 * Submete um lance on-chain chamando darLance(idEdicao, valorEmCentavos).
 * Aguarda 1 confirmação e retorna { hash, blockNumber } do receipt real.
 *
 * Pré-condições no contrato:
 *  - signer.address precisa ter saldoSenhas > 0
 *  - edicao precisa estar ativa (abrirEdicao chamado pela coordenacao)
 *  - block.timestamp <= edicao.prazo
 */
export async function enviarLance(signer, contratoEndereco, idEdicao, valorEmCentavos) {
  if (!signer)            throw new Error("Signer ausente — faça login antes de lançar.");
  if (!contratoEndereco)  throw new Error("Endereço do contrato não configurado (VITE_CONTRATO_SEPOLIA).");

  const contrato = new Contract(contratoEndereco, ABI, signer);
  const tx       = await contrato.darLance(idEdicao, valorEmCentavos);
  const receipt  = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Inscreve um listener para o evento LanceDado da edição informada.
 * Usa JsonRpcProvider Alchemy (polling) — funciona mesmo quando o usuário
 * não está autenticado (qualquer visitante vê lances entrando em tempo real).
 *
 * Retorna função de unsubscribe — chamar no cleanup do useEffect.
 */
export function subscribeLanceDado(idEdicao, onLance) {
  const contrato = getContratoLeitura();   // MC88.34 (P2) — filtro partilhado

  const handler = (eventoIdEdicao, lancador, valorEmCentavos, repetido, timestamp, ev) => {
    if (eventoIdEdicao !== idEdicao) return; // filtra outras edições
    onLance({
      endereco:   lancador,
      valor:      Number(valorEmCentavos),
      repetido:   Boolean(repetido),
      timestamp:  Number(timestamp),
      txHash:     ev?.log?.transactionHash ?? null,
      blockNumber: ev?.log?.blockNumber ?? null,
    });
  };

  contrato.on("LanceDado", handler);

  return () => {
    try { contrato.off("LanceDado", handler); } catch {}
    // MC88.31 — NÃO destruir: o provider é partilhado (getProvider). Remover os
    // listeners basta; destruí-lo derrubava todos os outros consumidores.
  };
}

/**
 * Lê saldoSenhas(address) on-chain via JsonRpcProvider Alchemy.
 * Fonte de verdade do gate de darLance.
 *
 * Lança em caso de RPC down / address inválido — caller decide degradação.
 * Retorna Number — saldoSenhas é uint256 mas valores reais ficam em
 * dezenas/centenas (1 senha = R$ 2,00); cabe em Number.MAX_SAFE_INTEGER.
 */
export async function getSaldoSenhasOnChain(address) {
  if (!address) throw new Error("address obrigatório para ler saldoSenhas");
  const contrato = getContratoLeitura();   // MC88.34 (P2) — leitura, sem filtro novo
  const raw = await contrato.saldoSenhas(address);
  return Number(raw);
}

/**
 * Inscreve listeners para os dois eventos que mudam saldoSenhas[address]:
 *  - SenhasCreditadas(usuario, quantidade)  → coordenacao creditou
 *  - LanceDado(idEdicao, lancador, ...)     → usuário gastou 1 senha
 *
 * Chama onUpdate({ kind, txHash, blockNumber, [quantidade] }) — o caller
 * deve refazer fetch via getSaldoSenhasOnChain (refetch é robusto contra
 * eventos perdidos/duplicados; somar quantidade derivava do estado prévio
 * e drift acumulava em reconexões).
 *
 * Filtragem por address é feita handler-side (consistente com
 * subscribeLanceDado, e mais à prova de variações do filter API entre
 * versões de ethers).
 *
 * Retorna função de unsubscribe — chamar no cleanup do useEffect.
 */
export function subscribeSaldoSenhas(address, onUpdate) {
  if (!address) throw new Error("address obrigatório para subscribe");
  const contrato = getContratoLeitura();   // MC88.34 (P2) — filtro partilhado
  const target   = String(address).toLowerCase();

  const onCreditadas = (usuario, quantidade, ev) => {
    if (String(usuario).toLowerCase() !== target) return;
    onUpdate({
      kind:        "SenhasCreditadas",
      quantidade:  Number(quantidade),
      txHash:      ev?.log?.transactionHash ?? null,
      blockNumber: ev?.log?.blockNumber ?? null,
    });
  };
  const onLance = (idEdicao, lancador, valorEmCentavos, repetido, timestamp, ev) => {
    if (String(lancador).toLowerCase() !== target) return;
    onUpdate({
      kind:        "LanceDado",
      txHash:      ev?.log?.transactionHash ?? null,
      blockNumber: ev?.log?.blockNumber ?? null,
    });
  };

  contrato.on("SenhasCreditadas", onCreditadas);
  contrato.on("LanceDado", onLance);

  return () => {
    try { contrato.off("SenhasCreditadas", onCreditadas); } catch {}
    try { contrato.off("LanceDado", onLance); } catch {}
    // MC88.31 — NÃO destruir: provider partilhado (ver subscribeLanceDado).
  };
}
