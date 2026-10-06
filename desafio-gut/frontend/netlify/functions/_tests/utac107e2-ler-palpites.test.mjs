// UTAC107e.2 — Frente C: `GET /ler-palpites?edicaoId=`.
//
// Endpoint, `_lib/passe-pontos.mjs` e `_lib/jwt.mjs` REAIS (tokens assinados a sério). Duplos SÓ no I/O:
// Supabase (palpites), edição (`buscarEdicao`) e estado do sistema.
//
// node --test --experimental-test-module-mocks _tests/utac107e2-ler-palpites.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "segredo-de-teste-utac107e2-com-comprimento-suficiente";

const A = "0xaaa0000000000000000000000000000000000001";
const B = "0xbbb0000000000000000000000000000000000002";

let PALPITES;   // linhas de public.palpites
let EDICOES;    // id → edição
let falharDb;
let pausado = false;

const casa = (filtros) => (l) => filtros.every(([c, v]) => l[c] === v);
mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => ({
      from(tabela) {
        if (tabela !== "palpites") throw new Error(`duplo: tabela ${tabela} não modelada`);
        const st = { filtros: [], ordem: null, colunas: "*" };
        const api = {
          select(c) { st.colunas = c; return api; },
          eq(c, v) { st.filtros.push([c, v]); return api; },
          order(c, o) { st.ordem = [c, o?.ascending !== false]; return api; },
          then(res, rej) {
            return Promise.resolve().then(() => {
              if (falharDb) return { data: null, error: { code: "XX000", message: "falha" } };
              let linhas = PALPITES.filter(casa(st.filtros));
              if (st.ordem) {
                const [c, asc] = st.ordem;
                linhas = linhas.slice().sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
              }
              if (st.colunas !== "*") {
                const cols = st.colunas.split(",");
                linhas = linhas.map((l) => Object.fromEntries(cols.map((k) => [k, l[k]])));
              }
              return { data: linhas, error: null };
            }).then(res, rej);
          },
        };
        return api;
      },
    }),
    getSupabaseReadOnly: () => { throw new Error("não usado"); },
    supabaseConfigurado: () => true,
  },
});
mock.module("../_lib/system-state.mjs", {
  namedExports: {
    sistemaPausado: () => pausado, lerEstadoSistema: async () => ({ status: "ativo" }),
    STORE_SYSTEM_STATE: "system-state", KEY_SYSTEM_STATE: "state", escreverEstadoSistema: async () => {},
  },
});
mock.module("../_lib/edicoes-core.mjs", {
  namedExports: {
    EDICAO_ID_RE: /^(?:(PROG|RELAMP|R)-\d+|ESPECIAL-[A-Z0-9]+)$/,
    buscarEdicao: async (id) => EDICOES[id] ?? null,
  },
});

const { assinarUserSession, assinarLanceAuth } = await import("../_lib/jwt.mjs");
const handler = (await import("../ler-palpites.mjs")).default;
const TK = await assinarUserSession(A);

const palpite = (endereco, edicao_id, valor, criado_em, apurado = false) =>
  ({ id: Math.random(), endereco, edicao_id, valor, criado_em, apurado, resultado: null });

async function chamar(query, token = TK) {
  const res = await handler(new Request(`https://ex.test/ler-palpites?${query}`, {
    method: "GET", headers: token ? { authorization: `Bearer ${token}` } : {},
  }));
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  falharDb = false;
  pausado = false;
  EDICOES = { "PROG-1": { id: "PROG-1", tipo: "programado", status: "aberto" } };
  PALPITES = [
    palpite(B, "PROG-1", 40, "2026-10-06T10:00:02.000Z"),
    palpite(A, "PROG-1", 25, "2026-10-06T10:00:01.000Z"),
    palpite(A, "PROG-2", 99, "2026-10-06T10:00:03.000Z"),
  ];
});

test("C1 — sem token 401; token lance-auth 401", async () => {
  assert.equal((await chamar("edicaoId=PROG-1", null)).status, 401);
  const r = await chamar("edicaoId=PROG-1", await assinarLanceAuth(A));
  assert.equal(r.status, 401);
  assert.equal(r.body.error.code, "token_invalido");
});

test("C2 — edicaoId inválido 400; inexistente 404", async () => {
  assert.equal((await chamar("edicaoId=x;drop")).status, 400);
  assert.equal((await chamar("")).status, 400);
  const r = await chamar("edicaoId=PROG-9");
  assert.equal(r.status, 404);
  assert.equal(r.body.error.code, "edicao_inexistente");
});

test("C3 — edição ABERTA: lista quem participou SEM o valor", async () => {
  const r = await chamar("edicaoId=PROG-1");
  assert.equal(r.status, 200);
  assert.equal(r.body.revelado, false);
  assert.equal(r.body.palpites.length, 2, "só os palpites desta edição");
  for (const p of r.body.palpites) {
    assert.deepEqual(Object.keys(p).sort(), ["data", "endereco"]);
  }
  assert.doesNotMatch(JSON.stringify(r.body), /"valor"/, "nenhum valor no corpo durante a edição");
  assert.deepEqual(r.body.palpites.map((p) => p.endereco), [A, B], "mais antigos primeiro");
});

test("C4 — edição AGENDADA também esconde o valor", async () => {
  EDICOES["PROG-1"].status = "agendado";
  const r = await chamar("edicaoId=PROG-1");
  assert.equal(r.body.revelado, false);
  assert.doesNotMatch(JSON.stringify(r.body), /"valor"/);
});

test("C5 — edição ENCERRADA ou APURADA: revela o valor", async () => {
  for (const status of ["encerrado", "apurado"]) {
    EDICOES["PROG-1"].status = status;
    const r = await chamar("edicaoId=PROG-1");
    assert.equal(r.body.revelado, true, status);
    assert.deepEqual(r.body.palpites.map((p) => [p.endereco, p.valor]), [[A, 25], [B, 40]]);
  }
});

test("C6 — status ainda «aberto» mas a edição JÁ FOI APURADA ⇒ revela (o registar-palpite já recusa)", async () => {
  PALPITES[0].apurado = true;
  const r = await chamar("edicaoId=PROG-1");
  assert.equal(r.body.revelado, true);
  assert.ok(r.body.palpites.every((p) => Number.isInteger(p.valor)));
});

test("C7 — o prazo (termino_em) NÃO revela: aberta com prazo vencido continua escondida", async () => {
  EDICOES["PROG-1"].termino_em = "2020-01-01T00:00:00.000Z";
  const r = await chamar("edicaoId=PROG-1");
  assert.equal(r.body.revelado, false);
});

test("C8 — falha do Supabase ⇒ 503 (não finge lista vazia)", async () => {
  falharDb = true;
  const r = await chamar("edicaoId=PROG-1");
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, "store_indisponivel");
});

test("C9 — edição sem palpites ⇒ lista vazia", async () => {
  EDICOES["PROG-3"] = { id: "PROG-3", tipo: "programado", status: "aberto" };
  const r = await chamar("edicaoId=PROG-3");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.palpites, []);
});

test("C10 — método diferente de GET ⇒ 405", async () => {
  const res = await handler(new Request("https://ex.test/ler-palpites?edicaoId=PROG-1", {
    method: "POST", headers: { authorization: `Bearer ${TK}` },
  }));
  assert.equal(res.status, 405);
});

test("C11 — sistema pausado ⇒ 503 sistema_pausado, sem ler palpites (achado A4)", async () => {
  pausado = true;
  falharDb = true; // se lesse, daria store_indisponivel
  const r = await chamar("edicaoId=PROG-1");
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, "sistema_pausado");
});
