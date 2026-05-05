import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "./BottomNav.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

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
        height: "100vh",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% -15%, rgba(245,166,35,0.06) 0%, #0c1120 40%, #0a0f1a 100%)",
        color: "#e8f0fe",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
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

      {isMobile && <BottomNav />}
    </div>
  );
}
