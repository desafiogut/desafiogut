// MC39.17.2 — B-P1-1: validação HMAC x-signature do webhook MP.
// node --test _tests/mc3917-mp-signature.test.mjs
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validarAssinaturaMp } from "../_lib/mp-signature.mjs";

const SECRET = "segredo_de_teste_mc39172";
const DATA_ID = "123456789";
const REQ_ID = "req-abc-1";

function reqCom(headers) {
  return new Request("https://x/.netlify/functions/webhook-mercadopago?data.id=" + DATA_ID, {
    method: "POST",
    headers,
  });
}

function assinaturaValida(ts) {
  const manifest = `id:${DATA_ID};request-id:${REQ_ID};ts:${ts};`;
  return createHmac("sha256", SECRET).update(manifest).digest("hex");
}

const SAVED = process.env.MP_WEBHOOK_SECRET;
afterEach(() => {
  if (SAVED === undefined) delete process.env.MP_WEBHOOK_SECRET;
  else process.env.MP_WEBHOOK_SECRET = SAVED;
});

test("sem MP_WEBHOOK_SECRET → fail-open (enforced=false, ok=true)", () => {
  delete process.env.MP_WEBHOOK_SECRET;
  const r = validarAssinaturaMp(reqCom({}), DATA_ID);
  assert.equal(r.ok, true);
  assert.equal(r.enforced, false);
});

test("com secret + assinatura válida → ok=true", () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  const ts = String(Date.now());
  const v1 = assinaturaValida(ts);
  const r = validarAssinaturaMp(reqCom({ "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": REQ_ID }), DATA_ID);
  assert.equal(r.ok, true);
  assert.equal(r.enforced, true);
});

test("com secret + assinatura inválida → ok=false", () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  const ts = String(Date.now());
  const r = validarAssinaturaMp(reqCom({ "x-signature": `ts=${ts},v1=deadbeef`, "x-request-id": REQ_ID }), DATA_ID);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "assinatura_invalida");
});

test("com secret + header ausente → ok=false", () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  const r = validarAssinaturaMp(reqCom({}), DATA_ID);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "x_signature_ausente_ou_malformada");
});

test("data.id divergente invalida a assinatura", () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  const ts = String(Date.now());
  const v1 = assinaturaValida(ts); // assinado para DATA_ID
  const r = validarAssinaturaMp(reqCom({ "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": REQ_ID }), "999");
  assert.equal(r.ok, false);
});
