// MC39.17.1 — Testes de regressão dos 2 bloqueadores P0 da auditoria MC39.17.
// Executar: node --test --experimental-test-module-mocks mc39171-p0-fixes.test.mjs
//
// B-P0-1: purge-lances.mjs era destrutivo SEM autenticação. Agora exige guardAdmin
//         como 1ª checagem — requisição não-admin é rejeitada ANTES de tocar os Blobs.
// B-P0-2: comprar-senhas.mjs chamava sistemaPausado(await lerEstadoSistema()) sem o
//         import → ReferenceError em todo POST. Agora o import existe: o handler passa
//         da linha do kill-switch sem ReferenceError e respeita o estado do sistema.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// ── Fixtures mutáveis partilhadas pelos mocks ───────────────────────────────
let denyResp     = null;   // guardAdmin: null = autorizado; Response = negado
let getStoreCalls = 0;     // quantas vezes purge-lances abriu um Blob store
let pausado      = false;  // estado simulado do kill-switch (comprar-senhas)

// Blob store fake: get→null (nada a apagar), list→vazio, delete contável.
function fakeStore() {
  return {
    get:     async () => null,
    delete:  async () => {},
    list:    async () => ({ blobs: [] }),
    setJSON: async () => {},
  };
}

mock.module("../_lib/admin-auth.mjs", {
  namedExports: { guardAdmin: async () => denyResp },
});
mock.module("@netlify/blobs", {
  namedExports: { getStore: () => { getStoreCalls += 1; return fakeStore(); } },
});
mock.module("../_lib/rate-limiter.mjs", {
  namedExports: { aplicarRateLimit: async () => null },
});
mock.module("../_lib/system-state.mjs", {
  namedExports: {
    lerEstadoSistema: async () => ({ status: pausado ? "paused" : "ok" }),
    sistemaPausado:   (estado) => estado?.status === "paused",
  },
});

let purge, comprar;
before(async () => {
  purge   = await import("../purge-lances.mjs");
  comprar = await import("../comprar-senhas.mjs");
});

function reqMock({ body = {}, method = "POST", headers = {} } = {}) {
  return {
    method,
    headers: { get: (k) => headers[String(k).toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  };
}

// ── B-P0-1: purge-lances exige admin ANTES de qualquer operação destrutiva ──
test("purge-lances: requisição não-admin é rejeitada (guardAdmin) sem tocar nos Blobs", async () => {
  getStoreCalls = 0;
  denyResp = new Response(JSON.stringify({ error: { code: "admin_token_ausente" } }), { status: 401 });
  const resp = await purge.default(reqMock({ body: { edicaoId: "R-1" } }));
  assert.equal(resp.status, 401, "sem credencial admin → 401");
  assert.equal(getStoreCalls, 0, "auth deve bloquear ANTES de abrir qualquer Blob store");
  denyResp = null;
});

test("purge-lances: admin autorizado prossegue e responde ok", async () => {
  getStoreCalls = 0;
  denyResp = null;
  const resp = await purge.default(reqMock({ body: { edicaoId: "R-1" } }));
  assert.equal(resp.status, 200, "admin autorizado → 200");
  const json = await resp.json();
  assert.equal(json.ok, true);
  assert.equal(json.purged, "R-1");
  assert.ok(getStoreCalls > 0, "fluxo destrutivo só roda após auth");
});

test("purge-lances: método != POST → 405", async () => {
  const resp = await purge.default(reqMock({ method: "GET" }));
  assert.equal(resp.status, 405);
});

// ── B-P0-2: comprar-senhas não lança ReferenceError (import system-state) ───
test("comprar-senhas: passa do kill-switch sem ReferenceError (sistema ok → segue p/ auth 401)", async () => {
  pausado = false;
  // Sem Authorization → após o kill-switch o handler deve chegar à checagem de token.
  const resp = await comprar.default(reqMock({ body: { endereco: "0x1", qtd: 1 } }));
  assert.equal(resp.status, 401, "sem token → 401 (provou que não houve ReferenceError na linha do kill-switch)");
  const json = await resp.json();
  assert.equal(json.error.code, "token_ausente");
});

test("comprar-senhas: kill-switch ativo → 503 sistema_pausado", async () => {
  pausado = true;
  const resp = await comprar.default(reqMock({ body: { endereco: "0x1", qtd: 1 } }));
  assert.equal(resp.status, 503, "sistema pausado → 503");
  const json = await resp.json();
  assert.equal(json.error.code, "sistema_pausado");
  pausado = false;
});
