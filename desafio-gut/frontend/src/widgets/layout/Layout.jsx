import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "./BottomNav.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";

/**
 * Layout — Shell da aplicação.
 *  Desktop (>=768px): Sidebar lateral retrátil.
 *  Mobile  (<768px):  BottomNav fixa com tabs + sheet "Mais".
 */
function FooterGlobal({ isMobile }) {
  return (
    <footer
      aria-label="Rodapé"
      className="gut-glass-standard"
      style={{
        padding: isMobile ? "12px 16px" : "16px 24px",
        fontSize: "11px",
        textAlign: "center",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: isMobile ? "12px" : "24px",
        color: "#6b7db8",
        rowGap: isMobile ? "6px" : undefined,
      }}
    >
      {/* MC39.4.1 (#segurança): "Privacidade" deixa de apontar para /seguranca (rota agora
          gated p/ corporativo) — passa a abrir a Política de Privacidade pública (Iubenda),
          mantendo o acesso LGPD ao utilizador comum (compliance), à imagem de "Termos". */}
      <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>Privacidade</a>
      <a href="https://www.iubenda.com/terms-and-conditions/DESAFIOGUT" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>Termos</a>
      <a href="mailto:desafiogut01@gmail.com" style={{ color: "inherit", textDecoration: "none" }}>Suporte</a>
      <span style={{ width: isMobile ? "100%" : "auto" }}>© 2026 DesafioGUT. Grupo União e Trabalho.</span>
    </footer>
  );
}

export default function Layout() {
  const isMobile = useIsMobile();

  return (
    <div
      className="gut-noise"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        // MC19.1 — transparente para revelar o fundo oficial (body::before/::after
        // em globals.css). O #050818 do body fica como fallback atrás da imagem.
        background: "transparent",
        color: "#e8f0fe",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* MC22.2 — Sidebar à ESQUERDA (restaurado). GUTO livre no canto inferior-esquerdo. */}
        {!isMobile && <Sidebar />}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            paddingBottom: isMobile
              ? `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
              : 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
          {/* Em mobile o footer vai DENTRO do main para rolar com o conteúdo
              e ficar acima do BottomNav fixo. */}
          {isMobile && <FooterGlobal isMobile />}
        </main>
      </div>

      {/* Desktop: footer fora do main (sticky no final do viewport). */}
      {!isMobile && <FooterGlobal isMobile={false} />}

      {isMobile && <BottomNav />}
    </div>
  );
}
