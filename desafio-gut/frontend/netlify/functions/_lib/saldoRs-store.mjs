// _lib/saldoRs-store.mjs — MC36.1 (saldo R$ off-chain em Supabase)
//
// Acesso Supabase ao saldo R$ e às idempotências de crédito/débito (substitui os
// Blobs saldo-rs / saldo-rs-creditos / saldo-rs-debitos). Devolve sempre o `payload`
// na mesma forma que o handler (saldoRs.mjs) já esperava → zero mudança de semântica
// (incl. o débito checked-then-set do fluxo de lance). Escrita só Supabase (R11);
// cliente globalizado (R10), service_role/env-only (R9/R12).

import { getSupabase } from "./supabase-client.mjs";

const T_SALDO    = "saldo_rs";
const T_CREDITOS = "saldo_rs_creditos";
const T_DEBITOS  = "saldo_rs_debitos";

/** Lê o payload do saldo ({ centavos, atualizadoEm }) ou null. */
export async function getSaldo(clienteId) {
  const { data, error } = await getSupabase()
    .from(T_SALDO).select("payload").eq("cliente_id", String(clienteId)).maybeSingle();
  if (error) throw new Error(`[saldoRs-store] getSaldo falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Grava o payload do saldo (upsert por cliente_id). */
export async function setSaldo(clienteId, payload) {
  const { error } = await getSupabase().from(T_SALDO).upsert(
    { cliente_id: String(clienteId), payload, atualizado_em: new Date().toISOString() },
    { onConflict: "cliente_id" });
  if (error) throw new Error(`[saldoRs-store] setSaldo falhou: ${error.message}`);
}

/**
 * MC39.17.2 (B-P1-3) — Compare-And-Swap atômico do saldo.
 * Faz UPDATE … WHERE cliente_id=$ AND payload->>'centavos' = <esperado>, devolvendo
 * as linhas afetadas. A condição é avaliada atomicamente pelo Postgres → fecha a
 * janela TOCTOU do débito (double-spend) sem migração nem RPC (R12).
 *
 * @param {string} clienteId
 * @param {number} expectedCentavos — valor lido antes do débito (guarda do CAS).
 * @param {object} payload — novo payload a gravar ({ centavos, atualizadoEm }).
 * @returns {Promise<boolean>} true se exatamente 1 linha foi trocada (CAS venceu);
 *   false se 0 linhas (saldo mudou sob concorrência → caller deve reler e repetir).
 */
export async function casSaldo(clienteId, expectedCentavos, payload) {
  const { data, error } = await getSupabase()
    .from(T_SALDO)
    .update({ payload, atualizado_em: new Date().toISOString() })
    .eq("cliente_id", String(clienteId))
    .eq("payload->>centavos", String(Math.floor(Number(expectedCentavos))))
    .select("cliente_id");
  if (error) throw new Error(`[saldoRs-store] casSaldo falhou: ${error.message}`);
  return Array.isArray(data) && data.length === 1;
}

/** Idempotência de crédito: lê o registo por pedidoId ou null. */
export async function getCredito(pedidoId) {
  const { data, error } = await getSupabase()
    .from(T_CREDITOS).select("payload").eq("pedido_id", String(pedidoId)).maybeSingle();
  if (error) throw new Error(`[saldoRs-store] getCredito falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Marca um crédito como processado (idempotência por pedidoId). */
export async function setCredito(pedidoId, payload) {
  const { error } = await getSupabase().from(T_CREDITOS).upsert(
    { pedido_id: String(pedidoId), payload }, { onConflict: "pedido_id" });
  if (error) throw new Error(`[saldoRs-store] setCredito falhou: ${error.message}`);
}

/** Idempotência de débito (opcional): lê por operacaoId ou null. */
export async function getDebito(operacaoId) {
  const { data, error } = await getSupabase()
    .from(T_DEBITOS).select("payload").eq("operacao_id", String(operacaoId)).maybeSingle();
  if (error) throw new Error(`[saldoRs-store] getDebito falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Marca um débito como processado (idempotência por operacaoId). */
export async function setDebito(operacaoId, payload) {
  const { error } = await getSupabase().from(T_DEBITOS).upsert(
    { operacao_id: String(operacaoId), payload }, { onConflict: "operacao_id" });
  if (error) throw new Error(`[saldoRs-store] setDebito falhou: ${error.message}`);
}
