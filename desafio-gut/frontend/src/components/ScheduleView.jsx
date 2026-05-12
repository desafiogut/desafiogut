// ScheduleView — Calendário de Programação Junho/2026 (REQ-02, REQ-28, REQ-29).
//
// Renderiza a grade Seg–Sáb × 4 semanas + Domingos exclusivos (filtro
// automático: apenas Prata-repetição + Diamante fixo). "Hoje" e "agora"
// são calculados com Intl.DateTimeFormat usando o fuso configurável via
// VITE_TIMEZONE (default America/Sao_Paulo).
//
// Fonte de dados: src/data/programacao-junho-2026.js — modelo compacto
// codificando as REGRAS (não as 168 sessões manualmente). Quando o painel
// Admin (Fase D) atribuir clientes específicos a slots XXX, este componente
// poderá consumir um endpoint /schedule?week=N&day=D em vez do modelo
// estático.

import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import {
  DIAS, DATAS_JUNHO, NOTA_OVERNIGHT,
  tiersPorHorario, horariosDoDia, diaDaSemanaHoje, horaAgora, slotAtivoAgora,
} from "../data/programacao-junho-2026.js";

const COR = {
  primary:   "#f5a623",
  primaryDim: "rgba(245,166,35,0.15)",
  border:    "rgba(245,166,35,0.28)",
  text:      "#e8f0fe",
  muted:     "#94a3b8",
  active:    "#10b981",
};

const TZ_PADRAO = "America/Sao_Paulo";

function getTimezone() {
  return import.meta.env?.VITE_TIMEZONE || TZ_PADRAO;
}

