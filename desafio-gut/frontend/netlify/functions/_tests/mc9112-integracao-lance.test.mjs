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
let mockCreditos = 0;            // UTAC110n — os créditos deixaram de ser gastos (ficam a 0 e intocados)
let mockPontosLance = 300;       // UTAC110n — saldo de PONTOS DE LANCE do titular
let ultimoValorConsumido = 0;
let chamadasConsumoCredito = 0;  // (nome herdado do 110d: conta consumos no ledger de lance)
let chamadasReversao = 0;
let refsConsumidas = [];
let falharCompromete = false;

// Store in-memory (mesmo padrao dos outros testes).
const mem = new Map();
let falharSetJSON = false; // UTAC110n (achado ⚠️1) — simula o Blob em baixo no ramo legado
const fakeStore = {
  async setJSON(k, o) { if (falharSetJSON) throw new Error("blob indisponivel"); mem.set(k, JSON.stringify(o)); },
  async get(k, { type } = {}) {
    const v = mem.get(k);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  },
  async list() { return { blobs: [...mem.keys()].map((key) => ({ key })) }; },
  async delete(k) { mem.delete(k); },
  // UTAC147 — a trava do lance usa `set(k, v, { onlyIfNew: true })`. Como o real: chave existente ⇒ 412 ⇒
  // `{ modified:false }`; escrita feita ⇒ etag NÃO vazio; falha (5xx) ⇒ etag "" (simulada por `falharTrava`).
  async set(k, v, opt = {}) {
    if (falharTrava) return { modified: true, etag: "" };
    if (opt.onlyIfNew && mem.has(k)) return { modified: false };
    mem.set(k, String(v)); return { modified: true, etag: `"e${mem.size}"` };
  },
};
let falharTrava = false;

