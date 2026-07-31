// GET /.netlify/functions/admin-status                            [ADMIN]
//
// MC89.12 (Fase 3). Sondas independentes das dependências do sistema.
// Cada sonda degrada sozinha (Promise.allSettled) — o padrão de
// obterMetricas(). Sem ethers. Cache 30s.
//
// Gate: operador ou superior (só leitura).

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdminNivel } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { sondarStatus } from "./_lib/admin-comandos.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE_CACHE = "admin:status:v1";
const TTL_SEG = 30;

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-status", 20);
  if (rl) return rl;

  const negado = await guardAdminNivel(req, "operador");
  if (negado) return negado;

  const hit = await cacheGet(CHAVE_CACHE);
  if (hit) return jsonResponse({ ...hit, cache: "hit" });

  const sondas = await sondarStatus({
    sb: getSupabaseReadOnly(),
    fetch: globalThis.fetch.bind(globalThis),
    rpcUrl: process.env.RPC_URL,
  });

  await cacheSet(CHAVE_CACHE, { sondas }, TTL_SEG);
  return jsonResponse({ sondas, cache: "miss" });
};
