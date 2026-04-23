import { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#93c5fd",
};

export default function MeusAtivos() {
  const { lances, address, isConnected, abrirModal, EDICAO_ATIVA } = useAppContext();
  const [filtro, setFiltro] = useState("todos"); // "todos" | "unicos" | "repetidos"

  const meusLances = lances.filter(
    (l) => !address || l.endereco?.toLowerCase() === address?.toLowerCase()
  );
  const todosLances = [...lances].sort((a, b) => a.valor - b.valor);

  const lancesExibidos = (() => {
    const base = address ? meusLances : todosLances;
    if (filtro === "unicos")   return base.filter((l) => !l.repetido);
    if (filtro === "repetidos") return base.filter((l) => l.repetido);
    return base;
  })();

  const totalUnico   = todosLances.filter((l) => !l.repetido).length;
  const totalRepet   = todosLances.filter((l) => l.repetido).length;
  const menorUnico   = todosLances.filter((l) => !l.repetido)[0];

  return (
    <div style={{ padding: "2rem", flex: 1 }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: "900", color: COR.text }}>
        📊 Meus Ativos
      </h1>
      <p style={{ margin: "0 0 2rem", color: COR.muted, fontSize: "0.88rem" }}>
        Histórico de lances e posições da edição <strong style={{ color: COR.blue300 }}>{EDICAO_ATIVA}</strong>.
      </p>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total de Lances",  value: todosLances.length, color: COR.blue300 },
          { label: "Lances Únicos",    value: totalUnico,          color: COR.success },
          { label: "Lances Repetidos", value: totalRepet,          color: COR.danger  },
          { label: "Menor Lance",      value: menorUnico ? `R$ ${(menorUnico.valor / 100).toFixed(2)}` : "—", color: "#f5a623" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: "rgba(8,24,64,0.6)", border: "1px solid rgba(37,99,235,0.18)",
            borderRadius: "14px", padding: "1rem",
          }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", color }}>{value}</div>
            <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.2rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", color: COR.muted }}>Filtrar:</span>
        {[
          { id: "todos",     label: "Todos"    },
          { id: "unicos",    label: "✅ Únicos"  },
          { id: "repetidos", label: "❌ Repetidos" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            style={{
              padding: "0.3rem 0.85rem", borderRadius: "20px",
              border: `1px solid ${filtro === id ? COR.primary : "rgba(37,99,235,0.2)"}`,
              background: filtro === id ? COR.primaryDim : "transparent",
              color: filtro === id ? COR.blue300 : COR.muted,
              cursor: "pointer", fontSize: "0.78rem", fontWeight: "600",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
        {address && (
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: COR.muted }}>
            {address ? "Mostrando seus lances" : "Todos os participantes"}
          </span>
        )}
      </div>

      {/* ── Tabela de lances ── */}
      <div style={{
        background: "rgba(8,24,64,0.6)", border: "1px solid rgba(37,99,235,0.18)",
        borderRadius: "16px", overflow: "hidden",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }}>
        {lancesExibidos.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: COR.muted }}>
            {isConnected ? "Nenhum lance encontrado com este filtro." : "Nenhum lance registrado nesta edição."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(37,99,235,0.15)" }}>
                {["#", "Participante", "Valor (R$)", "Status", "ID do Lance"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left",
                    fontSize: "0.7rem", color: COR.muted, textTransform: "uppercase",
                    letterSpacing: "0.08em", fontWeight: "700" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lancesExibidos.map((lance, i) => {
                const isVencedor = !lance.repetido && i === 0 && filtro !== "repetidos";
                return (
                  <tr key={i} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: isVencedor ? "rgba(37,99,235,0.08)" : "transparent",
                  }}>
                    <td style={{ padding: "0.7rem 1rem", fontSize: "0.85rem" }}>
                      {isVencedor ? "🏆" : i + 1}
                    </td>
                    <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: COR.blue300 }}>
                      {lance.endereco?.slice(0, 8)}...{lance.endereco?.slice(-4)}
                    </td>
                    <td style={{ padding: "0.7rem 1rem", fontWeight: "700",
                      color: isVencedor ? "#93c5fd" : COR.text }}>
                      R$ {(lance.valor / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span style={{
                        padding: "0.2rem 0.65rem", borderRadius: "12px", fontSize: "0.76rem", fontWeight: "700",
                        background: lance.repetido ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                        color: lance.repetido ? COR.danger : COR.success,
                        border: `1px solid ${lance.repetido ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                      }}>
                        {lance.repetido ? "❌ Repetido" : isVencedor ? "🏆 Menor e Único" : "✅ Único"}
                      </span>
                    </td>
                    <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.72rem", color: COR.muted }}>
                      {lance.txHash ? `${lance.txHash.slice(0, 12)}...` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!isConnected && (
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button onClick={abrirModal} style={{
            padding: "0.7rem 1.5rem", background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
            border: "none", borderRadius: "20px", color: "#fff",
            fontWeight: "800", cursor: "pointer", fontSize: "0.88rem",
          }}>
            ⚡ Aceito o DesafioGUT — Entrar para ver seus lances
          </button>
        </div>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.72rem", color: "#334155", textAlign: "center" }}>
        Art. 26: Apuração automática · Art. 8: Menor lance único ganha · Beta Interno
      </p>
    </div>
  );
}
