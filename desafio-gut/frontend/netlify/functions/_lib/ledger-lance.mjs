// _lib/ledger-lance.mjs — UTAC110d. Ledger de LANCE (Via B, dois Passes).
//
// Store: as colunas `creditos_lance`, `pontos_lance` e `historico_lance` da MESMA linha de
// `public.pontos` (decisão do operador R18-110d-1, opção b — sem tocar na PK nem na FK).
//
//   • Crédito de lance  — LEGADO (UTAC110d). O Passe Relâmpago JÁ NÃO o credita: o UTAC110n
//                         substituiu-o por +200 pontos de lance (R18-110j.4b-3). Fica a coluna e as
//                         funções porque os saldos antigos ainda existem até à conversão (DEBT-071:
//                         1 crédito = 200 pontos) e porque o valor tem de ser convertido, não apagado.
//   • Pontos de lance   — a MOEDA do Menor Lance Único desde o UTAC110n (R18-110j.4b-1): o lance
//                         DEBITA o valor do próprio lance (`consumirPontosLance`). Ganham-se por
//                         ENGAJAMENTO (Art. 16º I-V/VI) e pelo Passe (+200, Art. 16º VI) — nunca por
//                         compra de créditos. R18-110d-2 («o lance não os consome») ficou REVOGADA;
//                         a decisão nova está em `_logs/UTAC110n_SEG-1_MEDICAO.md`.
//
// Módulo SEPARADO de `passe-pontos.mjs` de propósito: o `lance-relampago.mjs` importa-o, e o
// `passe-pontos.mjs` puxa `edicoes-core`/`resgates` — dependências que o lance não precisa.
//
// Padrões herdados POR LEITURA de `_lib/passe-pontos.mjs` (não cópia cega):
//   - normalização/validação do endereço ............ `normalizar` / ENDERECO_RE
//   - escrita devolve `{ok:false, code}`, leitura LANÇA em erro do Supabase
//   - CAS (lê → grava só se os contadores não mudaram) + idempotência por `ref`
//   - 23505 no INSERT da 1.ª linha → relê e repete
// ⚠️ CAS = os DOIS contadores + `atualizado_em` (SEG4 W3): só contadores sofria de ABA — um crédito e um
//    consumo concorrentes deixam os contadores iguais e o UPDATE apagava as entradas deles do histórico.
// ⚠️ Este ledger escreve SÓ as suas 3 colunas (+ `atualizado_em`): o `aplicarMovimento` de fidelidade escreve SÓ
//    `pontos`/`historico`. Nenhum dos dois reescreve as colunas do outro ⇒ sem lost update cruzado.

import { getSupabase } from "./supabase-client.mjs";

export const CREDITOS_LANCE_POR_PASSE_RELAMPAGO = 1; // LEGADO (110d) — o Passe já não credita isto
export const CREDITOS_POR_LANCE = 1;                 // LEGADO (110d) — o lance gasta pontos (110n)

/** UTAC110n (R18-110j.4b-3) — o Passe Relâmpago credita +200 pontos de lance (Art. 16º VI). */
export const PONTOS_LANCE_POR_PASSE_RELAMPAGO = 200;
/** UTAC110n (DEBT-071) — 1 crédito de lance antigo vale 200 pontos (Art. 17º, v5.1). */
export const PONTOS_POR_CREDITO_DE_LANCE = 200;

export const CAMPO_CREDITOS = "creditos_lance";
export const CAMPO_PONTOS = "pontos_lance";

/** Motivos que movem CRÉDITOS de lance (LEGADO — só a conversão do DEBT-071 os lê). */
export const MOTIVOS_CREDITO = Object.freeze(["passe-relampago", "lance"]);
/**
 * Motivos que movem PONTOS de lance. «sequencia» = bónus de 5 acertos (110n, Frente C);
 * «passe-relampago» = bónus de +200 do Passe (110n, R18-110j.4b-3 — Art. 16º VI). Os restantes são
 * engajamento puro (Art. 16º I-V).
 */
export const MOTIVOS_PONTOS_LANCE = Object.freeze([
  "boas-vindas", "login", "missao", "indicacao", "sequencia", "passe-relampago",
]);
/** Motivo do DÉBITO de pontos que o próprio lance faz (110n, Frente A). */
export const MOTIVO_PONTOS_GASTOS_NO_LANCE = "lance";

