// Assina/verifica tokens HS256 que materializam um pedido entre /iniciar-pagamento
// e /confirmar-pagamento. Stateless: não dependemos de DB para o JWT em si — a
// idempotência (não creditar duas vezes o mesmo pedidoId) é cuidada por
// Netlify Blobs no /confirmar-pagamento.

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

const SECRET = process.env.JWT_SECRET;
const KEY = SECRET ? new TextEncoder().encode(SECRET) : null;

if (!SECRET) {
  // Não throw na importação para permitir que /health rode sem JWT_SECRET
  // configurado e reporte o estado em vez de derrubar a função inteira.
  console.warn("[jwt] JWT_SECRET ausente — assinarPedido/verificarPedido vão falhar");
}

/**
 * @param {{ pedidoId: string, endereco: string, qtd: number, valorBRL: number }} payload
 * @param {number} ttlSec — segundos até expirar (default 900s = 15min, suficiente p/ usuário pagar PIX)
 */
export async function assinarPedido(payload, ttlSec = 900) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(KEY);
}

/**
 * Retorna o payload original. Lança se assinatura inválida ou expirado.
 * Caller pode discriminar por err.code (ERR_JWT_EXPIRED, ERR_JWS_SIGNATURE_VERIFICATION_FAILED, ...).
 */
export async function verificarPedido(token) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  const { payload } = await jwtVerify(token, KEY, { algorithms: ["HS256"] });
  return payload;
}

export { joseErrors };
