// MC102.1b — Frentes B + C: webhook da Frenet (handler REAL) + gravação dos eventos no pedido (lib REAL),
// sobre Blobs em memória. O duplo dos Blobs é o do MC102.0 (fiel ao dist/ do @netlify/blobs 10.0.0: o `setJSON`
// ignora o onlyIfMatch; só o `set` o aplica; ETag por conteúdo).
// node --test --experimental-test-module-mocks _tests/webhook-frenet.test.mjs   (a partir de netlify/functions)

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const etagDe = (v) => `"${createHash("sha1").update(v).digest("hex")}"`;
const blobs = new Map();
const ctx = { ceder: false, conflito: false };
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async getWithMetadata(k, { type } = {}) { const v = m.get(k);
          if (ctx.ceder) await new Promise((r) => setImmediate(r));
          if (v === undefined) return null;
          return { data: type === "json" ? JSON.parse(v) : v, etag: etagDe(v), metadata: {} }; },
        async setJSON(k, o) { const v = JSON.stringify(o); m.set(k, v); return { modified: true, etag: etagDe(v) }; },
        async set(k, v, opt = {}) {
          if (opt.onlyIfMatch && ctx.conflito) return { modified: false };
          if (opt.onlyIfMatch && (!m.has(k) || etagDe(m.get(k)) !== opt.onlyIfMatch)) return { modified: false };
          m.set(k, v); return { modified: true, etag: etagDe(v) }; },
        async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
        async delete(k) { m.delete(k); },
      };
    },
  },
});
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });

const webhook = (await import("../webhook-frenet.mjs")).default;
const L = await import("../_lib/pedidos.mjs");

const SEGREDO = "segredo-do-webhook-de-teste";
const PID = "11111111-2222-3333-4444-555555555555";
const CODIGO = "AA123456789BR";
const chave = `pedido:${PID}`;
const lerPedido = () => JSON.parse(blobs.get("pedidos").get(chave));
const bruto = () => blobs.get("pedidos").get(chave);
const evento = (EventType, EventDateTime) =>
  ({ EventDateTime, EventDescription: "Objeto entregue ao destinatário Maria Silva, CPF 529.982.247-25", EventLocation: "Rua A, 1 - Boa Nova-BA", EventType });
const payload = (evs, TrackingNumber = CODIGO) => ({ OrderId: "PLAT-ORDER-ID", ShipmentId: 21255,
  TrackingUrl: "https://rastreio-h01.frenet.dev/COR/X", TrackingNumber, ServiceDescrition: "SEDEX", TrackingEvents: evs });
const chamar = async (body, { token = SEGREDO, method = "POST", cru = null } = {}) => {
  const headers = { "content-type": "application/json" };
  if (token !== null) headers["x-frenet-token"] = token;
  const r = await webhook(new Request("https://x/.netlify/functions/webhook-frenet", {
    method, headers, ...(method === "POST" ? { body: cru ?? JSON.stringify(body) } : {}) }));
  return { status: r.status, body: await r.json() };
};

beforeEach(() => {
  blobs.clear(); ctx.ceder = false; ctx.conflito = false;
  process.env.FRENET_WEBHOOK_TOKEN = SEGREDO;
  blobs.set("pedidos", new Map([[chave, JSON.stringify({
    produtoId: PID, edicaoId: "RELAMP-9", comprador: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", produtoNome: "Air Fryer",
    morada: { nome: "Maria Silva", cpf: "52998224725" },
    rastreio: { codigo: CODIGO, transportadora: "Correios", enviado_em: "2026-09-20T12:00:00.000Z" }, historico: [],
  })]]));
});

// ── Autenticação ────────────────────────────────────────────────────────────────────────────
test("sem FRENET_WEBHOOK_TOKEN configurado → 503 FAIL-CLOSED, nada gravado", async () => {
  delete process.env.FRENET_WEBHOOK_TOKEN;
  const antes = bruto();
  const r = await chamar(payload([evento("0", "20/09/2026 09:00")]));
  assert.equal(r.status, 503);
  assert.equal(bruto(), antes);
});

test("token errado, ausente, ou com outro tamanho → 401, nada gravado; o certo passa (controlo)", async () => {
  const antes = bruto();
  for (const token of ["errado", null, "", `${SEGREDO}x`, SEGREDO.toUpperCase()]) {
    assert.equal((await chamar(payload([evento("0", "20/09/2026 09:00")]), { token })).status, 401, String(token));
  }
  assert.equal(bruto(), antes);
  assert.equal((await chamar(payload([evento("0", "20/09/2026 09:00")]))).status, 200);
});

test("só POST: GET → 405", async () => {
  assert.equal((await chamar(null, { method: "GET" })).status, 405);
});

// ── Gravação (Frente C) ─────────────────────────────────────────────────────────────────────
test("evento novo → 200 e grava SÓ { data, codigo } (ISO Brasília), via CAS; nada da Frenet além disso", async () => {
  const r = await chamar(payload([evento("9", "24/09/2026 16:48")]));
  assert.deepEqual(r, { status: 200, body: { ok: true, duplicado: false } });
  const p = lerPedido();
  assert.deepEqual(p.rastreio.eventos, [{ data: "2026-09-24T16:48:00-03:00", codigo: "4" }]);
  assert.equal(p.historico.at(-1).evento, "rastreio_atualizado");
  assert.deepEqual(Object.keys(p.rastreio).sort(), ["codigo", "enviado_em", "eventos", "transportadora"]);
  assert.doesNotMatch(JSON.stringify(p.rastreio), /Boa Nova|Rua A|entregue ao|PLAT-ORDER|21255|frenet\.dev|SEDEX/);
});

