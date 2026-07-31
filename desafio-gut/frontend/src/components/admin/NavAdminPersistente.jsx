// NavAdminPersistente — barra de navegação fixa do painel ADM.
// MC89.24 (Fase 1 da reforma). Substitui os cartões-atalho do índice.
// 7 itens, scroll horizontal no mobile, tabs no desktop.

import { Link, useLocation } from "react-router-dom";
import { TELAS_ADMIN, telaAtiva } from "../../lib/adminNav.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const ICONES = {
  visao: "◉", usuarios: "◒", financeiro: "◓", operacoes: "◔",
  logs: "◑", notificacoes: "◐", configuracoes: "◒",
  aprovacoes: "◒", cotas: "◒",
};

export default function NavAdminPersistente() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const ativa = telaAtiva(pathname);

  // Só as 7 telas do plano (exclui Aprovacoes e Cotas — já integradas ou legacy)
  const telas = TELAS_ADMIN.filter((t) => !t.nota);

  return (
    <nav aria-label="Navegação principal" style={{
      display: "flex",
      gap: isMobile ? "0.15rem" : "0.25rem",
      overflowX: "auto",
      scrollbarWidth: "none",
      paddingBottom: "0.3rem",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      marginBottom: "0.15rem",
      WebkitOverflowScrolling: "touch",
    }}>
      {telas.map((t) => {
        const sel = ativa?.id === t.id;
        return (
          <Link
            key={t.id}
            to={t.href}
            aria-current={sel ? "page" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: isMobile ? "0.2rem" : "0.35rem",
              padding: isMobile ? "0.4rem 0.55rem" : "0.45rem 0.7rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: isMobile ? "0.7rem" : "0.78rem",
              fontWeight: sel ? 700 : 500,
              whiteSpace: "nowrap",
              color: sel ? "#e8f0fe" : "#94a3b8",
              background: sel ? "rgba(255,255,255,0.10)" : "transparent",
              border: `1px solid ${sel ? "rgba(255,255,255,0.25)" : "transparent"}`,
              flexShrink: 0,
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {!isMobile && <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>{ICONES[t.id] || "●"}</span>}
            <span>{isMobile ? t.label.slice(0, 4) : t.label}</span>
          </Link>
        );
      })}

      {/* Indicador de scroll no mobile — gradiente à direita se há overflow */}
      {isMobile && (
        <span style={{
          position: "sticky", right: 0,
          background: "linear-gradient(to right, transparent, rgba(13,18,53,1) 60%)",
          paddingLeft: "1.5rem", paddingRight: "0.3rem",
          display: "flex", alignItems: "center", pointerEvents: "none",
          color: "#64748b", fontSize: "0.7rem",
        }}>→</span>
      )}
    </nav>
  );
}
