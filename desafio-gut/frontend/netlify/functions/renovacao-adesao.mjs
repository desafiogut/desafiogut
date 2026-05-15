// Renovação de Adesão — REQ-03 (automação financeira).
//
// Fluxo:
//   1. Cliente solicita renovação (POST sem token, acao="solicitar")
//      → registro pendente com PIX a ser pago para familiaquildo@gmail.com.
//   2. Admin confirma pagamento (POST com x-admin-token, acao="confirmar")
//      → status="ativa", validade = agora + DURACAO_MS.
//   3. GET ?cliente_id=xxx → retorna status calculado dinamicamente.
//
// Status calculado:
//   • "nao-iniciada"   — nunca solicitou
//   • "pendente"       — solicitou, admin ainda não confirmou
//   • "ativa"          — pagamento confirmado, dentro da validade
//   • "vencendo"       — ativa mas <= 7 dias do fim
//   • "vencida"        — passou da validade
//
// Blob: renovacao-adesao:{cliente_id}

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, parseJsonBody, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { PIX_ADESAO } from "./_lib/pix-config.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const BLOB_RENOVACAO = "renovacao-adesao";
// Duração padrão da adesão. 30 dias para MVP/dev; produção pode ler de env.
const DURACAO_DIAS_PADRAO = Number(process.env.ADESAO_DIAS) || 30;
const MS_DIA = 24 * 60 * 60 * 1000;
const AVISO_VENCENDO_DIAS = 7;

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[renovacao-adesao] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function calcularStatus(registro) {
  if (!registro) return "nao-iniciada";
  if (registro.status === "pendente") return "pendente";
  if (registro.status === "ativa") {
    const validadeMs = new Date(registro.validade).getTime();
    const diasRestantes = Math.ceil((validadeMs - Date.now()) / MS_DIA);
    if (diasRestantes <= 0)               return "vencida";
    if (diasRestantes <= AVISO_VENCENDO_DIAS) return "vencendo";
    return "ativa";
  }
  return registro.status || "nao-iniciada";
}

function diasRestantes(registro) {
  if (!registro?.validade) return null;
  const ms = new Date(registro.validade).getTime();
  return Math.ceil((ms - Date.now()) / MS_DIA);
}

async function handleGet(req) {
  const url = new URL(req.url);
  let endereco;
  try { endereco = validarEndereco(url.searchParams.get("cliente_id")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Anti-IDOR: exige JWT user-session ou admin.
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) return jsonError(401, "token_ausente", "Authorization: Bearer <user-session> obrigatório — obtenha via POST /auth-user");
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");

  const store = abrirStore(BLOB_RENOVACAO);
  if (!store) return jsonResponse({ cliente_id: endereco, status: "nao-iniciada", pix: PIX_ADESAO });
  const reg = await store.get(endereco, { type: "json" });
  const status = calcularStatus(reg);
  return jsonResponse({
    cliente_id: endereco,
    status,
    dias_restantes: diasRestantes(reg),
    registro: reg || null,
    pix: PIX_ADESAO,
    duracao_dias_padrao: DURACAO_DIAS_PADRAO,
  });
}

async function acaoSolicitar(body) {
  let endereco;
  try { endereco = validarEndereco(body.cliente_id); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const valor = Number(body.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    return jsonError(400, "valor_invalido", "valor (BRL) deve ser número positivo");
  }
  const store = abrirStore(BLOB_RENOVACAO);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  const existente = await store.get(endereco, { type: "json" });
  const status    = calcularStatus(existente);
  if (status === "pendente") {
    return jsonResponse({ ...existente, idempotent: true, status, pix: PIX_ADESAO });
  }
  if (status === "ativa") {
    return jsonError(409, "ja_ativa", "adesão já está ativa — aguarde vencimento ou status=vencendo para renovar", {
      validade: existente.validade,
      dias_restantes: diasRestantes(existente),
    });
  }

  const agora = new Date().toISOString();
  const registro = {
    cliente_id: endereco,
    status: "pendente",
    valor_brl: valor,
    solicitadoEm: agora,
    confirmadoEm: null,
    validade: null,
    historico: [
      ...(Array.isArray(existente?.historico) ? existente.historico : []),
      { em: agora, de: existente?.status || "nao-iniciada", para: "pendente", por: "cliente", valor },
    ].slice(-20),
  };
  await store.setJSON(endereco, registro);
  return jsonResponse({ ...registro, status: "pendente", pix: PIX_ADESAO }, 201);
}

async function acaoConfirmar(req, body) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  let endereco;
  try { endereco = validarEndereco(body.cliente_id); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const store = abrirStore(BLOB_RENOVACAO);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  const existente = await store.get(endereco, { type: "json" });
  if (!existente) return jsonError(404, "nao_encontrado", "não há solicitação pendente para este cliente");
  if (existente.status !== "pendente") {
    return jsonError(409, "nao_pendente", `solicitação está com status "${existente.status}", não "pendente"`);
  }

  const agora = new Date();
  const validade = new Date(agora.getTime() + DURACAO_DIAS_PADRAO * MS_DIA);
  const registro = {
    ...existente,
    status: "ativa",
    confirmadoEm: agora.toISOString(),
    validade: validade.toISOString(),
    historico: [
      ...(existente.historico || []),
      { em: agora.toISOString(), de: "pendente", para: "ativa", por: "admin", validade: validade.toISOString() },
    ].slice(-20),
  };
  await store.setJSON(endereco, registro);
  return jsonResponse({ ...registro, status: "ativa", dias_restantes: DURACAO_DIAS_PADRAO });
}

async function handlePost(req) {
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com acao e cliente_id");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  switch (body.acao) {
    case "solicitar": return acaoSolicitar(body);
    case "confirmar": return acaoConfirmar(req, body);
    default: return jsonError(400, "acao_invalida", 'acao deve ser "solicitar" ou "confirmar"');
  }
}

export default async (req) => {
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "renovacao-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const rl = await aplicarRateLimit(req, "renovacao-post", 5);
    if (rl) return rl;
    return handlePost(req);
  }
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
