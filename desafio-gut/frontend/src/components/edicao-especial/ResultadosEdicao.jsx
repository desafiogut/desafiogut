import { COR, T_PADRAO, reais, inteiroSeguro } from "./_estilo-especial.js";

/**
 * UTAC138 (Frente D) — Top 10 da edição especial: os 10 MENORES lances ÚNICOS, por ordem crescente, como o
 * backend os apurou no encerramento (`GET resultado-edicao`, Blob `edicoes-resultados`). Componente PURO.
 *
 * Vive dentro do `PainelVencedorEspecial`, que só aparece com a especial ENCERRADA — e o card da especial só
 * se mostra até 24 h depois do fim (`RETENCAO_APOS_FIM_MS`, MC94.3.1). Logo: o painel fica visível exactamente
 * entre `termino_em` e `termino_em + 24 h`, sem relógio próprio.
 *
 * R4: cada linha mostra o nome que o participante escreveu no lance ou o endereço ENCURTADO que o servidor já
 * devolve (`0x1234…abcd`) — o endereço inteiro nunca chega ao browser por este caminho.
 *
 * @param {object} props
 * @param {Array<{posicao:number, endereco:string|null, nome:string|null, valorCentavos:number}>} props.top10
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function ResultadosEdicao({ top10, isMobile = false, t = T_PADRAO }) {
  const linhas = (Array.isArray(top10) ? top10 : [])
    .filter((l) => l && inteiroSeguro(l.valorCentavos) !== null && inteiroSeguro(l.posicao) !== null)
    .slice(0, 10);
  if (linhas.length === 0) return null;

  return (
    <div data-bloco="top10" style={{ marginTop: "0.85rem", textAlign: "left" }}>
      <div style={{
        fontSize: "0.68rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em",
        fontWeight: 800, marginBottom: "0.35rem", textAlign: "center",
      }}>
        {t("edicao.especial.top10", "Top 10 — menores lances únicos")}
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {linhas.map((l) => (
          <li
            key={l.posicao}
            data-posicao={l.posicao}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: isMobile ? "0.3rem 0.4rem" : "0.35rem 0.5rem",
              borderRadius: "6px",
              background: l.posicao === 1 ? "rgba(245,166,35,0.12)" : "transparent",
              fontSize: isMobile ? "0.78rem" : "0.82rem",
            }}
          >
            <span style={{ width: "1.6rem", fontWeight: 800, color: l.posicao === 1 ? COR.gold : COR.muted, fontVariantNumeric: "tabular-nums" }}>
              {l.posicao === 1 ? "🏆" : `${l.posicao}º`}
            </span>
            <span style={{ flex: 1, minWidth: 0, color: COR.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.nome || l.endereco || "—"}
            </span>
            <strong style={{ color: COR.text, fontVariantNumeric: "tabular-nums" }}>{reais(l.valorCentavos)}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}
