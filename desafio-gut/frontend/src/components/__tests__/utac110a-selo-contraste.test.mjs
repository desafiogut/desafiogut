// utac110a-selo-contraste.test.mjs — UTAC110a · contraste WCAG AA do SELO DE ESTADO da
// `TabelaLances` (aba Mercado / Menor Lance Único).
//
// O QUE SE PROVA
//   O texto do selo de estado tem contraste ≥ 4,5:1 (WCAG 2.x, texto normal) sobre o SEU fundo
//   nos 3 estados pedidos — EM BREVE, ATIVA, ENCERRADA — e também em INDISPONÍVEL (4.º estado
//   herdado de `utils/edicao.js`). O cálculo é feito AQUI, por luminância relativa.
//
// PORQUE NÃO É CIRCULAR (a refutação que o validador tem de poder tentar e falhar)
//   · a cor do TEXTO e a cor do FUNDO saem do MARKUP RENDERIZADO pelo componente a sério
//     (nunca de uma constante copiada para dentro do teste);
//   · o fundo é CRUZADO com o `cor` devolvido pelo `getEstadoEdicao` REAL, forçando cada estado
//     pelo duplo vivo do `leilaoLock` (a constante real é `true`: sem o duplo, só «em breve» existe);
//   · e o teste tem a metade BIDIRECCIONAL: a cor ANTIGA (branco) tem de REPROVAR o mesmo cálculo.
//     Sem essa metade, o teste seria verde por construção (aprovaria qualquer cor).
//
// ARNÊS: o mesmo dos testes de componente do repo — Vite SSR (`opcoesServidorTeste`) + `_ponte-ssr`
// (A12) + duplos por `resolve.alias`. Nenhum ficheiro de produção é alterado para o teste.
//
// ANTES/DEPOIS (medido no SEG-1, `_logs/UTAC110a_SEG-1_MEDICAO.md`):
//   branco (antes):  2,84 (EM BREVE) · 2,54 (ATIVA) · 3,76 (ENCERRADA) · 4,00 (INDISPONÍVEL) → REPROVA
//   navy   (depois): 6,76 · 7,55 · 5,09 · 4,79  → APROVA (o pior caso é 4,79:1)

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");
const SRC = caminho(AQUI, "..", "..");

const AA = 4.5;              // WCAG 2.x AA, texto normal (0,7rem/700 → «normal», não «grande»)
const BRANCO_ANTIGO = "#ffffff";

let React, renderToStaticMarkup, vite, Tabela, getEstadoEdicao, definirEmBreve, definirResultadoOficial;

before(async () => {
  const { createServer } = await import("vite");
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES,
        { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS}/useResultadoOficial.js` },
        { find: /^dompurify$/, replacement: `${STUBS}/dompurify.js` },
        // `edicao.js` lê o `EM_BREVE_MODE` daqui (import `../lib/leilaoLock.js`).
        { find: /^\.\.\/lib\/leilaoLock\.js$/, replacement: `${STUBS}/leilaoLock.js` },
      ],
    },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirEmBreve } = await vite.ssrLoadModule(`${STUBS}/leilaoLock.js`));
  ({ definirResultadoOficial } = await vite.ssrLoadModule(`${STUBS}/useResultadoOficial.js`));
  ({ getEstadoEdicao } = await vite.ssrLoadModule("/src/utils/edicao.js"));
  Tabela = (await vite.ssrLoadModule("/src/components/TabelaLances.jsx")).default;
});

after(async () => { definirEmBreve?.(true); if (vite) await vite.close(); });

// ── WCAG 2.x: luminância relativa e razão de contraste ────────────────────────────────────────────
function luminancia(hex) {
  const cru = String(hex).trim().replace("#", "");
  const n = cru.length === 3 ? cru.split("").map((c) => c + c).join("") : cru;
  const canais = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = canais.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function razao(corA, corB) {
  const [a, b] = [luminancia(corA), luminancia(corB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// ── leitura do selo no MARKUP (não de constantes do teste) ───────────────────────────────────────
function seloDe(html) {
  const tag = html.match(/<span style="([^"]*border-radius:20px[^"]*)"[^>]*>/);
  assert.ok(tag, "o selo de estado não apareceu no markup (a `statusBadge` desapareceu?)");
  const estilo = tag[1];
  const cor = estilo.match(/(?:^|;)\s*color:([^;]+)/)?.[1];
  const fundo = estilo.match(/(?:^|;)\s*background:([^;]+)/)?.[1];
  const texto = html.slice(html.indexOf(tag[0]) + tag[0].length).split("</span>")[0];
  assert.ok(cor && fundo, `selo sem cor/fundo legíveis no markup: ${estilo}`);
  return { estilo, cor, fundo, texto };
}

function renderizar({ emBreve = true, encerrado = false, lances = [], idEdicao = "R-1" } = {}) {
  definirEmBreve(emBreve);
  definirResultadoOficial(null);
  const html = renderToStaticMarkup(
    React.createElement(Tabela, { lances, idEdicao, prazoTimestamp: 0, encerrado }),
  );
  return { html, selo: seloDe(html) };
}

/** Os 3 estados que o UTAC exige, cada um com a forma de os forçar no componente. */
const ESTADOS = [
  ["EM BREVE",  { emBreve: true,  encerrado: false }, { id: "R-1" }],
  ["ATIVA",     { emBreve: false, encerrado: false }, { id: "R-1" }],
  ["ENCERRADA", { emBreve: false, encerrado: true  }, { id: "R-1" }],
];

// ═══ A1 — o selo é legível: ≥ 4,5:1 nos 3 estados, medido no markup ═══════════════════════════════
for (const [nome, opts, edicao] of ESTADOS) {
  test(`A1 · selo ${nome}: contraste ≥ ${AA}:1 medido no MARKUP renderizado`, async () => {
    const { selo } = renderizar(opts);
    const esperado = getEstadoEdicao(edicao, { encerrado: opts.encerrado });
    // o fundo do selo é o `cor` da FONTE ÚNICA — se o selo perdesse o estado, isto caía primeiro
    assert.equal(selo.fundo, esperado.cor,
      `o selo ${nome} não pinta o fundo com a cor do estado (${esperado.cor}); fundo=${selo.fundo}`);
    const r = razao(selo.cor, selo.fundo);
    assert.ok(r >= AA,
      `selo ${nome}: texto ${selo.cor} sobre fundo ${selo.fundo} dá ${r.toFixed(2)}:1 (< ${AA}:1) — REPROVA o WCAG AA`);
    assert.notEqual(selo.cor, BRANCO_ANTIGO, "o selo voltou ao branco do molde");
    // o selo continua a DIZER o estado (não é só um quadrado colorido)
    assert.ok(selo.texto.includes(esperado.badge),
      `o selo ${nome} não mostra o rótulo «${esperado.badge}» (mostra «${selo.texto}»)`) ;
  });
}

// ═══ A2 — 4.º estado (INDISPONÍVEL): o mesmo texto, a mesma régua ═════════════════════════════════
test("A2 · INDISPONÍVEL (4.º estado herdado): a cor do selo também passa o AA sobre `#6b7db8`", async () => {
  const { selo } = renderizar({ emBreve: false, encerrado: false });
  const indisp = getEstadoEdicao({ id: "R-1" }, { encerrado: false });   // ATIVA (sanity)
  assert.equal(indisp.estado, "ativa");
  // o estado INDISPONÍVEL não é alcançável por este componente (o `encerrado` é sempre booleano),
  // mas a COR dele vive na mesma fonte única: a régua tem de valer também para ele.
  const cor = "#6b7db8";
  const r = razao(selo.cor, cor);
  assert.ok(r >= AA, `INDISPONÍVEL: ${selo.cor} sobre ${cor} dá ${r.toFixed(2)}:1 (< ${AA}:1)`);
});

