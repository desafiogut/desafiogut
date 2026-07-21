import "./globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import Boot from "./Boot.jsx";
import ReferralTracker from "./components/ReferralTracker.jsx";

// MC82.2 — o Privy (e a árvore da aplicação) saíram daqui para PrivyRoot.jsx,
// carregado sob demanda pelo Boot. Este ficheiro tem de continuar SEM importar
// `@privy-io/react-auth`, `viem` ou `./App.jsx`: qualquer um deles traz de volta
// o chunk `privy` (2.745 KB) para o caminho crítico do gate LGPD.
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

// ── Instrumentação verbosa — captura falhas do Privy/CSP ────────────────────
// Imprime QUALQUER erro/rejeição não tratada com tag [GUT-DEBUG] para que o
// usuário consiga colar o erro completo do console quando o modal trava.
// MC82.2 — o PRIVY_APP_ID e o objeto window.__GUT_DEBUG__ mudaram-se para
// PrivyRoot.jsx (dependem das chains do viem). Estes listeners ficam aqui de
// propósito: registam-se no primeiro instante e apanham falhas que ocorram
// ANTES de o chunk do Privy sequer ser pedido.
if (typeof window !== "undefined") {
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<SentryFallback />}>
    <BrowserRouter>
    {/* MC17.3.1.1 — captura ?ref=IND-... para sessionStorage antes do Privy. */}
    <ReferralTracker />
    {/* MC82.2 — Boot decide: gate LGPD (leve, sem Privy) ou a aplicação completa
        via import dinâmico de PrivyRoot.jsx. O PrivyCrashBoundary acompanhou o
        provider para dentro do PrivyRoot — continua a envolvê-lo, apenas um nível
        abaixo, portanto a rede de segurança do createWallet permanece intacta. */}
    <Boot />
    </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
