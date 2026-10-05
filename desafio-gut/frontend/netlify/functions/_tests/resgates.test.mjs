// UTAC106g — testes dos ENDPOINTS do resgate do cartão e da validação da edição no palpite.
//
// Cobre, por execução real dos handlers (não por proxy de texto):
//   · `resgatar-cartao.mjs` — 201 / 200 idempotente / 402 (só pontos de COMPRA) / 400 (morada) /
//     401 (sem Bearer) / ROLLBACK do débito quando o registo do pedido falha;
//   · `registar-palpite.mjs` — 404 edição inexistente / 409 não-Programada / 409 não-aberta /
//     409 edição já apurada (R2) / 201 no caminho feliz.
//
// Duplo só nas fronteiras de I/O: um Supabase INLINE que modela `public.pontos` + `public.palpites`
// + `public.resgates` com a semântica PostgREST MÍNIMA que os endpoints usam. Qualquer outra operação
// LANÇA. O `_lib/passe-pontos.mjs`, o `_lib/resgates.mjs`, o `_lib/pedidos.mjs` (validarMorada) e os
// handlers são os REAIS — a validação da morada não é duplicada no teste.
//
// ⚠️ O que NÃO prova: a DDL real (CHECK/UNIQUE/FK/RLS), a AWS Lambda e o deploy.
//
// node --test --experimental-test-module-mocks _tests/resgates.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const A = "0xaaa0000000000000000000000000000000000001";
process.env.JWT_SECRET = "segredo-de-teste-106g-com-comprimento-suficiente";

