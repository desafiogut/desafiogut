// MC17.4.1 — Teste do throttle anti-Sybil por IP (registrarTentativaConversaoIp).
//
// Arquitetura (decisão do utilizador): a recompensa imediata no registo reutiliza
// registrarConversao (já coberto por test-conversao-e2e-mc1581.mjs: crédito +1/+1
// e idempotência). NÃO foi criado um endpoint processar-referral.mjs nem o marcador
// referral-pago. Este ficheiro cobre a ÚNICA lógica nova: o limite por IP/hora.
//
// (Em _tests/, sob underscore, como _lib/: NÃO é publicado como função Netlify.)
// Uso (a partir de desafio-gut/frontend):
//   node --test --experimental-test-module-mocks netlify/functions/_tests/mc1741-referral-ip-throttle.test.mjs

import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// ── Mocks em memória (mesmo padrão de test-conversao-e2e-mc1581.mjs) ──────────
const mem = new Map(); // storeName -> Map(key -> value)
function fakeGetStore({ name }) {
  if (!mem.has(name)) mem.set(name, new Map());
  const m = mem.get(name);
  return {
    async get(key) { return m.has(key) ? m.get(key) : null; },
    async setJSON(key, val) { m.set(key, JSON.parse(JSON.stringify(val))); },
    async list({ prefix } = {}) {
      const blobs = [...m.keys()].filter((k) => !prefix || k.startsWith(prefix)).map((key) => ({ key }));
      return { blobs };
    },
  };
}
const libURL = (f) => new URL(`../_lib/${f}`, import.meta.url).href;

mock.module("@netlify/blobs", { namedExports: { getStore: fakeGetStore } });
mock.module(libURL("contract.mjs"), { namedExports: {
  creditarSenhas: async () => ({ txHash: "0xtest" }), lerSaldoSenhas: async () => 0, CONTRATO_ADDRESS: "0xC0",
} });
mock.module(libURL("sybil-check.mjs"), { namedExports: {
  checkSybil: async () => ({ suspeito: false, addresses: [] }), registerVisitor: async () => {},
} });
mock.module(libURL("sentry-server.mjs"), { namedExports: { captureSecurityAlert: async () => {} } });

let ref;
before(async () => { ref = await import(libURL("referral.mjs")); });

test("sem IP → fail-open (não bloqueia)", async () => {
  const r = await ref.registrarTentativaConversaoIp(null);
  assert.equal(r.ok, true);
  assert.equal(r.fonte, "sem-ip");
});

test("permite 2 conversões por IP/hora e bloqueia a 3.ª", async () => {
  const ip = "203.0.113.7";
  const r1 = await ref.registrarTentativaConversaoIp(ip);
  const r2 = await ref.registrarTentativaConversaoIp(ip);
  const r3 = await ref.registrarTentativaConversaoIp(ip);
  assert.equal(r1.ok, true);  assert.equal(r1.count, 1);
  assert.equal(r2.ok, true);  assert.equal(r2.count, 2);
  assert.equal(r3.ok, false); // excedeu o limite (>2)
  assert.equal(r3.limite, 2);
});

test("IPs diferentes têm contadores independentes", async () => {
  const a = await ref.registrarTentativaConversaoIp("198.51.100.1");
  const b = await ref.registrarTentativaConversaoIp("198.51.100.2");
  assert.equal(a.ok, true); assert.equal(a.count, 1);
  assert.equal(b.ok, true); assert.equal(b.count, 1);
});

test("o IP é guardado como hash (não em claro)", async () => {
  const ip = "192.0.2.55";
  await ref.registrarTentativaConversaoIp(ip);
  const store = mem.get("referral-ip");
  const chaves = [...store.keys()];
  assert.ok(chaves.length > 0);
  assert.ok(chaves.every((k) => !k.includes(ip)), "nenhuma chave deve conter o IP em claro");
});
