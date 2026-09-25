import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

/**
 * Lê o feedback do torneio do PRÓPRIO utilizador no ciclo.
 *
 * ⚠️ EXIGE SESSÃO E ENDEREÇO COINCIDENTE. O endpoint aplica o anti-IDOR do
 * MC93-B: sem `Authorization: Bearer` devolve `401 sessao_invalida`, e com uma
 * sessão de outro endereço devolve `403 acesso_negado`. Medido em produção.
 * Por isso o hook não chama nada sem `endereco` E `token` — poupa um 401 certo.
 *
 * ⚠️ O 401 NÃO é tratado como erro de rede. "Não tens sessão" e "não consegui
 * ligar" pedem acções opostas ao utilizador; a tela distingue-as.
 *
 * ⚠️ `liquidado` pode vir `undefined`: o default `vazio` de `lerFeedback` não
 * inclui o campo. Não se normaliza aqui — é o `EstadoBonus` que decide, e decide
 * por PENDENTE, porque afirmar "já creditado" sem saber é a leitura que prejudica.
 *
 * @param {string|null|undefined} cicloId
 * @param {string|null|undefined} endereco
 * @param {string|null|undefined} token  `authToken` do AppContext
 * @returns {{feedback: object|null, carregando: boolean, erro: string|null, semSessao: boolean}}
 */
export function useFeedback(cicloId, endereco, token) {
  const podeChamar = Boolean(cicloId && endereco && token);
  const [estado, setEstado] = useState({
    feedback: null, carregando: podeChamar, erro: null, semSessao: !podeChamar,
  });

  useEffect(() => {
    if (!podeChamar) {
      setEstado({ feedback: null, carregando: false, erro: null, semSessao: true });
      return undefined;
    }

    const controlador = new AbortController();
    let vivo = true;

    setEstado({ feedback: null, carregando: true, erro: null, semSessao: false });

    (async () => {
      try {
        const { ok, status, data } = await apiGet(
          `ranking?recurso=feedback&cicloId=${encodeURIComponent(cicloId)}`
            + `&endereco=${encodeURIComponent(endereco)}`,
          { token, signal: controlador.signal },
        );
        if (!vivo) return;

        if (status === 401 || status === 403) {
          setEstado({ feedback: null, carregando: false, erro: null, semSessao: true });
          return;
        }
        if (!ok) {
          setEstado({ feedback: null, carregando: false, erro: "resposta_invalida", semSessao: false });
          return;
        }
        setEstado({ feedback: data ?? null, carregando: false, erro: null, semSessao: false });
      } catch (err) {
        if (!vivo || err?.name === "AbortError") return;
        setEstado({ feedback: null, carregando: false, erro: "rede", semSessao: false });
      }
    })();

    return () => { vivo = false; controlador.abort(); };
  }, [cicloId, endereco, token, podeChamar]);

  return estado;
}

export default useFeedback;
