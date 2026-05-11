import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "./BottomNav.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";

/**
 * Layout — Shell da aplicação.
 *  Desktop (>=768px): Sidebar lateral retrátil.
 *  Mobile  (<768px):  BottomNav fixa com tabs + sheet "Mais".
 */
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
        background: "radial-gradient(ellipse at 50% -15%, rgba(245,166,35,0.06) 0%, #0c1120 40%, #0a0f1a 100%)",
        color: "#e8f0fe",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
          <Outlet />
        </main>
      </div>

      {!isMobile && (
        <footer
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(245,166,35,0.18)",
            background: "rgba(10,15,26,0.8)",
            fontSize: "11px",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            color: "#5a7090",
          }}
        >
          <a href="#privacidade" style={{ color: "inherit", textDecoration: "none" }}>Privacidade</a>
          <a href="#termos" style={{ color: "inherit", textDecoration: "none" }}>Termos</a>
          <a href="#suporte" style={{ color: "inherit", textDecoration: "none" }}>Suporte</a>
          <span>© 2026 DesafioGUT. Grupo União e Trabalho.</span>
        </footer>
      )}

      {isMobile && <BottomNav />}
    </div>
  );
}
