// MC20.2 FASE 3 · ITEM 9 — Motor de Rollback (Erro Elástico).
//
// Hook reutilizável que devolve `controls` (para anexar a `animate` de um elemento
// Motion) e `shake()` para disparar a animação de erro: x: [0,-12,12,-12,12,0] em 0.5s.
// useReducedMotion() desativa o shake (complementa o guard global de globals.css).
//
// Cores de erro DESSATURADAS (alinhadas com --color-gut-danger #ff3d71 e a paleta
// navy/laranja), exportadas para os consumidores aplicarem no estado de erro.
//
// NOTA: o ITEM 10 (optimistic updates no fluxo de lance on-chain) foi ADIADO por
// decisão do utilizador (risco não validável localmente). Este hook fica pronto para
// ser ligado ao onError do rollback quando esse item avançar.
import { useCallback } from "react";
import { useAnimationControls, useReducedMotion } from "framer-motion";

export const SHAKE_ERROR_COLORS = {
  bg: "rgba(244,63,94,0.10)",      // rose-500/10
  text: "#fb7185",                  // rose-400
  border: "rgba(244,63,94,0.20)",  // rose-500/20
};

const SHAKE_KEYFRAMES = { x: [0, -12, 12, -12, 12, 0] };
const SHAKE_TRANSITION = { duration: 0.5, ease: "easeInOut" };

export function useShakeOnError() {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  const shake = useCallback(async () => {
    if (reduce) return;
    try {
      await controls.start({ ...SHAKE_KEYFRAMES, transition: SHAKE_TRANSITION });
    } catch {
      /* componente desmontado durante o shake — noop */
    }
  }, [controls, reduce]);

  return { controls, shake, colors: SHAKE_ERROR_COLORS };
}

export default useShakeOnError;
