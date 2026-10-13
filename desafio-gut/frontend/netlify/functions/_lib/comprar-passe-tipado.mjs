// _lib/comprar-passe-tipado.mjs — UTAC110d (dois Passes) + UTAC110e (ECOQUILDO). Handler partilhado.
//
// Usado por `comprar-passe-relampago.mjs` e `comprar-passe-programado.mjs` (o tipo vem do endpoint,
// nunca do corpo). Fluxo POR LEITURA de `comprar-passe-pontos.mjs` (UTAC106d-v2):
//   1) idempotência pela `ref` = `passe-<tipo>:<chave>` → 200 sem tocar no saldo;
//   2) débito atómico de R$ 2,00 (CAS em `saldoRs.mjs`);
//   3) +10 pontos de fidelidade (`tipo:"compra"` ⇒ contam para o cartão);
//   4) SÓ Relâmpago: +1 CRÉDITO de lance (`ledger-lance.mjs`). Pontos de lance NUNCA (Art. 17º);
//   5) UTAC110e — +1 ECOQUILDO (`eco-quildo.mjs`, R18-110e-1) + lastro em R$ (+R$ 1,00, Art. 47º);
//   6) falha depois do débito → desfaz o que entrou + reembolso; reembolso falhado → alerta.
// Retry de uma compra que ficou A MEIO (pontos sim, crédito/ECOQUILDO não) completa o que falta
// sem voltar a cobrar.
//
// ⚠️ UTAC110e — PORQUE AQUI E NÃO NOS 2 ENDPOINTS: os dois endpoints são wrappers de 8/9 linhas deste
//    handler (`export default (req) => respostaPreflight(req) ?? comprarPasseTipado(req, "…")`). O
//    enunciado do 110e nomeia os dois ficheiros, mas o código real está aqui — creditar nos wrappers
//    criaria dois caminhos que divergem. Declarado no `_logs/UTAC110e_SEG-1_MEDICAO.md` (conflito 1).
//    ⇒ Os DOIS Passes passam a creditar 1 ECOQUILDO, com o MESMO `ref` da compra (idempotência herdada).
// ⚠️ O ECOQUILDO é o ÚLTIMO passo de propósito: uma falha dele desfaz pontos + crédito de lance + R$,
//    pelo que nenhuma compra fica entregue a meio só por causa do ECOQUILDO.
// ⚠️ O motivo do ECOQUILDO depende do TIPO (`passe-relampago`/`passe-programado`) — é o que o
//    `MOTIVOS_EMISSAO` da lib aceita; não há motivo genérico «compra».
//
// 201 { ok, idempotent:false, tipo, pontosFidelidade, creditosLance?, ecoQuildo, saldoRsAntesCentavos, saldoRsDepoisCentavos }
// 200 { ok, idempotent:true, tipo, pontosFidelidade, creditosLance?, ecoQuildo }
// 400 idempotencyKey_invalida · 401 token_ausente|token_invalido · 402 saldo_insuficiente
// 405 metodo_invalido · 502 debito_falhou|creditar_pontos_falhou|creditar_credito_lance_falhou|creditar_eco_quildo_falhou
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
import { creditarCreditoLance, lerLedgerLance, reverterMovimentoLance } from "./ledger-lance.mjs";
import {
  creditarEcoQuildo, lerEcoQuildo, reverterEcoQuildo, registarEmissaoNoLastro,
  ECOQUILDO_POR_PASSE,
} from "./eco-quildo.mjs";

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
  /** Motivo do ECOQUILDO (= tipo do Passe; `MOTIVOS_EMISSAO` não tem um motivo genérico «compra»). */
  const motivoEco = `passe-${tipoPasse}`;

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

  /** Estado da compra com esta `ref`: completa, a meio (falta o crédito e/ou o ECOQUILDO) ou inexistente. */
  async function estado() {
    const reg = await lerPontos(endereco);
    const fid = temRef(reg?.historico, ref);
    if (!fid) return { fid: false, reg };
    const eco = await lerEcoQuildo(endereco);
    const ecoFeito = temRef(eco.historico, ref);
    if (!ehRelampago) return { fid: true, completa: ecoFeito, reg, eco };
    const led = await lerLedgerLance(endereco);
    return { fid: true, completa: ecoFeito && temRef(led.historico, ref), reg, eco, led };
  }

  /** Credita o ECOQUILDO do Passe (+ lastro em R$) — idempotente pelo `ref` da compra. */
  async function garantirEcoQuildo() {
    const ec = await creditarEcoQuildo(endereco, ECOQUILDO_POR_PASSE, motivoEco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!ec.ok) return { ok: false, code: ec.code };
    if (ec.criado === true) {
      const el = await registarEmissaoNoLastro(ECOQUILDO_POR_PASSE).catch(() => ({ ok: false, code: "ERRO_DB" }));
      if (!el.ok) {
        // ECOQUILDO sem lastro em R$ não existe (Art. 50º): desfaz a emissão antes de desistir.
        const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
        if (!(rev.ok && rev.revertido)) {
          captureSecurityAlert(`${nome}_reversao_eco_falhou`, { code: rev.code ?? null }, "error").catch(() => {});
        }
        return { ok: false, code: `lastro:${el.code}`, ecoDesfeito: rev.ok === true && rev.revertido === true };
      }
    }
    return { ok: true, saldo: ec.saldo };
  }

  /** A compra já existe: completa o que falta (sem cobrar) e responde 200. */
  async function respostaIdempotente(st) {
    let creditosLance;
    if (ehRelampago) {
      if (st.completa || temRef(st.led.historico, ref)) creditosLance = st.led.creditos;
      else {
        const c = await creditarCreditoLance(endereco, ref);
        if (!c.ok) return jsonError(502, "creditar_credito_lance_falhou", "não foi possível creditar o lance", { motivo: c.code });
        creditosLance = c.creditos;
      }
    }
    const g = await garantirEcoQuildo();
    if (!g.ok) return jsonError(502, "creditar_eco_quildo_falhou", "não foi possível creditar o ECOQUILDO", { motivo: g.code });
    return jsonResponse({
      ok: true, idempotent: true, tipo: tipoPasse, pontosFidelidade: Number(st.reg?.pontos ?? 0),
      ...(ehRelampago ? { creditosLance } : {}),
      ecoQuildo: g.saldo,
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

  /**
   * Desfaz TUDO o que esta compra creditou (ECOQUILDO, crédito de lance, pontos) e devolve os R$ 2,00.
   * ⚠️ O lastro NÃO é tocado aqui: a única emissão possível é a do passo 5 (`garantirEcoQuildo`), que
   *    já reverte a sua própria emissão quando o lastro falha — e é o ÚLTIMO passo, logo não há
   *    emissão posterior por desfazer. `reverterEcoQuildo` é chamado à mesma (é no-op sem entrada).
   */
  async function desfazerCompra() {
    const revEco = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    let revLance = { ok: true, revertido: false };
    if (ehRelampago) revLance = await reverterMovimentoLance(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    const revPontos = await reverterMovimento(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    const reembolsado = await reembolsar();
    if (!(revEco.ok && revLance.ok && revPontos.ok)) {
      captureSecurityAlert(`${nome}_reversao_falhou`, {
        eco: revEco.code ?? null, lance: revLance.code ?? null, pontos: revPontos.code ?? null,
      }, "error").catch(() => {});
    }
    return {
      reembolsado,
      ecoDesfeito: revEco.ok === true && revEco.revertido === true,
      lanceDesfeito: revLance.ok === true && revLance.revertido === true,
      pontosDesfeitos: revPontos.ok === true && revPontos.revertido === true,
    };
  }

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

  // ── UTAC110e / FRENTE C — ECOQUILDO (Art. 47º-51º; R18-110e-1: 1 por Passe) ──────────────────────
  const eco = await garantirEcoQuildo();
  if (!eco.ok) {
    const desfeito = await desfazerCompra();
    return jsonError(502, "creditar_eco_quildo_falhou", "não foi possível creditar o ECOQUILDO",
      { motivo: eco.code, ...desfeito });
  }

  return jsonResponse({
    ok: true, idempotent: false, tipo: tipoPasse, pontosFidelidade: p.pontos,
    ...(ehRelampago ? { creditosLance } : {}),
    ecoQuildo: eco.saldo,
    saldoRsAntesCentavos: debito.resultado.saldoAntesCentavos,
    saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
  }, 201);
}
