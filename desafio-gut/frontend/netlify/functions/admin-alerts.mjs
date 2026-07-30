// GET /.netlify/functions/admin-alerts                           [ADMIN]
//
// MC89.7 (Fase 1). Alertas computáveis do painel ADM. A lógica de cada alerta
// vive em `_lib/admin-alertas.mjs` (pura, injetável, testada). Este ficheiro é
// a casca: gate + cache + a função pura com as dependências reais.
//
// ⚠️ NÃO IMPORTA `ethers`. Os alertas que dependem de RPC (EOA, bloco) são
// computados pelo frontend com os dados que já tem do `admin-onchain` (R7).

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { computarAlertas } from "./_lib/admin-alertas.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE_CACHE = "admin:alerts:v1";
const TTL_SEG     = 60;

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-alerts", 20);
  if (rl) return rl;

  const negado = await guardAdmin(req);
  if (negado) return negado;

  const hit = await cacheGet(CHAVE_CACHE);
  if (hit) return jsonResponse({ ...hit, cache: "hit" });

  const agora = new Date();
  const alerts = await computarAlertas({
    sb: getSupabaseReadOnly(),
    env: process.env,
    agora: () => agora,
  });

  const payload = { alerts, total: alerts.length, geradoEm: agora.toISOString() };
  await cacheSet(CHAVE_CACHE, payload, TTL_SEG);
  return jsonResponse({ ...payload, cache: "miss" });
};
