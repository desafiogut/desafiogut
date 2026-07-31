// GET /.netlify/functions/admin-financeiro-relatorio               [ADMIN]
// MC89.16 (Fase 5). Exportação CSV/JSON das transações do período.
// Gate: admin+. A exportação é registada em admin_logs (auditável).
// RL: 5/min.

import { jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { adminPode } from "./_lib/admin-niveis.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });

  const rl = await aplicarRateLimit(req, "admin-fin-csv", 5); if (rl) return rl;

  const auth = await autenticarAdmin(req);
  if (!auth.ok) return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  const nivel = auth.payload?.nivel || "admin";
  if (!adminPode(nivel, "admin")) return jsonError(403, "nivel_insuficiente", "Exige admin ou superior.");

  const url = new URL(req.url);
  const dias = parseInt(url.searchParams.get("periodo")) || 30;
  const desde = new Date(Date.now() - dias * 86400000).toISOString();

  // Log: exportar dados financeiros é auditável mesmo sendo leitura
  const ip = req.headers.get("x-forwarded-for") || null;
  let logId;
  try {
    const { id } = await registrarAcao({
      admin_endereco: auth.endereco, admin_nivel: nivel,
      tipo_acao: "exportar_relatorio_financeiro",
      justificativa: `Exportação CSV do período de ${dias} dias`,
      ip, user_agent: req.headers.get("user-agent") || null,
    });
    logId = id;
  } catch (err) {
    return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Exportação cancelada.");
  }

  try {
    const sb = getSupabaseReadOnly();
    const [rC, rD] = await Promise.all([
      sb.from("saldo_rs_creditos").select("pedido_id,payload,criado_em").gte("criado_em", desde).order("criado_em"),
      sb.from("saldo_rs_debitos").select("operacao_id,payload,criado_em").gte("criado_em", desde).order("criado_em"),
    ]);

    const creditos = (rC.data || []).map((c) => ({
      id: c.pedido_id, tipo: "credito", quando: c.criado_em,
      endereco: c.payload?.endereco, valor: c.payload?.valorCentavos,
      fonte: c.payload?.fonte, saldoDepois: c.payload?.saldoDepoisCentavos,
    }));
    const debitos = (rD.data || []).map((d) => ({
      id: d.operacao_id, tipo: "debito", quando: d.criado_em,
      endereco: d.payload?.endereco, valor: d.payload?.valorCentavos,
      fonte: d.payload?.fonte || d.payload?.origem, saldoDepois: d.payload?.saldoDepoisCentavos,
    }));
    const todas = [...creditos, ...debitos].sort((a, b) => (b.quando || "").localeCompare(a.quando || ""));

    // CSV
    const cabecalho = "id,tipo,data,endereco,valor_centavos,fonte,saldo_depois_centavos";
    const linhas = todas.map((t) =>
      `${t.id},${t.tipo},${t.quando},${t.endereco || ""},${t.valor || 0},${t.fonte || ""},${t.saldoDepois || ""}`);
    const csv = [cabecalho, ...linhas].join("\n");

    await confirmarAcao(logId, { sucesso: true });

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="desafiogut-financeiro-${new Date().toISOString().slice(0, 10)}.csv"`,
        ...require("./_lib/cors.mjs").CABECALHOS_CORS,
      },
    });
  } catch (err) {
    await confirmarAcao(logId, { sucesso: false, erro: err?.message });
    return jsonError(500, "exportacao_falhou", err?.message);
  }
};
