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

test("MC99.1/SEG2 · um único ponto de entrada para o painel do lojista", () => {
  const c = codigo(ler("src/pages/SejaNossoParceiro.jsx"));
  // (a) o helper existe exactamente uma vez
  assert.equal(conta(c, "const irParaPainel ="), 1, "o helper irParaPainel desapareceu ou foi duplicado");
  // (b) a navegação literal só pode existir DENTRO do helper — quem a copiar outra vez
  //     cria um segundo sítio que pode divergir, que é o que o SEG2 veio eliminar.
  assert.equal(conta(c, 'navigate("/corporativo"'), 1,
    'há um navigate("/corporativo") directo fora do helper — o SEG2 foi revertido');
  // (c) os 4 sítios continuam a usar o helper
  assert.equal(conta(c, "irParaPainel();"), 4, "esperava 4 chamadas a irParaPainel()");
});

test("MC99.1/SEG6 · «Cotas disponíveis» e «Exclusividade» são dados do LOJISTA", () => {
  const c = codigo(ler("src/pages/Vitrine.jsx"));
  // A grelha inteira fica dentro de {corporativo && ( ... )}: as quatro células são
  // internas ao lojista. Gatear só duas deixaria uma caixa vazia com padding e borda.
  const m = c.match(/\{corporativo && \(\s*<div style=\{\{ display: "grid"[\s\S]*?<\/div>\s*\)\}/);
  assert.ok(m, "a grelha das cotas não está dentro de um guarda corporativo");
  for (const rotulo of ["Cotas disponíveis", "Exclusividade"]) {
    assert.ok(m[0].includes(rotulo), `${rotulo} saiu do bloco gateado (o lojista perdeu-a)`);
  }
  // E as que já eram gateadas por MC39.3.1 continuam lá dentro (não se perdeu nada ao lojista)
  for (const rotulo of ["Valor de contrato", "Valor mín. produto"]) {
    assert.ok(m[0].includes(rotulo), `${rotulo} desapareceu do painel do lojista`);
  }
});

test("MC99.1/SEG6 · CONTROLO — o utilizador comum NÃO perdeu a informação das cotas", () => {
  // Esta guarda existe para travar a tentação de gatear tudo: o MC99 ensinou que se mede o
  // que o utilizador PERDE, não onde se disse que a informação estava. As cotas continuam
  // visíveis no cartão da lista (SlotCard), com decisão anterior a documentá-lo (MC39.3.1 #8).
  const c = codigo(ler("src/pages/Vitrine.jsx"));
  assert.match(c, /<Info\s+label="Cotas"/, "as cotas desapareceram TAMBÉM do cartão da lista — o comum perdeu a informação");
  assert.match(c, /<Info label="Tipo"/, "o «Tipo» (modalidade) desapareceu do cartão da lista");
});
