// MC20.2 FASE 1 · ITEM 2b — Filtro de Atmosfera Ativa "Vinheta de Foco" (-z-40).
//
// Fica ENTRE a Arena (-z-50) e a Superfície (z-0). O backdrop-blur desfoca apenas
// o que está atrás (o fundo oficial), NUNCA o conteúdo (z-0+) — assim o foco muda
// sem lavar a arte nem o texto (@taste-engineering, R5). Reaproveita --gradient-glow.
//
// Tabela de verdade (ITEM 3):
//   idle        → fundo nítido, glow 5%.
//   processing  → leve desfoque, glow 16%.
//   thinking    → backdrop-blur-lg, glow 25%.
//   success     → flash de iluminação quente temporário (auto-reset no contexto).
//   error       → vibração laranja (#ff6b35) curta.
//
// Anti-CLS (@impeccable-design): fixed inset-0, pointer-events-none; só opacity /
// backdrop-filter / background-color animam (compositor GPU, zero layout shift).
// useReducedMotion congela num estado estático neutro (complementa o guard global).
import { motion, useReducedMotion } from "framer-motion";
import { useAppEnvironment } from "../../context/useAppContextEnvironment.jsx";

const ATMOSPHERE = {
  idle: { blur: 0, glow: 0.05, tint: "rgba(0,0,0,0)" },
  processing: { blur: 6, glow: 0.16, tint: "rgba(0,0,0,0)" },
  thinking: { blur: 14, glow: 0.25, tint: "rgba(0,0,0,0)" },
  success: { blur: 0, glow: 0.0, tint: "rgba(255,149,0,0.10)" },
  error: { blur: 0, glow: 0.0, tint: "rgba(255,107,53,0.12)" },
};

const SPRING = { type: "spring", stiffness: 380, damping: 24 };

export default function AtmosphereFilter() {
  const { appState } = useAppEnvironment();
  const reduce = useReducedMotion();
  const cfg = ATMOSPHERE[appState] || ATMOSPHERE.idle;

  return (
    <motion.div
      aria-hidden="true"
      className="gut-atmosphere"
      initial={false}
      animate={
        reduce
          ? { backgroundColor: cfg.tint }
          : {
              backdropFilter: `blur(${cfg.blur}px)`,
              WebkitBackdropFilter: `blur(${cfg.blur}px)`,
              backgroundColor: cfg.tint,
            }
      }
      transition={SPRING}
    >
      <motion.div
        aria-hidden="true"
        className="gut-atmosphere__glow"
        initial={false}
        animate={{ opacity: reduce ? 0.05 : cfg.glow }}
        transition={SPRING}
      />
    </motion.div>
  );
}
