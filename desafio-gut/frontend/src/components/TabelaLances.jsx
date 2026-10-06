import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeAddress, sanitizeString, sanitizeLance } from "../utils/sanitize.js";
import { THead, TH, TD } from "@/components/ui";
import { useIsMobile } from "../hooks/useIsMobile.js";
// UTAC000.9 (DEBT-008) — resultado OFICIAL da edição (UTAC000.8): o 🏆 da tabela passa a ser o
// vencedor oficial quando ele existe, em vez do «menor único que este browser viu».
import { useResultadoOficial } from "../hooks/useResultadoOficial.js";
// MC88.43 — este cabeçalho era o lado que VAZAVA no B4: anunciava "🟢 Ativo" e
// a data real do prazo enquanto o Dashboard, no mesmo instante, dizia "EM BREVE".
import { getEstadoEdicao } from "../utils/edicao.js";

function ordenarLances(lances) {
  // MC28.1: cmp null-safe — lances blindados (valor null em mainnet) mantêm ordem
  // estável; no Sepolia (valor numérico) a ordenação é idêntica à anterior.
  const cmp = (a, b) => (a.valor ?? 0) - (b.valor ?? 0);
  const unicos    = lances.filter((l) => !l.repetido).sort(cmp);
  const repetidos = lances.filter((l) =>  l.repetido).sort(cmp);
  return [...unicos, ...repetidos];
}

