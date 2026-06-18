// MC30.2.1 — Integração: ethers Contract REAL ↔ adapter Biconomy (achado #4).
// Executar: node --test --experimental-test-module-mocks mc302-integracao.test.mjs
//
// Prova que `new Contract(addr, abi, signerDaFachada).metodo(...)` — exatamente
// como os 3 call-sites fazem — codifica o calldata correto e o adapter o traduz
// numa UserOperation (sendTransaction), com o recibo no shape esperado. As 4
// funções privilegiadas (adicionarSenhas, comprometerLance, consolidarResultado,
// abrirEdicao) usam a MESMA fachada → cobertas pelo mesmo caminho (ITEM 6.1–6.4).
// ITEM 6.5: concorrência — N escritas simultâneas viram N UserOps (o Bundler
// resolve os nonces; não há serialização/lock no cliente).
//
// @biconomy/account e @aws-sdk/client-kms mockados (offline). KMS = Wallet.
import { test, before } from "node:test";
import { mock } from "node:test";
import assert from "node:assert/strict";
import { Wallet, Contract, Interface, getBytes, hexlify, toBeHex } from "ethers";

const TEST_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const wallet = new Wallet(TEST_PK);
const PUB = getBytes(wallet.signingKey.publicKey);
const SA_ADDR = "0x5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A";
const CONTRATO = "0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5";

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

// Mock @aws-sdk/client-kms
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
mock.module("@aws-sdk/client-kms", { namedExports: { KMSClient, GetPublicKeyCommand, SignCommand } });

// Mock @biconomy/account — tx hash sequencial p/ provar concorrência.
const saCalls = [];
let txSeq = 0;
const fakeSA = {
  async getAccountAddress() { return SA_ADDR; },
  async sendTransaction(req, opts) {
    const id = ++txSeq;
    const hash = "0x" + String(id).padStart(64, "0");
    saCalls.push({ req, opts, hash });
    return {
      async waitForTxHash() { return { transactionHash: hash }; },
      async wait() { return { success: true, receipt: { transactionHash: hash, blockNumber: 1000 + id, gasUsed: 21000n } }; },
    };
  },
};
mock.module("@biconomy/account", {
  namedExports: {
    createSmartAccountClient: async () => fakeSA,
    PaymasterMode: { SPONSORED: "SPONSORED", ERC20: "ERC20" },
    extractChainIdFromBundlerUrl: () => 11155111,
  },
});

process.env.NETWORK_STAGE = "sepolia";
process.env.SIGNER_BACKEND = "biconomy";
process.env.RPC_URL = "http://localhost:8545";
process.env.BICONOMY_BUNDLER_URL = "https://bundler.test/api/v3/11155111/key";
process.env.KMS_PROVIDER = "aws";
process.env.KMS_KEY_ID = "arn:aws:kms:us-east-1:0:key/abc";
process.env.AWS_REGION = "us-east-1";
delete process.env.COORDENACAO_PRIVATE_KEY;
delete process.env.BICONOMY_PAYMASTER_URL; // sem paymaster neste teste

const ABI = [
  "function adicionarSenhas(address usuario, uint256 quantidade)",
  "function comprometerLance(string idEdicao, address lancador, bytes32 hashLance)",
  "function consolidarResultado(string idEdicao, address vencedor, uint256 menorUnico)",
  "function abrirEdicao(string idEdicao, string nome, uint256 duracaoSegundos)",
];
const iface = new Interface(ABI);

let contrato;
before(async () => {
  const signer = await import("../_lib/signer.mjs");
  const { signer: s, address, backend } = await signer.obterSignerCoordenacao(process.env.RPC_URL);
  assert.equal(backend, "biconomy");
  assert.equal(address, SA_ADDR);
  contrato = new Contract(CONTRATO, ABI, s); // EXATAMENTE como os call-sites
});

test("ITEM 6.1: adicionarSenhas → UserOp com calldata correto + hash real exposto", async () => {
  // Nota: o ethers embrulha o retorno num ContractTransactionResponse cujo .wait()
  // usa o PROVIDER (RPC real) — testado em produção, não offline. Aqui validamos a
  // tradução do adapter (calldata) e que o `tx.hash` exposto é o hash REAL do
  // bundler (essencial p/ provider.waitForTransaction em consolidar-lances.mjs).
  // O shape do recibo do adapter.wait() é coberto em biconomy-handshake.test.mjs.
  saCalls.length = 0;
  const usuario = "0xabcdef0000000000000000000000000000000001";
  const tx = await contrato.adicionarSenhas(usuario, 3);
  const call = saCalls.at(-1);
  assert.equal(call.req.to.toLowerCase(), CONTRATO.toLowerCase());
  const parsed = iface.parseTransaction({ data: call.req.data });
  assert.equal(parsed.name, "adicionarSenhas");
  assert.equal(parsed.args[0].toLowerCase(), usuario.toLowerCase());
  assert.equal(parsed.args[1], 3n);
  assert.equal(tx.hash, call.hash, "ContractTransactionResponse expõe o hash REAL da tx do bundler");
});

test("ITEM 6.2: comprometerLance → UserOp com calldata correto", async () => {
  saCalls.length = 0;
  const lancador = "0x1111111111111111111111111111111111111111";
  const hashLance = "0x" + "ab".repeat(32);
  await contrato.comprometerLance("R-1", lancador, hashLance);
  const parsed = iface.parseTransaction({ data: saCalls.at(-1).req.data });
  assert.equal(parsed.name, "comprometerLance");
  assert.equal(parsed.args[0], "R-1");
  assert.equal(parsed.args[1].toLowerCase(), lancador.toLowerCase());
  assert.equal(parsed.args[2], hashLance);
});

test("ITEM 6.3: consolidarResultado → UserOp com calldata correto", async () => {
  saCalls.length = 0;
  const vencedor = "0x2222222222222222222222222222222222222222";
  await contrato.consolidarResultado("R-1", vencedor, 4242);
  const parsed = iface.parseTransaction({ data: saCalls.at(-1).req.data });
  assert.equal(parsed.name, "consolidarResultado");
  assert.equal(parsed.args[0], "R-1");
  assert.equal(parsed.args[1].toLowerCase(), vencedor.toLowerCase());
  assert.equal(parsed.args[2], 4242n);
});

test("ITEM 6.4: abrirEdicao → UserOp com calldata correto", async () => {
  saCalls.length = 0;
  await contrato.abrirEdicao("FLASH-AUTO-1", "Relâmpago", 1800);
  const parsed = iface.parseTransaction({ data: saCalls.at(-1).req.data });
  assert.equal(parsed.name, "abrirEdicao");
  assert.equal(parsed.args[0], "FLASH-AUTO-1");
  assert.equal(parsed.args[1], "Relâmpago");
  assert.equal(parsed.args[2], 1800n);
});

test("ITEM 6.5: concorrência — N lances simultâneos viram N UserOps distintas", async () => {
  saCalls.length = 0;
  const N = 6;
  const txs = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      contrato.adicionarSenhas("0x000000000000000000000000000000000000000" + (i + 1), i + 1)),
  );
  const hashes = new Set(txs.map((t) => t.hash));
  assert.equal(hashes.size, N, "todas as UserOps têm hash distinto (sem colisão)");
  assert.equal(saCalls.length, N, "N submissões ao Bundler (sem serialização no cliente)");
});
