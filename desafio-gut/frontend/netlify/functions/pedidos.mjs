// /.netlify/functions/pedidos — MC-ECOMMERCE-01a. Pedidos de entrega do comprador.
//
// GET                                   comprador: os SEUS pedidos · admin: todos
// GET  ?produtoId=<id>                  comprador (o seu) ou admin
// PUT  ?acao=endereco&produtoId=<id>    comprador — dados de entrega { endereco: {...} }
// PUT  ?acao=rastreio&produtoId=<id>    admin (operador+) — { codigo, transportadora? }
// PUT  ?acao=nfe&produtoId=<id>         admin (operador+) — { numero, serie?, chave? }
// POST ?acao=reprocessar-venda&edicaoId admin (admin+) — repete a ponte a partir do
//                                       marcador de consolidação (nunca do pedido)
//
// O vencedor NUNCA entra por aqui: o pedido é criado pela ponte (_lib/pedidos.mjs,
// chamada pela consolidação). O comprador só escreve os SEUS dados de entrega.
// Acções do operador: log de auditoria FAIL-CLOSED (MC89.43) — sem registo, não executa.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { registrarAcao, confirmarAcao } from "./_lib/admin-log.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { estaConsolidado } from "./_lib/bids-store.mjs";
import { buscarEdicao, EDICAO_ID_RE } from "./_lib/edicoes-core.mjs";
import {
  lerPedido, listarPedidosDoComprador, listarTodosPedidos,
  definirMorada, definirRastreio, definirNfe, reprocessarVendaDaEdicao,
} from "./_lib/pedidos.mjs";

const ID_RE = /^[0-9a-f-]{10,64}$/i;
const ORDEM_NIVEL = { "super-admin": 3, admin: 2, operador: 1 };

async function comprador(req) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return null;
  try {
    const p = await verificarUserSession(bearer);
    const e = String(p?.endereco || "").toLowerCase();
    return e || null;
  } catch { return null; }
}

async function adminComNivel(req, minimo) {
  const r = await autenticarAdmin(req);
  if (!r.ok) return { ok: false };
  const nivel = r.payload?.nivel || "admin";
  return { ok: (ORDEM_NIVEL[nivel] || 0) >= (ORDEM_NIVEL[minimo] || 0), endereco: r.endereco, nivel };
}

const erroDe = (res) => {
  const status = {
    pedido_nao_encontrado: 404, produto_nao_encontrado: 404, edicao_nao_encontrada: 404,
    pedido_ja_enviado: 409, morada_em_falta: 409, produto_ja_vendido: 409, produto_nao_ativo: 409,
    edicao_nao_consolidada: 409, edicao_sem_produto: 409, store_indisponivel: 503,
  }[res.code] || 400;
  return jsonError(status, res.code, res.message || res.code);
};

/** Executa uma acção do operador com log fail-closed antes e confirmação depois. */
async function comLog(req, adm, tipo_acao, alvo, payload, fn) {
  let logId;
  try {
    ({ id: logId } = await registrarAcao({
      admin_endereco: adm.endereco, admin_nivel: adm.nivel, tipo_acao, alvo,
      ip: req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null, payload,
    }));
  } catch (err) {
    console.error("[pedidos] log fail-closed:", err?.message);
    return jsonError(503, "log_indisponivel", "Registo de auditoria falhou. Ação NÃO executada.");
  }
  let res;
  try { res = await fn(); }
  catch (err) {
    await confirmarAcao(logId, { sucesso: false, erro: err?.message }).catch(() => {});
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  await confirmarAcao(logId, { sucesso: !!res.ok, erro: res.ok ? null : res.code }).catch(() => {});
  return res.ok ? jsonResponse({ ok: true, ...(res.pedido ? { pedido: res.pedido } : res) }) : erroDe(res);
}

async function lerCorpo(req) {
  try { return (await parseJsonBody(req)) || {}; }
  catch (err) {
    if (err instanceof ValidationError) return { __erro: jsonError(400, err.code, err.message) };
    throw err;
  }
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  const rl = await aplicarRateLimit(req, "pedidos", req.method === "GET" ? 30 : 10);
  if (rl) return rl;

  const url = new URL(req.url);
  const acao = url.searchParams.get("acao");
  const produtoId = url.searchParams.get("produtoId");
  if (produtoId !== null && !ID_RE.test(produtoId)) return jsonError(400, "produto_id_invalido", "produtoId inválido");

  // ── Admin ──
  const adm = await adminComNivel(req, "operador");

  if (req.method === "GET") {
    if (adm.ok) {
      if (produtoId) {
        const p = await lerPedido(produtoId);
        return p ? jsonResponse({ pedido: p }) : jsonError(404, "pedido_nao_encontrado", "pedido não encontrado");
      }
      const pedidos = await listarTodosPedidos();
      pedidos.sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
      return jsonResponse({ pedidos });
    }
    const eu = await comprador(req);
    if (!eu) return jsonError(401, "nao_autenticado", "token obrigatório");
    if (produtoId) {
      const p = await lerPedido(produtoId);
      // Pedido de outro = 404 (não confirma que existe).
      if (!p || p.comprador !== eu) return jsonError(404, "pedido_nao_encontrado", "pedido não encontrado");
      return jsonResponse({ pedido: p });
    }
    const pedidos = await listarPedidosDoComprador(eu);
    pedidos.sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    return jsonResponse({ pedidos });
  }

  if (req.method === "PUT") {
    if (!produtoId) return jsonError(400, "produto_id_obrigatorio", "?produtoId= obrigatório");
    const body = await lerCorpo(req);
    if (body.__erro) return body.__erro;

    if (acao === "endereco") {
      const eu = await comprador(req);
      if (!eu) return jsonError(401, "nao_autenticado", "token obrigatório");
      try {
        const res = await definirMorada(produtoId, eu, body.endereco);
        return res.ok ? jsonResponse({ ok: true, pedido: res.pedido }) : erroDe(res);
      } catch (err) {
        if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
        throw err;
      }
    }
    if (acao === "rastreio" || acao === "nfe") {
      if (!adm.ok) return jsonError(403, "nao_autorizado", "apenas o operador");
      const fn = acao === "rastreio"
        ? () => definirRastreio(produtoId, { codigo: body.codigo, transportadora: body.transportadora })
        : () => definirNfe(produtoId, { numero: body.numero, serie: body.serie, chave: body.chave });
      return comLog(req, adm, acao === "rastreio" ? "pedido_rastreio" : "pedido_nfe", produtoId,
        acao === "rastreio" ? { codigo: body.codigo ?? null } : { numero: body.numero ?? null }, fn);
    }
    return jsonError(400, "acao_invalida", "acao deve ser endereco, rastreio ou nfe");
  }

  if (req.method === "POST" && acao === "reprocessar-venda") {
    const admAlto = await adminComNivel(req, "admin");
    if (!admAlto.ok) return jsonError(403, "nao_autorizado", "exige nível admin");
    const edicaoId = url.searchParams.get("edicaoId") || "";
    if (!EDICAO_ID_RE.test(edicaoId)) return jsonError(400, "edicao_id_invalido", "edicaoId inválido");
    return comLog(req, admAlto, "pedido_reprocessar_venda", edicaoId, {},
      () => reprocessarVendaDaEdicao(edicaoId, { estaConsolidado, buscarEdicao }));
  }

  return jsonError(405, "metodo_invalido", "use GET, PUT ou POST ?acao=reprocessar-venda");
};
