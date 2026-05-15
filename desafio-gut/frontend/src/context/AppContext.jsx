import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  subscribeLanceDado,
  getSaldoSenhasOnChain,
  subscribeSaldoSenhas,
  getEdicaoPrazo,
  getSignerFromProvider,
} from "../utils/web3.js";

// Persistência do prazoTimestamp (Onda 5 FASE 0): o timer é IMUNE a refresh
// porque cada tipo de leilão guarda seu próprio prazo no localStorage. Cálculo
// é sempre absoluto (`prazo - now`) — o setInterval só re-renderiza.
const LS_PRAZO_FLASH = "gut_prazo_flash";
const LS_PRAZO_PROG  = "gut_prazo_programado";
function lerPrazoStorage(chave) {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(chave);
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    // Descarta prazos vencidos há mais de 10 min (evita prender em "encerrado").
    if (n + 600 < Math.floor(Date.now() / 1000)) return null;
    return n;
  } catch { return null; }
}
function gravarPrazoStorage(chave, prazo) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(chave, String(prazo)); } catch {}
}

// ─── Constantes ──────────────────────────────────────────────────────────────
export const EDICAO_ATIVA = "R-1";

// Duração das rodadas — aderente à Especificação Refatorada (Junho/2026):
// - Relâmpago (Bronze/Prata): 30 min a 1 h (1800-3600s), configurável via
//   VITE_DURACAO_FLASH_SECONDS. Valores fora do intervalo caem no fallback 1800.
// - Programado (Ouro/Diamante): 86400s = 24 h, reset diário às 00:00.
const FLASH_MIN = 1800;
const FLASH_MAX = 3600;
function lerDuracaoFlash() {
  const raw = Number(import.meta.env?.VITE_DURACAO_FLASH_SECONDS);
  if (!Number.isFinite(raw) || raw < FLASH_MIN || raw > FLASH_MAX) return FLASH_MIN;
  return Math.floor(raw);
}
export const DURACAO = {
  flash:      lerDuracaoFlash(),
  programado: 86400,
};