// UTAC147 — inventário de Passes (duplo com a semântica das RPCs: consumir só com stock, atómico).
let mockPassesRelampago = 3;
let chamadasConsumoPasse = 0;
let chamadasDevolucaoPasse = 0;
mock.module("../_lib/passes-inventario.mjs", {
  namedExports: {
    consumirPasse: async ({ tipo }) => {
      chamadasConsumoPasse += 1;
      if (tipo !== "relampago") return { ok: false, code: "tipo_invalido" };
      if (mockPassesRelampago < 1) return { ok: false, code: "sem_passes" };
      mockPassesRelampago -= 1;
      return { ok: true, restantes: mockPassesRelampago };
    },
    devolverPasse: async () => { chamadasDevolucaoPasse += 1; mockPassesRelampago += 1; return { ok: true }; },
  },
});

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
// UTAC110n (R18-110j.4b-1) — o relâmpago gasta PONTOS DE LANCE pelo valor do lance (antes: 1 CRÉDITO
// de lance, UTAC110d). Duplo do ledger: debita o valor pedido e recusa a 0 como o real
// (PONTOS_LANCE_INSUFICIENTES). `mockCreditos` fica a 0 e o teste seguinte garante que não é tocado.
mock.module("../_lib/ledger-lance.mjs", {
  namedExports: {
    consumirPontosLance: async (e, valor, ref) => {
      chamadasConsumoCredito += 1;
      ultimoValorConsumido = valor;
      if (refsConsumidas.includes(ref)) return { ok: true, criado: false, pontos: mockPontosLance }; // idempotente por ref
      if (mockPontosLance < valor) return { ok: false, code: "PONTOS_LANCE_INSUFICIENTES", pontos: mockPontosLance };
      mockPontosLance -= valor; refsConsumidas.push(ref);
      return { ok: true, criado: true, pontos: mockPontosLance };
    },
    // UTAC110f — a missão do lance importa `creditarPontosLance` (via `_lib/fontes-lance.mjs`).
    creditarPontosLance: async () => ({ ok: true, criado: true, pontos: 10 }),
    lerLedgerLance: async () => ({ creditos: 0, pontos: 0, historico: [] }),
    reverterMovimentoLance: async (e, ref) => {
      chamadasReversao += 1;
      if (refsConsumidas.includes(ref)) { mockPontosLance += ultimoValorConsumido; refsConsumidas.splice(refsConsumidas.indexOf(ref), 1); }
      return { ok: true, revertido: true };
    },
  },
});
mock.module("../_lib/cors.mjs", {
  namedExports: {
    respostaPreflight: () => null,
    CABECALHOS_CORS: { "access-control-allow-origin": "*" }, cabecalhosCors: () => ({ "access-control-allow-origin": "*" }) /* UTAC153 */,
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
  mockCreditos = 0; mockPontosLance = 300; ultimoValorConsumido = 0;
  chamadasConsumoCredito = 0; chamadasReversao = 0; refsConsumidas = []; falharCompromete = false;
  falharSetJSON = false;
  falharTrava = false; mockPassesRelampago = 3; chamadasConsumoPasse = 0; chamadasDevolucaoPasse = 0;
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

// ── UTAC147 (decisão do operador, 2026-11-21 — modelo de Passes diretos): 1 Passe Relâmpago = 1 lance ─────────────
// Antes (UTAC110n) o relâmpago gastava PONTOS DE LANCE pelo valor do lance; esses testes foram reescritos para a regra
// nova. A invariante mantém-se: há um custo cobrado ANTES do registo, devolvido se o lance não existir, e nunca senha.
test("RELAMPAGO: gasta 1 Passe Relâmpago (qualquer valor), NAO gasta pontos, NAO debita R$ e NAO consome senha", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  const resp = await handler(fakeReq(bodyLance("R-1", 37)));
  assert.equal(resp.status, 201);
  const data = await resp.json();
  assert.equal(data.modo, "relampago");
  assert.equal(data.senhaConsumida, false);
  assert.equal(chamadasDebitoRs, 0, "relampago NAO debita saldo R$ (flag desligada)");
  assert.equal(chamadasConsumoPasse, 1, "1 Passe por lance");
  assert.equal(mockPassesRelampago, 2, "3 - 1");
  assert.equal(chamadasConsumoCredito, 0, "o lance já NÃO gasta pontos de lance");
  assert.equal(mockPontosLance, 300, "os pontos ficam intactos");
  assert.equal(data.passeConsumido, true);
  assert.equal(data.passesRelampagoRestantes, 2);
  assert.equal(data.pontosLanceConsumidos, null);
  assert.equal(data.missaoLance, null, "a missão saiu");
  assert.equal(chamadasCompromete, 1);
});

test("RELAMPAGO sem Passe: 400 sem_passes_disponiveis, sem blindagem nem gravacao, nada gasto", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  mockPassesRelampago = 0;
  const resp = await handler(fakeReq(bodyLance("R-1", 50)));
  assert.equal(resp.status, 400);
  const data = await resp.json();
  assert.equal(data.error.code, "sem_passes_disponiveis");
  assert.match(data.error.message, /Passe Relâmpago/);
  assert.equal(chamadasCompromete, 0);
  assert.equal(chamadasAddLance, 0);
  assert.equal(chamadasDebitoRs, 0, "a falta de Passe NAO cai para o debito R$");
  assert.equal(mockPassesRelampago, 0, "o inventário nunca fica negativo");
  assert.equal(chamadasConsumoCredito, 0, "a falta de Passe NAO cai para os pontos");
});

test("UTAC147: a blindagem falha -> 502 e o Passe VOLTA", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  falharCompromete = true;
  const resp = await handler(fakeReq(bodyLance("R-1", 50)));
  assert.equal(resp.status, 502);
  assert.equal(chamadasConsumoPasse, 1);
  assert.equal(chamadasDevolucaoPasse, 1, "o Passe tem de ser devolvido");
  assert.equal(mockPassesRelampago, 3, "inventário de volta ao valor inicial");
});

test("UTAC147: 2 lances sem chave gastam 2 Passes", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  assert.equal((await handler(fakeReq(bodyLance("R-1", 50)))).status, 201);
  assert.equal((await handler(fakeReq(bodyLance("R-1", 51)))).status, 201);
  assert.equal(mockPassesRelampago, 1, "3 - 1 - 1");
});

