// UTAC142 (Frente A) — «o débito falha para 1 e 2 pontos (só desconta a partir de 3)».
// MEDIDO no SEG-1: o servidor NÃO tem mínimo de 3. O ledger só recusa `quantidade <= 0`, e a BD de produção tem
// movimentos `motivo: "lance"` com delta −1 e −2. O sintoma era de ecrã (saldo global não relido, corrigido no
// UTAC141). Este ficheiro prende a regra: 1 e 2 pontos debitam, também com o saldo EXACTO.
//
// REAL: `_lib/ledger-lance.mjs`. Duplo só na fronteira (Supabase `_supabase-duplo-mc105a.mjs`, com os CHECKs reais).
// node --test --experimental-test-module-mocks _tests/utac142-debito-1-2.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

let S = criarSupabase(), cliente = S.cliente;
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true } });

const L = await import("../_lib/ledger-lance.mjs");
const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

beforeEach(() => { S = criarSupabase(); cliente = S.cliente; });
const linha = () => S.tabelas.pontos.find((l) => l.endereco === A);
const saldo = () => Number(linha()?.pontos_lance ?? 0);
const lances = () => (linha()?.historico_lance ?? []).filter((m) => m.motivo === "lance");
async function semear(q) {
  const r = await L.creditarPontosLance(A, q, "boas-vindas", `semear:${q}`);
  assert.equal(r.ok, true, `semear falhou: ${r.code}`);
}

for (const valor of [1, 2]) {
  test(`A${valor} · um lance de ${valor} ponto(s) DEBITA ${valor} (saldo 50 → ${50 - valor}) e grava o movimento`, async () => {
    await semear(50);
    const r = await L.consumirPontosLance(A, valor, `lance:u142-${valor}`);
    assert.equal(r.ok, true, `recusado: ${r.code}`);
    assert.equal(saldo(), 50 - valor);
    assert.deepEqual(lances().map((m) => m.delta), [-valor]);
  });

  test(`A${valor}b · com o saldo EXACTO de ${valor}, o lance de ${valor} debita até 0 (fronteira)`, async () => {
    await semear(valor);
    const r = await L.consumirPontosLance(A, valor, `lance:u142-exacto-${valor}`);
    assert.equal(r.ok, true, `recusado: ${r.code}`);
    assert.equal(saldo(), 0);
  });
}

test("A3 · sequência real 1 → 2 → 3 debita os três (Σ 6), cada um com a sua ref", async () => {
  await semear(10);
  for (const v of [1, 2, 3]) assert.equal((await L.consumirPontosLance(A, v, `lance:seq-${v}`)).ok, true);
  assert.equal(saldo(), 4);
  assert.deepEqual(lances().map((m) => m.delta), [-1, -2, -3]);
});

test("A4 · BIDIRECCIONAL — 0 e negativos continuam recusados, sem escrever nada", async () => {
  await semear(10);
  for (const v of [0, -1, 1.5]) {
    const r = await L.consumirPontosLance(A, v, `lance:inv-${v}`);
    assert.equal(r.ok, false);
    assert.equal(r.code, "QUANTIDADE_INVALIDA");
  }
  assert.equal(saldo(), 10);
  assert.deepEqual(lances(), []);
});

test("A5 · lance de 2 com saldo 1 → recusa sem saldo negativo", async () => {
  await semear(1);
  const r = await L.consumirPontosLance(A, 2, "lance:curto");
  assert.equal(r.ok, false);
  assert.equal(r.code, "PONTOS_LANCE_INSUFICIENTES");
  assert.equal(saldo(), 1);
});