function formatDataBR(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function ScheduleView() {
  const isMobile = useIsMobile();
  const tz = getTimezone();

  const [hoje, setHoje]     = useState(() => diaDaSemanaHoje(tz));
  const [agora, setAgora]   = useState(() => horaAgora(tz));
  const [diaAtivo, setDiaAtivo] = useState(() => diaDaSemanaHoje(tz));
  const [semana, setSemana] = useState(1);

  // Refresh "agora" a cada 30s para destacar o slot ativo.
  useEffect(() => {
    const id = setInterval(() => {
      setHoje(diaDaSemanaHoje(tz));
      setAgora(horaAgora(tz));
    }, 30_000);
    return () => clearInterval(id);
  }, [tz]);

  const horarios = useMemo(() => horariosDoDia(diaAtivo), [diaAtivo]);
  const datasDoDia = DATAS_JUNHO[diaAtivo] || [];
  const dataIso = datasDoDia[semana - 1];
  const eHoje = diaAtivo === hoje;

  const ehDomingo = diaAtivo === "sunday";

  return (
    <div style={{
      padding: isMobile ? "1rem" : "1.5rem 2rem",
      color: COR.text,
      display: "flex", flexDirection: "column", gap: "1.25rem",
    }}>
      <header>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? "1.35rem" : "1.65rem",
          fontWeight: 900, color: COR.primary,
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.05em",
        }}>📅 Programação — Junho/2026</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: isMobile ? "0.78rem" : "0.86rem", color: COR.muted, lineHeight: 1.5 }}>
          Grade semanal seg–sáb replicada por 4 semanas; domingos exclusivos com
          apenas Prata (repetição) e Diamante fixo. Fuso: <code style={{ color: COR.primary }}>{tz}</code> · agora: <strong>{agora}</strong>.
        </p>
      </header>

      {/* Seletor de semana */}
      <section aria-label="Semana">
        <div style={{
          display: "flex", gap: "0.5rem", flexWrap: "wrap",
          padding: "0.5rem", background: "rgba(5,15,40,0.4)", borderRadius: "10px",
          border: `1px solid ${COR.border}`,
        }}>
          <span style={{ fontSize: "0.74rem", color: COR.muted, fontWeight: 700, padding: "0.3rem 0.5rem" }}>Semana:</span>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setSemana(n)}
              aria-label={`Semana ${n} de Junho/2026`}
              aria-pressed={semana === n}
              style={{
                padding: "0.32rem 0.85rem",
                background: semana === n ? COR.primaryDim : "transparent",
                border: `1px solid ${semana === n ? COR.primary : "rgba(255,255,255,0.1)"}`,
                borderRadius: "20px",
                color: semana === n ? COR.primary : COR.muted,
                fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
              }}
            >Semana {n}</button>
          ))}
        </div>
      </section>

      {/* Seletor de dia da semana */}
      <section aria-label="Dia da semana">
        <div style={{
          display: "flex", gap: "0.4rem", flexWrap: "wrap",
        }}>
          {DIAS.map((d) => {
            const ativo  = d.key === diaAtivo;
            const isHoje = d.key === hoje;
            return (
              <button
                key={d.key}
                onClick={() => setDiaAtivo(d.key)}
                aria-pressed={ativo}
                style={{
                  flex: isMobile ? "1 1 calc(50% - 0.2rem)" : "0 0 auto",
                  padding: "0.45rem 0.85rem",
                  background: ativo ? COR.primaryDim : "rgba(5,15,40,0.4)",
                  border: `1px solid ${ativo ? COR.primary : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "10px",
                  color: ativo ? COR.primary : COR.text,
                  fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                  position: "relative",
                }}
              >
                {isMobile ? d.short : d.label}
                {isHoje && (
                  <span aria-label="Hoje" style={{
                    position: "absolute", top: "-6px", right: "-6px",
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: COR.active, boxShadow: `0 0 6px ${COR.active}`,
                  }} />
                )}
              </button>
            );
          })}
        </div>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", color: COR.muted }}>
          🟢 = hoje no fuso {tz}. {dataIso && <>Data desta seleção: <strong style={{ color: COR.text }}>{formatDataBR(dataIso)}/2026</strong></>}
        </p>
      </section>

      {/* Aviso para domingo */}
      {ehDomingo && (
        <div style={{
          padding: "0.85rem 1rem",
          background: "rgba(0,212,255,0.06)",
          border: "1px solid rgba(0,212,255,0.3)",
          borderRadius: "10px",
          fontSize: "0.82rem", color: COR.text, lineHeight: 1.5,
        }}>
          <strong style={{ color: "#00d4ff" }}>💎 Domingo exclusivo</strong> (REQ-29):
          a grade exibe apenas <strong>Prata (repetição)</strong> e <strong>Diamante</strong> fixo.
          Bronze e Ouro não aparecem aos domingos.
        </div>
      )}

      {/* Grade de horários */}
      <section aria-label={`Horários de ${DIAS.find((d) => d.key === diaAtivo)?.label} semana ${semana}`}>
        <ul style={{
          margin: 0, padding: 0, listStyle: "none",
          display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          {horarios.map((h, idx) => {
            const ativo = eHoje && slotAtivoAgora(h, horarios, agora);
            const { tags } = tiersPorHorario({ diaKey: diaAtivo, semana, horario: h });
            const overnight = idx === horarios.length - 1 && h === "21:00";
            return (
              <li key={h} style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "auto 1fr" : "84px 1fr auto",
                gap: isMobile ? "0.5rem" : "0.85rem",
                alignItems: "center",
                padding: "0.7rem 0.85rem",
                background: ativo ? "rgba(16,185,129,0.10)" : "rgba(5,15,40,0.55)",
                border: `1px solid ${ativo ? "rgba(16,185,129,0.4)" : "rgba(245,166,35,0.14)"}`,
                borderRadius: "12px",
              }}>
                <div style={{
                  fontSize: isMobile ? "1.05rem" : "1.15rem", fontWeight: 900,
                  color: ativo ? COR.active : COR.primary,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{h}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {tags.map((t) => (
                    <span key={t.texto} style={{
                      padding: "0.18rem 0.55rem", borderRadius: "999px",
                      fontSize: "0.66rem", fontWeight: 800,
                      color: t.cor,
                      background: `${t.cor}1f`,
                      border: `1px solid ${t.cor}55`,
                      letterSpacing: "0.04em",
                    }}>{t.texto}</span>
                  ))}
                </div>
                {!isMobile && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                    {ativo && (
                      <span style={{ fontSize: "0.66rem", color: COR.active, fontWeight: 800, letterSpacing: "0.06em" }}>● AO VIVO</span>
                    )}
                    {overnight && (
                      <span style={{ fontSize: "0.62rem", color: COR.muted }} title={NOTA_OVERNIGHT}>🌙 overnight</span>
                    )}
                  </div>
                )}
                {isMobile && (ativo || overnight) && (
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.6rem", fontSize: "0.66rem", color: COR.muted, marginTop: "0.2rem" }}>
                    {ativo && <span style={{ color: COR.active, fontWeight: 800 }}>● AO VIVO</span>}
                    {overnight && <span title={NOTA_OVERNIGHT}>🌙 overnight</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {horarios.length === 0 && (
          <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem" }}>Sem horários cadastrados para este dia.</p>
        )}
      </section>

      <footer style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: COR.muted, lineHeight: 1.5 }}>
        Modelo representativo das regras (§8 da spec). A atribuição exata
        de cliente Bronze/Prata por horário vem do painel Admin (não-implementado nesta onda).
      </footer>
    </div>
  );
}
