// padraoVidro.test.mjs — MC94.3.2. Trava a REGRESSÃO do bug de transparência.
//
// Corre com:  node --test src/lib/padraoVidro.test.mjs   (a partir de desafio-gut/frontend)
//
// PORQUÊ UM TESTE DE FOLHA DE ESTILO: o defeito não era de JS — era uma regra CSS
// que ficou obsoleta. O hover punha o fundo a rgba(13,18,53,0.35), escrito no
// MC25.3 quando a base era 0.25 (logo MAIS opaco). O MC82.1 subiu a base para 0.88
// e não tocou no hover: desde então o toque/hover deixava o KPI ~2,5x MAIS
// transparente, e num ecrã táctil o `:hover` fica "colado" — o "Total de Lances"
// aparecia transparente ao rolar. Nenhum teste de componente podia apanhar isto
// (o SSR não aplica a folha), por isso o invariante testa-se AQUI.
//
// ⚠️ Âmbito: prova os invariantes da folha, não a renderização no aparelho.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSS = readFileSync(resolve(RAIZ, "src/globals.css"), "utf8");

/** Alpha de um `background: rgba(r,g,b,A)`; exige que a cor seja o navy do padrão. */
function alphaDoFundo(bloco, etiqueta) {
  const m = bloco.match(/background:\s*rgba\(\s*13\s*,\s*18\s*,\s*53\s*,\s*([0-9.]+)\s*\)/);
  assert.ok(m, `${etiqueta}: não encontrei um background navy rgba(13,18,53,·)`);
  return Number(m[1]);
}

/** Corpo de uma regra, pelo selector exacto (`{` … `}`), sem regex gulosa. */
function corpoDaRegra(css, selector) {
  const i = css.indexOf(selector);
  assert.notEqual(i, -1, `regra ausente: ${selector}`);
  const abre = css.indexOf("{", i);
  const fecha = css.indexOf("}", abre);
  return csvSlice(css, abre + 1, fecha);
}
const csvSlice = (s, a, b) => s.slice(a, b);

test("a base do padrão de vidro é o navy sólido do MC82.1 (não a opacidade antiga)", () => {
  const base = alphaDoFundo(corpoDaRegra(CSS, ".gut-glass-standard"), "base");
  assert.equal(base, 0.88, "a base do padrão mudou; o hover abaixo depende deste valor");
});

test("⛔ o hover NUNCA é mais transparente que a base (o defeito medido)", () => {
  const base = alphaDoFundo(corpoDaRegra(CSS, ".gut-glass-standard"), "base");
  const hover = alphaDoFundo(
    corpoDaRegra(CSS, ".gut-glass-standard.gut-glass--interactive:hover"), "hover");
  assert.ok(hover >= base,
    `o hover (${hover}) ficou mais transparente que a base (${base}) — ` +
    "é exactamente o bug do 'Total de Lances' transparente ao rolar");
});

test("o hover está limitado a dispositivos com hover real (evita o estado colado no toque)", () => {
  const i = CSS.indexOf(".gut-glass-standard.gut-glass--interactive:hover");
  const antes = CSS.slice(0, i);
  const ultimoMedia = antes.lastIndexOf("@media");
  const fechaMedia = antes.indexOf("}", antes.indexOf("{", ultimoMedia));
  assert.ok(ultimoMedia !== -1, "a regra de hover não está dentro de nenhum @media");
  assert.match(antes.slice(ultimoMedia, ultimoMedia + 80), /@media\s*\(hover:\s*hover\)/,
    "o hover tem de estar sob @media (hover: hover) — num ecrã táctil não há hover, " +
    "e o :hover fica colado depois do toque");
  assert.ok(!antes.slice(fechaMedia, i).includes("@media"),
    "a regra de hover saiu do bloco @media (hover: hover)");
});

test("o padrão de vidro não reintroduz backdrop-filter (orçamento do MC82.1)", () => {
  const base = corpoDaRegra(CSS, ".gut-glass-standard");
  assert.doesNotMatch(base, /backdrop-filter/,
    "o backdrop-filter foi medido como o custo DOMINANTE de render no MC82.1");
});
