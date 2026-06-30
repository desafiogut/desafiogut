// Cliente HTTP centralizado das Netlify Functions (MC39.22.1 — P0-2).
//
// Antes do MC39.22.1 cada call-site montava à mão: URL base, headers
// (Content-Type / Authorization Bearer), JSON.stringify do body e o parse
// tolerante da resposta. Estes helpers centralizam ESSE boilerplate e nada mais:
// devolvem sempre { ok, status, data } e NÃO lançam — o tratamento de erro
// (setErro, throw, return null, ...) continua a ser do caller, preservando a
// semântica existente 1:1 (R1). Não há nova dependência (fetch nativo — R6).
//
// data = corpo JSON da resposta, ou {} (apiPost) / null (apiGet) se o corpo não
// for JSON válido — exatamente o fallback `json().catch(() => ({}))` que os
// call-sites já usavam.

const BASE = "/.netlify/functions/";

function montarHeaders(token, temBody) {
  const headers = {};
  if (temBody) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * GET JSON numa Netlify Function.
 * @param {string} path  nome da função + query (ex.: `cotas?cliente_id=0x..`).
 * @param {{ token?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function apiGet(path, { token, signal } = {}) {
  const resp = await fetch(BASE + path, { headers: montarHeaders(token, false), signal });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, status: resp.status, data };
}

/**
 * POST JSON numa Netlify Function.
 * @param {string} path  nome da função + query (ex.: `troco?action=converter`).
 * @param {any} body     objeto serializado para o corpo (default {}).
 * @param {{ token?: string, signal?: AbortSignal, keepalive?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function apiPost(path, body, { token, signal, keepalive } = {}) {
  const resp = await fetch(BASE + path, {
    method: "POST",
    headers: montarHeaders(token, true),
    body: JSON.stringify(body ?? {}),
    signal,
    keepalive,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

/**
 * DELETE numa Netlify Function (sem corpo).
 * @param {string} path  nome da função + query (ex.: `produtos?id=123`).
 * @param {{ token?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function apiDelete(path, { token, signal } = {}) {
  const resp = await fetch(BASE + path, { method: "DELETE", headers: montarHeaders(token, false), signal });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}
