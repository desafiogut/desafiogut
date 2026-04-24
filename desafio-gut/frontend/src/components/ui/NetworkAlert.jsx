import { useEffect } from "react";

const VARIANTES = {
  erro:    { fundo: "rgba(239,68,68,0.13)",   borda: "rgba(239,68,68,0.38)",   cor: "#ef4444", icone: "⚠️" },
  aviso:   { fundo: "rgba(245,166,35,0.13)",  borda: "rgba(245,166,35,0.38)",  cor: "#f5a623", icone: "⚠️" },
  sucesso: { fundo: "rgba(16,185,129,0.13)",  borda: "rgba(16,185,129,0.38)",  cor: "#10b981", icone: "✅" },
  info:    { fundo: "rgba(37,99,235,0.13)",   borda: "rgba(37,99,235,0.38)",   cor: "#93c5fd", icone: "ℹ️" },
};

/**
 * Toast de alerta posicionado no rodapé da tela.
 * autoCloseMs=0 desativa o fechamento automático.
 *
 * Props:
 *   mensagem     – string | null (null = oculto)
 *   tipo         – "erro" | "aviso" | "sucesso" | "info"
 *   onClose      – () => void
 *   autoCloseMs  – número (default 6000)
 */
export function NetworkAlert({ mensagem, tipo = "erro", onClose, autoCloseMs = 6000 }) {
  useEffect(() => {
    if (!mensagem || !autoCloseMs) return;
    const id = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(id);
  }, [mensagem, autoCloseMs, onClose]);

  if (!mensagem) return null;

  const v = VARIANTES[tipo] ?? VARIANTES.erro;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position:       "fixed",
        bottom:         "1.25rem",
        left:           "50%",
        transform:      "translateX(-50%)",
        zIndex:         9999,
        display:        "flex",
        alignItems:     "center",
        gap:            "0.75rem",
        borderRadius:   "12px",
        border:         `1px solid ${v.borda}`,
        background:     v.fundo,
        padding:        "0.75rem 1.1rem",
        boxShadow:      "0 8px 32px rgba(0,0,0,0.5)",
        maxWidth:       "480px",
        width:          "calc(100vw - 2rem)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color:          v.cor,
        fontSize:       "0.85rem",
        fontWeight:     "600",
        lineHeight:     "1.4",
        animation:      "gut-alert-in 0.22s ease-out both",
      }}
    >
      <style>{`
        @keyframes gut-alert-in {
          from { transform: translateX(-50%) translateY(10px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>{v.icone}</span>
      <span style={{ flex: 1 }}>{mensagem}</span>
      <button
        onClick={onClose}
        aria-label="Fechar alerta"
        style={{
          background:  "transparent",
          border:      "none",
          cursor:      "pointer",
          color:       v.cor,
          opacity:     0.65,
          fontSize:    "1rem",
          padding:     "0 0.1rem",
          lineHeight:  1,
          flexShrink:  0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
