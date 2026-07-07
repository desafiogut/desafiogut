// MC58.1 — CarrosselGUTO: o GUTO animado (imagem 1) a flutuar no Glass do Dashboard.
//
// MVP de 1 vídeo (padrão B oficial), arquitetura já preparada para as imagens 2–8
// (prop `slides`) num MC58.2 futuro. A fonte é um WebM VP9 com canal ALFA real
// (yuva420p / ALPHA_MODE=1, 512², paridade com o idle.webm do sprite), gerado por
// remoção do fundo branco frame-a-frame (flood-fill de bordas + downscale
// premultiplicado, sem furar a camisa/olhos do GUTO nem deixar halo branco).
//
// LIÇÃO MC39.9 (ver GutoSpritePlayer.jsx): usar um <video> SIMPLES — SEM canvas,
// SEM mix-blend-mode, SEM filter CSS no próprio vídeo (interagem mal com o
// backdrop-filter:blur do glass). O drop-shadow fica no WRAPPER, nunca no <video>.
// useReducedMotion() → congela no 1º frame. Fallback para poster PNG (alfa) se o
// vídeo falhar (ex.: Safari, que não decoda VP9-alfa).
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const V = "mc58"; // cache-bust dos assets imutáveis (?v=)
const SLIDES = [
  {
    webm: `/assets/guto/carrossel/guto-1.webm?v=${V}`,
    poster: `/assets/guto/carrossel/guto-1.png?v=${V}`,
  },
];

export default function CarrosselGUTO({ size = 196, slides = SLIDES }) {
  const reduce = useReducedMotion();
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const slide = slides[0]; // MVP: só a imagem 1 (o carrossel das 8 é MC58.2)

  // Reduced-motion → congela o 1º frame (mesmo padrão do GutoVideo do sprite).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !reduce) return undefined;
    const freeze = () => {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
        /* noop */
      }
    };
    v.addEventListener("loadeddata", freeze);
    if (v.readyState >= 2) freeze();
    return () => v.removeEventListener("loadeddata", freeze);
  }, [reduce, slide.webm]);

  // Dimensões reservadas no wrapper → zero CLS ao carregar o vídeo.
  const boxStyle = {
    position: "relative",
    width: size,
    height: size,
    flexShrink: 0,
    // drop-shadow no WRAPPER (não no vídeo) — MC39.9.
    filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))",
  };
  const mediaStyle = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  };

  return (
    <div aria-hidden="true" style={boxStyle}>
      {failed ? (
        <img src={slide.poster} alt="" style={mediaStyle} />
      ) : (
        <video
          ref={videoRef}
          src={slide.webm}
          poster={slide.poster}
          autoPlay={!reduce}
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setFailed(true)}
          style={mediaStyle}
        />
      )}
    </div>
  );
}
