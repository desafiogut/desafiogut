// UTAC110g (P-1 / F4 do validador do 110f-front) — LEITURA ÚNICA da linha `pontos` no `ler-pontos`.
//
// O DEFEITO MEDIDO (por leitura, no `2579b51`): o `ler-pontos` fazia DUAS idas ao Supabase à MESMA linha
// de `public.pontos`, EM SÉRIE — (1) `lerPontos()` para `pontos`/`pontosCartao`, e (2)
// `estadoMissoesHoje()` → `lerLedgerLance()`, que volta a fazer `select(endereco,creditos_lance,
// pontos_lance,historico_lance,atualizado_em)` na MESMA linha. O `select("*")` do passo (1) JÁ TRAZ
// `historico_lance`, logo o passo (2) era um ida-e-volta a mais por pedido.
//
// A CORRECÇÃO: novo `missoesDoRegisto(registo)` em `_lib/fontes-lance.mjs` — PURO, deriva do registo já
// lido. O `ler-pontos` passou a usá-lo. Estes testes MEDEM o comportamento real do endpoint e CONTAM as
// leituras no duplo (é o instrumento que morde: o número de `pontos:select` por pedido).
//
// CONTROLO DE VITALIDADE DO INSTRUMENTO: um dos testes conta as leituras de uma chamada DIRECTA a
// `estadoMissoesHoje()` — se o contador não subisse, o «1» do teste principal seria aritmética, não medição.
//
// node --test --experimental-test-module-mocks _tests/utac110g-p1-leitura-unica.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const A = "0xbbb0000000000000000000000000000000000007";
process.env.JWT_SECRET = "segredo-de-teste-110g-com-comprimento-suficiente";

// ── Duplo PostgREST mínimo com CONTADOR DE LEITURAS por tabela ──────────────────────────────────
let DB;
function criarDuplo(pontosRegistos, palpites = []) {
  const db = { pontos: pontosRegistos, palpites };
  const g = { leituras: { pontos: 0, palpites: 0 }, ops: [] };
  const erro = (code, message) => ({ data: null, error: { code, message } });
  return {
    db, g,
    from(tabela) {
      if (!(tabela in db)) throw new Error(`duplo: tabela ${tabela} não modelada`);
      const st = { op: null, dados: null, filtros: [], ordem: [], terminal: null, colunas: null };
      const api = {
        select(cols) { if (st.op === null) { st.op = "select"; st.colunas = cols ?? "*"; } return api; },
        insert(d) { st.op = "insert"; st.dados = d; return api; },
        update(d) { st.op = "update"; st.dados = d; return api; },
        eq(c, v) { st.filtros.push([c, v, "eq"]); return api; },
        in(c, vs) { st.filtros.push([c, vs, "in"]); return api; },
        order(c, o) { st.ordem.push([c, o?.ascending !== false]); return api; },
        maybeSingle() { st.terminal = "maybe"; return api; },
        single() { st.terminal = "single"; return api; },
        then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
      };
      for (const m of ["neq", "gt", "lt", "gte", "lte", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
        api[m] = () => { throw new Error(`duplo: .${m}() não modelado — acrescentar com a semântica real`); };
      }
      const casa = (l) => st.filtros.every(([c, v, op]) => (op === "eq" ? l[c] === v : v.includes(l[c])));
      function exec() {
        const t = db[tabela];
        if (st.op === "select") { g.leituras[tabela] += 1; g.ops.push(`${tabela}:select(${st.colunas})`); }
        else g.ops.push(`${tabela}:${st.op}`);
        if (st.op === "insert") { const l = { ...st.dados }; if (st.dados !== null && t.some((x) => x.endereco === l.endereco)) return erro("23505", "dup"); t.push(l); return { data: l, error: null }; }
        if (st.op === "update") { const a = t.filter(casa); for (const l of a) Object.assign(l, st.dados); return { data: a, error: null }; }
        let linhas = t.filter(casa).slice();
        for (const [c, asc] of [...st.ordem].reverse()) linhas.sort((a, b) => (a[c] === b[c] ? 0 : a[c] > b[c] ? 1 : -1) * (asc ? 1 : -1));
        if (st.terminal === "maybe") return { data: linhas[0] ?? null, error: null };
        if (st.terminal === "single") return linhas.length === 1 ? { data: linhas[0], error: null } : erro("PGRST116", "não single");
        return { data: linhas, error: null };
      }
      return api;
    },
  };
}

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => ({ from: (t) => DB.from(t) }),
    getSupabaseReadOnly: () => ({ from: (t) => DB.from(t) }),
    supabaseConfigurado: () => true,
  },
});
mock.module("../_lib/system-state.mjs", {
  namedExports: {
    sistemaPausado: () => false,
    lerEstadoSistema: async () => ({ status: "ativo" }),
    STORE_SYSTEM_STATE: "system-state", KEY_SYSTEM_STATE: "state",
    escreverEstadoSistema: async () => {},
  },
});

