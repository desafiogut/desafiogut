import { useEffect, useState } from "react";
import { getSupabaseBrowser, supabaseConfigurado } from "../lib/supabaseClient.js";
import { lancesOcultosDoRanking } from "../components/edicao-especial/_ranking-especial.js";

/**
 * UTAC140 (Frente E) — lances AO VIVO da edição especial, para a `TabelaLances` padrão (o layout é o da edição).
 *
 * Fonte: Supabase `public.ranking_especial` (migrações 20261119_utac140*). Leitura pela RPC `get_ranking_especial`
 * (anon: posição + endereço encurtado, valor SEMPRE null). O payload do Realtime que o anon recebe vem SEM colunas
 * (medido: `new: {}`), por isso cada evento é só o GATILHO de uma releitura (400 ms de folga para agrupar rajadas).
 * Sem Supabase configurado, ou sem edição: lista vazia (a tabela mostra «Nenhum lance registrado ainda»).
 *
 * @param {string|null} edicaoId
 * @returns {Array<{lanceId:string, enderecoCurto:string, valor:null, oculto:true, repetido:null}>}
 */
export const RELEITURA_MS = 400;

export function useRankingEspecial(edicaoId, { obterCliente = getSupabaseBrowser, configurado = supabaseConfigurado } = {}) {
  const [lances, setLances] = useState([]);

  useEffect(() => {
    setLances([]);
    if (!edicaoId || !configurado()) return undefined;
    let cancelado = false;
    let canal = null;
    let cliente = null;
    let temporizador = null;

    const ler = async () => {
      if (!cliente) return;
      const { data, error } = await cliente.rpc("get_ranking_especial", { p_edicao_id: edicaoId });
      if (!cancelado && !error) setLances(lancesOcultosDoRanking(data));
    };
    const agendarLeitura = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { ler().catch(() => {}); }, RELEITURA_MS);
    };

    obterCliente().then((sb) => {
      if (cancelado || !sb) return;
      cliente = sb;
      ler().catch(() => {});
      canal = sb.channel(`ranking-especial:${edicaoId}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "ranking_especial", filter: `edicao_id=eq.${edicaoId}` },
          agendarLeitura)
        .subscribe();
    }).catch(() => {});

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      if (canal && cliente) cliente.removeChannel(canal);
    };
  }, [edicaoId, obterCliente, configurado]);

  return lances;
}
