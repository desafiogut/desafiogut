// UTAC107g.3 (DEBT-021) — `?rc=1` passa de substring a match exato.
// Bidirecional (GATE 8): cada URL de ataque ABRIA com o predicado antigo e
// deixa de abrir com o novo; `?rc=1` abre nos dois (comportamento preservado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { temAcessoDiretoCadastro } from "./acessoDiretoCadastro.js";

const antigo = (search) => search.includes("rc=1"); // App.jsx:148 até ceb5ab8

const ATAQUES = ["?src=1", "?arc=10", "?rc=10", "?xrc=1", "?foo=1&src=1", "?rc=1x", "?arc=1"];
const LEGITIMOS = ["?rc=1", "?foo=bar&rc=1", "?rc=1&utm=x", "?rc=%31"];
const FECHADOS = ["", "?", "?rc=", "?rc=0", "?rc=2", "?RC=1", "?rc= 1", "?rc", "?rc=true"];

test("cada ataque ABRIA com o substring antigo (o caso é discriminante)", () => {
  for (const s of ATAQUES) assert.equal(antigo(s), true, s);
});

test("nenhum ataque abre com o match exato", () => {
  for (const s of ATAQUES) assert.equal(temAcessoDiretoCadastro(s), false, s);
});

test("?rc=1 continua a abrir (MC17 preservado)", () => {
  for (const s of LEGITIMOS) assert.equal(temAcessoDiretoCadastro(s), true, s);
});

test("sem rc=1 exato não abre; entrada não-texto não abre", () => {
  for (const s of FECHADOS) assert.equal(temAcessoDiretoCadastro(s), false, JSON.stringify(s));
  for (const v of [undefined, null, 1, {}, ["?rc=1"]]) {
    assert.equal(temAcessoDiretoCadastro(v), false, String(v));
  }
});

// Cablagem: o helper certo não prova nada se a guarda não o usar.
const semComentarios = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join("\n");
const APP = semComentarios(readFileSync(new URL("../App.jsx", import.meta.url), "utf8"));

test("a CorporativoRoute usa o match exato sobre window.location.search", () => {
  const i = APP.indexOf("function CorporativoRoute");
  assert.ok(i >= 0, "CorporativoRoute não encontrada");
  const corpo = APP.slice(i, APP.indexOf("\nfunction ", i + 1));
  assert.match(corpo, /if \(!temAcessoDiretoCadastro\(window\.location\.search\)\) return <Navigate to="\/" replace \/>;/);
  assert.match(APP, /import \{ temAcessoDiretoCadastro \} from "\.\/lib\/acessoDiretoCadastro\.js";/);
});

test("o App.jsx não volta a testar a query string por substring", () => {
  assert.doesNotMatch(APP, /\.includes\(\s*["'][^"']*rc=/);
  assert.doesNotMatch(APP, /location\.search\.(includes|indexOf|match)\(/);
});
