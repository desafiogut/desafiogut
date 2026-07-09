// MC66 — ComingSoonHero (Direção C): herói "EM BREVE" que substitui o cronômetro
// vivo na aba Lances. "EM BREVE" é permanente (decisão MC65), então não há contagem.
// Pulsação suave desativada sob prefers-reduced-motion (a11y).
import { COR } from "./glassTokens.js";

export default function ComingSoonHero({ isMobile, edicao }) {
  return (
    <div
      role="status"
      aria-label={`Leilão em breve — edição ${edicao || "R-1"}`}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: isMobile ? "0.5rem" : "0.6rem",
        padding: isMobile ? "0.75rem 0.5rem" : "0.5rem 1rem",
        textAlign: "center", minWidth: 0,
      }}
    >
      <style>{`
        @keyframes gut-hero-pulse {
          0%,100% { opacity: 0.9; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.015); }
        }
        .gut-hero-comingsoon { animation: gut-hero-pulse 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gut-hero-comingsoon { animation: none; }
        }
      `}</style>

      {/* Selo da edição */}
      <div style={{
        fontSize: isMobile ? "0.62rem" : "0.68rem",
        fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
        color: COR.muted, background: "rgba(255,255,255,0.05)",
        padding: "0.2rem 0.75rem", borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        Edição {edicao || "R-1"}
      </div>

      {/* Título principal */}
      <h2 className="gut-hero-comingsoon" style={{
        margin: 0,
        fontSize: isMobile ? "1.9rem" : "2.6rem",
        fontWeight: 800, letterSpacing: "0.14em",
        color: COR.primary, fontFamily: "'Orbitron', sans-serif",
        lineHeight: 1,
        textShadow: "0 0 28px rgba(255,107,53,0.28)",
      }}>EM BREVE</h2>

      {/* Regra do leilão */}
      <p style={{
        margin: 0,
        fontSize: isMobile ? "0.72rem" : "0.82rem",
        color: COR.muted, letterSpacing: "0.02em",
      }}>Menor lance único vence · Art. 8</p>
    </div>
  );
}
