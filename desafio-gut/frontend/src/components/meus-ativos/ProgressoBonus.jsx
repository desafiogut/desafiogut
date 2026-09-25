import { COR, T_PADRAO, caixa, tituloSecao, legenda } from "./_estilo.js";

/**
 * Progresso da sequência de acertos até ao bónus.
 *
 * A regra (`_lib/pontuacao-utils.mjs`): o bónus é concedido a cada
 * `ACERTOS_PARA_BONUS` acertos SEGUIDOS. `sequenciaAtual` e `faltamParaBonus`
 * vêm do backend — a UI não os recalcula, porque a definição de "seguidos"
 * atravessa ciclos e já custou um defeito ao projeto (o bónus pagava 11×).
 *
 * ⚠️ A 5 de 5 escreve-se COMPLETO, não "faltam 0": o backend devolve
 * `faltamParaBonus: 0` nesse momento, e "faltam 0" é a frase que ninguém diz.
 *
 * @param {object} props
 * @param {number} [props.sequenciaAtual]
 * @param {number} [props.faltamParaBonus]
 * @param {number} [props.acertosParaBonus]  alvo (5, pela regra em vigor)
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function ProgressoBonus({
  sequenciaAtual = 0,
  faltamParaBonus = 0,
  acertosParaBonus = 5,
  isMobile = false,
  t = T_PADRAO,
}) {
  const alvo = Math.max(1, Number(acertosParaBonus) || 1);
  const feitos = Math.max(0, Number(sequenciaAtual) || 0);
  const faltam = Math.max(0, Number(faltamParaBonus) || 0);

  // Dentro do ciclo de N: 7 acertos com alvo 5 mostra 2/5, não 7/5.
  const noCiclo = feitos % alvo;
  const completo = faltam === 0 && feitos > 0;
  const percentagem = completo ? 100 : Math.round((noCiclo / alvo) * 100);

  return (
    <section style={caixa(isMobile)} data-secao="progresso-bonus">
      <h2 style={tituloSecao(isMobile)}>
        {t("ativos.bonus.titulo", "🎯 Progresso para o bónus")}
      </h2>

      <div style={{
        display: "flex", alignItems: "baseline", gap: "0.4rem",
        marginBottom: "0.5rem",
      }}>
        <strong style={{
          fontSize: isMobile ? "1.2rem" : "1.4rem",
          fontWeight: 900,
          color: completo ? COR.success : COR.primary,
          lineHeight: 1,
        }}>{completo ? alvo : noCiclo}</strong>
        <span style={{ fontSize: "0.8rem", color: COR.muted, fontWeight: 600 }}>
          / {alvo} {t("ativos.bonus.acertos", "acertos seguidos")}
        </span>
      </div>

      {/* A barra é um elemento com largura proporcional, não um número pintado:
          é o que a torna legível de relance. */}
      <div
        data-barra="progresso"
        role="progressbar"
        aria-valuenow={completo ? alvo : noCiclo}
        aria-valuemin={0}
        aria-valuemax={alvo}
        style={{
          height: "8px", borderRadius: "999px",
          background: "rgba(255,255,255,0.07)", overflow: "hidden",
        }}
      >
        <div style={{
          width: `${percentagem}%`,
          height: "100%",
          borderRadius: "999px",
          background: completo ? COR.success : COR.primary,
          transition: "width 0.3s ease",
        }} />
      </div>

      <p style={{ ...legenda(isMobile), marginTop: "0.5rem" }}>
        {completo
          ? t("ativos.bonus.completo", "Sequência completa — bónus conquistado!")
          : `${t("ativos.bonus.faltam", "Faltam")} ${faltam} ${
              faltam === 1
                ? t("ativos.bonus.acerto1", "acerto")
                : t("ativos.bonus.acertoN", "acertos")
            }.`}
      </p>
    </section>
  );
}
