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
//
// MC39.9 (#guto) — DIAGNÓSTICO CORRIGIDO. A tentativa inicial deste MC (canvas +
// chroma-key per-pixel) partiu de um ffprobe incompleto: `pix_fmt=yuv420p` só descreve
// o plano de cor. Um segundo ffprobe (`-show_entries stream_tags`) revelou
// `alpha_mode: "1"` — o WebM tem um canal alfa real via side-channel VP9 (convenção
// "AlphaMode" da Matroska), e o Chrome COMPÕE esse alfa nativamente em <video>, tal
// como confirmado ao vivo via MCP (um <video> simples, sem nenhum filtro, já mostra o
// fundo do GUTO totalmente transparente). Ou seja: o ficheiro nunca foi o problema.
// A "caixa" relatada após o MC39.8 veio do próprio `mix-blend-mode: screen` +
// `filter` daquele MC — aplicados a um vídeo que já tinha alfa correto, esses hacks
// CSS interagem mal com o `backdrop-filter: blur()` do GlassCard por trás (a região
// transparente do vídeo deixa de amostrar o fundo correctamente sob blend-mode),
// produzindo o artefacto visual E lavando as cores do GUTO (perda de contraste).
// Fix real: voltar a um <video> simples, sem canvas, sem blend-mode, sem filtro —
// exactamente o mesmo princípio "zero filtro CSS" já usado pelo GutoAvatar estático.
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAppEnvironment } from "../context/useAppContextEnvironment.jsx";

function GutoVideo({ src, reduce, loop }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !reduce) return undefined;

    const freezeFirstFrame = () => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {
        /* noop */
      }
    };

    video.addEventListener("loadeddata", freezeFirstFrame);
    if (video.readyState >= 2) freezeFirstFrame();

    return () => video.removeEventListener("loadeddata", freezeFirstFrame);
  }, [src, reduce]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay={!reduce}
      loop={loop}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}

const SRC = {
  // MC41 — assets reenquadrados p/ paridade com o GUTO estático. Causa raiz do "opaco/
  // amarelado": o .webm original tinha um matte de LUMINÂNCIA (alfa≈luma → roupas escuras
  // ficavam translúcidas) e o pipeline v1 agravou com eq amarelo. Fix v2: descartar o alfa
  // quebrado, recompor a máscara por colorkey do fundo navy sobre o RGB VERDADEIRO (fato
  // azul + colete dourado, iguais ao guto-bemvindo.png) e recortar ao personagem (preenche
  // a caixa). 100% opaco, cores corretas, pose de púlpito mantida. ?v bump força re-download.
  breathing:   "/assets/guto/animations/idle.webm?v=mc41c",
  analyzing:   "/assets/guto/animations/thinking.webm?v=mc41c",
  celebrating: "/assets/guto/animations/celebration.webm?v=mc41c",
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
      {/* MC41 — halo/scrim radial REMOVIDO. Lia-se como um "círculo branco" atrás do
          personagem. Com o asset agora sólido e recortado (preenche a caixa), o backing
          é desnecessário; o GUTO destaca-se sozinho. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={src}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          style={{ position: "absolute", inset: 0 }}
        >
          <GutoVideo src={src} reduce={reduce} loop={!reduce && !isCelebrating} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
