// UTAC110d — DOIS PASSES + LEDGER DE LANCE (Frentes A e B).
//
// REAIS: `_lib/ledger-lance.mjs`, `_lib/passe-pontos.mjs`, `_lib/comprar-passe-tipado.mjs` (via os 2
// endpoints), `_lib/saldoRs.mjs`, `_lib/jwt.mjs` (tokens ASSINADOS — lição do UTAC106j: nunca
// mockar o verificador) e `ler-pontos.mjs`.
// Duplos só nas fronteiras de I/O: Blobs (`_blobs-cas-duplo.mjs`), Supabase (`_supabase-duplo-mc105a.mjs`
// para o saldo R$ + a tabela `pontos` modelada AQUI com as colunas da migração 20261013 e os seus
// CHECKs: coluna inexistente → 42703, contador negativo → 23514), Sentry (espiado).
//
// node --test --experimental-test-module-mocks _tests/utac110d-dois-passes.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110d-dois-passes-comprimento-suficiente";

function criarPontos(tabelas, g) {
  const COLS = ["endereco", "pontos", "historico", "atualizado_em", "creditos_lance", "pontos_lance", "historico_lance"];
  const erro = (code, message) => ({ data: null, error: { code, message, details: null, hint: null } });
  return () => {
    const st = { op: "select", filtros: [], retorno: false, dados: null, terminal: null };
    const api = {
      select() { if (st.op !== "select") st.retorno = true; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "in", "is", "or", "filter", "limit", "range", "order", "delete", "upsert", "single"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado`); };
    }
    function validar(l) {
      for (const c of Object.keys(l)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
      for (const c of ["pontos", "creditos_lance", "pontos_lance"]) {
        if (!Number.isInteger(l[c]) || l[c] < 0) return erro("23514", `${c}_check`);
      }
      if (!Array.isArray(l.historico) || !Array.isArray(l.historico_lance)) return erro("23514", "array_check");
      return null;
    }
    function exec() {
      g.chamadas.push(`pontos:${st.op}`);
      const f = g.falhar.pontos;
      if (f && (!f.op || f.op === st.op) && (!f.se || f.se(st))) return erro(f.code ?? "XX000", "falha simulada");
      const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
      let linhas;
      if (st.op === "insert") {
        const nova = { pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 0, historico_lance: [], ...st.dados };
        const e = validar(nova); if (e) return e;
        if (tabelas.pontos.some((o) => o.endereco === nova.endereco)) return erro("23505", "duplicate key");
        tabelas.pontos.push(nova); linhas = [nova];
      } else if (st.op === "update") {
        for (const c of Object.keys(st.dados)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
        if (g.antesDeActualizar) { const hh = g.antesDeActualizar; g.antesDeActualizar = null; hh(tabelas.pontos); }
        linhas = tabelas.pontos.filter(casa);
        for (const l of linhas) { const e = validar({ ...l, ...st.dados }); if (e) return e; }
        linhas.forEach((l) => Object.assign(l, st.dados));
      } else {
        linhas = tabelas.pontos.filter(casa);
      }
      const copia = linhas.map((l) => structuredClone(l));
      if (st.op !== "select" && !st.retorno) return { data: null, error: null };
      if (st.terminal === "maybe") return { data: copia[0] ?? null, error: null };
      return { data: copia, error: null };
    }
    return api;
  };
}

const alertas = [];
let B = criarBlobs(), S = criarSupabase();
function novoCliente() {
  B = criarBlobs(); S = criarSupabase();
  S.tabelas.pontos = [];
  S.g.falhar = S.g.falhar ?? {};
  const fromPontos = criarPontos(S.tabelas, S.g);
  const baseFrom = S.cliente.from;
  // `palpites`: só a leitura que o `ler-pontos` faz (lista vazia) — fora do âmbito destes testes.
  const fromPalpites = () => {
    const api = { select: () => api, eq: () => api, order: () => api,
      then: (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej) };
    return api;
  };
  return { from: (t) => (t === "pontos" ? fromPontos(t) : t === "palpites" ? fromPalpites() : baseFrom(t)) };
}
let cliente = novoCliente();

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/sentry-server.mjs", { namedExports: {
  captureSecurityAlert: async (k, p) => { alertas.push([k, p]); }, Sentry: {} } });

const L = await import("../_lib/ledger-lance.mjs");
const P = await import("../_lib/passe-pontos.mjs");
const { default: hRelampago } = await import("../comprar-passe-relampago.mjs");
const { default: hProgramado } = await import("../comprar-passe-programado.mjs");
const { default: hLerPontos } = await import("../ler-pontos.mjs");
const { assinarUserSession, assinarLanceAuth } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const K = (n) => `idem-key-110d-${n}`;

beforeEach(() => {
  cliente = novoCliente();
  alertas.length = 0;
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
});
const saldo = () => S.tabelas.saldo_rs.find((l) => l.cliente_id === A)?.payload?.centavos;
const linha = () => S.tabelas.pontos.find((l) => l.endereco === A);

let ip = 0;
async function comprar(handler, { key = K(1), token, semToken = false } = {}) {
  const tk = token ?? (semToken ? null : await assinarUserSession(A));
  const req = new Request("https://x/.netlify/functions/comprar-passe", {
    method: "POST", body: JSON.stringify({ idempotencyKey: key }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": `10.9.0.${++ip % 250}`,
      ...(tk ? { authorization: `Bearer ${tk}` } : {}) },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

// ── Frente A — o ledger de lance ─────────────────────────────────────────────────────────────────
test("A1 constantes: Passe = 10 pontos de fidelidade; Passe Relâmpago = 1 crédito; o lance consome 1", () => {
  assert.equal(P.PONTOS_FIDELIDADE_POR_PASSE, 10);
  assert.equal(P.PONTOS_POR_PASSE, 1, "o endpoint genérico (deprecated) não muda — R18-110d-4, não retroactivo");
  assert.equal(L.CREDITOS_LANCE_POR_PASSE_RELAMPAGO, 1);
  assert.equal(L.CREDITOS_POR_LANCE, 1);
});

test("A2 creditar crédito: +1, idempotente por ref; consumir: 1 → 0; a 0 RECUSA e nada muda", async () => {
  const c1 = await L.creditarCreditoLance(A, "r1");
  assert.equal(c1.ok, true); assert.equal(c1.creditos, 1);
  assert.equal((await L.creditarCreditoLance(A, "r1")).criado, false, "mesma ref não credita 2×");
  assert.equal(linha().creditos_lance, 1);
  const k1 = await L.consumirCreditoLance(A, "lance:1");
  assert.equal(k1.ok, true); assert.equal(k1.creditos, 0);
  const k2 = await L.consumirCreditoLance(A, "lance:2");
  assert.equal(k2.ok, false); assert.equal(k2.code, "CREDITOS_INSUFICIENTES");
  assert.equal(linha().creditos_lance, 0);
  assert.equal(linha().historico_lance.length, 2, "o consumo recusado não deixa rasto");
});

test("A3 sem linha nenhuma: consumir RECUSA (nunca cria saldo negativo nem linha)", async () => {
  const r = await L.consumirCreditoLance(A, "lance:x");
  assert.equal(r.code, "CREDITOS_INSUFICIENTES");
  assert.equal(S.tabelas.pontos.length, 0);
});

test("A4 pontos de lance NUNCA por compra: motivos de compra são recusados; engajamento aceite", async () => {
  for (const m of ["compra", "passe-relampago", "passe-programado", "lance"]) {
    assert.equal((await L.creditarPontosLance(A, 5, m, `r-${m}`)).code, "MOTIVO_INVALIDO", m);
  }
  assert.equal(S.tabelas.pontos.length, 0);
  const ok = await L.creditarPontosLance(A, 5, "login", "login:2026-10-13");
  assert.equal(ok.ok, true); assert.equal(ok.pontos, 5); assert.equal(ok.creditos, 0);
});

test("A5 o lance consome CRÉDITO — não toca nos pontos de fidelidade nem nos pontos de lance", async () => {
  await P.creditarPontos(A, 10, "compra", "passe-relampago:k");
  await L.creditarCreditoLance(A, "passe-relampago:k");
  await L.creditarPontosLance(A, 7, "missao", "missao:1");
  const antes = structuredClone(linha());
  await L.consumirCreditoLance(A, "lance:1");
  assert.equal(linha().pontos, antes.pontos, "fidelidade intacta");
  assert.deepEqual(linha().historico, antes.historico, "histórico de fidelidade intacto");
  assert.equal(linha().pontos_lance, 7, "pontos de lance intactos");
  assert.equal(linha().creditos_lance, 0);
});

test("A6 ledgers SEPARADOS: escritas alternadas nos dois não perdem entradas de nenhum", async () => {
  await P.creditarPontos(A, 10, "compra", "f1");
  await L.creditarCreditoLance(A, "l1");
  await P.creditarPontos(A, 10, "compra", "f2");
  await L.consumirCreditoLance(A, "l2");
  assert.deepEqual(linha().historico.map((h) => h.ref), ["f1", "f2"]);
  assert.deepEqual(linha().historico_lance.map((h) => h.ref), ["l1", "l2"]);
  assert.equal(linha().pontos, 20);
});

test("A7 CAS: outro escritor muda os créditos entre a leitura e a escrita → relê e não perde nada", async () => {
  await L.creditarCreditoLance(A, "c1");
  S.g.antesDeActualizar = (rows) => { rows[0].creditos_lance += 1; rows[0].historico_lance.push({ ref: "concorrente", delta: 1, campo: "creditos_lance" }); };
  const r = await L.consumirCreditoLance(A, "lance:1");
  assert.equal(r.ok, true);
  assert.equal(linha().creditos_lance, 1, "1 + 1 (concorrente) − 1");
  assert.deepEqual(linha().historico_lance.map((h) => h.ref), ["c1", "concorrente", "lance:1"]);
});

test("A7b CAS cobre pontos_lance: um escritor concorrente que só muda os pontos de lance é respeitado", async () => {
  await L.creditarCreditoLance(A, "c1");
  S.g.antesDeActualizar = (rows) => { rows[0].pontos_lance += 4; rows[0].historico_lance.push({ ref: "login:x", delta: 4, campo: "pontos_lance" }); };
  const r = await L.consumirCreditoLance(A, "lance:1");
  assert.equal(r.ok, true);
  assert.equal(linha().pontos_lance, 4, "os pontos de lance do concorrente não se perdem");
  assert.deepEqual(linha().historico_lance.map((h) => h.ref), ["c1", "login:x", "lance:1"]);
});

test("A7c ABA (SEG4 W3): crédito+consumo concorrentes deixam os contadores iguais — o histórico NÃO se perde", async () => {
  await L.creditarCreditoLance(A, "c1");
  S.g.antesDeActualizar = (rows) => {
    rows[0].historico_lance.push({ ref: "c2", delta: 1, campo: "creditos_lance" }, { ref: "outro", delta: -1, campo: "creditos_lance" });
    rows[0].atualizado_em = "outro-escritor"; // contadores iguais, versão diferente
  };
  const r = await L.consumirCreditoLance(A, "lance:1");
  assert.equal(r.ok, true);
  assert.deepEqual(linha().historico_lance.map((h) => h.ref), ["c1", "c2", "outro", "lance:1"]);
  assert.equal((await L.creditarCreditoLance(A, "c2")).criado, false, "a entrada c2 sobreviveu ⇒ nada de crédito grátis");
});

test("A8 reverter: devolve o crédito e remove a entrada (o retry volta a consumir)", async () => {
  await L.creditarCreditoLance(A, "c1");
  await L.consumirCreditoLance(A, "lance:1");
  const rv = await L.reverterMovimentoLance(A, "lance:1");
  assert.equal(rv.revertido, true);
  assert.equal(linha().creditos_lance, 1);
  assert.equal((await L.consumirCreditoLance(A, "lance:1")).criado, true, "o retry consome de novo");
});

// ── Frente B — os dois endpoints de compra ───────────────────────────────────────────────────────
test("B1 Passe Relâmpago: 201, −R$ 2,00, +10 pontos (compra), +1 CRÉDITO, 0 pontos de lance", async () => {
  const r = await comprar(hRelampago);
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(r.corpo.tipo, "relampago");
  assert.equal(r.corpo.pontosFidelidade, 10);
  assert.equal(r.corpo.creditosLance, 1);
  assert.equal(saldo(), 300);
  assert.equal(linha().pontos, 10);
  assert.equal(linha().historico[0].tipo, "compra");
  assert.equal(linha().historico[0].ref, `passe-relampago:${K(1)}`);
  assert.equal(linha().creditos_lance, 1);
  assert.equal(linha().pontos_lance, 0, "a compra NUNCA credita pontos de lance (Art. 17º)");
});

test("B2 Passe Programado: 201, −R$ 2,00, +10 pontos; NÃO mexe no ledger de lance", async () => {
  const r = await comprar(hProgramado);
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(r.corpo.tipo, "programado");
  assert.equal(r.corpo.pontosFidelidade, 10);
  assert.equal("creditosLance" in r.corpo, false);
  assert.equal(saldo(), 300);
  assert.equal(linha().creditos_lance, 0);
  assert.equal(linha().pontos_lance, 0);
  assert.deepEqual(linha().historico_lance, []);
  assert.equal(linha().historico[0].ref, `passe-programado:${K(1)}`);
});

test("B3 os dois Passes são SEPARADOS: a mesma chave nos dois endpoints são 2 compras distintas", async () => {
  assert.equal((await comprar(hRelampago)).status, 201);
  assert.equal((await comprar(hProgramado)).status, 201);
  assert.equal(saldo(), 100);
  assert.equal(linha().pontos, 20);
  assert.equal(linha().creditos_lance, 1, "só o Relâmpago deu crédito");
});

test("B4 idempotência: repetir a MESMA chave → 200, cobra UMA vez, crédito UMA vez", async () => {
  await comprar(hRelampago);
  const r2 = await comprar(hRelampago);
  assert.equal(r2.status, 200); assert.equal(r2.corpo.idempotent, true);
  assert.equal(saldo(), 300);
  assert.equal(linha().pontos, 10);
  assert.equal(linha().creditos_lance, 1);
});

test("B5 concorrência: 5 cliques simultâneos com a mesma chave → cobra 1×, credita 1×", async () => {
  const rs = await Promise.all(Array.from({ length: 5 }, () => comprar(hRelampago)));
  assert.equal(rs.filter((r) => r.status === 201).length, 1, rs.map((r) => r.status).join(","));
  assert.ok(rs.every((r) => r.status === 201 || r.status === 200));
  assert.equal(saldo(), 300);
  assert.equal(linha().pontos, 10);
  assert.equal(linha().creditos_lance, 1);
});

test("B6 sem saldo: 402 e NADA creditado", async () => {
  S.tabelas.saldo_rs[0].payload.centavos = 100;
  const r = await comprar(hRelampago);
  assert.equal(r.status, 402);
  assert.equal(S.tabelas.pontos.length, 0);
});

test("B7 auth bidireccional: sem token 401; token lance-auth (propósito errado) 401; user-session 201", async () => {
  assert.equal((await comprar(hProgramado, { semToken: true })).status, 401);
  assert.equal((await comprar(hProgramado, { token: await assinarLanceAuth(A) })).status, 401);
  assert.equal(S.tabelas.pontos.length, 0);
  assert.equal((await comprar(hProgramado)).status, 201);
});

test("B8 o crédito de lance falha depois do débito → 502, os 10 pontos são DESFEITOS e o R$ volta", async () => {
  S.g.falhar.pontos = { op: "update", code: "XX000", se: (st) => "historico_lance" in (st.dados ?? {}) };
  const r = await comprar(hRelampago);
  assert.equal(r.status, 502);
  assert.equal(r.corpo.error.code, "creditar_credito_lance_falhou");
  assert.equal(saldo(), 500, "reembolsado");
  assert.equal(linha().pontos, 0, "pontos desfeitos");
  assert.deepEqual(linha().historico, []);
  // e o retry (já sem falha) compra normalmente
  S.g.falhar.pontos = null;
  const r2 = await comprar(hRelampago);
  assert.equal(r2.status, 201);
  assert.equal(saldo(), 300); assert.equal(linha().creditos_lance, 1);
});

test("B9 compra Relâmpago a MEIO (pontos sim, crédito não) → o retry completa o crédito SEM cobrar", async () => {
  await P.creditarPontos(A, 10, "compra", `passe-relampago:${K(1)}`);
  const r = await comprar(hRelampago);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.creditosLance, 1);
  assert.equal(saldo(), 500, "não cobrou de novo");
  assert.equal(linha().creditos_lance, 1);
});

test("B10 os 10 pontos de um Passe novo CONTAM para o cartão (tipo compra); 5 Passes = 50", async () => {
  for (let i = 0; i < 2; i++) assert.equal((await comprar(hProgramado, { key: K(`p${i}`) })).status, 201);
  assert.equal(P.pontosDeCompra(await P.lerPontos(A)), 20);
});

test("B11 ler-pontos devolve os DOIS ledgers (e mantém os campos antigos)", async () => {
  await comprar(hRelampago);
  await L.creditarPontosLance(A, 3, "login", "login:1");
  const tk = await assinarUserSession(A);
  const resp = await hLerPontos(new Request("https://x/.netlify/functions/ler-pontos", { headers: { authorization: `Bearer ${tk}` } }));
  assert.equal(resp.status, 200);
  const c = await resp.json();
  assert.equal(c.pontos, 10); assert.equal(c.pontosCartao, 10);
  assert.equal(c.fidelidade.total, 10);
  assert.equal(c.fidelidade.historico.length, 1);
  assert.equal(c.lance.creditos, 1);
  assert.equal(c.lance.pontos, 3);
  assert.equal(c.lance.historico.length, 2);
});
