// mc991-ui.test.mjs — MC99.1, guardas das alterações de arrumação (SEG2 e SEG6).
// Mede sobre CÓDIGO (comentários fora): o MC99.1 documenta cada alteração num comentário que
// NOMEIA o que mudou, e um guarda que leia o ficheiro cru dá RED no ficheiro correcto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ⚠️ A raiz é o FRONTEND (duas pastas acima de src/__tests__/), porque os caminhos que se
// lêem começam por "src/". A 1.ª versão resolvia a partir de src/ e pedia "src/pages/..." —
// ou seja, src/src/pages/... e ENOENT nos 3 testes. Um teste que não encontra o ficheiro
// falha por engano: é ruído, não guarda.
const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (p) => readFileSync(resolve(FRONT, p), "utf8");

/** Código: fora comentários JSX multi-linha, blocos /* *\/, // de linha e de fim de linha. */
function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .filter((l) => !/^\s*\*/.test(l))
    .join("\n");
}
const conta = (s, sub) => s.split(sub).length - 1;

test("controlo positivo: o stripper apaga comentários e poupa código", () => {
  const amostra = [
    "const a = 1; // navigate(\"/corporativo\") num comentário",
    "{/* bloco JSX multi-linha",
    "    com navigate(\"/corporativo\") dentro */}",
    "irParaPainel();",
  ].join("\n");
  const c = codigo(amostra);
  assert.ok(!c.includes('navigate("/corporativo")'), "não apagou o comentário");
  assert.ok(c.includes("irParaPainel();"), "apagou código");
});

// UTAC108f (R18) — o lojista saiu do app: o SEG2 (helper `irParaPainel` do SejaNossoParceiro) e o SEG6
// (grelha «Cotas disponíveis/Exclusividade» só do lojista na Vitrine) ficaram sem objecto. Guardas de remoção:
test("UTAC108f · a página «Seja Nosso Parceiro» saiu (sem painel do lojista para onde entrar)", async () => {
  const { existsSync } = await import("node:fs");
  assert.equal(existsSync(resolve(FRONT, "src/pages/SejaNossoParceiro.jsx")), false);
  assert.doesNotMatch(codigo(ler("src/App.jsx")), /SejaNossoParceiro|seja-nosso-parceiro/);
});

test("UTAC108f (R18-D) · a Vitrine já não tem ramos do lojista (grelha interna, cabeçalho, banners)", () => {
  const c = codigo(ler("src/pages/Vitrine.jsx"));
  assert.doesNotMatch(c, /corporativo|VitrineHeaderLojista|bannerSvg|Valor de contrato|Exclusividade/);
});

test("MC99.1/SEG6 · CONTROLO — o utilizador comum NÃO perdeu a informação das cotas", () => {
  // Esta guarda existe para travar a tentação de gatear tudo: o MC99 ensinou que se mede o
  // que o utilizador PERDE, não onde se disse que a informação estava. As cotas continuam
  // visíveis no cartão da lista (SlotCard), com decisão anterior a documentá-lo (MC39.3.1 #8).
  const c = codigo(ler("src/pages/Vitrine.jsx"));
  assert.match(c, /<Info\s+label="Cotas"/, "as cotas desapareceram TAMBÉM do cartão da lista — o comum perdeu a informação");
  assert.match(c, /<Info label="Tipo"/, "o «Tipo» (modalidade) desapareceu do cartão da lista");
});
