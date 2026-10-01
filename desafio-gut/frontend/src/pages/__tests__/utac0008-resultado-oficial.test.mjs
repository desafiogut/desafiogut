// utac0008-resultado-oficial.test.mjs — UTAC000.8 (DEBT-007), decisão R18 do operador: OPÇÃO 2.
//
// Corre com:  node --test src/pages/__tests__/utac0008-resultado-oficial.test.mjs
// (a partir de desafio-gut/frontend)
//
// O QUE SE PROVA
//   O 🏆 «Menor e Único» e o cartão «Menor Lance» das MeusAtivos passam a ler o RESULTADO
//   OFICIAL da edição (`resultados()` on-chain, escrito pela consolidação) quando ele existe.
//   Sem resultado oficial, o apuramento local mantém-se EXACTAMENTE como estava (zero regressões).
//
// PORQUE É QUE ISTO IMPORTA (medido em produção, `_logs/UTAC000.8_SEG-1_MEDICAO.md` §-1.9)
//   Em mainnet o valor do lance nunca vai em claro para a cadeia (vai o `keccak256`) e a lista
//   pública vem blindada. O browser vê, quando muito, os lances do próprio utilizador. Sem o
//   resultado oficial, o 🏆 ia para o lance do próprio — enquanto o vencedor real era outro.
//
// ARNÊS: o mesmo do `utac105c-meus-ativos.test.mjs` (Vite SSR + duplos por `resolve.alias`).
// Nenhum ficheiro de produção é alterado para o teste.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");

let vite = null;
let Pagina = null;
let definirContexto = null;
let definirHooks = null;
let definirResultadoOficial = null;
let edicoesPedidas = null;
let normalizarResultadoOficial = null;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES,
        { find: /^\.\.\/context\/AppContext\.jsx$/,    replacement: `${STUBS}/AppContext.jsx` },
        { find: /^\.\.\/context\/IdiomaContext\.jsx$/, replacement: `${STUBS}/IdiomaContext.jsx` },
        { find: /^\.\.\/hooks\/useRanking\.js$/,       replacement: `${STUBS}/hooks.js` },
        { find: /^\.\.\/hooks\/useFeedback\.js$/,      replacement: `${STUBS}/hooks.js` },
        // UTAC000.8 — o resultado oficial é o que este teste controla.
        { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS}/useResultadoOficial.js` },
        { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS}/BotaoLoginPrincipal.jsx` },
      ],
    },
  });
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  ({ definirHooks } = await vite.ssrLoadModule(`${STUBS}/hooks.js`));
  ({ definirResultadoOficial, argumentos: edicoesPedidas } =
    await vite.ssrLoadModule(`${STUBS}/useResultadoOficial.js`));
  // O hook REAL (não o duplo): a normalização é testada a sério.
  ({ normalizarResultadoOficial } = await vite.ssrLoadModule("/src/hooks/useResultadoOficial.js"));
  Pagina = (await vite.ssrLoadModule("/src/pages/MeusAtivos.jsx")).default;
});

after(async () => { if (vite) await vite.close(); });

function renderizar({ contexto = {}, mobile = false, resultadoOficial = null } = {}) {
  definirContexto({
    lances: [], address: null, isConnected: false, abrirModal: () => {},
    EDICAO_ATIVA: "R-1", authToken: null, ...contexto,
  });
  definirHooks({
    ranking:  { ranking: [], total: 0, carregando: false, erro: null },
    feedback: { feedback: null, carregando: false, erro: null, semSessao: true },
  });
  definirResultadoOficial(resultadoOficial);
  const tinhaWindow = "window" in globalThis;
  const anterior = globalThis.window;
  if (mobile) globalThis.window = { matchMedia: () => ({ matches: true }) };
  try {
    return renderToStaticMarkup(React.createElement(Pagina));
  } finally {
    if (mobile) { if (tinhaWindow) globalThis.window = anterior; else delete globalThis.window; }
  }
}

