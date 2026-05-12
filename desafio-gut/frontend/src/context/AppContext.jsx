import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  subscribeLanceDado,
  getSaldoSenhasOnChain,
  subscribeSaldoSenhas,
} from "../utils/web3.js";

// ─── Constantes ──────────────────────────────────────────────────────────────
export const EDICAO_ATIVA = "R-1";

// Duração das rodadas — aderente à Especificação Refatorada (Junho/2026):
// - Relâmpago (Bronze/Prata): 1800s = 30 min
// - Programado (Ouro/Diamante): 86400s = 24 h, reset diário às 00:00
export const DURACAO = {
  flash:      1800,    // 30 min
  programado: 86400,   // 24 h
};

// Chaves legadas em localStorage criadas por versões anteriores com MOCK_MODE.
// Removidas uma única vez via reset versionado para não vazar dados fake.
const LS_RESET_KEY        = "gut_reset_v";
const LS_RESET_VERSION    = "2026-05-11";
const LS_KEYS_LEGADO_MOCK = [
  "gut_lances_r1",
  "gut_carteira_flash",
  "gut_fichas_programadas",
  "carteiraFlash",
  "fichasProgramadas",
];

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext deve ser usado dentro de <AppProvider>");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  // Tipo de leilão (Art. 8)
  const [tipoLeilao, setTipoLeilao] = useState("flash");

  // lances on-chain (programado). lancesFlash off-chain (polling do blob).
  const [lances,       setLances]       = useState([]);
  const [lancesFlash,  setLancesFlash]  = useState([]);

  // Timer
  const [prazoTimestamp,  setPrazoTimestamp]  = useState(() => Math.floor(Date.now() / 1000) + DURACAO.flash);
  const [encerrado,       setEncerrado]       = useState(false);
  const [showOverlay,     setShowOverlay]     = useState(false);
  const [tempoRestante,   setTempoRestante]   = useState(DURACAO.flash);
  const [lightningActive, setLightningActive] = useState(false);
  const [showCountdown,   setShowCountdown]   = useState(false);

  // Saldo on-chain — saldoSenhas[address] no contrato.
  // null = "ainda não consultado" (distinto de 0, que é estado on-chain válido).
  const [saldoSenhas,       setSaldoSenhas]       = useState(null);
  const [saldoSenhasStatus, setSaldoSenhasStatus] = useState("idle"); // idle | loading | ok | stale | error

  // Saldo R$ off-chain — blob `saldo-rs:${address}` (Frente B.9).
  // PIX aprovado = +R$. /comprar-senhas = -R$ +senhas. /lance-relampago = -R$.
  const [saldoRsCentavos, setSaldoRsCentavos] = useState(null);
  const [saldoRsStatus,   setSaldoRsStatus]   = useState("idle");

  // Privy auth
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address     = privyWallet?.address ?? null;
  const isConnected = authenticated && Boolean(address);
  const userLabel   = user?.google?.name || user?.google?.email || user?.email?.address || user?.apple?.email || null;

  const lancesExibidos = tipoLeilao === "flash" ? lancesFlash : lances;

  // Vencedor — Menor Lance Único (Art. 8)
  const vencedor = [...lancesExibidos]
    .filter((l) => !l.repetido)
    .sort((a, b) => a.valor - b.valor)[0] ?? null;

  // ── Reset versionado ─────────────────────────────────────────────────────
  // Limpa localStorage legado e desloga a sessão Privy UMA ÚNICA VEZ por
  // dispositivo, quando a versão do reset muda. Evita arrastar dados de
  // teste antigos (MOCK_MODE removido em 2026-05-11) sem afetar usuários
  // que já passaram pelo reset ou que fazem login após a virada.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let aplicado;
    try {
      aplicado = localStorage.getItem(LS_RESET_KEY);
    } catch { return; }
    if (aplicado === LS_RESET_VERSION) return;
    try {
      for (const k of LS_KEYS_LEGADO_MOCK) localStorage.removeItem(k);
      localStorage.setItem(LS_RESET_KEY, LS_RESET_VERSION);
    } catch {}
    // Sessão Privy antiga é descartada apenas na primeira execução do reset.
    // Usuário re-loga em seguida — UX aceitável porque é one-shot.
    if (authenticated) {
      try { logout(); } catch (err) {
        console.warn("[GUT-DEBUG] reset versionado: logout falhou", err?.message);
      }
    }
  }, [authenticated, logout]);

  // ── Efeitos ──────────────────────────────────────────────────────────────

  useEffect(() => {
    setShowOverlay(false);
    setLightningActive(false);
  }, [tipoLeilao]);

  // Polling 3s de lances flash do blob (cross-user em tempo real).
  useEffect(() => {
    if (tipoLeilao !== "flash") return;
    let cancelado = false;
    const poll = async () => {
      if (cancelado) return;
      try {
        const resp = await fetch(`/.netlify/functions/lances-flash?edicaoId=${EDICAO_ATIVA}`);
        if (!resp.ok || cancelado) return;
        const data = await resp.json();
        if (!cancelado) setLancesFlash(data.lances || []);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelado = true; clearInterval(id); };
  }, [tipoLeilao]);

  // Listener on-chain do evento LanceDado — atualiza tabela em tempo real.
  useEffect(() => {
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

  // ── Saldo on-chain: refetch + listener + polling guardião ───────────────
  const refetchSaldo = useCallback(async () => {
    if (!address) {
      setSaldoSenhas(null);
      setSaldoSenhasStatus("idle");
      return;
    }
    setSaldoSenhasStatus((prev) => (prev === "ok" || prev === "stale" ? prev : "loading"));
    try {
      const valor = await getSaldoSenhasOnChain(address);
      setSaldoSenhas(valor);
      setSaldoSenhasStatus("ok");
    } catch (err) {
      console.warn("[GUT-DEBUG] refetchSaldo falhou", {
        address, message: err?.message, name: err?.name,
      });
      setSaldoSenhasStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address]);

  useEffect(() => {
    refetchSaldo();
  }, [address, refetchSaldo]);

  useEffect(() => {
    if (!address) return;
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

  // ── Saldo R$ off-chain: polling 5s ──────────────────────────────────────
  const refetchSaldoRs = useCallback(async () => {
    if (!address) {
      setSaldoRsCentavos(null);
      setSaldoRsStatus("idle");
      return;
    }
    setSaldoRsStatus((prev) => (prev === "ok" || prev === "stale" ? prev : "loading"));
    try {
      const resp = await fetch(`/.netlify/functions/saldo-rs?endereco=${encodeURIComponent(address)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setSaldoRsCentavos(Number(data?.saldoCentavos ?? 0));
      setSaldoRsStatus("ok");
    } catch (err) {
      console.warn("[GUT-DEBUG] refetchSaldoRs falhou", { address, message: err?.message });
      setSaldoRsStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address]);

  useEffect(() => {
    refetchSaldoRs();
    if (!address) return;
    const id = setInterval(refetchSaldoRs, 5000);
    return () => clearInterval(id);
  }, [address, refetchSaldoRs]);

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

  // ── Handlers ─────────────────────────────────────────────────────────────

  function abrirModal() {
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
    logout();
  }

  function handleLanceSucesso({ address: addr, valorCentavos, txHash, nomeExibicao }) {
    const novoLance = {
      endereco: addr, valor: valorCentavos, txHash,
      nomeExibicao: nomeExibicao || null,
    };
    const setter = tipoLeilao === "flash" ? setLancesFlash : setLances;
    setter((prev) => {
      const jaRepetido = prev.some((l) => l.valor === valorCentavos);
      return [
        ...prev.map((l) => l.valor === valorCentavos ? { ...l, repetido: true } : l),
        { ...novoLance, repetido: jaRepetido },
      ];
    });
  }

  function handleNovaRodada() {
    setEncerrado(false);
    setShowOverlay(false);
    setLightningActive(false);
    setLances([]);
    setLancesFlash([]);
    setShowCountdown(true);
    setTimeout(() => {
      const dur = DURACAO[tipoLeilao];
      setPrazoTimestamp(Math.floor(Date.now() / 1000) + dur);
      setTempoRestante(dur);
      setShowCountdown(false);
    }, 3500);
  }

  // ── Value ────────────────────────────────────────────────────────────────
  const value = {
    EDICAO_ATIVA, DURACAO,
    tipoLeilao, setTipoLeilao,
    lances: lancesExibidos,
    prazoTimestamp,
    encerrado,
    showOverlay,
    showCountdown,
    tempoRestante,
    lightningActive,
    saldoSenhas,
    saldoSenhasStatus,
    refetchSaldo,
    saldoRsCentavos,
    saldoRsStatus,
    refetchSaldoRs,
    address, isConnected, userLabel, ready, authenticated, user,
    vencedor,
    abrirModal,
    desconectar,
    handleLanceSucesso,
    handleNovaRodada,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
