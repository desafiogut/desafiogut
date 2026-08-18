// GET /.netlify/functions/saldo-senhas?endereco=0x...
// MC91.11 — saldo de senhas EFETIVO do utilizador:
//   saldoEfetivo = saldoOnChain (contrato LeilaoGUT) − senhasConsumidas
//                  (ledger off-chain de lances programados)
// Resposta 200: { endereco, saldoOnChain, senhasConsumidas, saldoEfetivo }
// Resposta 400: { error: { code, message } }
//
// Read-only. Anti-IDOR: exige JWT user-session do dono (ou admin) — mesmo
// padrão do saldo-rs. O ledger só é mutado por lance-relampago (modo
// programado); o saldo on-chain só por comprar-senhas (adicionarSenhas).

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { lerSaldoSenhas } from "./_lib/contract.mjs";
import { lerConsumoSenhas, BLOB_SENHAS_CONSUMO } from "./_lib/senhas-programado.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }
  const rl = await aplicarRateLimit(req, "saldo-senhas", 30);
  if (rl) return rl;
  const url = new URL(req.url);
  const enderecoBruto = url.searchParams.get("endereco");
  if (!enderecoBruto) {
    return jsonError(400, "endereco_obrigatorio", "use ?endereco=0x...");
  }
  let endereco;
  try { endereco = validarEndereco(enderecoBruto); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Anti-IDOR: exige JWT user-session ou admin.
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) return jsonError(401, "token_ausente", "Authorization: Bearer *** obrigatório — obtenha via POST /auth-user");
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");

  // Saldo on-chain (fonte de verdade do teto).
  const saldoOnChain = await lerSaldoSenhas(endereco);

  // Ledger de consumo em lances programados (fail-soft: sem ledger, efetivo =
  // on-chain).
  let senhasConsumidas = 0;
  try {
    const store = getStore({ name: BLOB_SENHAS_CONSUMO, consistency: "strong" });
    const reg = await lerConsumoSenhas(store, endereco);
    senhasConsumidas = Number(reg?.consumidas ?? 0);
  } catch (err) {
    console.warn("[saldo-senhas] ledger indisponível (efetivo = on-chain):", err?.message);
  }

  const saldoEfetivo = Math.max(0, saldoOnChain - senhasConsumidas);
  return jsonResponse({
    endereco,
    saldoOnChain,
    senhasConsumidas,
    saldoEfetivo,
  });
};
