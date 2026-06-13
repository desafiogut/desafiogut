import { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import BotaoLoginPrincipal from "../components/BotaoLoginPrincipal.jsx";

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#fbbf24", gold: "#f5a623",
};

const FILTROS = [
  { id: "todos",     label: "Todos"        },
  { id: "unicos",    label: "✅ Únicos"    },
  { id: "repetidos", label: "❌ Repetidos" },
];

export default function MeusAtivos() {
  const isMobile = useIsMobile();
  const { lances, address, isConnected, abrirModal, EDICAO_ATIVA } = useAppContext();
  const [filtro, setFiltro] = useState("todos");

  const meusLances = lances.filter(
    (l) => !address || l.endereco?.toLowerCase() === address?.toLowerCase()
  );
  const todosLances = [...lances].sort((a, b) => a.valor - b.valor);

  const lancesExibidos = (() => {
    const base = address ? meusLances : todosLances;
    if (filtro === "unicos")    return base.filter((l) => !l.repetido);
    if (filtro === "repetidos") return base.filter((l) => l.repetido);
    return base;
  })();

  const totalUnico = todosLances.filter((l) => !l.repetido).length;
  const totalRepet = todosLances.filter((l) => l.repetido).length;
  const menorUnico = todosLances.filter((l) => !l.repetido)[0];

  const pad        = isMobile ? "1rem" : "2rem";
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const stats = [
    { label: "Total de Lances",  value: todosLances.length, color: COR.blue300 },
    { label: "Lances Únicos",    value: totalUnico,         color: COR.success },
    { label: "Lances Repetidos", value: totalRepet,         color: COR.danger  },
    { label: "Menor Lance",      value: menorUnico ? `R$ ${(menorUnico.valor / 100).toFixed(2)}` : "—", color: COR.gold },
  ];

  return (
    <div style={{ padding: pad, flex: 1 }}>
      <header style={{ marginBottom: sectionGap }}>
        <h1 style={{
          margin: "0 0 0.35rem",
          fontSize: isMobile ? "1.3rem" : "1.5rem",
          fontWeight: "900", color: COR.text, lineHeight: 1.2,
        }}>📊 Meus Ativos</h1>
        <p style={{ margin: 0, color: COR.muted, fontSize: isMobile ? "0.82rem" : "0.88rem", lineHeight: 1.4 }}>
          Histórico de lances e posições da edição{" "}
          <strong style={{ color: COR.blue300 }}>{EDICAO_ATIVA}</strong>.
        </p>
      </header>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "repeat(2, minmax(0, 1fr))"
          : "repeat(auto-fit, minmax(140px, 1fr))",
        gap: isMobile ? "0.75rem" : "1rem",
        marginBottom: sectionGap,
      }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{
            background: "rgba(255,255,255, var(--glass-opacity, 0.03))",
            border: "1px solid rgba(245,166,35,0.18)",
            borderRadius: "14px",
            padding: isMobile ? "0.85rem 0.9rem" : "1rem",
            minWidth: 0,
          }}>
            <div style={{
              fontSize: isMobile ? "1.15rem" : "1.5rem",
              fontWeight: "900", color, lineHeight: 1.1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{value}</div>
            <div style={{
              fontSize: isMobile ? "0.7rem" : "0.72rem",
              color: COR.muted, marginTop: "0.25rem", fontWeight: "600",
            }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "0.5rem" : "0.5rem",
        marginBottom: "1rem",
        alignItems: isMobile ? "stretch" : "center",
      }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.76rem", color: COR.muted, fontWeight: "600" }}>Filtrar:</span>
          {FILTROS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              style={{
                padding: "0.32rem 0.85rem", borderRadius: "20px",
                border: `1px solid ${filtro === id ? COR.primary : "rgba(245,166,35,0.2)"}`,
                background: filtro === id ? COR.primaryDim : "transparent",
                color: filtro === id ? COR.blue300 : COR.muted,
                cursor: "pointer", fontSize: "0.76rem", fontWeight: "600",
                transition: "all 0.15s",
              }}
            >{label}</button>
          ))}
        </div>
        {address && (
          <span style={{
            fontSize: "0.7rem", color: COR.muted,
            marginLeft: isMobile ? 0 : "auto",
          }}>📍 Mostrando seus lances</span>
        )}
      </div>

      {/* Lista */}
      <div style={{
        background: "rgba(255,255,255, var(--glass-opacity, 0.03))",
        border: "1px solid rgba(245,166,35,0.18)",
        borderRadius: "16px",
        padding: isMobile ? "0.75rem" : 0,
        overflow: "hidden",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }}>
        {lancesExibidos.length === 0 ? (
          <div style={{
            padding: isMobile ? "2rem 1rem" : "3rem",
            textAlign: "center", color: COR.muted,
            display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center",
          }}>
            <span style={{ fontSize: "1.6rem", opacity: 0.45 }}>📭</span>
            <span style={{ fontSize: isMobile ? "0.84rem" : "0.9rem" }}>
              {isConnected ? "Nenhum lance encontrado com este filtro." : "Nenhum lance registrado nesta edição."}
            </span>
          </div>
        ) : isMobile ? (
          <MobileList lances={lancesExibidos} filtro={filtro} />
        ) : (
          <DesktopTable lances={lancesExibidos} filtro={filtro} />
        )}
      </div>

      {!isConnected && (
        <div style={{ marginTop: sectionGap, textAlign: "center" }}>
          <BotaoLoginPrincipal onClick={abrirModal} size={isMobile ? "md" : "md"} fullWidth={isMobile} />
        </div>
      )}

      <p style={{
        marginTop: sectionGap,
        paddingTop: "0.75rem",
        borderTop: "1px solid rgba(245,166,35,0.08)",
        fontSize: "0.7rem", color: "#334155", textAlign: "center", lineHeight: 1.5,
      }}>
        Art. 26: Apuração automática · Art. 8: Menor lance único ganha · Beta Interno
      </p>
    </div>
  );
}

