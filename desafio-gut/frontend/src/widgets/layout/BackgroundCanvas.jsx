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
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

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

  return (
    <motion.div
      className="gut-bg-canvas"
      aria-hidden="true"
      style={{ willChange: "transform" }}
      animate={{ x }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 55, damping: 20 }}
    >
      <div className="gut-bg-layer gut-bg-layer--mobile" />
      <div className="gut-bg-layer gut-bg-layer--desktop" />
    </motion.div>
  );
}
