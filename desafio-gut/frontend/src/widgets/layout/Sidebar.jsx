import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAppContext } from "../../context/AppContext.jsx";
import { useAdmin } from "../../hooks/useAdmin.js";
import GutoAvatar from "../../components/GutoAvatar.jsx";

// MC20.2 ITEM 5 — spring do Active Indicator elástico (rail desktop).
const RAIL_SPRING = { type: "spring", stiffness: 380, damping: 30 };

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
  { path: "/vitrine",       label: "Vitrine (4 Slots)", icon: <IconTarget />,    end: false },
  { path: "/programacao",   label: "Programação",       icon: <IconTarget />,    end: false },
  { path: "/ativos",        label: "Meus Ativos",       icon: <IconTrending />,  end: false },
  { path: "/seguranca",     label: "Segurança",         icon: <IconShield />,    end: false },
  { path: "/configuracoes", label: "Configurações",     icon: <IconSettings />,  end: false },
  // MC11.1 — Seção pública "Seja Nosso Parceiro" (visível a TODOS: não logados,
  // comuns e lojistas). Porta de entrada para o fluxo corporativo.
  { path: "/seja-nosso-parceiro", label: "🤝 Seja nosso parceiro!", icon: <IconTrending />, end: false },
];

// MC11 — Itens exclusivos do Usuário Corporativo (Lojista). Renderizados
// SOMENTE quando tipoUsuario === "corporativo". Usuário Comum não vê.
const CORPORATIVO_ITEMS = [
  { path: "/corporativo",           label: "🏢 Painel Lojista", icon: <IconDashboard />, end: true  },
  { path: "/corporativo/cotas",     label: "📢 Minhas Cotas",   icon: <IconTarget />,    end: false },
  { path: "/corporativo/banners",   label: "🖼️ Meus Banners",  icon: <IconTrending />,  end: false },
  { path: "/corporativo/analytics", label: "📊 Analytics",      icon: <IconTrending />,  end: false },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const ADMIN_ITEM = { path: "/admin", label: "⚙️ Admin", icon: <IconSettings />, end: false };

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    isConnected, address, userLabel,
    saldoSenhas, saldoSenhasStatus,
    abrirModal, desconectar,
    tipoUsuario,
    // MC11.2 — auth-state granular: ready (Privy SDK bootou) e authenticated
    // (sessão Privy ativa). authenticated=true && address=null = embedded
    // wallet sendo criada (gap após email-OTP). Sem isso o usuário via o
    // botão "Aceito" travado clicando em loop.
    ready, authenticated,
  } = useAppContext();
  const { isAdmin } = useAdmin(address);
  const reduce = useReducedMotion();
  // MC12.3 Item 4 — Isolamento do mundo lojista. Corporativo NÃO vê links
  // comuns de Leilão (Dashboard de leilão, carteira pessoal, mercado, vitrine,
  // programação, ativos, segurança, "seja nosso parceiro"). Vê apenas:
  //   - 🏢 Painel Lojista + 📢 Cotas + 🖼️ Banners + 📊 Analytics (CORPORATIVO_ITEMS)
  //   - ⚙️ Configurações (compartilhado)
  //   - ⚙️ Admin (se isAdmin, preserva RBAC)
  // Comum/visitante: comportamento atual (sem regressão R1).
  const configItem = NAV_ITEMS.find(i => i.path === "/configuracoes");
  let itensNav;
  if (tipoUsuario === "corporativo") {
    itensNav = [
      ...CORPORATIVO_ITEMS,
      ...(configItem ? [configItem] : []),
      ...(isAdmin ? [ADMIN_ITEM] : []),
    ];
  } else {
    itensNav = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;
  }

  // Sufixo curto refletindo status de leitura on-chain (idle/ok = vazio).
  const statusSuffix =
    saldoSenhasStatus === "loading" ? " ⏳" :
    saldoSenhasStatus === "stale"   ? " ◇" :
    saldoSenhasStatus === "error"   ? " ✗" : "";

  const W = collapsed ? "72px" : "240px";

  return (
    <aside className="nav-glass" style={{
      /* MC22.2 — rail flutuante com piso de opacidade próprio (.nav-glass navy/0.66).
         Independente do --glass-opacity: nunca mais desaparece na Arena (D5). */
      width: W, minWidth: W, height: "calc(100vh - 24px)",
      /* MC22.2 — rail à ESQUERDA (margem à esquerda). */
      margin: "12px 0 12px 12px",
      borderRadius: "18px",
      display: "flex", flexDirection: "column",
      transition: "width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)",
      position: "sticky", top: "12px",
      overflow: "hidden", flexShrink: 0,
    }}>

      {/* ── Avatar + Logo ── */}
      <div style={{
        padding: collapsed ? "1.1rem 0" : "1.1rem 1rem",
        display: "flex", alignItems: "center",
        gap: collapsed ? 0 : "0.75rem",
        justifyContent: collapsed ? "center" : "flex-start",
        borderBottom: "1px solid rgba(245,166,35,0.1)",
        minHeight: "72px",
      }}>
        <img
          src="/assets/guto/custom/guto-sidebar.png"
          alt="GUTO sorrindo"
          width={48} height={48}
          style={{ flexShrink: 0, borderRadius: "50%", cursor: "pointer" }}
          title={isConnected ? (userLabel || address) : "Fazer login"}
          onClick={!isConnected ? abrirModal : undefined}
        />

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
          background: "rgba(245,166,35,0.08)", borderRadius: "10px",
          border: "1px solid rgba(245,166,35,0.15)",
        }}>
          {userLabel && (
            <div style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: "700",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>
              {userLabel}
            </div>
          )}
          {address && (
            <div style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#4a6490" }}>
              {address.slice(0, 8)}...{address.slice(-4)}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.63rem",
                color: saldoSenhasStatus === "error" ? "#ef4444" : "#10b981",
                fontWeight: "700",
              }}
              title={`Saldo on-chain — status: ${saldoSenhasStatus}`}
            >
              🔗 {saldoSenhas ?? "—"}{statusSuffix}
            </span>
          </div>
        </div>
      )}

      {/* ── Navegação ── */}
      <nav style={{ flex: 1, padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
        {itensNav.map(({ path, label, icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              position: "relative",
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : "0.65rem",
              padding: collapsed ? "0.72rem" : "0.6rem 0.85rem",
              justifyContent: collapsed ? "center" : "flex-start",
              margin: "0 0.5rem", borderRadius: "12px",
              color: isActive ? "#ff7a45" : "#6b7db8",
              textDecoration: "none",
              fontWeight: isActive ? "700" : "500",
              fontSize: "0.84rem",
              transition: "color 0.15s ease",
              flexShrink: 0,
            })}
          >
            {({ isActive }) => (
              <>
                {/* MC20.2 ITEM 5 — Active Indicator elástico partilhado (desliza com spring). */}
                {isActive && (
                  <motion.span
                    layoutId="gut-rail-ind"
                    transition={reduce ? { duration: 0 } : RAIL_SPRING}
                    aria-hidden="true"
                    style={{
                      position: "absolute", inset: 0, borderRadius: "12px",
                      background: "rgba(255,107,53,0.12)",
                      border: "1px solid rgba(255,107,53,0.28)",
                      zIndex: 0,
                    }}
                  />
                )}
                <span style={{ position: "relative", zIndex: 1, flexShrink: 0, display: "flex", alignItems: "center" }}>{icon}</span>
                {!collapsed && (
                  <span style={{ position: "relative", zIndex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Rodapé: Auth + Toggle ── */}
      <div style={{ borderTop: "1px solid rgba(245,166,35,0.1)", padding: "0.75rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {/* MC11.2 — Auth-state granular (4 estados):
           1. !ready                 → Privy SDK ainda bootando
           2. authenticated && !addr → embedded wallet em criação (pós OTP)
           3. isConnected            → logado com address → botão Sair
           4. default                → não logado → botão "Aceito o DesafioGUT"
           Estados 1+2 mostram skeleton/spinner (NUNCA o botão de login travado). */}
        {!ready ? (
          <div
            role="status"
            aria-live="polite"
            title="Carregando autenticação…"
            style={{
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : "0.5rem",
              justifyContent: "center",
              padding: collapsed ? "0.6rem" : "0.55rem 0.85rem",
              background: "rgba(245,166,35,0.06)",
              border: "1px dashed rgba(245,166,35,0.25)",
              borderRadius: "10px", color: "#5a7090",
              fontSize: collapsed ? "1rem" : "0.75rem", fontWeight: 600,
            }}
          >
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
            {!collapsed && <span>Carregando…</span>}
          </div>
        ) : authenticated && !address ? (
            <div
              role="status"
              aria-live="polite"
              title="Criando sua carteira…"
              style={{
                display: "flex", alignItems: "center",
                gap: collapsed ? 0 : "0.5rem",
                justifyContent: "center",
                padding: collapsed ? "0.6rem" : "0.55rem 0.85rem",
                background: "rgba(0,212,170,0.08)",
                border: "1px solid rgba(0,212,170,0.3)",
                borderRadius: "10px", color: "#00d4aa",
                fontSize: collapsed ? "1rem" : "0.75rem", fontWeight: 700,
              }}
            >
              <span>🔐</span>
              {!collapsed && <span>Criando carteira…</span>}
            </div>
        ) : isConnected ? (
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
              color: "#0a0f1a", cursor: "pointer",
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
            padding: "0.45rem", background: "rgba(245,166,35,0.08)",
            border: "1px solid rgba(245,166,35,0.2)", borderRadius: "8px",
            color: "#4a6490", cursor: "pointer", transition: "all 0.15s",
            width: "100%",
          }}
        >
          {/* MC22.2 — rail à esquerda: recolher aponta para a esquerda (borda). */}
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          {!collapsed && <span style={{ fontSize: "0.68rem", marginLeft: "0.4rem" }}>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
