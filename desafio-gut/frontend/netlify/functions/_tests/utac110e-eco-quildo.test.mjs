// UTAC110e — ECOQUILDO: moeda social com lastro em R$ (Frentes A, B e C).
//
// REAIS: `_lib/eco-quildo.mjs`, `_lib/comprar-passe-tipado.mjs` (via os 2 endpoints de Passe),
// `_lib/passe-pontos.mjs`, `_lib/ledger-lance.mjs`, `_lib/saldoRs.mjs`, `_lib/jwt.mjs` (tokens
// ASSINADOS — lição do UTAC106j: nunca mockar o verificador) e `_lib/admin-auth.mjs` REAL (só a lista
// de admins é fixada — lição ⛔-1 do validador do 105b: um duplo permissivo do guard esconde que o
// ramo admin nunca corre).
// Duplos só nas fronteiras: Blobs (`_blobs-cas-duplo.mjs`), Supabase (`_supabase-duplo-mc105a.mjs`,
// que agora modela `eco_quildo`/`eco_quildo_lastro` com os CHECKs da migração 20261014), a tabela
// `pontos` (modelada AQUI com as colunas da migração 20261013 — o duplo partilhado não a tem),
// rate-limiter (fixo), auditoria `admin_logs` (espiada) e Sentry (espiado).
//
// node --test --experimental-test-module-mocks _tests/utac110e-eco-quildo.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110e-eco-quildo-comprimento-suficiente";

// ── `pontos` modelada aqui (colunas da migração 20261013 do 110d), como no `utac110d-dois-passes` ──
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

// ── fronteiras dupladas ──────────────────────────────────────────────────────────────────────────
const alertas = [];
const auditoria = [];
let auditoriaFalha = false;
const ADM = "0xdddddddddddddddddddddddddddddddddddddddd";
let B = criarBlobs(), S = criarSupabase();

function novoCliente() {
  B = criarBlobs(); S = criarSupabase();
  S.tabelas.pontos = [];
  S.tabelas.eco_quildo = [];
  S.tabelas.eco_quildo_lastro = [];
  S.g.falhar = S.g.falhar ?? {};
  const fromPontos = criarPontos(S.tabelas, S.g);
  const baseFrom = S.cliente.from;
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
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/admin-helpers.mjs", { namedExports: {
  getAdminAddresses: async () => [ADM], resolverCoordenacao: () => ADM, COORDENACAO: ADM, invalidarCacheAdmins: () => {} } });
mock.module("../_lib/admin-log.mjs", { namedExports: {
  registrarAcao: async (a) => { if (auditoriaFalha) throw new Error("admin_logs indisponível"); auditoria.push(["registar", a]); return { id: "log-1" }; },
  confirmarAcao: async (id, o) => { auditoria.push(["confirmar", id, o]); },
  lerLogs: async () => [] } });

const E = await import("../_lib/eco-quildo.mjs");
const P = await import("../_lib/passe-pontos.mjs");
const L = await import("../_lib/ledger-lance.mjs");
const { default: hRelampago } = await import("../comprar-passe-relampago.mjs");
const { default: hProgramado } = await import("../comprar-passe-programado.mjs");
const { default: hLer } = await import("../ler-eco-quildo.mjs");
const { default: hUsar } = await import("../usar-eco-quildo.mjs");
const { default: hCreditar } = await import("../creditar-eco-quildo.mjs");
const { default: hLastro } = await import("../lastro-eco-quildo.mjs");
const { assinarUserSession, assinarLanceAuth, assinarAdminAccess } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const K = (n) => `idem-key-110e-${n}`;
const U = (n) => `uso-key-110e-${n}`;

const lastro = () => S.tabelas.eco_quildo_lastro.find((l) => l.id === 1);
const semeiaLastro = (o = {}) => S.tabelas.eco_quildo_lastro.push(
  { id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "x", ...o });
