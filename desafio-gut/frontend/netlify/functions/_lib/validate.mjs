// Validação de input + helpers de Response/erro para as functions.
// Não importa nada de jose/ethers — usável em qualquer função.

// MC88.12 — cabeçalhos CORS do APK, injetados por jsonResponse(). Sem
// dependências (só constantes), mantendo a promessa da linha acima.
import { CABECALHOS_CORS } from "./cors.mjs";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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

// MC87 (P2-2) — CPF: 11 dígitos + dígitos verificadores. Aceita com ou sem
// máscara; devolve só dígitos. Rejeita as sequências repetidas (111...), que
// passam no algoritmo mas nunca são CPFs reais.
export function validarCPF(input) {
  if (typeof input !== "string" && typeof input !== "number") {
    throw new ValidationError("cpf_invalido", "cpf deve ser string");
  }
  const nums = String(input).replace(/\D/g, "");
  if (nums.length !== 11)      throw new ValidationError("cpf_invalido", "cpf deve ter 11 dígitos");
  if (/^(\d)\1{10}$/.test(nums)) throw new ValidationError("cpf_invalido", "cpf inválido");
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  if (digito(nums.slice(0, 9))  !== Number(nums[9]))  throw new ValidationError("cpf_invalido", "cpf inválido");
  if (digito(nums.slice(0, 10)) !== Number(nums[10])) throw new ValidationError("cpf_invalido", "cpf inválido");
  return nums;
}

// MC87 (P2-2) — e-mail: formato + teto de comprimento (RFC 5321 = 254).
export function validarEmail(input) {
  if (typeof input !== "string") throw new ValidationError("email_invalido", "email deve ser string");
  const v = input.trim().toLowerCase();
  if (v.length > 254 || !EMAIL_RE.test(v)) throw new ValidationError("email_invalido", "email inválido");
  return v;
}

// ── Mascaramento para LOGS (MC87 P3-1) ───────────────────────────────────────
// Um endereço de carteira é pseudónimo, não anónimo: correlacionado com a cadeia
// e com o cadastro de cotas, identifica a pessoa. Estes helpers existem para que
// um log continue a ser diagnosticável (prefixo+sufixo bastam para correlacionar
// duas linhas) sem ser um identificador reutilizável.
export function mascararEndereco(v) {
  const s = String(v ?? "");
  if (!ADDRESS_RE.test(s)) return s ? "0x…" : null;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function mascararEmail(v) {
  const s = String(v ?? "");
  const at = s.indexOf("@");
  if (at < 1) return s ? "…" : null;
  return `${s[0]}…@${s.slice(at + 1)}`;
}

export function mascararDoc(v) {
  const nums = String(v ?? "").replace(/\D/g, "");
  if (!nums) return null;
  return `${nums.slice(0, 3)}…${nums.slice(-2)}`;
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
      // MC88.12 — CORS para o APK. Aplicado aqui porque as 41 functions que
      // devolvem JSON passam todas por este helper; assim nenhuma fica de fora
      // e nenhuma precisa de ser editada. No site web (same-origin) é inócuo.
      // O preflight OPTIONS NÃO passa por aqui — ver respostaPreflight().
      ...CABECALHOS_CORS,
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
