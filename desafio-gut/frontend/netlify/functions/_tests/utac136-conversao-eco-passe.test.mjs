// UTAC136 — Regulamento v6.0 no backend: conversão automática 50 ECOQUILDO → 1 Passe Programado (Art. 23º),
// paridade R$ 0,50 (Art. 21º), Passe sem pontos de lance (Art. 6º) e 1 ponto de fidelidade (Art. 7º).
// Decisões do operador: R18-136-1 (Passe Programado + 1 ponto, sem ECOQUILDO) · R18-136-2 (os 50 contam como
// «usado» no lastro, motivo próprio `conversao-passe`).
//
// Duplo: o Supabase do MC105a (com as RPCs do inventário, stock inicial 0) + `public.pontos` com CAS fiel.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac136-conversao-comprimento-suficiente";

function criarPontos(tabelas, g) {
  const COLS = ["endereco", "pontos", "historico", "atualizado_em", "creditos_lance", "pontos_lance", "historico_lance"];
  const erro = (code, message) => ({ data: null, error: { code, message } });
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
    function exec() {
      const f = g.falhar.pontos;
      if (f && (!f.op || f.op === st.op) && (!f.se || f.se(st))) return erro("XX000", "falha simulada");
      const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
      let linhas;
      if (st.op === "insert") {
        const nova = { pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 0, historico_lance: [], ...st.dados };
        if (tabelas.pontos.some((o) => o.endereco === nova.endereco)) return erro("23505", "duplicate key");
        tabelas.pontos.push(nova); linhas = [nova];
      } else if (st.op === "update") {
        for (const c of Object.keys(st.dados)) if (!COLS.includes(c)) return erro("42703", c);
        linhas = tabelas.pontos.filter(casa);
        linhas.forEach((l) => Object.assign(l, st.dados));
      } else linhas = tabelas.pontos.filter(casa);
      const copia = linhas.map((l) => structuredClone(l));
      if (st.op !== "select" && !st.retorno) return { data: null, error: null };
      if (st.terminal === "maybe") return { data: copia[0] ?? null, error: null };
      return { data: copia, error: null };
    }
    return api;
  };
}

const alertas = [];
const ADM = "0xdddddddddddddddddddddddddddddddddddddddd";
let B = criarBlobs(), S = criarSupabase();
let rpcFalha = false;
function novoCliente() {
  B = criarBlobs(); S = criarSupabase();
  S.g.passesIniciais = { relampago: 0, programado: 0 };
  S.tabelas.pontos = []; S.tabelas.eco_quildo = []; S.tabelas.eco_quildo_lastro = [];
  const fromPontos = criarPontos(S.tabelas, S.g);
  const baseFrom = S.cliente.from;
  return {
    from: (t) => (t === "pontos" ? fromPontos(t) : baseFrom(t)),
    rpc: (n, p) => (rpcFalha && n === "passes_creditar" ? Promise.resolve({ data: null, error: { code: "XX000" } }) : S.cliente.rpc(n, p)),
  };
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
  registrarAcao: async () => ({ id: "log-1" }), confirmarAcao: async () => {}, lerLogs: async () => [] } });

const E = await import("../_lib/eco-quildo.mjs");
const P = await import("../_lib/passe-pontos.mjs");
const L = await import("../_lib/ledger-lance.mjs");
const C = await import("../_lib/conversao-eco-passe.mjs");
const { default: hRelampago } = await import("../comprar-passe-relampago.mjs");
const { default: hCreditar } = await import("../creditar-eco-quildo.mjs");
const { assinarUserSession, assinarAdminAccess } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const lastro = () => S.tabelas.eco_quildo_lastro.find((l) => l.id === 1);
const eco = (e = A) => S.tabelas.eco_quildo.find((l) => l.endereco === e);
const pts = (e = A) => S.tabelas.pontos.find((l) => l.endereco === e);
const inv = (e = A) => S.tabelas.passes_inventario.find((l) => l.endereco === e);
const programados = () => Number(inv()?.passes_programado ?? 0);

/** Emite `n` ECOQUILDO com lastro, como faz qualquer emissor real (crédito + emissão no lastro). */
async function emitir(n, ref) {
  assert.equal((await E.creditarEcoQuildo(A, n, "indicacao", ref)).ok, true);
  assert.equal((await E.registarEmissaoNoLastro(n)).ok, true);
}

