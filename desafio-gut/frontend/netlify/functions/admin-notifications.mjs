// GET /.netlify/functions/admin-notifications                    [ADMIN]
// MC89.18 (Fase 6). Histórico de notificações enviadas.
// Gate: operador+. Cache: 15s.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdminNivel } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  const rl = await aplicarRateLimit(req, "admin-notifications", 20); if (rl) return rl;
  const ng = await guardAdminNivel(req, "operador"); if (ng) return ng;

  const url = new URL(req.url);
  const limite = Math.min(parseInt(url.searchParams.get("limite"), 10) || 20, 50);
  const antes  = url.searchParams.get("antes") || undefined;

  const ck = `admin:notif:v1:${limite}:${antes || ""}`;
  const hit = await cacheGet(ck); if (hit) return jsonResponse({ ...hit, cache: "hit" });

  const sb = getSupabaseReadOnly();
  let q = sb.from("notifications").select("*", { count: "exact" }).order("criado_em", { ascending: false }).limit(limite + 1);
  if (antes) q = q.lt("criado_em", antes);

  const { data, error, count } = await q;
  if (error) return jsonError(500, "consulta_falhou", error.message);

  const linhas = (data || []).slice(0, limite);
  const proximo = data && data.length > limite ? data[limite - 1]?.criado_em : null;

  const payload = { notificacoes: linhas, total: count ?? linhas.length, proximoCursor: proximo };
  await cacheSet(ck, payload, 15);
  return jsonResponse({ ...payload, cache: "miss" });
};
