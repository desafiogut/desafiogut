// UTAC106f-R1t — REGRESSÃO DA R1 NO ENDPOINT `ler-pontos.mjs` (promovido do validador do R1v).
//
// PORQUE EXISTE (bloqueante 1 do veredicto `_logs/UTAC106f-R1v-revalidacao.md`): o `ler-pontos.mjs` é a
// ÚNICA camada de produção que decide o cartão — a UI confia no flag `podeResgatarCartao` que ele devolve.
// Até aqui NÃO tinha um único teste: reabrir o defeito da R1 nessa linha deixava a suíte canónica INTEIRA
// verde e o gate de mutação `7/7` verde (os mutantes R-C e R-D sobreviviam). Estes testes medem o
// COMPORTAMENTO REAL do endpoint — a resposta HTTP que a UI consome — não um proxy de texto.
//
// Duplo só nas fronteiras de I/O: um Supabase INLINE que modela `public.pontos` + `public.palpites` com a
// semântica PostgREST MÍNIMA que o `ler-pontos.mjs` usa (select/eq/order/maybeSingle). Qualquer outra
// operação LANÇA. O `ler-pontos.mjs` e o `_lib/passe-pontos.mjs` testados são os REAIS.
//
// ⚠️ O que estes testes NÃO provam: a DDL real (RLS/GRANT) e o deploy — isso é do Postgres/Netlify.
//
// node --test --experimental-test-module-mocks _tests/ler-pontos.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const A = "0xaaa0000000000000000000000000000000000001";
process.env.JWT_SECRET = "segredo-de-teste-r1t-com-comprimento-suficiente";

