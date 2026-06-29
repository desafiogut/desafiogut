// Cliente HTTP do Mercado Pago — usado pelo provider PIX (criação de cobrança),
// pelo webhook (consulta de status disparada por push do MP), e pelo
// /confirmar-pagamento (verificação síncrona antes de creditar on-chain).
//
// Centralizamos aqui: leitura do MP_ACCESS_TOKEN, classes de erro, fetch com
// timeout/auth, e helper consultarPagamento(id).

const MP_API_BASE = "https://api.mercadopago.com";
const TIMEOUT_MS  = 12_000;

export class MercadoPagoConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "MercadoPagoConfigError";
    this.code = "mp_config_invalida";
  }
}

export class MercadoPagoApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "MercadoPagoApiError";
    this.code = "mp_api_falhou";
    this.status = status;
    this.body = body;
  }
}

export function lerTokenObrigatorio() {
  const raw = process.env.MP_ACCESS_TOKEN;
  if (!raw || typeof raw !== "string") {
    throw new MercadoPagoConfigError(
      "MP_ACCESS_TOKEN ausente — configure no Netlify (Functions, secret)"
    );
  }
  // Trim defensivo: um newline/espaço acidental no valor da env quebraria o header.
  const token = raw.trim();
  // MC39.16 — fail-fast de formato. Tokens do MP são "APP_USR-..." (produção) ou
  // "TEST-..." (sandbox). Um valor fora desse formato (placeholder de 20 chars,
  // token de outro contexto) passava a checagem antiga (length>=10) e ia ao MP,
  // que respondia 401 "authorization value not present" → 502 confuso a montante.
  // Agora falha cedo como erro de configuração (→ 500 pix_provider_mal_configurado),
  // sinalizando claramente "corrija o MP_ACCESS_TOKEN por contexto no Netlify".
  const formatoValido =
    token.length >= 20 && (token.startsWith("APP_USR-") || token.startsWith("TEST-"));
  if (!formatoValido) {
    throw new MercadoPagoConfigError(
      "MP_ACCESS_TOKEN com formato inválido — esperado 'APP_USR-...' (produção) ou " +
      "'TEST-...' (sandbox). Verifique o valor POR CONTEXTO no Netlify."
    );
  }
  return token;
}

async function fetchComTimeout(url, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Faz uma requisição autenticada à API do MP e devolve JSON parseado.
 * Lança MercadoPagoApiError em qualquer falha (rede, HTTP não-2xx, JSON inválido).
 */
export async function fetchMP(path, { method = "GET", body, idempotencyKey } = {}) {
  const token = lerTokenObrigatorio();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  let resp;
  try {
    resp = await fetchComTimeout(`${MP_API_BASE}${path}`, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new MercadoPagoApiError(
      err?.name === "AbortError" ? "timeout ao chamar Mercado Pago" : `falha de rede: ${err?.message}`,
      { status: 0 }
    );
  }

  let data = null;
  try { data = await resp.json(); } catch {}

  if (!resp.ok) {
    throw new MercadoPagoApiError(
      data?.message || `MP retornou HTTP ${resp.status}`,
      { status: resp.status, body: data }
    );
  }
  return data;
}

/**
 * GET /v1/payments/:id — retorna o objeto de pagamento conforme a API do MP.
 * Campos relevantes: { id, status, status_detail, external_reference,
 *                      transaction_amount, point_of_interaction, ... }
 *
 * Status comuns: "pending" | "approved" | "in_process" | "rejected" | "cancelled"
 */
export async function consultarPagamento(paymentId) {
  if (!paymentId) throw new MercadoPagoApiError("paymentId obrigatório", { status: 0 });
  return await fetchMP(`/v1/payments/${encodeURIComponent(paymentId)}`);
}
