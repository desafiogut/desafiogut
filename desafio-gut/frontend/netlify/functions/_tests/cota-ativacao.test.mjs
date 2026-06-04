// MC17.1 — Testes da ativação automática de cota (offline, mock @netlify/blobs).
// node --test --experimental-test-module-mocks _tests/cota-ativacao.test.mjs
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

const stores = new Map(); // name -> Map(key -> json string)
function getStoreMock({ name }) {
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name);
  return {
    async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
    async setJSON(k, o) { m.set(k, JSON.stringify(o)); },
    async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
    async delete(k) { m.delete(k); },
  };
}
mock.module("@netlify/blobs", { namedExports: { getStore: getStoreMock } });

let cota, troco;
before(async () => {
  cota  = await import("../_lib/cota-ativacao.mjs");
  troco = await import("../_lib/troco-senhas.mjs");
});

const ADDR = "0xDe70000000000000000000000000000000000009";

test("ativa cota Bronze e credita troco do excedente (R$500 -> 80 senhas)", async () => {
  stores.clear();
  const r = await cota.ativarCotaPaga({ pedidoId: "p1", endereco: ADDR, categoria: "bronze", produtoValor: 500 });
  assert.equal(r.ok, true);
  assert.equal(r.idempotent, false);
  assert.equal(r.resultado.troco.senhas, 80); // (660-500)/2
  const reg = await getStoreMock({ name: "cotas" }).get(ADDR.toLowerCase(), { type: "json" });
  assert.equal(reg.vendida, true);
  assert.equal(reg.categoria, "bronze");
  const t = await troco.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 80);
});

test("idempotência por pedidoId não duplica troco nem reativa", async () => {
  // mesmo pedidoId do teste anterior NÃO deve creditar mais troco
  const r2 = await cota.ativarCotaPaga({ pedidoId: "p1", endereco: ADDR, categoria: "bronze", produtoValor: 500 });
  assert.equal(r2.idempotent, true);
  const t = await troco.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 80); // continua 80, não 160
});

test("produto >= mínimo não gera troco mas ativa a cota", async () => {
  stores.clear();
  const r = await cota.ativarCotaPaga({ pedidoId: "p2", endereco: ADDR, categoria: "ouro", produtoValor: 3000 });
  assert.equal(r.ok, true);
  assert.equal(r.resultado.troco, null); // 3000 >= 2250
  const reg = await getStoreMock({ name: "cotas" }).get(ADDR.toLowerCase(), { type: "json" });
  assert.equal(reg.categoria, "ouro");
  assert.equal(reg.vendida, true);
});

test("categoria inválida falha", async () => {
  const r = await cota.ativarCotaPaga({ pedidoId: "p3", endereco: ADDR, categoria: "platina", produtoValor: 100 });
  assert.equal(r.ok, false);
  assert.equal(r.code, "categoria_invalida");
});

test("preserva tipo corporativo existente ao ativar", async () => {
  stores.clear();
  await getStoreMock({ name: "cotas" }).setJSON(ADDR.toLowerCase(),
    { cliente_id: ADDR, tipo: "corporativo", empresa: "Loja X", cnpj: "11222333000181" });
  await cota.ativarCotaPaga({ pedidoId: "p4", endereco: ADDR, categoria: "prata", produtoValor: 1000 });
  const reg = await getStoreMock({ name: "cotas" }).get(ADDR.toLowerCase(), { type: "json" });
  assert.equal(reg.tipo, "corporativo");
  assert.equal(reg.empresa, "Loja X");
  assert.equal(reg.categoria, "prata");
  assert.equal(reg.vendida, true);
});