beforeEach(() => {
  cliente = novoCliente();
  rpcFalha = false;
  alertas.length = 0;
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
  S.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "x" });
});

// ── constantes do Regulamento v6.0 (em LITERAL — não contra a própria constante) ──────────────────
test("V6 constantes: R$ 0,50 por ECOQUILDO · 50 por conversão · 1 ponto por Passe · Passe Programado", () => {
  assert.equal(E.CENTAVOS_POR_ECOQUILDO, 50, "Art. 21º");
  assert.equal(E.ECOQUILDO_POR_CONVERSAO, 50, "Art. 23º");
  assert.equal(E.reservaDe(10, 4), 300, "(10 − 4) × 50");
  assert.equal(P.PONTOS_FIDELIDADE_POR_PASSE, 1, "Art. 7º");
  assert.equal(C.TIPO_PASSE_CONVERSAO, "programado", "R18-136-1");
});

// ── (a) positivo / (b) negativo da conversão ────────────────────────────────────────────────────
test("(b) 49 ECOQUILDO ⇒ NÃO converte: saldo, inventário, pontos e lastro intactos", async () => {
  await emitir(49, "e1");
  const r = await C.converterEcoEmPasses(A);
  assert.deepEqual([r.ok, r.convertidos, r.saldo], [true, 0, 49]);
  assert.equal(eco().saldo, 49);
  assert.equal(programados(), 0);
  assert.equal(pts(), undefined, "nenhum ponto");
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [49, 0, 2450]);
});

test("(a) 50 ECOQUILDO ⇒ 1 Passe Programado + 1 ponto (compra) · saldo 0 · lastro (50, 50, 0)", async () => {
  await emitir(50, "e1");
  const r = await C.converterEcoEmPasses(A);
  assert.deepEqual([r.ok, r.convertidos, r.saldo], [true, 1, 0]);
  assert.equal(eco().saldo, 0);
  const mov = eco().historico.at(-1);
  assert.deepEqual([mov.motivo, mov.delta, mov.ref], ["conversao-passe", -50, "eco-conversao:1"]);
  assert.equal(programados(), 1);
  assert.equal(Number(inv().passes_relampago), 0, "não é Relâmpago");
  assert.equal(pts().pontos, 1);
  assert.equal(pts().historico.at(-1).tipo, "compra", "conta para o cartão");
  assert.equal(P.pontosDeCompra(pts()), 1);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [50, 50, 0]);
  assert.equal(eco().historico.some((h) => h.motivo !== "indicacao" && h.delta > 0), false, "o Passe convertido não dá ECOQUILDO");
});

test("(a) 120 ECOQUILDO ⇒ 2 conversões, saldo 20, reserva 20 × R$ 0,50 = 1000 centavos", async () => {
  await emitir(120, "e1");
  const r = await C.converterEcoEmPasses(A);
  assert.deepEqual([r.convertidos, r.saldo], [2, 20]);
  assert.equal(programados(), 2);
  assert.equal(pts().pontos, 2);
  assert.deepEqual(eco().historico.filter((h) => h.motivo === "conversao-passe").map((h) => h.ref), ["eco-conversao:1", "eco-conversao:2"]);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [120, 100, 1000]);
});

test("idempotência: converter de novo com saldo < 50 não faz nada; a k-ésima ref nunca se repete", async () => {
  await emitir(50, "e1");
  await C.converterEcoEmPasses(A);
  const r2 = await C.converterEcoEmPasses(A);
  assert.equal(r2.convertidos, 0);
  await emitir(50, "e2");
  await C.converterEcoEmPasses(A);
  assert.deepEqual(eco().historico.filter((h) => h.motivo === "conversao-passe").map((h) => h.ref), ["eco-conversao:1", "eco-conversao:2"]);
  assert.equal(programados(), 2);
});

test("CONCORRÊNCIA (T4): 10 conversões simultâneas sobre 100 ECOQUILDO ⇒ exactamente 2 Passes e 2 pontos", async () => {
  await emitir(100, "e1");
  const rs = await Promise.all(Array.from({ length: 10 }, () => C.converterEcoEmPasses(A)));
  assert.ok(rs.every((r) => r.ok), JSON.stringify(rs));
  assert.equal(rs.reduce((s, r) => s + r.convertidos, 0), 2, "conversões contadas");
  assert.equal(programados(), 2, "Passes creditados");
  assert.equal(pts().pontos, 2);
  assert.equal(eco().saldo, 0);
  assert.deepEqual([lastro().total_usado, lastro().reserva_rs_centavos], [100, 0]);
});

