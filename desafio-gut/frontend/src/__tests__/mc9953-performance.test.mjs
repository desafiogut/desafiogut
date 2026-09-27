// mc9953-performance.test.mjs — MC99.5.3, guardas da FRENTE A (performance).
//
// Cada correcção desta frente cria o seu próprio ponto cego; estas guardas fecham-no:
//   (1) DEDUP DE FONTES — o defeito original (DEP2-06) foi 15 ficheiros para 3 conteúdos.
//       Uma guarda por ORÇAMENTO de bytes é frágil (depende do tamanho da fonte); a guarda certa
//       é ESTRUTURAL: não pode haver dois .woff2 byte-idênticos em public/fonts.
//   (2) FUNDO MOBILE — o defeito era a variante de telemóvel ser 1,8× a de desktop e estar no
//       caminho crítico. A guarda é um ORÇAMENTO (o ficheiro tem de caber) + a ORDEM
//       (o mobile não pode voltar a ser maior que o desktop).
//
// Bidireccional de propósito: (a) as fontes servidas continuam a existir; (b) não há duplicados;
// (c) o fundo cabe no orçamento. Um teste que só diga «existe 1 ficheiro» passaria com a pasta vazia.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR_FONTES = resolve(FRONT, "public", "fonts");
const DIR_FUNDOS = resolve(FRONT, "public", "assets", "backgrounds");

// orçamentos: medidos no MC99.5.3 (inter 48 256 · jetbrains 31 432 · orbitron 11 800 = 91 488 B).
// O limite é 100 000 B — apertado o suficiente para voltar a apanhar a reintrodução de duplicados.
const ORCAMENTO_FONTES = 100_000;
// medido depois do re-encode (q75): 106 942 B. O original tinha 200 068 B.
const ORCAMENTO_FUNDO = 130_000;

test("MC99.5.3 · public/fonts: nenhum .woff2 duplica os bytes de outro (o defeito DEP2-06)", () => {
  const ficheiros = existsSync(DIR_FONTES) ? readdirSync(DIR_FONTES).filter((f) => f.endsWith(".woff2")).sort() : [];
  assert.ok(ficheiros.length > 0, "não há fontes em public/fonts — a asserção seria vazia");
  const porMd5 = new Map();
  for (const f of ficheiros) {
    const md5 = createHash("md5").update(readFileSync(join(DIR_FONTES, f))).digest("hex");
    if (!porMd5.has(md5)) porMd5.set(md5, []);
    porMd5.get(md5).push(f);
  }
  const dup = [...porMd5.entries()].filter(([, v]) => v.length > 1)
    .map(([md5, v]) => `${md5.slice(0, 8)}: ${v.join(" = ")}`);
  assert.deepEqual(dup, [], `ficheiros byte-idênticos em public/fonts (dedup desfeito):\n  ${dup.join("\n  ")}`);
  assert.ok(ficheiros.length <= 4, `public/fonts tem ${ficheiros.length} ficheiros — esperava 3 (1 por família)`);
});

test("MC99.5.3 · public/fonts cabe no orçamento de bytes", () => {
  const total = readdirSync(DIR_FONTES).filter((f) => f.endsWith(".woff2"))
    .reduce((s, f) => s + readFileSync(join(DIR_FONTES, f)).length, 0);
  assert.ok(total <= ORCAMENTO_FONTES,
    `fontes somam ${total} B, acima do orçamento de ${ORCAMENTO_FONTES} B (duplicados de volta?)`);
});

test("MC99.5.3 · os 3 ficheiros sobreviventes do dedup continuam a existir", () => {
  for (const f of ["inter-400-latin.woff2", "jetbrains-400-latin.woff2", "orbitron-600-latin.woff2"]) {
    assert.ok(existsSync(join(DIR_FONTES, f)), `${f} desapareceu — o fontes.css apontaria para o vazio`);
  }
});

test("MC99.5.3 · fundo mobile: cabe no orçamento e NÃO é maior que o desktop", () => {
  const mob = resolve(DIR_FUNDOS, "background-mobile.webp");
  const des = resolve(DIR_FUNDOS, "background-desktop.webp");
  assert.ok(existsSync(mob) && existsSync(des), "falta uma das variantes de fundo");
  const bm = readFileSync(mob).length, bd = readFileSync(des).length;
  assert.ok(bm <= ORCAMENTO_FUNDO, `fundo mobile tem ${bm} B, acima do orçamento de ${ORCAMENTO_FUNDO} B`);
  assert.ok(bm <= bd * 1.1,
    `fundo mobile (${bm} B) é maior que o desktop (${bd} B) — é a regressão do DEP2-08`);
});

test("MC99.5.3 · as variantes de fundo continuam a ser WebP válido (o re-encode não corrompeu)", () => {
  for (const f of ["background-mobile.webp", "background-desktop.webp"]) {
    const b = readFileSync(resolve(DIR_FUNDOS, f));
    assert.equal(b.subarray(0, 4).toString("ascii"), "RIFF", `${f}: assinatura RIFF ausente`);
    assert.equal(b.subarray(8, 12).toString("ascii"), "WEBP", `${f}: não é um WebP`);
    assert.ok(b.length > 10_000, `${f}: ${b.length} B — suspeito de ficheiro truncado`);
  }
});
