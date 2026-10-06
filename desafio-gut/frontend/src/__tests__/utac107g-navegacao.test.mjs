// utac107g-navegacao.test.mjs — UTAC107g. Caminhos mortos (Frente C) + menus sem duplicados (Frente A).
//
// Corre com:  node --test src/__tests__/utac107g-navegacao.test.mjs   (a partir de desafio-gut/frontend)
//
// O `App.jsx` não se renderiza em teste (importa o Privy). A prova de COMPORTAMENTO do router
// faz-se assim: lê-se a árvore de <Route> do próprio App.jsx (sem comentários) e passa-se ao
// `matchRoutes` REAL do react-router-dom — o mesmo algoritmo que decide o ecrã em produção.
// Assim «/edicao/R-1 → catch-all → Início» é medido pelo router, não pela minha leitura.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { matchRoutes } from "react-router-dom";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(join(SRC, rel), "utf8");

/** Código sem comentários (JSX `{/* … *\/}`, blocos e `//` de linha/fim de linha). */
function semComentarios(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'])\/\/.*$/, "$1"))
    .join("\n");
}

const APP = semComentarios(ler("App.jsx"));

/** A árvore de <Route> do App.jsx como objectos do react-router ({ path, index, children }).
 *  Por LINHA (uma <Route> por linha no App.jsx): uma tag que termina em `/>` fecha-se ali; uma
 *  que termina em `>` abre um grupo até ao `</Route>`. ⚠️ Não se pode partir por tags com regex:
 *  o `/>` de `element={<X />}` parece o fecho da <Route> (1.ª versão deste teste, errada). */
function arvoreDeRotas() {
  const bloco = APP.slice(APP.indexOf("<Routes>"), APP.indexOf("</Routes>"));
  assert.ok(bloco.length > 100, "controlo: não encontrei o bloco <Routes> do App.jsx");
  const raiz = { children: [] };
  const pilha = [raiz];
  for (const linha of bloco.split(/\r?\n/)) {
    const t = linha.trim();
    if (t.startsWith("</Route>")) { pilha.pop(); continue; }
    if (!/^<Route\b/.test(t)) continue; // `\b` exclui o próprio «<Routes>» (estava a abrir um grupo)
    const path = t.match(/^<Route\b[^>]*?\bpath=["']([^"']+)["']/)?.[1];
    const no = { ...(path ? { path } : {}), ...(/^<Route\s+index\b/.test(t) ? { index: true } : {}), children: [] };
    pilha[pilha.length - 1].children.push(no);
    if (!t.endsWith("/>")) pilha.push(no);
  }
  assert.equal(pilha.length, 1, "controlo: grupos de <Route> por fechar — o parser leu mal o App.jsx");
  return raiz.children;
}

const ROTAS = arvoreDeRotas();
/** O path (absoluto) da rota-folha que o router escolhe para `url`, ou null. */
function destino(url) {
  const m = matchRoutes(ROTAS, url);
  if (!m) return null;
  const folha = m[m.length - 1].route;
  return folha.index ? "(index)" : folha.path;
}

test("controlo positivo: o router reconstruído resolve as rotas vivas como em produção", () => {
  assert.equal(destino("/"), "(index)");
  assert.equal(destino("/carteira"), "/carteira");
  assert.equal(destino("/mercado"), "/mercado");
  assert.equal(destino("/ativos"), "/ativos");
  assert.equal(destino("/corporativo"), "/corporativo");
  assert.equal(destino("/corporativo/cotas"), "/corporativo/cotas");
  assert.equal(destino("/admin/usuarios/0xabc"), "usuarios/:endereco");
  assert.equal(destino("/produto/7"), "/produto/:id");
});

