// POST /.netlify/functions/admin-sessions-revoke                [ADMIN]
// MC89.20 (Fase 7). Revoga UMA sessão específica por jti.
// Gate: admin+ (super-admin revoga qualquer; admin só as suas).
// Log: fail-CLOSED.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { getAdminNivel } from "./_lib/admin-niveis.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { getStore } from "@netlify/blobs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  const rl = await aplicarRateLimit(req, "admin-sessions-revoke", 10); if (rl) return rl;

  const auth = await autenticarAdmin(req);
  if (!auth.ok) return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  const nivel = auth.payload?.nivel || "admin";
  const meuEndereco = auth.endereco;

  let body;
  try { body = await parseJsonBody(req); if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com jti"); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const { jti, endereco } = body;
  if (!jti) return jsonError(400, "jti_obrigatorio", "campo 'jti' obrigatório");

  const alvo = (endereco || meuEndereco).toLowerCase();
  const isSuper = nivel === "super-admin";
  if (!isSuper && alvo !== meuEndereco) {
    return jsonError(403, "nivel_insuficiente", "Só super-admin pode revogar sessões de outros admins.");
  }

  const ip = req.headers.get("x-forwarded-for") || null;
  let logId;
  try {
    const { id } = await registrarAcao({
      admin_endereco: meuEndereco, admin_nivel: nivel, tipo_acao: "revogar_sessao",
      alvo: alvo, justificativa: `Revogação da sessão ${jti}`,
      ip, user_agent: req.headers.get("user-agent") || null,
    });
    logId = id;
  } catch (err) { return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Sessão NÃO revogada."); }

  try {
    const store = getStore({ name: "admin-refresh", consistency: "strong" });
    const data = await store.get(alvo, { type: "json" });
    const tokens = Array.isArray(data?.tokens) ? data.tokens : [];
    const novas = tokens.filter((t) => t.jti !== jti);
    await store.setJSON(alvo, { tokens: novas, atualizadoEm: new Date().toISOString() });
    await confirmarAcao(logId, { sucesso: true });
    return jsonResponse({ ok: true, revogadas: tokens.length - novas.length, jti, endereco: alvo });
  } catch (err) {
    await confirmarAcao(logId, { sucesso: false, erro: err?.message });
    return jsonError(500, "revogacao_falhou", err?.message);
  }
};
