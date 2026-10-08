// utac108e1-mlc-op.test.mjs — UTAC108e.1. Implementação dos mockups v2 aprovados (UTAC108e):
//   • MLC = variante B «Produto em destaque»: o cartão da edição com a ARTE em destaque e o lance dentro dele;
//   • sem edição o cartão FICA, vazio (GUTO + «Nenhuma edição em andamento» + lance desligado) — correcção do
//     UTAC108d, que pôs um aviso SOLTO (o operador classificou-o como erro);
//   • OP = variante A «Família»: o MESMO cartão (`CartaoEdicao`), só a acção muda (palpite);
//   • pendências: dourado único #f5a623 · seletor de modo fora (MLC fixo em Relâmpago) · arte «PAGA» → «OFERTA».
//
// Corre com:  node --test src/pages/__tests__/utac108e1-mlc-op.test.mjs   (a partir de desafio-gut/frontend)
// Arnês do `utac108d-mlc-sempre.test.mjs` (página REAL do MLC; GlassHeader, CartaoEdicao e TabelaLances REAIS;
// duplos: AppContext, useRecursosApp, CardLance, leilaoLock). A OP renderizada vive em `utac106f-ofertas.test.mjs`.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = caminho(AQUI, "..", "..");
const RAIZ_FRONT = caminho(SRC, "..");
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
const ARTE = "/artes/edicao-especial-airfryer.jpg";
function renderizar({ emBreve = true, ...extra } = {}) {
  definirEmBreve(emBreve);
  definirContexto({
    EDICAO_ATIVA: "R-1", modalidade: "flash", setModalidade: () => {},
    edicoes: { "R-1": { id: "R-1", tipo: "relampago", status: "aberto", produto: "Air Fryer", imagem_url: ARTE, termino_em: "2099-01-01T00:00:00.000Z" } },
    lances: [], prazoTimestamp: 0, encerrado: false, showOverlay: false,
    address: EU, isConnected: true, userLabel: "Eu", ready: true,
    vencedor: null, showCountdown: false,
    abrirModal: () => {}, desconectar: () => {},
    handleLanceSucesso: () => {}, handleNovaRodada: () => {},
    authToken: "tok", fecharOverlay: () => {},
    saldoRsCentavos: 500, saldoRsStatus: "ok", tipoProvavel: "comum",
    ...extra,
  });
  return renderToStaticMarkup(React.createElement(Pagina));
}
const texto = (h) => h.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Fatia do HTML do cartão da edição (do `<article data-testid="cartao-edicao"` ao `</article>` dele). */
function cartao(html) {
  const i = html.indexOf('data-testid="cartao-edicao"');
  assert.ok(i > 0, "o cartão da edição não está no ecrã");
  const ini = html.lastIndexOf("<article", i);
  let prof = 0;
  for (const m of html.slice(ini).matchAll(/<(\/?)article\b/g)) {
    prof += m[1] ? -1 : 1;
    if (prof === 0) return html.slice(ini, ini + m.index + "</article>".length);
  }
  throw new Error("cartão sem </article>");
}

