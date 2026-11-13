// _lib/conversao-eco-passe.mjs — UTAC136. Regulamento v6.0, Art. 23º:
// «A cada 50 ECOQUILDOs acumulados, o sistema efetuará a conversão automática e imediata desse montante
//  em 1 Passe Desafio digital.»
//
// Decisões do operador (R18-136-1/2):
//   • o Passe convertido é um **Passe Programado** no inventário (`passes_inventario`) e dá **+1 ponto de
//     fidelidade** (`tipo:"compra"` ⇒ conta para o cartão, Art. 7º/8º). **Não** dá ECOQUILDO (sem ciclo).
//   • os 50 ECOQUILDOs saem de circulação como **«usado»** no lastro (a reserva desce 50 × R$ 0,50), com o
//     motivo próprio `conversao-passe` no histórico do utilizador (separado do «uso-site»).
//
// Chamado por TODAS as funções que creditam ECOQUILDO, depois do crédito (compra de Passe, indicação,
// crédito de administrador). Fail-soft para o chamador: devolve `{ok:false}` e nunca lança.
//
// Ordem de cada conversão (a idempotente primeiro, a não idempotente por último):
//   1) débito de 50 com `ref = eco-conversao:<k>` — CAS + idempotência por `ref` (`eco-quildo.mjs`).
//      Duas chamadas concorrentes calculam o mesmo `k`: só uma grava (`criado:true`); a outra vê a `ref`
//      e NÃO credita nada (relê e, se ainda houver ≥ 50, tenta o `k` seguinte).
//   2) lastro: `registarUsoNoLastro(50)`.
//   3) +1 ponto de fidelidade com a mesma `ref` (idempotente).
//   4) +1 Passe Programado no inventário (RPC `passes_creditar`, SEM `ref` — por isso é o último).
//   Falha num passo ⇒ desfaz os anteriores pela ordem inversa e pára.
// ⚠️ Limite declarado: um crash do processo ENTRE os passos 1 e 4 deixa a conversão a meio (o inventário
//    não tem `ref` para se provar o que foi feito). Mesmo limite do inventário do UTAC120.

import {
  lerEcoQuildo, debitarConversaoEcoQuildo, reverterEcoQuildo, registarUsoNoLastro, reverterUsoNoLastro,
  ECOQUILDO_POR_CONVERSAO, MOTIVO_CONVERSAO, refConversao,
} from "./eco-quildo.mjs";
import { creditarPontos, reverterMovimento, PONTOS_FIDELIDADE_POR_PASSE, TIPO_COMPRA } from "./passe-pontos.mjs";
import { creditarPasse } from "./passes-inventario.mjs";
import { captureSecurityAlert } from "./sentry-server.mjs";

/** Tipo de Passe que a conversão credita (R18-136-1). */
export const TIPO_PASSE_CONVERSAO = "programado";
/** Teto de conversões numa só chamada (um crédito de admin pode trazer vários múltiplos de 50). */
export const MAX_CONVERSOES_POR_CHAMADA = 100;
const MAX_VOLTAS = MAX_CONVERSOES_POR_CHAMADA * 3; // voltas extra = CAS perdidos para outra chamada

const alertar = (evento, extra) => { captureSecurityAlert(evento, extra, "error").catch(() => {}); };

/** Próximo `k`: nº de conversões já no histórico + 1. */
const proximoK = (historico) => historico.filter((h) => h?.motivo === MOTIVO_CONVERSAO).length + 1;

/**
 * Converte em Passes Programados TODOS os blocos de 50 ECOQUILDOs do saldo actual do endereço.
 * @returns {Promise<{ok:true, convertidos:number, saldo:number} | {ok:false, code:string, convertidos:number, saldo?:number}>}
 */
export async function converterEcoEmPasses(endereco) {
  let convertidos = 0;
  let saldo;
  for (let volta = 0; volta < MAX_VOLTAS && convertidos < MAX_CONVERSOES_POR_CHAMADA; volta++) {
    let eco;
    try { eco = await lerEcoQuildo(endereco); }
    catch { return { ok: false, code: "ERRO_DB", convertidos, saldo }; }
    saldo = eco.saldo;
    if (saldo < ECOQUILDO_POR_CONVERSAO) return { ok: true, convertidos, saldo };

    const ref = refConversao(proximoK(eco.historico));

    // 1) débito idempotente
    const d = await debitarConversaoEcoQuildo(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!d.ok) {
      if (d.code === "SALDO_INSUFICIENTE") return { ok: true, convertidos, saldo: Number(d.saldo ?? saldo) };
      return { ok: false, code: d.code ?? "ERRO_DB", convertidos, saldo };
    }
    if (d.criado !== true) continue; // outra chamada fez esta conversão — relê

    // 2) lastro («usado»)
    const l = await registarUsoNoLastro(ECOQUILDO_POR_CONVERSAO).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!l.ok) {
      const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false }));
      if (!(rev.ok && rev.revertido)) alertar("conversao_eco_reversao_falhou", { etapa: "lastro", code: l.code ?? null });
      return { ok: false, code: `lastro:${l.code}`, convertidos, saldo };
    }

    // 3) +1 ponto de fidelidade (mesma ref)
    const p = await creditarPontos(endereco, PONTOS_FIDELIDADE_POR_PASSE, TIPO_COMPRA, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
    if (!p.ok) {
      const rl = await reverterUsoNoLastro(ECOQUILDO_POR_CONVERSAO).catch(() => ({ ok: false }));
      const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false }));
      if (!(rl.ok && rev.ok && rev.revertido)) alertar("conversao_eco_reversao_falhou", { etapa: "pontos", code: p.code ?? null });
      return { ok: false, code: `pontos:${p.code}`, convertidos, saldo };
    }

    // 4) +1 Passe Programado no inventário (não idempotente ⇒ último)
    const inv = await creditarPasse({ endereco, tipo: TIPO_PASSE_CONVERSAO, quantidade: 1 }).catch(() => ({ ok: false, code: "inventario_indisponivel" }));
    if (!inv.ok) {
      const rp = p.criado === true ? await reverterMovimento(endereco, ref).catch(() => ({ ok: false })) : { ok: true };
      const rl = await reverterUsoNoLastro(ECOQUILDO_POR_CONVERSAO).catch(() => ({ ok: false }));
      const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false }));
      if (!(rp.ok && rl.ok && rev.ok && rev.revertido)) alertar("conversao_eco_reversao_falhou", { etapa: "inventario", code: inv.code ?? null });
      return { ok: false, code: `inventario:${inv.code}`, convertidos, saldo };
    }

    convertidos += 1;
    saldo = d.saldo;
  }
  return { ok: true, convertidos, saldo };
}

/** Versão para os chamadores: nunca lança, alerta em falha. Devolve o resultado (ou `null`). */
export async function converterEcoEmPassesSeguro(endereco, origem) {
  try {
    const r = await converterEcoEmPasses(endereco);
    if (!r.ok) alertar("conversao_eco_falhou", { origem, code: r.code, convertidos: r.convertidos });
    return r;
  } catch (err) {
    alertar("conversao_eco_falhou", { origem, code: "EXCECAO" });
    return null;
  }
}