const ecoLinha = (e = A) => S.tabelas.eco_quildo.find((l) => l.endereco === e);
const pLinha = (e = A) => S.tabelas.pontos.find((l) => l.endereco === e);
const saldoRs = (e = A) => S.tabelas.saldo_rs.find((l) => l.cliente_id === e)?.payload?.centavos;

beforeEach(() => {
  cliente = novoCliente();
  alertas.length = 0;
  auditoria.length = 0;
  auditoriaFalha = false;
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
  semeiaLastro();
});

// ── helpers de chamada ───────────────────────────────────────────────────────────────────────────
let ip = 0;
const ipFresco = () => `10.11.0.${++ip % 250}`;
async function pedir(handler, { metodo = "POST", corpo, token, headers = {} } = {}) {
  const h = { "content-type": "application/json", "x-nf-client-connection-ip": ipFresco(), ...headers };
  if (token !== undefined) { if (token) h.authorization = `Bearer ${token}`; }
  else h.authorization = `Bearer ${await assinarUserSession(A)}`;
  const req = new Request("https://x/.netlify/functions/eco", {
    method: metodo, headers: h, ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}
const comprar = (handler, key = K(1)) => pedir(handler, { corpo: { idempotencyKey: key } });

// ═══════════════════════════ FRENTE A — o modelo e a lib ═════════════════════════════════════════
test("A1 constantes: 1 ECOQUILDO = R$ 1,00 = 100 centavos; 1 por Passe; motivos fechados", () => {
  assert.equal(E.CENTAVOS_POR_ECOQUILDO, 100, "Art. 47º");
  assert.equal(E.ECOQUILDO_POR_PASSE, 1, "R18-110e-1");
  assert.deepEqual([...E.MOTIVOS_EMISSAO], ["passe-relampago", "passe-programado", "boas-vindas", "indicacao"]);
  assert.equal(E.MOTIVO_USO, "uso-site");
  assert.equal(E.refUso("abc"), "eco-uso:abc");
  assert.equal(E.refCreditoAdmin("abc"), "eco-admin:abc");
  assert.equal(E.reservaDe(3, 1), 200, "reserva derivada = (emitido − usado) × 100");
});

test("A2 o duplo modela os CHECKs da migração 20261014 (saldo >= 0, histórico array, lastro linha única)", async () => {
  // `eco_quildo`: saldo negativo, histórico não-array e coluna inexistente são RECUSADOS pela API
  const neg = await cliente.from("eco_quildo").insert({ endereco: A, saldo: -1, historico: [] }).select("endereco");
  assert.equal(neg.error?.code, "23514", "CHECK saldo >= 0");
  const hist = await cliente.from("eco_quildo").insert({ endereco: A, saldo: 1, historico: {} }).select("endereco");
  assert.equal(hist.error?.code, "23514", "CHECK jsonb_typeof(historico) = 'array'");
  const col = await cliente.from("eco_quildo").insert({ endereco: A, saldo: 1, historico: [], inexistente: 1 }).select("endereco");
  assert.equal(col.error?.code, "42703", "coluna inexistente é recusada (não ignorada)");
  // `eco_quildo_lastro`: a linha é SINGULAR (id = 1) e os contadores não podem ser negativos
  const id2 = await cliente.from("eco_quildo_lastro").insert({ id: 2 }).select("id");
  assert.equal(id2.error?.code, "23514", "CHECK id = 1");
  const negE = await cliente.from("eco_quildo_lastro").update({ total_emitido: -1 }).eq("id", 1).select("id");
  assert.equal(negE.error?.code, "23514", "CHECK total_emitido >= 0");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0], "nenhuma recusa escreveu");
  assert.equal(S.tabelas.eco_quildo.length, 0);
});

test("A3 lerEcoQuildo: sem linha → zeros; endereço inválido → zeros; com linha → saldo + histórico", async () => {
  assert.deepEqual(await E.lerEcoQuildo(A), { saldo: 0, historico: [] });
  assert.deepEqual(await E.lerEcoQuildo("nao-e-endereco"), { saldo: 0, historico: [] });
  await E.creditarEcoQuildo(A, 2, "indicacao", "ind:1");
  const l = await E.lerEcoQuildo(A);
  assert.equal(l.saldo, 2);
  assert.equal(l.historico.length, 1);
  assert.equal(l.historico[0].ref, "ind:1");
  assert.equal(l.historico[0].delta, 2);
  assert.equal(l.historico[0].saldo, 2);
});

