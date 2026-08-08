// _lib/atividade-utilizadores.mjs — MC89.43 (S2 / P0-A)
//
// Regista que um endereço se autenticou, para o painel admin poder ver QUEM USA
// a app — e não apenas quem movimentou dinheiro (ver a migração
// 20260802_mc8943_atividade_utilizadores.sql para o porquê e para os limites do
// que é guardado).
//
// ⚠️ FAIL-SOFT, AO CONTRÁRIO DE `admin-log.mjs`.
//
// A diferença é deliberada e vale a pena dizê-la à frente, porque as duas
// escritas parecem irmãs e não são:
//
//   admin-log   → FAIL-CLOSED. Uma ação de admin sem registo é pior do que
//                 nenhuma ação. Se o log falhar, a ação não acontece.
//   atividade   → FAIL-SOFT.   Isto é uma estatística de presença. Se falhar,
//                 o utilizador TEM DE conseguir entrar na mesma. Nunca se
//                 recusa um login por causa de uma linha de contagem.
//
// Se algum dia isto começar a bloquear o login, o defeito é aqui.

import { getSupabase } from "./supabase-client.mjs";

const RE_ENDERECO = /^0x[0-9a-f]{40}$/;

/**
 * Regista/atualiza o acesso de um endereço. Nunca lança.
 *
 * A escrita vai ao PRIMÁRIO (é escrita) e passa pela função `registar_atividade`,
 * que faz o upsert atómico: dois logins simultâneos do mesmo endereço não
 * perdem contagem nem colidem na chave primária.
 *
 * @param {string} endereco
 * @param {object} [opts]
 * @param {object} [opts._sb] cliente Supabase injetável (testes)
 * @returns {Promise<boolean>} true se registou; false se foi ignorado ou falhou
 */
export async function registarAtividade(endereco, { _sb = null } = {}) {
  const addr = String(endereco || "").toLowerCase();
  if (!RE_ENDERECO.test(addr)) return false;

  try {
    const sb = _sb || getSupabase();
    const { error } = await sb.rpc("registar_atividade", { p_endereco: addr });
    if (error) {
      console.warn("[atividade] registo falhou (não-fatal):", error.message);
      return false;
    }
    return true;
  } catch (err) {
    // Supabase por configurar, rede em baixo, o que for: o login segue.
    console.warn("[atividade] registo falhou (não-fatal):", err?.message);
    return false;
  }
}

/**
 * Apaga a linha de atividade de um endereço (exclusão de conta).
 *
 * Diferente de `registarAtividade`, aqui o erro é DEVOLVIDO em vez de engolido:
 * quem chama é o fluxo de eliminação de conta, que precisa de saber se alguma
 * coisa ficou para trás (MC72 — cada sub-operação é fail-soft mas os erros são
 * recolhidos e reportados).
 *
 * @returns {Promise<number>} número de linhas apagadas
 */
export async function apagarAtividade(endereco, { _sb = null, dryRun = false } = {}) {
  const addr = String(endereco || "").toLowerCase();
  if (!RE_ENDERECO.test(addr)) return 0;

  const sb = _sb || getSupabase();

  if (dryRun) {
    const { count, error } = await sb.from("atividade_utilizadores")
      .select("endereco", { count: "exact", head: true })
      .eq("endereco", addr);
    if (error) throw new Error(`select atividade_utilizadores: ${error.message}`);
    return count || 0;
  }

  const { data, error } = await sb.from("atividade_utilizadores")
    .delete()
    .eq("endereco", addr)
    .select("endereco");
  if (error) throw new Error(`delete atividade_utilizadores: ${error.message}`);
  return (data || []).length;
}
