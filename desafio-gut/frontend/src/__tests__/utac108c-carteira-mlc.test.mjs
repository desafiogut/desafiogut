// utac108c-carteira-mlc.test.mjs — UTAC108c (D-1). O botão «⚡ Menor Lance Único» da Carteira NAVEGA
// SEMPRE: sem `disabled`, mesmo com saldo R$ 0,00 ou ainda a carregar (Opção A do operador).
//
// Corre com:  node --test src/__tests__/utac108c-carteira-mlc.test.mjs   (a partir de desafio-gut/frontend)
// Mesmo arnês do `utac106c-carteira-render.test.mjs` (Carteira REAL + condutor de hooks + duplos de
// fronteira). ⚠️ Mede-se a PROP `disabled` do elemento: o `clicar()` chama o `onClick` directamente e,
// por isso, sozinho, passaria mesmo com o botão desactivado — é a prop que diz o que o browser faz.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = resolve(AQUI, "_stubs-106c");
const STUB_CONTEXTO = resolve(AQUI, "..", "pages", "__tests__", "_stubs", "AppContext.jsx");
const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/,       replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/,  replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/,     replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS}/child.jsx` },
  { find: /^\.\.\/\.\.\/hooks\/useAdmin\.js$/,      replacement: `${STUBS}/useAdmin.js` },
  { find: /^react-router-dom$/,                     replacement: `${STUBS}/rr.jsx` },
];

let vite = null, montar = null, definirContexto = null, MinhaCarteira = null;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs");
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

function arvore(raiz) {
  const fora = [];
  (function walk(n) {
    if (n == null || typeof n === "boolean") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    fora.push(n);
    if (n.props) walk(n.props.children);
  })(raiz);
  return fora;
}
function texto(n) {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(texto).join("");
  return n.props ? texto(n.props.children) : "";
}

const BASE = {
  isConnected: true, abrirModal: () => {}, address: "0xAbC1230000000000000000000000000000004567",
  user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, refetchSaldoRs: () => {}, setModalidade: () => {},
  privyWallet: null, saldoSenhas: 0, saldoSenhasStatus: "ok", userLabel: "Teste", desconectar: () => {},
};

async function botaoMlc(saldoRsCentavos, saldoRsStatus) {
  globalThis.__NAVEGADAS = [];
  definirContexto({ ...BASE, saldoRsCentavos, saldoRsStatus });
  const ctrl = montar(MinhaCarteira, []);
  await ctrl.assentar();
  const b = arvore(ctrl.resultado()).find((n) => n.type === "button" && texto(n).includes("Menor Lance Único"));
  assert.ok(b, "não encontrei o botão «Menor Lance Único»");
  return { b, ctrl };
}

// Os três estados que o `disabled={!saldoReais}` antigo bloqueava + o controlo com saldo.
for (const [nome, centavos, status] of [
  ["saldo R$ 0,00 (lido)", 0, "ok"],
  ["saldo ainda a carregar (null)", null, "loading"],
  ["erro de leitura do saldo (null)", null, "error"],
  ["controlo: saldo R$ 12,34", 1234, "ok"],
]) {
  test(`UTAC108c/D-1 · ${nome}: o botão NÃO está desactivado e o clique navega para /mercado`, async () => {
    const { b, ctrl } = await botaoMlc(centavos, status);
    assert.ok(!b.props.disabled, `o botão continua desactivado (disabled=${JSON.stringify(b.props.disabled)})`);
    assert.notEqual(b.props.style?.cursor, "not-allowed", "o cursor ainda diz «proibido»");
    assert.notEqual(b.props.style?.opacity, 0.5, "o botão ainda parece desactivado (opacidade 0,5)");
    b.props.onClick();
    await ctrl.assentar();
    assert.deepEqual(globalThis.__NAVEGADAS, ["/mercado"], `navegou para: ${JSON.stringify(globalThis.__NAVEGADAS)}`);
  });
}

test("UTAC108c/D-1 · o `title` deixou de mandar «Deposite PIX primeiro» (texto neutro)", async () => {
  const { b } = await botaoMlc(0, "ok");
  assert.equal(b.props.title, "Ir para o Menor Lance Único");
});

test("UTAC108c · os outros 3 botões da grelha continuam clicáveis com saldo 0 (nenhum ficou desactivado)", async () => {
  globalThis.__NAVEGADAS = [];
  definirContexto({ ...BASE, saldoRsCentavos: 0, saldoRsStatus: "ok" });
  const ctrl = montar(MinhaCarteira, []);
  await ctrl.assentar();
  const botoes = arvore(ctrl.resultado()).filter((n) => n.type === "button");
  for (const r of ["Depositar PIX", "Comprar Passe Desafio", "Ofertas Programadas"]) {
    const b = botoes.find((x) => texto(x).includes(r));
    assert.ok(b, `faltou o botão «${r}»`);
    assert.ok(!b.props.disabled, `«${r}» está desactivado`);
  }
});
