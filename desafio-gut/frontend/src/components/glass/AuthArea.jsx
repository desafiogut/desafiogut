// MC66 — AuthArea extraída de MercadoLances.jsx (sem mudança de comportamento).
// Login (Privy via abrirModal) ou chip de status conectado + badges LGPD/Beta.
import { COR } from "./glassTokens.js";
import { LABEL_LOGIN } from "../BotaoLoginPrincipal.jsx";

const badgeStyle = {
  padding: "0.18rem 0.6rem",
  background: COR.primaryDim,
  borderRadius: "20px",
  fontSize: "0.68rem",
  border: "1px solid rgba(255,107,53,0.28)",
  color: COR.gold,
};

export default function AuthArea({ isConnected, ready, address, userLabel, onLogin, compact }) {
  if (!isConnected) {
    return (
      <button
        onClick={onLogin}
        disabled={!ready}
        style={{
          padding: compact ? "0.45rem 0.9rem" : "0.6rem 1.4rem",
          background: "linear-gradient(135deg,#ff6b35,#1d40af)",
          color: "#fff", border: "none", borderRadius: "28px",
          fontWeight: "800", fontSize: compact ? "0.78rem" : "0.88rem",
          letterSpacing: "0.03em",
          cursor: ready ? "pointer" : "wait",
          opacity: ready ? 1 : 0.7,
          boxShadow: "0 4px 14px rgba(255,107,53,0.4)",
          flexShrink: 0,
        }}
        aria-label={LABEL_LOGIN}
      >{ready ? LABEL_LOGIN : "⏳"}</button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: compact ? 0 : "0.5rem" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.45rem",
        background: COR.primaryDim, padding: compact ? "0.35rem 0.7rem" : "0.45rem 1rem",
        borderRadius: "28px",
        border: "1px solid rgba(255,107,53,0.30)",
      }}>
        <span style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: COR.success, flexShrink: 0,
          boxShadow: `0 0 6px ${COR.success}`,
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
          {userLabel && !compact && (
            <span style={{
              fontSize: "0.72rem", color: COR.gold, fontWeight: "700",
              maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{userLabel}</span>
          )}
          {address && (
            <span style={{ fontFamily: "monospace", fontSize: compact ? "0.74rem" : "0.82rem" }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <span style={badgeStyle}>🔒 LGPD</span>
          <span style={badgeStyle}>🧪 Beta</span>
        </div>
      )}
    </div>
  );
}
