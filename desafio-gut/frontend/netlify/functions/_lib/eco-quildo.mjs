// _lib/eco-quildo.mjs — UTAC110e. ECOQUILDO: moeda social interna com lastro em R$ (Via B).
//
// Regulamento 5.0, CAPÍTULO VII (Art. 47º-51º):
//   • Art. 47º — moeda social do Grupo União e Trabalho, lastro em reais à razão de **1 ECOQUILDO = R$ 1,00**.
//   • Art. 48º — concedido como benefício da aquisição do **Passe Desafio**; usado para produtos/serviços no
//                site oficial. (⚠️ O Art. 48º II também fala de «novos Passes Desafio no aplicativo» — o
//                Regulamento contradiz a decisão R18-110e-2 do operador («só no site, não no app»); a
//                correcção do Regulamento é pendência registada no SEG-1 §-1.9, conflito 3.)
//   • Art. 49º — **NÃO convertível em dinheiro e NÃO transferível a terceiros**. Não existe, e não pode
//                passar a existir aqui, nenhuma função de conversão ou de transferência entre endereços.
//   • Art. 50º — a Associação mantém reserva em reais correspondente ao total emitido.
//   • Art. 51º — 1 ECOQUILDO de boas-vindas; indicação confirmada = 2 (indicante) + 1 (indicado).
//
// Store: tabelas PRÓPRIAS `public.eco_quildo` (saldo + histórico por endereço) e `public.eco_quildo_lastro`
// (linha única id = 1). Separadas de `public.pontos` de propósito: o ECOQUILDO é dinheiro indexado
// (lastro em R$), com CHECK próprio e um lastro global — misturá-lo nas colunas de `pontos` faria uma
// escrita CAS de fidelidade competir com uma de dinheiro na MESMA linha.
//
// Padrões herdados POR LEITURA de `_lib/ledger-lance.mjs` (não cópia cega):
//   - normalização/validação do endereço ............ `normalizar` / ENDERECO_RE
//   - escrita devolve `{ok:false, code}`, leitura LANÇA em erro do Supabase
//   - CAS (lê → grava só se nada mudou) + idempotência por `ref` no array do histórico
//   - 23505 no INSERT da 1.ª linha → relê e repete; `MAX_TENTATIVAS`
//
// ⚠️ UNIDADES (o erro mais caro possível neste ficheiro): `saldo`, `total_emitido` e `total_usado` contam
//    ECOQUILDO (inteiros); a coluna `reserva_rs_centavos` conta CENTAVOS de R$. A conversão vive SÓ na
//    constante `CENTAVOS_POR_ECOQUILDO` (e em `reservaDe`), nunca espalhada pelas chamadas.

import { getSupabase } from "./supabase-client.mjs";

/** Art. 47º — 1 ECOQUILDO = R$ 1,00 = 100 centavos. ÚNICO lugar onde a razão é escrita. */
export const CENTAVOS_POR_ECOQUILDO = 100;

/** R18-110e-1 — 1 ECOQUILDO por Passe comprado. */
export const ECOQUILDO_POR_PASSE = 1;

/** Motivos que EMITEM ECOQUILDO. Fechado: nenhum outro motivo pode creditar (Art. 48º/51º). */
export const MOTIVOS_EMISSAO = Object.freeze(["passe-relampago", "passe-programado", "boas-vindas", "indicacao"]);

/** Motivo único do USO (site oficial). A circulação é restrita (Art. 49º) — não há outros destinos. */
export const MOTIVO_USO = "uso-site";

const TABELA = "eco_quildo";
const TABELA_LASTRO = "eco_quildo_lastro";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const UNIQUE_VIOLATION = "23505";
const MAX_TENTATIVAS = 5;
const REF_MAX = 200;
const COLUNAS = "endereco,saldo,historico,atualizado_em";
const COLUNAS_LASTRO = "id,total_emitido,total_usado,reserva_rs_centavos,atualizado_em";

