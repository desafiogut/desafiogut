// Navegação do painel ADM.
//
// MC89.6 (D-NAV). Substitui os separadores do AdminPanel: com nove destinos, a
// regra do MC89.4 (uma linha, sem wrap, sem truncar) deixa de ser satisfazível
// num telemóvel. Os links saem de `lib/adminNav.js` — a mesma lista que gera as
// rotas em App.jsx, logo é impossível apontar para uma rota que não existe.
//
// Continua a valer a regra de cor do MC89.4: a seleção marca-se por CONTRASTE,
// nunca pelo laranja de marca, que fica reservado a ação irreversível.

import { Link, useLocation } from "react-router-dom";
import { TELAS_ADMIN, telaAtiva } from "../../lib/adminNav.js";

export default function NavAdmin() {
  const { pathname } = useLocation();
  const ativa = telaAtiva(pathname);

  return (
    <nav
      aria-label="Secções do painel de administração"
      style={{
        display: "flex", gap: "0.3rem", flexWrap: "wrap",
        paddingBottom: "0.15rem",
      }}
    >
      {TELAS_ADMIN.map((t) => {
        const selecionada = ativa?.id === t.id;
        return (
          <Link
            key={t.id}
            to={t.href}
            aria-current={selecionada ? "page" : undefined}
            style={{
              padding: "0.3rem 0.7rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: selecionada ? 700 : 500,
              lineHeight: 1.6,
              textDecoration: "none",
              whiteSpace: "nowrap",
              color: selecionada ? "#e8f0fe" : "#94a3b8",
              background: selecionada ? "rgba(255,255,255,0.10)" : "transparent",
              border: `1px solid ${selecionada ? "rgba(255,255,255,0.25)" : "transparent"}`,
            }}
          >
            {t.label}
            {/* Uma tela por construir tem de o dizer no próprio link: sem isto, o
                ADM clica, encontra um placeholder e conclui que está partido. */}
            {!t.pronta && (
              <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "#64748b", fontWeight: 500 }}>
                em breve
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
