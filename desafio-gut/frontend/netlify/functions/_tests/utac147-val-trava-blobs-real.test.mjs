// UTAC147-val (SEG4, validador adversarial) — a trava do lance contra a biblioteca REAL do @netlify/blobs.
//
// Os testes do executor (mc9112) trocam o `@netlify/blobs` inteiro por um duplo. O duplo imita o 412 e o etag vazio,
// mas NÃO imita o `fetchAndRetry` da biblioteca real: um PUT com `If-None-Match: *` cuja resposta se perde (erro de
// rede ou 5xx) é REPETIDO pela própria biblioteca. Se a 1.ª tentativa já tinha gravado a trava no servidor, a
// repetição recebe 412 ⇒ `{ modified:false }` ⇒ o pedido julgava que a trava era de OUTRO pedido e respondia 409
// sem nunca gastar o Passe nem libertar a trava. Como a `idempotencyKey` do CardLance é determinística
// (keccak256(endereco:valor:edição)), esse valor ficava bloqueado para sempre para aquele utilizador.
//
// Aqui: `getStore` devolve um Store REAL (cópia da dist importada por URL com query, para escapar ao mock) ligado a
// um servidor Blobs falso em memória (fetch injectado) com a semântica HTTP do Netlify (If-None-Match ⇒ 412).
process.env.NODE_ENV = "test"; // a biblioteca real usa 1 ms de espera entre repetições em NODE_ENV=test
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

const TEST_ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";

// ── Servidor Blobs falso (HTTP) ────────────────────────────────────────────────────────────────────────────
const objetos = new Map(); // url-path → { corpo, etag }
let nEtag = 0;
let perderRespostaDoPutDe = null; // chave cujo PRÓXIMO PUT grava mas a resposta se perde (erro de rede)
let putsComCondicao = 0;
async function fetchFalso(url, opt = {}) {
  const u = new URL(url);
  const caminho = decodeURIComponent(u.pathname);
  const metodo = (opt.method || "get").toLowerCase();
  const h = opt.headers || {};
  if (metodo === "put") {
    if (h["if-none-match"] === "*") {
      putsComCondicao += 1;
      if (objetos.has(caminho)) return new Response(null, { status: 412 });
    }
    const etag = `"e${++nEtag}"`;
    objetos.set(caminho, { corpo: String(opt.body), etag });
    if (perderRespostaDoPutDe && caminho.endsWith(`/${perderRespostaDoPutDe}`)) {
      perderRespostaDoPutDe = null;
      throw new TypeError("fetch failed (resposta perdida depois de gravar)");
    }
    return new Response(null, { status: 200, headers: { etag } });
  }
  if (metodo === "get") {
    const o = objetos.get(caminho);
    if (!o) return new Response(null, { status: 404 });
    return new Response(o.corpo, { status: 200, headers: { etag: o.etag } });
  }
  if (metodo === "delete") { objetos.delete(caminho); return new Response(null, { status: 204 }); }
  return new Response(null, { status: 405 });
}

// A biblioteca REAL, numa instância de módulo própria (a query muda o URL ⇒ o mock de "@netlify/blobs" não a apanha).
const real = await import(new URL("../node_modules/@netlify/blobs/dist/main.js?val147=real", import.meta.url).href);
const lojaReal = (name) => real.getStore({
  name, siteID: "site-val147", token: "tok",
  edgeURL: "https://edge.blobs.test", uncachedEdgeURL: "https://uncached.blobs.test", fetch: fetchFalso,
});

// ── Inventário de Passes (duplo com a semântica das RPCs) ──────────────────────────────────────────────────
let passes = 0;
let consumos = 0;
let devolucoes = 0;
mock.module("../_lib/passes-inventario.mjs", {
  namedExports: {
    consumirPasse: async () => { consumos += 1; if (passes < 1) return { ok: false, code: "sem_passes" }; passes -= 1; return { ok: true, restantes: passes }; },
    devolverPasse: async () => { devolucoes += 1; passes += 1; return { ok: true }; },
  },
});
mock.module("@netlify/blobs", { namedExports: { getStore: ({ name }) => lojaReal(name) } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarLanceAuth: async () => ({ endereco: TEST_ADDR }) } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/rbac.mjs", { namedExports: { getRole: async () => ({ role: "user" }) } });
mock.module("../_lib/require-mfa.mjs", { namedExports: { requireMfa: () => null } });
mock.module("../_lib/system-state.mjs", { namedExports: { lerEstadoSistema: async () => ({}), sistemaPausado: () => false } });
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { registrarEventosDeLance: async () => {} } });
let addLances = 0;
mock.module("../_lib/data-store.mjs", { namedExports: { addLance: async (e, r) => { addLances += 1; return `key-${r.lanceId}`; } } });
mock.module("../_lib/contract.mjs", { namedExports: { comprometerLanceOnchain: async () => ({}), lerSaldoSenhas: async () => 0 } });
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => ({ id: "R-VAL", tipo: "relampago" }) } });
mock.module("../_lib/saldoRs.mjs", { namedExports: { debitarSaldoRs: async () => ({ ok: false, code: "nao_usado" }) } });
mock.module("../_lib/cors.mjs", { namedExports: { respostaPreflight: () => null, CABECALHOS_CORS: {}, cabecalhosCors: () => ({}) /* UTAC153 */ } });

