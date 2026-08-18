// MC91.12 — Teste de INTEGRACAO do handler lance-relampago (fluxo corrigido).
// Executar: node --experimental-test-module-mocks --test mc9112-integracao-lance.test.mjs
//
// Cobre os cenarios centrais do MC91.11/91.12:
//   1) edicao PROGRAMADA: NAO debita R$; gate on-chain (saldo>=1); registra
//      consumo no ledger; mantem a blindagem (comprometerLance + addLance).
//   2) programada SEM senhas: 400 senhas_insuficientes, sem debito, sem consumo.
//   3) edicao RELAMPAGO: debita R$; NAO consome senha; blindagem mantida.
//   4) relampago SEM saldo R$: 400 saldo_insuficiente.
//   5) edicao sem metadata (R-1 sintetica): tratada como relampago.
// Usa validate.mjs e ethers REAIS (Response nativo); mocka apenas os modulos
// externos (blobs, jwt, contract, edicoes-core, saldoRs, cors, etc.).
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// ── Mocks mutaveis entre testes ──────────────────────────────────────────────
const TEST_ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
let mockSaldoOnChain = 5;        // lerSaldoSenhas (contrato)
let mockEdicao = null;           // buscarEdicao (metadata)
let mockDebitoRs = { ok: true, resultado: { saldoAntesCentavos: 200, saldoDepoisCentavos: 150 } };
let chamadasDebitoRs = 0;
let chamadasCompromete = 0;
let chamadasAddLance = 0;

// Store in-memory (mesmo padrao dos outros testes).
const mem = new Map();
const fakeStore = {
  async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
  async get(k, { type } = {}) {
    const v = mem.get(k);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  },
  async list() { return { blobs: [...mem.keys()].map((key) => ({ key })) }; },
  async delete(k) { mem.delete(k); },
};

mock.module("@netlify/blobs", { namedExports: { getStore: () => fakeStore } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarLanceAuth: async () => ({ endereco: TEST_ADDR }) } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/rbac.mjs", { namedExports: { getRole: async () => ({ role: "user" }) } });
mock.module("../_lib/require-mfa.mjs", { namedExports: { requireMfa: () => null } });
mock.module("../_lib/system-state.mjs", { namedExports: { lerEstadoSistema: async () => ({}), sistemaPausado: () => false } });
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { registrarEventosDeLance: async () => {} } });
mock.module("../_lib/data-store.mjs", {
  namedExports: { addLance: async (e, r) => { chamadasAddLance += 1; return `key-${e}-${r.lanceId}`; } },
});
mock.module("../_lib/contract.mjs", {
  namedExports: {
    comprometerLanceOnchain: async () => { chamadasCompromete += 1; return {}; },
    lerSaldoSenhas: async () => mockSaldoOnChain,
  },
});
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => mockEdicao } });
mock.module("../_lib/saldoRs.mjs", {
  namedExports: { debitarSaldoRs: async () => { chamadasDebitoRs += 1; return mockDebitoRs; } },
});
mock.module("../_lib/cors.mjs", {
  namedExports: {
    respostaPreflight: () => null,
    CABECALHOS_CORS: { "access-control-allow-origin": "*" },
  },
});

let handler;
before(async () => {
  process.env.NETWORK_STAGE = "mainnet"; // blindagem ativa (caminho de producao)
  const mod = await import("../lance-relampago.mjs");
  handler = mod.default;
});

function fakeReq(body) {
  return {
    method: "POST",
    headers: { get: (h) => (h === "authorization" ? "Bearer token-teste" : null) },
    text: async () => JSON.stringify(body),
    url: "http://localhost/.netlify/functions/lance-relampago",
  };
}

function zerar() {
  mem.clear();
  chamadasDebitoRs = 0;
  chamadasCompromete = 0;
  chamadasAddLance = 0;
  mockEdicao = null;
  mockSaldoOnChain = 5;
  mockDebitoRs = { ok: true, resultado: { saldoAntesCentavos: 200, saldoDepoisCentavos: 150 } };
}

