// Cliente HTTP centralizado das Netlify Functions (MC39.22.1 P0-2; evoluído MC39.22.2).
//
// Cada call-site montava à mão: URL base, headers (Content-Type/Bearer),
// JSON.stringify do body e o parse tolerante da resposta. Estes helpers centralizam
// ESSE boilerplate e NÃO lançam — o tratamento de erro (setErro, throw, return null)
// continua a ser do caller, preservando a semântica 1:1 (R1). Sem nova dependência
// (fetch nativo — R6).
//
// Retorno de TODOS os helpers: { ok, status, data, text, headers }
//   - data    = corpo JSON parseado, ou o fallback (null no apiGet; {} no apiPost/
//               apiDelete) quando o corpo não é JSON válido — igual ao antigo
//               `json().catch(() => null|{})`.
//   - text    = corpo cru (string). Para call-sites que liam `await resp.text()`
//               (ex.: mensagem de erro detalhada).
//   - headers = objeto Headers da resposta. Para ler cabeçalhos (ex.:
//               `headers.get("x-ratelimit-limit")` que alimenta checkRateLimit).
//
// MC39.22.2 — opção `headers` (por chamada): injeta cabeçalhos custom além de
// Content-Type/Bearer (ex.: sinais anti-fraude X-Visitor-ID / X-Device-Tracked).
// O corpo é lido UMA única vez (como texto) e depois parseado, para expor `data` e
// `text` sem violar o "body já consumido" do fetch.

const BASE = "/.netlify/functions/";

function montarHeaders(token, temBody, extra) {
  const headers = {};
  if (temBody) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return extra ? { ...headers, ...extra } : headers;
}

/** Lê o corpo uma vez (texto) e tenta JSON.parse → data; expõe text e headers crus. */
async function lerResposta(resp, fallback) {
  const text = await resp.text().catch(() => "");
  let data = fallback;
  if (text) {
    try { data = JSON.parse(text); } catch { data = fallback; }
  }
  return { ok: resp.ok, status: resp.status, data, text, headers: resp.headers };
}

/**
 * GET numa Netlify Function.
 * @param {string} path  nome da função + query (ex.: `cotas?cliente_id=0x..`).
 * @param {{ token?: string, signal?: AbortSignal, headers?: Record<string,string> }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: any, text: string, headers: Headers }>}
 */
export async function apiGet(path, { token, signal, headers } = {}) {
  const resp = await fetch(BASE + path, { headers: montarHeaders(token, false, headers), signal });
  return lerResposta(resp, null);
}

/**
 * POST JSON numa Netlify Function.
 * @param {string} path  nome da função + query (ex.: `troco?action=converter`).
 * @param {any} body     objeto serializado para o corpo (default {}).
 * @param {{ token?: string, signal?: AbortSignal, keepalive?: boolean, headers?: Record<string,string> }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: any, text: string, headers: Headers }>}
 */
export async function apiPost(path, body, { token, signal, keepalive, headers } = {}) {
  const resp = await fetch(BASE + path, {
    method: "POST",
    headers: montarHeaders(token, true, headers),
    body: JSON.stringify(body ?? {}),
    signal,
    keepalive,
  });
  return lerResposta(resp, {});
}

/**
 * DELETE numa Netlify Function (sem corpo).
 * @param {string} path  nome da função + query (ex.: `produtos?id=123`).
 * @param {{ token?: string, signal?: AbortSignal, headers?: Record<string,string> }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: any, text: string, headers: Headers }>}
 */
export async function apiDelete(path, { token, signal, headers } = {}) {
  const resp = await fetch(BASE + path, { method: "DELETE", headers: montarHeaders(token, false, headers), signal });
  return lerResposta(resp, {});
}
