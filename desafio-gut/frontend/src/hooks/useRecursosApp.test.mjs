// MC104.1 — as 5 flags de transição do MC103 no CLIENTE (useRecursosApp).
// Hook REAL carregado pelo Vite (imports sem extensão) com só o supabaseClient em duplo (_recursos-arnes).
// (a) default = comportamento actual · (b) explícito → muda · (c) tipo errado → default ·
// paridade com o backend (HARD GATE 14) · os 3 caminhos do hook (USO).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { carregarModulo, correr, fecharArnes } from "./__tests__/_recursos-arnes.mjs";
import * as backend from "../../netlify/functions/_lib/recursos-app-config.mjs";

after(fecharArnes);
const hook = await carregarModulo("/src/hooks/useRecursosApp.js");
const { resolverParaPlataforma, DEFAULT_FLAGS_TRANSICAO } = hook;

const ESPERADO = { isProgramadaSenhasAtiva: true, isTorneioVisivel: true, isSenhaBonusAtiva: true, isCampanhaIndicacaoAtiva: false, limitePassesIndicacao: 5 };
const PROD = { isLeilaoAtivo: { ios: false, pwa: true, android: false }, isPagamentoNativoAtivo: { ios: false, pwa: false, android: false } };
const novas = (r) => Object.fromEntries(Object.keys(ESPERADO).map((k) => [k, r[k]]));
const PLATS = ["ios", "android", "pwa"];

test("(a) defaults literais = enunciado = backend (MC103)", () => {
  assert.deepEqual({ ...DEFAULT_FLAGS_TRANSICAO }, ESPERADO);
  assert.deepEqual({ ...DEFAULT_FLAGS_TRANSICAO }, { ...backend.DEFAULT_FLAGS_TRANSICAO });
});

test("(a) sem as chaves (null, {}, string, produção) → as 5 no default; antigas iguais ao antes", () => {
  const antes = { ios: [false, false], android: [false, false], pwa: [true, false] };
  for (const cfg of [null, undefined, {}, "x", PROD]) for (const p of PLATS) {
    const r = resolverParaPlataforma(cfg, p);
    assert.deepEqual(novas(r), ESPERADO, `cfg=${JSON.stringify(cfg)} p=${p}`);
    if (cfg === PROD || cfg == null) assert.deepEqual([r.isLeilaoAtivo, r.isPagamentoNativoAtivo], antes[p]);
  }
});

test("(b) casos do enunciado: explícito muda, lixo → default", () => {
  const r = (extra) => resolverParaPlataforma({ ...PROD, ...extra }, "pwa");
  assert.equal(r({ isTorneioVisivel: false }).isTorneioVisivel, false);
  assert.equal(r({ limitePassesIndicacao: 999 }).limitePassesIndicacao, 999);
  assert.equal(r({ limitePassesIndicacao: 0 }).limitePassesIndicacao, 0);
  assert.equal(r({ limitePassesIndicacao: -1 }).limitePassesIndicacao, 5);
  assert.equal(r({ limitePassesIndicacao: 2 ** 60 }).limitePassesIndicacao, 5);
  assert.equal(r({ limitePassesIndicacao: "7" }).limitePassesIndicacao, 5);
  assert.equal(r({ isCampanhaIndicacaoAtiva: "true" }).isCampanhaIndicacaoAtiva, false);
  assert.equal(r({ isProgramadaSenhasAtiva: 0 }).isProgramadaSenhasAtiva, true);
  assert.equal(r({ isTorneioVisivel: { pwa: false } }).isTorneioVisivel, true, "mapa por plataforma não é lido (escalares)");
});

test("(b) cada flag booleana, isolada, inverte — e só ela muda", () => {
  for (const k of ["isProgramadaSenhasAtiva", "isTorneioVisivel", "isSenhaBonusAtiva", "isCampanhaIndicacaoAtiva"]) {
    const r = resolverParaPlataforma({ ...PROD, [k]: !ESPERADO[k] }, "pwa");
    assert.deepEqual(novas(r), { ...ESPERADO, [k]: !ESPERADO[k] }, k);
    assert.equal(r.isLeilaoAtivo, true);
  }
});

