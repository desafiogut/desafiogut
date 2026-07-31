// MC59.5 — blocos do ADR (confirmação assíncrona): submeterCredito (submit-only,
// NÃO aguarda o wait) e confirmarReceiptOnchain (classifica o receipt).
// ethers mockado (offline). node --test --experimental-test-module-mocks _tests/mc595-async-blocks.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const COORD_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const TX_HASH = "0xa5ync0000000000000000000000000000000000000000000000000000000001";

let waitCalled = false;
let receiptResult = null;

class FakeWallet { constructor(_pk, provider) { this.address = COORD_ADDR; this.provider = provider; } async signTypedData() { return "0xsig"; } }
class FakeProvider { constructor(url) { this.url = url; } async getTransactionReceipt() { return receiptResult; } }
class FakeContract {
  constructor(addr, abi, runner) { this.address = addr; this.runner = runner; }
  async coordenacao() { return COORD_ADDR; }
  async adicionarSenhas() {
    return { hash: TX_HASH, wait: async () => { waitCalled = true; return { hash: TX_HASH, blockNumber: 1, gasUsed: 1n }; } };
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
beforeEach(() => { waitCalled = false; receiptResult = null; });

test("MC59.5: submeterCredito devolve txHash e NÃO aguarda o wait (assíncrono)", async () => {
  const r = await contract.submeterCredito(ADDR, 3);
  assert.equal(r.txHash, TX_HASH);
  assert.equal(waitCalled, false, "submeterCredito não deve aguardar o wait");
});

test("MC59.5: confirmarReceiptOnchain — status 1 → confirmado", async () => {
  receiptResult = { status: 1, blockNumber: 42 };
  const r = await contract.confirmarReceiptOnchain(TX_HASH);
  assert.equal(r.estado, "confirmado");
});

test("MC59.5: confirmarReceiptOnchain — status 0 → revertido", async () => {
  receiptResult = { status: 0 };
  assert.equal((await contract.confirmarReceiptOnchain(TX_HASH)).estado, "revertido");
});

test("MC59.5: confirmarReceiptOnchain — receipt ausente → pendente", async () => {
  receiptResult = null;
  assert.equal((await contract.confirmarReceiptOnchain(TX_HASH)).estado, "pendente");
});
