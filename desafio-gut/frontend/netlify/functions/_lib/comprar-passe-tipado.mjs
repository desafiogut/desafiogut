// _lib/comprar-passe-tipado.mjs — UTAC110d (dois Passes) + UTAC110e (ECOQUILDO) + UTAC110i.1 (Google Play).
// Handler partilhado das compras do Passe Desafio.
//
// DOIS PAGAMENTOS, UMA CADEIA DE CRÉDITO (R18-110i.1-1, decisão do operador):
//   · PIX / saldo R$  → `comprarPasseTipado(req, tipoPasse)`, usado pelos endpoints
//     `comprar-passe-relampago.mjs` e `comprar-passe-programado.mjs`. DEBITA R$ 2,00 (CAS em
//     `saldoRs.mjs`) e reembolsa em qualquer falha.
//   · Google Play     → `creditarPasseGoogle({ endereco, tipoPasse, ref })`, usado pelo endpoint
//     `validar-compra-google.mjs` DEPOIS de o servidor ter validado o recibo contra a Google. NÃO
//     debita nem reembolsa R$ (o dinheiro foi para a Google) — credita exactamente os mesmos
//     benefícios, pela MESMA cadeia (`creditarBeneficios`), extraída para este efeito.
// ⇒ O caminho PIX fica INTACTO (GATE 4): a extracção é uma refactorização sem mudança de
//   comportamento, guardada pelos testes do 110d/110e (e pela prova de mutação deles).
//
// Cadeia de benefícios de UM Passe (quaisquer que seja o pagamento) — Regulamento v6.0 (UTAC136):
//   +1 ponto de fidelidade (`tipo:"compra"` ⇒ conta para o cartão; Art. 7º/8º v6 — era 10)
//   +1 ECOQUILDO + lastro em R$ (`eco-quildo.mjs`; Art. 21º-23º v6) — ÚLTIMO passo de propósito
//   ⛔ SEM pontos de lance (Art. 6º v6, Google Play Gamified Loyalty). Até ao UTAC136 o Relâmpago dava
//      +200 PONTOS DE LANCE (UTAC110n, R18-110j.4b-3). Saiu da cadeia; a constante
//      `PONTOS_LANCE_POR_PASSE_RELAMPAGO` fica em `ledger-lance.mjs` como registo, sem chamadores aqui.
//
// Idempotência: por `ref` em CADA ledger. No PIX a `ref` vem da `idempotencyKey` do cliente; no
// Google Play vem do `purchaseToken` (hash) — ver `refGoogle` em `validar-compra-google.mjs`.
// Um retry de uma compra A MEIO completa o que falta sem voltar a cobrar/creditar.
//
// 201 { ok, idempotent:false, tipo, pontosFidelidade, creditosLance?(legado, 0), ecoQuildo, saldoRsAntesCentavos, saldoRsDepoisCentavos }
// 200 { ok, idempotent:true, tipo, pontosFidelidade, creditosLance?(legado, 0), ecoQuildo }
// 400 idempotencyKey_invalida · 401 token_ausente|token_invalido · 402 saldo_insuficiente
// 405 metodo_invalido · 502 debito_falhou|creditar_pontos_falhou|creditar_eco_quildo_falhou
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
import {
  creditarEcoQuildo, lerEcoQuildo, reverterEcoQuildo, registarEmissaoNoLastro,
  ECOQUILDO_POR_PASSE,
} from "./eco-quildo.mjs";
import { converterEcoEmPassesSeguro } from "./conversao-eco-passe.mjs";

// 8–180: a `ref` leva o prefixo `passe-<tipo>:` e o limite da `ref` é 200.
const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,180}$/;

