// webVitals — MC39.20 (Onda 8, item 35): Real User Monitoring (Core Web Vitals).
//
// Coleta LCP/INP/CLS/TTFB de sessões REAIS via a lib `web-vitals` e reporta ao
// Sentry (já inicializado em main.jsx). Estratégia anti-ruído (10k usuários):
//   - TODOS os vitals viram breadcrumb (contexto, sem custo de evento).
//   - Só vitals com rating "poor" geram um evento Sentry (alimenta o alerta de
//     performance — item 36). Assim não criamos 4 eventos/sessão × 10k.
// Robusto a versões: usa captureMessage/addBreadcrumb (API estável). No-op se o
// Sentry estiver desabilitado (sem VITE_SENTRY_DSN) — as chamadas Sentry no-opam.

import { onCLS, onINP, onLCP, onTTFB } from "web-vitals";
import * as Sentry from "@sentry/react";

function reportar(metric) {
  const poor = metric.rating === "poor";
  try {
    Sentry.addBreadcrumb({
      category: "web-vitals",
      level: poor ? "warning" : "info",
      message: metric.name,
      data: { value: Math.round(metric.value * 1000) / 1000, rating: metric.rating, id: metric.id },
    });
    if (poor) {
      Sentry.captureMessage(`web-vital poor: ${metric.name}`, {
        level: "warning",
        tags: { web_vital: metric.name, rating: metric.rating },
        extra: { value: metric.value, id: metric.id, navigationType: metric.navigationType },
      });
    }
  } catch { /* nunca quebrar o pipeline por causa de telemetria */ }
  if (import.meta?.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[web-vitals]", metric.name, Math.round(metric.value), metric.rating);
  }
}

/** Subscreve aos Core Web Vitals. Idempotente o suficiente para chamar 1x no boot. */
export function reportWebVitals() {
  try {
    onLCP(reportar);
    onINP(reportar);
    onCLS(reportar);
    onTTFB(reportar);
  } catch { /* lib indisponível → sem RUM, sem crash */ }
}
