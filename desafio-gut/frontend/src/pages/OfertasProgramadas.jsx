// UTAC106b — Ofertas Programadas (rota /ofertas-programadas): PLACEHOLDER.
//
// PORQUE ESTE FICHEIRO EXISTE: a navegação alvo (decisão do operador, UTAC106b) tem
// «Ofertas Programadas» como 4.ª aba. A modalidade (programa de fidelidade — Passe R$ 2,00
// → 1 ponto → 50 pontos = cartão colecionável) ainda não tem ecrã próprio; este placeholder
// garante que a aba NÃO aponta para uma rota inexistente (o que quebraria o guarda
// bidirecional de rotas `mc991-rotas.test.mjs` e daria 404 ao utilizador).
//
// TRAVA: `EM_BREVE_MODE` (fonte única: `src/lib/leilaoLock.js`). Enquanto estiver LIGADO a
// página mostra «EM BREVE» e não promete nada que não exista; quando for desligado mostra um
// estado neutro de «em preparação» — NUNCA fica em branco.
//
// ⚠️ Este ficheiro NÃO cria regras de produto: descreve apenas o que a NORTE DO PRODUTO
// (Via B) já fixa. Zero lógica de saldo, de lances ou do Passe.
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import { EM_BREVE_MODE, EM_BREVE_LABEL } from "../lib/leilaoLock.js";

const COR = { gold: "#f5a623", primary: "#ff6b35", text: "#e8f0fe", muted: "#6b7db8" };

export default function OfertasProgramadas() {
  const isMobile = useIsMobile();

  return (
    <div style={{
      padding: isMobile ? "1rem" : "2rem",
      flex: 1,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
    }}>
      <GlassCard
        as="section"
        aria-label="Ofertas Programadas"
        style={{
          maxWidth: "520px", width: "100%",
          padding: isMobile ? "1.75rem 1.5rem" : "2.5rem 2.25rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: isMobile ? "2.5rem" : "3rem", lineHeight: 1 }} aria-hidden="true">🎫</div>

        <h2 style={{
          margin: "1rem 0 0.5rem",
          fontSize: isMobile ? "1.25rem" : "1.5rem",
          fontWeight: 800, color: COR.primary, letterSpacing: "0.10em",
        }}>
          {EM_BREVE_MODE ? EM_BREVE_LABEL : "Ofertas Programadas"}
        </h2>

        <p style={{
          margin: 0, color: COR.muted,
          fontSize: isMobile ? "0.9rem" : "0.95rem", lineHeight: 1.6,
        }}>
          {EM_BREVE_MODE
            ? "Programa de fidelidade: o Passe Desafio acumula pontos para trocar por cartões colecionáveis. Esta área abre em breve."
            : "Esta área está em preparação."}
        </p>
      </GlassCard>
    </div>
  );
}
