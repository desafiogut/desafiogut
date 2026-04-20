import { motion, AnimatePresence } from "framer-motion";
import { sanitizeAddress, sanitizeString, sanitizeLance } from "../utils/sanitize.js";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * TabelaLances — exibe lances da edição ativa.
 *
 * SEGURANÇA:
 *  - Todos os valores passam por sanitização antes de renderizar
 *  - Endereços são validados via regex antes de exibição
 *  - Valores numéricos são parseados como inteiros, nunca interpolados como HTML
 *  - Nenhum dado é passado para dangerouslySetInnerHTML
 */
/**
 * Ordena lances: únicos primeiro (valor asc) → repetidos depois (valor asc).
 * O menor lance único fica sempre no índice 0 (Rank #1).
 */
function ordenarLances(lances) {
  const unicos   = lances.filter((l) => !l.repetido).sort((a, b) => a.valor - b.valor);
  const repetidos = lances.filter((l) => l.repetido).sort((a, b) => a.valor - b.valor);
  return [...unicos, ...repetidos];
}

export default function TabelaLances({ lances = [], idEdicao, prazoTimestamp }) {
  const edicaoSanitizada = sanitizeString(idEdicao ?? "");
  const agora = Date.now() / 1000;
  const encerrado = prazoTimestamp && agora > prazoTimestamp;
  const prazoFormatado = prazoTimestamp
    ? new Date(prazoTimestamp * 1000).toLocaleString("pt-BR")
    : "—";

  const lancesOrdenados = ordenarLances(lances);
  // Índice (na lista ordenada) do menor lance único — recebe o efeito blink
  const idxVencedor = lancesOrdenados.findIndex((l) => !l.repetido);

  return (
    <div style={estilos.container}>
      <style>{`
        @keyframes gut-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        .gut-vencedor { animation: gut-blink 1.1s ease-in-out infinite; }

        @keyframes gut-beam {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .gut-beam-row {
          position: relative;
          overflow: hidden;
        }
        .gut-beam-row::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(251,191,36,0.18) 40%,
            rgba(255,255,255,0.28) 50%,
            rgba(251,191,36,0.18) 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: gut-beam 2.6s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div style={estilos.header}>
        <h3 style={estilos.titulo}>
          📋 Lances — Edição <span style={{ color: "#6ee7b7" }}>{edicaoSanitizada}</span>
        </h3>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Prazo: {prazoFormatado}
          </span>
          <span style={{ ...estilos.badge, background: encerrado ? "#dc2626" : "#16a34a" }}>
            {encerrado ? "🔴 Encerrado" : "🟢 Ativo"}
          </span>
        </div>
      </div>

      {lances.length === 0 ? (
        <p style={estilos.vazio}>Nenhum lance registrado ainda.</p>
      ) : (
        <div style={estilos.tabelaWrapper}>
          <table style={estilos.tabela}>
            <thead>
              <tr>
                <th style={estilos.th}>#</th>
                <th style={estilos.th}>Carteira</th>
                <th style={estilos.th}>Valor (R$)</th>
                <th style={estilos.th}>Status</th>
                <th style={estilos.th}>Tx Hash</th>
              </tr>
            </thead>
            <AnimatePresence initial={false}>
            <tbody>
              {lancesOrdenados.map((lance, i) => {
                const enderecoSanitizado = sanitizeAddress(lance.endereco ?? "");
                const valorSanitizado = sanitizeLance(lance.valor);
                const txHash = sanitizeString(lance.txHash ?? "");
                const repetido = lance.repetido === true;
                const isVencedor = i === idxVencedor;
                const itemKey = `${enderecoSanitizado}-${valorSanitizado}`;

                if (!enderecoSanitizado || valorSanitizado === null) return null;

                const enderecoAbrev = `${enderecoSanitizado.slice(0, 6)}...${enderecoSanitizado.slice(-4)}`;
                const valorFormatado = `R$ ${(valorSanitizado / 100).toFixed(2)}`;

                return (
                  <motion.tr
                    key={itemKey}
                    layoutId={itemKey}
                    layout
                    initial={{ opacity: 0, y: -14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,   scale: 1    }}
                    exit={{    opacity: 0, y:  10,  scale: 0.97 }}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    className={isVencedor ? "gut-beam-row" : undefined}
                    style={{ ...estilos.tr, background: isVencedor ? "rgba(0,212,170,0.07)" : "transparent" }}
                  >
                    <td style={estilos.td}>{isVencedor ? "🏆" : i + 1}</td>
                    <td style={{ ...estilos.td, fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {enderecoAbrev}
                    </td>
                    <td style={{ ...estilos.td, fontWeight: "700", color: isVencedor ? "#00d4aa" : "#eef4ff" }}>
                      {valorFormatado}
                    </td>
                    <td style={estilos.td}>
                      <Badge
                        variant={repetido ? "warning" : "success"}
                        className={isVencedor ? "gut-vencedor" : undefined}
                      >
                        {repetido ? "❌ Repetido" : isVencedor ? "✅ Único 🏆" : "✅ Único"}
                      </Badge>
                    </td>
                    <td style={{ ...estilos.td, fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>
                      {txHash ? `${txHash.slice(0, 10)}...` : "—"}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
            </AnimatePresence>
          </table>
        </div>
      )}

      <p style={estilos.aviso}>
        🔒 Dados sanitizados — livre de XSS e injeção. Fonte: blockchain Ethereum.
      </p>
    </div>
  );
}

const estilos = {
  container: {
    background: "rgba(8,18,36,0.6)", backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "16px", padding: "1.5rem", color: "#eef4ff",
    border: "1px solid rgba(0,212,170,0.15)",
    boxShadow: "0 24px 48px rgba(0,0,0,0.55)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem",
  },
  titulo: { margin: 0, fontSize: "1.05rem", fontWeight: "800", letterSpacing: "0.02em" },
  badge: {
    padding: "0.22rem 0.75rem", borderRadius: "20px",
    fontSize: "0.72rem", fontWeight: "700", color: "#04080f",
  },
  vazio: { color: "#4a6080", textAlign: "center", padding: "2rem 0" },
  tabelaWrapper: { overflowX: "auto" },
  tabela: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "0.55rem 1rem", textAlign: "left", fontSize: "0.7rem",
    color: "#4a6080", borderBottom: "1px solid rgba(0,212,170,0.12)",
    textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700",
  },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.04)" },
  td: { padding: "0.7rem 1rem", fontSize: "0.86rem" },
  statusBadge: {
    padding: "0.2rem 0.6rem", borderRadius: "12px",
    fontSize: "0.76rem", fontWeight: "700",
  },
  aviso: {
    marginTop: "1rem", fontSize: "0.72rem", color: "#4a6080",
    borderTop: "1px solid rgba(0,212,170,0.1)", paddingTop: "0.75rem",
  },
};
