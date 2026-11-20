// UTAC142 (Frente C, R18-142-C) — na EDIÇÃO ESPECIAL cada lance consome 1 Passe Relâmpago, além dos pontos.
// Só na especial: o Relâmpago normal continua sem Passe (R18-129-3, provado em utac129-lance-sem-passe).
//
// REAIS: `lance-relampago.mjs`, `_lib/especial-config.mjs`, `_lib/edicao-janela.mjs`. Inventário e ledger = duplos
// com estado, iguais aos do utac129 (o inventário com STOCK por endereço e a RPC atómica modelada).
// node --test --experimental-test-module-mocks _tests/utac142-especial-passe.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
const ESP = "ESPECIAL-RELAMPAGO1";
let mockEdicao = null;
let mockPontos = 0;
let passes = 0;
let inventarioEmBaixo = false;
let chamadas = [];       // ["consumir"|"devolver", tipo]
let revertidos = [];     // refs devolvidas no ledger
let refsLedger = new Set();
let valorDaRef = new Map();
let falharBlindagem = false;

const mem = new Map();
const fakeStore = {
  async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
  async get(k, { type } = {}) { const v = mem.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
  async list() { return { blobs: [...mem.keys()].map((key) => ({ key })) }; },
  async delete(k) { mem.delete(k); },
};

mock.module("@netlify/blobs", { namedExports: { getStore: () => fakeStore } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarLanceAuth: async () => ({ endereco: ADDR }) } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/rbac.mjs", { namedExports: { getRole: async () => ({ role: "user" }) } });
mock.module("../_lib/require-mfa.mjs", { namedExports: { requireMfa: () => null } });
mock.module("../_lib/system-state.mjs", { namedExports: { lerEstadoSistema: async () => ({}), sistemaPausado: () => false } });
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { registrarEventosDeLance: async () => {} } });
mock.module("../_lib/data-store.mjs", { namedExports: { addLance: async (e, r) => `key-${e}-${r.lanceId}` } });
mock.module("../_lib/ranking-especial.mjs", { namedExports: { registarNoRankingEspecial: async () => ({ ok: true, posicao: 1 }) } });
mock.module("../_lib/contract.mjs", { namedExports: {
  comprometerLanceOnchain: async () => { if (falharBlindagem) throw new Error("rpc"); return {}; }, lerSaldoSenhas: async () => 5,
} });
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => mockEdicao } });
mock.module("../_lib/saldoRs.mjs", { namedExports: { debitarSaldoRs: async () => ({ ok: true, resultado: {} }) } });
mock.module("../_lib/fontes-lance.mjs", { namedExports: {
  creditarMissaoLance: async () => ({ ok: true, creditado: false }), PONTOS_MISSAO_LANCE: 10 } });
mock.module("../_lib/passes-inventario.mjs", { namedExports: {
  consumirPasse: async ({ tipo }) => {
    chamadas.push(["consumir", tipo]);
    if (inventarioEmBaixo) return { ok: false, code: "inventario_indisponivel" };
    if (passes < 1) return { ok: false, code: "sem_passes" };
    passes -= 1; return { ok: true, restantes: passes };
  },
  devolverPasse: async ({ tipo }) => { chamadas.push(["devolver", tipo]); passes += 1; return { ok: true }; },
  creditarPasse: async () => ({ ok: true }), lerInventario: async () => ({ ok: true, passesRelampago: passes, passesProgramado: 0 }),
} });
mock.module("../_lib/ledger-lance.mjs", { namedExports: {
  consumirPontosLance: async (e, valor, ref) => {
    if (refsLedger.has(ref)) return { ok: true, criado: false, pontos: mockPontos };
    if (mockPontos < valor) return { ok: false, code: "PONTOS_LANCE_INSUFICIENTES", pontos: mockPontos };
    refsLedger.add(ref); valorDaRef.set(ref, valor); mockPontos -= valor; return { ok: true, criado: true, pontos: mockPontos };
  },
  // modela o real: remove o movimento e devolve o delta
  reverterMovimentoLance: async (e, ref) => {
    revertidos.push(ref); mockPontos += valorDaRef.get(ref) ?? 0; valorDaRef.delete(ref); return { ok: true, revertido: true };
  },
  creditarPontosLance: async () => ({ ok: true, criado: true, pontos: mockPontos }),
  lerLedgerLance: async () => ({ creditos: 0, pontos: mockPontos, historico: [] }),
  PONTOS_LANCE_BONUS_PASSE_RELAMPAGO: 100,
} });
mock.module("../_lib/cors.mjs", { namedExports: {
  respostaPreflight: () => null, CABECALHOS_CORS: { "access-control-allow-origin": "*" } } });

