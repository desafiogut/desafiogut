// MC88.36 — adia trabalho pesado para depois da primeira pintura.
//
// PORQUÊ: o MC88.35 mediu o arranque a frio do APK e encontrou ~6,3 MB de média
// pedida ANTES do ecrã pintar (2114 ms), incluindo três .webm do GUTO. Estes
// ficheiros vêm do próprio APK (não da rede), mas competem por I/O, descodificação
// e memória exactamente na janela em que o utilizador está à espera de ver algo.
//
// COMO: `requestIdleCallback` com timeout — o browser entrega o callback assim
// que houver folga, e o timeout garante que nunca fica pendurado num aparelho
// permanentemente ocupado. Fallback para setTimeout onde não existe (Safari).
//
// ANTI-CLS: este gancho NÃO deve ser usado para esconder algo sem reservar o
// espaço. Os dois consumidores (GutoSpritePlayer, CarrosselGUTO) têm contentor
// de dimensão fixa, por isso o adiamento não desloca nada (R4 do MC20.2).
//
// O sinalizador é de MÓDULO, não de componente: depois de a app ter pintado uma
// vez, navegar para outra rota não volta a impor o atraso.
import { useEffect, useState } from "react";

let jaPintou = false;

/**
 * @param {number} timeoutMs tecto para o adiamento; a seguir monta de qualquer forma.
 * @returns {boolean} false até à primeira janela ociosa depois da pintura.
 */
export default function useAposPrimeiraPintura(timeoutMs = 1500) {
  const [pronto, setPronto] = useState(jaPintou);

  useEffect(() => {
    if (jaPintou) return undefined;
    if (typeof window === "undefined") return undefined;

    let cancelado = false;
    const marcar = () => {
      if (cancelado) return;
      jaPintou = true;
      setPronto(true);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(marcar, { timeout: timeoutMs });
      return () => {
        cancelado = true;
        window.cancelIdleCallback?.(id);
      };
    }

    const id = window.setTimeout(marcar, timeoutMs);
    return () => {
      cancelado = true;
      window.clearTimeout(id);
    };
  }, [timeoutMs]);

  return pronto;
}
