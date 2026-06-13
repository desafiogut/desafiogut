// MC11 — Gestão de Banners do Lojista.
// Lista banners (app 800x200 e site 1200x300) do lojista com thumbnail,
// status, impressões e cliques. Dados via GET /banners?cliente_id=&formato=.
// Pausar/Ativar é controle local (placeholder UI — backend não exposto).

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useTrocarPorSenhas } from "../hooks/useTrocarPorSenhas.js";
// MC17.3 — upload de banner realocado da MinhaCarteira (utilizador comum) para
// o mundo lojista. O botão "Novo banner" deixa de navegar para /carteira.
import BannerUpload from "../components/BannerUpload.jsx";

const COR = { text: "#e8f0fe", muted: "#5a7090", primary: "#f5a623", success: "#10b981" };

export default function CorporativoBanners() {
  const isMobile = useIsMobile();
  const { address, authToken } = useAppContext();
  const { getAuthToken } = useTrocarPorSenhas(); // lance-auth para o POST /banners

  const [banners,  setBanners]  = useState({ app: null, site: null });
  const [analytics, setAnalytics] = useState(null);
  const [pausas,    setPausas]    = useState({ app: false, site: false });
  const [mostrarUpload, setMostrarUpload] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancel = false;
    (async () => {
      const carregar = async (formato) => {
        try {
          const resp = await fetch(`/.netlify/functions/banners?cliente_id=${address}&formato=${formato}`);
          if (!resp.ok) return null;
          return await resp.json();
        } catch { return null; }
      };
      const [app, site] = await Promise.all([carregar("app"), carregar("site")]);
      if (!cancel) setBanners({ app, site });
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
        console.warn("[CorporativoBanners] analytics falhou:", err?.message);
      }
    })();
    return () => { cancel = true; };
  }, [address, authToken]);

  const togglePausa = (formato) =>
    setPausas((p) => ({ ...p, [formato]: !p[formato] }));

  const cardStyle = {
    background: "rgba(255,255,255, var(--glass-opacity, 0.03))",
    border: "1px solid rgba(245,166,35,0.18)",
    borderRadius: "16px",
    padding: isMobile ? "1rem" : "1.25rem",
    backdropFilter: "blur(16px)",
  };

  const formatosCfg = [
    { key: "app",  rotulo: "App (800×200)",   dimensao: "800×200" },
    { key: "site", rotulo: "Site (1200×300)", dimensao: "1200×300" },
  ];

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.25rem", flex: 1 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: COR.text }}>
          🖼️ Meus Banners
        </h1>
        <p style={{ margin: "0.35rem 0 0", color: COR.muted, fontSize: "0.85rem" }}>
          Banner publicitário em dois formatos (app + site). Auto-gerado quando não há upload.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {formatosCfg.map(({ key, rotulo, dimensao }) => {
          const banner = banners[key];
          const isAuto = banner?.fonte === "auto";
          const pausado = pausas[key];
          const impress = analytics?.banners?.[key]?.impressoes ?? 0;
          const cliques = analytics?.banners?.[key]?.cliques ?? 0;
          return (
            <div key={key} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: COR.primary }}>
                  {rotulo}
                </h3>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 800,
                  padding: "0.25rem 0.7rem", borderRadius: "999px",
                  background: pausado ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                  color: pausado ? "#ef4444" : COR.success,
                  border: `1px solid ${pausado ? "#ef4444" : COR.success}`,
                }}>
                  {pausado ? "PAUSADO" : isAuto ? "AUTO-GERADO" : "PUBLICADO"}
                </span>
              </div>

              <div style={{
                width: "100%",
                aspectRatio: key === "app" ? "4 / 1" : "4 / 1",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "10px", overflow: "hidden", marginBottom: "0.75rem",
                border: "1px solid rgba(245,166,35,0.12)",
              }}>
                {banner?.svg && (
                  <div
                    dangerouslySetInnerHTML={{ __html: banner.svg }}
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
                {banner?.imagemBase64 && !banner?.svg && (
                  <img
                    src={`data:${banner.mime || "image/png"};base64,${banner.imagemBase64}`}
                    alt={rotulo}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "0.5rem", marginBottom: "0.75rem",
              }}>
                <Metric label="Dimensão"   value={dimensao} />
                <Metric label="Impressões" value={impress.toLocaleString("pt-BR")} />
                <Metric label="Cliques"    value={cliques.toLocaleString("pt-BR")} />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => togglePausa(key)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: pausado ? COR.success : "#ef4444",
                    color: "#0a0f1a", border: "none", borderRadius: "8px",
                    fontWeight: 800, cursor: "pointer", fontSize: "0.8rem",
                  }}
                >
                  {pausado ? "▶️ Ativar" : "⏸️ Pausar"}
                </button>
                <button
                  onClick={() => setMostrarUpload(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: COR.primary, color: "#0a0f1a",
                    border: "none", borderRadius: "8px",
                    fontWeight: 800, cursor: "pointer", fontSize: "0.8rem",
                  }}
                >
                  📤 Novo banner
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MC17.3 — Upload de banner (realocado do comum). Abre on-demand pelo
          botão "Novo banner"; usa lance-auth (getAuthToken) para o POST /banners. */}
      {mostrarUpload && (
        <div style={{ marginTop: "1rem" }}>
          <BannerUpload endereco={address} isMobile={isMobile} getAuthToken={getAuthToken} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{
      background: "rgba(245,166,35,0.07)",
      border: "1px solid rgba(245,166,35,0.15)",
      borderRadius: "8px", padding: "0.5rem 0.65rem",
    }}>
      <div style={{ fontSize: "0.62rem", color: "#5a7090", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: "0.9rem", color: "#e8f0fe", fontWeight: 800 }}>{value}</div>
    </div>
  );
}
