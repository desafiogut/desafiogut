// Admin List — lista de endereços com privilégio de admin (REQ-20).
//
// GET /.netlify/functions/admin-list                          [ADMIN — MC87]
//   → { admins: [endereco, ...], coordenacao: "0x..." }
//
// GET /.netlify/functions/admin-list?endereco=0x...           [público]
//   → { endereco, isAdmin, role, fonte }  — só sobre o endereço perguntado.
//   Serve o gate de UI (hooks/useAdmin.js) sem enumerar a lista.
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
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { getRole } from "./_lib/rbac.mjs";
// MC87 (P1-4) — fonte única da coordenação (env-configurável em _lib/admin-helpers).
import { resolverCoordenacao } from "./_lib/admin-helpers.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const BLOB_ADMINS = "admin-list";

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

// MC87 (P2-4) — o GET devolvia, sem autenticação, quais carteiras controlam a
// plataforma. Isso transforma um alvo difuso num alvo NOMEADO (phishing dirigido,
// engenharia social, vigilância on-chain) — e o endereço exposto é justamente a
// EOA cuja chave foi comprometida.
//
// Bloquear o GET inteiro não serve: `useAdmin` consulta ?endereco= para decidir se
// mostra a entrada do painel, e exigir credencial de admin para descobrir que se é
// admin é circular. Por isso o contrato foi SEPARADO:
//   ?endereco=0x…  → público, mas responde só sobre AQUELE endereço (sem a lista)
//   sem parâmetro  → lista completa, admin-only
async function handleGet(req) {
  const url = new URL(req.url);
  const enderecoQuery = url.searchParams.get("endereco");

  if (enderecoQuery) {
    let enderecoLower;
    try { enderecoLower = validarEndereco(enderecoQuery); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const admins = await carregarLista();
    const todos  = Array.from(new Set([resolverCoordenacao(), ...admins]));
    const { role, fonte } = await getRole(enderecoLower);
    // Oráculo de UM endereço de cada vez, em vez de enumeração — e sob rate-limit.
    return jsonResponse({
      endereco: enderecoLower,
      isAdmin:  todos.includes(enderecoLower),
      role,
      fonte,
    });
  }

  const negado = await guardAdmin(req);
  if (negado) return negado;

  const admins = await carregarLista();
  const coordenacao = resolverCoordenacao();
  const todos = Array.from(new Set([coordenacao, ...admins]));
  return jsonResponse({ admins: todos, coordenacao });
}

async function handlePost(req) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

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
  if (endereco === resolverCoordenacao() && body.acao === "remover") {
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
  return jsonResponse({ ok: true, acao: body.acao, endereco, admins: nova, coordenacao: resolverCoordenacao() });
}

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  const rl = await aplicarRateLimit(req, "admin-list", 10);
  if (rl) return rl;
  if (req.method === "GET")  return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
