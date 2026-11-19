import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api.js";
import ResultadosEdicao from "../edicao-especial/ResultadosEdicao.jsx";
import { caixa, tituloSecao, legenda } from "./_estilo.js";
import { decidirTop10Passe } from "./_top10-passe.js";

export { decidirTop10Passe };

/**
 * UTAC140 (Frente D) — Top 10 COMPLETO (com valores) da edição especial, só para quem tem Passe.
 *
 * Assenta na apuração que já existe (UTAC138, Blob `edicoes-resultados`), por decisão do operador
 * (R18-140-D): `GET resultado-edicao?acao=completo` com a sessão do utilizador. O SERVIDOR decide tudo —
 * Passe no inventário (403 `acesso_restrito_passe`) e janela de 24 h depois do fim (410 `janela_expirada`).
 * Aqui só se mostra o que ele devolveu; sem sessão, sem Passe, fora da janela ou antes da apuração: nada.
 */
// UTAC140b — sem id fixo: a edição chega por prop (Meus Ativos escolhe-a entre as edições gravadas).

export default function Top10EspecialPasse({
  temSessao, authToken, edicaoId, isMobile = false, t, carregar = apiGet, estilo,
}) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!temSessao || !authToken || !edicaoId) { setDados(null); return undefined; }
    let cancelado = false;
    carregar(`resultado-edicao?edicaoId=${encodeURIComponent(edicaoId)}&acao=completo`, { token: authToken })
      .then((resp) => { if (!cancelado) setDados(decidirTop10Passe(resp)); })
      .catch(() => { if (!cancelado) setDados(null); });
    return () => { cancelado = true; };
  }, [temSessao, authToken, edicaoId, carregar]);

  if (!dados) return null;
  return (
    <section style={{ ...caixa(isMobile), ...estilo }} data-secao="top10-especial-passe" data-edicao={edicaoId}>
      <h2 style={tituloSecao(isMobile)}>⚡ Oferta Relâmpago especial — resultado completo</h2>
      <p style={legenda(isMobile)}>
        {dados.produto ? `${dados.produto}. ` : ""}Tabela exclusiva para portadores de Passe, disponível durante 24 h depois da apuração.
      </p>
      <ResultadosEdicao top10={dados.top10} isMobile={isMobile} t={t} />
    </section>
  );
}
