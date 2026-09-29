// MC102.1a — contrato do adaptador de rastreio + mock (Frente A).
// node --test _tests/rastreio.test.mjs   (a partir de netlify/functions)
//
// Bidireccional: o mock injectado dá eventos; sem adaptador (produção de hoje) dá fallback; e o mock não
// é importado por nenhum ficheiro de produção (HARD GATE 13).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { consultarRastreio, ADAPTADOR_REAL } from "../_lib/rastreio.mjs";
import { adaptadorMock, EVENTOS_MOCK } from "../_lib/rastreio-mock.mjs";

const CODIGO = "AA123456789BR";

test("mock injectado → ok:true com os eventos, só com os 4 campos do contrato", async () => {
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: adaptadorMock });
  assert.equal(r.ok, true);
  assert.equal(r.eventos.length, EVENTOS_MOCK.length);
  for (const e of r.eventos) assert.deepEqual(Object.keys(e).sort(), ["codigo", "data", "descricao", "local"]);
  assert.deepEqual(r.eventos.map((e) => e.codigo), ["0", "1", "2", "3", "A1", "4"]);
  assert.equal(r.fallback, undefined);
});

test("produção de hoje (sem adaptador real) → ok:false adaptador_indisponivel + fallback só com o código", async () => {
  assert.equal(ADAPTADOR_REAL, null, "o adaptador real é do MC102.1b");
  const r = await consultarRastreio(CODIGO, "Correios");
  assert.deepEqual(r, { ok: false, code: "adaptador_indisponivel", fallback: { codigo: CODIGO } });
});

test("o fallback nunca traz URL (P9)", async () => {
  const falha = { async consultar() { throw new Error("rede"); } };
  for (const r of [await consultarRastreio(CODIGO, "Correios"), await consultarRastreio(CODIGO, "Correios", { adaptador: falha })]) {
    assert.doesNotMatch(JSON.stringify(r), /https?:|www\./i);
  }
});

test("adaptador que rebenta → ok:false falha_adaptador + fallback (não propaga a excepção)", async () => {
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: { async consultar() { throw new Error("timeout"); } } });
  assert.deepEqual(r, { ok: false, code: "falha_adaptador", fallback: { codigo: CODIGO } });
});

test("adaptador com resposta sem array de eventos → ok:false resposta_invalida", async () => {
  for (const resp of [null, {}, { eventos: "x" }]) {
    const r = await consultarRastreio(CODIGO, "Correios", { adaptador: { async consultar() { return resp; } } });
    assert.deepEqual(r, { ok: false, code: "resposta_invalida", fallback: { codigo: CODIGO } });
  }
});

test("campos a mais da transportadora (nome, CPF, morada) não passam (P8)", async () => {
  const vaza = { async consultar() {
    return { eventos: [{ data: "2026-09-20", codigo: "0", local: "Manaus/AM", descricao: "Postado",
      destinatario: "Maria Silva", cpf: "12345678909", endereco: "Rua A, 1" }] };
  } };
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: vaza });
  assert.equal(r.ok, true);
  assert.doesNotMatch(JSON.stringify(r), /Maria Silva|12345678909|Rua A/);
});

test("campos só como texto: objectos aninhados caem para null; números viram texto (P8, validador)", async () => {
  const aninha = { async consultar() {
    return { eventos: [{ data: { cpf: "12345678909" }, codigo: 4, local: { logradouro: "Rua A, 1", destinatario: "Maria Silva" },
      descricao: ["Maria Silva"] }, { data: 1758369600000, codigo: "0", local: "Manaus/AM", descricao: "Postado" }] };
  } };
  const r = await consultarRastreio(12345, "Correios", { adaptador: aninha });
  assert.deepEqual(r.eventos, [
    { data: null, codigo: "4", local: null, descricao: null },
    { data: "1758369600000", codigo: "0", local: "Manaus/AM", descricao: "Postado" },
  ]);
  assert.deepEqual(await consultarRastreio(12345, "Correios"), { ok: false, code: "adaptador_indisponivel", fallback: { codigo: "12345" } });
});

