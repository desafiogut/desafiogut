// MC104 — Frente B: exportação LGPD art. 18 completa e SÓ do titular.
// Handler REAL (exportar-dados.mjs) sobre Blobs em memória + Supabase em duplo que APLICA os filtros
// (eq, incluindo payload->>campo, e or) e recusa `.eq(col, null)` como o PostgREST real. Em TODAS as
// fontes há dados de um terceiro: nenhum pode sair (HARD GATE 13).
//
// node --test --experimental-test-module-mocks _tests/mc104-exportar-dados.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const TITULAR = "0xaaa0000000000000000000000000000000000aaa";
const OUTRO   = "0xbbb0000000000000000000000000000000000bbb";
const ADMIN   = "0xccc0000000000000000000000000000000000ccc";
const PARECIDO = "0xaaa0000000000000000000000000000000000aab"; // difere do TITULAR só no último carácter

const blobs = new Map();
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async setJSON(k, v) { m.set(k, JSON.stringify(v)); },
      };
    },
  },
});

// ── Supabase em duplo fiel aos filtros ────────────────────────────────────────────────────────────
let db = {};
// Esquema REAL (information_schema de produção, 2026-09-30): coluna inexistente → 42703, como o PostgREST.
const SCHEMA = {
  saldo_rs: ["cliente_id", "payload"], troco_senhas: ["cliente_id", "payload"], wallet: ["cliente_id", "payload"],
  saldo_rs_creditos: ["pedido_id", "payload"], saldo_rs_debitos: ["operacao_id", "payload"],
  lances: ["id", "edicao_id", "endereco"], lojistas: ["id", "endereco"], atividade_utilizadores: ["endereco", "acessos"],
  pontuacoes: ["ciclo_id", "endereco", "pontos"], rankings_ciclo: ["ciclo_id", "endereco", "posicao"],
  cotas: ["cliente_id", "endereco", "email"],
  passes: ["id", "endereco", "edicao_id", "produto_id", "comprado_em", "palpite_usado", "cupons_ids", "status"], // MC105a.1
};
function exigirColuna(tabela, col) {
  const base = col.split("->>")[0];
  if (!SCHEMA[tabela]) throw new Error(`42P01: tabela ${tabela} não existe`);
  if (!SCHEMA[tabela].includes(base)) throw new Error(`42703: coluna ${tabela}.${base} não existe`);
}
const ctx = { configurado: true, falharTabela: null };
function valor(row, col) {
  const m = col.match(/^(\w+)->>(\w+)$/);
  return m ? row[m[1]]?.[m[2]] : row[col];
}
function consulta(tabela) {
  const filtros = [];
  let selecionado = false;
  const q = {
    select(cols) { if (cols !== "*") throw new Error("duplo: só select('*')"); selecionado = true; return q; },
    eq(col, v) {
      exigirColuna(tabela, col);
      if (v === null || v === undefined) throw new Error("22007: eq.null não é IS NULL");
      filtros.push((r) => String(valor(r, col)) === String(v)); return q;
    },
    or(expr) {
      const alts = expr.split(",").map((p) => { const [c, op, ...v] = p.split("."); if (op !== "eq") throw new Error("duplo: só eq no or"); exigirColuna(tabela, c); return [c, v.join(".")]; });
      filtros.push((r) => alts.some(([c, v]) => String(r[c]) === v)); return q;
    },
    then(res, rej) {
      if (!selecionado) return rej(new Error("duplo: sem select"));
      if (ctx.falharTabela === tabela) return res({ data: null, error: { message: "permission denied" } });
      return res({ data: (db[tabela] ?? []).filter((r) => filtros.every((f) => f(r))), error: null });
    },
  };
  return q;
}
mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    supabaseConfigurado: () => ctx.configurado,
    getSupabaseReadOnly: () => ({ from: consulta }),
    getSupabase: () => ({ from: consulta }),
  },
});
const sessoes = { "tok-titular": TITULAR, "tok-outro": OUTRO, "tok-admin": ADMIN };
mock.module("../_lib/jwt.mjs", {
  namedExports: {
    verificarUserSession: async (t) => { if (!sessoes[t]) { const e = new Error("inv"); e.code = "X"; throw e; } return { endereco: sessoes[t], tipo: "user-session" }; },
  },
});
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [ADMIN] } });
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });

const { default: handler } = await import("../exportar-dados.mjs");

const exportar = async (endereco = TITULAR, token = "tok-titular") => {
  const res = await handler(new Request("https://x.test/.netlify/functions/exportar-dados", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ endereco }),
  }));
  return { status: res.status, corpo: res.status === 200 ? await res.json() : null };
};
const blob = (store, key, v) => { if (!blobs.has(store)) blobs.set(store, new Map()); blobs.get(store).set(key, JSON.stringify(v)); };

