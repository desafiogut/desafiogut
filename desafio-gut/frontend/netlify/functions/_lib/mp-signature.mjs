// _lib/mp-signature.mjs — MC39.17.2 (B-P1-1)
//
// Validação HMAC da assinatura `x-signature` enviada pelos Webhooks v2 do
// Mercado Pago. Formato do header: "ts=<unix>,v1=<hmac_sha256_hex>".
// Manifest assinado (template oficial MP):
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// (segmentos cujo valor é ausente são omitidos; data.id alfanumérico em lowercase).
//
// Rollout seguro (R1 — zero regressão): se MP_WEBHOOK_SECRET NÃO estiver
// configurado, a validação é PULADA (fail-open, comportamento atual). Quando o
// segredo está set, a assinatura passa a ser OBRIGATÓRIA (ausente/ inválida → bloqueia).

import { createHmac, timingSafeEqual } from "node:crypto";

function parseXSignature(header) {
  const out = { ts: null, v1: null };
  if (typeof header !== "string") return out;
  for (const parte of header.split(",")) {
    const idx = parte.indexOf("=");
    if (idx <= 0) continue;
    const k = parte.slice(0, idx).trim();
    const v = parte.slice(idx + 1).trim();
    if (k === "ts") out.ts = v;
    else if (k === "v1") out.v1 = v;
  }
  return out;
}

function montarManifest({ dataId, requestId, ts }) {
  let m = "";
  if (dataId)    m += `id:${dataId};`;
  if (requestId) m += `request-id:${requestId};`;
  if (ts)        m += `ts:${ts};`;
  return m;
}

function compararHexConstante(aHex, bHex) {
  if (typeof aHex !== "string" || typeof bHex !== "string") return false;
  let a, b;
  try {
    a = Buffer.from(aHex, "hex");
    b = Buffer.from(bHex, "hex");
  } catch { return false; }
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Valida a assinatura do webhook MP.
 * @param {Request} req
 * @param {string|null} dataId  — valor de `data.id` (query) usado no manifest.
 * @returns {{ ok: boolean, enforced: boolean, motivo?: string }}
 *   - enforced=false  → MP_WEBHOOK_SECRET ausente; validação pulada (sempre ok:true).
 *   - enforced=true   → segredo configurado; ok reflete a verificação HMAC.
 */
export function validarAssinaturaMp(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return { ok: true, enforced: false, motivo: "secret_ausente" };

  const header    = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  const { ts, v1 } = parseXSignature(header);
  if (!ts || !v1) return { ok: false, enforced: true, motivo: "x_signature_ausente_ou_malformada" };

  const id = dataId != null && /^[a-z0-9]+$/i.test(String(dataId))
    ? String(dataId).toLowerCase()
    : (dataId != null ? String(dataId) : null);

  const manifest  = montarManifest({ dataId: id, requestId, ts });
  const esperado  = createHmac("sha256", secret).update(manifest).digest("hex");

  if (!compararHexConstante(esperado, v1)) {
    return { ok: false, enforced: true, motivo: "assinatura_invalida" };
  }
  return { ok: true, enforced: true };
}
