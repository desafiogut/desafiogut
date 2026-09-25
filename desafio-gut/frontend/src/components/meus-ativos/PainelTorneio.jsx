import { COR, T_PADRAO, caixa, tituloSecao, legenda } from "./_estilo.js";

/**
 * Painel do torneio de habilidade: posição, pontos e acertos do utilizador no
 * ciclo corrente.
 *
 * Componente APRESENTACIONAL — não faz I/O. Os dados vêm de `useFeedback`, que
 * vive na tela. É essa fronteira que permite testá-lo por renderização real
 * (em SSR o `useEffect` não corre; ver `__tests__/_render.mjs`).
 *
 * ⚠️ Quatro estados, e nenhum se confunde com outro: sem sessão, a carregar,
 * erro, e com dados. O erro NÃO mostra zeros — um zero inventado é pior do que
 * um aviso, porque o utilizador acredita nele.
 *
 * @param {object} props
 * @param {boolean} [props.temSessao]  há sessão Privy com endereço
 * @param {{posicao:number|null, pontosTotais:number, acertosTotais:number}|null} [props.feedback]
 * @param {boolean} [props.carregando]
 * @param {string|null}  [props.erro]
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function PainelTorneio({
  temSessao = false,
  feedback = null,
  carregando = false,
  erro = null,
  isMobile = false,
  t = T_PADRAO,
}) {
  const titulo = t("ativos.torneio.titulo", "🏆 Torneio de habilidade");

  if (!temSessao) {
    return (
      <section style={caixa(isMobile)} data-secao="painel-torneio">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        <p style={legenda(isMobile)} data-estado="sem-sessao">
          {t("ativos.torneio.semSessao",
             "Entre na sua conta para ver a sua posição, os seus pontos e os seus acertos.")}
        </p>
      </section>
    );
  }

  if (erro) {
    return (
      <section style={caixa(isMobile)} data-secao="painel-torneio">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        <p style={{ ...legenda(isMobile), color: COR.danger }} data-estado="erro">
          {t("ativos.torneio.erro",
             "Não foi possível carregar a sua pontuação agora. Tente novamente mais tarde.")}
        </p>
      </section>
    );
  }

  if (carregando) {
    return (
      <section style={caixa(isMobile)} data-secao="painel-torneio">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        {/* Altura reservada: sem isto a secção salta quando os dados chegam. */}
        <p style={{ ...legenda(isMobile), minHeight: "2.4rem" }} data-estado="carregando">
          {t("ativos.torneio.carregando", "A carregar a sua pontuação…")}
        </p>
      </section>
    );
  }

  // ⚠️ "A CARREGAR" E "NÃO HÁ DADOS" ESTAVAM NA MESMA FRASE.
  // Com `feedback` nulo, sem erro e sem `carregando`, a secção mostrava "A carregar
  // a sua pontuação…" para sempre. Um indicador de espera que nunca acaba não é um
  // detalhe de estilo: é uma afirmação falsa sobre o que o sistema está a fazer, e
  // o utilizador fica à espera de algo que não vem. É a mesma classe de defeito que
  // os zeros inventados — o ecrã a dizer o que não sabe.
  if (!feedback) {
    return (
      <section style={caixa(isMobile)} data-secao="painel-torneio">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        <p style={{ ...legenda(isMobile), minHeight: "2.4rem" }} data-estado="sem-dados">
          {t("ativos.torneio.semDados",
             "Ainda não há pontuação sua neste ciclo.")}
        </p>
      </section>
    );
  }

  const { posicao, pontosTotais, acertosTotais } = feedback;

  const celulas = [
    {
      rotulo: t("ativos.torneio.posicao", "Posição"),
      valor: posicao ? `${posicao}º` : "—",
      cor: COR.gold,
    },
    {
      rotulo: t("ativos.torneio.pontos", "Pontos"),
      valor: String(pontosTotais ?? 0),
      cor: COR.primary,
    },
    {
      rotulo: t("ativos.torneio.acertos", "Acertos"),
      valor: String(acertosTotais ?? 0),
      cor: COR.success,
    },
  ];

  const semAtividade = !posicao && !pontosTotais && !acertosTotais;

  return (
    <section style={caixa(isMobile)} data-secao="painel-torneio" data-estado="dados">
      <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: isMobile ? "0.5rem" : "0.75rem",
      }}>
        {celulas.map(({ rotulo, valor, cor }) => (
          <div key={rotulo} data-celula="painel">
            <div style={{
              fontSize: isMobile ? "1.15rem" : "1.4rem",
              fontWeight: 900, color: cor, lineHeight: 1.1,
            }}>{valor}</div>
            <div style={{
              fontSize: isMobile ? "0.68rem" : "0.72rem",
              color: COR.muted, marginTop: "0.2rem", fontWeight: 600,
            }}>{rotulo}</div>
          </div>
        ))}
      </div>
      {semAtividade && (
        <p style={{ ...legenda(isMobile), marginTop: "0.6rem" }}>
          {t("ativos.torneio.semAtividade",
             "Ainda sem pontos neste ciclo. Um lance único vale 1 ponto; o menor lance único vale 3.")}
        </p>
      )}
    </section>
  );
}
