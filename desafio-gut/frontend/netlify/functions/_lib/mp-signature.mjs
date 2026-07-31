// _lib/mp-signature.mjs — MC39.17.2 (B-P1-1)
//
// Validação HMAC da assinatura `x-signature` enviada pelos Webhooks v2 do
// Mercado Pago. Formato do header: "ts=<unix>,v1=<hmac_sha256_hex>".
// Manifest assinado (template oficial MP):
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// (segmentos cujo valor é ausente são omitidos; data.id alfanumérico em lowercase).
//
// MC87 (P1-2) — INVERSÃO DO DEFAULT. Até aqui, sem MP_WEBHOOK_SECRET a validação
// era PULADA (fail-open): o webhook aceitava qualquer requisição. O interruptor
// MP_WEBHOOK_ENFORCE existia mas era opt-in, e nunca foi ligado. Agora o default
// é FAIL-CLOSED: sem segredo, rejeita.
//
// A válvula de escape mudou de lado: MP_WEBHOOK_ALLOW_UNSIGNED=true restaura
// explicitamente o comportamento antigo, para o caso de o operador precisar de
// uma janela de rollback sem redeploy. Ligá-la volta a emitir o alerta de
// segurança em cada requisição — é ruidosa de propósito.
//
// MC87 (P2-1) — anti-replay: o `ts` do header já entrava no manifest assinado,
// mas o seu FRESCOR nunca era verificado, portanto uma notificação legítima
// capturada podia ser reenviada indefinidamente. Passa a haver janela de 5 min.

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

function ehVerdadeiro(v) {
  const s = String(v || "").toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

// MC87 (P1-2) — válvula de rollback EXPLÍCITA. Só isto reabre o fail-open.
// MP_WEBHOOK_ENFORCE continua a ser lido para compatibilidade com o MC59.2, mas
// já não é necessário: o enforcement passou a ser o default.
function permitirSemAssinatura() {
  return ehVerdadeiro(process.env.MP_WEBHOOK_ALLOW_UNSIGNED)
    && !ehVerdadeiro(process.env.MP_WEBHOOK_ENFORCE);
}

// MC87 (P2-1) — janela de frescor do `ts`, DESLIGADA POR OMISSÃO.
//
// ⚠️ Há uma decisão anterior do operador (MC59.2) contra esta janela, com um
// motivo concreto: «o MP reenvia com o ts ORIGINAL por horas; a idempotência por
// pedidoId já cobre o replay». Se isso se confirmar, uma janela fixa rejeitaria
// RETENTATIVAS LEGÍTIMAS do Mercado Pago e partiria o crédito automático.
//
// Por isso o mecanismo fica implementado e testado, mas inerte até o operador o
// ligar depois de confirmar o comportamento de retentativa do MP:
//   MP_WEBHOOK_TS_JANELA_SEG=300   (0 ou ausente = desligado)
//
// O MP envia epoch em milissegundos nos Webhooks v2; aceitamos ambas as escalas.
export const JANELA_TS_SEG_PADRAO = 300;

export function janelaTsSeg() {
  const n = Number(process.env.MP_WEBHOOK_TS_JANELA_SEG);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function tsForaDaJanela(tsRaw, agoraMs = Date.now()) {
  const janela = janelaTsSeg();
  if (janela <= 0) return false;             // desligado → nunca rejeita por ts
  const n = Number(tsRaw);
  if (!Number.isFinite(n) || n <= 0) return true;
  // < 1e12 ⇒ está em segundos; caso contrário, milissegundos.
  const tsMs = n < 1e12 ? n * 1000 : n;
  return Math.abs(agoraMs - tsMs) > janela * 1000;
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
  if (!secret) {
    // MC87 (P1-2): fail-CLOSED por omissão. Só a válvula explícita reabre.
    if (permitirSemAssinatura()) {
      return { ok: true, enforced: false, motivo: "secret_ausente_allow_unsigned" };
    }
    return { ok: false, enforced: true, motivo: "secret_ausente" };
  }

  const header    = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  const { ts, v1 } = parseXSignature(header);
  if (!ts || !v1) return { ok: false, enforced: true, motivo: "x_signature_ausente_ou_malformada" };

  // MC87 (P2-1) — anti-replay antes do HMAC: uma notificação legítima capturada
  // deixa de poder ser reenviada dias depois.
  if (tsForaDaJanela(ts)) {
    return { ok: false, enforced: true, motivo: "ts_fora_da_janela" };
  }

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
