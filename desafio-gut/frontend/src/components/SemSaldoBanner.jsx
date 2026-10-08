// SemSaldoBanner.jsx — UTAC108c (D-1, Opção A do operador).
//
// O botão «Menor Lance Único» da Carteira passou a navegar SEMPRE; o saldo verifica-se aqui, no
// DESTINO. O aviso INFORMA — não esconde a página nem bloqueia nada (o lance em si continua
// bloqueado no CardLance, `semSaldoRsFlash`).
//
// R18-A (decisão do operador): o aviso só aparece com o saldo LIDO e igual a R$ 0,00. `null` quer
// dizer «ainda não sei» (sem login, a carregar, erro) — afirmar «Sem saldo» aí seria falso.
// R18-B: contas corporativas não o vêem (o saldo que lhes conta são senhas on-chain, não R$).
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui";
import { COR } from "./glass/glassTokens.js";

/** Decide se o aviso aparece. Pura — sem coerção: só o número 0 conta como «sem saldo». */
export function mostrarAvisoSemSaldo({ isConnected, saldoRsCentavos, saldoRsStatus, tipoProvavel, modalidade }) {
  // UTAC108c.1 (N3 do validador do 108c) — no modo «Programado» o lance usa SENHAS on-chain, não R$:
  // quem tem R$ 0,00 e senhas > 0 lia «Sem saldo» e mesmo assim conseguia licitar. É a mesma
  // `modalidade` ("flash" | "programado") que decide o débito no CardLance (`isProgramado`).
  if (modalidade === "programado") return false;
  if (isConnected !== true) return false;
  if (tipoProvavel === "corporativo") return false;
  if (saldoRsStatus !== "ok" && saldoRsStatus !== "stale") return false;
  return saldoRsCentavos === 0;
}

export default function SemSaldoBanner() {
  const navigate = useNavigate();
  return (
    <GlassCard role="status" data-testid="sem-saldo" style={{
      padding: "0.9rem 1rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "0.75rem", flexWrap: "wrap",
    }}>
      <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: COR.text, lineHeight: 1.4 }}>
        ⚠️ Sem saldo. Carregar agora?
      </p>
      <button
        type="button"
        onClick={() => navigate("/carteira")}
        style={{
          minHeight: "44px", padding: "0.55rem 1rem", borderRadius: "10px", border: "none",
          background: COR.gold, color: "#0a0f1a", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
        }}
      >
        Carregar PIX →
      </button>
    </GlassCard>
  );
}
