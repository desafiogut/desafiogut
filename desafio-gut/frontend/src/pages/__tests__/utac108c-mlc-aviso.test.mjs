// utac108c-mlc-aviso.test.mjs — UTAC108c (D-1). O saldo verifica-se no DESTINO: no «Menor Lance Único»
// (`MercadoLances.jsx`) aparece «⚠️ Sem saldo. Carregar agora?» + «Carregar PIX →» (→ /carteira).
//
// Corre com:  node --test src/pages/__tests__/utac108c-mlc-aviso.test.mjs   (a partir de desafio-gut/frontend)
// A PÁGINA é renderizada a sério (arnês do `utac107d-mlc.test.mjs`): só o contexto, os recursos e o
// CardLance são duplos; o router é o duplo do 106c, que REGISTA as navegações.
// Decisões do operador: R18-A — só com saldo LIDO = R$ 0,00 (null = «não sei» ⇒ sem aviso);
// R18-B — nunca a contas corporativas (o saldo que lhes conta são senhas on-chain).
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = caminho(AQUI, "..", "..");
const STUBS = caminho(AQUI, "_stubs");
const STUBS_COMPONENTES = caminho(SRC, "components", "__tests__", "_stubs");
const RR = caminho(SRC, "__tests__", "_stubs-106c", "rr.jsx");

let React = null, renderToStaticMarkup = null, vite = null, Pagina = null, definirContexto = null;
let SemSaldoBanner = null, mostrarAvisoSemSaldo = null;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES,
        { find: /^\.\.\/context\/AppContext\.jsx$/,   replacement: `${STUBS}/AppContext.jsx` },
        { find: /^\.\.\/hooks\/useRecursosApp\.js$/,  replacement: `${STUBS}/useRecursosApp.js` },
        { find: /^\.\.\/components\/CardLance\.jsx$/, replacement: `${STUBS}/CardLance.jsx` },
        { find: /^dompurify$/, replacement: `${STUBS_COMPONENTES}/dompurify.js` },
        { find: /^react-router-dom$/, replacement: RR },
      ],
    },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  Pagina = (await vite.ssrLoadModule("/src/pages/MercadoLances.jsx")).default;
  ({ default: SemSaldoBanner, mostrarAvisoSemSaldo } = await vite.ssrLoadModule("/src/components/SemSaldoBanner.jsx"));
});
after(async () => { if (vite) await vite.close(); });

const EU = "0xaaaa000000000000000000000000000000000001";
function renderizar(extra = {}) {
  definirContexto({
    EDICAO_ATIVA: "R-1", modalidade: "flash", setModalidade: () => {},
    lances: [], prazoTimestamp: 0, encerrado: false, showOverlay: false,
    address: EU, isConnected: true, userLabel: "Eu", ready: true,
    vencedor: null, showCountdown: false,
    abrirModal: () => {}, desconectar: () => {},
    handleLanceSucesso: () => {}, handleNovaRodada: () => {},
    authToken: "tok", fecharOverlay: () => {},
    saldoRsCentavos: 0, saldoRsStatus: "ok", tipoProvavel: "comum",
    ...extra,
  });
  return renderToStaticMarkup(React.createElement(Pagina));
}
const AVISO = "Sem saldo. Carregar agora?";
const temAviso = (html) => html.includes(AVISO);

/** Está a posição `i` dentro de um elemento com a classe `gut-glass-standard`? (pilha de tags abertas) */
function dentroDeVidro(html, i) {
  const pilha = [];
  for (const m of html.slice(0, i).matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g)) {
    const [, fecha, tag, attrs, auto] = m;
    if (auto || /^(img|input|br|hr|meta|link|source|path|circle|rect)$/i.test(tag)) continue;
    if (fecha) { const k = pilha.map((p) => p.tag).lastIndexOf(tag); if (k >= 0) pilha.length = k; }
    else pilha.push({ tag, vidro: /gut-glass-standard/.test(attrs) });
  }
  return pilha.some((p) => p.vidro);
}

