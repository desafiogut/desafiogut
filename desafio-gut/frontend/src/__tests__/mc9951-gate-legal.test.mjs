// mc9951-gate-legal.test.mjs — MC99.5.1, guarda das verdades públicas.
//
// BIDIRECIONAL (HARD GATE 7):
//   (a) o texto legal pode ser lido — a caixa NÃO tem maxHeight nem scroll aninhado, e TEM
//       flexShrink:0 (sem ele o algoritmo flex volta a encolhê-la: medido, 40px de 1654px);
//   (b) os 4 aceites legais continuam presentes;
//   (c) mutação: repor o maxHeight -> RED; tirar um aceite -> RED.
//
// ⚠️ O QUE ESTE TESTE NÃO PODE PROVAR: o clientHeight real. Isso é runtime/DOM e foi medido em
// produção (40 -> 1654, 100% visível). O teste guarda a PROPRIEDADE do código que produz esse
// efeito; a medição no DOM é a prova do efeito. Declarado, não escondido.
//
// ⚠️ Mede sobre CÓDIGO, não sobre comentários: o comentário desta correcção NOMEIA maxHeight e
// flexShrink (é a família de defeito que persegue a série — 13 ocorrências).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RAIZ = resolve(FE, "..", "..");
const ler = (p) => readFileSync(p, "utf8");
// remove comentários de linha JSX (// …) e de bloco (/* … */ e {/* … */})
const codigo = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

const TERMOS = FE + "/src/components/TermosConsentimento.jsx";

test("controlo positivo: o stripper de comentários vê mesmo o comentário desta correcção", () => {
  const cru = ler(TERMOS);
  const sem = codigo(cru);
  assert.ok(cru.includes("maxHeight"), "o comentário devia nomear maxHeight (se não, este teste não prova nada)");
  assert.ok(!/maxHeight\s*:\s*"260px"/.test(sem), "o codigo NAO pode ter maxHeight: 260px");
});

test("MC99.5.1 · (a) o texto legal é servido por inteiro (sem maxHeight nem scroll aninhado)", () => {
  const c = codigo(ler(TERMOS));
  // isola o bloco do scrollBox
  const m = c.match(/scrollBox:\s*\{([\s\S]*?)\n\s*\}/);
  assert.ok(m, "não encontrei o bloco scrollBox");
  const box = m[1];
  assert.ok(!/maxHeight/.test(box), "o scrollBox voltou a ter maxHeight — é a causa do texto ilegível (40px de 1654)");
  assert.ok(!/overflowY/.test(box), "o scrollBox voltou a ter scroll aninhado");
  assert.ok(/flexShrink:\s*0/.test(box), "falta flexShrink: 0 — sem ele o flex volta a encolher a caixa");
});

test("MC99.5.1 · (b) os 4 aceites legais continuam presentes", () => {
  const c = ler(TERMOS);
  for (const frase of ["regulamento completo", "18 anos ou mais", "Menor Lance Único Ganha", "LGPD/GDPR"]) {
    assert.ok(c.includes(frase), "desapareceu um aceite legal: " + frase);
  }
  const cbs = (c.match(/type="checkbox"/g) || []).length;
  assert.equal(cbs, 4, "esperava 4 checkboxes, vi " + cbs);
});

test("MC99.5.1 · robotstxt e sitemap existem e não devolvem HTML", () => {
  for (const f of ["robots.txt", "sitemap.xml"]) {
    const p = FE + "/public/" + f;
    assert.ok(existsSync(p), f + " nao existe em public/");
    const t = ler(p);
    assert.ok(t.length > 50, f + " demasiado curto (" + t.length + " B)");
    assert.ok(!/<html/i.test(t) && !/<div id="root"/.test(t), f + " devolve HTML — e o rewrite do SPA");
  }
  assert.match(ler(FE + "/public/robots.txt"), /Sitemap:\s*https:\/\//, "robots.txt sem linha Sitemap");
  assert.match(ler(FE + "/public/sitemap.xml"), /<urlset xmlns="http:\/\/www\.sitemaps\.org/, "sitemap.xml sem urlset valido");
});

test("MC99.5.1 · a data de vigência é 5 de outubro em TODO o lado", () => {
  const alvos = [FE + "/index.html", FE + "/src/pages/Configuracoes.jsx", FE + "/src/pages/MercadoLances.jsx"];
  for (const p of alvos) {
    const t = ler(p);
    assert.ok(!/junho de 2026/.test(t), p.split("/").pop() + " ainda diz junho de 2026");
  }
  assert.ok(/5 de outubro de 2026/.test(ler(FE + "/index.html")), "o index.html perdeu a data correcta");
});

test("MC99.5.1 · o titulo do Regulamento diz a versão que o ficheiro é", () => {
  const t = ler(RAIZ + "/docs/REGULAMENTO-v4.md");
  const l1 = t.split(/\r?\n/)[0];
  assert.ok(/v4\.0/.test(l1), "linha 1 sem v4.0: " + l1.slice(0, 70));
  assert.ok(!/v3\.0/.test(l1), "linha 1 ainda diz v3.0");
});
