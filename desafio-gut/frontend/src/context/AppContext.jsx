import { createContext, useContext, useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getCarteiraFlash,
  getFichasProgramadas,
  simularDepositoPix,
  converterEmFichas,
  CUSTO_FICHA_BRL,
} from "../utils/saldoInterno.js";

// ─── Constantes exportadas ────────────────────────────────────────────────────
export const MOCK_MODE    = import.meta.env.VITE_MOCK_MODE === "true";
export const EDICAO_ATIVA = "R-1";
const LS_LANCES           = "gut_lances_r1";

export const DURACAO = {
  flash:      MOCK_MODE ? 30  : 300,   // Relâmpago: 5 min
  programado: MOCK_MODE ? 60  : 1800,  // Programado: 30 min
};

export const LANCES_MOCK = [
  { endereco: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", valor: 5, repetido: false, txHash: "0xabc123def456" },
  { endereco: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4294ee", valor: 3, repetido: true,  txHash: "0xdef456abc789" },
  { endereco: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", valor: 3, repetido: true,  txHash: "0xghi789jkl012" },
  { endereco: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", valor: 8, repetido: false, txHash: "0xjkl012mno345" },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext deve ser usado dentro de <AppProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  // Tipo de leilão (Art. 8)
  const [tipoLeilao, setTipoLeilao] = useState("flash");

  // Lances — persistidos em localStorage
  const [lances, setLances] = useState(() => {
    try {
      const salvo = localStorage.getItem(LS_LANCES);
      return salvo ? JSON.parse(salvo) : LANCES_MOCK;
    } catch { return LANCES_MOCK; }
  });

  // Timer
  const [prazoTimestamp,  setPrazoTimestamp]  = useState(() => Math.floor(Date.now() / 1000) + DURACAO.flash);
  const [encerrado,       setEncerrado]       = useState(false);
  const [showOverlay,     setShowOverlay]     = useState(false);
  const [tempoRestante,   setTempoRestante]   = useState(DURACAO.flash);
  const [lightningActive, setLightningActive] = useState(false);

  // Carteiras internas — Art. 20: R$ 2,00/senha
  const [carteiraFlash,     setCarteiraFlash]     = useState(() => getCarteiraFlash());
  const [fichasProgramadas, setFichasProgramadas] = useState(() => getFichasProgramadas());
  const [erroCarteira,      setErroCarteira]      = useState("");

  // Privy auth
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const privyWallet  = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const realAddress  = privyWallet?.address ?? null;
  const [mockAddress, setMockAddress] = useState(null);

  const address     = MOCK_MODE ? mockAddress : realAddress;
  const isConnected = MOCK_MODE ? Boolean(mockAddress) : (authenticated && Boolean(realAddress));
  const userLabel   = user?.google?.name || user?.google?.email || user?.email?.address || user?.apple?.email || null;

  // Vencedor — Menor Lance Único (Art. 8)
  const vencedor = [...lances]
    .filter((l) => !l.repetido)
    .sort((a, b) => a.valor - b.valor)[0] ?? null;

  // ── Efeitos ──────────────────────────────────────────────────────────────────

  // Persistência de lances
  useEffect(() => {
    try { localStorage.setItem(LS_LANCES, JSON.stringify(lances)); } catch {}
  }, [lances]);

  // Reset timer ao trocar tipo de leilão
  useEffect(() => {
    const dur = DURACAO[tipoLeilao];
    setPrazoTimestamp(Math.floor(Date.now() / 1000) + dur);
    setEncerrado(false);
    setShowOverlay(false);
    setTempoRestante(dur);
    setLightningActive(false);
  }, [tipoLeilao]);

  // Timer regressivo + disparo do efeito relâmpago
  useEffect(() => {
    const tick = () => {
      const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
      setTempoRestante(restante);
      if (restante === 0) {
        setEncerrado(true);
        setLightningActive(true);
        setTimeout(() => { setLightningActive(false); setShowOverlay(true); }, 1200);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prazoTimestamp]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function refreshSaldo() {
    setCarteiraFlash(getCarteiraFlash());
    setFichasProgramadas(getFichasProgramadas());
  }

  function handleSimularPix() {
    setErroCarteira("");
    setCarteiraFlash(simularDepositoPix(10.00));
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

  function abrirModal() {
    if (MOCK_MODE) { setMockAddress("0xDEAD00000000000000000000000000000000BEEF"); return; }
    if (!ready) {
      // Privy ainda inicializando — aguarda 1s e tenta novamente
      const id = setTimeout(() => { if (ready) login(); }, 1000);
      return () => clearTimeout(id);
    }
    login();
  }

  function desconectar() {
    if (MOCK_MODE) { setMockAddress(null); return; }
    logout();
  }

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

  function handleNovaRodada() {
    localStorage.removeItem(LS_LANCES);
    const dur = DURACAO[tipoLeilao];
    setPrazoTimestamp(Math.floor(Date.now() / 1000) + dur);
    setEncerrado(false);
    setShowOverlay(false);
    setTempoRestante(dur);
    setLightningActive(false);
    setLances(LANCES_MOCK);
  }

  // ── Value ─────────────────────────────────────────────────────────────────────
  const value = {
    // Constantes
    MOCK_MODE, EDICAO_ATIVA, DURACAO, LANCES_MOCK, CUSTO_FICHA_BRL,
    // Estado do leilão
    tipoLeilao, setTipoLeilao,
    lances,
    prazoTimestamp,
    encerrado,
    showOverlay,
    tempoRestante,
    lightningActive,
    // Carteiras
    carteiraFlash,
    fichasProgramadas,
    erroCarteira,
    // Auth
    address, isConnected, userLabel, ready, authenticated, user,
    // Vencedor
    vencedor,
    // Handlers
    refreshSaldo,
    handleSimularPix,
    handleConverterFicha,
    abrirModal,
    desconectar,
    handleLanceSucesso,
    handleNovaRodada,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
