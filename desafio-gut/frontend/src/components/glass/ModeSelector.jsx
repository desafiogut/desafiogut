// MC66 — ModeSelector extraído de MercadoLances.jsx.
// Corrige [B] do MC65: o "Programado" usava #a78bfa (roxo, fora da paleta).
// Agora ambos usam tokens oficiais: flash=gold (#ff9500), programado=primary (#ff6b35).
import { COR } from "./glassTokens.js";

const MODOS = [
  { id: "flash",      label: "⚡ Relâmpago", cor: COR.gold },
  { id: "programado", label: "🎫 Programado", cor: COR.primary },
];

export default function ModeSelector({ tipoLeilao, setTipoLeilao }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.68rem", color: COR.muted, marginRight: "0.2rem" }}>Modo:</span>
      {MODOS.map(({ id, label, cor }) => {
        const ativo = tipoLeilao === id;
        return (
          <button
            key={id}
            onClick={() => setTipoLeilao(id)}
            aria-pressed={ativo}
            style={{
              padding: "0.32rem 0.7rem", borderRadius: "16px",
              border: `1px solid ${ativo ? cor : "rgba(255,255,255,0.1)"}`,
              fontSize: "0.72rem", fontWeight: "700", cursor: "pointer",
              color: ativo ? cor : COR.muted,
              background: ativo ? `${cor}20` : "transparent",
              transition: "all 0.18s",
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}
