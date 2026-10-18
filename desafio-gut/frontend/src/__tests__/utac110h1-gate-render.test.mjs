// utac110h1-gate-render.test.mjs — UTAC110h.1 · o gate legal (v5.0) RENDERIZADO e CLICADO.
//
// O que prova (o enunciado pede «4 caixas funcionais»): o componente REAL corre no condutor de
// hooks do repo; marcar as 4 caixas liga o botão; aceitar grava no aparelho o aceite com a
// versão "3.0" e as 4 declarações; com 3 de 4 o botão continua desligado e nada é gravado.
//
// ⚠️ LIMITE DECLARADO: o «clique» chama o `onChange`/`onClick` do elemento React (sem DOM, sem CSS).
// Prova-se «handler → estado → novo render» e o efeito gravado; o layout prova-se pelas capturas.
//
// node --test src/__tests__/utac110h1-gate-render.test.mjs   (a partir de desafio-gut/frontend)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
let vite = null, React = null, renderToStaticMarkup = null, montar = null, Gate = null, mod = null;

// localStorage do aparelho (o gate grava aí o aceite — MC88.31).
const armazem = new Map();
globalThis.localStorage = {
  getItem: (k) => (armazem.has(k) ? armazem.get(k) : null),
  setItem: (k, v) => { armazem.set(k, String(v)); },
  removeItem: (k) => { armazem.delete(k); },
};

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: [] }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  mod = await vite.ssrLoadModule("/src/components/TermosConsentimento.jsx");
  Gate = mod.default;
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

async function montarGate() {
  armazem.clear();
  const aceites = [];
  const ctrl = montar(Gate, [{ onAceitar: () => aceites.push(1) }]);
  await ctrl.assentar();
  const nos = () => arvore(ctrl.resultado());
  const caixas = () => nos().filter((n) => n.type === "input" && n.props.type === "checkbox");
  const botao = () => nos().find((n) => n.type === "button");
  const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()));
  async function marcar(i) { caixas()[i].props.onChange({ target: { checked: true } }); await ctrl.assentar(); }
  async function aceitar() { botao().props.onClick(); await ctrl.assentar(); }
  return { caixas, botao, html, marcar, aceitar, aceites };
}

test("controlo positivo: o gate renderiza com 4 caixas, desmarcadas, e o botão desligado", async () => {
  const g = await montarGate();
  assert.equal(g.caixas().length, 4, "esperava 4 caixas de aceite");
  assert.ok(g.caixas().every((c) => c.props.checked === false), "uma caixa nasceu marcada");
  assert.equal(g.botao().props.disabled, true, "o botão nasceu ligado");
  assert.match(g.html(), /Regulamento Oficial v5\.0/);
});

test("as 4 caixas marcadas ligam o botão; aceitar grava a versão do termo com as 4 declarações", async () => {
  const g = await montarGate();
  for (const i of [0, 1, 2, 3]) await g.marcar(i);
  assert.equal(g.botao().props.disabled, false, "com as 4 caixas o botão continua desligado");
  await g.aceitar();
  assert.equal(g.aceites.length, 1, "onAceitar não foi chamado");
  const salvo = JSON.parse(armazem.get(mod.CHAVE_CONSENTIMENTO));
  // UTAC110k.1: a versão subiu para 3.1 (Regulamento v5.1). O teste passou a comparar com a
  // CONSTANTE — uma literal aqui obrigaria a editar o teste a cada versão nova, sem medir nada.
  assert.equal(salvo.versao, mod.VERSAO_CONSENTIMENTO, "o aceite não foi gravado com a versão vigente do termo");
  // ⚠️ UTAC110m.2 (2026-10-18): a versão subiu para **3.3** (o Regulamento mudou de texto em 5
  // artigos e a frente C reduziu uma promessa — o ECOQUILDO deixou de valer no aplicativo).
  // Valor anterior desta asserção: "3.2" (E-3, Política revista).
  assert.equal(salvo.versao, "3.3", "controlo: a versão vigente hoje é a do Regulamento corrigido (UTAC110m.2)");
  assert.deepEqual(salvo.aceitos, { lido: true, maiores: true, termos: true, privacidade: true });
});

test("BIDIRECCIONAL: com 3 de 4 caixas o botão fica desligado e NADA é gravado", async () => {
  for (const falta of [0, 1, 2, 3]) {
    const g = await montarGate();
    for (const i of [0, 1, 2, 3]) if (i !== falta) await g.marcar(i);
    assert.equal(g.botao().props.disabled, true, `sem a caixa ${falta} o botão ficou ligado`);
    await g.aceitar(); // o handler tem a sua própria guarda (tudoAceito)
    assert.equal(g.aceites.length, 0, `sem a caixa ${falta} o aceite passou`);
    assert.equal(armazem.has(mod.CHAVE_CONSENTIMENTO), false, `sem a caixa ${falta} gravou-se um aceite`);
  }
});

test("o texto renderizado do gate: v5 dentro, modelo antigo fora; links para as Regras e a Privacidade", async () => {
  const g = await montarGate();
  const h = g.html();
  for (const re of [/\bsenhas?\b/i, /torneio/i, /O MENOR LANCE ÚNICO GANHA/i, /Agência/i])
    assert.doesNotMatch(h, re, `o gate renderizado mostra ${re}`);
  for (const re of [/Passe Desafio/, /pontos de fidelidade/, /ECOQUILDO/, /competição de\s+habilidade/, /2 de novembro de 2026/])
    assert.match(h, re, `o gate renderizado perdeu ${re}`);
  assert.ok((h.match(/href="\/regras-oficiais"/g) || []).length >= 1, "falta o link para /regras-oficiais");
  assert.match(h, /href="\/privacidade"/, "falta o link para /privacidade");
});
