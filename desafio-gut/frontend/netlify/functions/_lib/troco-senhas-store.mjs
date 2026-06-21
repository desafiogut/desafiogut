// _lib/troco-senhas-store.mjs — MC36.1 (troco/senhas off-chain em Supabase)
//
// Acesso Supabase ao ledger de senhas de troco (substitui o Blob troco-senhas).
// Devolve o `payload` na forma exata que troco-senhas.mjs já usava
// ({ lotes, expiradosAcum, senhasExpiradasAcum, atualizadoEm }) → lógica FIFO/
// expiração inalterada. Escrita só Supabase (R11); cliente globalizado (R10).

import { getSupabase } from "./supabase-client.mjs";

const T_TROCO = "troco_senhas";

/** Lê o payload do troco de um cliente ou null. */
export async function getTroco(clienteId) {
  const { data, error } = await getSupabase()
    .from(T_TROCO).select("payload").eq("cliente_id", String(clienteId)).maybeSingle();
  if (error) throw new Error(`[troco-senhas-store] getTroco falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Grava o payload do troco (upsert por cliente_id). */
export async function setTroco(clienteId, payload) {
  const { error } = await getSupabase().from(T_TROCO).upsert(
    { cliente_id: String(clienteId), payload, atualizado_em: new Date().toISOString() },
    { onConflict: "cliente_id" });
  if (error) throw new Error(`[troco-senhas-store] setTroco falhou: ${error.message}`);
}

/** Lista todos os registos de troco (substitui store.list() do resumoTrocoAdmin).
 *  Devolve [{ cliente_id, payload }]. */
export async function listTroco() {
  const { data, error } = await getSupabase().from(T_TROCO).select("cliente_id, payload");
  if (error) throw new Error(`[troco-senhas-store] listTroco falhou: ${error.message}`);
  return data ?? [];
}
