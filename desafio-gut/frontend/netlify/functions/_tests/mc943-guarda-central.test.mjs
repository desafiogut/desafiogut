// MC94.3 — HARD GATE 5: a guarda ESPECIAL-* vive em registrarPontuacaoRodada e
// fecha os DOIS caminhos (consolidar-lances e POST /pontuacao).
//
// O duplo do Supabase LANÇA ao primeiro uso: uma edição especial não pode sequer
// abrir uma ligação; uma normal tem de chegar lá (é assim que se prova que a
// guarda não fechou o torneio inteiro).
//
// node --test --experimental-test-module-mocks _tests/mc943-guarda-central.test.mjs

import { test, mock } from "node:test";
import assert from "node:assert/strict";

let usosSupabase = 0;
mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => { usosSupabase += 1; throw new Error("SUPABASE_TOCADO"); },
  },
});
mock.module("../_lib/fila.mjs", { namedExports: { enfileirar: async () => { throw new Error("FILA_TOCADA"); } } });
mock.module("../_lib/admin-auth.mjs", { namedExports: { guardAdmin: async () => null } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/data-store.mjs", {
  namedExports: { getLances: async () => [{ endereco: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", valorCentavos: 30 }] },
});

const { registrarPontuacaoRodada } = await import("../_lib/pontuacao-store.mjs");
const pontuar = (await import("../pontuacao.mjs")).default;

const LANCES = [
  { endereco: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", valorCentavos: 30 },
  { endereco: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", valorCentavos: 50 },
];

test("registrarPontuacaoRodada recusa ESPECIAL-* sem tocar no Supabase", async () => {
  usosSupabase = 0;
  const r = await registrarPontuacaoRodada("ESPECIAL-AIRFRYER", LANCES);
  assert.equal(r.pontua, false);
  assert.equal(r.cicloId, "ESPECIAL-AIRFRYER");
  assert.equal(r.participantes, 0);
  assert.equal(r.bonusRegistados, 0);
  assert.equal(usosSupabase, 0, "nem uma ligação");
});

test("qualquer ESPECIAL-*, e com espaços à volta do id", async () => {
  usosSupabase = 0;
  assert.equal((await registrarPontuacaoRodada("  ESPECIAL-NATAL2026 ", LANCES)).pontua, false);
  assert.equal(usosSupabase, 0);
});

test("controlo: R-1 passa a guarda e chega ao Supabase", async () => {
  usosSupabase = 0;
  await assert.rejects(registrarPontuacaoRodada("R-1", LANCES), /SUPABASE_TOCADO/);
  assert.equal(usosSupabase, 1);
});

test("controlo: prefixo, não 'contém' — PROG-ESPECIAL-1 pontua", async () => {
  usosSupabase = 0;
  await assert.rejects(registrarPontuacaoRodada("PROG-ESPECIAL-1", LANCES), /SUPABASE_TOCADO/);
});

const pedido = (cicloId) => new Request("https://x/.netlify/functions/pontuacao", {
  method: "POST", body: JSON.stringify({ cicloId }),
});

test("POST /pontuacao com ESPECIAL-AIRFRYER: não pontua, e di-lo", async () => {
  usosSupabase = 0;
  const res = await pontuar(pedido("ESPECIAL-AIRFRYER"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.pontua, false, "o caminho manual que o MC94.2 deixou aberto está fechado");
  assert.equal(usosSupabase, 0);
});

test("POST /pontuacao com R-1 continua a pontuar (chega ao Supabase)", async () => {
  usosSupabase = 0;
  const res = await pontuar(pedido("R-1"));
  assert.equal(usosSupabase, 1, "a edição normal tem de chegar ao store");
  assert.equal(res.status, 500, "com o duplo a lançar, o endpoint devolve o erro dele");
});
