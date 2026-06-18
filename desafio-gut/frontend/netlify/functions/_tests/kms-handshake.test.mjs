// MC30.2.1 — Handshake do owner KMS (_lib/kms-signer.mjs).
// Executar: node --test --experimental-test-module-mocks kms-handshake.test.mjs
//
// O KMS é EMULADO por uma Wallet ethers descartável (conta #1 do Hardhat),
// injetada via getPublicKeyDer/signDigest — não há rede nem chave real. Cobre:
//   · derivação do endereço a partir do DER SPKI (ITEM 5.1);
//   · assinatura de mensagem (EIP-191, userOpHash da Biconomy) recuperável;
//   · recibo EIP-712 (signTypedData) recuperável à EOA owner (achado #3);
//   · normalização DER → low-S + recovery id v (ITEM 5.1).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Wallet, getBytes, hexlify, toBeHex, verifyMessage, verifyTypedData, Signature,
} from "ethers";
import {
  KmsSigner, parseDerSignature, spkiDerToAddress, montarAssinatura,
} from "../_lib/kms-signer.mjs";

// Chave de TESTE descartável (conta #1 do Hardhat) — NUNCA é uma chave real.
const TEST_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const wallet = new Wallet(TEST_PK);
const PUB = getBytes(wallet.signingKey.publicKey); // 0x04||X||Y (65 bytes)

// Codifica um INTEGER DER (com 0x00 de sinal) — emula a saída do KMS.
function derInt(hex32) {
  let b = getBytes(hex32);
  let i = 0; while (i < b.length - 1 && b[i] === 0) i++;
  b = b.slice(i);
  if (b[0] & 0x80) b = Uint8Array.from([0, ...b]);
  return Uint8Array.from([0x02, b.length, ...b]);
}
function derSig(r, s) {
  const R = derInt(toBeHex(r, 32)), S = derInt(toBeHex(s, 32));
  const body = Uint8Array.from([...R, ...S]);
  return Uint8Array.from([0x30, body.length, ...body]);
}

function novoSigner() {
  return new KmsSigner({
    provider: null,
    getPublicKeyDer: async () => PUB,
    signDigest: async (digest32) => {
      const s = wallet.signingKey.sign(hexlify(digest32));
      return derSig(BigInt(s.r), BigInt(s.s));
    },
  });
}

test("ITEM 5.1: getAddress deriva o endereço esperado do DER SPKI", async () => {
  assert.equal(spkiDerToAddress(PUB), wallet.address);
  assert.equal(await novoSigner().getAddress(), wallet.address);
});

test("ITEM 5.1: signMessage (EIP-191) é recuperável à EOA owner", async () => {
  const signer = novoSigner();
  const msg = "userop-handshake-mc30.2.1";
  const sig = await signer.signMessage(msg);
  assert.equal(verifyMessage(msg, sig), wallet.address);
});

test("ITEM 5.1: signMessage de um hash de 32 bytes (userOpHash) assina os bytes crus", async () => {
  const signer = novoSigner();
  const userOpHash = "0x" + "cd".repeat(32);
  const sig = await signer.signMessage(userOpHash);
  // O EOA recupera assinando o digest crú sob o prefixo EIP-191.
  assert.equal(verifyMessage(getBytes(userOpHash), sig), wallet.address);
});

test("achado #3: signTypedData (recibo EIP-712) é recuperável à EOA owner", async () => {
  const signer = novoSigner();
  const domain = { name: "LeilaoGUT", version: "1", chainId: 1, verifyingContract: "0x" + "11".repeat(20) };
  const types = { Consolidacao: [{ name: "idEdicao", type: "string" }, { name: "nonce", type: "uint256" }] };
  const value = { idEdicao: "R-1", nonce: 7 };
  const sig = await signer.signTypedData(domain, types, value);
  assert.equal(verifyTypedData(domain, types, value, sig), wallet.address);
});

test("ITEM 5.1: normalização DER → low-S + v (high-S é canonizado para o mesmo resultado)", async () => {
  const digest = "0x" + "ab".repeat(32);
  const base = wallet.signingKey.sign(digest); // ethers já devolve low-S canónico
  const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const r = BigInt(base.r), s = BigInt(base.s);

  const canon = montarAssinatura(digest, r, s, wallet.address);
  const fromHighS = montarAssinatura(digest, r, N - s, wallet.address); // high-S de entrada
  assert.equal(canon, base.serialized, "low-S canónico == assinatura ethers");
  assert.equal(fromHighS, canon, "high-S é normalizado para o mesmo resultado low-S");
  assert.ok(BigInt(Signature.from(canon).s) <= (N >> 1n), "s final é low-S");
});

test("ITEM 5.1: parseDerSignature recupera (r,s) do DER", () => {
  const r = 0x1234n, s = 0xabcdn;
  const { r: pr, s: ps } = parseDerSignature(derSig(r, s));
  assert.equal(pr, r);
  assert.equal(ps, s);
});
