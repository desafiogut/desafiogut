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
//   2) permite trocar o BACKEND de assinatura (chave bruta ↔ Smart Account
//      ERC-4337 com owner em KMS remoto) editando apenas este ficheiro.
//
// Seleção de backend (MC31 — backend 'defender' removido):
//   - SIGNER_BACKEND explícito ('biconomy' | 'local-key') tem precedência;
//   - caso contrário: NETWORK_STAGE === 'mainnet'  → 'biconomy' (Smart Account + KMS)
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
 *   - SIGNER_BACKEND explícito ('biconomy' | 'local-key') tem precedência;
 *   - caso contrário: NETWORK_STAGE === 'mainnet' → 'biconomy' (Smart Account + KMS);
 *                     restante (sepolia/localhost) → 'local-key'.
 * MC31: o backend 'defender' (OpenZeppelin Defender Relay) foi REMOVIDO. O ALVO de
 * produção é 'biconomy' (ERC-4337 + owner KMS) e passa a ser o default em mainnet.
 * @returns {"biconomy"|"local-key"}
 */
export function backendAssinatura() {
  const explicito = String(process.env.SIGNER_BACKEND || "").toLowerCase();
  if (explicito === "biconomy" || explicito === "local-key") return explicito;
  return process.env.NETWORK_STAGE === "mainnet" ? "biconomy" : "local-key";
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
 * Guarda anti-reintrodução (ITEM 3.5/4.1 · R9/R12): a chave privada bruta NÃO
 * pode coexistir com um backend isolado. Se a chave reaparecer (deploy acidental,
 * rollback de env), recusamos arrancar. Além disso, o backend 'biconomy' exige a
 * configuração mínima do owner KMS + Bundler antes de assinar seja o que for.
 * @throws {Error} em mainnet com chave bruta, ou em 'biconomy' mal configurado.
 */
export function assertChaveBrutaAusenteEmMainnet() {
  const temChaveBruta = !!resolverChaveCoordenacao();

  // Regra MC30.1: em mainnet a chave bruta nunca pode existir (HSM/KMS assina).
  if (process.env.NETWORK_STAGE === "mainnet" && temChaveBruta) {
    throw new Error(
      "MC30.1: COORDENACAO_PRIVATE_KEY presente em mainnet — a chave bruta deve " +
      "ser removida do ambiente (R9/ITEM 3.5). Use o backend Biconomy (Smart Account + KMS).",
    );
  }

  // Regra MC30.2.1: o backend Biconomy exige owner KMS e proíbe a chave bruta.
  if (backendAssinatura() === "biconomy") {
    if (temChaveBruta) {
      throw new Error(
        "MC30.2.1: COORDENACAO_PRIVATE_KEY presente com SIGNER_BACKEND=biconomy — a " +
        "chave bruta deve ser removida do ambiente (R9/R12). O owner assina via KMS.",
      );
    }
    const kmsProvider = String(process.env.KMS_PROVIDER || "aws").toLowerCase();
    if (!["aws", "turnkey", "fireblocks"].includes(kmsProvider)) {
      throw new Error(`MC30.2.1: KMS_PROVIDER='${kmsProvider}' não reconhecido (aws|turnkey|fireblocks).`);
    }
    if (!process.env.KMS_KEY_ID) {
      throw new Error("MC30.2.1: KMS_KEY_ID não configurado — owner do Smart Account via KMS (R12).");
    }
    if (!process.env.BICONOMY_BUNDLER_URL) {
      throw new Error("MC30.2.1: BICONOMY_BUNDLER_URL não configurado — Bundler ERC-4337 (ITEM 4.1).");
    }
    // BICONOMY_API_KEY/PAYMASTER_URL são OPCIONAIS (só p/ subsídio de gás).
  }
}

/**
 * Cria o signer da coordenação para o backend ativo.
 *
 * @param {string} rpcUrl  URL do provider JSON-RPC (backend local-key e RPC do
 *                         Smart Account no backend biconomy).
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

  // ── backend 'local-key' (default; testnet/dev) — comportamento legado ──────
  const chave = resolverChaveCoordenacao();
  if (!chave) throw new Error("COORDENACAO_PRIVATE_KEY não configurado");
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(chave, provider);
  _coordenacaoAddressCache = signer.address;
  return { provider, signer, address: signer.address, backend };
}

/**
 * Backend Biconomy (MC30.2.1) — ALVO de produção. A coordenação executa as
 * transações através de um Smart Account ERC-4337: o Bundler resolve nativamente
 * a concorrência de nonces (lances simultâneos) e o Paymaster subsidia o gás.
 *
 * O OWNER do Smart Account é uma chave em KMS remoto (R9/R12): a chave privada
 * bruta NUNCA entra neste processo. Import dinâmico (lazy) de @biconomy/account e
 * de ./kms-signer.mjs → testnet/local-key não dependem destes pacotes,
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

  // Importa o SDK primeiro para derivar o chainId do bundler e FIXAR a rede do
  // provider (staticNetwork) — evita um round-trip de deteção de rede por escrita.
  const { createSmartAccountClient, PaymasterMode, extractChainIdFromBundlerUrl } = await import("@biconomy/account");
  let chainId = null;
  try {
    if (typeof extractChainIdFromBundlerUrl === "function") chainId = Number(extractChainIdFromBundlerUrl(bundlerUrl));
  } catch { /* chainId fica null → provider com deteção normal */ }

  // Owner via KMS — a chave privada vive no KMS, fora deste processo.
  // `Network` é importado LAZY (igual ao AbstractSigner) — só o caminho 'biconomy'
  // o puxa, mantendo intactos os testes que mockam 'ethers' com exports mínimos.
  const { Network } = await import("ethers");
  const provider = chainId
    ? new JsonRpcProvider(effectiveRpc, Network.from(chainId), { staticNetwork: true })
    : new JsonRpcProvider(effectiveRpc);
  const { criarKmsSigner } = await import("./kms-signer.mjs");
  const owner = await criarKmsSigner(provider);

  // Smart Account ERC-4337 + Bundler (+ Paymaster opcional).
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

// Cache do construtor do adapter. AbstractSigner é importado LAZY — só o caminho
// 'biconomy' o puxa, mantendo os testes que mockam 'ethers' com exports mínimos
// (local-key) intactos.
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
