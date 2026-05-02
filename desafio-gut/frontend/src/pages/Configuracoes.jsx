import { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#93c5fd", gold: "#f5a623",
};

export default function Configuracoes() {
  const isMobile = useIsMobile();
  const { isConnected, address, userLabel, desconectar, abrirModal, MOCK_MODE } = useAppContext();

  const [notifLances,    setNotifLances]    = useState(true);
  const [notifVencedor,  setNotifVencedor]  = useState(true);
  const [notifPix,       setNotifPix]       = useState(false);
  const [idioma,         setIdioma]         = useState("pt-BR");
  const [tema,           setTema]           = useState("dark");
  const [salvo,          setSalvo]          = useState(false);

  function handleSalvar() {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  const pad        = isMobile ? "1rem" : "2rem";
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const cardStyle = {
    background: "rgba(8,24,64,0.6)",
    border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: "16px",
    padding: cardPad,
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  };
  const cardTituloStyle = {
    margin: `0 0 ${isMobile ? "0.75rem" : "1rem"}`,
    fontSize: isMobile ? "0.88rem" : "0.9rem",
    fontWeight: "800", color: COR.blue300, letterSpacing: "0.03em",
  };

  return (
    <div style={{ padding: pad, flex: 1 }}>
      <header style={{ marginBottom: sectionGap }}>
        <h1 style={{
          margin: "0 0 0.35rem",
          fontSize: isMobile ? "1.3rem" : "1.5rem",
          fontWeight: "900", color: COR.text, lineHeight: 1.2,
        }}>⚙️ Configurações</h1>
        <p style={{ margin: 0, color: COR.muted, fontSize: isMobile ? "0.82rem" : "0.88rem", lineHeight: 1.4 }}>
          Ajustes de conta, notificações e preferências do DesafioGUT.
        </p>
      </header>

      {/* Conta */}
      <div style={{ ...cardStyle, marginBottom: sectionGap }}>
        <h3 style={cardTituloStyle}>👤 Conta</h3>
        {isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <InfoRow label="Usuário" value={userLabel || "—"} isMobile={isMobile} />
            <InfoRow label="Carteira" value={address} mono breakable isMobile={isMobile} />
            <InfoRow label="Tipo de Auth" value={MOCK_MODE ? "🧪 Mock Beta" : "Privy Embedded Wallet"} isMobile={isMobile} />
            <InfoRow label="Status" value="✅ Conectado" valueColor={COR.success} isMobile={isMobile} />

            <div style={{ marginTop: "0.75rem" }}>
              <button onClick={desconectar} style={{
                width: isMobile ? "100%" : "auto",
                padding: "0.6rem 1.2rem",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "10px",
                color: COR.danger, cursor: "pointer",
                fontWeight: "700", fontSize: "0.84rem",
              }}>🚪 Desconectar conta</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: COR.muted, marginBottom: "1rem", fontSize: isMobile ? "0.85rem" : "0.9rem" }}>
              Faça login para acessar as configurações da sua conta.
            </p>
            <button onClick={abrirModal} style={{
              width: isMobile ? "100%" : "auto",
              padding: "0.7rem 1.4rem",
              background: "linear-gradient(135deg,#f5a623,#f97316)",
              border: "none", borderRadius: "12px", color: "#030f24",
              fontWeight: "800", cursor: "pointer", fontSize: "0.88rem",
              boxShadow: "0 4px 14px rgba(245,166,35,0.35)",
            }}>⚡ Aceito o DesafioGUT — Entrar</button>
          </div>
        )}
      </div>

      {/* Notificações */}
      <div style={{ ...cardStyle, marginBottom: sectionGap }}>
        <h3 style={{ ...cardTituloStyle, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🔔 Notificações</span>
          <span style={{
            fontSize: "0.6rem", color: COR.gold,
            background: "rgba(245,166,35,0.12)",
            border: "1px solid rgba(245,166,35,0.3)",
            padding: "0.15rem 0.5rem", borderRadius: "10px",
            letterSpacing: "0.04em",
          }}>EM BREVE</span>
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {[
            { label: "Novos lances na edição",      value: notifLances,   setter: setNotifLances   },
            { label: "Resultado do vencedor",       value: notifVencedor, setter: setNotifVencedor },
            { label: "Confirmação de depósito PIX", value: notifPix,      setter: setNotifPix      },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
            }}>
              <span style={{ fontSize: isMobile ? "0.84rem" : "0.86rem", color: COR.text }}>{label}</span>
              <button
                onClick={() => setter((v) => !v)}
                aria-pressed={value}
                style={{
                  width: "44px", height: "24px", borderRadius: "12px", border: "none",
                  background: value ? COR.primary : "rgba(255,255,255,0.1)",
                  cursor: "pointer", position: "relative",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <div style={{
                  width: "18px", height: "18px", borderRadius: "50%",
                  background: "#fff", position: "absolute",
                  top: "3px", left: value ? "23px" : "3px",
                  transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preferências */}
      <div style={{ ...cardStyle, marginBottom: sectionGap }}>
        <h3 style={cardTituloStyle}>🌐 Preferências</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Idioma */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: "0.75rem", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: isMobile ? "0.84rem" : "0.86rem", color: COR.text }}>Idioma</span>
            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              style={{
                background: "rgba(3,15,36,0.8)",
                border: "1px solid rgba(37,99,235,0.25)",
                borderRadius: "8px", color: COR.blue300,
                padding: "0.4rem 0.75rem",
                fontSize: "0.82rem", cursor: "pointer",
              }}
            >
              <option value="pt-BR">🇧🇷 Português (Brasil)</option>
              <option value="en-US">🇺🇸 English (US)</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </div>

          {/* Tema */}
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "0.5rem",
          }}>
            <span style={{ fontSize: isMobile ? "0.84rem" : "0.86rem", color: COR.text }}>Tema</span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { id: "dark",  label: "🌙 Dark", enabled: true  },
                { id: "light", label: "☀️ Light (em breve)", enabled: false },
              ].map(({ id, label, enabled }) => (
                <button
                  key={id}
                  onClick={() => enabled && setTema(id)}
                  disabled={!enabled}
                  style={{
                    padding: "0.4rem 0.85rem", borderRadius: "10px",
                    border: `1px solid ${tema === id ? COR.primary : "rgba(37,99,235,0.2)"}`,
                    background: tema === id ? COR.primaryDim : "transparent",
                    color: tema === id ? COR.blue300 : COR.muted,
                    cursor: enabled ? "pointer" : "not-allowed",
                    fontSize: "0.78rem", fontWeight: "600",
                    opacity: enabled ? 1 : 0.5,
                    flex: isMobile ? 1 : "none",
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sobre */}
      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>ℹ️ Sobre o DesafioGUT</h3>
        <div style={{
          display: "flex", flexDirection: "column", gap: "0.5rem",
          fontSize: isMobile ? "0.8rem" : "0.84rem", color: COR.muted, lineHeight: 1.5,
        }}>
          <SobreItem label="Versão" value="Beta v0.9" valueColor={COR.blue300} />
          <SobreItem label="Stack" value="React 18 · Vite 8 · Tailwind v4 · Privy · Ethers v6" />
          <SobreItem label="Rede" value="Ethereum Sepolia Testnet" />
          <SobreItem label="CNPJ" value="23.040.066/0001-00 — Grupo União e Trabalho" />
          <SobreItem label="Implantação" value="1º de junho de 2026" valueColor={COR.gold} />
          <div style={{ marginTop: "0.4rem" }}>
            <a
              href="https://www.grupouniaoetrabalho.com.br"
              target="_blank" rel="noopener noreferrer"
              style={{ color: COR.blue300, fontSize: "0.8rem", wordBreak: "break-all" }}
            >www.grupouniaoetrabalho.com.br ↗</a>
          </div>
        </div>
      </div>

      {/* Salvar */}
      <div style={{
        marginTop: sectionGap,
        display: "flex", justifyContent: isMobile ? "stretch" : "flex-end",
      }}>
        <button
          onClick={handleSalvar}
          style={{
            width: isMobile ? "100%" : "auto",
            padding: "0.8rem 1.8rem",
            background: salvo
              ? "rgba(16,185,129,0.2)"
              : "linear-gradient(135deg,#2563eb,#1d4ed8)",
            border: salvo ? "1px solid rgba(16,185,129,0.4)" : "none",
            borderRadius: "12px",
            color: salvo ? COR.success : "#fff",
            fontWeight: "800", cursor: "pointer", fontSize: "0.88rem",
            transition: "all 0.2s",
            boxShadow: salvo ? "none" : "0 4px 14px rgba(37,99,235,0.35)",
          }}
        >{salvo ? "✅ Salvo!" : "💾 Salvar Configurações"}</button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, breakable, valueColor, isMobile }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile && breakable ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile && breakable ? "stretch" : "center",
      padding: "0.4rem 0",
      borderBottom: "1px solid rgba(37,99,235,0.08)",
      gap: "0.4rem",
    }}>
      <span style={{
        fontSize: "0.74rem", color: "#4a6490", fontWeight: "600",
        flexShrink: 0,
      }}>{label}</span>
      <span style={{
        fontSize: mono ? "0.78rem" : "0.84rem",
        color: valueColor || "#e8f0fe",
        fontWeight: "500",
        textAlign: isMobile && breakable ? "left" : "right",
        fontFamily: mono ? "monospace" : "inherit",
        wordBreak: breakable ? "break-all" : "normal",
        overflow: breakable ? "visible" : "hidden",
        textOverflow: breakable ? "clip" : "ellipsis",
        whiteSpace: breakable ? "normal" : "nowrap",
        maxWidth: breakable ? "100%" : (isMobile ? "210px" : "260px"),
        lineHeight: mono ? 1.4 : 1.3,
      }}>{value}</span>
    </div>
  );
}

function SobreItem({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      <span style={{ fontWeight: "700", color: "#64748b", flexShrink: 0 }}>{label}:</span>
      <span style={{ color: valueColor || "inherit" }}>{value}</span>
    </div>
  );
}