let handler;
before(async () => {
  process.env.NETWORK_STAGE = "mainnet";
  handler = (await import("../lance-relampago.mjs")).default;
});
const especial = (extra = {}) => ({
  id: ESP, tipo: "relampago", status: "ativo",
  inicio_em: new Date(Date.now() - 3600e3).toISOString(), termino_em: new Date(Date.now() + 3600e3).toISOString(), ...extra,
});
beforeEach(() => {
  mem.clear(); mockEdicao = especial(); mockPontos = 50; passes = 3; inventarioEmBaixo = false;
  chamadas = []; revertidos = []; refsLedger = new Set(); valorDaRef = new Map(); falharBlindagem = false;
});
async function lance(valor, { edicaoId = ESP, idempotencyKey } = {}) {
  const r = await handler({
    method: "POST",
    headers: { get: (h) => (h === "authorization" ? "Bearer t" : null) },
    text: async () => JSON.stringify({ endereco: ADDR, valorCentavos: valor, edicaoId, ...(idempotencyKey ? { idempotencyKey } : {}) }),
    url: "http://localhost/.netlify/functions/lance-relampago",
  });
  return { status: r.status, corpo: await r.json() };
}
const codigo = (c) => c.error?.code ?? c.code;

test("C1 · especial: lance aceite consome 1 Passe Relâmpago E os pontos do valor", async () => {
  const r = await lance(2);
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(passes, 2);
  assert.equal(mockPontos, 48);
  assert.deepEqual(chamadas, [["consumir", "relampago"]]);
  assert.equal(r.corpo.passeConsumido, true);
  assert.equal(r.corpo.passesRelampagoRestantes, 2);
});

test("C2 · 1 Passe POR LANCE: três lances gastam três Passes; o quarto é recusado", async () => {
  for (const v of [1, 2, 3]) assert.equal((await lance(v)).status, 201);
  assert.equal(passes, 0);
  const r = await lance(4);
  assert.equal(r.status, 400);
  assert.equal(codigo(r.corpo), "sem_passes_disponiveis");
});

test("C3 · sem Passe: 400, os pontos VOLTAM (efeito líquido zero) e nenhum Passe é criado", async () => {
  passes = 0;
  const r = await lance(5);
  assert.equal(r.status, 400);
  assert.equal(codigo(r.corpo), "sem_passes_disponiveis");
  assert.equal(revertidos.length, 1, "os pontos do lance recusado não voltaram");
  assert.equal(mockPontos, 50);
  assert.deepEqual(chamadas, [["consumir", "relampago"]], "chamou devolverPasse sem ter consumido (MA2)");
  assert.equal(passes, 0);
});

test("C4 · inventário em baixo: 503, pontos devolvidos, nunca se assume que há Passe (fail-closed)", async () => {
  inventarioEmBaixo = true;
  const r = await lance(5);
  assert.equal(r.status, 503);
  assert.equal(codigo(r.corpo), "inventario_indisponivel");
  assert.equal(revertidos.length, 1);
  assert.equal(chamadas.filter((c) => c[0] === "devolver").length, 0);
});

test("C5 · a blindagem falha DEPOIS do consumo: o Passe volta UMA vez e os pontos também", async () => {
  falharBlindagem = true;
  const r = await lance(5);
  assert.equal(r.status, 502);
  assert.equal(passes, 3, "o Passe do lance falhado não voltou (ou voltou a dobrar)");
  assert.deepEqual(chamadas, [["consumir", "relampago"], ["devolver", "relampago"]]);
  assert.equal(revertidos.length, 1);
});

test("C6 · BIDIRECCIONAL: o Relâmpago normal NÃO toca no inventário (R18-129-3 intacta fora da especial)", async () => {
  mockEdicao = { id: "RELAMP-1", tipo: "relampago" };
  passes = 0;
  const r = await lance(5, { edicaoId: "RELAMP-1" });
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.deepEqual(chamadas, []);
  assert.equal(r.corpo.passeConsumido, false);
});

test("C7 · dinâmico: a especial com `passePorLance:false` no Blob não consome Passe", async () => {
  mockEdicao = especial({ passePorLance: false });
  passes = 0;
  const r = await lance(5);
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.deepEqual(chamadas, []);
});

test("C8 · idempotência: repetir a MESMA idempotencyKey não consome um 2.º Passe", async () => {
  const k = "0x" + "ab".repeat(16);
  assert.equal((await lance(5, { idempotencyKey: k })).status, 201);
  mem.clear(); // sem a cache de idempotência, o 2.º pedido chega ao débito
  const r2 = await lance(5, { idempotencyKey: k });
  assert.equal(r2.status, 409);
  assert.equal(passes, 2, "o pedido repetido gastou outro Passe");
  assert.equal(chamadas.filter((c) => c[0] === "consumir").length, 1);
});

test("C9 · concorrência: 5 lances em paralelo com 3 Passes → 3 aceites, 2 recusados, inventário nunca negativo", async () => {
  const rs = await Promise.all([1, 2, 3, 4, 5].map((v) => lance(v)));
  const ok = rs.filter((r) => r.status === 201).length;
  assert.equal(ok, 3);
  assert.equal(rs.filter((r) => codigo(r.corpo) === "sem_passes_disponiveis").length, 2);
  assert.equal(passes, 0);
  assert.equal(mockPontos, 50 - rs.filter((r) => r.status === 201).reduce((s, r) => s + r.corpo.valorCentavos, 0));
});
