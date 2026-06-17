// MC30.1 — Testes do módulo central de assinatura (_lib/signer.mjs).
// Executar: node --test --experimental-test-module-mocks mc30-signer.test.mjs
//
// Cobre:
//   · seleção de backend por NETWORK_STAGE/SIGNER_BACKEND (ITEM 3.2/3.9);
//   · backend local-key: signer correto + cache de endereço (SEG5);
//   · handshake com o Defender (mockado, ITEM 4.1) — sem expor chave privada;
//   · rejeição da chave bruta em mainnet (ITEM 3.5/4.2).
//
// Chave de TESTE descartável (conta #0 do Hardhat) — NUNCA é uma chave real.
import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const TEST_PK   = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // derivado de TEST_PK
const RELAYER_ADDR = "0xda3a83C9F3eD27c1c89d2b3bB7d1b1d1d1d1e84e";

// Snapshot do env relevante para isolar cada teste.
const ENV_KEYS = [
  "NETWORK_STAGE", "SIGNER_BACKEND", "COORDENACAO_PRIVATE_KEY", "COORDENACAO_PRIVATE",
  "DEFENDER_API_KEY", "DEFENDER_API_SECRET", "DEFENDER_RELAYER_ADDRESS",
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
  assert.equal(signer.backendAssinatura(), "defender");
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
  process.env.SIGNER_BACKEND = "defender";
  assert.equal(signer.backendAssinatura(), "defender");
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

test("mainnet/defender sem creds: falha nas credenciais, NUNCA na chave", async () => {
  process.env.NETWORK_STAGE = "mainnet"; // backend = defender, sem chave bruta
  await assert.rejects(
    () => signer.obterSignerCoordenacao("http://localhost:8545"),
    /DEFENDER_API_KEY\/DEFENDER_API_SECRET não configurados/,
  );
});

test("ITEM 4.1: handshake com o Defender (mockado) — endereço esperado, sem chave privada", async () => {
  let credenciaisRecebidas = null;
  class FakeProvider {
    constructor(creds) { credenciaisRecebidas = creds; }
  }
  class FakeSigner {
    constructor(creds, provider, address, options) {
      this.address = address; this.options = options;
    }
    async getAddress() { return this.address; }
    async signTypedData() { return "0xassinatura-de-teste"; }
  }
  mock.module("@openzeppelin/defender-sdk-relay-signer-client/lib/ethers/provider.js", {
    namedExports: { DefenderRelayProvider: FakeProvider },
  });
  mock.module("@openzeppelin/defender-sdk-relay-signer-client/lib/ethers/signer.js", {
    namedExports: { DefenderRelaySigner: FakeSigner },
  });

  process.env.NETWORK_STAGE = "mainnet";
  process.env.DEFENDER_API_KEY = "ak_teste";
  process.env.DEFENDER_API_SECRET = "as_teste";
  process.env.DEFENDER_RELAYER_ADDRESS = RELAYER_ADDR;

  const { signer: s, address, backend } = await signer.obterSignerCoordenacao("ignorado");
  assert.equal(backend, "defender");
  assert.equal(address, RELAYER_ADDR);
  assert.deepEqual(credenciaisRecebidas, { apiKey: "ak_teste", apiSecret: "as_teste" });
  // A assinatura de typed data funciona via Defender, sem qualquer chave no env.
  assert.equal(await s.signTypedData({}, {}, {}), "0xassinatura-de-teste");
  assert.equal(signer.resolverChaveCoordenacao(), null);
});
