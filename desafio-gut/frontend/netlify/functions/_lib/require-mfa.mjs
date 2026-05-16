// require-mfa.mjs — Mega Comando 7 / Item 1.
//
// Middleware que verifica a claim `mfa_verified` no JWT já autenticado pelo
// caller. NÃO assina nem verifica JWT — recebe o payload já decodificado.
//
// Modos (via env MFA_ENFORCEMENT):
//   - "off"     → no-op (default). Compatibilidade total com mundo pré-MFA.
//   - "warn"    → log de violações via console.warn, mas permite a operação.
//                  Útil para mapear quem ainda não tem MFA antes do enforce.
//   - "enforce" → bloqueia com 403 + body `{ mfa_required: true }` se a claim
//                  estiver ausente ou for diferente de `true`.
//
// Phase 2 (futura, ver docs/mfa-setup.md): `/auth-admin` e `/auth-user` vão
// consultar Privy MFA API antes de assinar JWT e injetar `mfa_verified: true`
// quando o usuário tiver MFA verificado na sessão atual. Este middleware
// está pronto para receber esse fluxo sem mudanças adicionais.

import { jsonError } from "./validate.mjs";

const MODOS = new Set(["off", "warn", "enforce"]);

function getModo() {
  const m = String(process.env.MFA_ENFORCEMENT || "off").toLowerCase().trim();
  return MODOS.has(m) ? m : "off";
}

/**
 * Gate MFA. Caller já validou o JWT (ex: via `verificarLanceAuth`,
 * `verificarUserSession`, `autenticarAdmin`) e passa o `payload` decodificado.
 *
 * @param {Request} req — só usado para logs estruturados (não muta o request)
 * @param {object|null} jwtPayload — payload do JWT autenticado (ou null para
 *   ADMIN_TOKEN legado — tratado como "sem MFA")
 * @param {string} contexto — nome curto da rota para logs (ex: "comprar-senhas")
 * @returns {Response|null} — null se passou; Response 403 se enforce bloqueou
 */
export function requireMfa(req, jwtPayload, contexto) {
  const modo = getModo();
  if (modo === "off") return null;

  const mfaOk = jwtPayload?.mfa_verified === true;
  if (mfaOk) return null;

  const subject = jwtPayload?.endereco || "anonimo";
  console.warn(`[require-mfa:${modo}] ${contexto} sem MFA verificado — endereco=${subject}`);

  if (modo === "warn") return null;

  // enforce
  return jsonError(403, "mfa_required", "Esta operação exige MFA verificado", {
    mfa_required: true,
    docs: "docs/mfa-setup.md",
  });
}

// Export do modo atual — útil para `/health` reportar postura de segurança.
export function getMfaEnforcementMode() {
  return getModo();
}