function semear() {
  // Blobs
  blob("pedidos", "pedido:p1", { produtoId: "p1", comprador: TITULAR, morada: { cep: "69000-000" }, cpf: "111", nfe: { numero: "9" }, lojista: "cnpj:00000000000100" });
  blob("pedidos", "pedido:p2", { produtoId: "p2", comprador: OUTRO, morada: { cep: "01000-000" }, cpf: "222" });
  blob("pedidos", `comprador:${TITULAR}`, { ids: ["p1"] });
  blob("lances-relampago", "R-1", { lances: [
    { lanceId: "l1", endereco: TITULAR, valorCentavos: 5 },
    { lanceId: "l2", endereco: OUTRO, valorCentavos: 7 },
  ] });
  blob("consent-log", `100:${TITULAR}`, { endereco: TITULAR, contexto: "gate-legal", termoVersao: "2.0" });
  blob("consent-log", `101:${OUTRO}`, { endereco: OUTRO, contexto: "gate-legal" });
  blob("consent-log", `102:${PARECIDO}`, { endereco: PARECIDO, contexto: "gate-legal", marca: "parecido" });
  blob("lance-idem", "k1", { endereco: TITULAR, lanceId: "l1" });
  blob("lance-idem", "k2", { endereco: OUTRO, lanceId: "l2" });
  // Supabase
  db = {
    saldo_rs: [{ cliente_id: TITULAR, payload: { centavos: 100 } }, { cliente_id: OUTRO, payload: { centavos: 999 } }],
    troco_senhas: [{ cliente_id: TITULAR, payload: { senhas: 2 } }, { cliente_id: OUTRO, payload: {} }],
    wallet: [{ cliente_id: TITULAR, payload: { saldoCentavos: 3 } }],
    saldo_rs_creditos: [{ pedido_id: "c1", payload: { endereco: TITULAR, valorCentavos: 500 } }, { pedido_id: "c2", payload: { endereco: OUTRO } }],
    saldo_rs_debitos: [{ operacao_id: "d0", payload: { endereco: TITULAR } }, { operacao_id: "d1", payload: { endereco: OUTRO } }],
    lances: [{ id: 1, endereco: TITULAR, edicao_id: "R-1" }, { id: 2, endereco: OUTRO }],
    lojistas: [{ id: 7, endereco: TITULAR }, { id: 1, endereco: OUTRO }],
    atividade_utilizadores: [{ endereco: TITULAR, acessos: 4 }, { endereco: OUTRO, acessos: 9 }],
    pontuacoes: [{ ciclo_id: "R-1", endereco: TITULAR, pontos: 3 }, { ciclo_id: "R-1", endereco: OUTRO, pontos: 1 }],
    rankings_ciclo: [{ ciclo_id: "R-1", endereco: TITULAR, posicao: 1 }, { ciclo_id: "R-1", endereco: OUTRO, posicao: 2 }],
    passes: [{ id: "ps1", endereco: TITULAR, edicao_id: "P-1", produto_id: "prod-1", status: "activo" }, { id: "ps2", endereco: OUTRO, edicao_id: "P-1", produto_id: "prod-1", status: "activo" }],
    cotas: [{ cliente_id: TITULAR, endereco: TITULAR, email: "t@x" }, { cliente_id: "outro-id", endereco: TITULAR, email: "t2@x" }, { cliente_id: TITULAR, endereco: null, email: "t3@x" }, { cliente_id: OUTRO, endereco: OUTRO, email: "o@x" }],
  };
}

beforeEach(() => { blobs.clear(); db = {}; ctx.configurado = true; ctx.falharTabela = null; });

