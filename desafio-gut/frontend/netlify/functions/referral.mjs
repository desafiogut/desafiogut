// Endpoint /referral — Mega Comando 10 / Item 2.
//
// GET  ?acao=meu-codigo&endereco=0x...   → { codigo, total_indicados, total_convertidos, senhas_ganhas }
//   Anti-IDOR: exige JWT user-session do owner OU admin (mesmo padrão de /saldo-rs).
//
// POST ?acao=usar-codigo                 → registra indicação
//   Body: { codigo_indicacao, endereco }
//   Header: X-Visitor-ID (opcional — usado pelo anti-fraude FingerprintJS)
//   Auth: JWT user-session do `endereco`.
//
// Rate-limit: 5 reqs/min/IP (padrão MC1 para endpoints sensíveis).
// Feature flag: REFERRAL_ATIVO=on (default) | off → 503.

import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import {
  gerarCodigoIndicacao, validarCodigoIndicacao, registrarIndicacao,
  estatisticasIndicador, referralAtivo,
} from "./_lib/referral.mjs";

const RATE_LIMIT_RPM = 5;
const VISITOR_RE     = /^[a-zA-Z0-9_-]{4,128}$/;

function extrairToken(req) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

async function autenticarUser(req) {
  const token = extrairToken(req);
  if (!token) return { ok: false, code: "token_ausente", message: "Authorization: Bearer <user-session> obrigatório — POST /auth-user" };
  try {
    const payload = await verificarUserSession(token);
    return { ok: true, payload };
  } catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return { ok: false, code, message: "token inválido ou expirado" };
  }
}

async function handleMeuCodigo(req, url) {
  let endereco;
  try { endereco = validarEndereco(url.searchParams.get("endereco")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  // Anti-IDOR: só o próprio (ou admin) pode ler seu painel.
  const auth = await autenticarUser(req);
  if (!auth.ok) return jsonError(401, auth.code, auth.message);
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(auth.payload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");

  // Gera (ou recupera) o código pessoal. Idempotente.
  let codigoInfo;
  try { codigoInfo = await gerarCodigoIndicacao(endereco); }
  catch (err) {
    console.error("[referral] gerarCodigoIndicacao falhou:", err?.message);
    return jsonError(503, err?.message || "store_indisponivel", "não foi possível gerar/recuperar código de indicação");
  }
  const stats = await estatisticasIndicador(endereco);
  return jsonResponse({
    endereco,
    codigo:             codigoInfo.codigo,
    novo:               codigoInfo.novo,
    total_indicados:    stats.total_indicados,
    total_convertidos:  stats.total_convertidos,
    senhas_ganhas:      stats.senhas_ganhas,
  });
}

async function handleUsarCodigo(req) {
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com codigo_indicacao e endereco");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const codigo = typeof body.codigo_indicacao === "string" ? body.codigo_indicacao.trim().toUpperCase() : null;
  if (!codigo || !/^IND-[A-Z0-9]{6}$/.test(codigo)) {
    return jsonError(400, "codigo_invalido", "codigo_indicacao deve casar com IND-XXXXXX (6 alfanuméricos maiúsculos)");
  }

  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // JWT user-session do próprio indicado (anti-IDOR — alguém não pode
  // registrar indicação no nome de outro endereço).
  const auth = await autenticarUser(req);
  if (!auth.ok) return jsonError(401, auth.code, auth.message);
  if (auth.payload?.endereco !== endereco) {
    return jsonError(403, "endereco_nao_corresponde", "token não pertence ao endereço informado");
  }

  // visitorId opcional via header X-Visitor-ID (padrão dos outros endpoints).
  const vidRaw = req.headers.get("x-visitor-id");
  const visitorId = (typeof vidRaw === "string" && VISITOR_RE.test(vidRaw)) ? vidRaw : null;

  const r = await registrarIndicacao(codigo, endereco, visitorId);
  if (!r.ok) {
    // Mapeia motivo → status HTTP. Auto-indicação e código inexistente são 400.
    const status =
      r.code === "feature_desligada"     ? 503 :
      r.code === "auto_indicacao"        ? 400 :
      r.code === "ja_indicado"           ? 409 :
      r.code === "codigo_inexistente"    ? 404 :
      r.code === "mesmo_dispositivo"     ? 403 :
      r.code === "sybil_suspeito"        ? 403 :
      r.code === "endereco_invalido"     ? 400 :
      r.code === "persistencia_falhou"   ? 502 : 400;
    return jsonError(status, r.code, r.message);
  }
  return jsonResponse({
    sucesso:    true,
    idempotent: !!r.idempotent,
    codigo,
    indicador:  r.indicador,
    indicado:   endereco,
  });
}

export default async (req) => {
  // Feature flag — desligado → 503 imediato (não tenta nada).
  if (!referralAtivo()) {
    return jsonError(503, "feature_desligada", "sistema de indicação temporariamente desligado (REFERRAL_ATIVO=off)");
  }

  // Rate limit por IP (5/min) para AMBOS GET e POST.
  const rl = await aplicarRateLimit(req, "referral", RATE_LIMIT_RPM);
  if (rl) return rl;

  const url   = new URL(req.url);
  const acao  = url.searchParams.get("acao");

  if (req.method === "GET" && acao === "meu-codigo") return handleMeuCodigo(req, url);
  if (req.method === "POST" && acao === "usar-codigo") return handleUsarCodigo(req);

  return jsonError(400, "acao_invalida",
    "use GET ?acao=meu-codigo ou POST ?acao=usar-codigo",
    { allowed: { GET: ["meu-codigo"], POST: ["usar-codigo"] } });
};
