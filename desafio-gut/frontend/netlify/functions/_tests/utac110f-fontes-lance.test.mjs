// UTAC110f — FONTES DE PONTOS DE LANCE: login diário (+5), missão do lance (+10), indicação (+50+50).
//
// REAIS: `_lib/fontes-lance.mjs`, `_lib/ledger-lance.mjs` (CAS + idempotência por ref), `login-diario.mjs`
// e `_lib/jwt.mjs` (tokens ASSINADOS — lição do UTAC106j: nunca mockar o verificador).
// Duplos só nas fronteiras de I/O: Supabase (`_pontos-duplo-110f.mjs`, colunas/CHECKs reais) e o
// estado do sistema (para o 503).
//
// node --test --experimental-test-module-mocks _tests/utac110f-fontes-lance.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarTabelaPontos } from "./_pontos-duplo-110f.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110f-fontes-lance-comprimento-suficiente";

let T = criarTabelaPontos();
let pausado = false;
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => ({ from: () => T.from() }), getSupabaseReadOnly: () => ({ from: () => T.from() }),
  supabaseConfigurado: () => true } });
mock.module("../_lib/system-state.mjs", { namedExports: {
  lerEstadoSistema: async () => ({}), sistemaPausado: () => pausado } });

const F = await import("../_lib/fontes-lance.mjs");
const L = await import("../_lib/ledger-lance.mjs");
const { default: hLogin } = await import("../login-diario.mjs");
const { assinarUserSession, assinarLanceAuth } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "0xcccccccccccccccccccccccccccccccccccccccc";
const D = (iso) => new Date(iso);

beforeEach(() => { T = criarTabelaPontos(); pausado = false; });
const pontos = (e) => T.linha(e)?.pontos_lance ?? 0;
const hist = (e) => T.linha(e)?.historico_lance ?? [];

// ── O dia de Manaus (UTC-4) ─────────────────────────────────────────────────────────────────────
test("D1 diaManaus: a meia-noite de Manaus é 04:00 UTC (R18-110f-4)", () => {
  assert.equal(F.diaManaus(D("2026-10-13T03:59:59.999Z")), "2026-10-12");
  assert.equal(F.diaManaus(D("2026-10-13T04:00:00.000Z")), "2026-10-13");
  assert.equal(F.diaManaus(D("2026-10-14T03:59:59.999Z")), "2026-10-13");
  // Viragem de mês e de ano também seguem Manaus, não o UTC.
  assert.equal(F.diaManaus(D("2027-01-01T03:00:00.000Z")), "2026-12-31");
  assert.equal(F.diaManaus(new Date("lixo")), null);
  assert.equal(F.diaManaus("2026-10-13"), null, "sem coerção: só Date");
});

test("D2 constantes do operador: login 5 · missão 10 · indicação 50 · limite 10/mês", () => {
  assert.equal(F.PONTOS_LOGIN_DIARIO, 5);
  assert.equal(F.PONTOS_MISSAO_LANCE, 10);
  assert.equal(F.PONTOS_INDICACAO, 50);
  assert.equal(F.LIMITE_INDICACOES_MES, 10);
});

// ── Frente A — login diário ──────────────────────────────────────────────────────────────────────
test("A1 login: 1.º do dia +5 · 2.º do mesmo dia 0 · dia seguinte +5 (bidireccional)", async () => {
  const r1 = await F.creditarLoginDiario(A, D("2026-10-13T12:00:00Z"));
  assert.deepEqual([r1.ok, r1.creditado, r1.pontosLance], [true, true, 5]);
  const r2 = await F.creditarLoginDiario(A, D("2026-10-13T23:30:00Z"));
  assert.deepEqual([r2.ok, r2.creditado, r2.pontosLance], [true, false, 5], "mesmo dia de Manaus → 0");
  const r3 = await F.creditarLoginDiario(A, D("2026-10-14T05:00:00Z"));
  assert.deepEqual([r3.ok, r3.creditado, r3.pontosLance], [true, true, 10], "novo dia → +5");
  assert.deepEqual(hist(A).map((h) => [h.motivo, h.delta, h.ref]),
    [["login", 5, "login:2026-10-13"], ["login", 5, "login:2026-10-14"]]);
});

