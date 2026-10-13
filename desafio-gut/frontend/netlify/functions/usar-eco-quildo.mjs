// POST /.netlify/functions/usar-eco-quildo — UTAC110e. USA (debita) ECOQUILDO no site oficial.
//
// R18-110e-2 — o ECOQUILDO só se usa no site oficial (www.grupouniaoetrabalho.com.br); NÃO no app.
// ⚠️ Medido no SEG-1 (§-1.9, conflito 4): o `_lib/cors.mjs` só autoriza a origem do APK
//    (`https://localhost`), logo o site NÃO lê a resposta deste endpoint a partir do browser. A
//    integração do site é externa (o enunciado §3 diz «NÃO implementa a loja do site»); as opções
//    (server-to-server vs. allowlist) estão escaladas ao operador. Nada do `cors.mjs` foi tocado.
//
// Header: Authorization: Bearer ***        Body: { valor, idempotencyKey }  (ou header `x-idempotency-key`)
//
// Efeitos (nesta ordem): 1) debita `valor` do saldo (CAS + idempotência `eco-uso:<chave>`);
//                        2) regista o USO no lastro (`total_usado += valor`, reserva -= valor×R$ 1,00).
//                        Falha do lastro → REVERTE o débito (nunca fica saldo sem lastro coerente).
//
// 200 { ok, idempotent:false, saldo, usado, lastro } | 200 { ok, idempotent:true, saldo }
// 400 valor_invalido|idempotencyKey_invalida|saldo_insuficiente
// 401 token_ausente|token_invalido
// 405 metodo_invalido · 409 conflito_concorrencia · 502 debito_falhou|lastro_falhou
// 503 sistema_pausado|store_indisponivel
//
// ⚠️ NÃO existe (e não pode passar a existir) conversão em dinheiro nem transferência entre contas
//    (Art. 49º): este endpoint não aceita destinatário — o débito sai do PRÓPRIO titular do token.
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { captureSecurityAlert } from "./_lib/sentry-server.mjs";
import {
  debitarEcoQuildo, reverterEcoQuildo, registarUsoNoLastro, reverterUsoNoLastro, refUso,
} from "./_lib/eco-quildo.mjs";

// Mesma janela do `x-idempotency-key` da compra de Passe (8–180) — a `ref` leva o prefixo `eco-uso:`.
const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,180}$/;

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

/** Mapeia o `code` da lib para o HTTP do contrato. */
function erroDeDebito(code, extra = {}) {
  if (code === "SALDO_INSUFICIENTE") return jsonError(400, "saldo_insuficiente", "saldo de ECOQUILDO insuficiente", extra);
  if (code === "VALOR_INVALIDO") return jsonError(400, "valor_invalido", "valor deve ser um inteiro positivo", extra);
  if (code === "REF_INVALIDA") return jsonError(400, "idempotencyKey_invalida", "envie { idempotencyKey } (8–180 chars [A-Za-z0-9._:-])", extra);
  if (code === "ENDERECO_INVALIDO") return jsonError(401, "token_invalido", "endereço do titular inválido", extra);
  if (code === "CONFLITO_CONCORRENCIA") return jsonError(409, "conflito_concorrencia", "tente novamente", extra);
  return jsonError(502, "debito_falhou", "não foi possível debitar o ECOQUILDO", { motivo: code, ...extra });
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, "usar-eco-quildo", 10);
  if (rl) return rl;
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");
  const endereco = t.endereco;

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const valor = body?.valor;
  if (!Number.isInteger(valor) || valor <= 0) {
    return jsonError(400, "valor_invalido", "valor deve ser um inteiro positivo (ECOQUILDO)");
  }
  const doHeader = req.headers.get("x-idempotency-key");
  const chave = typeof doHeader === "string" && doHeader !== "" ? doHeader : body?.idempotencyKey;
  if (typeof chave !== "string" || !IDEMPOTENCY_RE.test(chave)) {
    return jsonError(400, "idempotencyKey_invalida", "envie { idempotencyKey } (8–180 chars [A-Za-z0-9._:-])");
  }

  const d = await debitarEcoQuildo(endereco, valor, chave).catch(() => ({ ok: false, code: "ERRO_DB" }));
  if (!d.ok) return erroDeDebito(d.code, d.saldo === undefined ? {} : { saldo: d.saldo });
  // Retry com a MESMA chave: o movimento já existia ⇒ 200 idempotente, sem tocar no lastro outra vez.
  if (d.criado === false) return jsonResponse({ ok: true, idempotent: true, saldo: d.saldo }, 200);

  const l = await registarUsoNoLastro(valor).catch(() => ({ ok: false, code: "ERRO_DB" }));
  if (!l.ok) {
    // Sem lastro coerente, o uso não é válido: devolve o ECOQUILDO ao saldo (idempotência limpa — a `ref`
    // sai do histórico, logo o retry com a mesma chave volta a tentar de novo, como na compra de Passe).
    const rev = await reverterEcoQuildo(endereco, refUso(chave)).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!(rev.ok && rev.revertido)) {
      captureSecurityAlert("usar_eco_quildo_reversao_falhou", { code: rev.code ?? null }, "error").catch(() => {});
    }
    return jsonError(502, "lastro_falhou", "não foi possível registar o uso no lastro",
      { motivo: l.code, devolvido: rev.ok === true && rev.revertido === true });
  }

  return jsonResponse({
    ok: true, idempotent: false,
    saldo: d.saldo, usado: valor,
    lastro: { total_emitido: l.total_emitido, total_usado: l.total_usado, reserva_rs_centavos: l.reserva_rs_centavos },
  }, 200);
};
