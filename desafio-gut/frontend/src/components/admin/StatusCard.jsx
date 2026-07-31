// StatusCard — indicador de estado de uma dependência do sistema.
// MC89.12 (Fase 3). Sem dependências externas.

const COR = {
  ok:      { dot: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.22)" },
  warning: { dot: "#fbbf24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.22)" },
  error:   { dot: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.22)" },
  unknown: { dot: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.22)" },
};

const ROTULO = { ok: "OK", warning: "⚠", error: "✗", unknown: "?" };

export default function StatusCard({ rotulo, ok, detalhe, nota }) {
  const estado = ok === true ? "ok" : ok === false ? "error" : (ok === null || ok === undefined) ? "unknown" : "warning";
  const c = COR[estado];

  return (
    <div style={{
      padding: "0.65rem 0.8rem",
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: "8px",
      display: "flex", flexDirection: "column", gap: "0.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#e8f0fe" }}>{rotulo}</span>
        <span style={{
          fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.06em",
          color: c.dot, textTransform: "uppercase",
        }}>{ROTULO[estado]}</span>
      </div>
      {detalhe && <span style={{ fontSize: "0.68rem", color: "#94a3b8", lineHeight: 1.35 }}>{detalhe}</span>}
      {nota && <span style={{ fontSize: "0.62rem", color: "#64748b" }}>{nota}</span>}
    </div>
  );
}
