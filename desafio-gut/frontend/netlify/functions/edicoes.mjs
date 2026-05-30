// /.netlify/functions/edicoes — MC15.4 (múltiplas edições de leilão).
//
// GET  /.netlify/functions/edicoes
//   Leitura PÚBLICA (sem auth). Rate-limit ~30/min/IP.
//   Resposta 200: { edicoes: { "<id>": { id, tipo, produto, termino_em, lances, status } } }
//   SEMPRE inclui R-1 (real ou sintetizada — compat D5).
//
// POST /.netlify/functions/edicoes               → cria edição (admin only)
//   Body: { tipo: "programado"|"relampago", produto, duracaoSegundos | duracaoMin }
//   201: { ok:true, edicao:{...} }   400: validação   401/403/503: auth
//
// POST /.netlify/functions/edicoes?acao=encerrar&id=PROG-3   → encerra (admin only)
//   200: { ok:true, edicao:{...} }
//
// Toda a lógica de negócio vive em _lib/edicoes-core.mjs (compartilhada com o
// GUTO/chatbot.mjs — sem fetch interno à própria função, ver D4 e ITEM 4).
//
// Rate-limit de criação (~10/hora — R6): o limiter existente é fixed-window de
// 60s. Abordagem (best effort, documentada): aplicamos uma janela por minuto
// com limite 10 ao slug "edicoes-criar". Isso impede rajadas (>10 criações no
// mesmo minuto). Para um teto rígido de 10/HORA seria preciso um limiter de
// janela maior; como o limiter é defense-in-depth (fail-open) e admin-only,
// o gating principal é guardAdmin. Mantemos 10/min como barreira anti-rajada.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin, guardAdmin } from "./_lib/admin-auth.mjs";
import { listarEdicoes, criarEdicao, encerrarEdicao } from "./_lib/edicoes-core.mjs";

const RL_GET_RPM    = 30;  // leitura pública
const RL_CRIAR_RPM  = 10;  // criação admin (anti-rajada; ver nota acima)

export default async (req) => {
  const url = new URL(req.url);

  // ── GET: listagem pública ──────────────────────────────────────────────────
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "edicoes-get", RL_GET_RPM);
    if (rl) return rl;
    try {
      const { edicoes } = await listarEdicoes();
      return jsonResponse({ edicoes });
    } catch (err) {
      console.warn("[edicoes] GET falhou:", err?.message);
      return jsonError(500, "listagem_falhou", "não foi possível listar edições");
    }
  }

  // ── POST: criação OU encerramento (admin only) ─────────────────────────────
  if (req.method === "POST") {
    // Auth admin ANTES de qualquer coisa.
    const denied = await guardAdmin(req);
    if (denied) return denied;

    // endereco admin (para criadoPor/auditoria) — disponível só no fluxo JWT.
    const auth = await autenticarAdmin(req);
    const adminEndereco = auth.ok ? (auth.endereco || null) : null;

    const acao = url.searchParams.get("acao");

    // ── Encerrar: ?acao=encerrar&id=PROG-3 ──────────────────────────────────
    if (acao === "encerrar") {
      const id = url.searchParams.get("id") || "";
      const res = await encerrarEdicao({ edicaoId: id, endereco: adminEndereco, origem: "endpoint" });
      if (!res.ok) {
        const status = res.code === "edicao_inexistente" ? 404
          : res.code === "edicao_id_invalido" ? 400 : 500;
        return jsonError(status, res.code, res.message);
      }
      return jsonResponse({ ok: true, edicao: res.edicao });
    }

    // ── Criar ───────────────────────────────────────────────────────────────
    const rl = await aplicarRateLimit(req, "edicoes-criar", RL_CRIAR_RPM);
    if (rl) return rl;

    let body;
    try {
      body = await parseJsonBody(req);
      if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com tipo, produto e duracaoSegundos");
    } catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }

    const res = await criarEdicao({
      tipo:            body.tipo,
      produto:         body.produto,
      duracaoSegundos: body.duracaoSegundos,
      duracaoMin:      body.duracaoMin,
      criadoPor:       adminEndereco,
      origem:          "endpoint",
    });
    if (!res.ok) {
      const status = res.code === "store_indisponivel" || res.code === "persistencia_falhou" ? 503 : 400;
      return jsonError(status, res.code, res.message);
    }
    return jsonResponse({ ok: true, edicao: res.edicao }, 201);
  }

  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
