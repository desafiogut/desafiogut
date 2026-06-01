// Teste de integração E2E MC15.8.1 — fluxo de conversão de indicação, com
// Netlify Blobs + contrato on-chain + Sybil/Sentry mockados em memória.
// Cobre: crédito +1 senha a indicador E indicado, idempotência, agrupamento da
// indução (singular→plural), limite diário, relatório admin e anti-fraude.
//
// (Em _tests/, sob underscore, como _lib/: NÃO é publicado como função Netlify.)
// Uso (a partir de desafio-gut/frontend):
//   node --test --experimental-test-module-mocks netlify/functions/_tests/test-conversao-e2e-mc1581.mjs

import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// ── Mocks em memória ─────────────────────────────────────────────────────────
const mem = new Map(); // storeName -> Map(key -> value)
function fakeGetStore({ name }) {
  if (!mem.has(name)) mem.set(name, new Map());
  const m = mem.get(name);
  return {
    async get(key) { return m.has(key) ? m.get(key) : null; },
    async setJSON(key, val) { m.set(key, JSON.parse(JSON.stringify(val))); },
    async list({ prefix } = {}) {
      const blobs = [...m.keys()].filter((k) => !prefix || k.startsWith(prefix)).map((key) => ({ key }));
      return { blobs };
    },
  };
}
const creditos = []; // { endereco, n }
async function fakeCreditarSenhas(endereco, n) { creditos.push({ endereco, n }); return { txHash: "0xtest" }; }

const libURL = (f) => new URL(`../_lib/${f}`, import.meta.url).href;

mock.module("@netlify/blobs", { namedExports: { getStore: fakeGetStore } });
mock.module(libURL("contract.mjs"), { namedExports: {
  creditarSenhas: fakeCreditarSenhas, lerSaldoSenhas: async () => 0, CONTRATO_ADDRESS: "0xC0",
} });
mock.module(libURL("sybil-check.mjs"), { namedExports: {
  checkSybil: async () => ({ suspeito: false, addresses: [] }), registerVisitor: async () => {},
} });
mock.module(libURL("sentry-server.mjs"), { namedExports: { captureSecurityAlert: async () => {} } });

let ref;
before(async () => { ref = await import(libURL("referral.mjs")); });

const A = "0x" + "a".repeat(40); // indicador
const B = "0x" + "b".repeat(40); // indicado 1
const C = "0x" + "c".repeat(40); // indicado 2

test("fluxo completo: código → indicação → conversão credita ambos", async () => {
  creditos.length = 0;
  const { codigo } = await ref.gerarCodigoIndicacao(A);
  assert.match(codigo, /^IND-[A-Z0-9]{6}$/);

  const reg = await ref.registrarIndicacao(codigo, B, "vid-B");
  assert.equal(reg.ok, true);

  const vinculo = await ref.buscarVinculoPorIndicado(B);
  assert.equal(vinculo.indicador, A);

  const conv = await ref.registrarConversao(vinculo, { nomeIndicado: "Ana", contexto: "primeiro-lance" });
  assert.equal(conv.ok, true);
  assert.ok(creditos.some((c) => c.endereco === A && c.n === 1), "indicador creditado +1");
  assert.ok(creditos.some((c) => c.endereco === B && c.n === 1), "indicado creditado +1");
});

test("idempotência: segunda conversão não credita de novo", async () => {
  creditos.length = 0;
  const vinculo = await ref.buscarVinculoPorIndicado(B);
  const conv = await ref.registrarConversao(vinculo, { nomeIndicado: "Ana" });
  assert.equal(conv.idempotent, true);
  assert.equal(creditos.length, 0, "nenhum crédito novo");
});

test("indução: singular após 1 conversão", async () => {
  const pend = await ref.lerInducoesPendentes(A);
  assert.equal(pend.length, 1);
  assert.equal(pend[0].tipo, "indicacao_convertida");
  assert.match(pend[0].mensagem, /O teu amigo Ana/);
  assert.match(pend[0].mensagem, /\+1 senha/);
});

test("indução: agrupa para plural na 2ª conversão do dia", async () => {
  const reg = await ref.registrarIndicacao((await ref.gerarCodigoIndicacao(A)).codigo, C, "vid-C");
  assert.equal(reg.ok, true);
  const vinculoC = await ref.buscarVinculoPorIndicado(C);
  await ref.registrarConversao(vinculoC, { nomeIndicado: "Bruno" });
  const pend = await ref.lerInducoesPendentes(A);
  assert.equal(pend.length, 1);
  assert.equal(pend[0].valor, 2);
  assert.match(pend[0].mensagem, /2 amigos/);
  assert.match(pend[0].mensagem, /\+2 senhas/);
});

test("limite diário: após marcar lidas não há mais indução", async () => {
  await ref.marcarInducoesLidas(A);
  const pend = await ref.lerInducoesPendentes(A);
  assert.equal(pend.length, 0);
});

test("relatório admin: 2 conversões, 4 senhas, top indicador A", async () => {
  const rel = await ref.gerarRelatorioIndicacoes(ref.diaBRT());
  assert.equal(rel.totalConversoes, 2);
  assert.equal(rel.senhasCreditadas, 4); // (indicado +1 + indicador +1) x2
  assert.ok(rel.topIndicadores.some((t) => t.includes("(2)")));
  assert.match(rel.texto, /Conversoes: 2/);
});

test("anti-fraude: auto-indicação na conversão é rejeitada", async () => {
  const conv = await ref.registrarConversao({ codigo: "IND-AAAAAA", indicador: A, indicado: A });
  assert.equal(conv.ok, false);
  assert.equal(conv.code, "auto_indicacao");
});

test("anti-fraude: carteira já indicada não aceita 2º código", async () => {
  const novo = await ref.gerarCodigoIndicacao(C); // C também passa a ter código
  const reg = await ref.registrarIndicacao(novo.codigo, B, "vid-B2"); // B já indicado por A
  assert.equal(reg.ok, false);
  assert.equal(reg.code, "ja_indicado");
});
