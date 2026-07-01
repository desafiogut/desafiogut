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
import { apiGet } from "../lib/api.js";
import {
  DIAS, DATAS_JUNHO, NOTA_OVERNIGHT,
  tiersPorHorario, horariosDoDia, diaDaSemanaHoje, horaAgora, slotAtivoAgora,
  buscarGradeRemota,
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
  const [fonteGrade, setFonteGrade] = useState("estatica"); // "estatica" | "remota"
  const [filtroHorario, setFiltroHorario] = useState(null);  // MC39.3.1 (#3) — filtro por horário

  // Refresh "agora" a cada 30s para destacar o slot ativo.
  useEffect(() => {
    const id = setInterval(() => {
      setHoje(diaDaSemanaHoje(tz));
      setAgora(horaAgora(tz));
    }, 30_000);
    return () => clearInterval(id);
  }, [tz]);

  // Tenta buscar grade publicada (M-13). Se 404, mantém fallback estático.
  useEffect(() => {
    let cancelado = false;
    buscarGradeRemota("2026-06").then((g) => {
      if (!cancelado && g) setFonteGrade("remota");
    });
    return () => { cancelado = true; };
  }, []);

  // Resumo de cotas vendidas/disponíveis por categoria (M-17).
  const [resumoCotas, setResumoCotas] = useState(null);
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { ok, data } = await apiGet("cotas");
        if (!cancelado && ok && data) setResumoCotas(data.resumo || null);
      } catch { /* silencioso (igual ao .catch anterior) */ }
    })();
    return () => { cancelado = true; };
  }, []);

  const horarios = useMemo(() => horariosDoDia(diaAtivo), [diaAtivo]);
  // MC39.3.1 (#3) — clicar num horário filtra a grade para esse horário; mudar de
  // dia/semana limpa o filtro (evita filtro órfão de um horário inexistente no novo dia).
  useEffect(() => { setFiltroHorario(null); }, [diaAtivo, semana]);
  const horariosVisiveis = filtroHorario ? horarios.filter((h) => h === filtroHorario) : horarios;
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
          <span style={{
            marginLeft: "0.5rem",
            fontSize: "0.66rem",
            padding: "0.12rem 0.45rem",
            borderRadius: "999px",
            color: fonteGrade === "remota" ? COR.active : COR.muted,
            background: fonteGrade === "remota" ? `${COR.active}1f` : "rgba(255,255,255,0.05)",
            border: `1px solid ${fonteGrade === "remota" ? COR.active : "rgba(255,255,255,0.1)"}55`,
            verticalAlign: "middle",
          }} title={fonteGrade === "remota" ? "Grade publicada pelo Admin (Blob)" : "Grade estática local (fallback)"}>
            {fonteGrade === "remota" ? "● fonte: Blob" : "○ fonte: estática"}
          </span>
        </p>
      </header>

      {/* Seletor de semana */}
      <section aria-label="Semana">
        {/* MC42 P3 — barra de controlo em vidro padrao (blur 24px): o fundo animado
            deixa de atravessar. Mantem o borderRadius/border laranja como acento. */}
        <div className="gut-glass-standard" style={{
          display: "flex", gap: "0.5rem", flexWrap: "wrap",
          padding: "0.5rem", borderRadius: "10px",
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
        <div className="gut-glass-standard" style={{
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

      {/* Resumo de cotas atribuídas por categoria (M-17). */}
      {resumoCotas && (
        <section aria-label="Resumo de cotas atribuídas" style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: "0.5rem",
        }}>
          {[
            { id: "diamante", label: "Diamante", cor: "#00d4ff", total: 1  },
            { id: "ouro",     label: "Ouro",     cor: COR.primary, total: 1  },
            { id: "prata",    label: "Prata",    cor: "#cbd5e1",   total: 81 },
            { id: "bronze",   label: "Bronze",   cor: "#cd7f32",   total: 27 },
          ].map((t) => {
            const atribuidas = resumoCotas?.[t.id]?.total_atribuidas ?? 0;
            return (
              <div key={t.id} className="gut-glass-standard gut-glass--solid" style={{
                padding: "0.5rem 0.7rem",
                border: `1px solid ${t.cor}44`,
                borderRadius: "10px",
                display: "flex", flexDirection: "column", gap: "0.2rem",
              }}>
                <span style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</span>
                <strong style={{ fontSize: "0.95rem", color: t.cor, fontWeight: 800 }}>
                  {atribuidas} / {t.total}
                </strong>
                <span style={{ fontSize: "0.6rem", color: COR.muted }}>cotas atribuídas</span>
              </div>
            );
          })}
        </section>
      )}

      {/* Grade de horários */}
      <section aria-label={`Horários de ${DIAS.find((d) => d.key === diaAtivo)?.label} semana ${semana}`}>
        {/* MC39.3.1 (#3) — barra de filtro ativo por horário. */}
        {filtroHorario && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem", fontSize: "0.74rem", color: COR.muted }}>
            <span>Filtrado por horário: <strong style={{ color: COR.primary }}>{filtroHorario}</strong></span>
            <button
              onClick={() => setFiltroHorario(null)}
              style={{
                padding: "0.2rem 0.6rem", borderRadius: "999px", cursor: "pointer",
                background: COR.primaryDim, border: `1px solid ${COR.primary}`,
                color: COR.primary, fontSize: "0.7rem", fontWeight: 700,
              }}
            >Limpar filtro ✕</button>
          </div>
        )}
        <ul style={{
          margin: 0, padding: 0, listStyle: "none",
          display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          {horariosVisiveis.map((h) => {
            const ativo = eHoje && slotAtivoAgora(h, horarios, agora);
            const { tags } = tiersPorHorario({ diaKey: diaAtivo, semana, horario: h });
            const overnight = h === "21:00" && horarios[horarios.length - 1] === "21:00";
            const selecionado = filtroHorario === h;
            // MC39.3.1 (#3) — clicar no horário filtra a grade para esse horário (toggle).
            // MC42 P3 — linha de texto denso: .gut-glass--solid (navy 0.92, MC25.7)
            // no repouso; ativo/selecionado mantem o tint de acento sobre o blur.
            const toggleFiltro = () => setFiltroHorario((atual) => (atual === h ? null : h));
            return (
              <li
                key={h}
                role="button"
                tabIndex={0}
                aria-pressed={selecionado}
                aria-label={`Filtrar pelo horário ${h}`}
                onClick={toggleFiltro}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFiltro(); } }}
                className="gut-glass-standard gut-glass--solid"
                style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "auto 1fr" : "84px 1fr auto",
                gap: isMobile ? "0.5rem" : "0.85rem",
                alignItems: "center",
                padding: "0.7rem 0.85rem",
                cursor: "pointer",
                background: ativo ? "rgba(16,185,129,0.10)" : (selecionado ? "rgba(245,166,35,0.12)" : undefined),
                border: `1px solid ${ativo ? "rgba(16,185,129,0.4)" : (selecionado ? COR.primary : "rgba(245,166,35,0.14)")}`,
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
