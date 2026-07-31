// GET/POST /.netlify/functions/admin-config                      [ADMIN]
// MC89.20 (Fase 7). Configurações do painel ADM (Blob admin-config).
// GET: operador+. POST: super-admin. Log: fail-CLOSED.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { adminPode } from "./_lib/admin-niveis.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { getStore } from "@netlify/blobs";
import { respostaPreflight } from "./_lib/cors.mjs";

const STORE = "admin-config";
const KEY   = "painel";
const PADRAO = { pollingInterval: 30, alertasAtivos: ["*"], limiarEoaEth: 0.005 };

async function ler() {
  try {
    const s = getStore({ name: STORE, consistency: "strong" });
    const d = await s.get(KEY, { type: "json" });
    return { ...PADRAO, ...(d || {}) };
  } catch { return { ...PADRAO }; }
}

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  const rl = await aplicarRateLimit(req, "admin-config", 10); if (rl) return rl;

  const auth = await autenticarAdmin(req);
  if (!auth.ok) return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  const nivel = auth.payload?.nivel || "admin";

  if (req.method === "GET") {
    if (!adminPode(nivel, "operador")) return jsonError(403, "nivel_insuficiente", "Exige operador ou superior.");
    return jsonResponse({ config: await ler() });
  }

  if (req.method === "POST") {
    if (!adminPode(nivel, "super-admin")) return jsonError(403, "nivel_insuficiente", "Alterar configurações exige super-admin.");

    let body;
    try { body = await parseJsonBody(req); if (!body) return jsonError(400, "body_obrigatorio", "envie JSON"); }
    catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

    const atual = await ler();
    const nova = {
      pollingInterval: typeof body.pollingInterval === "number" ? body.pollingInterval : atual.pollingInterval,
      alertasAtivos: Array.isArray(body.alertasAtivos) ? body.alertasAtivos : atual.alertasAtivos,
      limiarEoaEth: typeof body.limiarEoaEth === "number" ? body.limiarEoaEth : atual.limiarEoaEth,
    };

    // Log fail-CLOSED
    const ip = req.headers.get("x-forwarded-for") || null;
    let logId;
    try {
      const { id } = await registrarAcao({
        admin_endereco: auth.endereco, admin_nivel: nivel, tipo_acao: "alterar_config",
        justificativa: body.justificativa || "Alteração de configuração do painel",
        payload: { antes: atual, depois: nova },
        ip, user_agent: req.headers.get("user-agent") || null,
      });
      logId = id;
    } catch (err) { return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Config NÃO alterada."); }

    try {
      const s = getStore({ name: STORE, consistency: "strong" });
      await s.setJSON(KEY, { ...nova, atualizadoEm: new Date().toISOString(), atualizadoPor: auth.endereco });
      await confirmarAcao(logId, { sucesso: true });
      return jsonResponse({ ok: true, config: nova });
    } catch (err) {
      await confirmarAcao(logId, { sucesso: false, erro: err?.message });
      return jsonError(500, "gravacao_falhou", err?.message);
    }
  }

  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
