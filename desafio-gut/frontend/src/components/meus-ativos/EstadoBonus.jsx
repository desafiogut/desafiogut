import { COR, T_PADRAO, caixa, tituloSecao, legenda, inteiroSeguro } from "./_estilo.js";

/**
 * Estado do bónus: senhas a creditar, e se já foram creditadas.
 *
 * ⚠️ ISTO NÃO É UM SALDO, E A PALAVRA IMPORTA.
 * `senhasACreditar` é um DIREITO por liquidar, gravado em `rankings_ciclo`. O
 * saldo que autoriza um lance é `saldoSenhas` NO CONTRATO (`Leilao.sol:88`
 * exige `saldoSenhas[msg.sender] > 0` e decrementa em `:107`). Uma senha
 * prometida fora da cadeia não habilita lance nenhum: o utilizador veria
 * "+20 senhas", tentaria licitar, e a transacção reverteria.
 * Foi a razão pela qual o MC93-B escolheu "direito, liquidação depois" — e é
 * por isso que há um teste que falha se esta secção escrever "saldo".
 *
 * ⚠️ `liquidado` pode chegar `undefined`: o default `vazio` de `lerFeedback`
 * não inclui o campo (medido no SEG-1 do MC94). Tratado como PENDENTE, porque
 * dizer "já creditado" sem saber é a única leitura que causa prejuízo.
 *
 * @param {object} props
 * @param {number}  [props.senhasACreditar]
 * @param {boolean} [props.bonusEmitido]
 * @param {boolean|undefined} [props.liquidado]
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function EstadoBonus({
  temSessao = false,
  carregando = false,
  erro = null,
  senhasACreditar,
  bonusEmitido = false,
  liquidado,
  isMobile = false,
  t = T_PADRAO,
}) {
  const titulo = t("ativos.bonus.estadoTitulo", "🎟️ Bónus de senhas");
  const moldura = (corpo) => (
    <section style={caixa(isMobile)} data-secao="estado-bonus">
      <h2 style={tituloSecao(isMobile)}>{titulo}</h2>
      {corpo}
    </section>
  );

  // ⚠️ OS QUATRO ESTADOS, e a razão chegou a PRODUÇÃO: a primeira versão só
  // tinha "com dados", logo um utilizador ANÓNIMO lia "Nenhum bónus conquistado
  // neste ciclo" — uma afirmação sobre alguém que a app não identificou — e uma
  // falha de rede dava exactamente o mesmo texto. Achado da validação
  // independente do MC94.
  if (!temSessao) {
    return moldura(
      <p style={legenda(isMobile)} data-estado="sem-sessao">
        {t("ativos.bonus.estadoSemSessao",
           "Entre na sua conta para ver os seus bónus de senhas.")}
      </p>,
    );
  }

  if (erro) {
    return moldura(
      <p style={{ ...legenda(isMobile), color: COR.danger }} data-estado="erro">
        {t("ativos.bonus.estadoErro",
           "Não foi possível carregar o seu bónus agora. Tente novamente mais tarde.")}
      </p>,
    );
  }

  if (carregando) {
    return moldura(
      <p style={{ ...legenda(isMobile), minHeight: "2.4rem" }} data-estado="carregando">
        {t("ativos.bonus.estadoCarregando", "A carregar o seu bónus…")}
      </p>,
    );
  }

  // ⚠️ `inteiroSeguro` e não `Number(...) || 0`: a coerção fazia
  // `Infinity` -> "Infinity senhas" e `1e21` -> "1e+21 senhas" no ecrã.
  const quantidade = inteiroSeguro(senhasACreditar) ?? 0;
  const temDireito = bonusEmitido === true && quantidade > 0;
  // `undefined` e `null` contam como NÃO liquidado. Só o `true` explícito liquida.
  const foiLiquidado = liquidado === true;

  if (!temDireito) {
    return moldura(
      <p style={legenda(isMobile)} data-estado="sem-bonus">
        {t("ativos.bonus.nada",
           "Nenhum bónus conquistado neste ciclo. Complete a sequência de acertos para conquistar senhas.")}
      </p>,
    );
  }

  return moldura(
    <>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
        <strong style={{
          fontSize: isMobile ? "1.3rem" : "1.55rem",
          fontWeight: 900,
          color: COR.senhas,
          lineHeight: 1,
        }}>{quantidade}</strong>
        <span style={{ fontSize: "0.82rem", color: COR.senhas, fontWeight: 700 }}>
          {quantidade === 1
            ? t("ativos.bonus.senha1", "senha")
            : t("ativos.bonus.senhaN", "senhas")}
        </span>
      </div>

      <div style={{
        display: "inline-block",
        marginTop: "0.5rem",
        padding: "0.22rem 0.6rem",
        borderRadius: "999px",
        background: foiLiquidado ? "rgba(16,185,129,0.14)" : COR.senhasDim,
        color: foiLiquidado ? COR.success : COR.senhas,
        fontSize: "0.72rem",
        fontWeight: 700,
      }} data-estado={foiLiquidado ? "liquidado" : "pendente"}>
        {foiLiquidado
          ? t("ativos.bonus.liquidado", "Já creditadas na sua conta")
          : t("ativos.bonus.pendente", "A creditar — aguarda a coordenação")}
      </div>

      <p style={{ ...legenda(isMobile), marginTop: "0.55rem" }}>
        {foiLiquidado
          // ⚠️ Evita-se a palavra "saldo" mesmo AQUI, onde seria tecnicamente
          // correcta: uma secção que a usa num estado e não no outro convida a
          // ler os dois como a mesma coisa. O facto útil é poder licitar.
          ? t("ativos.bonus.explicaLiquidado",
              "As senhas do bónus já foram creditadas pela coordenação e já podem ser usadas num lance.")
          : t("ativos.bonus.explicaPendente",
              "É um direito já conquistado. As senhas são creditadas pela coordenação e só então podem ser usadas num lance.")}
      </p>
    </>,
  );
}
