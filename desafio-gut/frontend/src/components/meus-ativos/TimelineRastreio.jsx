import { COR } from "./_estilo.js";
import { construirTimeline } from "../../lib/rastreio.js";

// Sem passos recebidos, os 5 passos pendentes: o componente também garante os 5, não só a lib.
const PASSOS_VAZIOS = construirTimeline([]).passos;

/**
 * Timeline do rastreio — MC102.1a. Apresentacional: recebe o que `construirTimeline` (src/lib/rastreio.js)
 * devolve — 5 passos + alertas — ou um `fallback`, e só mostra.
 *
 * Fallback (P9): só o código em bruto, sem link nem URL inventada.
 * P8: não recebe nem mostra local, descrição, nome ou morada — só rótulos e datas.
 */
export default function TimelineRastreio({ passos = PASSOS_VAZIOS, alertas = [], fallback = null, isMobile = false }) {
  if (fallback) {
    return (
      <p data-rastreio="fallback" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: COR.muted }}>
        Código de rastreio: <code style={{ color: COR.text }}>{fallback.codigo}</code>
      </p>
    );
  }
  return (
    <div data-rastreio="timeline" style={{ marginTop: "0.6rem" }}>
      {alertas.map((a, i) => (
        <p key={`${a.codigo}-${i}`} role="status" data-alerta={a.codigo}
          style={{ margin: "0 0 0.4rem", padding: "0.45rem 0.7rem", borderRadius: "10px", fontSize: "0.78rem",
            fontWeight: 700, color: COR.primary, background: COR.primaryDim, border: `1px solid ${COR.primary}` }}>
          ⚠️ {a.rotulo}{dataCurta(a.data) ? ` · ${dataCurta(a.data)}` : ""}
        </p>
      ))}
      <ol aria-label="Andamento da entrega"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "0.3rem" : "0.5rem" }}>
        {passos.map((p) => (
          <li key={p.codigo} data-passo={p.codigo} data-feito={p.feito ? "true" : "false"}
            aria-label={`${p.rotulo}: ${p.feito ? "concluído" : "pendente"}`}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.74rem",
              color: p.feito ? COR.success : COR.muted, fontWeight: p.feito ? 700 : 400 }}>
            <span aria-hidden="true">{p.feito ? "●" : "○"}</span>
            <span>
              {p.rotulo}
              {dataCurta(p.data) && <small style={{ display: "block", fontWeight: 400, color: COR.muted }}>{dataCurta(p.data)}</small>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** "2026-09-23T12:00:00Z" → "23/09" (hora de Brasília); data ilegível → "". */
function dataCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}
