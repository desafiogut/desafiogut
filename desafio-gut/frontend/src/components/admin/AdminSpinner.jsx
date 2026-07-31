// AdminSpinner — indicador de carregamento padronizado do painel ADM.
// MC89.24 (Fase 1 da reforma). Substitui "A ler…", "A carregar…" e silêncio.
// Usa `prefers-reduced-motion` para desativar animação.

const TAMANHOS = { sm: 14, md: 22, lg: 32 };

export default function AdminSpinner({ size = "md", texto = "" }) {
  const dim = TAMANHOS[size] || TAMANHOS.md;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem" }}>
      <svg width={dim} height={dim} viewBox="0 0 24 24" style={{ animation: "admin-spin 0.8s linear infinite" }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="2.5" />
        <path d="M12 3a9 9 0 0 1 8.3 5.4" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {texto && <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{texto}</span>}
      <style>{`
        @keyframes admin-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          svg { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