test("titular com dados → pedidos (morada/CPF/NF-e), lances, pontos, consentimento e dados do Supabase", async () => {
  semear();
  const { status, corpo } = await exportar();
  assert.equal(status, 200);
  const d = corpo.dados;
  assert.equal(d.pedidos.length, 1);
  assert.equal(d.pedidos[0].produtoId, "p1");
  assert.deepEqual([d.pedidos[0].morada.cep, d.pedidos[0].cpf, d.pedidos[0].nfe.numero], ["69000-000", "111", "9"]);
  assert.deepEqual(d.lances_relampago.map((l) => [l.edicaoId, l.lanceId]), [["R-1", "l1"]]);
  assert.equal(d.consent_log.length, 1);
  assert.equal(d.consent_log[0].contexto, "gate-legal");
  const t = d.supabase.tabelas;
  assert.equal(d.supabase.disponivel, true);
  assert.deepEqual(t.lances.map((r) => r.id), [1]);
  assert.deepEqual(t.pontuacoes.map((r) => r.pontos), [3]);
  assert.deepEqual(t.rankings_ciclo.map((r) => r.posicao), [1]);
  assert.deepEqual(t.saldo_rs.map((r) => r.payload.centavos), [100]);
  assert.deepEqual(t.saldo_rs_creditos.map((r) => r.pedido_id), ["c1"]);
  assert.deepEqual(t.wallet.length, 1);
  assert.deepEqual(t.atividade_utilizadores.map((r) => r.acessos), [4]);
  assert.deepEqual(t.cotas.map((c) => c.email).sort(), ["t2@x", "t3@x", "t@x"], "cotas por cliente_id OU endereco (incl. endereco nulo)");
  assert.deepEqual(t.troco_senhas.map((r) => r.payload.senhas), [2]);
  assert.deepEqual(t.saldo_rs_debitos.map((r) => r.operacao_id), ["d0"]);
  assert.deepEqual(t.lojistas.map((r) => r.id), [7]);
  assert.deepEqual(t.passes.map((r) => r.id), ["ps1"], "MC105a.1: passes do titular (e só dele)");
  assert.deepEqual(Object.keys(t).sort(), ["atividade_utilizadores", "cotas", "lances", "lojistas", "passes", "pontuacoes", "rankings_ciclo", "saldo_rs", "saldo_rs_creditos", "saldo_rs_debitos", "troco_senhas", "wallet"]);
  assert.deepEqual(d.supabase.erros, []);
});

test("HARD GATE 13: NADA de terceiros em nenhuma parte da exportação", async () => {
  semear();
  const { corpo } = await exportar();
  const txt = JSON.stringify(corpo);
  assert.ok(!txt.includes(OUTRO), "endereço de terceiro na exportação");
  assert.ok(!txt.includes(PARECIDO) && !txt.includes("parecido"), "endereço QUASE igual ao do titular entrou");
  // Declarado: o pedido do titular traz o `lojista` (vendedor, já público na listagem) — é parte do registo DELE.
  for (const marca of ["01000-000", "\"222\"", "\"l2\"", "999", "o@x", "\"c2\"", "\"ps2\""]) assert.ok(!txt.includes(marca), `dado de terceiro: ${marca}`);
});

test("chaves que já existiam continuam lá, com o mesmo significado (HARD GATE 4)", async () => {
  semear();
  const { corpo } = await exportar();
  for (const k of ["saldo-rs", "wallet", "cotas", "renovacao-adesao", "voucher", "consent_log", "lance_idem", "pedidos"]) {
    assert.ok(Object.hasOwn(corpo.dados, k), k);
  }
  assert.deepEqual(corpo.dados.lance_idem.map((x) => x.key), ["k1"]);
  assert.equal(corpo.titular, TITULAR);
});

test("titular SEM dados → 200, listas vazias, sem falhar", async () => {
  const { status, corpo } = await exportar();
  assert.equal(status, 200);
  assert.deepEqual(corpo.dados.pedidos, []);
  assert.deepEqual(corpo.dados.lances_relampago, []);
  assert.ok(Object.values(corpo.dados.supabase.tabelas).every((v) => Array.isArray(v) && v.length === 0));
});

test("Supabase não configurado → exportação continua e DIZ que não incluiu", async () => {
  semear(); ctx.configurado = false;
  const { status, corpo } = await exportar();
  assert.equal(status, 200);
  assert.deepEqual(corpo.dados.supabase, { disponivel: false });
});

test("erro numa tabela → as outras vêm, e o erro é DECLARADO (não parece vazio)", async () => {
  semear(); ctx.falharTabela = "pontuacoes";
  const { corpo } = await exportar();
  assert.equal(corpo.dados.supabase.tabelas.pontuacoes, null);
  assert.deepEqual(corpo.dados.supabase.tabelas.lances.map((r) => r.id), [1]);
  assert.equal(corpo.dados.supabase.erros.length, 1);
  assert.match(corpo.dados.supabase.erros[0], /^pontuacoes:/);
});

test("autorização: outro titular → 403; admin → 200 com os dados DO titular pedido", async () => {
  semear();
  assert.equal((await exportar(TITULAR, "tok-outro")).status, 403);
  const adm = await exportar(TITULAR, "tok-admin");
  assert.equal(adm.status, 200);
  assert.ok(!JSON.stringify(adm.corpo).includes(OUTRO));
});

test("HARD GATE 14: o log da exportação não tem o endereço completo", async () => {
  semear();
  const linhas = [];
  const orig = { info: console.info, warn: console.warn, log: console.log };
  for (const k of Object.keys(orig)) console[k] = (...a) => linhas.push(JSON.stringify(a));
  try { await exportar(); } finally { Object.assign(console, orig); }
  assert.ok(linhas.length > 0, "controlo: houve log");
  assert.ok(!linhas.join("\n").includes(TITULAR));
});
