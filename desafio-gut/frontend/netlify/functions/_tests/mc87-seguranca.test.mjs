// MC87 — regressões das correções de segurança P1/P2.
// Cobre: assinatura do webhook MP (fail-closed + anti-replay), debug-pedido
// fail-closed, coordenação env-configurável e os validadores novos.
//
// node --test --experimental-test-module-mocks _tests/mc87-seguranca.test.mjs
import { test, mock, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

mock.module("@netlify/blobs", {
  namedExports: {
    getStore: () => ({
      async get() { return null; },
      async setJSON() {},
      async list() { return { blobs: [] }; },
      async delete() {},
    }),
  },
});
mock.module("../_lib/sentry-server.mjs", {
  namedExports: { captureSecurityAlert: async () => {} },
});

let validarAssinaturaMp, JANELA_TS_SEG_PADRAO, debugPedido, resolverCoordenacao, invalidarCacheAdmins,
    getAdminAddresses, validarCPF, validarEmail, mascararEndereco, mascararEmail, ValidationError;

before(async () => {
  ({ validarAssinaturaMp, JANELA_TS_SEG_PADRAO } = await import("../_lib/mp-signature.mjs"));
  ({ default: debugPedido } = await import("../debug-pedido.mjs"));
  ({ resolverCoordenacao, invalidarCacheAdmins, getAdminAddresses } = await import("../_lib/admin-helpers.mjs"));
  ({ validarCPF, validarEmail, mascararEndereco, mascararEmail, ValidationError } =
    await import("../_lib/validate.mjs"));
});

const ENV_ORIG = { ...process.env };
beforeEach(() => {
  for (const k of ["MP_WEBHOOK_SECRET", "MP_WEBHOOK_ENFORCE", "MP_WEBHOOK_ALLOW_UNSIGNED",
                   "DEBUG_TOKEN", "COORDENACAO_ADDRESS", "MP_WEBHOOK_TS_JANELA_SEG"]) delete process.env[k];
});
afterEach(() => { process.env = { ...ENV_ORIG }; });

/** Constrói um Request com x-signature válida para o segredo dado. */
function reqAssinado({ secret, dataId, requestId = "req-1", tsMs = Date.now() }) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${tsMs};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return new Request(`http://x/?data.id=${dataId}`, {
    method: "POST",
    headers: { "x-signature": `ts=${tsMs},v1=${v1}`, "x-request-id": requestId },
  });
}

// ── P1-2: fail-closed por omissão ────────────────────────────────────────────

test("MC87 P1-2: sem MP_WEBHOOK_SECRET → REJEITA (antes era fail-open)", () => {
  const r = validarAssinaturaMp(new Request("http://x/?data.id=1", { method: "POST" }), "1");
  assert.equal(r.ok, false);
  assert.equal(r.enforced, true);
  assert.equal(r.motivo, "secret_ausente");
});

test("MC87 P1-2: MP_WEBHOOK_ALLOW_UNSIGNED=true reabre explicitamente (rollback)", () => {
  process.env.MP_WEBHOOK_ALLOW_UNSIGNED = "true";
  const r = validarAssinaturaMp(new Request("http://x/?data.id=1", { method: "POST" }), "1");
  assert.equal(r.ok, true);
  assert.equal(r.enforced, false, "fica marcado como não-aplicado para o alerta disparar");
});

test("MC87 P1-2: MP_WEBHOOK_ENFORCE=true anula a válvula de rollback", () => {
  process.env.MP_WEBHOOK_ALLOW_UNSIGNED = "true";
  process.env.MP_WEBHOOK_ENFORCE = "true";
  const r = validarAssinaturaMp(new Request("http://x/?data.id=1", { method: "POST" }), "1");
  assert.equal(r.ok, false);
});

// ── Assinatura válida continua a passar (zero regressão) ─────────────────────

test("MC87: assinatura válida e fresca → aceita", () => {
  const secret = "segredo-mp";
  process.env.MP_WEBHOOK_SECRET = secret;
  const r = validarAssinaturaMp(reqAssinado({ secret, dataId: "12345" }), "12345");
  assert.equal(r.ok, true);
  assert.equal(r.enforced, true);
});

test("MC87: assinatura adulterada → rejeita", () => {
  const secret = "segredo-mp";
  process.env.MP_WEBHOOK_SECRET = secret;
  const req = reqAssinado({ secret: "outro-segredo", dataId: "12345" });
  const r = validarAssinaturaMp(req, "12345");
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "assinatura_invalida");
});

// ── P2-1: anti-replay ────────────────────────────────────────────────────────

test("MC87 P2-1: janela DESLIGADA por omissão → replay antigo ainda passa", () => {
  // Preserva a decisão do operador no MC59.2 (o MP reenvia com o ts original
  // por horas). O mecanismo existe, mas inerte até ser explicitamente ligado.
  const secret = "segredo-mp";
  process.env.MP_WEBHOOK_SECRET = secret;
  const antigo = Date.now() - (JANELA_TS_SEG_PADRAO + 60) * 1000;
  const r = validarAssinaturaMp(reqAssinado({ secret, dataId: "12345", tsMs: antigo }), "12345");
  assert.equal(r.ok, true);
});

