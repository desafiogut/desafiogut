// utac0010-mercado-vencedor.test.mjs — UTAC000.10 (DEBT-009).
//
// node --test --test-concurrency=1 src/pages/__tests__/utac0010-mercado-vencedor.test.mjs
//   (a partir de desafio-gut/frontend)
//
// O QUE SE PROVA
//   O `OverlayVencedor` do `MercadoLances` mostra o VENCEDOR QUE O CONTEXTO LHE DÁ — e não um
//   vencedor re-derivado dos `lances` locais. É a outra metade da travessia: o `AppContext`
//   (UTAC000.10) passa a expor o resultado OFICIAL; este teste garante que a página o mostra
//   tal como vem, sem recalcular nada por conta própria.
//
// ⚠️ CASO DISCRIMINANTE: o `vencedor` do contexto (o OFICIAL) é DIFERENTE do que sairia da lista
// local (`lances`). Se a página voltar a derivar dos `lances`, o teste fica VERMELHO.
//
// ARNÊS: Vite SSR + `_ponte-ssr.mjs` (A12). Duplos por `resolve.alias` — nenhum ficheiro de
// produção é alterado para o teste.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");
const STUBS_COMPONENTES = caminho(AQUI, "..", "..", "components", "__tests__", "_stubs");

let React = null;
let renderToStaticMarkup = null;
let vite = null;
let Pagina = null;
let definirContexto = null;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES,
        { find: /^\.\.\/context\/AppContext\.jsx$/,   replacement: `${STUBS}/AppContext.jsx` },
        { find: /^\.\.\/hooks\/useRecursosApp\.js$/,  replacement: `${STUBS}/useRecursosApp.js` },
        { find: /^\.\.\/components\/CardLance\.jsx$/, replacement: `${STUBS}/CardLance.jsx` },
        // O `sanitize.js` real corre; só a biblioteca é substituída (o default do UMD `dompurify`
        // não sobrevive ao interop do Vite SSR — medido no UTAC000.9).
        { find: /^dompurify$/, replacement: `${STUBS_COMPONENTES}/dompurify.js` },
      ],
    },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  Pagina = (await vite.ssrLoadModule("/src/pages/MercadoLances.jsx")).default;
});

after(async () => { if (vite) await vite.close(); });

const EU    = "0xaaaa000000000000000000000000000000000001";
const OUTRO = "0xbbbb000000000000000000000000000000000002";
const abrev = (e) => `${e.slice(0, 10)}...${e.slice(-6)}`;

/** Contexto mínimo com as MESMAS chaves que a página desestrutura (l.153-166). */
function contexto(extra = {}) {
  return {
    EDICAO_ATIVA: "R-1",
    modalidade: "onchain", setModalidade: () => {},
    lances: [], prazoTimestamp: 0, encerrado: true, showOverlay: false,
    address: null, isConnected: false, userLabel: null, ready: true,
    vencedor: null, showCountdown: false,
    abrirModal: () => {}, desconectar: () => {},
    handleLanceSucesso: () => {}, handleNovaRodada: () => {},
    ...extra,
  };
}

function renderizar(extra = {}) {
  definirContexto(contexto(extra));
  return renderToStaticMarkup(React.createElement(Pagina));
}

const contar = (s, alvo) => s.split(alvo).length - 1;

/**
 * Recorta o BLOCO do overlay de fim de rodada (`Carteira Vencedora` → botão `Nova Rodada`).
 * ⚠️ Sem isto o assert media a PÁGINA INTEIRA — e a tabela de lances mostra legitimamente o valor
 * do lance local (`R$ 1.00`), o que fez a 1.ª versão do caso discriminante falhar por defeito do
 * MEU instrumento, não do código (a mesma classe de erro do UTAC000.9).
 */
function blocoDoOverlay(html) {
  const ini = html.indexOf("Carteira Vencedora");
  assert.ok(ini >= 0, "não encontrei o bloco do vencedor no overlay");
  const fim = html.indexOf("Nova Rodada", ini);
  return html.slice(ini, fim >= 0 ? fim : undefined);
}

describe("UTAC000.10 · MercadoLances — o overlay mostra o vencedor DO CONTEXTO (nunca re-derivado)", () => {
  // O contexto traz o vencedor OFICIAL (300, EU). A lista local tem OUTRO lance (100, OUTRO) —
  // cujo «menor único» seria OUTRO. Se a página derivasse da lista, mostrava OUTRO/1.00.
  const LANCES_LOCAIS = [{ endereco: OUTRO, valor: 100, repetido: false, txHash: "0x1" }];

  test("overlay de fim de rodada: mostra o vencedor do CONTEXTO (endereço + valor)", () => {
    const html = renderizar({
      showOverlay: true,
      vencedor: { endereco: EU, valor: 300 },
      lances: LANCES_LOCAIS,
    });
    assert.ok(html.includes("EDIÇÃO ENCERRADA"), "controlo: o overlay não foi renderizado");
    const bloco = blocoDoOverlay(html);
    assert.equal(contar(bloco, abrev(EU)), 1, "o overlay não mostrou o endereço do vencedor do contexto");
    assert.ok(bloco.includes("R$ 3.00"), "o overlay não mostrou o valor do vencedor do contexto");
  });

  test("⚠️ NÃO re-deriva dos lances locais (o caso discriminante)", () => {
    const html = renderizar({
      showOverlay: true,
      vencedor: { endereco: EU, valor: 300 },
      lances: LANCES_LOCAIS,
    });
    const bloco = blocoDoOverlay(html);
    assert.equal(contar(bloco, abrev(OUTRO)), 0,
      "o overlay mostrou o vencedor apurado da LISTA LOCAL (o defeito da DEBT-009 voltou)");
    assert.ok(!bloco.includes("R$ 1.00"), "o overlay mostrou o valor apurado da lista local");
  });

  test("sem vencedor no contexto: o overlay declara que não há lance único (não inventa)", () => {
    const html = renderizar({ showOverlay: true, vencedor: null, lances: LANCES_LOCAIS });
    assert.ok(html.includes("Nenhum lance único registrado"),
      "o overlay deveria declarar a ausência de vencedor em vez de apurar um da lista local");
    assert.equal(contar(html, abrev(OUTRO)), 0, "inventou um vencedor a partir da lista local");
  });

  test("sem `showOverlay` não há overlay nenhum (o gate do contexto manda)", () => {
    const html = renderizar({ showOverlay: false, vencedor: { endereco: EU, valor: 300 } });
    assert.ok(!html.includes("EDIÇÃO ENCERRADA"), "o overlay apareceu sem o contexto o pedir");
  });
});
