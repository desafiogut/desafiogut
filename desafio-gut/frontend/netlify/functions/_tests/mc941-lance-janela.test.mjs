// MC94.1 — o lance-relampago recusa lances fora da janela da edição.
// Executar: node --experimental-test-module-mocks --test _tests/mc941-lance-janela.test.mjs
//
// Mesma montagem do mc9112-integracao-lance.test.mjs (validate.mjs e ethers
// REAIS). A janela (_lib/edicao-janela.mjs) NÃO tem duplo: é a regra real que
// corre. Duplicá-la esconderia o defeito que ela existe para impedir.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

const TEST_ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
let mockEdicao = null;
let chamadasDebitoRs = 0;
let chamadasCompromete = 0;
let chamadasAddLance = 0;
let chamadasSaldoOnChain = 0;

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
    lerSaldoSenhas: async () => { chamadasSaldoOnChain += 1; return 5; },
  },
});
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => mockEdicao } });
mock.module("../_lib/saldoRs.mjs", {
  namedExports: {
    debitarSaldoRs: async () => {
      chamadasDebitoRs += 1;
      return { ok: true, resultado: { saldoAntesCentavos: 200, saldoDepoisCentavos: 150 } };
    },
  },
});
mock.module("../_lib/cors.mjs", {
  namedExports: { respostaPreflight: () => null, CABECALHOS_CORS: { "access-control-allow-origin": "*" } },
});

let handler, seed;
before(async () => {
  process.env.NETWORK_STAGE = "mainnet";
  handler = (await import("../lance-relampago.mjs")).default;
  seed = await import("../../../../../scripts/mc941-seed-edicao-especial.mjs");
});

function zerar() {
  mem.clear();
  mockEdicao = null;
  chamadasDebitoRs = 0;
  chamadasCompromete = 0;
  chamadasAddLance = 0;
  chamadasSaldoOnChain = 0;
}

function pedido(edicaoId, valorCentavos = 37) {
  return {
    method: "POST",
    headers: { get: (h) => (h === "authorization" ? "Bearer token-teste" : null) },
    text: async () => JSON.stringify({ endereco: TEST_ADDR, valorCentavos, edicaoId }),
    url: "http://localhost/.netlify/functions/lance-relampago",
  };
}

function nadaConsumido() {
  assert.equal(chamadasDebitoRs, 0, "não pode debitar R$");
  assert.equal(chamadasSaldoOnChain, 0, "não pode chegar ao gate de senhas");
  assert.equal(chamadasCompromete, 0, "não pode comprometer on-chain");
  assert.equal(chamadasAddLance, 0, "não pode gravar o lance");
}

const iso = (ms) => new Date(ms).toISOString();

test("ESPECIAL-AIRFRYER hoje (antes de 04/10 20:00): 409 edicao_nao_iniciada, nada consumido", async () => {
  zerar();
  assert.ok(Date.now() < Date.parse("2026-10-04T23:00:00Z"), "este teste assume correr antes da abertura");
  mockEdicao = { ...seed.EDICAO_ESPECIAL_AIRFRYER };
  const resp = await handler(pedido("ESPECIAL-AIRFRYER"));
  assert.equal(resp.status, 409);
  assert.equal((await resp.json()).error.code, "edicao_nao_iniciada");
  nadaConsumido();
});

test("especial dentro da janela: 201, paga 1 SENHA e não R$ (tipo programado)", async () => {
  zerar();
  const agora = Date.now();
  mockEdicao = { ...seed.EDICAO_ESPECIAL_AIRFRYER, inicio_em: iso(agora - 60_000), termino_em: iso(agora + 60_000) };
  const resp = await handler(pedido("ESPECIAL-AIRFRYER"));
  assert.equal(resp.status, 201);
  const data = await resp.json();
  assert.equal(data.modo, "programado");
  assert.equal(chamadasDebitoRs, 0, "a especial paga-se em senhas");
  assert.equal(chamadasSaldoOnChain, 1);
  assert.equal(chamadasCompromete, 1);
  assert.equal(chamadasAddLance, 1);
});

test("especial depois do fim: 409 edicao_encerrada, nada consumido", async () => {
  zerar();
  const agora = Date.now();
  mockEdicao = { ...seed.EDICAO_ESPECIAL_AIRFRYER, inicio_em: iso(agora - 120_000), termino_em: iso(agora - 1_000) };
  const resp = await handler(pedido("ESPECIAL-AIRFRYER"));
  assert.equal(resp.status, 409);
  assert.equal((await resp.json()).error.code, "edicao_encerrada");
  nadaConsumido();
});

test("especial sem metadata (Blob em baixo): 503 fail-closed, nunca cai em R$", async () => {
  zerar();
  mockEdicao = null;
  const resp = await handler(pedido("ESPECIAL-AIRFRYER"));
  assert.equal(resp.status, 503);
  assert.equal((await resp.json()).error.code, "edicao_indisponivel");
  nadaConsumido();
});

test("PROG/RELAMP com termino_em no passado também são recusadas", async () => {
  zerar();
  mockEdicao = { id: "RELAMP-3", tipo: "relampago", termino_em: "2026-05-31T03:52:13.827Z", status: "encerrado" };
  const resp = await handler(pedido("RELAMP-3"));
  assert.equal(resp.status, 409);
  assert.equal((await resp.json()).error.code, "edicao_encerrada");
  nadaConsumido();
});

test("controlo: R-1 sem metadata continua a passar (compat intacta)", async () => {
  zerar();
  mockEdicao = null;
  const resp = await handler(pedido("R-1"));
  assert.equal(resp.status, 201);
  assert.equal((await resp.json()).modo, "relampago");
  assert.equal(chamadasDebitoRs, 1);
});
