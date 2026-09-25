import { COR, T_PADRAO, caixa, tituloSecao, legenda, encurtar, inteiroSeguro } from "./_estilo.js";

const LIMITE = 10;

/**
 * Ranking do ciclo: top 10, com a linha do próprio utilizador destacada.
 *
 * ⚠️ VAZIO E ERRO SÃO FACTOS DIFERENTES, e esta secção não os colapsa.
 * "Ainda não há pontuações neste ciclo" e "não consegui ler o ranking" levam o
 * utilizador a acções opostas — esperar, ou tentar outra vez. A tela existente
 * confunde-os ("Nenhum lance registrado") e é um defeito que não se herda.
 *
 * ⚠️ R4: os endereços de OUTRAS pessoas aparecem encurtados. As capturas de ecrã
 * deste MC vão para o repositório, e um ranking é a única secção que mostra
 * dados de terceiros.
 *
 * @param {object} props
 * @param {Array<{posicao:number, endereco:string, pontosTotais:number, acertosTotais:number, bonusEmitido:boolean}>} [props.ranking]
 * @param {number} [props.total]  participantes no ciclo (pode exceder o top 10)
 * @param {string|null} [props.address]
 * @param {boolean} [props.carregando]
 * @param {string|null} [props.erro]
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function RankingCiclo({
  ranking = [],
  total = 0,
  address = null,
  carregando = false,
  erro = null,
  isMobile = false,
  t = T_PADRAO,
}) {
  const titulo = t("ativos.rank.titulo", "📋 Ranking do ciclo");
  const lista = Array.isArray(ranking) ? ranking : [];

  if (erro) {
    return (
      <section style={caixa(isMobile)} data-secao="ranking-ciclo">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        <p style={{ ...legenda(isMobile), color: COR.danger }} data-estado="erro">
          {t("ativos.rank.erro",
             "Não foi possível carregar o ranking agora. Tente novamente mais tarde.")}
        </p>
      </section>
    );
  }

  if (carregando) {
    return (
      <section style={caixa(isMobile)} data-secao="ranking-ciclo">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        <p style={{ ...legenda(isMobile), minHeight: "2.4rem" }} data-estado="carregando">
          {t("ativos.rank.carregando", "Carregando o ranking…")}
        </p>
      </section>
    );
  }

  if (lista.length === 0) {
    return (
      <section style={caixa(isMobile)} data-secao="ranking-ciclo">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        <p style={legenda(isMobile)} data-estado="vazio">
          {t("ativos.rank.vazio",
             "Ainda não há pontuações neste ciclo. O ranking aparece depois da primeira rodada apurada.")}
        </p>
      </section>
    );
  }

  const meu = address ? String(address).toLowerCase() : null;
  const totalReal = Math.max(inteiroSeguro(total) ?? 0, lista.length);
  const visiveis = lista.slice(0, LIMITE);
  const euEstouNoTopo = meu !== null
    && visiveis.some((r) => String(r.endereco).toLowerCase() === meu);
  const euFora = meu !== null && !euEstouNoTopo
    ? lista.find((r) => String(r.endereco).toLowerCase() === meu) ?? null
    : null;

  const linha = (r, souEu, ordem) => (
    <li
      key={`${r.posicao}-${r.endereco}`}
      data-linha="rank"
      data-eu={souEu ? "sim" : "nao"}
      style={{
        display: "flex", alignItems: "center", gap: "0.55rem",
        padding: isMobile ? "0.35rem 0.4rem" : "0.4rem 0.5rem",
        borderRadius: "8px",
        background: souEu ? COR.senhasDim : "transparent",
        border: souEu ? `1px solid ${COR.senhas}` : "1px solid transparent",
        fontSize: isMobile ? "0.78rem" : "0.83rem",
      }}
    >
      {/* ⚠️ `posicao: null` renderizava um "º" solto e `posicao: 0` renderizava
          "0º". O backend pode devolver `posicao: null` (é `linha.posicao || null`
          em `lerFeedback`). Sem posição utilizável, cai-se na ORDEM da lista, que
          é o que o ranking já garante. Achado da validação independente. */}
      <span style={{
        color: souEu ? COR.senhas : COR.muted,
        fontWeight: 800, minWidth: "1.9rem",
      }}>{(inteiroSeguro(r.posicao) ?? ordem) || ordem}º</span>
      <span style={{
        color: COR.text, fontWeight: souEu ? 800 : 600,
        fontFamily: "monospace", flex: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {encurtar(r.endereco)}
        {souEu && (
          <strong style={{ color: COR.senhas, fontWeight: 800, marginLeft: "0.4rem" }}>
            {t("ativos.rank.voce", "· você")}
          </strong>
        )}
      </span>
      {r.bonusEmitido && (
        <span title={t("ativos.rank.comBonus", "conquistou bônus")}
              style={{ fontSize: "0.72rem" }}>🎟️</span>
      )}
      <span style={{ color: COR.primary, fontWeight: 800, minWidth: "2.6rem", textAlign: "right" }}>
        {inteiroSeguro(r.pontosTotais) ?? "—"}
      </span>
    </li>
  );

  return (
    <section style={caixa(isMobile)} data-secao="ranking-ciclo">
      <h2 style={tituloSecao(isMobile)}>{titulo}</h2>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.2rem" }}>
        {visiveis.map((r, i) => linha(r, meu !== null && String(r.endereco).toLowerCase() === meu, i + 1))}
      </ul>

      {euFora !== null && (
        <>
          <p style={{ ...legenda(isMobile), margin: "0.45rem 0 0.2rem" }}>
            {t("ativos.rank.suaPosicao", "Sua posição")}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {linha(euFora, true, inteiroSeguro(euFora.posicao) ?? lista.indexOf(euFora) + 1)}
          </ul>
        </>
      )}

      {/* ⚠️ `total` vem do endpoint e a lista vem do mesmo sítio, mas podem
          divergir: `useRanking` faz `Number(data?.total) || 0`, logo um endpoint
          que omita `total` escrevia "0 participantes." por baixo de 4 linhas.
          Reconcilia-se com o que está REALMENTE na lista.
          ⚠️ E `totalReal` tem de ser usado nos DOIS ramos. A primeira correcção
          calculou-o e aplicou-o só ao ramo "a mostrar os N primeiros de M" — o
          ramo `else`, que é o caso COMUM (menos de 10 participantes), continuava
          a escrever `total` cru e o defeito sobrevivia intacto. É o mesmo padrão
          do MC93-E: aplicar a lição a metade dos sítios. */}
      <p style={{ ...legenda(isMobile), marginTop: "0.55rem" }}>
        {totalReal > visiveis.length
          ? `${t("ativos.rank.mostrando", "A mostrar os")} ${visiveis.length} ${
              t("ativos.rank.de", "primeiros de")} ${totalReal} ${
              t("ativos.rank.participantes", "participantes")}.`
          : `${totalReal} ${
              totalReal === 1
                ? t("ativos.rank.participante1", "participante")
                : t("ativos.rank.participantes", "participantes")
            }.`}
      </p>
    </section>
  );
}
