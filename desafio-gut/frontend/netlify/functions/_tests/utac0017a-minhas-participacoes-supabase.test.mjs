// UTAC000.17a — o caminho SUPABASE do endpoint (o flip DATA_STORE_BACKEND=supabase está preparado;
// um endpoint que só soubesse ler Blobs partir-se-ia em silêncio no dia do flip).
//
// O duplo de Supabase é FIEL aos filtros do PostgREST e — o ponto central — RECUSA select de
// colunas que não existam e RECUSA qualquer `payload` (é o que prova, ao nível da QUERY, que este
// endpoint nunca lê valores de lance: se alguém acrescentar `payload` ao select, os testes caem).
//
// node --test --experimental-test-module-mocks _tests/utac0017a-minhas-participacoes-supabase.test.mjs

process.env.DATA_STORE_BACKEND = "supabase";   // ANTES de importar o handler (a facade lê o env no load)

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const TITULAR = "0xaaa0000000000000000000000000000000000aaa";
const OUTRO   = "0xbbb0000000000000000000000000000000000bbb";

let db = {};
const consultas = [];   // registo dos filtros aplicados (para provar que o endereço é filtrado)

// Esquema REAL da tabela (information_schema de produção) — coluna inexistente → 42703, como o PostgREST.
const SCHEMA = { lances: ["id", "edicao_id", "endereco", "hash_lance", "valor_centavos", "payload", "created_at"] };

function consulta(tabela) {
  const filtros = [];
  let colunas = null;
  const q = {
    select(cols, opts = {}) {
      colunas = cols;
      // O endpoint só pode pedir o id da edição (nunca payload/valores/hash).
      if (!["edicao_id", "edicao_id,id"].includes(String(cols))) {
        throw new Error(`duplo: select inesperado "${cols}" — o endpoint não pode ler valores`);
      }
      if (tabela && !SCHEMA[tabela]) throw new Error(`42P01: tabela ${tabela} não existe`);
      for (const c of String(cols).split(",")) {
        if (!SCHEMA[tabela].includes(c.trim())) throw new Error(`42703: coluna ${tabela}.${c} não existe`);
      }
      consultas.push({ tabela, cols: String(cols), filtros, count: opts?.count ?? null });
      return q;
    },
    eq(col, v) {
      if (!SCHEMA[tabela].includes(col)) throw new Error(`42703: coluna ${tabela}.${col} não existe`);
      if (v === null || v === undefined) throw new Error("22007: eq.null não é IS NULL");
      filtros.push([col, String(v)]);
      return q;
    },
    order() { return q; },
    range(a, b) { q._range = [a, b]; return q; },
    then(res) {
      const linhas = (db[tabela] ?? []).filter((r) => filtros.every(([c, v]) => String(r[c]) === v));
      const [de, ate] = q._range ?? [0, linhas.length];
      const pagina = linhas.slice(de, ate + 1).map((r) => ({ edicao_id: r.edicao_id }));
      return res({ data: pagina, error: null, count: linhas.length });
    },
  };
  return q;
}

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    supabaseConfigurado: () => true,
    getSupabase: () => ({ from: consulta }),
    getSupabaseReadOnly: () => ({ from: consulta }),
  },
});
mock.module("../_lib/jwt.mjs", {
  namedExports: {
    verificarUserSession: async (t) => {
      if (t !== "tok-titular") { const e = new Error("inválido"); e.code = "ERR_JWT_INVALID"; throw e; }
      return { endereco: TITULAR, tipo: "user-session" };
    },
  },
});
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });

const { default: handler } = await import("../minhas-participacoes.mjs");

const chamar = async (query = "") => {
  const res = await handler(new Request(`https://x.test/.netlify/functions/minhas-participacoes${query}`, {
    method: "GET", headers: { authorization: "Bearer tok-titular" },
  }));
  return { status: res.status, corpo: await res.json() };
};

beforeEach(() => {
  consultas.length = 0;
  db = { lances: [
    { id: 1, edicao_id: "R-1", endereco: TITULAR, payload: { valorCentavos: 111 } },
    { id: 2, edicao_id: "R-1", endereco: TITULAR, payload: { valorCentavos: 222 } },
    { id: 3, edicao_id: "R-2", endereco: TITULAR, payload: { valorCentavos: 333 } },
    { id: 4, edicao_id: "R-1", endereco: OUTRO,   payload: { valorCentavos: 444 } },
    { id: 5, edicao_id: "R-9", endereco: OUTRO,   payload: { valorCentavos: 555 } },
  ] };
});

test("backend supabase: devolve só as edições do titular (a query filtra por endereço)", async () => {
  const { status, corpo } = await chamar();
  assert.equal(status, 200);
  assert.deepEqual(corpo.participacoes, [
    { edicaoId: "R-1", lances: 2 },
    { edicaoId: "R-2", lances: 1 },
  ]);
  const q = consultas[0];
  assert.deepEqual(q.filtros, [["endereco", TITULAR]], "tem de filtrar pelo endereço do token");
  assert.equal(q.cols, "edicao_id", "só o id da edição — nunca payload/valores");
  assert.equal(q.count, "exact", "paginação precisa do count exato");
});

test("backend supabase: a query NUNCA pede payload (GATE 22 ao nível do SQL)", async () => {
  await chamar();
  const bruto = JSON.stringify(consultas).toLowerCase();
  assert.ok(!bruto.includes("payload"), "a query não pode mencionar payload");
  assert.ok(!bruto.includes("valor"), "a query não pode mencionar valor");
  assert.deepEqual(Object.keys((await chamar()).corpo.participacoes[0]).sort(), ["edicaoId", "lances"]);
});

test("backend supabase: ?edicaoId= filtra e edição sem participação → vazio", async () => {
  const a = await chamar("?edicaoId=R-2");
  assert.deepEqual(a.corpo.participacoes, [{ edicaoId: "R-2", lances: 1 }]);
  const b = await chamar("?edicaoId=R-9");   // R-9 é de OUTRO
  assert.equal(b.status, 200);
  assert.deepEqual(b.corpo.participacoes, []);
});
