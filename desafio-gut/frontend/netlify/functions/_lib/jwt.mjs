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

export async function assinarLanceAuth(endereco, ttlSec = 600) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  return await new SignJWT({ endereco, tipo: "lance-auth" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(KEY);
}

export async function verificarLanceAuth(token) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  const { payload } = await jwtVerify(token, KEY, { algorithms: ["HS256"] });
  if (payload.tipo !== "lance-auth") {
    const err = new Error("token tipo inválido — esperado lance-auth");
    err.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    throw err;
  }
  return payload;
}

// User session JWT — usado por endpoints GET sensíveis (wallet, saldo-rs,
// renovacao-adesao, voucher) para protegê-los contra IDOR. TTL 24h por padrão.
export async function assinarUserSession(endereco, ttlSec = 86400) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  return await new SignJWT({ endereco, tipo: "user-session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(KEY);
}

export async function verificarUserSession(token) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  const { payload } = await jwtVerify(token, KEY, { algorithms: ["HS256"] });
  if (payload.tipo !== "user-session" && payload.tipo !== "admin-access") {
    // admin-access também desbloqueia rotas user-session (admin sees all).
    const err = new Error("token tipo inválido — esperado user-session ou admin-access");
    err.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    throw err;
  }
  return payload;
}

// Admin access JWT — emitido por /auth-admin, TTL 15 min por padrão.
export async function assinarAdminAccess(endereco, ttlSec = 900) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  return await new SignJWT({ endereco, tipo: "admin-access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(KEY);
}

export async function verificarAdminAccess(token) {
  if (!KEY) throw new Error("JWT_SECRET não configurado");
  const { payload } = await jwtVerify(token, KEY, { algorithms: ["HS256"] });
  if (payload.tipo !== "admin-access") {
    const err = new Error("token tipo inválido — esperado admin-access");
    err.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    throw err;
  }
  return payload;
}
