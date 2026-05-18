// Endpoint /analytics — Mega Comando 8 / Item 2.
//
// Recebe eventos fire-and-forget do frontend (src/lib/analytics.js) e persiste
// em Blob `analytics:{minuto}:{visitorId}` agregando contagens por evento.
// O motor `_lib/ia-preditiva.mjs` consome esses blobs a cada 5 min via cron.
//
// Padrões herdados:
//   - Rate limit 30 reqs/min/IP via _lib/rate-limiter.mjs (MC1).
//   - jsonResponse / jsonError de _lib/validate.mjs (MC1).
//   - Fail-open em Blob indisponível (mesmo critério de rate-limiter).
//
// TTL 30 min: o motor olha janelas de 15 min e médias de 60 min, então um
// buffer de 30 min cobre o caso mais longo + uma margem para o cron rodar.
// TTLs no Netlify Blobs são best-effort — purge-logs-scheduled.mjs faz a
// limpeza autoritativa via prefixo de minuto.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";

const STORE_NAME      = "analytics";
const RATE_LIMIT_RPM  = 30;
const EVENTOS_PERMITIDOS = new Set([
  "pageview",
  "click_botao_comprar",
  "tempo_sessao",
  "scroll",
]);
// visitorId do FingerprintJS é hex 16-64; deixamos espaço para fallback "anonymous-{rand}".
const VISITOR_RE = /^[a-zA-Z0-9_-]{4,128}$/;

function abrirStore() {
  try { return getStore({ name: STORE_NAME, consistency: "eventual" }); }
  catch (err) {
    console.warn("[analytics] Blobs indisponível:", err?.message);
    return null;
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  // Rate-limit (padrão MC1): 30 reqs/min/IP.
  const rl = await aplicarRateLimit(req, "analytics", RATE_LIMIT_RPM);
  if (rl) return rl;

  let payload;
  try { payload = await req.json(); }
  catch { return jsonError(400, "json_invalido", "body precisa ser JSON"); }

  const { evento, visitorId, timestamp, rota } = payload || {};
  if (!evento || typeof evento !== "string" || !EVENTOS_PERMITIDOS.has(evento)) {
    return jsonError(400, "evento_invalido", "evento ausente ou fora da lista permitida");
  }
  // visitorId é obrigatório, mas aceita anônimo (frontend pode estar pré-fingerprint).
  const vid = (typeof visitorId === "string" && VISITOR_RE.test(visitorId))
    ? visitorId
    : "anonymous";
  if (visitorId == null) {
    return jsonError(400, "visitor_id_obrigatorio", "visitorId é obrigatório (pode ser null para anônimo? não — passe string)");
  }

  const ts     = Number(timestamp) || Date.now();
  const minuto = Math.floor(ts / 60_000);
  const rotaSanitizada = (typeof rota === "string" && rota.length <= 256) ? rota : null;

  const store = abrirStore();
  if (!store) {
    // Fail-open: rate-limiter já passou; sem Blob seguimos retornando 200
    // para preservar UX fire-and-forget. Log estruturado vai para o aggregator.
    console.warn("[analytics] descartando evento — Blobs indisponível:", { evento, vid });
    return jsonResponse({ ok: true, persisted: false });
  }

  const chave = `analytics:${minuto}:${vid}`;
  // Read-modify-write com tolerância: contention 1-em-N entre Lambdas é
  // aceitável porque o motor agrega múltiplos visitorIds por minuto e
  // pequenas perdas não invalidam thresholds (ativos>2x, taxa>15%).
  let registro = null;
  try {
    registro = await store.get(chave, { type: "json" });
  } catch { registro = null; }

  const base = registro && typeof registro === "object" ? registro : {
    visitorId: vid,
    minuto,
    eventos:  {},
    rotas:    {},
    criadoEm: ts,
  };
  base.eventos[evento] = (base.eventos[evento] || 0) + 1;
  if (rotaSanitizada) base.rotas[rotaSanitizada] = (base.rotas[rotaSanitizada] || 0) + 1;
  base.atualizadoEm = ts;

  try {
    await store.setJSON(chave, base);
  } catch (err) {
    console.warn("[analytics] persistir falhou (fail-open):", { chave, message: err?.message });
    return jsonResponse({ ok: true, persisted: false });
  }

  return jsonResponse({ ok: true, persisted: true });
};
