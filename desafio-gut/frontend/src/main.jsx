import "./globals.css";
import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { captureException, sentryPronto } from "./lib/sentryLazy.js";
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

// MC82.3 — o Sentry.init() saiu daqui para src/lib/sentryLazy.js, que importa o
// SDK dinamicamente. Motivo: depois do MC82.2 o chunk `sentry` (257,8 KB) era o
// MAIOR item do arranque (617 KB), e o gate LGPD não precisa de telemetria.
// A configuração (scrub argon2id, addEventProcessor de referral) foi movida
// INTACTA. Este ficheiro não pode voltar a importar "@sentry/react" de forma
// estática, ou o chunk regressa ao caminho crítico.

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
    // MC82.3 — só enfileira ENQUANTO o Sentry não subiu. Depois de inicializado
    // o SDK instala os seus próprios handlers globais; capturar aqui também
    // duplicaria cada evento.
    if (!sentryPronto() && ev.error) captureException(ev.error);
  });

  window.addEventListener("unhandledrejection", (ev) => {
    console.error("[GUT-DEBUG] unhandledrejection", {
      reason:    ev.reason,
      reasonStr: ev.reason?.stack || String(ev.reason),
      message:   ev.reason?.message,
      name:      ev.reason?.name,
    });
    if (!sentryPronto() && ev.reason) captureException(ev.reason);
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

// MC82.3 — substitui o <Sentry.ErrorBoundary>, que obrigava o SDK a estar no
// arranque. Mesma UI de fallback; o erro vai por sentryLazy.captureException,
// que o envia já (se o Sentry estiver pronto) ou o guarda em fila até estar.
class RaizErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try {
      captureException(err, { extra: { componentStack: info?.componentStack } });
    } catch { /* telemetria nunca pode agravar um crash */ }
    console.error("[GUT-DEBUG] erro capturado na raiz", err);
  }
  render() {
    if (this.state.err) return <SentryFallback />;
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RaizErrorBoundary>
    <BrowserRouter>
    {/* MC17.3.1.1 — captura ?ref=IND-... para sessionStorage antes do Privy. */}
    <ReferralTracker />
    {/* MC82.2 — Boot decide: gate LGPD (leve, sem Privy) ou a aplicação completa
        via import dinâmico de PrivyRoot.jsx. O PrivyCrashBoundary acompanhou o
        provider para dentro do PrivyRoot — continua a envolvê-lo, apenas um nível
        abaixo, portanto a rede de segurança do createWallet permanece intacta. */}
    <Boot />
    </BrowserRouter>
    </RaizErrorBoundary>
  </StrictMode>
);
