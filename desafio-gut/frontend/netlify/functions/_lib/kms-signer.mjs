// _lib/kms-signer.mjs — OWNER do Smart Account via KMS/signer remoto (MC30.2.1)
//
// A Biconomy precisa de um OWNER signer para autorizar UserOperations (não tem
// HSM próprio embutido). Para preservar o isolamento do MC30.1 (R9/R12),
// esse owner é uma chave que vive num KMS/HSM remoto: a chave privada BRUTA
// NUNCA entra no processo Node das Netlify Functions.
//
// KmsSigner estende ethers.AbstractSigner e implementa apenas o necessário para:
//   · a Biconomy assinar o userOpHash (signMessage — EIP-191);
//   · o recibo de auditoria EIP-712 (signTypedData) — assinatura ECDSA
//     recuperável à EOA owner, comportamento idêntico ao MC30.1 (achado #3).
//
// O KMS devolve a assinatura em DER; aqui normalizamos para low-S e calculamos
// o recovery id (v) para produzir a assinatura {r,s,v} de 65 bytes do Ethereum.
//
// Desenho AGNÓSTICO ao provider: o KmsSigner recebe duas funções injetadas
// (getPublicKeyDer, signDigest); a factory `criarKmsSigner` resolve-as a partir
// de KMS_PROVIDER (apenas 'aws' implementado nesta fase — recomendado).

import {
  AbstractSigner, computeAddress, hashMessage, TypedDataEncoder,
  Signature, recoverAddress, getBytes, hexlify, toBeHex, isHexString,
} from "ethers";

// Ordem do grupo secp256k1 (n) e metade (para a regra low-S do Ethereum).
const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const HALF_N = SECP256K1_N >> 1n;

// ── Utilidades DER (agnósticas ao provider) ─────────────────────────────────

/** Lê um inteiro DER (com possível 0x00 de sinal) como BigInt. */
function bytesToBigInt(bytes) {
  return bytes.length ? BigInt(hexlify(bytes)) : 0n;
}

/**
 * Faz o parse de uma assinatura ECDSA em DER: SEQUENCE { INTEGER r, INTEGER s }.
 * @returns {{ r: bigint, s: bigint }}
 */
export function parseDerSignature(der) {
  let off = 0;
  if (der[off++] !== 0x30) throw new Error("KMS: DER inválido (sem SEQUENCE)");
  let seqLen = der[off++];
  if (seqLen & 0x80) { // forma longa
    let n = seqLen & 0x7f; seqLen = 0;
    while (n-- > 0) seqLen = (seqLen << 8) | der[off++];
  }
  if (der[off++] !== 0x02) throw new Error("KMS: DER inválido (r não é INTEGER)");
  const rLen = der[off++];
  const r = bytesToBigInt(der.slice(off, off + rLen)); off += rLen;
  if (der[off++] !== 0x02) throw new Error("KMS: DER inválido (s não é INTEGER)");
  const sLen = der[off++];
  const s = bytesToBigInt(der.slice(off, off + sLen)); off += sLen;
  return { r, s };
}

/** Deriva o endereço Ethereum a partir do DER SPKI (chave pública secp256k1). */
export function spkiDerToAddress(der) {
  // O ponto EC não-comprimido (0x04 || X(32) || Y(32)) são os últimos 65 bytes.
  const point = der.slice(der.length - 65);
  if (point[0] !== 0x04) throw new Error("KMS: chave pública DER inesperada (sem 0x04)");
  return computeAddress(hexlify(point));
}

/** Normaliza s para low-S e descobre o v (27/28) que recupera `expected`. */
export function montarAssinatura(digestHex, r, sRaw, expected) {
  const s = sRaw > HALF_N ? SECP256K1_N - sRaw : sRaw; // low-S (EIP-2)
  const rHex = toBeHex(r, 32);
  const sHex = toBeHex(s, 32);
  for (const v of [27, 28]) {
    const sig = Signature.from({ r: rHex, s: sHex, v });
    if (recoverAddress(digestHex, sig).toLowerCase() === expected.toLowerCase()) {
      return sig.serialized; // 65 bytes (r||s||v)
    }
  }
  throw new Error("KMS: não foi possível recuperar o endereço (v) — chave/assinatura inconsistente");
}

