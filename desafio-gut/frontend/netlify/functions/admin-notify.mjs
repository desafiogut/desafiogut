// POST /.netlify/functions/admin-notify                          [ADMIN]
// MC89.18 (Fase 6). Envio de notificações in-app e e-mail.
// Canal "whatsapp" e "push" → 501 (não implementados).
// Gate: admin+. RL: 10/min. Log: fail-CLOSED.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { adminPode } from "./_lib/admin-niveis.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { adicionarNotificacao } from "./_lib/notificacoes-usuario.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  const rl = await aplicarRateLimit(req, "admin-notify", 10); if (rl) return rl;

  const auth = await autenticarAdmin(req);
  if (!auth.ok) return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  const nivel = auth.payload?.nivel || "admin";
  if (!adminPode(nivel, "admin")) return jsonError(403, "nivel_insuficiente", "Exige admin ou superior.");

  let body;
  try { body = await parseJsonBody(req); if (!body) return jsonError(400, "body_obrigatorio", "envie JSON"); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const { canal = "inapp", destino = "todos", ids = [], titulo = "", mensagem, link = "" } = body;
  if (!mensagem || !String(mensagem).trim()) return jsonError(400, "mensagem_obrigatoria", "campo 'mensagem' obrigatório");

  // Canais ainda não implementados
  if (canal === "whatsapp") return jsonError(501, "whatsapp_nao_implementado", "WhatsApp será implementado num MC próprio.");
  if (canal === "push")     return jsonError(501, "push_nao_implementado", "Push (FCM) será implementado após Firebase + APK novo.");

  const ip = req.headers.get("x-forwarded-for") || null;

  // ── Log fail-CLOSED ─────────────────────────────────────────────────
  let logId;
  try {
    const { id } = await registrarAcao({
      admin_endereco: auth.endereco, admin_nivel: nivel, tipo_acao: "enviar_notificacao",
      alvo: destino, justificativa: mensagem.slice(0, 80),
      payload: { canal, destino, titulo: titulo?.slice(0, 100) },
      ip, user_agent: req.headers.get("user-agent") || null,
    });
    logId = id;
  } catch (err) { return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Notificação NÃO enviada."); }

  // ── Resolver destinatários ──────────────────────────────────────────
  const sb = getSupabaseReadOnly();
  let enderecos = [];

  try {
    if (destino === "admins") {
      const { getAdminAddresses } = await import("./_lib/admin-helpers.mjs");
      enderecos = await getAdminAddresses();
    } else if (destino === "especifico") {
      enderecos = (Array.isArray(ids) ? ids : [ids]).map((s) => String(s).toLowerCase()).filter((s) => /^0x[0-9a-f]{40}$/.test(s));
    } else {
      // "todos" ou "segmento": lê da view
      const { data, error } = await sb.from("vw_utilizadores").select("cliente_id");
      if (error) throw new Error(error.message);
      enderecos = (data || []).map((u) => u.cliente_id).filter((s) => /^0x[0-9a-f]{40}$/.test(s));
    }
  } catch (err) {
    await confirmarAcao(logId, { sucesso: false, erro: err.message });
    return jsonError(500, "resolucao_destinos", "Não foi possível resolver os destinatários: " + err.message);
  }

  if (!enderecos.length) {
    await confirmarAcao(logId, { sucesso: true });
    return jsonResponse({ ok: true, mensagem: "Nenhum destinatário encontrado.", entregues: 0, total: 0 });
  }

  // ── Enviar ──────────────────────────────────────────────────────────
  let entregues = 0, falhas = 0;

  if (canal === "inapp") {
    for (const addr of enderecos) {
      try {
        await adicionarNotificacao(addr, {
          tipo: "admin", titulo: titulo?.slice(0, 120) || "Administração",
          mensagem: mensagem.slice(0, 500), link: link?.slice(0, 300) || null,
          timestamp: new Date().toISOString(), lida: false,
        });
        entregues++;
      } catch { falhas++; }
    }
  } else if (canal === "email") {
    // Tenta carregar o módulo de e-mail (import dinâmico — pode não existir)
    try {
      const { enviarEmail } = await import("./_lib/email.mjs");
      const comEmail = [];
      for (const addr of enderecos) {
        // O email só existe para cotas (3/7). Ver vw_utilizadores.
        const { data } = await sb.from("vw_utilizadores").select("email").eq("cliente_id", addr).maybeSingle();
        if (data?.email) comEmail.push({ endereco: addr, email: data.email });
      }
      for (const { endereco, email } of comEmail) {
        try {
          await enviarEmail({ para: email, assunto: titulo || "DESAFIOGUT", mensagem, link });
          entregues++;
        } catch { falhas++; }
      }
      // Guarda quantos tinham email
      await sb.from("notifications").insert({
        id: logId, canal, destino, titulo: titulo?.slice(0, 200), mensagem: mensagem.slice(0, 500),
        link, criado_por: auth.endereco, status: "enviado",
        entregues, total: enderecos.length, falhas,
        destino_ids: JSON.stringify(enderecos),
      });
    } catch {
      // _lib/email.mjs não existe → 501
      await confirmarAcao(logId, { sucesso: false, erro: "email_nao_configurado" });
      return jsonError(501, "email_nao_configurado", "Módulo de e-mail (_lib/email.mjs) não disponível. Instale @sendgrid/mail e crie o módulo.");
    }
  }

  // ── Registar no histórico ───────────────────────────────────────────
  if (canal === "inapp") {
    await sb.from("notifications").insert({
      id: logId, canal, destino, titulo: titulo?.slice(0, 200), mensagem: mensagem.slice(0, 500),
      link, criado_por: auth.endereco, status: "enviado",
      entregues, total: enderecos.length, falhas,
      destino_ids: JSON.stringify(enderecos),
    }).then(() => {}, () => {}); // fail-soft: histórico é secundário
  }

  await confirmarAcao(logId, { sucesso: true });
  return jsonResponse({
    ok: true, id: logId, canal, destino,
    mensagem: `Notificação enviada: ${entregues}/${enderecos.length} entregues.`,
    entregues, total: enderecos.length, falhas,
  });
};
