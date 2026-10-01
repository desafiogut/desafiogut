// MC105a.1 — `passes` na exclusão de conta (anonimizar ≠ apagar) + migrações em supabase/migrations/.
// A exportação está em mc104-exportar-dados.test.mjs (titular sim, terceiro não).
// `passes` corre no duplo fiel (_supabase-duplo-mc105a.mjs): CHECK de produção (0x… OU anon:<sha256>),
// UNIQUE, colunas conhecidas e SEM `.delete()` (o service_role já não tem DELETE em produção).
// node --test --experimental-test-module-mocks _tests/mc105a1-passes-lgpd.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

let B = criarBlobs();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });
const { excluirConta, excluirSupabase } = await import("../_lib/conta-delete.mjs");

const ALVO = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";
// Literal calculado FORA do código (`printf '%s' <ALVO> | sha256sum`) — o mesmo do MC104.3 (HARD GATE 16).
const ANON = "anon:124fcc172f6745af1553232800463e15f3f9d103cad0d707403b38c46bfa1144";

let S;
// `passes` no duplo fiel; as outras tabelas do conta-delete respondem vazio (não são o alvo deste MC).
const cliente = () => {
  const vazio = { select: () => vazio, delete: () => vazio, update: () => vazio, eq: () => vazio, or: () => vazio,
    then: (r) => r({ data: [], error: null, count: 0 }) };
  return { from: (t) => (t === "passes" ? S.cliente.from(t) : vazio) };
};
const passe = (endereco, produto_id, extra = {}) => ({ endereco, edicao_id: "P-1", produto_id, ...extra });

beforeEach(async () => {
  B = criarBlobs();
  S = criarSupabase();
  for (const p of [
    passe(ALVO, "prod-1", { palpite_usado: true, cupons_ids: ["c1", "c2"], status: "usado" }),
    passe(ALVO, "prod-2"),
    passe(OUTRO, "prod-1"),
  ]) {
    const { error } = await S.cliente.from("passes").insert(p);
    assert.equal(error, null);
  }
});

test("B1 exclusão (uso, excluirConta): os passes do titular ficam com anon:<sha256>, não são apagados", async () => {
  const antes = structuredClone(S.tabelas.passes.filter((p) => p.endereco === ALVO));
  const m = await excluirConta({ supabase: cliente(), getStore: B.getStore, endereco: ALVO });
  assert.equal(m.ok, true, JSON.stringify(m.erros));
  assert.equal(m.supabase.anonimizado.passes, 2);
  assert.equal(S.tabelas.passes.length, 3, "nenhum passe eliminado");
  assert.equal(S.tabelas.passes.some((p) => p.endereco === ALVO), false, "o endereço desaparece");
  const depois = S.tabelas.passes.filter((p) => p.endereco === ANON);
  assert.equal(depois.length, 2);
  // Tudo o resto preservado: id, edição, produto, comprado_em, palpite, cupons, status.
  for (const a of antes) {
    const d = depois.find((x) => x.id === a.id);
    assert.ok(d, `passe ${a.id} preservado`);
    assert.deepEqual({ ...d, endereco: null }, { ...a, endereco: null });
  }
  assert.ok(!S.g.chamadas.includes("passes:delete"));
});

test("B2 terceiros intactos", async () => {
  const antes = structuredClone(S.tabelas.passes.find((p) => p.endereco === OUTRO));
  await excluirConta({ supabase: cliente(), getStore: B.getStore, endereco: ALVO });
  assert.deepEqual(S.tabelas.passes.find((p) => p.id === antes.id), antes);
});

test("B3 dry-run conta sem mutar; maiúsculas = minúsculas", async () => {
  const antes = structuredClone(S.tabelas.passes);
  const r = await excluirSupabase(cliente(), ALVO.toUpperCase(), { dryRun: true });
  assert.equal(r.anonimizado.passes, 2);
  assert.deepEqual(S.tabelas.passes, antes);
});

test("B4 2.ª exclusão: 0 passes, sem erro (o pseudónimo não colide com o UNIQUE)", async () => {
  await excluirSupabase(cliente(), ALVO);
  const r = await excluirSupabase(cliente(), ALVO);
  assert.deepEqual(r.erros, []);
  assert.equal(r.anonimizado.passes, 0);
  assert.equal(S.tabelas.passes.filter((p) => p.endereco === ANON).length, 2);
});

