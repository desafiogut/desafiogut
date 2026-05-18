// Coleta de eventos de engajamento — Mega Comando 8 / Item 1.
//
// Fire-and-forget: cada evento dispara um fetch() para /analytics e o caller
// NÃO espera resposta. Erros são silenciados (analytics não pode quebrar UX).
//
// visitorId vem do localStorage (`gut_visitor_id`) gravado pelo FingerprintJS
// no AppContext (Mega Comando 3 / Item 3). Eventos sem visitorId ainda são
// enviados com `null` — o servidor decide se descarta ou agrega como anônimo.
//
// O motor `_lib/ia-preditiva.mjs` consome os Blobs `analytics:{minuto}:{visitorId}`
// gravados pelo endpoint e decide se dispara um leilão relâmpago automático.

const ANALYTICS_ENDPOINT = "/.netlify/functions/analytics";
const LS_VISITOR_KEY     = "gut_visitor_id";

function lerVisitorId() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LS_VISITOR_KEY) || null;
  } catch { return null; }
}

function enviarEvento(evento, rota, payloadExtra) {
  // Fire-and-forget: sem await, sem throw. Mantém UX rápida.
  if (typeof fetch === "undefined") return;
  const body = JSON.stringify({
    evento,
    visitorId: lerVisitorId(),
    timestamp: Date.now(),
    rota: rota || (typeof window !== "undefined" ? window.location?.pathname : null),
    ...(payloadExtra || {}),
  });
  try {
    fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // sobrevive a navegação/unload
    }).catch(() => {}); // descarta promessa rejeitada
  } catch { /* engole erro síncrono raro (CSP, etc.) */ }
}

/** Pageview — disparar a cada mudança de rota. */
export function trackPageview(rota) {
  enviarEvento("pageview", rota);
}

/** Click no botão Comprar — indicador-chave para o motor IA preditiva. */
export function trackClickComprar(rota) {
  enviarEvento("click_botao_comprar", rota);
}

/** Tempo total de sessão em segundos — disparar no unload. */
export function trackTempoSessao(segundos, rota) {
  const n = Number(segundos);
  if (!Number.isFinite(n) || n < 0) return;
  enviarEvento("tempo_sessao", rota, { segundos: Math.floor(n) });
}

/** Profundidade máxima de scroll (0-100%). */
export function trackScroll(profundidade, rota) {
  const n = Number(profundidade);
  if (!Number.isFinite(n)) return;
  const clamped = Math.max(0, Math.min(100, Math.floor(n)));
  enviarEvento("scroll", rota, { profundidade: clamped });
}

export const analytics = { trackPageview, trackClickComprar, trackTempoSessao, trackScroll };