describe("UTAC108c · decisão pura `mostrarAvisoSemSaldo` (as três direcções)", () => {
  const C = { isConnected: true, saldoRsCentavos: 0, saldoRsStatus: "ok", tipoProvavel: "comum" };
  test("(a) positivo: saldo LIDO = 0 (ok e stale) ⇒ mostra", () => {
    assert.equal(mostrarAvisoSemSaldo(C), true);
    assert.equal(mostrarAvisoSemSaldo({ ...C, saldoRsStatus: "stale" }), true);
  });
  test("(b) negativo: saldo > 0 ⇒ não mostra", () => {
    for (const v of [1, 200, 123456]) assert.equal(mostrarAvisoSemSaldo({ ...C, saldoRsCentavos: v }), false, `saldo ${v}`);
  });
  test("(c) R18-A: saldo desconhecido (null/undefined, a carregar, erro, idle, sem login) ⇒ NÃO afirma «sem saldo»", () => {
    assert.equal(mostrarAvisoSemSaldo({ ...C, saldoRsCentavos: null }), false);
    assert.equal(mostrarAvisoSemSaldo({ ...C, saldoRsCentavos: undefined }), false);
    for (const s of ["loading", "error", "idle", undefined]) {
      assert.equal(mostrarAvisoSemSaldo({ ...C, saldoRsStatus: s }), false, `status ${s}`);
    }
    assert.equal(mostrarAvisoSemSaldo({ ...C, isConnected: false }), false);
  });
  test("(c) entradas inválidas não coagem: «0», false, NaN, -0 como texto", () => {
    for (const v of ["0", false, NaN, "", []]) {
      assert.equal(mostrarAvisoSemSaldo({ ...C, saldoRsCentavos: v }), false, `valor ${JSON.stringify(v)}`);
    }
    assert.equal(mostrarAvisoSemSaldo({ ...C, isConnected: "true" }), false, "isConnected só vale como booleano true");
  });
  test("R18-B: conta corporativa ⇒ não mostra", () => {
    assert.equal(mostrarAvisoSemSaldo({ ...C, tipoProvavel: "corporativo" }), false);
  });
  test("UTAC108c.1 (N3): modo «Programado» ⇒ nunca mostra, mesmo com saldo R$ lido = 0", () => {
    assert.equal(mostrarAvisoSemSaldo({ ...C, modalidade: "programado" }), false);
    assert.equal(mostrarAvisoSemSaldo({ ...C, modalidade: "programado", saldoRsStatus: "stale" }), false);
  });
  test("UTAC108c.1: modo «Relâmpago» (\"flash\") mantém a regra anterior (R18-A)", () => {
    assert.equal(mostrarAvisoSemSaldo({ ...C, modalidade: "flash" }), true);
    assert.equal(mostrarAvisoSemSaldo({ ...C, modalidade: "flash", saldoRsCentavos: 500 }), false);
    assert.equal(mostrarAvisoSemSaldo({ ...C, modalidade: "flash", saldoRsCentavos: null }), false);
    assert.equal(mostrarAvisoSemSaldo({ ...C, modalidade: "flash", tipoProvavel: "corporativo" }), false);
  });
});