// ── O signer ────────────────────────────────────────────────────────────────

export class KmsSigner extends AbstractSigner {
  #getPublicKeyDer;
  #signDigest;
  #addressCache = null;

  /**
   * @param {object}   opts
   * @param {import("ethers").Provider|null} opts.provider
   * @param {() => Promise<Uint8Array>}      opts.getPublicKeyDer  Devolve o DER SPKI.
   * @param {(digest32: Uint8Array) => Promise<Uint8Array>} opts.signDigest  Assina um digest, devolve DER.
   */
  constructor({ provider = null, getPublicKeyDer, signDigest }) {
    super(provider);
    if (typeof getPublicKeyDer !== "function" || typeof signDigest !== "function") {
      throw new Error("KmsSigner: getPublicKeyDer e signDigest são obrigatórios");
    }
    this.#getPublicKeyDer = getPublicKeyDer;
    this.#signDigest = signDigest;
  }

  async getAddress() {
    if (this.#addressCache) return this.#addressCache;
    const der = await this.#getPublicKeyDer();
    this.#addressCache = spkiDerToAddress(der);
    return this.#addressCache;
  }

  connect(provider) {
    return new KmsSigner({
      provider,
      getPublicKeyDer: this.#getPublicKeyDer,
      signDigest: this.#signDigest,
    });
  }

  /** Assina um digest de 32 bytes via KMS e devolve {r,s,v} serializado (0x..65b). */
  async #assinarDigest(digestHex) {
    const der = await this.#signDigest(getBytes(digestHex));
    const { r, s } = parseDerSignature(der);
    const address = await this.getAddress();
    return montarAssinatura(digestHex, r, s, address);
  }

  async signMessage(message) {
    // userOpHash (4337) chega como bytes ou hex de 32 bytes → assinar os bytes
    // crus sob o prefixo EIP-191; mensagens de texto são tratadas como UTF-8.
    const data = (typeof message === "string" && isHexString(message)) ? getBytes(message) : message;
    return this.#assinarDigest(hashMessage(data));
  }

  async signTypedData(domain, types, value) {
    return this.#assinarDigest(TypedDataEncoder.hash(domain, types, value));
  }

  async signTransaction() {
    // O owner KMS nunca assina transações cruas: a execução é via UserOperation
    // (Bundler ERC-4337). Manter explícito para falhar alto se usado por engano.
    throw new Error("KmsSigner: signTransaction não suportado — use o Bundler (UserOperation)");
  }
}

/**
 * Factory: resolve o provider de KMS a partir do ambiente e devolve um KmsSigner.
 * @param {import("ethers").Provider|null} provider  Provider de LEITURA (views).
 */
export async function criarKmsSigner(provider = null) {
  const kmsProvider = String(process.env.KMS_PROVIDER || "aws").toLowerCase();
  const keyId = process.env.KMS_KEY_ID;
  if (!keyId) throw new Error("KMS_KEY_ID não configurado");

  if (kmsProvider === "aws") {
    // APP_AWS_REGION tem precedência (AWS_REGION é reservado no runtime Netlify).
    const region = process.env.APP_AWS_REGION || process.env.AWS_REGION;
    const { awsGetPublicKeyDer, awsSignDigest } = await import("./kms/aws-kms.mjs");
    return new KmsSigner({
      provider,
      getPublicKeyDer: () => awsGetPublicKeyDer(keyId, region),
      signDigest: (digest32) => awsSignDigest(keyId, region, digest32),
    });
  }

  // 'turnkey' | 'fireblocks' — desenho preparado, implementação futura.
  throw new Error(`KMS_PROVIDER='${kmsProvider}' não implementado (apenas 'aws' nesta fase)`);
}
