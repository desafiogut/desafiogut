import { useMemo } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import CardLance from "../components/CardLance.jsx";
import TabelaLances from "../components/TabelaLances.jsx";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.18)",
  gold: "#f5a623", bg: "#030f24", surface: "rgba(8,30,64,0.82)",
  text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", warning: "#f97316", blue300: "#93c5fd",
};

function Confetti() {
  const pecas = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left:     `${Math.random() * 100}%`,
      delay:    `${(Math.random() * 2.5).toFixed(2)}s`,
      duration: `${(1.8 + Math.random() * 2).toFixed(2)}s`,
      color:    ["#fbbf24","#93c5fd","#6ee7b7","#f97316","#ffffff","#a78bfa","#f472b6"][i % 7],
      size:     `${6 + Math.floor(Math.random() * 9)}px`,
      rotate:   `${Math.floor(Math.random() * 360)}deg`,
    }))
  , []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10001, overflow: "hidden" }}>
      <style>{`
        @keyframes gut-confetti {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(108vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pecas.map((p) => (
        <div key={p.id} style={{
          position: "absolute", top: "-12px", left: p.left,
          width: p.size, height: p.size, borderRadius: "2px",
          background: p.color, transform: `rotate(${p.rotate})`,
          animation: `gut-confetti ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

function OverlayVencedor({ vencedor, tipoLeilao, onNovaRodada, EDICAO_ATIVA, MOCK_MODE, isMobile }) {
  const enderecoAbrev = vencedor
    ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
    : "—";
  const valorFmt = vencedor ? `R$ ${(vencedor.valor / 100).toFixed(2)}` : "—";

  return (
    <>
      <Confetti />
      <style>{`
        @keyframes gut-gold-pulse {
          0%,100% { box-shadow: 0 0 30px 8px #fbbf24, 0 0 70px 20px #f59e0b55; }
          50%      { box-shadow: 0 0 55px 18px #fbbf24, 0 0 110px 40px #f59e0b77; }
        }
        @keyframes gut-slide-up-modal {
          from { transform: translateY(60px) scale(0.92); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.90)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#0a1628 0%,#0f172a 60%)",
          border: "2px solid #fbbf24", borderRadius: "20px",
          padding: isMobile ? "1.75rem 1.25rem" : "2.5rem 2rem",
          maxWidth: "480px", width: "100%",
          textAlign: "center", color: "#e8f0fe",
          animation: "gut-gold-pulse 2s ease-in-out infinite, gut-slide-up-modal 0.5s ease-out both",
        }}>
          <div style={{ fontSize: isMobile ? "2.75rem" : "3.5rem", lineHeight: 1 }}>🏆</div>
          <h2 style={{
            margin: "0.75rem 0 0.25rem",
            fontSize: isMobile ? "1.4rem" : "1.8rem",
            fontWeight: "900",
            color: "#fbbf24", letterSpacing: "0.04em",
            textShadow: "0 0 20px #fbbf24",
          }}>LEILÃO ENCERRADO</h2>
          <p style={{ margin: "0 0 1.25rem", color: "#94a3b8", fontSize: isMobile ? "0.78rem" : "0.9rem", lineHeight: 1.5 }}>
            <strong style={{ color: COR.blue300 }}>DesafioGUT</strong>
            {" · Edição "}<strong style={{ color: COR.blue300 }}>{EDICAO_ATIVA}</strong>
            {" · "}{tipoLeilao === "flash" ? "⚡ Relâmpago" : "🎫 Programado"}
          </p>
          {vencedor ? (
            <div style={{
              background: "#0a1e38", border: `1px solid ${COR.blue300}`,
              borderRadius: "12px", padding: isMobile ? "1rem" : "1.25rem",
              marginBottom: "1.25rem",
            }}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>Carteira Vencedora</p>
              <p style={{ margin: "0 0 0.75rem", fontFamily: "monospace",
                fontSize: isMobile ? "0.85rem" : "0.95rem", color: "#e8f0fe", wordBreak: "break-all" }}>
                {enderecoAbrev}
              </p>
              <p style={{ margin: 0, fontSize: isMobile ? "1.7rem" : "2rem", fontWeight: "900",
                color: "#fbbf24", textShadow: "0 0 12px #fbbf24" }}>{valorFmt}</p>
              {MOCK_MODE && (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.7rem", color: COR.warning }}>
                  🧪 Simulação MOCK — sem validade on-chain
                </p>
              )}
            </div>
          ) : (
            <div style={{ padding: "1.25rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Nenhum lance único registrado.
            </div>
          )}
          <button
            onClick={onNovaRodada}
            style={{
              width: "100%", padding: "0.85rem", borderRadius: "10px", border: "none",
              background: "#fbbf24", color: "#0f172a", fontWeight: "800",
              fontSize: "1rem", cursor: "pointer",
            }}
          >🔄 Nova Rodada</button>
        </div>
      </div>
    </>
  );
}

const SEGURANCA_ITENS = [
  ["Argon2id",   "Hash off-chain de cada lance (hash-wasm WASM)"],
  ["EIP-191",    "Assinatura via Privy embedded wallet"],
  ["Rate Limit", "5 lances/min · cooldown 3s por carteira"],
  ["DOMPurify",  "Sanitização contra XSS em todos os campos"],
  ["Art. 20",    "Senha: R$ 2,00 por edição"],
  ["Art. 27",    "Lance mínimo: R$ 0,01 · máx. 2 casas decimais"],
  ["Art. 26",    "Apuração automática pelo Painel interno"],
];

export default function MercadoLances() {
  const isMobile = useIsMobile();
  const {
    MOCK_MODE, EDICAO_ATIVA, DURACAO, CUSTO_FICHA_BRL,
    tipoLeilao, setTipoLeilao,
    lances,
    prazoTimestamp, encerrado, showOverlay, tempoRestante, lightningActive,
    carteiraFlash, fichasProgramadas, erroCarteira,
    address, isConnected, userLabel, ready,
    vencedor,
    handleSimularPix, handleConverterFicha,
    abrirModal, desconectar,
    handleLanceSucesso, handleNovaRodada, refreshSaldo,
  } = useAppContext();

  const timerDisplay = (() => {
    const m = String(Math.floor(tempoRestante / 60)).padStart(2, "0");
    const s = String(tempoRestante % 60).padStart(2, "0");
    return `${m}:${s}`;
  })();

  const duracao     = DURACAO[tipoLeilao];
  const timerCor    = encerrado ? COR.danger : tempoRestante <= 5 ? COR.danger : tempoRestante <= 15 ? COR.warning : tipoLeilao === "flash" ? COR.gold : COR.primary;
  const timerPctDeg = encerrado ? 0 : (tempoRestante / duracao) * 360;
  const timerUrgente = !encerrado && tempoRestante <= 5 && tempoRestante > 0;
  const timerSize   = isMobile ? 110 : 90;

  const pad      = isMobile ? "1rem" : "2rem";
  const padTight = isMobile ? "0.75rem 1rem" : "0.6rem 2rem";

  return (
    <>
      <style>{`
        @keyframes gut-timer-pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
      `}</style>

      {showOverlay && (
        <OverlayVencedor
          vencedor={vencedor}
          tipoLeilao={tipoLeilao}
          onNovaRodada={handleNovaRodada}
          EDICAO_ATIVA={EDICAO_ATIVA}
          MOCK_MODE={MOCK_MODE}
          isMobile={isMobile}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

        {/* ── Header ── */}
        <header style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "1rem" : "1.25rem 2rem",
          gap: isMobile ? "0.75rem" : "1rem",
          background: "rgba(5,15,40,0.88)",
          borderBottom: "1px solid rgba(37,99,235,0.18)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>
          {/* Linha superior em mobile: logo + auth lado a lado */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: isMobile ? "space-between" : "flex-start",
            width: isMobile ? "100%" : "auto",
            gap: "0.6rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              <span style={{ fontSize: isMobile ? "1.4rem" : "2rem" }}>🏆</span>
              <div style={{ minWidth: 0 }}>
                <h1 style={{
                  margin: 0,
                  fontSize: isMobile ? "1.05rem" : "1.5rem",
                  fontWeight: "900", color: "#fff",
                  letterSpacing: "0.04em",
                  textShadow: "0 0 20px rgba(37,99,235,0.5)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>DesafioGUT</h1>
                {!isMobile && (
                  <p style={{ margin: 0, fontSize: "0.75rem", color: COR.blue300, letterSpacing: "0.04em", fontWeight: "600" }}>
                    E-commerce através de Dropshipping
                  </p>
                )}
              </div>
            </div>

            {isMobile && (
              <AuthArea
                isConnected={isConnected} ready={ready} address={address} userLabel={userLabel}
                onLogin={abrirModal} compact
              />
            )}
          </div>

          {/* Timer — sempre central */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <p style={{ margin: 0, fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {encerrado ? "encerrado" : tipoLeilao === "flash" ? "⚡ relâmpago" : "🎫 programado"}
            </p>
            <div
              className={lightningActive ? "gut-lightning-active" : ""}
              style={{
                position: "relative", width: `${timerSize}px`, height: `${timerSize}px`, borderRadius: "50%",
                background: `conic-gradient(${timerCor} ${timerPctDeg}deg, rgba(255,255,255,0.04) ${timerPctDeg}deg)`,
                padding: "4px",
                boxShadow: `0 0 ${timerUrgente ? "28px" : "12px"} ${timerCor}${timerUrgente ? "aa" : "44"}`,
                transition: "box-shadow 0.6s",
              }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%", background: COR.bg,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px",
              }}>
                <span style={{
                  fontSize: isMobile ? "1.55rem" : "1.25rem", fontWeight: "900", fontFamily: "monospace",
                  color: timerCor, lineHeight: 1,
                  animation: timerUrgente ? "gut-timer-pulse 0.65s ease-in-out infinite" : "none",
                  transition: "color 0.4s",
                }}>{timerDisplay}</span>
                <span style={{ fontSize: "0.5rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {encerrado ? "fim" : "min:seg"}
                </span>
              </div>
            </div>
            <div style={{ width: `${timerSize}px`, height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                width: `${encerrado ? 0 : (tempoRestante / duracao) * 100}%`,
                background: `linear-gradient(90deg, ${timerCor}88, ${timerCor})`,
                transition: "width 1s linear, background 0.4s",
                boxShadow: `0 0 5px ${timerCor}`,
              }} />
            </div>
          </div>

          {/* Auth desktop */}
          {!isMobile && (
            <AuthArea
              isConnected={isConnected} ready={ready} address={address} userLabel={userLabel}
              onLogin={abrirModal} MOCK_MODE={MOCK_MODE}
            />
          )}
        </header>

        {/* ── Painel saldos + tipo ── */}
        <div style={{
          background: "rgba(3,10,28,0.92)",
          borderBottom: "1px solid rgba(37,99,235,0.18)",
          padding: padTight,
          display: "flex", flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? "0.6rem" : "0.75rem",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{
            display: "flex",
            gap: isMobile ? "0.6rem" : "1.25rem",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: isMobile ? "space-between" : "flex-start",
          }}>
            <div style={saldoItemStyle}>
              <span style={saldoLabelStyle}>Flash</span>
              <span style={{ ...saldoValueStyle, color: COR.primary }}>R$ {carteiraFlash.toFixed(2)}</span>
            </div>
            <div style={saldoItemStyle}>
              <span style={saldoLabelStyle}>Fichas</span>
              <span style={{ ...saldoValueStyle, color: "#a78bfa" }}>{fichasProgramadas} 🎫</span>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button onClick={handleSimularPix} style={chipBtnStyle("blue")}
                title="Simula depósito PIX de R$ 10,00 (Art. 21)">
                + PIX R$ 10
              </button>
              <button
                onClick={handleConverterFicha}
                disabled={carteiraFlash < CUSTO_FICHA_BRL}
                style={{
                  ...chipBtnStyle("purple"),
                  opacity: carteiraFlash < CUSTO_FICHA_BRL ? 0.4 : 1,
                  cursor: carteiraFlash < CUSTO_FICHA_BRL ? "not-allowed" : "pointer",
                }}
                title={`Art. 20: R$ ${CUSTO_FICHA_BRL.toFixed(2)} → 1 ficha`}
              >→ 1 Ficha (R$ {CUSTO_FICHA_BRL.toFixed(2)})</button>
            </div>
            {erroCarteira && <span style={{ fontSize: "0.72rem", color: COR.danger }}>⚠️ {erroCarteira}</span>}
          </div>

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.68rem", color: COR.muted, marginRight: "0.2rem" }}>Modo:</span>
            {[{ id: "flash", label: "⚡ Relâmpago" }, { id: "programado", label: "🎫 Programado" }].map(({ id, label }) => {
              const ativo = tipoLeilao === id;
              const cor   = id === "flash" ? COR.gold : "#a78bfa";
              return (
                <button key={id} onClick={() => setTipoLeilao(id)}
                  style={{
                    padding: "0.32rem 0.7rem", borderRadius: "16px",
                    border: `1px solid ${ativo ? cor : "rgba(255,255,255,0.1)"}`,
                    fontSize: "0.72rem", fontWeight: "700", cursor: "pointer",
                    color: ativo ? cor : COR.muted,
                    background: ativo ? `${cor}20` : "transparent",
                    transition: "all 0.18s",
                  }}>{label}</button>
              );
            })}
          </div>
        </div>

        {/* ── Aviso ── */}
        <div style={{
          background: "rgba(3,10,28,0.9)",
          borderBottom: "1px solid rgba(37,99,235,0.15)",
          padding: padTight,
          fontSize: isMobile ? "0.72rem" : "0.78rem",
          color: "#64748b",
          lineHeight: 1.4,
        }}>
          <strong>DesafioGUT</strong>{" — "}Grupo União e Trabalho · CNPJ 23.040.066/0001-00
          {!isMobile && " · www.grupouniaoetrabalho.com.br"}
          {isConnected && (
            <span style={{
              display: isMobile ? "block" : "inline",
              marginLeft: isMobile ? 0 : "1rem",
              marginTop: isMobile ? "0.25rem" : 0,
              color: "#86efac",
            }}>✅ {address?.slice(0, 6)}...{address?.slice(-4)}</span>
          )}
          {encerrado && (
            <span style={{
              display: isMobile ? "block" : "inline",
              marginLeft: isMobile ? 0 : "1rem",
              marginTop: isMobile ? "0.25rem" : 0,
              color: COR.danger, fontWeight: "700",
            }}>🔴 Leilão encerrado — novos lances bloqueados</span>
          )}
        </div>

        {/* ── Grid principal ── */}
        <main style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1.6fr",
          gap: isMobile ? "1rem" : "1.5rem",
          padding: isMobile ? "1rem" : "1.5rem 2rem",
          flex: 1,
        }}>
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <CardLance
              idEdicao={EDICAO_ATIVA}
              onLanceSucesso={handleLanceSucesso}
              address={address}
              isConnected={isConnected}
              onConnect={abrirModal}
              onDisconnect={desconectar}
              encerrado={encerrado}
              tipoLeilao={tipoLeilao}
              carteiraFlash={carteiraFlash}
              fichasProgramadas={fichasProgramadas}
              onRefreshSaldo={refreshSaldo}
              ready={ready}
            />

            <div style={{
              background: "rgba(5,15,40,0.6)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              borderRadius: "16px",
              padding: isMobile ? "1rem" : "1.25rem",
              display: "flex", flexDirection: "column", gap: "0.5rem",
              border: "1px solid rgba(37,99,235,0.15)",
            }}>
              <h4 style={{ margin: "0 0 0.5rem", color: COR.blue300, fontSize: "0.85rem", fontWeight: "700" }}>
                🛡️ Segurança e Transparência
              </h4>
              {SEGURANCA_ITENS.map(([nome, desc]) => (
                <div key={nome} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                  <span style={{
                    minWidth: isMobile ? "70px" : "78px",
                    fontSize: "0.7rem", fontWeight: "700",
                    color: COR.blue300, background: COR.primaryDim,
                    padding: "0.2rem 0.5rem", borderRadius: "6px",
                    flexShrink: 0,
                    border: "1px solid rgba(37,99,235,0.25)",
                    textAlign: "center",
                  }}>{nome}</span>
                  <span style={{ fontSize: "0.74rem", color: COR.muted, lineHeight: 1.5 }}>{desc}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <TabelaLances lances={lances} idEdicao={EDICAO_ATIVA} prazoTimestamp={prazoTimestamp} />
          </section>
        </main>

        {/* ── Footer ── */}
        <footer style={{
          padding: isMobile ? "1rem" : "1rem 2rem",
          borderTop: "1px solid rgba(37,99,235,0.12)",
          textAlign: "center",
          fontSize: isMobile ? "0.7rem" : "0.76rem",
          color: COR.muted,
          lineHeight: 1.6,
        }}>
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} <strong>DesafioGUT</strong> · Grupo União e Trabalho
            {!isMobile && (
              <>
                {" · "}
                <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT" target="_blank" rel="noopener noreferrer" style={{ color: COR.blue300 }}>Privacidade</a>
                {" · "}
                <a href="https://www.grupouniaoetrabalho.com.br" target="_blank" rel="noopener noreferrer" style={{ color: COR.blue300 }}>grupouniaoetrabalho.com.br</a>
              </>
            )}
          </p>
          {!isMobile && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "#334155" }}>
              Implantação: <strong style={{ color: COR.muted }}>1º de junho de 2026</strong>
              {" · "}Beta v0.9 · React 18 · Vite 8
            </p>
          )}
        </footer>
      </div>
    </>
  );
}

const saldoItemStyle = {
  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px",
};
const saldoLabelStyle = {
  fontSize: "0.66rem", color: COR.muted,
  textTransform: "uppercase", letterSpacing: "0.07em",
};
const saldoValueStyle = {
  fontSize: "0.95rem", fontWeight: "800",
};
function chipBtnStyle(variant) {
  const palette = variant === "purple"
    ? { color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.38)" }
    : { color: COR.blue300, bg: COR.primaryDim, border: "rgba(37,99,235,0.38)" };
  return {
    padding: "0.32rem 0.85rem",
    background: palette.bg,
    border: `1px solid ${palette.border}`,
    borderRadius: "20px",
    color: palette.color,
    fontSize: "0.72rem", fontWeight: "800",
    cursor: "pointer",
  };
}

function AuthArea({ isConnected, ready, address, userLabel, onLogin, compact, MOCK_MODE }) {
  if (!isConnected) {
    return (
      <button
        onClick={onLogin}
        disabled={!ready}
        style={{
          padding: compact ? "0.45rem 0.9rem" : "0.6rem 1.4rem",
          background: "linear-gradient(135deg,#2563eb,#1d40af)",
          color: "#fff", border: "none", borderRadius: "28px",
          fontWeight: "800", fontSize: compact ? "0.78rem" : "0.88rem",
          letterSpacing: "0.03em",
          cursor: ready ? "pointer" : "wait",
          opacity: ready ? 1 : 0.7,
          boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
          flexShrink: 0,
        }}
      >{ready ? "⚡ Entrar" : "⏳"}</button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: compact ? "flex-end" : "flex-end", gap: compact ? 0 : "0.5rem" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.45rem",
        background: COR.primaryDim, padding: compact ? "0.35rem 0.7rem" : "0.45rem 1rem",
        borderRadius: "28px",
        border: "1px solid rgba(37,99,235,0.30)",
      }}>
        <span style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: COR.success, flexShrink: 0,
          boxShadow: `0 0 6px ${COR.success}`,
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
          {userLabel && !compact && (
            <span style={{
              fontSize: "0.72rem", color: COR.blue300, fontWeight: "700",
              maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{userLabel}</span>
          )}
          {address && (
            <span style={{ fontFamily: "monospace", fontSize: compact ? "0.74rem" : "0.82rem" }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <span style={badgeStyle}>🔒 LGPD</span>
          <span style={badgeStyle}>🧪 Beta</span>
          {MOCK_MODE && <span style={{ ...badgeStyle, color: COR.gold, borderColor: "#92400e" }}>🔧 MOCK</span>}
        </div>
      )}
    </div>
  );
}

const badgeStyle = {
  padding: "0.18rem 0.6rem",
  background: COR.primaryDim,
  borderRadius: "20px",
  fontSize: "0.68rem",
  border: "1px solid rgba(37,99,235,0.28)",
  color: COR.blue300,
};
