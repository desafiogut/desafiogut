// MC82.3 — Sentry carregado SOB DEMANDA, fora do caminho crítico de arranque.
//
// PORQUÊ: depois do MC82.2 o chunk `sentry` (257,8 KB) passou a ser o MAIOR item
// do arranque (617 KB no gate LGPD). O gate não precisa de telemetria — precisa
// de aparecer depressa.
//
// COMO: o SDK é importado dinamicamente e inicializado quando a aplicação monta
// (pós-consentimento). Até lá, tudo o que seria enviado fica numa FILA em
// memória, drenada assim que o Sentry sobe. Assim um erro que aconteça durante
// o gate não se perde — desde que o utilizador chegue a aceitar (ver TRADE-OFF).
//
// ⚠️ TRADE-OFF ACEITE E DOCUMENTADO: se o utilizador abandonar no gate LGPD sem
// aceitar, os eventos em fila NÃO chegam ao Sentry. Antes do MC82.3 chegariam,
// porque o SDK era inicializado no boot. Trocou-se cobertura de uma janela curta
// (o tempo do gate, sem app montada) por −257,8 KB no arranque. Os listeners
// globais de error/unhandledrejection/CSP do main.jsx continuam a registar tudo
// no console com a tag [GUT-DEBUG], portanto o diagnóstico manual não se perde.

let sentryMod = null;          // módulo @sentry/react depois de carregado
let estado = "ocioso";         // ocioso | a-carregar | pronto | falhou
let promessa = null;
const fila = [];               // eventos anteriores ao carregamento
const LIMITE_FILA = 50;        // guarda-chuva contra crescimento sem limite

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// beforeSend strippa qualquer payload contendo "argon2id_" como defesa em
// profundidade contra vazar hash de prova de intenção do lance. (Movido do
// main.jsx sem alteração de lógica.)
const ARGON2ID_RE = /argon2id_/i;
const scrubArgon2id = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "string" && ARGON2ID_RE.test(v)) obj[k] = "[REDACTED:argon2id]";
    else if (v && typeof v === "object") scrubArgon2id(v);
  }
};

// MC17.3.1.1 — heurística leve para correlacionar crashes de cold-start com o
// link de entrada. Não lê credenciais: só verifica a EXISTÊNCIA de uma chave.
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

function enfileirar(tipo, args) {
  if (fila.length >= LIMITE_FILA) return;
  fila.push({ tipo, args, em: Date.now() });
}

function drenar() {
  if (!sentryMod) return;
  while (fila.length) {
    const { tipo, args } = fila.shift();
    try { sentryMod[tipo]?.(...args); } catch { /* telemetria nunca quebra a app */ }
  }
}

/**
 * Carrega e inicializa o Sentry. Idempotente: chamadas repetidas devolvem a
 * mesma promessa. Seguro de chamar sem DSN (fica desabilitado, como antes).
 */
export function carregarSentry() {
  if (promessa) return promessa;
  estado = "a-carregar";
  promessa = import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        enabled: Boolean(SENTRY_DSN),
        environment: import.meta.env.MODE,
        integrations: [
          Sentry.browserTracingIntegration(),
          // MC82.4 (R4) — Session Replay MASCARADO e só-em-erro.
          //
          // A configuração anterior era `maskAllText: false, blockAllMedia: false`,
          // ou seja DESATIVAVA proteções que o SDK traz LIGADAS por omissão
          // (verificado em @sentry-internal/replay: maskAllText, maskAllInputs e
          // blockAllMedia têm default `true`). Com replaysSessionSampleRate 0.1,
          // 10% das sessões gravavam o texto do ecrã em claro — num app com
          // saldos, valores de lance, códigos de indicação e dados de carteira.
          //
          // Os três flags ficam EXPLÍCITOS (e não apenas herdados do default)
          // para que uma futura alteração tenha de os negar de propósito.
          Sentry.replayIntegration({
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
          }),
        ],
        tracesSampleRate: 0.1,
        // Nenhuma sessão normal é ENVIADA; só as que contêm erro (abaixo).
        //
        // ⚠️ NÃO confundir com desligar o Replay: com onErrorSampleRate > 0 o
        // SDK entra em "buffer mode" e o rrweb CONTINUA a gravar mutações do DOM
        // em memória, para poder enviar os segundos que antecederam o erro. O
        // custo de main thread (o `processMutation` que aparecia no perfil de
        // CPU do MC82) MANTÉM-SE. Este MC resolve PRIVACIDADE (R4), não
        // performance. Quem quiser eliminar o custo tem de remover a integração.
        replaysSessionSampleRate: 0,
        // 100% dos erros geram replay — é para isto que o Replay fica cá.
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

      // MC17.3.1.1 — enriquece os erros com a URL e o contexto de referral.
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

      sentryMod = Sentry;
      estado = "pronto";
      drenar();
      return Sentry;
    })
    .catch((err) => {
      estado = "falhou";
      console.warn("[GUT] Sentry não carregou — app segue sem telemetria", err?.message);
      return null;
    });
  return promessa;
}

export function sentryPronto() { return estado === "pronto"; }
export function sentryEstado() { return { estado, naFila: fila.length }; }

// ── API usada pelo resto da app ────────────────────────────────────────────
// Mesma assinatura do SDK. Antes de o Sentry subir, enfileira; depois, delega.
export function captureException(...args) {
  if (sentryMod) { try { return sentryMod.captureException(...args); } catch { return; } }
  enfileirar("captureException", args);
}
export function captureMessage(...args) {
  if (sentryMod) { try { return sentryMod.captureMessage(...args); } catch { return; } }
  enfileirar("captureMessage", args);
}
export function addBreadcrumb(...args) {
  if (sentryMod) { try { return sentryMod.addBreadcrumb(...args); } catch { return; } }
  enfileirar("addBreadcrumb", args);
}
