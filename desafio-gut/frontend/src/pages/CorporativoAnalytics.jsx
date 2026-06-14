// MC11 — Analytics Corporativo.
// Métricas agregadas do lojista (impressões, cliques, conversão) com
// seletor de período 7/30/90 dias. Backend: /corporativo-analytics.

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";

const COR = {
  text: "#e8f0fe", muted: "#6b7db8", primary: "#f5a623",
  success: "#10b981", teal: "#00d4aa", amber: "#fbbf24",
};

const PERIODOS = [
  { dias: 7,  rotulo: "7 dias"  },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

export default function CorporativoAnalytics() {
  const isMobile = useIsMobile();
  const { address, authToken } = useAppContext();
  const [periodo, setPeriodo]   = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [erro,      setErro]      = useState(null);

  useEffect(() => {
    if (!address || !authToken) return;
    let cancel = false;
    setAnalytics(null);
    setErro(null);
    (async () => {
      try {
        const resp = await fetch(
          `/.netlify/functions/corporativo-analytics?endereco=${address}&periodo=${periodo}`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );
        if (cancel) return;
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`HTTP ${resp.status} ${txt.slice(0, 120)}`);
        }
        const data = await resp.json();
        if (!cancel) setAnalytics(data);
      } catch (err) {
        console.warn("[CorporativoAnalytics] falhou:", err?.message);
        if (!cancel) setErro(err?.message || "falha");
      }
    })();
    return () => { cancel = true; };
  }, [address, authToken, periodo]);

  const cardCls = isMobile ? "p-4" : "p-5";
  const cardStyle = {
    background: "rgba(13,18,53,0.25)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "16px",
    padding: isMobile ? "1rem" : "1.25rem",
    backdropFilter: "blur(24px) saturate(135%)",
    WebkitBackdropFilter: "blur(24px) saturate(135%)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(255,255,255,0.05)",
  };

  const impressoes  = analytics?.totais?.impressoes ?? 0;
  const cliques     = analytics?.totais?.cliques ?? 0;
  const conversoes  = analytics?.totais?.conversoes ?? 0;
  const taxaCtr     = impressoes > 0 ? (cliques / impressoes) * 100 : 0;
  const taxaConv    = cliques > 0 ? (conversoes / cliques) * 100 : 0;
  const porBanner   = analytics?.banners || {};
  const maxImpress  = Math.max(1,
    porBanner.app?.impressoes || 0,
    porBanner.site?.impressoes || 0,
  );

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.25rem", flex: 1 }}>
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: COR.text }}>
          📊 Analytics
        </h1>
        <p style={{ margin: "0.35rem 0 0", color: COR.muted, fontSize: "0.85rem" }}>
          Métricas de exposição dos seus banners no DesafioGUT.
        </p>
      </header>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {PERIODOS.map(({ dias, rotulo }) => (
          <button
            key={dias}
            onClick={() => setPeriodo(dias)}
            style={{
              padding: "0.5rem 1rem",
              background: periodo === dias ? COR.primary : "transparent",
              color: periodo === dias ? "#0a0f1a" : COR.muted,
              border: `1px solid ${periodo === dias ? COR.primary : "rgba(245,166,35,0.3)"}`,
              borderRadius: "10px",
              fontWeight: 800, fontSize: "0.8rem", cursor: "pointer",
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {erro && (
        <div style={{ ...cardStyle, color: "#ef4444", marginBottom: "1rem" }}>
          Erro: {erro}
        </div>
      )}

      <section style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))",
        gap: "0.75rem", marginBottom: "1.25rem",
      }}>
        <MetricaCard label="Impressões" value={impressoes.toLocaleString("pt-BR")} color={COR.primary} icon="👀" />
        <MetricaCard label="Cliques"    value={cliques.toLocaleString("pt-BR")}    color={COR.teal}    icon="🖱️" />
        <MetricaCard label="Taxa CTR"   value={`${taxaCtr.toFixed(2)}%`}            color={COR.amber}   icon="📈" />
        <MetricaCard label="Conversão"  value={`${taxaConv.toFixed(2)}%`}           color={COR.success} icon="✅" />
      </section>

      <section style={{ ...cardStyle, marginBottom: "1rem" }}>
        <h3 style={{ margin: "0 0 0.85rem", fontSize: "0.9rem", color: COR.primary, fontWeight: 800, letterSpacing: "0.03em" }}>
          📊 Impressões por banner
        </h3>
        {["app", "site"].map((k) => {
          const v = porBanner[k]?.impressoes || 0;
          const pct = (v / maxImpress) * 100;
          return (
            <div key={k} style={{ marginBottom: "0.65rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: COR.text, marginBottom: "0.25rem" }}>
                <span>{k === "app" ? "App (800×200)" : "Site (1200×300)"}</span>
                <strong>{v.toLocaleString("pt-BR")}</strong>
              </div>
              <div style={{ height: "10px", background: "rgba(245,166,35,0.08)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${COR.primary}, ${COR.teal})`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          );
        })}
      </section>

      <GlassCard as="section" className={cardCls}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: COR.primary, fontWeight: 800 }}>
          🌎 Distribuição geográfica
        </h3>
        <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem", lineHeight: 1.5 }}>
          Dados de localização vêm do FingerprintJS (MC3) — visitorIds agregados
          por região. {analytics?.geografia?.length
            ? `${analytics.geografia.length} regiões detectadas no período.`
            : "Sem dados suficientes no período selecionado."}
        </p>
      </GlassCard>
    </div>
  );
}

function MetricaCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: "rgba(13,18,53,0.25)",
      border: "1px solid rgba(245,166,35,0.18)",
      borderRadius: "14px",
      padding: "1rem",
      display: "flex", flexDirection: "column", gap: "0.25rem",
    }}>
      <span style={{ fontSize: "1.2rem" }}>{icon}</span>
      <span style={{ fontSize: "1.3rem", fontWeight: 900, color }}>{value}</span>
      <span style={{ fontSize: "0.7rem", color: "#6b7db8", fontWeight: 600 }}>{label}</span>
    </div>
  );
}