const normalizar = (e) => String(e ?? "").toLowerCase();
const refValida = (r) => typeof r === "string" && r.length > 0 && r.length <= REF_MAX;
const ehInteiroPositivo = (v) => Number.isInteger(v) && v > 0;

/** Reserva em centavos que garante o lastro do que está EM CIRCULAÇÃO: (emitido − usado) × R$ 1,00. */
export const reservaDe = (totalEmitido, totalUsado) =>
  (Number(totalEmitido) - Number(totalUsado)) * CENTAVOS_POR_ECOQUILDO;

/** `ref` de idempotência de um USO: `eco-uso:<idempotencyKey>` (mesma convenção do `refResgate`). */
export const refUso = (idempotencyKey) => `eco-uso:${idempotencyKey}`;

/** `ref` de idempotência de um CRÉDITO de administrador: `eco-admin:<chave>` (namespace próprio, para não
 *  colidir com as `ref` de compra de Passe — `passe-<tipo>:<chave>` — que a FRENTE C reutiliza). */
export const refCreditoAdmin = (chave) => `eco-admin:${chave}`;

/**
 * Lê o saldo e o histórico de ECOQUILDO de um endereço.
 * Endereço inválido ou sem linha → zeros. **Lança** em erro do Supabase (o chamador decide o HTTP).
 * @returns {Promise<{saldo:number, historico:Array}>}
 */
export async function lerEcoQuildo(endereco) {
  const e = normalizar(endereco);
  if (!ENDERECO_RE.test(e)) return { saldo: 0, historico: [] };
  const { data, error } = await getSupabase().from(TABELA).select(COLUNAS).eq("endereco", e).maybeSingle();
  if (error) throw new Error(`[eco-quildo] ler falhou: ${error.code ?? error.message}`);
  return {
    saldo: Number(data?.saldo ?? 0),
    historico: Array.isArray(data?.historico) ? data.historico : [],
  };
}

/**
 * Lê o lastro global (linha única `id = 1`). **Lança** em erro do Supabase.
 * Linha ausente (migração não aplicada / INSERT falhado) → zeros — o chamador compara com o esperado.
 * @returns {Promise<{total_emitido:number, total_usado:number, reserva_rs_centavos:number}>}
 */
export async function lerLastro() {
  const { data, error } = await getSupabase().from(TABELA_LASTRO).select(COLUNAS_LASTRO).eq("id", 1).maybeSingle();
  if (error) throw new Error(`[eco-quildo] lastro falhou: ${error.code ?? error.message}`);
  return {
    total_emitido: Number(data?.total_emitido ?? 0),
    total_usado: Number(data?.total_usado ?? 0),
    reserva_rs_centavos: Number(data?.reserva_rs_centavos ?? 0),
  };
}

/**
 * Movimento genérico no saldo, com CAS + idempotência por `ref`. Nunca deixa o saldo < 0.
 * Escreve SÓ as colunas da `eco_quildo` (o lastro tem função própria — `aplicarLastro`).
 */
