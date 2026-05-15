// Admin Aprovação — workflow de aprovação manual de cliente (REQ-20).
//
// GET /.netlify/functions/admin-aprovacao
//   ?status=pendente|aprovado|rejeitado (opcional)
//   ?cliente_id=0x... (opcional — retorna 1 registro)
//   → lista os pedidos de aprovação.
//   Endpoint público (a lista é vista pelos admins; clientes podem
//   consultar o próprio status).
//
// POST /.netlify/functions/admin-aprovacao
//   Body { acao: "inscrever", cliente_id, nome?, email?, observacao? }
//     → SEM auth. Cria registro com status="pendente". Idempotente
//       (re-inscrição com o mesmo cliente_id atualiza nome/email mas
//       NÃO sobrescreve um registro já aprovado/rejeitado).
//
//   Body { acao: "aprovar"|"rejeitar", cliente_id, motivo? }
//     → REQUER x-admin-token. Atualiza status e registra audit trail.
//
// Blob: admin-aprovacao:{cliente_id}
//   { cliente_id, status, nome, email, criadoEm, atualizadoEm,
//     atualizadoPor, motivo, historico:[{em, de, para, por, motivo}] }

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const BLOB_APROVACAO = "admin-aprovacao";
const STATUS_VALIDOS = new Set(["pendente", "aprovado", "rejeitado"]);

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[admin-aprovacao] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function sanitizeText(input, max = 200) {
  if (typeof input !== "string") return null;
  const v = input.trim();
  if (!v) return null;
  return v.slice(0, max);
}

async function handleGet(req) {
  const url = new URL(req.url);
  const statusFiltro = url.searchParams.get("status");
  const clienteId    = url.searchParams.get("cliente_id");

  const store = abrirStore(BLOB_APROVACAO);
  if (!store) return jsonResponse({ aprovacoes: [] });

  if (clienteId) {
    let endereco;
    try { endereco = validarEndereco(clienteId); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const reg = await store.get(endereco, { type: "json" });
    if (!reg) return jsonError(404, "nao_encontrado", "cliente não tem pedido de aprovação");
    return jsonResponse(reg);
  }

  // Lista todos via store.list() e filtra
  let blobs = [];
  try {
    const out = await store.list();
    blobs = out?.blobs ?? [];
  } catch (err) {
    console.warn("[admin-aprovacao] list falhou:", err?.message);
    return jsonResponse({ aprovacoes: [] });
  }
  const aprovacoes = [];
  for (const b of blobs) {
    try {
      const reg = await store.get(b.key, { type: "json" });
      if (!reg) continue;
      if (statusFiltro && reg.status !== statusFiltro) continue;
      aprovacoes.push(reg);
    } catch {}
  }
  aprovacoes.sort((a, b) => new Date(b.atualizadoEm || b.criadoEm) - new Date(a.atualizadoEm || a.criadoEm));
  return jsonResponse({ aprovacoes, total: aprovacoes.length });
}

async function acaoInscrever(body) {
  let endereco;
  try { endereco = validarEndereco(body.cliente_id); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const nome   = sanitizeText(body.nome, 80);
  const email  = sanitizeText(body.email, 120);
  const obs    = sanitizeText(body.observacao, 400);

  const store = abrirStore(BLOB_APROVACAO);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  const existente = await store.get(endereco, { type: "json" });
  if (existente && existente.status !== "pendente") {
    return jsonError(409, `ja_${existente.status}`, `este cliente já está com status "${existente.status}"`, {
      cliente_id: endereco, status: existente.status, atualizadoEm: existente.atualizadoEm,
    });
  }
  const agora = new Date().toISOString();
  const registro = existente ? {
    ...existente,
    nome:   nome  ?? existente.nome,
    email:  email ?? existente.email,
    observacao: obs ?? existente.observacao,
    atualizadoEm: agora,
  } : {
    cliente_id: endereco,
    status: "pendente",
    nome, email, observacao: obs,
    criadoEm: agora, atualizadoEm: agora,
    atualizadoPor: null,
    motivo: null,
    historico: [{ em: agora, de: null, para: "pendente", por: null, motivo: null }],
  };
  await store.setJSON(endereco, registro);
  return jsonResponse(registro, existente ? 200 : 201);
}

async function acaoTransicao(req, body, novoStatus) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  let endereco;
  try { endereco = validarEndereco(body.cliente_id); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const motivo = sanitizeText(body.motivo, 400);
  const por    = sanitizeText(body.por, 80) || "admin";

  const store = abrirStore(BLOB_APROVACAO);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  const existente = await store.get(endereco, { type: "json" });
  if (!existente) return jsonError(404, "nao_encontrado", "cliente não tem pedido de aprovação");

  if (existente.status === novoStatus) {
    return jsonResponse({ ...existente, idempotent: true });
  }

  const agora = new Date().toISOString();
  const historico = Array.isArray(existente.historico) ? existente.historico : [];
  const registro = {
    ...existente,
    status: novoStatus,
    atualizadoEm: agora,
    atualizadoPor: por,
    motivo,
    historico: [
      ...historico,
      { em: agora, de: existente.status, para: novoStatus, por, motivo },
    ].slice(-20),  // últimas 20 transições
  };
  await store.setJSON(endereco, registro);
  return jsonResponse(registro);
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
    case "inscrever": return acaoInscrever(body);
    case "aprovar":   return acaoTransicao(req, body, "aprovado");
    case "rejeitar":  return acaoTransicao(req, body, "rejeitado");
    default: return jsonError(400, "acao_invalida", 'acao deve ser "inscrever", "aprovar" ou "rejeitar"');
  }
}

export default async (req) => {
  const rl = await aplicarRateLimit(req, "admin-aprovacao", 10);
  if (rl) return rl;
  if (req.method === "GET")  return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
