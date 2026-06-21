// _lib/cotas-store.mjs — MC36 (fase 1: cotas em Supabase)
//
// Acesso a dados de cotas/lojistas no Supabase (substitui os 4 stores Blob:
// cotas, cotas-cnpj, cotas-indice, cotas-fingerprint). O registo completo vive em
// `cotas.payload` (jsonb, fidelidade); colunas (cliente_id, endereco, cnpj, email,
// categoria, vendida) servem queries/índices. Anti-duplicidade = cnpj UNIQUE no DB.
//
//   cotas:{cliente_id}        → tabela cotas (PK cliente_id = endereco|"cnpj:{cnpj}")
//   cotas-cnpj:{cnpj}         → coluna cnpj (UNIQUE) — getCotaByCnpj
//   cotas-indice:{categoria}  → query WHERE categoria= — listarCategoria/resumo
//   cotas-fingerprint:{vid}   → tabela cota_fingerprints — anti-Sybil
//   cotas-pagas:{pedidoId}    → tabela cotas_pagas — idempotência de ativação
//
// service_role (backend), cliente globalizado (R10), env-only (R9). NÃO escreve em
// Blobs (R11). Devolve sempre o `payload` (mesma forma de registo que os handlers
// já esperavam) → zero mudança de contrato para os chamadores.

import { getSupabase } from "./supabase-client.mjs";

const T_COTAS = "cotas";
const T_PAGAS = "cotas_pagas";
const T_FP    = "cota_fingerprints";

/** Extrai as colunas indexáveis do registo; o resto fica em payload. */
function colunas(clienteId, registro) {
  return {
    cliente_id: String(clienteId),
    endereco: registro?.endereco ?? null,
    cnpj: registro?.cnpj ?? null,
    email: registro?.email ?? null,
    categoria: registro?.categoria ?? null,
    vendida: Boolean(registro?.vendida),
    pedido_id: registro?.pedidoId ?? null,
    payload: registro,
    atualizado_em: new Date().toISOString(),
  };
}

/** Lê uma cota por cliente_id. Devolve o registo (payload) ou null. */
export async function getCota(clienteId) {
  const { data, error } = await getSupabase()
    .from(T_COTAS).select("payload").eq("cliente_id", String(clienteId)).maybeSingle();
  if (error) throw new Error(`[cotas-store] getCota falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Lê uma cota pelo CNPJ (anti-duplicidade). Devolve o 1.º registo ou null.
 *  Usa limit(1) (não maybeSingle) porque os dados reais podem ter o mesmo CNPJ
 *  em cliente_ids diferentes (registo direto "cnpj:" + registo autenticado). */
export async function getCotaByCnpj(cnpj) {
  const { data, error } = await getSupabase()
    .from(T_COTAS).select("payload").eq("cnpj", String(cnpj)).limit(1);
  if (error) throw new Error(`[cotas-store] getCotaByCnpj falhou: ${error.message}`);
  return data?.[0]?.payload ?? null;
}

/** Lê uma cota pelo email (lookup de login direto). Devolve o registo ou null. */
export async function getCotaByEmail(email) {
  const { data, error } = await getSupabase()
    .from(T_COTAS).select("payload").eq("email", String(email).toLowerCase()).limit(1);
  if (error) throw new Error(`[cotas-store] getCotaByEmail falhou: ${error.message}`);
  return data?.[0]?.payload ?? null;
}

/** Lista as cotas de uma categoria (substitui cotas-indice). */
export async function listarCategoria(categoria) {
  const { data, error } = await getSupabase()
    .from(T_COTAS).select("payload").eq("categoria", String(categoria));
  if (error) throw new Error(`[cotas-store] listarCategoria falhou: ${error.message}`);
  return (data ?? []).map((r) => r.payload).filter(Boolean);
}

/** Resumo agregado por categoria: { cat: { total_atribuidas, cliente_ids } }. */
export async function resumoCotas(categorias = ["bronze", "prata", "ouro", "diamante"]) {
  const { data, error } = await getSupabase()
    .from(T_COTAS).select("cliente_id, categoria").not("categoria", "is", null);
  if (error) throw new Error(`[cotas-store] resumoCotas falhou: ${error.message}`);
  const resumo = {};
  for (const cat of categorias) resumo[cat] = { total_atribuidas: 0, cliente_ids: [] };
  for (const row of data ?? []) {
    if (resumo[row.categoria]) {
      resumo[row.categoria].cliente_ids.push(row.cliente_id);
      resumo[row.categoria].total_atribuidas += 1;
    }
  }
  return resumo;
}

/** Cria/atualiza uma cota (upsert por cliente_id). Devolve o registo gravado. */
export async function upsertCota(clienteId, registro) {
  const { error } = await getSupabase()
    .from(T_COTAS).upsert(colunas(clienteId, registro), { onConflict: "cliente_id" });
  if (error) throw new Error(`[cotas-store] upsertCota falhou: ${error.message}`);
  return registro;
}

/** Remove uma cota por cliente_id. */
export async function deleteCota(clienteId) {
  const { error } = await getSupabase().from(T_COTAS).delete().eq("cliente_id", String(clienteId));
  if (error) throw new Error(`[cotas-store] deleteCota falhou: ${error.message}`);
}

/** Idempotência de ativação: lê cotas_pagas:{pedidoId}. */
export async function getCotaPaga(pedidoId) {
  const { data, error } = await getSupabase()
    .from(T_PAGAS).select("payload").eq("pedido_id", String(pedidoId)).maybeSingle();
  if (error) throw new Error(`[cotas-store] getCotaPaga falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Marca um pedido como ativado (idempotência). */
export async function setCotaPaga(pedidoId, registro) {
  const { error } = await getSupabase()
    .from(T_PAGAS).upsert({ pedido_id: String(pedidoId), payload: registro }, { onConflict: "pedido_id" });
  if (error) throw new Error(`[cotas-store] setCotaPaga falhou: ${error.message}`);
}

/** Anti-Sybil: lê o registo de fingerprint (visitorId → CNPJs). */
export async function getFingerprint(visitorId) {
  const { data, error } = await getSupabase()
    .from(T_FP).select("payload").eq("visitor_id", String(visitorId)).maybeSingle();
  if (error) throw new Error(`[cotas-store] getFingerprint falhou: ${error.message}`);
  return data?.payload ?? null;
}

/** Anti-Sybil: grava o registo de fingerprint. */
export async function setFingerprint(visitorId, registro) {
  const { error } = await getSupabase()
    .from(T_FP).upsert(
      { visitor_id: String(visitorId), payload: registro, atualizado_em: new Date().toISOString() },
      { onConflict: "visitor_id" });
  if (error) throw new Error(`[cotas-store] setFingerprint falhou: ${error.message}`);
}
