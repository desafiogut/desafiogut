// UTAC105b Frente A — repositório dos cupons (`_lib/cupom.mjs`) sobre o duplo fiel (`_supabase-duplo-mc105a.mjs`:
// UNIQUE 23505, DEFAULTs, sem .delete()). Valores da plataforma em LITERAL (lição MC93-A): R$ 5, 10, 20; validade 30.
// node --test --experimental-test-module-mocks _tests/utac105b-cupom.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

let S = criarSupabase();
mock.module("../_lib/supabase-client.mjs", { namedExports: { getSupabase: () => S.cliente, getSupabaseReadOnly: () => S.cliente, supabaseConfigurado: () => true } });
const C = await import("../_lib/cupom.mjs");

const L = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const L2 = "cnpj:12345678000199";
beforeEach(() => { S = criarSupabase(); });

test("A0 valores e validade da plataforma (literal)", () => {
  assert.deepEqual([...C.VALORES_CUPOM], [5, 10, 20]);
  assert.equal(C.VALIDADE_CUPOM_DIAS, 30);
  assert.ok(Object.isFrozen(C.VALORES_CUPOM));
});

test("A1 criar cupom grava UMA linha com validade 30 e lojista normalizado", async () => {
  const r = await C.criarCupom({ lojistaId: L.toUpperCase().replace("0X", "0x"), valorRs: 10, descricao: "10 off" });
  assert.equal(r.ok, true); assert.equal(r.criado, true);
  assert.equal(S.tabelas.cupons.length, 1);
  const c = S.tabelas.cupons[0];
  assert.deepEqual([c.lojista_id, c.valor_rs, c.validade_dias, c.ativo, c.descricao], [L, 10, 30, true, "10 off"]);
});

test("A2 criar 2× o mesmo → 1 só (criado:false, mesmo id); corrida concorrente idem", async () => {
  const r1 = await C.criarCupom({ lojistaId: L, valorRs: 5 });
  const r2 = await C.criarCupom({ lojistaId: L, valorRs: 5 });
  assert.equal(S.tabelas.cupons.length, 1);
  assert.equal(r2.criado, false); assert.equal(r2.cupom.id, r1.cupom.id);
  const rs = await Promise.all(Array.from({ length: 10 }, () => C.criarCupom({ lojistaId: L, valorRs: 20 })));
  assert.equal(S.tabelas.cupons.filter((c) => c.valor_rs === 20).length, 1);
  assert.ok(rs.every((r) => r.ok));
});

test("A3 valor fora dos pré-definidos → valor_invalido, nada gravado (sem coerção)", async () => {
  for (const v of [0, 1, 7, 15, 25, 5.5, -5, "5", null, undefined, NaN, Infinity]) {
    assert.deepEqual(await C.criarCupom({ lojistaId: L, valorRs: v }), { ok: false, code: "valor_invalido" }, `valor ${String(v)}`);
    assert.equal((await C.actualizarCupom({ lojistaId: L, valorRs: v, ativo: true })).code, "valor_invalido");
  }
  assert.equal(S.tabelas.cupons.length, 0);
});

test("A4 lojista inválido → params_invalidos; cnpj:14 dígitos é aceite", async () => {
  for (const l of ["", "0x123", "cnpj:123", "anon:abc", null]) assert.equal((await C.criarCupom({ lojistaId: l, valorRs: 5 })).code, "params_invalidos");
  assert.equal((await C.criarCupom({ lojistaId: L2, valorRs: 5 })).ok, true);
});

test("A5 listar devolve só os do lojista, por valor", async () => {
  await C.criarCupom({ lojistaId: L, valorRs: 20 }); await C.criarCupom({ lojistaId: L, valorRs: 5 });
  await C.criarCupom({ lojistaId: L2, valorRs: 10 });
  assert.deepEqual((await C.listarCuponsDoLojista(L)).map((c) => c.valor_rs), [5, 20]);
  assert.deepEqual((await C.listarCuponsDoLojista(L2)).map((c) => c.valor_rs), [10]);
});

test("A6 actualizar ativo reflecte; inexistente é criado com o estado pedido; idempotente", async () => {
  let r = await C.actualizarCupom({ lojistaId: L, valorRs: 10, ativo: false });
  assert.equal(r.ok, true); assert.equal(r.cupom.ativo, false); assert.equal(S.tabelas.cupons.length, 1);
  r = await C.actualizarCupom({ lojistaId: L, valorRs: 10, ativo: true });
  assert.equal(r.cupom.ativo, true); assert.equal(S.tabelas.cupons.length, 1);
  r = await C.actualizarCupom({ lojistaId: L, valorRs: 10, ativo: false }); // existente activo → desactiva
  assert.equal(r.cupom.ativo, false); assert.equal(S.tabelas.cupons[0].ativo, false);
  await C.actualizarCupom({ lojistaId: L, valorRs: 10, ativo: true });
  await C.actualizarCupom({ lojistaId: L, valorRs: 10, ativo: true });
  assert.equal(S.tabelas.cupons.length, 1);
  await Promise.all(Array.from({ length: 8 }, () => C.actualizarCupom({ lojistaId: L, valorRs: 5, ativo: false })));
  assert.deepEqual(S.tabelas.cupons.filter((c) => c.valor_rs === 5).map((c) => c.ativo), [false]);
});

test("A7 listarCuponsAtivosDoLojista: inactivos ficam fora", async () => {
  await C.criarCupom({ lojistaId: L, valorRs: 5 }); await C.criarCupom({ lojistaId: L, valorRs: 10, ativo: false });
  await C.criarCupom({ lojistaId: L, valorRs: 20 });
  assert.deepEqual((await C.listarCuponsAtivosDoLojista(L)).map((c) => c.valor_rs), [5, 20]);
});

test("A8 erro do Supabase é visível (não lista vazia / não ok)", async () => {
  S.g.falhar.cupons = { op: "select" };
  await assert.rejects(C.listarCuponsDoLojista(L));
  S.g.falhar.cupons = { op: "update" };
  assert.equal((await C.actualizarCupom({ lojistaId: L, valorRs: 5, ativo: true })).code, "gravar_cupom_falhou");
});