// UTAC112 — compra múltipla. No PIX/saldo (PWA) o cliente escolhe um dos pacotes; na Google Play a quantidade
// vem do RECIBO (o utilizador escolhe-a no ecrã da Google — «Multi-quantity», R18-112-A), logo aceita-se
// qualquer inteiro de 1 a MAX_QUANTIDADE_GOOGLE. Os benefícios multiplicam-se DENTRO da mesma `ref`: um só
// movimento de N× em cada ledger, o que mantém a idempotência e a reversão por `ref` exactamente como em 1×.
export const QUANTIDADES_PASSE = Object.freeze([1, 3, 5, 10]);
export const MAX_QUANTIDADE_GOOGLE = 100;
const quantidadeGoogleValida = (q) => Number.isSafeInteger(q) && q >= 1 && q <= MAX_QUANTIDADE_GOOGLE;

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

/** UTAC112 — N de uma compra já creditada = pontos de fidelidade desta `ref` ÷ PONTOS_FIDELIDADE_POR_PASSE
 *  (1 se ilegível). ⚠️ UTAC136: compras anteriores ao v6 creditaram 10 × N; lidas com o rácio 1 dão 10 × N.
 *  Medido em produção: 0 compras a meio, logo isto só afecta o campo `quantidade` da resposta idempotente
 *  de uma compra ANTIGA (o ECOQUILDO dessa `ref` já existe e o `creditarEcoQuildo` é no-op). */
