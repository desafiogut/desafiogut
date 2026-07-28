// MC20.2 · ITEM 2a (FASE 1) + ITEM 12 (FASE 3) — Camada Base "A Arena" (-z-50).
//
// Reutiliza os WebP oficiais (R5 / MC19.1) — NÃO os recria. Substitui o
// body::before/::after (achado C) para evitar duplo fundo. O scrim navy e o
// crossfade mobile/desktop @768px vivem em globals.css (.gut-bg-*).
//
// ITEM 12 — Parallax suave: translateX subtil por rota (Motion, spring lento).
// Montado GLOBALMENTE em App.jsx (fora do AppEnvironmentProvider, p/ aparecer também
// no gate LGPD), por isso deriva o "tab" via useLocation (react-router) em vez do
// env context — funciona em qualquer rota dentro do BrowserRouter. O .gut-bg-canvas
// tem folga (inset negativo, em globals.css) para o translate nunca revelar bordas.
// useReducedMotion() → sem parallax (complementa o guard global, anti-CLS — só transform).
//
// MC27 — Fundo animado em looping (par v3 "Profundidade Cinemática").
// Melhoria progressiva: <video> com fallback estático (WebP) via onError.
// prefers-reduced-motion → apenas imagem estática (R3).
// Anti-CLS: poster = imagem estática oficial, mesmas dimensões do vídeo (R4).
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

function offsetFor(pathname) {
  const p = (pathname || "/").toLowerCase();
  if (p.startsWith("/mercado") || p.startsWith("/corporativo/mercado")) return -12;
  if (p.startsWith("/carteira") || p.startsWith("/corporativo")) return 12;
  if (p.startsWith("/vitrine") || p.startsWith("/produto") || p.startsWith("/programacao")) return -6;
  if (p.startsWith("/seguranca") || p.startsWith("/configuracoes") || p.startsWith("/ativos")) return 6;
  return 0; // dashboard / raiz
}

export default function BackgroundCanvas() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const x = reduce ? 0 : offsetFor(pathname);

  // MC27 — Estado do vídeo: tenta reproduzir por padrão; fallback estático se
  // o browser não suportar WebM/VP9 ou se o utilizador preferir redução de movimento.
  const [videoEnabled, setVideoEnabled] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [videoError, setVideoError] = useState(false);

  // Listener para mudanças em tempo real de prefers-reduced-motion (R3).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setVideoEnabled(!e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // MC88.31 (Achado 4 do MC88.30) — monta APENAS o vídeo da largura atual.
  // O crossfade @768px em globals.css usa `opacity: 0` para esconder o outro
  // vídeo, e um <video> com opacity:0 continua a descodificar cada frame: no
  // telemóvel mediram-se os dois (1080x1935 + 1920x1288) a tocar ao mesmo
  // tempo. O CSS fica como está (defesa em profundidade); o JS é que deixa de
  // criar o elemento que não se vê.
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Dupla defesa: useReducedMotion() do framer-motion + matchMedia explícito.
  const showVideo = videoEnabled && !videoError && !reduce;

  return (
    <motion.div
      className="gut-bg-canvas"
      aria-hidden="true"
      style={{ willChange: "transform" }}
      animate={{ x }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 55, damping: 20 }}
    >
      {/* Fallback estático (MC26.1) — sempre presente no DOM. Renderizado PRIMEIRO
          para que os <video> (renderizados depois) pintem por cima no mesmo z-index
          (-50). Quando o vídeo falha (onError) ou prefers-reduced-motion, o vídeo
          é removido e estas layers voltam a ser visíveis (comportamento MC26.1). */}
      {/* MC88.36 — monta APENAS a camada da largura corrente, pela mesma razão
          que o MC88.31 já fez aos <video>. O CSS esconde a outra com
          `opacity: 0`, mas um elemento com opacity:0 continua a DESCARREGAR o
          seu background-image: o MC88.35 mediu `background-desktop.webp`
          (109 KB) a ser pedido aos 1332 ms num telemóvel, onde nunca se vê.
          O CSS fica como está (defesa em profundidade); é o JS que deixa de
          criar o elemento invisível. */}
      {isDesktop
        ? <div className="gut-bg-layer gut-bg-layer--desktop" />
        : <div className="gut-bg-layer gut-bg-layer--mobile" />}
      {/* MC27 — Vídeo em looping (melhoria progressiva).
          Renderizado DEPOIS dos <div>s no DOM → mesma z-index (-50), pinta por cima
          (DOM paint order). Quando falha (onError) ou prefers-reduced-motion, o
          vídeo é removido e os <div>s .gut-bg-layer voltam a ser visíveis. */}
      {showVideo && (isDesktop ? (
        <video
          key="desktop"
          className="gut-bg-video gut-bg-video--desktop"
          src="/assets/backgrounds/loops/fundo-loop-v3-desktop.webm"
          poster="/assets/backgrounds/background-desktop.webp"
          autoPlay muted loop playsInline disableRemotePlayback
          onError={() => setVideoError(true)}
          aria-hidden="true"
        />
      ) : (
        <video
          key="mobile"
          className="gut-bg-video gut-bg-video--mobile"
          src="/assets/backgrounds/loops/fundo-loop-v3-mobile.webm"
          poster="/assets/backgrounds/background-mobile.webp"
          autoPlay muted loop playsInline disableRemotePlayback
          onError={() => setVideoError(true)}
          aria-hidden="true"
        />
      ))}
    </motion.div>
  );
}
