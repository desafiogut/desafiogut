// MC16 — Overlay de fim de leilão compartilhado entre Dashboard e MercadoLances.
// Disparado via showOverlay (AppContext) com flag anti-duplicação fimDisparadoRef.
// MC23.3 — outer overlay migrado para <Modal> (spring entry + backdrop bg-black/60).

import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard, Modal } from "@/components/ui";
import Confetti from "./Confetti.jsx";

const COR = { gold: "#f5a623" };

export default function FimEdicaoOverlay({
  vencedor, modalidade, onNovaRodada, EDICAO_ATIVA,
  // UTAC000.17bc (17c) — overlay AGREGADO: as edições em que o utilizador deu lance (vêm do endpoint
  // `/minhas-participacoes` do UTAC000.17a, filtradas pelo token — GATE 21), o endereço do titular
  // (para destacar a vitória — GATE 2.2) e a saída explícita (`onClose` — a 2.ª metade da DEBT-016).
  participacoes = [], meuEndereco = null, onClose = null,
}) {
  const isMobile = useIsMobile();
  // «VENCEU» = a linha é desta edição (a que acabou) E o vencedor oficial é o titular.
  const titular = typeof meuEndereco === "string" && meuEndereco.length > 0 ? meuEndereco.toLowerCase() : null;
  const vencedorTitular = Boolean(titular) && typeof vencedor?.endereco === "string"
    && vencedor.endereco.toLowerCase() === titular;
  const venceuAqui = (id) => id === EDICAO_ATIVA && vencedorTitular;
  // UTAC000.14 (DEBT-013) — GUARDA DE TIPO, a mesma do `OverlayVencedor` (UTAC000.11) e do card do
  // Dashboard (UTAC000.12). Medido no SEG-1: com valor malformado mostrava «R$ NaN»/«R$ -0.01», e
  // `BigInt`/`Symbol` ou endereço não-string LANÇAVAM (página em branco). Malformado = AUSENTE («—»),
  // campo a campo; com `vencedor` VÁLIDO as expressões são as mesmas de antes (GATE 18).
  const enderecoAbrev = typeof vencedor?.endereco === "string" && vencedor.endereco.length > 0
    ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
    : "—";
  const valorFmt = Number.isFinite(vencedor?.valor) && vencedor.valor >= 0
    ? `R$ ${(vencedor.valor / 100).toFixed(2)}`
    : "—";

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
      <Modal
        open
        className={`text-center max-w-[480px] w-full !border-2 !border-[#fbbf24] !rounded-[20px] ${isMobile ? 'p-7' : 'p-10'} [animation:gut-gold-pulse-mc16_2s_ease-in-out_infinite,gut-slide-up-modal-mc16_0.5s_ease-out_both]`}
      >
        <div style={{ fontSize: isMobile ? "2.75rem" : "3.5rem", lineHeight: 1 }}>🏆</div>
        <h2 style={{
          margin: "0.75rem 0 0.25rem",
          fontSize: isMobile ? "1.4rem" : "1.8rem",
          fontWeight: "900",
          color: "#fbbf24", letterSpacing: "0.04em",
          textShadow: "0 0 20px #fbbf24",
        }}>EDIÇÃO ENCERRADA</h2>
        <p style={{ margin: "0 0 1.25rem", color: "#94a3b8", fontSize: isMobile ? "0.78rem" : "0.9rem", lineHeight: 1.5 }}>
          <strong style={{ color: COR.gold }}>DesafioGUT</strong>
          {" · Edição "}<strong style={{ color: COR.gold }}>{EDICAO_ATIVA}</strong>
          {" · "}{modalidade === "flash" ? "⚡ Relâmpago" : "🎫 Programado"}
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
        {/* UTAC000.17bc (17c) — agregado: em que edições o titular deu lance (e se venceu esta).
            Vazio (sem sessão/erro) esconde a secção: o overlay continua a funcionar como antes. */}
        {participacoes.length > 0 && (
          <GlassCard className={`!rounded-xl ${isMobile ? 'p-4' : 'p-5'} mb-5`}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#6b7db8",
              textTransform: "uppercase", letterSpacing: "0.08em" }}>As suas participações</p>
            {participacoes.map((p) => (
              <div key={p.edicaoId} style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", gap: "0.5rem", padding: "0.3rem 0",
                fontSize: isMobile ? "0.8rem" : "0.88rem" }}>
                <span style={{ color: "#e8f0fe", fontFamily: "monospace" }}>{p.edicaoId}</span>
                <span style={{ color: "#94a3b8" }}>
                  {p.lances === 1 ? "1 lance" : `${p.lances} lances`}
                </span>
                {venceuAqui(p.edicaoId) && (
                  <span style={{ color: "#fbbf24", fontWeight: 800 }}>🏆 VENCEU</span>
                )}
              </div>
            ))}
          </GlassCard>
        )}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onNovaRodada}
            style={{
              flex: 1, padding: "0.85rem", borderRadius: "10px", border: "none",
              background: "#fbbf24", color: "#0f172a", fontWeight: "800",
              fontSize: isMobile ? "0.92rem" : "0.95rem", cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            ⚡ NOVA RODADA
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "0.85rem", borderRadius: "10px", border: "1px solid #334155",
                background: "transparent", color: "#cbd5e1", fontWeight: "700",
                fontSize: isMobile ? "0.92rem" : "0.95rem", cursor: "pointer",
                letterSpacing: "0.04em",
              }}
            >
              FECHAR
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
