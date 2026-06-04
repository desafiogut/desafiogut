import "./globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PrivyProvider, useLogin, useCreateWallet } from "@privy-io/react-auth";
import { sepolia as sepoliaChain } from "viem/chains"; // viem instalado como dep do Privy
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import ReferralTracker from "./components/ReferralTracker.jsx";

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

// MC17.3.1.1 — PrivyEventsBridge: registar os callbacks de evento do Privy v3.
// É a CORREÇÃO do crash "Cannot destructure property 'onSuccess' of
// 'i.createWallet' as it is undefined": com `createOnLogin: all-users`, ao logar
// um utilizador NOVO o SDK auto-cria a embedded wallet e despacha o evento
// `createWallet`, fazendo internamente `const { onSuccess } = events.createWallet`.
// Sem nenhum useCreateWallet registado, `events.createWallet` é undefined e o
// destructure rebenta. Registar os hooks aqui DEFINE events.createWallet/login.
// Montado dentro do PrivyProvider e o mais cedo possível (irmão de <App/>),
// para o handler existir antes de qualquer fluxo de login. Sem UI.
function PrivyEventsBridge() {
  useCreateWallet({
    onSuccess: ({ wallet }) =>
      console.info("[GUT] embedded wallet criada", { address: wallet?.address }),
    onError: (error) =>
      console.warn("[GUT] createWallet erro", error),
  });
  useLogin({
    onComplete: ({ isNewUser, wasAlreadyAuthenticated }) =>
      console.info("[GUT] login completo", { isNewUser, wasAlreadyAuthenticated }),
    onError: (error) =>
      console.warn("[GUT] login erro", error),
  });
  return null;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<SentryFallback />}>
    <BrowserRouter>
    {/* MC17.3.1.1 — captura ?ref=IND-... para sessionStorage antes do Privy. */}
    <ReferralTracker />
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // ── Métodos de login: Google, E-mail, Apple ──────────────────────────
        loginMethods: ["google", "email", "apple"],

        // ── Embedded Wallet: criado automaticamente para todos os usuários ──
        // MC17.3.1.1 — forma ANINHADA por chain exigida pelo Privy v3
        // (embeddedWallets.ethereum.createOnLogin). A forma plana legada
        // (createOnLogin no topo) ficou fora do tipo v3 e o callback do evento
        // createWallet não era registado, disparando o crash em utilizadores
        // novos. O registo do callback é feito por hooks (ver PrivyEventsBridge).
        // Nota: a prop global `onSuccess` foi removida — não existe na v3
        // (PrivyProviderProps só aceita appId/clientId/config/children); os
        // callbacks passam a vir de useLogin/useCreateWallet.
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
        },

        // ── Rede: Sepolia via viem/chains (definição oficial) ────────────────
        defaultChain: sepoliaChain,
        supportedChains: [sepoliaChain],

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
    </Sentry.ErrorBoundary>
  </StrictMode>
);
