import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useAppContext } from "../context/AppContext.jsx";

// CotaInativa — o que o lojista vê quando a cota dele NÃO está paga.
//
// MC89.40 (F2). Até aqui o `tipo: "corporativo"` era gravado no REGISTO, e o
// painel abria a quem apenas preencheu o formulário. Este ecrã é o que passa a
// aparecer no lugar do painel enquanto a cota não estiver ativa.
//
// ⚠️ NOME DO FICHEIRO SEM ACENTO, DE PROPÓSITO. O enunciado pedia
// "EcrãCotaInativa.jsx"; um `ã` no nome de ficheiro atravessa git, bundler,
// Gradle e o sistema de ficheiros do Windows, e basta um deles normalizar o
// Unicode de forma diferente para o import deixar de resolver — num sítio só,
// e provavelmente só no APK. O conteúdo fica em português; o nome fica ASCII.
//
// ── PORQUE É QUE ISTO NÃO SE PARECE COM O EstadoNeutro (MC89.36) ─────────────
// São estados opostos e é importante que não se confundam:
//   · EstadoNeutro = "estou a descobrir quem és"  → há trabalho a decorrer,
//     logo tem pulsação e esqueleto.
//   · CotaInativa  = "já sei, e falta pagares"    → NÃO há nada a decorrer.
// Pôr aqui uma pulsação sugeriria "aguarde" a quem tem de AGIR. É a leitura ao
// contrário do checklist de estados de espera: aqui a ausência de animação é a
// mensagem.
//
// ── QUATRO REGRAS QUE VÊM DE ERROS JÁ PAGOS NESTE PROJETO ───────────────────
// 1. NÃO é uma parede. Tem o caminho para comprar, e esse caminho continua
//    acessível (a rota da carteira fica FORA do gate — ver App.jsx).
//    Lição do MC89.34: ao fechar uma porta, deixar a saída visível.
// 2. Distingue "não pagaste" de "a tua cota está incompleta". A segunda existe
//    porque o formulário do ADM define `vendida` mas não tem campo `categoria`
//    (MC89.37 §4) — e mandar comprar quem já pagou seria pior do que o defeito
//    que este MC corrige.
// 3. Reaproveita a linguagem que já existia: `CorporativoCotas.jsx:100-105` já
//    pintava "ATIVA"/"INATIVA" a verde/vermelho. Não se inventou vocabulário.
// 4. Não usa emoji nem fundo animado — é o registo do painel administrativo,
//    que é o tom certo para uma mensagem de estado de conta.

const COR = {
  text:   "#e8f0fe",
  muted:  "#94a3b8",
  perigo: "#ef4444",
  acento: "#ff6b35",
};

export default function CotaInativa() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { cotaCorporativa } = useAppContext();

  const empresa = cotaCorporativa?.empresa || null;
  // Regra 2: `vendida` true com categoria em falta não é "não pagou" — é um
  // registo incompleto, e o lojista não deve ser mandado comprar outra vez.
  const incompleta = cotaCorporativa?.vendida === true && !cotaCorporativa?.categoria;

  const pad = isMobile ? "1rem" : "1.25rem";

  return (
    <div style={{ padding: pad, flex: 1 }} data-testid="cota-inativa">
      <section
        className="gut-glass-standard gut-glass--solid"
        style={{
          padding: isMobile ? "1.5rem 1.25rem" : "2rem",
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.06em",
            padding: "0.25rem 0.6rem", borderRadius: 999,
            background: "rgba(239,68,68,0.15)",
            border: `1px solid ${COR.perigo}`,
            color: COR.perigo,
          }}>
            INATIVA
          </span>
          {empresa && (
            <span style={{ color: COR.muted, fontSize: "0.85rem" }}>{empresa}</span>
          )}
        </div>

        <h1 style={{
          margin: 0, color: COR.text, lineHeight: 1.25,
          fontSize: isMobile ? "1.15rem" : "1.35rem", fontWeight: 800,
        }}>
          {incompleta ? "A sua cota está incompleta" : "A sua cota está inativa"}
        </h1>

        <p style={{ margin: 0, color: COR.muted, fontSize: isMobile ? "0.9rem" : "0.95rem", lineHeight: 1.5 }}>
          {incompleta
            ? "O pagamento está registado, mas falta definir o nível da cota. Fale com o suporte para concluir — não precisa de comprar outra vez."
            : "Para publicar produtos e aceder a todas as funcionalidades do painel, conclua o pagamento da sua cota."}
        </p>

        {!incompleta && (
          <button
            type="button"
            onClick={() => navigate("/corporativo/carteira")}
            style={{
              marginTop: "0.25rem",
              padding: "0.8rem 1rem",
              borderRadius: 12,
              border: "none",
              background: COR.acento,
              color: "#0b1020",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Comprar cota
          </button>
        )}

        {/* Regra 1: a saída. Sem isto, um lojista sem cota ficaria com um ecrã e
            nenhuma forma de ir a lado nenhum — que é a parede que o MC89.34
            ensinou a não construir. */}
        <button
          type="button"
          onClick={() => navigate("/corporativo/cotas")}
          style={{
            background: "transparent", border: "none", color: COR.muted,
            fontSize: "0.85rem", textDecoration: "underline", cursor: "pointer",
            alignSelf: "flex-start", padding: 0,
          }}
        >
          Ver o estado da minha cota
        </button>
      </section>
    </div>
  );
}