let handler;
before(async () => {
  process.env.NETWORK_STAGE = "mainnet";
  handler = (await import("../lance-relampago.mjs")).default;
});

const req = (body) => ({
  method: "POST",
  headers: { get: (h) => (h === "authorization" ? "Bearer t" : null) },
  text: async () => JSON.stringify(body),
  url: "http://localhost/.netlify/functions/lance-relampago",
});
const KEY = "0x" + "ab".repeat(32);
const corpo = () => ({ endereco: TEST_ADDR, valorCentavos: 37, edicaoId: "R-VAL", idempotencyKey: KEY });
function zerar() { objetos.clear(); passes = 2; consumos = 0; devolucoes = 0; addLances = 0; putsComCondicao = 0; perderRespostaDoPutDe = null; }

test("V1 · (controlo positivo) com a biblioteca REAL: 1.º pedido 201 e gasta 1 Passe; repetir a chave ⇒ 200 idempotente, sem 2.º Passe", async () => {
  zerar();
  const r1 = await handler(req(corpo()));
  assert.equal(r1.status, 201);
  assert.equal(passes, 1);
  const r2 = await handler(req(corpo()));
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).idempotent, true);
  assert.equal(passes, 1, "a repetição gastou outro Passe");
  assert.equal(addLances, 1);
});

test("V2 · a trava de OUTRO pedido em curso (já existe no servidor) ⇒ 409 e nenhum Passe gasto", async () => {
  zerar();
  objetos.set(`/site-val147/site:lance-idem/trava:${KEY}`, { corpo: JSON.stringify({ endereco: TEST_ADDR, lanceId: "outro" }), etag: '"x"' });
  const r = await handler(req(corpo()));
  assert.equal(r.status, 409);
  assert.equal(consumos, 0);
  assert.equal(passes, 2);
});

test("V3 · a resposta do PUT da trava perde-se DEPOIS de gravar (a biblioteca repete e recebe 412) ⇒ o lance segue: 201, 1 Passe, 1 lance", async () => {
  zerar();
  perderRespostaDoPutDe = `trava:${KEY}`;
  const r = await handler(req(corpo()));
  assert.ok(putsComCondicao >= 2, `a biblioteca real não repetiu o PUT (${putsComCondicao})`);
  assert.equal(r.status, 201, `a trava gravada pelo PRÓPRIO pedido foi tomada por alheia (status ${r.status})`);
  assert.equal(passes, 1);
  assert.equal(addLances, 1);
  // e repetir a mesma chave continua idempotente
  const r2 = await handler(req(corpo()));
  assert.equal(r2.status, 200);
  assert.equal(passes, 1);
});

test("V4 · 5xx persistente no PUT (sem etag) com a biblioteca real ⇒ 503 fail-closed, nenhum Passe gasto", async () => {
  zerar();
  const original = fetchFalsoPut5xx.ativo;
  fetchFalsoPut5xx.ativo = true;
  try {
    const r = await handler(req(corpo()));
    assert.equal(r.status, 503);
    assert.equal(consumos, 0);
    assert.equal(passes, 2);
  } finally { fetchFalsoPut5xx.ativo = original; }
});

// Interruptor do V4: todos os PUT respondem 500 sem etag (a biblioteca repete 5× e devolve { etag:"", modified:true }).
const fetchFalsoPut5xx = { ativo: false };
const fetchBase = fetchFalso;
// eslint-disable-next-line no-func-assign
fetchFalso = async (url, opt = {}) => {
  if (fetchFalsoPut5xx.ativo && (opt.method || "").toLowerCase() === "put") return new Response(null, { status: 500 });
  return fetchBase(url, opt);
};
