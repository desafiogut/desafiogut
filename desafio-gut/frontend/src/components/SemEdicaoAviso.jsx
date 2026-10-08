// SemEdicaoAviso.jsx — UTAC108d. Estado vazio do «Menor Lance Único» quando não há edição em andamento.
// Copy: o enunciado dizia «a decorrer» (pt-PT); usa-se a forma pt-BR «em andamento» (regra «pt-BR sempre», 107g.2).
//
// Substitui o herói «EM BREVE» gigante do cabeçalho (o mockup aprovado do 107d tira-o: «Cabeçalho: só o
// título e uma frase»). O sinal é o `EM_BREVE_MODE` (R18-B do UTAC108d — LIDO, nunca alterado): enquanto
// estiver ligado, nenhuma edição corre. Regra 1: dentro de vidro.
import { GlassCard } from "@/components/ui";
import { COR } from "./glass/glassTokens.js";

export default function SemEdicaoAviso() {
  return (
    <GlassCard role="status" data-testid="sem-edicao" style={{ padding: "1rem 1.1rem", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: COR.text, lineHeight: 1.4 }}>
        ⏳ Nenhuma edição em andamento.
      </p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: COR.muted, lineHeight: 1.4 }}>
        Volte quando houver.
      </p>
    </GlassCard>
  );
}
