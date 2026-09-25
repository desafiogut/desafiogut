import { COR, T_PADRAO, caixa, tituloSecao, legenda, reais, valorUtilizavel } from "./_estilo.js";

/**
 * Quanto vale cada lance do utilizador, pela regra do torneio.
 *
 * ⚠️ DIZ "VALE", NUNCA "GANHOU", E A DISTINÇÃO NÃO É DE ESTILO.
 * Medido no SEG-1 do MC94: NENHUM endpoint devolve pontos por lance. O
 * `lerFeedback` devolve agregados do ciclo; a pontuação é atribuída pelo backend
 * no FECHO da rodada (`consolidar-lances.mjs`). Escrever "ganhou 3 pontos" seria
 * a UI a afirmar um facto que o backend não produziu — e em produção as tabelas
 * do torneio estão vazias, logo seria falso hoje.
 * O que se mostra é a projecção pela regra em vigor
 * (`_lib/pontuacao-utils.mjs`): único = 1, menor único = 3, repetido = 0.
 *
 * ⚠️ E o "menor único" é calculado entre os lances do PRÓPRIO utilizador, que é
 * o que ele vê nesta tela. O menor único da RODADA (que vale os 3 pontos de
 * facto) depende dos lances de todos, e essa apuração é do backend. O texto
 * diz-lhe isso em vez de fingir autoridade.
 *
 * @param {object} props
 * @param {Array<{valor:number, repetido:boolean, endereco:string}>} [props.lances]
 * @param {string|null} [props.address]
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function FeedbackLance({
  lances = [],
  address = null,
  isMobile = false,
  t = T_PADRAO,
}) {
  // ⚠️ O `valorUtilizavel` NÃO é zelo: um lance com `valor: null` era formatado
  // como "R$ 0,00" (porque `Number(null) === 0`) e, sendo o menor de todos, era
  // eleito "menor único seu · vale 3 pontos". É a armadilha EXACTA que o MC93-A
  // pagou no motor, e há caminho real para o `null` —
  // `_lib/data-store-supabase.mjs` grava `valor_centavos = null` de propósito
  // para marcar lance inválido. Achado da validação independente do MC94.
  const meus = (Array.isArray(lances) ? lances : []).filter(
    (l) => address
      && l?.endereco?.toLowerCase() === String(address).toLowerCase()
      && valorUtilizavel(l?.valor),
  );

  const unicos = meus.filter((l) => !l.repetido);
  // ⚠️ Com empate no menor valor, marcam-se TODOS os empatados. A versão
  // anterior escolhia um arbitrariamente e mostrava, lado a lado, dois lances de
  // R$ 1,00 — um a "vale 3 pontos" e o outro a "vale 1 ponto". Achado da
  // validação independente. Quem desempata de facto é o backend, no fecho.
  const valorMenor = unicos.length
    ? Math.min(...unicos.map((l) => l.valor))
    : null;

  const titulo = t("ativos.lance.titulo", "💡 Quanto vale cada lance seu");

  if (meus.length === 0) {
    return (
      <section style={caixa(isMobile)} data-secao="feedback-lance">
        <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
        <p style={legenda(isMobile)}>
          {t("ativos.lance.vazio",
             "Ainda não há lances seus nesta edição.")}
        </p>
      </section>
    );
  }

  const ordenados = [...meus].sort((a, b) => Number(a.valor) - Number(b.valor));

  return (
    <section style={caixa(isMobile)} data-secao="feedback-lance">
      <h2 style={tituloSecao(isMobile)}>{titulo}</h2>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.35rem" }}>
        {ordenados.map((l, i) => {
          const ehMenor = valorMenor !== null && !l.repetido && l.valor === valorMenor;
          const pontos = l.repetido ? 0 : (ehMenor ? 3 : 1);
          const rotulo = l.repetido
            ? t("ativos.lance.repetido", "repetido")
            : ehMenor
              ? t("ativos.lance.menor", "menor único seu")
              : t("ativos.lance.unico", "único");
          const cor = l.repetido ? COR.danger : (ehMenor ? COR.gold : COR.success);

          return (
            <li
              key={`${l.valor}-${i}`}
              data-linha="lance"
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                justifyContent: "space-between",
                fontSize: isMobile ? "0.8rem" : "0.85rem",
              }}
            >
              <span style={{ color: COR.text, fontWeight: 700 }}>{reais(l.valor)}</span>
              <span style={{ color: cor, fontWeight: 600, fontSize: "0.76rem" }}>{rotulo}</span>
              <span style={{ color: COR.muted, fontWeight: 600 }}>
                {pontos === 0
                  ? t("ativos.lance.valeZero", "não vale pontos")
                  : `${t("ativos.lance.vale", "vale")} ${pontos} ${
                      pontos === 1
                        ? t("ativos.lance.ponto1", "ponto")
                        : t("ativos.lance.pontoN", "pontos")
                    }`}
              </span>
            </li>
          );
        })}
      </ul>

      <p style={{ ...legenda(isMobile), marginTop: "0.55rem" }}>
        {t("ativos.lance.aviso",
           "Projecção pela regra do torneio. Os pontos são apurados pela coordenação no fecho da rodada, e o menor lance único da rodada depende dos lances de todos os participantes.")}
      </p>
    </section>
  );
}
