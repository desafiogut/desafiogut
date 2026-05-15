// Vouchers de Networking — Bônus Diamante (Especificação Refatorada §7).
//
// POST /.netlify/functions/voucher  body { acao, ... }
//
//   acao="gerar"     (admin)
//     headers: x-admin-token
//     body:    { acao:"gerar", endereco_emissor }
//     ret:     { codigo, emissor, criadoEm }
//
//   acao="consultar" (público)
//     body:    { acao:"consultar", codigo }
//     ret:     { codigo, emissor, criadoEm, resgatadoPor, resgatadoEm, ativo }
//
//   acao="resgatar"  (autenticado)
//     headers: Authorization: Bearer <JWT lance-auth>
//     body:    { acao:"resgatar", codigo, endereco_resgatador }
//     ret:     { ok, codigo, emissor, resgatadoPor, resgatadoEm }
//     400:     codigo_inexistente | ja_resgatado | emissor_nao_pode_resgatar
//
// GET /.netlify/functions/voucher?endereco_emissor=0x...
//   Lista os vouchers emitidos por um endereço (índice vouchers-emissor:*).
//   Público (mesmo critério de saldo-rs).
//
// Decisões (sessão 2026-05-12):
//   - "Diamante" não tem ainda um gate real (REQ-04..07 AUSENTE).
//     Por isso geração é admin-only (gated por x-admin-token) — só o operador
//     emite vouchers em nome do cliente Diamante. Quando o sistema de cotas
//     existir, troca-se para verificar saldoVouchers do cliente.
//   - Resgate exige JWT lance-auth para garantir que o endereco_resgatador
//     pertence a quem chamou — mesmo critério do lance-relampago.
//   - O efeito do resgate (isenção da 1ª compra de fichas) será integrado
//     em comprar-senhas.mjs em uma onda seguinte. Aqui só persistimos o
//     estado do voucher; o desconto é aplicado pelo consumidor do voucher.

