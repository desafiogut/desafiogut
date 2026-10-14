// UTAC110f (Frente B) — a indicação credita +50 pontos de lance ao indicante e ao indicado, DENTRO do
// `POST /referral?acao=usar-codigo` existente (decisão do operador no SEG-1: sem endpoint/tabela nova).
//
// REAIS: `referral.mjs`, `_lib/referral.mjs` (vínculo, auto-indicação, já-indicado, throttle de IP),
// `_lib/fontes-lance.mjs`, `_lib/ledger-lance.mjs` e `_lib/jwt.mjs` (tokens assinados).
// Duplos só nas fronteiras: Blobs (`_blobs-cas-duplo.mjs`), Supabase (`_pontos-duplo-110f.mjs`),
// contrato on-chain (`creditarSenhas` espiado — NÃO é tocado por este UTAC), Sybil, Sentry, rate-limit.
//
// node --test --experimental-test-module-mocks _tests/utac110f-referral.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarTabelaPontos } from "./_pontos-duplo-110f.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110f-referral-comprimento-suficiente";
delete process.env.REFERRAL_ATIVO;

let BL = criarBlobs();
let T = criarTabelaPontos();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => BL.getStore(typeof o === "string" ? { name: o } : o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => ({ from: () => T.from() }), getSupabaseReadOnly: () => ({ from: () => T.from() }),
  supabaseConfigurado: () => true } });
mock.module("../_lib/contract.mjs", { namedExports: {
  creditarSenhas: async () => ({ txHash: "0xtest" }), lerSaldoSenhas: async () => 0, CONTRATO_ADDRESS: "0xC0" } });
mock.module("../_lib/sybil-check.mjs", { namedExports: {
  checkSybil: async () => ({ suspeito: false, addresses: [] }), registerVisitor: async () => {} } });
mock.module("../_lib/sentry-server.mjs", { namedExports: { captureSecurityAlert: async () => {}, Sentry: {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });

const { default: handler } = await import("../referral.mjs");
const R = await import("../_lib/referral.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // indicante
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; // indicado
const C = "0xcccccccccccccccccccccccccccccccccccccccc";

beforeEach(() => { BL = criarBlobs(); T = criarTabelaPontos(); });
const pontos = (e) => T.linha(e)?.pontos_lance ?? 0;

let n = 0;
async function usar(codigo, quem, { ip, semToken = false } = {}) {
  const tk = semToken ? null : await assinarUserSession(quem);
  const req = new Request("https://x/.netlify/functions/referral?acao=usar-codigo", {
    method: "POST", body: JSON.stringify({ codigo_indicacao: codigo, endereco: quem }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip ?? `10.7.0.${++n % 250}`,
      ...(tk ? { authorization: `Bearer ${tk}` } : {}) },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

test("R1 indicação válida → 200 e +50 pontos de lance ao indicante E ao indicado", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.pontosLance, { indicante: true, indicado: true });
  assert.deepEqual([pontos(A), pontos(B)], [50, 50]);
});

test("R2 auto-indicação → 400 auto_indicacao e NADA creditado", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, A);
  assert.deepEqual([r.status, r.corpo?.error?.code], [400, "auto_indicacao"]);
  assert.equal(pontos(A), 0);
});

test("R3 o mesmo indicado por OUTRO código → 409 ja_indicado e nenhum ponto extra", async () => {
  const { codigo: cA } = await R.gerarCodigoIndicacao(A);
  const { codigo: cC } = await R.gerarCodigoIndicacao(C);
  await usar(cA, B);
  const r = await usar(cC, B);
  assert.deepEqual([r.status, r.corpo?.error?.code], [409, "ja_indicado"]);
  assert.deepEqual([pontos(A), pontos(B), pontos(C)], [50, 50, 0]);
});

test("R4 idempotência: repetir o MESMO código → 200 idempotent e os pontos não mudam", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  await usar(codigo, B);
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.idempotent, true);
  assert.deepEqual(r.corpo.pontosLance, { indicante: false, indicado: false });
  assert.deepEqual([pontos(A), pontos(B)], [50, 50]);
});

test("R5 throttle de IP excedido → vincula mas NÃO credita pontos (pontosLance:null)", async () => {
  const ip = "203.0.113.9";
  const cods = await Promise.all([A, C, "0xdddddddddddddddddddddddddddddddddddddddd"].map((e) => R.gerarCodigoIndicacao(e)));
  const ind = ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333"];
  await usar(cods[0].codigo, ind[0], { ip });
  await usar(cods[1].codigo, ind[1], { ip });
  const r3 = await usar(cods[2].codigo, ind[2], { ip });
  assert.equal(r3.status, 200);
  assert.equal(r3.corpo.pontosLance, null);
  assert.equal(pontos(ind[2]), 0);
  assert.equal(pontos("0xdddddddddddddddddddddddddddddddddddddddd"), 0);
  assert.deepEqual([pontos(ind[0]), pontos(ind[1])], [50, 50], "os 2 primeiros (dentro do limite) recebem");
});

test("R6 sem token → 401 e nada creditado", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, B, { semToken: true });
  assert.equal(r.status, 401);
  assert.deepEqual([pontos(A), pontos(B)], [0, 0]);
});

test("R7 o ledger falha → o vínculo fica (200) e a resposta diz que não creditou (fail-soft)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  T.g.falhar = { op: "select" };
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.pontosLance.indicante, false);
  assert.equal(r.corpo.pontosLance.indicado, false);
  T.g.falhar = null;
  assert.ok(await R.buscarVinculoPorIndicado(B), "o vínculo foi registado");
});