// ═══ SEG1 — MLC variante B «Produto em destaque» ════════════════════════════════════════════════
describe("UTAC108e.1 · SEG1 · MLC variante B (com edição)", () => {
  test("o cartão da edição tem a ARTE em destaque (largura toda) com nome e estado", () => {
    const c = cartao(renderizar({ emBreve: false }));
    assert.match(c, /data-destaque="true"/, "não é a variante B (destaque)");
    assert.match(c, /data-vazio="false"/);
    assert.match(c, new RegExp(`<img[^>]*data-testid="cartao-arte"[^>]*src="${ARTE.replace(/[.]/g, "\\.")}"`), "a arte real da edição não está no cartão");
    // no SSR não há `window` ⇒ `useIsMobile` = false ⇒ é o render de DESKTOP (16:9); o 1:1 do telemóvel mede-se na fonte.
    assert.match(c, /data-testid="cartao-arte"[^>]*style="[^"]*width:100%[^"]*aspect-ratio:16 \/ 9/, "a arte não ocupa a largura toda");
    assert.match(texto(c), /R-1/);
    assert.match(texto(c), /Air Fryer/);
    assert.match(texto(c), /ABERTA/);
  });

  test("1:1 no telemóvel, 16:9 no desktop (o mesmo cartão)", () => {
    assert.match(codigo(ler("components/CartaoEdicao.jsx")), /aspectRatio: isMobile \? "1 \/ 1" : "16 \/ 9"/);
  });

  test("o formulário do lance (CardLance real) vive DENTRO do cartão da edição", () => {
    const c = cartao(renderizar({ emBreve: false }));
    assert.ok(c.includes('data-stub="card-lance"'), "o lance não está dentro do cartão");
  });

  test("a tabela continua no fim (Regra 2): cartão → tabela → rodapé", () => {
    const html = renderizar({ emBreve: false });
    const iCartao = html.indexOf('data-testid="cartao-edicao"'), iTabela = html.indexOf('data-testid="tabela-fim"'), iFooter = html.indexOf("<footer");
    assert.ok(iCartao > 0 && iCartao < iTabela && iTabela < iFooter, `ordem: cartão=${iCartao} tabela=${iTabela} rodapé=${iFooter}`);
  });

  test("sem arte na edição não há <img> quebrada (marcador 🎁)", () => {
    const c = cartao(renderizar({ emBreve: false, edicoes: { "R-1": { id: "R-1", status: "aberto", produto: "Kit" } } }));
    assert.doesNotMatch(c, /data-testid="cartao-arte"/);
    assert.match(c, /🎁/);
  });
});

// ═══ SEG3 — correcção do 108d: o «sem edição» vive DENTRO do cartão ═════════════════════════════
describe("UTAC108e.1 · SEG3 · sem edição → cartão vazio (não aviso solto)", () => {
  test("o cartão APARECE, vazio, com GUTO + «Nenhuma edição em andamento» + «Volte quando houver»", () => {
    const c = cartao(renderizar());
    assert.match(c, /data-vazio="true"/, "o cartão não está em estado vazio");
    assert.match(c, /<img[^>]*src="\/assets\/guto\/custom\/guto-bemvindo\.png"/, "falta o GUTO no cartão vazio");
    assert.match(texto(c), /Nenhuma edição em andamento/);
    assert.match(texto(c), /Volte quando houver/);
    assert.match(texto(c), /SEM EDIÇÃO/);
  });

  test("o lance aparece DESLIGADO dentro do cartão vazio (campo + botão disabled; CardLance não monta)", () => {
    const html = renderizar();
    const c = cartao(html);
    assert.match(c, /data-testid="lance-desativado"/);
    assert.match(c, /<input[^>]*id="lance-sem-edicao"[^>]*disabled=""/, "o campo não está desligado");
    assert.match(c, /<button[^>]*disabled=""[^>]*>Dar lance<\/button>/, "o botão não está desligado");
    assert.match(c, /<label[^>]*for="lance-sem-edicao"[^>]*>Seu lance \(em centavos\)<\/label>/, "rótulo do lance perdido");
    assert.ok(!html.includes('data-stub="card-lance"'), "sem edição o CardLance não devia montar");
  });

  test("o aviso SOLTO do 108d saiu: nem `SemEdicaoAviso` no código, nem `data-testid=\"sem-edicao\"` no ecrã", () => {
    assert.doesNotMatch(codigo(ler("pages/MercadoLances.jsx")), /SemEdicaoAviso/);
    assert.ok(!renderizar().includes('data-testid="sem-edicao"'));
    // a frase existe UMA vez como texto visível — dentro do cartão
    const html = renderizar();
    assert.equal(html.split("Nenhuma edição em andamento<").length - 1, 1);
  });

  test("com edição o cartão NÃO está vazio e o «Sem saldo» (108c) continua a aparecer com saldo 0", () => {
    const html = renderizar({ emBreve: false, saldoRsCentavos: 0 });
    assert.match(cartao(html), /data-vazio="false"/);
    assert.ok(html.includes("Sem saldo. Carregar agora?"), "o aviso «Sem saldo» (108c) quebrou");
    assert.ok(!html.includes("Nenhuma edição em andamento<"));
  });
});

// ═══ SEG4 — pendências ══════════════════════════════════════════════════════════════════════════
describe("UTAC108e.1 · SEG4 · pendência 2: seletor de modo fora, MLC fixo em Relâmpago", () => {
  test("o GlassHeader já não monta o ModeSelector e ninguém mais o importa", () => {
    assert.doesNotMatch(codigo(ler("components/glass/GlassHeader.jsx")), /ModeSelector/);
    assert.doesNotMatch(codigo(ler("pages/MercadoLances.jsx")), /ModeSelector|setModalidade/);
  });

  test("no ecrã: o selo «⚡ Relâmpago», nenhum botão de modo (aria-pressed) nem «🎫 Programado»", () => {
    const html = renderizar({ emBreve: false });
    assert.match(html, /data-testid="selo-modo"[^>]*>⚡ Relâmpago</);
    assert.doesNotMatch(html, /aria-pressed/);
    assert.doesNotMatch(texto(html), /🎫 Programado|Modo:/);
  });

  test("a modalidade passada ao lance continua a do contexto (\"flash\" — o valor inicial do AppContext)", () => {
    assert.match(codigo(ler("context/AppContext.jsx")), /useState\("flash"\)/);
    assert.match(codigo(ler("pages/MercadoLances.jsx")), /modalidade=\{modalidade\}/);
  });
});

describe("UTAC108e.1 · SEG4 · pendência 1: dourado ÚNICO #f5a623", () => {
  test("glassTokens: COR.gold = #f5a623 (e #ff9500 desapareceu do token)", () => {
    const t = codigo(ler("components/glass/glassTokens.js"));
    assert.match(t, /gold: "#f5a623"/);
    assert.doesNotMatch(t, /#ff9500/i);
  });
  test("globals.css: --color-gut-gold = #f5a623 (o mesmo tom)", () => {
    const css = ler("globals.css");
    assert.match(css, /--color-gut-gold:\s*#f5a623;/);
    assert.doesNotMatch(css, /--color-gut-gold:\s*#ff9500/i);
  });
  test("no ecrã do MLC o dourado é um só: aparece #f5a623 / rgb(245,166,35), nunca #ff9500", () => {
    const html = renderizar({ emBreve: false });
    assert.doesNotMatch(html, /#ff9500|255,\s*149,\s*0/i);
    assert.match(html, /#f5a623/i);
  });
});

describe("UTAC108e.1 · SEG4 · pendência 3: arte da Air Fryer sem «PAGA»", () => {
  const ARTE_FS = caminho(RAIZ_FRONT, "public", "artes", "edicao-especial-airfryer.jpg");
  // md5 da arte ORIGINAL (com «Quanto você PAGA…»), medido antes da edição.
  const MD5_ORIGINAL_PAGA = "30f3e240778a64849edeb4902de3feea";
  test("a arte já não é a original com «PAGA» (o ficheiro mudou) e continua inteira", () => {
    const buf = readFileSync(ARTE_FS);
    assert.notEqual(createHash("md5").update(buf).digest("hex"), MD5_ORIGINAL_PAGA, "a arte ainda é a original («PAGA»)");
    assert.ok(statSync(ARTE_FS).size > 100_000, "arte truncada");
    assert.equal(buf[0], 0xff); assert.equal(buf[1], 0xd8, "não é JPEG");
  });
});

// ═══ SEG2 — coerência: o MESMO cartão nas duas abas; a tabela no mesmo padrão ══════════════════
describe("UTAC108e.1 · coerência MLC ↔ OP (a mesma família)", () => {
  test("as duas abas usam o MESMO componente `CartaoEdicao` (só a acção muda)", () => {
    for (const p of ["pages/MercadoLances.jsx", "pages/OfertasProgramadas.jsx"]) {
      assert.match(codigo(ler(p)), /import CartaoEdicao from "\.\.\/components\/CartaoEdicao\.jsx";/, `${p} não usa o CartaoEdicao`);
      assert.match(codigo(ler(p)), /<CartaoEdicao\b/, `${p} não monta o CartaoEdicao`);
    }
    // a OP já não desenha um cartão próprio dentro do carrossel
    const op = codigo(ler("pages/OfertasProgramadas.jsx"));
    assert.doesNotMatch(op, /<GlassCard as="article"/, "a OP voltou a ter um cartão de edição próprio");
  });

  test("as duas abas têm o mesmo cabeçalho: título Orbitron laranja + selo do tipo", () => {
    const g = codigo(ler("components/glass/GlassHeader.jsx"));
    const op = codigo(ler("pages/OfertasProgramadas.jsx"));
    for (const [nome, c] of [["MLC/GlassHeader", g], ["OP", op]]) {
      assert.match(c, /data-testid="titulo-aba"/, `${nome}: sem título de aba`);
      assert.match(c, /fontFamily: "'Orbitron', sans-serif"/, `${nome}: título fora da Orbitron`);
      assert.match(c, /data-testid="selo-modo"/, `${nome}: sem selo do tipo`);
    }
    assert.match(op, /🎫 Programadas/);
  });

  test("Regra 2: as duas tabelas no fim, mesmo vidro padrão e 3 colunas; a da OP aparece mesmo sem edição", () => {
    const html = renderizar({ emBreve: false, lances: [{ endereco: EU, valor: null, oculto: true }] });
    const tabelaMlc = html.slice(html.indexOf('data-testid="tabela-fim"'));
    assert.match(tabelaMlc, /class="gut-glass-standard"/);
    assert.equal((tabelaMlc.match(/<th\b/g) || []).length, 3);
    const op = codigo(ler("pages/OfertasProgramadas.jsx"));
    assert.match(op, /data-testid="op-tabela-fim"[\s\S]{0,200}className="gut-glass-standard"/);
    assert.equal((op.match(/<TH>/g) || []).length, 3);
    assert.match(op, /\{!loading && !erro && \(\s*<section data-testid="op-tabela-fim"/, "a tabela da OP voltou a depender de haver edição");
  });
});
