import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrivy, useWallets } from "@privy-io/react-auth";
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

  // Persiste prazos no localStorage sempre que mudam — garante que o valor
  // inicial (inclusive fallback Date.now()+dur) seja escrito. Sem isso, F5
  // lê localStorage null e gera novo deadline, zerando o cronómetro.
  useEffect(() => { gravarPrazoStorage(LS_PRAZO_FLASH, prazoFlash); }, [prazoFlash]);
  useEffect(() => { gravarPrazoStorage(LS_PRAZO_PROG, prazoProgramado); }, [prazoProgramado]);

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

  // MC12.2 — cotaCorporativa buscada uma vez após login para TODOS os usuários
  // autenticados. tipoUsuario é derivado do campo tipo no blob (não de customMetadata,
  // que exige Admin API no Privy v3.22.1). tipoCarregando evita redirect prematuro.
  const [cotaCorporativa, setCotaCorporativa] = useState(null);
  const [tipoCarregando,  setTipoCarregando]  = useState(false);

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

  // Privy auth — MC12: customMetadata como fonte de verdade do tipoUsuario.
  // ATENÇÃO: useWallets/address ANTES de qualquer hook que os use em deps (TDZ mc11.16-t2).
  const { ready, authenticated, user, login, logout } = usePrivy();
  const navigate = useNavigate();
  const { wallets } = useWallets();
  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address     = privyWallet?.address ?? null;

  // MC12.2 — cota corporativa: buscada uma vez para QUALQUER usuário logado.
  // tipoUsuario é derivado do campo tipo no blob (não de user.customMetadata).
  // Privy v3.22.1 removeu setCustomMetadata client-side; a persistência agora
  // fica em Netlify Blobs via cotas.mjs (POST action=register-corporativo).
  useEffect(() => {
    if (!address) { setCotaCorporativa(null); setTipoCarregando(false); return; }
    setTipoCarregando(true);
    let cancel = false;
    const buscarCota = async () => {
      try {
        const respAddr = await fetch(`/.netlify/functions/cotas?cliente_id=${encodeURIComponent(address)}`);
        let data = respAddr.ok ? await respAddr.json() : null;
        // MC14.10.1 ITEM 2 — fallback por email para cadastros directos cnpj:XXXXX
        if (!data && user?.email?.address) {
          const respEmail = await fetch(`/.netlify/functions/cotas?email=${encodeURIComponent(user.email.address)}`);
          if (respEmail.ok) data = await respEmail.json();
        }
        if (!cancel) {
          setCotaCorporativa(data || null);
          setTipoCarregando(false);
        }
      } catch {
        if (!cancel) { setCotaCorporativa(null); setTipoCarregando(false); }
      }
    };
    buscarCota();
    return () => { cancel = true; };
  }, [address, user?.email?.address]);

  // MC12.2 — tipoUsuario derivado do blob cotas (não de customMetadata).
  const tipoUsuario = cotaCorporativa?.tipo === "corporativo" ? "corporativo" : "comum";

  // Atualiza cotaCorporativa em memória após auto-cadastro (SejaNossoParceiro)
  // sem aguardar novo fetch do servidor.
  const atualizarTipoCorporativo = (data) => { setCotaCorporativa(data); setTipoCarregando(false); };

  // MC12.3 Item 4 — Isolamento do mundo lojista. Se um corporativo cair em
  // rota de usuário comum (Dashboard, carteira, mercado, vitrine, ativos…),
  // redireciona automaticamente para /corporativo. Replace para não
  // poluir o histórico do navegador.
  useEffect(() => {
    if (tipoCarregando) return;
    if (tipoUsuario !== "corporativo") return;
    const rotasProibidas = new Set([
      "/", "/carteira", "/mercado", "/vitrine", "/programacao",
      "/ativos", "/seguranca",
    ]);
    if (rotasProibidas.has(location.pathname)) {
      navigate("/corporativo", { replace: true });
    }
  }, [tipoUsuario, tipoCarregando, location.pathname, navigate]);

  // MC12 — carteira corporativa: wallets[1] criado após cadastro corporativo.
  // Fallback para wallets[0] se wallets[1] ainda não existe (transição).
  const corporativoWallet = tipoUsuario === "corporativo"
    ? (wallets[1] ?? wallets[0] ?? null)
    : null;
  const addressCorporativo = corporativoWallet?.address ?? null;

  const isConnected = authenticated && Boolean(address);
  const userLabel   = user?.google?.name || user?.google?.email || user?.email?.address || user?.apple?.email || (tipoUsuario === "corporativo" ? cotaCorporativa?.empresa : null) || null;

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

  // MC12: detectarTipoCorporativo e polling removidos. tipoUsuario vem de
  // user.customMetadata (ver bloco Privy auth acima).

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

  // MC16 — refs anti-duplicação da animação de fim do cronómetro.
  const fimDisparadoRef = useRef(false);
  const timeoutAnimRef = useRef(null);

  // Timer regressivo + disparo do efeito relâmpago.
  // Cálculo é ABSOLUTO: `prazo - now`. setInterval só re-renderiza (250ms),
  // nunca decrementa segundos. Resultado: imune a refresh e troca de aba.
  useEffect(() => {
    const tick = () => {
      const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
      setTempoRestante(restante);
      if (restante === 0) {
        setEncerrado(true);
        // MC16 — flag impede múltiplos disparos quando encerrado
        // muda e o efeito re-executa com restante ainda === 0.
        if (!fimDisparadoRef.current) {
          fimDisparadoRef.current = true;
          setLightningActive(true);
          // Limpa timeout anterior (defesa em profundidade)
          if (timeoutAnimRef.current) clearTimeout(timeoutAnimRef.current);
          timeoutAnimRef.current = setTimeout(() => {
            setLightningActive(false);
            setShowOverlay(true);
            timeoutAnimRef.current = null;
          }, 1200);
        }
      } else if (encerrado) {
        // Caso o prazo seja atualizado on-chain depois do encerrado, reabre.
        setEncerrado(false);
        setShowOverlay(false);
        fimDisparadoRef.current = false;
      }
    };
    tick();
    const id  = setInterval(tick, 250);
    const vis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(id);
      // MC16 — NÃO limpar timeoutAnimRef aqui. Quando encerrado
      // muda (restante===0), a cleanup mata o setTimeout que ia
      // disparar showOverlay. O timeout é auto-limpante (seta
      // timeoutAnimRef=null ao executar) e handleNovaRodada faz
      // cleanup explícito.
      document.removeEventListener("visibilitychange", vis);
    };
  }, [prazoTimestamp, encerrado]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function abrirModal() {
    console.info("[GUT-DEBUG] abrirModal", { ready, authenticated, hasUser: !!user, hasAddress: !!address });
    // MC11.17: abrirModal restaurado ao comportamento pré-MC11.2.
    // createOnLogin: "all-users" no PrivyProvider cria a carteira automaticamente
    // após o login — não é necessário chamar createWallet() aqui.
    if (!ready) {
      console.warn("[GUT-DEBUG] abrirModal ignorado: Privy ready=false (UI deve mostrar skeleton).");
      return;
    }
    if (authenticated && address) {
      console.info("[GUT-DEBUG] abrirModal ignorado: já autenticado e com carteira.");
      return;
    }
    if (authenticated && !address) {
      console.info("[GUT-DEBUG] abrirModal: aguardando createOnLogin criar carteira automaticamente.");
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
    // MC16 — reseta flag para animação disparar na nova edição
    fimDisparadoRef.current = false;
    if (timeoutAnimRef.current) { clearTimeout(timeoutAnimRef.current); timeoutAnimRef.current = null; }
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
    prazoTimestamp, setPrazoTimestamp,
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
    // MC12.2 — tipo de usuário (cotas blob), cota e carteiras corporativas.
    tipoUsuario,
    tipoCarregando,
    atualizarTipoCorporativo,
    cotaCorporativa,
    corporativoWallet,
    addressCorporativo,
    authToken,
    obterAuthToken,
    address, privyWallet, isConnected, userLabel, ready, authenticated, user,
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
