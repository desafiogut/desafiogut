import { useState, useEffect, useMemo } from "react";
import { getEdicaoPrazo } from "./utils/web3.js";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import TermosConsentimento from "./components/TermosConsentimento.jsx";
import TabelaLances from "./components/TabelaLances.jsx";
import CardLance from "./components/CardLance.jsx";

// ─── Constantes ───────────────────────────────────────────────────────────────
const MOCK_MODE   = import.meta.env.VITE_MOCK_MODE === "true";
const DURACAO_S   = MOCK_MODE ? 30 : 1800;           // segundos do leilão
const EDICAO_ATIVA = "R-1";
const LS_LANCES   = "gut_lances_r1";
const LS_PRAZO    = "gut_prazo_r1";

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
      color:    ["#fbbf24","#fcd34d","#6ee7b7","#f97316","#ffffff","#a78bfa","#f472b6"][i % 7],
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

// ─── Overlay Vencedor ────────────────────────────────────────────────────────
function OverlayVencedor({ vencedor, onNovaRodada }) {
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

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}>
        {/* Card */}
        <div style={{
          background: "linear-gradient(135deg,#1a1200 0%,#0f172a 60%)",
          border: "2px solid #fbbf24", borderRadius: "20px",
          padding: "2.5rem 2rem", maxWidth: "480px", width: "100%",
          textAlign: "center", color: "#e2e8f0",
          animation: "gut-gold-pulse 2s ease-in-out infinite, gut-slide-up 0.5s ease-out both",
        }}>
          <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🏆</div>
          <h2 style={{ margin: "0.75rem 0 0.25rem", fontSize: "1.8rem", fontWeight: "900",
            color: "#fbbf24", letterSpacing: "0.04em", textShadow: "0 0 20px #fbbf24" }}>
            LEILÃO ENCERRADO
          </h2>
          <p style={{ margin: "0 0 1.5rem", color: "#94a3b8", fontSize: "0.9rem" }}>
            Edição <strong style={{ color: "#6ee7b7" }}>{EDICAO_ATIVA}</strong> · Menor Lance Único
          </p>

          {vencedor ? (
            <div style={{
              background: "#0f2a1e", border: "1px solid #6ee7b7",
              borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem",
            }}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>Carteira Vencedora</p>
              <p style={{ margin: "0 0 0.75rem", fontFamily: "monospace",
                fontSize: "0.95rem", color: "#e2e8f0", wordBreak: "break-all" }}>
                {enderecoAbrev}
              </p>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "900",
                color: "#fbbf24", textShadow: "0 0 12px #fbbf24" }}>
                {valorFmt}
              </p>
              {MOCK_MODE && (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", color: "#f97316" }}>
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
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);

  // ── Lances: inicializa do localStorage ──
  const [lances, setLances] = useState(() => {
    try {
      const salvo = localStorage.getItem(LS_LANCES);
      return salvo ? JSON.parse(salvo) : LANCES_MOCK;
    } catch { return LANCES_MOCK; }
  });

  // ── Prazo: reutiliza do localStorage se ainda válido, senão cria novo ──
  const [prazoTimestamp, setPrazoTimestamp] = useState(() => {
    try {
      const salvo = parseInt(localStorage.getItem(LS_PRAZO) ?? "0", 10);
      if (salvo > Date.now() / 1000) return salvo;
    } catch {}
    const novo = Math.floor(Date.now() / 1000) + DURACAO_S;
    localStorage.setItem(LS_PRAZO, String(novo));
    return novo;
  });

  // ── Privy: autenticação sem extensão, sem QR Code ────────────────────────
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  console.log('Privy Ready:', ready);

  // Prioriza embedded wallet (Privy); fallback para primeira carteira disponível
  const privyWallet  = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const realAddress  = privyWallet?.address ?? null;

  // MOCK_MODE usa endereço local; modo real usa Privy
  const [mockAddress, setMockAddress] = useState(null);
  const address     = MOCK_MODE ? mockAddress : realAddress;
  const isConnected = MOCK_MODE ? Boolean(mockAddress) : (authenticated && Boolean(realAddress));

  // Nome/e-mail para exibição no header (Google > e-mail > Apple > endereço)
  const userLabel =
    user?.google?.name  ||
    user?.google?.email ||
    user?.email?.address ||
    user?.apple?.email  ||
    null;

  const [encerrado,    setEncerrado]     = useState(false);
  const [showOverlay,  setShowOverlay]   = useState(false);
  const [tempoRestante, setTempoRestante] = useState(() =>
    Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000))
  );
  const vencedor = [...lances]
    .filter((l) => !l.repetido)
    .sort((a, b) => a.valor - b.valor)[0] ?? null;

  // ── Persistência de lances no localStorage ──
  useEffect(() => {
    try { localStorage.setItem(LS_LANCES, JSON.stringify(lances)); }
    catch {}
  }, [lances]);

  // ── Sincronizar prazo com blockchain (modo real apenas) ──
  useEffect(() => {
    if (MOCK_MODE) return;
    getEdicaoPrazo(EDICAO_ATIVA).then((prazo) => {
      if (!prazo || prazo <= 0) return; // mantém localStorage como fallback
      setPrazoTimestamp(prazo);
      try { localStorage.setItem(LS_PRAZO, String(prazo)); } catch {}
    }).catch(() => { /* silencioso — usa localStorage como fallback */ });
  }, []);

  // ── Consentimento ──
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem("gut_consentimento");
      if (salvo) {
        const { aceito } = JSON.parse(salvo);
        if (aceito) setConsentimentoAceito(true);
      }
    } catch { sessionStorage.removeItem("gut_consentimento"); }
  }, []);


  // ── Timer regressivo ──
  useEffect(() => {
    const tick = () => {
      const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
      setTempoRestante(restante);
      if (restante === 0) {
        setEncerrado(true);
        setShowOverlay(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prazoTimestamp]);

  // ── Formata MM:SS ──
  const timerDisplay = (() => {
    const m = String(Math.floor(tempoRestante / 60)).padStart(2, "0");
    const s = String(tempoRestante % 60).padStart(2, "0");
    return `${m}:${s}`;
  })();
  const timerCor = encerrado          ? "#ff3d71"
    : tempoRestante <= 5              ? "#ff3d71"
    : tempoRestante <= 15             ? "#f97316"
    : "#00d4aa";
  const timerPctDeg = encerrado ? 0 : (tempoRestante / DURACAO_S) * 360;
  const timerUrgente = !encerrado && tempoRestante <= 5 && tempoRestante > 0;

  // ── Wallet ──
  function abrirModal() {
    if (MOCK_MODE) {
      setMockAddress("0xDEAD00000000000000000000000000000000BEEF");
      return;
    }
    if (!ready) {
      console.warn('Privy ainda carregando...');
      return;
    }
    login(); // Privy: abre modal com Google / E-mail / Apple — sem extensão, sem QR Code
  }

  function desconectar() {
    if (MOCK_MODE) { setMockAddress(null); return; }
    logout();
  }

  // ── Lance ──
  function handleLanceSucesso({ address: addr, valorCentavos, txHash }) {
    setLances((prev) => {
      const jaRepetido = prev.some((l) => l.valor === valorCentavos);
      return [
        ...prev.map((l) => l.valor === valorCentavos ? { ...l, repetido: true } : l),
        { endereco: addr, valor: valorCentavos, repetido: jaRepetido, txHash },
      ];
    });
  }

  // ── Nova Rodada: limpa localStorage e reinicia ──
  function handleNovaRodada() {
    localStorage.removeItem(LS_LANCES);
    localStorage.removeItem(LS_PRAZO);
    window.location.reload();
  }

  return (
    <>
      {/* Noise grain global */}
      <style>{`
        body { margin: 0; }
        .gut-noise::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.045;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
        }
      `}</style>

      {!consentimentoAceito && (
        <TermosConsentimento onAceitar={() => setConsentimentoAceito(true)} />
      )}
      {showOverlay && (
        <OverlayVencedor vencedor={vencedor} onNovaRodada={handleNovaRodada} />
      )}

      <div className="gut-noise" style={estilos.app}>

        {/* ── Header ── */}
        <header style={estilos.header}>
          <div style={estilos.logo}>
            <span style={{ fontSize: "2rem" }}>🏆</span>
            <div>
              <h1 style={estilos.logoTitulo}>DESAFIOGUT</h1>
              <p style={estilos.logoSub}>Menor Lance Único · Blockchain Ethereum</p>
            </div>
          </div>

          {/* Timer circular */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <p style={{ margin: 0, fontSize: "0.62rem", color: "#4a6080",
              textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {encerrado ? "encerrado" : "tempo"}
            </p>
            {/* Anel conic-gradient */}
            <div style={{
              position: "relative", width: "90px", height: "90px",
              borderRadius: "50%",
              background: `conic-gradient(${timerCor} ${timerPctDeg}deg, rgba(255,255,255,0.04) ${timerPctDeg}deg)`,
              padding: "4px",
              boxShadow: `0 0 ${timerUrgente ? "28px" : "12px"} ${timerCor}${timerUrgente ? "aa" : "44"}`,
              transition: "box-shadow 0.6s",
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "#04080f",
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
                <span style={{ fontSize: "0.48rem", color: "#4a6080", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {encerrado ? "fim" : "min:seg"}
                </span>
              </div>
            </div>
            {/* Barra linear secundária */}
            <div style={{ width: "90px", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                width: `${encerrado ? 0 : (tempoRestante / DURACAO_S) * 100}%`,
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
                    <span style={{ fontSize: "0.72rem", color: "#6ee7b7", fontWeight: "700",
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
              <button
                style={estilos.botaoMetaMask}
                onClick={abrirModal}
              >
                🎯 Entrar no Leilão
              </button>
            )}
            <div style={estilos.badges}>
              <span style={estilos.badge}>🔒 LGPD</span>
              <span style={estilos.badge}>⛓️ Sepolia</span>
              {MOCK_MODE && <span style={{ ...estilos.badge, color: "#fbbf24", borderColor: "#92400e" }}>🧪 MOCK</span>}
            </div>
          </div>
        </header>

        {/* ── Aviso de rede ── */}
        <div style={estilos.avisoRede}>
          ⚠️ <strong>Rede:</strong> Ethereum Sepolia (testnet) ·{" "}
          <a href="https://sepolia.etherscan.io/address/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
            target="_blank" rel="noopener noreferrer" style={{ color: "#fbbf24" }}>
            Ver contrato no Etherscan ↗
          </a>
          {isConnected && (
            <span style={{ marginLeft: "1rem", color: "#86efac" }}>
              ✅ Carteira: {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          )}
          {encerrado && (
            <span style={{ marginLeft: "1rem", color: "#ef4444", fontWeight: "700" }}>
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
            />

            <div style={estilos.segCard}>
              <h4 style={estilos.segTitulo}>🛡️ Camadas de Segurança Ativas</h4>
              {[
                ["Argon2id",       "Hash off-chain de cada lance (hash-wasm WASM)"],
                ["EIP-191",        "Assinatura MetaMask/WalletConnect no telemóvel"],
                ["Rate Limit",     "5 lances/min · cooldown 3s por carteira"],
                ["DOMPurify",      "Sanitização contra XSS em todos os campos"],
                ["CSP Header",     "Content-Security-Policy no servidor Vite"],
                ["localStorage",   "Persistência local dos lances da sessão"],
                ["Require on-chain","Validações Solidity: saldo, prazo, valor mín."],
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

        <footer style={estilos.footer}>
          <p>
            © {new Date().getFullYear()} DESAFIOGUT ·{" "}
            <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT"
              target="_blank" rel="noopener noreferrer" style={{ color: "#6ee7b7" }}>Privacidade</a>
            {" · "}
            <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT/cookie-policy"
              target="_blank" rel="noopener noreferrer" style={{ color: "#6ee7b7" }}>Cookies</a>
          </p>
          <p style={{ fontSize: "0.72rem", color: "#334155" }}>
            Frontend Beta v0.8 · React 18 · Vite 8 · ethers.js v6 · hash-wasm argon2id · DOMPurify
          </p>
        </footer>
      </div>
    </>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const estilos = {
  app:          { minHeight: "100vh", background: "radial-gradient(ellipse at 50% -10%, #0d1f38 0%, #060d1a 50%, #04080f 100%)", color: "#eef4ff", fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column", position: "relative" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 2rem", background: "rgba(8,18,36,0.8)", borderBottom: "1px solid rgba(0,212,170,0.15)", flexWrap: "wrap", gap: "1rem", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  logo:         { display: "flex", alignItems: "center", gap: "0.75rem" },
  logoTitulo:   { margin: 0, fontSize: "1.5rem", fontWeight: "900", color: "#00d4aa", letterSpacing: "0.04em", textShadow: "0 0 20px rgba(0,212,170,0.4)" },
  logoSub:      { margin: 0, fontSize: "0.75rem", color: "#4a6080", letterSpacing: "0.05em" },
  headerDireita:{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" },
  badges:       { display: "flex", gap: "0.4rem" },
  badge:        { padding: "0.2rem 0.65rem", background: "rgba(0,212,170,0.08)", borderRadius: "20px", fontSize: "0.7rem", border: "1px solid rgba(0,212,170,0.2)", color: "#00d4aa88" },
  avisoRede:    { background: "rgba(4,8,15,0.9)", borderBottom: "1px solid rgba(245,166,35,0.15)", padding: "0.45rem 2rem", fontSize: "0.8rem", color: "#f5a62388" },
  grid:         { display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.5rem", padding: "1.5rem 2rem", flex: 1 },
  col:          { display: "flex", flexDirection: "column", gap: "1rem" },
  segCard:      { background: "rgba(8,18,36,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "16px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", border: "1px solid rgba(0,212,170,0.12)" },
  segTitulo:    { margin: "0 0 0.5rem", color: "#00d4aa", fontSize: "0.88rem", fontWeight: "700" },
  segItem:      { display: "flex", gap: "0.75rem", alignItems: "flex-start" },
  segNome:      { minWidth: "110px", fontSize: "0.73rem", fontWeight: "700", color: "#00d4aa", background: "rgba(0,212,170,0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px", flexShrink: 0, border: "1px solid rgba(0,212,170,0.2)" },
  segDesc:      { fontSize: "0.76rem", color: "#4a6080", lineHeight: "1.5" },
  footer:       { padding: "1rem 2rem", borderTop: "1px solid rgba(0,212,170,0.1)", textAlign: "center", fontSize: "0.76rem", color: "#4a6080" },
  botaoMetaMask:{ padding: "0.6rem 1.4rem", background: "linear-gradient(135deg,#f5a623,#f97316)", color: "#04080f", border: "none", borderRadius: "28px", fontWeight: "800", cursor: "pointer", fontSize: "0.88rem", letterSpacing: "0.03em", boxShadow: "0 4px 16px rgba(245,166,35,0.35)" },
  carteiraHeader:{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,212,170,0.08)", padding: "0.45rem 1rem", borderRadius: "28px", border: "1px solid rgba(0,212,170,0.25)" },
  dot:          { width: "8px", height: "8px", borderRadius: "50%", background: "#00c853", flexShrink: 0, boxShadow: "0 0 6px #00c853" },
};
