// FingerprintJS open-source v4 — Mega Comando 3 / Item 3.
//
// Gera um visitorId determinístico a partir do navegador. Cacheia em
// localStorage (`gut_visitor_id`) para evitar recomputar a cada montagem do
// AppContext. visitorId NÃO é PII direta — é hash do fingerprint do dispositivo.
//
// Limitação conhecida: a versão open-source tem precisão ~60%. Suficiente para
// sinalizar farming (3+ addresses no mesmo visitorId em 24h), insuficiente
// para banimento definitivo — usar como passive monitoring, nunca como gate.

import FingerprintJS from "@fingerprintjs/fingerprintjs";

const LS_KEY = "gut_visitor_id";

let _agentPromise = null;

function loadAgent() {
  if (_agentPromise) return _agentPromise;
  _agentPromise = FingerprintJS.load({ monitoring: false });
  return _agentPromise;
}

/**
 * Retorna visitorId, do cache se possível; caso contrário consulta a SDK.
 * Falha silenciosamente — fingerprint é opcional, não pode quebrar a app.
 */
export async function getVisitorId() {
  try {
    if (typeof window === "undefined") return null;
    const cached = window.localStorage.getItem(LS_KEY);
    if (cached && /^[a-f0-9]{16,64}$/i.test(cached)) return cached;
    const agent  = await loadAgent();
    const result = await agent.get();
    const id     = result?.visitorId || null;
    if (id) {
      try { window.localStorage.setItem(LS_KEY, id); } catch {}
    }
    return id;
  } catch (err) {
    console.warn("[fingerprint] getVisitorId falhou:", err?.message);
    return null;
  }
}

/** Acesso síncrono ao cache. Útil para headers em fetch sem await. */
export function getCachedVisitorId() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LS_KEY);
  } catch { return null; }
}
