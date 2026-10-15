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
 * Mascara **qualquer** endereço (`0x` + 40 hex) em QUALQUER profundidade do payload — chaves de
 * objecto, arrays, strings dentro de strings.
 *
 * ⚠️ UTAC110h.4 (SEG5 · F2/F3 do validador adversarial) — porque é que isto existe em vez de se
 * mascarar em cada chamador: a 1.ª correcção mascarou os chamadores **por NOME do identificador**
 * (`endereco`, `indicador`, `indicado`…). O validador refutou-a com um mutante que passa verde:
 * `captureSecurityAlert("sybil_suspect", { addresses: r.addresses })`, `{ lancador }` e
 * `{ address }` no cliente **escapavam** — nomes fora da allowlist. Uma guarda por nome é uma
 * guarda que só vê o que já se lembrou de listar.
 * Aqui o critério passa a ser o **VALOR** (a forma do endereço), não o nome: não há lista para
 * ficar desactualizada. É a mesma doutrina do `METODOLOGIA-SEGURANCA.md` §0 — *a guarda não vê o
 * payload que escreveste, vê o que lhe chega*.
 *
 * E é aqui, no wrapper, que a regra pertence: o docstring deste parâmetro já dizia «NÃO incluir PII
 * bruta» — agora o wrapper **obriga**.
 */
const ENDERECO_RE = /0x[a-fA-F0-9]{40}/g;
export function mascararEnderecosProfundo(v, prof = 0) {
  if (typeof v === "string") return v.replace(ENDERECO_RE, (m) => `${m.slice(0, 6)}…${m.slice(-4)}`);
  if (prof > 8) return "[fundo]";                 // trava de recursão (payload patológico)
  if (Array.isArray(v)) return v.map((x) => mascararEnderecosProfundo(x, prof + 1));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = mascararEnderecosProfundo(val, prof + 1);
    return o;
  }
  return v;
}

/**
 * Captura um alerta de segurança como Sentry.captureMessage(level=warning).
 * Tags facilitam filtrar no painel Sentry por tipo de evento.
 *
 * @param {string} kind   ex.: "rate_limit", "jwt_failures", "sybil_suspect", "onchain_burst"
 * @param {object} payload  dados estruturados (**endereços são mascarados AQUI — UTAC110h.4**)
 * @param {"warning"|"error"} [level]
 */
export async function captureSecurityAlert(kind, payload = {}, level = "warning") {
  init();
  // UTAC110h.4 (S6 — soberania de dados): nada sai do ambiente com um endereço completo. O
  // mascaramento é aplicado UMA vez, aqui, e cobre as DUAS saídas (Sentry e o `console.warn` de
  // fallback) e TODOS os chamadores — presentes e futuros.
  const payloadSeguro = mascararEnderecosProfundo(payload);
  if (!process.env.SENTRY_DSN && !process.env.VITE_SENTRY_DSN) {
    // Fallback: log estruturado que aggregators como Logflare/DataDog pegam.
    console.warn(`[SEC-ALERT] ${kind}`, JSON.stringify(payloadSeguro));
    return;
  }
  try {
    Sentry.captureMessage(`[sec] ${kind}`, {
      level,
      tags: { security_alert: kind, source: "server" },
      extra: payloadSeguro,
    });
    // Flush é essencial em Lambda — o container morre antes do envio se não esperar.
    await Sentry.flush(2000).catch(() => {});
  } catch (err) {
    console.warn("[sentry-server] captureMessage falhou:", err?.message);
  }
}

// Re-export útil para casos onde o caller queira capturar uma exception bruta.
export { Sentry };