test("A4 creditar: emite; idempotente pela MESMA ref; motivo/valor/endereço inválidos RECUSAM sem escrever", async () => {
  const c = await E.creditarEcoQuildo(A, 3, "boas-vindas", "bv:1");
  assert.equal(c.ok, true); assert.equal(c.saldo, 3); assert.equal(c.criado, true);
  const c2 = await E.creditarEcoQuildo(A, 3, "boas-vindas", "bv:1");
  assert.equal(c2.criado, false); assert.equal(c2.saldo, 3, "mesma ref não credita 2×");
  assert.equal(ecoLinha().historico.length, 1);

  assert.equal((await E.creditarEcoQuildo(A, 1, "compra", "x:1")).code, "MOTIVO_INVALIDO");
  assert.equal((await E.creditarEcoQuildo(A, 1, "uso-site", "x:2")).code, "MOTIVO_INVALIDO", "o motivo do USO não emite");
  for (const v of [0, -1, 1.5, "3", null]) {
    assert.equal((await E.creditarEcoQuildo(A, v, "boas-vindas", "x:3")).code, "VALOR_INVALIDO", String(v));
  }
  assert.equal((await E.creditarEcoQuildo("nao-e-endereco", 1, "boas-vindas", "x:4")).code, "ENDERECO_INVALIDO");
  assert.equal((await E.creditarEcoQuildo(A, 1, "boas-vindas", "")).code, "REF_INVALIDA");
  assert.equal(ecoLinha().saldo, 3, "nenhuma recusa escreveu");
});

test("A5 debitar: gasta o saldo; idempotente pela chave; acima do saldo RECUSA e o saldo nunca fica negativo", async () => {
  await E.creditarEcoQuildo(A, 5, "indicacao", "ind:1");
  const d = await E.debitarEcoQuildo(A, 2, U(1));
  assert.equal(d.ok, true); assert.equal(d.saldo, 3); assert.equal(d.criado, true);
  const d2 = await E.debitarEcoQuildo(A, 2, U(1));
  assert.equal(d2.criado, false); assert.equal(d2.saldo, 3, "a mesma chave não debita 2×");
  const d3 = await E.debitarEcoQuildo(A, 1, U(2));
  assert.equal(d3.saldo, 2);
  const d4 = await E.debitarEcoQuildo(A, 3, U(3));
  assert.equal(d4.ok, false); assert.equal(d4.code, "SALDO_INSUFICIENTE");
  assert.equal(ecoLinha().saldo, 2, "a recusa não escreveu nada");
  assert.equal(ecoLinha().historico.filter((h) => h.ref === E.refUso(U(3))).length, 0);
  assert.equal((await E.debitarEcoQuildo(A, 0, U(4))).code, "VALOR_INVALIDO");
  assert.equal((await E.debitarEcoQuildo(A, 1, "")).code, "REF_INVALIDA");
});

test("A6 CAS: um escritor concorrente muda a linha entre a leitura e a gravação → relê e não perde nada", async () => {
  await E.creditarEcoQuildo(A, 1, "boas-vindas", "bv:1");
  // concorrente: muda o saldo E a versão (atualizado_em) antes de a lib gravar
  S.g.antesDeActualizar = (rows) => {
    rows[0].saldo += 7;
    rows[0].historico.push({ ref: "concorrente", delta: 7, motivo: "indicacao", saldo: rows[0].saldo });
    rows[0].atualizado_em = "outro-escritor";
  };
  const d = await E.debitarEcoQuildo(A, 1, U(1));
  assert.equal(d.ok, true);
  assert.equal(ecoLinha().saldo, 7, "1 + 7 (concorrente) − 1");
  assert.deepEqual(ecoLinha().historico.map((h) => h.ref), ["bv:1", "concorrente", E.refUso(U(1))], "a entrada do concorrente NÃO se perde");
});

