import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";

// ─── Ícones SVG inline — sem dependência externa ──────────────────────────────
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);
const IconTarget = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconTrending = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconLogOut = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─── Itens de navegação ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: "/",              label: "Dashboard",         icon: <IconDashboard />, end: true  },
  { path: "/carteira",      label: "Minha Carteira",    icon: <IconWallet />,    end: false },
  { path: "/mercado",       label: "Mercado de Lances", icon: <IconTarget />,    end: false },
  { path: "/ativos",        label: "Meus Ativos",       icon: <IconTrending />,  end: false },
  { path: "/seguranca",     label: "Segurança",         icon: <IconShield />,    end: false },
  { path: "/configuracoes", label: "Configurações",     icon: <IconSettings />,  end: false },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { isConnected, address, userLabel, carteiraFlash, fichasProgramadas, abrirModal, desconectar, MOCK_MODE } = useAppContext();

  const W = collapsed ? "72px" : "240px";

  return (
    <aside style={{
      width: W, minWidth: W, height: "100vh",
      background: "linear-gradient(180deg, #050d1e 0%, #030f24 100%)",
      borderRight: "1px solid rgba(37,99,235,0.15)",
      display: "flex", flexDirection: "column",
      transition: "width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)",
      position: "sticky", top: 0,
      overflow: "hidden", flexShrink: 0,
      boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
    }}>

      {/* ── Avatar + Logo ── */}
      <div style={{
        padding: collapsed ? "1.1rem 0" : "1.1rem 1rem",
        display: "flex", alignItems: "center",
        gap: collapsed ? 0 : "0.75rem",
        justifyContent: collapsed ? "center" : "flex-start",
        borderBottom: "1px solid rgba(37,99,235,0.1)",
        minHeight: "72px",
      }}>
        {/* Avatar circular */}
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
          background: isConnected
            ? "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(16,185,129,0.2))"
            : "rgba(37,99,235,0.12)",
          border: isConnected
            ? "2px solid rgba(16,185,129,0.6)"
            : "2px dashed rgba(37,99,235,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: isConnected ? "0 0 10px rgba(16,185,129,0.3)" : "none",
          transition: "all 0.3s",
          cursor: "pointer",
        }} title={isConnected ? (userLabel || address) : "Fazer login"} onClick={!isConnected ? abrirModal : undefined}>
          <span style={{ fontSize: "1.1rem" }}>
            {isConnected ? "👤" : "🦁"}
          </span>
        </div>

        {/* Nome do app — oculto quando recolhido */}
        {!collapsed && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: "900", fontSize: "0.92rem", color: "#e8f0fe", letterSpacing: "0.02em" }}>
              DesafioGUT
            </div>
            <div style={{ fontSize: "0.62rem", color: "#4a6490", letterSpacing: "0.03em" }}>
              Grupo União e Trabalho
            </div>
          </div>
        )}
      </div>

      {/* ── Informação do usuário ── */}
      {!collapsed && isConnected && (
        <div style={{
          margin: "0.5rem 0.75rem", padding: "0.6rem 0.75rem",
          background: "rgba(37,99,235,0.08)", borderRadius: "10px",
          border: "1px solid rgba(37,99,235,0.15)",
        }}>
          {userLabel && (
            <div style={{ fontSize: "0.72rem", color: "#93c5fd", fontWeight: "700",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>
              {userLabel}
            </div>
          )}
          {address && (
            <div style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#4a6490" }}>
              {address.slice(0, 8)}...{address.slice(-4)}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
            <span style={{ fontSize: "0.63rem", color: "#10b981", fontWeight: "700" }}>
              💰 R$ {carteiraFlash.toFixed(2)}
            </span>
            <span style={{ fontSize: "0.63rem", color: "#a78bfa", fontWeight: "700" }}>
              🎫 {fichasProgramadas}
            </span>
          </div>
        </div>
      )}

      {/* ── Navegação ── */}
      <nav style={{ flex: 1, padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
        {NAV_ITEMS.map(({ path, label, icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : "0.65rem",
              padding: collapsed ? "0.72rem" : "0.6rem 0.85rem",
              justifyContent: collapsed ? "center" : "flex-start",
              margin: "0 0.5rem", borderRadius: "10px",
              color: isActive ? "#93c5fd" : "#4a6490",
              background: isActive ? "rgba(37,99,235,0.14)" : "transparent",
              textDecoration: "none",
              fontWeight: isActive ? "700" : "500",
              fontSize: "0.84rem",
              transition: "all 0.15s ease",
              borderLeft: isActive ? "2px solid #2563eb" : "2px solid transparent",
              flexShrink: 0,
            })}
          >
            <span style={{ flexShrink: 0 }}>{icon}</span>
            {!collapsed && (
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Rodapé: Auth + Toggle ── */}
      <div style={{ borderTop: "1px solid rgba(37,99,235,0.1)", padding: "0.75rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {/* Botão de login/logout */}
        {isConnected ? (
          <button
            onClick={desconectar}
            title={collapsed ? "Sair" : undefined}
            style={{
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : "0.5rem",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "0.6rem" : "0.55rem 0.85rem",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "10px", color: "#ef4444",
              cursor: "pointer", fontSize: "0.78rem", fontWeight: "600",
              transition: "all 0.15s", width: "100%",
            }}
          >
            <IconLogOut />
            {!collapsed && <span>Sair</span>}
          </button>
        ) : (
          <button
            onClick={abrirModal}
            title={collapsed ? "⚡ Aceito o DesafioGUT" : undefined}
            style={{
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : "0.5rem",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "0.6rem" : "0.55rem 0.85rem",
              background: "linear-gradient(135deg, #f5a623, #f97316)",
              border: "none", borderRadius: "10px",
              color: "#030f24", cursor: "pointer",
              fontSize: collapsed ? "1rem" : "0.78rem",
              fontWeight: "800", transition: "all 0.15s", width: "100%",
            }}
          >
            <span>⚡</span>
            {!collapsed && <span>Aceito o DesafioGUT</span>}
          </button>
        )}

        {/* Botão de recolher */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0.45rem", background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.2)", borderRadius: "8px",
            color: "#4a6490", cursor: "pointer", transition: "all 0.15s",
            width: "100%",
          }}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          {!collapsed && <span style={{ fontSize: "0.68rem", marginLeft: "0.4rem" }}>Recolher</span>}
        </button>

        {/* MOCK badge */}
        {MOCK_MODE && !collapsed && (
          <div style={{ textAlign: "center", fontSize: "0.62rem", color: "#f5a623",
            background: "rgba(245,166,35,0.08)", borderRadius: "6px", padding: "0.2rem" }}>
            🧪 MOCK MODE
          </div>
        )}
      </div>
    </aside>
  );
}
