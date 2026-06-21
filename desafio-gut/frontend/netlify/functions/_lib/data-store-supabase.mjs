// _lib/data-store-supabase.mjs — MC32.1 (implementação Supabase do data-store)
//
// Implementa a MESMA interface de _lib/data-store-blobs.mjs sobre o Supabase
// (PostgREST / Data API), pronta para o flip DATA_STORE_BACKEND=supabase. Hoje o
// backend ativo continua "blobs" (R3.4) — este módulo só é carregado quando o
// flip ocorrer, logo ZERO regressão no comportamento atual (R1).
//
// Princípios:
//   - R9: credenciais SÓ de env (via supabase-client.mjs) — nunca hardcoded.
//   - R10: cliente GLOBALIZADO (singleton lazy) reutilizado entre invocações.
//   - R11 (anti-split-brain): a fachada carrega UM só backend; este módulo NUNCA
//     escreve em Blobs. A escrita é exclusiva do backend ativo.
//
// Fidelidade aos contratos (ver migração 20260620_amend_jsonb_payload.sql):
//   - config: config_remota.valor (JSONB) guarda o objeto de config tal-e-qual.
//   - lances: lances.payload (JSONB) guarda o registro imutável COMPLETO,
//     espelhando o Key-Per-Bid dos Blobs; as colunas planas (edicao_id, endereco,
//     hash_lance, valor_centavos) servem índices/queries.
//
// Leitura fail-soft (config): ausência/erro → null (o chamador resolve o default,
// ver recursos-app-config.mjs). Escrita: lança erro claro (igual aos Blobs).

import { randomUUID } from "node:crypto";
import { getSupabase } from "./supabase-client.mjs";

const TABELA_CONFIG = "config_remota";
const TABELA_LANCES = "lances";

// PostgREST limita cada resposta (por defeito ~1000 linhas). Tamanho de página da
// leitura paginada de lances (ver getLances / K1 do MC33).
const PAGINA_LANCES = 1000;

/** Monta uma chave Key-Per-Bid idêntica à dos Blobs (anti-colisão, MC28.1). */
function montarChaveBid(edicaoId, endereco) {
  return `bid:${edicaoId}:${String(endereco).toLowerCase()}:${randomUUID().slice(0, 8)}`;
}

/** Lê uma configuração (JSON) de config_remota.valor. Fail-soft → null. */
export async function getConfig(chave) {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    console.warn("[data-store-supabase] Supabase indisponível:", err?.message);
    return null;
  }
  const { data, error } = await supabase
    .from(TABELA_CONFIG)
    .select("valor")
    .eq("chave", String(chave))
    .maybeSingle();
  if (error) {
    console.warn(`[data-store-supabase] getConfig("${chave}") falhou:`, error.message);
    return null;
  }
  return data?.valor ?? null;
}

/** Escreve uma configuração (JSON) em config_remota.valor (upsert por chave). */
export async function setConfig(chave, valor) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABELA_CONFIG)
    .upsert(
      { chave: String(chave), valor, atualizado_em: new Date().toISOString() },
      { onConflict: "chave" }
    );
  if (error) throw new Error(`[data-store-supabase] setConfig("${chave}") falhou: ${error.message}`);
}

/**
 * Lê TODOS os lances de uma edição (ordem cronológica), devolvendo o registro
 * imutável completo guardado em payload — formato idêntico ao listarBids dos Blobs.
 *
 * Leitura EXAUSTIVA por paginação (.range), espelhando o listarBids por cursor do
 * MC28: sem isto, o cap de ~1000 linhas do PostgREST truncaria silenciosamente
 * edições grandes e a apuração do menor lance único seria feita sobre dados
 * incompletos (K1/MC33). Usa `count: exact` e avança pelo nº REAL de linhas
 * recebidas, ficando robusto mesmo que o `max-rows` do servidor seja < PAGINA.
 */
export async function getLances(edicaoId) {
  const supabase = getSupabase();
  const id = String(edicaoId);
  const todos = [];
  let desde = 0;
  let total = Infinity;
  while (desde < total) {
    const { data, error, count } = await supabase
      .from(TABELA_LANCES)
      .select("payload", { count: "exact" })
      .eq("edicao_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }) // desempate estável → paginação determinística
      .range(desde, desde + PAGINA_LANCES - 1);
    if (error) throw new Error(`[data-store-supabase] getLances("${id}") falhou: ${error.message}`);
    if (typeof count === "number") total = count;
    const lote = data ?? [];
    for (const linha of lote) if (linha.payload) todos.push(linha.payload);
    if (lote.length === 0) break;  // salvaguarda anti-loop
    desde += lote.length;          // avança pelo nº real recebido (robusto a max-rows)
  }
  return todos;
}

/**
 * Acrescenta um lance a uma edição. Espelha o gravarBid dos Blobs: gera a chave
 * Key-Per-Bid, guarda o registro completo (com a key) em payload e replica os
 * campos indexáveis nas colunas planas. Devolve a chave criada.
 */
export async function addLance(edicaoId, lance) {
  const endereco = lance?.endereco ?? lance?.lancador;
  if (!endereco) throw new Error("[data-store-supabase] addLance: lance sem endereco/lancador");

  const key = montarChaveBid(edicaoId, endereco);
  const registro = { ...lance, key };
  const hashLance = lance?.commitmentHash ?? lance?.hashLance ?? null;
  const valorCentavos = Number.isInteger(lance?.valorCentavos) ? lance.valorCentavos : null;

  const supabase = getSupabase();
  const { error } = await supabase.from(TABELA_LANCES).insert({
    edicao_id: String(edicaoId),
    endereco: String(endereco).toLowerCase(),
    hash_lance: hashLance,
    valor_centavos: valorCentavos,
    payload: registro,
  });
  if (error) throw new Error(`[data-store-supabase] addLance("${edicaoId}") falhou: ${error.message}`);
  return key;
}
