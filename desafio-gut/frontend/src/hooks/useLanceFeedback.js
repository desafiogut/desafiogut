import { useState, useEffect, useRef } from "react";
import { apiGet } from "../lib/api.js";

export function useLanceFeedback(edicaoId, meuValor) {
  const [status, setStatus] = useState(null);
  const [mudou, setMudou]   = useState(false);
  const ultimoUnico = useRef(null);

  useEffect(() => {
    if (!edicaoId || !meuValor) {
      setStatus(null);
      ultimoUnico.current = null;
      return;
    }

    let cancelado = false;

    const verificar = async () => {
      try {
        const { ok, data } = await apiGet(
          `lances-flash?edicaoId=${encodeURIComponent(edicaoId)}&acao=verificar&valor=${encodeURIComponent(meuValor)}`
        );
        if (!ok) return;
        if (cancelado) return;
        setStatus(data);

        if (ultimoUnico.current === true && data.unico === false) {
          setMudou(true);
          setTimeout(() => setMudou(false), 5000);
        }
        ultimoUnico.current = data.unico;
      } catch (err) {
        console.error("[useLanceFeedback]", err);
      }
    };

    verificar();
    const timer = setInterval(verificar, 5000);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [edicaoId, meuValor]);

  return { status, mudou };
}
