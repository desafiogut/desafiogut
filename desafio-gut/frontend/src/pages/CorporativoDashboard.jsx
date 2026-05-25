// MC11 — Painel do Lojista (Usuário Corporativo).
// Exibe cards de cotas ativas, banners ativos, impressões e saldo wallet.
// Dados via /cotas + /banners + /corporativo-analytics (endpoint MC11).
// Acesso gated em App.jsx — usuário comum é redirecionado para "/".

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import GutoAvatar from "../components/GutoAvatar.jsx";

const COR = {
  primary: "#f5a623", text: "#e8f0fe", muted: "#5a7090",
  success: "#10b981", amber: "#fbbf24", teal: "#00d4aa",
};

export default function CorporativoDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    address, authToken,
    cotaCorporativa, tipoUsuario,
    saldoRsCentavos,
  } = useAppContext();

  const [bannerInfo, setBannerInfo] = useState({ app: null, site: null });
  const [analytics,  setAnalytics]  = useState(null);

  // Carrega banners (app + site) + analytics agregados.
  useEffect(() => {
    if (!address) return;
    let cancel = false;
    (async () => {
      try {
        const [respApp, respSite] = await Promise.all([
          fetch(`/.netlify/functions/banners?cliente_id=${address}&formato=app`),
          fetch(`/.netlify/functions/banners?cliente_id=${address}&formato=site`),
        ]);
        if (cancel) return;
        const app  = respApp.ok  ? await respApp.json()  : null;
        const site = respSite.ok ? await respSite.json() : null;
        setBannerInfo({ app, site });
      } catch (err) {
        console.warn("[CorporativoDashboard] banners falhou:", err?.message);
      }
    })();
    return () => { cancel = true; };
  }, [address]);

  useEffect(() => {
    if (!address || !authToken) return;
    let cancel = false;
    (async () => {
      try {
        const resp = await fetch(
          `/.netlify/functions/corporativo-analytics?endereco=${address}&periodo=30`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );
        if (!resp.ok || cancel) return;
        const data = await resp.json();
        if (!cancel) setAnalytics(data);
      } catch (err) {
        console.warn("[CorporativoDashboard] analytics falhou:", err?.message);
      }
    })();
    return () => { cancel = true; };
  }, [address, authToken]);

  const nomeEmpresa = cotaCorporativa?.cliente_nome || "Lojista";
  const categoria   = cotaCorporativa?.categoria    || "—";
  const bannersAtivos =
    (bannerInfo.app?.fonte && bannerInfo.app.fonte !== "auto" ? 1 : 0) +
    (bannerInfo.site?.fonte && bannerInfo.site.fonte !== "auto" ? 1 : 0);
  const impressoes = analytics?.totais?.impressoes ?? 0;
  const saldoBrl   = saldoRsCentavos == null ? "—" : `R$ ${(saldoRsCentavos / 100).toFixed(2)}`;

  const cardStyle = {
    background: "rgba(10,16,42,0.6)",
    border: "1px solid rgba(245,166,35,0.18)",
    borderRadius: "16px",
    padding: isMobile ? "1rem" : "1.25rem",
    backdropFilter: "blur(16px)",
  };

  const cards = [
    { label: "Cota ativa",     value: categoria.toUpperCase(),  color: COR.primary, icon: "📢", to: "/corporativo/cotas" },
    { label: "Banners ativos", value: bannersAtivos,            color: COR.teal,    icon: "🖼️", to: "/corporativo/banners" },
    { label: "Impressões 30d", value: impressoes.toLocaleString("pt-BR"), color: COR.amber, icon: "📊", to: "/corporativo/analytics" },
    { label: "Saldo wallet",   value: saldoBrl,                 color: COR.success, icon: "💰", to: "/carteira" },
  ];

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.25rem", flex: 1 }}>
      <header style={{ marginBottom: isMobile ? "1.25rem" : "2rem" }}>
        <div style={{ marginBottom: "0.6rem" }}>
          <GutoAvatar custom="corp-dashboard-determinado" size={isMobile ? 40 : 52} animate />
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.3rem 0.7rem",
          background: "rgba(245,166,35,0.12)",
          border: "1px solid rgba(245,166,35,0.3)",
          borderRadius: "999px", color: COR.primary,
          fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.06em",
          marginBottom: "0.6rem",
        }}>
          🏢 PAINEL DO LOJISTA
        </div>
        <h1 style={{
          margin: 0, fontSize: isMobile ? "1.3rem" : "1.6rem",
          fontWeight: 900, color: COR.text,
        }}>
          {nomeEmpresa}
        </h1>
        <p style={{ margin: "0.35rem 0 0", color: COR.muted, fontSize: "0.85rem" }}>
          Tipo de usuário: <strong style={{ color: COR.primary }}>{tipoUsuario}</strong>
          {address && <> · {address.slice(0, 8)}…{address.slice(-4)}</>}
        </p>
      </header>

      <section style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))",
        gap: isMobile ? "0.75rem" : "1rem",
        marginBottom: isMobile ? "1.25rem" : "2rem",
      }}>
        {cards.map(({ label, value, color, icon, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            style={{
              ...cardStyle, textAlign: "left", cursor: "pointer",
              display: "flex", flexDirection: "column", gap: "0.35rem",
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>{icon}</span>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, color }}>{value}</span>
            <span style={{ fontSize: "0.72rem", color: COR.muted, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </section>

      <section style={{ ...cardStyle, marginBottom: "1rem" }}>
        <h3 style={{
          margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 800,
          color: COR.primary, letterSpacing: "0.04em",
        }}>
          📅 Próximas aparições
        </h3>
        <p style={{ margin: 0, color: COR.text, fontSize: "0.9rem", lineHeight: 1.5 }}>
          Seus banners serão exibidos hoje às <strong>11h</strong>, <strong>15h</strong> e <strong>19h</strong>.
          Veja a grade completa em{" "}
          <button
            onClick={() => navigate("/programacao")}
            style={{ background: "none", border: "none", color: COR.teal, cursor: "pointer", textDecoration: "underline" }}
          >
            Programação
          </button>.
        </p>
      </section>
    </div>
  );
}
