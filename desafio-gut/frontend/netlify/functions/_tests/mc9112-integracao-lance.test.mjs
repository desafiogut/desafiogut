// MC91.12 — Teste de INTEGRACAO do handler lance-relampago (fluxo corrigido).
// Executar: node --experimental-test-module-mocks --test mc9112-integracao-lance.test.mjs
//
// Cobre os cenarios centrais do MC91.11/91.12:
//   1) edicao PROGRAMADA: NAO debita R$; gate on-chain (saldo>=1); registra
//      consumo no ledger; mantem a blindagem (comprometerLance + addLance).
//   2) programada SEM senhas: 400 senhas_insuficientes, sem debito, sem consumo.
//   3) edicao RELAMPAGO: consome 1 CREDITO de lance (UTAC110d; antes: debitava R$); NAO consome senha.
//   4) relampago SEM creditos: 400 sem_creditos_lance (UTAC110d; antes: saldo_insuficiente).
//   6) UTAC110d: blindagem falha -> o credito consumido e devolvido.
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
let mockCreditos = 3;            // UTAC110d — creditos de lance do titular
let chamadasConsumoCredito = 0;
let chamadasReversao = 0;
let refsConsumidas = [];
let falharCompromete = false;

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
    comprometerLanceOnchain: async () => { chamadasCompromete += 1; if (falharCompromete) throw new Error("rpc"); return {}; },
    lerSaldoSenhas: async () => mockSaldoOnChain,
  },
});
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => mockEdicao } });
mock.module("../_lib/saldoRs.mjs", {
  namedExports: { debitarSaldoRs: async () => { chamadasDebitoRs += 1; return mockDebitoRs; } },
});
// UTAC110d (R18-110d-3): o relâmpago consome 1 CRÉDITO de lance (o débito R$ ficou atrás da flag
// DESLIGADA). Duplo do ledger: conta créditos e consumos; recusa a 0 como o real (CREDITOS_INSUFICIENTES).
mock.module("../_lib/ledger-lance.mjs", {
  namedExports: {
    consumirCreditoLance: async (e, ref) => {
      chamadasConsumoCredito += 1;
      if (refsConsumidas.includes(ref)) return { ok: true, criado: false, creditos: mockCreditos }; // idempotente por ref, como o real
      if (mockCreditos < 1) return { ok: false, code: "CREDITOS_INSUFICIENTES", creditos: mockCreditos };
      mockCreditos -= 1; refsConsumidas.push(ref);
      return { ok: true, criado: true, creditos: mockCreditos };
    },
    // UTAC110f — a missão do lance importa `creditarPontosLance` (via `_lib/fontes-lance.mjs`).
    creditarPontosLance: async () => ({ ok: true, criado: true, pontos: 10 }),
    lerLedgerLance: async () => ({ creditos: 0, pontos: 0, historico: [] }),
    reverterMovimentoLance: async (e, ref) => {
      chamadasReversao += 1;
      if (refsConsumidas.includes(ref)) { mockCreditos += 1; refsConsumidas.splice(refsConsumidas.indexOf(ref), 1); }
      return { ok: true, revertido: true };
    },
  },
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
  mockCreditos = 3; chamadasConsumoCredito = 0; chamadasReversao = 0; refsConsumidas = []; falharCompromete = false;
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
  assert.equal(chamadasConsumoCredito, 0, "programado NAO consome credito de lance");
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

// UTAC110d — contrato mudado por decisao do operador (R18-110d-3): era «debita R$». A invariante
// mantem-se: o relampago tem um custo cobrado ANTES do registo, e nunca consome senha.
test("RELAMPAGO: consome 1 credito de lance, NAO debita R$ e NAO consome senha (blindagem mantida)", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  const resp = await handler(fakeReq(bodyLance("R-1", 50)));
  assert.equal(resp.status, 201);
  const data = await resp.json();
  assert.equal(data.modo, "relampago");
  assert.equal(data.senhaConsumida, false);
  assert.equal(data.saldoRsAntesCentavos, null);
  assert.equal(data.saldoRsDepoisCentavos, null);
  assert.equal(chamadasDebitoRs, 0, "relampago NAO debita saldo R$ (flag desligada)");
  assert.equal(chamadasConsumoCredito, 1, "relampago consome 1 credito");
  assert.equal(mockCreditos, 2);
  assert.equal(data.creditoLanceConsumido, true);
  assert.equal(data.creditosLanceRestantes, 2);
  assert.equal(chamadasCompromete, 1);
  const consumo = await fakeStore.get(`senhas-programado-consumo:${TEST_ADDR}`, { type: "json" });
  assert.equal(consumo, null, "relampago NAO consome senha");
});

test("RELAMPAGO sem creditos de lance: 400 sem_creditos_lance, sem blindagem nem gravacao", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  mockCreditos = 0;
  const resp = await handler(fakeReq(bodyLance("R-1", 50)));
  assert.equal(resp.status, 400);
  const data = await resp.json();
  assert.equal(data.error.code, "sem_creditos_lance");
  assert.match(data.error.message, /créditos de lance/);
  assert.equal(chamadasCompromete, 0, "sem credito nao ha blindagem");
  assert.equal(chamadasAddLance, 0);
  assert.equal(chamadasDebitoRs, 0, "a falta de credito NAO cai para o debito R$");
});

test("UTAC110d: a blindagem falha -> 502 e o credito consumido VOLTA", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  falharCompromete = true;
  const resp = await handler(fakeReq(bodyLance("R-1", 50)));
  assert.equal(resp.status, 502);
  assert.equal(chamadasConsumoCredito, 1);
  assert.equal(chamadasReversao, 1, "o credito tem de ser devolvido");
  assert.equal(mockCreditos, 3, "creditos de volta ao valor inicial");
});

test("UTAC110d (SEG4 V1): 2 lances sem chave consomem 2 creditos distintos", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  assert.equal((await handler(fakeReq(bodyLance("R-1", 50)))).status, 201);
  assert.equal((await handler(fakeReq(bodyLance("R-1", 51)))).status, 201);
  assert.equal(mockCreditos, 1, "3 - 2");
  assert.equal(new Set(refsConsumidas).size, 2);
});

test("UTAC110d (SEG4 W5): mesma idempotencyKey ja consumida -> 409, sem 2.o credito nem 2.o lance", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  refsConsumidas.push("lance:chave-x"); // o outro pedido concorrente ja consumiu
  const resp = await handler(fakeReq({ ...bodyLance("R-1", 50), idempotencyKey: "chave-x" }));
  assert.equal(resp.status, 409);
  assert.equal((await resp.json()).error.code, "lance_em_processamento");
  assert.equal(mockCreditos, 3);
  assert.equal(chamadasAddLance, 0);
  assert.equal(chamadasReversao, 0, "nunca devolve o credito do outro pedido");
});

test("edicao sem metadata (R-1 sintetica): tratada como relampago (credito de lance)", async () => {
  zerar();
  mockEdicao = null; // sem metadata persistida
  const resp = await handler(fakeReq(bodyLance("R-1", 10)));
  assert.equal(resp.status, 201);
  const data = await resp.json();
  assert.equal(data.modo, "relampago");
  assert.equal(chamadasConsumoCredito, 1);
  assert.equal(chamadasDebitoRs, 0);
});
