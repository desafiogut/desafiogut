// MC37 — Testes de anti-fraude do handler cotas.mjs (baseline → preservados no refactor).
// Cobre: (a) anti-duplicidade CNPJ, (b) anti-Sybil fingerprint, (c) login lookup por
// cliente_id, (d) lookup por email, (e) CRUD admin. Mocka a camada de storage + os
// guards (rate-limit/admin) para exercitar a LÓGICA do handler.
//
// node --test --experimental-test-module-mocks _tests/cotas-anti-fraude.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// --- storage Blob em memória (baseline; após refactor o cotas-store é mockado) ---
const stores = new Map();
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
// guards: permitir (rate-limit ok, admin ok)
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/admin-auth.mjs", { namedExports: { guardAdmin: async () => null } });

let handler;
before(async () => { handler = (await import("../cotas.mjs")).default; });
beforeEach(() => { stores.clear(); });

// Gera um CNPJ válido (mesmos dígitos verificadores que validarCNPJ).
function gerarCnpj(base12) {
  const calc = (arr, len) => { let s = 0, p = len - 7; for (let i = len; i >= 1; i--) { s += arr[len - i] * p--; if (p < 2) p = 9; } return s % 11 < 2 ? 0 : 11 - (s % 11); };
  const a = base12.split("").map(Number);
  const d1 = calc(a, 12); const d2 = calc([...a, d1], 13);
  return base12 + d1 + d2;
}
const CNPJ_A = gerarCnpj("112223330001");
const CNPJ_B = gerarCnpj("114447770001");
const CNPJ_C = gerarCnpj("336015730001");
const ADDR1 = "0x1111111111111111111111111111111111111111";
const ADDR2 = "0x2222222222222222222222222222222222222222";

function reqRegister({ cnpj, empresa, endereco, email, visitorId }) {
  return new Request("http://x/?action=register-corporativo", {
    method: "POST",
    headers: { "content-type": "application/json", "x-visitor-id": visitorId },
    body: JSON.stringify({ cnpj, empresa, endereco, email }),
  });
}
async function json(res) { return { status: res.status, body: await res.json() }; }

test("(a) anti-duplicidade CNPJ: mesmo CNPJ em cliente diferente → 409", async () => {
  const r1 = await json(await handler(reqRegister({ cnpj: CNPJ_A, empresa: "Empresa A", endereco: ADDR1, email: "a@a.com", visitorId: "visitor-aaaaaaaa-1" })));
  assert.equal(r1.status, 201);
  const r2 = await json(await handler(reqRegister({ cnpj: CNPJ_A, empresa: "Empresa B", endereco: ADDR2, email: "b@b.com", visitorId: "visitor-bbbbbbbb-2" })));
  assert.equal(r2.status, 409);
  assert.equal(r2.body.error.code, "cnpj_duplicado");
});

test("(b) anti-Sybil: mesmo fingerprint + CNPJ diferente em 24h → 429", async () => {
  const vid = "visitor-cccccccc-3";
  const r1 = await json(await handler(reqRegister({ cnpj: CNPJ_B, empresa: "Empresa B", endereco: ADDR1, email: "b@b.com", visitorId: vid })));
  assert.equal(r1.status, 201);
  const r2 = await json(await handler(reqRegister({ cnpj: CNPJ_C, empresa: "Empresa C", endereco: ADDR2, email: "c@c.com", visitorId: vid })));
  assert.equal(r2.status, 429);
  assert.equal(r2.body.error.code, "sybil_detectado");
});

test("(c) login lookup por cliente_id → devolve a cota", async () => {
  await handler(reqRegister({ cnpj: CNPJ_A, empresa: "Empresa A", endereco: ADDR1, email: "a@a.com", visitorId: "visitor-dddddddd-4" }));
  const r = await json(await handler(new Request(`http://x/?cliente_id=${ADDR1}`, { method: "GET" })));
  assert.equal(r.status, 200);
  assert.equal(r.body.tipo, "corporativo");
  assert.equal(r.body.cnpj, CNPJ_A);
});

test("(d) lookup por email → devolve o registo", async () => {
  await handler(reqRegister({ cnpj: CNPJ_A, empresa: "Empresa A", endereco: ADDR1, email: "lojista@x.com", visitorId: "visitor-eeeeeeee-5" }));
  const r = await json(await handler(new Request("http://x/?email=lojista@x.com", { method: "GET" })));
  assert.equal(r.status, 200);
  assert.equal(r.body.tipo, "corporativo");
});

test("(e) CRUD admin: upsert + delete", async () => {
  const up = await json(await handler(new Request("http://x/", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ cliente_id: ADDR1, categoria: "bronze", vendida: true, valor: 1000 }),
  })));
  assert.ok(up.status === 200 || up.status === 201);
  assert.equal(up.body.categoria, "bronze");
  const del = await json(await handler(new Request(`http://x/?cliente_id=${ADDR1}`, { method: "DELETE" })));
  assert.equal(del.status, 200);
  assert.equal(del.body.ok, true);
});
