// MC20.2 FASE 1 · ITEM 1/2 — Canvas Tridimensional (rota-mãe).
//
// Árvore DOM de 3 camadas sobrepostas (Z-Index Matrix — @impeccable-design):
//   -z-50  BackgroundCanvas  → "A Arena" (WebP oficial). Montado GLOBALMENTE em
//                              App.jsx (visível também no gate LGPD = paridade
//                              body-level do MC19.1, R1/R5).
//   -z-40  AtmosphereFilter  → "Vinheta de Foco" (blur/glow por appState).
//    z-0   .gut-surface      → "Superfície" — onde vive o conteúdo (Layout: Sidebar/
//                              BottomNav + <Outlet/>), o futuro Nav Dock (FASE 2) e o
//                              GutoSpritePlayer (FASE 3).
//
// AppLayout SUBSTITUI o <Layout/> como elemento de rota em App.jsx, mas RENDERIZA o
// Layout existente intacto dentro da superfície → zero regressão de navegação/rotas
// (R1). O <Outlet/> continua a viver no Layout. O provider de ambiente
// (AppEnvironmentProvider) é montado em App.jsx (envolve Routes + ChatbotWidget),
// por isso aqui apenas CONSUMIMOS o estado nas camadas. As camadas fixas de z-index
// negativo empilham por viewport, independentemente do aninhamento DOM.
import AtmosphereFilter from "./AtmosphereFilter.jsx";
import Layout from "./Layout.jsx";
import GutoSpritePlayer from "../../components/GutoSpritePlayer.jsx";

export default function AppLayout() {
  return (
    <>
      <AtmosphereFilter />
      <div className="gut-surface">
        <Layout />
        {/* MC20.2 ITEM 11/13 — GUTO animado na superfície, canto inferior-esquerdo
            (onde estava o GUTO oficial removido no MC20.PRE.2). Mesmo ficheiro em
            desktop e mobile (MC20.1). */}
        <GutoSpritePlayer />
      </div>
    </>
  );
}
