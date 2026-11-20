// _lib/ranking-especial.mjs — UTAC140 (Frente B). Ranking AO VIVO da edição especial (Supabase
// `public.ranking_especial`, migração 20261119_utac140_ranking_especial.sql).
//
// Decisões do operador (R18-140): posição = ORDEM DE CHEGADA (B); o valor NUNCA é escrito durante a
// edição — só a apuração o revela (C); endereço sempre ENCURTADO (R4/LGPD; o CHECK da tabela recusa um
// endereço inteiro).
//
// ⚠️ Ambas as funções são FAIL-SOFT: o ranking é uma vista, não a fonte. Os lances e o vencedor vivem
//    no Key-Per-Bid (`getLances`) e na apuração do UTAC138. Uma falha aqui nunca pode recusar um lance
//    já pago nem impedir a gravação do resultado.

import { getSupabase, supabaseConfigurado } from "./supabase-client.mjs";
import { EDICAO_ESPECIAL_RE } from "./edicao-janela.mjs";
import { formatarNome } from "./nome-exibicao.mjs"; // UTAC142 (Frente D) — só «PrimeiroNome I.», nunca e-mail

const ENDERECO_RE = /^0x[0-9a-fA-F]{40}$/;

/** 0x1234…abcd (o MESMO formato de `apuracao-especial.mjs#encurtarEndereco` e do CHECK da tabela).
 *  Duplicado de propósito: importar a apuração daqui criava um ciclo (a apuração chama `revelar…`). */
export function encurtar(e) {
  return typeof e === "string" && ENDERECO_RE.test(e) ? `${e.slice(0, 6)}…${e.slice(-4)}`.toLowerCase() : null;
}

function cliente(dep) {
  if (dep !== undefined) return dep;
  if (!supabaseConfigurado()) return null;
  try { return getSupabase(); } catch { return null; }
}

/**
 * Regista UM lance aceite no ranking ao vivo. Só edições ESPECIAL-*. NÃO recebe o valor (por desenho).
 * Idempotente: o mesmo `lanceId` devolve a mesma posição (função SQL sob advisory lock).
 * @returns {Promise<{ok:true, posicao:number} | {ok:false, code:string}>}
 */
export async function registarNoRankingEspecial({ lanceId, edicaoId, endereco, nomeExibicao }, { supabase } = {}) {
  if (typeof edicaoId !== "string" || !EDICAO_ESPECIAL_RE.test(edicaoId)) return { ok: false, code: "nao_especial" };
  const curto = encurtar(endereco);
  if (typeof lanceId !== "string" || !lanceId || !curto) return { ok: false, code: "dados_invalidos" };
  const sb = cliente(supabase);
  if (!sb?.rpc) return { ok: false, code: "supabase_indisponivel" };
  try {
    // UTAC142 — `p_nome` só vai quando há nome de pessoa reduzido; sem ele a chamada fica igual à do UTAC140.
    const nome = formatarNome(nomeExibicao);
    const { data, error } = await sb.rpc("registar_lance_especial", {
      p_id: lanceId, p_edicao_id: edicaoId, p_endereco: curto, ...(nome ? { p_nome: nome } : {}),
    });
    if (error) return { ok: false, code: "registo_falhou" };
    return { ok: true, posicao: Number(data) };
  } catch {
    return { ok: false, code: "registo_falhou" };
  }
}

/**
 * Revela os valores no ranking — SÓ a apuração chama isto, depois de `termino_em` + margem de fecho.
 * @param {string} edicaoId
 * @param {Array<{lanceId?:string, valorCentavos?:unknown}>} lances do Key-Per-Bid
 * @returns {Promise<{ok:true, revelados:number} | {ok:false, code:string}>}
 */
export async function revelarRankingEspecial(edicaoId, lances, { supabase } = {}) {
  if (typeof edicaoId !== "string" || !EDICAO_ESPECIAL_RE.test(edicaoId)) return { ok: false, code: "nao_especial" };
  const valores = (Array.isArray(lances) ? lances : [])
    .filter((l) => l && typeof l.lanceId === "string" && Number.isSafeInteger(l.valorCentavos) && l.valorCentavos >= 1)
    .map((l) => ({ id: l.lanceId, valor: l.valorCentavos }));
  if (valores.length === 0) return { ok: true, revelados: 0 };
  const sb = cliente(supabase);
  if (!sb?.rpc) return { ok: false, code: "supabase_indisponivel" };
  try {
    const { data, error } = await sb.rpc("revelar_ranking_especial", { p_edicao_id: edicaoId, p_valores: valores });
    if (error) return { ok: false, code: "revelacao_falhou" };
    return { ok: true, revelados: Number(data) };
  } catch {
    return { ok: false, code: "revelacao_falhou" };
  }
}
