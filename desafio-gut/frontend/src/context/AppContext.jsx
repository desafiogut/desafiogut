import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrivy, useWallets, useLogin, useCreateWallet } from "@privy-io/react-auth";
import {
  subscribeLanceDado,
  getSaldoSenhasOnChain,
  subscribeSaldoSenhas,
  getEdicaoPrazo,
  getSignerFromProvider,
} from "../utils/web3.js";
import {
  checkJwtFailures,
  checkRateLimit,
  checkBurstCompras,
  checkGeoAnomaly,
} from "../lib/sentry-alerts.js";
import { getVisitorId, getCachedVisitorId } from "../lib/fingerprint.js";
import {
  trackPageview,
  trackClickComprar,
  trackTempoSessao,
  trackScroll,
} from "../lib/analytics.js";

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

  // MC11 — Usuário Corporativo (Lojista): tipo='comum'|'corporativo'.
  // Detecção automática: GET /cotas?cliente_id={address} — 200 = cota ativa
  // ⇒ corporativo; 404 ⇒ comum. Status auxilia gating de UI sem flicker.
  const [tipoUsuario,    setTipoUsuario]    = useState("comum");
  const [cotaCorporativa, setCotaCorporativa] = useState(null);
  const [tipoStatus,     setTipoStatus]     = useState("idle");

  // ── FingerprintJS visitorId (anti-Sybil — Mega Comando 3 / Item 3) ──────
  // Carregado uma vez no mount, cacheado em localStorage. Enviado em
  // X-Visitor-ID nos fetches sensíveis.
  const [visitorId, setVisitorId] = useState(() => getCachedVisitorId());
  useEffect(() => {
    let cancelado = false;
    getVisitorId().then((id) => { if (!cancelado && id) setVisitorId(id); });
    return () => { cancelado = true; };
  }, []);

  // ── Analytics (MC8 / Item 1) — coleta de eventos para motor IA preditiva ──
  // Fire-and-forget: nunca bloqueia render nem propaga erro. visitorId é lido
  // do localStorage dentro de analytics.js para sobreviver a mudanças de estado.
  const location = useLocation();
  useEffect(() => {
    trackPageview(location.pathname);
  }, [location.pathname]);

  // Tempo de sessão: marca início no mount e envia ao unload via Page Lifecycle.
  // pagehide é mais confiável que beforeunload no Mobile/iOS Safari.
  const sessaoInicioRef = useRef(Date.now());
  useEffect(() => {
    const onPageHide = () => {
      const segundos = Math.floor((Date.now() - sessaoInicioRef.current) / 1000);
      trackTempoSessao(segundos, location?.pathname);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [location?.pathname]);

  // Profundidade de scroll: rastreia o MÁXIMO atingido por rota.
  // Reseta o teto ao trocar de rota e dispara no unload da rota corrente.
  useEffect(() => {
    let maxProf = 0;
    let rafId   = null;
    const computar = () => {
      const el = document.documentElement;
      const total = (el.scrollHeight - el.clientHeight) || 1;
      const prof  = Math.floor(((window.scrollY || 0) / total) * 100);
      if (prof > maxProf) maxProf = prof;
      rafId = null;
    };
    const onScroll = () => {
      if (rafId == null) rafId = window.requestAnimationFrame(computar);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
      if (maxProf > 0) trackScroll(maxProf, location?.pathname);
    };
  }, [location?.pathname]);

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
  // MC11.3 — substitui usePrivy().login por useLogin({ onComplete }): hook
  // canônico do Privy que dispara callback ao final do fluxo de autenticação,
  // mais cedo e mais confiável que observar o flip de `authenticated`.
  // Importante: useNavigate dentro do AppProvider só funciona porque <App/>
  // monta o <BrowserRouter> antes de <AppProvider> (ver main.jsx).
  const { ready, authenticated, user, logout } = usePrivy();
  const navigate = useNavigate();
  const onLoginComplete = useCallback(() => {
    // Redirect pós-login obrigatório: /seja-nosso-parceiro → /.
    // Em outras rotas, NÃO mexe (usuário pode estar logando em /carteira etc).
    if (typeof window !== "undefined" && window.location?.pathname === "/seja-nosso-parceiro") {
      navigate("/", { replace: true });
    }
  }, [navigate]);
  const { login } = useLogin({ onComplete: onLoginComplete });
  // MC11.5 — fallback explícito para criação de embedded wallet. Doc Privy:
  // "createWallet runs when called manually OR when createOnLogin triggers".
  // Se createOnLogin falhar silenciosamente (CSP, rate limit, race), invocamos
  // createWallet() defensivamente no gap; se ambos falharem, recovery UI.
  const { createWallet } = useCreateWallet();
  const { wallets } = useWallets();
  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address     = privyWallet?.address ?? null;
  const isConnected = authenticated && Boolean(address);
  const userLabel   = user?.google?.name || user?.google?.email || user?.email?.address || user?.apple?.email || null;

  // ── MC11.4+MC11.5 — Recovery do trap "Criando carteira" ──────────────────
  // Dois timers no gap `authenticated && !address`:
  //   5s  → chama createWallet() defensivamente (caso createOnLogin tenha
  //         falhado silenciosamente — CSP, rate limit, race).
  //   10s → flipa walletCreationStuck=true e renderiza UI de recovery.
  // O cleanup do useEffect (re-run em mudança de deps) cancela ambos os timers
  // quando address chega ou o usuário desloga — sem risco de race.
  const WALLET_RETRY_AT_MS    = 5_000;
  const WALLET_STUCK_TIMEOUT_MS = 10_000;
  const [walletCreationStuck, setWalletCreationStuck] = useState(false);
  // Ref para createWallet evita re-trigger do useEffect se o hook reemitir.
  const createWalletRef = useRef(createWallet);
  useEffect(() => { createWalletRef.current = createWallet; }, [createWallet]);
  useEffect(() => {
    if (!authenticated || address) {
      setWalletCreationStuck(false);
      return undefined;
    }
    const retryId = setTimeout(() => {
      // .catch silencioso — se Privy já criou (race) ou erro de qualquer tipo,
      // o próximo timer (stuck) ainda decide o destino do usuário.
      try { createWalletRef.current()?.catch?.(() => {}); } catch {}
    }, WALLET_RETRY_AT_MS);
    const stuckId = setTimeout(() => setWalletCreationStuck(true), WALLET_STUCK_TIMEOUT_MS);
    return () => {
      clearTimeout(retryId);
      clearTimeout(stuckId);
    };
  }, [authenticated, address]);
  const tentarRecuperarCarteira = useCallback(async () => {
    setWalletCreationStuck(false);
    // 1ª tentativa: createWallet() direto — UX leve, sem reauth.
    try {
      await createWallet();
      return;
    } catch {
      // 2ª: logout para limpar a sessão e permitir nova tentativa pelo "Aceito".
    }
    try { logout(); } catch {}
  }, [createWallet, logout]);

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
        headers: {
          "Content-Type": "application/json",
          ...(visitorId ? { "X-Visitor-ID": visitorId } : {}),
        },
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
  }, [address, privyWallet, visitorId]);

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
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...(visitorId ? { "X-Visitor-ID": visitorId } : {}),
        },
      });
      if (resp.status === 401) {
        // Token expirado/inválido — limpa e re-obtém.
        checkJwtFailures("saldo-rs");
        setAuthToken(null);
        try { sessionStorage.removeItem("gut_auth_user"); } catch {}
        throw new Error("token expirado");
      }
      if (resp.status === 429) {
        // Servidor pode anexar X-RateLimit-Limit; usamos como count se vier.
        const count = Number(resp.headers.get("x-ratelimit-limit")) || NaN;
        checkRateLimit("saldo-rs", count, null);
        throw new Error("HTTP 429 rate limited");
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setSaldoRsCentavos(Number(data?.saldoCentavos ?? 0));
      setSaldoRsStatus("ok");
    } catch (err) {
      console.warn("[GUT-DEBUG] refetchSaldoRs falhou", { address, message: err?.message });
      setSaldoRsStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address, authToken, visitorId]);

  useEffect(() => {
    refetchSaldoRs();
    if (!address || !authToken) return;
    const id = setInterval(refetchSaldoRs, 5000);
    return () => clearInterval(id);
  }, [address, authToken, refetchSaldoRs]);

  // MC11 — detectar tipo corporativo após login. Endpoint /cotas é público
  // e retorna 404 quando não há cota ativa para o cliente_id. Polling 60s
  // cobre upgrade pós-aprovação de cota sem reload manual.
  const detectarTipoCorporativo = useCallback(async () => {
    if (!address) {
      setTipoUsuario("comum");
      setCotaCorporativa(null);
      setTipoStatus("idle");
      return;
    }
    setTipoStatus((prev) => (prev === "ok" ? prev : "loading"));
    try {
      const resp = await fetch(`/.netlify/functions/cotas?cliente_id=${encodeURIComponent(address)}`);
      if (resp.status === 404) {
        setTipoUsuario("comum");
        setCotaCorporativa(null);
        setTipoStatus("ok");
        return;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const cota = await resp.json();
      if (cota && cota.cliente_id) {
        setCotaCorporativa(cota);
        setTipoUsuario("corporativo");
        setTipoStatus("ok");
      } else {
        setTipoUsuario("comum");
        setCotaCorporativa(null);
        setTipoStatus("ok");
      }
    } catch (err) {
      console.warn("[GUT-DEBUG] detectarTipoCorporativo falhou", err?.message);
      setTipoStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address]);

  useEffect(() => {
    detectarTipoCorporativo();
    if (!address) return;
    const id = setInterval(detectarTipoCorporativo, 60_000);
    return () => clearInterval(id);
  }, [address, detectarTipoCorporativo]);

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
    console.info("[GUT-DEBUG] abrirModal", { ready, authenticated, hasUser: !!user, hasAddress: !!address });
    // MC11.2 — fix bug: re-clique no botão "Aceito" após email-OTP travava
    // a UI porque login() é no-op quando authenticated=true. Hoje:
    //   1. SDK não pronto       → ignora (UI já mostra spinner)
    //   2. Já autenticado       → no-op explícito (UI já mostra "Criando carteira…")
    //   3. Não autenticado      → dispara login()
    // (Removido: setTimeout com stale closure que nunca disparava login().)
    if (!ready) {
      console.warn("[GUT-DEBUG] abrirModal ignorado: Privy ready=false (UI deve mostrar skeleton).");
      return;
    }
    if (authenticated && address) {
      console.info("[GUT-DEBUG] abrirModal ignorado: já autenticado e com carteira.");
      return;
    }
    if (authenticated && !address) {
      console.info("[GUT-DEBUG] abrirModal: autenticado sem carteira, criando...");
      createWallet();
      return;
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
    // Sentry security alert: detecta burst de lances por endereço (>10/min)
    // e checa anomalia geográfica (3+ timezones em 5 min). Captura passiva,
    // não bloqueia o fluxo.
    checkBurstCompras(addr);
    checkGeoAnomaly();
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
    // MC11 — tipo de usuário (comum | corporativo) e cota corporativa.
    tipoUsuario,
    cotaCorporativa,
    tipoStatus,
    detectarTipoCorporativo,
    authToken,
    obterAuthToken,
    address, privyWallet, isConnected, userLabel, ready, authenticated, user,
    // MC11.4 — recovery do trap "Criando carteira" (timeout + retry).
    walletCreationStuck, tentarRecuperarCarteira,
    vencedor,
    abrirModal,
    desconectar,
    handleLanceSucesso,
    handleNovaRodada,
    // ── Analytics (MC8) ────────────────────────────────────────────────────
    trackPageview, trackClickComprar, trackTempoSessao, trackScroll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
