// _lib/passe-a-cada-lances.mjs — UTAC142.1 (regra) · UTAC145 (contagem no Postgres).
// Regra (R18-142.1-A, intocada): na edição especial o lance gasta SÓ pontos. Quem tem Passe Relâmpago gasta 1 a cada N
// lances (omissão 3: no 3.º, 6.º, 9.º…). Sem Passe nessa altura, o lance passa na mesma. O bónus de +100 pontos continua
// na COMPRA (Regulamento v6.1, Art. 7º), não aqui.
//
// UTAC145 — a contagem saiu do Blob `especial-lances-passe` (ℹ️3 do SEG4 do UTAC142: uma escrita que chegava mas cuja
// resposta se perdia contava o mesmo lance 2×). Agora: RPC `registar_lance_passe` (migração 20261120_utac145), uma linha
// por LANCE com `lance_id` como chave primária. Posição e consumo decididos na mesma transacção. Repetir com o mesmo
// `lanceId` devolve o resultado já gravado ⇒ esta lib PODE repetir quando a resposta falha, sem risco de dupla contagem.
//
// Corre DEPOIS de o lance existir ⇒ nunca há Passe a devolver. FAIL-SOFT: devolve sempre, nunca lança.

import { getSupabase } from "./supabase-client.mjs";

export const LANCES_POR_PASSE_PADRAO = 3;
export const TABELA_LANCES_PASSE = "especial_lances_passe";
/** O Blob do UTAC142.1 (só para a semente da transição; o código já não escreve nele). */
export const STORE_CONTAGEM_LEGADO = "especial-lances-passe";
const TENTATIVAS = 3;

function cliente(dep) {
  if (dep) return dep;
  try { return getSupabase(); } catch { return null; }
}

/**
 * Regista o lance (já gravado) na contagem e, se for o N-ésimo, gasta 1 Passe Relâmpago — tudo numa transacção.
 * @returns {Promise<{ok:boolean, lances?:number, passeConsumido:boolean, passesRelampagoRestantes?:number|null, code?:string}>}
 */
export async function contarLanceEConsumirPasse({ lanceId, edicaoId, endereco, aCada = LANCES_POR_PASSE_PADRAO, supabase } = {}) {
  if (!Number.isInteger(aCada) || aCada < 1) return { ok: false, passeConsumido: false, code: "desligado" };
  if (typeof lanceId !== "string" || !lanceId) return { ok: false, passeConsumido: false, code: "lance_id_obrigatorio" };
  const sb = cliente(supabase);
  if (!sb?.rpc) return { ok: false, passeConsumido: false, code: "supabase_indisponivel" };

  let ultimo = "rpc_falhou";
  for (let i = 0; i < TENTATIVAS; i++) {
    try {
      const { data, error } = await sb.rpc("registar_lance_passe", {
        p_lance_id: lanceId, p_edicao_id: edicaoId, p_endereco: endereco, p_a_cada: aCada,
      });
      if (!error) {
        const l = Array.isArray(data) ? data[0] : data;
        if (!l || !Number.isInteger(l.posicao_lance)) return { ok: false, passeConsumido: false, code: "resposta_invalida" };
        return {
          ok: true, lances: l.posicao_lance, passeConsumido: l.passe_gasto === true,
          passesRelampagoRestantes: l.passe_gasto === true && Number.isInteger(l.passes_restantes) ? l.passes_restantes : null,
        };
      }
      ultimo = "rpc_falhou";
    } catch { ultimo = "excecao"; }
    // repetir é seguro: o mesmo lance_id devolve o gravado (nem conta nem consome outra vez)
  }
  return { ok: false, passeConsumido: false, code: ultimo };
}

/**
 * Quantos Passes este endereço já gastou nesta edição. Serve o «portador» dos avisos do GUTO.
 * LANÇA em falha de leitura: quem chama trata como INDETERMINADO (correcção do validador do UTAC142, ⚠️1), nunca como 0.
 */
export async function passesConsumidosNaEdicao(edicaoId, endereco, { supabase } = {}) {
  const sb = cliente(supabase);
  if (!sb?.from) throw new Error("supabase_indisponivel");
  const { count, error } = await sb.from(TABELA_LANCES_PASSE)
    .select("lance_id", { count: "exact", head: true })
    .eq("edicao_id", edicaoId).eq("endereco", endereco).eq("passe_consumido", true);
  if (error) throw new Error("leitura_falhou");
  return Number(count) || 0;
}
