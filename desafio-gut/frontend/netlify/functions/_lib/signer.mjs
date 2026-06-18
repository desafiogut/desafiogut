// _lib/signer.mjs — MÓDULO CENTRAL DE ASSINATURA DA COORDENAÇÃO (MC30.1)
//
// Antes do MC30.1 a chave privada da coordenação (COORDENACAO_PRIVATE_KEY) era
// lida e injetada num `ethers.Wallet` em TRÊS sítios independentes:
//   · _lib/contract.mjs        (adicionarSenhas, comprometerLance)
//   · consolidar-lances.mjs     (consolidarResultado + recibo EIP-712)
//   · _lib/ia-preditiva.mjs     (abrirEdicao — IA modo=auto)
//
// Este módulo unifica essa lógica num ÚNICO ponto de assinatura. Isto:
//   1) reduz a superfície de exposição da chave de 3 para 1 ficheiro;
//   2) permite trocar o BACKEND de assinatura (chave bruta ↔ OpenZeppelin
//      Defender Relay, com a chave num HSM) editando apenas este ficheiro.
//
// Seleção de backend (ITEM 3.2/3.9 do MC30.plano):
//   - SIGNER_BACKEND explícito ('defender' | 'local-key') tem precedência;
//   - caso contrário: NETWORK_STAGE === 'mainnet'  → 'defender' (HSM, sem chave bruta)
//                     restante (sepolia/localhost) → 'local-key' (chave de testnet, R3)
//
// SEGURANÇA: a chave privada NUNCA é logada nem exportada por este módulo.

import { JsonRpcProvider, Wallet } from "ethers";

/**
 * Resolve a chave privada da coordenação a partir do env. Aceita o nome canónico
 * COORDENACAO_PRIVATE_KEY e, como fallback, COORDENACAO_PRIVATE (variante legada).
 * Retorna `null` se nenhuma estiver definida. NÃO loga o valor.
 */
export function resolverChaveCoordenacao() {
  return process.env.COORDENACAO_PRIVATE_KEY || process.env.COORDENACAO_PRIVATE || null;
}

/**
 * Decide o backend de assinatura ativo.
 *   - SIGNER_BACKEND explícito ('biconomy' | 'defender' | 'local-key') tem precedência;
 *   - caso contrário: NETWORK_STAGE === 'mainnet' → 'defender' (fallback legado, R11);
 *                     restante (sepolia/localhost) → 'local-key'.
 * MC30.2.1: o ALVO de produção é 'biconomy' (ERC-4337 + owner KMS), selecionado
 * por SIGNER_BACKEND=biconomy. O default mainnet permanece 'defender' enquanto o
 * Defender for mantido como fallback (será removido no SEGMENTO 8 → default vira 'biconomy').
 * @returns {"biconomy"|"defender"|"local-key"}
 */
export function backendAssinatura() {
  const explicito = String(process.env.SIGNER_BACKEND || "").toLowerCase();
  if (explicito === "biconomy" || explicito === "defender" || explicito === "local-key") return explicito;
  return process.env.NETWORK_STAGE === "mainnet" ? "defender" : "local-key";
}

// Cache do endereço público resolvido — permite a `getCoordenacaoAddress()`
// (síncrono, em _lib/credito.mjs) responder após a primeira assinatura, sem
// depender da chave bruta nem de uma chamada async.
let _coordenacaoAddressCache = null;

/** Último endereço da coordenação resolvido por `obterSignerCoordenacao` (ou null). */
export function getCoordenacaoAddressCache() {
  return _coordenacaoAddressCache;
}

/**
 * Guarda anti-reintrodução (ITEM 3.5 / R9): em mainnet a chave privada bruta NÃO
 * pode existir no ambiente — a assinatura é feita no HSM do Defender. Se a chave
 * reaparecer (deploy acidental, rollback de env), recusamos arrancar.
 * @throws {Error} se NETWORK_STAGE==='mainnet' e uma chave bruta estiver presente.
 */
export function assertChaveBrutaAusenteEmMainnet() {
  if (process.env.NETWORK_STAGE === "mainnet" && resolverChaveCoordenacao()) {
    throw new Error(
      "MC30.1: COORDENACAO_PRIVATE_KEY presente em mainnet — a chave bruta deve " +
      "ser removida do ambiente (R9/ITEM 3.5). Use o backend Defender (HSM).",
    );
  }
}

