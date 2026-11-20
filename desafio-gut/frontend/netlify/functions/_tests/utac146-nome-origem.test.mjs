// UTAC146 (Frente A, ℹ️5 do SEG4 do UTAC142) — o nome do lance tem de vir de uma origem VERIFICADA, nunca do body.
// Política do operador (R18-146-B): o nome do body é IGNORADO. O lance passa e grava o nome verificado (claim `nome` do
// token lance-auth, posto pelo auth-lance depois de verificar o identity token do Privy), ou nenhum.
//
// Parte 1: o handler REAL do lance (o token chega pelo duplo de verificarLanceAuth, como em todos os testes do lance).
// Parte 2: a lib REAL de verificação do identity token, com chaves ES256 geradas aqui (assinatura, iss, aud, exp, carteira).
// Parte 3: o auth-lance REAL emite o claim `nome` só com identidade verificada (JWT real, JWT_SECRET de teste).
// node --test --experimental-test-module-mocks _tests/utac146-nome-origem.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, jwtVerify } from "jose";
import { Wallet } from "ethers";

process.env.JWT_SECRET = "segredo-de-teste-utac146-nome-origem-comprimento-suficiente-xx";
const ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
const ESP = "ESPECIAL-RELAMPAGO1";

let payloadToken = { endereco: ADDR, tipo: "lance-auth" };
let tokenInvalido = false;
let registos = [];      // o que foi para o ranking ao vivo
let identidadeDuplo = null; // o que o duplo de privy-identidade devolve ao auth-lance

const mem = new Map();
const fakeStore = {
  async setJSON(k, o) { mem.set(k, JSON.stringify(o)); }, async get(k, { type } = {}) { const v = mem.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
  async list() { return { blobs: [] }; }, async delete(k) { mem.delete(k); },
};
mock.module("@netlify/blobs", { namedExports: { getStore: () => fakeStore } });
const JWT_REAL = await import("../_lib/jwt.mjs");
mock.module("../_lib/jwt.mjs", { namedExports: {
  ...JWT_REAL,
  verificarLanceAuth: async () => { if (tokenInvalido) { const e = new Error("assinatura inválida"); e.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED"; throw e; } return payloadToken; },
} });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });
mock.module("../_lib/rbac.mjs", { namedExports: { getRole: async () => ({ role: "user" }) } });
mock.module("../_lib/require-mfa.mjs", { namedExports: { requireMfa: () => null } });
mock.module("../_lib/system-state.mjs", { namedExports: { lerEstadoSistema: async () => ({}), sistemaPausado: () => false } });
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { registrarEventosDeLance: async () => {} } });
mock.module("../_lib/data-store.mjs", { namedExports: { addLance: async (e, r) => `key-${e}-${r.lanceId}` } });
mock.module("../_lib/ranking-especial.mjs", { namedExports: { registarNoRankingEspecial: async (a) => { registos.push(a); return { ok: true, posicao: registos.length }; } } });
mock.module("../_lib/passe-a-cada-lances.mjs", { namedExports: { contarLanceEConsumirPasse: async () => ({ ok: true, lances: 1, passeConsumido: false }) } });
mock.module("../_lib/contract.mjs", { namedExports: { comprometerLanceOnchain: async () => ({}), lerSaldoSenhas: async () => 5 } });
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => ({
  id: ESP, tipo: "relampago", status: "ativo",
  inicio_em: new Date(Date.now() - 3600e3).toISOString(), termino_em: new Date(Date.now() + 3600e3).toISOString(),
}) } });
mock.module("../_lib/saldoRs.mjs", { namedExports: { debitarSaldoRs: async () => ({ ok: true, resultado: {} }) } });
mock.module("../_lib/fontes-lance.mjs", { namedExports: { creditarMissaoLance: async () => ({ ok: true, creditado: false }), PONTOS_MISSAO_LANCE: 10 } });
mock.module("../_lib/ledger-lance.mjs", { namedExports: {
  consumirPontosLance: async () => ({ ok: true, criado: true, pontos: 99 }), reverterMovimentoLance: async () => ({ ok: true }),
  creditarPontosLance: async () => ({ ok: true }), lerLedgerLance: async () => ({ pontos: 99 }), PONTOS_LANCE_BONUS_PASSE_RELAMPAGO: 100,
} });
mock.module("../_lib/cors.mjs", { namedExports: { respostaPreflight: () => null, CABECALHOS_CORS: { "access-control-allow-origin": "*" } } });
const PRIVY_REAL = await import("../_lib/privy-identidade.mjs").catch(() => ({}));
mock.module("../_lib/privy-identidade.mjs", { namedExports: {
  ...PRIVY_REAL,
  verificarIdentidadePrivy: async () => identidadeDuplo,
} });

