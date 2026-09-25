import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

/**
 * Lê o ranking do ciclo. Endpoint PÚBLICO — não precisa de sessão.
 *
 * ⚠️ A resposta do endpoint NÃO tem campo `ok`. Medido em produção:
 *   GET /ranking?cicloId=R-1 -> {"cicloId":"R-1","total":0,"ranking":[]}
 * O `ok` vem do helper `apiGet` (`src/lib/api.js:48`), que devolve
 * `{ok, status, data, text, headers}`. Escrever contra `data.ok` — como o
 * enunciado do MC94 descrevia o contrato — daria sempre falso.
 *
 * ⚠️ Usa-se `apiGet` e não `fetch` de propósito: é ele que aplica a origem
 * correcta no APK (`src/lib/apiOrigin.js`), onde a origem é `https://localhost` e
 * um caminho relativo devolveria o `index.html` com 200 — o defeito que o projeto
 * já registou como "backend inalcançável".
 *
 * @param {string|null|undefined} cicloId
 * @returns {{ranking: Array<object>, total: number, carregando: boolean, erro: string|null}}
 */
export function useRanking(cicloId) {
  const [estado, setEstado] = useState({
    ranking: [], total: 0, carregando: Boolean(cicloId), erro: null,
  });

  useEffect(() => {
    if (!cicloId) {
      setEstado({ ranking: [], total: 0, carregando: false, erro: null });
      return undefined;
    }

    const controlador = new AbortController();
    let vivo = true;

    setEstado((a) => ({ ...a, carregando: true, erro: null }));

    (async () => {
      try {
        const { ok, data } = await apiGet(
          `ranking?cicloId=${encodeURIComponent(cicloId)}`,
          { signal: controlador.signal },
        );
        if (!vivo) return;
        if (!ok) {
          setEstado({ ranking: [], total: 0, carregando: false, erro: "resposta_invalida" });
          return;
        }
        setEstado({
          ranking: Array.isArray(data?.ranking) ? data.ranking : [],
          total: Number(data?.total) || 0,
          carregando: false,
          erro: null,
        });
      } catch (err) {
        // Um `abort` não é um erro: é o componente a desmontar. Mostrá-lo como
        // falha faria a secção piscar vermelho ao navegar.
        if (!vivo || err?.name === "AbortError") return;
        setEstado({ ranking: [], total: 0, carregando: false, erro: "rede" });
      }
    })();

    return () => { vivo = false; controlador.abort(); };
  }, [cicloId]);

  return estado;
}

export default useRanking;
