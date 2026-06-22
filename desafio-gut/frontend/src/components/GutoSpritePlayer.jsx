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

// MC22.2 SECÇÃO D — versão ?v=mc222 força o browser/CDN a servir os webm
// re-encodados com canal alfa (VP9 yuva420p, colorkey #050818). Sem o query param
// browsers com cache agressivo mostrariam o .webm opaco antigo.
const SRC = {
  breathing:   "/assets/guto/animations/idle.webm?v=mc222",
  analyzing:   "/assets/guto/animations/thinking.webm?v=mc222",
  celebrating: "/assets/guto/animations/celebration.webm?v=mc222",
};

// MC22.1 SECÇÃO D — variant:
//   "global" → comportamento legado (fixo .gut-sprite no canto). [já não montado por padrão]
//   "inline" → companion de uma edição: container relativo dimensionado (size), junto do timer.
// mood (opcional) sobrepõe o gutoMood global — usado por edição (ex.: celebrating ao encerrar).
export default function GutoSpritePlayer({ variant = "global", mood, size = 64 }) {
  const { gutoMood } = useAppEnvironment();
  const reduce = useReducedMotion();
  const effectiveMood = mood || gutoMood;
  const src = SRC[effectiveMood] || SRC.breathing;
  const isInline = variant === "inline";
  // MC23.I (ACHADO A2/D2) — a celebração de vencedor é um EVENTO ÚNICO: toca uma vez
  // e congela no último frame. idle/thinking são contínuos (loop). Sem isto, o mood
  // "celebrating" mantinha celebration.webm em loop infinito enquanto a edição ficasse
  // encerrada — a "animação de vencedor a repetir" reportada pelo operador.
  const isCelebrating = effectiveMood === "celebrating";

  return (
    <div
      className={isInline ? undefined : "gut-sprite"}
      aria-hidden="true"
      style={isInline ? { position: "relative", width: size, height: size, flexShrink: 0, pointerEvents: "none" } : undefined}
    >
      {/* MC39.3.1 (#4) — halo/scrim subtil ATRÁS do GUTO. aria-hidden + pointer-events:none
          (não afeta layout → CLS=0). Reversível.
          MC39.8 (#guto) — causa raiz da baixa visibilidade vs. o GUTO estático: o webm
          carrega um FUNDO ESCURO RESIDUAL (colorkey #050818 imperfeito) que aparecia como
          uma "caixa" opaca à volta do GUTO. A correção real é `mix-blend-mode: screen` no
          vídeo (ver abaixo), que dissolve os pixels escuros sobre o navy. O halo passou a ser
          só-claro (removido o stop navy 0.24, que pintava um anel ESCURO sobre a arena). */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: "-14%", pointerEvents: "none", borderRadius: "50%",
        background: "radial-gradient(circle at 50% 46%, rgba(150,170,235,0.26) 0%, rgba(150,170,235,0.07) 50%, rgba(5,8,24,0) 78%)",
      }} />
      <AnimatePresence initial={false}>
        <motion.video
          key={src}
          src={src}
          autoPlay={!reduce}
          loop={!reduce && !isCelebrating}
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
            // MC39.8 (#guto) — `screen` dissolve o fundo escuro residual do webm (pixels
            // ~#050818 → transparentes sobre o navy), eliminando a "caixa" opaca à volta do
            // GUTO e igualando a visibilidade do GUTO estático. O drop-shadow foi removido
            // (sob `screen` a sombra escura desaparece). Boost suave de brilho/contraste/
            // saturação para a vivacidade do raster sólido, sem lavar a arte.
            mixBlendMode: "screen",
            filter: "brightness(1.1) contrast(1.1) saturate(1.2)",
          }}
        />
      </AnimatePresence>
    </div>
  );
}