let hLance, hAuth;
before(async () => {
  process.env.NETWORK_STAGE = "mainnet";
  hLance = (await import("../lance-relampago.mjs")).default;
  hAuth = (await import("../auth-lance.mjs")).default;
});
beforeEach(() => { payloadToken = { endereco: ADDR, tipo: "lance-auth" }; tokenInvalido = false; registos = []; mem.clear(); identidadeDuplo = null; });

async function lance(nomeBody) {
  const r = await hLance({
    method: "POST", headers: { get: (h) => (h === "authorization" ? "Bearer t" : null) },
    text: async () => JSON.stringify({ endereco: ADDR, valorCentavos: 3, edicaoId: ESP, ...(nomeBody !== undefined ? { nomeExibicao: nomeBody } : {}) }),
    url: "http://localhost/.netlify/functions/lance-relampago",
  });
  return { status: r.status, corpo: await r.json() };
}

// ── Parte 1 — o lance ─────────────────────────────────────────────────────────────────────────────
test("N1 · token verificado com nome «Ana Souza» e body «Ana S.» → grava «Ana S.» (vem do token)", async () => {
  payloadToken = { ...payloadToken, nome: "Ana Souza" };
  const r = await lance("Ana S.");
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(registos[0].nomeExibicao, "Ana S.");
  assert.equal(r.corpo.nomeExibicao, "Ana S.");
});

test("N2 · FORJA: token com «Ana Souza», body «Fake Name» → o body é IGNORADO, grava «Ana S.»", async () => {
  payloadToken = { ...payloadToken, nome: "Ana Souza" };
  const r = await lance("Fake Name");
  assert.equal(r.status, 201);
  assert.equal(registos[0].nomeExibicao, "Ana S.", "o nome forjado no body foi gravado");
  assert.equal(JSON.stringify(r.corpo).includes("Fake"), false);
});

test("N3 · FORJA sem nome verificado: token sem `nome`, body «GUTO Oficial» → lance passa SEM nome (endereço curto)", async () => {
  const r = await lance("GUTO Oficial");
  assert.equal(r.status, 201);
  assert.equal(registos[0].nomeExibicao, null, "um nome não verificado chegou ao ranking");
  assert.equal(r.corpo.nomeExibicao, null);
});

test("N4 · token INVÁLIDO (assinatura errada) com nome no body → 401 e nada gravado", async () => {
  tokenInvalido = true;
  const r = await lance("Fake");
  assert.equal(r.status, 401);
  assert.equal(registos.length, 0);
});

// ── Parte 2 — a verificação do identity token (lib real, chaves geradas aqui) ─────────────────────
const APP = "app-teste-utac146";
let chaves, outras, jwks;
before(async () => {
  chaves = await generateKeyPair("ES256"); outras = await generateKeyPair("ES256");
  const pub = await exportJWK(chaves.publicKey); pub.kid = "k1"; pub.alg = "ES256";
  jwks = createLocalJWKSet({ keys: [pub] });
});
const contas = (extra = []) => JSON.stringify([{ type: "wallet", address: ADDR, chain_type: "ethereum", wallet_client_type: "privy" }, ...extra]);
async function idToken({ linked = contas([{ type: "google_oauth", subject: "g1", email: "ana@gmail.com", name: "Ana Souza" }]), iss = "privy.io", aud = APP, exp = "1h", chave = chaves.privateKey } = {}) {
  return new SignJWT({ linked_accounts: linked }).setProtectedHeader({ alg: "ES256", kid: "k1" })
    .setIssuer(iss).setAudience(aud).setSubject("did:privy:abc").setIssuedAt().setExpirationTime(exp).sign(chave);
}

