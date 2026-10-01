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

/** Quantos 🏆 a tabela desenha (o da posição/avatar e o do selo da linha vencedora). */
const trofeus = (html) => html.split("🏆").length - 1;

/**
 * Endereços (abreviados) das linhas que levam o selo «🏆 Menor e Único» — diz A QUEM foi dado o
 * 🏆, não só quantos. (Achado do validador no UTAC000.8: contar 🏆 sem verificar a linha deixa
 * passar testes vácuos.)
 */
function enderecosVencedores(html) {
  const out = [];
  const alvo = "Menor e Único";
  for (let i = html.indexOf(alvo); i >= 0; i = html.indexOf(alvo, i + 1)) {
    const janela = html.slice(Math.max(0, i - 900), i);
    const m = [...janela.matchAll(/0x[0-9a-f]{4,8}\.\.\./g)].pop();
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
    assert.ok(venc.length >= 1, "não há selo «Menor e Único» nenhum na tabela");
    assert.ok(venc.every((e) => e && e.startsWith(EU.slice(0, 6))),
      `o 🏆 foi para OUTRA pessoa: ${JSON.stringify(venc)} (esperado ${EU.slice(0, 6)}...)`);
  });

  test("fonte OFICIAL: o apuramento local elegeria OUTRO (100) — o teste morde se a correcção cair", () => {
    const semOficial = renderizar({ lances, resultadoOficial: null });
    const venc = enderecosVencedores(semOficial);
    assert.ok(venc.every((e) => e && e.startsWith(OUTRO.slice(0, 6))),
      `o comportamento local mudou (esperado ${OUTRO.slice(0, 6)}...): ${JSON.stringify(venc)}`);
  });

  test("SEM resultado oficial: mantém-se o apuramento local (zero regressões)", () => {
    const lancesSimples = [
      { endereco: EU,    valor: 500, repetido: false },
      { endereco: OUTRO, valor: 100, repetido: false },
    ];
    const html = renderizar({ lances: lancesSimples });
    const venc = enderecosVencedores(html);
    assert.ok(venc.every((e) => e && e.startsWith(OUTRO.slice(0, 6))), "o menor local deixou de vencer");
    assert.equal(trofeus(html), 2, "a linha vencedora tem o 🏆 do avatar e o do selo — e mais nenhuma");
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
    assert.ok(html.includes("🔒 Blindado"), "controlo: as linhas deviam estar marcadas como blindadas");
  });

  test("cablagem: a tabela pede o resultado da EDIÇÃO recebida por prop", () => {
    renderizar({ lances, resultadoOficial: null, idEdicao: "R-9" });
    assert.deepEqual(edicoesPedidas(), ["R-9"], "a tabela não pediu (ou pediu mal) o resultado oficial");
  });
});
