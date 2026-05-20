// MC11.1 — Seção pública "Seja Nosso Parceiro!".
// Rota: /seja-nosso-parceiro (pública — visível para qualquer usuário,
// logado ou não). Porta de entrada para o fluxo de cadastro corporativo.
//
// Valores das cotas (Bronze/Prata/Ouro/Diamante) refletem os mínimos
// definidos em netlify/functions/cotas.mjs (MIN_POR_CATEGORIA_BRL).

import { useState } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  text: "#e8f0fe", muted: "#5a7090", primary: "#f5a623",
  bg: "rgba(10,16,42,0.6)", bgSoft: "rgba(245,166,35,0.07)",
  teal: "#00d4aa", success: "#10b981",
};

// Planos sincronizados com MIN_POR_CATEGORIA_BRL em cotas.mjs.
const PLANOS = [
  {
    nome: "Bronze",
    valor: 660,
    cor: "#cd7f32",
    icone: "🥉",
    beneficios: [
      "Banner publicitário (formato app)",
      "Exposição em horários de Relâmpago",
      "1 voucher promocional / mês",
      "Dashboard com métricas básicas",
    ],
  },
  {
    nome: "Prata",
    valor: 1350,
    cor: "#cbd5e1",
    icone: "🥈",
    beneficios: [
      "Tudo do Bronze",
      "Banner formato site (1200×300)",
      "3 vouchers promocionais / mês",
      "Analytics 30 dias",
    ],
  },
  {
    nome: "Ouro",
    valor: 2250,
    cor: "#f5a623",
    icone: "🥇",
    destaque: true,
    beneficios: [
      "Tudo do Prata",
      "Exposição em leilões Programados (24h)",
      "10 vouchers promocionais / mês",
      "Analytics 90 dias + geolocalização",
    ],
  },
  {
    nome: "Diamante",
    valor: 4500,
    cor: "#00d4ff",
    icone: "💎",
    beneficios: [
      "Tudo do Ouro",
      "Slot exclusivo na Vitrine (4 Slots)",
      "Vouchers ilimitados",
      "Suporte prioritário + co-marketing",
    ],
  },
];

const PASSOS = [
  { n: 1, icone: "🎯", titulo: "Escolha o plano",
    texto: "Bronze, Prata, Ouro ou Diamante — cada um com um nível de exposição." },
  { n: 2, icone: "💳", titulo: "Pague via PIX",
    texto: "Pagamento confirmado libera a cota no painel da coordenação." },
  { n: 3, icone: "📣", titulo: "Anuncie e meça",
    texto: "Suba seu banner, acompanhe impressões e cliques no Painel Lojista." },
];

