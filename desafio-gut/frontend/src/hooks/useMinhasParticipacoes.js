// UTAC000.17bc (17c / GATE 21) — hook que traz, do endpoint do UTAC000.17a, as edições em que o
// UTILIZADOR deu lance (`GET /minhas-participacoes`, autenticado por Bearer).
//
// Porquê o endpoint e não o que está em memória: o lance flash vive em chaves Key-Per-Bid
// (`bid:{edicao}:{endereco}:{rand}`) e o `lances-flash` fica vazio, pelo que o cliente NÃO consegue
// saber localmente em que edições participou — é exactamente o buraco que o 17a fechou.
//
// Sem token (`authToken` ainda a chegar, ou utilizador desligado) NÃO se chama nada: fica
// `semSessao` e a lista vazia — a espera é o comportamento seguro (o mesmo critério do
// `useFeedback` em MeusAtivos). Nenhum erro de rede é propagado à UI.

import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api.js";

export function useMinhasParticipacoes(token, edicaoId = null) {
  const [participacoes, setParticipacoes] = useState([]);
  const [status, setStatus] = useState(token ? "loading" : "semSessao"); // idle|semSessao|loading|ok|error
  const canceladoRef = useRef(false);

  useEffect(() => {
    canceladoRef.current = false;
    if (!token) {
      setParticipacoes([]);
      setStatus("semSessao");
      return () => { canceladoRef.current = true; };
    }
    setStatus("loading");
    (async () => {
      try {
        const query = edicaoId ? `?edicaoId=${encodeURIComponent(edicaoId)}` : "";
        const { ok, data } = await apiGet(`minhas-participacoes${query}`, { token });
        if (canceladoRef.current) return;
        if (!ok) throw new Error("http");
        const lista = Array.isArray(data?.participacoes) ? data.participacoes : [];
        // Só o que o servidor devolveu para ESTE token, e só com forma utilizável.
        setParticipacoes(lista.filter((p) => p && typeof p.edicaoId === "string"));
        setStatus("ok");
      } catch {
        if (canceladoRef.current) return;
        setParticipacoes([]);
        setStatus("error");
      }
    })();
    return () => { canceladoRef.current = true; };
  }, [token, edicaoId]);

  return { participacoes, status };
}
