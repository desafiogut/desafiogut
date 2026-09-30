// MC104 — Frente A: prova do aceite do gate no servidor (LGPD art. 8º §2º).
// Handler REAL (consentimento.mjs) + _lib real, sobre Blobs em memória; auth em duplo que RECUSA o
// que o real recusa (token errado → lança). Bidireccional em cada ponto.
//
// node --test --experimental-test-module-mocks _tests/mc104-consentimento.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const TITULAR = "0xaaa0000000000000000000000000000000000aaa";
const OUTRO   = "0xbbb0000000000000000000000000000000000bbb";
const ADMIN   = "0xccc0000000000000000000000000000000000ccc";

const blobs = new Map();
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async setJSON(k, v) { m.set(k, JSON.stringify(v)); },
      };
    },
  },
});
const sessoes = { "tok-titular": TITULAR, "tok-outro": OUTRO, "tok-admin": ADMIN };
mock.module("../_lib/jwt.mjs", {
  namedExports: {
    verificarUserSession: async (token) => {
      if (typeof token !== "string" || !sessoes[token]) { const e = new Error("inv"); e.code = "ERR_JWS_INVALID"; throw e; }
      return { endereco: sessoes[token], tipo: "user-session" };
    },
  },
});
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [ADMIN] } });
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });

const { default: handler } = await import("../consentimento.mjs");
const lib = await import("../_lib/consentimento.mjs");

const ACEITOS = { lido: true, maiores: true, termos: true, privacidade: true };
const corpo = (extra = {}) => ({ endereco: TITULAR, versao: "2.0", aceitos: ACEITOS, aceiteDeclaradoEm: "2026-09-30T10:00:00.000Z", ...extra });
const post = (body, token = "tok-titular") => handler(new Request("https://x.test/.netlify/functions/consentimento", {
  method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), "x-nf-client-connection-ip": "203.0.113.9" },
  body: JSON.stringify(body),
}));
const get = (endereco, token = "tok-titular") => handler(new Request(`https://x.test/.netlify/functions/consentimento?endereco=${endereco}`, {
  headers: token ? { authorization: `Bearer ${token}` } : {},
}));
const registos = () => [...(blobs.get("consent-log") ?? new Map()).entries()].map(([k, v]) => ({ key: k, ...JSON.parse(v) }));

beforeEach(() => blobs.clear());

test("aceitar → registo gravado no consent-log com data do servidor + declarada + versão + endereço + 4 declarações", async () => {
  const antes = Date.now();
  const res = await post(corpo());
  assert.equal(res.status, 201);
  const r = registos();
  assert.equal(r.length, 1);
  assert.match(r[0].key, new RegExp(`^\\d+:${TITULAR}$`));
  assert.equal(r[0].endereco, TITULAR);
  assert.equal(r[0].termoVersao, "2.0");
  assert.equal(r[0].aceiteDeclaradoEm, "2026-09-30T10:00:00.000Z");
  assert.ok(Date.parse(r[0].aceiteEm) >= antes - 5 && Date.parse(r[0].aceiteEm) <= Date.now() + 5, "aceiteEm = relógio do servidor");
  assert.deepEqual(r[0].aceitos, ACEITOS);
  assert.equal(r[0].contexto, "gate-legal");
  assert.equal(r[0].ip, "203.0.113.9");
});

test("não aceitar (declaração em falta, false, string, extra, versão errada, data inválida) → 400 e SEM registo", async () => {
  const maus = [
    corpo({ aceitos: { lido: true, maiores: true, termos: true } }),
    corpo({ aceitos: { ...ACEITOS, privacidade: false } }),
    corpo({ aceitos: { ...ACEITOS, termos: "true" } }),
    corpo({ aceitos: { ...ACEITOS, extra: true } }),
    corpo({ aceitos: [true, true, true, true] }),
    corpo({ versao: "1.0" }),
    corpo({ versao: 2 }),
    corpo({ aceiteDeclaradoEm: "ontem" }),
    corpo({ aceiteDeclaradoEm: "2026-02-31T10:00:00Z" }),
  ];
  for (const b of maus) {
    const res = await post(b);
    assert.equal(res.status, 400, JSON.stringify(b));
  }
  assert.equal(registos().length, 0);
});

