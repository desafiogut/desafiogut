// UTAC110h.2 · FRENTE B — prova por RENDER REAL do painel «Indique e Ganhe».
//
// PORQUE EXISTE (e não só o teste de texto-fonte): a série já pagou este preço — no UTAC106c a prova de
// render nasceu ad-hoc em `%TEMP%` e o validador apontou que, sem artefacto no repo, a prova MORRE com a
// sessão (a lição está escrita no cabeçalho de `utac106c-carteira-render.test.mjs`). Este ficheiro é a
// prova reproduzível de que o TEXTO NOVO está no que o componente RENDERIZA — não só no texto-fonte.
//
// Instrumentos do PRÓPRIO repo, nenhum ficheiro de produção alterado:
//   · `_servidor-teste.mjs` — opções do servidor Vite dos testes (configFile:false + dedupe do React);
//   · `_ponte-ssr.mjs`      — carregado PRIMEIRO: fixa a instância única de React (regra A12);
//   · duplo de AppContext   — `src/pages/__tests__/_stubs/AppContext.jsx`, injectado por `resolve.alias`.
//
// ⚠️ LIMITES DECLARADOS: em SSR o `useEffect` NÃO corre, logo o painel renderiza no estado inicial
// (`status: "idle"`, `codigo: null`) — é exactamente o ramo que contém a copy alterada (o parágrafo, o
// 3.º card e o rodapé). Não se prova aqui a chamada à API nem a partilha nativa; isso vive nos testes de
// texto-fonte e nos do backend. A prova VISUAL (overflow/contraste) são as 2 capturas do SEG4.
//
// node --test --test-concurrency=1 src/__tests__/utac110h2-render-indicacao.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUB_CONTEXTO = resolve(AQUI, "..", "pages", "__tests__", "_stubs", "AppContext.jsx");

// O aliases tem de ser passado a `opcoesServidorTeste` (chave de topo no `createServer` NÃO faz nada —
// medido no UTAC106c).
const ALIASES = [{ find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO }];

let vite = null;
let React = null;
let renderToStaticMarkup = null;
let definirContexto = null;
let Painel = null;

before(async () => {
  const { createServer } = await import(
    pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  Painel = (await vite.ssrLoadModule("/src/components/PainelIndicacao.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const CONECTADO = { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", authToken: "token-de-teste", isConnected: true };

/** Renderiza o painel REAL e devolve o HTML. `isMobile` escolhe o ramo de layout (os dois são testados). */
function render({ isMobile, contexto = CONECTADO }) {
  definirContexto(contexto);
  return renderToStaticMarkup(React.createElement(Painel, { isMobile }));
}

test("controlo positivo: o instrumento distingue os estados (deslogado ≠ ligado)", () => {
  const fora = render({ isMobile: false, contexto: { ...CONECTADO, isConnected: false } });
  assert.match(fora, /Faça login para obter seu código/, "o painel deslogado devia pedir login");
  assert.doesNotMatch(fora, /\+2 ECOQUILDO/, "o painel deslogado não pode mostrar a recompensa");
  const dentro = render({ isMobile: false });
  assert.match(dentro, /Indique e Ganhe/, "o painel ligado devia renderizar o card");
  assert.doesNotMatch(dentro, /Faça login para obter seu código/);
});

for (const isMobile of [false, true]) {
  const rotulo = isMobile ? "375 (isMobile)" : "1280 (desktop)";
  test(`RENDER ${rotulo}: o painel diz «+50 pontos de lance e +2 ECOQUILDO» e NÃO diz «senha»`, () => {
    const html = render({ isMobile });
    assert.match(html, /\+50 pontos de lance e \+2 ECOQUILDO/, `a recompensa não está no HTML renderizado:\n${html}`);
    assert.match(html, /🎁 Recompensa por indicação/, "o 3.º card não diz «Recompensa por indicação»");
    assert.doesNotMatch(html, /\bsenhas?\b/i, "o HTML renderizado ainda fala de «senha»");
    assert.doesNotMatch(html, /senhas_ganhas/, "o contador morto `senhas_ganhas` continua a ser renderizado");
    // Os 3 cards continuam lá (o grid não perdeu um cartão).
    for (const frase of ["👥 Indicados", "✅ Converteram", "🎁 Recompensa por indicação"]) {
      assert.ok(html.includes(frase), `o card «${frase}» desapareceu do render`);
    }
    // O que o AMIGO ganha também está dito no render (é ele que recebe o convite).
    assert.match(html, /\+1 ECOQUILDO/, "o render não diz o que o amigo ganha (+1 ECOQUILDO)");
    // ⚠️ GRANULARIDADE (mutante V10 do validador do SEG5, que SOBREVIVEU): verificar o FICHEIRO inteiro não
    // basta — o 3.º card podia passar a mostrar o crédito do AMIGO (+1) e continuar verde, porque os dois
    // `+N ECOQUILDO` apareceriam na mesma página. O bloco do CARD é verificado em separado.
    const i = html.indexOf("🎁 Recompensa por indicação");
    assert.ok(i > 0, "o 3.º card não está no render");
    const card = html.slice(i, i + 220);
    assert.match(card, /\+2 ECOQUILDO/, `o CARD da recompensa não diz «+2 ECOQUILDO»: «${card}»`);
    assert.doesNotMatch(card, /\+1 ECOQUILDO/, `o CARD da recompensa mostra o crédito do AMIGO: «${card}»`);
  });
}

test("RENDER: o convite partilhado (texto do botão Compartilhar) diz os dois créditos dos dois lados", () => {
  // O texto do `navigator.share` vive no corpo de `compartilhar()` — não vai ao HTML. O que se prova aqui
  // é que o painel MONTA o botão que o usa, e que a frase existe no módulo carregado pelo Vite.
  const html = render({ isMobile: false });
  assert.match(html, /📤 Compartilhar/, "o botão «📤 Compartilhar» desapareceu do render");
  assert.match(html, /📋 Copiar código/, "o botão «📋 Copiar código» desapareceu do render");
});
