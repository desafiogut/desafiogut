// UTAC110h.3 · FRENTE F — teste de COMPORTAMENTO do `src/Boot.jsx` (o que o 110h.1 deixou como X7).
//
// PORQUE EXISTE: o `Boot.jsx` decide se a app arranca pelo GATE LGPD ou carrega a aplicação (e o Privy,
// 2,7 MB). Não tinha UM único teste de comportamento — só a validação de texto das citações do gate
// (`citacoesRegulamento.test.mjs`). Uma regressão aqui ou mostra o gate a quem já aceitou (bloqueia a
// entrada) ou salta o gate a quem não aceitou (risco legal).
//
// COMO: SSR real do componente (arnês `_servidor-teste.mjs` + `_ponte-ssr.mjs`), com dois aliases —
// `react-router-dom` → stub local (`useLocation`) porque o Boot usa router — e o storage do browser
// simulado em `globalThis`. ⚠️ LIMITE DECLARADO: em SSR o `useEffect` não corre, logo o carregamento do
// Sentry (`requestIdleCallback`) e o `import()` do PrivyRoot (lazy) não são exercidos; o que se prova é
// a DECISÃO do arranque (gate vs app) nos 4 estados de consentimento. O ramo «aceite na versão antiga»
// é o mecanismo do MC88.31 (subir VERSAO_CONSENTIMENTO obriga a re-aceitar).
//
// node --test --test-concurrency=1 src/__tests__/utac110h3-boot-comportamento.test.mjs
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUB_RR = resolve(AQUI, "_stubs-106c", "rr.jsx");

let vite = null;
let React = null;
let renderToStaticMarkup = null;
let Boot = null;
let CHAVE = null;
let VERSAO = null;

/** Storage simulado (o Boot lê-o SÍNCRONO no 1.º render). `null` = chave ausente. */
function montarStorage(valorLocal, valorSessao = null) {
  const fazer = (valor) => ({
    getItem: (k) => (k === CHAVE && valor !== null ? valor : null),
    setItem: () => {}, removeItem: () => {}, clear: () => {},
  });
  globalThis.localStorage = fazer(valorLocal);
  globalThis.sessionStorage = fazer(valorSessao);
}

before(async () => {
  const { createServer } = await import(
    pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: [{ find: /^react-router-dom$/, replacement: STUB_RR }] }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ CHAVE_CONSENTIMENTO: CHAVE, VERSAO_CONSENTIMENTO: VERSAO } =
    await vite.ssrLoadModule("/src/components/TermosConsentimento.jsx"));
  Boot = (await vite.ssrLoadModule("/src/Boot.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

beforeEach(() => { montarStorage(null); });

const render = () => renderToStaticMarkup(React.createElement(Boot));
/** O gate tem marcas próprias: o título e a 1.ª checkbox. */
const temGate = (html) => /Li e compreendi o regulamento/.test(html) && /Termos de Consentimento|Aceito os Termos/.test(html);

test("controlo positivo: o instrumento distingue o gate da app", () => {
  const semNada = render();
  assert.ok(temGate(semNada), "sem consentimento, o Boot TEM de mostrar o gate LGPD");
  montarStorage(JSON.stringify({ aceito: true, versao: VERSAO }));
  const comAceite = render();
  assert.ok(!temGate(comAceite), "com consentimento aceite, o gate NÃO pode aparecer");
});

test("ESTADO 1 — sem consentimento guardado → GATE (e a app não é carregada)", () => {
  const html = render();
  assert.ok(temGate(html), "o gate devia ser a primeira tela");
});

test("ESTADO 2 — aceite na versão CORRENTE → app (gate fora do caminho)", () => {
  montarStorage(JSON.stringify({ aceito: true, versao: VERSAO, em: "2026-10-15T00:00:00.000Z" }));
  const html = render();
  assert.ok(!temGate(html), "quem já aceitou a versão corrente não pode ser questionado outra vez");
});

test("ESTADO 3 (BIDIRECCIONAL) — aceite numa versão ANTIGA → volta o GATE (MC88.31)", () => {
  montarStorage(JSON.stringify({ aceito: true, versao: "2.0" }));
  const html = render();
  assert.ok(temGate(html), "um aceite de versão antiga tem de ser invalidado (subir a versão obriga a re-aceitar)");
});

test("ESTADO 4 — só o sessionStorage tem o aceite → ainda vale (compatibilidade MC88.31)", () => {
  montarStorage(null, JSON.stringify({ aceito: true, versao: VERSAO }));
  const html = render();
  assert.ok(!temGate(html), "o aceite antigo em sessionStorage continua válido na mesma versão");
});

test("ESTADO 5 — storage corrompido (JSON inválido) → GATE, e sem rebentar", () => {
  montarStorage("{isto não é json");
  const html = render();
  assert.ok(temGate(html), "JSON inválido tem de cair no gate (fail-closed), não lançar");
});

test("ESTADO 6 — aceite:true mas versão em falta → GATE (a versão é obrigatória)", () => {
  montarStorage(JSON.stringify({ aceito: true }));
  const html = render();
  assert.ok(temGate(html), "sem `versao` o aceite não pode valer");
});

test("o Boot NÃO importa o Privy no arranque do gate (arranque leve, MC82.2)", async () => {
  // Prova por GRAFO de módulos: o `PrivyRoot` só entra por `import()` dinâmico — o módulo do Boot não
  // pode ter um import estático de Privy/ethers (era o que custava 4 MB antes do gate).
  const fonte = await vite.transformRequest("/src/Boot.jsx").then((r) => r.code);
  assert.doesNotMatch(fonte, /^import\s.*privy/im, "o Boot passou a importar Privy ESTATICAMENTE");
  assert.match(fonte, /import\(["'][^"']*PrivyRoot\.jsx["']\)/, "o PrivyRoot deixou de ser carregado por import dinâmico");
  assert.match(fonte, /\blazy\(/, "o code-splitting do PrivyRoot desapareceu do Boot");
});
