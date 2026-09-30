// _lib/passe.mjs — MC105a. Repositório do Passe Desafio (off-chain, Supabase `public.passes`).
//
// 1 Passe = 1 palpite = 1 produto (DEC-03). Idempotência pela chave natural (endereco, edicao_id, produto_id):
// o UNIQUE da tabela decide — um INSERT concorrente que perde devolve o passe que ganhou (criado:false).
// O débito do R$ 2,00 NÃO vive aqui: é do endpoint (comprar-passe.mjs), via _lib/saldoRs.mjs.
// Sem dados pessoais em logs (P10): só códigos de erro.

import { getSupabase } from "./supabase-client.mjs";

const TABELA = "passes";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const UNIQUE_VIOLATION = "23505";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; // senão o Postgres dá 22P02

const normalizar = (e) => String(e ?? "").toLowerCase();
const chaveValida = (endereco, edicaoId, produtoId) =>
  ENDERECO_RE.test(endereco) && typeof edicaoId === "string" && edicaoId !== "" && typeof produtoId === "string" && produtoId !== "";

/** Lê o passe de (endereco, edição, produto). @returns {Promise<object|null>} — lança em erro do Supabase. */
export async function lerPasse({ endereco, edicaoId, produtoId }) {
  const e = normalizar(endereco);
  if (!chaveValida(e, edicaoId, produtoId)) return null;
  const { data, error } = await getSupabase().from(TABELA).select("*")
    .eq("endereco", e).eq("edicao_id", edicaoId).eq("produto_id", produtoId).maybeSingle();
  if (error) throw new Error(`[passe] lerPasse falhou: ${error.code ?? error.message}`);
  return data ?? null;
}

/**
 * Cria o passe. Idempotente: se já existe (ou um INSERT concorrente ganhou), devolve o existente.
 * @returns {Promise<{ok:true, criado:boolean, passe:object} | {ok:false, code:string}>}
 */
export async function criarPasse({ endereco, edicaoId, produtoId }) {
  const e = normalizar(endereco);
  if (!chaveValida(e, edicaoId, produtoId)) return { ok: false, code: "params_invalidos" };
  const { data, error } = await getSupabase().from(TABELA)
    .insert({ endereco: e, edicao_id: edicaoId, produto_id: produtoId }).select("*").single();
  if (!error) return { ok: true, criado: true, passe: data };
  if (error.code !== UNIQUE_VIOLATION) return { ok: false, code: "gravar_passe_falhou" };
  // A releitura pode falhar (rede): isso é falha tratada, nunca excepção — quem chama já debitou e tem de reembolsar.
  let existente = null;
  try { existente = await lerPasse({ endereco: e, edicaoId, produtoId }); } catch { existente = null; }
  return existente ? { ok: true, criado: false, passe: existente } : { ok: false, code: "gravar_passe_falhou" };
}

/** Passes do comprador, do mais antigo para o mais recente. Lança em erro do Supabase. */
export async function listarPassesDoComprador(endereco) {
  const e = normalizar(endereco);
  if (!ENDERECO_RE.test(e)) return [];
  const { data, error } = await getSupabase().from(TABELA).select("*").eq("endereco", e)
    .order("comprado_em", { ascending: true });
  if (error) throw new Error(`[passe] listarPassesDoComprador falhou: ${error.code ?? error.message}`);
  return data ?? [];
}

/**
 * Marca o palpite do passe como usado (MC106 chama-o). Compare-and-set: só muda se ainda estava por usar —
 * dois palpites concorrentes não gastam o mesmo passe duas vezes. Não mexe no `status`.
 * @returns {Promise<{ok:true, passe:object} | {ok:false, code:"passe_nao_encontrado"|"palpite_ja_usado"|"gravar_passe_falhou"}>}
 */
export async function marcarPalpiteUsado(passeId) {
  if (typeof passeId !== "string" || !UUID_RE.test(passeId)) return { ok: false, code: "passe_nao_encontrado" };
  const { data, error } = await getSupabase().from(TABELA).update({ palpite_usado: true })
    .eq("id", passeId).eq("palpite_usado", false).select("*");
  if (error) return { ok: false, code: "gravar_passe_falhou" };
  if (Array.isArray(data) && data.length === 1) return { ok: true, passe: data[0] };
  const { data: existe, error: e2 } = await getSupabase().from(TABELA).select("id").eq("id", passeId).maybeSingle();
  if (e2) return { ok: false, code: "gravar_passe_falhou" };
  return { ok: false, code: existe ? "palpite_ja_usado" : "passe_nao_encontrado" };
}
