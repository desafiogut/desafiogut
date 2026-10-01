// UTAC105b Frente C — ligação Passe ↔ cupons pelo HANDLER REAL (`comprar-passe.mjs`), com `saldoRs.mjs`, `passe.mjs` e
// `cupom.mjs` reais sobre os duplos (Blobs com ETag + Supabase fiel). R18-C: sem cupons activos → 409 antes de debitar.
// R18-D: os cupons vão no INSERT do passe (snapshot dos activos no momento da compra).
// node --test --experimental-test-module-mocks _tests/utac105b-ligacao.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac105b-ligacao-com-comprimento";
let B = criarBlobs(), S = criarSupabase();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: { getSupabase: () => S.cliente, getSupabaseReadOnly: () => S.cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/sentry-server.mjs", { namedExports: { captureSecurityAlert: async () => {}, Sentry: {} } });
const { default: handler } = await import("../comprar-passe.mjs");
const { criarPasse } = await import("../_lib/passe.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const LOJ = "0xcccccccccccccccccccccccccccccccccccccccc", OUTRO_LOJ = "cnpj:12345678000199";
const ED = "PROG-7", PROD = "11111111-2222-3333-4444-555555555555";
const ID = (n) => `aaaaaaaa-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const hora = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const cupom = (n, lojista, valor, ativo) => ({ id: ID(n), lojista_id: lojista, valor_rs: valor, descricao: "", validade_dias: 30, ativo, criado_em: "x", atualizado_em: "x" });

function semear({ cupons = [cupom(1, LOJ, 5, true), cupom(2, LOJ, 10, false), cupom(3, LOJ, 20, true), cupom(4, OUTRO_LOJ, 10, true)], lojista = LOJ } = {}) {
  B = criarBlobs(); S = criarSupabase();
  B.gravar("edicoes-metadata", ED, { id: ED, tipo: "programado", status: "aberto", inicio_em: hora(-1), termino_em: hora(1), produtoId: PROD });
  B.gravar("produtos", `produto:${PROD}`, { id: PROD, status: "ativo", nome: "Air Fryer", ...(lojista ? { lojista } : {}) });
  S.tabelas.cupons.push(...cupons);
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
}
beforeEach(() => semear());

let ip = 0;
async function comprar() {
  const req = new Request("https://x/.netlify/functions/comprar-passe", {
    method: "POST", body: JSON.stringify({ edicaoId: ED, produtoId: PROD }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": `10.1.0.${++ip % 250}`, authorization: `Bearer ${await assinarUserSession(A)}` },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}
const saldo = () => S.tabelas.saldo_rs.find((l) => l.cliente_id === A)?.payload?.centavos;

test("C1 compra → 201, cupons_ids = os ACTIVOS do lojista do produto (inactivos e de outro lojista fora); R$ 2,00 debitado", async () => {
  const r = await comprar();
  assert.equal(r.status, 201);
  assert.deepEqual([...r.corpo.passe.cupons_ids].sort(), [ID(1), ID(3)]);
  assert.deepEqual([...S.tabelas.passes[0].cupons_ids].sort(), [ID(1), ID(3)]);
  assert.equal(saldo(), 300);
});

test("C2 2.ª compra → 200 idempotente, o mesmo passe com os mesmos cupons, sem duplicar nem debitar outra vez", async () => {
  const r1 = await comprar();
  S.tabelas.cupons.find((c) => c.id === ID(2)).ativo = true; // mudar a oferta depois não altera o passe já comprado
  const r2 = await comprar();
  assert.equal(r2.status, 200); assert.equal(r2.corpo.idempotent, true);
  assert.equal(r2.corpo.passe.id, r1.corpo.passe.id);
  assert.deepEqual([...r2.corpo.passe.cupons_ids].sort(), [ID(1), ID(3)]);
  assert.equal(S.tabelas.passes.length, 1); assert.equal(saldo(), 300);
});

test("C3 lojista sem cupons activos → 409 sem_cupons_ativos, nada debitado, nenhum passe (R18-C)", async () => {
  semear({ cupons: [cupom(1, LOJ, 5, false), cupom(4, OUTRO_LOJ, 10, true)] });
  const r = await comprar();
  assert.equal(r.status, 409); assert.equal(r.corpo.error.code, "sem_cupons_ativos");
  assert.equal(saldo(), 500); assert.equal(S.tabelas.passes.length, 0);
});

test("C4 produto sem lojista → 409 sem_cupons_ativos (não herda cupons de ninguém)", async () => {
  semear({ lojista: null });
  const r = await comprar();
  assert.equal(r.status, 409); assert.equal(saldo(), 500);
});

test("C5 erro a ler os cupons → 503, nada debitado", async () => {
  S.g.falhar.cupons = { op: "select" };
  const r = await comprar();
  assert.equal(r.status, 503); assert.equal(r.corpo.error.code, "store_indisponivel");
  assert.equal(saldo(), 500); assert.equal(S.tabelas.passes.length, 0);
});

test("C6 concorrência: 10 compras em paralelo → 1 passe com os cupons, débito líquido R$ 2,00", async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () => comprar()));
  assert.ok(rs.every((r) => r.status === 201 || r.status === 200), JSON.stringify(rs.map((r) => r.status)));
  assert.equal(S.tabelas.passes.length, 1);
  assert.deepEqual([...S.tabelas.passes[0].cupons_ids].sort(), [ID(1), ID(3)]);
  assert.equal(saldo(), 300);
});

test("C7 criarPasse: cuponsIds inválidos são recusados; omitidos → [] (comportamento do MC105a)", async () => {
  for (const cuponsIds of ["x", [1], ["nao-uuid"], [ID(1), ID(1)], null]) {
    assert.equal((await criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD, cuponsIds })).code, "params_invalidos");
  }
  const r = await criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  assert.deepEqual(r.passe.cupons_ids, []);
});
