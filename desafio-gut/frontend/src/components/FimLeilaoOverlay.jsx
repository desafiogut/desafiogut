// MC16 — Overlay de fim de leilão compartilhado entre Dashboard e MercadoLances.
// Disparado via showOverlay (AppContext) com flag anti-duplicação fimDisparadoRef.

import { useMemo } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = { gold: "#f5a623" };

function Confetti() {
  const pecas = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left:     `${Math.random() * 100}%`,
      delay:    `${(Math.random() * 2.5).toFixed(2)}s`,
      duration: `${(1.8 + Math.random() * 2).toFixed(2)}s`,
      color:    ["#fbbf24","#fbbf24","#6ee7b7","#f97316","#ffffff","#a78bfa","#f472b6"][i % 7],
      size:     `${6 + Math.floor(Math.random() * 9)}px`,
      rotate:   `${Math.floor(Math.random() * 360)}deg`,
    }))
  , []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10001, overflow: "hidden" }}>
      <style>{`
        @keyframes gut-confetti-mc16 {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(108vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pecas.map((p) => (
        <div key={p.id} style={{
          position: "absolute", top: "-12px", left: p.left,
          width: p.size, height: p.size, borderRadius: "2px",
          background: p.color, transform: `rotate(${p.rotate})`,
          animation: `gut-confetti-mc16 ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

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
        <div onClick={(e) => e.stopPropagation()} style={{
          background: "linear-gradient(135deg,#0a1628 0%,#0f172a 60%)",
          border: "2px solid #fbbf24", borderRadius: "20px",
          padding: isMobile ? "1.75rem 1.25rem" : "2.5rem 2rem",
          maxWidth: "480px", width: "100%",
          textAlign: "center", color: "#e8f0fe",
          animation: "gut-gold-pulse-mc16 2s ease-in-out infinite, gut-slide-up-modal-mc16 0.5s ease-out both",
        }}>
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
            <div style={{
              background: "#0a1e38", border: `1px solid ${COR.gold}`,
              borderRadius: "12px", padding: isMobile ? "1rem" : "1.25rem",
              marginBottom: "1.25rem",
            }}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>Carteira Vencedora</p>
              <p style={{ margin: "0 0 0.75rem", fontFamily: "monospace",
                fontSize: isMobile ? "0.85rem" : "0.95rem", color: "#e8f0fe", wordBreak: "break-all" }}>
                {enderecoAbrev}
              </p>
              <p style={{ margin: 0, fontSize: isMobile ? "1.7rem" : "2rem", fontWeight: "900",
                color: "#fbbf24", textShadow: "0 0 12px #fbbf24" }}>{valorFmt}</p>
            </div>
          ) : (
            <div style={{ padding: "1.25rem", color: "#64748b", marginBottom: "1.25rem" }}>
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
        </div>
      </div>
    </>
  );
}
