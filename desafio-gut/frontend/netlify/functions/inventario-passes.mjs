// GET /.netlify/functions/inventario-passes?endereco=0x...
// UTAC120 — inventário de Passes do utilizador (Relâmpago / Programado).
//
// Resposta 200: { ok:true, endereco, passesRelampago, passesProgramado }
// 400 endereco_obrigatorio|endereco_invalido · 401 token_ausente|token_invalido|token_expirado
// 403 acesso_negado · 405 metodo_invalido · 429 rate_limited · 502 inventario_indisponivel
//
// Anti-IDOR igual ao `saldo-rs`: exige sessão do próprio endereço (ou admin).
import {
  jsonResponse, jsonError, validarEndereco, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { lerInventario } from "./_lib/passes-inventario.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }
  const rl = await aplicarRateLimit(req, "inventario-passes", 40);
  if (rl) return rl;

  const url = new URL(req.url);
  const enderecoBruto = url.searchParams.get("endereco");
  if (!enderecoBruto) return jsonError(400, "endereco_obrigatorio", "use ?endereco=0x...");

  let endereco;
  try { endereco = validarEndereco(enderecoBruto); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const authHeader = req.headers.get("authorization") || "";
  const authToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) {
    return jsonError(401, "token_ausente", "Authorization: Bearer *** obrigatório — obtenha via POST /auth-user");
  }
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");

  const inv = await lerInventario(endereco);
  if (!inv.ok) return jsonError(502, "inventario_indisponivel", "não foi possível ler o inventário de Passes");

  return jsonResponse({
    ok: true,
    endereco,
    passesRelampago: inv.passesRelampago,
    passesProgramado: inv.passesProgramado,
  });
};
