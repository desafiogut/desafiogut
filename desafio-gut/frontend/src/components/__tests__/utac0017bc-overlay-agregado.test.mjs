// utac0017bc-overlay-agregado.test.mjs — UTAC000.17bc (17c / GATE 2.2 + ressalva E do validador).
//
// node --test --test-concurrency=1 src/components/__tests__/utac0017bc-overlay-agregado.test.mjs
//
// PORQUE É TESTE DE CONTRATO (e não de render): os dois overlays vivem em sítios diferentes (o
// `FimEdicaoOverlay` é um componente partilhado; o `OverlayVencedor` está declarado DENTRO do
// `MercadoLances.jsx` e não é exportado) e o arnês de runtime é um VISITANTE (sem `address`) — logo
// o destaque de vitória não é alcançável por render. Aqui fixa-se o que o desenho exige dos DOIS:
//   · a secção «As suas participações» com a contagem de lances GUARDADA por tipo;
//   · o destaque «🏆 VENCEU» com a mesma regra nos dois lados (endereço do titular em minúsculas,
//     comparação em minúsculas, guarda de tipo no vencedor — a mesma DEBT-011/013);
//   · a saída explícita «FECHAR» ligada ao `onClose`.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const PARTILHADO = ler("../../components/FimEdicaoOverlay.jsx");
const ANINHADO = ler("../../pages/MercadoLances.jsx");

describe("UTAC000.17bc (17c) · contrato do overlay agregado nos DOIS sítios", () => {
  for (const [nome, src] of [["FimEdicaoOverlay", PARTILHADO], ["OverlayVencedor (MercadoLances)", ANINHADO]]) {
    test(`${nome}: secção «As suas participações» com a contagem guardada por tipo`, () => {
      assert.ok(src.includes("As suas participações"), "perdeu a secção agregada");
      assert.ok(src.includes("Number.isFinite(p.lances)"),
        "a contagem de lances tem de ser guardada por tipo (senão imprime «undefined lances»)");
    });

    test(`${nome}: regra «🏆 VENCEU» igual à do outro (titular em minúsculas + guarda no vencedor)`, () => {
      assert.ok(src.includes("🏆 VENCEU"), "perdeu o destaque da vitória");
      assert.ok(/typeof meuEndereco === "string"/.test(src), "falta a guarda de tipo no titular");
      assert.ok(/meuEndereco\.toLowerCase\(\)/.test(src), "o titular tem de ser comparado em minúsculas");
      assert.ok(/typeof vencedor\?\.endereco === "string"/.test(src),
        "falta a guarda de tipo no vencedor (a mesma das DEBT-011/013)");
      assert.ok(/vencedor\.endereco\.toLowerCase\(\) === titular/.test(src),
        "a comparação do vencedor tem de ser em minúsculas");
    });

    test(`${nome}: saída explícita «FECHAR» ligada ao onClose`, () => {
      assert.ok(/FECHAR/.test(src), "perdeu o botão FECHAR");
      assert.ok(/onClose/.test(src), "perdeu o onClose");
    });
  }

  test("os dois sítios declaram o MESMO contrato de props do agregado", () => {
    for (const [nome, src] of [["FimEdicaoOverlay", PARTILHADO], ["OverlayVencedor", ANINHADO]]) {
      assert.ok(/participacoes = \[\]/.test(src), `${nome}: falta a prop participacoes com default`);
      assert.ok(/meuEndereco = null/.test(src), `${nome}: falta a prop meuEndereco com default`);
      assert.ok(/onClose = null/.test(src), `${nome}: falta a prop onClose com default`);
    }
  });
});