test("A7 reverter devolve o valor e remove a entrada; o retry com a MESMA chave volta a debitar", async () => {
  await E.creditarEcoQuildo(A, 4, "indicacao", "ind:1");
  await E.debitarEcoQuildo(A, 4, U(1));
  assert.equal(ecoLinha().saldo, 0);
  const rv = await E.reverterEcoQuildo(A, E.refUso(U(1)));
  assert.equal(rv.ok, true); assert.equal(rv.revertido, true);
  assert.equal(ecoLinha().saldo, 4);
  assert.equal(ecoLinha().historico.length, 1);
  assert.equal((await E.debitarEcoQuildo(A, 4, U(1))).criado, true, "o retry volta a gastar");
});

test("A8 lastro: emissão soma e uso subtrai; a reserva é DERIVADA; estado impossível é recusado", async () => {
  assert.deepEqual(await E.lerLastro(), { total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0 });
  let l = await E.registarEmissaoNoLastro(3);
  assert.deepEqual([l.total_emitido, l.total_usado, l.reserva_rs_centavos], [3, 0, 300], "3 ECOQUILDO = R$ 3,00 = 300 centavos");
  l = await E.registarUsoNoLastro(1);
  assert.deepEqual([l.total_emitido, l.total_usado, l.reserva_rs_centavos], [3, 1, 200]);
  l = await E.reverterUsoNoLastro(1);
  assert.deepEqual([l.total_emitido, l.total_usado, l.reserva_rs_centavos], [3, 0, 300]);
  l = await E.reverterEmissaoNoLastro(1);
  assert.deepEqual([l.total_emitido, l.total_usado, l.reserva_rs_centavos], [2, 0, 200]);
  // usar mais do que se emitiu → recusado (a reserva ficaria negativa — Art. 50º)
  const mau = await E.registarUsoNoLastro(9);
  assert.equal(mau.ok, false); assert.equal(mau.code, "LASTRO_INCONSISTENTE");
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [2, 0, 200], "nada mudou");
  // valor inválido
  assert.equal((await E.registarEmissaoNoLastro(0)).code, "VALOR_INVALIDO");
});

test("A9 lastro sem a linha única → LASTRO_AUSENTE (não inventa um lastro); CAS no lastro não perde o concorrente", async () => {
  S.tabelas.eco_quildo_lastro = [];
  const sem = await E.registarEmissaoNoLastro(1);
  assert.equal(sem.ok, false); assert.equal(sem.code, "LASTRO_AUSENTE");
  S.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "x" });
  S.g.antesDeActualizar = (rows) => { rows[0].total_emitido += 2; rows[0].reserva_rs_centavos += 200; rows[0].atualizado_em = "outro"; };
  const l = await E.registarEmissaoNoLastro(1);
  assert.equal(l.ok, true);
  assert.deepEqual([l.total_emitido, l.total_usado, l.reserva_rs_centavos], [3, 0, 300], "2 (concorrente) + 1");
});

// ═══════════════════════════ FRENTE B — os endpoints ═════════════════════════════════════════════
test("B1 ler-eco-quildo: 401 sem token e com lance-auth; 405 com POST; 200 com user-session", async () => {
  assert.equal((await pedir(hLer, { metodo: "GET", token: null })).status, 401);
  assert.equal((await pedir(hLer, { metodo: "GET", token: await assinarLanceAuth(A) })).status, 401, "propósito errado");
  assert.equal((await pedir(hLer, { metodo: "POST", corpo: {} })).status, 405);
  await E.creditarEcoQuildo(A, 2, "boas-vindas", "bv:1");
  const r = await pedir(hLer, { metodo: "GET", corpo: undefined });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.ok, true);
  assert.equal(r.corpo.saldo, 2);
  assert.equal(r.corpo.historico.length, 1);
  assert.equal(r.corpo.centavosPorEcoQuildo, 100);
});

