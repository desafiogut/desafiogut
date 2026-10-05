// POST /.netlify/functions/resgatar-cartao — UTAC106g. RESGATE do cartão colecionável (50 pontos → 1 cartão).
//
// ⚠️ ADITIVO. Endpoint NOVO e SEPARADO do Via A (`comprar-passe.mjs`) e do Via B da compra
// (`comprar-passe-pontos.mjs`) — ambos intactos.
//
// Header: Authorization: Bearer ***   ·   Body: { cartaoId, morada, idempotencyKey }
//   (a chave também é aceite no header `x-idempotency-key`, como no `comprar-passe-pontos`)
//   `morada` = o MESMO contrato de `_lib/pedidos.mjs` (`validarMorada`): nome, cpf, cep,
//   logradouro, numero, complemento?, bairro, cidade, uf, telefone?
//
// 201 { ok, idempotent:false, resgateId, status:"pendente", pontos }   resgate criado, 50 pontos debitados
// 200 { ok, idempotent:true,  resgateId, status }                      já criado (mesma chave; nada debitado)
// 400 morada_invalida|cartao_invalido|idempotencyKey_invalida · 401 token_ausente|token_invalido
// 402 pontos_insuficientes (o cartão conta SÓ pontos de COMPRA)
// 405 metodo_invalido · 503 sistema_pausado|store_indisponivel
// 502 resgate_falhou (o débito foi compensado — rollback; ver §)
//
// FLUXO (decisão do operador + RESSALVA «rollback obrigatório»): a ordem vive em
// `registarResgate()` (`_lib/passe-pontos.mjs`): idempotência pela chave → gate do CARTÃO por
// `podeResgatarCartaoComCompra()` (NUNCA a antiga) → DÉBITO atómico dos 50 pontos → REGISTO do
// pedido em `public.resgates` → ROLLBACK do débito se o registo falhar.
// Sem dados pessoais em logs (P10 / LGPD): a `morada` NUNCA é registada — só códigos de erro.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { validarMorada } from "./_lib/pedidos.mjs";
import { registarResgate, PONTOS_POR_CARTAO } from "./_lib/passe-pontos.mjs";
import { adicionarNotificacao } from "./_lib/notificacoes-usuario.mjs";

const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,200}$/;

async function titular(req) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return { erro: "token_ausente" };
  try {
    const p = await verificarUserSession(bearer);
    const e = String(p?.endereco || "").toLowerCase();
    return /^0x[0-9a-f]{40}$/.test(e) ? { endereco: e } : { erro: "token_invalido" };
  } catch { return { erro: "token_invalido" }; }
}

/** Chave de idempotência: header `x-idempotency-key` tem prioridade; senão o corpo. */
function chaveIdempotencia(req, body) {
  const doHeader = req.headers.get("x-idempotency-key");
  const doBody = body?.idempotencyKey;
  const k = typeof doHeader === "string" && doHeader !== "" ? doHeader : doBody;
  return typeof k === "string" && IDEMPOTENCY_RE.test(k) ? k : null;
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, "resgatar-cartao", 5);
  if (rl) return rl;
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const idempotencyKey = chaveIdempotencia(req, body);
  if (!idempotencyKey) {
    return jsonError(400, "idempotencyKey_invalida", "envie { idempotencyKey } (8–200 chars [A-Za-z0-9._:-])");
  }

  const cartaoId = typeof body?.cartaoId === "string" ? body.cartaoId.trim() : "";
  if (!cartaoId || cartaoId.length > 80) {
    return jsonError(400, "cartao_invalido", "envie { cartaoId } (1–80 chars)");
  }

  // A MORADA é validada pelo MESMO contrato da entrega (`_lib/pedidos.mjs`) — não se duplica a regra.
  let morada;
  try { morada = validarMorada(body?.morada); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, "morada_invalida", err.message, { motivo: err.code });
    throw err;
  }

  let r;
  try { r = await registarResgate(t.endereco, { cartaoId, morada, idempotencyKey }); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível registar o resgate"); }

  if (!r.ok) {
    if (r.code === "PONTOS_INSUFICIENTES") {
      return jsonError(402, "pontos_insuficientes",
        `são precisos ${PONTOS_POR_CARTAO} pontos de compra para resgatar o cartão`);
    }
    if (r.code === "ENDERECO_INVALIDO" || r.code === "CHAVE_INVALIDA" || r.code === "CARTAO_INVALIDO") {
      return jsonError(400, r.code.toLowerCase(), "pedido de resgate inválido");
    }
    // O débito foi compensado (rollback) — nunca se cobra pontos sem criar o pedido.
    console.error("[resgatar-cartao] resgate falhou", { code: r.code, motivo: r.motivo, devolvido: r.pontosDevolvidos });
    return jsonError(502, "resgate_falhou", "não foi possível criar o pedido de resgate",
      { devolvido: r.pontosDevolvidos === true });
  }

  // Notificação ao TITULAR (fail-soft: nunca parte o resgate). A operação vê o pedido na tabela
  // `public.resgates` (status "pendente") — não há aqui endereço da Associação configurado.
  if (r.idempotent !== true) {
    adicionarNotificacao(t.endereco, {
      tipo: "resgate",
      mensagem: "Pedido de resgate do cartão criado. A Associação vai preparar o envio.",
      ref: String(r.resgate?.id ?? ""),
    }).catch(() => {});
  }

  const corpo = {
    ok: true, idempotent: r.idempotent === true,
    resgateId: r.resgate?.id ?? null, status: r.resgate?.status ?? "pendente",
    pontos: r.pontos,
  };
  return r.idempotent === true ? jsonResponse(corpo, 200) : jsonResponse(corpo, 201);
};