const TABELA = "pontos";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const UNIQUE_VIOLATION = "23505";
const MAX_TENTATIVAS = 5;
const REF_MAX = 200;
const COLUNAS = "endereco,creditos_lance,pontos_lance,historico_lance,atualizado_em";

const normalizar = (e) => String(e ?? "").toLowerCase();
const refValida = (r) => typeof r === "string" && r.length > 0 && r.length <= REF_MAX;

/**
 * Lê o ledger de lance do endereço. Endereço inválido ou sem linha → zeros.
 * **Lança** em erro do Supabase (o chamador decide o HTTP).
 * @returns {Promise<{creditos:number, pontos:number, historico:Array}>}
 */
export async function lerLedgerLance(endereco) {
  const e = normalizar(endereco);
  if (!ENDERECO_RE.test(e)) return { creditos: 0, pontos: 0, historico: [] };
  const { data, error } = await getSupabase().from(TABELA).select(COLUNAS).eq("endereco", e).maybeSingle();
  if (error) throw new Error(`[ledger-lance] ler falhou: ${error.code ?? error.message}`);
  return {
    creditos: Number(data?.creditos_lance ?? 0),
    pontos: Number(data?.pontos_lance ?? 0),
    historico: Array.isArray(data?.historico_lance) ? data.historico_lance : [],
  };
}

/** Movimento genérico com CAS sobre OS DOIS contadores + idempotência por `ref`. Nunca < 0. */
async function aplicar(endereco, campo, delta, motivo, ref) {
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

    const hist = Array.isArray(atual?.historico_lance) ? atual.historico_lance : [];
    const creditos = Number(atual?.creditos_lance ?? 0);
    const pontos = Number(atual?.pontos_lance ?? 0);
    if (hist.some((h) => h?.ref === ref)) {
      return { ok: true, criado: false, creditos, pontos, historico: hist };
    }

    const base = campo === CAMPO_CREDITOS ? creditos : pontos;
    const novo = base + delta;
    if (novo < 0) {
      return { ok: false, code: campo === CAMPO_CREDITOS ? "CREDITOS_INSUFICIENTES" : "PONTOS_LANCE_INSUFICIENTES", creditos, pontos };
    }
    const entrada = { data: new Date().toISOString(), campo, motivo, delta, ref };
    const historico = [...hist, entrada];
    const payload = { [campo]: novo, historico_lance: historico, atualizado_em: new Date().toISOString() };

    let data, error;
    if (atual == null) {
      ({ data, error } = await supabase.from(TABELA)
        .insert({ endereco: e, creditos_lance: 0, pontos_lance: 0, ...payload }).select("endereco"));
      if (error && error.code === UNIQUE_VIOLATION) continue;
    } else {
      ({ data, error } = await supabase.from(TABELA).update(payload)
        .eq("endereco", e).eq("creditos_lance", creditos).eq("pontos_lance", pontos)
        .eq("atualizado_em", atual.atualizado_em).select("endereco"));
      if (!error && Array.isArray(data) && data.length === 0) continue; // CAS perdeu → relê
    }
    if (error) return { ok: false, code: "ERRO_DB" };
    return {
      ok: true, criado: true,
      creditos: campo === CAMPO_CREDITOS ? novo : creditos,
      pontos: campo === CAMPO_PONTOS ? novo : pontos,
      historico,
    };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}

/** +1 crédito de lance pela compra do Passe Relâmpago. Idempotente por `ref`. */
export function creditarCreditoLance(endereco, ref) {
  return aplicar(endereco, CAMPO_CREDITOS, CREDITOS_LANCE_POR_PASSE_RELAMPAGO, "passe-relampago", ref);
}

/** −1 crédito de lance por 1 lance no MLC. `CREDITOS_INSUFICIENTES` se não há. Idempotente por `ref`. */
export function consumirCreditoLance(endereco, ref) {
  return aplicar(endereco, CAMPO_CREDITOS, -CREDITOS_POR_LANCE, "lance", ref);
}

