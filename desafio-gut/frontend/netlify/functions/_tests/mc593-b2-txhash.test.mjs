// MC59.3 — B-2: atribuição por TX-HASH específico em creditarSenhas.
// Quando tx.wait falha (timeout/RPC), NÃO propagar cegamente: re-verificar o
// receipt DAQUELA tx. status 1 → sucesso; status 0 → TX_REVERTED; ausente →
// TX_PENDENTE (estado desconhecido → o caller NÃO reembolsa cegamente).
// ethers mockado (offline). node --test --experimental-test-module-mocks _tests/mc593-b2-txhash.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const COORD_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const TX_HASH = "0xdeadbeefcafebabe0000000000000000000000000000000000000000000000aa";

let waitBehavior = "ok";  // "ok" | "throw"
let receiptResult = null; // retorno de getTransactionReceipt
let receiptThrowsN = 0;   // nº de vezes que getTransactionReceipt lança antes de devolver (RPC transitório)

class FakeWallet { constructor(_pk, provider) { this.address = COORD_ADDR; this.provider = provider; } async signTypedData() { return "0xsig"; } }
class FakeProvider {
  constructor(url) { this.url = url; }
  async getTransactionReceipt() {
    if (receiptThrowsN > 0) { receiptThrowsN--; throw new Error("RPC blip transitório"); }
    return receiptResult;
  }
}
class FakeContract {
  constructor(addr, abi, runner) { this.address = addr; this.runner = runner; }
  async coordenacao() { return COORD_ADDR; }
  async saldoSenhas() { return 7n; }
  async adicionarSenhas() {
    return {
      hash: TX_HASH,
      wait: async () => {
        if (waitBehavior === "throw") throw new Error("wait timeout / RPC error");
        return { hash: TX_HASH, blockNumber: 100, gasUsed: 21000n };
      },
    };
  }
}
mock.module("ethers", { namedExports: { Contract: FakeContract, JsonRpcProvider: FakeProvider, Wallet: FakeWallet } });

process.env.NETWORK_STAGE = "sepolia";
process.env.SIGNER_BACKEND = "local-key";
process.env.RPC_URL = "http://localhost:8545";
process.env.COORDENACAO_PRIVATE_KEY = "0xchave-de-teste";

const ADDR = "0xABCdef0000000000000000000000000000000001";
let contract;
before(async () => { contract = await import("../_lib/contract.mjs"); });
beforeEach(() => { waitBehavior = "ok"; receiptResult = null; receiptThrowsN = 0; });

test("B-2(reg): wait OK → sucesso normal (txHash do receipt)", async () => {
  const r = await contract.creditarSenhas(ADDR, 3);
  assert.equal(r.txHash, TX_HASH);
  assert.equal(r.blockNumber, 100);
});

test("B-2: wait falha mas a tx CONFIRMOU (receipt status 1) → sucesso, NÃO lança", async () => {
  waitBehavior = "throw";
  receiptResult = { status: 1, hash: TX_HASH, blockNumber: 101, gasUsed: 21000n };
  const r = await contract.creditarSenhas(ADDR, 3);
  assert.equal(r.txHash, TX_HASH);
  assert.equal(r.blockNumber, 101);
});

test("B-2: wait falha e a tx REVERTEU (receipt status 0) → lança TX_REVERTED", async () => {
  waitBehavior = "throw";
  receiptResult = { status: 0 };
  await assert.rejects(() => contract.creditarSenhas(ADDR, 3), (e) => e.code === "TX_REVERTED" && e.txHash === TX_HASH);
});

test("B-2: wait falha e receipt AUSENTE (null) → lança TX_PENDENTE (não reembolsar cegamente)", async () => {
  waitBehavior = "throw";
  receiptResult = null;
  await assert.rejects(() => contract.creditarSenhas(ADDR, 3), (e) => e.code === "TX_PENDENTE" && e.txHash === TX_HASH);
});

test("B-2: getTransactionReceipt lança 1x (RPC transitório) e depois CONFIRMA → sucesso via retry", async () => {
  waitBehavior = "throw";
  receiptThrowsN = 1; // 1ª leitura do receipt lança; o retry recupera
  receiptResult = { status: 1, hash: TX_HASH, blockNumber: 102, gasUsed: 21000n };
  const r = await contract.creditarSenhas(ADDR, 3);
  assert.equal(r.txHash, TX_HASH);
  assert.equal(r.blockNumber, 102);
});
