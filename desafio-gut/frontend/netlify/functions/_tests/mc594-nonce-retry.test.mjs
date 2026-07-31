// MC59.4 — retry ciente de nonce no broadcast de creditarSenhas.
// Sob concorrência, duas instâncias (Lambda) podem buscar o MESMO nonce pending
// da EOA da coordenação. O perdedor recebe "nonce too low" NO SEND (antes do
// txHash). Em vez de falhar (→ reembolso + retry do usuário), reenviamos: um novo
// send busca um nonce pending fresco. Erros NÃO-nonce propagam de imediato
// (reembolso seguro pelo caller). Mantém a abordagem tx-hash do MC59.3.
// node --test --experimental-test-module-mocks _tests/mc594-nonce-retry.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const COORD_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const TX_HASH = "0xabc1230000000000000000000000000000000000000000000000000000000001";

let sendThrowNonceN = 0;   // nº de vezes que adicionarSenhas lança erro de nonce
let sendThrowOther  = false; // se true, lança um erro NÃO-nonce (ex.: gás)
let sendCalls = 0;

class FakeWallet { constructor(_pk, provider) { this.address = COORD_ADDR; this.provider = provider; } async signTypedData() { return "0xsig"; } }
class FakeProvider { constructor(url) { this.url = url; } async getTransactionReceipt() { return null; } }
class FakeContract {
  constructor(addr, abi, runner) { this.address = addr; this.runner = runner; }
  async coordenacao() { return COORD_ADDR; }
  async saldoSenhas() { return 7n; }
  async adicionarSenhas() {
    sendCalls++;
    if (sendThrowOther) { const e = new Error("insufficient funds for intrinsic transaction cost"); e.code = "INSUFFICIENT_FUNDS"; throw e; }
    if (sendThrowNonceN > 0) { sendThrowNonceN--; const e = new Error("nonce too low"); e.code = "NONCE_EXPIRED"; throw e; }
    return { hash: TX_HASH, wait: async () => ({ hash: TX_HASH, blockNumber: 100, gasUsed: 21000n }) };
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
beforeEach(() => { sendThrowNonceN = 0; sendThrowOther = false; sendCalls = 0; });

test("MC59.4: colisão de nonce 1x → retry reenvia (novo nonce) e confirma", async () => {
  sendThrowNonceN = 1;
  const r = await contract.creditarSenhas(ADDR, 3);
  assert.equal(r.txHash, TX_HASH);
  assert.equal(sendCalls, 2, "1 falha de nonce + 1 reenvio com sucesso");
});

test("MC59.4: colisão de nonce 2x → retry persiste até confirmar", async () => {
  sendThrowNonceN = 2;
  const r = await contract.creditarSenhas(ADDR, 3);
  assert.equal(r.txHash, TX_HASH);
  assert.equal(sendCalls, 3);
});

test("MC59.4(reg): erro NÃO-nonce (gás) propaga IMEDIATAMENTE (sem retry → reembolso seguro)", async () => {
  sendThrowOther = true;
  await assert.rejects(() => contract.creditarSenhas(ADDR, 3), (e) => e.code === "INSUFFICIENT_FUNDS");
  assert.equal(sendCalls, 1, "não deve reenviar em erro não-nonce");
});

test("MC59.4(reg): nonce colide além do limite → propaga erro de nonce (sem txHash → reembolso seguro, não TX_PENDENTE)", async () => {
  sendThrowNonceN = 99;
  await assert.rejects(() => contract.creditarSenhas(ADDR, 3), (e) => /nonce/i.test(e.message) && e.code !== "TX_PENDENTE");
});
