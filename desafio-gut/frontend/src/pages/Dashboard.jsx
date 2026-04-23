import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", blue300: "#93c5fd",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    lances, vencedor, carteiraFlash, fichasProgramadas,
    encerrado, tempoRestante, tipoLeilao, isConnected,
    address, userLabel, EDICAO_ATIVA, MOCK_MODE,
  } = useAppContext();

  const totalLances  = lances.length;
  const lancesUnicos = lances.filter((l) => !l.repetido).length;
  const timerDisplay = (() => {
    const m = String(Math.floor(tempoRestante / 60)).padStart(2, "0");
    const s = String(tempoRestante % 60).padStart(2, "0");
    return `${m}:${s}`;
  })();

  const stats = [
    { label: "Saldo Flash",     value: `R$ ${carteiraFlash.toFixed(2)}`, color: COR.primary,   icon: "💰", to: "/carteira" },
    { label: "Fichas",          value: `${fichasProgramadas} 🎫`,        color: "#a78bfa",      icon: "🎫", to: "/carteira" },
    { label: "Lances Únicos",   value: lancesUnicos,                      color: COR.success,    icon: "✅", to: "/mercado"  },
    { label: "Total de Lances", value: totalLances,                       color: COR.blue300,    icon: "📊", to: "/ativos"   },
  ];

  return (
    <div style={{ padding: "2rem", flex: 1 }}>
      {/* ── Saudação ── */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: "900", color: COR.text }}>
          {isConnected
            ? `Olá, ${userLabel || (address ? address.slice(0, 8) + "..." : "Participante")} 👋`
            : "Bem-vindo ao DesafioGUT 👋"}
        </h1>
        <p style={{ margin: 0, color: COR.muted, fontSize: "0.9rem" }}>
          {isConnected
            ? "Acompanhe seus dados e acesse o mercado de lances."
            : "Faça login para participar e dar seu lance agora."}
        </p>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map(({ label, value, color, icon, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            style={{
              background: "rgba(8,24,64,0.7)", border: `1px solid rgba(37,99,235,0.18)`,
              borderRadius: "14px", padding: "1.25rem", textAlign: "left",
              cursor: "pointer", transition: "all 0.18s",
              display: "flex", flexDirection: "column", gap: "0.4rem",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>{icon}</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "900", color }}>{value}</span>
            <span style={{ fontSize: "0.75rem", color: COR.muted, fontWeight: "600" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Edição ativa ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
        {/* Status do leilão */}
        <div style={estilos.card}>
          <h3 style={estilos.cardTitulo}>🎯 Edição Ativa</h3>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "900", fontFamily: "monospace",
                color: encerrado ? "#ef4444" : COR.gold }}>{timerDisplay}</div>
              <div style={{ fontSize: "0.65rem", color: COR.muted, textTransform: "uppercase" }}>
                {encerrado ? "ENCERRADO" : tipoLeilao === "flash" ? "⚡ Relâmpago" : "🎫 Programado"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: COR.blue300, fontWeight: "700" }}>Edição {EDICAO_ATIVA}</div>
              <div style={{ fontSize: "0.72rem", color: COR.muted }}>
                {encerrado ? "Encerrada · Aguardando nova rodada" : "Em andamento · Lance já!"}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/mercado")}
            style={{ padding: "0.6rem 1rem", background: `linear-gradient(135deg,#2563eb,#1d4ed8)`,
              border: "none", borderRadius: "10px", color: "#fff",
              fontWeight: "800", cursor: "pointer", fontSize: "0.85rem", width: "100%" }}
          >
            ⚡ Ir para o Mercado de Lances
          </button>
        </div>

        {/* Vencedor atual */}
        <div style={estilos.card}>
          <h3 style={estilos.cardTitulo}>🏆 Menor Lance Único</h3>
          {vencedor ? (
            <>
              <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: COR.blue300, marginBottom: "0.5rem" }}>
                {vencedor.endereco.slice(0, 10)}...{vencedor.endereco.slice(-6)}
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "900", color: COR.gold }}>
                R$ {(vencedor.valor / 100).toFixed(2)}
              </div>
              <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.25rem" }}>
                {encerrado ? "🏆 Vencedor final" : "🔄 Liderando — pode ser superado"}
              </div>
            </>
          ) : (
            <div style={{ color: COR.muted, fontSize: "0.85rem", padding: "1rem 0" }}>
              Nenhum lance único ainda.
            </div>
          )}
        </div>
      </div>

      {/* ── Atalhos ── */}
      <div style={estilos.card}>
        <h3 style={estilos.cardTitulo}>🚀 Acesso Rápido</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {[
            { label: "💰 Depositar PIX",    to: "/carteira"      },
            { label: "🎫 Converter Ficha",  to: "/carteira"      },
            { label: "🎯 Dar Lance",         to: "/mercado"       },
            { label: "📊 Ver Meus Ativos",  to: "/ativos"        },
            { label: "🛡️ Segurança",       to: "/seguranca"     },
            { label: "⚙️ Configurações",   to: "/configuracoes" },
          ].map(({ label, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              style={{
                padding: "0.5rem 1rem", background: COR.primaryDim,
                border: "1px solid rgba(37,99,235,0.25)", borderRadius: "20px",
                color: COR.blue300, cursor: "pointer", fontSize: "0.82rem", fontWeight: "600",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer info ── */}
      <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.72rem", color: "#334155" }}>
        DesafioGUT · Grupo União e Trabalho · CNPJ 23.040.066/0001-00
        {MOCK_MODE && <span style={{ color: "#f5a623", marginLeft: "0.5rem" }}>🧪 Beta Interno</span>}
      </div>
    </div>
  );
}

const estilos = {
  card: {
    background: "rgba(8,24,64,0.6)", border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: "16px", padding: "1.25rem",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  },
  cardTitulo: {
    margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: "800",
    color: "#93c5fd", letterSpacing: "0.03em",
  },
};