test("B2 usar-eco-quildo: debita e move o lastro; idempotente pela chave; acima do saldo é 400", async () => {
  await E.creditarEcoQuildo(A, 5, "indicacao", "ind:1");
  await E.registarEmissaoNoLastro(5);
  const r = await pedir(hUsar, { corpo: { valor: 3, idempotencyKey: U(1) } });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.saldo, 2);
  assert.equal(r.corpo.usado, 3);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [5, 3, 200]);
  // idempotência: a mesma chave não gasta outra vez NEM mexe no lastro
  const r2 = await pedir(hUsar, { corpo: { valor: 3, idempotencyKey: U(1) } });
  assert.equal(r2.status, 200); assert.equal(r2.corpo.idempotent, true); assert.equal(r2.corpo.saldo, 2);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [5, 3, 200]);
  // acima do saldo
  const r3 = await pedir(hUsar, { corpo: { valor: 9, idempotencyKey: U(2) } });
  assert.equal(r3.status, 400); assert.equal(r3.corpo.error.code, "saldo_insuficiente");
  assert.equal(ecoLinha().saldo, 2, "ECOQUILDO intacto");
  assert.deepEqual([lastro().total_emitido, lastro().total_usado], [5, 3], "lastro intacto");
  // entradas inválidas
  for (const v of [0, -1, 1.5, "3", null]) {
    assert.equal((await pedir(hUsar, { corpo: { valor: v, idempotencyKey: U(3) } })).status, 400, String(v));
  }
  assert.equal((await pedir(hUsar, { corpo: { valor: 1, idempotencyKey: "curta" } })).status, 400);
  assert.equal((await pedir(hUsar, { corpo: { valor: 1 } })).status, 400);
  assert.equal((await pedir(hUsar, { corpo: { valor: 1, idempotencyKey: U(4) }, token: null })).status, 401);
  // ⚠️ GET sem corpo: um corpo num GET é recusado pelo runtime (erro de instrumento já registado no 110d)
  assert.equal((await pedir(hUsar, { metodo: "GET" })).status, 405);
});

test("B3 usar: SÓ o próprio titular — a chave nunca vem do corpo e não há destinatário (Art. 49º)", async () => {
  await E.creditarEcoQuildo(A, 5, "indicacao", "ind:1");
  await E.registarEmissaoNoLastro(5);
  // token de OUTRO: debita a conta do OUTRO (que tem 0), nunca a de A
  const tk = await assinarUserSession(OUTRO);
  const r = await pedir(hUsar, { corpo: { valor: 1, idempotencyKey: U(1), endereco: A, destinatario: OUTRO }, token: tk });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.error.code, "saldo_insuficiente");
  assert.equal(ecoLinha(A).saldo, 5, "a conta do titular do token não foi tocada");
});

test("B4 creditar-eco-quildo (admin): guarda real; emite + lastro; idempotente; audita; sem log NÃO emite", async () => {
  assert.equal((await pedir(hCreditar, { corpo: {} })).status, 401, "user-session não é admin");
  assert.equal((await pedir(hCreditar, { corpo: {}, token: null })).status, 401);
  const adm = await assinarAdminAccess(ADM);
  const r = await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 2, motivo: "indicacao", chave: "adm-chave-1" }, token: adm });
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(r.corpo.saldo, 2);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [2, 0, 200]);
  assert.equal(auditoria[0][0], "registar");
  assert.equal(auditoria[0][1].tipo_acao, "creditar_eco_quildo");
  assert.equal(auditoria[0][1].admin_endereco, ADM, "a auditoria leva o endereço do admin, não um literal");
  assert.equal(auditoria[0][1].alvo, OUTRO);
  // idempotente
  const r2 = await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 2, motivo: "indicacao", chave: "adm-chave-1" }, token: adm });
  assert.equal(r2.status, 200); assert.equal(r2.corpo.idempotent, true);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [2, 200], "não emitiu 2×");
  // validações
  assert.equal((await pedir(hCreditar, { corpo: { endereco: "x", valor: 1, motivo: "indicacao", chave: "adm-chave-2" }, token: adm })).status, 400);
  assert.equal((await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 0, motivo: "indicacao", chave: "adm-chave-3" }, token: adm })).status, 400);
  assert.equal((await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 1, motivo: "compra", chave: "adm-chave-4" }, token: adm })).status, 400);
  assert.equal((await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 1, motivo: "indicacao", chave: "x" }, token: adm })).status, 400);
  // log fail-CLOSED: sem registo não há emissão
  auditoriaFalha = true;
  const r5 = await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 5, motivo: "indicacao", chave: "adm-chave-5" }, token: adm });
  assert.equal(r5.status, 503); assert.equal(r5.corpo.error.code, "log_indisponivel");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [2, 200], "nada emitido sem auditoria");
  assert.equal(ecoLinha(OUTRO).saldo, 2);
});

