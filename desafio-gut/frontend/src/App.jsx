import { useState, useEffect, useMemo } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getCarteiraFlash,
  getFichasProgramadas,
  simularDepositoPix,
  converterEmFichas,
  CUSTO_FICHA_BRL,
} from "./utils/saldoInterno.js";
import TermosConsentimento from "./components/TermosConsentimento.jsx";
import TabelaLances from "./components/TabelaLances.jsx";
import CardLance from "./components/CardLance.jsx";

// ─── Constantes ───────────────────────────────────────────────────────────────
const MOCK_MODE    = import.meta.env.VITE_MOCK_MODE === "true";
const EDICAO_ATIVA = "R-1";
const LS_LANCES    = "gut_lances_r1";

// Durações por tipo — Art. 8 do regulamento
const DURACAO = {
  flash:      MOCK_MODE ? 30  : 300,    // Relâmpago: 5 min
  programado: MOCK_MODE ? 60  : 1800,   // Programado: 30 min
};

// Paleta azul marinho — Grupo União e Trabalho
const COR = {
  primary:    "#2563eb",
  primaryDim: "rgba(37,99,235,0.18)",
  gold:       "#f5a623",
  bg:         "#030f24",
  surface:    "rgba(8,30,64,0.82)",
  text:       "#e8f0fe",
  muted:      "#4a6490",
  success:    "#10b981",
  danger:     "#ef4444",
  warning:    "#f97316",
  blue300:    "#93c5fd",
};