const { assinarUserSession } = await import("../_lib/jwt.mjs");
const TOKEN = await assinarUserSession(A);
const handler = (await import("../ler-pontos.mjs")).default;
const fontes = await import("../_lib/fontes-lance.mjs");

const chamar = async () => {
  const req = new Request("https://ex.test/ler-pontos", { method: "GET", headers: { authorization: `Bearer ${TOKEN}` } });
  const res = await handler(req);
  return { status: res.status, body: await res.json() };
};

const DIA = fontes.diaManaus(new Date());
const entrada = (objeto) => objeto;
const registo = (hist, histLance) => [{
  endereco: A, pontos: 10, historico: hist, atualizado_em: "2026-10-13T00:00:00.000Z",
  creditos_lance: 3, pontos_lance: 15, historico_lance: histLance,
}];

// ═══ P-1 — UMA só leitura da linha `pontos` por pedido ═══════════════════════════════════════════
test("P-1(a) um GET /ler-pontos lê a linha `pontos` UMA vez (era 2, em série)", async () => {
  DB = criarDuplo(registo([], [
    entrada({ data: "2026-10-13T12:00:00.000Z", campo: "pontos_lance", motivo: "login", delta: 5, ref: `login:${DIA}` }),
  ]));
  const r = await chamar();
  assert.equal(r.status, 200);
  assert.equal(DB.g.leituras.pontos, 1, "a mesma linha não pode ser lida duas vezes no mesmo pedido");
});

test("P-1(b) as missões continuam CERTAS — agora derivadas do registo já lido (`historico_lance`)", async () => {
  DB = criarDuplo(registo([], [
    entrada({ data: "2026-10-13T12:00:00.000Z", campo: "pontos_lance", motivo: "login", delta: 5, ref: `login:${DIA}` }),
    entrada({ data: "2026-10-13T12:30:00.000Z", campo: "pontos_lance", motivo: "missao", delta: 10, ref: `missao-lance:${DIA}` }),
  ]));
  const r = await chamar();
  assert.deepEqual(r.body.missoesHoje, { dia: DIA, loginFeito: true, lanceFeito: true, pontosHoje: 15 });
});

test("P-1(c) só o login do dia → 5 pontos hoje; ref de OUTRO dia NÃO conta", async () => {
  DB = criarDuplo(registo([], [
    entrada({ data: "2026-10-13T12:00:00.000Z", campo: "pontos_lance", motivo: "login", delta: 5, ref: `login:${DIA}` }),
    entrada({ data: "2026-01-01T12:00:00.000Z", campo: "pontos_lance", motivo: "login", delta: 5, ref: "login:2020-01-01" }),
    entrada({ data: "2026-01-02T12:00:00.000Z", campo: "pontos_lance", motivo: "missao", delta: 10, ref: "missao-lance:2020-01-02" }),
  ]));
  const r = await chamar();
  assert.deepEqual(r.body.missoesHoje, { dia: DIA, loginFeito: true, lanceFeito: false, pontosHoje: 5 });
  assert.equal(DB.g.leituras.pontos, 1);
});

