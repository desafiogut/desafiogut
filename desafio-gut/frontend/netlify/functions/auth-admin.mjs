// POST /.netlify/functions/auth-admin
//
// Trades:
//   - acao="login":   { endereco, signature, message, adminToken }
//       Valida EIP-191 + ADMIN_TOKEN legado + endereco∈admins.
//       Retorna { accessToken, refreshToken, accessExpiresIn, refreshExpiresIn }.
//   - acao="refresh": { endereco, refreshToken }
//       Rotaciona o refresh — emite novo par e invalida o anterior.
//   - acao="logout":  { endereco }
//       Revoga TODOS os refresh tokens deste endereco.
//
// Fluxo de migração:
//   AdminPanel chama login UMA vez (com ADMIN_TOKEN legado colado pelo
//   admin). Depois mantém só o par access+refresh em memória + sessionStorage.
//   ADMIN_TOKEN é descartado da memória logo após o login.

import { verifyMessage } from "ethers";
import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { emitirParAdmin, rotacionarRefresh, revogarAdmin, TTL_ACCESS_SEC, TTL_REFRESH_SEC } from "./_lib/admin-auth.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { registrarFalhaJwt } from "./_lib/jwt-fail-counter.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }
  const rl = await aplicarRateLimit(req, "auth-admin", 10);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com acao");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  switch (body.acao) {
    case "login":   return acaoLogin(body, req);
    case "refresh": return acaoRefresh(body, req);
    case "logout":  return acaoLogout(body);
    default: return jsonError(400, "acao_invalida", 'acao deve ser "login", "refresh" ou "logout"');
  }
};

async function acaoLogin(body, req) {
  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const { signature, message, adminToken } = body;
  if (!signature || typeof signature !== "string") return jsonError(400, "signature_obrigatoria", "signature obrigatório (hex EIP-191)");
  if (!message || typeof message !== "string")     return jsonError(400, "message_obrigatoria", "message obrigatória");
  if (!adminToken || typeof adminToken !== "string") return jsonError(400, "admin_token_obrigatorio", "adminToken (legado) obrigatório no primeiro login");

  // ADMIN_TOKEN legado: aceita só durante a janela de migração.
  const expected = process.env.ADMIN_TOKEN;
  if (!expected)         return jsonError(503, "admin_token_nao_configurado", "ADMIN_TOKEN ausente no ambiente");
  if (adminToken !== expected) {
    await registrarFalhaJwt(req, "auth-admin");
    return jsonError(401, "admin_token_invalido", "adminToken legado inválido");
  }

  // Mensagem com formato + timestamp (anti-replay).
  if (!message.startsWith("DESAFIOGUT-ADMIN:")) {
    return jsonError(400, "message_invalida", "message deve começar com DESAFIOGUT-ADMIN:");
  }
  const parts = message.split(":");
  const ts = parseInt(parts[1], 10);
  if (!Number.isFinite(ts) || Date.now() - ts > 5 * 60 * 1000) {
    return jsonError(400, "message_expirada", "timestamp inválido ou > 5 min de skew");
  }
  if ((parts[2] || "").toLowerCase() !== endereco) {
    return jsonError(400, "message_endereco_divergente", "endereço na message não bate com body.endereco");
  }

  let recovered;
  try { recovered = verifyMessage(message, signature).toLowerCase(); }
  catch {
    await registrarFalhaJwt(req, "auth-admin");
    return jsonError(400, "assinatura_invalida", "não foi possível verificar a assinatura");
  }
  if (recovered !== endereco) {
    await registrarFalhaJwt(req, "auth-admin");
    return jsonError(401, "assinatura_nao_corresponde", "assinatura não pertence ao endereço informado");
  }

  const admins = await getAdminAddresses();
  if (!admins.includes(endereco)) {
    await registrarFalhaJwt(req, "auth-admin");
    return jsonError(403, "endereco_nao_admin", "endereço não está na lista de admins (Blob admin-list:admins ou coordenação)");
  }

  let par;
  try { par = await emitirParAdmin(endereco); }
  catch (err) {
    console.error("[auth-admin] emitirParAdmin falhou:", err?.message);
    return jsonError(500, "emissao_falhou", "não foi possível emitir credenciais admin");
  }

  console.info("[auth-admin] login ok", { endereco, jti: par.jti });
  return jsonResponse({
    accessToken:      par.accessToken,
    refreshToken:     par.refreshToken,
    accessExpiresIn:  par.accessExpiresIn,
    refreshExpiresIn: par.refreshExpiresIn,
    tokenType:        "Bearer",
  });
}

async function acaoRefresh(body, req) {
  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  if (!body.refreshToken || typeof body.refreshToken !== "string") {
    return jsonError(400, "refresh_obrigatorio", "refreshToken obrigatório");
  }
  // Defesa-em-profundidade: re-checa se o endereco ainda é admin.
  const admins = await getAdminAddresses();
  if (!admins.includes(endereco)) {
    return jsonError(403, "endereco_nao_admin", "endereço não está na lista de admins");
  }

  let par;
  try { par = await rotacionarRefresh(endereco, body.refreshToken); }
  catch (err) {
    await registrarFalhaJwt(req, "auth-admin-refresh");
    return jsonError(401, err?.code || "refresh_invalido", err?.message || "refresh rejeitado");
  }
  return jsonResponse({
    accessToken:      par.accessToken,
    refreshToken:     par.refreshToken,
    accessExpiresIn:  par.accessExpiresIn,
    refreshExpiresIn: par.refreshExpiresIn,
    tokenType:        "Bearer",
  });
}

async function acaoLogout(body) {
  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  try { await revogarAdmin(endereco); }
  catch (err) {
    console.warn("[auth-admin] logout falhou:", err?.message);
    return jsonError(500, "logout_falhou", "não foi possível revogar refresh tokens");
  }
  return jsonResponse({ ok: true, endereco, revogados: "todos" });
}

// Export constantes para docs / front.
export { TTL_ACCESS_SEC, TTL_REFRESH_SEC };