const LANCES_MOCK = [
  { endereco: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", valor: 5,  repetido: false, txHash: "0xabc123def456" },
  { endereco: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4294ee", valor: 3,  repetido: true,  txHash: "0xdef456abc789" },
  { endereco: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", valor: 3,  repetido: true,  txHash: "0xghi789jkl012" },
  { endereco: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", valor: 8,  repetido: false, txHash: "0xjkl012mno345" },
];

// ─── Confetti ─────────────────────────────────────────────────────────────────
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

// ─── Overlay Vencedor ─────────────────────────────────────────────────────────
function OverlayVencedor({ vencedor, tipoLeilao, onNovaRodada }) {
  const enderecoAbrev = vencedor
    ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
    : "—";
  const valorFmt = vencedor
    ? `R$ ${(vencedor.valor / 100).toFixed(2)}`
    : "—";

  return (
    <>
      <Confetti />
      <style>{`
        @keyframes gut-gold-pulse {
          0%,100% { box-shadow: 0 0 30px 8px #fbbf24, 0 0 70px 20px #f59e0b55; }
          50%      { box-shadow: 0 0 55px 18px #fbbf24, 0 0 110px 40px #f59e0b77; }
        }
        @keyframes gut-slide-up {
          from { transform: translateY(60px) scale(0.92); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.90)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#0a1628 0%,#0f172a 60%)",
          border: "2px solid #fbbf24", borderRadius: "20px",
          padding: "2.5rem 2rem", maxWidth: "480px", width: "100%",
          textAlign: "center", color: "#e8f0fe",
          animation: "gut-gold-pulse 2s ease-in-out infinite, gut-slide-up 0.5s ease-out both",
        }}>
          <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🏆</div>
          <h2 style={{ margin: "0.75rem 0 0.25rem", fontSize: "1.8rem", fontWeight: "900",
            color: "#fbbf24", letterSpacing: "0.04em", textShadow: "0 0 20px #fbbf24" }}>
            LEILÃO ENCERRADO
          </h2>
          <p style={{ margin: "0 0 1.5rem", color: "#94a3b8", fontSize: "0.9rem" }}>
            <strong style={{ color: COR.blue300 }}>Desafio Gut</strong>
            {" · Edição "}<strong style={{ color: COR.blue300 }}>{EDICAO_ATIVA}</strong>
            {" · "}{tipoLeilao === "flash" ? "⚡ Relâmpago" : "🎫 Programado"}
            {" · "}Menor Lance Único
          </p>

          {vencedor ? (
            <div style={{
              background: "#0a1e38", border: `1px solid ${COR.blue300}`,
              borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem",
            }}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>Carteira Vencedora</p>
              <p style={{ margin: "0 0 0.75rem", fontFamily: "monospace",
                fontSize: "0.95rem", color: "#e8f0fe", wordBreak: "break-all" }}>
                {enderecoAbrev}
              </p>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "900",
                color: "#fbbf24", textShadow: "0 0 12px #fbbf24" }}>
                {valorFmt}
              </p>
              {MOCK_MODE && (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", color: COR.warning }}>
                  🧪 Simulação MOCK — sem validade on-chain
                </p>
              )}
            </div>
          ) : (
            <div style={{ padding: "1.5rem", color: "#64748b", marginBottom: "1.5rem" }}>
              Nenhum lance único registrado.
            </div>
          )}

          <button
            onClick={onNovaRodada}
            style={{
              width: "100%", padding: "0.85rem", borderRadius: "10px", border: "none",
              background: "#fbbf24", color: "#0f172a", fontWeight: "800",
              fontSize: "1rem", cursor: "pointer", letterSpacing: "0.02em",
            }}
          >
            🔄 Nova Rodada
          </button>
        </div>
      </div>
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Consentimento LGPD ──────────────────────────────────────────────────────
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);

  // ── Tipo de leilão (Art. 8) ─────────────────────────────────────────────────
  const [tipoLeilao, setTipoLeilao] = useState("flash");

  // ── Lances ──────────────────────────────────────────────────────────────────
  const [lances, setLances] = useState(() => {
    try {
      const salvo = localStorage.getItem(LS_LANCES);
      return salvo ? JSON.parse(salvo) : LANCES_MOCK;
    } catch { return LANCES_MOCK; }
  });

  // ── Timer ────────────────────────────────────────────────────────────────────
  const [prazoTimestamp, setPrazoTimestamp] = useState(
    () => Math.floor(Date.now() / 1000) + DURACAO.flash
  );
  const [encerrado,     setEncerrado]      = useState(false);
  const [showOverlay,   setShowOverlay]    = useState(false);
  const [tempoRestante, setTempoRestante]  = useState(DURACAO.flash);
  const [lightningActive, setLightningActive] = useState(false);

  // ── Carteiras internas (Art. 20: R$ 2,00/senha) ─────────────────────────────
  const [carteiraFlash,     setCarteiraFlash]     = useState(() => getCarteiraFlash());
  const [fichasProgramadas, setFichasProgramadas] = useState(() => getFichasProgramadas());
  const [erroCarteira,      setErroCarteira]      = useState("");

  // ── Privy ─────────────────────────────────────────────────────────────────
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  console.log('Privy Ready:', ready);

  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const realAddress = privyWallet?.address ?? null;

  const [mockAddress, setMockAddress] = useState(null);
  const address     = MOCK_MODE ? mockAddress : realAddress;
  const isConnected = MOCK_MODE ? Boolean(mockAddress) : (authenticated && Boolean(realAddress));

  const userLabel =
    user?.google?.name  ||
    user?.google?.email ||
    user?.email?.address ||
    user?.apple?.email  ||
    null;

  // ── Vencedor — Menor Lance Único (Art. 11) ──────────────────────────────────
  const vencedor = [...lances]
    .filter((l) => !l.repetido)
    .sort((a, b) => a.valor - b.valor)[0] ?? null;

  // ── Persistência de lances ──────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_LANCES, JSON.stringify(lances)); }
    catch {}
  }, [lances]);

  // ── Consentimento ───────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem("gut_consentimento");
      if (salvo) {
        const { aceito } = JSON.parse(salvo);
        if (aceito) setConsentimentoAceito(true);
      }
    } catch { sessionStorage.removeItem("gut_consentimento"); }
  }, []);

  // ── Reset timer ao trocar tipo (Art. 8) ────────────────────────────────────
  useEffect(() => {
    const dur = DURACAO[tipoLeilao];
    const novo = Math.floor(Date.now() / 1000) + dur;
    setPrazoTimestamp(novo);
    setEncerrado(false);
    setShowOverlay(false);
    setTempoRestante(dur);
    setLightningActive(false);
  }, [tipoLeilao]);

  // ── Timer regressivo + efeito relâmpago ─────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
      setTempoRestante(restante);
      if (restante === 0) {
        setEncerrado(true);
        // Dispara efeito relâmpago antes do overlay
        setLightningActive(true);
        setTimeout(() => {
          setLightningActive(false);
          setShowOverlay(true);
        }, 1200);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prazoTimestamp]);

  // ── Timer display ───────────────────────────────────────────────────────────
  const timerDisplay = (() => {
    const m = String(Math.floor(tempoRestante / 60)).padStart(2, "0");
    const s = String(tempoRestante % 60).padStart(2, "0");
    return `${m}:${s}`;
  })();

  const duracao     = DURACAO[tipoLeilao];
  const timerCor    = encerrado ? COR.danger
    : tempoRestante <= 5        ? COR.danger
    : tempoRestante <= 15       ? COR.warning
    : tipoLeilao === "flash"    ? COR.gold
    : COR.primary;
  const timerPctDeg  = encerrado ? 0 : (tempoRestante / duracao) * 360;
  const timerUrgente = !encerrado && tempoRestante <= 5 && tempoRestante > 0;

  // ── Handlers de carteira ────────────────────────────────────────────────────
  function refreshSaldo() {
    setCarteiraFlash(getCarteiraFlash());
    setFichasProgramadas(getFichasProgramadas());
  }

  function handleSimularPix() {
    setErroCarteira("");
    const novo = simularDepositoPix(10.00);
    setCarteiraFlash(novo);
  }

  function handleConverterFicha() {
    setErroCarteira("");
    try {
      const { saldoFlash, fichas } = converterEmFichas(1);
      setCarteiraFlash(saldoFlash);
      setFichasProgramadas(fichas);
    } catch (err) {
      setErroCarteira(err.message);
      setTimeout(() => setErroCarteira(""), 4000);
    }
  }

  // ── Wallet ──────────────────────────────────────────────────────────────────
  function abrirModal() {
    if (MOCK_MODE) {
      setMockAddress("0xDEAD00000000000000000000000000000000BEEF");
      return;
    }
    if (!ready) { console.warn("Privy ainda carregando..."); return; }
    login();
  }

  function desconectar() {
    if (MOCK_MODE) { setMockAddress(null); return; }
    logout();
  }

  // ── Lance ───────────────────────────────────────────────────────────────────
  function handleLanceSucesso({ address: addr, valorCentavos, txHash }) {
    setLances((prev) => {
      const jaRepetido = prev.some((l) => l.valor === valorCentavos);
      return [
        ...prev.map((l) => l.valor === valorCentavos ? { ...l, repetido: true } : l),
        { endereco: addr, valor: valorCentavos, repetido: jaRepetido, txHash },
      ];
    });
    refreshSaldo();
  }

  // ── Nova Rodada ─────────────────────────────────────────────────────────────
  function handleNovaRodada() {
    localStorage.removeItem(LS_LANCES);
    const dur = DURACAO[tipoLeilao];
    const novo = Math.floor(Date.now() / 1000) + dur;
    setPrazoTimestamp(novo);
    setEncerrado(false);
    setShowOverlay(false);
    setTempoRestante(dur);
    setLightningActive(false);
    setLances(LANCES_MOCK);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        body { margin: 0; }
        .gut-noise::before {
          content: ''; position: fixed; inset: 0;
          pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
        }
        @keyframes gut-danger-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .gut-btn-tipo {
          padding: 0.28rem 0.7rem; border-radius: 16px; border: 1px solid;
          font-size: 0.72rem; font-weight: 700; cursor: pointer;
          transition: all 0.18s; background: transparent;
        }
      `}</style>

      {!consentimentoAceito && (
        <TermosConsentimento onAceitar={() => setConsentimentoAceito(true)} />
      )}
      {showOverlay && (
        <OverlayVencedor
          vencedor={vencedor}
          tipoLeilao={tipoLeilao}
          onNovaRodada={handleNovaRodada}
        />
      )}

      <div className="gut-noise" style={estilos.app}>

        {/* ── Header ── */}
        <header style={estilos.header}>
          {/* Logo + Guto placeholder */}
          <div style={estilos.logo}>
            <span style={{ fontSize: "2rem" }}>🏆</span>
            {/* Placeholder mascote Guto */}
            <div style={estilos.gutoPh} title="Guto — mascote Desafio Gut (em breve)">
              <span style={{ fontSize: "1.4rem" }}>🦁</span>
            </div>
            <div>
              <h1 style={estilos.logoTitulo}>Desafio Gut</h1>
              <p style={estilos.logoSub}>E-commerce através de Dropshipping</p>
            </div>
          </div>

          {/* Timer circular com efeito relâmpago */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <p style={{ margin: 0, fontSize: "0.62rem", color: COR.muted,
              textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {encerrado ? "encerrado" : tipoLeilao === "flash" ? "⚡ relâmpago" : "🎫 programado"}
            </p>
            <div
              className={lightningActive ? "gut-lightning-active" : ""}
              style={{
                position: "relative", width: "90px", height: "90px",
                borderRadius: "50%",
                background: `conic-gradient(${timerCor} ${timerPctDeg}deg, rgba(255,255,255,0.04) ${timerPctDeg}deg)`,
                padding: "4px",
                boxShadow: `0 0 ${timerUrgente ? "28px" : "12px"} ${timerCor}${timerUrgente ? "aa" : "44"}`,
                transition: "box-shadow 0.6s",
              }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: COR.bg,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "1px",
              }}>
                <span style={{
                  fontSize: "1.25rem", fontWeight: "900", fontFamily: "monospace",
                  color: timerCor, lineHeight: 1,
                  animation: timerUrgente ? "gut-danger-pulse 0.65s ease-in-out infinite" : "none",
                  transition: "color 0.4s",
                }}>
                  {timerDisplay}
                </span>
                <span style={{ fontSize: "0.48rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {encerrado ? "fim" : "min:seg"}
                </span>
              </div>
            </div>
            <div style={{ width: "90px", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                width: `${encerrado ? 0 : (tempoRestante / duracao) * 100}%`,
                background: `linear-gradient(90deg, ${timerCor}88, ${timerCor})`,
                transition: "width 1s linear, background 0.4s",
                boxShadow: `0 0 5px ${timerCor}`,
              }} />
            </div>
          </div>

          <div style={estilos.headerDireita}>
            {isConnected ? (
              <div style={estilos.carteiraHeader}>
                <span style={estilos.dot} />
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  {userLabel && (
                    <span style={{ fontSize: "0.72rem", color: COR.blue300, fontWeight: "700",
                      maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {userLabel}
                    </span>
                  )}
                  {address && (
                    <span style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <button style={estilos.botaoEntrar} onClick={abrirModal}>
                ⚡ Aceito o Desafio Gut
              </button>
            )}
            <div style={estilos.badges}>
              <span style={estilos.badge}>🔒 LGPD</span>
              <span style={estilos.badge}>🧪 Beta</span>
              <span style={estilos.badge}>GUT</span>
              {MOCK_MODE && <span style={{ ...estilos.badge, color: COR.gold, borderColor: "#92400e" }}>🔧 MOCK</span>}
            </div>
          </div>
        </header>

        {/* ── Painel Beta: Carteiras + Tipo ── */}
        <div style={estilos.painelBeta}>
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={estilos.saldoItem}>
              <span style={{ fontSize: "0.68rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Flash</span>
              <span style={{ fontSize: "1rem", fontWeight: "800", color: COR.primary }}>
                R$ {carteiraFlash.toFixed(2)}
              </span>
            </div>
            <div style={estilos.saldoItem}>
              <span style={{ fontSize: "0.68rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Fichas</span>
              <span style={{ fontSize: "1rem", fontWeight: "800", color: "#a78bfa" }}>
                {fichasProgramadas} 🎫
              </span>
            </div>
            <button onClick={handleSimularPix} style={estilos.botaoPix} title="Simula depósito PIX de R$ 10,00 (Art. 21)">
              + PIX R$ 10,00
            </button>
            <button
              onClick={handleConverterFicha}
              disabled={carteiraFlash < CUSTO_FICHA_BRL}
              style={{ ...estilos.botaoConverter, opacity: carteiraFlash < CUSTO_FICHA_BRL ? 0.4 : 1, cursor: carteiraFlash < CUSTO_FICHA_BRL ? "not-allowed" : "pointer" }}
              title={`Converte R$ ${CUSTO_FICHA_BRL.toFixed(2)} → 1 ficha (Art. 20)`}
            >
              → 1 Ficha (R$ {CUSTO_FICHA_BRL.toFixed(2)})
            </button>
            {erroCarteira && (
              <span style={{ fontSize: "0.72rem", color: COR.danger }}>⚠️ {erroCarteira}</span>
            )}
          </div>

          {/* Seletor de tipo */}
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", color: COR.muted, marginRight: "0.2rem" }}>Modo:</span>
            {[
              { id: "flash",      label: "⚡ Relâmpago" },
              { id: "programado", label: "🎫 Programado" },
            ].map(({ id, label }) => {
              const ativo = tipoLeilao === id;
              const cor   = id === "flash" ? COR.gold : "#a78bfa";
              return (
                <button
                  key={id}
                  className="gut-btn-tipo"
                  onClick={() => setTipoLeilao(id)}
                  style={{
                    color:       ativo ? cor : COR.muted,
                    borderColor: ativo ? cor : "rgba(255,255,255,0.1)",
                    background:  ativo ? `${cor}20` : "transparent",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Faixa de aviso ── */}
        <div style={estilos.avisoRede}>
          <strong>Desafio Gut</strong>
          {" — "}Grupo União e Trabalho · CNPJ 23.040.066/0001-00
          {" · "}www.grupouniaoetrabalho.com.br
          {isConnected && (
            <span style={{ marginLeft: "1rem", color: "#86efac" }}>
              ✅ {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          )}
          {encerrado && (
            <span style={{ marginLeft: "1rem", color: COR.danger, fontWeight: "700" }}>
              🔴 Leilão encerrado — novos lances bloqueados
            </span>
          )}
        </div>

        {/* ── Grid principal ── */}
        <main style={estilos.grid}>
          <section style={estilos.col}>
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
            />

            {/* Segurança */}
            <div style={estilos.segCard}>
              <h4 style={estilos.segTitulo}>🛡️ Segurança e Transparência</h4>
              {[
                ["Argon2id",       "Hash off-chain de cada lance (hash-wasm WASM)"],
                ["EIP-191",        "Assinatura via Privy embedded wallet"],
                ["Rate Limit",     "5 lances/min · cooldown 3s por carteira"],
                ["DOMPurify",      "Sanitização contra XSS em todos os campos"],
                ["Art. 20",        "Senha: R$ 2,00 por edição (Relâmpago ou Programado)"],
                ["Art. 27",        "Lance mínimo: R$ 0,01 · máx. 2 casas decimais"],
                ["Art. 26",        "Apuração automática pelo Painel interno de controle"],
              ].map(([nome, desc]) => (
                <div key={nome} style={estilos.segItem}>
                  <span style={estilos.segNome}>{nome}</span>
                  <span style={estilos.segDesc}>{desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <TabelaLances
              lances={lances}
              idEdicao={EDICAO_ATIVA}
              prazoTimestamp={prazoTimestamp}
            />
          </section>
        </main>

        {/* ── Footer ── */}
        <footer style={estilos.footer}>
          <p>
            © {new Date().getFullYear()} <strong>Desafio Gut</strong> · Grupo União e Trabalho ·{" "}
            <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT"
              target="_blank" rel="noopener noreferrer" style={{ color: COR.blue300 }}>Privacidade</a>
            {" · "}
            <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT/cookie-policy"
              target="_blank" rel="noopener noreferrer" style={{ color: COR.blue300 }}>Cookies</a>
            {" · "}
            <a href="https://www.grupouniaoetrabalho.com.br"
              target="_blank" rel="noopener noreferrer" style={{ color: COR.blue300 }}>
              grupouniaoetrabalho.com.br
            </a>
          </p>
          <p style={{ fontSize: "0.72rem", color: "#334155" }}>
            Implantação oficial: <strong style={{ color: COR.muted }}>1º de junho de 2026</strong>
            {" · "}Beta v0.9 · React 18 · Vite 8 · Argon2id · DOMPurify
            {" · "}Registrado RTD Manaus/AM
          </p>
        </footer>
      </div>
    </>
  );
}

// ─── Estilos — Paleta Azul Marinho + Branco (Grupo União e Trabalho) ─────────
const estilos = {
  app:            { minHeight: "100vh", background: `radial-gradient(ellipse at 50% -10%, #0d1f4a 0%, #06122a 50%, ${COR.bg} 100%)`, color: COR.text, fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column", position: "relative" },
  header:         { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 2rem", background: "rgba(5,15,40,0.88)", borderBottom: `1px solid ${COR.primaryDim}`, flexWrap: "wrap", gap: "1rem", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  logo:           { display: "flex", alignItems: "center", gap: "0.75rem" },
  gutoPh:         { width: "48px", height: "48px", borderRadius: "50%", background: `rgba(37,99,235,0.12)`, border: `2px dashed rgba(37,99,235,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoTitulo:     { margin: 0, fontSize: "1.5rem", fontWeight: "900", color: "#ffffff", letterSpacing: "0.04em", textShadow: `0 0 20px rgba(37,99,235,0.5)` },
  logoSub:        { margin: 0, fontSize: "0.75rem", color: COR.blue300, letterSpacing: "0.04em", fontWeight: "600" },
  headerDireita:  { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" },
  badges:         { display: "flex", gap: "0.4rem" },
  badge:          { padding: "0.2rem 0.65rem", background: COR.primaryDim, borderRadius: "20px", fontSize: "0.7rem", border: `1px solid rgba(37,99,235,0.28)`, color: "#93c5fd" },
  botaoEntrar:    { padding: "0.6rem 1.4rem", background: `linear-gradient(135deg,${COR.primary},#1d40af)`, color: "#ffffff", border: "none", borderRadius: "28px", fontWeight: "800", cursor: "pointer", fontSize: "0.88rem", letterSpacing: "0.03em", boxShadow: `0 4px 18px rgba(37,99,235,0.45)` },
  carteiraHeader: { display: "flex", alignItems: "center", gap: "0.5rem", background: COR.primaryDim, padding: "0.45rem 1rem", borderRadius: "28px", border: `1px solid rgba(37,99,235,0.30)` },
  dot:            { width: "8px", height: "8px", borderRadius: "50%", background: COR.success, flexShrink: 0, boxShadow: `0 0 6px ${COR.success}` },
  painelBeta:     { background: "rgba(3,10,28,0.92)", borderBottom: `1px solid rgba(37,99,235,0.18)`, padding: "0.6rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", backdropFilter: "blur(12px)" },
  saldoItem:      { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px" },
  botaoPix:       { padding: "0.3rem 0.85rem", background: COR.primaryDim, border: `1px solid rgba(37,99,235,0.38)`, borderRadius: "20px", color: COR.blue300, fontSize: "0.72rem", fontWeight: "800", cursor: "pointer" },
  botaoConverter: { padding: "0.3rem 0.85rem", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.38)", borderRadius: "20px", color: "#a78bfa", fontSize: "0.72rem", fontWeight: "800" },
  avisoRede:      { background: "rgba(3,10,28,0.9)", borderBottom: `1px solid rgba(37,99,235,0.15)`, padding: "0.45rem 2rem", fontSize: "0.78rem", color: "#64748b" },
  grid:           { display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.5rem", padding: "1.5rem 2rem", flex: 1 },
  col:            { display: "flex", flexDirection: "column", gap: "1rem" },
  segCard:        { background: "rgba(5,15,40,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "16px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", border: `1px solid rgba(37,99,235,0.15)` },
  segTitulo:      { margin: "0 0 0.5rem", color: COR.blue300, fontSize: "0.88rem", fontWeight: "700" },
  segItem:        { display: "flex", gap: "0.75rem", alignItems: "flex-start" },
  segNome:        { minWidth: "78px", fontSize: "0.73rem", fontWeight: "700", color: COR.blue300, background: COR.primaryDim, padding: "0.2rem 0.5rem", borderRadius: "4px", flexShrink: 0, border: `1px solid rgba(37,99,235,0.25)` },
  segDesc:        { fontSize: "0.76rem", color: COR.muted, lineHeight: "1.5" },
  footer:         { padding: "1rem 2rem", borderTop: `1px solid rgba(37,99,235,0.12)`, textAlign: "center", fontSize: "0.76rem", color: "#4a6490" },
};
