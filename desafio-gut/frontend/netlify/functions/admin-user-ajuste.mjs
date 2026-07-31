// POST /.netlify/functions/admin-user-ajuste                     [ADMIN]
//
// MC89.14 (Fase 4). Ajuste manual de saldo R$ (crédito ou débito auditável).
// Segue D-SALDO do MC89.5: nunca sobrescreve — escreve um débito ou crédito
// com fonte="ajuste-admin" e atualiza o saldo.
//
// Gate: super-admin (mexe em dinheiro real). Log: fail-CLOSED. RL: 5/min.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { adminPode } from "./_lib/admin-niveis.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { randomUUID } from "node:crypto";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  const rl = await aplicarRateLimit(req, "admin-user-ajuste", 5);
  if (rl) return rl;

  const auth = await autenticarAdmin(req);
  if (!auth.ok) {
    return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  }

  const endereco = auth.endereco;
  const nivel    = auth.payload?.nivel || "admin";
  if (!adminPode(nivel, "super-admin")) {
    return jsonError(403, "nivel_insuficiente", `Ajuste de saldo exige "super-admin". Nível: "${nivel}".`);
  }

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com cliente_id, valorCentavos e justificativa");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const { cliente_id, valorCentavos, justificativa } = body;
  if (!cliente_id || !/^0x[0-9a-f]{40}$/.test(String(cliente_id).toLowerCase())) {
    return jsonError(400, "cliente_id_invalido", "forneça um endereço Ethereum válido");
  }
  const valor = Number(valorCentavos);
  if (!Number.isFinite(valor) || valor === 0) {
    return jsonError(400, "valor_invalido", "valorCentavos deve ser um número diferente de zero");
  }
  if (!justificativa || String(justificativa).trim().length < 6) {
    return jsonError(400, "justificativa_obrigatoria", "justificativa obrigatória (mín. 6 caracteres)");
  }

  const addr = String(cliente_id).toLowerCase();
  const just = String(justificativa).trim();
  const operacaoId = randomUUID();
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-nf-client-connection-ip") || null;

  // ── Log fail-CLOSED ─────────────────────────────────────────────────
  const tipo = valor > 0 ? "creditar_usuario" : "debitar_usuario";
  let logId;
  try {
    const { id } = await registrarAcao({
      admin_endereco: endereco, admin_nivel: nivel,
      tipo_acao: tipo, alvo: addr, justificativa: just,
      payload: { valorCentavos: valor },
      ip, user_agent: req.headers.get("user-agent") || null,
    });
    logId = id;
  } catch (err) {
    console.error("[admin-user-ajuste] log fail-closed:", err?.message);
    return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Ação NÃO executada.");
  }

  // ── Executar ────────────────────────────────────────────────────────
  const sb = getSupabaseReadOnly();
  try {
    // 1) Ler saldo atual
    const { data: atual, error: errLeitura } = await sb.from("saldo_rs")
      .select("payload").eq("cliente_id", addr).maybeSingle();
    if (errLeitura) throw new Error("leitura saldo: " + errLeitura.message);

    const saldoAntes = (atual?.payload?.centavos) || 0;
    const saldoDepois = saldoAntes + valor;

    // 2) Escrever o movimento (crédito ou débito)
    if (valor > 0) {
      const { error: errInsert } = await sb.from("saldo_rs_creditos").insert({
        pedido_id: operacaoId,
        payload: {
          endereco: addr, valorCentavos: valor, fonte: "ajuste-admin",
          saldoAntesCentavos: saldoAntes, saldoDepoisCentavos: saldoDepois,
          processado: true, processadoEm: new Date().toISOString(),
        },
        criado_em: new Date().toISOString(),
      });
      if (errInsert) throw new Error(errInsert.message);
    } else {
      const { error: errInsert } = await sb.from("saldo_rs_debitos").insert({
        operacao_id: operacaoId,
        payload: {
          endereco: addr, valorCentavos: Math.abs(valor), fonte: "ajuste-admin",
          saldoAntesCentavos: saldoAntes, saldoDepoisCentavos: saldoDepois,
        },
        criado_em: new Date().toISOString(),
      });
      if (errInsert) throw new Error(errInsert.message);
    }

    // 3) Atualizar saldo_rs (upsert)
    const { error: errUpsert } = await sb.from("saldo_rs").upsert({
      cliente_id: addr,
      payload: { centavos: saldoDepois },
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "cliente_id" });
    if (errUpsert) throw new Error("upsert saldo: " + errUpsert.message);

    await confirmarAcao(logId, { sucesso: true });
    return jsonResponse({
      ok: true,
      operacao_id: operacaoId,
      cliente_id: addr,
      saldoAntes,
      saldoDepois,
      valor,
      mensagem: `Saldo ajustado: ${(saldoAntes / 100).toFixed(2)} → ${(saldoDepois / 100).toFixed(2)} BRL.`,
    });
  } catch (err) {
    await confirmarAcao(logId, { sucesso: false, erro: err?.message });
    return jsonError(500, "ajuste_falhou", err?.message);
  }
};
