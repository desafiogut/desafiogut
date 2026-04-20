import DOMPurify from "dompurify";

/**
 * Sanitiza strings vindas de inputs ou da blockchain antes de renderizar.
 * Previne XSS e injeção de HTML.
 */
export function sanitizeString(value) {
  if (typeof value !== "string") return "";
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Valida e sanitiza um valor de lance em centavos.
 * Retorna null se inválido.
 */
export function sanitizeLance(value) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1 || num > 999999) return null;
  return num;
}

/**
 * Sanitiza endereço Ethereum: aceita apenas o formato 0x + 40 hex chars.
 */
export function sanitizeAddress(address) {
  if (typeof address !== "string") return "";
  const clean = address.trim();
  return /^0x[0-9a-fA-F]{40}$/.test(clean) ? clean : "";
}

/**
 * Sanitiza ID de edição: apenas alfanumérico e hífen.
 */
export function sanitizeEdicaoId(id) {
  if (typeof id !== "string") return "";
  return id.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 20);
}