test("B5 erro no Supabase é visível em `erros` (fail-soft, não silencioso)", async () => {
  S.g.falhar.passes = { op: "update", code: "42501" };
  const m = await excluirConta({ supabase: cliente(), getStore: B.getStore, endereco: ALVO });
  assert.equal(m.ok, false);
  assert.ok(m.erros.some((e) => e.startsWith("supabase:passes (anon)")), JSON.stringify(m.erros));
});

test("B6 erro no dry-run também é visível (não reporta 0 limpo)", async () => {
  S.g.falhar.passes = { op: "select", code: "42501" };
  const r = await excluirSupabase(cliente(), ALVO, { dryRun: true });
  assert.ok(r.erros.some((e) => e.startsWith("supabase:passes (anon)")), JSON.stringify(r.erros));
  assert.equal(r.anonimizado.passes, undefined);
});

test("B7 recompra depois da exclusão: a 2.ª exclusão também anonimiza (UNIQUE parcial, achado do validador)", async () => {
  await excluirSupabase(cliente(), ALVO);
  assert.equal((await S.cliente.from("passes").insert(passe(ALVO, "prod-2"))).error, null, "a carteira volta e compra o mesmo passe");
  const r = await excluirSupabase(cliente(), ALVO);
  assert.deepEqual(r.erros, []);
  assert.equal(r.anonimizado.passes, 1);
  assert.equal(S.tabelas.passes.some((p) => p.endereco === ALVO), false);
  assert.equal(S.tabelas.passes.filter((p) => p.endereco === ANON && p.produto_id === "prod-2").length, 2, "dois passes com o mesmo pseudónimo");
});

test("B8 a compra continua idempotente: o mesmo 0x não compra duas vezes o mesmo passe", async () => {
  const { error } = await S.cliente.from("passes").insert(passe(ALVO, "prod-1"));
  assert.equal(error?.code, "23505");
});

test("A2 a migração do UNIQUE parcial está em supabase/migrations/ e = _logs/", () => {
  const sql = ler("desafio-gut/frontend/supabase/migrations/20260930_mc105a_passes_saneamento_unique.sql");
  assert.equal(sql, ler("_logs/MC105a.1_MIGRACAO_UNIQUE.sql"));
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS passes_endereco_edicao_produto_key[\s\S]*WHERE endereco LIKE '0x%';/);
  const codigo = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(codigo, /DELETE FROM|TRUNCATE|DROP TABLE|REVOKE/i);
});

// ── Frente C + A (ficheiros de migração) ───────────────────────────────────────────────────────────
const RAIZ = new URL("../../../../../", import.meta.url);
const ler = (rel) => readFileSync(new URL(rel, RAIZ), "utf8").replace(/\r\n/g, "\n");

test("C1 a migração do MC105a está em supabase/migrations/ e é idêntica à de _logs/", () => {
  assert.equal(ler("desafio-gut/frontend/supabase/migrations/20260930_mc105a_passes.sql"), ler("_logs/MC105a_MIGRACAO.sql"));
});

test("A1 a migração de saneamento revoga SÓ DELETE+TRUNCATE e aceita o pseudónimo no CHECK", () => {
  const sql = ler("desafio-gut/frontend/supabase/migrations/20260930_mc105a_passes_saneamento.sql");
  assert.equal(sql, ler("_logs/MC105a.1_MIGRACAO_PERMISSOES.sql"));
  const codigo = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.match(codigo, /REVOKE DELETE, TRUNCATE ON TABLE public\.passes FROM service_role;/);
  assert.equal((codigo.match(/REVOKE/g) || []).length, 1, "nenhum outro REVOKE");
  assert.doesNotMatch(codigo, /\b(SELECT|INSERT|UPDATE)\b/, "SELECT/INSERT/UPDATE não são tocados");
  assert.doesNotMatch(codigo, /\bDELETE FROM\b|\bTRUNCATE public\b|\bDROP TABLE\b/i, "não apaga dados");
  assert.match(codigo, /\^anon:\[0-9a-f\]\{64\}\$/);
});