test("(c) falha do inventário ⇒ conversão DESFEITA: ECOQUILDO, ponto e lastro voltam; alerta", async () => {
  await emitir(50, "e1");
  rpcFalha = true;
  const r = await C.converterEcoEmPasses(A);
  assert.equal(r.ok, false);
  assert.match(r.code, /^inventario:/);
  assert.equal(eco().saldo, 50, "os 50 voltaram");
  assert.equal(eco().historico.some((h) => h.motivo === "conversao-passe"), false, "sem rasto da conversão");
  assert.equal(Number(pts()?.pontos ?? 0), 0, "o ponto foi desfeito");
  assert.deepEqual([lastro().total_usado, lastro().reserva_rs_centavos], [0, 2500]);
  assert.equal(programados(), 0);
  // a versão segura nunca lança e alerta
  const s = await C.converterEcoEmPassesSeguro(A, "teste");
  assert.equal(s.ok, false);
  assert.ok(alertas.some(([k]) => k === "conversao_eco_falhou"));
  // sem falha, converte normalmente
  rpcFalha = false;
  assert.equal((await C.converterEcoEmPasses(A)).convertidos, 1);
  assert.equal(programados(), 1);
});

test("(c) falha do lastro ⇒ nada convertido e o ECOQUILDO volta", async () => {
  await emitir(50, "e1");
  S.tabelas.eco_quildo_lastro.splice(0);
  const r = await C.converterEcoEmPasses(A);
  assert.equal(r.ok, false);
  assert.equal(eco().saldo, 50);
  assert.equal(programados(), 0);
  assert.equal(pts(), undefined);
});

test("débito da conversão recusa ref fora do namespace e saldo insuficiente (nunca negativo)", async () => {
  await emitir(30, "e1");
  assert.equal((await E.debitarConversaoEcoQuildo(A, "uso:1")).code, "REF_INVALIDA");
  const d = await E.debitarConversaoEcoQuildo(A, "eco-conversao:1");
  assert.equal(d.code, "SALDO_INSUFICIENTE");
  assert.equal(eco().saldo, 30);
});

// ── integração com os emissores (USO real, não só a função) ─────────────────────────────────────
test("USO · crédito de administrador de 55 ⇒ 201 com passesConvertidos 1 e saldo 5", async () => {
  const adm = await assinarAdminAccess(ADM);
  const req = new Request("https://x/.netlify/functions/creditar-eco-quildo", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${adm}`, "x-nf-client-connection-ip": "10.13.0.1" },
    body: JSON.stringify({ endereco: A, valor: 55, motivo: "indicacao", chave: "adm-136-1" }),
  });
  const r = await hCreditar(req);
  const c = await r.json();
  assert.equal(r.status, 201, JSON.stringify(c));
  assert.equal(c.passesConvertidos, 1);
  assert.equal(c.saldo, 5);
  assert.equal(programados(), 1);
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [55, 50, 250]);
});

test("USO · comprar o Passe Relâmpago com 49 ECOQUILDO no saldo ⇒ o 50.º converte; sem pontos de lance", async () => {
  await emitir(49, "e1");
  const req = new Request("https://x/.netlify/functions/comprar-passe-relampago", {
    method: "POST", body: JSON.stringify({ idempotencyKey: "idem-key-136-relampago" }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": "10.13.0.2", authorization: `Bearer ${await assinarUserSession(A)}` },
  });
  const r = await hRelampago(req);
  const c = await r.json();
  assert.equal(r.status, 201, JSON.stringify(c));
  assert.equal(c.pontosFidelidade, 1, "a resposta traz os pontos da COMPRA (lidos antes da conversão)");
  assert.equal(pts().pontos, 2, "no ledger: 1 da compra + 1 do Passe convertido");
  assert.equal(c.ecoQuildo, 0, "o saldo devolvido é o de depois da conversão");
  assert.equal("pontosLance" in c, false);
  assert.equal(Number(pts().pontos_lance ?? 0), 0, "Art. 6º: o Passe não dá pontos de lance");
  assert.equal((await L.lerLedgerLance(A)).pontos, 0);
  assert.equal(programados(), 1);
});