test("B5 lastro-eco-quildo (admin): 401 sem ser admin; 200 com os três números e o invariante do Art. 50º", async () => {
  assert.equal((await pedir(hLastro, { metodo: "GET", token: null })).status, 401);
  assert.equal((await pedir(hLastro, { metodo: "GET", token: await assinarUserSession(A) })).status, 401);
  const adm = await assinarAdminAccess(ADM);
  const r = await pedir(hLastro, { metodo: "GET", token: adm });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.deepEqual([r.corpo.total_emitido, r.corpo.total_usado, r.corpo.reserva_rs_centavos], [0, 0, 0]);
  assert.equal(r.corpo.em_circulacao, 0);
  assert.equal(r.corpo.centavos_por_eco_quildo, 100);
  assert.equal(r.corpo.coerente, true);
  await E.registarEmissaoNoLastro(4);
  const r2 = await pedir(hLastro, { metodo: "GET", token: adm });
  assert.deepEqual([r2.corpo.total_emitido, r2.corpo.reserva_rs_centavos, r2.corpo.coerente], [4, 400, true]);
  // escrito à mão (fora da lib) → `coerente: false` (o invariante é medido, não presumido)
  lastro().reserva_rs_centavos = 999;
  const r3 = await pedir(hLastro, { metodo: "GET", token: adm });
  assert.equal(r3.corpo.coerente, false, "o lastro desalinhado é DENUNCIADO");
});

// ═══════════════════════════ FRENTE C — integração com a compra ═══════════════════════════════════
// ⚠️ UTAC110n (R18-110j.4b-3): o título e a última asserção fixavam «+1 crédito» (modelo do 110d).
// O Passe passou a dar +200 PONTOS de lance; o objecto deste teste (ECOQUILDO + lastro) não mudou.
test("C1 Passe Relâmpago: 201 com +10 pontos +200 pontos de lance +1 ECOQUILDO, e o lastro leva +R$ 1,00", async () => {
  const r = await comprar(hRelampago);
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(r.corpo.ecoQuildo, 1);
  assert.equal(ecoLinha().saldo, 1);
  assert.equal(ecoLinha().historico[0].motivo, "passe-relampago");
  assert.equal(ecoLinha().historico[0].ref, `passe-relampago:${K(1)}`, "a ref do ECOQUILDO é a da compra (idempotência herdada)");
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [1, 0, 100]);
  assert.equal(pLinha().pontos, 10);
  assert.equal(pLinha().creditos_lance, 0, "o crédito legado já não é creditado");
  assert.equal(pLinha().pontos_lance, 200, "o Passe dá 200 pontos de lance (Art. 16º VI)");
});

test("C2 Passe Programado: 201 com +10 pontos +1 ECOQUILDO (motivo próprio) e SEM crédito de lance", async () => {
  const r = await comprar(hProgramado);
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(r.corpo.ecoQuildo, 1);
  assert.equal("creditosLance" in r.corpo, false);
  assert.equal(ecoLinha().historico[0].motivo, "passe-programado");
  assert.equal(pLinha().creditos_lance, 0);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [1, 100]);
});