test("HARD GATE 14: o MESMO evento reenviado → 200 duplicado, e o blob fica BYTE a BYTE igual (não grava)", async () => {
  await chamar(payload([evento("1", "21/09/2026 10:30")]));
  const depoisDo1 = bruto();
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(await chamar(payload([evento("1", "21/09/2026 10:30")])), { status: 200, body: { ok: true, duplicado: true } });
  }
  assert.equal(bruto(), depoisDo1);
  assert.equal(lerPedido().rastreio.eventos.length, 1);
});

test("a mesma hora com OUTRO tipo, ou o mesmo tipo noutra hora, NÃO é duplicado", async () => {
  await chamar(payload([evento("1", "21/09/2026 10:30")]));
  await chamar(payload([evento("5", "21/09/2026 10:30")]));
  await chamar(payload([evento("1", "22/09/2026 10:30")]));
  assert.deepEqual(lerPedido().rastreio.eventos.map((e) => `${e.codigo}@${e.data.slice(0, 10)}`), ["1@2026-09-21", "3@2026-09-21", "1@2026-09-22"]);
});

test("a sequência real (um evento por chamada, como a Frenet envia) acumula-se e a timeline chega a Entregue", async () => {
  const seq = [["0", "20/09/2026 09:00"], ["1", "21/09/2026 10:30"], ["5", "24/09/2026 08:10"], ["9", "24/09/2026 16:48"]];
  for (const [t, d] of seq) assert.equal((await chamar(payload([evento(t, d)]))).status, 200);
  assert.deepEqual(lerPedido().rastreio.eventos.map((e) => e.codigo), ["0", "1", "3", "4"]);
  const { timelineDoRastreio } = await import("../../../src/lib/rastreio.js");
  const t = timelineDoRastreio(lerPedido().rastreio);
  assert.equal(t.passos.length, 5);
  assert.ok(t.passos.every((p) => p.feito));
});

test("TrackingNumber de nenhum pedido → 200 ignorado (a Frenet não reenvia), nada gravado", async () => {
  const antes = bruto();
  assert.deepEqual(await chamar(payload([evento("0", "20/09/2026 09:00")], "ZZ999999999BR")),
    { status: 200, body: { ok: true, ignorado: "pedido_nao_encontrado" } });
  assert.equal(bruto(), antes);
});

test("TrackingNumber em minúsculas/espaços casa com o pedido", async () => {
  assert.equal((await chamar(payload([evento("0", "20/09/2026 09:00")], "  aa123456789br "))).body.duplicado, false);
  assert.equal(lerPedido().rastreio.eventos.length, 1);
});

test("só EventType não mapeados → 200 ignorado, nada gravado", async () => {
  const antes = bruto();
  assert.equal((await chamar(payload([evento("7", "20/09/2026 09:00")]))).body.ignorado, "sem_eventos_mapeados");
  assert.equal(bruto(), antes);
});

test("corpo inválido → 400: JSON partido, sem TrackingNumber", async () => {
  assert.equal((await chamar(null, { cru: "{partido" })).status, 400);
  assert.equal((await chamar({ TrackingEvents: [] })).status, 400);
});

test("CAS em conflito permanente → 503 (a Frenet volta a tentar) e nada gravado", async () => {
  const antes = bruto();
  ctx.conflito = true;
  const r = await chamar(payload([evento("0", "20/09/2026 09:00")]));
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, "conflito_escrita");
  assert.equal(bruto(), antes);
});

test("dois webhooks EM PARALELO com eventos diferentes → os DOIS ficam gravados (CAS + retry do MC102.0)", async () => {
  ctx.ceder = true;
  const [a, b] = await Promise.all([chamar(payload([evento("0", "20/09/2026 09:00")])), chamar(payload([evento("1", "21/09/2026 10:30")]))]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.deepEqual(lerPedido().rastreio.eventos.map((e) => e.codigo).sort(), ["0", "1"]);
});

// ── Lib directamente (Frente C) ──────────────────────────────────────────────────────────────
test("registrarEventosRastreio: campos a mais (local, descrição) NÃO entram — só data e código", async () => {
  const r = await L.registrarEventosRastreio(PID, CODIGO, [{ data: "2026-09-20T09:00:00-03:00", codigo: "0", local: "Rua A", descricao: "Maria", cpf: "1" }]);
  assert.equal(r.ok, true);
  assert.deepEqual(lerPedido().rastreio.eventos, [{ data: "2026-09-20T09:00:00-03:00", codigo: "0" }]);
});

test("registrarEventosRastreio: > 50 eventos → ficam os 50 MAIS RECENTES", async () => {
  const muitos = Array.from({ length: 60 }, (_, i) => ({ data: new Date(Date.UTC(2026, 8, 1, i)).toISOString(), codigo: "1" }));
  await L.registrarEventosRastreio(PID, CODIGO, muitos);
  const evs = lerPedido().rastreio.eventos;
  assert.equal(evs.length, 50);
  assert.equal(L.MAX_EVENTOS_RASTREIO, 50);
  assert.equal(evs[0].data, muitos[10].data);
  assert.equal(evs.at(-1).data, muitos[59].data);
});

test("registrarEventosRastreio: código de rastreio diferente do do pedido → rastreio_diferente, nada gravado", async () => {
  const antes = bruto();
  assert.equal((await L.registrarEventosRastreio(PID, "BB000000000BR", [{ data: "x", codigo: "0" }])).code, "rastreio_diferente");
  assert.equal(bruto(), antes);
});

test("registrarEventosRastreio: pedido sem rastreio ou inexistente → pedido_nao_encontrado", async () => {
  assert.equal((await L.registrarEventosRastreio("nao-existe", CODIGO, [{ data: "x", codigo: "0" }])).code, "pedido_nao_encontrado");
});
