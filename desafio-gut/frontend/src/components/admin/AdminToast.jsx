// AdminToast — notificação temporária do painel ADM.
// MC89.26 (Fase 2). CSS puro, sem emojis, sem Framer Motion.
// 3 variantes: success (#10b981), error (#ef4444), info (#94a3b8).

const VAR = {
  success: { dot: "#10b981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.30)" },
  error:   { dot: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.30)" },
  info:    { dot: "#94a3b8", bg: "rgba(148,163,184,0.10)",  border: "rgba(148,163,184,0.30)" },
};

export default function AdminToast({ id, variant = "info", message, onDismiss }) {
  const v = VAR[variant] || VAR.info;
  return (
    <div onClick={onDismiss} style={{
      display: "flex", alignItems: "flex-start", gap: "0.45rem",
      padding: "0.55rem 0.75rem", borderRadius: "8px",
      background: v.bg, border: `1px solid ${v.border}`,
      minWidth: "220px", maxWidth: "360px",
      fontSize: "0.74rem", color: "#e8f0fe", lineHeight: 1.4,
      cursor: "pointer",
      animation: "admin-toast-in 0.2s ease-out",
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    }}>
      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: v.dot, marginTop: "0.35rem", flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <span style={{ color: "#64748b", fontSize: "0.7rem", lineHeight: 1, flexShrink: 0, marginLeft: "0.25rem" }}
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}>✕</span>
      <style>{`
        @keyframes admin-toast-in { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        @media (prefers-reduced-motion:reduce) { .admin-toast { animation:none !important } }
      `}</style>
    </div>
  );
}
