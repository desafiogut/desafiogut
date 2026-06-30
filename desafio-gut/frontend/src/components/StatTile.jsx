// StatTile — tile de KPI/estatística clicável (MC39.22.1 — EX-5).
//
// Padrão único dos tiles de stat: Button variant="secondary" (.gut-glass-standard),
// conforme a decisão de design já documentada (memória glass-kpi-button-secondary:
// "tiles de stat clicáveis usam variant=secondary; ghost fica fora do padrão").
// Antes do MC39.22.1 o markup vivia inline em Dashboard.jsx (botão glass cru,
// responsivo) e CorporativoDashboard.jsx (Button secondary, tamanhos fixos) — duas
// implementações do mesmo conceito. Aqui ficam num componente só, no padrão Button.
//
// Props: label, value, color (cor do valor), icon, e navegação via `to` (rota) ou
// `onClick`. `className` propaga padding/grid do caller (ex.: cardCls). Tamanhos
// responsivos (useIsMobile) cobrem o caso do Dashboard (valor com ellipsis para não
// estourar em telas estreitas, ex.: "R$ —  (antigo)").

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { useIsMobile } from "../hooks/useIsMobile.js";

const MUTED = "#6b7db8";

export default function StatTile({ label, value, color, icon, to, onClick, className = "" }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const handle = onClick || (to ? () => navigate(to) : undefined);
  return (
    <Button
      variant="secondary"
      onClick={handle}
      className={`${className} !flex !flex-col !items-start !gap-1 !text-left !h-auto`}
    >
      <span style={{ fontSize: isMobile ? "1.1rem" : "1.4rem", lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: isMobile ? "1.15rem" : "1.5rem", fontWeight: 900, color,
        lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: "100%",
      }}>{value}</span>
      <span style={{
        fontSize: isMobile ? "0.7rem" : "0.75rem", color: MUTED, fontWeight: 600, letterSpacing: "0.02em",
      }}>{label}</span>
    </Button>
  );
}
