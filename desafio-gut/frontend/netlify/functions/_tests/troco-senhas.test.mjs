// MC17.1/MC36.1 — Testes do ledger de senhas de troco (offline).
// MC36.1: troco em Supabase (troco-senhas-store) — mocka o store + fallback (vazio).
// Executar: node --test --experimental-test-module-mocks troco-senhas.test.mjs
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// mem: cliente_id -> JSON string do payload (os testes de expiração inserem direto).
const mem = new Map();
mock.module("../_lib/troco-senhas-store.mjs", {
  namedExports: {
    getTroco:  async (id) => { const v = mem.get(String(id)); return v === undefined ? null : JSON.parse(v); },
    setTroco:  async (id, payload) => { mem.set(String(id), JSON.stringify(payload)); },
    listTroco: async () => [...mem.entries()].map(([cliente_id, v]) => ({ cliente_id, payload: JSON.parse(v) })),
  },
});
mock.module("../_lib/financeiro-fallback.mjs", {
  namedExports: { lerTrocoLegado: async () => null },
});

let mod;
before(async () => { mod = await import("../_lib/troco-senhas.mjs"); });

const ADDR = "0xabc0000000000000000000000000000000000001";

test("senhasDoExcedente: R$160 -> 80 senhas", () => {
  assert.equal(mod.senhasDoExcedente(16000), 80);
  assert.equal(mod.senhasDoExcedente(0), 0);
  assert.equal(mod.senhasDoExcedente(199), 0); // < R$2 não gera senha
});

test("creditar + ler saldo", async () => {
  mem.clear();
  await mod.creditarTroco({ endereco: ADDR, senhas: 80, origem: "excedente-bronze" });
  const t = await mod.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 80);
});

test("FIFO: consome lotes mais antigos primeiro", async () => {
  mem.clear();
  await mod.creditarTroco({ endereco: ADDR, senhas: 30, origem: "lote-A", idemKey: "A" });
  await mod.creditarTroco({ endereco: ADDR, senhas: 50, origem: "lote-B", idemKey: "B" });
  const r = await mod.consumirTrocoFIFO({ endereco: ADDR, qtd: 40 });
  assert.equal(r.ok, true);
  assert.equal(r.restante, 40); // 80 - 40
  const t = await mod.lerTroco(ADDR);
  // lote A (30) consumido inteiro + 10 do B => resta 40 do B
  assert.equal(t.saldoTroco, 40);
  assert.equal(t.lotes.length, 1);
  assert.equal(t.lotes[0].origem, "lote-B");
});

test("consumo insuficiente falha sem alterar saldo", async () => {
  mem.clear();
  await mod.creditarTroco({ endereco: ADDR, senhas: 5 });
  const r = await mod.consumirTrocoFIFO({ endereco: ADDR, qtd: 10 });
  assert.equal(r.ok, false);
  assert.equal(r.code, "troco_insuficiente");
  const t = await mod.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 5);
});

test("idempotência por idemKey não duplica", async () => {
  mem.clear();
  await mod.creditarTroco({ endereco: ADDR, senhas: 20, idemKey: "cota-x" });
  await mod.creditarTroco({ endereco: ADDR, senhas: 20, idemKey: "cota-x" });
  const t = await mod.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 20);
});

test("expiração: lote vencido é removido e contado", async () => {
  mem.clear();
  const ontem = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  mem.set(ADDR.toLowerCase(), JSON.stringify({
    lotes: [{ id: "velho", senhas: 12, origem: "x", criadoEm: ontem, expiraEm: ontem }],
    expiradosAcum: 0, senhasExpiradasAcum: 0, atualizadoEm: ontem,
  }));
  const t = await mod.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 0);
  assert.equal(t.senhasExpiradasAgora, 12);
});

test("aviso 5 dias: lote que expira em 3 dias entra em expiramEmBreve", async () => {
  mem.clear();
  const agora = Date.now();
  const cria = new Date(agora).toISOString();
  const exp3d = new Date(agora + 3 * 24 * 3600 * 1000).toISOString();
  mem.set(ADDR.toLowerCase(), JSON.stringify({
    lotes: [{ id: "quase", senhas: 7, origem: "x", criadoEm: cria, expiraEm: exp3d }],
    expiradosAcum: 0, senhasExpiradasAcum: 0, atualizadoEm: cria,
  }));
  const t = await mod.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 7);
  assert.equal(t.expiramEmBreve, 7);
});

test("resumoTrocoAdmin agrega ativos e expirados", async () => {
  mem.clear();
  await mod.creditarTroco({ endereco: ADDR, senhas: 100 });
  const resumo = await mod.resumoTrocoAdmin();
  assert.equal(resumo.lojistas, 1);
  assert.equal(resumo.senhasAtivas, 100);
});
