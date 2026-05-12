// Vitrine — 4 slots de categoria conforme Especificação Refatorada §2 e §3.2.
//
// REQ-13 (Desktop): grid de 4 slots simultaneamente visíveis.
// REQ-14 (Mobile <768px): Slot 1 (Diamante) e Slot 2 (Ouro) sticky no topo.
// REQ-15 (Mobile <768px): Slot 3 (Prata) e Slot 4 (Bronze) em carrossel horizontal.
//
// Esta rota COEXISTE com /mercado (página atual de leilão R-1 preservada).
// Cada SlotCard hoje é vitrine informativa + CTA → /mercado. O backend de
// cotas (Wallet, voucher, estado vendido/disponível) é implementado em ondas
// posteriores; aqui ficam os dados estáticos da spec.

import { Link } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  bg:      "#0a0f1a",
  surface: "rgba(8,30,64,0.82)",
  text:    "#e8f0fe",
  muted:   "#94a3b8",
  border:  "rgba(245,166,35,0.15)",
};

// Dados das categorias — fonte da verdade: docs/especificacao-extraida.md REQ-04..07
const SLOTS = [
  {
    id: "diamante",
    nome: "Diamante",
    posicao: 1,
    emoji: "💎",
    cor: "#00d4ff",
    corDim: "rgba(0,212,255,0.18)",
    corBorda: "rgba(0,212,255,0.45)",
    cotasDisponiveis: 1,
    exclusiva: true,
    valorContrato: "R$ 18.000,00",
    valorMinProduto: "R$ 4.500,00",
    beneficios: ["2 banners rotativos", "28 banners app", "10 bônus (vouchers VIP)"],
    tipoLeilao: "Programado · 24 h",
    rotuloSecao: "Slot fixo do topo",
  },
  {
    id: "ouro",
    nome: "Ouro",
    posicao: 2,
    emoji: "🥇",
    cor: "#f5a623",
    corDim: "rgba(245,166,35,0.18)",
    corBorda: "rgba(245,166,35,0.45)",
    cotasDisponiveis: 1,
    exclusiva: true,
    valorContrato: "R$ 11.000,00",
    valorMinProduto: "R$ 2.250,00",
    beneficios: ["2 banners rotativos", "20 banners app"],
    tipoLeilao: "Programado · 24 h",
    rotuloSecao: "Slot fixo do topo",
  },
  {
    id: "prata",
    nome: "Prata",
    posicao: 3,
    emoji: "🥈",
    cor: "#cbd5e1",
    corDim: "rgba(203,213,225,0.16)",
    corBorda: "rgba(203,213,225,0.40)",
    cotasDisponiveis: 81,
    exclusiva: true,
    valorContrato: "R$ 5.600,00",
    valorMinProduto: "R$ 1.350,00",
    beneficios: ["1 banner fixo", "12 banners app"],
    tipoLeilao: "Relâmpago · 30 min – 1 h",
    rotuloSecao: "Oportunidade Agora",
  },
  {
    id: "bronze",
    nome: "Bronze",
    posicao: 4,
    emoji: "🥉",
    cor: "#cd7f32",
    corDim: "rgba(205,127,50,0.18)",
    corBorda: "rgba(205,127,50,0.45)",
    cotasDisponiveis: 27,
    exclusiva: false,
    valorContrato: "R$ 2.640,00",
    valorMinProduto: "R$ 660,00",
    beneficios: ["1 banner vitrine", "8 banners app"],
    tipoLeilao: "Relâmpago · 30 min – 1 h",
    rotuloSecao: "Oportunidade Agora",
  },
];

