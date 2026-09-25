import { COR, T_PADRAO, ENDERECO_ZERO, encurtar, reais, inteiroSeguro } from "./_estilo-especial.js";

/**
 * Resultado da edição especial depois de encerrada (decisão D4 do operador):
 * "Edição encerrada" + vencedor + métricas da rodada. Componente PURO.
 *
 * ⚠️ O VENCEDOR SÓ EXISTE DEPOIS DA CONSOLIDAÇÃO. Entre as 20:30 e o momento em
 * que o admin corre `consolidar-lances`, o contrato ainda não tem resultado —
 * mostra-se "apuração em curso", nunca um vencedor adivinhado a partir dos
 * lances (em mainnet os valores nem chegam ao browser: vêm blindados).
 *
 * Estados, cada um marcado em `data-estado`: carregando · erro · sem-lances ·
 * apuracao · sem-vencedor · vencedor.
 *
 * @param {object} props
 * @param {boolean} [props.carregando]
 * @param {string|null} [props.erro]
 * @param {{consolidado:boolean, vencedor?:string, menorUnicoCentavos?:number}|null} [props.resultado]
 *   leitura on-chain de `resultados(idEdicao)`
 * @param {{totalLances:number, participantes:number}|null} [props.metricas]
 * @param {string|null} [props.nomeVencedor] nome de exibição do lance vencedor
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function PainelVencedorEspecial({
  carregando = false, erro = null, resultado = null, metricas = null, nomeVencedor = null,
  isMobile = false, t = T_PADRAO,
}) {
  const moldura = (estado, corpo) => (
    <div data-painel="vencedor-especial" data-estado={estado} style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.72rem", color: COR.danger, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: "0.5rem" }}>
        {t("edicao.especial.encerrada", "Edição encerrada")}
      </div>
      {corpo}
    </div>
  );
  const nota = (texto) => (
    <p style={{ margin: 0, color: COR.muted, fontSize: isMobile ? "0.8rem" : "0.85rem", lineHeight: 1.45 }}>{texto}</p>
  );

  if (carregando) return moldura("carregando", nota(t("edicao.especial.carregandoResultado", "Carregando o resultado…")));
  if (erro) return moldura("erro", nota(t("edicao.especial.erroResultado", "Não foi possível ler o resultado agora. Tente de novo em instantes.")));

  const total = inteiroSeguro(metricas?.totalLances);
  const participantes = inteiroSeguro(metricas?.participantes);
  const linhaMetricas = total !== null && participantes !== null && (
    <div data-bloco="metricas" style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "0.6rem", fontSize: "0.78rem", color: COR.text }}>
      <span>{total} {t("edicao.especial.lances", "lances")}</span>
      <span>{participantes} {t("edicao.especial.participantes", "participantes")}</span>
    </div>
  );

  // ⚠️ O resultado ON-CHAIN manda sobre as métricas: `lances-flash` devolve
  // `{lances: []}` com 200 quando o Blob falha, e um "nenhum lance" por cima de um
  // vencedor consolidado seria uma mentira. Achado da validação independente.
  if (total === 0 && !resultado?.consolidado) {
    return moldura("sem-lances", nota(t("edicao.especial.semLances", "Nenhum lance foi dado nesta edição.")));
  }

  if (!resultado?.consolidado) {
    return moldura("apuracao", <>
      {nota(t("edicao.especial.apuracao", "Apuração em curso — o vencedor aparece aqui assim que for confirmado."))}
      {linhaMetricas}
    </>);
  }

  const vencedor = typeof resultado.vencedor === "string" ? resultado.vencedor : "";
  if (!vencedor || vencedor.toLowerCase() === ENDERECO_ZERO) {
    return moldura("sem-vencedor", <>
      {nota(t("edicao.especial.semVencedor", "Não houve lance único nesta edição."))}
      {linhaMetricas}
    </>);
  }

  // R4: o nome que o vencedor escolheu, ou o endereço ENCURTADO — nunca inteiro.
  const quem = nomeVencedor || encurtar(vencedor);
  return moldura("vencedor", <>
    <div style={{ fontSize: isMobile ? "1.05rem" : "1.15rem", fontWeight: 900, color: COR.gold }}>
      🏆 {t("edicao.especial.vencedor", "Vencedor")}: {quem}
    </div>
    <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: COR.muted }}>
      {t("edicao.especial.menorUnico", "Menor lance único")}: <strong style={{ color: COR.text }}>{reais(resultado.menorUnicoCentavos)}</strong>
    </div>
    {linhaMetricas}
  </>);
}