// UTAC107d (R18-D, mockup completo) — a coluna «Status (Art. 24)» / selo por linha SAIU, tal como
// «ID do Lance» e o texto de rodapé: a tabela fica com 3 colunas (#, Participante, Valor). O 🏆
// do vencedor continua na coluna «#» (desktop) e no círculo da posição (mobile).

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

  // MC88.43 — mesma pergunta que o Dashboard faz, com o mesmo `encerrado`.
  const est = getEstadoEdicao({ id: idEdicao }, { encerrado });

  // A data do prazo é informação REAL, e por isso mesmo contradizia o "EM BREVE"
  // do Dashboard: provava que o leilão estava a decorrer. Só se mostra quando a
  // fonte única admite uma contagem viva (est.timer === null).
  const prazoFormatado = prazoTimestamp
    ? new Date(prazoTimestamp * 1000).toLocaleString("pt-BR")
    : "—";

  // MC39.20 (Onda 5, item 4) — memoiza a ordenação/apuração: evita re-sort a cada
  // re-render do pai (ex.: tick do timer) quando `lances` não mudou. Resultado idêntico.
  const lancesOrdenados = useMemo(() => ordenarLances(lances), [lances]);

  // ── UTAC000.9 (DEBT-008) — O 🏆 DA TABELA É O VENCEDOR OFICIAL QUANDO EXISTE ──────────
  // Aqui o apuramento local («o 1.º único da lista») é, na prática, «o menor único que este
  // browser viu» — e em mainnet o browser vê pouco ou nada. Com o resultado OFICIAL
  // (`resultados()` on-chain, escrito pela consolidação) o 🏆 vai para o lance que corresponde
  // ao vencedor publicado (endereço + valor). Sem resultado oficial mantém-se o apuramento
  // local: exactamente o comportamento anterior. Linhas blindadas (`oculto`, valor null) nunca
  // casam — durante o leilão a mainnet continua sem 🏆, como já estava (GATE 18).
  const resultadoOficial = useResultadoOficial(idEdicao);
  const idxVencedor = useMemo(() => {
    if (resultadoOficial) {
      return lancesOrdenados.findIndex((l) =>
        // `valor != null` explícito: `Number(null)` é 0 e um `menorUnicoCentavos: 0` legítimo
        // casaria uma linha sem valor. Medido como não explorável (as linhas sem valor são
        // descartadas no render), mas é a armadilha que o projecto já pagou uma vez (MC93-A).
        l?.valor != null
        && Number(l.valor) === resultadoOficial.menorUnicoCentavos
        && String(l?.endereco ?? "").toLowerCase() === resultadoOficial.vencedor);
    }
    return lancesOrdenados.findIndex((l) => !l.repetido);
  }, [lancesOrdenados, resultadoOficial]);

  return (
    <div className="gut-glass-standard" style={{
      ...estilos.container,
      padding: isMobile ? "1rem" : "1.5rem",
    }}>
      <style>{`
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
          {est.timer == null && (
            <span style={{ fontSize: isMobile ? "0.7rem" : "0.78rem", color: "#6b7db8" }}>
              Prazo: {prazoFormatado}
            </span>
          )}
          <span style={{ ...estilos.statusBadge, background: est.cor }}>
            {est.badge}
          </span>
          {/* Este aviso NÃO segue a fonte única de propósito: ele espelha a regra
              de DIVULGAÇÃO (valores só aparecem depois do fim), que continua
              amarrada ao `encerrado` on-chain — ver MobileList/DesktopTable
              abaixo. Trocá-lo por est.encerrada punha o aviso "valores ocultos"
              ao lado de valores já revelados. Presentação não manda em divulgação. */}
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

    </div>
  );
}

function MobileList({ lancesOrdenados, idxVencedor, encerrado }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <AnimatePresence initial={false}>
        {lancesOrdenados.map((lance, i) => {
          // MC28.1: linha blindada (mainnet) — valor nunca revelado nesta tabela.
          const oculto = lance.oculto === true;
          const enderecoSanitizado = sanitizeAddress(lance.endereco ?? "");
          const valorSanitizado = oculto ? null : sanitizeLance(lance.valor);
          if (!enderecoSanitizado || (!oculto && valorSanitizado === null)) return null;

          const isVencedor = !oculto && i === idxVencedor;
          const itemKey    = oculto ? `${enderecoSanitizado}-${i}` : `${enderecoSanitizado}-${valorSanitizado}`;
          const enderecoAbrev = `${enderecoSanitizado.slice(0, 6)}...${enderecoSanitizado.slice(-4)}`;
          const nome       = nomeOuEndereco(lance, enderecoAbrev);
          const valorFormatado = oculto ? "🔒" : `R$ ${(valorSanitizado / 100).toFixed(2)}`;

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
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function DesktopTable({ lancesOrdenados, idxVencedor, encerrado }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <THead>
          <tr>
            <TH>#</TH>
            <TH>Participante</TH>
            <TH>{encerrado ? "Valor (R$)" : "Valor 🔒"}</TH>
          </tr>
        </THead>
        <AnimatePresence initial={false}>
          <tbody>
            {lancesOrdenados.map((lance, i) => {
              // MC28.1: linha blindada (mainnet) — valor nunca revelado nesta tabela.
              const oculto = lance.oculto === true;
              const enderecoSanitizado = sanitizeAddress(lance.endereco ?? "");
              const valorSanitizado = oculto ? null : sanitizeLance(lance.valor);
              if (!enderecoSanitizado || (!oculto && valorSanitizado === null)) return null;

              const isVencedor = !oculto && i === idxVencedor;
              const itemKey    = oculto ? `${enderecoSanitizado}-${i}` : `${enderecoSanitizado}-${valorSanitizado}`;
              const enderecoAbrev = `${enderecoSanitizado.slice(0, 6)}...${enderecoSanitizado.slice(-4)}`;
              const nome       = nomeOuEndereco(lance, enderecoAbrev);
              const valorFormatado = oculto ? "🔒" : `R$ ${(valorSanitizado / 100).toFixed(2)}`;

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
                  <TD>{isVencedor ? "🏆" : i + 1}</TD>
                  <TD className="!text-sm">{nome}</TD>
                  <TD
                    className={encerrado ? "gut-valor-reveal" : undefined}
                    style={{
                      fontWeight: "700",
                      color: encerrado
                        ? (isVencedor ? "#fbbf24" : "#e8f0fe")
                        : "#6b7db8",
                      fontFamily: encerrado ? "monospace" : undefined,
                      letterSpacing: encerrado ? "0.02em" : "0.05em",
                    }}
                  >
                    {encerrado ? valorFormatado : "🔒"}
                  </TD>
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
  // UTAC107d (Regra 2) — o vidro passa a ser a classe `.gut-glass-standard` (fonte única: 0,88 · r14 ·
  // sem blur). Era `rgba(10,16,42,.6)` + `backdrop-filter: blur(20px)` + r12 — o único blur do app
  // (contra o MC82.1). Aqui fica só o que a classe não define.
  container: { color: "#e8f0fe" },
  header: {
    display: "flex", justifyContent: "space-between",
    flexWrap: "wrap",
  },
  titulo: { margin: 0, fontWeight: "800", letterSpacing: "0.04em", fontFamily: "'Orbitron', sans-serif", color: "#f5a623" },
  statusBadge: {
    padding: "0.22rem 0.75rem", borderRadius: "20px",
    fontSize: "0.7rem", fontWeight: "700", color: "#fff",
  },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.04)" },
};
