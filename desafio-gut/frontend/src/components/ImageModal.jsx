// ImageModal — MC46: lightbox para ampliar a imagem do banner da edição.
//
// Abre SOBRE a página (overlay), sem navegar para outra rota — o utilizador
// permanece no contexto da edição. Fecha por: X, clique fora da imagem (overlay)
// ou tecla ESC. A11y: role="dialog" + aria-modal, foco inicial no X, focus-trap
// (Tab cicla dentro), restauro do foco ao elemento anterior (o banner) ao fechar,
// scroll do body bloqueado enquanto aberto.
//
// Renderizado via portal em document.body para escapar a qualquer ancestral com
// transform (ex.: o wrapper de entrada do MC43 no Layout cria um containing block
// que quebraria position:fixed). Assim o overlay cobre sempre o viewport real.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ImageModal({ src, alt = "Imagem da edição", onClose }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    prevFocusRef.current = document.activeElement;
    closeRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Tab") {
        const foc = dialogRef.current?.querySelectorAll(
          'button, a[href], img[tabindex], [tabindex]:not([tabindex="-1"])'
        );
        if (!foc || foc.length === 0) { e.preventDefault(); return; }
        const first = foc[0];
        const last = foc[foc.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Restaura o foco ao elemento que abriu o modal (o banner).
      const prev = prevFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [onClose]);

  const overlay = {
    position: "fixed", inset: 0, zIndex: 10050,
    background: "rgba(0,0,0,0.8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1.25rem",
    animation: "gut-image-modal-in 0.18s ease-out",
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} onClick={onClose} style={overlay}>
      <style>{`@keyframes gut-image-modal-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", maxWidth: "90vw", maxHeight: "90vh",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar imagem ampliada"
          style={{
            position: "absolute", top: "-16px", right: "-16px",
            width: "40px", height: "40px", borderRadius: "999px",
            background: "rgba(13,18,53,0.92)", border: "1px solid rgba(255,255,255,0.22)",
            color: "#e8f0fe", fontSize: "1.1rem", lineHeight: 1, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.5)", zIndex: 1,
          }}
        >✕</button>

        {src ? (
          <img
            src={src}
            alt={alt}
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              objectFit: "contain", display: "block",
              borderRadius: "12px",
              boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
            }}
          />
        ) : (
          // Sem imagem real ainda (imagem_url null) — estado gracioso ampliado.
          <div style={{
            width: "min(78vw, 320px)", aspectRatio: "1 / 1",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem",
            background: "linear-gradient(135deg, rgba(245,166,35,0.18), rgba(13,18,53,0.85))",
            border: "1px solid rgba(245,166,35,0.35)", borderRadius: "16px",
            color: "#e8f0fe", textAlign: "center", padding: "1.5rem",
            boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
          }}>
            <span aria-hidden="true" style={{ fontSize: "4rem", lineHeight: 1 }}>🎁</span>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#f5a623", fontWeight: 700 }}>Imagem da edição em breve</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>O prémio será revelado com o catálogo.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