test("Frente C · `/edicao/:id` e `/corp` deixaram de ter rota — caem no catch-all", () => {
  for (const url of ["/edicao/R-1", "/edicao/PROG-3", "/corp", "/corp?rc=1"]) {
    assert.equal(destino(url.split("?")[0]), "*", `${url} ainda tem rota própria (ou não cai no catch-all)`);
  }
  assert.doesNotMatch(APP, /path=["']\/edicao\//, "a rota /edicao/:id continua registada");
  assert.doesNotMatch(APP, /path=["']\/corp["']/, "a rota /corp continua registada");
  assert.doesNotMatch(APP, /EdicaoDetalhe/, "o App.jsx ainda importa/usa EdicaoDetalhe");
  assert.ok(!existsSync(join(SRC, "pages", "EdicaoDetalhe.jsx")), "pages/EdicaoDetalhe.jsx continua no disco (R18-C)");
});

test("Frente C · o catch-all manda para o Início e não rouba nenhuma rota viva", () => {
  const m = APP.match(/<Route path="\*" element=\{<Navigate to="([^"]+)" replace \/>\} \/>/);
  assert.ok(m, "não há catch-all `<Route path=\"*\" …>`");
  assert.equal(m[1], "/", "o catch-all não manda para o Início");
  // dentro do AppLayout (para ter a navegação) e como ÚLTIMO filho do grupo
  const grupo = ROTAS.find((r) => !r.path && r.children.some((c) => c.path === "*"));
  assert.ok(grupo, "o catch-all não está dentro do grupo do AppLayout");
  assert.equal(grupo.children.at(-1).path, "*", "o catch-all não é o último filho do AppLayout");
  // URLs desconhecidas → catch-all; as rotas técnicas continuam a ter rota própria
  assert.equal(destino("/nao-existe-xyz"), "*");
  assert.equal(destino("/redirect"), "/redirect", "/redirect (retorno OAuth) foi engolida");
  assert.equal(destino("/menor-lance-unico"), "/menor-lance-unico");
  assert.equal(destino("/excluir-conta"), "/excluir-conta");
});

test("Frente C · `/redirect` mantém-se e está ligada ao Privy (rota técnica, documentada)", () => {
  assert.match(APP, /<Route path="\/redirect" element=\{<EntradaOAuth \/>\} \/>/);
  const privy = ler("PrivyRoot.jsx");
  assert.match(privy, /customOAuthRedirectUrl:\s*"https:\/\/[^"]+\/redirect"/, "o Privy deixou de voltar a /redirect");
});

test("Frente A · cada botão dos menus → destino ÚNICO (BottomNav e Sidebar sem caminhos repetidos)", () => {
  const caminhos = (fonte, nome) => {
    const b = semComentarios(fonte).match(new RegExp(`const ${nome} = \\[[\\s\\S]*?\\];`))?.[0];
    assert.ok(b, `não encontrei ${nome}`);
    return [...b.matchAll(/\bpath:\s*"([^"]+)"/g)].map((m) => m[1]);
  };
  const bn = ler("widgets/layout/BottomNav.jsx");
  const sb = ler("widgets/layout/Sidebar.jsx");
  const mobile = [...caminhos(bn, "MAIN_TABS"), ...caminhos(bn, "SECONDARY_LINKS")];
  const desktop = caminhos(sb, "NAV_ITEMS");
  assert.equal(new Set(mobile).size, mobile.length, `BottomNav repete destinos: ${mobile}`);
  assert.equal(new Set(desktop).size, desktop.length, `Sidebar repete destinos: ${desktop}`);
  // e os dois menus levam aos MESMOS destinos (contextos diferentes, mesmo mapa)
  assert.deepEqual([...mobile].sort(), [...desktop].sort());
  // «Meus Ativos» (casa das senhas antigas) continua no «Mais» e no rail
  assert.ok(mobile.includes("/ativos") && desktop.includes("/ativos"));
});

test("Frente A · nenhum destino ficou sem caminho: cada rota de navegação está num menu", () => {
  const bn = semComentarios(ler("widgets/layout/BottomNav.jsx"));
  for (const p of ["/carteira", "/mercado", "/ofertas-programadas", "/vitrine", "/programacao",
                   "/ativos", "/seja-nosso-parceiro", "/regras-oficiais", "/configuracoes"]) {
    assert.match(bn, new RegExp(`path:\\s*"${p.replace(/\//g, "\\/")}"`), `${p} perdeu o caminho no telemóvel`);
    assert.notEqual(destino(p), "*", `${p} perdeu a rota`);
  }
});
