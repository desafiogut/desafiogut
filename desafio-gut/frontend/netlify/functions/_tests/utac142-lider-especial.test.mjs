// UTAC142 (Frente E, R18-142-E) — avisos do GUTO sobre o menor lance único da especial, por JANELA e sem valores.
// REAIS: `_lib/lider-especial.mjs`, `_lib/consolidacao.mjs#apurarMenorUnico`, `scheduled-lider-especial.mjs#tick`.
// node --test --experimental-test-module-mocks _tests/utac142-lider-especial.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("@netlify/functions", { namedExports: { schedule: (_c, f) => f } });
mock.module("@netlify/blobs", { namedExports: { getStore: () => null } });

const L = await import("../_lib/lider-especial.mjs");
const { tick, predicadoPortador } = await import("../scheduled-lider-especial.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "0xcccccccccccccccccccccccccccccccccccccccc";
const ID = "ESPECIAL-RELAMPAGO1";
const lance = (endereco, valorCentavos, nomeExibicao) => ({ endereco, valorCentavos, nomeExibicao });
const todos = () => true;

test("E1 · 1.º evento: quem passa a ter o menor único recebe «lider_menor_unico» (e só ele)", async () => {
  const r = await L.avaliarLider({ edicaoId: ID, lances: [lance(A, 3, "Ana Souza"), lance(B, 5)], estadoAnterior: null, ehPortador: todos });
  assert.deepEqual(r.avisos.map((a) => [a.endereco, a.tipo]), [[A, L.TIPO_LIDER]]);
  assert.match(r.avisos[0].mensagem, /^🎯 Ana, /);
  assert.deepEqual(r.estado, { lider: A, jaLideraram: [A] });
});

test("E2 · 2.º evento: B dá um lance menor e único → A recebe «lider_perdeu», B «lider_menor_unico»", async () => {
  const r = await L.avaliarLider({ edicaoId: ID, lances: [lance(A, 3), lance(B, 2)], estadoAnterior: { lider: A, jaLideraram: [A] }, ehPortador: todos });
  assert.deepEqual(r.avisos.map((a) => [a.endereco, a.tipo]), [[A, L.TIPO_PERDEU], [B, L.TIPO_LIDER]]);
});

test("E3 · 3.º evento: C repete o 2 de B (deixa de ser único) → A VOLTA a liderar: «lider_voltou»; B perde", async () => {
  const r = await L.avaliarLider({ edicaoId: ID, lances: [lance(A, 3), lance(B, 2), lance(C, 2)], estadoAnterior: { lider: B, jaLideraram: [A, B] }, ehPortador: todos });
  assert.deepEqual(r.avisos.map((a) => [a.endereco, a.tipo]), [[B, L.TIPO_PERDEU], [A, L.TIPO_VOLTOU]]);
});

test("E4 · sem mudança de líder entre janelas → nenhum aviso (não é por lance)", async () => {
  const r = await L.avaliarLider({ edicaoId: ID, lances: [lance(A, 3), lance(B, 7), lance(C, 9)], estadoAnterior: { lider: A, jaLideraram: [A] }, ehPortador: todos });
  assert.deepEqual(r.avisos, []);
});

test("E5 · ANTI-ORÁCULO: nenhuma mensagem leva valor (nem «R$», nem dígitos do lance), em nenhum dos 3 tipos", () => {
  for (const tipo of [L.TIPO_LIDER, L.TIPO_PERDEU, L.TIPO_VOLTOU]) {
    const m = L.mensagemAviso(tipo, { nome: "Ana", edicaoId: "ESPECIAL-X" });
    assert.doesNotMatch(m, /R\$|\d/, `${tipo}: ${m}`);
  }
});

test("E6 · só portadores: líder sem Passe não é avisado e o ex-líder recebe «deixou de ser»", async () => {
  const r = await L.avaliarLider({ edicaoId: ID, lances: [lance(A, 3), lance(B, 2)], estadoAnterior: { lider: A, jaLideraram: [A] }, ehPortador: (e) => e !== B });
  assert.deepEqual(r.avisos.map((a) => [a.endereco, a.tipo]), [[A, L.TIPO_PERDEU]]);
  assert.equal(r.estado.lider, null);
});

test("E7 · primeiroNome nunca sai de um e-mail; só nome de pessoa", () => {
  assert.equal(L.primeiroNome("ana.souza@gmail.com"), null);
  assert.equal(L.primeiroNome("  João   Pedro Silva "), "João");
  assert.equal(L.primeiroNome("0x5baf…32b8"), null);
  assert.equal(L.primeiroNome(null), null);
});

// UTAC142.1 — o lance já não exige Passe: portador = Passe no inventário AGORA, ou Passe gasto NESTA edição.
test("E8 · portador: inventário > 0, ou Passe gasto nesta edição; o resto não (fail-closed)", async () => {
  const contagem = { async get(k) { return k === `${ID}:${C}` ? { lances: 3, passesConsumidos: 1 } : null; } };
  const p = predicadoPortador(ID, { contagem, ler: async (e) => (e === A ? { ok: true, passesRelampago: 1, passesProgramado: 0 } : e === C ? { ok: true, passesRelampago: 0, passesProgramado: 0 } : { ok: false }) });
  assert.equal(await p(A), true, "tem Passe no inventário");
  assert.equal(await p(C), true, "gastou o último Passe nesta edição");
  assert.equal(await p(B), false, "inventário ilegível e nada gasto");
});

// ── o tick do cron ───────────────────────────────────────────────────────────────────────────────
function storeMem() {
  const m = new Map();
  return { m, async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; }, async setJSON(k, v) { m.set(k, JSON.stringify(v)); } };
}
const agora = Date.parse("2026-11-25T12:00:00Z");
const metaAberta = { id: ID, tipo: "relampago", status: "ativo", inicio_em: "2026-11-20T00:00:00Z", termino_em: "2026-11-30T23:00:00Z" };

