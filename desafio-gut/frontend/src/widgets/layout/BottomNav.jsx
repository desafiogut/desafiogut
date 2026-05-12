import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext.jsx";

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
  { path: "/vitrine",       label: "Vitrine (4 Slots)", Icon: IconTarget   },
  { path: "/programacao",   label: "Programação",       Icon: IconTarget   },
  { path: "/ativos",        label: "Meus Ativos",       Icon: IconTrending },
  { path: "/seguranca",     label: "Segurança",         Icon: IconShield   },
  { path: "/configuracoes", label: "Configurações",     Icon: IconSettings },
];

const NAV_HEIGHT = 64;

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isConnected, address, userLabel,
    abrirModal, desconectar,
  } = useAppContext();

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const isOnSecondaryRoute = SECONDARY_LINKS.some((l) => location.pathname.startsWith(l.path));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "linear-gradient(180deg, rgba(5,13,30,0.92), rgba(3,15,36,0.98))",
          borderTop: "1px solid rgba(245,166,35,0.18)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
          display: "flex",
          zIndex: 50,
        }}
      >
        {MAIN_TABS.map(({ path, label, Icon, end, ariaLabel }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            aria-label={ariaLabel || label}
            style={({ isActive }) => tabStyle(isActive)}
          >
            <Icon />
            <span style={{ fontSize: "0.66rem", fontWeight: "700", letterSpacing: "0.02em" }}>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="Mais opções"
          aria-expanded={moreOpen}
          style={tabStyle(moreOpen || isOnSecondaryRoute)}
        >
          <IconMore />
          <span style={{ fontSize: "0.66rem", fontWeight: "700", letterSpacing: "0.02em" }}>Mais</span>
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
              maxHeight: "82vh", overflowY: "auto",
              background: "linear-gradient(180deg, #080d18, #0a0f1a)",
              borderTop: "1px solid rgba(245,166,35,0.25)",
              borderTopLeftRadius: "20px", borderTopRightRadius: "20px",
              padding: "1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px))",
              zIndex: 70,
              boxShadow: "0 -16px 40px rgba(0,0,0,0.6)",
              animation: "gut-slide-up 0.22s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ fontWeight: "900", fontSize: "0.95rem", color: "#e8f0fe", letterSpacing: "0.02em" }}>DesafioGUT</div>
                <div style={{ fontSize: "0.65rem", color: "#4a6490" }}>Grupo União e Trabalho</div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar"
                style={{
                  background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)",
                  borderRadius: "10px", padding: "0.5rem", color: "#fbbf24", cursor: "pointer",
                  display: "flex",
                }}
              >
                <IconClose size={18} />
              </button>
            </div>

            {isConnected ? (
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
                  <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#4a6490", marginTop: "2px" }}>
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { abrirModal(); setMoreOpen(false); }}
                style={{
                  width: "100%", padding: "0.85rem", marginBottom: "0.5rem",
                  background: "linear-gradient(135deg,#f5a623,#f97316)",
                  border: "none", borderRadius: "12px",
                  color: "#0a0f1a", fontWeight: "800", fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                ⚡ Aceito o DesafioGUT
              </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "0.5rem" }}>
              {SECONDARY_LINKS.map(({ path, label, Icon }) => (
                <button
                  type="button"
                  key={path}
                  onClick={() => { navigate(path); setMoreOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.85rem 0.85rem",
                    background: location.pathname.startsWith(path) ? "rgba(245,166,35,0.14)" : "transparent",
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
              <button
                type="button"
                onClick={() => { desconectar(); setMoreOpen(false); }}
                style={{
                  width: "100%", marginTop: "0.75rem", padding: "0.75rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)",
                  borderRadius: "12px", color: "#ef4444",
                  fontSize: "0.88rem", fontWeight: "700", cursor: "pointer",
                }}
              >
                <IconLogOut />
                Sair
              </button>
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

function tabStyle(active) {
  return {
    flex: 1,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: "3px",
    padding: "0.4rem 0.25rem",
    background: "transparent",
    border: "none",
    color: active ? "#f5a623" : "#5a7090",
    textDecoration: "none",
    cursor: "pointer",
    transition: "color 0.15s",
    borderTop: active ? "2px solid #f5a623" : "2px solid transparent",
    minWidth: 0,
  };
}

export { NAV_HEIGHT as BOTTOM_NAV_HEIGHT };
