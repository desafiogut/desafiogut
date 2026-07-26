// MC88.16 (P0) — CORS em TODAS as respostas das functions, não só nas de JSON.
//
// PORQUÊ ESTE TESTE EXISTE: o MC88.12/88.14 puseram os cabeçalhos CORS dentro de
// `jsonResponse`/`jsonError`, o que cobriu 41 call-sites de uma vez — mas deixou de
// fora todo o caminho que constrói `new Response` cru. Dois ficaram partidos e
// ninguém notou durante quatro MCs:
//
//   • o 429 do rate-limiter  → no APK virava `TypeError: Failed to fetch`, logo a
//     app não via o 429 nem o `Retry-After` e não podia fazer backoff (MC88.15);
//   • o 200/304 do jsonCacheavel → GET /produtos?categoria=bronze devolvia 200 com
//     ETag e SEM allow-origin (medido em produção no MC88.16).
//
// O MC88.14 já tinha registado que "não existe nenhum teste que cubra o CORS". Este
// é esse teste. Falha se alguém acrescentar um caminho de resposta sem CORS.
//
// node --test --experimental-test-module-mocks _tests/mc8816-cors-todas-respostas.test.mjs

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { CABECALHOS_CORS, ORIGEM_APK, respostaPreflight } from "../_lib/cors.mjs";
import { jsonResponse, jsonError } from "../_lib/validate.mjs";
import { jsonCacheavel, computeETag } from "../_lib/http-cache.mjs";

/** Afirma o mínimo que o browser exige para NÃO descartar a resposta. */
function exigeCors(resp, rotulo) {
  assert.equal(
    resp.headers.get("access-control-allow-origin"), ORIGEM_APK,
    `${rotulo}: sem access-control-allow-origin → o APK descarta esta resposta`,
  );
  assert.equal(
    resp.headers.get("vary"), "Origin",
    `${rotulo}: sem Vary: Origin o CDN pode servir cabeçalhos calculados para outra origem`,
  );
}

test("jsonResponse (200) leva CORS", () => {
  exigeCors(jsonResponse({ ok: true }), "jsonResponse 200");
});

test("jsonError (4xx/5xx) leva CORS", () => {
  for (const status of [400, 402, 405, 500, 502]) {
    exigeCors(jsonError(status, "codigo", "mensagem"), `jsonError ${status}`);
  }
});

test("respostaPreflight (204 OPTIONS) leva CORS", () => {
  const resp = respostaPreflight(new Request("https://x/y", { method: "OPTIONS" }));
  assert.equal(resp.status, 204);
  exigeCors(resp, "preflight 204");
});

test("respostaPreflight devolve null quando não é OPTIONS", () => {
  assert.equal(respostaPreflight(new Request("https://x/y", { method: "POST" })), null);
});

test("jsonCacheavel: 200 e 304 levam CORS (regressão do MC88.16)", () => {
  const corpo = { categoria: "bronze", total: 0, produtos: [] };

  const r200 = jsonCacheavel(new Request("https://x/produtos?categoria=bronze"), corpo);
  assert.equal(r200.status, 200);
  exigeCors(r200, "jsonCacheavel 200");

  // Revalidação condicional: If-None-Match a bater no ETag → 304. Uma 304 sem
  // CORS é descartada como qualquer outra, logo também tem de os levar.
  const etag = computeETag(JSON.stringify(corpo));
  const r304 = jsonCacheavel(
    new Request("https://x/produtos?categoria=bronze", { headers: { "if-none-match": etag } }),
    corpo,
  );
  assert.equal(r304.status, 304);
  exigeCors(r304, "jsonCacheavel 304");
});

test("429 do rate-limiter leva CORS e expõe retry-after (regressão do MC88.15)", async () => {
  // Força o caminho do 429 sem tocar em Netlify Blobs: o rate-limiter usa Redis
  // quando `cacheConfigurado()` é true, e bloqueia quando o INCR devolve > limite.
  mock.module("../_lib/cache.mjs", {
    namedExports: {
      cacheConfigurado: () => true,
      cacheIncr: async () => 999,   // muito acima de qualquer limite
    },
  });
  const { aplicarRateLimit } = await import("../_lib/rate-limiter.mjs?mc8816");

  const req = new Request("https://x/y", {
    method: "POST",
    headers: { "x-nf-client-connection-ip": "203.0.113.7", origin: ORIGEM_APK },
  });
  const resp = await aplicarRateLimit(req, "confirmar-pagamento", 25);

  assert.ok(resp, "esperava uma Response 429, recebi null");
  assert.equal(resp.status, 429);
  exigeCors(resp, "429");

  // Sem expose-headers, `resp.headers.get("retry-after")` devolve null no APK
  // mesmo com o allow-origin presente — o backoff informado ficaria cego.
  const expostos = (resp.headers.get("access-control-expose-headers") || "").toLowerCase();
  assert.ok(expostos.includes("retry-after"),
    "429: retry-after tem de estar em access-control-expose-headers para o APK o poder ler");
  assert.ok(resp.headers.get("retry-after"), "429 sem retry-after");

  // O corpo também traz retry_after: é o caminho que não depende de expose-headers.
  const corpo = await resp.json();
  assert.equal(corpo.error.code, "rate_limit_excedido");
  assert.equal(typeof corpo.error.retry_after, "number");
});

test("CABECALHOS_CORS expõe o que o cliente precisa de ler e permite timing", () => {
  const expostos = CABECALHOS_CORS["access-control-expose-headers"].toLowerCase();
  for (const h of ["retry-after", "etag"]) {
    assert.ok(expostos.includes(h), `${h} devia estar em access-control-expose-headers`);
  }
  // MC88.16 (P4) — sem isto o PerformanceResourceTiming devolve ttfb=0 no APK.
  assert.equal(CABECALHOS_CORS["timing-allow-origin"], ORIGEM_APK);
  // Nunca `*`: estas functions movimentam dinheiro (PIX) e senhas.
  assert.notEqual(CABECALHOS_CORS["access-control-allow-origin"], "*");
});