test("A2 login: a fronteira é a de Manaus — 03:59Z e 04:01Z do MESMO dia UTC são 2 dias (2 créditos)", async () => {
  await F.creditarLoginDiario(A, D("2026-10-13T03:59:00Z"));
  await F.creditarLoginDiario(A, D("2026-10-13T04:01:00Z"));
  assert.equal(pontos(A), 10);
  // …e 04:01Z de um dia + 03:59Z do dia UTC seguinte são o MESMO dia de Manaus (1 crédito).
  await F.creditarLoginDiario(B, D("2026-10-13T04:01:00Z"));
  await F.creditarLoginDiario(B, D("2026-10-14T03:59:00Z"));
  assert.equal(pontos(B), 5);
});

test("A3 login: 5 logins EM PARALELO no mesmo dia → UM só crédito (CAS + ref diária)", async () => {
  const agora = D("2026-10-13T15:00:00Z");
  const rs = await Promise.all(Array.from({ length: 5 }, () => F.creditarLoginDiario(A, agora)));
  assert.equal(rs.filter((r) => r.ok && r.creditado).length, 1, "exactamente 1 crédito");
  assert.ok(rs.every((r) => r.ok), "nenhum pedido falha");
  assert.equal(pontos(A), 5);
  assert.equal(hist(A).filter((h) => h.ref === "login:2026-10-13").length, 1);
});

test("A4 login: um escritor concorrente entre a leitura e a escrita é respeitado (CAS relê)", async () => {
  await L.creditarCreditoLance(A, "passe-relampago:k1"); // linha existe com 1 crédito
  T.g.antesDeActualizar = (tab) => { const l = tab[0]; l.creditos_lance = 2; l.atualizado_em = "outro";
    l.historico_lance = [...l.historico_lance, { ref: "passe-relampago:k2", campo: "creditos_lance", delta: 1 }]; };
  const r = await F.creditarLoginDiario(A, D("2026-10-13T15:00:00Z"));
  assert.equal(r.creditado, true);
  const l = T.linha(A);
  assert.equal(l.creditos_lance, 2, "o crédito concorrente não se perde");
  assert.equal(l.pontos_lance, 5);
  assert.ok(l.historico_lance.some((h) => h.ref === "passe-relampago:k2"));
});

test("A5 login: erro do banco → ok:false (nunca finge que creditou)", async () => {
  T.g.falhar = { op: "select" };
  const r = await F.creditarLoginDiario(A, D("2026-10-13T15:00:00Z"));
  assert.equal(r.ok, false);
  assert.equal(pontos(A), 0);
});