test("qualquer tipo de erro do adaptador fica no fallback (TypeError, rejeição sem Error)", async () => {
  for (const adaptador of [{ async consultar() { return null.eventos; } }, { consultar() { return Promise.reject("x"); } }, {}]) {
    const r = await consultarRastreio(CODIGO, "Correios", { adaptador });
    assert.equal(r.ok, false);
    assert.deepEqual(r.fallback, { codigo: CODIGO });
  }
});

// ── HARD GATE 13: o mock não entra em produção ────────────────────────────────────────────────
const FUNCOES = join(dirname(fileURLToPath(import.meta.url)), "..");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
function ficheirosDeProducao(d = FUNCOES, out = []) {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === "_tests") continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) ficheirosDeProducao(p, out);
    else if (/\.(m?[jt]sx?|c[jt]s)$/.test(e) && e !== "rastreio-mock.mjs") out.push(p);
  }
  return out;
}

test("nenhum ficheiro de produção em netlify/functions importa o rastreio-mock (HARD GATE 13)", () => {
  const ficheiros = ficheirosDeProducao();
  // Controlo positivo: a varredura vê mesmo os ficheiros (um glob vazio passaria sempre).
  assert.ok(ficheiros.length > 50, `só ${ficheiros.length} ficheiros vistos`);
  assert.ok(ficheiros.some((p) => p.endsWith(join("_lib", "rastreio.mjs"))), "a varredura tem de ver _lib/rastreio.mjs");
  const culpados = ficheiros.filter((p) => /rastreio-mock/.test(semComentarios(readFileSync(p, "utf8"))));
  assert.deepEqual(culpados.map((p) => relative(FUNCOES, p)), []);
});

// A varredura acima é TEXTUAL: `export … from "./rastreio-mock.mjs"` escapava-lhe e o mock entrava no bundle
// (medido pelo validador). Esta segue o grafo REAL, como o bundler da Netlify o segue: o esbuild resolve os imports
// de todas as functions (+ _lib/rastreio.mjs, que ainda nenhuma importa) e nenhum input pode ser o mock.
test("o grafo de imports de TODAS as functions (esbuild) não contém o rastreio-mock (HARD GATE 13)", async () => {
  const { build } = await import("esbuild");
  const grafo = (entryPoints, stdin) => build({
    ...(stdin ? { stdin: { contents: stdin, resolveDir: join(FUNCOES, "_lib"), loader: "js" } } : { entryPoints }),
    bundle: true, write: false, metafile: true, platform: "node", format: "esm", packages: "external", logLevel: "silent",
    outdir: join(FUNCOES, "_nao_escrito"),
  }).then((r) => Object.keys(r.metafile.inputs));
  // Controlo positivo: o detector vê o mock quando ele é importado — também pela forma com escape.
  const escapado = await grafo(null, 'export { adaptadorMock } from "./rastreio\\u002dmock.mjs";');
  assert.ok(escapado.some((i) => i.endsWith("rastreio-mock.mjs")), "o controlo positivo tem de ver o mock");
  const entradas = readdirSync(FUNCOES).filter((e) => /\.(m?[jt]s|c[jt]s)$/.test(e)).map((e) => join(FUNCOES, e));
  assert.ok(entradas.length > 50, `só ${entradas.length} functions`);
  const inputs = await grafo([...entradas, join(FUNCOES, "_lib", "rastreio.mjs")]);
  assert.ok(inputs.some((i) => i.endsWith(join("_lib", "rastreio.mjs").replaceAll("\\", "/")) || i.endsWith("_lib/rastreio.mjs")),
    "o grafo tem de incluir _lib/rastreio.mjs");
  assert.deepEqual(inputs.filter((i) => /rastreio-mock/.test(i)), []);
});
