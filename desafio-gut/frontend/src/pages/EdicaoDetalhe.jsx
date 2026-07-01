// EdicaoDetalhe — MC45: página de informações de uma edição (/edicao/:id).
//
// Destino do clique no EdicaoBanner. Lê a edição do mapa `edicoes` (useAppContext)
// pelo :id. Se não existir no mapa corrente (ex.: edição já encerrada e removida
// da grelha), mostra um estado "não encontrada" gracioso com volta ao Dashboard —
// nunca uma página em branco/404. Cronómetro absoluto (timeLeftEdicaoSegundos +
// edicoesTick), consistente com o resto do app. Sem lógica de lance/RBAC (só leitura).

import { useParams, Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import EdicaoBanner from "../components/EdicaoBanner.jsx";
import { GlassCard } from "@/components/ui";

const COR = {
  gold: "#f5a623", text: "#e8f0fe", muted: "#94a3b8",
  success: "#10b981", warning: "#f97316", danger: "#ef4444",
};

function formatarTempoEdicao(segundos, tipo) {
  const t = Math.max(0, Number.isFinite(segundos) ? segundos : 0);
  const pad = (n) => String(n).padStart(2, "0");
  if (tipo === "relampago") return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (d > 0) return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function VoltarLink() {
  return (
    <Link to="/" style={{ color: COR.gold, textDecoration: "none", fontWeight: 700, fontSize: "0.85rem" }}>
      ← Voltar ao início
    </Link>
  );
}

export default function EdicaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { edicoes, edicoesTick, timeLeftEdicaoSegundos, EDICAO_ATIVA } = useAppContext();

  void edicoesTick; // re-render por segundo (cronómetro absoluto).
  const edicao = edicoes?.[id] || null;

  const wrap = { padding: isMobile ? "1rem" : "1.5rem 2rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" };

  if (!edicao) {
    return (
      <div style={wrap}>
        <VoltarLink />
        <GlassCard className={isMobile ? "p-4" : "p-6"}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 900, color: COR.gold, fontFamily: "'Orbitron', sans-serif" }}>
            Edição não encontrada
          </h1>
          <p style={{ margin: 0, color: COR.muted, fontSize: "0.9rem", lineHeight: 1.5 }}>
            A edição <strong style={{ color: COR.text }}>{id}</strong> não está disponível na grelha atual
            (pode ter encerrado). Veja as edições em andamento no início ou vá ao mercado de lances.
          </p>
          <button
            onClick={() => navigate("/mercado")}
            style={{
              marginTop: "1rem", padding: "0.7rem 1rem", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg,#f5a623,#e89400)", color: "#0a0f1a",
              fontWeight: 800, cursor: "pointer", fontSize: "0.85rem",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.04em",
            }}
          >⚡ Ir para o Mercado de Lances</button>
        </GlassCard>
      </div>
    );
  }

  const restante = timeLeftEdicaoSegundos(edicao);
  const encerrada = restante <= 0;
  const tipoLabel = edicao.tipo === "programado" ? "🎫 Programado" : "⚡ Relâmpago";
  const ativa = edicao.id === EDICAO_ATIVA;
  const corTimer = encerrada ? COR.danger : ativa ? COR.success : COR.gold;

  return (
    <div style={wrap}>
      <VoltarLink />
      <GlassCard className={isMobile ? "p-4" : "p-6"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? "1.2rem" : "1.5rem", fontWeight: 900, color: COR.gold, fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.04em" }}>
            Edição {edicao.id}
          </h1>
          <span style={{
            fontSize: "0.7rem", fontWeight: 800,
            color: encerrada ? COR.danger : ativa ? COR.success : COR.gold,
            background: "rgba(245,166,35,0.12)", border: `1px solid ${encerrada ? "rgba(239,68,68,0.4)" : "rgba(245,166,35,0.35)"}`,
            borderRadius: "999px", padding: "0.2rem 0.6rem", letterSpacing: "0.04em",
          }}>{encerrada ? "Encerrada" : ativa ? "Ativa" : "Em andamento"}</span>
        </div>

        {/* Banner grande (estático aqui — já estamos na página da edição). */}
        <div style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "0.85rem 1rem",
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.22)",
          borderRadius: "12px",
        }}>
          <EdicaoBanner edicao={edicao} size={isMobile ? 84 : 104} radius={12} clicavel={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              {tipoLabel}
            </div>
            <div style={{ fontSize: isMobile ? "1rem" : "1.1rem", color: COR.gold, fontWeight: 800, lineHeight: 1.25, marginTop: "0.2rem" }}>
              {edicao.produto ? edicao.produto : "Prêmio a anunciar"}
            </div>
            <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.2rem" }}>
              {edicao.lances ?? 0} lance(s) registrado(s)
            </div>
          </div>
        </div>

        {/* Cronómetro */}
        <div style={{ textAlign: "center", margin: "1.25rem 0 0.5rem" }}>
          <div style={{
            fontSize: isMobile ? "2.4rem" : "2.75rem", fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace", color: corTimer, lineHeight: 1,
          }}>{formatarTempoEdicao(restante, edicao.tipo)}</div>
          <div style={{ fontSize: "0.72rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: "0.4rem" }}>
            {encerrada ? "Leilão encerrado" : "Tempo restante"}
          </div>
        </div>

        <button
          onClick={() => navigate("/mercado")}
          style={{
            marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "10px", border: "none",
            background: encerrada ? "rgba(245,166,35,0.18)" : "linear-gradient(135deg,#f5a623,#e89400)",
            color: encerrada ? COR.gold : "#0a0f1a", fontWeight: 800, cursor: "pointer",
            fontSize: "0.9rem", width: "100%", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.04em",
          }}
        >⚡ Ir para o Mercado de Lances</button>
      </GlassCard>
    </div>
  );
}
