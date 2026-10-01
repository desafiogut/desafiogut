// /.netlify/functions/cupons — UTAC105b. Painel do lojista: que cupons do Passe Desafio oferece.
// Header: Authorization: Bearer <user-session> (ou admin-JWT)
//
// GET ?cliente_id=<lojista>                     → 200 { lojistaId, validadeDias, cupons:[{ valorRs, ativo }] } (sempre os 3 valores)
// PUT { cliente_id, cupons:[{ valorRs, ativo }] } → 200 idem, depois de gravar
// 400 params_invalidos|valor_invalido · 401 token_ausente|token_invalido · 403 endereco_nao_corresponde · 503 store_indisponivel
//
// DEC-02: a plataforma define os valores (VALORES_CUPOM), o lojista só liga/desliga. Valor fora da lista → 400 e NADA é gravado.
// R18-B (posse, regra MC89.38 de produtos.mjs): o `cliente_id` pertence a quem chama se for a carteira do JWT, se a cota tiver
// `endereco` = carteira do JWT, ou se for admin. Fora disto 403 — a ausência de prova não vale como prova. Falha a ler a cota → 403.
// Sem dados pessoais nas respostas nem nos logs.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { getCota } from "./_lib/cotas-store.mjs";
import {
  VALORES_CUPOM, VALIDADE_CUPOM_DIAS, valorValido, lojistaValido, listarCuponsDoLojista, actualizarCupom,
} from "./_lib/cupom.mjs";

async function chamador(req) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return { erro: "token_ausente" };
  try {
    const p = await verificarUserSession(bearer);
    const e = String(p?.endereco || "").toLowerCase();
    if (/^0x[0-9a-f]{40}$/.test(e)) return { endereco: e };
  } catch { /* pode ser um admin-JWT */ }
  try { if ((await autenticarAdmin(req))?.ok) return { admin: true }; } catch { /* segue */ }
  return { erro: "token_invalido" };
}

async function temPosse(quem, lojistaId) {
  if (quem.admin) return true;
  if (lojistaId === quem.endereco) return true;
  try {
    const e = (await getCota(lojistaId))?.endereco;
    return !!e && String(e).toLowerCase() === quem.endereco;
  } catch { return false; } // fail-closed
}

/** Os 3 valores da plataforma, cada um com o estado gravado (inexistente = inactivo). */
async function estado(lojistaId) {
  const gravados = await listarCuponsDoLojista(lojistaId);
  return {
    lojistaId, validadeDias: VALIDADE_CUPOM_DIAS,
    cupons: VALORES_CUPOM.map((v) => ({ valorRs: v, ativo: gravados.some((c) => Number(c.valor_rs) === v && c.ativo === true) })),
  };
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET" && req.method !== "PUT") return jsonError(405, "metodo_invalido", "use GET ou PUT", { allowed: ["GET", "PUT"] });
  const rl = await aplicarRateLimit(req, "cupons", 20);
  if (rl) return rl;

  const quem = await chamador(req);
  if (quem.erro) return jsonError(401, quem.erro, "Authorization: Bearer <user-session> válido obrigatório");

  let body = null, clienteId;
  if (req.method === "GET") clienteId = new URL(req.url).searchParams.get("cliente_id");
  else {
    try { body = await parseJsonBody(req); }
    catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }
    clienteId = body?.cliente_id;
  }
  const lojistaId = String(clienteId ?? "").trim().toLowerCase();
  if (!lojistaValido(lojistaId)) return jsonError(400, "params_invalidos", "cliente_id inválido");
  if (!(await temPosse(quem, lojistaId))) return jsonError(403, "endereco_nao_corresponde", "JWT não pertence ao cliente_id informado");

  if (req.method === "PUT") {
    const itens = body?.cupons;
    if (!Array.isArray(itens) || itens.length === 0 || itens.length > VALORES_CUPOM.length
      || itens.some((i) => !i || typeof i !== "object" || typeof i.ativo !== "boolean")) {
      return jsonError(400, "params_invalidos", "envie { cliente_id, cupons:[{ valorRs, ativo }] }");
    }
    // Valida TUDO antes de gravar: um valor fora da lista não deixa gravação parcial (P9).
    if (itens.some((i) => !valorValido(i.valorRs))) return jsonError(400, "valor_invalido", `valores aceites: ${VALORES_CUPOM.join(", ")}`);
    if (new Set(itens.map((i) => i.valorRs)).size !== itens.length) return jsonError(400, "params_invalidos", "valor repetido");
    for (const i of itens) {
      const r = await actualizarCupom({ lojistaId, valorRs: i.valorRs, ativo: i.ativo });
      if (!r.ok) return jsonError(r.code === "gravar_cupom_falhou" ? 503 : 400, r.code === "gravar_cupom_falhou" ? "store_indisponivel" : r.code, "não foi possível gravar os cupons");
    }
  }

  try { return jsonResponse(await estado(lojistaId), 200); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler os cupons"); }
};
