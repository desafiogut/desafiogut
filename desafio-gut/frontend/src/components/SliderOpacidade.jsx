import { useEffect, useState } from "react";

// MC22.1 SECÇÃO B — controlo de opacidade do vidro temperado.
// Atualiza --glass-opacity (globals.css) em tempo real e persiste em localStorage.
// O valor persistido é re-aplicado no boot por applyStoredGlassOpacity() (main.jsx).
export const GLASS_OPACITY_KEY = "gut_glass_opacity";
const DEFAULT = 0.03;
const MIN = 0;
const MAX = 0.15;
const STEP = 0.005;

function clamp(v) {
  return Math.min(MAX, Math.max(MIN, v));
}

// Boot: aplica o valor guardado ANTES de qualquer página montar (chamado em main.jsx).
export function applyStoredGlassOpacity() {
  try {
    const v = parseFloat(localStorage.getItem(GLASS_OPACITY_KEY));
    if (Number.isFinite(v)) {
      document.documentElement.style.setProperty("--glass-opacity", String(clamp(v)));
    }
  } catch { /* noop */ }
}

export default function SliderOpacidade({ label = "Intensidade do vidro", isMobile = false }) {
  const [op, setOp] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(GLASS_OPACITY_KEY));
      return Number.isFinite(v) ? clamp(v) : DEFAULT;
    } catch { return DEFAULT; }
  });

  useEffect(() => {
    try { document.documentElement.style.setProperty("--glass-opacity", String(op)); } catch { /* noop */ }
  }, [op]);

  function onChange(e) {
    const v = clamp(parseFloat(e.target.value));
    setOp(v);
    try { localStorage.setItem(GLASS_OPACITY_KEY, String(v)); } catch { /* noop */ }
  }

  const pct = Math.round((op / MAX) * 100);

  return (
    <div style={{
      display: "flex", flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center",
      gap: "0.75rem",
    }}>
      <span style={{ fontSize: isMobile ? "0.84rem" : "0.86rem", color: "#e8f0fe" }}>
        {label} <span style={{ color: "#fbbf24", fontWeight: 700 }}>{pct}%</span>
      </span>
      <input
        type="range"
        min={MIN} max={MAX} step={STEP}
        value={op}
        onChange={onChange}
        aria-label={label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={op}
        style={{ width: isMobile ? "100%" : "190px", accentColor: "#ff6b35", cursor: "pointer" }}
      />
    </div>
  );
}
