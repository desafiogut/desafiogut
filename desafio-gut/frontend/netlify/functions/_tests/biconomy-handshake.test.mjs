// MC30.2.1 — Handshake da Biconomy (caminho 'biconomy' de _lib/signer.mjs).
// Executar: node --test --experimental-test-module-mocks biconomy-handshake.test.mjs
//
// @biconomy/account e @aws-sdk/client-kms são MOCKADOS → 100% offline, sem rede,
// sem chave real. O KMS é emulado por uma Wallet ethers (owner). Cobre (ITEM 5.2):
//   · createSmartAccountClient recebe o owner KMS + bundlerUrl + paymasterUrl;
//   · endereço resolvido == endereço do Smart Account;
//   · o adapter traduz contract.metodo(...) → sendTransaction (UserOperation),
//     com Paymaster SPONSORED, e expõe hash REAL + wait()/recibo;
//   · signTypedData delega ao owner KMS (recuperável à EOA owner).
import { test, before } from "node:test";
import { mock } from "node:test";
import assert from "node:assert/strict";
import { Wallet, getBytes, hexlify, toBeHex, verifyTypedData } from "ethers";

// ── Owner KMS emulado por Wallet (conta #1 do Hardhat) ──────────────────────
const TEST_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const wallet = new Wallet(TEST_PK);
const PUB = getBytes(wallet.signingKey.publicKey);

const SA_ADDR = "0x5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A"; // Smart Account
const REAL_TX = "0x" + "fe".repeat(32);

function derInt(hex32) {
  let b = getBytes(hex32); let i = 0; while (i < b.length - 1 && b[i] === 0) i++;
  b = b.slice(i); if (b[0] & 0x80) b = Uint8Array.from([0, ...b]);
  return Uint8Array.from([0x02, b.length, ...b]);
}
function derSig(r, s) {
  const R = derInt(toBeHex(r, 32)), S = derInt(toBeHex(s, 32));
  const body = Uint8Array.from([...R, ...S]);
  return Uint8Array.from([0x30, body.length, ...body]);
}

// ── Mock @aws-sdk/client-kms (usado por _lib/kms/aws-kms.mjs) ────────────────
class GetPublicKeyCommand { constructor(i) { this.input = i; this.type = "getpub"; } }
class SignCommand { constructor(i) { this.input = i; this.type = "sign"; } }
class KMSClient {
  constructor(_cfg) {}
  async send(cmd) {
    if (cmd.type === "getpub") return { PublicKey: PUB };
    const s = wallet.signingKey.sign(hexlify(cmd.input.Message));
    return { Signature: derSig(BigInt(s.r), BigInt(s.s)) };
  }
}
mock.module("@aws-sdk/client-kms", {
  namedExports: { KMSClient, GetPublicKeyCommand, SignCommand },
});

// ── Mock @biconomy/account ──────────────────────────────────────────────────
const saCalls = [];
const fakeSA = {
  async getAccountAddress() { return SA_ADDR; },
  async sendTransaction(req, opts) {
    saCalls.push({ req, opts });
    return {
      async waitForTxHash() { return { transactionHash: REAL_TX }; },
      async wait() {
        return { success: true, receipt: { transactionHash: REAL_TX, blockNumber: 4337, gasUsed: 99999n } };
      },
    };
  },
};
let createCfg = null;
mock.module("@biconomy/account", {
  namedExports: {
    createSmartAccountClient: async (cfg) => { createCfg = cfg; return fakeSA; },
    PaymasterMode: { SPONSORED: "SPONSORED", ERC20: "ERC20" },
  },
});

// ── Ambiente: backend biconomy, sem chave bruta ─────────────────────────────
process.env.NETWORK_STAGE = "sepolia";
process.env.SIGNER_BACKEND = "biconomy";
process.env.RPC_URL = "http://localhost:8545";
process.env.BICONOMY_BUNDLER_URL = "https://bundler.test/api/v3/11155111/key";
process.env.BICONOMY_PAYMASTER_URL = "https://paymaster.test/api/v2/11155111/key";
process.env.BICONOMY_API_KEY = "bic_test";
process.env.KMS_PROVIDER = "aws";
process.env.KMS_KEY_ID = "arn:aws:kms:us-east-1:0:key/abc";
process.env.AWS_REGION = "us-east-1";
delete process.env.COORDENACAO_PRIVATE_KEY;
delete process.env.COORDENACAO_PRIVATE;

let signer;
before(async () => { signer = await import("../_lib/signer.mjs"); });

test("ITEM 5.2: backend=biconomy, endereço == Smart Account, owner KMS == EOA esperada", async () => {
  const { address, backend } = await signer.obterSignerCoordenacao(process.env.RPC_URL);
  assert.equal(backend, "biconomy");
  assert.equal(address, SA_ADDR);
  // createSmartAccountClient recebeu o owner KMS + URLs do Bundler/Paymaster.
  assert.equal(createCfg.bundlerUrl, process.env.BICONOMY_BUNDLER_URL);
  assert.equal(createCfg.paymasterUrl, process.env.BICONOMY_PAYMASTER_URL);
  assert.equal(await createCfg.signer.getAddress(), wallet.address);
  // cache de endereço síncrono reflete o Smart Account (achado #1).
  assert.equal(signer.getCoordenacaoAddressCache(), SA_ADDR);
});

test("ITEM 5.2: adapter traduz a escrita em UserOperation (Paymaster SPONSORED) + recibo", async () => {
  saCalls.length = 0;
  const { signer: s } = await signer.obterSignerCoordenacao(process.env.RPC_URL);
  const TO = "0xCAFE000000000000000000000000000000000001";
  const tx = await s.sendTransaction({ to: TO, data: "0xdeadbeef", value: 0n });
  assert.equal(tx.hash, REAL_TX, "hash REAL exposto (p/ provider.waitForTransaction)");
  // o Smart Account recebeu {to,data} e o modo Paymaster.
  assert.equal(saCalls[0].req.to, TO);
  assert.equal(saCalls[0].req.data, "0xdeadbeef");
  assert.equal(saCalls[0].opts.paymasterServiceData.mode, "SPONSORED");
  // wait() devolve recibo no shape esperado pelos call-sites.
  const r = await tx.wait(1);
  assert.equal(r.hash, REAL_TX);
  assert.equal(r.blockNumber, 4337);
  assert.equal(r.gasUsed, 99999n);
  assert.equal(r.status, 1);
});

test("ITEM 5.2/achado #3: signTypedData do adapter delega ao owner KMS (recuperável)", async () => {
  const { signer: s } = await signer.obterSignerCoordenacao(process.env.RPC_URL);
  const domain = { name: "LeilaoGUT", version: "1", chainId: 1, verifyingContract: "0x" + "11".repeat(20) };
  const types = { Consolidacao: [{ name: "idEdicao", type: "string" }, { name: "nonce", type: "uint256" }] };
  const value = { idEdicao: "R-1", nonce: 7 };
  const sig = await s.signTypedData(domain, types, value);
  assert.equal(verifyTypedData(domain, types, value, sig), wallet.address);
});
