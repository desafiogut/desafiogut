// BotaoLoginPrincipal — CTA único de login do DesafioGUT.
//
// Padroniza o label "⚡ Aceito o DesafioGUT" em todas as páginas (Mapa de
// Navegação I-03: antes havia 5 labels diferentes). Aceita variantes de
// tamanho e largura para encaixar nos diferentes contextos sem perder
// identidade visual.

const LABEL = "⚡ Aceito o DesafioGUT";

const SIZES = {
  sm: { padding: "0.45rem 0.9rem", fontSize: "0.78rem" },
  md: { padding: "0.7rem 1.4rem",  fontSize: "0.88rem" },
  lg: { padding: "0.85rem 1.6rem", fontSize: "0.95rem" },
};

export default function BotaoLoginPrincipal({
  onClick,
  disabled = false,
  size = "md",
  fullWidth = false,
  ariaLabel = LABEL,
}) {
  const sz = SIZES[size] ?? SIZES.md;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        padding: sz.padding,
        fontSize: sz.fontSize,
        width: fullWidth ? "100%" : "auto",
        background: "linear-gradient(135deg,#f5a623,#f97316)",
        color: "#0a0f1a",
        border: "none",
        borderRadius: "12px",
        fontWeight: 800,
        letterSpacing: "0.03em",
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.7 : 1,
        boxShadow: "0 4px 14px rgba(245,166,35,0.35)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      {disabled ? "⏳ Carregando…" : LABEL}
    </button>
  );
}

export { LABEL as LABEL_LOGIN };
