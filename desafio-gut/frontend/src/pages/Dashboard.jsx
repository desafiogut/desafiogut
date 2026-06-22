import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import GutoAvatar from "../components/GutoAvatar.jsx";
import FimLeilaoOverlay from "../components/FimLeilaoOverlay.jsx";
import GutoSpritePlayer from "../components/GutoSpritePlayer.jsx";
import { GlassCard } from "@/components/ui";

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  gold: "#f5a623", goldDark: "#e89400",
  text: "#e8f0fe", muted: "#6b7db8",
  success: "#10b981", amber: "#fbbf24", danger: "#ef4444", warning: "#f97316",
};

// 3 estágios de cor proporcionais à duração (escala para flash 30min e programado 24h).
function timerColor(tempoRestante, totalSegundos) {
  const total = Number.isFinite(totalSegundos) && totalSegundos > 0 ? totalSegundos : 1800;
  const ratio = tempoRestante / total;
  if (ratio > 0.6) return COR.success;   // verde   (>60% restante)
  if (ratio > 0.3) return COR.warning;   // laranja (30–60% restante)
  return COR.danger;                      // vermelho (<30% restante)
}

const VALOR_POR_SENHA_BRL = 2;

// MC15.4 D6 — formato de exibição por tipo.
// programado: DD:HH:MM:SS (colapsa para HH:MM:SS / MM:SS quando não há dias/horas).
// relâmpago : MM:SS.
function formatarTempoEdicao(segundos, tipo) {
  const t = Math.max(0, Number.isFinite(segundos) ? segundos : 0);
  const pad = (n) => String(n).padStart(2, "0");
  if (tipo === "relampago") {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${pad(m)}:${pad(s)}`;
  }
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (d > 0) return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// Duração total assumida por tipo (apenas para a escala de cor do timerColor):
// relâmpago 30 min, programado 24 h — alinhado às durações canónicas do app.
const TOTAL_POR_TIPO = { relampago: 1800, programado: 86400 };

// MC15.4 ITEM 7 — card de cronómetro independente por edição. timeLeft é
// derivado de termino_em (server-authoritative) a cada tick → imune a F5/login.
// A animação de fim usa a ref desta edição (Map), isolando-a das demais (ITEM 13).
function EdicaoTimerCard({ edicao, isMobile, cardCls, cardTituloStyle }) {
  const navigate = useNavigate();
  const {
    edicoesTick, timeLeftEdicaoSegundos,
  } = useAppContext();

  const restante = timeLeftEdicaoSegundos(edicao); // recalculado a cada edicoesTick
  const encerrada = restante <= 0;
  const total = TOTAL_POR_TIPO[edicao.tipo] || 1800;

  // MC39.3.1 (#5) — os cards de edição EXTRA já NÃO montam o FimLeilaoOverlay
  // full-screen (eliminava a duplicação/empilhamento quando >1 edição encerrava).
  // O overlay de vencedor é ÚNICO, ao nível da página, para a EDICAO_ATIVA. Este
  // card mostra apenas o seu estado "Encerrada" inline + GUTO a celebrar (size pequeno).
  void edicoesTick; // consumido só para forçar o re-render por tick (timer).

  const tipoLabel = edicao.tipo === "programado" ? "🎫 Programado" : "⚡ Relâmpago";

  return (
    <GlassCard className={cardCls}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? "0.5rem" : "0.75rem" }}>
        <h3 style={{ ...cardTituloStyle, margin: 0 }}>{tipoLabel}</h3>
        <span style={{
          fontSize: "0.7rem", fontWeight: "800",
          color: COR.gold,
          background: "rgba(245,166,35,0.12)",
          border: "1px solid rgba(245,166,35,0.35)",
          borderRadius: "999px",
          padding: "0.2rem 0.6rem",
          letterSpacing: "0.04em",
        }}>{edicao.id}</span>
      </div>

      <div style={{
        fontSize: "0.6rem", color: COR.muted, textTransform: "uppercase",
        letterSpacing: "0.07em", fontWeight: "700", marginBottom: "0.35rem",
      }}>
        {edicao.produto ? `Produto · ${edicao.produto}` : "Produto a anunciar"}
      </div>

      <div style={{
        display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: "0.6rem", padding: isMobile ? "0.4rem 0 0.6rem" : "0.25rem 0 0.6rem",
      }}>
        {/* MC22.1 SECÇÃO D — GUTO companion desta edição (celebra ao encerrar). */}
        <GutoSpritePlayer variant="inline" size={isMobile ? 52 : 60} mood={encerrada ? "celebrating" : undefined} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
          <div style={{
            fontSize: isMobile ? "2.1rem" : "1.95rem",
            fontWeight: "900",
            fontFamily: "'JetBrains Mono', monospace",
            color: encerrada ? COR.danger : timerColor(restante, total),
            letterSpacing: "0.02em", lineHeight: 1,
            transition: "color 0.6s ease",
          }}>{formatarTempoEdicao(restante, edicao.tipo)}</div>
          <div style={{
            fontSize: "0.66rem", color: encerrada ? "#fca5a5" : COR.text,
            marginTop: "0.3rem", textAlign: "center",
          }}>
            {encerrada ? "Encerrada" : "Em andamento — lance já!"}
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/mercado")}
        style={{
          padding: "0.6rem 1rem",
          background: encerrada
            ? "rgba(245,166,35,0.18)"
            : "linear-gradient(135deg,#f5a623,#e89400)",
          border: "none", borderRadius: "10px",
          color: encerrada ? COR.gold : "#0a0f1a",
          fontWeight: "800", cursor: "pointer",
          fontSize: "0.82rem", width: "100%",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.04em",
        }}
      >⚡ Ir para o Mercado</button>

    </GlassCard>
  );
}

const ATALHOS = [
  { label: "Depositar PIX",     icon: "💰", to: "/carteira"      },
  { label: "Converter Ficha",   icon: "🎫", to: "/carteira"      },
  { label: "Dar Lance",         icon: "🎯", to: "/mercado"       },
  { label: "Vitrine 4 Slots",   icon: "🪟", to: "/vitrine"       },
  { label: "Meus Ativos",       icon: "📊", to: "/ativos"        },
  { label: "Segurança",         icon: "🛡️", to: "/seguranca"     },
  { label: "Seja Nosso Parceiro", icon: "🤝", to: "/seja-nosso-parceiro" },
  { label: "Configurações",     icon: "⚙️", to: "/configuracoes" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    lances, vencedor,
    saldoSenhas, saldoSenhasStatus,
    saldoRsCentavos, saldoRsStatus,
    encerrado, tempoRestante, tipoLeilao, isConnected, DURACAO,
    address, userLabel, EDICAO_ATIVA,
    showOverlay, showCountdown, handleNovaRodada, setPrazoTimestamp,
    edicoes,
  } = useAppContext();

  // MC15.4 ITEM 7 — edições adicionais (todas menos R-1, que já tem o card
  // "Edição Ativa" abaixo). Cada uma renderiza um cronómetro independente.
  const edicoesExtra = Object.values(edicoes || {}).filter(
    (e) => e && e.id !== EDICAO_ATIVA
  );

  const statusSuffix =
    saldoSenhasStatus === "loading" ? " ⏳" :
    saldoSenhasStatus === "stale"   ? " (antigo)" :
    saldoSenhasStatus === "error"   ? " ✗" : "";
  const statusRsSuffix =
    saldoRsStatus === "loading" ? " ⏳" :
    saldoRsStatus === "stale"   ? " (antigo)" :
    saldoRsStatus === "error"   ? " ✗" : "";

  const totalLances  = lances.length;
  const lancesUnicos = lances.filter((l) => !l.repetido).length;
  const timerDisplay = (() => {
    const t = Math.max(0, tempoRestante);
    const d = Math.floor(t / 86400);
    const h = Math.floor((t % 86400) / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  })();

  // Modelo dual (Frente B.9): "Saldo (R$)" = saldo-rs blob (PIX → +R$,
  // comprar-senhas → -R$, lance-relâmpago → -R$). "Senhas" = saldoSenhas
  // on-chain. Os dois nunca derivam um do outro — sem duplicação.
  const saldoReais = saldoRsCentavos == null ? null : saldoRsCentavos / 100;
  const saldoReaisStr = saldoReais == null
    ? `R$ —${statusRsSuffix}`
    : `R$ ${saldoReais.toFixed(2)}${statusRsSuffix}`;

  const senhasStat = { label: "Senhas", value: `${saldoSenhas ?? "—"}${statusSuffix}`, color: "#a78bfa", icon: "🔗", to: "/carteira" };

  const stats = [
    { label: "Saldo (R$)",      value: saldoReaisStr,                    color: COR.gold,    icon: "💰", to: "/carteira" },
    senhasStat,
    { label: "Lances Únicos",   value: lancesUnicos,                     color: COR.success, icon: "✅", to: "/mercado"  },
    { label: "Total de Lances", value: totalLances,                      color: COR.amber,   icon: "📊", to: "/ativos"   },
  ];

  const cardPad   = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "2rem";
  const innerGap   = isMobile ? "0.75rem" : "1rem";

  // MC23.3 — GlassCard primitivo substitui o objeto inline card.
  const cardCls = isMobile ? "p-4" : "p-5";
  const cardTitulo = {
    margin: `0 0 ${isMobile ? "0.75rem" : "1rem"}`,
    fontSize: "0.85rem",
    fontWeight: "800",
    color: COR.gold,
    letterSpacing: "0.04em",
    fontFamily: "'Orbitron', sans-serif",
  };

  return (
    <div style={{ padding: cardPad, flex: 1 }}>
      {/* ── Saudação ── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          marginBottom: sectionGap,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: isMobile ? "0.75rem" : "1rem" }}>
          <img
            src="/assets/guto/custom/guto-bemvindo.png"
            alt="GUTO feliz — corpo inteiro"
            width={isMobile ? 80 : 120}
            height={isMobile ? 80 : 120}
            style={{ imageRendering: "auto", marginBottom: "0.75rem" }}
          />
        </div>
        <div>
          <h1 style={{
            margin: "0 0 0.35rem",
            fontSize: isMobile ? "1.3rem" : "1.6rem",
            fontWeight: "900", color: COR.text,
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}>
            {isConnected
              ? `Olá, ${userLabel || (address ? address.slice(0, 8) + "..." : "Participante")}!`
              : "Bem-vindo ao DesafioGUT!"}
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
        </div>
      </motion.header>

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
              background: "rgba(13,18,53,0.25)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(24px) saturate(135%)",
              WebkitBackdropFilter: "blur(24px) saturate(135%)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(255,255,255,0.05)",
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
        <GlassCard className={cardCls}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? "0.5rem" : "0.75rem" }}>
            <h3 style={{ ...cardTitulo, margin: 0 }}>🎯 Edição Ativa</h3>
            <span style={{
              fontSize: "0.7rem", fontWeight: "800",
              color: COR.gold,
              background: "rgba(245,166,35,0.12)",
              border: "1px solid rgba(245,166,35,0.35)",
              borderRadius: "999px",
              padding: "0.2rem 0.6rem",
              letterSpacing: "0.04em",
            }}>{EDICAO_ATIVA}</span>
          </div>

          {/* Prêmio em Disputa — placeholder até integração com a grade
              da Especificação Refatorada (slots Bronze/Prata/Ouro/Diamante).
              Por enquanto exibe apenas o card vazio com mensagem genérica. */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.65rem",
            padding: "0.6rem 0.75rem",
            background: "rgba(245,166,35,0.07)",
            border: "1px solid rgba(245,166,35,0.22)",
            borderRadius: "10px",
            marginBottom: isMobile ? "0.6rem" : "0.75rem",
          }}>
            <div style={{
              width: "52px", height: "52px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(245,166,35,0.12)",
              borderRadius: "8px", flexShrink: 0, fontSize: "1.5rem",
            }} aria-hidden="true">🎁</div>
            <div>
              <div style={{ fontSize: "0.58rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: "700", marginBottom: "0.15rem" }}>
                Prêmio em Disputa
              </div>
              <div style={{ fontSize: isMobile ? "0.78rem" : "0.82rem", color: COR.gold, fontWeight: "800", lineHeight: 1.25 }}>
                Em breve
              </div>
              <div style={{ fontSize: "0.68rem", color: COR.muted, lineHeight: 1.2 }}>
                Aguardando catálogo
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
            gap: isMobile ? "0.6rem" : "0.9rem",
            padding: isMobile ? "0.5rem 0 0.85rem" : "0.25rem 0 0.85rem",
          }}>
            {/* MC22.1 SECÇÃO D — GUTO companion da Edição Ativa (celebra ao encerrar). */}
            <GutoSpritePlayer variant="inline" size={isMobile ? 64 : 76} mood={encerrado ? "celebrating" : undefined} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
              <div style={{
                fontSize: isMobile ? "2.5rem" : "2.25rem",
                fontWeight: "900",
                fontFamily: "'JetBrains Mono', monospace",
                color: encerrado ? COR.danger : timerColor(tempoRestante, DURACAO?.[tipoLeilao]),
                letterSpacing: "0.02em",
                lineHeight: 1,
                transition: "color 0.6s ease",
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
          </div>

          <button
            onClick={() => navigate("/mercado")}
            style={{
              padding: "0.7rem 1rem",
              background: encerrado
                ? "rgba(245,166,35,0.18)"
                : "linear-gradient(135deg,#f5a623,#e89400)",
              border: "none", borderRadius: "10px",
              color: encerrado ? COR.gold : "#0a0f1a",
              fontWeight: "800", cursor: "pointer",
              fontSize: "0.88rem", width: "100%",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "0.04em",
              boxShadow: encerrado ? "none" : "0 4px 18px rgba(245,166,35,0.40)",
            }}
          >
            ⚡ Ir para o Mercado de Lances
          </button>
        </GlassCard>

        {/* Vencedor atual */}
        <GlassCard className={`${cardCls} flex flex-col ${isMobile ? 'min-h-[152px]' : ''}`}>
          <h3 style={cardTitulo}>🏆 Menor Lance Único</h3>
          {vencedor ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: COR.blue300 }}>
                {vencedor.endereco ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}` : "—"}
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
        </GlassCard>
      </section>

      {/* ── MC15.4 ITEM 7 — Outras edições com cronómetros independentes ── */}
      {edicoesExtra.length > 0 && (
        <section style={{ marginBottom: sectionGap }}>
          <h3 style={{ ...cardTitulo, marginBottom: innerGap }}>🗓️ Outras Edições em Andamento</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
            gap: innerGap,
          }}>
            {edicoesExtra.map((ed) => (
              <EdicaoTimerCard
                key={ed.id}
                edicao={ed}
                isMobile={isMobile}
                cardCls={cardCls}
                cardTituloStyle={cardTitulo}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Atalhos ── */}
      <GlassCard as="section" className={cardCls}>
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
                background: "rgba(245,166,35,0.08)",
                border: "1px solid rgba(245,166,35,0.22)",
                borderRadius: "10px",
                color: COR.gold,
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
      </GlassCard>

      {/* MC16 — overlay de fim de leilão (relâmpago e programado) */}
      {showOverlay && (
        <FimLeilaoOverlay
          vencedor={vencedor}
          tipoLeilao={tipoLeilao}
          onNovaRodada={handleNovaRodada}
          EDICAO_ATIVA={EDICAO_ATIVA}
        />
      )}

      {/* MC16 — botões temporários de teste do cronómetro (DEV only) */}
      {import.meta.env.DEV && (
        <div style={{
          position: "fixed", bottom: "80px", right: "16px", zIndex: 9999,
          display: "flex", gap: "6px", flexWrap: "wrap",
          background: "rgba(0,0,0,0.85)", padding: "10px 12px",
          borderRadius: "12px", border: "1px solid rgba(255,107,53,0.35)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          {[
            { label: "5s",  sec: 5 },
            { label: "10s", sec: 10 },
            { label: "30s", sec: 30 },
            { label: "1min", sec: 60 },
            { label: "2min", sec: 120 },
          ].map(({ label, sec }) => (
            <button
              key={sec}
              onClick={() => {
                const novo = Math.floor(Date.now() / 1000) + sec;
                setPrazoTimestamp(novo);
              }}
              style={{
                background: "linear-gradient(135deg, #ff6b35, #e55a25)",
                color: "#fff", border: "none",
                padding: "5px 10px", borderRadius: "6px",
                cursor: "pointer", fontWeight: "bold", fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >{label}</button>
          ))}
          <span style={{
            color: "#ff6b35", fontSize: "10px", fontWeight: 700,
            display: "flex", alignItems: "center", marginLeft: "4px",
            letterSpacing: "0.04em",
          }}>⏱️ TESTE</span>
        </div>
      )}

      {/* ── Footer info ── */}
      <footer style={{
        marginTop: sectionGap,
        paddingTop: "1rem",
        borderTop: "1px solid rgba(245,166,35,0.08)",
        textAlign: "center",
        fontSize: "0.7rem",
        color: "#6b7db8",
        lineHeight: 1.5,
      }}>
        DesafioGUT · Grupo União e Trabalho
        <br />
        CNPJ 23.040.066/0001-00
      </footer>
    </div>
  );
}