export default function SejaNossoParceiro() {
  const isMobile = useIsMobile();
  // MC11.17 — página convertida para modo demonstração (mock).
  // O cadastro de parceiros ainda não está aberto. O CTA exibe um modal
  // informativo sem disparar login, createWallet ou qualquer side-effect
  // no estado global. Não interfere no fluxo do usuário comum.
  const [showComingSoon, setShowComingSoon] = useState(false);
  const ctaLabel = "⚡ Quero ser um parceiro";
  const ctaDisabled = false;
  const handleCTA = () => setShowComingSoon(true);

  const wrap = {
    padding: "1rem 0",
    maxWidth: "1200px",
    margin: "0 auto",
  };
  const wrapClass = "px-4 md:px-8";
  const card = {
    background: COR.bg,
    border: "1px solid rgba(245,166,35,0.18)",
    borderRadius: "16px",
    padding: isMobile ? "1.25rem" : "1.5rem",
    backdropFilter: "blur(16px)",
  };

  return (
    <div style={wrap} className={wrapClass}>
      {/* ── HERO ── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          textAlign: "center",
          marginBottom: isMobile ? "2rem" : "3rem",
          padding: isMobile ? "1.5rem 0.5rem" : "3rem 1rem",
        }}
      >
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.35rem 0.85rem",
          background: COR.bgSoft,
          border: `1px solid ${COR.primary}55`,
          borderRadius: "999px", color: COR.primary,
          fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em",
          marginBottom: "1rem",
        }}>
          🤝 PARCEIROS DO DESAFIOGUT
        </div>
        <h1 style={{
          margin: 0,
          fontWeight: 900,
          color: COR.text,
          lineHeight: 1.15,
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.01em",
        }}
          className="text-2xl md:text-4xl"
        >
          Seja Nosso Parceiro!
        </h1>
        <p style={{
          margin: "0.75rem auto 0",
          maxWidth: "680px",
          color: COR.muted,
          fontSize: isMobile ? "0.92rem" : "1.05rem",
          lineHeight: 1.55,
        }}>
          Anuncie no DesafioGUT e alcance milhares de usuários que disputam o
          menor lance único todos os dias. Quatro planos, exposição garantida,
          métricas em tempo real.
        </p>

        <motion.button
          whileHover={ctaDisabled ? {} : { scale: 1.04 }}
          whileTap={ctaDisabled ? {} : { scale: 0.98 }}
          onClick={handleCTA}
          disabled={ctaDisabled}
          aria-busy={ctaDisabled}
          className="w-full md:w-auto"
          style={{
            marginTop: "1.5rem",
            padding: "0.9rem 2rem",
            background: ctaDisabled
              ? "rgba(245,166,35,0.25)"
              : `linear-gradient(135deg, ${COR.primary}, #e89400)`,
            border: "none", borderRadius: "12px",
            color: ctaDisabled ? "#5a7090" : "#0a0f1a",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 800, fontSize: "0.95rem",
            letterSpacing: "0.05em",
            cursor: ctaDisabled ? "wait" : "pointer",
            opacity: ctaDisabled ? 0.7 : 1,
            boxShadow: ctaDisabled ? "none" : "0 10px 30px rgba(245,166,35,0.35)",
          }}
        >
          {ctaLabel}
        </motion.button>
      </motion.header>

      {/* ── PLANOS ── */}
      <section style={{ marginBottom: isMobile ? "2rem" : "3rem" }}>
        <h2 style={{
          margin: "0 0 1.25rem",
          fontSize: isMobile ? "1.15rem" : "1.4rem",
          color: COR.primary,
          fontWeight: 800, letterSpacing: "0.04em",
          textAlign: isMobile ? "left" : "center",
        }}>
          📦 Escolha o plano que combina com sua empresa
        </h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {PLANOS.map((p, i) => (
            <motion.div
              key={p.nome}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
              style={{
                ...card,
                border: p.destaque
                  ? `2px solid ${p.cor}`
                  : "1px solid rgba(245,166,35,0.18)",
                position: "relative",
                transform: p.destaque && !isMobile ? "translateY(-8px)" : "none",
                boxShadow: p.destaque ? `0 12px 40px ${p.cor}33` : "none",
              }}
            >
              {p.destaque && (
                <span style={{
                  position: "absolute",
                  top: "-10px", left: "50%", transform: "translateX(-50%)",
                  padding: "0.2rem 0.7rem",
                  background: p.cor, color: "#0a0f1a",
                  fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.1em",
                  borderRadius: "999px",
                }}>
                  MAIS POPULAR
                </span>
              )}
              <div style={{ fontSize: "2rem", marginBottom: "0.3rem" }}>{p.icone}</div>
              <h3 style={{
                margin: 0, color: p.cor, fontWeight: 900,
                fontSize: "1.3rem", letterSpacing: "0.04em",
              }}>
                {p.nome}
              </h3>
              <div style={{
                margin: "0.5rem 0 1rem",
                fontSize: "1.7rem", fontWeight: 900, color: COR.text,
              }}>
                R$ {p.valor.toLocaleString("pt-BR")}
                <span style={{ fontSize: "0.7rem", color: COR.muted, fontWeight: 600, marginLeft: "0.3rem" }}>
                  /mês
                </span>
              </div>
              <ul style={{
                margin: 0, padding: 0, listStyle: "none",
                display: "flex", flexDirection: "column", gap: "0.45rem",
                fontSize: "0.82rem", color: COR.text,
              }}>
                {p.beneficios.map((b) => (
                  <li key={b} style={{ display: "flex", gap: "0.4rem", lineHeight: 1.4 }}>
                    <span style={{ color: COR.success, flexShrink: 0 }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section style={{ ...card, marginBottom: isMobile ? "2rem" : "3rem" }}>
        <h2 style={{
          margin: "0 0 1.5rem",
          fontSize: isMobile ? "1.1rem" : "1.3rem",
          color: COR.primary, fontWeight: 800, letterSpacing: "0.04em",
        }}>
          🛠️ Como funciona
        </h2>
        <div
          className="flex flex-col md:flex-row gap-4"
        >
          {PASSOS.map((p) => (
            <div key={p.n} style={{
              padding: "1rem",
              background: COR.bgSoft,
              border: `1px solid ${COR.primary}33`,
              borderRadius: "12px",
              textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{
                  width: "32px", height: "32px",
                  background: COR.primary, color: "#0a0f1a",
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: "0.9rem",
                }}>
                  {p.n}
                </span>
                <strong style={{ color: COR.text, fontSize: "0.95rem" }}>
                  {p.icone} {p.titulo}
                </strong>
              </div>
              <p style={{ margin: 0, color: COR.muted, fontSize: "0.85rem", lineHeight: 1.5 }}>
                {p.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{
        textAlign: "center",
        padding: isMobile ? "1.5rem 1rem" : "2.5rem",
        background: `linear-gradient(135deg, ${COR.bg}, rgba(245,166,35,0.05))`,
        borderRadius: "16px",
        border: `1px solid ${COR.primary}33`,
        marginBottom: "2rem",
      }}>
        <h2 style={{
          margin: "0 0 0.5rem",
          fontSize: isMobile ? "1.2rem" : "1.5rem",
          color: COR.text, fontWeight: 900,
        }}>
          Pronto para começar?
        </h2>
        <p style={{ margin: "0 0 1.5rem", color: COR.muted, fontSize: "0.9rem" }}>
          Cadastre-se em segundos. O cadastro de parceiros será liberado em breve.
        </p>
        <motion.button
          whileHover={ctaDisabled ? {} : { scale: 1.04 }}
          whileTap={ctaDisabled ? {} : { scale: 0.98 }}
          onClick={handleCTA}
          disabled={ctaDisabled}
          aria-busy={ctaDisabled}
          className="w-full md:w-auto"
          style={{
            padding: "0.85rem 2rem",
            background: ctaDisabled
              ? "rgba(245,166,35,0.25)"
              : `linear-gradient(135deg, ${COR.primary}, #e89400)`,
            border: "none", borderRadius: "12px",
            color: ctaDisabled ? "#5a7090" : "#0a0f1a",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 800, fontSize: "0.9rem",
            letterSpacing: "0.05em",
            cursor: ctaDisabled ? "wait" : "pointer",
            opacity: ctaDisabled ? 0.7 : 1,
            boxShadow: ctaDisabled ? "none" : "0 8px 24px rgba(245,166,35,0.3)",
          }}
        >
          {ctaLabel}
        </motion.button>
      </section>

      {/* MC11.17 — Modal "em breve" (mock) */}
      {showComingSoon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cadastro de parceiros em breve"
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(4,8,15,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowComingSoon(false)}
        >
          <div
            style={{
              background: "rgba(10,16,42,0.95)",
              border: "1px solid rgba(245,166,35,0.35)",
              borderRadius: "20px",
              padding: isMobile ? "1.5rem" : "2.5rem",
              maxWidth: "420px", width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(245,166,35,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🚧</div>
            <h2 style={{ margin: "0 0 0.75rem", color: COR.primary, fontSize: "1.2rem", fontWeight: 900 }}>
              Em breve!
            </h2>
            <p style={{ margin: "0 0 1.5rem", color: COR.text, lineHeight: 1.6, fontSize: "0.95rem" }}>
              O cadastro de parceiros será liberado em breve.{" "}
              Enquanto isso, aproveite o DesafioGUT como usuário!
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              style={{
                padding: "0.7rem 2rem",
                background: `linear-gradient(135deg, ${COR.primary}, #e89400)`,
                border: "none", borderRadius: "10px",
                color: "#0a0f1a", fontWeight: 800, fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
