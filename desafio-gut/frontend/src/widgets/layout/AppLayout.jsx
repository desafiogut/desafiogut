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
//
// MC89.4 — nas rotas de TRABALHO (/admin, /corporativo) a vinheta NÃO é montada.
// Ela existe para dar ambiente ao leilão; num ecrã de administração só baixa o
// contraste nos cantos, e o MC89.3 mediu texto ilegível por causa disso.
import { useLocation } from "react-router-dom";
import AtmosphereFilter from "./AtmosphereFilter.jsx";
import Layout from "./Layout.jsx";
import { ehRotaDeTrabalho } from "../../lib/rotasTrabalho.js";

export default function AppLayout() {
  const { pathname } = useLocation();
  const trabalho = ehRotaDeTrabalho(pathname);

  return (
    <>
      {!trabalho && <AtmosphereFilter />}
      <div className="gut-surface">
        <Layout />
        {/* MC22.1/MC22.2 — GUTO apenas INLINE junto dos cronómetros (Dashboard:
            Edição Ativa + Outras Edições). Sem GUTO global no canto. */}
      </div>
    </>
  );
}
