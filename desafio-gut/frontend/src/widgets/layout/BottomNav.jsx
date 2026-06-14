import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAppContext } from "../../context/AppContext.jsx";
import { useAdmin } from "../../hooks/useAdmin.js";
import { Button } from "@/components/ui";

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const IconDashboard = (p) => (
  <Icon {...p} d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>} />
);
const IconTarget = (p) => (
  <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />
);
const IconTrending = (p) => (
  <Icon {...p} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />
);
const IconMore = (p) => (
  <Icon {...p} d={<><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>} />
);
const IconWallet = (p) => (
  <Icon {...p} d={<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></>} />
);
const IconShield = (p) => (
  <Icon {...p} d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} />
);
const IconSettings = (p) => (
  <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />
);
const IconLogOut = (p) => (
  <Icon {...p} d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />
);
const IconClose = (p) => (
  <Icon {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
);

const MAIN_TABS = [
  { path: "/",         label: "Início",   Icon: IconDashboard, end: true,  ariaLabel: "Ir para Dashboard" },
  { path: "/mercado",  label: "Lances",   Icon: IconTarget,    end: false, ariaLabel: "Ir para Mercado de Lances" },
  { path: "/carteira", label: "Carteira", Icon: IconWallet,    end: false, ariaLabel: "Ir para Minha Carteira" },
];

const SECONDARY_LINKS = [
  { path: "/vitrine",             label: "Vitrine (4 Slots)",      Icon: IconTarget   },
  { path: "/programacao",         label: "Programação",            Icon: IconTarget   },
  { path: "/ativos",              label: "Meus Ativos",            Icon: IconTrending },
  { path: "/seguranca",           label: "Segurança",              Icon: IconShield   },
  { path: "/seja-nosso-parceiro", label: "🤝 Seja nosso parceiro!", Icon: IconTrending },
  { path: "/configuracoes",       label: "Configurações",          Icon: IconSettings },
];

// MC20.2 ITEM 5 — Nav Dock flutuante (cápsula). DOCK_HEIGHT = altura visual do dock;
// BOTTOM_NAV_HEIGHT (exportado) = espaço total que o Layout reserva (margem + dock + margem),
// para o conteúdo nunca ficar oculto sob o dock flutuante (anti-CLS / sem overlap).
const DOCK_HEIGHT = 60;
const DOCK_MARGIN = 14;
const NAV_HEIGHT = DOCK_HEIGHT + DOCK_MARGIN * 2; // 88
const SPRING = { type: "spring", stiffness: 380, damping: 28 };

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isConnected, address, userLabel,
    abrirModal, desconectar,
    // MC11.3 — auth-state granular (espelha Sidebar): mobile também precisa
    // proteger o botão "Aceito" durante o gap authenticated && !address (pós
    // email-OTP, embedded wallet em criação). Sem isso o botão fica travado.
    ready, authenticated,
    tipoUsuario,
  } = useAppContext();
  const { isAdmin } = useAdmin(address);
  const reduce = useReducedMotion();

  // MC14.10.1 ITEM 3 — mobile copia lógica de Sidebar.jsx:110-119
  const CORP_TABS = [
    { path: "/corporativo",          label: "Painel",   Icon: IconDashboard, end: true,  ariaLabel: "Painel Lojista" },
    { path: "/corporativo/cotas",    label: "Cotas",    Icon: IconTarget,    end: false, ariaLabel: "Minhas Cotas" },
    { path: "/corporativo/banners",  label: "Banners",  Icon: IconTrending,  end: false, ariaLabel: "Meus Banners" },
  ];

  const baseLinks = isAdmin
    ? [...SECONDARY_LINKS, { path: "/admin", label: "⚙️ Admin", Icon: IconSettings }]
    : SECONDARY_LINKS;

  const tabsAtivas = tipoUsuario === "corporativo" ? CORP_TABS : MAIN_TABS;
  const secundariosAtivos = tipoUsuario === "corporativo"
    ? [
        { path: "/corporativo/analytics", label: "📊 Analytics", Icon: IconTrending },
        { path: "/configuracoes", label: "Configurações", Icon: IconSettings },
      ]
    : baseLinks;

  // MC14.10.1 ITEM 1 — esconder link de parceria para lojista (já cadastrado)
  const linksSecundarios = tipoUsuario === "corporativo"
    ? secundariosAtivos
    : baseLinks;

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const isOnSecondaryRoute = secundariosAtivos.some((l) => location.pathname.startsWith(l.path));

  return (
    <>
      {/* MC20.2 ITEM 5 — Nav Dock flutuante (cápsula glassmorphic). Mesma lógica de
          rotas/tabs; só a apresentação mudou. Active Indicator elástico (layoutId+spring)
          desliza entre as tabs principais; "Mais" mantém highlight estático. */}
      <nav
        aria-label="Navegação principal"
        className="nav-glass"
        style={{
          position: "fixed",
          bottom: `calc(${DOCK_MARGIN}px + env(safe-area-inset-bottom, 0px))`,
          left: "50%", transform: "translateX(-50%)",
          width: `calc(100% - ${DOCK_MARGIN * 2}px)`, maxWidth: "460px",
          height: `${DOCK_HEIGHT}px`,
          borderRadius: "20px",
          display: "flex", alignItems: "stretch",
          padding: "6px", gap: "2px",
          zIndex: 50,
        }}
      >
        {tabsAtivas.map(({ path, label, Icon, end, ariaLabel }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            aria-label={ariaLabel || label}
            style={dockLinkStyle}
          >
            {({ isActive }) => (
              <DockItem active={isActive} reduce={reduce}>
                <Icon />
                <span style={dockLabelStyle}>{label}</span>
              </DockItem>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="Mais opções"
          aria-expanded={moreOpen}
          style={{ ...dockLinkStyle, background: "transparent", border: "none", cursor: "pointer" }}
        >
          <DockItem active={moreOpen || isOnSecondaryRoute} reduce={reduce} indicator={false}>
            <IconMore />
            <span style={dockLabelStyle}>Mais</span>
          </DockItem>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 60,
              animation: "gut-fade-in 0.18s ease-out",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0,
              /* MC22.2 SECÇÃO C — superfície de navegação UNIFICADA (.nav-glass):
                 mesmo navy translúcido do Nav Dock, blur sempre ligado. */
              background: "var(--nav-glass)",
              backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
              borderTop: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
              maxHeight: "82vh", overflowY: "auto",
              borderTopLeftRadius: "20px", borderTopRightRadius: "20px",
              padding: "1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px))",
              zIndex: 70,
              animation: "gut-slide-up 0.22s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ fontWeight: "900", fontSize: "0.95rem", color: "#e8f0fe", letterSpacing: "0.02em" }}>DesafioGUT</div>
                <div style={{ fontSize: "0.65rem", color: "#6b7db8" }}>Grupo União e Trabalho</div>
              </div>
              <Button variant="ghost" size="sm" type="button"
                onClick={() => setMoreOpen(false)} aria-label="Fechar"
                className="!border-[#f5a623]/20 !bg-[#f5a623]/[0.08] !text-[#fbbf24] !rounded-xl !p-2 !min-w-0">
                <IconClose size={18} />
              </Button>
            </div>

            {/* MC11.3 — Auth-state granular (4 estados, espelha Sidebar):
               1. !ready                 → spinner "Carregando…"
               2. authenticated && !addr → spinner "Criando carteira…" (gap email-OTP)
               3. isConnected            → user card
               4. default                → botão "Aceito o DesafioGUT"
               Estados 1+2 NUNCA renderizam o botão de login → não pode "travar". */}
            {!ready ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  width: "100%", padding: "0.85rem", marginBottom: "0.5rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "0.5rem",
                  background: "rgba(245,166,35,0.06)",
                  border: "1px dashed rgba(245,166,35,0.25)",
                  borderRadius: "12px", color: "#6b7db8",
                  fontSize: "0.9rem", fontWeight: 700,
                }}
              >
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
                <span>Carregando…</span>
              </div>
            ) : authenticated && !address ? (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    width: "100%", padding: "0.85rem", marginBottom: "0.5rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: "0.5rem",
                    background: "rgba(0,212,170,0.08)",
                    border: "1px solid rgba(0,212,170,0.3)",
                    borderRadius: "12px", color: "#00d4aa",
                    fontSize: "0.9rem", fontWeight: 800,
                  }}
                >
                  <span>🔐</span>
                  <span>Criando carteira…</span>
                </div>
            ) : isConnected ? (
              <div style={{
                margin: "0.5rem 0 0.75rem", padding: "0.7rem 0.85rem",
                background: "rgba(16,185,129,0.08)", borderRadius: "12px",
                border: "1px solid rgba(16,185,129,0.22)",
              }}>
                {userLabel && (
                  <div style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: "700",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userLabel}
                  </div>
                )}
                {address && (
                  <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#6b7db8", marginTop: "2px" }}>
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </div>
                )}
              </div>
            ) : (
              <Button variant="primary" size="lg" type="button"
                onClick={() => { abrirModal(); setMoreOpen(false); }}
                className="w-full mb-2 !rounded-xl">
                ⚡ Aceito o DesafioGUT
              </Button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "0.5rem" }}>
              {secundariosAtivos.map(({ path, label, Icon }) => (
                <button
                  type="button"
                  key={path}
                  onClick={() => { navigate(path); setMoreOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.85rem 0.85rem",
                    background: location.pathname.startsWith(path) ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(245,166,35,0.12)",
                    borderRadius: "12px",
                    color: location.pathname.startsWith(path) ? "#fbbf24" : "#e8f0fe",
                    fontSize: "0.92rem", fontWeight: "600",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {isConnected && (
              <Button variant="ghost" size="md" type="button"
                onClick={() => { desconectar(); setMoreOpen(false); }}
                className="w-full mt-3 !border-[#ef4444]/22 !bg-[#ef4444]/[0.08] !text-[#ef4444] !rounded-xl">
                <IconLogOut />
                Sair
              </Button>
            )}
          </div>

          <style>{`
            @keyframes gut-fade-in { from { opacity: 0 } to { opacity: 1 } }
            @keyframes gut-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
          `}</style>
        </>
      )}
    </>
  );
}

// MC20.2 ITEM 5 — estilos e item do Nav Dock (apenas apresentação).
const dockLinkStyle = {
  flex: 1, minWidth: 0,
  display: "flex", alignItems: "stretch",
  textDecoration: "none", padding: 0,
};
const dockLabelStyle = {
  fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1,
};

// DockItem — cápsula de cada tab. Quando ativo e indicator=true, renderiza o
// Active Indicator partilhado (layoutId) que desliza com spring entre as tabs.
// whileTap dá o feedback tátil (scale 0.9); useReducedMotion desativa tudo.
function DockItem({ active, reduce, indicator = true, children }) {
  return (
    <motion.span
      className="dock-icon"
      whileTap={reduce ? undefined : { scale: 0.9 }}
      style={{
        position: "relative", flex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "3px", height: "100%", borderRadius: "14px",
        color: active ? "#ff7a45" : "#6b7db8",
        transition: "color 0.18s",
      }}
    >
      {active && indicator && (
        <motion.span
          layoutId="gut-dock-ind"
          transition={reduce ? { duration: 0 } : SPRING}
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, borderRadius: "14px",
            background: "rgba(255,107,53,0.14)",
            border: "1px solid rgba(255,107,53,0.30)",
            boxShadow: "0 2px 10px rgba(255,107,53,0.18)",
            zIndex: 0,
          }}
        />
      )}
      {active && !indicator && (
        /* MC23.1.1 A3 — "Mais" usa highlight estático (não entra no layoutId
           partilhado), mas com o MESMO vidro dos tabs principais: 0.14 + borda +
           sombra. Sem isto destoava (0.10, sem borda) dos restantes ícones. */
        <span aria-hidden="true" style={{
          position: "absolute", inset: 0, borderRadius: "14px",
          background: "rgba(255,107,53,0.14)",
          border: "1px solid rgba(255,107,53,0.30)",
          boxShadow: "0 2px 10px rgba(255,107,53,0.18)",
          zIndex: 0,
        }} />
      )}
      <span style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
        {children}
      </span>
    </motion.span>
  );
}

export { NAV_HEIGHT as BOTTOM_NAV_HEIGHT };
