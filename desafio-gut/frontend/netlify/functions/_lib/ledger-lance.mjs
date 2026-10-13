// _lib/ledger-lance.mjs — UTAC110d. Ledger de LANCE (Via B, dois Passes).
//
// Store: as colunas `creditos_lance`, `pontos_lance` e `historico_lance` da MESMA linha de
// `public.pontos` (decisão do operador R18-110d-1, opção b — sem tocar na PK nem na FK).
//
//   • Crédito de lance  — DIRECTO: o Passe Relâmpago dá +1 (R18-110d-2); 1 lance no MLC consome 1.
//   • Pontos de lance   — ganhos por ENGAJAMENTO (Art. 16º I-V / Art. 17º). NUNCA por compra:
//                         `creditarPontosLance` só aceita motivos de engajamento (ver MOTIVOS_*).
//                         O lance NÃO os consome (R18-110d-2). As fontes (login, missões, …) ainda
//                         não estão ligadas — ficam para UTAC próprio.
//
// Módulo SEPARADO de `passe-pontos.mjs` de propósito: o `lance-relampago.mjs` importa-o, e o
// `passe-pontos.mjs` puxa `edicoes-core`/`resgates` — dependências que o lance não precisa.
//
// Padrões herdados POR LEITURA de `_lib/passe-pontos.mjs` (não cópia cega):
//   - normalização/validação do endereço ............ `normalizar` / ENDERECO_RE
//   - escrita devolve `{ok:false, code}`, leitura LANÇA em erro do Supabase
//   - CAS (lê → grava só se os contadores não mudaram) + idempotência por `ref`
//   - 23505 no INSERT da 1.ª linha → relê e repete
// ⚠️ Este ledger escreve SÓ as suas 3 colunas: o `aplicarMovimento` de fidelidade escreve SÓ
//    `pontos`/`historico`. Nenhum dos dois reescreve as colunas do outro ⇒ sem lost update cruzado.

import { getSupabase } from "./supabase-client.mjs";

export const CREDITOS_LANCE_POR_PASSE_RELAMPAGO = 1;
export const CREDITOS_POR_LANCE = 1;

export const CAMPO_CREDITOS = "creditos_lance";
export const CAMPO_PONTOS = "pontos_lance";

/** Motivos que movem CRÉDITOS de lance. */
export const MOTIVOS_CREDITO = Object.freeze(["passe-relampago", "lance"]);
/** Motivos que creditam PONTOS de lance — só engajamento (Art. 16º I-V). Sem «compra»/«passe». */
export const MOTIVOS_PONTOS_LANCE = Object.freeze(["boas-vindas", "login", "missao", "indicacao", "sequencia"]);

const TABELA = "pontos";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const UNIQUE_VIOLATION = "23505";
const MAX_TENTATIVAS = 5;
const REF_MAX = 200;
const COLUNAS = "endereco,creditos_lance,pontos_lance,historico_lance";

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
    const payload = { [campo]: novo, historico_lance: historico };

    let data, error;
    if (atual == null) {
      ({ data, error } = await supabase.from(TABELA)
        .insert({ endereco: e, creditos_lance: 0, pontos_lance: 0, ...payload }).select("endereco"));
      if (error && error.code === UNIQUE_VIOLATION) continue;
    } else {
      ({ data, error } = await supabase.from(TABELA).update(payload)
        .eq("endereco", e).eq("creditos_lance", creditos).eq("pontos_lance", pontos).select("endereco"));
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
 * Credita PONTOS de lance por ENGAJAMENTO. Recusa qualquer motivo fora de `MOTIVOS_PONTOS_LANCE`
 * (em particular, NUNCA por compra de Passe — Art. 17º).
 */
export function creditarPontosLance(endereco, quantidade, motivo, ref) {
  if (!MOTIVOS_PONTOS_LANCE.includes(motivo)) return Promise.resolve({ ok: false, code: "MOTIVO_INVALIDO" });
  if (!Number.isInteger(quantidade) || quantidade <= 0) return Promise.resolve({ ok: false, code: "QUANTIDADE_INVALIDA" });
  return aplicar(endereco, CAMPO_PONTOS, quantidade, motivo, ref);
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
      .update({ [campo]: novo, historico_lance: hist.filter((h) => h?.ref !== ref) })
      .eq("endereco", e).eq("creditos_lance", creditos).eq("pontos_lance", pontos).select("endereco");
    if (!error && Array.isArray(data) && data.length === 0) continue;
    if (error) return { ok: false, code: "ERRO_DB" };
    return { ok: true, revertido: true };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}
