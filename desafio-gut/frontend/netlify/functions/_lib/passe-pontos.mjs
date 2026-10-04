// _lib/passe-pontos.mjs — UTAC106d-v2. Pontos de fidelidade (NORTE Via B).
//
// Store: Supabase `public.pontos` — 1 linha por ENDEREÇO (acumulado + histórico JSONB).
// Regra (Via B): 1 Passe = 1 ponto · 50 pontos = 1 cartão colecionável físico.
//
// ⚠️ ADITIVO. NÃO toca no modelo Via A (`_lib/passe.mjs`, `comprar-passe.mjs`, `public.passes`).
//    São conceitos distintos que partilham o nome "Passe": o Via A é 1 Passe = 1 palpite = 1
//    produto (edição Programada + cupons); este é acumulação de PONTOS por endereço.
//
// Padrões herdados POR LEITURA (não cópia cega) de ficheiros existentes:
//   - normalização do endereço para minúsculas ......... `_lib/passe.mjs:15,21` (`normalizar`)
//   - escrita devolve `{ok:false, code}` (nunca excepção no caminho de escrita) ... `_lib/passe.mjs:37,43`
//   - leitura devolve `null` para chave inválida e LANÇA em erro do Supabase ... `_lib/passe.mjs:22,25`
//   - Compare-And-Swap (lê → grava só se o valor não mudou) ... `_lib/saldoRs.mjs:57-66` (`casSaldo`)
//   - timestamps ISO8601 ............... `_lib/saldoRs.mjs:60` (`new Date().toISOString()`)
//   - idempotência pela chave natural / 23505 devolve o existente ... `_lib/passe.mjs:40-47`
//   - sem dados pessoais em logs (P10): só códigos de erro.

import { getSupabase } from "./supabase-client.mjs";

// ── Constantes de negócio (a REGRA vive aqui, nunca como número mágico no endpoint) ──
export const PONTOS_POR_PASSE = 1;
export const PONTOS_POR_CARTAO = 50;
export const VALOR_PASSE_RS = 2.00;
// Derivado — uma só fonte de verdade (o débito do saldo trabalha em CENTAVOS inteiros, saldoRs.mjs:8).
export const VALOR_PASSE_CENTAVOS = Math.round(VALOR_PASSE_RS * 100);

// Tipos de movimento do histórico. "palpite" (bónus +2) é do UTAC106f; "resgate" (cartão) é do UTAC106g.
export const TIPO_COMPRA = "compra";
export const TIPO_PALPITE = "palpite";
export const TIPO_RESGATE = "resgate";
const TIPOS_VALIDOS = Object.freeze([TIPO_COMPRA, TIPO_PALPITE, TIPO_RESGATE]);

const TABELA = "pontos";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const UNIQUE_VIOLATION = "23505";
const MAX_TENTATIVAS = 5;
const REF_MAX = 200;

const normalizar = (e) => String(e ?? "").toLowerCase();
const enderecoValido = (e) => ENDERECO_RE.test(e);

/** Valida os argumentos comuns de crédito/débito. Devolve `{ok:false, code}` ou `null` se válidos. */
function validarArgs(endereco, quantidade, tipo, ref) {
  if (!enderecoValido(normalizar(endereco))) return { ok: false, code: "ENDERECO_INVALIDO" };
  if (!Number.isInteger(quantidade) || quantidade <= 0) return { ok: false, code: "QUANTIDADE_INVALIDA" };
  if (!TIPOS_VALIDOS.includes(tipo)) return { ok: false, code: "TIPO_INVALIDO" };
  if (typeof ref !== "string" || ref.length === 0 || ref.length > REF_MAX) return { ok: false, code: "REF_INVALIDA" };
  return null;
}

/**
 * Lê o registo de pontos do endereço.
 * @returns {Promise<{endereco,pontos,historico,atualizado_em}|null>} — `null` se o endereço é
 *   inválido OU não existe; **lança** em erro do Supabase (o chamador decide o status HTTP).
 */
