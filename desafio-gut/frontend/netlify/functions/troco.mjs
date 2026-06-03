// MC17.1 — Endpoint das senhas de troco do lojista.
//
//  GET  /troco?cliente_id=0x...   -> saldo de troco (Bearer user-session; owner ou admin)
//       Resposta: { saldoTroco, expiramEmBreve, lotes, senhasExpiradasAgora, ... }
//
//  POST /troco?action=converter   -> converte N senhas de troco em senhas on-chain.
//       Bearer lance-auth (igual /comprar-senhas). Consome FIFO off-chain e credita
//       on-chain via creditarSenhas (a "ponte"). Em falha on-chain, devolve o troco.
//       Esta é a única forma de o lojista pôr senhas on-chain para licitar — não há
//       compra avulsa de senhas no fluxo do lojista (regra validada).

import {
  jsonResponse, jsonError, validarEndereco, validarQuantidadeFichas,
  parseJsonBody, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession, verificarLanceAuth } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { lerTroco, consumirTrocoFIFO, creditarTroco } from "./_lib/troco-senhas.mjs";
import { creditarSenhas, lerSaldoSenhas } from "./_lib/contract.mjs";

async function handleGet(req) {
  const url = new URL(req.url);
  let endereco;
  try { endereco = validarEndereco(url.searchParams.get("cliente_id")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  // Anti-IDOR: exige JWT user-session (owner) ou admin.
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) return jsonError(401, "token_ausente", "Authorization: Bearer <user-session> obrigatório — obtenha via POST /auth-user");
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");

  const troco = await lerTroco(endereco);
  return jsonResponse({ cliente_id: endereco, ...troco });
}

async function handleConverter(req) {
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) return jsonError(401, "token_ausente", "Authorization: Bearer <lance-auth> obrigatório — obtenha via POST /auth-lance");
  let jwtPayload;
  try { jwtPayload = await verificarLanceAuth(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token inválido ou expirado — obtenha novo via POST /auth-lance");
  }
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e qtd");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  let endereco, qtd;
  try {
    endereco = validarEndereco(body.endereco);
    qtd      = validarQuantidadeFichas(body.qtd);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  if (jwtPayload.endereco !== endereco) {
    return jsonError(403, "endereco_nao_corresponde", "token não pertence ao endereço informado");
  }

  // 1) Consome troco FIFO (off-chain). Falha aqui => nada on-chain.
  const consumo = await consumirTrocoFIFO({ endereco, qtd });
  if (!consumo.ok) {
    return jsonError(400, consumo.code || "troco_insuficiente", consumo.message, { saldoTroco: consumo.saldoTroco });
  }

  // 2) Credita on-chain. Em falha, devolve o troco (reembolso off-chain).
  let resultadoOnChain, senhasAntes, senhasDepois;
  try {
    senhasAntes = await lerSaldoSenhas(endereco);
    resultadoOnChain = await creditarSenhas(endereco, qtd);
    senhasDepois = await lerSaldoSenhas(endereco);
  } catch (err) {
    console.error("[troco] conversão on-chain falhou — devolvendo troco:", {
      endereco, qtd, message: err?.message, code: err?.code,
    });
    // Reembolso: recredita o troco (novo lote, validade renovada — aceitável e raro).
    await creditarTroco({ endereco, senhas: qtd, origem: "reembolso-conversao" });
    return jsonError(502, "conversao_onchain_falhou", err?.shortMessage || err?.message || "falha on-chain", {
      troco_reembolsado: true,
    });
  }

  return jsonResponse({
    ok: true,
    endereco,
    convertidas: qtd,
    trocoRestante: consumo.restante,
    senhasAntes,
    senhasDepois,
    txHash: resultadoOnChain.txHash,
    blockNumber: resultadoOnChain.blockNumber,
    etherscanUrl: `https://sepolia.etherscan.io/tx/${resultadoOnChain.txHash}`,
    processadoEm: new Date().toISOString(),
  });
}

export default async (req) => {
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "troco-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const url = new URL(req.url);
    if (url.searchParams.get("action") === "converter") {
      const rl = await aplicarRateLimit(req, "troco-converter", 5);
      if (rl) return rl;
      return handleConverter(req);
    }
    return jsonError(400, "action_invalida", 'use POST /troco?action=converter');
  }
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
