// UTAC153 (DEBT-117) — CORS para o iOS: `capacitor://localhost` e `ionic://localhost`.
//
// `Access-Control-Allow-Origin` aceita UM valor. A origem do pedido é registada por `respostaPreflight(req)`
// (1.ª linha das functions do app) num AsyncLocalStorage e REFLECTIDA quando está na lista fechada;
// qualquer outra origem (ou nenhuma) recebe `https://localhost`, o valor de sempre (Android intacto).
//
// node --test --experimental-test-module-mocks _tests/utac153-cors-ios.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CABECALHOS_CORS, ORIGEM_APK, ORIGENS_NATIVAS_PERMITIDAS, origemCorsPermitida, cabecalhosCors, respostaPreflight,
} from "../_lib/cors.mjs";
import { jsonResponse, jsonError } from "../_lib/validate.mjs";
import { jsonCacheavel } from "../_lib/http-cache.mjs";

const FUNCS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IOS = "capacitor://localhost";
const IONIC = "ionic://localhost";
const pedido = (origem, method = "OPTIONS") =>
  new Request("https://silly-stardust-ca71bc.netlify.app/.netlify/functions/x", {
    method, headers: origem ? { origin: origem } : {},
  });

/** Corre `fn` num contexto assíncrono próprio, para que o registo da origem não passe a outro teste. */
const isolado = (fn) => new Promise((ok, falha) => setImmediate(() => Promise.resolve().then(fn).then(ok, falha)));

// ── lista fechada ────────────────────────────────────────────────────────────────────────────────
test("UTAC153 · lista fechada = Android + as duas do iOS; nunca «*»", () => {
  assert.deepEqual([...ORIGENS_NATIVAS_PERMITIDAS], ["https://localhost", IOS, IONIC]);
  assert.ok(Object.isFrozen(ORIGENS_NATIVAS_PERMITIDAS));
  assert.equal(ORIGEM_APK, "https://localhost", "a origem do Android não muda");
  assert.equal(CABECALHOS_CORS["access-control-allow-origin"], "https://localhost", "o valor por omissão não muda");
});

test("UTAC153 · origemCorsPermitida: comparação EXACTA; tudo o resto cai em https://localhost", () => {
  for (const o of [IOS, IONIC, "https://localhost"]) assert.equal(origemCorsPermitida(o), o);
  for (const o of [
    "*", "null", "", null, undefined, 42, "https://evil.example", "capacitor://localhost.evil.com",
    "capacitor://LOCALHOST", "capacitor://localhost:8080", " capacitor://localhost", "capacitor://evil",
    "http://localhost", "https://silly-stardust-ca71bc.netlify.app",
  ]) {
    assert.equal(origemCorsPermitida(o), "https://localhost", `«${String(o)}» não pode ser reflectida`);
  }
});

test("UTAC153 · cabecalhosCors(origem) troca só allow-origin e timing-allow-origin", () => {
  const h = cabecalhosCors(IOS);
  assert.equal(h["access-control-allow-origin"], IOS);
  assert.equal(h["timing-allow-origin"], IOS);
  for (const k of Object.keys(CABECALHOS_CORS)) {
    if (k === "access-control-allow-origin" || k === "timing-allow-origin") continue;
    assert.equal(h[k], CABECALHOS_CORS[k], `o cabeçalho ${k} mudou`);
  }
  assert.equal(h.vary, "Origin", "sem Vary: Origin o CDN serviria ao iOS a resposta cacheada do Android");
  assert.equal(cabecalhosCors("https://evil.example"), CABECALHOS_CORS);
});

// ── preflight (Frente B) ─────────────────────────────────────────────────────────────────────────
for (const origem of [IOS, IONIC]) {
  test(`UTAC153 · preflight OPTIONS de ${origem} ⇒ 204 com Access-Control-Allow-Origin: ${origem}`, () => isolado(() => {
    const r = respostaPreflight(pedido(origem));
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("access-control-allow-origin"), origem);
    assert.equal(r.headers.get("timing-allow-origin"), origem);
    assert.equal(r.headers.get("vary"), "Origin");
    assert.match(r.headers.get("access-control-allow-headers"), /authorization/);
    assert.match(r.headers.get("access-control-allow-methods"), /OPTIONS/);
  }));
}