const bodyLance = (edicaoId = "PROG-1", valorCentavos = 50) => ({
  endereco: TEST_ADDR, valorCentavos, edicaoId, nomeExibicao: "Novo Pernambucano",
});

test("PROGRAMADO: nao debita R$, consome 1 senha no ledger e mantem blindagem", async () => {
  zerar();
  mockEdicao = { id: "PROG-1", tipo: "programado" };
  const resp = await handler(fakeReq(bodyLance("PROG-1", 50)));
  assert.equal(resp.status, 201, "esperado 201");
  const data = await resp.json();
  assert.equal(data.ok, true);
  assert.equal(data.modo, "programado");
  assert.equal(data.senhaConsumida, true);
  assert.equal(data.saldoOnChain, 5);
  assert.equal(chamadasDebitoRs, 0, "programado NAO deve debitar saldo R$");
  assert.equal(chamadasCompromete, 1, "blindagem (comprometerLance) deve rodar");
  assert.equal(chamadasAddLance, 1, "key-per-bid (addLance) deve rodar");
  // ledger persistiu o consumo (chave = endereco lowercase dentro do store
  // "senhas-programado-consumo"; BLOB_SENHAS_CONSUMO e o NOME do store)
  const consumo = await fakeStore.get(TEST_ADDR, { type: "json" });
  assert.ok(consumo, "ledger deve ter registro");
  assert.equal(consumo.consumidas, 1);
});

test("PROGRAMADO sem senhas on-chain: 400 senhas_insuficientes, sem debito, sem consumo", async () => {
  zerar();
  mockEdicao = { id: "PROG-1", tipo: "programado" };
  mockSaldoOnChain = 0;
  const resp = await handler(fakeReq(bodyLance("PROG-1", 50)));
  assert.equal(resp.status, 400);
  const data = await resp.json();
  assert.equal(data.error.code, "senhas_insuficientes");
  assert.equal(chamadasDebitoRs, 0);
  assert.equal(chamadasCompromete, 0);
  const consumo = await fakeStore.get(TEST_ADDR, { type: "json" });
  assert.equal(consumo, null, "nenhum consumo registrado");
});

test("RELAMPAGO: debita R$ e NAO consome senha (blindagem mantida)", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  const resp = await handler(fakeReq(bodyLance("R-1", 50)));
  assert.equal(resp.status, 201);
  const data = await resp.json();
  assert.equal(data.modo, "relampago");
  assert.equal(data.senhaConsumida, false);
  assert.equal(data.saldoRsAntesCentavos, 200);
  assert.equal(data.saldoRsDepoisCentavos, 150);
  assert.equal(chamadasDebitoRs, 1, "relampago DEVE debitar saldo R$");
  assert.equal(chamadasCompromete, 1);
  const consumo = await fakeStore.get(`senhas-programado-consumo:${TEST_ADDR}`, { type: "json" });
  assert.equal(consumo, null, "relampago NAO consome senha");
});

test("RELAMPAGO sem saldo R$: 400 saldo_insuficiente", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  mockDebitoRs = { ok: false, code: "saldo_insuficiente", message: "saldo R$ insuficiente" };
  const resp = await handler(fakeReq(bodyLance("R-1", 999999)));
  assert.equal(resp.status, 400);
  const data = await resp.json();
  assert.equal(data.error.code, "saldo_insuficiente");
  assert.equal(chamadasCompromete, 0, "sem debito nao ha blindagem");
});

test("edicao sem metadata (R-1 sintetica): tratada como relampago (debito R$)", async () => {
  zerar();
  mockEdicao = null; // sem metadata persistida
  const resp = await handler(fakeReq(bodyLance("R-1", 10)));
  assert.equal(resp.status, 201);
  const data = await resp.json();
  assert.equal(data.modo, "relampago");
  assert.equal(chamadasDebitoRs, 1);
});
