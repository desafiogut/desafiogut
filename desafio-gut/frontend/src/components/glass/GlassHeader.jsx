// MC66 — GlassHeader (Direção C): compositor do Glass superior da aba Lances.
// Hierarquia clara: (1) barra de identidade+auth · (2) frase + seletor de modo (UTAC108d: saiu o
// HERO "EM BREVE") · (3) rodapé legal fino. Substitui o header monolítico inline
// de MercadoLances.jsx (remove o cronômetro vivo e o <div/> espaçador vazio).
import { GlassCard } from "@/components/ui";
import { COR } from "./glassTokens.js";
import AuthArea from "./AuthArea.jsx";
import AuctionStatusBar from "./AuctionStatusBar.jsx";

// UTAC107d — envelope alinhado com a Carteira (R18-B): lado `1rem`/`2rem` e TOPO `1rem`/`2rem`
// (era `1.5rem` no desktop), padding interno das secções 20 px no desktop (era `px-8` = 32 px).
// `frase` (opcional): a frase da modalidade passa a viver DENTRO deste vidro (Regra 1) — antes
// flutuava solta por cima dele, em `MercadoLances.jsx`.
export default function GlassHeader({
  isMobile, isConnected, ready, address, userLabel, onLogin,
  encerrado, frase, // UTAC108d: `edicao` só servia ao herói removido
  // UTAC108e.1 (pendência 2 = «fixar Relâmpago»): saiu o seletor de modo — `modalidade`/`setModalidade`
  // deixaram de entrar aqui. Entram o `titulo` da aba e o `selo` do tipo (mockup v2, cabeçalho `.cab-aba`).
  titulo, selo,
}) {
  return (
    <div style={{ padding: isMobile ? "1rem 1rem 0" : "2rem 2rem 0" }}>
      <GlassCard as="header" className="overflow-hidden">

        {/* Secção 1 — identidade + auth */}
        <div className={`flex flex-row justify-between items-center border-b border-white/10 ${isMobile ? 'gap-3 p-4' : 'gap-4 px-5 py-5'}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            <span style={{ fontSize: isMobile ? "1.4rem" : "1.8rem" }}>🏆</span>
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontSize: isMobile ? "1.05rem" : "1.5rem",
                fontWeight: "800", color: COR.primary,
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: "0.04em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>DesafioGUT</h1>
              {!isMobile && (
                <p style={{ margin: 0, fontSize: "0.75rem", color: COR.gold, letterSpacing: "0.04em", fontWeight: "600" }}>
                  E-commerce através de Dropshipping
                </p>
              )}
            </div>
          </div>

          <AuthArea
            isConnected={isConnected} ready={ready} address={address} userLabel={userLabel}
            onLogin={onLogin} compact={isMobile}
          />
        </div>

        {/* Secção 2 — título da aba + frase + selo do tipo. UTAC108d (R18-A): saiu o herói «EM BREVE».
            UTAC108e.1: saiu o SELETOR DE MODO (decisão do operador: o MLC fica fixo em Relâmpago — o
            Programado vive nas Ofertas Programadas); no lugar dele, o selo «⚡ Relâmpago» do mockup v2. */}
        <div className={`flex flex-row flex-wrap justify-between items-center border-b border-white/10 ${isMobile ? 'gap-3 px-4 py-5' : 'gap-4 px-5 py-6'}`}>
          <div style={{ minWidth: 0 }}>
            {titulo && (
              <h2 data-testid="titulo-aba" style={{
                margin: 0, fontFamily: "'Orbitron', sans-serif", fontWeight: 800, letterSpacing: "0.03em",
                fontSize: isMobile ? "1.15rem" : "1.4rem", color: COR.primary,
              }}>{titulo}</h2>
            )}
            {frase && (
              <p data-testid="frase-mlc" style={{
                margin: titulo ? "0.3rem 0 0" : 0,
                fontSize: isMobile ? "0.9rem" : "1rem",
                // `COR.gold` (glassTokens) — desde o UTAC108e.1 é o dourado único #f5a623.
                fontWeight: 700, color: COR.gold, letterSpacing: "0.01em",
              }}>{frase}</p>
            )}
          </div>
          {selo && (
            <span data-testid="selo-modo" style={{
              flex: "none", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em", color: COR.gold,
              border: "1px solid rgba(245,166,35,0.35)", background: "rgba(245,166,35,0.12)",
              borderRadius: "999px", padding: "0.25rem 0.65rem",
            }}>{selo}</span>
          )}
        </div>

        {/* Secção 3 — disclaimer legal (rodapé fino) */}
        <AuctionStatusBar
          isMobile={isMobile} isConnected={isConnected} address={address} encerrado={encerrado}
        />

      </GlassCard>
    </div>
  );
}