async function aplicarMovimento(endereco, delta, motivo, ref) {
  const e = normalizar(endereco);
  if (!ENDERECO_RE.test(e)) return { ok: false, code: "ENDERECO_INVALIDO" };
  if (!refValida(ref)) return { ok: false, code: "REF_INVALIDA" };
  const supabase = getSupabase();

  for (let t = 1; t <= MAX_TENTATIVAS; t++) {
    let atual;
    try {
      const { data, error } = await supabase.from(TABELA).select(COLUNAS).eq("endereco", e).maybeSingle();
      if (error) return { ok: false, code: "ERRO_DB" };
      atual = data ?? null;
    } catch { return { ok: false, code: "ERRO_DB" }; }

    const hist = Array.isArray(atual?.historico) ? atual.historico : [];
    const saldo = Number(atual?.saldo ?? 0);
    if (hist.some((h) => h?.ref === ref)) {
      return { ok: true, criado: false, saldo, historico: hist };
    }

    const novo = saldo + delta;
    if (novo < 0) return { ok: false, code: "SALDO_INSUFICIENTE", saldo };

    const entrada = { data: new Date().toISOString(), motivo, delta, ref, saldo: novo };
    const historico = [...hist, entrada];
    const payload = { saldo: novo, historico, atualizado_em: new Date().toISOString() };

    let data, error;
    if (atual == null) {
      ({ data, error } = await supabase.from(TABELA).insert({ endereco: e, ...payload }).select("endereco"));
      if (error && error.code === UNIQUE_VIOLATION) continue;
    } else {
      ({ data, error } = await supabase.from(TABELA).update(payload)
        .eq("endereco", e).eq("saldo", saldo).eq("atualizado_em", atual.atualizado_em).select("endereco"));
      if (!error && Array.isArray(data) && data.length === 0) continue; // CAS perdeu → relê
    }
    if (error) return { ok: false, code: "ERRO_DB" };
    return { ok: true, criado: true, saldo: novo, historico };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}

/**
 * EMITE `valor` ECOQUILDO para `endereco`. Idempotente por `ref` (a MESMA `ref` nunca credita duas vezes).
 * @param {string} motivo ∈ `MOTIVOS_EMISSAO`
 * @returns {Promise<{ok:boolean, criado?:boolean, saldo?:number, historico?:Array, code?:string}>}
 */
export function creditarEcoQuildo(endereco, valor, motivo, ref) {
  if (!MOTIVOS_EMISSAO.includes(motivo)) return Promise.resolve({ ok: false, code: "MOTIVO_INVALIDO" });
  if (!ehInteiroPositivo(valor)) return Promise.resolve({ ok: false, code: "VALOR_INVALIDO" });
  return aplicarMovimento(endereco, valor, motivo, ref);
}

/**
 * DEBITA `valor` ECOQUILDO (uso no site oficial). Idempotente por `idempotencyKey` (`eco-uso:<chave>`).
 * Saldo insuficiente → `SALDO_INSUFICIENTE` **sem escrever nada** (nunca negativo — Art. 49º/CHECK).
 * @returns {Promise<{ok:boolean, criado?:boolean, saldo?:number, historico?:Array, code?:string}>}
 */
export function debitarEcoQuildo(endereco, valor, idempotencyKey) {
  if (!ehInteiroPositivo(valor)) return Promise.resolve({ ok: false, code: "VALOR_INVALIDO" });
  if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
    return Promise.resolve({ ok: false, code: "REF_INVALIDA" });
  }
  const ref = refUso(idempotencyKey);
  if (!refValida(ref)) return Promise.resolve({ ok: false, code: "REF_INVALIDA" });
  return aplicarMovimento(endereco, -valor, MOTIVO_USO, ref);
}

/**
 * REVERTE integralmente um movimento (remove a entrada e devolve o delta), com CAS.
 * Mesma razão do `reverterMovimento` de fidelidade e do `reverterMovimentoLance`: compensar com outra `ref`
 * deixaria a original no histórico e o retry com a mesma chave seria um no-op ⇒ ECOQUILDO duplicado.
 */
