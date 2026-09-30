// MC103 — flags de TRANSIÇÃO em _lib/recursos-app-config.mjs (preparação do MC111).
// Bidireccional por flag: (a) default = comportamento actual; (b) valor explícito inverte;
// (c) tipo errado/ausente → default. E o USO: o handler recursos-app.mjs real expõe as chaves,
// com as 2 flags antigas byte-idênticas ao que produção devolve hoje.
//
// node --test --experimental-test-module-mocks _tests/mc103-flags-transicao.test.mjs

import { test, mock } from "node:test";
import assert from "node:assert/strict";

const ctx = { config: null, falhar: false };
mock.module("../_lib/data-store.mjs", {
  namedExports: {
    getConfig: async () => { if (ctx.falhar) throw new Error("leitura falhou"); return ctx.config; },
  },
});

const { resolverRecursos, DEFAULT_FLAGS_TRANSICAO } = await import("../_lib/recursos-app-config.mjs");
const { default: handler } = await import("../recursos-app.mjs");

// Valor REAL de config_remota.recursos_app em produção (SELECT de 2026-09-30).
const PROD_CFG = {
  isLeilaoAtivo: { ios: false, pwa: true, android: false },
  isPagamentoNativoAtivo: { ios: false, pwa: false, android: false },
};
const ESPERADO_DEFAULT = {
  isProgramadaSenhasAtiva: true,
  isTorneioVisivel: true,
  isSenhaBonusAtiva: true,
  isCampanhaIndicacaoAtiva: false,
  limitePassesIndicacao: 5,
};
const PLATS = ["ios", "android", "pwa"];

test("(a) defaults literais do enunciado", () => {
  assert.deepEqual({ ...DEFAULT_FLAGS_TRANSICAO }, ESPERADO_DEFAULT);
});

test("(a) sem config, config vazia e config de produção → as 5 chaves com o default", () => {
  for (const cfg of [null, undefined, {}, "x", PROD_CFG]) {
    for (const p of PLATS) {
      const r = resolverRecursos(cfg, p);
      for (const [k, v] of Object.entries(ESPERADO_DEFAULT)) assert.equal(r[k], v, `${k} cfg=${JSON.stringify(cfg)} p=${p}`);
    }
  }
});

test("(a) flags antigas intactas: mesmos valores que antes do MC103", () => {
  const antes = { ios: [false, false], android: [false, false], pwa: [true, false] };
  for (const cfg of [null, PROD_CFG]) {
    for (const p of PLATS) {
      const r = resolverRecursos(cfg, p);
      assert.deepEqual([r.plataforma, r.isLeilaoAtivo, r.isPagamentoNativoAtivo], [p, ...antes[p]]);
    }
  }
});

test("(b) cada flag booleana, isolada, inverte quando o config a traz explícita", () => {
  for (const k of ["isProgramadaSenhasAtiva", "isTorneioVisivel", "isSenhaBonusAtiva", "isCampanhaIndicacaoAtiva"]) {
    const invertido = !ESPERADO_DEFAULT[k];
    const r = resolverRecursos({ ...PROD_CFG, [k]: invertido }, "pwa");
    assert.equal(r[k], invertido, k);
    // só essa muda
    for (const outra of Object.keys(ESPERADO_DEFAULT)) if (outra !== k) assert.equal(r[outra], ESPERADO_DEFAULT[outra], `${k}→${outra}`);
    // e as antigas não mexem
    assert.equal(r.isLeilaoAtivo, true);
    assert.equal(r.isPagamentoNativoAtivo, false);
  }
});

test("(b) limitePassesIndicacao explícito é respeitado (inclui 0)", () => {
  assert.equal(resolverRecursos({ limitePassesIndicacao: 7 }, "pwa").limitePassesIndicacao, 7);
  assert.equal(resolverRecursos({ limitePassesIndicacao: 0 }, "pwa").limitePassesIndicacao, 0);
});

