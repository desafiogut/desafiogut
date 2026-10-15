// Sentry security alerts — Mega Comando 3 / Item 1 (client-side).
//
// Helpers que disparam Sentry.captureMessage com level "warning" quando
// padrões suspeitos são detectados no próprio browser. Reusa a instância
// `Sentry` já inicializada em src/main.jsx.
//
// Janelas são in-memory (por aba). Não persistem entre refresh — o objetivo
// é detectar burst dentro de uma sessão; o servidor (sentry-server.mjs)
// cobre o lado durável.

import * as Sentry from "@sentry/react";
import { mascararEnderecosProfundo } from "./mascarar.js"; // UTAC110h.4 (DEBT-031/S6)

const LIMIAR_RATE_LIMIT  = 50;  // requests/min no mesmo endpoint
const LIMIAR_JWT_FAILS   = 5;   // falhas 401 em 1 min
const LIMIAR_BURST_COMPR = 10;  // compras/lances do mesmo endereco em 1 min
const LIMIAR_GEO_TZS     = 3;   // timezones distintos em 5 min
const JANELA_GEO_MS      = 5 * 60 * 1000;

function captureAlert(kind, payload, level = "warning") {
  try {
    Sentry.captureMessage(`[sec] ${kind}`, {
      level,
      tags: { security_alert: kind, source: "client" },
      // UTAC110h.4 (DEBT-031/S6) — o endereço sai mascarado: o critério é o VALOR, não o nome da
      // chave (a guarda por nome deixava passar `addresses`/`lancador`/`address`).
      extra: mascararEnderecosProfundo(payload),
    });
  } catch (err) {
    // Sentry pode estar desabilitado (sem DSN). Não pode quebrar a app.
    console.warn("[sentry-alerts] captureMessage falhou:", err?.message);
  }
}

// ── Rate limit ──────────────────────────────────────────────────────────────
export function checkRateLimit(endpoint, count, ip) {
  if (!Number.isFinite(count) || count <= LIMIAR_RATE_LIMIT) return false;
  captureAlert("rate_limit", { endpoint, count, ip, limiar: LIMIAR_RATE_LIMIT });
  return true;
}

// ── JWT failures (401 em endpoints autenticados) ────────────────────────────
const jwtFailsWindow = []; // [{ at, endpoint }]
export function checkJwtFailures(endpoint) {
  const agora = Date.now();
  jwtFailsWindow.push({ at: agora, endpoint });
  // Mantém só os últimos 60s.
  while (jwtFailsWindow.length && agora - jwtFailsWindow[0].at > 60_000) {
    jwtFailsWindow.shift();
  }
  if (jwtFailsWindow.length < LIMIAR_JWT_FAILS) return false;
  captureAlert("jwt_failures", {
    count:     jwtFailsWindow.length,
    endpoints: jwtFailsWindow.map((f) => f.endpoint),
    limiar:    LIMIAR_JWT_FAILS,
  });
  // Limpa a janela após disparar para evitar spam (próximo alerta exige nova burst).
  jwtFailsWindow.length = 0;
  return true;
}

/**
 * Captura uma EXCEPÇÃO no Sentry do cliente, com o endereço mascarado.
 *
 * UTAC110h.4 (SEG5 · F2 do validador adversarial) — existe para não haver chamadas directas a
 * `Sentry.captureException` fora dos wrappers: o `CardLance` passava `tags.wallet = address` e
 * `extra.reasonRaw` (texto do revert, que pode trazer um endereço lá dentro). Uma chamada directa
 * escapa ao mascaramento do wrapper; passando por aqui, não.
 *
 * O `beforeSend` do `sentryLazy.js` mascara o evento inteiro (defesa em profundidade); isto é a
 * 1.ª barreira, no sítio onde o dado é recolhido.
 */
export function capturarExcecao(err, ctx = {}) {
  try {
    Sentry.captureException(err, mascararEnderecosProfundo(ctx));
  } catch (e) {
    // Sentry pode estar desabilitado (sem DSN). Não pode quebrar a app.
    if (typeof console !== "undefined") console.warn("[sentry-alerts] capturarExcecao falhou:", e?.message);
  }
}

// ── Burst de compras / lances do mesmo endereço ─────────────────────────────
const comprasPorAddr = new Map(); // address -> [timestamps]
export function checkBurstCompras(address, agoraMs = Date.now()) {
  if (!address) return false;
  const key = String(address).toLowerCase();
  const arr = comprasPorAddr.get(key) || [];
  arr.push(agoraMs);
  // Mantém só os últimos 60s.
  while (arr.length && agoraMs - arr[0] > 60_000) arr.shift();
  comprasPorAddr.set(key, arr);
  if (arr.length <= LIMIAR_BURST_COMPR) return false;
  captureAlert("burst_compras", { address: key, count: arr.length, limiar: LIMIAR_BURST_COMPR });
  return true;
}

// ── Anomalia geográfica via timezone proxy ──────────────────────────────────
// Não temos GeoIP no client; o melhor proxy disponível é o timezone do navegador.
// Em uso normal, um usuário tem 1 timezone estável. 3+ timezones distintos em
// 5 min sugere proxy switching ou múltiplas máquinas no mesmo address.
const tzWindow = []; // [{ at, tz }]
export function checkGeoAnomaly(tz = null) {
  const agora = Date.now();
  const timezone = tz || (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"; }
    catch { return "unknown"; }
  })();
  tzWindow.push({ at: agora, tz: timezone });
  while (tzWindow.length && agora - tzWindow[0].at > JANELA_GEO_MS) tzWindow.shift();
  const distintos = new Set(tzWindow.map((e) => e.tz));
  if (distintos.size < LIMIAR_GEO_TZS) return false;
  captureAlert("geo_anomaly", { timezones: [...distintos], janelaMs: JANELA_GEO_MS });
  return true;
}

// Helper para uso externo (testes).
export const _LIMIARES = {
  rateLimit: LIMIAR_RATE_LIMIT,
  jwtFails:  LIMIAR_JWT_FAILS,
  burst:     LIMIAR_BURST_COMPR,
  geoTzs:    LIMIAR_GEO_TZS,
};
