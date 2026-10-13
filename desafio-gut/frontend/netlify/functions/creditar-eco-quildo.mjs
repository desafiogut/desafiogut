// POST /.netlify/functions/creditar-eco-quildo — UTAC110e. [ADMIN] Emite ECOQUILDO manualmente.
//
// Uso: correcções/boas-vindas/indicação operadas pelo admin (Art. 51º) e reparação de incidentes.
// ⚠️ NÃO é um caminho de COMPRA: não existe endpoint que venda ECOQUILDO por dinheiro (R18 / §3 do
//    enunciado). Quem emite tem de existir reserva em R$ (Art. 50º) — o lastro é actualizado no mesmo
//    passo e, se falhar, a emissão é REVERTIDA (nunca fica ECOQUILDO sem lastro).
//
// Gate: `guardAdmin` (como o enunciado fixa em B3).
// ⚠️ Medido no SEG-1 (§-1.9, conflito 5): o único endpoint do repo que mexe em saldo R$ do utilizador
//    (`admin-user-ajuste.mjs`) exige `super-admin` **+ justificativa**. Aqui o nível fica em `admin`
//    porque é o que o enunciado diz — subir para `super-admin` é 1 linha (`guardAdminNivel`), decisão
//    do operador registada como pendência.
// Auditoria: `admin_logs` fail-CLOSED (doutrina do MC89.11; medido em produção no SEG-1: `admin_logs`
//    NÃO tem CHECK em `tipo_acao` ⇒ um valor novo é aceite).
//
// Header: Authorization: Bearer ***  (admin)
// Body: { endereco, valor, motivo ∈ {passe-relampago,passe-programado,boas-vindas,indicacao}, chave, justificativa? }
//
// 201 { ok, idempotent:false, endereco, saldo, motivo, lastro }
// 200 { ok, idempotent:true, endereco, saldo, motivo }
// 400 endereco_invalido|valor_invalido|motivo_invalido|chave_invalida
// 401/403 (guardAdmin) · 405 metodo_invalido · 409 conflito_concorrencia
// 502 credito_falhou|lastro_falhou · 503 log_indisponivel|sistema_pausado|store_indisponivel
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { captureSecurityAlert } from "./_lib/sentry-server.mjs";
import {
  creditarEcoQuildo, reverterEcoQuildo, registarEmissaoNoLastro, reverterEmissaoNoLastro,
  MOTIVOS_EMISSAO, refCreditoAdmin,
} from "./_lib/eco-quildo.mjs";

const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const CHAVE_RE = /^[A-Za-z0-9._:-]{8,180}$/;

function erroDeCredito(code, extra = {}) {
  if (code === "MOTIVO_INVALIDO") return jsonError(400, "motivo_invalido", `motivo deve ser um de: ${MOTIVOS_EMISSAO.join(", ")}`);
  if (code === "VALOR_INVALIDO") return jsonError(400, "valor_invalido", "valor deve ser um inteiro positivo (ECOQUILDO)");
  if (code === "REF_INVALIDA") return jsonError(400, "chave_invalida", "envie `chave` (8–180 chars [A-Za-z0-9._:-])");
  if (code === "ENDERECO_INVALIDO") return jsonError(400, "endereco_invalido", "forneça um endereço Ethereum válido");
  if (code === "CONFLITO_CONCORRENCIA") return jsonError(409, "conflito_concorrencia", "tente novamente", extra);
  return jsonError(502, "credito_falhou", "não foi possível creditar o ECOQUILDO", { motivo: code, ...extra });
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, "creditar-eco-quildo", 5);
  if (rl) return rl;

  // Autenticação: `autenticarAdmin` é a MESMA guarda que o `guardAdmin` envolve — usada directamente porque
  // o registo de auditoria precisa do endereço/nível do admin (o `guardAdmin` devolve só `null`/Response).
  const auth = await autenticarAdmin(req);
  if (!auth.ok) {
    return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);
  }
  const adminEndereco = auth.endereco;
  const adminNivel = auth.payload?.nivel || "admin";

  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const endereco = String(body?.endereco ?? "").toLowerCase();
  if (!ENDERECO_RE.test(endereco)) return jsonError(400, "endereco_invalido", "forneça um endereço Ethereum válido");

  const valor = body?.valor;
  if (!Number.isInteger(valor) || valor <= 0) return jsonError(400, "valor_invalido", "valor deve ser um inteiro positivo (ECOQUILDO)");

  const motivo = String(body?.motivo ?? "");
  if (!MOTIVOS_EMISSAO.includes(motivo)) {
    return jsonError(400, "motivo_invalido", `motivo deve ser um de: ${MOTIVOS_EMISSAO.join(", ")}`);
  }

  const chave = String(body?.chave ?? "");
  if (!CHAVE_RE.test(chave)) return jsonError(400, "chave_invalida", "envie `chave` (8–180 chars [A-Za-z0-9._:-])");
  const ref = refCreditoAdmin(chave);

  // ── Auditoria fail-CLOSED (doutrina MC89.11): sem registo, não há emissão de moeda. ──────────────
  let logId;
  try {
    const r = await registrarAcao({
      admin_endereco: adminEndereco,
      admin_nivel: adminNivel,
      tipo_acao: "creditar_eco_quildo",
      alvo: endereco,
      justificativa: typeof body?.justificativa === "string" && body.justificativa.trim().length >= 6
        ? body.justificativa.trim()
        : `emissao de ${valor} ECOQUILDO (${motivo})`,
      payload: { valor, motivo, ref },
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-nf-client-connection-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
    });
    logId = r.id;
  } catch (err) {
    console.error("[creditar-eco-quildo] log fail-closed:", err?.message);
    return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Ação NÃO executada.");
  }

  const c = await creditarEcoQuildo(endereco, valor, motivo, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
  if (!c.ok) {
    await confirmarAcao(logId, { sucesso: false, erro: c.code ?? "ERRO_DB" }).catch(() => {});
    return erroDeCredito(c.code);
  }
  if (c.criado === false) {
    await confirmarAcao(logId, { sucesso: true, erro: "idempotente" }).catch(() => {});
    return jsonResponse({ ok: true, idempotent: true, endereco, saldo: c.saldo, motivo }, 200);
  }

  const l = await registarEmissaoNoLastro(valor).catch(() => ({ ok: false, code: "ERRO_DB" }));
  if (!l.ok) {
    const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!(rev.ok && rev.revertido)) {
      captureSecurityAlert("creditar_eco_quildo_reversao_falhou", { code: rev.code ?? null }, "error").catch(() => {});
    }
    await confirmarAcao(logId, { sucesso: false, erro: `lastro: ${l.code}` }).catch(() => {});
    return jsonError(502, "lastro_falhou", "não foi possível actualizar o lastro",
      { motivo: l.code, desfeito: rev.ok === true && rev.revertido === true });
  }

  await confirmarAcao(logId, { sucesso: true }).catch(() => {});
  return jsonResponse({
    ok: true, idempotent: false, endereco, saldo: c.saldo, motivo,
    lastro: { total_emitido: l.total_emitido, total_usado: l.total_usado, reserva_rs_centavos: l.reserva_rs_centavos },
  }, 201);
};