/**
 * Cria o signer da coordenação para o backend ativo.
 *
 * @param {string} rpcUrl  URL do provider JSON-RPC (usado SÓ no backend local-key;
 *                         o Defender usa a rede configurada no próprio Relayer).
 * @returns {Promise<{ provider: object, signer: object, address: string, backend: string }>}
 *   - `signer` é compatível com ethers v6: pode ser passado a `new Contract(addr, abi, signer)`
 *     e expõe `signTypedData(domain, types, value)`.
 *   - `provider` expõe `waitForTransaction` / `getBlockNumber`.
 */
export async function obterSignerCoordenacao(rpcUrl) {
  // Guarda de runtime: em mainnet a chave bruta nunca pode estar presente.
  assertChaveBrutaAusenteEmMainnet();

  const backend = backendAssinatura();

  if (backend === "biconomy") {
    const r = await criarSignerBiconomy(rpcUrl);
    if (r.address) _coordenacaoAddressCache = r.address;
    return { ...r, backend };
  }

  if (backend === "defender") {
    const r = await criarSignerDefender();
    if (r.address) _coordenacaoAddressCache = r.address;
    return { ...r, backend };
  }

  // ── backend 'local-key' (default; testnet/dev) — comportamento legado ──────
  const chave = resolverChaveCoordenacao();
  if (!chave) throw new Error("COORDENACAO_PRIVATE_KEY não configurado");
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(chave, provider);
  _coordenacaoAddressCache = signer.address;
  return { provider, signer, address: signer.address, backend };
}

/**
 * Backend Defender (ITEM 3.2) — a chave privada da coordenação vive no HSM do
 * OpenZeppelin Defender Relayer e NUNCA entra neste processo. Assinamos/enviamos
 * via API com credenciais ESCOPADAS e REVOGÁVEIS (DEFENDER_API_KEY/SECRET).
 *
 * Usa o pacote mantido e compatível com Ethers v6 `@openzeppelin/defender-sdk`
 * (o antigo `@openzeppelin/defender-relay-client` está DEPRECATED e é da era v5).
 * Import dinâmico (lazy): em testnet/localhost este caminho nunca é tocado, pelo
 * que build, `node --check` e testes não dependem do pacote estar instalado.
 *
 * O endereço do Relayer é, por desenho, o MESMO endereço público da coordenação
 * (a autoridade on-chain é transferida para ele via o two-step do contrato —
 * ITEM 3.3). `apenasCoordenacao` continua a validar sem mudar o Leilao.sol.
 */
async function criarSignerDefender() {
  const apiKey = process.env.DEFENDER_API_KEY;
  const apiSecret = process.env.DEFENDER_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("DEFENDER_API_KEY/DEFENDER_API_SECRET não configurados");
  }

  // Import por caminho v6 do SDK (estes módulos expõem as classes ethers v6).
  const { DefenderRelayProvider } = await import(
    "@openzeppelin/defender-sdk-relay-signer-client/lib/ethers/provider.js"
  );
  const { DefenderRelaySigner } = await import(
    "@openzeppelin/defender-sdk-relay-signer-client/lib/ethers/signer.js"
  );

  const credenciais = { apiKey, apiSecret };
  const provider = new DefenderRelayProvider(credenciais);

  // Endereço do Relayer: env explícita (evita um round-trip) ou resolvido via API.
  let address = process.env.DEFENDER_RELAYER_ADDRESS || null;
  if (!address) {
    const base = await provider.getSigner();
    address = await base.getAddress();
  }

  const signer = new DefenderRelaySigner(credenciais, provider, address, {
    speed: "fast",
    ethersVersion: "v6",
  });
  return { provider, signer, address };
}

/**
 * Backend Biconomy (MC30.2.1) — ALVO de produção. A coordenação executa as
 * transações através de um Smart Account ERC-4337: o Bundler resolve nativamente
 * a concorrência de nonces (lances simultâneos) e o Paymaster subsidia o gás.
 *
 * O OWNER do Smart Account é uma chave em KMS remoto (R9/R12): a chave privada
 * bruta NUNCA entra neste processo. Import dinâmico (lazy) de @biconomy/account e
 * de ./kms-signer.mjs → testnet/local-key/defender não dependem destes pacotes,
 * e os testes mockam-nos via mock.module().
 *
 * IMPORTANTE (achado #1): o endereço on-chain passa a ser o do Smart Account
 * (≠ EOA). A autoridade da coordenação é transferida via two-step do contrato
 * (iniciar/aceitarTransferenciaCoordenacao) — Leilao.sol NÃO é alterado.
 */