/**
 * Credita PONTOS de lance. Recusa qualquer motivo fora de `MOTIVOS_PONTOS_LANCE`.
 *
 * ⚠️ UTAC110n: o motivo `passe-relampago` PASSOU a ser aceite (R18-110j.4b-3, Art. 16º VI): o Passe
 * dá +200 pontos de lance como BÓNUS de engajamento, não como compra de créditos. O que continua
 * proibido é vender pontos avulso — não existe, e não passa a existir, motivo «compra»/«saldo».
 */
export function creditarPontosLance(endereco, quantidade, motivo, ref) {
  if (!MOTIVOS_PONTOS_LANCE.includes(motivo)) return Promise.resolve({ ok: false, code: "MOTIVO_INVALIDO" });
  if (!Number.isInteger(quantidade) || quantidade <= 0) return Promise.resolve({ ok: false, code: "QUANTIDADE_INVALIDA" });
  return aplicar(endereco, CAMPO_PONTOS, quantidade, motivo, ref);
}

/** +200 pontos de lance pela compra do Passe Relâmpago (UTAC110n, Art. 16º VI). Idempotente por `ref`. */
export function creditarPontosLanceDoPasseRelampago(endereco, ref) {
  return creditarPontosLance(endereco, PONTOS_LANCE_POR_PASSE_RELAMPAGO, "passe-relampago", ref);
}

/**
 * DEBITA pontos de lance — é o pagamento do lance no Menor Lance Único (UTAC110n, R18-110j.4b-1).
 * O valor do lance É o preço em pontos (Art. 18º: 1 ponto = R$ 0,01), logo `quantidade` = centavos.
 * Idempotente por `ref` (retry do mesmo lance não cobra duas vezes); saldo a menos → recusa sem
 * escrever nada (`PONTOS_LANCE_INSUFICIENTES`), nunca saldo negativo (CHECK `>= 0` na BD também).
 */
export function consumirPontosLance(endereco, quantidade, ref) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) return Promise.resolve({ ok: false, code: "QUANTIDADE_INVALIDA" });
  return aplicar(endereco, CAMPO_PONTOS, -quantidade, MOTIVO_PONTOS_GASTOS_NO_LANCE, ref);
}


/**
 * REVERTE integralmente um movimento de lance (remove a entrada e devolve o delta), com CAS.
 * Mesma razão do `reverterMovimento` de fidelidade (UTAC106g B1): compensar com outra `ref` deixaria
 * a original no histórico e o retry com a mesma chave seria um no-op ⇒ lance sem consumo.
 */
export async function reverterMovimentoLance(endereco, ref) {
  const e = normalizar(endereco);
  if (!ENDERECO_RE.test(e)) return { ok: false, code: "ENDERECO_INVALIDO" };
  if (!refValida(ref)) return { ok: false, code: "REF_INVALIDA" };
  const supabase = getSupabase();
  for (let t = 1; t <= MAX_TENTATIVAS; t++) {
    const { data: atual, error: eLer } = await supabase.from(TABELA).select(COLUNAS).eq("endereco", e).maybeSingle();
    if (eLer) return { ok: false, code: "ERRO_DB" };
    if (!atual) return { ok: true, revertido: false };
    const hist = Array.isArray(atual.historico_lance) ? atual.historico_lance : [];
    const alvo = hist.find((h) => h?.ref === ref);
    if (!alvo) return { ok: true, revertido: false };
    const creditos = Number(atual.creditos_lance ?? 0);
    const pontos = Number(atual.pontos_lance ?? 0);
    const campo = alvo.campo === CAMPO_PONTOS ? CAMPO_PONTOS : CAMPO_CREDITOS;
    const novo = (campo === CAMPO_CREDITOS ? creditos : pontos) - Number(alvo.delta ?? 0);
    if (novo < 0) return { ok: false, code: "REVERSAO_INVALIDA" };
    const { data, error } = await supabase.from(TABELA)
      .update({ [campo]: novo, historico_lance: hist.filter((h) => h?.ref !== ref), atualizado_em: new Date().toISOString() })
      .eq("endereco", e).eq("creditos_lance", creditos).eq("pontos_lance", pontos)
      .eq("atualizado_em", atual.atualizado_em).select("endereco");
    if (!error && Array.isArray(data) && data.length === 0) continue;
    if (error) return { ok: false, code: "ERRO_DB" };
    return { ok: true, revertido: true };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}
