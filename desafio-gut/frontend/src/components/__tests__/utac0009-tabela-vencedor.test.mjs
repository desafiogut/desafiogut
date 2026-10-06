// utac0009-tabela-vencedor.test.mjs — UTAC000.9 (DEBT-008). Componente `TabelaLances` a sério.
//
// Corre com:  node --test --test-concurrency=1 src/components/__tests__/utac0009-tabela-vencedor.test.mjs
// (a partir de desafio-gut/frontend)
//
// O QUE SE PROVA
//   O 🏆 «Menor e Único» da tabela de lances passa a ser o VENCEDOR OFICIAL da edição
//   (`resultados()` on-chain) quando ele existe; sem resultado oficial, mantém-se o apuramento
//   local (o 1.º lance único da lista) — o comportamento anterior, sem regressões.
//
// PORQUE IMPORTA: em mainnet o browser vê pouco ou nada da edição (o valor nunca vai em claro
// para a cadeia e a lista pública vem blindada), logo «o 1.º único da lista» era, na prática,
// «o menor único que este browser viu». Medido e documentado no UTAC000.8
// (`_logs/UTAC000.8_SEG-1_MEDICAO.md` §-1.9).
//
// ARNÊS: Vite SSR (`opcoesServidorTeste`) + a ponte de React (`_ponte-ssr.mjs`, A12) + um duplo
// do hook por `resolve.alias`. Nenhum ficheiro de produção é alterado para o teste.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");

