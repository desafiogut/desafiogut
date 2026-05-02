import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getCarteiraFlash,
  getFichasProgramadas,
  simularDepositoPix,
  converterEmFichas,
  CUSTO_FICHA_BRL,
} from "../utils/saldoInterno.js";
import {
  subscribeLanceDado,
  getSaldoSenhasOnChain,
  subscribeSaldoSenhas,
} from "../utils/web3.js";

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

  // Lances — em MOCK_MODE persiste em localStorage (com seed LANCES_MOCK).
  // Em produção começa vazio: a fonte de verdade é o listener on-chain LanceDado.
  const [lances, setLances] = useState(() => {
    if (!MOCK_MODE) return [];
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
  // MOCK_MODE: lê localStorage (saldo simulado para dev local).
  // Produção: zerados; o Saldo Flash R$ não existe conceitualmente no fluxo real
  // (PIX → senhas é direto). fichasProgramadas é legado — em produção a UI deve
  // consumir saldoSenhas on-chain, e os componentes que ainda leem aqui recebem 0.
  const [carteiraFlash,     setCarteiraFlash]     = useState(() => MOCK_MODE ? getCarteiraFlash()     : 0);
  const [fichasProgramadas, setFichasProgramadas] = useState(() => MOCK_MODE ? getFichasProgramadas() : 0);
  const [erroCarteira,      setErroCarteira]      = useState("");

  // ── Saldo on-chain (Opção B Fase 3) ──────────────────────────────────────────
  // Coexiste com fichasProgramadas (localStorage) durante a migração.
  // saldoSenhas reflete saldoSenhas[address] no contrato; null = "ainda não sei"
  // (distinto de 0, que é estado on-chain válido). Em MOCK_MODE permanece null.
  const [saldoSenhas,       setSaldoSenhas]       = useState(null);
  const [saldoSenhasStatus, setSaldoSenhasStatus] = useState("idle"); // idle | loading | ok | stale | error

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

  // Persistência de lances — apenas em MOCK_MODE.
  // Em produção, persistir contamina sessões com lances de testes antigos; a
  // tabela é hidratada pelo listener LanceDado e (futuro) backfill de eventos.
  useEffect(() => {
    if (!MOCK_MODE) return;
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

  // Listener on-chain do evento LanceDado — atualiza tabela em tempo real.
  // Desativado em MOCK_MODE (UI roda sem rede).
  useEffect(() => {
    if (MOCK_MODE) return;
    const unsubscribe = subscribeLanceDado(EDICAO_ATIVA, (lance) => {
      setLances((prev) => {
        if (prev.some((l) => l.txHash === lance.txHash)) return prev; // dedup
        const valor = lance.valor;
        return [
          ...prev.map((l) => l.valor === valor ? { ...l, repetido: true } : l),
          {
            endereco: lance.endereco,
            valor,
            repetido: lance.repetido || prev.some((l) => l.valor === valor),
            txHash:   lance.txHash,
          },
        ];
      });
    });
    return unsubscribe;
  }, []);

  // ── Saldo on-chain: refetch + listener + polling guardião (Opção B Fase 3) ──
  // refetchSaldo é exposto no value e estável por address para consumidores
  // poderem usá-lo em useEffect sem recriar a cada render.
  const refetchSaldo = useCallback(async () => {
    if (MOCK_MODE)  return;
    if (!address) {
      setSaldoSenhas(null);
      setSaldoSenhasStatus("idle");
      return;
    }
    // Se já temos um valor "ok", mantemos visível enquanto recarrega; senão loading.
    setSaldoSenhasStatus((prev) => (prev === "ok" || prev === "stale" ? prev : "loading"));
    try {
      const valor = await getSaldoSenhasOnChain(address);
      setSaldoSenhas(valor);
      setSaldoSenhasStatus("ok");
    } catch (err) {
      console.warn("[GUT-DEBUG] refetchSaldo falhou", {
        address, message: err?.message, name: err?.name,
      });
      // Sem valor anterior → error (UI deve bloquear lance); com valor → stale (last-known-good).
      setSaldoSenhasStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address]);

  // Fetch inicial ao logar / trocar de address. Reseta para idle ao deslogar.
  useEffect(() => {
    if (MOCK_MODE) return;
    refetchSaldo();
  }, [address, refetchSaldo]);

  // Listener de SenhasCreditadas + LanceDado(meu) → refetch.
  // Polling guardião de 30s como cinto-suspensório se ethers parar de receber
  // eventos silenciosamente (mobile background, sleep do laptop, troca de rede).
  useEffect(() => {
    if (MOCK_MODE || !address) return;

    const unsubscribe = subscribeSaldoSenhas(address, (event) => {
      console.info("[GUT-DEBUG] saldoSenhas event", event);
      refetchSaldo();
    });
    const intervalId = setInterval(refetchSaldo, 30000);

    return () => {
      try { unsubscribe(); } catch (e) {
        console.warn("[GUT-DEBUG] unsubscribe falhou", e?.message);
      }
      clearInterval(intervalId);
    };
  }, [address, refetchSaldo]);

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

  // Handlers de saldo interno — todos no-op fora de MOCK_MODE.
  // Em produção, o crédito de senhas é feito via Netlify Function (Frente B):
  // PIX confirmado → coordenacao chama adicionarSenhas() on-chain → listener
  // SenhasCreditadas atualiza saldoSenhas automaticamente. Não há saldo flash
  // intermediário nem conversão local de ficha.

  function refreshSaldo() {
    if (!MOCK_MODE) return;
    setCarteiraFlash(getCarteiraFlash());
    setFichasProgramadas(getFichasProgramadas());
  }

  function handleSimularPix() {
    if (!MOCK_MODE) return;
    setErroCarteira("");
    setCarteiraFlash(simularDepositoPix(10.00));
  }

  function handleConverterFicha() {
    if (!MOCK_MODE) return;
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
    console.info("[GUT-DEBUG] abrirModal", { ready, authenticated, hasUser: !!user });
    if (!ready) {
      console.warn("[GUT-DEBUG] abrirModal abortou: Privy ready=false. Reagendando em 1s.");
      const id = setTimeout(() => { if (ready) login(); }, 1000);
      return () => clearTimeout(id);
    }
    try {
      const result = login();
      if (result && typeof result.then === "function") {
        result
          .then(() => console.info("[GUT-DEBUG] login() resolveu"))
          .catch((err) => {
            console.error("[GUT-DEBUG] login() rejeitou", {
              name:    err?.name,
              message: err?.message,
              code:    err?.code,
              stack:   err?.stack,
              raw:     err,
            });
          });
      }
    } catch (err) {
      console.error("[GUT-DEBUG] login() jogou síncrono", {
        name: err?.name, message: err?.message, stack: err?.stack, raw: err,
      });
    }
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
    if (MOCK_MODE) localStorage.removeItem(LS_LANCES);
    const dur = DURACAO[tipoLeilao];
    setPrazoTimestamp(Math.floor(Date.now() / 1000) + dur);
    setEncerrado(false);
    setShowOverlay(false);
    setTempoRestante(dur);
    setLightningActive(false);
    setLances(MOCK_MODE ? LANCES_MOCK : []);
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
    // Saldo on-chain (Opção B Fase 3) — coexiste com fichasProgramadas
    saldoSenhas,
    saldoSenhasStatus,
    refetchSaldo,
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
