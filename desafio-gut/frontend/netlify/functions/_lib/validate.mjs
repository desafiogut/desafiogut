// Validação de input + helpers de Response/erro para as functions.
// Não importa nada de jose/ethers — usável em qualquer função.

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CUSTO_FICHA_BRL = 2.00;   // mantém em sincronia com saldoInterno.js (Art. 20)
const QTD_MIN = 1;
const QTD_MAX = 100;            // limite por pedido decidido com o usuário

export class ValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "ValidationError";
  }
}

export function validarEndereco(input) {
  if (typeof input !== "string") {
    throw new ValidationError("endereco_invalido", "endereco deve ser string");
  }
  if (!ADDRESS_RE.test(input)) {
    throw new ValidationError("endereco_invalido", "endereco deve ser 0x + 40 hex");
  }
  return input.toLowerCase();
}

export function validarQuantidadeFichas(input) {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isInteger(n)) {
    throw new ValidationError("quantidade_invalida", "quantidade deve ser inteiro");
  }
  if (n < QTD_MIN || n > QTD_MAX) {
    throw new ValidationError("quantidade_fora_do_limite", `quantidade deve estar entre ${QTD_MIN} e ${QTD_MAX}`);
  }
  return n;
}

export function calcularValorBRL(quantidadeFichas) {
  const qtd = validarQuantidadeFichas(quantidadeFichas);
  return Number((qtd * CUSTO_FICHA_BRL).toFixed(2));
}

export const LIMITES = { QTD_MIN, QTD_MAX, CUSTO_FICHA_BRL };

// ── HTTP helpers ─────────────────────────────────────────────────────────────

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function jsonError(status, code, message, extra = {}) {
  return jsonResponse({ error: { code, message, ...extra } }, status);
}

/**
 * Lê e parseia JSON do body de uma Request. Retorna `null` se vazio,
 * lança ValidationError se JSON inválido.
 */
export async function parseJsonBody(req) {
  const text = await req.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError("body_invalido", "body deve ser JSON válido");
  }
}

// ── Anti-IDOR ────────────────────────────────────────────────────────────────
// Helper para endpoints GET que recebem endereco/cliente_id e expõem dado
// sensível: caller deve ser o owner (JWT.endereco === recurso) OU admin.
//
// jwtPayload   — payload decodificado do user-session/admin JWT, ou null.
// recurso      — endereco/cliente_id alvo da requisição (string lowercase).
// adminAddrs   — array lowercase de endereços admin (vem de getAdminAddresses).
//
// Retorno: { ok, papel } onde papel ∈ "owner"|"admin"|null.
export function validarOwnerOuAdmin(jwtPayload, recurso, adminAddrs = []) {
  const owner = String(jwtPayload?.endereco || "").toLowerCase();
  const alvo  = String(recurso || "").toLowerCase();
  if (!owner) return { ok: false, papel: null };
  if (owner === alvo) return { ok: true, papel: "owner" };
  if (adminAddrs.includes(owner)) return { ok: true, papel: "admin" };
  return { ok: false, papel: null };
}
