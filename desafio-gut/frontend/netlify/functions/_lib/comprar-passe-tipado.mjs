// _lib/comprar-passe-tipado.mjs — UTAC110d. Handler partilhado da compra dos DOIS Passes Via B.
//
// Usado por `comprar-passe-relampago.mjs` e `comprar-passe-programado.mjs` (o tipo vem do endpoint,
// nunca do corpo). Fluxo POR LEITURA de `comprar-passe-pontos.mjs` (UTAC106d-v2):
//   1) idempotência pela `ref` = `passe-<tipo>:<chave>` → 200 sem tocar no saldo;
//   2) débito atómico de R$ 2,00 (CAS em `saldoRs.mjs`);
//   3) +10 pontos de fidelidade (`tipo:"compra"` ⇒ contam para o cartão);
//   4) SÓ Relâmpago: +1 CRÉDITO de lance (`ledger-lance.mjs`). Pontos de lance NUNCA (Art. 17º);
//   5) falha depois do débito → desfaz o que entrou + reembolso; reembolso falhado → alerta.
// Retry de uma compra Relâmpago que ficou A MEIO (pontos sim, crédito não) completa o crédito
// sem voltar a cobrar.
//
// 201 { ok, idempotent:false, tipo, pontosFidelidade, creditosLance?, saldoRsAntesCentavos, saldoRsDepoisCentavos }
// 200 { ok, idempotent:true, tipo, pontosFidelidade, creditosLance? }
// 400 idempotencyKey_invalida · 401 token_ausente|token_invalido · 402 saldo_insuficiente
// 405 metodo_invalido · 502 debito_falhou|creditar_pontos_falhou|creditar_credito_lance_falhou
// 503 sistema_pausado|store_indisponivel

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./validate.mjs";
import { verificarUserSession } from "./jwt.mjs";
import { aplicarRateLimit } from "./rate-limiter.mjs";
import { sistemaPausado, lerEstadoSistema } from "./system-state.mjs";
import { captureSecurityAlert } from "./sentry-server.mjs";
import { debitarSaldoRs, reembolsarSaldoRs } from "./saldoRs.mjs";
import {
  creditarPontos, lerPontos, reverterMovimento,
  PONTOS_FIDELIDADE_POR_PASSE, VALOR_PASSE_CENTAVOS, TIPO_COMPRA, TIPOS_PASSE, refPasse,
} from "./passe-pontos.mjs";
import { creditarCreditoLance, lerLedgerLance } from "./ledger-lance.mjs";

// 8–180: a `ref` leva o prefixo `passe-<tipo>:` e o limite da `ref` é 200.
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

function chaveIdempotencia(req, body) {
  const doHeader = req.headers.get("x-idempotency-key");
  const k = typeof doHeader === "string" && doHeader !== "" ? doHeader : body?.idempotencyKey;
  return typeof k === "string" && IDEMPOTENCY_RE.test(k) ? k : null;
}

const temRef = (lista, ref) => Array.isArray(lista) && lista.some((h) => h?.ref === ref);

