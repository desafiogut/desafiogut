// ScheduleView — Programação.
// MC67 (item 6): a grade de Junho/2026 (já passada) foi SUBSTITUÍDA por um estado
// "em breve". Toda a lógica do calendário (semanas/dias/horários, fontes remota/
// estática, jargão REQ-*/§spec e os timers por slot) foi removida. Os dados
// estáticos (programacao-junho-2026.js) permanecem no repo pois a Vitrine ainda os
// consome; esta view apenas não os usa mais.

import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";

const COR = { primary: "#ff6b35", text: "#ffffff", muted: "#6b7db8" };

export default function ScheduleView() {
  const isMobile = useIsMobile();

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.5rem 2rem", color: COR.text }}>
      <GlassCard
        className={isMobile ? "p-6" : "p-8"}
        style={{ textAlign: "center", maxWidth: "560px", margin: "0 auto" }}
      >
        <div style={{ fontSize: isMobile ? "2.5rem" : "3rem", lineHeight: 1 }} aria-hidden="true">📅</div>
        <h1 style={{
          margin: "1rem 0 0.5rem",
          fontSize: isMobile ? "1.5rem" : "1.9rem",
          fontWeight: 900, color: COR.primary,
          fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.06em",
        }}>Programação</h1>
        <p style={{
          margin: "0 auto", maxWidth: "420px",
          fontSize: isMobile ? "0.9rem" : "1rem", color: COR.muted, lineHeight: 1.6,
        }}>
          Em breve, as novas datas e horários das edições serão anunciados aqui.
          Fique de olho!
        </p>
        <div style={{
          display: "inline-block", marginTop: "1.25rem",
          padding: "0.35rem 1rem", borderRadius: "999px",
          background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.3)",
          color: COR.primary, fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.12em",
        }}>EM BREVE</div>
      </GlassCard>
    </div>
  );
}
