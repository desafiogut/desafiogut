import { createContext, useContext, useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getCarteiraFlash,
  getFichasProgramadas,
  simularDepositoPix,
  converterEmFichas,
  CUSTO_FICHA_BRL,
} from "../utils/saldoInterno.js";
import { useBlockchain }    from "../hooks/useBlockchain.js";
import { useNetworkStatus } from "../hooks/useNetworkStatus.js";
import { NetworkAlert }     from "../components/ui/NetworkAlert.jsx";

// ─── Constantes exportadas ────────────────────────────────────────────────────
export const MOCK_MODE    = import.meta.env.VITE_MOCK_MODE === "true";
export const EDICAO_ATIVA = "R-1";
const LS_LANCES           = "gut_lances_r1";

export const DURACAO = {
  flash:      MOCK_MODE ? 30  : 300,
  programado: MOCK_MODE ? 60  : 1800,
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
  const [tipoLeilao, setTipoLeilao] = useState("flash");

  const [lances, setLances] = useState(() => {
    try {
      const salvo = localStorage.getItem(LS_LANCES);
      return salvo ? JSON.parse(salvo) : LANCES_MOCK;
    } catch { return LANCES_MOCK; }
  });

  const [prazoTimestamp,  setPrazoTimestamp]  = useState(() => Math.floor(Date.now() / 1000) + DURACAO.flash);
  const [encerrado,       setEncerrado]       = useState(false);
  const [showOverlay,     setShowOverlay]     = useState(false);
  const [tempoRestante,   setTempoRestante]   = useState(DURACAO.flash);
  const [lightningActive, setLightningActive] = useState(false);

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

  // ── Ponto 4: Monitoramento de rede ───────────────────────────────────────────
  const {
    isOnline,
    isSepoliaOk,
    networkError,
    limparNetworkError,
    recheckSepolia,
  } = useNetworkStatus();

  // ── Ponto 1 + 2: Saldo real e vencedor on-chain ───────────────────────────────
  // Desabilitado em MOCK_MODE ou sem carteira conectada
  const blockchainEnabled = !MOCK_MODE && Boolean(address);
  const {
    saldoSenhas:      saldoSenhasOnChain,
    saldoETH,
    vencedorOnChain,
    isLoadingSaldo,
    isLoadingVencedor,
    erroBlockchain,
    limparErroBlockchain,
    refetchSaldo:    refetchSaldoOnChain,
    refetchVencedor,
  } = useBlockchain({
    address,
    idEdicao: EDICAO_ATIVA,
    enabled:  blockchainEnabled,
  });

  // Alerta unificado: erros de rede têm prioridade sobre erros de contrato
  const alertaMensagem = networkError || erroBlockchain || null;
  const alertaTipo     = networkError ? "aviso" : "erro";
  function limparAlerta() {
    if (networkError)     limparNetworkError();
    if (erroBlockchain)   limparErroBlockchain();
  }

  // Vencedor: prefere dado on-chain quando disponível; cai back para cálculo local
  const vencedorLocal = [...lances]
    .filter((l) => !l.repetido)
    .sort((a, b) => a.valor - b.valor)[0] ?? null;
  const vencedor = vencedorOnChain ?? vencedorLocal;

  // ── Efeitos ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem(LS_LANCES, JSON.stringify(lances)); } catch {}
  }, [lances]);

  useEffect(() => {
    const dur = DURACAO[tipoLeilao];
    setPrazoTimestamp(Math.floor(Date.now() / 1000) + dur);
    setEncerrado(false);
    setShowOverlay(false);
    setTempoRestante(dur);
    setLightningActive(false);
  }, [tipoLeilao]);

  useEffect(() => {
    const tick = () => {
      const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
      setTempoRestante(restante);
      if (restante === 0) {
        setEncerrado(true);
        setLightningActive(true);
        // Ponto 2: ao encerrar, busca vencedor on-chain imediatamente
        if (!MOCK_MODE) refetchVencedor();
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
    // Ponto 1: também recarrega saldo real da blockchain
    if (!MOCK_MODE && address) refetchSaldoOnChain();
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
    if (!ready) return;
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
    // Carteiras internas (localStorage)
    carteiraFlash,
    fichasProgramadas,
    erroCarteira,
    // Auth
    address, isConnected, userLabel, ready, authenticated, user,
    // Vencedor (on-chain preferred)
    vencedor,
    // ── Pontos 1, 2, 3, 4, 5 ──
    saldoSenhasOnChain,   // fichas on-chain (null = carregando/desconectado)
    saldoETH,             // ETH balance Sepolia ("0.001234")
    isLoadingSaldo,       // Ponto 5: skeleton de saldo
    isLoadingVencedor,    // Ponto 5: skeleton de vencedor
    isOnline,             // Ponto 4: conectividade do browser
    isSepoliaOk,          // Ponto 4: saúde do RPC Sepolia
    // Handlers
    refreshSaldo,
    handleSimularPix,
    handleConverterFicha,
    abrirModal,
    desconectar,
    handleLanceSucesso,
    handleNovaRodada,
    recheckSepolia,       // Força re-check manual da rede
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* Ponto 4: alerta global de erros de rede / blockchain */}
      <NetworkAlert
        mensagem={alertaMensagem}
        tipo={alertaTipo}
        onClose={limparAlerta}
        autoCloseMs={alertaTipo === "aviso" ? 0 : 6000}
      />
    </AppContext.Provider>
  );
}