test("P1 · identity token válido: devolve o nome Google da carteira certa", async () => {
  const r = await PRIVY_REAL.verificarIdentidadePrivy(await idToken(), ADDR, { jwks, appId: APP });
  assert.deepEqual(r, { nome: "Ana Souza" });
});

test("P2 · recusa: assinatura de outra chave · iss errado · aud errado · expirado · carteira diferente · lixo", async () => {
  const v = (t, e = ADDR) => PRIVY_REAL.verificarIdentidadePrivy(t, e, { jwks, appId: APP });
  assert.equal(await v(await idToken({ chave: outras.privateKey })), null, "aceitou assinatura de outra chave");
  assert.equal(await v(await idToken({ iss: "evil.io" })), null, "aceitou iss errado");
  assert.equal(await v(await idToken({ aud: "outra-app" })), null, "aceitou aud errado");
  assert.equal(await v(await idToken({ exp: Math.floor(Date.now() / 1000) - 60 })), null, "aceitou token expirado");
  assert.equal(await v(await idToken(), "0x" + "1".repeat(40)), null, "aceitou o token de OUTRA carteira");
  assert.equal(await v("nao-e-um-jwt"), null);
  assert.equal(await v(null), null);
});

test("P3 · sem conta Google (só e-mail) ou Google sem nome → { nome: null } (verificado, mas sem nome)", async () => {
  const soEmail = await idToken({ linked: contas([{ type: "email", address: "ana@x.com" }]) });
  assert.deepEqual(await PRIVY_REAL.verificarIdentidadePrivy(soEmail, ADDR, { jwks, appId: APP }), { nome: null });
  const semNome = await idToken({ linked: contas([{ type: "google_oauth", subject: "g1", email: "a@gmail.com", name: null }]) });
  assert.deepEqual(await PRIVY_REAL.verificarIdentidadePrivy(semNome, ADDR, { jwks, appId: APP }), { nome: null });
});

test("P4 · aceita as duas grafias dos campos (snake e camel) e endereço em maiúsculas (EIP-55)", async () => {
  const camel = await idToken({ linked: JSON.stringify([{ type: "wallet", address: ADDR.toUpperCase().replace("0X", "0x"), chainType: "ethereum" }, { type: "google_oauth", name: "João Pedro" }]) });
  assert.deepEqual(await PRIVY_REAL.verificarIdentidadePrivy(camel, ADDR, { jwks, appId: APP }), { nome: "João Pedro" });
});

// ── Parte 3 — o auth-lance põe o claim `nome` SÓ com identidade verificada ───────────────────────
async function authLance(extraBody = {}) {
  const w = Wallet.createRandom();
  const message = `DESAFIOGUT-AUTH:${Date.now()}:${w.address.toLowerCase()}`;
  const signature = await w.signMessage(message);
  const r = await hAuth(new Request("https://x/.netlify/functions/auth-lance", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ endereco: w.address.toLowerCase(), signature, message, ...extraBody }),
  }));
  const corpo = await r.json();
  const claims = corpo.token ? (await jwtVerify(corpo.token, new TextEncoder().encode(process.env.JWT_SECRET))).payload : null;
  return { status: r.status, claims };
}

test("A1 · auth-lance com identidade verificada → token lance-auth leva `nome` (o completo; o lance reduz)", async () => {
  identidadeDuplo = { nome: "Ana Souza" };
  const r = await authLance({ identityToken: "tok" });
  assert.equal(r.status, 200);
  assert.equal(r.claims.tipo, "lance-auth");
  assert.equal(r.claims.nome, "Ana Souza");
});

test("A2 · auth-lance SEM identidade verificada (token ausente, inválido ou de outra carteira) → token sem `nome`; o body não conta", async () => {
  identidadeDuplo = null;
  const r = await authLance({ identityToken: "forjado", nomeExibicao: "Fake Name", nome: "Fake Name" });
  assert.equal(r.status, 200, "o login por carteira não pode depender do identity token");
  assert.equal("nome" in r.claims, false, "o token levou um nome não verificado");
});