import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { verificarLanceAuth, verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const BLOB_VOUCHER  = "voucher";
const BLOB_INDICE   = "vouchers-emissor";
const COD_PREFIXO   = "GUT-";
const COD_HEX_LEN   = 8;
const REGEX_CODIGO  = new RegExp(`^${COD_PREFIXO}[A-F0-9]{${COD_HEX_LEN}}$`);

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[voucher] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function gerarCodigo() {
  return COD_PREFIXO + randomBytes(COD_HEX_LEN / 2).toString("hex").toUpperCase();
}

function validarCodigo(codigo) {
  if (typeof codigo !== "string" || !REGEX_CODIGO.test(codigo)) {
    throw new ValidationError("codigo_invalido", `codigo deve casar com ${REGEX_CODIGO}`);
  }
  return codigo;
}

async function indexarVoucher(emissor, codigo) {
  const idx = abrirStore(BLOB_INDICE);
  if (!idx) return;
  try {
    const atual = (await idx.get(emissor, { type: "json" })) || { codigos: [] };
    if (!atual.codigos.includes(codigo)) atual.codigos.push(codigo);
    atual.atualizadoEm = new Date().toISOString();
    await idx.setJSON(emissor, atual);
  } catch (err) {
    console.warn("[voucher] indexar falhou (não-fatal):", err?.message);
  }
}

async function acaoGerar(req, body) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  let emissor;
  try { emissor = validarEndereco(body.endereco_emissor); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const store = abrirStore(BLOB_VOUCHER);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  // 5 tentativas para evitar colisão; com 4 bytes (16M) a chance é desprezível.
  let codigo, registro;
  for (let i = 0; i < 5; i += 1) {
    codigo = gerarCodigo();
    const existente = await store.get(codigo, { type: "json" });
    if (!existente) break;
    if (i === 4) return jsonError(500, "colisao", "não foi possível gerar código único");
  }

  registro = {
    codigo, emissor,
    criadoEm: new Date().toISOString(),
    resgatadoPor: null,
    resgatadoEm:  null,
  };
  try { await store.setJSON(codigo, registro); }
  catch (err) {
    console.error("[voucher] persistir falhou:", err?.message);
    return jsonError(502, "persistencia_falhou", "não foi possível salvar voucher");
  }
  await indexarVoucher(emissor, codigo);
  return jsonResponse(registro, 201);
}

async function acaoConsultar(body) {
  let codigo;
  try { codigo = validarCodigo(body.codigo); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const store = abrirStore(BLOB_VOUCHER);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  const v = await store.get(codigo, { type: "json" });
  if (!v) return jsonError(404, "codigo_inexistente", "voucher não encontrado");
  return jsonResponse({ ...v, ativo: !v.resgatadoPor });
}

async function acaoResgatar(req, body) {
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) return jsonError(401, "token_ausente", "Authorization: Bearer <token> obrigatório");
  let jwtPayload;
  try { jwtPayload = await verificarLanceAuth(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token inválido ou expirado");
  }

  let codigo, resgatador;
  try {
    codigo     = validarCodigo(body.codigo);
    resgatador = validarEndereco(body.endereco_resgatador);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  if (jwtPayload.endereco !== resgatador) {
    return jsonError(403, "endereco_nao_corresponde", "token não pertence ao endereco_resgatador");
  }

  const store = abrirStore(BLOB_VOUCHER);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  const v = await store.get(codigo, { type: "json" });
  if (!v) return jsonError(404, "codigo_inexistente", "voucher não encontrado");
  if (v.resgatadoPor) return jsonError(400, "ja_resgatado", `voucher já resgatado por ${v.resgatadoPor} em ${v.resgatadoEm}`);
  if (v.emissor === resgatador) return jsonError(400, "emissor_nao_pode_resgatar", "o emissor não pode resgatar o próprio voucher");

  const atualizado = {
    ...v,
    resgatadoPor: resgatador,
    resgatadoEm:  new Date().toISOString(),
  };
  try { await store.setJSON(codigo, atualizado); }
  catch (err) {
    console.error("[voucher] persistir resgate falhou:", err?.message);
    return jsonError(502, "persistencia_falhou", "não foi possível atualizar voucher");
  }
  return jsonResponse({ ok: true, ...atualizado });
}

async function handlePost(req) {
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com acao");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  switch (body.acao) {
    case "gerar":     return acaoGerar(req, body);
    case "consultar": return acaoConsultar(body);
    case "resgatar":  return acaoResgatar(req, body);
    default: return jsonError(400, "acao_invalida", 'acao deve ser "gerar", "consultar" ou "resgatar"');
  }
}

async function handleGet(req) {
  const url = new URL(req.url);
  let emissor;
  try { emissor = validarEndereco(url.searchParams.get("endereco_emissor")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Anti-IDOR: lista de vouchers do emissor só para o próprio emissor ou admin.
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
  const guard  = validarOwnerOuAdmin(jwtPayload, emissor, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao emissor solicitado e não é admin");

  const idx = abrirStore(BLOB_INDICE);
  if (!idx) return jsonResponse({ emissor, vouchers: [] });
  const data = await idx.get(emissor, { type: "json" });
  const codigos = data?.codigos ?? [];

  const store = abrirStore(BLOB_VOUCHER);
  if (!store) return jsonResponse({ emissor, vouchers: codigos.map((c) => ({ codigo: c })) });

  const vouchers = [];
  for (const codigo of codigos) {
    try {
      const v = await store.get(codigo, { type: "json" });
      if (v) vouchers.push({ ...v, ativo: !v.resgatadoPor });
    } catch {}
  }
  return jsonResponse({ emissor, vouchers });
}

export default async (req) => {
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "voucher-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const rl = await aplicarRateLimit(req, "voucher-post", 5);
    if (rl) return rl;
    return handlePost(req);
  }
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