/** Handler da compra de um Passe tipado (`tipoPasse` ∈ TIPOS_PASSE, fixado pelo endpoint). */
export async function comprarPasseTipado(req, tipoPasse) {
  if (!TIPOS_PASSE.includes(tipoPasse)) throw new Error(`tipo de Passe desconhecido: ${tipoPasse}`);
  const ehRelampago = tipoPasse === "relampago";
  const nome = `comprar-passe-${tipoPasse}`;

  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  const rl = await aplicarRateLimit(req, nome, 5);
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
  if (!idempotencyKey) return jsonError(400, "idempotencyKey_invalida", "envie { idempotencyKey } (8–180 chars [A-Za-z0-9._:-])");
  const ref = refPasse(tipoPasse, idempotencyKey);

  /** Estado da compra com esta `ref`: completa, a meio (só Relâmpago) ou inexistente. */
  async function estado() {
    const reg = await lerPontos(endereco);
    const fid = temRef(reg?.historico, ref);
    if (!fid) return { fid: false, reg };
    if (!ehRelampago) return { fid: true, completa: true, reg };
    const led = await lerLedgerLance(endereco);
    return { fid: true, completa: temRef(led.historico, ref), reg, led };
  }

  /** A compra já existe: completa o crédito em falta (sem cobrar) e responde 200. */
  async function respostaIdempotente(st) {
    let creditosLance;
    if (ehRelampago) {
      if (st.completa) creditosLance = st.led.creditos;
      else {
        const c = await creditarCreditoLance(endereco, ref);
        if (!c.ok) return jsonError(502, "creditar_credito_lance_falhou", "não foi possível creditar o lance", { motivo: c.code });
        creditosLance = c.creditos;
      }
    }
    return jsonResponse({
      ok: true, idempotent: true, tipo: tipoPasse, pontosFidelidade: Number(st.reg?.pontos ?? 0),
      ...(ehRelampago ? { creditosLance } : {}),
    }, 200);
  }

  let st;
  try { st = await estado(); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler os pontos"); }
  if (st.fid) return respostaIdempotente(st);

  const debito = await debitarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: nome });
  if (!debito.ok) {
    if (debito.code === "saldo_insuficiente") {
      // Cliques concorrentes na MESMA chave: o vencedor já debitou e creditou.
      const st2 = await estado().catch(() => null);
      if (st2?.fid) return respostaIdempotente(st2);
      return jsonError(402, "saldo_insuficiente", "saldo R$ insuficiente para o Passe (R$ 2,00)");
    }
    return jsonError(502, "debito_falhou", "não foi possível debitar o saldo R$", { motivo: debito.code });
  }

  const reembolsar = async () => {
    const r = await reembolsarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: nome });
    if (!r.ok) captureSecurityAlert(`${nome}_reembolso_falhou`, { code: r.code }, "error").catch(() => {});
    return r.ok;
  };

  let p;
  try { p = await creditarPontos(endereco, PONTOS_FIDELIDADE_POR_PASSE, TIPO_COMPRA, ref); }
  catch { p = { ok: false, code: "ERRO_DB" }; }

  if (!p.ok || !p.criado) {
    // Falha, ou a `ref` já existia (corrida): devolve os R$ 2,00 — nunca cobra duas vezes.
    const reembolsado = await reembolsar();
    if (p.ok) {
      const st3 = await estado().catch(() => null);
      return st3?.fid ? respostaIdempotente(st3) : jsonResponse({ ok: true, idempotent: true, tipo: tipoPasse, reembolsado }, 200);
    }
    return jsonError(502, "creditar_pontos_falhou", "não foi possível creditar os pontos", { reembolsado });
  }

  let creditosLance;
  if (ehRelampago) {
    let c;
    try { c = await creditarCreditoLance(endereco, ref); }
    catch { c = { ok: false, code: "ERRO_DB" }; }
    if (!c.ok) {
      // Sem o lance, o Passe Relâmpago não foi entregue: desfaz os 10 pontos E devolve o dinheiro.
      const rev = await reverterMovimento(endereco, ref);
      const reembolsado = await reembolsar();
      if (!(rev.ok && rev.revertido)) {
        captureSecurityAlert(`${nome}_reversao_pontos_falhou`, { code: rev.code ?? null }, "error").catch(() => {});
      }
      return jsonError(502, "creditar_credito_lance_falhou", "não foi possível creditar o lance",
        { reembolsado, pontosDesfeitos: rev.ok === true && rev.revertido === true });
    }
    creditosLance = c.creditos;
  }

  return jsonResponse({
    ok: true, idempotent: false, tipo: tipoPasse, pontosFidelidade: p.pontos,
    ...(ehRelampago ? { creditosLance } : {}),
    saldoRsAntesCentavos: debito.resultado.saldoAntesCentavos,
    saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
  }, 201);
}
