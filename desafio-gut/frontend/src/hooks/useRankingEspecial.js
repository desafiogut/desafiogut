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
 * UTAC141 (Frente C) — «dei lances e a tabela diz Nenhum lance registado». MEDIDO em produção: a escrita no
 * `ranking_especial` e a leitura por anon funcionavam (linha presente na RPC e no DOM); o que faltava era a
 * tabela reler no instante do PRÓPRIO lance. O Realtime é a via normal, mas depende de o canal já estar
 * subscrito e de o evento não se perder — coisas que não se controlam. Três gatilhos novos, todos de leitura
 * (nenhuma escrita, nenhum valor): `nonce` (o ecrã incrementa-o quando o lance dele tem sucesso), uma recarga
 * periódica enquanto a aba está visível, e a volta à aba. `intervaloMs: 0` desliga a recarga periódica.
 *
 * @param {string|null} edicaoId
 * @param {{obterCliente?:Function, configurado?:Function, nonce?:number, intervaloMs?:number}} [opcoes]
 * @returns {Array<{lanceId:string, enderecoCurto:string, valor:null, oculto:true, repetido:null}>}
 */
export const RELEITURA_MS = 400;
/** UTAC141 — recarga de segurança da tabela ao vivo (uma RPC pequena; Realtime pode perder eventos). */
export const RECARGA_MS = 20000;

export function useRankingEspecial(edicaoId, {
  obterCliente = getSupabaseBrowser,
  configurado = supabaseConfigurado,
  nonce = 0,
  intervaloMs = RECARGA_MS,
} = {}) {
  const [lances, setLances] = useState([]);

  // ⚠️1 do validador (UTAC141) — a tabela era esvaziada na 1.ª linha do efeito, e o efeito depende do
  // `nonce`: dar um lance fazia aparecer «📭 Nenhum lance registrado ainda» no exacto momento em que o
  // lance do próprio entrava (o sintoma do ticket, reintroduzido pelo gatilho novo). Limpar só quando
  // muda a EDIÇÃO; uma releitura da MESMA edição mantém as linhas antigas até chegarem as novas.
  useEffect(() => { setLances([]); }, [edicaoId]);

  useEffect(() => {
    if (!edicaoId || !configurado()) return undefined;
    let cancelado = false;
    let canal = null;
    let cliente = null;
    let temporizador = null;

    // ⚠️4 do validador — três gatilhos chamam `ler()` sem serialização (nonce, intervalo, visibilidade).
    // Sem guarda, a resposta VELHA chegava depois da NOVA e escrevia por cima: uma linha desaparecia até
    // ao poll seguinte. Só a leitura mais recente pode escrever o estado.
    let seqLeitura = 0;
    const ler = async () => {
      if (!cliente) return;
      const meu = ++seqLeitura;
      const { data, error } = await cliente.rpc("get_ranking_especial", { p_edicao_id: edicaoId });
      if (cancelado || error || meu !== seqLeitura) return;
      setLances(lancesOcultosDoRanking(data));
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

    // UTAC141 — recarga periódica só com a aba visível (não se gasta rede em segundo plano).
    const visivel = () => typeof document === "undefined" || document.visibilityState !== "hidden";
    const idIntervalo = intervaloMs > 0
      ? setInterval(() => { if (visivel()) ler().catch(() => {}); }, intervaloMs)
      : null;
    const aoVoltar = () => { if (visivel()) ler().catch(() => {}); };
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", aoVoltar);
    }

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      if (idIntervalo) clearInterval(idIntervalo);
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", aoVoltar);
      }
      if (canal && cliente) cliente.removeChannel(canal);
    };
  }, [edicaoId, obterCliente, configurado, nonce, intervaloMs]);

  return lances;
}
