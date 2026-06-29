// MC39.19 — Onda 3: cache.mjs (env-gated no-op) + http-cache.mjs (ETag/304).
// node --test _tests/mc3919-cache.test.mjs
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const SAVED = { ...process.env };
beforeEach(() => { delete process.env.REDIS_URL; delete process.env.REDIS_TOKEN; });
afterEach(() => { process.env = { ...SAVED }; });

test("cache no-op sem REDIS_* → get=null, incr=null, cacheConfigurado=false", async () => {
  const cache = await import("../_lib/cache.mjs");
  assert.equal(cache.cacheConfigurado(), false);
  assert.equal(await cache.cacheGet("k"), null);
  assert.equal(await cache.cacheIncr("k", 60), null);
  await cache.cacheSet("k", { a: 1 }, 60); // não lança
  await cache.cacheDel("k");               // não lança
});

test("cacheAside sem cache → executa fetchFn (zero regressão)", async () => {
  const cache = await import("../_lib/cache.mjs");
  let chamou = 0;
  const valor = await cache.cacheAside("k", 60, async () => { chamou++; return { v: 42 }; });
  assert.equal(chamou, 1);
  assert.deepEqual(valor, { v: 42 });
});

test("computeETag é determinístico e sensível ao conteúdo", async () => {
  const { computeETag } = await import("../_lib/http-cache.mjs");
  const a = computeETag({ x: 1 });
  const b = computeETag({ x: 1 });
  const c = computeETag({ x: 2 });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^".+"$/);
});

test("jsonCacheavel: 200 com ETag/Cache-Control; 304 quando If-None-Match bate", async () => {
  const { jsonCacheavel, computeETag } = await import("../_lib/http-cache.mjs");
  const body = { ok: true, itens: [1, 2, 3] };
  const reqSem = new Request("https://x/produtos");
  const r200 = jsonCacheavel(reqSem, body, { maxAge: 30, swr: 120 });
  assert.equal(r200.status, 200);
  const etag = r200.headers.get("etag");
  assert.equal(etag, computeETag(JSON.stringify(body)));
  assert.match(r200.headers.get("cache-control"), /max-age=30.*stale-while-revalidate=120/);

  const reqMatch = new Request("https://x/produtos", { headers: { "if-none-match": etag } });
  const r304 = jsonCacheavel(reqMatch, body, { maxAge: 30, swr: 120 });
  assert.equal(r304.status, 304);
});