// ── Duplo PostgREST mínimo (modela pontos + palpites) ───────────────────────────────────────────
let DB;
function criarDuplo(pontosRegistos, palpites = []) {
  const db = { pontos: pontosRegistos, palpites };
  const erro = (code, message) => ({ data: null, error: { code, message } });
  return {
    db,
    from(tabela) {
      if (!(tabela in db)) throw new Error(`duplo: tabela ${tabela} não modelada`);
      const st = { op: null, dados: null, filtros: [], ordem: [], terminal: null };
      const api = {
        select() { if (st.op === null) st.op = "select"; return api; },
        insert(d) { st.op = "insert"; st.dados = d; return api; },
        update(d) { st.op = "update"; st.dados = d; return api; },
        eq(c, v) { st.filtros.push([c, v, "eq"]); return api; },
        in(c, vs) { st.filtros.push([c, vs, "in"]); return api; },
        order(c, o) { st.ordem.push([c, o?.ascending !== false]); return api; },
        maybeSingle() { st.terminal = "maybe"; return api; },
        single() { st.terminal = "single"; return api; },
        then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
      };
      // Toda a operação NÃO modelada lança: um duplo permissivo esconde o defeito que devia apanhar.
      for (const m of ["neq", "gt", "lt", "gte", "lte", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
        api[m] = () => { throw new Error(`duplo: .${m}() não modelado — acrescentar com a semântica real`); };
      }
      const casa = (l) => st.filtros.every(([c, v, op]) => (op === "eq" ? l[c] === v : v.includes(l[c])));
      function exec() {
        const t = db[tabela];
        if (st.op === "insert") { const l = { ...st.dados }; if (t.some((x) => x.endereco === l.endereco)) return erro("23505", "dup"); t.push(l); return { data: l, error: null }; }
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
mock.module("../_lib/jwt.mjs", {
  namedExports: { verificarUserSession: async () => ({ endereco: A, tipo: "user-session" }) },
});
mock.module("../_lib/system-state.mjs", {
  namedExports: {
    sistemaPausado: () => false,
    lerEstadoSistema: async () => ({ status: "ativo" }),
    STORE_SYSTEM_STATE: "system-state", KEY_SYSTEM_STATE: "state",
    escreverEstadoSistema: async () => {},
  },
});

const handler = (await import("../ler-pontos.mjs")).default;

const compra = (n) => ({ tipo: "compra", pontos: n, ref: `c${n}`, data: "2026-10-01T00:00:00.000Z" });
const palpite = (n) => ({ tipo: "palpite", pontos: n, ref: `p${n}`, data: "2026-10-02T00:00:00.000Z" });
const resgate = (n) => ({ tipo: "resgate", pontos: -n, ref: `r${n}`, data: "2026-10-03T00:00:00.000Z" });

const chamar = async () => {
  const req = new Request("https://ex.test/ler-pontos", { method: "GET", headers: { authorization: "Bearer x" } });
  const res = await handler(req);
  return { status: res.status, body: await res.json() };
};

async function cenario(historico, pontosColuna) {
  DB = criarDuplo([{ endereco: A, pontos: pontosColuna, historico, atualizado_em: "2026-10-04T00:00:00.000Z" }]);
  return chamar();
}

// ═══ R1 — o CARTÃO conta só pontos de compra/resgate (o bónus do palpite NÃO decide) ═════════════
test("R1(a) — 48 compra + 2 palpite (total 50): endpoint NÃO desbloqueia o cartão", async () => {
  const r = await cenario([compra(48), palpite(2)], 50);
  assert.equal(r.status, 200);
  assert.equal(r.body.pontos, 50, "`pontos` é o TOTAL");
  assert.equal(r.body.pontosCartao, 48, "`pontosCartao` conta só a compra");
  assert.equal(r.body.bonusPalpite, 2);
  assert.equal(r.body.podeResgatarCartao, false, "48 de compra + 2 de palpite NÃO desbloqueia (R1)");
});

test("R1(b) — 50 compra: endpoint desbloqueia", async () => {
  const r = await cenario([compra(50)], 50);
  assert.equal(r.body.pontosCartao, 50);
  assert.equal(r.body.podeResgatarCartao, true, "50 de compra DESBLOQUEIA");
});

test("R1(c) — só palpite (2): nunca desbloqueia", async () => {
  const r = await cenario([palpite(2)], 2);
  assert.equal(r.body.pontosCartao, 0);
  assert.equal(r.body.podeResgatarCartao, false);
});

test("R1(c2) — só palpite (60), mesmo acima do limiar: NUNCA desbloqueia", async () => {
  const r = await cenario([palpite(60)], 60);
  assert.equal(r.body.pontos, 60, "o total é 60…");
  assert.equal(r.body.pontosCartao, 0, "…mas o cartão conta 0");
  assert.equal(r.body.bonusPalpite, 60);
  assert.equal(r.body.podeResgatarCartao, false, "o palpite sozinho NUNCA decide o cartão");
});

test("R1(d) — o resgate subtrai: 50 compra + resgate 50 → 0", async () => {
  const r = await cenario([compra(50), resgate(50)], 0);
  assert.equal(r.body.pontosCartao, 0);
  assert.equal(r.body.podeResgatarCartao, false);
});

test("R1(d2) — 60 compra + resgate 50 → 10 (subtrai, não zera)", async () => {
  const r = await cenario([compra(60), resgate(50)], 10);
  assert.equal(r.body.pontosCartao, 10);
  assert.equal(r.body.podeResgatarCartao, false);
});

test("R1(f) — historico vazio mas coluna `pontos`=50: o cartão conta 0 (não confia na coluna)", async () => {
  const r = await cenario([], 50);
  assert.equal(r.body.pontos, 50);
  assert.equal(r.body.pontosCartao, 0, "sem movimentos no histórico, o cartão não tem pontos");
  assert.equal(r.body.podeResgatarCartao, false);
});

// ═══ Contratos de bordo do endpoint (o que a UI consome) ════════════════════════════════════════
test("CONTRATO — sem Bearer → 401 token_ausente (a decisão do cartão não é pública)", async () => {
  DB = criarDuplo([]);
  const req = new Request("https://ex.test/ler-pontos", { method: "GET" });
  const res = await handler(req);
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.error.code, "token_ausente");
});

test("CONTRATO — método != GET → 405", async () => {
  DB = criarDuplo([]);
  const req = new Request("https://ex.test/ler-pontos", { method: "POST", headers: { authorization: "Bearer x" } });
  const res = await handler(req);
  assert.equal(res.status, 405);
});
