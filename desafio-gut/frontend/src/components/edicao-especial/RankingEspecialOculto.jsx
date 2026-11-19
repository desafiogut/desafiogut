import { useEffect, useState } from "react";
import { getSupabaseBrowser, supabaseConfigurado } from "../../lib/supabaseClient.js";
import { COR, T_PADRAO } from "./_estilo-especial.js";
import { linhasDoRanking } from "./_ranking-especial.js";

export { linhasDoRanking };

/**
 * UTAC140 (Frente E) — tabela AO VIVO dos lances da edição especial, com os VALORES OCULTOS.
 *
 * Fonte: Supabase `public.ranking_especial` (migração 20261119_utac140_ranking_especial.sql).
 *   · posição = ORDEM DE CHEGADA (R18-140-B) — não diz quem lidera nem deixa sondar valores;
 *   · leitura pela RPC `get_ranking_especial` (anon): posição + endereço encurtado, valor SEMPRE null;
 *   · Realtime: o payload que o anon recebe vem SEM colunas (medido no SEG1 — o anon só tem privilégio de
 *     coluna em 4 colunas e o Realtime entrega `new: {}`), por isso o evento é só o GATILHO de uma releitura.
 * O valor nunca se desenha aqui, nem que viesse: «****» sempre. O resultado com valores é o Top 10 da
 * apuração (cartão da especial / Meus Ativos com Passe).
 */
export const RELEITURA_MS = 400;

export default function RankingEspecialOculto({ edicaoId, isMobile = false, t = T_PADRAO, obterCliente = getSupabaseBrowser, configurado = supabaseConfigurado, inicial = null }) {
  // `inicial` só para testes de render (SSR não corre efeitos); passa por `linhasDoRanking` como os dados reais.
  const [linhas, setLinhas] = useState(() => (inicial == null ? null : linhasDoRanking(inicial)));

  useEffect(() => {
    if (!edicaoId || !configurado()) return undefined;
    let cancelado = false;
    let canal = null;
    let cliente = null;
    let temporizador = null;

    const ler = async () => {
      if (!cliente) return;
      const { data, error } = await cliente.rpc("get_ranking_especial", { p_edicao_id: edicaoId });
      if (!cancelado && !error) setLinhas(linhasDoRanking(data));
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

  const lista = linhas ?? [];
  return (
    <div data-bloco="ranking-especial-oculto" data-edicao={edicaoId} style={{
      marginTop: "0.75rem", padding: isMobile ? "0.75rem" : "1rem",
      borderRadius: "14px", border: "1px solid rgba(245,166,35,0.22)", background: "rgba(5,8,24,0.55)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <strong style={{ color: COR.text, fontSize: isMobile ? "0.88rem" : "0.95rem" }}>
          {t("edicao.especial.rankingTitulo", "⚡ Lances da Oferta Relâmpago")}
        </strong>
        <span data-testid="ranking-total" style={{ color: COR.muted, fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>
          {lista.length} {lista.length === 1 ? "lance" : "lances"}
        </span>
      </div>
      <p style={{ margin: "0 0 0.5rem", color: COR.muted, fontSize: "0.75rem", lineHeight: 1.4 }}>
        {t("edicao.especial.rankingLegenda", "Por ordem de chegada. Os valores ficam secretos até a apuração.")}
      </p>
      {lista.length === 0 ? (
        <div data-estado={linhas === null ? "a-carregar" : "vazio"} style={{ color: COR.muted, fontSize: "0.8rem", textAlign: "center", padding: "0.5rem 0" }}>
          {linhas === null ? "…" : t("edicao.especial.rankingVazio", "Ainda sem lances. Seja o primeiro!")}
        </div>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "18rem", overflowY: "auto" }}>
          {lista.map((l) => (
            <li key={l.posicao} data-posicao={l.posicao} style={{
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.4rem",
              fontSize: isMobile ? "0.78rem" : "0.82rem", borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ width: "2.6rem", fontWeight: 800, color: COR.muted, fontVariantNumeric: "tabular-nums" }}>{l.posicao}º</span>
              <span style={{ flex: 1, minWidth: 0, color: COR.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>{l.endereco}</span>
              <strong data-valor="oculto" style={{ color: COR.gold, letterSpacing: "0.1em" }}>**** pontos</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
