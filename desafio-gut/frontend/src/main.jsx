import "./globals.css";
import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PrivyProvider, useLogin, useCreateWallet } from "@privy-io/react-auth";
import { sepolia as sepoliaChain, mainnet as mainnetChain } from "viem/chains"; // viem instalado como dep do Privy
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import ReferralTracker from "./components/ReferralTracker.jsx";
// MC39.20 (Onda 8, item 35) — Real User Monitoring (Core Web Vitals → Sentry).
import { reportWebVitals } from "./lib/webVitals.js";

// MC25.3 — SliderOpacidade removido. O vidro agora é fixo (.gut-glass-standard),
// padrão navy-based imutável. Nenhuma opacidade dinâmica para restaurar.

// Sentry init — no-op em ambientes sem VITE_SENTRY_DSN (dev local sem env).
// beforeSend strippa qualquer payload contendo "argon2id_" como defesa em
// profundidade contra vazar hash de prova de intenção do lance.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ARGON2ID_RE = /argon2id_/i;
const scrubArgon2id = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "string" && ARGON2ID_RE.test(v)) obj[k] = "[REDACTED:argon2id]";
    else if (v && typeof v === "object") scrubArgon2id(v);
  }
};
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.extra) scrubArgon2id(event.extra);
    if (event.contexts) scrubArgon2id(event.contexts);
    if (event.breadcrumbs) {
      event.breadcrumbs.forEach((b) => {
        if (b.data) scrubArgon2id(b.data);
        if (typeof b.message === "string" && ARGON2ID_RE.test(b.message)) {
          b.message = "[REDACTED:argon2id]";
        }
      });
    }
    return event;
  },
});

// MC17.3.1.1 — enriquece os erros com a URL e o contexto de referral, para
// correlacionar crashes de cold-start (ex.: createWallet) com o link de entrada.
// Corre ANTES do beforeSend (que mantém o scrub argon2id intacto — sem PII nova
// além da href e do código IND). privy_token_exists é uma heurística leve.
function privyTokenExists() {
  try {
    if (typeof document !== "undefined" && /privy-token=/.test(document.cookie || "")) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("privy:")) return true;
    }
  } catch { /* sem storage: ignora */ }
  return false;
}
Sentry.addEventProcessor((event) => {
  try {
    const url = typeof window !== "undefined" ? window.location.href : null;
    if (url) event.request = { ...(event.request || {}), url };
    event.contexts = {
      ...(event.contexts || {}),
      "Referral Context": {
        current_url: url,
        stored_ref_code: (() => { try { return sessionStorage.getItem("desafiogut_ref"); } catch { return null; } })(),
        privy_token_exists: privyTokenExists(),
      },
    };
  } catch { /* nunca quebrar o pipeline do Sentry */ }
  return event;
});

// MC39.20 (Onda 8) — começa a coletar Core Web Vitals (LCP/INP/CLS/TTFB) da
// sessão real e reporta ao Sentry. No-op se o Sentry estiver desabilitado.
reportWebVitals();

// App ID validado via Privy Management API em 2026-04-28.
// NÃO usar import.meta.env — o dashboard Netlify tem o valor ERRADO (cmo5113v)
// que sobrescreve qualquer fallback em tempo de build. Hardcode obrigatório até
// o env var VITE_PRIVY_APP_ID ser corrigido no painel Netlify para cmo51f3v.
const PRIVY_APP_ID_RAW = "cmo51f3v300l90clgzksivvad";

// Sanity check anti-whitespace/zero-width sneaky chars.
// Strip de \s + zero-width space (U+200B), zero-width non-joiner (U+200C),
// zero-width joiner (U+200D), BOM (U+FEFF). Garante que typo invisível nunca
// degrade o appId em runtime.
const PRIVY_APP_ID = PRIVY_APP_ID_RAW.replace(
  /[\s​‌‍﻿]/g, ""
);
if (PRIVY_APP_ID !== PRIVY_APP_ID_RAW) {
  console.error("[GUT-DEBUG] PRIVY_APP_ID continha caracteres invisíveis", {
    raw: JSON.stringify(PRIVY_APP_ID_RAW),
    cleaned: JSON.stringify(PRIVY_APP_ID),
  });
}
if (!/^[a-z0-9]{20,30}$/.test(PRIVY_APP_ID)) {
  console.error("[GUT-DEBUG] PRIVY_APP_ID não bate com [a-z0-9]{20,30}", PRIVY_APP_ID);
}