// ═══ A3 — BIDIRECCIONAL: a cor ANTIGA reprova o MESMO cálculo ════════════════════════════════════
for (const [nome, opts] of ESTADOS) {
  test(`A3 · ${nome}: o branco ANTIGO (${BRANCO_ANTIGO}) reprova o mesmo cálculo (o teste morde)`, async () => {
    const { selo } = renderizar(opts);
    const antigo = razao(BRANCO_ANTIGO, selo.fundo);
    assert.ok(antigo < AA,
      `${nome}: o branco sobre ${selo.fundo} deu ${antigo.toFixed(2)}:1 (≥ ${AA}) — a metade bidireccional deixou de discriminar`);
    const novo = razao(selo.cor, selo.fundo);
    assert.ok(novo > antigo,
      `${nome}: a correcção não melhorou o contraste (antes ${antigo.toFixed(2)}:1 → agora ${novo.toFixed(2)}:1)`);
  });
}

// ═══ A4 — PARIDADE com o selo da OP (é a MESMA correcção do UTAC109g) ════════════════════════════
test("A4 · o selo do Mercado usa a MESMA cor de texto do selo da OP (replicação do 109g)", async () => {
  const ler = (p) => readFileSync(caminho(SRC, p), "utf8").replace(/\r\n/g, "\n");
  const corDoSelo = (fonte, chave) => {
    const bloco = fonte.match(new RegExp(`${chave}:\\s*\\{([\\s\\S]*?)\\}`))?.[1];
    assert.ok(bloco, `selo «${chave}» não encontrado`);
    return bloco.match(/color:\s*"(#[0-9a-fA-F]{3,8})"/)?.[1]?.toLowerCase();
  };
  const mlc = corDoSelo(ler("components/TabelaLances.jsx"), "statusBadge");
  const op = corDoSelo(ler("pages/OfertasProgramadas.jsx"), "badge");
  assert.equal(mlc, op, `Mercado=${mlc} · OP=${op} — os dois selos divergiram`);
  assert.notEqual(mlc, BRANCO_ANTIGO, "a paridade foi feita ao contrário (ambos brancos)");
  assert.equal(mlc, "#0a0f1a", "a cor replicada não é o navy do app");
});

// ═══ A5 — o resto do selo está intacto (a correcção é a COR, não o selo) ══════════════════════════
test("A5 · o resto da `statusBadge` não mudou (padding, raio, tamanho, peso)", async () => {
  const { selo } = renderizar({ emBreve: true, encerrado: false });
  assert.match(selo.estilo, /padding:0\.22rem 0\.75rem/);
  assert.match(selo.estilo, /border-radius:20px/);
  assert.match(selo.estilo, /font-size:0\.7rem/);
  assert.match(selo.estilo, /font-weight:700/);
  // e o selo continua a ser o mesmo elemento do cabeçalho da tabela (não foi recriado noutro sítio)
  const fonte = readFileSync(caminho(SRC, "components/TabelaLances.jsx"), "utf8");
  assert.match(fonte, /<span style=\{\{ \.\.\.estilos\.statusBadge, background: est\.cor \}\}>/);
  assert.equal((fonte.match(/estilos\.statusBadge/g) || []).length, 1, "o selo passou a ser usado em mais do que um sítio");
});
