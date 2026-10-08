// CartaoEdicao.jsx — UTAC108e.1. O cartão de edição ÚNICO do «Menor Lance Único» e das «Ofertas
// Programadas» (mockups v2 aprovados no UTAC108e: `docs/mockups-107a/mlc-op-v2/`, componente `.ed`).
//
// O casco é sempre o mesmo — topo (id + estado) → produto (arte real + nome) → tempo → ACÇÃO —, e a
// única coisa que muda entre as abas é a acção, que entra como `children`: o lance no MLC, o palpite
// na OP. Duas apresentações do mesmo casco:
//   • `destaque` (MLC, variante B «Produto em destaque»): a arte ocupa a largura toda, 1:1 no
//     telemóvel e 16:9 no desktop, com o nome e o tempo numa faixa por baixo;
//   • compacto (OP, variante A «Família»): arte 64 px ao lado do nome e o GUTO ao lado do tempo.
//
// `vazio` (correcção do UTAC108d): SEM edição o cartão CONTINUA no ecrã, vazio — GUTO + «Nenhuma edição
// em andamento» —, em vez de um aviso solto fora dele. Regra 1: tudo dentro do mesmo vidro.
// Cores: só as de `glassTokens.js` (o dourado único é o `COR.gold`, UTAC108e.1 pendência 1).
import { GlassCard } from "@/components/ui";
import { COR } from "./glass/glassTokens.js";

/** O GUTO do app (o mesmo do gate de entrada). */
export const GUTO_URL = "/assets/guto/custom/guto-bemvindo.png";

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

export default function CartaoEdicao({
  id, estado, produto, arteUrl, tempo, tempoRotulo = "Termina em",
  vazio = false, destaque = false,
  mensagemVazio = "Nenhuma edição em andamento", ajudaVazio = "Volte quando houver",
  isMobile = false, children, style, ...rest
}) {
  const nome = produto || "Prêmio a anunciar";
  return (
    <GlassCard
      as="article"
      data-testid="cartao-edicao"
      data-vazio={vazio ? "true" : "false"}
      data-destaque={destaque ? "true" : "false"}
      aria-label={vazio ? mensagemVazio : `Edição ${id}`}
      style={{ padding: isMobile ? "1rem" : "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0, ...style }}
      {...rest}
    >
      {/* topo: id da edição + estado. (O `minWidth: 0` do cartão impede o nome em `nowrap` de alargar a
          coluna da página — medido a 375 px: sem ele a OP ganhava 27 px de overflow lateral.) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <span style={pilula}>{id}</span>
        {estado && (
          <span data-testid="cartao-estado" style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.04em", color: estado.cor ?? COR.muted }}>
            {estado.texto}
          </span>
        )}
      </div>

      {destaque ? (
        // ── MLC B: produto em destaque ──
        <div data-testid="cartao-vitrine" style={{
          position: "relative", borderRadius: "12px", overflow: "hidden",
          border: vazio ? tracejado : "1px solid rgba(245,166,35,0.22)",
        }}>
          {vazio ? (
            <div role="status" data-testid="cartao-vazio" style={{
              aspectRatio: isMobile ? "1 / 1" : "16 / 9", display: "grid", placeItems: "center", alignContent: "center",
              gap: "0.5rem", padding: "1rem", textAlign: "center", background: "rgba(5,8,24,0.55)",
            }}>
              <img src={GUTO_URL} alt="" width={72} height={72} style={{ width: 72, height: 72, margin: "0 auto", borderRadius: 16, objectFit: "contain" }} />
              <b style={{ color: COR.text, fontSize: "1rem" }}>{mensagemVazio}</b>
              {ajudaVazio && <span style={rotuloPequeno}>{ajudaVazio}</span>}
            </div>
          ) : (
            <>
              {arteUrl ? (
                <img data-testid="cartao-arte" src={arteUrl} alt={nome}
                  style={{ display: "block", width: "100%", aspectRatio: isMobile ? "1 / 1" : "16 / 9", objectFit: "cover" }} />
              ) : (
                <div aria-hidden="true" style={{ aspectRatio: isMobile ? "1 / 1" : "16 / 9", display: "grid", placeItems: "center", fontSize: "2.5rem", background: "rgba(5,8,24,0.55)" }}>🎁</div>
              )}
              <div style={{
                position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "0.6rem", padding: "0.6rem 0.75rem", background: "rgba(5,8,24,0.86)",
              }}>
                <span style={{ color: COR.gold, fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>
                {tempo && <span data-testid="cartao-tempo" style={{ ...tempoEstilo, fontSize: "1.15rem", flex: "none" }}>{tempo}</span>}
              </div>
            </>
          )}
        </div>
      ) : (
        // ── OP A: compacto (arte 64 px + nome; GUTO + tempo) ──
        <>
          <div style={{
            display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.6rem", borderRadius: "12px",
            background: vazio ? "rgba(5,8,24,0.45)" : "rgba(245,166,35,0.07)",
            border: vazio ? tracejado : "1px solid rgba(245,166,35,0.22)",
          }}>
            {!vazio && arteUrl ? (
              <img data-testid="cartao-arte" src={arteUrl} alt={nome}
                style={{ width: 64, height: 64, borderRadius: 10, flex: "none", objectFit: "cover", display: "block" }} />
            ) : (
              <div aria-hidden="true" style={{
                width: 64, height: 64, borderRadius: 10, flex: "none", display: "grid", placeItems: "center", fontSize: "1.6rem",
                background: "rgba(5,8,24,0.6)", border: vazio ? tracejado : "none",
              }}>{vazio ? "🎫" : "🎁"}</div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={rotuloPequeno}>Prêmio</div>
              <div role={vazio ? "status" : undefined} data-testid={vazio ? "cartao-vazio" : undefined} style={{ color: vazio ? COR.text : COR.gold, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: vazio ? "normal" : "nowrap", lineHeight: 1.3 }}>
                {vazio ? mensagemVazio : nome}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <img src={GUTO_URL} alt="" width={44} height={44} style={{
              width: 44, height: 44, flex: "none", borderRadius: 12, objectFit: "contain",
              background: "rgba(5,8,24,0.55)", border: "1px solid rgba(255,255,255,0.08)", opacity: vazio ? 0.75 : 1,
            }} />
            <div>
              <div style={rotuloPequeno}>{vazio ? "Próxima edição" : tempoRotulo}</div>
              <div data-testid="cartao-tempo" style={{ ...tempoEstilo, fontSize: "1.25rem", color: vazio ? COR.muted : COR.gold }}>
                {vazio ? "—" : (tempo ?? "—")}
              </div>
            </div>
          </div>
        </>
      )}

      {/* a ACÇÃO — a única coisa que muda entre as abas */}
      {children}
    </GlassCard>
  );
}