test("UTAC153 · preflight do Android continua https://localhost (sem regressão)", () => isolado(() => {
  const r = respostaPreflight(pedido("https://localhost"));
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), "https://localhost");
}));

test("UTAC153 · preflight de origem estranha ou sem origem ⇒ https://localhost (o browser recusa a estranha)", () => isolado(() => {
  for (const o of ["https://evil.example", "capacitor://evil", null]) {
    const r = respostaPreflight(pedido(o));
    assert.equal(r.headers.get("access-control-allow-origin"), "https://localhost", String(o));
  }
}));

// ── o pedido REAL (não só o preflight) leva a origem ─────────────────────────────────────────────
test("UTAC153 · depois do preflight, jsonResponse/jsonError do MESMO pedido levam a origem do iOS", () => isolado(async () => {
  assert.equal(respostaPreflight(pedido(IOS, "POST")), null, "POST segue o curso normal");
  await new Promise((r) => setTimeout(r, 5)); // a origem sobrevive a awaits (I/O do handler)
  assert.equal(jsonResponse({ ok: true }).headers.get("access-control-allow-origin"), IOS);
  assert.equal(jsonError(401, "sem_sessao", "x").headers.get("access-control-allow-origin"), IOS);
}));

test("UTAC153 · jsonCacheavel usa a origem do próprio req (200 e 304)", () => isolado(() => {
  const r200 = jsonCacheavel(pedido(IOS, "GET"), { a: 1 });
  assert.equal(r200.headers.get("access-control-allow-origin"), IOS);
  const etag = r200.headers.get("etag");
  const r304 = jsonCacheavel(new Request("https://x/y", { headers: { origin: IOS, "if-none-match": etag } }), { a: 1 });
  assert.equal(r304.status, 304);
  assert.equal(r304.headers.get("access-control-allow-origin"), IOS);
  assert.equal(jsonCacheavel(pedido("https://evil.example", "GET"), { a: 1 }).headers.get("access-control-allow-origin"), "https://localhost");
}));

test("UTAC153 · pedidos CONCORRENTES de origens diferentes não se misturam (contexto por pedido)", async () => {
  const handler = async (req, espera) => {
    const pre = respostaPreflight(req); if (pre) return pre;
    await new Promise((r) => setTimeout(r, espera));
    return jsonResponse({ ok: true });
  };
  const rs = await Promise.all([
    handler(pedido(IOS, "GET"), 30), handler(pedido("https://localhost", "GET"), 5),
    handler(pedido(IONIC, "GET"), 15), handler(pedido("https://evil.example", "GET"), 1),
    handler(pedido(null, "GET"), 20),
  ]);
  assert.deepEqual(rs.map((r) => r.headers.get("access-control-allow-origin")),
    [IOS, "https://localhost", IONIC, "https://localhost", "https://localhost"]);
});

// ── as functions REAIS do app ────────────────────────────────────────────────────────────────────
const ficheirosApp = readdirSync(FUNCS)
  .filter((f) => f.endsWith(".mjs") && readFileSync(resolve(FUNCS, f), "utf8").includes("respostaPreflight("));

test(`UTAC153 · as ${ficheirosApp.length} functions do app respondem ao preflight do iOS com 204 + a origem certa`, async () => {
  assert.ok(ficheirosApp.length >= 85, `esperava pelo menos 85 functions com respostaPreflight; medidas ${ficheirosApp.length}`);
  const falhas = [];
  for (const f of ficheirosApp) {
    try {
      const h = (await import(pathToFileURL(resolve(FUNCS, f)).href)).default;
      const ios = await h(pedido(IOS), {});
      const mau = await h(pedido("https://evil.example"), {});
      if (ios?.status !== 204 || ios.headers.get("access-control-allow-origin") !== IOS) falhas.push(`${f}: iOS ${ios?.status}/${ios?.headers.get("access-control-allow-origin")}`);
      if (mau?.headers.get("access-control-allow-origin") !== "https://localhost") falhas.push(`${f}: origem estranha reflectida`);
    } catch (e) {
      falhas.push(`${f}: ${e?.constructor?.name} ${String(e?.message).slice(0, 80)}`);
    }
  }
  assert.deepEqual(falhas, []);
});