test("P-1(d) a indicação NÃO entra em `pontosHoje` (só login + 1.º lance)", async () => {
  DB = criarDuplo(registo([], [
    entrada({ data: "2026-10-13T12:00:00.000Z", campo: "pontos_lance", motivo: "indicacao", delta: 50, ref: "indicacao-recebida" }),
  ]));
  const r = await chamar();
  assert.equal(r.body.missoesHoje.loginFeito, false);
  assert.equal(r.body.missoesHoje.lanceFeito, false);
  assert.equal(r.body.missoesHoje.pontosHoje, 0, "a indicação não é missão do dia");
});

test("P-1(e) sem `historico_lance` (linha antiga/ILEGÍVEL) → missões neutras, SEM rebentar e SEM leitura extra", async () => {
  DB = criarDuplo([{ endereco: A, pontos: 50, historico: [{ tipo: "compra", pontos: 50, ref: "c50", data: "2026-10-01T00:00:00.000Z" }], atualizado_em: "2026-10-13T00:00:00.000Z" }]);
  const r = await chamar();
  assert.equal(r.status, 200);
  assert.equal(r.body.pontosCartao, 50);
  assert.deepEqual(r.body.missoesHoje, { dia: DIA, loginFeito: false, lanceFeito: false, pontosHoje: 0 });
  assert.equal(DB.g.leituras.pontos, 1);
});

// ═══ P-2 (lado do SERVIDOR) — a viragem do dia de Manaus é às 04:00 UTC ══════════════════════════
// O frontend só garante que alguém VOLTA A LER (tick horário). A viragem em si é do servidor: é o
// `diaManaus()` que recalcula o dia a cada chamada. Medido aqui, com datas fixas às escondidas da hora real:
// 03:59:59Z ainda é o dia anterior; 04:00:00Z já é o dia novo (UTC-4 fixo, sem horário de verão).
test("P-2(srv) `diaManaus` vira exactamente às 04:00 UTC — 03:59:59Z é o dia anterior, 04:00:00Z é o novo", () => {
  assert.equal(fontes.diaManaus(new Date("2026-10-14T03:59:59Z")), "2026-10-13");
  assert.equal(fontes.diaManaus(new Date("2026-10-14T04:00:00Z")), "2026-10-14");
});

test("P-2(srv2) depois da viragem, as missões do dia NOVO começam a zero (a releitura muda o resultado)", async () => {
  // Um crédito do dia ANTIGO não pode contar como missão do dia novo — é isto que a releitura mostra.
  DB = criarDuplo(registo([], [
    entrada({ data: "2026-10-14T02:00:00.000Z", campo: "pontos_lance", motivo: "login", delta: 5, ref: "login:2026-10-13" }),
    entrada({ data: "2026-10-14T02:00:00.000Z", campo: "pontos_lance", motivo: "missao", delta: 10, ref: "missao-lance:2026-10-13" }),
  ]));
  const depoisDaViragem = fontes.missoesDoRegisto(DB.db.pontos[0], new Date("2026-10-14T04:00:01Z"));
  assert.deepEqual(depoisDaViragem, { dia: "2026-10-14", loginFeito: false, lanceFeito: false });
  const antesDaViragem = fontes.missoesDoRegisto(DB.db.pontos[0], new Date("2026-10-14T03:00:00Z"));
  assert.deepEqual(antesDaViragem, { dia: "2026-10-13", loginFeito: true, lanceFeito: true });
});

// ═══ CONTROLO DE VITALIDADE do instrumento (o contador TEM de subir) ═════════════════════════════
test("CTRL o contador MORDE — uma leitura directa do ledger conta +1 (senão o «1» de P-1(a) seria aritmética)", async () => {
  DB = criarDuplo(registo([], []));
  const antes = DB.g.leituras.pontos;
  await fontes.estadoMissoesHoje(A);          // caminho ANTIGO: lê o ledger
  assert.equal(DB.g.leituras.pontos, antes + 1, "o duplo conta leituras — se não contasse, P-1(a) não provava nada");
  await fontes.missoesDoRegisto({ historico_lance: [] }); // caminho NOVO: puro
  assert.equal(DB.g.leituras.pontos, antes + 1, "missoesDoRegisto é PURA — não toca na rede");
});
