// utac108d-mlc-sempre.test.mjs — UTAC108d. A vista real do «Menor Lance Único» aparece SEMPRE: sem edição a
// correr (EM_BREVE_MODE ligado) já não há herói «EM BREVE» — há o estado vazio «⏳ Nenhuma edição em andamento.
// Volte quando houver.», em vidro, no topo do <main>; o resto da vista (frase, formulário, tabela) fica.
//
// Corre com:  node --test src/pages/__tests__/utac108d-mlc-sempre.test.mjs   (a partir de desafio-gut/frontend)
// Arnês do `utac107d-mlc.test.mjs` (página REAL; GlassHeader e TabelaLances REAIS) + duplo controlável do
// `leilaoLock` (o real é uma constante `true`). Decisões do operador (R18 do 108d): A — trocar o herói (o early
// return das LOJAS, `!isLeilaoAtivo` → conformidade, fica intacto); B — o sinal «sem edição» é o EM_BREVE_MODE.
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
const codigo = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

let React = null, renderToStaticMarkup = null, vite = null, Pagina = null, definirContexto = null, definirEmBreve = null;

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
        { find: /^\.\.\/lib\/leilaoLock\.js$/,        replacement: `${STUBS}/leilaoLock.js` },
        { find: /^dompurify$/, replacement: `${STUBS_COMPONENTES}/dompurify.js` },
        // o «Sem saldo» (108c) usa `useNavigate`: fora de <Router> é o duplo que regista navegações.
        { find: /^react-router-dom$/, replacement: caminho(SRC, "__tests__", "_stubs-106c", "rr.jsx") },
      ],
    },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  ({ definirEmBreve } = await vite.ssrLoadModule(`${STUBS}/leilaoLock.js`));
  Pagina = (await vite.ssrLoadModule("/src/pages/MercadoLances.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const EU = "0xaaaa000000000000000000000000000000000001";
function renderizar({ emBreve = true, ...extra } = {}) {
  definirEmBreve(emBreve);
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
const texto = (h) => h.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const VAZIO = "Nenhuma edição em andamento.";
const SEM_SALDO = "Sem saldo. Carregar agora?";

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

describe("UTAC108d · sem edição a correr (EM_BREVE_MODE ligado)", () => {
  test("(a) o herói «EM BREVE» saiu: o título em maiúsculas não aparece em lado nenhum da página", () => {
    const t = texto(renderizar());
    const i = t.search(/EM BREVE/);
    assert.equal(i, -1, `a página ainda mostra «EM BREVE»: …${t.slice(Math.max(0, i - 80), i + 40)}…`);
  });

  test("RESÍDUO DECLARADO: a pílula do prazo da TabelaLances («🕒 Em breve») continua (componente fora do escopo)", () => {
    // Não é o herói: é o selo do prazo no cabeçalho da tabela (`TabelaLances.jsx`). Fica à vista para decisão
    // do operador; se um UTAC futuro a tirar, este teste passa a falhar e tem de ser actualizado de propósito.
    assert.match(texto(renderizar()), /🕒 Em breve/);
  });

  test("(b) o estado vazio aparece UMA vez, com as duas frases, dentro de vidro", () => {
    const html = renderizar();
    const i = html.indexOf(VAZIO);
    assert.ok(i > 0, "faltou «Nenhuma edição em andamento.»");
    assert.equal(html.split(VAZIO).length - 1, 1, "o estado vazio aparece mais de uma vez");
    assert.match(html, /Volte quando houver\./);
    assert.ok(dentroDeVidro(html, i), "o estado vazio está FORA de vidro (Regra 1)");
  });

  test("(b) no topo do <main>, antes do formulário do lance", () => {
    const html = renderizar();
    const iMain = html.indexOf("<main"), iVazio = html.indexOf(VAZIO), iLance = html.indexOf('data-stub="card-lance"');
    assert.ok(iMain > 0 && iMain < iVazio && iVazio < iLance, `ordem errada: main=${iMain} vazio=${iVazio} lance=${iLance}`);
  });

  test("a vista real fica inteira: frase do mockup, seletor de modo, formulário e tabela (vazia, sem rebentar)", () => {
    const html = renderizar({ lances: [] });
    assert.match(html, /Ganha o menor lance que ninguém repetir\./, "faltou a frase do mockup");
    assert.match(html, /Relâmpago/, "faltou o seletor de modo");
    assert.ok(html.includes('data-stub="card-lance"'), "o formulário do lance desapareceu");
    assert.ok(html.includes('data-testid="tabela-fim"'), "a tabela desapareceu");
    assert.doesNotMatch(texto(html), /Edições na versão Web/, "caiu na vista de conformidade das lojas");
  });

  test("(c) com saldo LIDO = 0, o «Sem saldo» NÃO aparece (os dois avisos nunca juntos)", () => {
    const html = renderizar({ saldoRsCentavos: 0, saldoRsStatus: "ok" });
    assert.ok(!html.includes(SEM_SALDO), "o «Sem saldo» apareceu sem edição a correr");
  });
});

describe("UTAC108d · com edição a correr (EM_BREVE_MODE desligado)", () => {
  test("sem estado vazio; com saldo 0 aparece o «Sem saldo» (108c mantém-se)", () => {
    const html = renderizar({ emBreve: false });
    assert.ok(!html.includes(VAZIO), "o estado vazio apareceu com edição a correr");
    assert.ok(html.includes(SEM_SALDO), "o «Sem saldo» desapareceu com edição + saldo 0");
  });

  test("com saldo > 0: nenhum dos dois avisos", () => {
    const html = renderizar({ emBreve: false, saldoRsCentavos: 500 });
    assert.ok(!html.includes(VAZIO) && !html.includes(SEM_SALDO));
  });

  test("o mockup do 107d mantém-se: frase, formulário e tabela como último bloco antes do rodapé", () => {
    const html = renderizar({ emBreve: false, lances: [{ endereco: EU, valor: 5, repetido: false }] });
    const iLance = html.indexOf('data-stub="card-lance"'), iTabela = html.indexOf('data-testid="tabela-fim"'), iFooter = html.indexOf("<footer");
    assert.match(html, /Ganha o menor lance que ninguém repetir\./);
    assert.ok(iLance > 0 && iLance < iTabela && iTabela < iFooter, "a ordem lance → tabela → rodapé partiu");
  });
});

describe("UTAC108d · o que NÃO mudou (R18-A)", () => {
  test("o early return das LOJAS continua lá (`!isLeilaoAtivo` → vista de conformidade) e o esqueleto também", () => {
    const c = codigo(ler("pages/MercadoLances.jsx"));
    assert.match(c, /if \(!isLeilaoAtivo\)\s+return <MercadoConformidade/, "o early return das lojas saiu");
    assert.match(c, /if \(recursosCarregando\) return <MercadoSkeleton/, "o esqueleto saiu");
  });

  test("o EM_BREVE_MODE real continua ligado (só é LIDO)", () => {
    assert.match(codigo(ler("lib/leilaoLock.js")), /export const EM_BREVE_MODE = true;/);
  });

  test("o GlassHeader já não monta o herói «EM BREVE»", () => {
    assert.doesNotMatch(codigo(ler("components/glass/GlassHeader.jsx")), /ComingSoonHero/);
  });
});
