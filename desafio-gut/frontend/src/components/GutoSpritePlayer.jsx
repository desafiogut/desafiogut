// MC20.2 FASE 3 · ITEM 11 — GutoSpritePlayer (depende da CAMADA 1 / achado B, resolvido).
//
// O GUTO animado oficial. Escuta o gutoMood (useAppContextEnvironment) e troca entre as
// 3 animações oficiais com cross-fade de 150ms (AnimatePresence):
//   breathing   → idle.webm        (estado PADRÃO permanente, respiração contínua)
//   analyzing   → thinking.webm    (utilizador perguntou ao GUTO no chatbot)
//   celebrating → celebration.webm (fim de rodada com vencedor)
//
// REGRA MC20.1: EXATAMENTE o mesmo ficheiro em desktop e mobile (sem variação por
// dispositivo). useIsMobile só posiciona/dimensiona via CSS; a fonte é a mesma.
// useReducedMotion() → congela no 1º frame (vídeo pausado), complementando o guard global.
// O fundo oficial já não tem GUTO embutido (MC20.PRE.2), por isso este player é o único GUTO.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAppEnvironment } from "../context/useAppContextEnvironment.jsx";

const SRC = {
  breathing:   "/assets/guto/animations/idle.webm",
  analyzing:   "/assets/guto/animations/thinking.webm",
  celebrating: "/assets/guto/animations/celebration.webm",
};

export default function GutoSpritePlayer() {
  const { gutoMood } = useAppEnvironment();
  const reduce = useReducedMotion();
  const src = SRC[gutoMood] || SRC.breathing;

  return (
    <div className="gut-sprite" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.video
          key={src}
          src={src}
          autoPlay={!reduce}
          loop={!reduce}
          muted
          playsInline
          preload="auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          onLoadedData={
            reduce
              ? (e) => { try { e.currentTarget.pause(); e.currentTarget.currentTime = 0; } catch { /* noop */ } }
              : undefined
          }
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "contain", display: "block",
          }}
        />
      </AnimatePresence>
    </div>
  );
}
