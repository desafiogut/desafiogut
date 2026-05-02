import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", blue300: "#93c5fd",
};

const ATALHOS = [
  { label: "Depositar PIX",   icon: "💰", to: "/carteira"      },
  { label: "Converter Ficha", icon: "🎫", to: "/carteira"      },
  { label: "Dar Lance",       icon: "🎯", to: "/mercado"       },
  { label: "Meus Ativos",     icon: "📊", to: "/ativos"        },
  { label: "Segurança",       icon: "🛡️", to: "/seguranca"     },
  { label: "Configurações",   icon: "⚙️", to: "/configuracoes" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    lances, vencedor, carteiraFlash, fichasProgramadas,
    saldoSenhas, saldoSenhasStatus,
    encerrado, tempoRestante, tipoLeilao, isConnected,
    address, userLabel, EDICAO_ATIVA, MOCK_MODE,
  } = useAppContext();

  const statusSuffix =
    saldoSenhasStatus === "loading" ? " ⏳" :
    saldoSenhasStatus === "stale"   ? " (antigo)" :
    saldoSenhasStatus === "error"   ? " ✗" : "";

  const totalLances  = lances.length;
  const lancesUnicos = lances.filter((l) => !l.repetido).length;
  const timerDisplay = (() => {
    const m = String(Math.floor(tempoRestante / 60)).padStart(2, "0");
    const s = String(tempoRestante % 60).padStart(2, "0");
    return `${m}:${s}`;
  })();

  const senhasStat = MOCK_MODE
    ? { label: "Fichas", value: `${fichasProgramadas}`,                     color: "#a78bfa", icon: "🎫", to: "/carteira" }
    : { label: "Senhas", value: `${saldoSenhas ?? "—"}${statusSuffix}`,     color: "#a78bfa", icon: "🔗", to: "/carteira" };

  const stats = [
    { label: "Saldo Flash",     value: `R$ ${carteiraFlash.toFixed(2)}`, color: COR.primary, icon: "💰", to: "/carteira" },
    senhasStat,
    { label: "Lances Únicos",   value: lancesUnicos,                     color: COR.success, icon: "✅", to: "/mercado"  },
    { label: "Total de Lances", value: totalLances,                      color: COR.blue300, icon: "📊", to: "/ativos"   },
  ];

  const cardPad   = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "2rem";
  const innerGap   = isMobile ? "0.75rem" : "1rem";

  const card = {
    background: "rgba(8,24,64,0.6)",
    border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: "16px",
    padding: cardPad,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
  const cardTitulo = {
    margin: `0 0 ${isMobile ? "0.75rem" : "1rem"}`,
    fontSize: "0.85rem",
    fontWeight: "800",
    color: COR.blue300,
    letterSpacing: "0.04em",
  };

  return (
    <div style={{ padding: cardPad, flex: 1 }}>
      {/* ── Saudação ── */}
      <header style={{ marginBottom: sectionGap }}>
        <h1 style={{
          margin: "0 0 0.35rem",
          fontSize: isMobile ? "1.3rem" : "1.6rem",
          fontWeight: "900", color: COR.text,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}>
          {isConnected
            ? `Olá, ${userLabel || (address ? address.slice(0, 8) + "..." : "Participante")} 👋`
            : "Bem-vindo ao DesafioGUT 👋"}
        </h1>
        <p style={{
          margin: 0,
          color: COR.muted,
          fontSize: isMobile ? "0.82rem" : "0.92rem",
          lineHeight: 1.4,
        }}>
          {isConnected
            ? "Acompanhe seus dados e acesse o mercado de lances."
            : "Faça login para participar e dar seu lance agora."}
        </p>
      </header>

      {/* ── KPIs ── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "repeat(2, minmax(0, 1fr))"
          : "repeat(auto-fit, minmax(160px, 1fr))",
        gap: innerGap,
        marginBottom: sectionGap,
      }}>
        {stats.map(({ label, value, color, icon, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            style={{
              ...card,
              padding: isMobile ? "0.85rem 0.9rem" : "1.1rem 1.25rem",
              borderRadius: "14px",
              textAlign: "left",
              cursor: "pointer", transition: "all 0.18s",
              display: "flex", flexDirection: "column", gap: "0.35rem",
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: isMobile ? "1.1rem" : "1.4rem", lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: isMobile ? "1.15rem" : "1.5rem",
              fontWeight: "900", color,
              lineHeight: 1.1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{value}</span>
            <span style={{
              fontSize: isMobile ? "0.7rem" : "0.75rem",
              color: COR.muted, fontWeight: "600",
              letterSpacing: "0.02em",
            }}>{label}</span>
          </button>
        ))}
      </section>

      {/* ── Edição ativa ── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: innerGap,
        marginBottom: sectionGap,
      }}>
        {/* Status do leilão */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? "0.5rem" : "0.75rem" }}>
            <h3 style={{ ...cardTitulo, margin: 0 }}>🎯 Edição Ativa</h3>
            <span style={{
              fontSize: "0.7rem", fontWeight: "800",
              color: COR.blue300,
              background: "rgba(37,99,235,0.12)",
              border: "1px solid rgba(37,99,235,0.3)",
              borderRadius: "999px",
              padding: "0.2rem 0.6rem",
              letterSpacing: "0.04em",
            }}>{EDICAO_ATIVA}</span>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "0.15rem",
            padding: isMobile ? "0.75rem 0 1rem" : "0.5rem 0 1rem",
          }}>
            <div style={{
              fontSize: isMobile ? "2.5rem" : "2.25rem",
              fontWeight: "900",
              fontFamily: "monospace",
              color: encerrado ? "#ef4444" : COR.gold,
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}>{timerDisplay}</div>
            <div style={{
              fontSize: "0.68rem", color: COR.muted,
              textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700",
            }}>
              {encerrado ? "ENCERRADO" : tipoLeilao === "flash" ? "⚡ Relâmpago" : "🎫 Programado"}
            </div>
            <div style={{
              fontSize: "0.78rem", color: encerrado ? "#fca5a5" : COR.text,
              marginTop: "0.4rem", textAlign: "center",
            }}>
              {encerrado ? "Aguardando nova rodada" : "Em andamento — lance já!"}
            </div>
          </div>

          <button
            onClick={() => navigate("/mercado")}
            style={{
              padding: "0.7rem 1rem",
              background: encerrado
                ? "rgba(37,99,235,0.18)"
                : "linear-gradient(135deg,#2563eb,#1d4ed8)",
              border: "none", borderRadius: "10px",
              color: encerrado ? COR.blue300 : "#fff",
              fontWeight: "800", cursor: "pointer",
              fontSize: "0.88rem", width: "100%",
              boxShadow: encerrado ? "none" : "0 4px 14px rgba(37,99,235,0.35)",
            }}
          >
            ⚡ Ir para o Mercado de Lances
          </button>
        </div>

        {/* Vencedor atual */}
        <div style={{ ...card, minHeight: isMobile ? "152px" : "auto", display: "flex", flexDirection: "column" }}>
          <h3 style={cardTitulo}>🏆 Menor Lance Único</h3>
          {vencedor ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: COR.blue300 }}>
                {vencedor.endereco.slice(0, 10)}...{vencedor.endereco.slice(-6)}
              </div>
              <div style={{
                fontSize: isMobile ? "1.85rem" : "2rem",
                fontWeight: "900", color: COR.gold, lineHeight: 1.1,
              }}>
                R$ {(vencedor.valor / 100).toFixed(2)}
              </div>
              <div style={{ fontSize: "0.72rem", color: COR.muted }}>
                {encerrado ? "🏆 Vencedor final" : "🔄 Liderando — pode ser superado"}
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              color: COR.muted, fontSize: "0.85rem", textAlign: "center", gap: "0.35rem",
            }}>
              <div style={{ fontSize: "1.5rem", opacity: 0.5 }}>🎯</div>
              <div>Nenhum lance único ainda.</div>
            </div>
          )}
        </div>
      </section>

      {/* ── Atalhos ── */}
      <section style={card}>
        <h3 style={cardTitulo}>🚀 Acesso Rápido</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.5rem",
        }}>
          {ATALHOS.map(({ label, icon, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              style={{
                display: "flex", alignItems: "center", gap: "0.45rem",
                padding: "0.65rem 0.85rem",
                background: COR.primaryDim,
                border: "1px solid rgba(37,99,235,0.25)",
                borderRadius: "10px",
                color: COR.blue300,
                cursor: "pointer",
                fontSize: "0.8rem", fontWeight: "600",
                transition: "all 0.15s",
                textAlign: "left",
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: "0.95rem", flexShrink: 0 }}>{icon}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Footer info ── */}
      <footer style={{
        marginTop: sectionGap,
        paddingTop: "1rem",
        borderTop: "1px solid rgba(37,99,235,0.08)",
        textAlign: "center",
        fontSize: "0.7rem",
        color: "#334155",
        lineHeight: 1.5,
      }}>
        DesafioGUT · Grupo União e Trabalho
        <br />
        CNPJ 23.040.066/0001-00
        {MOCK_MODE && <div style={{ color: COR.gold, marginTop: "0.4rem", fontWeight: "700" }}>🧪 Beta Interno</div>}
      </footer>
    </div>
  );
}