test("(c) poluição de protótipo não conta (Object.hasOwn)", () => {
  const nomes = ["isTorneioVisivel", "isCampanhaIndicacaoAtiva", "limitePassesIndicacao"];
  try {
    Object.prototype.isTorneioVisivel = false;
    Object.prototype.isCampanhaIndicacaoAtiva = true;
    Object.prototype.limitePassesIndicacao = 999;
    for (const cfg of [null, {}, PROD]) assert.deepEqual(novas(resolverParaPlataforma(cfg, "pwa")), ESPERADO);
  } finally { for (const n of nomes) delete Object.prototype[n]; }
});

test("HARD GATE 14: a regra do cliente é IDÊNTICA à do backend, input a input", () => {
  const valores = [true, false, "true", "false", 0, 1, -1, 5, 999, 2.5, 2 ** 53 - 1, 2 ** 60, NaN, Infinity, null, undefined, {}, [], { pwa: false }];
  const chaves = Object.keys(ESPERADO);
  let n = 0;
  for (const k of chaves) for (const v of valores) for (const p of PLATS) {
    const cfg = { ...PROD, [k]: v };
    assert.deepEqual(novas(resolverParaPlataforma(cfg, p)), novas(backend.resolverRecursos(cfg, p)), `${k}=${String(v)} ${p}`);
    n++;
  }
  for (const cfg of [null, undefined, "x", 7, []]) assert.deepEqual(novas(resolverParaPlataforma(cfg, "pwa")), novas(backend.resolverRecursos(cfg, "pwa")));
  assert.ok(n >= 285, "controlo: a comparação correu");
});

// ── USO: os 3 caminhos do hook ───────────────────────────────────────────────────────────────────
test("USO Supabase directo: flags gravadas no config_remota chegam ao cliente; antigas iguais", async () => {
  const r = await correr(hook, { via: "supabase", valor: { ...PROD, isTorneioVisivel: false, limitePassesIndicacao: 3 } }, "android");
  assert.deepEqual(r, { plataforma: "android", isLeilaoAtivo: false, isPagamentoNativoAtivo: false, ...ESPERADO, isTorneioVisivel: false, limitePassesIndicacao: 3 });
});

test("USO Supabase com o valor de produção (sem as chaves) → defaults", async () => {
  const r = await correr(hook, { via: "supabase", valor: PROD }, "pwa");
  assert.deepEqual(r, { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false, ...ESPERADO });
});

test("USO função /recursos-app: as chaves que o servidor manda chegam; lixo → default", async () => {
  const ok = await correr(hook, { via: "funcao", corpo: { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false, ...ESPERADO, isCampanhaIndicacaoAtiva: true } }, "pwa");
  assert.equal(ok.isCampanhaIndicacaoAtiva, true);
  const lixo = await correr(hook, { via: "funcao", corpo: { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false, isCampanhaIndicacaoAtiva: "sim", limitePassesIndicacao: -3 } }, "pwa");
  assert.deepEqual(novas(lixo), ESPERADO);
  const antiga = await correr(hook, { via: "funcao", corpo: { plataforma: "ios", isLeilaoAtivo: false, isPagamentoNativoAtivo: false } }, "ios");
  assert.deepEqual(antiga, { plataforma: "ios", isLeilaoAtivo: false, isPagamentoNativoAtivo: false, ...ESPERADO }, "função sem as chaves (pré-MC103)");
});

test("USO Supabase falha → função; tudo falha → fallback local com os defaults", async () => {
  const viaFuncao = await correr(hook, { via: "supabase-erro", corpo: { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false, limitePassesIndicacao: 8 } }, "pwa");
  assert.equal(viaFuncao.limitePassesIndicacao, 8);
  const local = await correr(hook, { via: "local" }, "android");
  assert.deepEqual(local, { plataforma: "android", isLeilaoAtivo: false, isPagamentoNativoAtivo: false, ...ESPERADO });
});

test("estado inicial (antes do load) já traz as 5 flags no default", () => {
  const src = readFileSync(new URL("./useRecursosApp.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(src, /useState\(\{[^}]*plataforma:\s*"pwa",\s*\.\.\.DEFAULT_FLAGS_TRANSICAO,\s*isLoading:\s*true/);
});