let React = null;
let renderToStaticMarkup = null;
let vite = null;
let Tabela = null;
let definirResultadoOficial = null;
let edicoesPedidas = null;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES,
        { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS}/useResultadoOficial.js` },
        // O `sanitize.js` REAL corre; só a biblioteca de sanitização é substituída (o default do
        // UMD `dompurify` não sobrevive ao interop do Vite SSR — medido). Ver `_stubs/dompurify.js`.
        { find: /^dompurify$/, replacement: `${STUBS}/dompurify.js` },
      ],
    },
  });
  // A ponte PRIMEIRO: é ela que fixa a instância de React do processo (A12).
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirResultadoOficial, argumentos: edicoesPedidas } = await vite.ssrLoadModule(`${STUBS}/useResultadoOficial.js`));
  Tabela = (await vite.ssrLoadModule("/src/components/TabelaLances.jsx")).default;
});

after(async () => { if (vite) await vite.close(); });

const EU    = "0xaaaa000000000000000000000000000000000001";
const OUTRO = "0xbbbb000000000000000000000000000000000002";

function renderizar({ lances, resultadoOficial = null, idEdicao = "R-1" }) {
  definirResultadoOficial(resultadoOficial);
  return renderToStaticMarkup(
    React.createElement(Tabela, { lances, idEdicao, prazoTimestamp: 0, encerrado: false }),
  );
}

/** Quantos 🏆 a tabela desenha. UTAC107d: só o da coluna «#» (o selo da coluna Estado saiu). */
const trofeus = (html) => html.split("🏆").length - 1;

/**
 * Endereços (abreviados) das LINHAS que levam o 🏆 — diz A QUEM foi dado, não só quantos.
 * (Achado do validador no UTAC000.8: contar 🏆 sem verificar a linha deixa passar testes vácuos.)
 * ⚠️ UTAC107d — a coluna «Status (Art. 24)» e o seu selo «🏆 Menor e Único» SAÍRAM (mockup, R18-D):
 * a tabela tem 3 colunas e o 🏆 vive na coluna «#». O instrumento lê agora a LINHA (`<tr>…</tr>`)
 * que contém o 🏆 e tira dela o endereço — mais estrito que a janela de 900 chars de antes.
 */
function enderecosVencedores(html) {
  const out = [];
  for (const linha of html.match(/<tr[\s\S]*?<\/tr>/g) || []) {
    if (!linha.includes("🏆")) continue;
    // ⚠️ `A-F` incluídos: a lista pode trazer a caixa EIP-55 (checksum) — bug do INSTRUMENTO
    // medido no UTAC000.9 (um regex só de minúsculas devolvia `null`).
    const m = linha.match(/0x[0-9a-fA-F]{4,8}\.\.\./);
    out.push(m ? m[0] : null);
  }
  return out;
}

describe("UTAC000.9 · TabelaLances — o 🏆 é o vencedor OFICIAL quando existe", () => {
  // CASO DISCRIMINANTE: o oficial (300, EU) ≠ o apuramento local (100, OUTRO).
  // Sem a correcção o 🏆 ia para o OUTRO — o vencedor errado.
  const lances = [
    { endereco: EU,    valor: 300, repetido: false },
    { endereco: OUTRO, valor: 100, repetido: false },
  ];
  const OFICIAL_EU_300 = { consolidado: true, vencedor: EU, menorUnicoCentavos: 300 };

  test("com resultado oficial: o 🏆 vai para a linha do VENCEDOR OFICIAL (não para o menor local)", () => {
    const html = renderizar({ lances, resultadoOficial: OFICIAL_EU_300 });
    const venc = enderecosVencedores(html);
    assert.ok(venc.length >= 1, "não há 🏆 nenhum na tabela");
    assert.ok(venc.every((e) => e && e.startsWith(EU.slice(0, 6))),
      `o 🏆 foi para OUTRA pessoa: ${JSON.stringify(venc)} (esperado ${EU.slice(0, 6)}...)`);
  });

  // ⚠️ UTAC107e.1 (V2) — sem resultado oficial NINGUÉM leva 🏆 (era o apuramento local do UTAC000.9).
  // `venc.every(...)` sobre uma lista vazia passaria SEMPRE (vácuo) — por isso a prova é o COMPRIMENTO.
  test("V2: sem resultado oficial NINGUÉM leva 🏆 (o apuramento local elegeria OUTRO)", () => {
    const semOficial = renderizar({ lances, resultadoOficial: null });
    assert.equal(enderecosVencedores(semOficial).length, 0, "deu 🏆 sem resultado oficial (V2)");
    assert.equal(trofeus(semOficial), 0, "há 🏆 no ecrã sem resultado oficial (V2)");
  });

  test("V2: sem resultado oficial as linhas desenham-se, mas sem 🏆 (controlo: não são 0 linhas)", () => {
    const lancesSimples = [
      { endereco: EU,    valor: 500, repetido: false },
      { endereco: OUTRO, valor: 100, repetido: false },
    ];
    const html = renderizar({ lances: lancesSimples });
    assert.equal((html.match(/<tr[\s\S]*?<\/tr>/g) || []).filter((l) => l.includes("0x")).length, 2,
      "controlo: as duas linhas deviam ter sido desenhadas");
    assert.equal(trofeus(html), 0, "há 🏆 sem resultado oficial (V2)");
  });

  test("o vencedor oficial AUSENTE da lista → nenhum 🏆 (não se assinala por aproximação)", () => {
    const html = renderizar({ lances, resultadoOficial: { consolidado: true, vencedor: OUTRO, menorUnicoCentavos: 999 } });
    assert.equal(enderecosVencedores(html).length, 0, "assinalou alguém que não é o vencedor oficial");
  });

  test("linhas BLINDADAS (mainnet, valor null) nunca levam 🏆 — nem com resultado oficial", () => {
    const blindados = [
      { endereco: EU, valor: null, oculto: true, repetido: null },
      { endereco: OUTRO, valor: null, oculto: true, repetido: null },
    ];
    const html = renderizar({ lances: blindados, resultadoOficial: OFICIAL_EU_300 });
    assert.equal(enderecosVencedores(html).length, 0, "deu 🏆 a uma linha blindada");
    // UTAC107d — o selo «🔒 Blindado» saiu com a coluna Estado; o controlo passa a ser que as DUAS
    // linhas foram desenhadas (com o valor 🔒), para que «0 vencedores» não venha de 0 linhas.
    assert.equal((html.match(/<tr[\s\S]*?<\/tr>/g) || []).filter((l) => l.includes("0x")).length, 2,
      "controlo: as duas linhas blindadas deviam ter sido desenhadas");
  });

  test("cablagem: a tabela pede o resultado da EDIÇÃO recebida por prop", () => {
    renderizar({ lances, resultadoOficial: null, idEdicao: "R-9" });
    assert.deepEqual(edicoesPedidas(), ["R-9"], "a tabela não pediu (ou pediu mal) o resultado oficial");
  });

  // ── Achado do validador adversarial (§7.2): o `.toLowerCase()` do lado da LISTA é
  // LOAD-BEARING e não estava pinado — o mutante que o tirava sobrevivia aos 6 testes. Não é
  // hipotético: os lances chegam por `subscribeLanceDado` → `contrato.on("LanceDado", …)` (ethers
  // v6), que devolve endereços com caixa **EIP-55** (checksum) — `web3.js` leva essa caixa para a
  // lista. Sem o `toLowerCase()` da lista, o 🏆 perdia-se em silêncio.
  const EU_EIP55 = "0xAaAa000000000000000000000000000000000001";
  test("endereço da LISTA em caixa EIP-55 + oficial em minúsculas → o 🏆 vai para a linha certa", () => {
    const lancesEip55 = [
      { endereco: OUTRO,        valor: 500, repetido: false },
      { endereco: EU_EIP55,     valor: 300, repetido: false },
    ];
    const html = renderizar({
      lances: lancesEip55,
      resultadoOficial: { consolidado: true, vencedor: EU, menorUnicoCentavos: 300 },
    });
    const venc = enderecosVencedores(html);
    // 1: este auxiliar conta LINHAS com 🏆 (uma por linha vencedora).
    assert.equal(venc.length, 1, "o 🏆 desapareceu com a caixa EIP-55 na lista");
    assert.ok(venc.every((e) => e && e.toLowerCase().startsWith(EU_EIP55.slice(0, 6).toLowerCase())),
      `o 🏆 foi para OUTRA pessoa: ${JSON.stringify(venc)}`);
  });

  test("linha SEM valor (null) não casa um oficial de valor 0 (Number(null)===0)", () => {
    const lancesSemValor = [{ endereco: EU, valor: null, repetido: false }];
    const html = renderizar({
      lances: lancesSemValor,
      resultadoOficial: { consolidado: true, vencedor: EU, menorUnicoCentavos: 0 },
    });
    assert.equal(enderecosVencedores(html).length, 0, "casou uma linha sem valor com um vencedor de valor 0");
  });
});
