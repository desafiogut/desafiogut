// UTAC129 (Frente A, R18-129-3) — o LANCE Relâmpago deixa de exigir/consumir Passe: gasta SÓ pontos de
// lance. É isto que reabre a missão «Completar 1 lance» (+10) a quem não comprou nada (furo F1 do UTAC128).
// O PALPITE continua a consumir 1 Passe Programado (Arts. 25º/29º) — vigiado aqui pela fonte.
//
// REAIS: `lance-relampago.mjs`, `_lib/fontes-lance.mjs`, `_lib/validate.mjs`. O inventário de Passes é um
// duplo ESPIÃO com stock 0 (o caso do utilizador que nunca comprou): se o lance o chamar, o teste vê.
// Restantes mocks = os de `utac110f-lance-missao.test.mjs` (mesmo padrão).
//
// node --test --experimental-test-module-mocks _tests/utac129-lance-sem-passe.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
let mockEdicao = null;
let mockPontos = 0;
let creditos = [];           // creditarPontosLance: [endereco, quantidade, motivo, ref]
let refs = new Set();
let chamadasInventario = [];  // consumirPasse/devolverPasse chamados pelo lance
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
mock.module("../_lib/contract.mjs", { namedExports: {
  comprometerLanceOnchain: async () => { if (falharBlindagem) throw new Error("rpc"); return {}; }, lerSaldoSenhas: async () => 5,
} });
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => mockEdicao } });
mock.module("../_lib/saldoRs.mjs", { namedExports: { debitarSaldoRs: async () => ({ ok: true, resultado: {} }) } });
mock.module("../_lib/passes-inventario.mjs", { namedExports: {
  consumirPasse: async (a) => { chamadasInventario.push(["consumir", a]); return { ok: false, code: "sem_passes" }; },
  devolverPasse: async (a) => { chamadasInventario.push(["devolver", a]); return { ok: true }; },
  creditarPasse: async () => ({ ok: true }), lerInventario: async () => ({ ok: true, passesRelampago: 0, passesProgramado: 0 }),
} });
mock.module("../_lib/ledger-lance.mjs", { namedExports: {
  consumirPontosLance: async (e, valor) => {
    if (mockPontos < valor) return { ok: false, code: "PONTOS_LANCE_INSUFICIENTES", pontos: mockPontos };
    mockPontos -= valor; return { ok: true, criado: true, pontos: mockPontos };
  },
  reverterMovimentoLance: async () => ({ ok: true, revertido: true }),
  creditarPontosLance: async (e, q, motivo, ref) => {
    creditos.push([e, q, motivo, ref]);
    const criado = !refs.has(ref); refs.add(ref);
    if (criado) mockPontos += q;
    return { ok: true, criado, pontos: mockPontos };
  },
  lerLedgerLance: async () => ({ creditos: 0, pontos: mockPontos, historico: [] }),
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
  mem.clear(); mockEdicao = { id: "RELAMP-1", tipo: "relampago" }; mockPontos = 0;
  creditos = []; refs = new Set(); chamadasInventario = []; falharBlindagem = false;
});

const req = (valorCentavos, extra = {}) => ({
  method: "POST",
  headers: { get: (h) => (h === "authorization" ? "Bearer t" : null) },
  text: async () => JSON.stringify({ endereco: ADDR, valorCentavos, edicaoId: "RELAMP-1", nomeExibicao: "Teste", ...extra }),
  url: "http://localhost/.netlify/functions/lance-relampago",
});
async function lance(valor, extra) {
  const r = await handler(req(valor, extra));
  return { status: r.status, corpo: await r.json() };
}

test("A1 (positivo) sem NENHUM Passe e com 5 pontos grátis → lance de 1 ponto aceite, missão +10 creditada", async () => {
  mockPontos = 5; // = 1 login diário
  const r = await lance(1);
  assert.equal(r.status, 201, `esperava 201, veio ${r.status} ${JSON.stringify(r.corpo)}`);
  assert.deepEqual(r.corpo.missaoLance, { creditado: true });
  assert.deepEqual(creditos.find((c) => c[2] === "missao"), [ADDR, 10, "missao", `missao-lance:${diaManaus(new Date())}`]);
  assert.equal(mockPontos, 5 - 1 + 10, "gasta o valor do lance e recebe a missão");
});

test("A2 (o furo F1 fechado) o lance NUNCA toca no inventário de Passes", async () => {
  mockPontos = 50;
  const r = await lance(7);
  assert.equal(r.status, 201);
  assert.deepEqual(chamadasInventario, [], "o lance chamou o inventário de Passes");
  assert.notEqual(r.corpo?.error?.code, "sem_passes_disponiveis");
});

test("A3 (negativo) pontos insuficientes → 400 saldo_pontos_insuficiente, sem missão e sem inventário", async () => {
  mockPontos = 3;
  const r = await lance(10);
  assert.equal(r.status, 400);
  assert.equal(r.corpo.error?.code ?? r.corpo.code, "saldo_pontos_insuficiente");
  assert.equal(creditos.length, 0);
  assert.deepEqual(chamadasInventario, []);
});

test("A4 (entrada inválida) lance de 0 → recusado com erro visível, sem débito", async () => {
  mockPontos = 50;
  const r = await lance(0);
  assert.equal(r.status, 400);
  assert.equal(mockPontos, 50);
  assert.deepEqual(chamadasInventario, []);
});

test("A5 (R18-129-3) o PALPITE continua a consumir 1 Passe Programado — fonte vigiada", () => {
  const src = readFileSync(new URL("../registar-palpite.mjs", import.meta.url), "utf8");
  assert.match(src, /consumirPasse\(\{\s*endereco:\s*t\.endereco,\s*tipo:\s*"programado"/);
});

test("A6 (achado MA2 do SEG4) a falha da blindagem devolve os PONTOS e nunca cria Passe", async () => {
  mockPontos = 50;
  falharBlindagem = true;
  const r = await lance(7);
  assert.equal(r.status, 502);
  assert.deepEqual(chamadasInventario, [], "um lance falhado mexeu no inventário de Passes");
  const src = readFileSync(new URL("../lance-relampago.mjs", import.meta.url), "utf8")
    .split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.doesNotMatch(src, /devolverPasse\(|passeConsumido/, "os ramos de devolução do Passe voltaram");
});
