// POST /.netlify/functions/admin-user-bloqueio                  [ADMIN]
//
// MC89.14 (Fase 4). Bloqueia ou desbloqueia um utilizador.
//
// ⚠️ O bloqueio é APENAS O REGISTO nesta fase. Os gates de emissão de sessão
// e de endpoints de dinheiro ainda não leem esta tabela. Um utilizador
// "bloqueado" aqui não está realmente impedido de fazer nada — isso é um MC
// próprio. O ecrã documenta esta limitação.
//
// Gate: admin+. Log: fail-CLOSED. RL: 5/min.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { adminPode } from "./_lib/admin-niveis.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  const rl = await aplicarRateLimit(req, "admin-user-bloqueio", 5);
  if (rl) return rl;

  const auth = await autenticarAdmin(req);
  if (!auth.ok) {
    return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  }

  const endereco = auth.endereco;
  const nivel    = auth.payload?.nivel || "admin";
  if (!adminPode(nivel, "admin")) {
    return jsonError(403, "nivel_insuficiente", `Exige "admin" ou superior. Nível: "${nivel}".`);
  }

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com cliente_id e bloquear");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const { cliente_id, bloquear, justificativa } = body;
  if (!cliente_id || !/^0x[0-9a-f]{40}$/.test(String(cliente_id).toLowerCase())) {
    return jsonError(400, "cliente_id_invalido", "forneça um endereço Ethereum válido");
  }
  if (typeof bloquear !== "boolean") {
    return jsonError(400, "bloquear_invalido", "'bloquear' deve ser true ou false");
  }
  if (!justificativa || String(justificativa).trim().length < 6) {
    return jsonError(400, "justificativa_obrigatoria", "justificativa obrigatória (mín. 6 caracteres)");
  }

  const addr = String(cliente_id).toLowerCase();
  const just = String(justificativa).trim();
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-nf-client-connection-ip") || null;

  // ── Log fail-CLOSED ─────────────────────────────────────────────────
  const acao = bloquear ? "bloquear_usuario" : "desbloquear_usuario";
  let logId;
  try {
    const { id } = await registrarAcao({
      admin_endereco: endereco, admin_nivel: nivel,
      tipo_acao: acao, alvo: addr, justificativa: just,
      ip, user_agent: req.headers.get("user-agent") || null,
    });
    logId = id;
  } catch (err) {
    console.error("[admin-user-bloqueio] log fail-closed:", err?.message);
    return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Ação NÃO executada.");
  }

  // ── Executar ────────────────────────────────────────────────────────
  const sb = getSupabaseReadOnly();
  try {
    if (bloquear) {
      const { error } = await sb.from("usuarios_bloqueio").insert({
        cliente_id: addr, bloqueado_por: endereco, justificativa: just,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("usuarios_bloqueio")
        .update({ desbloqueado_em: new Date().toISOString(), desbloqueado_por: endereco })
        .eq("cliente_id", addr)
        .is("desbloqueado_em", null);
      if (error) throw new Error(error.message);
    }
    await confirmarAcao(logId, { sucesso: true });
    return jsonResponse({
      ok: true,
      acao,
      cliente_id: addr,
      mensagem: bloquear
        ? "Utilizador bloqueado. ⚠️ Os gates de sessão e de pagamento ainda não leem esta tabela — o bloqueio é apenas o registo."
        : "Utilizador desbloqueado.",
    });
  } catch (err) {
    await confirmarAcao(logId, { sucesso: false, erro: err?.message });
    return jsonError(500, "bloqueio_falhou", err?.message);
  }
};
