// utac105c-meus-ativos.test.mjs — UTAC105c. Renderiza a PÁGINA `MeusAtivos` a sério.
//
// Corre com:  node --test src/pages/__tests__/utac105c-meus-ativos.test.mjs
// (a partir de desafio-gut/frontend)
//
// FRENTE B — o 🏆 «Menor e Único» só pode ir para o menor lance único DA EDIÇÃO.
// O defeito: com sessão, a lista são os lances da pessoa, sem ordenar, e o 🏆 ia para o
// 1.º pela ordem de chegada — quem não estava a ganhar lia que estava.
//
// FRENTES D/E — as secções «Meus cupons» e «Meus palpites» existem e dizem que AINDA NÃO
// EXISTEM (placeholders declarados): não afirmam nada sobre a pessoa.
//
// Arnês: o mesmo do `MeusAtivos.test.mjs` (Vite SSR + duplos do contexto e dos hooks por
// `resolve.alias`). O `_render.mjs` não serve aqui: não troca o `AppContext`, e a lista de
// lances é uma função LOCAL da página. Nenhum ficheiro do projeto é alterado para o teste.

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
        { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS}/BotaoLoginPrincipal.jsx` },
      ],
    },
  });
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  ({ definirHooks } = await vite.ssrLoadModule(`${STUBS}/hooks.js`));
  Pagina = (await vite.ssrLoadModule("/src/pages/MeusAtivos.jsx")).default;
});

after(async () => { if (vite) await vite.close(); });

/**
 * Renderiza a página. `mobile` liga o ramo `MobileList` (o `useIsMobile` lê
 * `window.matchMedia` no estado inicial, que o SSR executa); sem ele sai a `DesktopTable`.
 */
function renderizar({ contexto = {}, mobile = false } = {}) {
  definirContexto({
    lances: [], address: null, isConnected: false, abrirModal: () => {},
    EDICAO_ATIVA: "R-1", authToken: null, ...contexto,
  });
  definirHooks({
    ranking:  { ranking: [], total: 0, carregando: false, erro: null },
    feedback: { feedback: null, carregando: false, erro: null, semSessao: true },
  });
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

/** Valores (em «R$ x.xx») a que a página dá o selo «🏆 Menor e Único». */
function vencedoresNoEcra(html) {
  return [...texto(html).matchAll(/R\$ (\d+\.\d{2}) 🏆 Menor e Único/g)].map((m) => m[1]);
}

const EU    = "0xaaaa000000000000000000000000000000000001";
const OUTRO = "0xbbbb000000000000000000000000000000000002";

const LAYOUTS = [["desktop", false], ["mobile", true]];

// ───────────────────────────────────────────────────────────────────────────
describe("UTAC105c · Frente B — o 🏆 vai para o menor lance único DA EDIÇÃO", () => {
  for (const [nome, mobile] of LAYOUTS) {
    test(`${nome}: outra pessoa tem o menor único → o meu lance NÃO leva 🏆`, () => {
      const lances = [
        { valor: 500, repetido: false, endereco: EU },
        { valor: 100, repetido: false, endereco: OUTRO },
      ];
      const html = renderizar({ contexto: { lances, address: EU, isConnected: true }, mobile });
      assert.ok(texto(html).includes("R$ 5.00"), "controlo: o meu lance tem de estar na lista");
      assert.deepEqual(vencedoresNoEcra(html), [],
        "a página diz «Menor e Único» a quem não está a ganhar");
    });

    test(`${nome}: o meu menor único não é o 1.º que dei → o 🏆 vai para ELE`, () => {
      const lances = [
        { valor: 300, repetido: false, endereco: EU },
        { valor: 100, repetido: false, endereco: EU },
      ];
      const html = renderizar({ contexto: { lances, address: EU, isConnected: true }, mobile });
      assert.deepEqual(vencedoresNoEcra(html), ["1.00"]);
    });

    test(`${nome}: um lance repetido mais baixo não conta — vence o menor ÚNICO`, () => {
      const lances = [
        { valor: 50,  repetido: true,  endereco: EU },
        { valor: 50,  repetido: true,  endereco: OUTRO },
        { valor: 200, repetido: false, endereco: EU },
      ];
      const html = renderizar({ contexto: { lances, address: EU, isConnected: true }, mobile });
      assert.deepEqual(vencedoresNoEcra(html), ["2.00"]);
    });

    test(`${nome}: sem sessão, a lista de todos mostra o 🏆 no menor único (não regride)`, () => {
      const lances = [
        { valor: 500, repetido: false, endereco: EU },
        { valor: 100, repetido: false, endereco: OUTRO },
      ];
      const html = renderizar({ contexto: { lances }, mobile });
      assert.deepEqual(vencedoresNoEcra(html), ["1.00"]);
    });
  }

  test("só lances repetidos → ninguém leva 🏆", () => {
    const lances = [
      { valor: 50, repetido: true, endereco: EU },
      { valor: 50, repetido: true, endereco: OUTRO },
    ];
    const html = renderizar({ contexto: { lances, address: EU, isConnected: true } });
    assert.deepEqual(vencedoresNoEcra(html), []);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("UTAC105c · Frentes D/E — placeholders declarados", () => {
  test("a secção «Meus cupons» existe e declara que ainda não está disponível", () => {
    const html = renderizar({ contexto: { address: EU, isConnected: true } });
    const secao = html.match(/<section[^>]*data-secao="meus-cupons"[\s\S]*?<\/section>/);
    assert.ok(secao, "a secção de cupons não está na página");
    const t = texto(secao[0]);
    assert.match(t, /Meus cupons/);
    assert.match(t, /ainda não (está|estão) disponíve/i, "o placeholder tem de se declarar");
    assert.match(secao[0], /data-estado="placeholder"/);
  });

  test("a secção «Meus palpites» existe e declara que ainda não está disponível", () => {
    const html = renderizar({ contexto: { address: EU, isConnected: true } });
    const secao = html.match(/<section[^>]*data-secao="meus-palpites"[\s\S]*?<\/section>/);
    assert.ok(secao, "a secção de palpites não está na página");
    const t = texto(secao[0]);
    assert.match(t, /Meus palpites/);
    assert.match(t, /ainda não (está|estão) disponíve/i, "o placeholder tem de se declarar");
    assert.match(secao[0], /data-estado="placeholder"/);
  });

  test("os placeholders não inventam números sobre a pessoa (nem com sessão, nem sem)", () => {
    for (const contexto of [{}, { address: EU, isConnected: true }]) {
      const html = renderizar({ contexto });
      for (const id of ["meus-cupons", "meus-palpites"]) {
        const secao = html.match(new RegExp(`<section[^>]*data-secao="${id}"[\\s\\S]*?</section>`))[0];
        assert.doesNotMatch(texto(secao), /\d/, `«${id}» mostra um número que ninguém mediu`);
      }
    }
  });
});