const texto = (html) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Valores a que a página dá o selo «🏆 Menor e Único». */
function vencedoresNoEcra(html) {
  return [...texto(html).matchAll(/R\$ (\d+\.\d{2}) 🏆 Menor e Único/g)].map((m) => m[1]);
}

/** Quantos 🏆 a LISTA desenha (linha vencedora = 🏆 na posição E no selo). */
function trofeusNaLista(html) {
  const ini = html.indexOf("Filtrar:");
  const fim = html.indexOf("Art. 25", ini);
  assert.ok(ini >= 0 && fim > ini, "controlo: não encontrei a lista de lances na página");
  return html.slice(ini, fim).split("🏆").length - 1;
}

/** Valor do cartão «Menor Lance» (o valor é desenhado ANTES da legenda). */
function valorMenorLance(html) {
  const m = texto(html).match(/(R\$ \d+\.\d{2}|—)\s*Menor Lance/);
  assert.ok(m, "controlo: cartão «Menor Lance» não encontrado");
  return m[1];
}

const EU    = "0xaaaa000000000000000000000000000000000001";
const OUTRO = "0xbbbb000000000000000000000000000000000002";
const ZERO  = "0x0000000000000000000000000000000000000000";

const OFICIAL_OUTRO_100 = { consolidado: true, vencedor: OUTRO, menorUnicoCentavos: 100 };

const LAYOUTS = [["desktop", false], ["mobile", true]];