test("C3 lastro ACUMULA com várias compras (emitido = nº de Passes; reserva = emitido × 100)", async () => {
  S.tabelas.saldo_rs[0].payload.centavos = 1000; // 3 Passes = R$ 6,00
  await comprar(hRelampago, K(1));
  await comprar(hProgramado, K(2));
  await comprar(hProgramado, K(3));
  assert.equal(ecoLinha().saldo, 3);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [3, 0, 300]);
  assert.equal(saldoRs(), 1000 - 600, "3 Passes = R$ 6,00");
});

test("C4 se o ECOQUILDO falhar, a compra é DESFEITA por inteiro (pontos, crédito e R$ de volta)", async () => {
  S.g.falhar.eco_quildo = { op: "insert", code: "XX000" };
  const r = await comprar(hRelampago);
  assert.equal(r.status, 502, JSON.stringify(r.corpo));
  assert.equal(r.corpo.error.code, "creditar_eco_quildo_falhou");
  assert.equal(r.corpo.error.reembolsado, true, "o reembolso vai DENTRO de error (convenção do jsonError)");
  assert.equal(saldoRs(), 500, "os R$ 2,00 voltaram");
  assert.equal(pLinha().pontos, 0, "os 10 pontos foram desfeitos");
  assert.deepEqual(pLinha().historico, []);
  assert.equal(pLinha().creditos_lance, 0, "o crédito de lance foi desfeito");
  assert.deepEqual(pLinha().historico_lance, []);
  assert.equal(ecoLinha(), undefined, "nenhum ECOQUILDO ficou");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0], "o lastro não foi tocado");
  // e o retry (já sem falha) compra normalmente — nada ficou a meio
  S.g.falhar.eco_quildo = null;
  const r2 = await comprar(hRelampago);
  assert.equal(r2.status, 201, JSON.stringify(r2.corpo));
  assert.equal(ecoLinha().saldo, 1);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [1, 100]);
});

test("C5 se o LASTRO falhar, o ECOQUILDO é desfeito e a compra reverte (nunca moeda sem lastro)", async () => {
  S.g.falhar.eco_quildo_lastro = { op: "update", code: "XX000" };
  const r = await comprar(hProgramado);
  assert.equal(r.status, 502, JSON.stringify(r.corpo));
  assert.equal(r.corpo.error.code, "creditar_eco_quildo_falhou");
  assert.equal(r.corpo.error.motivo, "lastro:ERRO_DB");
  assert.equal(r.corpo.error.reembolsado, true);
  assert.equal(saldoRs(), 500);
  assert.equal(pLinha().pontos, 0);
  assert.equal(ecoLinha().saldo, 0, "a emissão foi revertida");
  assert.deepEqual(ecoLinha().historico, [], "a entrada saiu do histórico");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0]);
});

test("C6 idempotência: repetir a chave → 200, UM só ECOQUILDO e UM só lastro (5 cliques simultâneos)", async () => {
  await comprar(hRelampago);
  const r2 = await comprar(hRelampago);
  assert.equal(r2.status, 200); assert.equal(r2.corpo.idempotent, true); assert.equal(r2.corpo.ecoQuildo, 1);
  assert.equal(ecoLinha().historico.length, 1);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [1, 100]);
  // concorrência
  cliente = novoCliente();
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
  semeiaLastro();
  const rs = await Promise.all(Array.from({ length: 5 }, () => comprar(hRelampago)));
  assert.equal(rs.filter((x) => x.status === 201).length, 1, rs.map((x) => x.status).join(","));
  assert.ok(rs.every((x) => x.status === 201 || x.status === 200));
  assert.equal(ecoLinha().saldo, 1, "5 cliques = 1 ECOQUILDO");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [1, 100]);
});

test("C7 ciclo completo: comprar 3 Passes → usar 2 no site → saldo 1 e lastro (3, 2, 100)", async () => {
  S.tabelas.saldo_rs[0].payload.centavos = 1000;
  await comprar(hRelampago, K(1));
  await comprar(hProgramado, K(2));
  await comprar(hProgramado, K(3));
  assert.equal(ecoLinha().saldo, 3);
  const r = await pedir(hUsar, { corpo: { valor: 2, idempotencyKey: U(1) } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.saldo, 1);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [3, 2, 100]);
  const l = await pedir(hLastro, { metodo: "GET", token: await assinarAdminAccess(ADM) });
  assert.equal(l.corpo.em_circulacao, 1);
  assert.equal(l.corpo.coerente, true);
});

