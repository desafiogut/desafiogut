// MC59.2 — D-1: postura de enforcement do HMAC do webhook MP.
// Decisão (operador): manter enforce-quando-presente; NÃO adicionar janela de
// replay (MP reenvia com ts original por horas; idempotência por pedidoId já
// cobre replay). Adicionar flag opt-in MP_WEBHOOK_ENFORCE que, com o segredo
// ausente, passa a FAIL-CLOSED (em vez do fail-open histórico).
// node --test _tests/mc592-d1-webhook-enforce.test.mjs
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validarAssinaturaMp } from "../_lib/mp-signature.mjs";

const SECRET = "segredo_de_teste_mc592";
const DATA_ID = "123456789";
const REQ_ID = "req-abc-1";

function reqCom(headers) {
  return new Request("https://x/.netlify/functions/webhook-mercadopago?data.id=" + DATA_ID, { method: "POST", headers });
}
function assinaturaValida(ts) {
  const manifest = `id:${DATA_ID};request-id:${REQ_ID};ts:${ts};`;
  return createHmac("sha256", SECRET).update(manifest).digest("hex");
}

const SAVED_SECRET  = process.env.MP_WEBHOOK_SECRET;
const SAVED_ENFORCE = process.env.MP_WEBHOOK_ENFORCE;
afterEach(() => {
  if (SAVED_SECRET === undefined) delete process.env.MP_WEBHOOK_SECRET; else process.env.MP_WEBHOOK_SECRET = SAVED_SECRET;
  if (SAVED_ENFORCE === undefined) delete process.env.MP_WEBHOOK_ENFORCE; else process.env.MP_WEBHOOK_ENFORCE = SAVED_ENFORCE;
});

// ── NOVO (RED → GREEN) ───────────────────────────────────────────────────────
test("D-1: segredo ausente + MP_WEBHOOK_ENFORCE=true → FAIL-CLOSED (ok=false, enforced=true)", () => {
  delete process.env.MP_WEBHOOK_SECRET;
  process.env.MP_WEBHOOK_ENFORCE = "true";
  const r = validarAssinaturaMp(reqCom({}), DATA_ID);
  assert.equal(r.ok, false);
  assert.equal(r.enforced, true);
  assert.match(r.motivo, /secret_ausente/);
});

test("D-1: MP_WEBHOOK_ENFORCE aceita variantes (1/on/yes)", () => {
  delete process.env.MP_WEBHOOK_SECRET;
  for (const v of ["1", "on", "yes", "TRUE"]) {
    process.env.MP_WEBHOOK_ENFORCE = v;
    assert.equal(validarAssinaturaMp(reqCom({}), DATA_ID).ok, false, `enforce=${v} deveria bloquear`);
  }
});

// ── REGRESSÃO (deve permanecer GREEN) ────────────────────────────────────────
test("D-1(reg): segredo ausente SEM enforce → fail-open (ok=true, enforced=false)", () => {
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.MP_WEBHOOK_ENFORCE;
  const r = validarAssinaturaMp(reqCom({}), DATA_ID);
  assert.equal(r.ok, true);
  assert.equal(r.enforced, false);
});

test("D-1(reg): com segredo + assinatura válida → ok=true (enforce não interfere)", () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  process.env.MP_WEBHOOK_ENFORCE = "true";
  const ts = String(Date.now());
  const v1 = assinaturaValida(ts);
  const r = validarAssinaturaMp(reqCom({ "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": REQ_ID }), DATA_ID);
  assert.equal(r.ok, true);
  assert.equal(r.enforced, true);
});

test("D-1(reg): com segredo + assinatura inválida → ok=false", () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  const ts = String(Date.now());
  const r = validarAssinaturaMp(reqCom({ "x-signature": `ts=${ts},v1=deadbeef`, "x-request-id": REQ_ID }), DATA_ID);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "assinatura_invalida");
});
