import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

/**
 * Diz se o corpo da resposta é mesmo JSON de um objecto.
 *
 * ⚠️ NÃO BASTA O `ok`. E a guarda é sobre o CORPO: o que se exige é que o
 * `JSON.parse` do `apiGet` tenha produzido um objecto. Uma versão anterior deste
 * comentário dizia "validar por `content-type: application/json`" — não é o que o
 * código faz, e com o instrumento de teste actual nem seria testável (o duplo de
 * `fetch` devolve `headers: new Map()`). O efeito prático é o mesmo para o caso
 * que interessa. `netlify.toml:34` reescreve `/*` para `/index.html` com
 * **status 200**: uma função ausente, mal deployada ou inalcançável (o caso do APK,
 * onde a origem é `https://localhost`) devolve HTML com 200, e o `apiGet` devolve
 * `{ ok: true, data: null }` porque o `JSON.parse` falhou. Sem esta guarda a tela
 * dizia "Ainda não há pontuações neste ciclo" com o backend em baixo — um facto
 * inventado, que é a classe de defeito que este projeto já registou duas vezes
 * ("ok:true mascara tudo"). A regra do MC93-F é validar o CORPO, não o código HTTP.
 *
 * @param {unknown} data corpo já parseado pelo `apiGet`
 * @returns {boolean}
 */
function corpoEhJson(data) {
  return data !== null && typeof data === "object";
}

/**
 * Lê o ranking do ciclo. Endpoint PÚBLICO — não precisa de sessão.
 *
 * ⚠️ A resposta do endpoint NÃO tem campo `ok`. Medido em produção:
 *   GET /ranking?cicloId=R-1 -> {"cicloId":"R-1","total":0,"ranking":[]}
 * O `ok` vem do helper `apiGet` (`src/lib/api.js:48`), que devolve
 * `{ok, status, data, text, headers}`. Escrever contra `data.ok` — como o
 * enunciado do MC94 descrevia o contrato — daria sempre falso.
 *
 * ⛔ ERRATA. Este comentário dizia que se usa `apiGet` porque "é ele que aplica a
 * origem correcta no APK (`src/lib/apiOrigin.js`)". **Falso, e verificável:**
 * `src/lib/api.js` nunca importa `apiOrigin.js` e faz `fetch(BASE + path)` com um
 * caminho RELATIVO. Quem reescreve a origem é um patch do `fetch` GLOBAL, instalado
 * em `src/main.jsx` — logo um `fetch` cru receberia o mesmo tratamento.
 * Achado da 2.ª validação independente; é o padrão "o comentário do autor satisfaz
 * a asserção do autor", pela quarta vez neste projeto.
 * A escolha de `apiGet` continua certa, por OUTRA razão: exercita o contrato
 * partilhado de headers e de parse, que é o que os testes deste MC verificam.
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
        if (!ok || !corpoEhJson(data)) {
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
