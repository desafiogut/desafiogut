// utac109h-carteira.test.mjs — UTAC109h · Carteira com 2 cores de destaque, botões padronizados e
// o 1.º vidro no estilo do 1.º vidro da OP (decisões do operador R18-A/B/C).
//
// O que se prova (render REAL da página e do «Indique e Ganhe» + leitura das fontes):
//   (1) só o laranja `#ff6b35` e o amarelo `#f5a623` como cores de destaque; o resto é neutro ou o
//       vermelho dos ERROS (R18-C) — e o vermelho só aparece em mensagens de erro;
//   (2) todos os botões com altura mínima ≥ 48 px e alvo ≥ 48×48 (o ↻ e os terciários);
//   (3) hierarquia do 1.º vidro: título > valor > subtítulo;
//   (4) contraste WCAG AA de cada par texto/fundo usado;
//   (5) 1.º vidro = «quanto tenho + como carrego» (só ↻ + Depositar PIX); o resto no 2.º vidro;
//   (6) o cabeçalho segue a 2.ª secção do `GlassHeader` da OP (mesma fonte, peso e tokens) e o
//       envelope tem as mesmas margens (1rem / 2rem).
// Arnês igual ao de `utac106c-carteira-render.test.mjs` (Vite SSR + `_hook-runner`), mas com o
// `PainelIndicacao` REAL (é parte do âmbito das cores — R18-C).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const STUBS = resolve(AQUI, "_stubs-106c");
const STUB_CONTEXTO = resolve(AQUI, "..", "pages", "__tests__", "_stubs", "AppContext.jsx");
const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/,       replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/,  replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/\.\.\/hooks\/useAdmin\.js$/,      replacement: `${STUBS}/useAdmin.js` },
  { find: /^react-router-dom$/,                     replacement: `${STUBS}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, definirContexto, MinhaCarteira;
before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const CONECTADO = {
  isConnected: true, abrirModal: () => {}, address: "0xAbC1230000000000000000000000000000004567",
  user: null, authToken: null,
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok",
  refetchSaldoRs: () => {}, saldoSenhas: 7, saldoSenhasStatus: "ok",
};

async function renderizar(contexto = CONECTADO) {
  definirContexto(contexto);
  const ctrl = montar(MinhaCarteira, []);
  await ctrl.assentar();
  return renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()));
}

// Remove comentários (`/* … */`, `{/* … */}` e linhas `//`) para medir CÓDIGO, não prosa.
function codigo(s) {
  return s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
const CART = codigo(readFileSync(resolve(SRC, "pages", "MinhaCarteira.jsx"), "utf8"));
const PAINEL = codigo(readFileSync(resolve(SRC, "components", "PainelIndicacao.jsx"), "utf8"));
const GLASS = codigo(readFileSync(resolve(SRC, "components", "glass", "GlassHeader.jsx"), "utf8"));
const TOKENS = codigo(readFileSync(resolve(SRC, "components", "glass", "glassTokens.js"), "utf8"));

// ─── Paleta ────────────────────────────────────────────────────────────────────────────────────
const DESTAQUE = ["#ff6b35", "#f5a623"];
const NEUTROS = ["#e8f0fe", "#6b7db8", "#94a3b8", "#0a0f1a"];
const ERRO = "#ef4444";
// rgb(a) permitidos: as 2 cores, o vermelho do erro e o fundo neutro dos cartões de estatística.
const RGB_OK = ["255,107,53", "245,166,35", "239,68,68", "3,15,36"];
const PROIBIDAS = ["#00d4ff", "#00d4aa", "#0aa37e", "#10b981", "#fbbf24", "#a78bfa", "#e89400", "#04080f",
  "0,212,255", "0,212,170", "16,185,129"];

function coresDe(texto) {
  const hex = [...texto.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => m[0].toLowerCase());
  const rgb = [...texto.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map((m) => `${m[1]},${m[2]},${m[3]}`);
  return { hex, rgb };
}

test("UTAC109h/A · controlo: o extractor de cores vê cores (senão os testes seguintes seriam vácuos)", () => {
  const { hex, rgb } = coresDe('a #FF6B35 b rgba(245, 166, 35, 0.4) c');
  assert.deepEqual(hex, ["#ff6b35"]);
  assert.deepEqual(rgb, ["245,166,35"]);
  assert.ok(coresDe(CART).hex.length >= 2 && coresDe(PAINEL).hex.length >= 2, "as fontes não têm cores?");
});

test("UTAC109h/A · fontes: Carteira e Indique e Ganhe só usam as 2 cores de destaque + neutros + erro", () => {
  for (const [nome, src] of [["MinhaCarteira.jsx", CART], ["PainelIndicacao.jsx", PAINEL]]) {
    const { hex, rgb } = coresDe(src);
    const foraHex = hex.filter((h) => !DESTAQUE.includes(h) && !NEUTROS.includes(h) && h !== ERRO);
    const foraRgb = rgb.filter((r) => !RGB_OK.includes(r));
    assert.deepEqual(foraHex, [], `${nome}: cores fora da paleta: ${foraHex.join(", ")}`);
    assert.deepEqual(foraRgb, [], `${nome}: rgb(a) fora da paleta: ${foraRgb.join(" | ")}`);
    for (const p of PROIBIDAS) assert.ok(!src.toLowerCase().includes(p), `${nome}: voltou a cor proibida ${p}`);
    assert.ok(!/linear-gradient\(135deg/.test(src), `${nome}: voltou um botão em gradiente`);
  }
  assert.match(CART, /primary: "#ff6b35"/);
  assert.match(CART, /gold: "#f5a623"/);
  assert.match(PAINEL, /primary:\s*"#ff6b35"/);
});

test("UTAC109h/A · as 2 cores são EXACTAMENTE as do título e da frase da aba MLC (glassTokens)", () => {
  assert.match(TOKENS, /primary: "#ff6b35"/, "o laranja do MLC mudou — rever a paleta da Carteira");
  assert.match(TOKENS, /gold: "#f5a623"/, "o amarelo do MLC mudou — rever a paleta da Carteira");
});

test("UTAC109h/A · render: só 2 cores de destaque no ecrã; o vermelho só em mensagens de ERRO (R18-C)", async () => {
  const h = await renderizar({ ...CONECTADO, saldoRsStatus: "error" });
  assert.ok(h.includes("Indique e Ganhe"), "controlo: o PainelIndicacao REAL não renderizou");
  const { hex, rgb } = coresDe(h);
  const fora = hex.filter((x) => !DESTAQUE.includes(x) && !NEUTROS.includes(x) && x !== ERRO);
  assert.deepEqual(fora, [], `cores fora da paleta no ecrã: ${fora.join(", ")}`);
  assert.deepEqual(rgb.filter((r) => !RGB_OK.includes(r)), [], "rgb(a) fora da paleta no ecrã");
  assert.ok(hex.includes("#ff6b35") && hex.includes("#f5a623"), "as 2 cores não estão no ecrã");
  // cada uso do vermelho é uma tag cujo texto começa por «⚠️» (mensagem de erro)
  const usos = [...h.matchAll(/#ef4444[^>]*>([^<]*)/gi)].map((m) => m[1]);
  assert.ok(usos.length >= 1, "controlo: o estado de erro não pôs vermelho no ecrã");
  for (const t of usos) assert.match(t, /^\s*⚠️/, `vermelho fora de mensagem de erro: «${t}»`);
});

// ─── Botões ────────────────────────────────────────────────────────────────────────────────────
test("UTAC109h/B · render: TODOS os botões da Carteira e do Indique e Ganhe têm min-height ≥ 48 px", async () => {
  const h = await renderizar();
  const botoes = [...h.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]).filter((b) => !/data-stub/.test(b));
  assert.ok(botoes.length >= 7, `controlo: só vi ${botoes.length} botões`);
  for (const b of botoes) {
    const mh = b.match(/min-height:\s*(\d+)px/);
    assert.ok(mh && Number(mh[1]) >= 48, `botão com altura < 48 px: ${b.slice(0, 160)}`);
  }
});

test("UTAC109h/B · alvos que não ocupam a largura toda (↻, terciários) têm min-width ≥ 48 px", () => {
  assert.match(CART, /minWidth: "48px", minHeight: "48px"/, "o ↻ perdeu o alvo 48×48");
  const ter = CART.match(/const botaoTerciario = \{([\s\S]*?)\};/);
  assert.ok(ter, "o estilo terciário desapareceu");
  assert.match(ter[1], /minHeight: "48px"/);
  assert.match(ter[1], /minWidth: "48px"/);
  assert.match(ter[1], /color: COR\.gold/, "o terciário não é texto amarelo");
});

test("UTAC109h/B · três tipos de botão com a mesma base (altura, raio, tipografia) nos 2 ficheiros", () => {
  for (const [nome, src] of [["Carteira", CART], ["PainelIndicacao", PAINEL]]) {
    const base = src.match(/const botaoBase = \{([\s\S]*?)\};/);
    assert.ok(base, `${nome}: sem botaoBase`);
    for (const p of [/minHeight: "48px"/, /borderRadius: "12px"/, /fontWeight: "800"/, /fontSize: "0\.9rem"/]) {
      assert.match(base[1], p, `${nome}: botaoBase sem ${p}`);
    }
    assert.match(src, /const botaoPrimario = \{ \.\.\.botaoBase, background: COR\.primary, [^\n]*color: ON_COR \}/,
      `${nome}: primário ≠ laranja cheio + navy`);
    assert.match(src, /const botaoSecundario = \{ \.\.\.botaoBase, background: "transparent", border: `1px solid \$\{COR\.gold\}`, color: COR\.gold \}/,
      `${nome}: secundário ≠ transparente + contorno/texto amarelo`);
  }
});

test("UTAC109h/B · espaço entre botões ≥ 8 px (gap 0,6 rem = 9,6 px)", () => {
  assert.match(CART, /gap: "0\.6rem"/);
  assert.match(PAINEL, /gap: "0\.6rem"/);
});

// ─── 1.º vidro ─────────────────────────────────────────────────────────────────────────────────
function tamanhoRem(h, testid) {
  const tag = h.match(new RegExp(`<[a-z0-9]+ [^>]*data-testid="${testid}"[^>]*>`));
  assert.ok(tag, `não encontrei ${testid}`);
  const m = tag[0].match(/font-size:\s*([\d.]+)rem/);
  assert.ok(m, `${testid} sem font-size em rem`);
  return Number(m[1]);
}

test("UTAC109h/C · hierarquia do 1.º vidro: título > valor > subtítulo (render, desktop)", async () => {
  const h = await renderizar();
  const t = tamanhoRem(h, "titulo-carteira");
  const v = tamanhoRem(h, "valor-saldo");
  const s = tamanhoRem(h, "subtitulo-carteira");
  assert.ok(t > v && v > s, `hierarquia errada: título ${t} · valor ${v} · subtítulo ${s}`);
  assert.ok(t * 16 >= 14.08 * 1.5, `título ${t * 16}px < 1,5× o antigo (14,08 px)`);
});

test("UTAC109h/C · hierarquia também no telemóvel (fonte): 1,5rem > 1,35rem > 0,9rem; ≥ 1,5× os 13,6 px", () => {
  const num = (re) => Number(CART.match(re)[1]);
  const t = num(/TAM_TITULO = isMobile \? "([\d.]+)rem"/);
  const v = num(/TAM_VALOR = isMobile \? "([\d.]+)rem"/);
  const s = num(/TAM_SUBTITULO = isMobile \? "([\d.]+)rem"/);
  assert.ok(t > v && v > s, `hierarquia móvel errada: ${t} / ${v} / ${s}`);
  assert.ok(t * 16 >= 13.6 * 1.5, `título móvel ${t * 16}px < 1,5× 13,6 px`);
});

test("UTAC109h/C · 1.º vidro = quanto tenho + como carrego: só ↻ e Depositar PIX; o resto no 2.º vidro", async () => {
  const h = await renderizar();
  const i1 = h.indexOf('data-vidro="saldo"');
  const i2 = h.indexOf('data-vidro="usar-saldo"');
  assert.ok(i1 > -1 && i2 > i1, "os 2 vidros não estão pela ordem saldo → usar o saldo");
  const v1 = h.slice(i1, i2);
  const v2 = h.slice(i2, h.indexOf("Indique e Ganhe"));
  assert.equal((v1.match(/<button\b/g) || []).length, 2, "o 1.º vidro tem botões a mais (só ↻ + PIX)");
  assert.ok(v1.includes("Depositar PIX") && v1.includes("Saldo Disponível") && v1.includes("R$ 12.34"));
  assert.ok(v1.includes("desafiogut@gmail.com"), "a nota do e-mail PIX saiu do 1.º vidro (RESSALVA 5 do 107b)");
  for (const r of ["Comprar Passe Desafio", "Menor Lance Único", "Ofertas Programadas", "senhas antigas"]) {
    assert.ok(!v1.includes(r), `«${r}» continua no 1.º vidro`);
    assert.ok(v2.includes(r), `«${r}» não está no 2.º vidro (R18-B: nada se perde)`);
  }
});

test("UTAC109h/C · cabeçalho = 2.ª secção do GlassHeader da OP (fonte, peso, tokens) e mesmas margens", () => {
  // GlassHeader: título h2 Orbitron 800 COR.primary; frase 700 COR.gold; envelope 1rem / 2rem.
  assert.match(GLASS, /fontFamily: "'Orbitron', sans-serif", fontWeight: 800/);
  assert.match(GLASS, /fontWeight: 700, color: COR\.gold/);
  assert.match(GLASS, /padding: isMobile \? "1rem 1rem 0" : "2rem 2rem 0"/);
  const titulo = CART.match(/<h3 data-testid="titulo-carteira" style=\{\{([\s\S]*?)\}\}>Carteira<\/h3>/);
  assert.ok(titulo, "o título do 1.º vidro desapareceu");
  assert.match(titulo[1], /fontFamily: "'Orbitron', sans-serif", fontWeight: 800/);
  assert.match(titulo[1], /color: COR\.primary/);
  const sub = CART.match(/<div data-testid="subtitulo-carteira" style=\{\{([\s\S]*?)\}\}>Saldo Disponível<\/div>/);
  assert.ok(sub, "o subtítulo desapareceu");
  assert.match(sub[1], /fontWeight: 700/);
  assert.match(sub[1], /color: COR\.gold/);
  assert.match(CART, /const pad {8}= isMobile \? "1rem" : "2rem";/, "as margens deixaram de ser as da OP (1rem / 2rem)");
  assert.ok(!/AuthArea|AuctionStatusBar|GlassHeader/.test(CART), "R18-A: sem login/CNPJ nem GlassHeader na Carteira");
});

// ─── Contraste ─────────────────────────────────────────────────────────────────────────────────
const lum = (hex) => {
  const c = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Vidro `.gut-glass-standard` = rgba(13,18,53,.88) sobre o fundo #050818 ≈ #0c1131.
const VIDRO = "#0c1131";

test("UTAC109h/A · contraste WCAG AA de cada par texto/fundo (≥ 4,5:1)", () => {
  const pares = [
    ["título laranja / vidro", "#ff6b35", VIDRO],
    ["subtítulo, valor, secundário, terciário amarelo / vidro", "#f5a623", VIDRO],
    ["texto de apoio muted / vidro", "#6b7db8", VIDRO],
    ["texto de apoio muted do Indique / vidro", "#94a3b8", VIDRO],
    ["erro vermelho / vidro", "#ef4444", VIDRO],
    ["texto navy / primário laranja", "#0a0f1a", "#ff6b35"],
  ];
  for (const [nome, a, b] of pares) {
    const r = ratio(a, b);
    assert.ok(r >= 4.5, `${nome}: ${r.toFixed(2)}:1 < 4,5:1`);
  }
  // controlo: o par que se EVITOU (branco sobre o laranja) falha — o teste distingue.
  assert.ok(ratio("#ffffff", "#ff6b35") < 4.5, "controlo: branco sobre laranja devia falhar o AA");
});
