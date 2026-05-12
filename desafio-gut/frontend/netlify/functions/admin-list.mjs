// Admin List — lista de endereços com privilégio de admin (REQ-20).
//
// GET /.netlify/functions/admin-list
//   → retorna { admins: [endereco, ...], coordenacao: "0x..." }
//   Endpoint público (a lista de admins não é segredo — operações
//   de admin continuam gated por checagem de assinatura via Privy +
//   match com a lista).
//
// POST /.netlify/functions/admin-list
//   Body: { acao: "adicionar"|"remover", endereco }
//   Gated por x-admin-token.
//
// Coordenação é admin AUTOMÁTICO — não precisa estar na lista persistida.
// Endpoint sempre inclui o endereço da coordenação no retorno.

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";

const BLOB_ADMINS = "admin-list";
const COORDENACAO = "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E".toLowerCase();

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[admin-list] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

async function carregarLista() {
  const store = abrirStore(BLOB_ADMINS);
  if (!store) return [];
  try {
    const data = await store.get("admins", { type: "json" });
    return Array.isArray(data?.admins) ? data.admins.map((a) => String(a).toLowerCase()) : [];
  } catch {
    return [];
  }
}

async function salvarLista(admins) {
  const store = abrirStore(BLOB_ADMINS);
  if (!store) throw new Error("Netlify Blobs indisponível");
  await store.setJSON("admins", { admins, atualizadoEm: new Date().toISOString() });
}

async function handleGet() {
  const admins = await carregarLista();
  // Coordenação sempre incluída
  const todos = Array.from(new Set([COORDENACAO, ...admins]));
  return jsonResponse({ admins: todos, coordenacao: COORDENACAO });
}

async function handlePost(req) {
  const adminToken = req.headers.get("x-admin-token") || "";
  const expected   = process.env.ADMIN_TOKEN;
  if (!expected) return jsonError(503, "admin_token_nao_configurado", "ADMIN_TOKEN ausente no ambiente");
  if (adminToken !== expected) return jsonError(401, "admin_token_invalido", "x-admin-token inválido ou ausente");

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com acao e endereco");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  if (body.acao !== "adicionar" && body.acao !== "remover") {
    return jsonError(400, "acao_invalida", 'acao deve ser "adicionar" ou "remover"');
  }
  if (endereco === COORDENACAO && body.acao === "remover") {
    return jsonError(400, "coordenacao_nao_removivel", "a coordenação é admin permanente e não pode ser removida");
  }

  const atual = await carregarLista();
  let nova;
  if (body.acao === "adicionar") {
    nova = Array.from(new Set([...atual, endereco]));
  } else {
    nova = atual.filter((e) => e !== endereco);
  }
  await salvarLista(nova);
  return jsonResponse({ ok: true, acao: body.acao, endereco, admins: nova, coordenacao: COORDENACAO });
}

export default async (req) => {
  if (req.method === "GET")  return handleGet();
  if (req.method === "POST") return handlePost(req);
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
