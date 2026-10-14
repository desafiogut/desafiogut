// UTAC110f (Frente C) — a missão «Completar 1 lance» é creditada pelo SERVIDOR dentro do lance-relampago.
//
// Decisão do operador (SEG-1): sem endpoint público — o cliente não pode reclamar a missão sem dar lance.
// REAIS: `lance-relampago.mjs`, `_lib/fontes-lance.mjs`, `_lib/validate.mjs`. O ledger é um duplo ESPIÃO
// (regista cada `creditarPontosLance`) com a idempotência por ref do real. Restantes mocks = os do
// `mc9112-integracao-lance.test.mjs` (mesmo padrão; lá não se acrescentam asserções — GATE 15).
//
// node --test --experimental-test-module-mocks _tests/utac110f-lance-missao.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
let mockEdicao = null;
let mockCreditos = 3;
let falharCompromete = false;
let missao = [];              // chamadas a creditarPontosLance: [endereco, quantidade, motivo, ref]
let refsMissao = new Set();
let modoMissao = "ok";        // "ok" | "falha" | "lanca"

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
mock.module("../_lib/contract.mjs", { namedExports: {
  comprometerLanceOnchain: async () => { if (falharCompromete) throw new Error("rpc"); return {}; },
  lerSaldoSenhas: async () => 5,
} });
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => mockEdicao } });
mock.module("../_lib/saldoRs.mjs", { namedExports: { debitarSaldoRs: async () => ({ ok: true, resultado: {} }) } });
mock.module("../_lib/ledger-lance.mjs", { namedExports: {
  consumirCreditoLance: async () => {
    if (mockCreditos < 1) return { ok: false, code: "CREDITOS_INSUFICIENTES", creditos: mockCreditos };
    mockCreditos -= 1; return { ok: true, criado: true, creditos: mockCreditos };
  },
  reverterMovimentoLance: async () => { mockCreditos += 1; return { ok: true, revertido: true }; },
  creditarPontosLance: async (e, q, motivo, ref) => {
    missao.push([e, q, motivo, ref]);
    if (modoMissao === "falha") return { ok: false, code: "ERRO_DB" };
    if (modoMissao === "lanca") throw new Error("boom");
    const criado = !refsMissao.has(ref); refsMissao.add(ref);
    return { ok: true, criado, pontos: 10 };
  },
  lerLedgerLance: async () => ({ creditos: 0, pontos: 0, historico: [] }),
} });
mock.module("../_lib/cors.mjs", { namedExports: {
  respostaPreflight: () => null, CABECALHOS_CORS: { "access-control-allow-origin": "*" } } });

let handler;
let diaManaus;
before(async () => {
  process.env.NETWORK_STAGE = "mainnet";
  handler = (await import("../lance-relampago.mjs")).default;
  ({ diaManaus } = await import("../_lib/fontes-lance.mjs"));
});
beforeEach(() => {
  mem.clear(); mockEdicao = null; mockCreditos = 3; falharCompromete = false;
  missao = []; refsMissao = new Set(); modoMissao = "ok";
});

const req = (edicaoId, extra = {}) => ({
  method: "POST",
  headers: { get: (h) => (h === "authorization" ? "Bearer t" : null) },
  text: async () => JSON.stringify({ endereco: ADDR, valorCentavos: 37, edicaoId, nomeExibicao: "Teste", ...extra }),
  url: "http://localhost/.netlify/functions/lance-relampago",
});
async function lance(edicaoId = "RELAMP-1", extra) {
  const r = await handler(req(edicaoId, extra));
  return { status: r.status, corpo: await r.json() };
}

test("L1 lance relâmpago bem-sucedido → missão +10 com a ref do DIA de Manaus; resposta diz creditado", async () => {
  mockEdicao = { id: "RELAMP-1", tipo: "relampago" };
  const r = await lance();
  assert.equal(r.status, 201);
  assert.equal(missao.length, 1);
  assert.deepEqual(missao[0], [ADDR, 10, "missao", `missao-lance:${diaManaus(new Date())}`]);
  assert.deepEqual(r.corpo.missaoLance, { creditado: true });
});

test("L2 2.º lance do mesmo dia → a missão não volta a creditar (creditado:false); o lance continua 201", async () => {
  mockEdicao = { id: "RELAMP-1", tipo: "relampago" };
  await lance();
  const r = await lance("RELAMP-1", { valorCentavos: 38 });
  assert.equal(r.status, 201);
  assert.deepEqual(r.corpo.missaoLance, { creditado: false });
  assert.equal(new Set(missao.map((m) => m[3])).size, 1, "mesma ref diária nas duas chamadas");
});

test("L3 lance PROGRAMADO não conta para a missão (missaoLance:null, 0 chamadas)", async () => {
  mockEdicao = { id: "PROG-1", tipo: "programado" };
  const r = await lance("PROG-1");
  assert.equal(r.status, 201);
  assert.equal(r.corpo.missaoLance, null);
  assert.equal(missao.length, 0);
});

test("L4 lance RECUSADO (sem créditos) → nenhuma missão", async () => {
  mockEdicao = { id: "RELAMP-1", tipo: "relampago" };
  mockCreditos = 0;
  const r = await lance();
  assert.equal(r.status, 400);
  assert.equal(missao.length, 0);
});

test("L5 blindagem falha (lance NÃO registado) → nenhuma missão", async () => {
  mockEdicao = { id: "RELAMP-1", tipo: "relampago" };
  falharCompromete = true;
  const r = await lance();
  assert.equal(r.status, 502);
  assert.equal(missao.length, 0, "a missão só corre depois de o lance existir");
});

test("L6 a missão falha (ok:false) ou LANÇA → o lance continua 201 (fail-soft)", async () => {
  mockEdicao = { id: "RELAMP-1", tipo: "relampago" };
  modoMissao = "falha";
  const a = await lance();
  assert.equal(a.status, 201);
  assert.deepEqual(a.corpo.missaoLance, { creditado: false, erro: "ERRO_DB" });
  modoMissao = "lanca";
  const b = await lance("RELAMP-1", { valorCentavos: 39 });
  assert.equal(b.status, 201);
  assert.deepEqual(b.corpo.missaoLance, { creditado: false, erro: "excecao" });
});