test("E9 · tick: avisa por janela, grava o estado, e o tick seguinte sem mudança não repete", async () => {
  const store = storeMem(); const enviados = [];
  const deps = { agoraMs: agora, store, listar: async () => [{ id: ID }, { id: "R-1" }], ler: async () => metaAberta,
    lerLances: async () => [lance(A, 4), lance(B, 6)], notificar: async (e, n) => { enviados.push([e, n]); return true; },
    lerInv: async () => ({ ok: true, passesRelampago: 1, passesProgramado: 0 }), contagem: null }; // UTAC142.1 — portador explícito
  await tick(deps);
  assert.deepEqual(enviados.map(([e, n]) => [e, n.tipo, n.valor]), [[A, L.TIPO_LIDER, null]]);
  assert.match(enviados[0][1].ref, /^janela:\d+$/);
  assert.equal(JSON.parse(store.m.get(ID)).lider, A);
  await tick({ ...deps, agoraMs: agora + L.JANELA_AVISO_MS });
  assert.equal(enviados.length, 1, "repetiu o aviso sem mudança de líder");
});

test("E10 · tick BIDIRECCIONAL: especial fechada, por abrir ou com avisosLider:false → nada", async () => {
  for (const meta of [
    { ...metaAberta, termino_em: "2026-11-24T00:00:00Z" },
    { ...metaAberta, inicio_em: "2026-11-26T00:00:00Z" },
    { ...metaAberta, avisosLider: false },
    { ...metaAberta, status: "encerrado" },
  ]) {
    const enviados = [];
    await tick({ agoraMs: agora, store: storeMem(), listar: async () => [{ id: ID }], ler: async () => meta,
      lerLances: async () => [lance(A, 4)], notificar: async (e, n) => { enviados.push(n); } });
    assert.deepEqual(enviados, [], JSON.stringify(meta));
  }
});

test("E12 · tick: líder SEM Passe (inventário 0 e nada gasto) não é avisado", async () => {
  const enviados = [];
  await tick({ agoraMs: agora, store: storeMem(), listar: async () => [{ id: ID }], ler: async () => metaAberta,
    lerLances: async () => [lance(A, 4)], notificar: async (e, n) => { enviados.push(n); },
    lerInv: async () => ({ ok: true, passesRelampago: 0, passesProgramado: 0 }), contagem: null });
  assert.deepEqual(enviados, []);
});

test("E11 · fail-soft: a leitura de lances de uma edição falha → as outras seguem", async () => {
  const ID2 = "ESPECIAL-NATAL2"; const enviados = [];
  await tick({ agoraMs: agora, store: storeMem(), listar: async () => [{ id: ID }, { id: ID2 }],
    ler: async (id) => ({ ...metaAberta, id }),
    lerLances: async (id) => { if (id === ID) throw new Error("db"); return [lance(B, 1)]; },
    notificar: async (e, n) => { enviados.push([e, n.edicaoId]); },
    lerInv: async () => ({ ok: true, passesRelampago: 1, passesProgramado: 0 }), contagem: null });
  assert.deepEqual(enviados, [[B, ID2]]);
});
