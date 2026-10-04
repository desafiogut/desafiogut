// POST /.netlify/functions/comprar-passe-pontos — UTAC106d-v2. Compra do Passe Via B (R$ 2,00 → 1 ponto).
//
// ⚠️ ADITIVO. Endpoint NOVO e SEPARADO de `comprar-passe.mjs` (Via A) — que fica intacto.
// Header: Authorization: Bearer ***   ·   Body: { idempotencyKey } (ou header `x-idempotency-key`)
//
// 201 { ok, idempotent:false, pontos, saldoRsAntesCentavos, saldoRsDepoisCentavos }  ponto creditado, R$ 2,00 debitado
// 200 { ok, idempotent:true,  pontos }                                              já comprado (nada debitado)
// 400 idempotencyKey_invalida · 401 token_ausente|token_invalido · 402 saldo_insuficiente
// 405 metodo_invalido · 502 debito_falhou|creditar_pontos_falhou (com reembolso) · 503 sistema_pausado|store_indisponivel
//
// IDEMPOTÊNCIA (chave do cliente, `idempotencyKey`): o mesmo pedido repetido (duplo clique) cobra UMA vez.
// O fluxo é o MESMO do `comprar-passe.mjs` (Via A), por leitura — não por cópia:
//   1) verifica se a `ref` já está no histórico de pontos → 200 sem tocar no saldo;
//   2) debita o saldo R$ (atómico, CAS — `saldoRs.mjs`);
//   3) credita o ponto com a `ref` da chave. Se a `ref` JÁ existir (corrida) → REEMBOLSA e devolve 200;
//   4) qualquer falha depois do débito → reembolso; reembolso falhado → alerta (nunca cobra sem entregar).
// Sem dados pessoais em logs (P10): só códigos de erro.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { captureSecurityAlert } from "./_lib/sentry-server.mjs";
import { debitarSaldoRs, reembolsarSaldoRs } from "./_lib/saldoRs.mjs";
import { creditarPontos, lerPontos, PONTOS_POR_PASSE, VALOR_PASSE_CENTAVOS, TIPO_COMPRA } from "./_lib/passe-pontos.mjs";

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

  const rl = await aplicarRateLimit(req, "comprar-passe-pontos", 5);
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

  const idempotencyKey = chaveIdempotencia(req, body);
  if (!idempotencyKey) return jsonError(400, "idempotencyKey_invalida", "envie { idempotencyKey } (8–200 chars [A-Za-z0-9._:-])");

  // Idempotência (caminho rápido): a mesma chave já creditada → 200 sem tocar no saldo.
  let atual;
  try { atual = await lerPontos(endereco); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler os pontos"); }
  if (atual && Array.isArray(atual.historico) && atual.historico.some((h) => h?.ref === idempotencyKey)) {
    return jsonResponse({ ok: true, idempotent: true, pontos: Number(atual.pontos) }, 200);
  }

  // Débito atómico (CAS no saldoRs.mjs): recusa com `saldo_insuficiente` se não chega — nunca negativo.
  const debito = await debitarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: "comprar-passe-pontos" });
  if (!debito.ok) {
    if (debito.code === "saldo_insuficiente") {
      // Cliques concorrentes na MESMA chave: o que ganhou já debitou e creditou — o perdedor devolve-o.
      const jaTem = await lerPontos(endereco).catch(() => null);
      if (jaTem?.historico?.some((h) => h?.ref === idempotencyKey)) {
        return jsonResponse({ ok: true, idempotent: true, pontos: Number(jaTem.pontos) }, 200);
      }
      return jsonError(402, "saldo_insuficiente", "saldo R$ insuficiente para o Passe (R$ 2,00)");
    }
    return jsonError(502, "debito_falhou", "não foi possível debitar o saldo R$", { motivo: debito.code });
  }

  // Crédito do ponto. Falha, corrida ou EXCEPÇÃO depois do débito → devolve o R$ 2,00.
  let r;
  try { r = await creditarPontos(endereco, PONTOS_POR_PASSE, TIPO_COMPRA, idempotencyKey); }
  catch { r = { ok: false, code: "ERRO_DB" }; }

  if (r.ok && r.criado) {
    return jsonResponse({
      ok: true, idempotent: false, pontos: r.pontos,
      saldoRsAntesCentavos: debito.resultado.saldoAntesCentavos,
      saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
    }, 201);
  }

  const reembolso = await reembolsarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: "comprar-passe-pontos" });
  if (!reembolso.ok) {
    captureSecurityAlert("comprar_passe_pontos_reembolso_falhou", { code: reembolso.code }, "error").catch(() => {});
  }
  if (r.ok) return jsonResponse({ ok: true, idempotent: true, pontos: r.pontos, reembolsado: reembolso.ok }, 200);
  console.error("[comprar-passe-pontos] creditar pontos falhou", { code: r.code, reembolsado: reembolso.ok });
  return jsonError(502, "creditar_pontos_falhou", "não foi possível creditar os pontos", { reembolsado: reembolso.ok });
};