async function criarSignerBiconomy(rpcUrl) {
  const bundlerUrl = process.env.BICONOMY_BUNDLER_URL;
  if (!bundlerUrl) throw new Error("BICONOMY_BUNDLER_URL não configurado");
  const paymasterUrl = process.env.BICONOMY_PAYMASTER_URL || null;
  const effectiveRpc = rpcUrl || process.env.RPC_URL;

  // Owner via KMS — a chave privada vive no KMS, fora deste processo.
  const provider = new JsonRpcProvider(effectiveRpc);
  const { criarKmsSigner } = await import("./kms-signer.mjs");
  const owner = await criarKmsSigner(provider);

  // Smart Account ERC-4337 + Bundler (+ Paymaster opcional).
  const { createSmartAccountClient, PaymasterMode } = await import("@biconomy/account");
  const smartAccount = await createSmartAccountClient({
    signer: owner,
    bundlerUrl,
    rpcUrl: effectiveRpc,
    ...(paymasterUrl ? { paymasterUrl } : {}),
    ...(process.env.BICONOMY_API_KEY ? { biconomyPaymasterApiKey: process.env.BICONOMY_API_KEY } : {}),
  });

  const address = await smartAccount.getAccountAddress();
  const payMode = paymasterUrl ? PaymasterMode.SPONSORED : null;
  const signer = await novoBiconomyAdapter(smartAccount, owner, provider, payMode);
  return { provider, signer, address };
}

// Cache do construtor do adapter. AbstractSigner é importado LAZY (igual ao
// Defender) — só o caminho 'biconomy' o puxa, mantendo os testes que mockam
// 'ethers' com exports mínimos (local-key) intactos.
let _AdapterClass = null;

/**
 * ADAPTER (achado #4): expõe o Smart Account da Biconomy como um ethers v6
 * Signer, para que a fachada e os 3 call-sites permaneçam INALTERADOS
 * (`new Contract(addr, abi, signer)` + `contract.metodo(...)` + `tx.wait()`).
 *
 * - Escritas (sendTransaction): traduzidas em UserOperation via Bundler. O `tx`
 *   devolvido expõe `hash` (hash REAL da transação, p/ provider.waitForTransaction
 *   em consolidar-lances.mjs) e `wait()` → recibo {hash, blockNumber, gasUsed}.
 * - Leituras (views como edicaoNonce/coordenacao): roteiam por `runner.provider`.
 * - signTypedData (recibo EIP-712): delegado ao owner KMS (assinatura ECDSA
 *   recuperável à EOA owner — comportamento idêntico ao MC30.1, achado #3).
 */
async function novoBiconomyAdapter(smartAccount, owner, provider, payMode) {
  if (!_AdapterClass) {
    const { AbstractSigner } = await import("ethers");
    _AdapterClass = class BiconomySmartAccountSigner extends AbstractSigner {
      #sa; #owner; #payMode;
      constructor(sa, ownerSigner, prov, mode) {
        super(prov);
        this.#sa = sa;
        this.#owner = ownerSigner;
        this.#payMode = mode;
      }

      async getAddress() {
        return await this.#sa.getAccountAddress();
      }

      connect(prov) {
        return new _AdapterClass(this.#sa, this.#owner, prov, this.#payMode);
      }

      async signMessage(message) {
        return this.#owner.signMessage(message);
      }

      async signTypedData(domain, types, value) {
        return this.#owner.signTypedData(domain, types, value);
      }

      async signTransaction() {
        throw new Error("BiconomySmartAccountSigner: use sendTransaction (UserOperation), não signTransaction");
      }

      async sendTransaction(tx) {
        const req = { to: tx.to, data: tx.data ?? "0x", value: tx.value != null ? tx.value : 0n };
        const opts = this.#payMode ? { paymasterServiceData: { mode: this.#payMode } } : {};
        const userOp = await this.#sa.sendTransaction(req, opts);
        const { transactionHash } = await userOp.waitForTxHash();
        return {
          hash: transactionHash,
          async wait(confirmations) {
            const res = await userOp.wait(confirmations ?? 1);
            const rec = res && res.receipt ? res.receipt : res;
            return {
              hash: rec?.transactionHash ?? transactionHash,
              blockNumber: rec?.blockNumber,
              gasUsed: rec?.gasUsed != null ? BigInt(rec.gasUsed) : 0n,
              status: res && res.success === false ? 0 : 1,
            };
          },
        };
      }
    };
  }
  return new _AdapterClass(smartAccount, owner, provider, payMode);
}
