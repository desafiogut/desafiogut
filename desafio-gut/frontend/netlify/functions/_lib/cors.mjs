// MC88.12 — CORS para o APK Android (Parte B do MC88.10).
//
// PORQUÊ: no site web o frontend e as functions são same-origin, por isso CORS
// nunca foi preciso. No APK a origem passa a ser `https://localhost` (Capacitor),
// logo toda a chamada é cross-origin. Depois do MC88.11 as chamadas já SAEM do
// telemóvel, mas o browser recusa a resposta por falta de cabeçalhos CORS
// (TypeError: Failed to fetch).
//
// ⚠️ Estas functions são Netlify Functions **v2**: `export default async (req) =>`
// recebendo uma `Request` e devolvendo uma `Response`. NÃO existe `event.httpMethod`
// nem retorno `{ statusCode, headers, body }` — isso é a API v1, que este projeto
// não usa em nenhuma das 47 functions.
//
// ⚠️ NUNCA `Access-Control-Allow-Origin: *`: estas functions movimentam dinheiro
// (PIX/Mercado Pago) e senhas. Uma origem única e explícita.

/**
 * Origem do APK. O Capacitor serve a app de `https://localhost` (androidScheme
 * https, o atual — ver [[desafiogut-mc885-oauth-applink]]: NÃO mexer nisso).
 * Se algum dia o androidScheme mudar, esta constante muda com ele.
 */
export const ORIGEM_APK = "https://localhost";

/**
 * Cabeçalhos CORS aplicados a TODAS as respostas das functions.
 *
 * Constante (não reflete a origem do pedido) de propósito: `jsonResponse()` não
 * recebe a `Request`, e mudar a assinatura obrigaria a tocar nos 41 call-sites.
 * Como só existe uma origem cross-origin legítima — a do APK — refletir não
 * traria nada. No site web, que é same-origin, estes cabeçalhos são simplesmente
 * ignorados pelo browser: zero impacto no comportamento atual.
 *
 * `authorization` em allow-headers é indispensável — as functions autenticam por
 * JWT do Privy (Bearer), e é esse cabeçalho que torna o preflight obrigatório.
 * Os `x-*` acompanham os sinais anti-fraude que o src/lib/api.js já envia.
 *
 * MC88.14 — `sentry-trace` e `baggage` NÃO estão em call-site nenhum: são injetados
 * pelo `browserTracingIntegration` do Sentry. O `main.jsx` importa o shim do MC88.11
 * primeiro, logo o Sentry (lazy, MC82.3) embrulha o SHIM — vê a URL ainda relativa,
 * conclui same-origin e propaga o tracing; só depois o shim a torna cross-origin, já
 * com dois cabeçalhos que este allow-headers não autorizava. Resultado: TODAS as
 * functions davam `TypeError: Failed to fetch` no APK, não só o PIX (MC88.13).
 * São cabeçalhos de tracing, sem valor de autenticação — não alargam a superfície.
 */
export const CABECALHOS_CORS = Object.freeze({
  "access-control-allow-origin": ORIGEM_APK,
  "access-control-allow-headers": "content-type, authorization, x-visitor-id, x-device-tracked, sentry-trace, baggage",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-max-age": "86400",
  // MC88.16 (P0) — cross-origin, o JS só LÊ os cabeçalhos safelisted
  // (cache-control, content-language, content-type, expires, last-modified,
  // pragma). Sem expor estes, `resp.headers.get("retry-after")` devolve null no
  // APK mesmo com o 429 já a passar o CORS — o backoff informado ficaria cego.
  // `etag` entra porque o jsonCacheavel faz validação condicional (If-None-Match).
  "access-control-expose-headers": "retry-after, x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset, etag",
  // MC88.16 (P4) — sem isto o PerformanceResourceTiming devolve ttfb=0 e
  // transferSize=0 para as functions dentro do APK, e qualquer regressão futura
  // de latência volta a ser invisível (foi o que obrigou o MC88.15 a
  // correlacionar curl + logs do servidor). Só expõe TIMINGS, não dados.
  "timing-allow-origin": ORIGEM_APK,
  // A resposta varia com a origem do pedido; sem isto o CDN pode servir a um
  // cliente os cabeçalhos calculados para outro.
  vary: "Origin",
});

/**
 * Responde ao preflight do browser. Devolve uma `Response` 204 quando o método é
 * OPTIONS; `null` caso contrário — nesse caso o handler segue o curso normal.
 *
 * Tem de ser a PRIMEIRA coisa do handler: o preflight não leva corpo nem
 * `Authorization`, portanto qualquer validação a montante (auth, parse do body,
 * rate-limit) responderia 4xx e o browser abortaria a chamada real.
 *
 *     export default async (req) => {
 *       const pre = respostaPreflight(req);
 *       if (pre) return pre;
 *       …
 */
export function respostaPreflight(req) {
  if (req?.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: CABECALHOS_CORS });
}
