// Cotas — sistema de cotas vendidas/disponíveis por categoria (REQ-04..07).
//
// GET /.netlify/functions/cotas
//   ?cliente_id=0x...      → retorna 1 cota
//   ?categoria=bronze|prata|ouro|diamante  → lista cotas da categoria
//   sem params              → resumo agregado por categoria
//   Endpoint público.
//
// POST /.netlify/functions/cotas
//   Body: { cliente_id, categoria, vendida, disponivel, cliente_nome,
//           produto_nome, produto_url?, valor }
//   Gated por x-admin-token. Cria/atualiza a cota e o índice da categoria.
//
// DELETE /.netlify/functions/cotas?cliente_id=0x...
//   Gated por x-admin-token. Remove a cota e atualiza o índice.
//
// Blobs:
//   cotas:{cliente_id}             → registro individual
//   cotas-indice:{categoria}       → { cliente_ids: [...] }

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";

const BLOB_COTAS  = "cotas";
const BLOB_INDICE = "cotas-indice";
const CATEGORIAS  = new Set(["bronze", "prata", "ouro", "diamante"]);

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[cotas] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function validarCategoria(c) {
  if (typeof c !== "string") throw new ValidationError("categoria_invalida", "categoria deve ser string");
  const norm = c.toLowerCase();
  if (!CATEGORIAS.has(norm)) {
    throw new ValidationError("categoria_invalida", `categoria deve ser uma de: ${[...CATEGORIAS].join(", ")}`);
  }
  return norm;
}

function sanitizeText(input, max = 200) {
  if (typeof input !== "string") return null;
  const v = input.trim();
  return v ? v.slice(0, max) : null;
}

async function atualizarIndice(categoria, clienteId, op) {
  // op: "adicionar" | "remover"
  const idx = abrirStore(BLOB_INDICE);
  if (!idx) return;
  try {
    const atual = (await idx.get(categoria, { type: "json" })) || { cliente_ids: [] };
    const set = new Set(atual.cliente_ids || []);
    if (op === "adicionar") set.add(clienteId);
    else                    set.delete(clienteId);
    await idx.setJSON(categoria, {
      categoria,
      cliente_ids: Array.from(set),
      atualizadoEm: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[cotas] atualizar índice falhou (não-fatal):", err?.message);
  }
}

async function listarCategoria(categoria) {
  const idx   = abrirStore(BLOB_INDICE);
  const store = abrirStore(BLOB_COTAS);
  if (!idx || !store) return [];
  let cliente_ids = [];
  try {
    const data = await idx.get(categoria, { type: "json" });
    cliente_ids = data?.cliente_ids ?? [];
  } catch {
    return [];
  }
  const cotas = [];
  for (const cid of cliente_ids) {
    try {
      const reg = await store.get(cid, { type: "json" });
      if (reg) cotas.push(reg);
    } catch {}
  }
  return cotas;
}

async function resumoAgregado() {
  const idx = abrirStore(BLOB_INDICE);
  if (!idx) return {};
  const resumo = {};
  for (const cat of CATEGORIAS) {
    try {
      const data = await idx.get(cat, { type: "json" });
      const ids  = data?.cliente_ids ?? [];
      resumo[cat] = { total_atribuidas: ids.length, cliente_ids: ids };
    } catch {
      resumo[cat] = { total_atribuidas: 0, cliente_ids: [] };
    }
  }
  return resumo;
}

async function handleGet(req) {
  const url       = new URL(req.url);
  const clienteId = url.searchParams.get("cliente_id");
  const categoria = url.searchParams.get("categoria");

  if (clienteId) {
    let endereco;
    try { endereco = validarEndereco(clienteId); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const store = abrirStore(BLOB_COTAS);
    if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    const reg = await store.get(endereco, { type: "json" });
    if (!reg) return jsonError(404, "cota_nao_encontrada", "cliente não tem cota atribuída");
    return jsonResponse(reg);
  }
  if (categoria) {
    let cat;
    try { cat = validarCategoria(categoria); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const cotas = await listarCategoria(cat);
    return jsonResponse({ categoria: cat, total: cotas.length, cotas });
  }
  // Sem params: resumo agregado
  const resumo = await resumoAgregado();
  return jsonResponse({ resumo });
}

async function handlePost(req) {
  const adminToken = req.headers.get("x-admin-token") || "";
  const expected   = process.env.ADMIN_TOKEN;
  if (!expected) return jsonError(503, "admin_token_nao_configurado", "ADMIN_TOKEN ausente no ambiente");
  if (adminToken !== expected) return jsonError(401, "admin_token_invalido", "x-admin-token inválido ou ausente");

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com cliente_id, categoria, vendida, disponivel");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  let endereco, categoria;
  try {
    endereco  = validarEndereco(body.cliente_id);
    categoria = validarCategoria(body.categoria);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const store = abrirStore(BLOB_COTAS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  const existente = await store.get(endereco, { type: "json" });

  // Se mudou de categoria, remove do índice antigo e adiciona no novo
  if (existente && existente.categoria !== categoria) {
    await atualizarIndice(existente.categoria, endereco, "remover");
  }

  const agora = new Date().toISOString();
  const registro = {
    cliente_id:    endereco,
    categoria,
    vendida:       !!body.vendida,
    disponivel:    body.disponivel === undefined ? !body.vendida : !!body.disponivel,
    cliente_nome:  sanitizeText(body.cliente_nome, 80),
    produto_nome:  sanitizeText(body.produto_nome, 120),
    produto_url:   sanitizeText(body.produto_url, 300),
    valor:         Number.isFinite(Number(body.valor)) ? Number(body.valor) : null,
    criadoEm:      existente?.criadoEm ?? agora,
    atualizadoEm:  agora,
  };

  await store.setJSON(endereco, registro);
  await atualizarIndice(categoria, endereco, "adicionar");

  console.info("[cotas] upsert", { endereco, categoria, vendida: registro.vendida });
  return jsonResponse({ ok: true, ...registro }, existente ? 200 : 201);
}

async function handleDelete(req) {
  const adminToken = req.headers.get("x-admin-token") || "";
  const expected   = process.env.ADMIN_TOKEN;
  if (!expected) return jsonError(503, "admin_token_nao_configurado", "ADMIN_TOKEN ausente no ambiente");
  if (adminToken !== expected) return jsonError(401, "admin_token_invalido", "x-admin-token inválido ou ausente");

  const url = new URL(req.url);
  let endereco;
  try { endereco = validarEndereco(url.searchParams.get("cliente_id")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const store = abrirStore(BLOB_COTAS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  const existente = await store.get(endereco, { type: "json" });
  if (!existente) return jsonError(404, "cota_nao_encontrada", "cliente não tem cota atribuída");
  await store.delete(endereco);
  await atualizarIndice(existente.categoria, endereco, "remover");
  return jsonResponse({ ok: true, removido: endereco });
}

export default async (req) => {
  if (req.method === "GET")    return handleGet(req);
  if (req.method === "POST")   return handlePost(req);
  if (req.method === "DELETE") return handleDelete(req);
  return jsonError(405, "metodo_invalido", "use GET, POST ou DELETE", { allowed: ["GET", "POST", "DELETE"] });
};
