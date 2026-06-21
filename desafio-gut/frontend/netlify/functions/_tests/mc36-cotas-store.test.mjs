// MC36 — Testes do cotas-store (offline, mock do supabase-client).
// node --test --experimental-test-module-mocks _tests/mc36-cotas-store.test.mjs
//
// Valida o mapeamento das operações de cota para Supabase com fidelidade ao
// registo (payload) e às colunas indexáveis (cliente_id, cnpj, email, categoria).
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// DB fake in-memory por tabela.
const db = { cotas: new Map(), cotas_pagas: new Map(), cota_fingerprints: new Map() };

function builder(table) {
  const st = { table, eqs: {}, notNull: null, lim: null };
  const rowsArr = () => [...db[table].values()];
  const filtra = () => rowsArr().filter((r) =>
    Object.entries(st.eqs).every(([k, v]) => r[k] === v) &&
    (st.notNull ? r[st.notNull] != null : true));
  const api = {
    select(_c) { return api; },
    eq(col, val) { st.eqs[col] = val; return api; },
    not(col, _op, _v) { st.notNull = col; return api; },
    limit(n) { st.lim = n; return Promise.resolve({ data: filtra().slice(0, n), error: null }); },
    maybeSingle() { const r = filtra()[0]; return Promise.resolve({ data: r ?? null, error: null }); },
    upsert(obj) {
      const key = obj.cliente_id ?? obj.pedido_id ?? obj.visitor_id;
      db[table].set(key, obj); return Promise.resolve({ error: null });
    },
    delete() { return { eq: (c, v) => { for (const [k, r] of db[table]) if (r[c] === v) db[table].delete(k); return Promise.resolve({ error: null }); } }; },
    then(res) { return Promise.resolve({ data: filtra(), error: null }).then(res); }, // await direto (listarCategoria/resumo)
  };
  return api;
}
const fake = { from: (t) => builder(t) };
mock.module("../_lib/supabase-client.mjs", { namedExports: { getSupabase: () => fake, supabaseConfigurado: () => true } });

let store;
before(async () => { store = await import("../_lib/cotas-store.mjs"); });
beforeEach(() => { db.cotas.clear(); db.cotas_pagas.clear(); db.cota_fingerprints.clear(); });

const ADDR = "0xDe70000000000000000000000000000000000009";

test("upsertCota/getCota round-trip preserva o payload completo", async () => {
  const reg = { cliente_id: ADDR, endereco: ADDR, tipo: "corporativo", cnpj: "11222333000181", email: "a@b.com", categoria: "bronze", vendida: true, empresa: "ACME", valor: 660 };
  await store.upsertCota(ADDR, reg);
  const lido = await store.getCota(ADDR);
  assert.deepEqual(lido, reg);
  // colunas indexáveis extraídas
  const row = db.cotas.get(ADDR);
  assert.equal(row.cnpj, "11222333000181");
  assert.equal(row.categoria, "bronze");
  assert.equal(row.vendida, true);
});

test("getCotaByCnpj (anti-duplicidade) e getCotaByEmail", async () => {
  await store.upsertCota("cnpj:11222333000181", { cliente_id: "cnpj:11222333000181", cnpj: "11222333000181", email: "x@y.com", empresa: "Z" });
  assert.equal((await store.getCotaByCnpj("11222333000181")).empresa, "Z");
  assert.equal((await store.getCotaByEmail("x@y.com")).cnpj, "11222333000181");
  assert.equal(await store.getCotaByCnpj("00000000000000"), null);
});

test("listarCategoria e resumoCotas", async () => {
  await store.upsertCota("a", { cliente_id: "a", categoria: "bronze", empresa: "A" });
  await store.upsertCota("b", { cliente_id: "b", categoria: "bronze", empresa: "B" });
  await store.upsertCota("c", { cliente_id: "c", categoria: "ouro", empresa: "C" });
  const bronze = await store.listarCategoria("bronze");
  assert.equal(bronze.length, 2);
  const resumo = await store.resumoCotas();
  assert.equal(resumo.bronze.total_atribuidas, 2);
  assert.equal(resumo.ouro.total_atribuidas, 1);
  assert.equal(resumo.prata.total_atribuidas, 0);
});

test("cotas_pagas idempotência + fingerprint anti-Sybil", async () => {
  await store.setCotaPaga("ped1", { pedidoId: "ped1", ativadaEm: "x" });
  assert.equal((await store.getCotaPaga("ped1")).ativadaEm, "x");
  assert.equal(await store.getCotaPaga("ped-inexistente"), null);
  await store.setFingerprint("vid1", { cnpjs: [{ cnpj: "1", em: "t" }] });
  assert.equal((await store.getFingerprint("vid1")).cnpjs.length, 1);
});

test("deleteCota remove", async () => {
  await store.upsertCota("a", { cliente_id: "a", categoria: "bronze" });
  await store.deleteCota("a");
  assert.equal(await store.getCota("a"), null);
});
