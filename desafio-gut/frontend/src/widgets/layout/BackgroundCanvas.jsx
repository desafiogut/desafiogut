// MC20.2 · ITEM 2a (FASE 1) + ITEM 12 (FASE 3) — Camada Base "A Arena" (-z-50).
//
// Reutiliza os WebP oficiais (R5 / MC19.1) — NÃO os recria. Substitui o
// body::before/::after (achado C) para evitar duplo fundo. O scrim navy e o
// crossfade mobile/desktop @768px vivem em globals.css (.gut-bg-*), com o MESMO
// --gut-bg-scrim, mesma imagem e mesmo breakpoint do MC19.1 → migração controlada,
// visualmente idêntica (validar ANTES/DEPOIS via MCP — R6, CLS=0).
//
// FASE 1: camada fixa estática (paridade visual com MC19.1).
// FASE 3 (ITEM 12): parallax suave por activeTab é adicionado aqui.
export default function BackgroundCanvas() {
  return (
    <div className="gut-bg-canvas" aria-hidden="true">
      <div className="gut-bg-layer gut-bg-layer--mobile" />
      <div className="gut-bg-layer gut-bg-layer--desktop" />
    </div>
  );
}