// Chaves legadas em localStorage criadas por versões anteriores com MOCK_MODE.
// Removidas uma única vez via reset versionado para não vazar dados fake.
const LS_RESET_KEY        = "gut_reset_v";
const LS_RESET_VERSION    = "2026-05-11-v2";
const LS_KEYS_LEGADO_MOCK = [
  "gut_lances_r1",
  "lances",
  "LS_LANCES",
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

  // Timer (Onda 5 FASE 0) — 2 prazos persistidos, prazoTimestamp deriva do tipo.
  // Inicializa do localStorage; se ausente, computa default. Programado é
  // hidratado on-chain via polling (getEdicaoPrazo) logo após o mount.
  const [prazoFlash, setPrazoFlash] = useState(() =>
    lerPrazoStorage(LS_PRAZO_FLASH) ?? (Math.floor(Date.now() / 1000) + DURACAO.flash)
  );
  const [prazoProgramado, setPrazoProgramado] = useState(() =>
    lerPrazoStorage(LS_PRAZO_PROG) ?? (Math.floor(Date.now() / 1000) + DURACAO.programado)
  );
  const prazoTimestamp = tipoLeilao === "flash" ? prazoFlash : prazoProgramado;

  const [encerrado,       setEncerrado]       = useState(false);
  const [showOverlay,     setShowOverlay]     = useState(false);
  const [tempoRestante,   setTempoRestante]   = useState(() => Math.max(0,
    (tipoLeilao === "flash" ? prazoFlash : prazoProgramado) - Math.floor(Date.now() / 1000)
  ));
  const [lightningActive, setLightningActive] = useState(false);
  const [showCountdown,   setShowCountdown]   = useState(false);

  // Setter que troca o prazo do tipo CORRENTE e persiste.
  const setPrazoTimestamp = useCallback((novo) => {
    if (tipoLeilao === "flash") {
      setPrazoFlash(novo);
      gravarPrazoStorage(LS_PRAZO_FLASH, novo);
    } else {
      setPrazoProgramado(novo);
      gravarPrazoStorage(LS_PRAZO_PROG, novo);
    }
  }, [tipoLeilao]);

  // Saldo on-chain — saldoSenhas[address] no contrato.
  // null = "ainda não consultado" (distinto de 0, que é estado on-chain válido).
  const [saldoSenhas,       setSaldoSenhas]       = useState(null);
  const [saldoSenhasStatus, setSaldoSenhasStatus] = useState("idle"); // idle | loading | ok | stale | error

  // Saldo R$ off-chain — blob `saldo-rs:${address}` (Frente B.9).
  // PIX aprovado = +R$. /comprar-senhas = -R$ +senhas. /lance-relampago = -R$.
  const [saldoRsCentavos, setSaldoRsCentavos] = useState(null);
  const [saldoRsStatus,   setSaldoRsStatus]   = useState("idle");

  // ── User-session JWT (Anti-IDOR — Mega Comando 1 / Item 3) ───────────────
  // Obtido após login Privy via assinatura EIP-191. TTL 24h. Cache em
  // sessionStorage para sobreviver a refresh de página dentro da sessão.
  // Injetado em Authorization: Bearer nos GETs sensíveis (saldo-rs, wallet,
  // renovacao-adesao, voucher).
  const [authToken, setAuthToken] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("gut_auth_user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.token) return null;
      if (typeof parsed.expiresAt === "number" && Date.now() >= parsed.expiresAt) return null;
      return parsed.token;
    } catch { return null; }
  });

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
    // Purga Blob server-side de lances residuais da Edição R-1 (one-shot,
    // disparado quando a versão do reset muda neste dispositivo).
    fetch("/.netlify/functions/purge-lances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edicaoId: EDICAO_ATIVA }),
    }).then((resp) => {
      if (!resp.ok) console.warn("[GUT-DEBUG] purge-lances HTTP", resp.status);
    }).catch((err) => {
      console.warn("[GUT-DEBUG] purge-lances falhou", err?.message);
    });
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

  // ── User-session JWT: obter via assinatura EIP-191 após login Privy ─────
  const obterAuthToken = useCallback(async () => {
    if (!address || !privyWallet) return null;
    try {
      const ts = Date.now();
      const enderecoLower = address.toLowerCase();
      const message = `DESAFIOGUT-AUTH:${ts}:${enderecoLower}`;
      const provider  = await privyWallet.getEthereumProvider();
      const { signer } = await getSignerFromProvider(provider);
      const signature = await signer.signMessage(message);
      const resp = await fetch("/.netlify/functions/auth-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endereco: enderecoLower, signature, message }),
      });
      if (!resp.ok) {
        console.warn("[GUT-DEBUG] auth-user HTTP", resp.status);
        return null;
      }
      const data = await resp.json();
      if (!data?.token) return null;
      const expiresAt = Date.now() + (Number(data.ttl) || 86400) * 1000;
      try { sessionStorage.setItem("gut_auth_user", JSON.stringify({ token: data.token, expiresAt })); } catch {}
      setAuthToken(data.token);
      return data.token;
    } catch (err) {
      console.warn("[GUT-DEBUG] obterAuthToken falhou", err?.message);
      return null;
    }
  }, [address, privyWallet]);

  useEffect(() => {
    if (!address) {
      setAuthToken(null);
      try { sessionStorage.removeItem("gut_auth_user"); } catch {}
      return;
    }
    if (!authToken) obterAuthToken();
  }, [address, authToken, obterAuthToken]);

  // ── Saldo R$ off-chain: polling 5s (gated em authToken para anti-IDOR) ──
  const refetchSaldoRs = useCallback(async () => {
    if (!address || !authToken) {
      setSaldoRsCentavos(null);
      setSaldoRsStatus("idle");
      return;
    }
    setSaldoRsStatus((prev) => (prev === "ok" || prev === "stale" ? prev : "loading"));
    try {
      const resp = await fetch(`/.netlify/functions/saldo-rs?endereco=${encodeURIComponent(address)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.status === 401) {
        // Token expirado/inválido — limpa e re-obtém.
        setAuthToken(null);
        try { sessionStorage.removeItem("gut_auth_user"); } catch {}
        throw new Error("token expirado");
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setSaldoRsCentavos(Number(data?.saldoCentavos ?? 0));
      setSaldoRsStatus("ok");
    } catch (err) {
      console.warn("[GUT-DEBUG] refetchSaldoRs falhou", { address, message: err?.message });
      setSaldoRsStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address, authToken]);

  useEffect(() => {
    refetchSaldoRs();
    if (!address || !authToken) return;
    const id = setInterval(refetchSaldoRs, 5000);
    return () => clearInterval(id);
  }, [address, authToken, refetchSaldoRs]);

  // Polling on-chain do prazo do Programado (Onda 5 FASE 0).
  // Contrato é fonte da verdade do REQ-10. Polling a cada 60s; também escuta
  // visibilitychange para re-sincronizar quando a aba volta a foco.
  useEffect(() => {
    let cancelado = false;
    const fetchOnchain = async () => {
      try {
        const onchain = await getEdicaoPrazo(EDICAO_ATIVA);
        if (cancelado || !onchain || onchain <= 0) return;
        setPrazoProgramado((prev) => {
          if (prev === onchain) return prev;
          gravarPrazoStorage(LS_PRAZO_PROG, onchain);
          return onchain;
        });
      } catch (err) {
        console.warn("[GUT-DEBUG] getEdicaoPrazo falhou (timer offline-tolerante):", err?.message);
      }
    };
    fetchOnchain();
    const id  = setInterval(fetchOnchain, 60_000);
    const vis = () => { if (document.visibilityState === "visible") fetchOnchain(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelado = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // Timer regressivo + disparo do efeito relâmpago.
  // Cálculo é ABSOLUTO: `prazo - now`. setInterval só re-renderiza (250ms),
  // nunca decrementa segundos. Resultado: imune a refresh e troca de aba.
  useEffect(() => {
    const tick = () => {
      const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
      setTempoRestante(restante);
      if (restante === 0) {
        setEncerrado(true);
        setLightningActive(true);
        setTimeout(() => { setLightningActive(false); setShowOverlay(true); }, 1200);
      } else if (encerrado) {
        // Caso o prazo seja atualizado on-chain depois do encerrado, reabre.
        setEncerrado(false);
        setShowOverlay(false);
      }
    };
    tick();
    const id  = setInterval(tick, 250);
    const vis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [prazoTimestamp, encerrado]);

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
      // setPrazoTimestamp também persiste no localStorage (chave do tipo atual).
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
    prazoFlash, prazoProgramado,
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
    authToken,
    obterAuthToken,
    address, isConnected, userLabel, ready, authenticated, user,
    vencedor,
    abrirModal,
    desconectar,
    handleLanceSucesso,
    handleNovaRodada,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
