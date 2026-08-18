// MC91.11 — Testes do ledger de consumo de senhas em lances programados.
// Executar: node --experimental-test-module-mocks --test mc9111-programado.test.mjs
//
// Cobre: gate on-chain (saldo >= 1), consumo CAS com teto (consumidas < saldo),
// persistência entre chamadas, chave por endereço (lowercase), store ausente.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// Store in-memory compartilhado (mesmo padrão do mc28-keyperbid).
const mem = new Map();
const fakeStore = {
  async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
  async get(k, { type } = {}) {
    const v = mem.get(k);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  },
  async delete(k) { mem.delete(k); },
};

mock.module("@netlify/blobs", { namedExports: { getStore: () => fakeStore } });

let lib;
before(async () => { lib = await import("../_lib/senhas-programado.mjs"); });

const ENDERECO = "0xAbCdEf0000000000000000000000000000000001";

test("chaveConsumo: endereço minúsculo", () => {
  assert.equal(lib.chaveConsumo(ENDERECO), "0xabcdef0000000000000000000000000000000001");
});

test("sem saldo on-chain → senhas_insuficientes (gate)", async () => {
  mem.clear();
  const r = await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.code, "senhas_insuficientes");
  assert.equal(r.saldoOnChain, 0);
});

test("store ausente → store_indisponivel", async () => {
  mem.clear();
  const r = await lib.registrarConsumoSenha({ store: null, endereco: ENDERECO, saldoOnChain: 3 });
  assert.equal(r.ok, false);
  assert.equal(r.code, "store_indisponivel");
});

test("consumo: 1 lance consome 1 senha e persiste", async () => {
  mem.clear();
  const r1 = await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 3, edicaoId: "PROG-1" });
  assert.equal(r1.ok, true);
  assert.equal(r1.consumidas, 1);
  const r2 = await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 3, edicaoId: "PROG-1" });
  assert.equal(r2.ok, true);
  assert.equal(r2.consumidas, 2);
  // Persistido (relê do store)
  const lido = await lib.lerConsumoSenhas(fakeStore, ENDERECO);
  assert.equal(lido.consumidas, 2);
  assert.equal(lido.ultimoLance.edicaoId, "PROG-1");
});

test("teto: consumidas >= saldo on-chain → recusa (senhas_insuficientes)", async () => {
  mem.clear();
  // saldo on-chain = 2 → 2 lances ok, 3º recusado
  assert.equal((await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 2 })).ok, true);
  assert.equal((await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 2 })).ok, true);
  const r3 = await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 2 });
  assert.equal(r3.ok, false);
  assert.equal(r3.code, "senhas_insuficientes");
  assert.equal(r3.consumidas, 2);
  assert.equal(r3.saldoOnChain, 2);
});

test("ledger é por endereço (outro endereço não é afetado)", async () => {
  mem.clear();
  await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 5 });
  const outro = await lib.lerConsumoSenhas(fakeStore, "0x9999999999999999999999999999999999999999");
  assert.equal(outro.consumidas, 0);
});

test("saldo on-chain maior libera mais consumo (teto dinâmico)", async () => {
  mem.clear();
  await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 1 });
  // comprou mais 1 senha: saldo on-chain agora 2 → 1 consumo adicional ok
  const r = await lib.registrarConsumoSenha({ store: fakeStore, endereco: ENDERECO, saldoOnChain: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.consumidas, 2);
});
