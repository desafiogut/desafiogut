// utac107d-mlc.test.mjs — UTAC107d. Aba «Menor Lance Único» (`MercadoLances.jsx`) segundo o mockup
// `docs/mockups-107a/menor-lance-unico.html` (variante A) e as decisões R18-A..D do operador.
//
// Corre com:  node --test src/pages/__tests__/utac107d-mlc.test.mjs   (a partir de desafio-gut/frontend)
// A PÁGINA é renderizada a sério (mesmo arnês do `utac0010-mercado-vencedor.test.mjs`): o GlassHeader
// e a TabelaLances são os REAIS; só o contexto, os recursos e o CardLance são duplos. O rótulo do campo
// vive no CardLance (que importa o SDK do Privy) — esse prova-se pela fonte, sem comentários.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = caminho(AQUI, "..", "..");
const STUBS = caminho(AQUI, "_stubs");
const STUBS_COMPONENTES = caminho(SRC, "components", "__tests__", "_stubs");
const ler = (p) => readFileSync(caminho(SRC, p), "utf8");

/** Fonte sem comentários (JSX, bloco, linha) — lição do MC99: um guarda que lê comentários mede a menção. */
const codigo = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

let React = null, renderToStaticMarkup = null, vite = null, Pagina = null, definirContexto = null;

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
      ],
    },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  Pagina = (await vite.ssrLoadModule("/src/pages/MercadoLances.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const EU = "0xaaaa000000000000000000000000000000000001";
function renderizar(extra = {}) {
  definirContexto({
    EDICAO_ATIVA: "R-1", modalidade: "onchain", setModalidade: () => {},
    lances: [], prazoTimestamp: 0, encerrado: false, showOverlay: false,
    address: null, isConnected: false, userLabel: null, ready: true,
    vencedor: null, showCountdown: false,
    abrirModal: () => {}, desconectar: () => {},
    handleLanceSucesso: () => {}, handleNovaRodada: () => {},
    authToken: null, fecharOverlay: () => {},
    ...extra,
  });
  return renderToStaticMarkup(React.createElement(Pagina));
}
const texto = (h) => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

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

describe("UTAC107d · Menor Lance Único", () => {
  test("SEG2 · a frase antiga «Quanto você oferta…» saiu (fonte e ecrã)", () => {
    const html = renderizar();
    assert.doesNotMatch(texto(html), /Quanto você oferta/i, "a frase antiga continua no ecrã");
    assert.doesNotMatch(codigo(ler("pages/MercadoLances.jsx")), /Quanto você oferta/i,
      "a frase antiga continua no código da página");
  });

  test("SEG2/R18-A · a frase do mockup aparece UMA vez, DENTRO de vidro (Regra 1)", () => {
    const html = renderizar();
    const alvo = "Ganha o menor lance que ninguém repetir.";
    const i = html.indexOf(alvo);
    assert.ok(i > 0, "a frase do mockup não está no ecrã");
    assert.equal(html.split(alvo).length - 1, 1, "a frase aparece mais de uma vez");
    assert.ok(dentroDeVidro(html, i), "a frase está FORA de vidro");
  });

  test("controlo positivo: o detector de vidro vê texto fora de vidro", () => {
    const h = '<div class="gut-glass-standard"><p>dentro</p></div><p>fora</p>';
    assert.equal(dentroDeVidro(h, h.indexOf("dentro")), true);
    assert.equal(dentroDeVidro(h, h.indexOf("fora")), false);
  });

  test("SEG5 · Regra 1: nenhum texto do corpo da página fora de vidro (excepções: botões, rodapé)", () => {
    const html = renderizar({ lances: [{ endereco: EU, valor: null, oculto: true }] });
    // Fora da contagem: o CSS de `<style>` (não é texto visível) e o DUPLO do CardLance (o real é um
    // `Card` = `.gut-glass-standard`, `ui/card.jsx`).
    const corpo = html.slice(0, html.indexOf("<footer"))
      .replace(/<style>[\s\S]*?<\/style>/g, "")
      .replace(/<div data-stub="card-lance"[\s\S]*?<\/div>/, "");
    const fora = [];
    for (const m of corpo.matchAll(/>([^<>]*[A-Za-zÀ-ú0-9🔒][^<>]*)</g)) {
      const t = m[1].trim();
      if (!t) continue;
      const i = m.index + 1;
      const antes = corpo.slice(0, i);
      const emBotao = antes.lastIndexOf("<button") > antes.lastIndexOf("</button>");
      if (!emBotao && !dentroDeVidro(corpo, i)) fora.push(t);
    }
    assert.deepEqual(fora, [], `textos fora de vidro: ${JSON.stringify(fora)}`);
  });

  test("SEG4 · a tabela é o ÚLTIMO bloco antes do rodapé, em coluna única", () => {
    const html = renderizar();
    const iTabela = html.indexOf('data-testid="tabela-fim"');
    // UTAC108e.1 — sem edição (EM_BREVE real ligado neste arnês) o lance é o formulário DESLIGADO do cartão.
    const iLance = Math.max(html.indexOf('data-stub="card-lance"'), html.indexOf('data-testid="lance-desativado"'));
    const iFooter = html.indexOf("<footer");
    assert.ok(iTabela > 0 && iLance > 0 && iFooter > 0, `marcas em falta: tabela=${iTabela} lance=${iLance} rodapé=${iFooter}`);
    assert.ok(iLance < iTabela && iTabela < iFooter, "a tabela não está depois do lance e antes do rodapé");
    assert.doesNotMatch(html.slice(iTabela, iFooter), /<section/, "há outra secção entre a tabela e o rodapé");
    assert.match(codigo(ler("pages/MercadoLances.jsx")), /gridTemplateColumns: "1fr"/, "o MLC continua em 2 colunas");
  });

  test("SEG4/R18-D · tabela com 3 colunas (#, Participante, Valor) — sem «ID do Lance» nem «Status»", () => {
    const html = renderizar({ lances: [{ endereco: EU, valor: 5, repetido: false }] });
    const ths = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => texto(m[1]));
    assert.equal(ths.length, 3, `colunas: ${JSON.stringify(ths)}`);
    assert.equal(ths[0], "#"); assert.equal(ths[1], "Participante"); assert.match(ths[2], /^Valor/);
    assert.doesNotMatch(texto(html), /ID do Lance|Status \(Art\. 24\)|Dados sanitizados/);
  });

  test("Regra 2 · o vidro da tabela é o padrão (0,88 · r14 · sem blur)", () => {
    const html = renderizar();
    const i = html.indexOf('data-testid="tabela-fim"');
    // ⚠️ `i` aponta para DENTRO da tag <section> (o atributo); o 1.º `<div` a seguir é a raiz da tabela.
    const raiz = html.slice(i).match(/^[^>]*>\s*<div([^>]*)>/)?.[1] ?? "";
    assert.match(raiz, /class="gut-glass-standard"/, "o vidro da tabela não é o `.gut-glass-standard`");
    assert.doesNotMatch(raiz, /background|border-radius|backdrop/i, "a tabela sobrepõe estilo ao vidro padrão");
    const t = codigo(ler("components/TabelaLances.jsx"));
    assert.doesNotMatch(t, /backdropFilter|backdrop-filter/i, "a tabela voltou a ter blur");
  });

  test("SEG1/R18-B · envelope do vidro superior = Carteira (lado/topo 1rem|2rem, interior 20 px)", () => {
    const g = codigo(ler("components/glass/GlassHeader.jsx"));
    assert.match(g, /padding: isMobile \? "1rem 1rem 0" : "2rem 2rem 0"/, "contentor exterior ≠ Carteira");
    assert.doesNotMatch(g, /px-8/, "o interior voltou a 32 px (px-8)");
    const c = codigo(ler("pages/MinhaCarteira.jsx"));
    assert.match(c, /const pad\s*= isMobile \? "1rem" : "2rem";/, "controlo: a Carteira mudou de envelope");
  });

  test("SEG3/R18-C · rótulo VISÍVEL «Seu lance (em centavos)» ligado ao campo; unidade = centavos", () => {
    const c = codigo(ler("components/CardLance.jsx"));
    const label = c.match(/<label\s+htmlFor=\{(\w+)\}[^>]*>([^<]+)<\/label>/);
    assert.ok(label, "o <label> do lance não está ligado ao campo (htmlFor)");
    assert.equal(label[2].trim(), "Seu lance (em centavos)");
    const input = c.slice(c.indexOf(label[0])).match(/<input[\s\S]*?\/>/)?.[0] ?? "";
    assert.match(input, new RegExp(`id=\\{${label[1]}\\}`), "o <input> não tem o id do rótulo");
    assert.match(input, /inputMode="numeric"/, "falta o teclado numérico (centavos são inteiros)");
    assert.match(input, /placeholder="Ex: 5 = R\$ 0,05"/, "o placeholder em centavos mudou");
    assert.doesNotMatch(label[2], /R\$/, "o rótulo diz R$ com o campo em centavos (licita 100× menos)");
  });
});
