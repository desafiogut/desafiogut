// _lib/http-cache.mjs — MC39.19 (Onda 3, itens 16/17): ETag + Cache-Control SWR.
//
// Helpers para respostas GET PÚBLICAS e cacheáveis (config_remota, produtos,
// listagens). NÃO usar em respostas com dado por-usuário (vazaria via cache).
// - computeETag: hash estável do corpo (validação condicional).
// - jsonCacheavel: devolve 200 com ETag + Cache-Control (max-age + stale-while-revalidate),
//   ou 304 (corpo vazio) quando o If-None-Match do cliente bate com o ETag atual.

import { createHash } from "node:crypto";

/** ETag forte derivado do corpo (sha1 base64url, curto). */
export function computeETag(body) {
  const str = typeof body === "string" ? body : JSON.stringify(body);
  return `"${createHash("sha1").update(str).digest("base64url").slice(0, 27)}"`;
}

/**
 * Resposta JSON cacheável com validação condicional.
 * @param {Request} req
 * @param {any} body              — objeto a serializar.
 * @param {{maxAge?:number, swr?:number}} opts — segundos (default 60 / 300).
 * @returns {Response} 304 se If-None-Match bate; senão 200 com ETag+Cache-Control.
 */
export function jsonCacheavel(req, body, { maxAge = 60, swr = 300 } = {}) {
  const payload = JSON.stringify(body);
  const etag = computeETag(payload);
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "etag": etag,
    "cache-control": `public, max-age=${maxAge}, stale-while-revalidate=${swr}`,
  };
  const inm = req.headers.get("if-none-match");
  if (inm && inm === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(payload, { status: 200, headers });
}
