// MC30.1 — Testes do módulo central de assinatura (_lib/signer.mjs).
// Executar: node --test --experimental-test-module-mocks mc30-signer.test.mjs
//
// Cobre:
//   · seleção de backend por NETWORK_STAGE/SIGNER_BACKEND (ITEM 3.2/3.9);
//   · backend local-key: signer correto + cache de endereço (SEG5);
//   · MC31: backend 'defender' REMOVIDO — default mainnet passa a 'biconomy';
//   · rejeição da chave bruta em mainnet (ITEM 3.5/4.2).
//
// Chave de TESTE descartável (conta #0 do Hardhat) — NUNCA é uma chave real.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const TEST_PK   = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // derivado de TEST_PK

// Snapshot do env relevante para isolar cada teste.
const ENV_KEYS = [
  "NETWORK_STAGE", "SIGNER_BACKEND", "COORDENACAO_PRIVATE_KEY", "COORDENACAO_PRIVATE",
  "KMS_KEY_ID", "BICONOMY_BUNDLER_URL",
];
let _snap;
beforeEach(() => {
  _snap = {};
  for (const k of ENV_KEYS) { _snap[k] = process.env[k]; delete process.env[k]; }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (_snap[k] === undefined) delete process.env[k];
    else process.env[k] = _snap[k];
  }
});

// signer.mjs lê process.env em tempo de chamada → import único basta.
const signer = await import("../_lib/signer.mjs");

test("backendAssinatura: default por NETWORK_STAGE", () => {
  process.env.NETWORK_STAGE = "mainnet";
  assert.equal(signer.backendAssinatura(), "biconomy");
  process.env.NETWORK_STAGE = "sepolia";
  assert.equal(signer.backendAssinatura(), "local-key");
  delete process.env.NETWORK_STAGE;
  assert.equal(signer.backendAssinatura(), "local-key");
});

test("backendAssinatura: SIGNER_BACKEND explícito tem precedência", () => {
  process.env.NETWORK_STAGE = "mainnet";
  process.env.SIGNER_BACKEND = "local-key";
  assert.equal(signer.backendAssinatura(), "local-key");
  process.env.NETWORK_STAGE = "sepolia";
  process.env.SIGNER_BACKEND = "biconomy";
  assert.equal(signer.backendAssinatura(), "biconomy");
});

test("MC31: SIGNER_BACKEND=defender já não é reconhecido (cai no default)", () => {
  // O backend Defender foi removido — um valor 'defender' explícito é ignorado
  // e a seleção recai no default por NETWORK_STAGE (biconomy em mainnet).
  process.env.SIGNER_BACKEND = "defender";
  process.env.NETWORK_STAGE = "sepolia";
  assert.equal(signer.backendAssinatura(), "local-key");
  process.env.NETWORK_STAGE = "mainnet";
  assert.equal(signer.backendAssinatura(), "biconomy");
});

test("resolverChaveCoordenacao: canónica + fallback legado", () => {
  assert.equal(signer.resolverChaveCoordenacao(), null);
  process.env.COORDENACAO_PRIVATE = "0xlegado";
  assert.equal(signer.resolverChaveCoordenacao(), "0xlegado");
  process.env.COORDENACAO_PRIVATE_KEY = "0xcanonica";
  assert.equal(signer.resolverChaveCoordenacao(), "0xcanonica");
});

test("local-key: obterSignerCoordenacao devolve signer com o endereço esperado + cache", async () => {
  process.env.NETWORK_STAGE = "sepolia";
  process.env.COORDENACAO_PRIVATE_KEY = TEST_PK;
  const { signer: s, address, backend } = await signer.obterSignerCoordenacao("http://localhost:8545");
  assert.equal(backend, "local-key");
  assert.equal(address.toLowerCase(), TEST_ADDR);
  assert.equal(typeof s.signTypedData, "function");
  assert.equal(signer.getCoordenacaoAddressCache().toLowerCase(), TEST_ADDR);
});

test("local-key: sem chave configurada → erro claro", async () => {
  process.env.NETWORK_STAGE = "sepolia";
  await assert.rejects(
    () => signer.obterSignerCoordenacao("http://localhost:8545"),
    /COORDENACAO_PRIVATE_KEY não configurado/,
  );
});

test("ITEM 3.5/4.2: chave bruta presente em mainnet é REJEITADA (não instancia Wallet)", async () => {
  process.env.NETWORK_STAGE = "mainnet";
  process.env.COORDENACAO_PRIVATE_KEY = TEST_PK; // reintrodução acidental
  assert.throws(() => signer.assertChaveBrutaAusenteEmMainnet(), /chave bruta deve/i);
  await assert.rejects(
    () => signer.obterSignerCoordenacao("http://localhost:8545"),
    /chave bruta deve/i,
  );
});

test("mainnet/biconomy sem config: falha na configuração KMS, NUNCA na chave", async () => {
  process.env.NETWORK_STAGE = "mainnet"; // backend = biconomy, sem chave bruta
  // Sem KMS_KEY_ID/BUNDLER a guarda recusa arrancar — falha na configuração do
  // owner KMS, jamais por instanciar uma Wallet com chave bruta.
  await assert.rejects(
    () => signer.obterSignerCoordenacao("http://localhost:8545"),
    /KMS_KEY_ID não configurado/,
  );
  assert.equal(signer.resolverChaveCoordenacao(), null);
});
