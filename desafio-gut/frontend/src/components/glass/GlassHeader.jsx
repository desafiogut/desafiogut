// MC66 — GlassHeader (Direção C): compositor do Glass superior da aba Lances.
// Hierarquia clara: (1) barra de identidade+auth · (2) HERO "EM BREVE" (foco) +
// seletor de modo · (3) rodapé legal fino. Substitui o header monolítico inline
// de MercadoLances.jsx (remove o cronômetro vivo e o <div/> espaçador vazio).
import { GlassCard } from "@/components/ui";
import { COR } from "./glassTokens.js";
import AuthArea from "./AuthArea.jsx";
import ComingSoonHero from "./ComingSoonHero.jsx";
import ModeSelector from "./ModeSelector.jsx";
import AuctionStatusBar from "./AuctionStatusBar.jsx";

export default function GlassHeader({
  isMobile, isConnected, ready, address, userLabel, onLogin,
  tipoLeilao, setTipoLeilao, encerrado, edicao,
}) {
  return (
    <div style={{ padding: isMobile ? "1rem 1rem 0" : "1.5rem 2rem 0" }}>
      <GlassCard as="header" className="overflow-hidden">

        {/* Secção 1 — identidade + auth */}
        <div className={`flex flex-row justify-between items-center border-b border-white/10 ${isMobile ? 'gap-3 p-4' : 'gap-4 px-8 py-5'}`}>
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

        {/* Secção 2 — HERO "EM BREVE" (foco) + seletor de modo */}
        <div className={`flex flex-col items-center border-b border-white/10 ${isMobile ? 'gap-3 px-3 py-5' : 'gap-4 px-8 py-7'}`}>
          <ComingSoonHero isMobile={isMobile} edicao={edicao} />
          <ModeSelector tipoLeilao={tipoLeilao} setTipoLeilao={setTipoLeilao} />
        </div>

        {/* Secção 3 — disclaimer legal (rodapé fino) */}
        <AuctionStatusBar
          isMobile={isMobile} isConnected={isConnected} address={address} encerrado={encerrado}
        />

      </GlassCard>
    </div>
  );
}