test("aceitar 2× o MESMO aceite → 1 registo (idempotente); um aceite NOVO → 2 registos (histórico)", async () => {
  assert.equal((await post(corpo())).status, 201);
  const r2 = await post(corpo());
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).criado, false);
  assert.equal(registos().length, 1);
  assert.equal((await post(corpo({ aceiteDeclaradoEm: "2026-10-01T09:00:00.000Z" }))).status, 201);
  assert.equal(registos().length, 2);
});

test("dois registos no mesmo milissegundo não se sobrescrevem", async () => {
  const getStore = (await import("@netlify/blobs")).getStore;
  await lib.registrarConsentimento(getStore, { endereco: TITULAR, versao: "2.0", aceitos: ACEITOS, aceiteDeclaradoEm: "2026-09-30T10:00:00.000Z" }, 1000);
  await lib.registrarConsentimento(getStore, { endereco: TITULAR, versao: "2.0", aceitos: ACEITOS, aceiteDeclaradoEm: "2026-09-30T11:00:00.000Z" }, 1000);
  assert.equal(registos().length, 2);
});

test("ler consentimento → histórico do titular, ordenado, com a compra de senhas e SEM o de terceiros", async () => {
  const cl = new Map(); blobs.set("consent-log", cl);
  cl.set(`5000:${TITULAR}`, JSON.stringify({ endereco: TITULAR, contexto: "comprar-senhas", termoVersao: "v2026-05" }));
  cl.set(`6000:${OUTRO}`, JSON.stringify({ endereco: OUTRO, contexto: "gate-legal" }));
  await post(corpo());
  const res = await get(TITULAR);
  assert.equal(res.status, 200);
  const { historico } = await res.json();
  assert.equal(historico.length, 2);
  assert.equal(historico[0].contexto, "comprar-senhas");
  assert.equal(historico[1].contexto, "gate-legal");
  assert.ok(historico.every((h) => h.endereco === TITULAR));
});

test("adulteração: token de OUTRO → 403 sem registo; ADMIN não regista em nome de ninguém; sem token → 401", async () => {
  assert.equal((await post(corpo(), "tok-outro")).status, 403);
  assert.equal((await post(corpo(), "tok-admin")).status, 403);
  assert.equal((await post(corpo(), null)).status, 401);
  assert.equal((await post(corpo(), "tok-falso")).status, 401);
  assert.equal(registos().length, 0);
});

test("leitura: outro → 403; admin → 200; sem token → 401", async () => {
  await post(corpo());
  assert.equal((await get(TITULAR, "tok-outro")).status, 403);
  assert.equal((await get(TITULAR, "tok-admin")).status, 200);
  assert.equal((await get(TITULAR, null)).status, 401);
});

test("HARD GATE 14: o log do registo não tem o endereço completo nem o conteúdo do aceite", async () => {
  const linhas = [];
  const orig = { info: console.info, warn: console.warn, log: console.log };
  for (const k of Object.keys(orig)) console[k] = (...a) => linhas.push(JSON.stringify(a));
  try { await post(corpo()); } finally { Object.assign(console, orig); }
  const tudo = linhas.join("\n");
  assert.ok(!tudo.includes(TITULAR), "endereço completo em log");
  assert.ok(!tudo.includes("203.0.113.9") && !tudo.includes("privacidade"), "conteúdo do aceite em log");
});

test("a versão do servidor é a do gate (fonte única, sem deriva)", () => {
  const jsx = readFileSync(new URL("../../../src/components/TermosConsentimento.jsx", import.meta.url), "utf8");
  const m = jsx.match(/export const VERSAO_CONSENTIMENTO\s*=\s*"([^"]+)"/);
  assert.ok(m, "VERSAO_CONSENTIMENTO não encontrada");
  assert.equal(lib.VERSAO_GATE, m[1]);
});
