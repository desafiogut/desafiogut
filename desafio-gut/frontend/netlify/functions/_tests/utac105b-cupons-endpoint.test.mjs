// UTAC105b Frente B — endpoint `cupons.mjs` pelo USO (handler real + JWT real + `_lib/cupom.mjs` real sobre o duplo fiel).
// Duplos só de admin-auth (admin-JWT), cotas-store (posse pela cota, R18-B) e rate-limiter.
// node --test --experimental-test-module-mocks _tests/utac105b-cupons-endpoint.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac105b-com-comprimento-suficiente";
let S = criarSupabase();
const COTAS = new Map();
let cotaFalha = false;
mock.module("../_lib/supabase-client.mjs", { namedExports: { getSupabase: () => S.cliente, getSupabaseReadOnly: () => S.cliente, supabaseConfigurado: () => true } });
// ⛔-1 do validador: o duplo permissivo de autenticarAdmin escondia que um admin-JWT REAL nunca chegava ao ramo admin.
// Agora corre o admin-auth REAL (verificarAdminAccess + lista de admins); só a lista de admins é fixada.
const ADM = "0xdddddddddddddddddddddddddddddddddddddddd";
mock.module("../_lib/admin-helpers.mjs", { namedExports: {
  getAdminAddresses: async () => [ADM], resolverCoordenacao: () => ADM, COORDENACAO: ADM, invalidarCacheAdmins: () => {},
} });
mock.module("../_lib/cotas-store.mjs", { namedExports: { getCota: async (id) => { if (cotaFalha) throw new Error("x"); return COTAS.get(id) ?? null; } } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
const { default: handler } = await import("../cupons.mjs");
const { assinarUserSession, assinarAdminAccess } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const CNPJ = "cnpj:12345678000199";
beforeEach(() => { S = criarSupabase(); COTAS.clear(); cotaFalha = false; });

async function chamar(metodo, { quem = A, clienteId = A, cupons, token } = {}) {
  const tk = token ?? (quem ? await assinarUserSession(quem) : null);
  const headers = { "content-type": "application/json", ...(tk ? { authorization: `Bearer ${tk}` } : {}) };
  const url = "https://x.test/.netlify/functions/cupons" + (metodo === "GET" ? `?cliente_id=${encodeURIComponent(clienteId)}` : "");
  const res = await handler(new Request(url, { method: metodo, headers, ...(metodo === "PUT" ? { body: JSON.stringify({ cliente_id: clienteId, cupons }) } : {}) }));
  return { status: res.status, corpo: await res.json() };
}
const estados = (c) => c.cupons.map((x) => [x.valorRs, x.ativo]);

test("B1 lojista sem cupons → vê os 3 valores da plataforma, todos desactivados, validade 30", async () => {
  const r = await chamar("GET");
  assert.equal(r.status, 200);
  assert.deepEqual(estados(r.corpo), [[5, false], [10, false], [20, false]]);
  assert.equal(r.corpo.validadeDias, 30);
  assert.equal(S.tabelas.cupons.length, 0, "GET não grava");
});

test("B2 activar grava; desactivar reflecte; repetir é idempotente", async () => {
  let r = await chamar("PUT", { cupons: [{ valorRs: 5, ativo: true }, { valorRs: 20, ativo: true }] });
  assert.equal(r.status, 200);
  assert.deepEqual(estados(r.corpo), [[5, true], [10, false], [20, true]]);
  r = await chamar("PUT", { cupons: [{ valorRs: 5, ativo: false }] });
  assert.deepEqual(estados(r.corpo), [[5, false], [10, false], [20, true]]);
  await chamar("PUT", { cupons: [{ valorRs: 5, ativo: false }, { valorRs: 20, ativo: true }] });
  assert.equal(S.tabelas.cupons.length, 2);
  assert.deepEqual(estados((await chamar("GET")).corpo), [[5, false], [10, false], [20, true]]);
});

test("B3 valor não pré-definido → 400 valor_invalido e NADA gravado (nem os válidos do mesmo pedido)", async () => {
  for (const v of [15, 7, "10", 10.5, 0, null]) {
    const r = await chamar("PUT", { cupons: [{ valorRs: 5, ativo: true }, { valorRs: v, ativo: true }] });
    assert.equal(r.status, 400, `valor ${String(v)}`); assert.equal(r.corpo.error.code, "valor_invalido");
  }
  assert.equal(S.tabelas.cupons.length, 0);
});

test("B4 corpo inválido → 400 (sem lista, ativo não booleano, repetidos, >3)", async () => {
  for (const cupons of [undefined, [], [{ valorRs: 5, ativo: "sim" }], [{ valorRs: 5, ativo: true }, { valorRs: 5, ativo: false }],
    [5, 10, 20, 5].map((v) => ({ valorRs: v, ativo: true }))]) {
    assert.equal((await chamar("PUT", { cupons })).status, 400);
  }
  assert.equal(S.tabelas.cupons.length, 0);
});

test("B5 posse (R18-B): outro lojista → 403; cota com endereco = JWT → ok; cnpj sem carteira → 403; admin → ok; leitura da cota falha → 403", async () => {
  assert.equal((await chamar("PUT", { quem: B, clienteId: A, cupons: [{ valorRs: 5, ativo: true }] })).status, 403);
  assert.equal((await chamar("GET", { quem: B, clienteId: A })).status, 403);
  assert.equal((await chamar("PUT", { quem: A, clienteId: CNPJ, cupons: [{ valorRs: 5, ativo: true }] })).status, 403);
  COTAS.set(CNPJ, { tipo: "corporativo", endereco: A.toUpperCase().replace("0X", "0x") });
  assert.equal((await chamar("PUT", { quem: A, clienteId: CNPJ, cupons: [{ valorRs: 10, ativo: true }] })).status, 200);
  assert.equal((await chamar("PUT", { quem: B, clienteId: CNPJ, cupons: [{ valorRs: 10, ativo: false }] })).status, 403);
  assert.equal((await chamar("PUT", { token: await assinarAdminAccess(ADM), clienteId: B, cupons: [{ valorRs: 20, ativo: true }] })).status, 200, "admin-JWT real");
  assert.equal((await chamar("PUT", { token: await assinarAdminAccess(A), clienteId: B, cupons: [{ valorRs: 5, ativo: true }] })).status, 403, "admin-JWT de quem já não é admin");
  cotaFalha = true;
  assert.equal((await chamar("GET", { quem: A, clienteId: CNPJ })).status, 403);
  assert.deepEqual(S.tabelas.cupons.map((c) => [c.lojista_id, c.valor_rs]).sort(), [[B, 20], [CNPJ, 10]].sort());
});

test("B5b cliente_id do próprio em maiúsculas e com espaços é normalizado (não 403 falso)", async () => {
  const r = await chamar("PUT", { clienteId: "  " + A.toUpperCase().replace("0X", "0x") + " ", cupons: [{ valorRs: 5, ativo: true }] });
  assert.equal(r.status, 200); assert.equal(S.tabelas.cupons[0].lojista_id, A);
});

test("B6 sem token → 401; token inválido → 401; cliente_id inválido → 400; método → 405", async () => {
  assert.equal((await chamar("GET", { quem: null })).status, 401);
  assert.equal((await chamar("GET", { token: "lixo" })).status, 401);
  assert.equal((await chamar("GET", { clienteId: "0x123" })).status, 400);
  const r = await handler(new Request("https://x.test/.netlify/functions/cupons", { method: "DELETE" }));
  assert.equal(r.status, 405);
});

test("B7 erro do Supabase → 503 visível, nunca os 3 desactivados falsos", async () => {
  S.g.falhar.cupons = { op: "select" };
  const r = await chamar("GET");
  assert.equal(r.status, 503); assert.equal(r.corpo.error.code, "store_indisponivel");
});

test("B8 concorrência: 10 PUTs iguais em paralelo → 1 linha por valor", async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () => chamar("PUT", { cupons: [{ valorRs: 10, ativo: true }] })));
  assert.ok(rs.every((r) => r.status === 200));
  assert.equal(S.tabelas.cupons.length, 1);
});
