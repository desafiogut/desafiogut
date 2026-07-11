// MC72 — Testes de AUTORIZAÇÃO do handler delete-account.mjs.
// Mocka as dependências (jwt, admin, blobs, supabase, conta-delete) para isolar
// o guard: sem token → 401; token de outro endereço → 403; owner → 200 e a
// exclusão SÓ é chamada quando autorizado (anti-IDOR).
// node --test --experimental-test-module-mocks _tests/mc72-delete-account-auth.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const OWNER = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";

let excluiuCom = [];            // registra chamadas a excluirConta (deve ficar vazio se negado)
let sessionValida = null;       // payload devolvido por verificarUserSession
let adminList = [];             // lista de admins (mutável entre testes)

mock.module("../_lib/jwt.mjs", {
  namedExports: {
    verificarUserSession: async (token) => {
      if (!sessionValida || token !== "tok-ok") {
        const e = new Error("invalido"); e.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED"; throw e;
      }
      return sessionValida;
    },
  },
});
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => adminList } });
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/supabase-client.mjs", {
  namedExports: { getSupabase: () => ({}), supabaseConfigurado: () => true },
});
mock.module("@netlify/blobs", { namedExports: { getStore: () => ({}) } });
mock.module("../_lib/conta-delete.mjs", {
  namedExports: {
    excluirConta: async ({ endereco, dryRun }) => {
      excluiuCom.push({ endereco, dryRun });
      return {
        endereco, dryRun, executadoEm: "t", ok: true, erros: [],
        supabase: { deletado: {}, anonimizado: {} }, blobs: { deletado: {}, anonimizado: {} }, retido: [],
      };
    },
  },
});

let handler;
before(async () => { handler = (await import("../delete-account.mjs")).default; });
beforeEach(() => { excluiuCom = []; sessionValida = null; adminList = []; });

function reqPost(body, headers = {}) {
  return new Request("https://x/.netlify/functions/delete-account", {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("405 para método não-POST", async () => {
  const res = await handler(new Request("https://x", { method: "GET" }));
  assert.equal(res.status, 405);
});

test("401 sem token", async () => {
  const res = await handler(reqPost({ endereco: OWNER }));
  assert.equal(res.status, 401);
  assert.equal(excluiuCom.length, 0, "exclusão NÃO deve ser chamada");
});

test("401 token inválido", async () => {
  sessionValida = { endereco: OWNER, tipo: "user-session" };
  const res = await handler(reqPost({ endereco: OWNER }, { authorization: "Bearer tok-ruim" }));
  assert.equal(res.status, 401);
  assert.equal(excluiuCom.length, 0);
});

test("403 token de OUTRO endereço (anti-IDOR)", async () => {
  sessionValida = { endereco: OUTRO, tipo: "user-session" };
  const res = await handler(reqPost({ endereco: OWNER }, { authorization: "Bearer tok-ok" }));
  assert.equal(res.status, 403);
  assert.equal(excluiuCom.length, 0, "não pode excluir conta alheia");
});

test("400 endereço inválido", async () => {
  sessionValida = { endereco: OWNER, tipo: "user-session" };
  const res = await handler(reqPost({ endereco: "nao-e-endereco" }, { authorization: "Bearer tok-ok" }));
  assert.equal(res.status, 400);
});

test("200 owner autorizado executa exclusão", async () => {
  sessionValida = { endereco: OWNER, tipo: "user-session" };
  const res = await handler(reqPost({ endereco: OWNER }, { authorization: "Bearer tok-ok" }));
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.modo, "executado");
  assert.equal(excluiuCom.length, 1);
  assert.equal(excluiuCom[0].endereco, OWNER);
  assert.equal(excluiuCom[0].dryRun, false);
});

test("200 dry-run repassa flag e devolve modo dry-run", async () => {
  sessionValida = { endereco: OWNER, tipo: "user-session" };
  const res = await handler(reqPost({ endereco: OWNER, dryRun: true }, { authorization: "Bearer tok-ok" }));
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.modo, "dry-run");
  assert.equal(excluiuCom[0].dryRun, true);
});

test("admin pode excluir conta de terceiro", async () => {
  // OUTRO entra na lista de admins → guard aceita mesmo o endereço-alvo sendo OWNER.
  adminList = [OUTRO];
  sessionValida = { endereco: OUTRO, tipo: "admin-access" };
  const res = await handler(reqPost({ endereco: OWNER }, { authorization: "Bearer tok-ok" }));
  assert.equal(res.status, 200);
  assert.equal(excluiuCom[0].endereco, OWNER);
});
