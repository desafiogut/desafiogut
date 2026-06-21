// _lib/wallet-store.mjs — MC36.1 (Wallet Vale-Crédito em Supabase)
//
// Acesso Supabase à wallet (saldoCentavos + transacoes[]) e à idempotência de
// operação (substitui os Blobs wallet / wallet-idem). Devolve o `payload` na forma
// exata que wallet.mjs já usava → lógica de crédito/débito/idempotência inalterada.
// Escrita só Supabase (R11); cliente globalizado (R10).

import { getSupabase } from "./supabase-client.mjs";

const T_WALLET = "wallet";
const T_IDEM   = "wallet_idem";

/** Lê o payload da wallet ({ saldoCentavos, atualizadoEm, transacoes }) ou null. */
export async function getWallet(clienteId) {
  const { data, error } = await getSupabase()
    .from(T_WALLET).select("payload").eq("cliente_id", String(clienteId)).maybeSingle();
  if (error) throw new Error(`[wallet-store] getWallet falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Grava o payload da wallet (upsert por cliente_id). */
export async function setWallet(clienteId, payload) {
  const { error } = await getSupabase().from(T_WALLET).upsert(
    { cliente_id: String(clienteId), payload, atualizado_em: new Date().toISOString() },
    { onConflict: "cliente_id" });
  if (error) throw new Error(`[wallet-store] setWallet falhou: ${error.message}`);
}

/** Idempotência de operação: lê por idemKey ou null. */
export async function getWalletIdem(idemKey) {
  const { data, error } = await getSupabase()
    .from(T_IDEM).select("payload").eq("idem_key", String(idemKey)).maybeSingle();
  if (error) throw new Error(`[wallet-store] getWalletIdem falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Persiste o registo de idempotência de operação. */
export async function setWalletIdem(idemKey, payload) {
  const { error } = await getSupabase().from(T_IDEM).upsert(
    { idem_key: String(idemKey), payload }, { onConflict: "idem_key" });
  if (error) throw new Error(`[wallet-store] setWalletIdem falhou: ${error.message}`);
}