test("(c) tipo errado → default, sem coerção", () => {
  for (const lixo of ["false", "true", 0, 1, null, {}, []]) {
    const r = resolverRecursos({ isProgramadaSenhasAtiva: lixo, isCampanhaIndicacaoAtiva: lixo }, "pwa");
    assert.equal(r.isProgramadaSenhasAtiva, true, `lixo=${JSON.stringify(lixo)}`);
    assert.equal(r.isCampanhaIndicacaoAtiva, false, `lixo=${JSON.stringify(lixo)}`);
  }
  for (const lixo of ["5", "7", -1, 2.5, NaN, Infinity, null, true]) {
    assert.equal(resolverRecursos({ limitePassesIndicacao: lixo }, "pwa").limitePassesIndicacao, 5, `lixo=${String(lixo)}`);
  }
});

test("(c) mapa por plataforma numa flag nova NÃO é lido (as novas são escalares) → default", () => {
  const r = resolverRecursos({ isTorneioVisivel: { ios: false, android: false, pwa: false }, limitePassesIndicacao: { pwa: 9 } }, "pwa");
  assert.equal(r.isTorneioVisivel, true);
  assert.equal(r.limitePassesIndicacao, 5);
});

test("(c) inteiro fora do intervalo seguro → default", () => {
  for (const lixo of [2 ** 60, 1e300, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(resolverRecursos({ limitePassesIndicacao: lixo }, "pwa").limitePassesIndicacao, 5, String(lixo));
  }
  assert.equal(resolverRecursos({ limitePassesIndicacao: Number.MAX_SAFE_INTEGER }, "pwa").limitePassesIndicacao, Number.MAX_SAFE_INTEGER);
});

test("(c) chave herdada pelo protótipo não conta como config (poluição de protótipo)", () => {
  const nomes = ["isCampanhaIndicacaoAtiva", "isProgramadaSenhasAtiva", "limitePassesIndicacao"];
  try {
    Object.prototype.isCampanhaIndicacaoAtiva = true;
    Object.prototype.isProgramadaSenhasAtiva = false;
    Object.prototype.limitePassesIndicacao = 999;
    for (const cfg of [null, {}, PROD_CFG]) {
      const r = resolverRecursos(cfg, "pwa");
      assert.equal(r.isCampanhaIndicacaoAtiva, false);
      assert.equal(r.isProgramadaSenhasAtiva, true);
      assert.equal(r.limitePassesIndicacao, 5);
    }
  } finally {
    for (const n of nomes) delete Object.prototype[n];
  }
});

// ── USO: o handler real ─────────────────────────────────────────────────────
async function get(p) {
  const res = await handler(new Request(`https://x.test/.netlify/functions/recursos-app?plataforma=${p}`));
  assert.equal(res.status, 200);
  return res.json();
}

test("USO: com o config de produção, o endpoint devolve as 2 chaves antigas iguais + as 5 novas no default", async () => {
  ctx.config = PROD_CFG; ctx.falhar = false;
  // o que produção devolvia ANTES do MC103 (curl de 2026-09-30)
  const ANTES = {
    ios: { plataforma: "ios", isLeilaoAtivo: false, isPagamentoNativoAtivo: false },
    android: { plataforma: "android", isLeilaoAtivo: false, isPagamentoNativoAtivo: false },
    pwa: { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false },
  };
  for (const p of PLATS) assert.deepEqual(await get(p), { ...ANTES[p], ...ESPERADO_DEFAULT });
});

test("USO: leitura do config falha → fail-soft com os defaults novos", async () => {
  ctx.falhar = true;
  const r = await get("android");
  for (const [k, v] of Object.entries(ESPERADO_DEFAULT)) assert.equal(r[k], v, k);
  ctx.falhar = false;
});

test("USO: flag gravada no config chega ao cliente pelo endpoint", async () => {
  ctx.config = { ...PROD_CFG, isCampanhaIndicacaoAtiva: true, limitePassesIndicacao: 3 };
  const r = await get("pwa");
  assert.equal(r.isCampanhaIndicacaoAtiva, true);
  assert.equal(r.limitePassesIndicacao, 3);
});
