// CartaoEdicao.jsx — UTAC108e.1 / UTAC109e. O cartão de edição ÚNICO do «Menor Lance Único», das «Ofertas
// Programadas» e dos dois vidros do Início (mockups v2 aprovados no UTAC108e: `docs/mockups-107a/mlc-op-v2/`).
//
// UTAC109e — o cartão da edição RELÂMPAGO é o padrão (decisão do operador): UMA só apresentação para as
// duas famílias — topo (id + estado) → ARTE da edição na largura toda (1:1 no telemóvel, 16:9 no desktop)
// com o nome e o tempo numa faixa por baixo → ACÇÃO. A variante compacta da OP (arte 64 px + GUTO ao lado
// do tempo, 108e.1 «A · Família») saiu. A ÚNICA diferença entre as famílias é a acção (`acao`):
//   • "lance"   (MLC)  → «Dar lance»,   «Seu lance (em centavos)»;
//   • "palpite" (OP)   → «Dar palpite», «Seu palpite (nº de lances)» (o palpite é um nº de lances, não R$).
// Com edição a acção real entra como `children` (o `CardLance` no MLC, o formulário do palpite na OP).
//
// `vazio` (correcção do UTAC108d): SEM edição o cartão CONTINUA no ecrã, vazio — GUTO + «Nenhuma edição em
// andamento» — e, com `acao`, o formulário da acção aparece DESLIGADO. UTAC109e: o GUTO do vazio é o GUTO
// ANIMADO 7 (o vídeo 7 do carrossel, reutilizado pelo `CarrosselGUTO`), no lugar do PNG estático; só existe
// enquanto não há edição — com edição, a arte da edição toma o lugar dele. Regra 1: tudo no mesmo vidro.
// Cores: só as de `glassTokens.js` (o dourado único é o `COR.gold`, UTAC108e.1 pendência 1).
import { GlassCard } from "@/components/ui";
import { COR } from "./glass/glassTokens.js";
import CarrosselGUTO, { SLIDES } from "./CarrosselGUTO.jsx";

/** UTAC109e — a acção de cada família: a única coisa que muda entre os cartões. */
export const ACOES = Object.freeze({
  lance: Object.freeze({ botao: "Dar lance", rotulo: "Seu lance (em centavos)" }),
  palpite: Object.freeze({ botao: "Dar palpite", rotulo: "Seu palpite (nº de lances)" }),
});

/**
 * UTAC109f (P2) — o texto do cartão VAZIO por acção. O palpite volta a ter a frase própria da OP
 * («Sem edições programadas no momento…», que saiu no 109e); sem acção (ou lance) fica o texto de
 * sempre. Um `mensagemVazio`/`ajudaVazio` explícito continua a mandar.
 */
const VAZIO_PADRAO = Object.freeze({ mensagem: "Nenhuma edição em andamento", ajuda: "Volte quando houver" });
export const VAZIO_POR_ACAO = Object.freeze({
  lance: VAZIO_PADRAO,
  palpite: Object.freeze({ mensagem: "Sem edições programadas no momento.", ajuda: "Volte quando houver" }),
});

/** UTAC109e — o GUTO animado 7 (array de módulo: referência estável para o `memo` do carrossel). */
export const GUTO_ANIMADO_7 = Object.freeze([SLIDES[6]]);

const pilula = {
  fontSize: "0.72rem", fontWeight: 800, color: COR.gold, letterSpacing: "0.02em",
  border: "1px solid rgba(245,166,35,0.35)", background: "rgba(245,166,35,0.12)",
  borderRadius: "999px", padding: "0.2rem 0.6rem", whiteSpace: "nowrap",
};
const rotuloPequeno = {
  fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COR.muted,
};
const tempoEstilo = {
  fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.06em", color: COR.gold, lineHeight: 1,
};
const tracejado = "1px dashed rgba(107,125,184,0.45)";

/** UTAC109e — o formulário da acção DESLIGADO do cartão vazio: o mesmo para o lance e para o palpite. */
function AcaoDesativada({ acao, isMobile }) {
  const a = ACOES[acao];
  const id = `${acao}-sem-edicao`;
  return (
    <div data-testid={`${acao}-desativado`} style={{ display: "grid", gap: "0.4rem" }}>
      <label htmlFor={id} style={{ ...rotuloPequeno, fontSize: "0.75rem" }}>{a.rotulo}</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.6rem" }}>
        <input
          id={id} type="number" inputMode="numeric" disabled placeholder="Abre com a edição"
          style={{ minHeight: "48px", minWidth: 0, padding: "0.6rem 0.75rem", borderRadius: "12px", border: "1px solid rgba(107,125,184,0.45)", background: "rgba(12,16,24,0.55)", color: COR.text, fontSize: isMobile ? "0.95rem" : "1rem", cursor: "not-allowed" }}
        />
        <button
          type="button" disabled
          style={{ minHeight: "48px", padding: "0 1.3rem", borderRadius: "12px", border: "none", background: COR.gold, color: "#0a0f1a", fontWeight: 800, opacity: 0.55, cursor: "not-allowed" }}
        >{a.botao}</button>
      </div>
    </div>
  );
}

