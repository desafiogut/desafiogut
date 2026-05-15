// GET /.netlify/functions/saldo-rs?endereco=0x...
// Resposta 200: { endereco, saldoCentavos, saldoBRL }
// Resposta 400: { error: { code, message } }
//
// Read-only. Não autentica — saldo é por endereço e o blob só pode ser mutado
// pelas functions (PIX confirmado, comprar-senhas, lance-relampago).

import {
  jsonResponse, jsonError, validarEndereco, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { lerSaldoRsCentavos } from "./_lib/saldoRs.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";

export default async (req) => {
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }
  const rl = await aplicarRateLimit(req, "saldo-rs", 30);
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

  const centavos = await lerSaldoRsCentavos(endereco);
  return jsonResponse({
    endereco,
    saldoCentavos: centavos,
    saldoBRL: Number((centavos / 100).toFixed(2)),
  });
};
