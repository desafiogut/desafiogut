// MC30.1 — Integração: as funções privilegiadas obtêm o signer da fachada
// central (_lib/signer.mjs) e não instanciam mais ethers.Wallet localmente.
// Executar: node --test --experimental-test-module-mocks mc30-integracao.test.mjs
//
// ethers é mockado (Contract/Provider/Wallet fakes) → 100% offline, sem rede.
// Cobre SEG5.1 (adicionarSenhas) e SEG5.2 (comprometerLance) end-to-end através
// de contract.mjs. consolidarResultado (5.3) e abrirEdicao (5.4) usam a MESMA
// fachada `obterSignerCoordenacao`, já validada em mc30-signer.test.mjs.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

const COORD_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

const chamadas = []; // regista métodos chamados no contrato fake

class FakeWallet {
  constructor(_pk, provider) { this.address = COORD_ADDR; this.provider = provider; }
  async signTypedData() { return "0xsig"; }
}
class FakeProvider { constructor(url) { this.url = url; } }
class FakeContract {
  constructor(addr, abi, runner) { this.address = addr; this.runner = runner; }
  async coordenacao() { return COORD_ADDR; }
  async saldoSenhas() { return 7n; }
  async adicionarSenhas(usuario, qtd) {
    chamadas.push(["adicionarSenhas", usuario, Number(qtd)]);
    return { wait: async () => ({ hash: "0xtx1", blockNumber: 100, gasUsed: 21000n }) };
  }
  async comprometerLance(idEdicao, lancador, hash) {
    chamadas.push(["comprometerLance", idEdicao, lancador, hash]);
    return { wait: async () => ({ hash: "0xtx2", blockNumber: 101 }) };
  }
}

mock.module("ethers", {
  namedExports: { Contract: FakeContract, JsonRpcProvider: FakeProvider, Wallet: FakeWallet },
});

process.env.NETWORK_STAGE = "sepolia";          // backend = local-key
process.env.SIGNER_BACKEND = "local-key";
process.env.RPC_URL = "http://localhost:8545";
process.env.COORDENACAO_PRIVATE_KEY = "0xchave-de-teste";

let contract;
before(async () => { contract = await import("../_lib/contract.mjs"); });

test("SEG5.1: creditarSenhas assina via fachada e chama adicionarSenhas", async () => {
  chamadas.length = 0;
  const r = await contract.creditarSenhas("0xABCdef0000000000000000000000000000000001", 3);
  assert.equal(r.txHash, "0xtx1");
  assert.equal(r.blockNumber, 100);
  assert.deepEqual(chamadas.find((c) => c[0] === "adicionarSenhas"),
    ["adicionarSenhas", "0xABCdef0000000000000000000000000000000001", 3]);
  // endereço da coordenação fica disponível de forma síncrona (cache)
  assert.equal(contract.getCoordenacaoAddress().toLowerCase(), COORD_ADDR);
});

test("SEG5.2: comprometerLanceOnchain assina via fachada e chama comprometerLance", async () => {
  chamadas.length = 0;
  const hash = "0x" + "ab".repeat(32);
  const r = await contract.comprometerLanceOnchain("R-1", "0x1111111111111111111111111111111111111111", hash);
  assert.equal(r.txHash, "0xtx2");
  assert.deepEqual(chamadas.find((c) => c[0] === "comprometerLance"),
    ["comprometerLance", "R-1", "0x1111111111111111111111111111111111111111", hash]);
});

test("verificarCoordenacao: signer == coordenacao() → true", async () => {
  assert.equal(await contract.verificarCoordenacao(), true);
});
