// Sentry server-side — Mega Comando 3 / Item 1.
//
// Wrapper sobre @sentry/node para Netlify Functions. Init lazy + idempotente
// (cada Lambda é ephemeral; init() roda no cold start de cada container).
// No-op se SENTRY_DSN não estiver no env (dev local / preview sem alertas).
//
// Usar via:
//   import { captureSecurityAlert } from "./_lib/sentry-server.mjs";
//   await captureSecurityAlert("rate_limit", { endpoint, ip, count });

import * as Sentry from "@sentry/node";

let _inited = false;

function init() {
  if (_inited) return;
  const dsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;
  if (!dsn) {
    _inited = true; // marca como tentado; chamadas futuras viram no-op silencioso
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment:       process.env.NODE_ENV || "production",
      serverName:        "netlify-functions",
      tracesSampleRate:  0,           // alertas, não tracing
      profilesSampleRate: 0,
      release:           process.env.COMMIT_REF || undefined,
      // beforeSend defensivo: nunca vaza payload com "argon2id_" (paridade com client).
      beforeSend(event) {
        try {
          const json = JSON.stringify(event);
          if (/argon2id_/i.test(json)) {
            const cleaned = JSON.parse(json.replace(/argon2id_[a-zA-Z0-9$./]+/g, "[REDACTED:argon2id]"));
            return cleaned;
          }
        } catch {}
        return event;
      },
    });
  } catch (err) {
    console.warn("[sentry-server] init falhou:", err?.message);
  }
  _inited = true;
}

/**
 * Captura um alerta de segurança como Sentry.captureMessage(level=warning).
 * Tags facilitam filtrar no painel Sentry por tipo de evento.
 *
 * @param {string} kind   ex.: "rate_limit", "jwt_failures", "sybil_suspect", "onchain_burst"
 * @param {object} payload  dados estruturados (NÃO incluir PII bruta)
 * @param {"warning"|"error"} [level]
 */
export async function captureSecurityAlert(kind, payload = {}, level = "warning") {
  init();
  if (!process.env.SENTRY_DSN && !process.env.VITE_SENTRY_DSN) {
    // Fallback: log estruturado que aggregators como Logflare/DataDog pegam.
    console.warn(`[SEC-ALERT] ${kind}`, JSON.stringify(payload));
    return;
  }
  try {
    Sentry.captureMessage(`[sec] ${kind}`, {
      level,
      tags: { security_alert: kind, source: "server" },
      extra: payload,
    });
    // Flush é essencial em Lambda — o container morre antes do envio se não esperar.
    await Sentry.flush(2000).catch(() => {});
  } catch (err) {
    console.warn("[sentry-server] captureMessage falhou:", err?.message);
  }
}

// Re-export útil para casos onde o caller queira capturar uma exception bruta.
export { Sentry };
