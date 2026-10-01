// _lib/cupom.mjs — UTAC105b. Repositório dos cupons do Passe Desafio (Supabase `public.cupons`).
//
// DEC-02: a PLATAFORMA define os valores (VALORES_CUPOM); o LOJISTA escolhe quais oferece (ativo).
// DEC-02b: validade 30 dias (coluna `validade_dias`, contada a partir da compra do Passe).
// `lojista_id` = o `cliente_id` da cota corporativa — o mesmo valor que `produtos.mjs` grava em `produto.lojista`
// (`0x…` ou `cnpj:<14 dígitos>`, medido no SEG-1). Idempotência (P8): UNIQUE (lojista_id, valor_rs).
// Sem DELETE: a tabela não o permite (REVOKE) — desactivar é `ativo = false`. Sem dados pessoais em logs.

import { getSupabase } from "./supabase-client.mjs";

export const VALORES_CUPOM = Object.freeze([5, 10, 20]); // R$ — definidos pela plataforma (DEC-02)
export const VALIDADE_CUPOM_DIAS = 30;                     // DEC-02b

const TABELA = "cupons";
const UNIQUE_VIOLATION = "23505";
const LOJISTA_RE = /^(0x[0-9a-f]{40}|cnpj:[0-9]{14})$/;

const normalizarLojista = (l) => String(l ?? "").trim().toLowerCase();
/** Só os valores da plataforma, como número exacto (nada de "5", 5.5 ou coerção). */
export const valorValido = (v) => typeof v === "number" && VALORES_CUPOM.includes(v);
export const lojistaValido = (l) => LOJISTA_RE.test(normalizarLojista(l));

/** Lê o cupom (lojista, valor). @returns {Promise<object|null>} — lança em erro do Supabase. */
export async function lerCupom({ lojistaId, valorRs }) {
  const l = normalizarLojista(lojistaId);
  if (!LOJISTA_RE.test(l) || !valorValido(valorRs)) return null;
  const { data, error } = await getSupabase().from(TABELA).select("*")
    .eq("lojista_id", l).eq("valor_rs", valorRs).maybeSingle();
  if (error) throw new Error(`[cupom] lerCupom falhou: ${error.code ?? error.message}`);
  return data ?? null;
}

/**
 * Cria o cupom. Idempotente: se já existe (ou um INSERT concorrente ganhou), devolve o existente sem o alterar.
 * @returns {Promise<{ok:true, criado:boolean, cupom:object} | {ok:false, code:"params_invalidos"|"valor_invalido"|"gravar_cupom_falhou"}>}
 */
export async function criarCupom({ lojistaId, valorRs, descricao = "", ativo = true }) {
  const l = normalizarLojista(lojistaId);
  if (!LOJISTA_RE.test(l) || typeof ativo !== "boolean") return { ok: false, code: "params_invalidos" };
  if (!valorValido(valorRs)) return { ok: false, code: "valor_invalido" };
  const { data, error } = await getSupabase().from(TABELA).insert({
    lojista_id: l, valor_rs: valorRs, descricao: String(descricao ?? "").slice(0, 200),
    validade_dias: VALIDADE_CUPOM_DIAS, ativo,
  }).select("*").single();
  if (!error) return { ok: true, criado: true, cupom: data };
  if (error.code !== UNIQUE_VIOLATION) return { ok: false, code: "gravar_cupom_falhou" };
  let existente = null;
  try { existente = await lerCupom({ lojistaId: l, valorRs }); } catch { existente = null; }
  return existente ? { ok: true, criado: false, cupom: existente } : { ok: false, code: "gravar_cupom_falhou" };
}

/** Cupons do lojista (activos e inactivos), por valor. Lança em erro do Supabase. */
export async function listarCuponsDoLojista(lojistaId) {
  const l = normalizarLojista(lojistaId);
  if (!LOJISTA_RE.test(l)) return [];
  const { data, error } = await getSupabase().from(TABELA).select("*").eq("lojista_id", l)
    .order("valor_rs", { ascending: true });
  if (error) throw new Error(`[cupom] listarCuponsDoLojista falhou: ${error.code ?? error.message}`);
  return data ?? [];
}

/**
 * Cupons ACTIVOS do lojista, só nos valores da plataforma. Uma edição vende 1 produto → 1 lojista
 * (`produto.lojista`), por isso a «edição» resolve-se no chamador (comprar-passe já leu o produto).
 * Lança em erro do Supabase.
 */
export async function listarCuponsAtivosDoLojista(lojistaId) {
  return (await listarCuponsDoLojista(lojistaId)).filter((c) => c.ativo === true && VALORES_CUPOM.includes(Number(c.valor_rs)));
}

/**
 * Liga/desliga o cupom (lojista, valor). Se ainda não existe, cria-o com esse estado. Idempotente.
 * @returns {Promise<{ok:true, cupom:object} | {ok:false, code:"params_invalidos"|"valor_invalido"|"gravar_cupom_falhou"}>}
 */
export async function actualizarCupom({ lojistaId, valorRs, ativo }) {
  const l = normalizarLojista(lojistaId);
  if (!LOJISTA_RE.test(l) || typeof ativo !== "boolean") return { ok: false, code: "params_invalidos" };
  if (!valorValido(valorRs)) return { ok: false, code: "valor_invalido" };
  const actualizar = async () => getSupabase().from(TABELA)
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq("lojista_id", l).eq("valor_rs", valorRs).select("*");
  let { data, error } = await actualizar();
  if (error) return { ok: false, code: "gravar_cupom_falhou" };
  if (Array.isArray(data) && data.length === 1) return { ok: true, cupom: data[0] };
  // Não existe: cria com o estado pedido. Se um pedido concorrente o criou entretanto, volta a aplicar o estado.
  const c = await criarCupom({ lojistaId: l, valorRs, ativo });
  if (!c.ok) return c;
  if (c.criado || c.cupom.ativo === ativo) return { ok: true, cupom: c.cupom };
  ({ data, error } = await actualizar());
  if (error || !Array.isArray(data) || data.length !== 1) return { ok: false, code: "gravar_cupom_falhou" };
  return { ok: true, cupom: data[0] };
}
