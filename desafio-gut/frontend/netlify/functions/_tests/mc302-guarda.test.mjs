// MC30.2.1 — Guarda de segurança do backend Biconomy + KMS (ITEM 5.3 / SEG 4).
// Executar: node --test --experimental-test-module-mocks mc302-guarda.test.mjs
//
// A guarda assertChaveBrutaAusenteEmMainnet é SÍNCRONA e dispara ANTES de tocar
// em qualquer SDK (KMS/Biconomy) ou rede → estes testes não precisam de mocks.
// Confirma que, com SIGNER_BACKEND=biconomy, a chave privada BRUTA é rejeitada e
// que a configuração mínima do owner KMS + Bundler é exigida (R9/R12).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const ENV_KEYS = [
  "NETWORK_STAGE", "SIGNER_BACKEND", "COORDENACAO_PRIVATE_KEY", "COORDENACAO_PRIVATE",
  "KMS_PROVIDER", "KMS_KEY_ID", "AWS_REGION", "BICONOMY_BUNDLER_URL",
  "BICONOMY_PAYMASTER_URL", "BICONOMY_API_KEY",
];
let _snap;
beforeEach(() => { _snap = {}; for (const k of ENV_KEYS) { _snap[k] = process.env[k]; delete process.env[k]; } });
afterEach(() => { for (const k of ENV_KEYS) { if (_snap[k] === undefined) delete process.env[k]; else process.env[k] = _snap[k]; } });

const signer = await import("../_lib/signer.mjs");

// Configuração biconomy VÁLIDA (sem chave bruta) — base para mutações.
function configValida() {
  process.env.SIGNER_BACKEND = "biconomy";
  process.env.KMS_PROVIDER = "aws";
  process.env.KMS_KEY_ID = "arn:aws:kms:us-east-1:0:key/abc";
  process.env.BICONOMY_BUNDLER_URL = "https://bundler.test/api/v3/11155111/key";
}

test("ITEM 5.3: biconomy + chave bruta presente → REJEITA (não usa a chave)", async () => {
  configValida();
  process.env.COORDENACAO_PRIVATE_KEY = "0xchave-bruta-acidental";
  assert.throws(() => signer.assertChaveBrutaAusenteEmMainnet(), /chave bruta deve/i);
  await assert.rejects(() => signer.obterSignerCoordenacao("http://localhost:8545"), /chave bruta deve/i);
});

test("ITEM 5.3: biconomy sem KMS_KEY_ID → REJEITA", async () => {
  configValida();
  delete process.env.KMS_KEY_ID;
  assert.throws(() => signer.assertChaveBrutaAusenteEmMainnet(), /KMS_KEY_ID/);
});

test("ITEM 5.3: biconomy sem BICONOMY_BUNDLER_URL → REJEITA", async () => {
  configValida();
  delete process.env.BICONOMY_BUNDLER_URL;
  assert.throws(() => signer.assertChaveBrutaAusenteEmMainnet(), /BICONOMY_BUNDLER_URL/);
});

test("ITEM 5.3: biconomy com KMS_PROVIDER desconhecido → REJEITA", async () => {
  configValida();
  process.env.KMS_PROVIDER = "hashicorp";
  assert.throws(() => signer.assertChaveBrutaAusenteEmMainnet(), /KMS_PROVIDER/);
});

test("ITEM 5.3: biconomy bem configurado (sem chave bruta) → NÃO lança", () => {
  configValida();
  assert.doesNotThrow(() => signer.assertChaveBrutaAusenteEmMainnet());
  assert.equal(signer.backendAssinatura(), "biconomy");
  assert.equal(signer.resolverChaveCoordenacao(), null);
});