function SlotCard({ slot, isMobile, sticky }) {
  return (
    <article
      style={{
        position: sticky ? "sticky" : "relative",
        top:      sticky ? "0.5rem" : undefined,
        zIndex:   sticky ? 5 : undefined,
        background:    "linear-gradient(155deg, rgba(5,15,40,0.92) 0%, rgba(8,30,64,0.85) 100%)",
        border:        `1px solid ${slot.corBorda}`,
        borderRadius:  "16px",
        padding:       isMobile ? "1rem" : "1.25rem",
        display:       "flex",
        flexDirection: "column",
        gap:           "0.6rem",
        boxShadow:     `0 4px 18px rgba(0,0,0,0.35), 0 0 0 1px ${slot.corDim}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        minHeight:     isMobile ? undefined : "320px",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: isMobile ? "1.5rem" : "1.75rem", lineHeight: 1 }} aria-hidden="true">{slot.emoji}</span>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: isMobile ? "0.92rem" : "1.05rem",
              fontWeight: 800,
              color: slot.cor,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>{slot.nome}</h3>
            <p style={{ margin: 0, fontSize: "0.65rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Slot {slot.posicao} · {slot.rotuloSecao}
            </p>
          </div>
        </div>
        <span style={{
          fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em",
          padding: "0.22rem 0.55rem", borderRadius: "999px",
          color: slot.cor, background: slot.corDim, border: `1px solid ${slot.corBorda}`,
          textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          {slot.exclusiva ? "Exclusiva" : "Não exclusiva"}
        </span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 0.75rem" }}>
        <Info label="Cotas" value={`${slot.cotasDisponiveis}`} />
        <Info label="Tipo" value={slot.tipoLeilao} small />
        <Info label="Contrato" value={slot.valorContrato} />
        <Info label="Mín. produto" value={slot.valorMinProduto} />
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {slot.beneficios.map((b) => (
          <li key={b} style={{ fontSize: "0.72rem", color: COR.text, display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
            <span style={{ color: slot.cor, fontWeight: 800 }} aria-hidden="true">✦</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <Link
        to="/mercado"
        style={{
          marginTop: "auto",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "0.6rem 0.9rem",
          background: `linear-gradient(135deg, ${slot.cor}, ${slot.cor}cc)`,
          color: "#0f172a", fontWeight: 800, fontSize: "0.8rem",
          borderRadius: "10px", textDecoration: "none",
          letterSpacing: "0.04em",
          boxShadow: `0 4px 14px ${slot.corDim}`,
        }}
      >Participar do leilão →</Link>
    </article>
  );
}

function Info({ label, value, small }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: "0.58rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, fontSize: small ? "0.72rem" : "0.82rem", color: COR.text, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

export default function Vitrine() {
  const isMobile = useIsMobile();
  const sticky   = SLOTS.filter((s) => s.posicao <= 2);   // Diamante + Ouro
  const carossel = SLOTS.filter((s) => s.posicao > 2);    // Prata + Bronze

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.5rem 2rem", color: COR.text, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <header>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? "1.35rem" : "1.75rem",
          fontWeight: 900,
          color: "#f5a623",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.05em",
        }}>Vitrine — Slots por Categoria</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: isMobile ? "0.78rem" : "0.86rem", color: COR.muted, lineHeight: 1.5 }}>
          Quatro slots paralelos da Especificação Refatorada §2 e §3.2.
          Diamante e Ouro são <strong style={{ color: "#f5a623" }}>fixos no topo</strong>;
          Prata e Bronze rodam em <strong style={{ color: "#f5a623" }}>Oportunidade Agora</strong>.
        </p>
      </header>

      {/* ── Destaques sempre visíveis (sticky em mobile, primeiras 2 colunas em desktop) ── */}
      <section
        aria-label="Destaques fixos no topo"
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "1rem",
        }}
      >
        {sticky.map((slot) => (
          <SlotCard key={slot.id} slot={slot} isMobile={isMobile} sticky={isMobile} />
        ))}
      </section>

      {/* ── Oportunidade Agora ── */}
      <section aria-label="Oportunidade Agora — Prata e Bronze">
        <h2 style={{
          margin: "0 0 0.6rem",
          fontSize: isMobile ? "0.85rem" : "0.95rem",
          fontWeight: 800,
          color: COR.text,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>⚡ Oportunidade Agora</h2>

        {isMobile ? (
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              paddingBottom: "0.5rem",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {carossel.map((slot) => (
              <div key={slot.id} style={{ flex: "0 0 86%", scrollSnapAlign: "start" }}>
                <SlotCard slot={slot} isMobile={isMobile} sticky={false} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {carossel.map((slot) => (
              <SlotCard key={slot.id} slot={slot} isMobile={isMobile} sticky={false} />
            ))}
          </div>
        )}
      </section>

      <footer style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: COR.muted, lineHeight: 1.5 }}>
        Vitrine em modo informativo · Pipeline de lance em <code style={{ color: "#f5a623" }}>/mercado</code> (Edição R-1, validada em produção).
      </footer>
    </div>
  );
}
