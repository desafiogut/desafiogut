// src/components/ComprarPasseModal.jsx — UTAC106e. Balão de confirmação da compra do Passe.
//
// Reutiliza o `Modal` do design system (`@/components/ui`), o MESMO primitivo que o 106c usava
// inline na Carteira: dá o overlay, o `role="dialog"` + `aria-modal="true"`, o spring de entrada
// e o FECHO POR ESC (Modal.jsx:19). Aqui só vive o conteúdo e as duas saídas (Confirmar/Cancelar).
//
// Props: { aberto, onConfirmar, onCancelar, loading, pontos }
//   · loading → o botão «Confirmar» mostra o spinner e ambos os botões ficam desactivados;
//     o ESC/backdrop NÃO fecham durante o loading (não se abandona uma compra a meio).

import { Modal } from "@/components/ui";

const COR = { gold: "#f5a623", muted: "#6b7db8", text: "#e8f0fe" };
// R$ 2,00 em pt-BR (string, como na Carteira — sai exactamente «R$ 2,00»).
const PRECO_PASSE_DESAFIO = "R$ 2,00";
const PONTOS_POR_PASSE = 1;

export default function ComprarPasseModal({ aberto, onConfirmar, onCancelar, loading = false, pontos = null }) {
  // Durante o loading não se fecha: nem por ESC/backdrop, nem pelo botão Cancelar.
  const fechar = loading ? () => {} : onCancelar;

  return (
    <Modal open={aberto} onClose={fechar} labelledBy="utac106e-passe-titulo">
      <h2
        id="utac106e-passe-titulo"
        style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", fontWeight: 800, color: COR.gold }}
      >
        Comprar Passe Desafio
      </h2>

      <p style={{ margin: "0 0 0.9rem", color: COR.muted, fontSize: "0.9rem", lineHeight: 1.5 }}>
        Vais comprar <strong style={{ color: COR.text }}>1 Passe</strong> por{" "}
        <strong style={{ color: COR.gold }}>{PRECO_PASSE_DESAFIO}</strong>. Ganhas{" "}
        <strong style={{ color: COR.text }}>1 ponto</strong>. Continuar?
      </p>

      {typeof pontos === "number" && (
        <p style={{ margin: "0 0 0.9rem", color: COR.muted, fontSize: "0.82rem" }}>
          Teus pontos: <strong style={{ color: COR.gold }}>{pontos}</strong> →{" "}
          <strong style={{ color: COR.gold }}>{pontos + PONTOS_POR_PASSE}</strong>
        </p>
      )}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onCancelar}
          disabled={loading}
          style={{
            padding: "0.6rem 1rem", borderRadius: "10px",
            cursor: loading ? "not-allowed" : "pointer",
            background: "transparent", border: "1px solid rgba(107,125,184,0.45)",
            color: COR.muted, fontWeight: 700, fontSize: "0.82rem",
            opacity: loading ? 0.5 : 1,
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={loading}
          aria-busy={loading ? "true" : undefined}
          style={{
            padding: "0.6rem 1.2rem", border: "none", borderRadius: "12px",
            background: "linear-gradient(135deg,#f5a623,#e89400)", color: "#fff",
            fontWeight: 800, fontSize: "0.85rem",
            cursor: loading ? "wait" : "pointer",
            boxShadow: "0 4px 14px rgba(245,166,35,0.35)",
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading && (
            <span
              data-spinner="true"
              aria-hidden="true"
              style={{ display: "inline-block", animation: "gut-spin 0.9s linear infinite" }}
            >
              ⏳
            </span>
          )}
          {loading ? "A processar…" : "Confirmar"}
        </button>
      </div>
    </Modal>
  );
}
