import { motion, AnimatePresence } from "framer-motion";
import { sanitizeAddress, sanitizeString, sanitizeLance } from "../utils/sanitize.js";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "../hooks/useIsMobile.js";

function ordenarLances(lances) {
  const unicos    = lances.filter((l) => !l.repetido).sort((a, b) => a.valor - b.valor);
  const repetidos = lances.filter((l) =>  l.repetido).sort((a, b) => a.valor - b.valor);
  return [...unicos, ...repetidos];
}

function statusFor(repetido, isVencedor) {
  if (repetido)   return { label: "❌ Repetido",      variant: "warning" };
  if (isVencedor) return { label: "🏆 Menor e Único", variant: "success" };
  return                  { label: "✅ Único",         variant: "success" };
}

function nomeOuEndereco(lance, enderecoAbrev) {
  return lance.nomeExibicao || enderecoAbrev;
}

export default function TabelaLances({ lances = [], idEdicao, prazoTimestamp, encerrado: encerradoProp }) {
  const isMobile = useIsMobile();
  const edicaoSanitizada = sanitizeString(idEdicao ?? "");
  const agora = Date.now() / 1000;
  const encerrado = encerradoProp != null
    ? encerradoProp
    : !!(prazoTimestamp && agora > prazoTimestamp);

  const prazoFormatado = prazoTimestamp
    ? new Date(prazoTimestamp * 1000).toLocaleString("pt-BR")
    : "—";

  const lancesOrdenados = ordenarLances(lances);
  const idxVencedor = lancesOrdenados.findIndex((l) => !l.repetido);

  return (
    <div style={{
      ...estilos.container,
      padding: isMobile ? "1rem" : "1.5rem",
    }}>
      <style>{`
        @keyframes gut-blink { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }
        .gut-vencedor { animation: gut-blink 1.1s ease-in-out infinite; }

        @keyframes gut-beam {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .gut-beam-row, .gut-beam-card { position: relative; overflow: hidden; }
        .gut-beam-row::after, .gut-beam-card::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(245,166,35,0.18) 40%, rgba(255,255,255,0.22) 50%, rgba(245,166,35,0.18) 60%, transparent 100%);
          background-size: 200% 100%;
          animation: gut-beam 2.6s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes gut-reveal {
          from { filter: blur(6px); opacity: 0.3; transform: scale(0.94); }
          to   { filter: blur(0);   opacity: 1;   transform: scale(1);    }
        }
        .gut-valor-reveal { animation: gut-reveal 0.5s ease-out both; }
      `}</style>

      <div style={{
        ...estilos.header,
        marginBottom: isMobile ? "0.75rem" : "1rem",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: isMobile ? "0.4rem" : "0.5rem",
      }}>
        <h3 style={{ ...estilos.titulo, fontSize: isMobile ? "0.95rem" : "1.05rem" }}>
          📋 Lances — Edição{" "}
          <span style={{ color: "#fbbf24" }}>{edicaoSanitizada}</span>
        </h3>
        <div style={{
          display: "flex", gap: "0.6rem", alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-end",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: isMobile ? "0.7rem" : "0.78rem", color: "#6b7db8" }}>
            Prazo: {prazoFormatado}
          </span>
          <span style={{ ...estilos.statusBadge, background: encerrado ? "#dc2626" : "#16a34a" }}>
            {encerrado ? "🔴 Encerrado" : "🟢 Ativo"}
          </span>
          {!encerrado && lances.length > 0 && (
            <span style={{ fontSize: isMobile ? "0.68rem" : "0.74rem", color: "#6b7db8", fontStyle: "italic" }}>
              🔒 valores ocultos até o fim
            </span>
          )}
        </div>
      </div>

      {lances.length === 0 ? (
        <div style={{
          color: "#6b7db8",
          textAlign: "center",
          padding: "2rem 1rem",
          display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center",
        }}>
          <span style={{ fontSize: "1.6rem", opacity: 0.45 }}>📭</span>
          <span style={{ fontSize: isMobile ? "0.85rem" : "0.9rem" }}>Nenhum lance registrado ainda.</span>
          <span style={{ fontSize: "0.78rem", color: "#6b7db8" }}>Seja o primeiro a lançar.</span>
        </div>
      ) : isMobile ? (
        <MobileList lancesOrdenados={lancesOrdenados} idxVencedor={idxVencedor} encerrado={encerrado} />
      ) : (
        <DesktopTable lancesOrdenados={lancesOrdenados} idxVencedor={idxVencedor} encerrado={encerrado} />
      )}

      <p style={{
        marginTop: "1rem", fontSize: isMobile ? "0.68rem" : "0.72rem", color: "#6b7db8",
        borderTop: "1px solid rgba(245,166,35,0.12)", paddingTop: "0.75rem",
        textAlign: isMobile ? "center" : "left",
      }}>
        🔒 Dados sanitizados · XSS-safe · Art. 26: apuração automática · Beta Interno
      </p>
    </div>
  );
}

function MobileList({ lancesOrdenados, idxVencedor, encerrado }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <AnimatePresence initial={false}>
        {lancesOrdenados.map((lance, i) => {
          const enderecoSanitizado = sanitizeAddress(lance.endereco ?? "");
          const valorSanitizado = sanitizeLance(lance.valor);
          const txHash = sanitizeString(lance.txHash ?? "");
          if (!enderecoSanitizado || valorSanitizado === null) return null;

          const repetido   = lance.repetido === true;
          const isVencedor = i === idxVencedor;
          const itemKey    = `${enderecoSanitizado}-${valorSanitizado}`;
          const status     = statusFor(repetido, isVencedor);
          const enderecoAbrev = `${enderecoSanitizado.slice(0, 6)}...${enderecoSanitizado.slice(-4)}`;
          const nome       = nomeOuEndereco(lance, enderecoAbrev);
          const valorFormatado = `R$ ${(valorSanitizado / 100).toFixed(2)}`;

          return (
            <motion.div
              key={itemKey}
              layoutId={itemKey}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={isVencedor ? "gut-beam-card" : undefined}
              style={{
                background: isVencedor ? "rgba(245,166,35,0.10)" : "rgba(10,16,42,0.55)",
                border: `1px solid ${isVencedor ? "rgba(245,166,35,0.4)" : "rgba(245,166,35,0.14)"}`,
                borderRadius: "12px",
                padding: "0.75rem 0.85rem",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                columnGap: "0.75rem",
                rowGap: "0.4rem",
              }}
            >
              <div style={{
                gridRow: "1 / span 2",
                width: "32px", height: "32px", borderRadius: "50%",
                background: isVencedor ? "rgba(245,166,35,0.18)" : "rgba(245,166,35,0.12)",
                border: `1px solid ${isVencedor ? "rgba(245,166,35,0.4)" : "rgba(245,166,35,0.25)"}`,
                color: isVencedor ? "#fbbf24" : "#fbbf24",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "900", fontSize: "0.85rem", flexShrink: 0,
              }}>
                {isVencedor ? "🏆" : i + 1}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: "0.82rem", color: "#e8f0fe",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{nome}</div>
                {txHash && (
                  <div style={{
                    fontFamily: "monospace", fontSize: "0.66rem", color: "#6b7db8",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginTop: "1px",
                  }}>{txHash.slice(0, 14)}...</div>
                )}
              </div>

              <div className={encerrado ? "gut-valor-reveal" : undefined} style={{
                fontWeight: "900",
                fontSize: encerrado ? "1.05rem" : "0.9rem",
                color: encerrado
                  ? (isVencedor ? "#fbbf24" : "#fbbf24")
                  : "#6b7db8",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                textAlign: "right",
                letterSpacing: encerrado ? "0.02em" : "0.05em",
              }}>
                {encerrado ? valorFormatado : "🔒"}
              </div>

              <div style={{ gridColumn: "2 / span 2", display: "flex", justifyContent: "flex-end" }}>
                <Badge
                  variant={status.variant}
                  className={isVencedor ? "gut-vencedor" : undefined}
                >{status.label}</Badge>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function DesktopTable({ lancesOrdenados, idxVencedor, encerrado }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={estilos.th}>#</th>
            <th style={estilos.th}>Participante</th>
            <th style={estilos.th}>{encerrado ? "Valor (R$)" : "Valor 🔒"}</th>
            <th style={estilos.th}>Status (Art. 24)</th>
            <th style={estilos.th}>ID do Lance</th>
          </tr>
        </thead>
        <AnimatePresence initial={false}>
          <tbody>
            {lancesOrdenados.map((lance, i) => {
              const enderecoSanitizado = sanitizeAddress(lance.endereco ?? "");
              const valorSanitizado = sanitizeLance(lance.valor);
              const txHash = sanitizeString(lance.txHash ?? "");
              if (!enderecoSanitizado || valorSanitizado === null) return null;

              const repetido   = lance.repetido === true;
              const isVencedor = i === idxVencedor;
              const itemKey    = `${enderecoSanitizado}-${valorSanitizado}`;
              const status     = statusFor(repetido, isVencedor);
              const enderecoAbrev = `${enderecoSanitizado.slice(0, 6)}...${enderecoSanitizado.slice(-4)}`;
              const nome       = nomeOuEndereco(lance, enderecoAbrev);
              const valorFormatado = `R$ ${(valorSanitizado / 100).toFixed(2)}`;

              return (
                <motion.tr
                  key={itemKey}
                  layoutId={itemKey}
                  layout
                  initial={{ opacity: 0, y: -14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className={isVencedor ? "gut-beam-row" : undefined}
                  style={{
                    ...estilos.tr,
                    background: isVencedor ? "rgba(245,166,35,0.09)" : "transparent",
                  }}
                >
                  <td style={estilos.td}>{isVencedor ? "🏆" : i + 1}</td>
                  <td style={{ ...estilos.td, fontSize: "0.85rem" }}>{nome}</td>
                  <td
                    className={encerrado ? "gut-valor-reveal" : undefined}
                    style={{
                      ...estilos.td,
                      fontWeight: "700",
                      color: encerrado
                        ? (isVencedor ? "#fbbf24" : "#e8f0fe")
                        : "#6b7db8",
                      fontFamily: encerrado ? "monospace" : undefined,
                      letterSpacing: encerrado ? "0.02em" : "0.05em",
                    }}
                  >
                    {encerrado ? valorFormatado : "🔒"}
                  </td>
                  <td style={estilos.td}>
                    <Badge variant={status.variant} className={isVencedor ? "gut-vencedor" : undefined}>
                      {status.label}
                    </Badge>
                  </td>
                  <td style={{ ...estilos.td, fontFamily: "monospace", fontSize: "0.75rem", color: "#6b7db8" }}>
                    {txHash ? `${txHash.slice(0, 10)}...` : "—"}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </AnimatePresence>
      </table>
    </div>
  );
}

const estilos = {
  container: {
    background: "rgba(10,16,42,0.6)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderRadius: "12px", color: "#e8f0fe",
    border: "1px solid rgba(245,166,35,0.22)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(245,166,35,0.08)",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    flexWrap: "wrap",
  },
  titulo: { margin: 0, fontWeight: "800", letterSpacing: "0.04em", fontFamily: "'Orbitron', sans-serif", color: "#f5a623" },
  statusBadge: {
    padding: "0.22rem 0.75rem", borderRadius: "20px",
    fontSize: "0.7rem", fontWeight: "700", color: "#fff",
  },
  th: {
    padding: "0.55rem 1rem", textAlign: "left", fontSize: "0.7rem",
    color: "#6b7db8", borderBottom: "1px solid rgba(245,166,35,0.15)",
    textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700",
  },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.04)" },
  td: { padding: "0.7rem 1rem", fontSize: "0.86rem" },
};