/** A acção só vale se for uma chave PRÓPRIA da tabela (`Object.hasOwn`): «constructor»/«toString» não são acções. */
const acaoValida = (acao) => typeof acao === "string" && Object.hasOwn(ACOES, acao);

export default function CartaoEdicao({
  id, estado, produto, arteUrl, tempo, acao,
  vazio = false, titulo, mensagemVazio: mensagemDada, ajudaVazio: ajudaDada,
  isMobile = false, children, style, ...rest
}) {
  const nome = produto || "Prêmio a anunciar";
  const formato = isMobile ? "1 / 1" : "16 / 9";
  const temAcao = acaoValida(acao);
  const textoVazio = temAcao ? VAZIO_POR_ACAO[acao] : VAZIO_PADRAO;
  const mensagemVazio = mensagemDada ?? textoVazio.mensagem;
  const ajudaVazio = ajudaDada ?? textoVazio.ajuda;
  return (
    <GlassCard
      as="article"
      data-testid="cartao-edicao"
      data-vazio={vazio ? "true" : "false"}
      data-acao={temAcao ? acao : undefined}
      aria-label={vazio ? mensagemVazio : `Edição ${id}`}
      style={{ padding: isMobile ? "1rem" : "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0, ...style }}
      {...rest}
    >
      {/* UTAC108h.3 — nome da FAMÍLIA dentro do próprio vidro (Regra 1). Opcional e aditivo: as
          abas (MLC/OP) trazem a família no cabeçalho da página e não o passam; o Início, que mostra
          os dois vidros lado a lado, precisa de dizer a que família pertence cada um. */}
      {titulo && (
        <h3 data-testid="cartao-titulo" style={{
          margin: 0, fontFamily: "'Orbitron', sans-serif", fontSize: "0.85rem", fontWeight: 800,
          letterSpacing: "0.04em", color: COR.gold,
        }}>{titulo}</h3>
      )}
      {/* topo: id da edição + estado. (O `minWidth: 0` do cartão impede o nome em `nowrap` de alargar a
          coluna da página — medido a 375 px: sem ele a OP ganhava 27 px de overflow lateral.) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        {/* UTAC109f — sem id (vidro vazio do Início) não se desenha uma cápsula vazia. */}
        {id ? <span style={pilula}>{id}</span> : <span />}
        {estado && (
          <span data-testid="cartao-estado" style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.04em", color: estado.cor ?? COR.muted }}>
            {estado.texto}
          </span>
        )}
      </div>

      {/* o produto em destaque: a arte manda */}
      <div data-testid="cartao-vitrine" style={{
        position: "relative", borderRadius: "12px", overflow: "hidden",
        border: vazio ? tracejado : "1px solid rgba(245,166,35,0.22)",
      }}>
        {vazio ? (
          <div role="status" data-testid="cartao-vazio" style={{
            aspectRatio: formato, display: "grid", placeItems: "center", alignContent: "center",
            gap: "0.5rem", padding: "1rem", textAlign: "center", background: "rgba(5,8,24,0.55)",
          }}>
            <div data-testid="guto-animado-7">
              <CarrosselGUTO size={isMobile ? 112 : 128} slides={GUTO_ANIMADO_7} />
            </div>
            <b style={{ color: COR.text, fontSize: "1rem" }}>{mensagemVazio}</b>
            {ajudaVazio && <span style={rotuloPequeno}>{ajudaVazio}</span>}
          </div>
        ) : (
          <>
            {arteUrl ? (
              <img data-testid="cartao-arte" src={arteUrl} alt={nome}
                style={{ display: "block", width: "100%", aspectRatio: formato, objectFit: "cover" }} />
            ) : (
              <div aria-hidden="true" style={{ aspectRatio: formato, display: "grid", placeItems: "center", fontSize: "2.5rem", background: "rgba(5,8,24,0.55)" }}>🎁</div>
            )}
            {/* UTAC109f (P4) — a 375 px um tempo em TEXTO («Em andamento — palpite já!») não cabe ao lado do
                nome: com `flex: none` espremia o nome a zero. Agora o nome tem um mínimo (9rem) e, quando não
                há espaço para os dois, o tempo desce para a linha de baixo (quebra entre palavras). */}
            <div data-testid="cartao-faixa" style={{
              position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexWrap: "wrap", alignItems: "center",
              justifyContent: "space-between", gap: "0.35rem 0.6rem", padding: "0.6rem 0.75rem", background: "rgba(5,8,24,0.86)",
            }}>
              <span data-testid="cartao-nome" style={{ color: COR.gold, fontWeight: 800, flex: "1 1 9rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>
              {tempo && <span data-testid="cartao-tempo" style={{ ...tempoEstilo, fontSize: "1.15rem", flex: "0 1 auto", minWidth: 0, textAlign: "right", lineHeight: 1.15 }}>{tempo}</span>}
            </div>
          </>
        )}
      </div>

      {/* a ACÇÃO — a única coisa que muda entre as famílias */}
      {vazio && temAcao && <AcaoDesativada acao={acao} isMobile={isMobile} />}
      {children}
    </GlassCard>
  );
}
