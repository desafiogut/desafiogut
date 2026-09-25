import { COR, T_PADRAO, caixa, tituloSecao, legenda, inteiroSeguro } from "./_estilo.js";

/**
 * Progresso da sequência de acertos até ao bônus.
 *
 * A regra (`_lib/pontuacao-utils.mjs`): o bônus é concedido a cada
 * `ACERTOS_PARA_BONUS` acertos SEGUIDOS. `sequenciaAtual` e `faltamParaBonus`
 * vêm do backend — a UI não os recalcula, porque a definição de "seguidos"
 * atravessa ciclos e já custou um defeito ao projeto (o bônus pagava 11×).
 *
 * ⚠️ QUATRO ESTADOS, e a razão é um defeito que chegou a PRODUÇÃO.
 * A primeira versão só tinha o estado "com dados": um utilizador ANÓNIMO lia
 * "0 / 5 acertos seguidos · Faltam 5 acertos" — um facto sobre uma pessoa que a
 * app não identificou — e uma falha de rede dava exactamente o mesmo texto.
 * Isto viola o princípio que eu próprio escrevi em `PainelTorneio.jsx`: um zero
 * inventado é pior do que um aviso, porque o utilizador acredita nele.
 * Achado da validação independente do MC94.
 *
 * ⚠️ E ESTA SECÇÃO NÃO DECLARA "BÓNUS CONQUISTADO".
 * Dizia-o a partir de uma conta LOCAL (`faltam === 0`), e contradizia a secção ao
 * lado, que lê `bonusEmitido` do backend: uma dizia "bônus conquistado!" e a
 * outra "Nenhum bônus conquistado neste ciclo". Só o livro-razão o pode afirmar.
 * Aqui diz-se que a SEQUÊNCIA está completa, que é o que esta secção observa.
 *
 * @param {object} props
 * @param {boolean} [props.temSessao]
 * @param {boolean} [props.carregando]
 * @param {string|null} [props.erro]
 * ⛔ E O QUE SE MOSTRA DERIVA DE `sequenciaAtual`, NÃO DE `faltamParaBonus`.
 * O backend calcula `faltam = max(0, 5 - (sequenciaAtual % 5))`
 * (`_lib/pontuacao-store.mjs:314`), cujo domínio é **[1..5] — nunca 0**. Medido:
 * `sequencia=5 -> faltam=5`. Logo quem fechava uma sequência de cinco lia
 * **"0 / 5 acertos seguidos · Faltam 5 acertos"**: a app a dizer-lhe que não tem
 * acertos nenhuns no momento exacto em que ele completou a série. E o ramo
 * "sequência completa" era código morto, inalcançável em produção.
 * Derivar a POSIÇÃO DENTRO DO CICLO de `sequenciaAtual % alvo` não é recalcular a
 * regra — é aritmética de apresentação sobre o número que o backend deu, e é o que
 * este componente já fazia para a barra. O que a UI não faz, e continua a não
 * fazer, é decidir o que conta como acerto ou como "seguidos".
 * Achado da 2.ª validação independente. O backend é de outro MC (não autorizado aqui).
 *
 * @param {number} [props.sequenciaAtual]
 * @param {number} [props.acertosParaBonus]  alvo (5, pela regra em vigor)
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function ProgressoBonus({
  temSessao = false,
  carregando = false,
  erro = null,
  sequenciaAtual,
  acertosParaBonus = 5,
  isMobile = false,
  t = T_PADRAO,
}) {
  const titulo = t("ativos.bonus.titulo", "🎯 Progresso para o bônus");
  const moldura = (corpo) => (
    <section style={caixa(isMobile)} data-secao="progresso-bonus">
      <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
      {corpo}
    </section>
  );

  if (!temSessao) {
    return moldura(
      <p style={legenda(isMobile)} data-estado="sem-sessao">
        {t("ativos.bonus.semSessao",
           "Entre na sua conta para ver sua sequência de acertos.")}
      </p>,
    );
  }

  if (erro) {
    return moldura(
      <p style={{ ...legenda(isMobile), color: COR.danger }} data-estado="erro">
        {t("ativos.bonus.erro",
           "Não foi possível carregar sua sequência agora. Tente novamente mais tarde.")}
      </p>,
    );
  }

  if (carregando) {
    return moldura(
      <p style={{ ...legenda(isMobile), minHeight: "2.4rem" }} data-estado="carregando">
        {t("ativos.bonus.carregando", "Carregando sua sequência…")}
      </p>,
    );
  }

  const feitos = inteiroSeguro(sequenciaAtual);

  // ⚠️ "A CARREGAR" E "NÃO HÁ DADOS" são coisas diferentes — e eu separei-as no
  // `PainelTorneio` e não aqui. Sem `carregando` e sem erro, um `sequenciaAtual`
  // ausente mostrava "Carregando sua sequência…" **para sempre**. Meia correcção
  // outra vez; achado da 2.ª validação independente.
  if (feitos === null) {
    return moldura(
      <p style={{ ...legenda(isMobile), minHeight: "2.4rem" }} data-estado="sem-dados">
        {t("ativos.bonus.semDados", "Ainda não há acertos seus neste ciclo.")}
      </p>,
    );
  }

  const alvo = Math.max(1, inteiroSeguro(acertosParaBonus) ?? 5);
  // Dentro do ciclo de N: 7 acertos com alvo 5 mostra 2/5, não 7/5.
  const noCiclo = feitos % alvo;
  const sequenciaCompleta = feitos > 0 && noCiclo === 0;
  const mostrados = sequenciaCompleta ? alvo : noCiclo;
  // Só usado no ramo incompleto — quando a sequência fecha, mostra-se a frase e
  // não uma contagem. Uma versão anterior escrevia `sequenciaCompleta ? 0 : …`,
  // um ternário cujo ramo `0` nunca chegava ao ecrã: computação morta, e um
  // mutante equivalente que eu tinha descrito como defeito.
  const faltam = alvo - noCiclo;
  const percentagem = Math.round((mostrados / alvo) * 100);

  return moldura(
    <>
      <div style={{
        display: "flex", alignItems: "baseline", gap: "0.4rem",
        marginBottom: "0.5rem",
      }}>
        <strong style={{
          fontSize: isMobile ? "1.2rem" : "1.4rem",
          fontWeight: 900,
          color: sequenciaCompleta ? COR.success : COR.primary,
          lineHeight: 1,
        }}>{mostrados}</strong>
        <span style={{ fontSize: "0.8rem", color: COR.muted, fontWeight: 600 }}>
          / {alvo} {t("ativos.bonus.acertos", "acertos seguidos")}
        </span>
      </div>

      {/* A barra é um elemento com largura proporcional, não um número pintado:
          é o que a torna legível de relance. */}
      <div
        data-barra="progresso"
        role="progressbar"
        aria-label={titulo}
        aria-valuenow={mostrados}
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
          background: sequenciaCompleta ? COR.success : COR.primary,
          transition: "width 0.3s ease",
        }} />
      </div>

      <p style={{ ...legenda(isMobile), marginTop: "0.5rem" }} data-estado="dados">
        {sequenciaCompleta
          ? t("ativos.bonus.sequenciaCompleta",
              "Sequência completa. O bônus é confirmado pela coordenação no fechamento da rodada.")
          : `${t("ativos.bonus.faltam", "Faltam")} ${faltam} ${
              faltam === 1
                ? t("ativos.bonus.acerto1", "acerto")
                : t("ativos.bonus.acertoN", "acertos")
            }.`}
      </p>
    </>,
  );
}