// ── Instrumentação verbosa — captura falhas do Privy/CSP ────────────────────
// Imprime QUALQUER erro/rejeição não tratada com tag [GUT-DEBUG] para que o
// usuário consiga colar o erro completo do console quando o modal trava.
if (typeof window !== "undefined") {
  window.__GUT_DEBUG__ = {
    appId: PRIVY_APP_ID,
    appIdLen: PRIVY_APP_ID.length,
    origin: window.location.origin,
    href:   window.location.href,
    sepoliaChainId: sepoliaChain?.id,
    sepoliaName:    sepoliaChain?.name,
    bundleBuiltAt:  new Date().toISOString(),
  };
  console.info("[GUT-DEBUG] boot", window.__GUT_DEBUG__);

  window.addEventListener("error", (ev) => {
    console.error("[GUT-DEBUG] window.error", {
      message:  ev.message,
      source:   ev.filename,
      line:     ev.lineno,
      col:      ev.colno,
      error:    ev.error,
      errorStr: ev.error?.stack || String(ev.error),
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    console.error("[GUT-DEBUG] unhandledrejection", {
      reason:    ev.reason,
      reasonStr: ev.reason?.stack || String(ev.reason),
      message:   ev.reason?.message,
      name:      ev.reason?.name,
    });
  });

  // Captura QUALQUER violação CSP (frame-ancestors, frame-src, script-src…)
  // com o detalhe que o erro do console esconde.
  document.addEventListener("securitypolicyviolation", (ev) => {
    console.error("[GUT-DEBUG] CSP violation", {
      directive:    ev.violatedDirective,
      effective:    ev.effectiveDirective,
      blockedURI:   ev.blockedURI,
      documentURI:  ev.documentURI,
      sourceFile:   ev.sourceFile,
      lineNumber:   ev.lineNumber,
      sample:       ev.sample,
      disposition:  ev.disposition,
      originalPolicy: ev.originalPolicy?.slice(0, 200),
    });
  });
}

const SentryFallback = () => (
  <div style={{ padding: "2rem", color: "#ef4444", textAlign: "center", fontFamily: "system-ui" }}>
    <h2 style={{ margin: 0 }}>Erro inesperado</h2>
    <p>A equipe foi notificada. Por favor, recarregue a página.</p>
  </div>
);

// MC17.3.1.2.1 — rede de segurança: se (residualmente) o crash da race do
// createWallet ainda escapar, auto-recupera com UM reload (guardado por 30s para
// nunca entrar em loop). Erros NÃO relacionados são RE-LANÇADOS intactos para o
// Sentry.ErrorBoundary acima — zero regressão no reporting/UX existente.
class PrivyCrashBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null, reloading: false }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) {
    const msg = String(err?.message || err || "");
    const race = /createWallet/i.test(msg) && /(onSuccess|undefined)/i.test(msg);
    if (!race) return; // não relacionado → render() re-lança para o Sentry boundary
    let last = 0;
    try { last = Number(sessionStorage.getItem("gut_privy_autoreload") || 0); } catch { /* sem storage */ }
    if (Date.now() - last > 30000) {
      try { sessionStorage.setItem("gut_privy_autoreload", String(Date.now())); } catch { /* sem storage */ }
      console.warn("[GUT] crash createWallet detetado — auto-reload único (MC17.3.1.2.1)");
      this.setState({ reloading: true });
      window.location.reload();
    }
    // else: loop-guard (já recarregou < 30s) → render() re-lança → Sentry fallback (sem loop)
  }
  render() {
    if (this.state.reloading) return null;
    if (this.state.err) throw this.state.err;
    return this.props.children;
  }
}

// MC17.3.1.1 → MC17.3.1.2.1 — PrivyEventsBridge.
// O crash "Cannot destructure property 'onSuccess' of 'i.createWallet' as it is
// undefined" vinha do despacho AUTOMÁTICO de createWallet (createOnLogin:"all-users"):
// no 1.º login de utilizador NOVO o SDK auto-criava a wallet e lia
// events.createWallet ANTES de o handler do useCreateWallet estar registado (race),
// rebentando o destructure. MC17.3.1.1 registou o handler (mitigou o caso comum) mas
// a race persistia no cold start (confirmado no MC17.5.1).
//
// MC17.3.1.2.1 — elimina a race na ORIGEM: createOnLogin passa a "off" (sem
// auto-criação), e a embedded wallet é criada EXPLICITAMENTE no onComplete do login,
// momento em que o useCreateWallet (e o seu onSuccess) já está montado. Como a
// chamada parte do próprio hook, NÃO há leitura de events.createWallet por um
// caminho sem handler. onComplete corre tanto no login novo como no já-autenticado
// (cobre um eventual utilizador autenticado sem wallet). Sem UI.
function temEmbeddedWallet(user) {
  if (!user) return false;
  return (user.linkedAccounts || []).some(
    (a) => a?.type === "wallet" && a?.walletClientType === "privy",
  );
}

