// POST /.netlify/functions/auth-lance
// Body: { endereco: "0x...", signature: "0x...", message: "DESAFIOGUT-AUTH:<ts>:<endereco>" }
// Resposta 200: { token, ttl }  — JWT { endereco, tipo:"lance-auth" } válido 10 min
// Resposta 400/401: { error: { code, message } }
//
// Emite token de autorização para lance-relampago após verificar que o
// remetente é dono do endereço via signMessage EIP-191.

import { verifyMessage } from "ethers";
import { assinarLanceAuth } from "./_lib/jwt.mjs";
import {
  validarEndereco,
  jsonResponse, jsonError,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";

const TTL_LANCE_AUTH = 10 * 60; // 10 min

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST");
  }

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

  // Valida formato para prevenir replay de outros contextos
  if (!message.startsWith("DESAFIOGUT-AUTH:")) {
    return jsonError(400, "message_invalida", "message deve começar com DESAFIOGUT-AUTH:");
  }

  // Valida timestamp na mensagem (max 5 min de skew)
  const parts = message.split(":");
  const ts = parseInt(parts[1], 10);
  if (!Number.isFinite(ts) || Date.now() - ts > 5 * 60 * 1000) {
    return jsonError(400, "message_expirada", "timestamp da message inválido ou expirado (max 5 min)");
  }

  // Verifica que o endereço na mensagem corresponde ao body.endereco
  const enderecoNaMensagem = (parts[2] || "").toLowerCase();
  if (enderecoNaMensagem !== endereco) {
    return jsonError(400, "message_endereco_divergente", "endereço na message não bate com body.endereco");
  }

  // Verifica assinatura EIP-191 — recupera o signatário
  let recovered;
  try {
    recovered = verifyMessage(message, signature).toLowerCase();
  } catch {
    return jsonError(400, "assinatura_invalida", "não foi possível verificar a assinatura");
  }

  if (recovered !== endereco) {
    return jsonError(401, "assinatura_nao_corresponde", "assinatura não pertence ao endereço informado");
  }

  // Emite JWT lance-auth
  let token;
  try {
    token = await assinarLanceAuth(endereco, TTL_LANCE_AUTH);
  } catch (err) {
    console.error("[auth-lance] assinarLanceAuth falhou:", err?.message);
    return jsonError(500, "jwt_indisponivel", "configuração de servidor incompleta");
  }

  console.info("[auth-lance] token emitido", { endereco });
  return jsonResponse({ token, ttl: TTL_LANCE_AUTH });
};
