// MC11 — Gestão de Cotas do Lojista.
// Lista as cotas do lojista (Bronze/Prata/Ouro/Diamante) com botões
// Renovar (→ /carteira) e Upgrade (→ contato). Dados via GET /cotas?cliente_id=.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR_CATEGORIA = {
  bronze:   "#cd7f32",
  prata:    "#cbd5e1",
  ouro:     "#f5a623",
  diamante: "#00d4ff",
};

const MIN_POR_CATEGORIA = {
  bronze: 660, prata: 1350, ouro: 2250, diamante: 4500,
};

const ORDEM_UPGRADE = ["bronze", "prata", "ouro", "diamante"];

export default function CorporativoCotas() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { address, cotaCorporativa, detectarTipoCorporativo } = useAppContext();
  const [cota,    setCota]    = useState(cotaCorporativa);
  const [loading, setLoading] = useState(!cotaCorporativa);

  useEffect(() => {
    if (!address) return;
    let cancel = false;
    (async () => {
      try {
        const resp = await fetch(`/.netlify/functions/cotas?cliente_id=${address}`);
        if (cancel) return;
        if (resp.status === 404) { setCota(null); setLoading(false); return; }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!cancel) { setCota(data); setLoading(false); }
      } catch (err) {
        console.warn("[CorporativoCotas] falhou:", err?.message);
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [address]);

  const handleRenovar = () => navigate("/corporativo/carteira");
  const handleUpgrade = () => {
    detectarTipoCorporativo();
    alert("Upgrade de cota requer aprovação da coordenação. Entre em contato.");
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(245,166,35,0.18)",
    borderRadius: "16px",
    padding: isMobile ? "1rem" : "1.25rem",
    backdropFilter: "blur(16px)",
  };

  const proximaCategoria = (() => {
    if (!cota?.categoria) return null;
    const i = ORDEM_UPGRADE.indexOf(cota.categoria);
    if (i < 0 || i === ORDEM_UPGRADE.length - 1) return null;
    return ORDEM_UPGRADE[i + 1];
  })();

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.25rem", flex: 1 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#e8f0fe" }}>
          📢 Minhas Cotas
        </h1>
        <p style={{ margin: "0.35rem 0 0", color: "#5a7090", fontSize: "0.85rem" }}>
          Categorias contratadas e ações disponíveis.
        </p>
      </header>

      {loading ? (
        <div style={{ ...cardStyle, color: "#5a7090" }}>Carregando cota…</div>
      ) : !cota ? (
        <div style={{ ...cardStyle, color: "#5a7090" }}>
          Nenhuma cota ativa. Fale com a coordenação para contratar uma.
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#5a7090", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                Categoria
              </div>
              <div style={{
                fontSize: "1.8rem", fontWeight: 900,
                color: COR_CATEGORIA[cota.categoria] || "#f5a623",
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                {cota.categoria}
              </div>
            </div>
            <div style={{
              padding: "0.3rem 0.7rem",
              borderRadius: "999px",
              background: cota.vendida ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
              border: cota.vendida ? "1px solid #10b981" : "1px solid #ef4444",
              color: cota.vendida ? "#10b981" : "#ef4444",
              fontSize: "0.7rem", fontWeight: 800,
            }}>
              {cota.vendida ? "ATIVA" : "INATIVA"}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <Info label="Produto" value={cota.produto_nome || "—"} />
            <Info label="Valor"   value={cota.valor != null ? `R$ ${Number(cota.valor).toFixed(2)}` : "—"} />
            <Info label="Mínimo da categoria" value={`R$ ${MIN_POR_CATEGORIA[cota.categoria]?.toFixed(2) || "—"}`} />
            <Info label="Atualizado" value={cota.atualizadoEm ? new Date(cota.atualizadoEm).toLocaleDateString("pt-BR") : "—"} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={handleRenovar} style={btn("#f5a623")}>🔄 Renovar cota</button>
            {proximaCategoria && (
              <button onClick={handleUpgrade} style={btn("#00d4aa")}>
                ⬆️ Upgrade para {proximaCategoria.toUpperCase()}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: "0.65rem", color: "#5a7090", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: "0.95rem", color: "#e8f0fe", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function btn(cor) {
  return {
    padding: "0.6rem 1rem",
    background: `linear-gradient(135deg, ${cor}, ${cor}dd)`,
    border: "none", borderRadius: "10px",
    color: "#0a0f1a", fontWeight: 800, cursor: "pointer",
    fontSize: "0.85rem", letterSpacing: "0.03em",
  };
}
