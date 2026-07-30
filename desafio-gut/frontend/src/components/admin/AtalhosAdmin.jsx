// Atalhos do painel ADM — a navegação vive no ÍNDICE, não numa barra.
//
// MC89.6 (D-NAV). A primeira tentativa foi uma barra persistente com os nove
// destinos. Vista no aparelho, partiu-se em TRÊS linhas irregulares — pior do
// que os quatro separadores em duas linhas que o MC89.4 já tinha rejeitado
// ("duas linhas leem-se como dois grupos distintos"). Com nove destinos e
// rótulos legíveis, nenhuma barra cabe num telemóvel: o problema não era a
// arrumação, era insistir numa barra.
//
// É também o que o plano aprovado dizia (MC89.5, D-NAV(c)): a Visão Geral é o
// ÍNDICE, com cartões-atalho, e cada tela tem um "← Painel" no topo.
//
// O cartão dá o que a barra não podia: uma linha a dizer o que a tela faz e um
// estado visível para as que ainda não existem. Custa um toque a mais entre
// telas — e poupa a dúvida sobre o que cada rótulo de uma palavra significava.

import { Link } from "react-router-dom";
import { TELAS_ADMIN } from "../../lib/adminNav.js";

// Uma linha por tela. Fica aqui, e não no modelo de rotas, porque é copy de
// interface — o `adminNav.js` é sobre estrutura e é lido pelos testes.
const RESUMO = {
  usuarios:      "Lista, perfil, bloqueio e ajustes",
  financeiro:    "Transações, relatórios e saldo da coordenadora",
  operacoes:     "Estado do sistema, fila e comandos",
  logs:          "Quem fez o quê, quando e porquê",
  notificacoes:  "Envio, agendamento e histórico",
  configuracoes: "Administradores, níveis e sessões",
  aprovacoes:    "Pedidos de cliente pendentes",
  cotas:         "Cotas comerciais por categoria",
};

export default function AtalhosAdmin() {
  // O índice não se lista a si próprio.
  const telas = TELAS_ADMIN.filter((t) => !t.index);

  return (
    <nav aria-label="Secções do painel de administração">
      <h3 style={{
        fontSize: "0.78rem", color: "#f5a623", margin: "0 0 0.5rem",
        letterSpacing: "0.05em", fontWeight: 700,
      }}>SECÇÕES</h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
        gap: "0.5rem",
      }}>
        {telas.map((t) => (
          <Link
            key={t.id}
            to={t.href}
            style={{
              display: "block",
              padding: "0.7rem 0.85rem",
              borderRadius: "10px",
              textDecoration: "none",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.10)",
              // Uma tela por construir não se esconde nem se disfarça: fica
              // visível e menos contrastada, para o ADM saber que existe e que
              // ainda não faz nada. Escondê-la faria a estrutura parecer menor do
              // que é; mostrá-la igual faria o painel parecer avariado.
              opacity: t.pronta ? 1 : 0.62,
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "0.4rem", marginBottom: "0.15rem",
            }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#e8f0fe" }}>{t.label}</span>
              {!t.pronta && (
                <span style={{
                  fontSize: "0.58rem", color: "#94a3b8", letterSpacing: "0.06em",
                  textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap",
                }}>em breve</span>
              )}
            </div>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
              {RESUMO[t.id] || ""}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