// ───────────────────────────────────────────────────────────────────────────
describe("UTAC000.8 · Frente B — 🏆/«Menor Lance» leem o RESULTADO OFICIAL", () => {
  for (const [nome, mobile] of LAYOUTS) {
    // O CASO DE PRODUÇÃO: a lista do browser só tem o lance do próprio (o resto vem blindado).
    test(`${nome}: a lista só tem o MEU lance e o resultado oficial é de OUTRO → nada de 🏆 para mim, cartão com o valor OFICIAL`, () => {
      const lances = [{ valor: 300, repetido: false, endereco: EU }];
      const html = renderizar({
        contexto: { lances, address: EU, isConnected: true },
        resultadoOficial: OFICIAL_OUTRO_100,
        mobile,
      });
      assert.ok(texto(html).includes("R$ 3.00"), "controlo: o meu lance tem de estar na lista");
      assert.deepEqual(vencedoresNoEcra(html), [],
        "a página deu «Menor e Único» a quem o resultado oficial não elegeu");
      assert.equal(trofeusNaLista(html), 0, "há um 🏆 na lista de quem não ganhou");
      assert.equal(valorMenorLance(html), "R$ 1.00",
        "o cartão «Menor Lance» não mostra o menor único OFICIAL");
    });

    // BIDIRECCIONALIDADE: sem o resultado oficial, o comportamento anterior mantém-se.
    // (É o estado que o defeito DEBT-007 produzia — o lance do próprio levava o 🏆.)
    test(`${nome}: SEM resultado oficial o apuramento local mantém-se (prova do antes; zero regressões)`, () => {
      const lances = [{ valor: 300, repetido: false, endereco: EU }];
      const html = renderizar({
        contexto: { lances, address: EU, isConnected: true },
        resultadoOficial: null,
        mobile,
      });
      assert.deepEqual(vencedoresNoEcra(html), ["3.00"]);
      assert.equal(trofeusNaLista(html), 2);
      assert.equal(valorMenorLance(html), "R$ 3.00");
    });

    test(`${nome}: o vencedor oficial está na lista visível → o 🏆 vai para a linha DELE (endereço + valor)`, () => {
      // ⚠️ Com sessão a lista são só os lances DESTA pessoa (`meusLances`): para a linha do
      // vencedor oficial estar visível, a sessão tem de ser a dele. O caso «lista de todos»
      // (sem sessão) está no teste seguinte.
      const lances = [
        { valor: 500, repetido: false, endereco: EU, txHash: "0x1" },
        { valor: 100, repetido: false, endereco: OUTRO, txHash: "0x2" },
      ];
      const html = renderizar({
        contexto: { lances, address: OUTRO, isConnected: true },
        resultadoOficial: OFICIAL_OUTRO_100,
        mobile,
      });
      assert.deepEqual(vencedoresNoEcra(html), ["1.00"]);
      assert.equal(trofeusNaLista(html), 2, "a linha vencedora tem 🏆 na posição e no selo — e mais nenhuma");
      assert.equal(valorMenorLance(html), "R$ 1.00");
    });

    test(`${nome}: mesma linha de valor mas OUTRO endereço NÃO leva 🏆 (não se assinala por aproximação)`, () => {
      // 100 existe na lista, mas é de EU — o oficial diz que o vencedor é OUTRO: ninguém é assinalado.
      const lances = [{ valor: 100, repetido: false, endereco: EU }];
      const html = renderizar({
        contexto: { lances, address: EU, isConnected: true },
        resultadoOficial: OFICIAL_OUTRO_100,
        mobile,
      });
      assert.equal(trofeusNaLista(html), 0);
      assert.deepEqual(vencedoresNoEcra(html), []);
      assert.equal(valorMenorLance(html), "R$ 1.00");
    });
  }

  test("sem sessão (lista de todos) com resultado oficial do OUTRO → o 🏆 vai para a linha oficial", () => {
    const lances = [
      { valor: 500, repetido: false, endereco: EU },
      { valor: 100, repetido: false, endereco: OUTRO },
    ];
    const html = renderizar({ contexto: { lances }, resultadoOficial: OFICIAL_OUTRO_100 });
    assert.deepEqual(vencedoresNoEcra(html), ["1.00"]);
    assert.equal(valorMenorLance(html), "R$ 1.00");
  });

  test("cablagem: a página pede o resultado da EDIÇÃO ACTIVA (não de outra)", () => {
    renderizar({ contexto: { lances: [] }, resultadoOficial: null });
    assert.deepEqual(edicoesPedidas(), ["R-1"],
      "a página não pediu (ou pediu mal) o resultado oficial — a edição tem de ser a activa");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("UTAC000.8 · normalizarResultadoOficial — só é «resultado» o que é utilizável", () => {
  test("edição por consolidar → null (não há vencedor publicado)", () => {
    assert.equal(normalizarResultadoOficial({ consolidado: false, vencedor: OUTRO, menorUnicoCentavos: 100 }), null);
  });

  test("endereço nulo (edição sem lance único) → null", () => {
    assert.equal(normalizarResultadoOficial({ consolidado: true, vencedor: ZERO, menorUnicoCentavos: 0 }), null);
  });

  test("menor único ilegível (null, NaN ou fraccionário) → null", () => {
    for (const v of [null, undefined, NaN, 1.5, "100"]) {
      assert.equal(normalizarResultadoOficial({ consolidado: true, vencedor: OUTRO, menorUnicoCentavos: v }), null,
        `aceitou menorUnicoCentavos=${String(v)}`);
    }
  });

  test("vencedor que não é um endereço de 20 bytes → null", () => {
    for (const v of ["", "abc", "0x1234", null]) {
      assert.equal(normalizarResultadoOficial({ consolidado: true, vencedor: v, menorUnicoCentavos: 100 }), null,
        `aceitou vencedor=${String(v)}`);
    }
  });

  test("entrada nula → null", () => {
    assert.equal(normalizarResultadoOficial(null), null);
    assert.equal(normalizarResultadoOficial(undefined), null);
  });

  test("resultado válido → normalizado (vencedor em minúsculas)", () => {
    assert.deepEqual(
      normalizarResultadoOficial({ consolidado: true, vencedor: OUTRO.toUpperCase(), menorUnicoCentavos: 100 }),
      { consolidado: true, vencedor: OUTRO, menorUnicoCentavos: 100 },
    );
  });
});
