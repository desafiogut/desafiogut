// utac00014-fim-edicao-overlay.test.mjs — UTAC000.14 (DEBT-013).
//
// node --test --test-concurrency=1 src/components/__tests__/utac00014-fim-edicao-overlay.test.mjs
//   (a partir de desafio-gut/frontend)
//
// O QUE SE PROVA
//   O `FimEdicaoOverlay` (o overlay de fim de leilão do Dashboard) não mostra «R$ NaN», não
//   formata valores negativos e NÃO REBENTA com um `vencedor` malformado. É o terceiro irmão da
//   mesma família: DEBT-011 (`OverlayVencedor`, UTAC000.11) → DEBT-012 (card do Dashboard,
//   UTAC000.12) → DEBT-013 (este overlay). Medido no SEG-1 com o código antigo: valor malformado
//   dava «R$ NaN» / «R$ -0.01», e `BigInt`/`Symbol` LANÇAVAM (render rebentava).
//   Regra (a mesma da série): malformado = AUSENTE («—»), campo a campo; com `vencedor` VÁLIDO
//   NADA muda (GATE 18).
//
// ARNÊS: Vite SSR + `_ponte-ssr.mjs` (A12). Nenhum ficheiro de produção é alterado para o teste.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

let React = null;
let renderToStaticMarkup = null;
let vite = null;
let Overlay = null;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: { alias: [...ALIASES] },
  });
  // A ponte PRIMEIRO: é ela que fixa a instância de React do processo.
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  Overlay = (await vite.ssrLoadModule("/src/components/FimEdicaoOverlay.jsx")).default;
});

after(async () => { if (vite) await vite.close(); });

const EU = "0xaaaa000000000000000000000000000000000001";
const abrev = (e) => `${e.slice(0, 10)}...${e.slice(-6)}`;

const renderizar = (vencedor) => renderToStaticMarkup(React.createElement(Overlay, {
  vencedor, modalidade: "flash", onNovaRodada: () => {}, EDICAO_ATIVA: "R-1",
}));

/** O bloco do cartão do vencedor: de «Carteira Vencedora» até ao botão. */
function blocoDoCartao(html) {
  const i = html.indexOf("Carteira Vencedora");
  if (i < 0) return "";
  const resto = html.slice(i);
  const j = resto.indexOf("<button");
  return j > 0 ? resto.slice(0, j) : resto;
}
const camposVazios = (bloco) => (bloco.match(/>—</g) || []).length;

describe("UTAC000.14 · FimEdicaoOverlay — o VALOR não mostra NaN, negativo, nem rebenta (DEBT-013)", () => {
  const CASOS = [
    // [nome,                                 valor,             valor esperado]
    ["valor ausente",                          undefined,         "—"],
    ["valor objecto vazio",                    {},                "—"],
    ["valor NaN",                              NaN,               "—"],
    ["valor string (não numérico)",            "abc",             "—"],
    ["valor Infinity",                         Infinity,          "—"],
    ["valor negativo",                         -1,                "—"],
    ["valor BigInt (o antigo lançava)",        300n,              "—"],
    ["valor Symbol (o antigo lançava)",        Symbol("x"),       "—"],
    // ⚠️ ALTERAÇÃO DECLARADA (igual à do UTAC000.12): o antigo mostrava «R$ 3.00» para a string.
    ["string \"300\" (mudou: era «R$ 3.00»)",  "300",             "—"],
    // ── Válidos: não podem mudar (GATE 18).
    ["valor 0 (válido! não é malformado)",     0,                 "R$ 0.00"],
    ["valor -0 (zero negativo)",               -0,                "R$ 0.00"],
    ["valor 1",                                1,                 "R$ 0.01"],
    ["0.5 centavo (arredonda)",                0.5,               "R$ 0.01"],
    ["valor 12345",                            12345,             "R$ 123.45"],
    ["VÁLIDO (o caso que não pode mudar)",     300,               "R$ 3.00"],
  ];

  for (const [nome, valor, valorEsperado] of CASOS) {
    test(`${nome}: valor «${valorEsperado}»`, () => {
      const bloco = blocoDoCartao(renderizar({ endereco: EU, valor }));
      assert.ok(bloco.length > 0, "controlo: o cartão do vencedor não foi encontrado");
      assert.ok(!/R\$ NaN/.test(bloco), "o overlay mostrou «R$ NaN»");
      assert.ok(!/R\$ -/.test(bloco), "o overlay formatou um valor NEGATIVO");
      assert.ok(!/R\$ ∞|Infinity/.test(bloco), "o overlay formatou Infinity");
      assert.ok(bloco.includes(abrev(EU)), "o endereço válido deixou de aparecer");
      assert.ok(bloco.includes(valorEsperado), `valor: esperava «${valorEsperado}»`);
      assert.equal(camposVazios(bloco), valorEsperado === "—" ? 1 : 0, "contagem de campos «—»");
    });
  }

  // ── O ENDEREÇO (l. 14) — incluído por decisão do operador no SEG-1 (R18): medido, `vencedor: {}`
  //    e endereços não-string REBENTAVAM no `.slice` (página em branco), e `""`/`[]` mostravam «...».
  const ENDERECOS = [
    // [nome,                      vencedor,                         endereço esperado, valor esperado]
    ["vencedor objecto vazio",     {},                               "—",               "—"],
    ["só valor (sem endereço)",    { valor: 300 },                   "—",               "R$ 3.00"],
    ["endereço null",              { endereco: null, valor: 300 },   "—",               "R$ 3.00"],
    ["endereço número",            { endereco: 12345, valor: 300 },  "—",               "R$ 3.00"],
    ["endereço booleano",          { endereco: true, valor: 300 },   "—",               "R$ 3.00"],
    ["endereço objecto",           { endereco: {}, valor: 300 },     "—",               "R$ 3.00"],
    ["endereço array",             { endereco: [], valor: 300 },     "—",               "R$ 3.00"],
    ["endereço string vazia",      { endereco: "", valor: 300 },     "—",               "R$ 3.00"],
  ];

  for (const [nome, vencedor, enderecoEsperado, valorEsperado] of ENDERECOS) {
    test(`${nome}: endereço «${enderecoEsperado}», valor «${valorEsperado}»`, () => {
      const bloco = blocoDoCartao(renderizar(vencedor));
      assert.ok(bloco.length > 0, "controlo: o cartão do vencedor não foi encontrado");
      assert.ok(!/R\$ NaN/.test(bloco), "o overlay mostrou «R$ NaN»");
      assert.ok(!/>\.\.\.</.test(bloco), "o overlay mostrou um endereço vazio «...»");
      assert.ok(bloco.includes(valorEsperado), `valor: esperava «${valorEsperado}»`);
      const tracos = (enderecoEsperado === "—" ? 1 : 0) + (valorEsperado === "—" ? 1 : 0);
      assert.equal(camposVazios(bloco), tracos, `esperava ${tracos} campo(s) «—» no cartão`);
    });
  }

  test("sem vencedor: «Nenhum lance único registrado.» (inalterado)", () => {
    const html = renderizar(null);
    assert.ok(html.includes("Nenhum lance único registrado."));
    assert.ok(!html.includes("Carteira Vencedora"));
  });
});
