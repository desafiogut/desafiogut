// UTAC107g.4 — a exceção `?rc=1` foi FECHADA: `temAcessoDiretoCadastro` devolve `false` SEMPRE.
//
// HISTÓRIA: o UTAC107g.3 passou o match de substring para EXATO (`URLSearchParams(...).get("rc") === "1"`),
// o que fechou os ataques por substring (`?src=1`, `?arc=10`, `?rc=10`, `?xrc=1`) mas manteve a porta
// aberta para o `?rc=1` exato — por decisão do operador desse UTAC. O UTAC107g.4 fecha-a de vez: já
// ninguém no app gera esse endereço.
//
// BIDIRECIONAL (GATE 8): o predicado do 107g.3 ABRIA com `?rc=1` e a função de agora NÃO abre — o
// caso é discriminante (não é um teste vacuoso).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { temAcessoDiretoCadastro } from "./acessoDiretoCadastro.js";

// O predicado exato do UTAC107g.3 (o que este UTAC veio fechar).
const exatoDo107g3 = (search) => new URLSearchParams(search).get("rc") === "1";

// Corpus: os ataques por substring do 107g.3, os que o match exato deixava passar, e variantes.
const NAO_DEVE_ABRIR = [
  // (i) os que o SUBSTRING antigo abria por engano
  "?src=1", "?arc=10", "?rc=10", "?xrc=1", "?foo=1&src=1", "?rc=1x", "?arc=1",
  // (ii) os que o MATCH EXATO do 107g.3 ainda abria — o objeto deste UTAC
  "?rc=1", "?foo=bar&rc=1", "?rc=1&utm=x", "?rc=%31",
  // (iii) variantes de forma (hash, prefixo, maiúsculas, zero à esquerda, espaços)
  "#rc=1", "&rc=1", "?RC=1", "?rc=01", "?rc=true", "?rc= 1", "https://x.test/?rc=1",
  // (iv) sem parâmetro nenhum
  "", "?", "?rc=", "?rc=0", "?rc=2", "?rc", "?foo=bar",
];

test("BIDIRECIONAL: o predicado do 107g.3 ABRIA com `?rc=1` (o caso é discriminante)", () => {
  assert.equal(exatoDo107g3("?rc=1"), true, "controlo: o predicado antigo tinha de abrir");
  assert.equal(exatoDo107g3("?foo=bar&rc=1"), true, "controlo: o predicado antigo tinha de abrir");
});

test("nenhum URL abre a UI do lojista (a função devolve SEMPRE false)", () => {
  for (const s of NAO_DEVE_ABRIR) {
    assert.equal(temAcessoDiretoCadastro(s), false, `ABRIU com ${JSON.stringify(s)} — porta aberta!`);
  }
});

test("entrada não-texto também não abre", () => {
  for (const v of [undefined, null, 1, 0, true, {}, ["?rc=1"], new URLSearchParams("?rc=1")]) {
    assert.equal(temAcessoDiretoCadastro(v), false, `ABRIU com ${String(v)} — porta aberta!`);
  }
});

test("a assinatura foi preservada (1 parâmetro) — o App.jsx não muda", () => {
  assert.equal(temAcessoDiretoCadastro.length, 1,
    "a função perdeu o parâmetro: o App.jsx chama-a com window.location.search");
});

// ─── Cablagem: o helper certo não prova nada se a guarda não o usar. ────────────────
const semComentarios = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join("\n");
const APP = semComentarios(readFileSync(new URL("../App.jsx", import.meta.url), "utf8"));

test("a CorporativoRoute continua a usar o helper (guarda intacta — não foi tocada)", () => {
  const i = APP.indexOf("function CorporativoRoute");
  assert.ok(i >= 0, "CorporativoRoute não encontrada");
  const corpo = APP.slice(i, APP.indexOf("\nfunction ", i + 1));
  assert.match(corpo, /if \(!temAcessoDiretoCadastro\(window\.location\.search\)\) return <Navigate to="\/" replace \/>;/);
  assert.match(APP, /import \{ temAcessoDiretoCadastro \} from "\.\/lib\/acessoDiretoCadastro\.js";/);
});

test("o App.jsx não testa a query string por substring", () => {
  assert.doesNotMatch(APP, /\.includes\(\s*["'][^"']*rc=/);
  assert.doesNotMatch(APP, /location\.search\.(includes|indexOf|match)\(/);
});