test("UTAC147 (concorrência, T4): 10 pedidos SIMULTÂNEOS com a MESMA idempotencyKey -> 1 lance, 1 Passe, os outros 409", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  const rs = await Promise.all(Array.from({ length: 10 },
    () => handler(fakeReq({ ...bodyLance("R-1", 50), idempotencyKey: "chave-paralela" }))));
  const st = rs.map((r) => r.status);
  assert.equal(st.filter((x) => x === 201).length, 1, st.join(","));
  assert.ok(st.every((x) => x === 201 || x === 409 || x === 200), st.join(","));
  assert.equal(chamadasConsumoPasse, 1, "um só Passe gasto");
  assert.equal(mockPassesRelampago, 2);
  assert.equal(chamadasAddLance, 1, "um só lance gravado");
});

test("UTAC147: mesma idempotencyKey ja reservada por outro pedido -> 409, sem gastar Passe nem gravar", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  mem.set("trava:chave-x", "{}"); // o outro pedido concorrente já reservou esta chave
  const resp = await handler(fakeReq({ ...bodyLance("R-1", 50), idempotencyKey: "chave-x" }));
  assert.equal(resp.status, 409);
  assert.equal((await resp.json()).error.code, "lance_em_processamento");
  assert.equal(chamadasConsumoPasse, 0);
  assert.equal(chamadasAddLance, 0);
  assert.equal(chamadasDevolucaoPasse, 0, "nunca devolve o Passe do outro pedido");
});

test("UTAC147: a trava não se confirma (Blob 5xx, etag vazio) -> 503 fail-closed, nada gasto", async () => {
  zerar();
  mockEdicao = { id: "R-1", tipo: "relampago" };
  falharTrava = true;
  const resp = await handler(fakeReq({ ...bodyLance("R-1", 50), idempotencyKey: "chave-y" }));
  assert.equal(resp.status, 503);
  assert.equal(chamadasConsumoPasse, 0);
  assert.equal(chamadasAddLance, 0);
});

test("edicao sem metadata (R-1 sintetica): tratada como relampago (gasta 1 Passe)", async () => {
  zerar();
  mockEdicao = null; // sem metadata persistida
  const resp = await handler(fakeReq(bodyLance("R-1", 10)));
  assert.equal(resp.status, 201);
  const data = await resp.json();
  assert.equal(data.modo, "relampago");
  assert.equal(chamadasConsumoPasse, 1);
  assert.equal(chamadasDebitoRs, 0);
});

test("LEGADO (fora de mainnet): persistencia falha -> 502, o Passe VOLTA e a trava sai (o retry com a mesma chave passa)", async () => {
  zerar();
  const anterior = process.env.NETWORK_STAGE;
  process.env.NETWORK_STAGE = "sepolia";
  try {
    mockEdicao = { id: "R-1", tipo: "relampago" };
    falharSetJSON = true;
    const resp = await handler(fakeReq({ ...bodyLance("R-1", 40), idempotencyKey: "chave-retry" }));
    assert.equal(resp.status, 502, "o lance nao foi registado: nao pode dizer ok");
    assert.equal((await resp.json()).error.code, "persistencia_falhou");
    assert.equal(chamadasConsumoPasse, 1, "chegou a consumir");
    assert.equal(chamadasDevolucaoPasse, 1, "e devolveu");
    assert.equal(mockPassesRelampago, 3, "inventário de volta ao valor inicial (nada cobrado)");
    assert.equal(mem.has("trava:chave-retry"), false, "a trava foi libertada");
    falharSetJSON = false;
    const r2 = await handler(fakeReq({ ...bodyLance("R-1", 40), idempotencyKey: "chave-retry" }));
    assert.equal(r2.status, 201, "o retry com a mesma chave regista o lance");
    assert.equal(mockPassesRelampago, 2);
  } finally {
    process.env.NETWORK_STAGE = anterior;
  }
});

test("LEGADO (fora de mainnet): com o Blob a funcionar, grava e responde 201", async () => {
  zerar();
  const anterior = process.env.NETWORK_STAGE;
  process.env.NETWORK_STAGE = "sepolia";
  try {
    mockEdicao = { id: "R-1", tipo: "relampago" };
    const resp = await handler(fakeReq(bodyLance("R-1", 40)));
    assert.equal(resp.status, 201);
    assert.equal(chamadasDevolucaoPasse, 0, "nao devolve o que foi gravado");
    assert.equal(mockPassesRelampago, 2, "3 - 1");
  } finally {
    process.env.NETWORK_STAGE = anterior;
  }
});
