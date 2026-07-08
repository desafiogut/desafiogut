// MC59.1 — Opção B: local-key é backend LEGÍTIMO em mainnet (coord = EOA, MC56).
// Executar: node --test --experimental-test-module-mocks mc591-signer-localkey-mainnet.test.mjs
//
// Resolve o bloqueador B-1 (MC59): permitir COORDENACAO_PRIVATE_KEY em mainnet
// SOMENTE quando SIGNER_BACKEND=local-key é escolhido EXPLICITAMENTE. O default
// mainnet (biconomy) e a rejeição da chave "acidental" permanecem intactos.
//
// Chave de TESTE descartável (conta #0 do Hardhat) — NUNCA é uma chave real.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const TEST_PK   = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // derivado de TEST_PK

const ENV_KEYS = [
  "NETWORK_STAGE", "SIGNER_BACKEND", "COORDENACAO_PRIVATE_KEY", "COORDENACAO_PRIVATE",
  "KMS_PROVIDER", "KMS_KEY_ID", "BICONOMY_BUNDLER_URL",
];
let _snap;
beforeEach(() => { _snap = {}; for (const k of ENV_KEYS) { _snap[k] = process.env[k]; delete process.env[k]; } });
afterEach(() => { for (const k of ENV_KEYS) { if (_snap[k] === undefined) delete process.env[k]; else process.env[k] = _snap[k]; } });

const signer = await import("../_lib/signer.mjs");

// ── NOVO COMPORTAMENTO (RED → GREEN) ────────────────────────────────────────

test("MC59.1: mainnet + SIGNER_BACKEND=local-key + chave → NÃO lança (opt-in explícito)", () => {
  process.env.NETWORK_STAGE = "mainnet";
  process.env.SIGNER_BACKEND = "local-key";
  process.env.COORDENACAO_PRIVATE_KEY = TEST_PK;
  assert.equal(signer.backendAssinatura(), "local-key");
  assert.doesNotThrow(() => signer.assertChaveBrutaAusenteEmMainnet());
});

test("MC59.1: mainnet + local-key explícito → obterSignerCoordenacao assina com o EOA correto", async () => {
  process.env.NETWORK_STAGE = "mainnet";
  process.env.SIGNER_BACKEND = "local-key";
  process.env.COORDENACAO_PRIVATE_KEY = TEST_PK;
  const { signer: s, address, backend } = await signer.obterSignerCoordenacao("http://localhost:8545");
  assert.equal(backend, "local-key");
  assert.equal(address.toLowerCase(), TEST_ADDR);
  assert.equal(typeof s.signTypedData, "function");
});

// ── REGRESSÃO DE SEGURANÇA (deve permanecer GREEN) ──────────────────────────

test("MC59.1(reg): mainnet + chave SEM SIGNER_BACKEND (default biconomy) → CONTINUA bloqueado", () => {
  process.env.NETWORK_STAGE = "mainnet";
  process.env.COORDENACAO_PRIVATE_KEY = TEST_PK; // reintrodução acidental, sem opt-in
  assert.equal(signer.backendAssinatura(), "biconomy");
  assert.throws(() => signer.assertChaveBrutaAusenteEmMainnet(), /chave bruta deve/i);
});

test("MC59.1(reg): mainnet + SIGNER_BACKEND=biconomy + chave → CONTINUA bloqueado", () => {
  process.env.NETWORK_STAGE = "mainnet";
  process.env.SIGNER_BACKEND = "biconomy";
  process.env.KMS_PROVIDER = "aws";
  process.env.KMS_KEY_ID = "arn:aws:kms:us-east-1:0:key/abc";
  process.env.BICONOMY_BUNDLER_URL = "https://bundler.test/api/v3/11155111/key";
  process.env.COORDENACAO_PRIVATE_KEY = TEST_PK;
  assert.throws(() => signer.assertChaveBrutaAusenteEmMainnet(), /chave bruta deve/i);
});

test("MC59.1(reg): mainnet + local-key explícito SEM chave → erro claro de chave ausente", async () => {
  process.env.NETWORK_STAGE = "mainnet";
  process.env.SIGNER_BACKEND = "local-key";
  await assert.rejects(
    () => signer.obterSignerCoordenacao("http://localhost:8545"),
    /COORDENACAO_PRIVATE_KEY não configurado/,
  );
});
