// UTAC129 (Frente B, R18-129-1) — bónus de boas-vindas: +50 pontos de lance UMA vez por conta, creditado no
// login (`auth-user.mjs`), idempotente e sem nunca bloquear a entrada.
//
// REAIS: `auth-user.mjs`, `_lib/fontes-lance.mjs`, `_lib/ledger-lance.mjs` (CAS + idempotência por ref),
// `_lib/jwt.mjs` (token assinado), `ethers.verifyMessage` (assinatura EIP-191 real de uma carteira de teste).
// Duplos só nas fronteiras de I/O: tabela `pontos` (`_pontos-duplo-110f.mjs`, CAS real), rate limit,
// contador de falhas JWT, presença e anti-Sybil.
//
// node --test --experimental-test-module-mocks _tests/utac129-boas-vindas.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { criarTabelaPontos } from "./_pontos-duplo-110f.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac129-boas-vindas-comprimento-suficiente-ok";

let T = criarTabelaPontos();
let falharDb = false;
let pendurarDb = false;
// Cliente que nunca responde (Supabase pendurado): todo o método devolve-se a si próprio e o await nunca resolve.
const pendurado = new Proxy({}, { get: (_o, k) => (k === "then" ? () => {} : () => pendurado) });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => {
    if (falharDb) throw new Error("db em baixo");
    if (pendurarDb) return { from: () => pendurado };
    return { from: () => T.from() };
  },
  getSupabaseReadOnly: () => ({ from: () => T.from() }), supabaseConfigurado: () => true } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });
mock.module("../_lib/atividade-utilizadores.mjs", { namedExports: { registarAtividade: async () => {} } });
mock.module("../_lib/sybil-check.mjs", { namedExports: { registerAndCheck: async () => {} } });

const { default: hAuth } = await import("../auth-user.mjs");
const F = await import("../_lib/fontes-lance.mjs");

beforeEach(() => { T = criarTabelaPontos(); falharDb = false; pendurarDb = false; });

const carteira = Wallet.createRandom();
const END = carteira.address.toLowerCase();
const pontos = (e) => T.linha(e)?.pontos_lance ?? 0;
const entradas = (e) => (T.linha(e)?.historico_lance ?? []).filter((h) => h.motivo === "boas-vindas");

async function login(w = carteira) {
  const endereco = w.address.toLowerCase();
  const message = `DESAFIOGUT-AUTH:${Date.now()}:${endereco}`;
  const signature = await w.signMessage(message);
  const req = new Request("http://localhost/.netlify/functions/auth-user", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ endereco, signature, message }),
  });
  const r = await hAuth(req);
  return { status: r.status, corpo: await r.json() };
}

test("B0 a constante é a da decisão do operador (literal, não a própria constante)", () => {
  assert.equal(F.PONTOS_BOAS_VINDAS, 50);
});

test("B1 (positivo) 1.º login de uma conta nova → 200 com token E +50 pontos de lance, motivo boas-vindas", async () => {
  const r = await login();
  assert.equal(r.status, 200);
  assert.ok(typeof r.corpo.token === "string" && r.corpo.token.length > 20);
  assert.equal(pontos(END), 50);
  assert.equal(entradas(END).length, 1);
  assert.equal(entradas(END)[0].ref, "boas-vindas");
  assert.equal(entradas(END)[0].delta, 50);
});

test("B2 (idempotência) relogar 3× → continua 50, uma só entrada", async () => {
  await login(); await login(); await login();
  assert.equal(pontos(END), 50);
  assert.equal(entradas(END).length, 1);
});

test("B3 (concorrência) 10 logins em paralelo → uma só entrada de +50", async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () => login()));
  assert.ok(rs.every((r) => r.status === 200), "algum login falhou");
  assert.equal(entradas(END).length, 1);
  assert.equal(pontos(END), 50);
});

test("B4 (soma, não substitui) conta que já tinha pontos recebe +50 por cima, uma vez", async () => {
  await F.creditarLoginDiario(END);       // +5
  await login();
  assert.equal(pontos(END), 55);
  await login();
  assert.equal(pontos(END), 55);
});

test("B5 (negativo) assinatura de OUTRA carteira → 401 e nenhum bónus", async () => {
  const outra = Wallet.createRandom();
  const message = `DESAFIOGUT-AUTH:${Date.now()}:${END}`;
  const signature = await outra.signMessage(message);
  const r = await hAuth(new Request("http://localhost/x", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ endereco: END, signature, message }) }));
  assert.equal(r.status, 401);
  assert.equal(pontos(END), 0);
});

test("B6 (fail-soft) com a base de dados em baixo o LOGIN continua 200 — o bónus fica para o próximo login", async () => {
  falharDb = true;
  const r = await login();
  assert.equal(r.status, 200);
  falharDb = false;
  assert.equal(pontos(END), 0);
  await login();
  assert.equal(pontos(END), 50);
});

test("B7 (achado ℹ️1 do SEG4) Supabase PENDURADO → o login responde 200 dentro do teto (não fica à espera)", async () => {
  pendurarDb = true;
  const t0 = Date.now();
  const r = await login();
  const ms = Date.now() - t0;
  assert.equal(r.status, 200);
  assert.ok(ms < 3000, `o login demorou ${ms} ms com o Supabase pendurado`);
});
