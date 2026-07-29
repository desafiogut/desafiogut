// GET /.netlify/functions/admin-stats                          [ADMIN]
//
// Métricas de leitura do painel ADM (Fase 1 do plano do MC89).
// Resposta: o objeto de `_lib/admin-metricas.mjs` + `cache: "hit"|"miss"`.
//
// ⚠️ NÃO IMPORTA `ethers`, nem por transitividade. Medido no MC88.31: `_lib/signer`
// arrasta ethers (~2 s de cold start) e `_lib/admin-auth` ~1,3 s. O admin-auth é
// inevitável (é o gate), o ethers não é — o que precisa de RPC vive em
// `admin-onchain.mjs`, à parte. Um painel que demora 3 s deixa de ser aberto.
//
// O cache de 45 s é no-op enquanto REDIS_URL/REDIS_TOKEN não estiverem no
// ambiente (ver _lib/cache.mjs): nesse caso vai sempre à fonte, que é o
// comportamento correto — nunca serve número inventado por falta de cache.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { obterMetricas } from "./_lib/admin-metricas.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE_CACHE = "admin:stats:v1";
const TTL_SEG     = 45;

export default async (req) => {
  // MC88.12 — preflight CORS do APK tem de ser a PRIMEIRA coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-stats", 20);
  if (rl) return rl;

  const negado = await guardAdmin(req);
  if (negado) return negado;

  // Cache-aside explícito (em vez de `cacheAside`) só para poder DIZER ao painel
  // se o que ele está a ver é fresco — sem isso, um número que não muda depois
  // de um comando parece um bug e é só o TTL.
  const hit = await cacheGet(CHAVE_CACHE);
  if (hit) return jsonResponse({ ...hit, cache: "hit" });

  let metricas;
  try {
    metricas = await obterMetricas();
  } catch (err) {
    // obterMetricas já degrada por bloco; chegar aqui é falha da própria
    // agregação (ex.: Supabase não configurado). 503 e não 500: é
    // indisponibilidade de dependência, não defeito de pedido.
    console.error("[admin-stats] obterMetricas falhou:", err?.message);
    return jsonError(503, "metricas_indisponiveis", "não foi possível agregar as métricas agora");
  }

  await cacheSet(CHAVE_CACHE, metricas, TTL_SEG);
  return jsonResponse({ ...metricas, cache: "miss" });
};
