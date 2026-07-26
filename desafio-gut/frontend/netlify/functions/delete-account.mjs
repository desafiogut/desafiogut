// Exclusão de conta do titular — MC72 (conformidade com a política de
// "Exclusão de conta e dados" da Google Play Store, em vigor desde 2023).
//
// POST /.netlify/functions/delete-account
// Headers: Authorization: Bearer <user-session>
// Body:    { "endereco": "0x...", "dryRun"?: boolean }
//
// Autorização granular (idêntica a exportar-dados): owner (JWT.endereco ===
// body.endereco) OU admin. Rate-limited. dryRun=true simula e devolve o manifesto
// do que SERIA apagado/anonimizado, sem mutar (validação do operador — Pilar 1).
//
// Estratégia de dados: ver _lib/conta-delete.mjs
//   - hard-delete dos dados pessoais (Supabase + Blobs)
//   - anonimizar + reter os registros fiscais (PIX) por obrigação legal BR
//   - dados on-chain (contrato) são imutáveis → declarados como retidos.

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, ValidationError,
  parseJsonBody, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { registrarFalhaJwt } from "./_lib/jwt-fail-counter.mjs";
import { getSupabase, supabaseConfigurado } from "./_lib/supabase-client.mjs";
import { excluirConta } from "./_lib/conta-delete.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }
  // Exclusão é destrutiva: limite baixo (3/janela) para conter abuso/força-bruta.
  const rl = await aplicarRateLimit(req, "delete-account", 3);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const dryRun = body.dryRun === true;

  // ── Auth: user-session (owner) OU admin ────────────────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    await registrarFalhaJwt(req, "delete-account");
    return jsonError(401, "token_ausente", "Authorization: Bearer <user-session> obrigatório");
  }
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(token); }
  catch (err) {
    await registrarFalhaJwt(req, "delete-account");
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) {
    return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");
  }

  // Supabase é obrigatório para uma exclusão completa dos dados off-chain.
  if (!supabaseConfigurado()) {
    return jsonError(503, "supabase_indisponivel",
      "SUPABASE_URL/SERVICE_ROLE_KEY ausentes — exclusão não pode prosseguir com segurança");
  }

  // ── Execução ───────────────────────────────────────────────────────────────
  let manifesto;
  try {
    manifesto = await excluirConta({
      supabase: getSupabase(),
      getStore,
      endereco,
      dryRun,
    });
  } catch (err) {
    console.error("[delete-account] falha inesperada:", { endereco, message: err?.message });
    return jsonError(500, "exclusao_falhou", err?.message || "erro inesperado na exclusão");
  }

  const modo = dryRun ? "SIMULAÇÃO" : "EXCLUSÃO";
  console.info(`[delete-account] ${modo} concluída`, {
    endereco, papel: guard.papel, ok: manifesto.ok, erros: manifesto.erros.length,
  });

  // erros não vazios ⇒ exclusão parcial (207-like): reporta 500 com manifesto para
  // o titular/operador poder reprocessar as sub-operações que falharam.
  const status = manifesto.ok ? 200 : 500;
  return jsonResponse({
    ok: manifesto.ok,
    modo: dryRun ? "dry-run" : "executado",
    titular: endereco,
    executadoPor: guard.papel,
    manifesto,
  }, status);
};
