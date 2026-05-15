// POST /.netlify/functions/auth-user
// Body: { endereco: "0x...", signature: "0x...", message: "DESAFIOGUT-AUTH:<ts>:<endereco>" }
// Resposta 200: { token, ttl }  — JWT { endereco, tipo:"user-session" } válido 24h
// Resposta 400/401: { error: { code, message } }
//
// Emite token de sessão de usuário para endpoints GET sensíveis (wallet,
// saldo-rs, renovacao-adesao, voucher). Idêntico ao auth-lance mas com:
//   - tipo "user-session" (não "lance-auth")
//   - TTL padrão 24h (vs 10 min de lance-auth)
// Fluxo EIP-191 reutilizado tal qual.

import { verifyMessage } from "ethers";
import { assinarUserSession } from "./_lib/jwt.mjs";
import {
  validarEndereco,
  jsonResponse, jsonError,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";

const TTL_USER_SESSION = 24 * 60 * 60; // 24h

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST");
  }

  const rl = await aplicarRateLimit(req, "auth-user", 10);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco, signature, message");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco;
  try {
    endereco = validarEndereco(body.endereco);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const { signature, message } = body;
  if (!signature || typeof signature !== "string") {
    return jsonError(400, "signature_obrigatoria", "campo signature obrigatório (hex EIP-191)");
  }
  if (!message || typeof message !== "string") {
    return jsonError(400, "message_obrigatoria", "campo message obrigatório");
  }

  if (!message.startsWith("DESAFIOGUT-AUTH:")) {
    return jsonError(400, "message_invalida", "message deve começar com DESAFIOGUT-AUTH:");
  }

  const parts = message.split(":");
  const ts = parseInt(parts[1], 10);
  if (!Number.isFinite(ts) || Date.now() - ts > 5 * 60 * 1000) {
    return jsonError(400, "message_expirada", "timestamp da message inválido ou expirado (max 5 min)");
  }

  const enderecoNaMensagem = (parts[2] || "").toLowerCase();
  if (enderecoNaMensagem !== endereco) {
    return jsonError(400, "message_endereco_divergente", "endereço na message não bate com body.endereco");
  }

  let recovered;
  try {
    recovered = verifyMessage(message, signature).toLowerCase();
  } catch {
    return jsonError(400, "assinatura_invalida", "não foi possível verificar a assinatura");
  }
  if (recovered !== endereco) {
    return jsonError(401, "assinatura_nao_corresponde", "assinatura não pertence ao endereço informado");
  }

  let token;
  try {
    token = await assinarUserSession(endereco, TTL_USER_SESSION);
  } catch (err) {
    console.error("[auth-user] assinarUserSession falhou:", err?.message);
    return jsonError(500, "jwt_indisponivel", "configuração de servidor incompleta");
  }

  console.info("[auth-user] sessão emitida", { endereco });
  return jsonResponse({ token, ttl: TTL_USER_SESSION });
};