test("MC87 P2-1: com MP_WEBHOOK_TS_JANELA_SEG → replay antigo é rejeitado", () => {
  const secret = "segredo-mp";
  process.env.MP_WEBHOOK_SECRET = secret;
  process.env.MP_WEBHOOK_TS_JANELA_SEG = String(JANELA_TS_SEG_PADRAO);
  const antigo = Date.now() - (JANELA_TS_SEG_PADRAO + 60) * 1000;
  const r = validarAssinaturaMp(reqAssinado({ secret, dataId: "12345", tsMs: antigo }), "12345");
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "ts_fora_da_janela");
});

test("MC87 P2-1: com a janela ligada, notificação FRESCA continua a passar", () => {
  const secret = "segredo-mp";
  process.env.MP_WEBHOOK_SECRET = secret;
  process.env.MP_WEBHOOK_TS_JANELA_SEG = String(JANELA_TS_SEG_PADRAO);
  assert.equal(validarAssinaturaMp(reqAssinado({ secret, dataId: "12345" }), "12345").ok, true);
});

test("MC87 P2-1: ts em SEGUNDOS (IPN legado) também é aceite quando fresco", () => {
  const secret = "segredo-mp";
  process.env.MP_WEBHOOK_SECRET = secret;
  const tsSeg = Math.floor(Date.now() / 1000);
  const manifest = `id:99;request-id:r;ts:${tsSeg};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  const req = new Request("http://x/?data.id=99", {
    method: "POST",
    headers: { "x-signature": `ts=${tsSeg},v1=${v1}`, "x-request-id": "r" },
  });
  assert.equal(validarAssinaturaMp(req, "99").ok, true);
});

// ── P1-3: debug-pedido fail-closed ───────────────────────────────────────────

test("MC87 P1-3: debug-pedido sem DEBUG_TOKEN → 503 (antes 200 aberto)", async () => {
  const res = await debugPedido(new Request("http://x/?id=abc"));
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error.code, "config_ausente");
});

test("MC87 P1-3: com DEBUG_TOKEN e header errado → 401", async () => {
  process.env.DEBUG_TOKEN = "tok-secreto";
  const res = await debugPedido(new Request("http://x/?id=abc", { headers: { "x-debug-token": "errado" } }));
  assert.equal(res.status, 401);
});

test("MC87 P1-3: com DEBUG_TOKEN correto → responde", async () => {
  process.env.DEBUG_TOKEN = "tok-secreto";
  const res = await debugPedido(new Request("http://x/?id=abc", { headers: { "x-debug-token": "tok-secreto" } }));
  assert.equal(res.status, 200);
});

// ── P1-4: coordenação env-configurável ───────────────────────────────────────

test("MC87 P1-4: sem COORDENACAO_ADDRESS mantém a legada (sem lockout)", () => {
  assert.equal(resolverCoordenacao(), "0xda3a83a24b25aa71e1a9b5a74503ffa93487e84e");
});

test("MC87 P1-4: COORDENACAO_ADDRESS rotaciona a coordenação", async () => {
  const nova = "0xFea436F74059f885Ea50d48ABBE21ef6665D1E67";
  process.env.COORDENACAO_ADDRESS = nova;
  assert.equal(resolverCoordenacao(), nova.toLowerCase());
  invalidarCacheAdmins();
  const admins = await getAdminAddresses();
  assert.ok(admins.includes(nova.toLowerCase()), "a nova coordenação entra na lista");
  assert.ok(!admins.includes("0xda3a83a24b25aa71e1a9b5a74503ffa93487e84e"),
    "a EOA comprometida deixa de ser admin");
});

test("MC87 P1-4: COORDENACAO_ADDRESS inválida cai na legada (fail-safe)", () => {
  process.env.COORDENACAO_ADDRESS = "não-é-endereço";
  assert.equal(resolverCoordenacao(), "0xda3a83a24b25aa71e1a9b5a74503ffa93487e84e");
});

// ── P2-2: validadores ────────────────────────────────────────────────────────

test("MC87 P2-2: validarCPF aceita válido (com e sem máscara) e rejeita o resto", () => {
  assert.equal(validarCPF("529.982.247-25"), "52998224725");
  assert.equal(validarCPF("52998224725"), "52998224725");
  for (const mau of ["11111111111", "52998224724", "123", "", "5299822472a"]) {
    assert.throws(() => validarCPF(mau), ValidationError, `devia rejeitar: ${mau}`);
  }
});

test("MC87 P2-2: validarEmail normaliza e rejeita malformado", () => {
  assert.equal(validarEmail("  Lojista@Exemplo.COM "), "lojista@exemplo.com");
  for (const mau of ["sem-arroba", "a@b", "a@b.c", "@x.com", "a b@x.com"]) {
    assert.throws(() => validarEmail(mau), ValidationError, `devia rejeitar: ${mau}`);
  }
});

test("MC87 P3-1: máscaras preservam correlação sem reidentificar", () => {
  assert.equal(mascararEndereco("0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E"), "0xDa3a…e84E");
  assert.equal(mascararEmail("lojista@exemplo.com"), "l…@exemplo.com");
  assert.equal(mascararEndereco(null), null);
});
