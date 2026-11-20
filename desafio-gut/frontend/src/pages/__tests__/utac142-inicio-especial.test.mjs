// UTAC142 (Frente B) — no Início, a acção da EDIÇÃO ESPECIAL aberta é o formulário padrão (CardLance variante
// «embutida» = FormularioAcao: campo + botão lado a lado), não o botão centrado «⚡ Dar lance» que levava ao /mercado.
// Arnês copiado de Dashboard.test.mjs (o CardLance real arrasta o Privy; o duplo expõe as props no markup).
// O CardLance é lazy no Início: em SSR sai o esqueleto que reserva a altura (CLS 0); a prova da montagem é a fonte.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
// ⚠️ React e o renderizador vêm do MESMO pipeline do servidor (`_ponte-ssr.mjs`), não do Node:
// importá-los pelo Node dá uma instância diferente da que o componente recebe pelo runner SSR,
// deixando o `ReactCurrentDispatcher` a null (`Cannot read properties of null (reading 'useState')`).
let React = null;
let renderToStaticMarkup = null;
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");
let vite = null;
let Pagina = null;
let MemoryRouter = null;
let definirContexto = null;
// UTAC000.9 (DEBT-008)
let definirResultadoOficial = null;
let edicoesPedidas = null;
// UTAC107c
let definirPontos = null;
let chamadasPontos = null;
let definirInventario = null; // UTAC130
let estadoPasse = null;
let tileCarteiraComMemo = null, tilePassesComMemo = null; // UTAC130 (⚠️1 do validador)
// UTAC108h.2 — a separação das edições não-ativas nas duas prateleiras (função pura).
let prateleirasDeEdicoes = null;
// UTAC109f
let definirEmBreve = null;
let getEstadoEdicao = null;

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
        { find: /^\.\.\/components\/CardLance\.jsx$/,  replacement: `${STUBS}/CardLance.jsx` },
        // UTAC000.9 (DEBT-008) — o resultado OFICIAL é o que este ficheiro controla.
        { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS}/useResultadoOficial.js` },
        // UTAC107c — os pontos de CARTÃO do tile «Passe Desafio».
        { find: /^\.\.\/hooks\/usePontos\.js$/, replacement: `${STUBS}/usePontos.js` },
        // UTAC130 — o tile «Passe Desafio» passou a ser o total do inventário.
        { find: /^\.\.\/hooks\/useInventarioPasses\.js$/, replacement: `${STUBS}/useInventarioPasses.js` },
        // UTAC109f — o `EM_BREVE_MODE` real é a constante `true`; o duplo (UTAC108d) deixa testar os DOIS ramos
        // (vidro Relâmpago vazio / com edição; P1 «palpite já!» só existe com a edição ATIVA). Default = true.
        { find: /^\.\.\/lib\/leilaoLock\.js$/, replacement: `${STUBS}/leilaoLock.js` },
      ],
    },
  });
  // A ponte PRIMEIRO: é ela que fixa a instância de React do processo.
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  // UTAC000.9 — duplo do resultado oficial (mesmo ficheiro usado pelos testes do MeusAtivos).
  ({ definirResultadoOficial, argumentos: edicoesPedidas } =
    await vite.ssrLoadModule(`${STUBS}/useResultadoOficial.js`));
  ({ definirPontos, chamadasPontos } = await vite.ssrLoadModule(`${STUBS}/usePontos.js`));
  ({ definirInventario } = await vite.ssrLoadModule(`${STUBS}/useInventarioPasses.js`));
  // react-router-dom é CJS: carregado pelo node, que é o que o Vite externaliza em SSR.
  ({ MemoryRouter } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ default: Pagina, estadoPasse, prateleirasDeEdicoes, tileCarteiraComMemo, tilePassesComMemo } = await vite.ssrLoadModule("/src/pages/Dashboard.jsx"));
  ({ definirEmBreve } = await vite.ssrLoadModule(`${STUBS}/leilaoLock.js`));
  ({ getEstadoEdicao } = await vite.ssrLoadModule("/src/utils/edicao.js"));
});
after(async () => { if (vite) await vite.close(); });

const H = 3_600_000;
const iso = (ms) => new Date(ms).toISOString();
const especial = (inicioMs, extra = {}) => ({
  id: "ESPECIAL-AIRFRYER", tipo: "programado", produto: "Air Fryer",
  inicio_em: iso(inicioMs), termino_em: iso(inicioMs + H / 2),
  status: "agendado", imagem_url: "/artes/edicao-especial-airfryer.jpg", lances: 0, ...extra,
});
const R1 = { id: "R-1", tipo: "relampago", produto: null, termino_em: iso(Date.now() + 24 * H), lances: 0, status: "aberto" };

function renderizar(contexto = {}) {
  definirContexto({
    lances: [], vencedor: null,
    saldoSenhas: null, saldoSenhasStatus: "idle", saldoRsCentavos: null, saldoRsStatus: "idle",
    authToken: null, fecharOverlay: () => {},
    encerrado: false, modalidade: "flash", DURACAO: { flash: 1800, programado: 86400 },
    pareceAutenticado: false, address: null, userLabel: null, EDICAO_ATIVA: "R-1",
    showOverlay: false, showCountdown: false, handleNovaRodada: () => {}, setPrazoTimestamp: () => {},
    edicoes: { "R-1": R1 }, agendadas: {}, offsetRelogioMs: 0,
    isConnected: false, ready: true, abrirModal: () => {}, desconectar: () => {},
    ...contexto,
  });
  return renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(Pagina)),
  );
}

const aberta = () => especial(Date.now() - H / 4, { tipo: "relampago", status: "ativo", termino_em: iso(Date.now() + H) });
const slot = (html) => html.slice(html.indexOf('data-slot="edicao-especial"'));

describe("UTAC142 · Início — especial aberta com o formulário padrão", () => {
  test("B1 · especial ABERTA: no slot sai o esqueleto do formulário, e NÃO o botão «⚡ Dar lance»", () => {
    const html = renderizar({ edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": aberta() } });
    assert.ok(/data-slot="edicao-especial"/.test(html), "a especial não está no slot");
    assert.match(slot(html), /data-testid="esqueleto-acao-especial"/);
    assert.doesNotMatch(slot(html), /⚡ Dar lance/, "o botão centrado voltou à especial");
  });

  test("B2 · fonte: a especial monta o CardLance EMBUTIDO com a edição e o handler do contexto (sem navigate)", async () => {
    const { readFileSync } = await import("node:fs");
    const s = readFileSync(new URL("../Dashboard.jsx", import.meta.url), "utf8");
    const bloco = s.slice(s.indexOf("<CardEdicaoEspecial"), s.indexOf(") : estAtiva.emBreve ?"));
    assert.match(bloco, /<CardLance[\s\S]*variante="embutida"/);
    assert.match(bloco, /idEdicao=\{idEdicao\}/);
    assert.match(bloco, /onLanceSucesso=\{handleLanceSucesso\}/);
    assert.doesNotMatch(bloco, /BotaoDarLance|navigate\(/);
  });

  test("B3 · BIDIRECCIONAL: sem especial, o vidro Relâmpago continua com o botão de sempre", () => {
    const html = renderizar({ edicoes: { "R-1": R1 } });
    assert.doesNotMatch(html, /esqueleto-acao-especial/);
  });
});