export async function reverterEcoQuildo(endereco, ref) {
  const e = normalizar(endereco);
  if (!ENDERECO_RE.test(e)) return { ok: false, code: "ENDERECO_INVALIDO" };
  if (!refValida(ref)) return { ok: false, code: "REF_INVALIDA" };
  const supabase = getSupabase();
  for (let t = 1; t <= MAX_TENTATIVAS; t++) {
    const { data: atual, error: eLer } = await supabase.from(TABELA).select(COLUNAS).eq("endereco", e).maybeSingle();
    if (eLer) return { ok: false, code: "ERRO_DB" };
    if (!atual) return { ok: true, revertido: false };
    const hist = Array.isArray(atual.historico) ? atual.historico : [];
    const alvo = hist.find((h) => h?.ref === ref);
    if (!alvo) return { ok: true, revertido: false };
    const saldo = Number(atual.saldo ?? 0);
    const novo = saldo - Number(alvo.delta ?? 0);
    if (novo < 0) return { ok: false, code: "REVERSAO_INVALIDA" };
    const { data, error } = await supabase.from(TABELA)
      .update({ saldo: novo, historico: hist.filter((h) => h?.ref !== ref), atualizado_em: new Date().toISOString() })
      .eq("endereco", e).eq("saldo", saldo).eq("atualizado_em", atual.atualizado_em).select("endereco");
    if (!error && Array.isArray(data) && data.length === 0) continue;
    if (error) return { ok: false, code: "ERRO_DB" };
    return { ok: true, revertido: true };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}

/**
 * Aplica um delta (emitido, usado) ao lastro da linha única, com CAS, DERIVANDO a reserva:
 * `reserva_rs_centavos = (total_emitido − total_usado) × CENTAVOS_POR_ECOQUILDO`.
 * A reserva nunca é somada à mão — é sempre recalculada, para que os três números não possam divergir.
 * Recusa qualquer estado em que a reserva ficaria negativa (usar mais do que se emitiu).
 */
async function aplicarLastro(deltaEmitido, deltaUsado) {
  const supabase = getSupabase();
  for (let t = 1; t <= MAX_TENTATIVAS; t++) {
    const { data: atual, error: eLer } = await supabase.from(TABELA_LASTRO).select(COLUNAS_LASTRO).eq("id", 1).maybeSingle();
    if (eLer) return { ok: false, code: "ERRO_DB" };
    if (!atual) return { ok: false, code: "LASTRO_AUSENTE" };

    const emitido = Number(atual.total_emitido ?? 0);
    const usado = Number(atual.total_usado ?? 0);
    const novoEmitido = emitido + deltaEmitido;
    const novoUsado = usado + deltaUsado;
    if (novoEmitido < 0 || novoUsado < 0 || novoEmitido < novoUsado) {
      return { ok: false, code: "LASTRO_INCONSISTENTE", total_emitido: emitido, total_usado: usado };
    }
    const reserva = reservaDe(novoEmitido, novoUsado);

    const { data, error } = await supabase.from(TABELA_LASTRO)
      .update({
        total_emitido: novoEmitido, total_usado: novoUsado, reserva_rs_centavos: reserva,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", 1).eq("total_emitido", emitido).eq("total_usado", usado)
      .eq("reserva_rs_centavos", Number(atual.reserva_rs_centavos ?? 0))
      .eq("atualizado_em", atual.atualizado_em).select("id");
    if (!error && Array.isArray(data) && data.length === 0) continue; // CAS perdeu → relê
    if (error) return { ok: false, code: "ERRO_DB" };
    return { ok: true, total_emitido: novoEmitido, total_usado: novoUsado, reserva_rs_centavos: reserva };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}

/** Regista a EMISSÃO de `valor` ECOQUILDO no lastro (+ lastro em R$). */
export function registarEmissaoNoLastro(valor) {
  if (!ehInteiroPositivo(valor)) return Promise.resolve({ ok: false, code: "VALOR_INVALIDO" });
  return aplicarLastro(valor, 0);
}

/** Regista o USO de `valor` ECOQUILDO no lastro (− lastro em R$: sai da reserva, vai para a loja). */
export function registarUsoNoLastro(valor) {
  if (!ehInteiroPositivo(valor)) return Promise.resolve({ ok: false, code: "VALOR_INVALIDO" });
  return aplicarLastro(0, valor);
}

/** REVERTE uma emissão no lastro (compensação integral em falha de compra). */
export function reverterEmissaoNoLastro(valor) {
  if (!ehInteiroPositivo(valor)) return Promise.resolve({ ok: false, code: "VALOR_INVALIDO" });
  return aplicarLastro(-valor, 0);
}

/** REVERTE um uso no lastro (devolve o valor à reserva). */
export function reverterUsoNoLastro(valor) {
  if (!ehInteiroPositivo(valor)) return Promise.resolve({ ok: false, code: "VALOR_INVALIDO" });
  return aplicarLastro(0, -valor);
}
