// MC88.11 — no APK (Capacitor), as Netlify Functions não existem localmente.
//
// PORQUÊ: o Capacitor serve a app a partir de https://localhost, lendo do sistema
// de ficheiros do telemóvel. Um caminho relativo como "/.netlify/functions/x" é
// resolvido POR ELE, que aplica o fallback de SPA e devolve o index.html — com
// **status 200 e content-type text/html**. Medido no aparelho (MC88.10):
//
//     POST /.netlify/functions/iniciar-pagamento
//     → status 200 · ok: true · content-type: text/html · corpo: <!DOCTYPE html>…
//
// O 200 é o que torna isto traiçoeiro: `resp.ok` fica true, todo o tratamento de
// erro por ok/status passa incólume, e o JSON.parse do HTML falha em silêncio para
// o fallback. Daí os sintomas mudos: "R$ —", "IND-??????", "payload_invalido" e o
// modal PIX a abrir um passo 2 vazio, sem QR Code e sem mensagem de erro.
//
// PORQUÊ AQUI E NÃO EM CADA CALL-SITE: há 24 sítios com o literal
// "/.netlify/functions/…" espalhados por componentes, páginas e hooks (só 13 dos
// 27 passam pelo src/lib/api.js — ver MC39.22). Reescrever um a um seria um diff
// enorme com risco de escapar algum, e qualquer call-site novo voltaria a partir
// silenciosamente. Um único ponto de reescrita cobre todos, presentes e futuros.
//
// ESCOPO: só reescreve URLs que começam exatamente por "/.netlify/functions/".
// Tudo o resto (Privy, Sentry, Alchemy, Google, assets locais) passa intocado.
// Na web é um NO-OP absoluto: mantém-se o same-origin de sempre, sem CORS.
//
// ⚠️ ISTO SOZINHO NÃO FAZ O BACKEND RESPONDER. Falta a Parte B do MC88.10: CORS
// nas Netlify Functions a autorizar a origem https://localhost, com
// `Authorization` nos allow-headers (o preflight é obrigatório porque as functions
// autenticam por JWT do Privy). Até lá, a chamada SAI do telemóvel e é recusada
// pelo browser na resposta — o que já é um progresso diagnosticável: passa de
// "200 com HTML fingindo sucesso" para um erro de CORS visível.

const ORIGEM_PRODUCAO = "https://silly-stardust-ca71bc.netlify.app";
const PREFIXO = "/.netlify/functions/";

/** true apenas dentro do APK/IPA (Capacitor), false em qualquer browser. */
export function ehNativo() {
  return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
}

/** Origem a usar para as Netlify Functions: absoluta no nativo, vazia (same-origin) na web. */
export const API_ORIGIN = ehNativo() ? ORIGEM_PRODUCAO : "";

/** Absolutiza um caminho de function quando nativo; devolve-o intacto na web. */
export function apiUrl(caminho) {
  return typeof caminho === "string" && caminho.startsWith(PREFIXO)
    ? API_ORIGIN + caminho
    : caminho;
}

/**
 * Instala a reescrita no fetch global. Idempotente (marca a função instalada), e
 * no-op fora do Capacitor. Tem de correr ANTES do primeiro fetch da app — é por
 * isso que o main.jsx a importa no topo.
 */
export function instalarReescritaApi() {
  if (!ehNativo()) return false;
  if (typeof window.fetch !== "function" || window.fetch.__gutApiOrigin) return false;

  const fetchOriginal = window.fetch.bind(window);
  const reescrito = (entrada, init) => {
    // Só a forma string é reescrita — é a que os 24 call-sites usam. Request/URL
    // seguem intactos, para não alterar semântica de nada que já funcione.
    if (typeof entrada === "string" && entrada.startsWith(PREFIXO)) {
      return fetchOriginal(API_ORIGIN + entrada, init);
    }
    return fetchOriginal(entrada, init);
  };
  reescrito.__gutApiOrigin = true;
  window.fetch = reescrito;

  console.info("[GUT] MC88.11 — functions apontadas para", API_ORIGIN);
  return true;
}

// Auto-instala no import. É deliberado: em ESM os `import` são hoisted e avaliados
// antes de qualquer statement do módulo importador, portanto chamar a função a
// partir do main.jsx correria DEPOIS de toda a árvore de imports ser avaliada.
// Como side-effect do módulo, corre na ordem dos imports — e o main.jsx importa
// este ficheiro primeiro, logo o shim fica de pé antes de qualquer fetch.
instalarReescritaApi();
