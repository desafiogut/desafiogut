// MC16 — Overlay de fim de leilão compartilhado entre Dashboard e MercadoLances.
// Disparado via showOverlay (AppContext) com flag anti-duplicação fimDisparadoRef.

import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import Confetti from "./Confetti.jsx";

const COR = { gold: "#f5a623" };

export default function FimLeilaoOverlay({ vencedor, tipoLeilao, onNovaRodada, EDICAO_ATIVA }) {
  const isMobile = useIsMobile();
  const enderecoAbrev = vencedor
    ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
    : "—";
  const valorFmt = vencedor ? `R$ ${(vencedor.valor / 100).toFixed(2)}` : "—";

  return (
    <>
      <Confetti />
      <style>{`
        @keyframes gut-gold-pulse-mc16 {
          0%,100% { boxShadow: 0 0 30px 8px #fbbf24, 0 0 70px 20px #f59e0b55; }
          50%      { boxShadow: 0 0 55px 18px #fbbf24, 0 0 110px 40px #f59e0b77; }
        }
        @keyframes gut-slide-up-modal-mc16 {
          from { transform: translateY(60px) scale(0.92); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.90)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        overflow: "hidden",
      }}>
        <GlassCard
          onClick={(e) => e.stopPropagation()}
          className={`text-center max-w-[480px] w-full !border-2 !border-[#fbbf24] !rounded-[20px] ${isMobile ? 'p-7' : 'p-10'} [animation:gut-gold-pulse-mc16_2s_ease-in-out_infinite,gut-slide-up-modal-mc16_0.5s_ease-out_both]`}
        >
          <div style={{ fontSize: isMobile ? "2.75rem" : "3.5rem", lineHeight: 1 }}>🏆</div>
          <h2 style={{
            margin: "0.75rem 0 0.25rem",
            fontSize: isMobile ? "1.4rem" : "1.8rem",
            fontWeight: "900",
            color: "#fbbf24", letterSpacing: "0.04em",
            textShadow: "0 0 20px #fbbf24",
          }}>LEILÃO ENCERRADO</h2>
          <p style={{ margin: "0 0 1.25rem", color: "#94a3b8", fontSize: isMobile ? "0.78rem" : "0.9rem", lineHeight: 1.5 }}>
            <strong style={{ color: COR.gold }}>DesafioGUT</strong>
            {" · Edição "}<strong style={{ color: COR.gold }}>{EDICAO_ATIVA}</strong>
            {" · "}{tipoLeilao === "flash" ? "⚡ Relâmpago" : "🎫 Programado"}
          </p>
          {vencedor ? (
            <GlassCard className={`!border-[#fbbf24] !rounded-xl ${isMobile ? 'p-4' : 'p-5'} mb-5`}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: "#6b7db8",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>Carteira Vencedora</p>
              <p style={{ margin: "0 0 0.75rem", fontFamily: "monospace",
                fontSize: isMobile ? "0.85rem" : "0.95rem", color: "#e8f0fe", wordBreak: "break-all" }}>
                {enderecoAbrev}
              </p>
              <p style={{ margin: 0, fontSize: isMobile ? "1.7rem" : "2rem", fontWeight: "900",
                color: "#fbbf24", textShadow: "0 0 12px #fbbf24" }}>{valorFmt}</p>
            </GlassCard>
          ) : (
            <div style={{ padding: "1.25rem", color: "#6b7db8", marginBottom: "1.25rem" }}>
              Nenhum lance único registrado.
            </div>
          )}
          <button
            onClick={onNovaRodada}
            style={{
              width: "100%", padding: "0.85rem", borderRadius: "10px", border: "none",
              background: "#fbbf24", color: "#0f172a", fontWeight: "800",
              fontSize: isMobile ? "0.92rem" : "0.95rem", cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            ⚡ NOVA RODADA
          </button>
        </GlassCard>
      </div>
    </>
  );
}