describe("UTAC108c · o aviso na página REAL do Menor Lance Único", () => {
  test("saldo LIDO = 0 ⇒ o aviso aparece UMA vez, com o botão «Carregar PIX →»", () => {
    const html = renderizar();
    assert.ok(temAviso(html), "o aviso «Sem saldo» não está no ecrã");
    assert.equal(html.split(AVISO).length - 1, 1, "o aviso aparece mais de uma vez");
    assert.match(html, /Carregar PIX →/, "falta o botão «Carregar PIX →»");
  });

  test("Regra 1: o aviso está DENTRO de vidro (`gut-glass-standard`)", () => {
    const html = renderizar();
    assert.ok(dentroDeVidro(html, html.indexOf(AVISO)), "o aviso está FORA de vidro");
  });

  test("informa, não bloqueia: com o aviso, a edição (cabeçalho), o formulário e a tabela continuam lá; o aviso vem antes do lance", () => {
    const html = renderizar();
    const iAviso = html.indexOf(AVISO);
    const iLance = html.indexOf('data-stub="card-lance"');
    const iTabela = html.indexOf('data-testid="tabela-fim"');
    assert.ok(iLance > 0 && iTabela > 0, `a página perdeu blocos: lance=${iLance} tabela=${iTabela}`);
    assert.match(html, /Ganha o menor lance que ninguém repetir\./, "o cabeçalho da edição desapareceu");
    assert.ok(iAviso > 0 && iAviso < iLance, "o aviso não está no topo (antes do formulário do lance)");
    // N2 do validador: o aviso vive DENTRO do <main> (herda o padding/gap da coluna), não solto por cima.
    assert.ok(iAviso > html.indexOf("<main"), "o aviso está fora do <main>");
  });

  test("saldo > 0 ⇒ o aviso DESAPARECE", () => {
    assert.ok(!temAviso(renderizar({ saldoRsCentavos: 500 })));
    assert.ok(!temAviso(renderizar({ saldoRsCentavos: 1 })));
  });

  test("R18-A: saldo por ler / a carregar / sem login ⇒ sem aviso", () => {
    assert.ok(!temAviso(renderizar({ saldoRsCentavos: null, saldoRsStatus: "idle" })));
    assert.ok(!temAviso(renderizar({ saldoRsCentavos: 0, saldoRsStatus: "loading" })));
    assert.ok(!temAviso(renderizar({ isConnected: false, address: null, authToken: null, saldoRsCentavos: null, saldoRsStatus: "idle" })));
  });

  test("R18-B: conta corporativa (/corporativo/mercado) ⇒ sem aviso", () => {
    assert.ok(!temAviso(renderizar({ tipoProvavel: "corporativo" })));
  });

  test("UTAC108c.1 (N3): página no modo «Programado» com saldo R$ 0 ⇒ sem aviso; o formulário continua lá", () => {
    const html = renderizar({ modalidade: "programado" });
    assert.ok(!temAviso(html), "o aviso aparece no modo Programado");
    assert.ok(html.includes('data-stub="card-lance"'), "o formulário do lance desapareceu");
  });

  test("UTAC108c.1: a mesma página no modo «Relâmpago» com saldo R$ 0 ⇒ com aviso (controlo do caso acima)", () => {
    assert.ok(temAviso(renderizar({ modalidade: "flash" })));
  });
});

describe("UTAC108c · «Carregar PIX →» navega para /carteira", () => {
  test("o clique do botão regista a navegação para /carteira (e só essa)", () => {
    globalThis.__NAVEGADAS = [];
    // O duplo do router é uma função simples (não um hook) ⇒ o componente pode ser chamado directamente
    // para obter a árvore de elementos e accionar o `onClick` real.
    const el = SemSaldoBanner();
    const filhos = [].concat(el.props.children);
    const botao = filhos.find((n) => n && n.type === "button");
    assert.ok(botao, "o aviso não tem botão");
    assert.match(String([].concat(botao.props.children).join("")), /Carregar PIX/);
    // N1 do validador: o `onClick()` chamado à mão passaria com o botão desactivado — medir as props.
    assert.ok(!botao.props.disabled && !botao.props.hidden, "«Carregar PIX» desactivado/escondido");
    assert.notEqual(botao.props.style?.pointerEvents, "none", "«Carregar PIX» ignora cliques");
    assert.notEqual(botao.props.style?.display, "none", "«Carregar PIX» escondido");
    assert.notEqual(el.props.style?.display, "none", "o aviso inteiro está escondido (display:none)");
    assert.ok(!el.props.hidden, "o aviso inteiro está `hidden`");
    botao.props.onClick();
    assert.deepEqual(globalThis.__NAVEGADAS, ["/carteira"]);
  });
});
