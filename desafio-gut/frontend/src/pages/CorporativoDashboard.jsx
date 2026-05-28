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
    saldoRsCentavos, atualizarTipoCorporativo,
  } = useAppContext();

  const [bannerInfo, setBannerInfo] = useState({ app: null, site: null });
  const [analytics,  setAnalytics]  = useState(null);

  // MC14.10.1 ITEM 5 — edição inline do painel lojista
  const [editando,   setEditando]   = useState(false);
  const [editEmpresa, setEditEmpresa]  = useState("");
  const [editSegmento, setEditSegmento] = useState("");
  const [editSite,   setEditSite]    = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editEmail,  setEditEmail]   = useState("");
  const [salvando,   setSalvando]    = useState(false);
  const [editErro,   setEditErro]    = useState(null);
  const [editOk,     setEditOk]      = useState(false);

  const iniciarEdicao = () => {
    setEditEmpresa(cotaCorporativa?.empresa || "");
    setEditSegmento(cotaCorporativa?.segmento || "Outro");
    setEditSite(cotaCorporativa?.site || "");
    setEditLogoUrl(cotaCorporativa?.logoUrl || "");
    setEditEmail(cotaCorporativa?.email || "");
    setEditErro(null);
    setEditOk(false);
    setEditando(true);
  };

  const salvarEdicao = async () => {
    if (!editEmpresa.trim()) { setEditErro("Nome da empresa é obrigatório."); return; }
    setSalvando(true);
    setEditErro(null);
    try {
      const clienteId = cotaCorporativa?.cliente_id;
      const resp = await fetch("/.netlify/functions/cotas?action=update-corporativo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          empresa: editEmpresa.trim(),
          segmento: editSegmento,
          site: editSite.trim() || null,
          logoUrl: editLogoUrl.trim() || null,
          email: editEmail.trim().toLowerCase(),
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Erro ao salvar.");
      }
      const atualizado = await resp.json();
      atualizarTipoCorporativo(atualizado);
      setEditOk(true);
      setEditando(false);
    } catch (err) {
      setEditErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

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

  const inputStyle = {
    padding: "0.5rem 0.7rem",
    background: "rgba(5,13,30,0.8)",
    border: "1px solid rgba(245,166,35,0.25)",
    borderRadius: "8px",
    color: "#e8f0fe",
    fontSize: "0.85rem",
    outline: "none",
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
          <GutoAvatar custom="corp-dashboard-determinado" size={isMobile ? 32 : 40} animate />
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.7rem", background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: "999px", color: COR.primary, fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.06em" }}>
            🏢 PAINEL DO LOJISTA
          </div>
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

      {/* MC14.10.1 ITEM 5 — Painel editável */}
      <section style={{ ...cardStyle, marginBottom: isMobile ? "5rem" : "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editando ? "0.75rem" : 0 }}>
          <h3 style={{
            margin: 0, fontSize: "0.85rem", fontWeight: 800,
            color: COR.teal, letterSpacing: "0.04em",
          }}>
            ✏️ Dados da Empresa
          </h3>
          {!editando && (
            <button
              type="button"
              onClick={iniciarEdicao}
              style={{
                padding: "0.35rem 0.85rem",
                background: "rgba(0,212,170,0.12)",
                border: "1px solid rgba(0,212,170,0.3)",
                borderRadius: "8px", color: COR.teal,
                fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
              }}
            >
              Editar
            </button>
          )}
        </div>

        {editando && (
          <form onSubmit={(e) => { e.preventDefault(); salvarEdicao(); }} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: COR.muted }}>
                Empresa *
                <input value={editEmpresa} onChange={(e) => setEditEmpresa(e.target.value)}
                  placeholder="Nome da empresa"
                  style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: COR.muted }}>
                Segmento
                <select value={editSegmento} onChange={(e) => setEditSegmento(e.target.value)} style={inputStyle}>
                  {["Varejo","Atacado","Serviços","Indústria","Tecnologia","Alimentação","Saúde","Educação","Outro"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: COR.muted }}>
                Site
                <input value={editSite} onChange={(e) => setEditSite(e.target.value)}
                  placeholder="https://..." style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: COR.muted }}>
                Logo URL
                <input value={editLogoUrl} onChange={(e) => setEditLogoUrl(e.target.value)}
                  placeholder="https://...logo.png" style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: COR.muted, gridColumn: isMobile ? "auto" : "1 / -1" }}>
                Email
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="contato@empresa.com" style={inputStyle} />
              </label>
            </div>
            {editErro && <p style={{ margin: 0, color: "#ef4444", fontSize: "0.78rem" }}>{editErro}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" disabled={salvando}
                style={{
                  padding: "0.5rem 1.25rem",
                  background: `linear-gradient(135deg, ${COR.teal}, #00a888)`,
                  border: "none", borderRadius: "8px", color: "#0a0f1a",
                  fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                  opacity: salvando ? 0.6 : 1,
                }}
              >
                {salvando ? "Salvando…" : "💾 Salvar"}
              </button>
              <button type="button" onClick={() => setEditando(false)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent", border: "1px solid rgba(245,166,35,0.25)",
                  borderRadius: "8px", color: COR.muted, fontSize: "0.82rem", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {!editando && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.82rem" }}>
            <span style={{ color: COR.muted }}>Empresa: <strong style={{ color: COR.text }}>{cotaCorporativa?.empresa || "—"}</strong></span>
            <span style={{ color: COR.muted }}>Segmento: <strong style={{ color: COR.text }}>{cotaCorporativa?.segmento || "—"}</strong></span>
            <span style={{ color: COR.muted }}>Site: <strong style={{ color: COR.text }}>{cotaCorporativa?.site || "—"}</strong></span>
            <span style={{ color: COR.muted }}>Email: <strong style={{ color: COR.text }}>{cotaCorporativa?.email || "—"}</strong></span>
          </div>
        )}
        {editOk && <p style={{ margin: "0.5rem 0 0", color: COR.success, fontSize: "0.78rem", fontWeight: 600 }}>✅ Dados atualizados com sucesso!</p>}
      </section>
    </div>
  );
}
