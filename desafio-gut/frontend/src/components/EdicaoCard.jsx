// EdicaoCard — MC45: card REUTILIZÁVEL de edição (padrão único).
//
// Encapsula o padrão que só existia na "Edição Ativa" do Dashboard: caixa âmbar
// com um BANNER QUADRADO clicável à esquerda + informações à direita, mais o
// cronómetro por edição (cálculo absoluto via timeLeftEdicaoSegundos, re-render
// por edicoesTick — preservado do antigo EdicaoTimerCard) e o CTA para o mercado.
//
// O banner (quadrado) é o elemento clicável → /edicao/:id (EdicaoBanner).
// Usado para TODAS as edições não-ativas; a edição ativa reutiliza o mesmo
// EdicaoBanner dentro do seu card rico (Dashboard.jsx).

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import GutoSpritePlayer from "./GutoSpritePlayer.jsx";
import EdicaoBanner from "./EdicaoBanner.jsx";
import { GlassCard } from "@/components/ui";

const COR = {
  gold: "#f5a623", text: "#e8f0fe", muted: "#6b7db8",
  success: "#10b981", warning: "#f97316", danger: "#ef4444",
};

// Duração total por tipo (só para a escala de cor do cronómetro).
const TOTAL_POR_TIPO = { relampago: 1800, programado: 86400 };

function timerColor(restante, total) {
  const t = Number.isFinite(total) && total > 0 ? total : 1800;
  const r = restante / t;
  if (r > 0.6) return COR.success;
  if (r > 0.3) return COR.warning;
  return COR.danger;
}

function formatarTempoEdicao(segundos, tipo) {
  const t = Math.max(0, Number.isFinite(segundos) ? segundos : 0);
  const pad = (n) => String(n).padStart(2, "0");
  if (tipo === "relampago") {
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  }
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (d > 0) return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function EdicaoCard({ edicao, isMobile, cardCls = "p-4", cardTituloStyle }) {
  const navigate = useNavigate();
  const { edicoesTick, timeLeftEdicaoSegundos } = useAppContext();

  const restante = timeLeftEdicaoSegundos(edicao); // recalculado a cada edicoesTick
  const encerrada = restante <= 0;
  const total = TOTAL_POR_TIPO[edicao.tipo] || 1800;
  void edicoesTick; // consumido só para forçar o re-render por tick (timer).

  const tipoLabel = edicao.tipo === "programado" ? "🎫 Programado" : "⚡ Relâmpago";

  return (
    <GlassCard className={cardCls}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? "0.5rem" : "0.75rem" }}>
        <h3 style={{ ...(cardTituloStyle || {}), margin: 0 }}>{tipoLabel}</h3>
        <span style={{
          fontSize: "0.7rem", fontWeight: "800", color: COR.gold,
          background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.35)",
          borderRadius: "999px", padding: "0.2rem 0.6rem", letterSpacing: "0.04em",
        }}>{edicao.id}</span>
      </div>

      {/* MC45 — caixa âmbar com banner QUADRADO clicável + info (mesmo padrão da edição ativa). */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.65rem",
        padding: "0.6rem 0.75rem",
        background: "rgba(245,166,35,0.07)",
        border: "1px solid rgba(245,166,35,0.22)",
        borderRadius: "10px",
        marginBottom: isMobile ? "0.6rem" : "0.75rem",
      }}>
        <EdicaoBanner edicao={edicao} size={isMobile ? 52 : 56} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.58rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: "700", marginBottom: "0.15rem" }}>
            Edição {edicao.id}
          </div>
          <div style={{ fontSize: isMobile ? "0.78rem" : "0.82rem", color: COR.gold, fontWeight: "800", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {edicao.produto ? edicao.produto : "Prêmio a anunciar"}
          </div>
          <div style={{ fontSize: "0.68rem", color: encerrada ? "#fca5a5" : COR.muted, lineHeight: 1.2 }}>
            {encerrada ? "Encerrada" : "Em andamento"}
          </div>
        </div>
      </div>

      <div style={{
        display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: "0.6rem", padding: isMobile ? "0.2rem 0 0.6rem" : "0.1rem 0 0.6rem",
      }}>
        <GutoSpritePlayer variant="inline" size={isMobile ? 52 : 60} mood={encerrada ? "celebrating" : undefined} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
          <div style={{
            fontSize: isMobile ? "2.1rem" : "1.95rem", fontWeight: "900",
            fontFamily: "'JetBrains Mono', monospace",
            color: encerrada ? COR.danger : timerColor(restante, total),
            letterSpacing: "0.02em", lineHeight: 1, transition: "color 0.6s ease",
          }}>{formatarTempoEdicao(restante, edicao.tipo)}</div>
          <div style={{ fontSize: "0.66rem", color: encerrada ? "#fca5a5" : COR.text, marginTop: "0.3rem", textAlign: "center" }}>
            {encerrada ? "Encerrada" : "Em andamento — lance já!"}
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/mercado")}
        style={{
          padding: "0.6rem 1rem",
          background: encerrada ? "rgba(245,166,35,0.18)" : "linear-gradient(135deg,#f5a623,#e89400)",
          border: "none", borderRadius: "10px",
          color: encerrada ? COR.gold : "#0a0f1a",
          fontWeight: "800", cursor: "pointer", fontSize: "0.82rem", width: "100%",
          fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.04em",
        }}
      >⚡ Ir para o Mercado</button>
    </GlassCard>
  );
}
