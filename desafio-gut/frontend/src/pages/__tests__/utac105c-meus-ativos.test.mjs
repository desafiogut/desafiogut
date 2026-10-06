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

/**
 * Quantos 🏆 a LISTA de lances desenha (entre os filtros e o rodapé regulamentar). Uma linha
 * vencedora desenha DOIS — o da posição/avatar e o do selo. Achado do validador (SEG4): o selo
 * sozinho deixava passar o defeito reposto só na célula da posição.
 */
function trofeusNaLista(html) {
  const ini = html.indexOf("Filtrar:");
  const fim = html.indexOf("Art. 25", ini);
  assert.ok(ini >= 0 && fim > ini, "controlo: não encontrei a lista de lances na página");
  return html.slice(ini, fim).split("🏆").length - 1;
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
      assert.equal(trofeusNaLista(html), 0, "há um 🏆 na lista de quem não está a ganhar");
    });

    test(`${nome}: o meu menor único não é o 1.º que dei → o 🏆 vai para ELE`, () => {
      const lances = [
        { valor: 300, repetido: false, endereco: EU },
        { valor: 100, repetido: false, endereco: EU },
      ];
      const html = renderizar({ contexto: { lances, address: EU, isConnected: true }, mobile });
      // ⚠️ UTAC107e.1 (V2): sem resultado oficial NINGUÉM leva 🏆 — nem o 1.º lance dado (o defeito
      // que o UTAC105c fechou) nem o menor único local. Com oficial: `utac0008-resultado-oficial`.
      assert.deepEqual(vencedoresNoEcra(html), []);
      assert.equal(trofeusNaLista(html), 0, "há 🏆 sem resultado oficial (V2)");
    });

    test(`${nome}: um lance repetido mais baixo não conta — vence o menor ÚNICO`, () => {
      const lances = [
        { valor: 50,  repetido: true,  endereco: EU },
        { valor: 50,  repetido: true,  endereco: OUTRO },
        { valor: 200, repetido: false, endereco: EU },
      ];
      const html = renderizar({ contexto: { lances, address: EU, isConnected: true }, mobile });
      assert.deepEqual(vencedoresNoEcra(html), []); // V2
      assert.equal(trofeusNaLista(html), 0);
    });

    test(`${nome}: sem sessão, a lista de todos mostra o 🏆 no menor único (não regride)`, () => {
      const lances = [
        { valor: 500, repetido: false, endereco: EU },
        { valor: 100, repetido: false, endereco: OUTRO },
      ];
      const html = renderizar({ contexto: { lances }, mobile });
      assert.deepEqual(vencedoresNoEcra(html), []); // V2
      assert.equal(trofeusNaLista(html), 0);
    });
  }

  test("só lances repetidos → ninguém leva 🏆", () => {
    const lances = [
      { valor: 50, repetido: true, endereco: EU },
      { valor: 50, repetido: true, endereco: OUTRO },
    ];
    const html = renderizar({ contexto: { lances, address: EU, isConnected: true } });
    assert.deepEqual(vencedoresNoEcra(html), []);
    assert.equal(trofeusNaLista(html), 0);
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

// ═══ UTAC107g (Frente B) — «Meus Ativos» é a casa das senhas antigas (Via A) ══════════════════
// Discreta (R18-D): contagem + onde se usam, SEM botão. `saldoSenhas` é uma contagem do contexto.
describe("UTAC107g · Meus Ativos — secção «Senhas antigas»", () => {
  const SESSAO = { address: "0xaaaa000000000000000000000000000000000001", isConnected: true };

  /** O HTML só da secção `data-secao="senhas-antigas"`. */
  function secao(html) {
    const m = html.match(/<section[^>]*data-secao="senhas-antigas"[\s\S]*?<\/section>/);
    assert.ok(m, "a secção «Senhas antigas» não existe na página");
    return m[0];
  }
  const estadoDe = (s) => s.match(/data-estado="([^"]+)"/)?.[1];

  test("com senhas > 0: contagem + onde se usam, e NENHUM botão (não promove a Via A)", () => {
    const s = secao(renderizar({ contexto: { ...SESSAO, saldoSenhas: 3, saldoSenhasStatus: "ok" } }));
    assert.equal(estadoDe(s), "dados");
    assert.match(texto(s), /Tens 3 senhas antigas\s?\./ /* o `texto()` troca </strong> por espaço */);
    assert.match(texto(s), /Lance Programado do Menor Lance Único/);
    assert.doesNotMatch(s, /<button|<a\b/, "a secção ganhou um botão/link (R18-D: só texto)");
  });

  test("singular: 1 → «1 senha antiga»", () => {
    const s = secao(renderizar({ contexto: { ...SESSAO, saldoSenhas: 1, saldoSenhasStatus: "ok" } }));
    assert.match(texto(s), /Tens 1 senha antiga\s?\./);
  });

  test("0 senhas → «Não tens senhas antigas» (sem número inventado)", () => {
    const s = secao(renderizar({ contexto: { ...SESSAO, saldoSenhas: 0, saldoSenhasStatus: "ok" } }));
    assert.equal(estadoDe(s), "vazio");
    assert.match(texto(s), /Não tens senhas antigas\./);
  });

  test("sem sessão / a carregar / erro: não afirma nenhuma contagem", () => {
    const casos = [
      [{}, "sem-sessao"],
      [{ ...SESSAO, saldoSenhas: null, saldoSenhasStatus: "loading" }, "carregando"],
      [{ ...SESSAO, saldoSenhas: 9, saldoSenhasStatus: "error" }, "erro"],
    ];
    for (const [contexto, esperado] of casos) {
      const s = secao(renderizar({ contexto }));
      assert.equal(estadoDe(s), esperado, JSON.stringify(contexto));
      assert.doesNotMatch(texto(s), /\d/, `${esperado}: a secção mostra um número`);
    }
  });

  test("estadoSenhasAntigas — sem coerção (null/«3»/1.5/-1/NaN nunca viram contagem)", async () => {
    const { estadoSenhasAntigas } = await vite.ssrLoadModule("/src/pages/MeusAtivos.jsx");
    const e = (saldoSenhas, saldoSenhasStatus = "ok", temSessao = true) =>
      estadoSenhasAntigas({ temSessao, saldoSenhas, saldoSenhasStatus }).estado;
    assert.equal(e(5), "dados");
    assert.equal(e(5, "stale"), "dados", "um valor antigo conhecido continua a ser um número");
    assert.equal(e(0), "vazio");
    assert.equal(e(null, "idle"), "carregando");
    assert.equal(e(null, "ok"), "erro");
    for (const v of ["3", 1.5, -1, NaN, undefined]) assert.equal(e(v), "erro", String(v));
    assert.equal(e(5, "ok", false), "sem-sessao");
  });
});