test("C8 compra a MEIO (pontos + crédito sim, ECOQUILDO não) → o retry completa o ECOQUILDO sem cobrar", async () => {
  await P.creditarPontos(A, 10, "compra", `passe-relampago:${K(1)}`);
  await L.creditarCreditoLance(A, `passe-relampago:${K(1)}`);
  const r = await comprar(hRelampago);
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.ecoQuildo, 1, "completou o que faltava");
  assert.equal(saldoRs(), 500, "não cobrou de novo");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [1, 100]);
});

// ── Fecho dos SOBREVIVENTES do validador adversarial (SEG5, achado A2: V3/V4) ────────────────────
// Os ramos de REVERSÃO dos dois endpoints que mexem no lastro não estavam presos por nenhum teste.
test("B2b usar: se o LASTRO falhar, o ECOQUILDO é DEVOLVIDO ao saldo (502 lastro_falhou)", async () => {
  await E.creditarEcoQuildo(A, 5, "indicacao", "ind:1");
  await E.registarEmissaoNoLastro(5);
  S.g.falhar.eco_quildo_lastro = { op: "update", code: "XX000" };
  const r = await pedir(hUsar, { corpo: { valor: 2, idempotencyKey: U(9) } });
  assert.equal(r.status, 502, JSON.stringify(r.corpo));
  assert.equal(r.corpo.error.code, "lastro_falhou");
  assert.equal(r.corpo.error.devolvido, true);
  assert.equal(ecoLinha().saldo, 5, "os 2 ECOQUILDO voltaram ao saldo");
  assert.deepEqual(ecoLinha().historico.map((h) => h.ref), ["ind:1"], "a entrada do uso saiu do histórico");
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [5, 0, 500], "o lastro ficou coerente");
  // e o retry (já sem falha) usa normalmente — nada ficou a meio
  S.g.falhar.eco_quildo_lastro = null;
  const r2 = await pedir(hUsar, { corpo: { valor: 2, idempotencyKey: U(9) } });
  assert.equal(r2.status, 200, JSON.stringify(r2.corpo));
  assert.equal(r2.corpo.saldo, 3);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [5, 2, 300]);
});

test("B4b creditar (admin): se o LASTRO falhar, a EMISSÃO é desfeita (nunca moeda sem lastro)", async () => {
  const adm = await assinarAdminAccess(ADM);
  S.g.falhar.eco_quildo_lastro = { op: "update", code: "XX000" };
  const r = await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 3, motivo: "indicacao", chave: "adm-chave-9" }, token: adm });
  assert.equal(r.status, 502, JSON.stringify(r.corpo));
  assert.equal(r.corpo.error.code, "lastro_falhou");
  assert.equal(r.corpo.error.desfeito, true);
  assert.equal(ecoLinha(OUTRO).saldo, 0, "a emissão foi revertida");
  assert.deepEqual(ecoLinha(OUTRO).historico, [], "a entrada saiu do histórico");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0], "o lastro não foi tocado");
  // a auditoria é FECHADA como falhada (não fica sucesso=null para sempre — rasto de ação rebentada)
  assert.equal(auditoria[auditoria.length - 1][0], "confirmar");
  assert.equal(auditoria[auditoria.length - 1][2].sucesso, false);
  // e o retry (sem falha) emite normalmente
  S.g.falhar.eco_quildo_lastro = null;
  const r2 = await pedir(hCreditar, { corpo: { endereco: OUTRO, valor: 3, motivo: "indicacao", chave: "adm-chave-9" }, token: adm });
  assert.equal(r2.status, 201, JSON.stringify(r2.corpo));
  assert.equal(r2.corpo.saldo, 3);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [3, 300]);
});