export async function lerPontos(endereco) {
  const e = normalizar(endereco);
  if (!enderecoValido(e)) return null;
  const { data, error } = await getSupabase().from(TABELA).select("*").eq("endereco", e).maybeSingle();
  if (error) throw new Error(`[passe-pontos] lerPontos falhou: ${error.code ?? error.message}`);
  return data ?? null;
}

/** Devolve só o número de pontos (0 se o endereço não existe). Lança em erro do Supabase. */
export async function getPontos(endereco) {
  const r = await lerPontos(endereco);
  return Number(r?.pontos ?? 0);
}

/** Há pontos suficientes para 1 cartão? (`pontos >= PONTOS_POR_CARTAO`) */
export async function podeResgatarCartao(endereco) {
  return (await getPontos(endereco)) >= PONTOS_POR_CARTAO;
}

/**
 * Aplica um movimento ao histórico com CAS (lê → grava só se `pontos` não mudou entretanto).
 * `delta` positivo = crédito; negativo = débito. Nunca deixa `pontos < 0`.
 * Idempotente por `ref`: se já existe uma entrada com a mesma `ref`, não repete (criado:false).
 * @returns {Promise<{ok:true,criado:boolean,pontos:number,historico:Array}|{ok:false,code:string}>}
 */
async function aplicarMovimento(endereco, delta, tipo, ref) {
  const e = normalizar(endereco);
  const supabase = getSupabase();

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    let atual;
    try {
      atual = await lerPontos(e);
    } catch {
      return { ok: false, code: "ERRO_DB" };
    }

    // Idempotência: a mesma `ref` já creditada/debitada → devolve o estado, sem repetir.
    if (atual && Array.isArray(atual.historico) && atual.historico.some((h) => h?.ref === ref)) {
      return { ok: true, criado: false, pontos: Number(atual.pontos), historico: atual.historico };
    }

    const base = Number(atual?.pontos ?? 0);
    const novoPontos = base + delta; // delta negativo não pode furar o 0 (ver guarda abaixo)
    if (novoPontos < 0) {
      return { ok: false, code: "PONTOS_INSUFICIENTES", pontos: base };
    }
    const entrada = { data: new Date().toISOString(), tipo, pontos: delta, ref };
    const historico = [...(atual?.historico ?? []), entrada];
    const payload = { endereco: e, pontos: novoPontos, historico, atualizado_em: new Date().toISOString() };

    let data, error;
    if (atual == null) {
      // Primeira linha deste endereço: INSERT. Corrida (23505) → relê e repete.
      ({ data, error } = await supabase.from(TABELA).insert(payload).select("endereco"));
      if (error && error.code === UNIQUE_VIOLATION) continue;
    } else {
      // CAS: só grava se `pontos` ainda for o valor lido (fecha o lost-update de créditos concorrentes).
      ({ data, error } = await supabase.from(TABELA)
        .update(payload).eq("endereco", e).eq("pontos", base).select("endereco"));
      if (!error && Array.isArray(data) && data.length === 0) continue; // CAS perdeu → relê
    }
    if (error) return { ok: false, code: "ERRO_DB" };
    return { ok: true, criado: true, pontos: novoPontos, historico };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}

/**
 * Credita pontos + entrada no histórico. Idempotente por `ref`.
 * @returns {Promise<{ok:true,criado:boolean,pontos:number,historico:Array}|{ok:false,code:string}>}
 */
export async function creditarPontos(endereco, quantidade, tipo, ref) {
  const invalido = validarArgs(endereco, quantidade, tipo, ref);
  if (invalido) return invalido;
  return aplicarMovimento(endereco, quantidade, tipo, ref);
}

/**
 * Debita pontos + entrada no histórico. Falha com `PONTOS_INSUFICIENTES` se não chega
 * (nunca deixa saldo negativo). Idempotente por `ref`.
 * @returns {Promise<{ok:true,criado:boolean,pontos:number,historico:Array}|{ok:false,code:string}>}
 */
export async function debitarPontos(endereco, quantidade, tipo, ref) {
  const invalido = validarArgs(endereco, quantidade, tipo, ref);
  if (invalido) return invalido;
  return aplicarMovimento(endereco, -quantidade, tipo, ref);
}