function quantidadeJaCreditada(reg, ref) {
  const e = Array.isArray(reg?.historico) ? reg.historico.find((h) => h?.ref === ref) : null;
  const n = Number(e?.pontos) / PONTOS_FIDELIDADE_POR_PASSE;
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

/** Contexto de um tipo de Passe (o que a cadeia precisa de saber do tipo). */
function contexto(tipoPasse, quantidade = 1) {
  return {
    tipoPasse,
    quantidade,
    ehRelampago: tipoPasse === "relampago",
    nome: `comprar-passe-${tipoPasse}`,
    // `MOTIVOS_EMISSAO` não tem um motivo genérico «compra»: o do ECOQUILDO é o tipo do Passe.
    motivoEco: `passe-${tipoPasse}`,
  };
}

/** Estado da compra com esta `ref`: completa, a meio (falta o ECOQUILDO) ou inexistente.
 *  UTAC136: o Relâmpago já não tem pontos de lance, logo o estado é o mesmo para os dois tipos. */
async function estadoDaCompra(ctx, endereco, ref) {
  const reg = await lerPontos(endereco);
  const fid = temRef(reg?.historico, ref);
  if (!fid) return { fid: false, reg };
  const eco = await lerEcoQuildo(endereco);
  return { fid: true, completa: temRef(eco.historico, ref), reg, eco };
}

/** Credita o ECOQUILDO do Passe (+ lastro em R$) — idempotente pelo `ref` da compra. */
async function garantirEcoDoPasse(ctx, endereco, ref) {
  const ec = await creditarEcoQuildo(endereco, ECOQUILDO_POR_PASSE * ctx.quantidade, ctx.motivoEco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
  if (!ec.ok) return { ok: false, code: ec.code };
  if (ec.criado === true) {
    const el = await registarEmissaoNoLastro(ECOQUILDO_POR_PASSE * ctx.quantidade).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!el.ok) {
      // ECOQUILDO sem lastro em R$ não existe (Art. 50º): desfaz a emissão antes de desistir.
      const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
      if (!(rev.ok && rev.revertido)) {
        captureSecurityAlert(`${ctx.nome}_reversao_eco_falhou`, { code: rev.code ?? null }, "error").catch(() => {});
      }
      return { ok: false, code: `lastro:${el.code}`, ecoDesfeito: rev.ok === true && rev.revertido === true };
    }
  }
  // UTAC136 — Art. 23º v6: ≥ 50 ECOQUILDOs ⇒ conversão automática em Passe(s). Fail-soft: uma falha da
  // conversão não desfaz a compra (o ECOQUILDO fica no saldo e converte-se no próximo crédito).
  const conv = await converterEcoEmPassesSeguro(endereco, ctx.nome);
  const saldo = conv?.ok && conv.convertidos > 0 ? conv.saldo : ec.saldo;
  return { ok: true, saldo, ...(conv?.convertidos > 0 ? { passesConvertidos: conv.convertidos } : {}) };
}

/**
 * Completa o que FALTA numa compra cuja `ref` já entrou nos pontos (sem cobrar nada): o ECOQUILDO.
 * É o que permite a um retry fechar uma compra a meio. (UTAC136: sem pontos de lance — Art. 6º v6.)
 * @returns {Promise<{ok:true, pontos:number, ecoQuildo:number}|{ok:false, etapa:string, code:string}>}
 */
async function completarPendentes(ctxPedido, endereco, ref, st) {
  // A quantidade de uma compra A MEIO é a que JÁ foi creditada nos pontos (com esta `ref`) —
  // nunca a do retry: o que falta completa-se na mesma proporção.
  const ctx = { ...ctxPedido, quantidade: quantidadeJaCreditada(st.reg, ref) };
  const g = await garantirEcoDoPasse(ctx, endereco, ref);
  if (!g.ok) return { ok: false, etapa: "eco", code: g.code };
  return { ok: true, pontos: Number(st.reg?.pontos ?? 0), ecoQuildo: g.saldo };
}

/**
 * CADEIA DE CRÉDITO dos benefícios de um Passe. **Não cobra e não reembolsa nada** — o pagamento é
 * do chamador (R$ no PIX, Google no Billing). Idempotente por `ref`.
 * UTAC136 (Regulamento v6.0): +1 ponto de fidelidade por Passe e +1 ECOQUILDO. **Nenhum ponto de lance**
 * (Art. 6º) — nem no Relâmpago.
 * @returns {Promise<{ok:true, pontos:number, ecoQuildo:number}|
 *                   {ok:false, etapa:"pontos"|"eco", code:string|null, jaExistia?:boolean, pontos?:number}>}
 */
async function creditarBeneficios(ctx, endereco, ref) {
  let p;
  try { p = await creditarPontos(endereco, PONTOS_FIDELIDADE_POR_PASSE * ctx.quantidade, TIPO_COMPRA, ref); }
  catch { p = { ok: false, code: "ERRO_DB" }; }

  if (!p.ok || !p.criado) {
    // Falha, ou a `ref` já existia (corrida/retry): quem paga decide o que fazer com o dinheiro.
    return { ok: false, etapa: "pontos", code: p.code ?? null, jaExistia: p.ok === true && p.criado === false, pontos: p.pontos };
  }

  const eco = await garantirEcoDoPasse(ctx, endereco, ref);
  if (!eco.ok) return { ok: false, etapa: "eco", code: eco.code, pontos: p.pontos };
  return { ok: true, pontos: p.pontos, ecoQuildo: eco.saldo };
}

/**
 * Desfaz TUDO o que a compra creditou (ECOQUILDO, pontos) no âmbito do pagamento indicado por
 * `reembolsar`. ⚠️ O lastro NÃO é tocado: a única emissão possível é a do ECOQUILDO, que reverte a
 * sua própria emissão quando o lastro falha — e é o ÚLTIMO passo.
 */
async function desfazerCompra(ctx, endereco, ref, reembolsar) {
  const revEco = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
  const revPontos = await reverterMovimento(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
  const reembolsado = await reembolsar();
  if (!(revEco.ok && revPontos.ok)) {
    captureSecurityAlert(`${ctx.nome}_reversao_falhou`, {
      eco: revEco.code ?? null, pontos: revPontos.code ?? null,
    }, "error").catch(() => {});
  }
  return {
    reembolsado,
    ecoDesfeito: revEco.ok === true && revEco.revertido === true,
    pontosDesfeitos: revPontos.ok === true && revPontos.revertido === true,
  };
}

/** LEGADO (110d/110n): o Relâmpago respondia `creditosLance`/`pontosLance`. O crédito já não existe e,
 *  desde o UTAC136, também não há pontos de lance; `creditosLance: 0` fica para não partir clientes antigos. */
const camposLegadoRelampago = (ctx) => (ctx.ehRelampago ? { creditosLance: 0 } : {});

/** A compra já existe: completa o que falta (sem cobrar) e responde 200. */
async function respostaIdempotente(ctx, endereco, ref, st) {
  const c = await completarPendentes(ctx, endereco, ref, st);
  if (!c.ok) return jsonError(502, "creditar_eco_quildo_falhou", "não foi possível creditar o ECOQUILDO", { motivo: c.code });
  return jsonResponse({
    ok: true, idempotent: true, tipo: ctx.tipoPasse, quantidade: quantidadeJaCreditada(st.reg, ref), pontosFidelidade: c.pontos,
    ...camposLegadoRelampago(ctx),
    ecoQuildo: c.ecoQuildo,
  }, 200);
}

/** Handler da compra de um Passe tipado por SALDO R$ (`tipoPasse` ∈ TIPOS_PASSE, fixado pelo endpoint). */
export async function comprarPasseTipado(req, tipoPasse) {
  if (!TIPOS_PASSE.includes(tipoPasse)) throw new Error(`tipo de Passe desconhecido: ${tipoPasse}`);
  let ctx = contexto(tipoPasse);

  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  const rl = await aplicarRateLimit(req, ctx.nome, 5);
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

  // UTAC112 — pacote de 1, 3, 5 ou 10 Passes (ausente = 1, o comportamento de sempre). SEM coerção.
  const quantidade = body?.quantidade === undefined ? 1 : body.quantidade;
  if (!QUANTIDADES_PASSE.includes(quantidade)) {
    return jsonError(400, "quantidade_invalida", `quantidade tem de ser ${QUANTIDADES_PASSE.join(", ")}`);
  }
  ctx = contexto(tipoPasse, quantidade);
  const valorCentavos = VALOR_PASSE_CENTAVOS * quantidade;

  let st;
  try { st = await estadoDaCompra(ctx, endereco, ref); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler os pontos"); }
  if (st.fid) return respostaIdempotente(ctx, endereco, ref, st);

  const debito = await debitarSaldoRs({ endereco, valorCentavos, motivo: ctx.nome });
  if (!debito.ok) {
    if (debito.code === "saldo_insuficiente") {
      // Cliques concorrentes na MESMA chave: o vencedor já debitou e creditou.
      const st2 = await estadoDaCompra(ctx, endereco, ref).catch(() => null);
      if (st2?.fid) return respostaIdempotente(ctx, endereco, ref, st2);
      return jsonError(402, "saldo_insuficiente",
        `saldo R$ insuficiente para ${quantidade === 1 ? "o Passe" : `${quantidade} Passes`} (R$ ${(valorCentavos / 100).toFixed(2).replace(".", ",")})`,
        { quantidade, valorCentavos });
    }
    return jsonError(502, "debito_falhou", "não foi possível debitar o saldo R$", { motivo: debito.code });
  }

  const reembolsar = async () => {
    const r = await reembolsarSaldoRs({ endereco, valorCentavos, motivo: ctx.nome });
    if (!r.ok) captureSecurityAlert(`${ctx.nome}_reembolso_falhou`, { code: r.code }, "error").catch(() => {});
    return r.ok;
  };

  const cred = await creditarBeneficios(ctx, endereco, ref);

  if (!cred.ok) {
    // ── pontos ──────────────────────────────────────────────────────────────────────────────────
    if (cred.etapa === "pontos") {
      // Nada foi creditado: devolve os R$ 2,00 — nunca cobra duas vezes.
      const reembolsado = await reembolsar();
      if (cred.jaExistia) {
        const st3 = await estadoDaCompra(ctx, endereco, ref).catch(() => null);
        return st3?.fid ? respostaIdempotente(ctx, endereco, ref, st3) : jsonResponse({ ok: true, idempotent: true, tipo: tipoPasse, reembolsado }, 200);
      }
      return jsonError(502, "creditar_pontos_falhou", "não foi possível creditar os pontos", { reembolsado });
    }
    // ── ECOQUILDO ───────────────────────────────────────────────────────────────────────────────
    const desfeito = await desfazerCompra(ctx, endereco, ref, reembolsar);
    return jsonError(502, "creditar_eco_quildo_falhou", "não foi possível creditar o ECOQUILDO",
      { motivo: cred.code, ...desfeito });
  }

  return jsonResponse({
    ok: true, idempotent: false, tipo: tipoPasse, quantidade, pontosFidelidade: cred.pontos,
    ...camposLegadoRelampago(ctx),
    ecoQuildo: cred.ecoQuildo,
    saldoRsAntesCentavos: debito.resultado.saldoAntesCentavos,
    saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
  }, 201);
}

/**
 * UTAC110i.1 (FRENTE C) — CREDITA um Passe pago no GOOGLE PLAY, **sem débito nem reembolso de R$**.
 * Chamado por `validar-compra-google.mjs` SÓ depois de a Google Play Developer API ter confirmado o
 * recibo (`purchaseState === 0`). R18-110i.1-1: reusa a MESMA cadeia de crédito do PIX.
 *
 * @param {{endereco:string, tipoPasse:"relampago"|"programado", ref:string, quantidade?:number}} args
 *   `ref` = derivada do `purchaseToken` (a idempotência é do recibo, não do clique).
 * @returns {Promise<{ok:true, idempotent:boolean, pontos:number, creditosLance:number|undefined,
 *                    ecoQuildo:number} | {ok:false, etapa:string, code:string}>}
 */
export async function creditarPasseGoogle({ endereco, tipoPasse, ref, quantidade = 1 }) {
  if (!TIPOS_PASSE.includes(tipoPasse)) return { ok: false, etapa: "pedido", code: "tipo_invalido" };
  if (typeof ref !== "string" || ref.length === 0 || ref.length > 200) return { ok: false, etapa: "pedido", code: "ref_invalida" };
  // UTAC112 — a quantidade é a do RECIBO da Google (já validado pelo servidor): 1..MAX_QUANTIDADE_GOOGLE.
  if (!quantidadeGoogleValida(quantidade)) return { ok: false, etapa: "pedido", code: "quantidade_invalida" };
  const ctx = contexto(tipoPasse, quantidade);

  let st;
  try { st = await estadoDaCompra(ctx, endereco, ref); }
  catch { return { ok: false, etapa: "store", code: "store_indisponivel" }; }
  if (st.fid) {
    const c = await completarPendentes(ctx, endereco, ref, st);
    if (!c.ok) return c;
    return { ok: true, idempotent: true, pontos: c.pontos, ecoQuildo: c.ecoQuildo,
      ...camposLegadoRelampago(ctx) };
  }

  const cred = await creditarBeneficios(ctx, endereco, ref);
  if (!cred.ok) {
    if (cred.etapa === "pontos" && cred.jaExistia) {
      // Corrida: outra tentativa creditou os pontos entre a leitura e a escrita — completa o resto.
      const st2 = await estadoDaCompra(ctx, endereco, ref).catch(() => null);
      if (st2?.fid) {
        const c = await completarPendentes(ctx, endereco, ref, st2);
        if (!c.ok) return c;
        return { ok: true, idempotent: true, pontos: c.pontos, ecoQuildo: c.ecoQuildo,
          ...camposLegadoRelampago(ctx) };
      }
    }
    return cred;
  }
  return { ok: true, idempotent: false, pontos: cred.pontos, ecoQuildo: cred.ecoQuildo,
    ...camposLegadoRelampago(ctx) };
}
