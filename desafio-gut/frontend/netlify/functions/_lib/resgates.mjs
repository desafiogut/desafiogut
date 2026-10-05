// _lib/resgates.mjs — UTAC106g. Store dos PEDIDOS DE RESGATE do cartão colecionável.
//
// PORQUE EXISTE: o resgate é o fim do ciclo do programa de fidelidade Via B — o titular troca
// `PONTOS_POR_CARTAO` (50) pontos de CARTÃO pelo cartão físico. O PEDIDO (com a morada de entrega)
// vive em `public.resgates` (UTAC106g); o DÉBITO dos 50 pontos vive no histórico de `public.pontos`
// (tipo `"resgate"`, feito por `registarResgate()` em `_lib/passe-pontos.mjs`).
//
// ⚠️ Este módulo só fala com `public.resgates`: NÃO toca em `public.pontos`, `public.palpites`
// nem em `public.passes` (Via A). A orquestração atómica (débito → pedido → rollback) NÃO vive aqui
// — vive em `_lib/passe-pontos.mjs` (`registarResgate`), que é quem tem o histórico dos pontos.
//
// ⚠️ LGPD: a `morada` é dado pessoal. NUNCA aparece em logs nem é devolvida ao cliente anónimo —
// só o backend (service_role) a lê, e só o titular recebe o seu próprio pedido.
//
// Padrões herdados POR LEITURA (não cópia cega) de `_lib/passe-pontos.mjs` / `_lib/passe.mjs`:
// escrita devolve `{ok:false, code}` (nunca excepção no caminho de escrita); leitura devolve `null`
// para chave inválida e LANÇA em erro do Supabase; idempotência pela chave única (23505 → devolve o
// existente); sem dados pessoais em logs (só códigos de erro).

import { getSupabase } from "./supabase-client.mjs";

const TABELA = "resgates";
const UNIQUE_VIOLATION = "23505";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const KEY_MAX = 100;
const CARTAO_ID_MAX = 80;

/** Estados possíveis de um pedido de resgate (a mesma lista do CHECK da migração). */
export const STATUS_PENDENTE = "pendente";
export const STATUS_RESGATE_VALIDOS = Object.freeze(["pendente", "enviado", "entregue", "cancelado"]);

const normalizar = (e) => String(e ?? "").toLowerCase();
const enderecoValido = (e) => ENDERECO_RE.test(e);

/**
 * Lê o pedido de resgate pela chave de idempotência (chave natural do endpoint).
 * @returns {Promise<object|null>} — `null` se a chave for inválida ou não existir.
 */
export async function lerResgatePorChave(idempotencyKey) {
  const k = String(idempotencyKey ?? "");
  if (!k || k.length > KEY_MAX) return null;
  const { data, error } = await getSupabase().from(TABELA).select("*").eq("idempotency_key", k).maybeSingle();
  if (error) throw new Error(`[resgates] lerResgatePorChave falhou: ${error.code ?? error.message}`);
  return data ?? null;
}

/** Lista os pedidos do endereço (mais recentes primeiro). Lança em erro do Supabase. */
export async function lerResgates(endereco) {
  const e = normalizar(endereco);
  if (!enderecoValido(e)) return [];
  const { data, error } = await getSupabase().from(TABELA).select("*")
    .eq("endereco", e).order("criado_em", { ascending: false });
  if (error) throw new Error(`[resgates] lerResgates falhou: ${error.code ?? error.message}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Cria o pedido de resgate. Idempotente por `idempotencyKey` (UNIQUE na tabela): a 2.ª tentativa
 * devolve o existente com `criado:false` (23505), sem criar um 2.º pedido.
 * @returns {Promise<{ok:true,criado:boolean,resgate:object}|{ok:false,code:string}>}
 */
export async function criarResgate({ endereco, cartaoId, morada, idempotencyKey } = {}) {
  const e = normalizar(endereco);
  if (!enderecoValido(e)) return { ok: false, code: "ENDERECO_INVALIDO" };
  const cid = typeof cartaoId === "string" ? cartaoId.trim() : "";
  if (!cid || cid.length > CARTAO_ID_MAX) return { ok: false, code: "CARTAO_INVALIDO" };
  const key = typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";
  if (!key || key.length > KEY_MAX) return { ok: false, code: "CHAVE_INVALIDA" };
  if (!morada || typeof morada !== "object") return { ok: false, code: "MORADA_OBRIGATORIA" };

  const payload = {
    endereco: e, cartao_id: cid, morada, status: STATUS_PENDENTE, idempotency_key: key,
    criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await getSupabase().from(TABELA).insert(payload).select("*").maybeSingle();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const existente = await lerResgatePorChave(key);
      return existente ? { ok: true, criado: false, resgate: existente } : { ok: false, code: "ERRO_DB" };
    }
    return { ok: false, code: "ERRO_DB" };
  }
  return { ok: true, criado: true, resgate: data };
}
