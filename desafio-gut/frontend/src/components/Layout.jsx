import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

/**
 * Layout — Shell da aplicação: Sidebar retrátil + área de conteúdo.
 * Toda rota autenticada é filha deste componente via <Outlet />.
 */
export default function Layout() {
  return (
    <div
      className="gut-noise"
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% -10%, #0d1f4a 0%, #06122a 50%, #030f24 100%)",
        color: "#e8f0fe",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Sidebar fixada à esquerda */}
      <Sidebar />

      {/* Conteúdo principal — scroll independente */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
    </div>
  );
}
