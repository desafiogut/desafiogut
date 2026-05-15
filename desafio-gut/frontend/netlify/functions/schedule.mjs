// Schedule — grade de programação persistida em Netlify Blobs (REQ-04..08).
//
// GET /.netlify/functions/schedule?mes=2026-06
//   → retorna a grade do mês como JSON. Se não houver no blob, retorna 404
//     para que o frontend caia no fallback estático (src/data/...).
//   Endpoint público.
//
// POST /.netlify/functions/schedule
//   Body: { mes: "2026-06", grade: {...} }
//   Gated por x-admin-token. Sobrescreve a grade do mês.
//
// Modelo da grade: alinhado com docs/analise-programacao-junho-2026.md.
// O backend não impõe schema rígido — apenas valida que `mes` está em
// formato YYYY-MM e que `grade` é um objeto. O painel Admin que atualizar
// é responsável pela consistência do conteúdo.

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const BLOB_SCHEDULE = "schedule";
const REGEX_MES     = /^\d{4}-\d{2}$/;

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[schedule] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function validarMes(input) {
  if (typeof input !== "string" || !REGEX_MES.test(input)) {
    throw new ValidationError("mes_invalido", "mes deve ser string no formato YYYY-MM");
  }
  return input;
}

async function handleGet(req) {
  const url = new URL(req.url);
  let mes;
  try { mes = validarMes(url.searchParams.get("mes") || ""); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const store = abrirStore(BLOB_SCHEDULE);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  const dados = await store.get(mes, { type: "json" });
  if (!dados) {
    return jsonError(404, "schedule_nao_encontrado", `grade do mês ${mes} ainda não foi publicada (use fallback estático)`);
  }
  return jsonResponse({ mes, grade: dados, atualizadoEm: dados.atualizadoEm || null });
}

async function handlePost(req) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com mes e grade");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let mes;
  try { mes = validarMes(body.mes); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  if (typeof body.grade !== "object" || body.grade === null || Array.isArray(body.grade)) {
    return jsonError(400, "grade_invalida", "grade deve ser um objeto JSON");
  }

  const registro = {
    ...body.grade,
    mes,
    atualizadoEm: new Date().toISOString(),
  };
  const store = abrirStore(BLOB_SCHEDULE);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  try { await store.setJSON(mes, registro); }
  catch (err) {
    console.error("[schedule] persistir falhou:", err?.message);
    return jsonError(502, "persistencia_falhou", "não foi possível salvar grade");
  }

  console.info("[schedule] grade atualizada", { mes });
  return jsonResponse({ ok: true, mes, atualizadoEm: registro.atualizadoEm });
}

export default async (req) => {
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "schedule-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const rl = await aplicarRateLimit(req, "schedule-post", 10);
    if (rl) return rl;
    return handlePost(req);
  }
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