async function login({ token, metodo = "POST" } = {}) {
  const req = new Request("https://x/.netlify/functions/login-diario", {
    method: metodo, headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const r = await hLogin(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

test("A6 endpoint: sem token 401 · token lance-auth 401 · GET 405 · pausado 503 (nada creditado)", async () => {
  assert.equal((await login()).status, 401);
  const errado = await login({ token: await assinarLanceAuth(A) });
  assert.deepEqual([errado.status, errado.corpo?.error?.code], [401, "token_invalido"]);
  assert.equal((await login({ token: await assinarUserSession(A), metodo: "GET" })).status, 405);
  pausado = true;
  assert.equal((await login({ token: await assinarUserSession(A) })).status, 503);
  assert.equal(pontos(A), 0, "nenhum destes caminhos credita");
});

test("A7 endpoint: user-session → 200 +5; repetir → 200 jaCreditado (endereço SÓ do token)", async () => {
  const tk = await assinarUserSession(A);
  const r1 = await login({ token: tk });
  assert.equal(r1.status, 200);
  assert.deepEqual([r1.corpo.creditado, r1.corpo.jaCreditado, r1.corpo.pontosLance], [true, false, 5]);
  assert.match(r1.corpo.dia, /^\d{4}-\d{2}-\d{2}$/);
  const r2 = await login({ token: tk });
  assert.deepEqual([r2.status, r2.corpo.creditado, r2.corpo.jaCreditado, r2.corpo.pontosLance], [200, false, true, 5]);
  assert.equal(T.linha(B), undefined, "ninguém mais foi creditado");
});

test("A8 endpoint: falha do banco → 502 credito_falhou", async () => {
  T.g.falhar = { op: "select" };
  const r = await login({ token: await assinarUserSession(A) });
  assert.deepEqual([r.status, r.corpo?.error?.code], [502, "credito_falhou"]);
});

// ── Frente C — missão «1 lance» (a função; a integração no lance vive em utac110f-lance-missao) ───
test("C1 missão: 1.º lance do dia +10 · 2.º do mesmo dia 0 · dia seguinte +10", async () => {
  const r1 = await F.creditarMissaoLance(A, D("2026-10-13T12:00:00Z"));
  const r2 = await F.creditarMissaoLance(A, D("2026-10-13T20:00:00Z"));
  const r3 = await F.creditarMissaoLance(A, D("2026-10-14T12:00:00Z"));
  assert.deepEqual([r1.creditado, r2.creditado, r3.creditado], [true, false, true]);
  assert.equal(pontos(A), 20);
  assert.deepEqual(hist(A).map((h) => [h.motivo, h.ref]),
    [["missao", "missao-lance:2026-10-13"], ["missao", "missao-lance:2026-10-14"]]);
});

test("C2 missão: 5 lances em paralelo no mesmo dia → UM crédito de +10", async () => {
  const agora = D("2026-10-13T15:00:00Z");
  const rs = await Promise.all(Array.from({ length: 5 }, () => F.creditarMissaoLance(A, agora)));
  assert.equal(rs.filter((r) => r.creditado).length, 1);
  assert.equal(pontos(A), 10);
});

test("C3 login e missão são INDEPENDENTES no mesmo dia (5 + 10 = 15); estadoMissoesHoje lê o histórico", async () => {
  const agora = D("2026-10-13T15:00:00Z");
  assert.deepEqual(await F.estadoMissoesHoje(A, agora), { dia: "2026-10-13", loginFeito: false, lanceFeito: false });
  await F.creditarLoginDiario(A, agora);
  assert.deepEqual(await F.estadoMissoesHoje(A, agora), { dia: "2026-10-13", loginFeito: true, lanceFeito: false });
  await F.creditarMissaoLance(A, agora);
  assert.equal(pontos(A), 15);
  assert.deepEqual(await F.estadoMissoesHoje(A, agora), { dia: "2026-10-13", loginFeito: true, lanceFeito: true });
  assert.deepEqual(await F.estadoMissoesHoje(A, D("2026-10-14T15:00:00Z")),
    { dia: "2026-10-14", loginFeito: false, lanceFeito: false }, "o dia seguinte começa limpo");
});

test("C4 as fontes NUNCA mexem nos créditos de lance nem nos pontos de fidelidade", async () => {
  await L.creditarCreditoLance(A, "passe-relampago:k1");
  const agora = D("2026-10-13T15:00:00Z");
  await F.creditarLoginDiario(A, agora);
  await F.creditarMissaoLance(A, agora);
  await F.creditarIndicacao(A, B, agora);
  const l = T.linha(A);
  assert.deepEqual([l.creditos_lance, l.pontos, l.historico.length], [1, 0, 0]);
  assert.equal(l.pontos_lance, 65);
});

// ── Frente B — indicação ─────────────────────────────────────────────────────────────────────────
test("B1 indicação válida: +50 ao indicante e +50 ao indicado", async () => {
  const r = await F.creditarIndicacao(A, B, D("2026-10-13T15:00:00Z"));
  assert.equal(r.ok, true);
  assert.deepEqual([r.indicante.creditado, r.indicado.creditado], [true, true]);
  assert.deepEqual([pontos(A), pontos(B)], [50, 50]);
  assert.equal(hist(A)[0].ref, `indicacao:${B}`);
  assert.equal(hist(B)[0].ref, "indicacao-recebida");
  assert.ok([...hist(A), ...hist(B)].every((h) => h.motivo === "indicacao"));
});

test("B2 auto-indicação → AUTO_INDICACAO e NADA creditado (também com caixas diferentes)", async () => {
  const r = await F.creditarIndicacao(A, A.toUpperCase().replace("0X", "0x"));
  assert.deepEqual([r.ok, r.code], [false, "AUTO_INDICACAO"]);
  assert.equal(T.linha(A), undefined);
});

test("B3 idempotência: repetir a mesma indicação → nenhum crédito extra", async () => {
  const agora = D("2026-10-13T15:00:00Z");
  await F.creditarIndicacao(A, B, agora);
  const r = await F.creditarIndicacao(A, B, agora);
  assert.deepEqual([r.ok, r.indicante.creditado, r.indicado.creditado], [true, false, false]);
  assert.deepEqual([pontos(A), pontos(B)], [50, 50]);
});

test("B4 o indicado só recebe UMA vez na vida, mesmo indicado por outro (o indicante novo recebe)", async () => {
  const agora = D("2026-10-13T15:00:00Z");
  await F.creditarIndicacao(A, B, agora);
  const r = await F.creditarIndicacao(C, B, agora);
  assert.deepEqual([r.indicante.creditado, r.indicado.creditado], [true, false]);
  assert.deepEqual([pontos(A), pontos(B), pontos(C)], [50, 50, 50]);
});

// ⚠️ SEG5 (validador): o ledger data cada entrada com o relógio REAL; o limite conta pelo mês do `agora`.
//    Um `agora` FIXO (2026-10) tornava o B5 vermelho a partir de 2026-11-01. Datas RELATIVAS ao relógio real.
const AGORA_REAL = () => new Date();
const MES_SEGUINTE = () => { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 2, 15)); };
test("B5 limite mensal: o 11.º indicado do mês NÃO paga o indicante (o indicado recebe); o mês seguinte paga", async () => {
  const agora = AGORA_REAL();
  const end = (i) => `0x${String(i).padStart(40, "0")}`;
  for (let i = 1; i <= 10; i++) await F.creditarIndicacao(A, end(i), agora);
  assert.equal(pontos(A), 500);
  const r = await F.creditarIndicacao(A, end(11), agora);
  assert.deepEqual([r.ok, r.indicante.creditado, r.indicante.code, r.indicado.creditado], [true, false, "LIMITE_MENSAL", true]);
  assert.equal(pontos(A), 500);
  assert.equal(pontos(end(11)), 50);
  const nov = await F.creditarIndicacao(A, end(12), MES_SEGUINTE());
  assert.equal(nov.indicante.creditado, true, "os créditos deste mês não contam no seguinte");
  assert.equal(pontos(A), 550);
});

test("B6 o limite não bloqueia a idempotência: re-registar um indicado já pago no 10.º slot não falha", async () => {
  const agora = AGORA_REAL();
  const end = (i) => `0x${String(i + 100).padStart(40, "0")}`;
  for (let i = 1; i <= 10; i++) await F.creditarIndicacao(A, end(i), agora);
  const r = await F.creditarIndicacao(A, end(10), agora);
  assert.deepEqual([r.ok, r.indicante.creditado, r.indicante.code], [true, false, undefined]);
  assert.equal(pontos(A), 500);
});

// ── SEG5: mutantes sobreviventes do validador (O2, O8) ───────────────────────────────────────────
test("B7 o limite conta SÓ indicações FEITAS — o bónus de indicado (`indicacao-recebida`) não ocupa slot", async () => {
  const agora = AGORA_REAL();
  await F.creditarIndicacao(C, A, agora);                       // A recebe +50 como indicado
  const end = (i) => `0x${String(i + 300).padStart(40, "0")}`;
  for (let i = 1; i <= 10; i++) {
    const r = await F.creditarIndicacao(A, end(i), agora);
    assert.equal(r.indicante.creditado, true, `a ${i}.ª indicação feita por A paga`);
  }
  assert.equal(pontos(A), 550);
});

test("A9 endpoint: um endereço de OUTRA pessoa no corpo é IGNORADO — credita só o titular do token (anti-IDOR)", async () => {
  const req = new Request("https://x/.netlify/functions/login-diario", {
    method: "POST", body: JSON.stringify({ endereco: B, address: B }),
    headers: { "content-type": "application/json", authorization: `Bearer ${await assinarUserSession(A)}` },
  });
  const r = await hLogin(req);
  assert.equal(r.status, 200);
  assert.deepEqual([pontos(A), pontos(B)], [5, 0]);
});