function PrivyEventsBridge() {
  const { createWallet } = useCreateWallet({
    onSuccess: ({ wallet }) =>
      console.info("[GUT] embedded wallet criada", { address: wallet?.address }),
    onError: (error) => console.warn("[GUT] createWallet erro", error),
  });

  useLogin({
    onComplete: async ({ user, isNewUser, wasAlreadyAuthenticated }) => {
      console.info("[GUT] login completo", { isNewUser, wasAlreadyAuthenticated });
      // Criação EXPLÍCITA quando ainda não há embedded wallet. createWallet() lança
      // se o user já tiver wallet → guard + try/catch (idempotente e anti-corrida).
      if (!temEmbeddedWallet(user)) {
        try {
          await createWallet();
        } catch (err) {
          console.warn("[GUT] createWallet() no onComplete falhou (pode já existir)", err?.message);
        }
      }
    },
    onError: (error) => console.warn("[GUT] login erro", error),
  });
  return null;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<SentryFallback />}>
    {/* MC17.3.1.2.1 — rede de segurança que auto-recupera (1 reload) do crash
        residual do createWallet; demais erros sobem intactos ao Sentry boundary. */}
    <PrivyCrashBoundary>
    <BrowserRouter>
    {/* MC17.3.1.1 — captura ?ref=IND-... para sessionStorage antes do Privy. */}
    <ReferralTracker />
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // ── Métodos de login: Google, E-mail, Apple ──────────────────────────
        loginMethods: ["google", "email", "apple"],

        // ── Embedded Wallet: criação EXPLÍCITA (não automática) ──────────────
        // MC17.3.1.2.1 — createOnLogin:"off". A auto-criação no login era o
        // gatilho do crash "Cannot destructure ... createWallet" (despacho do
        // evento antes do handler registar, no cold start de utilizador novo).
        // Com "off", o SDK NÃO auto-cria; a wallet é criada explicitamente no
        // onComplete do PrivyEventsBridge (quando o handler já está montado),
        // eliminando a race sem necessidade de reload. A forma continua aninhada
        // por chain (exigida pelo Privy v3). Callbacks vêm de useLogin/useCreateWallet.
        // MC39.3.1 (#6) — showWalletUIs:false suprime o modal de confirmação de
        // assinatura da embedded wallet em ações INICIADAS PELA APP (login direto
        // sem prompt + assinatura EIP-191 do lance sem modal). Trade-off de UX
        // aceite pelo operador: reduz fricção; a posse é garantida via Privy + JWT,
        // e o valor do lance é validado no backend (anti-sniping MC28).
        embeddedWallets: {
          showWalletUIs: false,
          ethereum: { createOnLogin: "off" },
        },

        // ── Rede: Sepolia (default atual) + Mainnet disponível (MC39.1, prep MC40) ──
        // defaultChain permanece Sepolia até o cutover (MC40). Mainnet listada como
        // suportada para permitir switchChain(1) sem regressão (login segue Sepolia).
        defaultChain: sepoliaChain,
        supportedChains: [sepoliaChain, mainnetChain],

        // ── Aparência: alinhada ao design DESAFIOGUT ─────────────────────────
        appearance: {
          theme: "dark",
          accentColor: "#00d4aa",
          logo: "https://silly-stardust-ca71bc.netlify.app/favicon.ico",
          showWalletLoginFirst: false,
          // walletList removido: causava WalletConnect bloqueado pelo CSP
          // → TypeError: Failed to fetch → ready: false permanente
        },
      }}
    >
      {/* MC17.3.1.1 — regista os callbacks de evento (fix do crash createWallet). */}
      <PrivyEventsBridge />
      <App />
    </PrivyProvider>
    </BrowserRouter>
    </PrivyCrashBoundary>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