// ── Duplo PostgREST (pontos + palpites + resgates) ──────────────────────────────────────────────
let DB;
let FALHAR_RESGATES = false;
function criarDuplo(seed = {}) {
  const db = {
    pontos: (seed.pontos ?? []).map((p) => ({ historico: [], ...p })),
    palpites: (seed.palpites ?? []).map((p) => ({ apurado: false, resultado: null, ...p })),
    resgates: (seed.resgates ?? []).map((r) => ({ ...r })),
  };
  let seq = db.resgates.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
  const erro = (code, message) => ({ data: null, error: { code, message } });

  function from(tabela) {
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
    for (const m of ["neq", "gt", "lt", "gte", "lte", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado — acrescentar com a semântica real`); };
    }
    const casa = (l) => st.filtros.every(([c, v, op]) => (op === "eq" ? l[c] === v : v.includes(l[c])));
    function exec() {
      const t = db[tabela];
      if (st.op === "insert") {
        const l = { ...st.dados };
        if (tabela === "resgates") {
          if (FALHAR_RESGATES) return erro("XX000", "falha forçada do store de resgates");
          l.id = ++seq;
          if (t.some((r) => r.idempotency_key === l.idempotency_key)) return erro("23505", "duplicate key value violates unique constraint");
        }
        if (tabela === "palpites" && t.some((p) => p.endereco === l.endereco && p.edicao_id === l.edicao_id)) {
          return erro("23505", "duplicate key value violates unique constraint");
        }
        if (tabela === "pontos" && t.some((p) => p.endereco === l.endereco)) return erro("23505", "dup");
        t.push(l);
        return { data: l, error: null };
      }
      if (st.op === "update") { const a = t.filter(casa); for (const l of a) Object.assign(l, st.dados); return { data: a, error: null }; }
      let linhas = t.filter(casa).slice();
      for (const [c, asc] of [...st.ordem].reverse()) linhas.sort((a, b) => (a[c] === b[c] ? 0 : a[c] > b[c] ? 1 : -1) * (asc ? 1 : -1));
      if (st.terminal === "maybe") return { data: linhas[0] ?? null, error: null };
      if (st.terminal === "single") return linhas.length === 1 ? { data: linhas[0], error: null } : erro("PGRST116", "não single");
      return { data: linhas, error: null };
    }
    return api;
  }
  return { db, from };
}

// A edição devolvida por `buscarEdicao` (muda por teste).
let EDICAO = null;

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
    sistemaPausado: () => false, lerEstadoSistema: async () => ({ status: "ativo" }),
    STORE_SYSTEM_STATE: "system-state", KEY_SYSTEM_STATE: "state", escreverEstadoSistema: async () => {},
  },
});
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/edicoes-core.mjs", {
  namedExports: { buscarEdicao: async () => EDICAO, EDICAO_ID_RE: /^(?:(PROG|RELAMP|R)-\d+|ESPECIAL-[A-Z0-9]+)$/ },
});
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { adicionarNotificacao: async () => true } });

const resgatarCartao = (await import("../resgatar-cartao.mjs")).default;
const registarPalpite = (await import("../registar-palpite.mjs")).default;

const compra = (n) => ({ tipo: "compra", pontos: n, ref: `c${n}`, data: "2026-10-01T00:00:00.000Z" });
const palpite = (n) => ({ tipo: "palpite", pontos: n, ref: `p${n}`, data: "2026-10-02T00:00:00.000Z" });

const MORADA_OK = {
  nome: "Maria Quildo", cpf: "11144477735", cep: "69027010", logradouro: "Rua das Flores",
  numero: "42", complemento: "", bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999",
};

function semear(historico, total) {
  DB = criarDuplo({ pontos: [{ endereco: A, pontos: total, historico, atualizado_em: "2026-10-04T00:00:00.000Z" }] });
  FALHAR_RESGATES = false;
  EDICAO = null;
}

const post = (handler, corpo, { comToken = true } = {}) => {
  const headers = comToken ? { authorization: "Bearer x" } : {};
  return handler(new Request("https://ex.test/x", { method: "POST", headers, body: JSON.stringify(corpo) }));
};
const corpoResgate = (extra = {}) => ({ cartaoId: "cartao-familia-quildo", morada: MORADA_OK, idempotencyKey: "k-106g-0001", ...extra });

// ═══ RESGATE ════════════════════════════════════════════════════════════════════════════════════
test("RESGATE · 50 pontos de compra → 201, debita 50 e cria o pedido pendente", async () => {
  semear([compra(50)], 50);
  const res = await post(resgatarCartao, corpoResgate());
  const b = await res.json();
  assert.equal(res.status, 201);
  assert.equal(b.ok, true);
  assert.equal(b.status, "pendente");
  assert.equal(DB.db.resgates.length, 1, "tem de criar UMA linha em public.resgates");
  assert.equal(DB.db.pontos[0].pontos, 0, "os 50 pontos foram debitados");
  const hist = DB.db.pontos[0].historico;
  assert.equal(hist.at(-1).tipo, "resgate");
  assert.equal(hist.at(-1).pontos, -50);
});

test("RESGATE · 48 de COMPRA + 2 de palpite (total 50) → 402 (o cartão conta só a compra)", async () => {
  semear([compra(48), palpite(2)], 50);
  const res = await post(resgatarCartao, corpoResgate());
  const b = await res.json();
  assert.equal(res.status, 402, "50 de TOTAL mas só 48 de cartão → não pode resgatar");
  assert.equal(b.error.code, "pontos_insuficientes");
  assert.equal(DB.db.resgates.length, 0, "nada pode ser criado");
  assert.equal(DB.db.pontos[0].pontos, 50, "nada pode ser debitado");
});

test("RESGATE · mesma idempotencyKey → 200 idempotente, SEM debitar de novo", async () => {
  semear([compra(100)], 100);
  const r1 = await post(resgatarCartao, corpoResgate());
  assert.equal(r1.status, 201);
  const r2 = await post(resgatarCartao, corpoResgate());
  const b2 = await r2.json();
  assert.equal(r2.status, 200);
  assert.equal(b2.idempotent, true);
  assert.equal(DB.db.resgates.length, 1, "uma só linha — a chave é natural");
  assert.equal(DB.db.pontos[0].pontos, 50, "só UMA vez 50 debitados (100 → 50)");
});

test("RESGATE · morada inválida (CEP) → 400 e nada é debitado", async () => {
  semear([compra(50)], 50);
  const res = await post(resgatarCartao, corpoResgate({ morada: { ...MORADA_OK, cep: "123" } }));
  const b = await res.json();
  assert.equal(res.status, 400);
  assert.equal(b.error.code, "morada_invalida");
  assert.equal(DB.db.pontos[0].pontos, 50);
  assert.equal(DB.db.resgates.length, 0);
});

test("RESGATE · ROLLBACK — se o registo do pedido falha, os 50 pontos VOLTAM", async () => {
  semear([compra(50)], 50);
  FALHAR_RESGATES = true;
  const res = await post(resgatarCartao, corpoResgate({ idempotencyKey: "k-rollback-01" }));
  const b = await res.json();
  assert.equal(res.status, 502);
  assert.equal(b.error.code, "resgate_falhou");
  assert.equal(b.error.devolvido, true, "o endpoint tem de declarar que devolveu os pontos");
  assert.equal(DB.db.resgates.length, 0);
  assert.equal(DB.db.pontos[0].pontos, 50, "o débito foi compensado (rollback): 50 → 0 → 50");
  const hist = DB.db.pontos[0].historico;
  const tiposDeCompensacao = hist.slice(-2).map((h) => h.tipo);
  assert.deepEqual(tiposDeCompensacao, ["resgate", "resgate"], "débito + compensação, ambos auditáveis no histórico");
  assert.equal(hist.at(-2).pontos, -50);
  assert.equal(hist.at(-1).pontos, 50);
});

test("RESGATE · sem Bearer → 401 (o resgate nunca é anónimo)", async () => {
  semear([compra(50)], 50);
  const res = await post(resgatarCartao, corpoResgate(), { comToken: false });
  const b = await res.json();
  assert.equal(res.status, 401);
  assert.equal(b.error.code, "token_ausente");
  assert.equal(DB.db.pontos[0].pontos, 50);
});

// ═══ PALPITE — validação da edição (decisão #6) e R2 ════════════════════════════════════════════
const corpoPalpite = (extra = {}) => ({ edicaoId: "PROG-7", valor: 120, ...extra });

test("PALPITE · edição inexistente → 404", async () => {
  semear([compra(1)], 1);
  EDICAO = null;
  const res = await post(registarPalpite, corpoPalpite());
  const b = await res.json();
  assert.equal(res.status, 404);
  assert.equal(b.error.code, "edicao_inexistente");
});

test("PALPITE · edição Relâmpago → 409 (só se palpita em Programadas)", async () => {
  semear([compra(1)], 1);
  EDICAO = { id: "RELAMP-1", tipo: "relampago", status: "aberto" };
  const res = await post(registarPalpite, corpoPalpite({ edicaoId: "RELAMP-1" }));
  const b = await res.json();
  assert.equal(res.status, 409);
  assert.equal(b.error.code, "edicao_nao_programada");
  assert.equal(DB.db.palpites.length, 0, "não pode registar o palpite");
});

test("PALPITE · edição Programada mas ENCERRADA → 409", async () => {
  semear([compra(1)], 1);
  EDICAO = { id: "PROG-7", tipo: "programado", status: "encerrado" };
  const res = await post(registarPalpite, corpoPalpite());
  const b = await res.json();
  assert.equal(res.status, 409);
  assert.equal(b.error.code, "edicao_nao_aberta");
  assert.equal(DB.db.palpites.length, 0);
});

test("PALPITE · edição já APURADA → 409 (R2: fecha a edição a palpites novos)", async () => {
  semear([compra(1)], 1);
  EDICAO = { id: "PROG-7", tipo: "programado", status: "aberto" };
  DB.db.palpites.push({ id: 1, endereco: A, edicao_id: "PROG-7", valor: 10, apurado: true, resultado: "mais_proximo" });
  const res = await post(registarPalpite, corpoPalpite());
  const b = await res.json();
  assert.equal(res.status, 409);
  assert.equal(b.error.code, "edicao_apurada");
  assert.equal(DB.db.palpites.length, 1, "não pode acrescentar um palpite novo");
});

test("PALPITE · edição Programada e ABERTA → 201 (caminho feliz)", async () => {
  semear([compra(1)], 1);
  EDICAO = { id: "PROG-7", tipo: "programado", status: "aberto" };
  const res = await post(registarPalpite, corpoPalpite());
  const b = await res.json();
  assert.equal(res.status, 201);
  assert.equal(b.ok, true);
  assert.equal(b.palpite.valor, 120);
  assert.equal(DB.db.palpites.length, 1);
});
