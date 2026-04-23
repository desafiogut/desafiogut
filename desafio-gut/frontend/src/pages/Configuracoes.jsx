import { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#93c5fd", gold: "#f5a623",
};

export default function Configuracoes() {
  const { isConnected, address, userLabel, desconectar, abrirModal, authenticated, MOCK_MODE } = useAppContext();

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

  return (
    <div style={{ padding: "2rem", flex: 1 }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: "900", color: COR.text }}>
        ⚙️ Configurações
      </h1>
      <p style={{ margin: "0 0 2rem", color: COR.muted, fontSize: "0.88rem" }}>
        Ajustes de conta, notificações e preferências do DesafioGUT.
      </p>

      {/* ── Conta ── */}
      <div style={{ ...estilos.card, marginBottom: "1.5rem" }}>
        <h3 style={estilos.cardTitulo}>👤 Conta</h3>
        {isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={estilos.infoRow}>
              <span style={estilos.infoLabel}>Usuário</span>
              <span style={estilos.infoValue}>{userLabel || "—"}</span>
            </div>
            <div style={estilos.infoRow}>
              <span style={estilos.infoLabel}>Carteira</span>
              <span style={{ ...estilos.infoValue, fontFamily: "monospace", fontSize: "0.78rem" }}>
                {address}
              </span>
            </div>
            <div style={estilos.infoRow}>
              <span style={estilos.infoLabel}>Tipo de Auth</span>
              <span style={estilos.infoValue}>
                {MOCK_MODE ? "🧪 Mock Beta" : "Privy Embedded Wallet"}
              </span>
            </div>
            <div style={estilos.infoRow}>
              <span style={estilos.infoLabel}>Status</span>
              <span style={{ ...estilos.infoValue, color: COR.success }}>✅ Conectado</span>
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={desconectar} style={{
                padding: "0.55rem 1.2rem", background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px",
                color: COR.danger, cursor: "pointer", fontWeight: "700", fontSize: "0.82rem",
              }}>
                🚪 Desconectar conta
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: COR.muted, marginBottom: "1rem", fontSize: "0.85rem" }}>
              Faça login para acessar as configurações da sua conta.
            </p>
            <button onClick={abrirModal} style={{
              padding: "0.65rem 1.4rem", background: "linear-gradient(135deg,#f5a623,#f97316)",
              border: "none", borderRadius: "20px", color: "#030f24",
              fontWeight: "800", cursor: "pointer", fontSize: "0.88rem",
            }}>
              ⚡ Aceito o DesafioGUT — Entrar
            </button>
          </div>
        )}
      </div>

      {/* ── Notificações ── */}
      <div style={{ ...estilos.card, marginBottom: "1.5rem" }}>
        <h3 style={estilos.cardTitulo}>🔔 Notificações <span style={{ fontSize: "0.65rem", color: COR.gold, marginLeft: "0.5rem" }}>EM BREVE</span></h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {[
            { label: "Novos lances na edição",    value: notifLances,   setter: setNotifLances   },
            { label: "Resultado do vencedor",     value: notifVencedor, setter: setNotifVencedor  },
            { label: "Confirmação de depósito PIX", value: notifPix,     setter: setNotifPix      },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.84rem", color: COR.text }}>{label}</span>
              <button
                onClick={() => setter((v) => !v)}
                style={{
                  width: "44px", height: "24px", borderRadius: "12px", border: "none",
                  background: value ? COR.primary : "rgba(255,255,255,0.1)",
                  cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
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

      {/* ── Preferências ── */}
      <div style={{ ...estilos.card, marginBottom: "1.5rem" }}>
        <h3 style={estilos.cardTitulo}>🌐 Preferências</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Idioma */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.84rem", color: COR.text }}>Idioma</span>
            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              style={{
                background: "rgba(3,15,36,0.8)", border: "1px solid rgba(37,99,235,0.25)",
                borderRadius: "8px", color: COR.blue300, padding: "0.35rem 0.75rem",
                fontSize: "0.82rem", cursor: "pointer",
              }}
            >
              <option value="pt-BR">🇧🇷 Português (Brasil)</option>
              <option value="en-US">🇺🇸 English (US)</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </div>
          {/* Tema */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.84rem", color: COR.text }}>Tema</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[{ id: "dark", label: "🌙 Dark" }, { id: "light", label: "☀️ Light (em breve)" }].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => id === "dark" && setTema(id)}
                  disabled={id !== "dark"}
                  style={{
                    padding: "0.3rem 0.75rem", borderRadius: "8px",
                    border: `1px solid ${tema === id ? COR.primary : "rgba(37,99,235,0.2)"}`,
                    background: tema === id ? COR.primaryDim : "transparent",
                    color: tema === id ? COR.blue300 : COR.muted,
                    cursor: id === "dark" ? "pointer" : "not-allowed",
                    fontSize: "0.78rem", fontWeight: "600", opacity: id !== "dark" ? 0.5 : 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sobre ── */}
      <div style={estilos.card}>
        <h3 style={estilos.cardTitulo}>ℹ️ Sobre o DesafioGUT</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem", color: COR.muted }}>
          <div>Versão: <span style={{ color: COR.blue300 }}>Beta v0.9</span></div>
          <div>Stack: React 18 · Vite 8 · Tailwind CSS v4 · Privy · Ethers.js v6</div>
          <div>Rede: Ethereum Sepolia Testnet</div>
          <div>CNPJ: 23.040.066/0001-00 — Grupo União e Trabalho</div>
          <div>Implantação: <span style={{ color: COR.gold }}>1º de junho de 2026</span></div>
          <div style={{ marginTop: "0.5rem" }}>
            <a href="https://www.grupouniaoetrabalho.com.br" target="_blank" rel="noopener noreferrer" style={{ color: COR.blue300 }}>
              www.grupouniaoetrabalho.com.br ↗
            </a>
          </div>
        </div>
      </div>

      {/* ── Salvar ── */}
      <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSalvar}
          style={{
            padding: "0.7rem 1.8rem",
            background: salvo ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
            border: salvo ? "1px solid rgba(16,185,129,0.4)" : "none",
            borderRadius: "20px", color: salvo ? COR.success : "#fff",
            fontWeight: "800", cursor: "pointer", fontSize: "0.88rem",
            transition: "all 0.2s", boxShadow: salvo ? "none" : "0 4px 14px rgba(37,99,235,0.35)",
          }}
        >
          {salvo ? "✅ Salvo!" : "💾 Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}

const estilos = {
  card: {
    background: "rgba(8,24,64,0.6)", border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: "16px", padding: "1.25rem",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  },
  cardTitulo:  { margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: "800", color: "#93c5fd" },
  infoRow:     { display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0.5rem 0", borderBottom: "1px solid rgba(37,99,235,0.08)" },
  infoLabel:   { fontSize: "0.78rem", color: "#4a6490", fontWeight: "600" },
  infoValue:   { fontSize: "0.84rem", color: "#e8f0fe", fontWeight: "500", textAlign: "right", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis" },
};
