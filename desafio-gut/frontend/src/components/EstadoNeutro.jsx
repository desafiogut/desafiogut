import { useIsMobile } from "../hooks/useIsMobile.js";

// EstadoNeutro — o que se mostra enquanto a app AINDA NÃO SABE quem é o
// utilizador.
//
// MC89.36. Antes disto, esse intervalo era preenchido com o Dashboard comum —
// isto é, a app AFIRMAVA "és um utilizador comum" sem base para o dizer. Medido
// no aparelho (MC89.35): entre 5,7 s (funções quentes) e 12,0 s (a frio) a
// mostrar o produto errado a um lojista que pagou entre R$ 2.640 e R$ 18.000
// por uma cota.
//
// ⚠️ TRÊS RESTRIÇÕES QUE NÃO SÃO DECORATIVAS — cada uma vem de um erro já pago.
//
// R-A — NÃO PODE SER `return null`, E TEM DE OCUPAR O MESMO ESPAÇO.
//   Já se tentou devolver `null` neste sítio (App.jsx:135-148 conta a história):
//   o Dashboard, já pintado desde os ~1,7 s, DESAPARECIA durante ~1,2 s. CLS
//   medido: 0,373, em duas deslocações do rodapé de altura 0 ↔ 154. Por isso
//   este componente imita a PEGADA do Dashboard — mesmo `padding`, mesmo bloco
//   de vidro no topo, mesma grelha de 4 KPIs — e não uma caixa centrada.
//
// R-B — NÃO É PARA VISITANTES.
//   Quem decide é `decidirDestino` (lib/encaminhamento.js), e a porta de entrada
//   lá é `pareceAutenticado`. Para um visitante anónimo o Dashboard não é o
//   produto errado: é a página pública de entrada, e tem de aparecer já.
//
// R-C — TEM PRAZO.
//   Também em `decidirDestino`. Sem ele, um /cotas que nunca resolvesse prendia
//   o utilizador aqui para sempre — pior do que o defeito que isto corrige.
//
// ── PORQUE É QUE NÃO TEM BARRA DE PROGRESSO, ESTIMATIVA NEM CANCELAR ─────────
// Auditei o desenho com o checklist de estados de espera (MC89.35 §3). Das dez
// categorias, quatro aplicam-se a uma espera de ~5 s em que o "trabalho" é
// descobrir quem é o utilizador:
//   ✅ pulsação (prova de vida)  ✅ uma linha honesta do que está a acontecer
//   ✅ forma do shell (lê-se como "a montar", não como "avariou")
//   ✅ o cabeçalho e o saldo otimista já pintados MANTÊM-SE
// As outras seis ficaram DE FORA DE PROPÓSITO, e escrevo-o para que a ausência
// seja decisão e não esquecimento: barra de progresso e estimativa de tempo são
// ruído numa espera de 5 s; cancelar não faz sentido (não há operação do
// utilizador para cancelar); e "celebrar" o fim seria animar o normal.
//
// ⚠️ O TEXTO NÃO PODE PROMETER O PAINEL. "A preparar a sua área…" e não "A abrir
// o painel do lojista": neste instante ainda não se sabe o perfil, e prometer o
// painel a um utilizador comum seria repetir o mesmo erro ao contrário.

const COR = {
  text:  "#e8f0fe",
  muted: "#94a3b8",
};

/** Bloco cinzento com pulsação, do tamanho do conteúdo que substitui. */
function Barra({ altura, largura = "100%", raio = 8 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: altura,
        width: largura,
        borderRadius: raio,
        background: "rgba(148, 163, 184, 0.16)",
        animation: "gut-fade 1.6s ease-in-out infinite",
      }}
    />
  );
}

export default function EstadoNeutro() {
  const isMobile = useIsMobile();

  // Os MESMOS tokens do Dashboard.jsx:132-134. Se lá mudarem, aqui tem de mudar
  // também — é o que mantém a pegada igual e o CLS em zero.
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "2rem";
  const innerGap   = isMobile ? "0.75rem" : "1rem";

  return (
    <div style={{ padding: cardPad, flex: 1 }} data-testid="estado-neutro">
      {/* Uma só região viva para o leitor de ecrã. O resto é aria-hidden: são
          formas, não informação, e anunciá-las seria ruído. */}
      <div role="status" aria-live="polite">
        {/* Bloco de topo — ocupa o lugar da saudação em vidro (Dashboard.jsx:147) */}
        <section
          className="gut-glass-standard"
          style={{
            marginBottom: sectionGap,
            padding: isMobile ? "1.25rem 1rem" : "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isMobile ? "0.75rem" : "1rem",
          }}
        >
          <Barra altura={isMobile ? 116 : 176} largura={isMobile ? 116 : 176} raio={16} />
          <p style={{
            margin: 0,
            color: COR.text,
            fontSize: isMobile ? "0.95rem" : "1.05rem",
            fontWeight: 700,
            textAlign: "center",
            animation: "gut-fade 1.6s ease-in-out infinite",
          }}>
            A preparar a sua área…
          </p>
          <p style={{
            margin: 0,
            color: COR.muted,
            fontSize: isMobile ? "0.75rem" : "0.85rem",
            textAlign: "center",
            lineHeight: 1.4,
          }}>
            Só um instante enquanto confirmamos a sua conta.
          </p>
        </section>

        {/* Grelha de 4 — o lugar dos KPIs (Dashboard.jsx:218-231). Mesma
            geometria, para que a troca não desloque nada por baixo. */}
        <section
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(auto-fit, minmax(160px, 1fr))",
            gap: innerGap,
            marginBottom: sectionGap,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="gut-glass-standard" style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
              <Barra altura={12} largura="60%" />
              <div style={{ height: innerGap }} />
              <Barra altura={20} largura="80%" />
            </div>
          ))}
        </section>

        {/* Faixa larga — o lugar da edição ativa (Dashboard.jsx:234+). */}
        <section
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: innerGap,
          }}
        >
          {[0, 1].map((i) => (
            <div key={i} className="gut-glass-standard" style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
              <Barra altura={12} largura="40%" />
              <div style={{ height: innerGap }} />
              <Barra altura={56} />
            </div>
          ))}
        </section>
      </div>

      {/* `gut-fade` é o mesmo keyframe do RouteFallback (App.jsx:70). Fica
          declarado aqui também porque este componente pode ser o primeiro (ou o
          único) a montar, e não deve depender de outro ter corrido antes. */}
      <style>{`@keyframes gut-fade { 0%,100% { opacity: 0.45 } 50% { opacity: 1 } }`}</style>
    </div>
  );
}