function MobileList({ lances, filtro }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {lances.map((lance, i) => {
        const isVencedor = !lance.repetido && i === 0 && filtro !== "repetidos";
        const enderecoAbrev = `${lance.endereco?.slice(0, 6)}...${lance.endereco?.slice(-4)}`;
        return (
          <div key={i} style={{
            background: isVencedor ? "rgba(245,166,35,0.10)" : "rgba(3,15,36,0.55)",
            border: `1px solid ${isVencedor ? "rgba(245,166,35,0.4)" : "rgba(245,166,35,0.14)"}`,
            borderRadius: "12px",
            padding: "0.7rem 0.85rem",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            columnGap: "0.7rem",
            rowGap: "0.4rem",
          }}>
            <div style={{
              gridRow: "1 / span 2",
              width: "32px", height: "32px", borderRadius: "50%",
              background: isVencedor ? "rgba(245,166,35,0.18)" : "rgba(245,166,35,0.12)",
              border: `1px solid ${isVencedor ? "rgba(245,166,35,0.4)" : "rgba(245,166,35,0.25)"}`,
              color: isVencedor ? COR.gold : COR.blue300,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "900", fontSize: "0.85rem", flexShrink: 0,
            }}>{isVencedor ? "🏆" : i + 1}</div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "monospace", fontSize: "0.82rem", color: COR.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{enderecoAbrev}</div>
              {lance.txHash && (
                <div style={{
                  fontFamily: "monospace", fontSize: "0.65rem", color: COR.muted, marginTop: "1px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{lance.txHash.slice(0, 14)}...</div>
              )}
            </div>

            <div style={{
              fontWeight: "900", fontSize: "1.05rem",
              color: isVencedor ? COR.gold : COR.blue300,
              fontFamily: "monospace", whiteSpace: "nowrap", textAlign: "right",
            }}>R$ {(lance.valor / 100).toFixed(2)}</div>

            <div style={{ gridColumn: "2 / span 2", display: "flex", justifyContent: "flex-end" }}>
              <span style={{
                padding: "0.18rem 0.55rem", borderRadius: "10px",
                fontSize: "0.7rem", fontWeight: "700",
                background: lance.repetido ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                color: lance.repetido ? COR.danger : COR.success,
                border: `1px solid ${lance.repetido ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
              }}>{lance.repetido ? "❌ Repetido" : isVencedor ? "🏆 Menor e Único" : "✅ Único"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DesktopTable({ lances, filtro }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(245,166,35,0.15)" }}>
          {["#", "Participante", "Valor (R$)", "Status", "ID do Lance"].map((h) => (
            <th key={h} style={{
              padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem",
              color: COR.muted, textTransform: "uppercase",
              letterSpacing: "0.08em", fontWeight: "700",
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lances.map((lance, i) => {
          const isVencedor = !lance.repetido && i === 0 && filtro !== "repetidos";
          return (
            <tr key={i} style={{
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: isVencedor ? "rgba(245,166,35,0.08)" : "transparent",
            }}>
              <td style={{ padding: "0.7rem 1rem", fontSize: "0.85rem" }}>
                {isVencedor ? "🏆" : i + 1}
              </td>
              <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: COR.blue300 }}>
                {lance.endereco?.slice(0, 8)}...{lance.endereco?.slice(-4)}
              </td>
              <td style={{
                padding: "0.7rem 1rem", fontWeight: "700",
                color: isVencedor ? COR.blue300 : COR.text,
              }}>R$ {(lance.valor / 100).toFixed(2)}</td>
              <td style={{ padding: "0.7rem 1rem" }}>
                <span style={{
                  padding: "0.2rem 0.65rem", borderRadius: "12px",
                  fontSize: "0.74rem", fontWeight: "700",
                  background: lance.repetido ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                  color: lance.repetido ? COR.danger : COR.success,
                  border: `1px solid ${lance.repetido ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                }}>{lance.repetido ? "❌ Repetido" : isVencedor ? "🏆 Menor e Único" : "✅ Único"}</span>
              </td>
              <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.72rem", color: COR.muted }}>
                {lance.txHash ? `${lance.txHash.slice(0, 12)}...` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
