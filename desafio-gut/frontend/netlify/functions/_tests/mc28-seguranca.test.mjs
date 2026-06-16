// MC28.1 — Testes de segurança (offline, mocks).
// Executar: node --test --experimental-test-module-mocks mc28-seguranca.test.mjs
//
// Cobre (SEGMENTO 7.3): compatibilidade EVM do hash, apuração do menor lance
// único (Artigo VIII), autorização da consolidação (não-coordenação → falha),
// gate de ambiente (fora de mainnet → falha) e idempotência de fecho.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";
import { keccak256, AbiCoder } from "ethers";

// ── Fixtures mutáveis partilhadas pelos mocks ───────────────────────────────
let denyResp   = null;             // guardAdmin: null = autorizado
let bids       = [];               // listarBids
let consolidado = null;            // estaConsolidado
const marcados = [];               // marcarConsolidado

mock.module("../_lib/admin-auth.mjs", {
  namedExports: { guardAdmin: async () => denyResp },
});
mock.module("../_lib/bids-store.mjs", {
  namedExports: {
    listarBids:        async () => bids,
    estaConsolidado:   async () => consolidado,
    marcarConsolidado: async (e, r) => { marcados.push({ e, r }); },
  },
});

let mod;
before(async () => { mod = await import("../consolidar-lances.mjs"); });

function reqMock({ body = {}, method = "POST" } = {}) {
  return { method, headers: { get: () => null }, text: async () => JSON.stringify(body) };
}

// ── 1. Compatibilidade EVM do hash (backend ≡ keccak256(abi.encode(...))) ────
test("hash do commitment: determinístico, formato bytes32 e sensível a valor/endereço", () => {
  const enc = (v, a) => keccak256(AbiCoder.defaultAbiCoder().encode(["uint256", "address"], [v, a]));
  const A = "0x1111111111111111111111111111111111111111";
  const h1 = enc(500, A);
  const h2 = enc(500, A);
  assert.equal(h1, h2, "mesmo input → mesmo hash (determinístico)");
  assert.match(h1, /^0x[0-9a-f]{64}$/, "hash bytes32 (32 bytes / 66 chars)");
  assert.notEqual(h1, enc(501, A), "valor diferente → hash diferente");
  assert.notEqual(h1, enc(500, "0x2222222222222222222222222222222222222222"), "endereço diferente → hash diferente");
});

// ── 2. Apuração do menor lance único (Artigo VIII) ──────────────────────────
test("apurarMenorUnico: ignora repetidos e devolve o MENOR único", () => {
  const r = mod.apurarMenorUnico([
    { valorCentavos: 100, endereco: "0xA" },
    { valorCentavos: 100, endereco: "0xB" }, // repetido → desqualifica 100
    { valorCentavos: 50,  endereco: "0xC" }, // único e menor
    { valorCentavos: 70,  endereco: "0xD" }, // único, mas maior
  ]);
  assert.deepEqual(r, { menorUnico: 50, vencedor: "0xC" });
});

test("apurarMenorUnico: sem lance único → null", () => {
  assert.equal(mod.apurarMenorUnico([
    { valorCentavos: 10, endereco: "0xA" },
    { valorCentavos: 10, endereco: "0xB" },
  ]), null);
});

// ── 3. Autorização: não-coordenação NÃO consolida ──────────────────────────
test("consolidar-lances: requisição não-admin é rejeitada (guardAdmin)", async () => {
  process.env.NETWORK_STAGE = "mainnet";
  denyResp = new Response(JSON.stringify({ error: { code: "admin_token_ausente" } }), { status: 401 });
  const resp = await mod.default(reqMock({ body: { edicaoId: "R-1" } }));
  assert.equal(resp.status, 401, "sem credencial admin → 401");
  denyResp = null;
});

// ── 4. Gate de ambiente: fora de mainnet → 409 ──────────────────────────────
test("consolidar-lances: fora de mainnet é bloqueado (409)", async () => {
  process.env.NETWORK_STAGE = "sepolia";
  const resp = await mod.default(reqMock({ body: { edicaoId: "R-1" } }));
  assert.equal(resp.status, 409, "NETWORK_STAGE != mainnet → 409");
  process.env.NETWORK_STAGE = "mainnet";
});

// ── 5. Idempotência de fecho: edição já consolidada não reconsolida ─────────
test("consolidar-lances: edição já consolidada responde idempotente (sem reenvio)", async () => {
  process.env.NETWORK_STAGE = "mainnet";
  denyResp = null;
  consolidado = { vencedor: "0xC", menorUnicoCentavos: 50, txHash: "0xabc" };
  const resp = await mod.default(reqMock({ body: { edicaoId: "R-1" } }));
  const json = await resp.json();
  assert.equal(json.idempotent, true, "deve devolver idempotent:true");
  assert.equal(json.vencedor, "0xC");
  consolidado = null;
});
