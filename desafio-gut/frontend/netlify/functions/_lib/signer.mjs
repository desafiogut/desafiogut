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
 * @returns {"defender"|"local-key"}
 */
export function backendAssinatura() {
  const explicito = String(process.env.SIGNER_BACKEND || "").toLowerCase();
  if (explicito === "defender" || explicito === "local-key") return explicito;
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
  const backend = backendAssinatura();

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
 * Backend Defender — implementado no SEGMENTO 3 (ITEM 3.2), depois de a
 * dependência `@openzeppelin/defender-sdk` ser adicionada (ITEM 3.1). Até lá,
 * selecionar este backend falha de forma explícita (nenhum ambiente de teste o
 * seleciona: testnet/localhost usam 'local-key').
 */
async function criarSignerDefender() {
  throw new Error(
    "backend de assinatura 'defender' ainda não disponível (MC30.1 SEG3). " +
    "Defina SIGNER_BACKEND=local-key em testnet/localhost.",
  );
}
