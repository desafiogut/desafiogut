// utac106h-regras.test.mjs — UTAC106h → UTAC110h · Regras Oficiais (página /regras-oficiais).
//
// UTAC110h (R18-110h-A): a página publica o REGULAMENTO OFICIAL v5.0 INTEGRAL, lido de
// `docs/REGULAMENTO-v5.md`. Este ficheiro guarda:
//   1. FONTE ÚNICA — o corpo de `docs/REGULAMENTO-v5.md` é IGUAL, byte a byte, ao corpo de
//      `docs/GUTO-REGULAMENTO.md` (o que o GUTO lê) ⇒ app e GUTO dizem o mesmo;
//   2. COBERTURA TOTAL — cada parágrafo do documento aparece na página (não é amostra: fecha o
//      «ponto cego D» do UTAC106h, que só comparava 21 factos);
//   3. ESTRUTURA — os 12 capítulos (em <h2>, pela ordem) e os 72 artigos (1..72, sem lacunas);
//   4. TERMOS — proibidos (senha · torneio de habilidade · Portaria SPA/MF 1.207/2024) e
//      obrigatórios (Passe · pontos de fidelidade · ECOQUILDO · cartão colecionável · competição de
//      habilidade), com prova BIDIRECCIONAL: o mesmo verificador REPROVA o Regulamento v4 e as
//      Regras Oficiais v1.0 (que continuam no repo);
//   5. ROTA + LINKS (inalterados desde o UTAC106h).
// «cotas» NÃO é termo proibido (R18-110h-B): o v5 aprovado usa «Cotas Bronze/Prata/Ouro/Diamante».
//
// Instrumentos do repo: `_servidor-teste.mjs` + duplo do router (`_stubs-106c/rr.jsx`). ⚠️ LIMITE
// DECLARADO: sem DOM real; «renderiza» é o markup SSR, não o pixel (o pixel está nas capturas do
// UTAC110h, `_logs/utac110h-browser/`).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(AQUI, "..", "..", "..");
const REPO = resolve(FRONTEND, "..", "..");
const STUBS_106C = resolve(AQUI, "..", "..", "__tests__", "_stubs-106c");

const ALIASES = [{ find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` }];

const lerDoc = (nome) => readFileSync(resolve(REPO, "docs", nome), "utf8").replace(/\r\n/g, "\n");
const MD_V5 = lerDoc("REGULAMENTO-v5.md");
const MD_GUTO = lerDoc("GUTO-REGULAMENTO.md");
const CORPO_V5 = MD_V5.slice(MD_V5.indexOf("\n---\n\n") + 6);
const CORPO_GUTO = MD_GUTO.slice(MD_GUTO.indexOf("\nREGULAMENTO OFICIAL DO DESAFIOGUT\n") + 1);
const colapsar = (s) => s.replace(/\s+/g, " ").trim();

let vite, React, renderToStaticMarkup, mod, html, texto;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(FRONTEND, "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  mod = await vite.ssrLoadModule("/src/pages/RegrasOficiais.jsx");
  html = renderToStaticMarkup(React.createElement(mod.default));
  texto = colapsar(html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
});
after(async () => { if (vite) await vite.close(); });

// ── 1. Fonte única: o documento do repo é o texto que o GUTO lê ─────────────────────────────────
test("FONTE · o corpo de docs/REGULAMENTO-v5.md é IGUAL, byte a byte, ao de docs/GUTO-REGULAMENTO.md", () => {
  assert.ok(MD_V5.includes("\n---\n\n"), "falta o separador cabeçalho/corpo");
  assert.ok(CORPO_V5.startsWith("REGULAMENTO OFICIAL DO DESAFIOGUT\n"), "o corpo tem de começar no título do Regulamento");
  assert.equal(CORPO_V5, CORPO_GUTO, "o Regulamento do repo divergiu do que o GUTO lê");
});

test("FONTE · o cabeçalho declara versão, vigência e a regra de alteração", () => {
  const cab = MD_V5.slice(0, MD_V5.indexOf("\n---\n\n"));
  assert.match(cab, /REGULAMENTO OFICIAL DO DESAFIOGUT/);
  assert.match(cab, /Versão 5\.0 · Vigente a partir de 02 de novembro de 2026/);
  assert.match(cab, /Fonte de verdade para o repo, o app e o GUTO\./);
  assert.match(cab, /Não alterar sem aprovação do operador\./);
});

test("FONTE · a página não escreve texto jurídico à mão: importa o .md em bruto", () => {
  const jsx = readFileSync(resolve(FRONTEND, "src", "pages", "RegrasOficiais.jsx"), "utf8");
  const codigo = jsx.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.match(codigo, /from "\.\.\/\.\.\/\.\.\/\.\.\/docs\/REGULAMENTO-v5\.md\?raw"/);
  for (const juridico of ["R$ 2,00", "pontos de fidelidade", "ECOQUILDO", "23.040.066/0001-00", "Comarca de Manaus"]) {
    assert.ok(!codigo.includes(juridico), `texto jurídico escrito à mão na página: «${juridico}»`);
  }
});

// ── 2. Cobertura total: cada parágrafo do documento está na página ─────────────────────────────
test("COBERTURA · TODOS os parágrafos do Regulamento aparecem na página (não é amostra)", () => {
  const paragrafos = CORPO_V5.split(/\n\s*\n/).map((s) => colapsar(s.replace(/^- /, ""))).filter(Boolean);
  assert.ok(paragrafos.length >= 130, `esperava >= 130 parágrafos (medido: 136), vi ${paragrafos.length}`);
  const faltam = paragrafos.filter((p) => !texto.includes(p));
  assert.deepEqual(faltam, [], `a página não publica ${faltam.length} parágrafo(s)`);
});

// Achado do validador SEG5: `includes` mede PRESENÇA, não igualdade — texto duplicado ou uma
// cláusula inventada passavam. Aqui a sequência de palavras da página (do 1.º capítulo ao fim do
// rodapé) tem de ser IGUAL à do documento (do 1.º capítulo ao fim).
test("COBERTURA · a página publica EXACTAMENTE as palavras do documento, pela ordem (nada a mais, nada a menos)", () => {
  const palavras = (s) => colapsar(s).split(" ").filter(Boolean);
  const doDoc = palavras(CORPO_V5.slice(CORPO_V5.indexOf("CAPÍTULO I —")).replace(/^- /gm, ""));
  const ini = html.indexOf("<section");
  const fim = html.indexOf("<p data-fim-regulamento");
  assert.ok(ini > 0 && fim > ini, "marcadores da página em falta");
  const trecho = html.slice(ini, fim).replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const daPagina = palavras(trecho);
  assert.equal(daPagina.length, doDoc.length, `contagem de palavras: página ${daPagina.length} vs documento ${doDoc.length}`);
  assert.deepEqual(daPagina, doDoc);
});

test("ACESSIBILIDADE · os alvos de toque da página (sumário e «Voltar») têm 48 px", () => {
  const jsx = readFileSync(resolve(FRONTEND, "src", "pages", "RegrasOficiais.jsx"), "utf8");
  assert.match(jsx, /const linkSumario = \{[^}]*minHeight: "48px"/);
  assert.match(jsx, /<Link to="\/" style=\{\{[^}]*minHeight: "48px"/);
  assert.match(html, /data-rodape/);
  assert.ok(html.indexOf("data-rodape") > html.lastIndexOf("gut-glass-standard"), "o rodapé tem de viver dentro do último vidro");
});

// ── 3. Estrutura: 12 capítulos, 72 artigos ──────────────────────────────────────────────────────
test("ESTRUTURA · um <h1> com o título e a vigência do v5.0", () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1[^>]*>REGULAMENTO OFICIAL DO DESAFIOGUT<\/h1>/);
  assert.ok(texto.includes("Versão 5.0 · Vigente a partir de 02 de novembro de 2026"));
  assert.equal(mod.VERSAO_REGULAMENTO, "5.0");
});

test("ESTRUTURA · os 12 capítulos em <h2>, pela ordem do documento", () => {
  const doMd = [...CORPO_V5.matchAll(/^CAPÍTULO ([IVXL]+) — (.+)$/gm)].map((m) => `CAPÍTULO ${m[1]} — ${m[2]}`);
  assert.equal(doMd.length, 12);
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => colapsar(m[1].replace(/<!-- -->/g, "")));
  const capsPagina = h2.filter((t) => t.startsWith("CAPÍTULO "));
  assert.deepEqual(capsPagina, doMd);
});

test("ESTRUTURA · os 72 artigos, de 1º a 72º, sem lacunas e pela ordem", () => {
  const nums = [...html.matchAll(/<strong[^>]*>Art\. (\d+)º<\/strong>/g)].map((m) => Number(m[1]));
  assert.deepEqual(nums, Array.from({ length: 72 }, (_, i) => i + 1));
});

test("ESTRUTURA · sumário com 12 âncoras que existem na página", () => {
  const hrefs = [...html.matchAll(/href="#(cap-[ivxl]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, 12);
  for (const h of hrefs) assert.ok(html.includes(`id="${h}"`), `âncora sem destino: ${h}`);
});

test("PARSER · as frases partidas pelo PDF são unidas e os itens ficam no artigo certo", () => {
  const arts = Object.fromEntries(mod.REGULAMENTO.capitulos.flatMap((c) => c.blocos).filter((b) => b.tipo === "artigo").map((b) => [b.rotulo, b]));
  assert.equal(Object.keys(arts).length, 72);
  assert.ok(arts["Art. 20º"].texto.endsWith("nos termos do Capítulo VI deste Regulamento."));
  assert.ok(arts["Art. 42º"].texto.includes("confirmação do resultado da edição, antes do despacho"));
  assert.ok(arts["Art. 53º"].texto.includes("produto patrocinado do Relâmpago) poderá ser realizada via PIX"));
  assert.deepEqual([13, 22, 25, 43, 48].map((n) => arts[`Art. ${n}º`].itens.length), [5, 6, 5, 6, 2]);
  assert.match(mod.REGULAMENTO.rodape, /\(CNPJ 23\.040\.066\/0001-00\)\. Versão 5\.0 — vigente a partir de 02 de novembro de 2026\.$/);
  assert.equal(mod.REGULAMENTO.capitulos.flatMap((c) => c.blocos).filter((b) => b.tipo === "paragrafo").length, 0);
});

// ── 4. Termos: proibidos / obrigatórios — BIDIRECCIONAL ────────────────────────────────────────
const PROIBIDOS = [/\bsenhas?\b/i, /torneio de habilidade/i, /Portaria SPA\/MF/i, /1\.207\/2024/];
const OBRIGATORIOS = ["Passe", "pontos de fidelidade", "ECOQUILDO", "cartão colecionável", "competição de habilidade"];
function violacoes(t) {
  return [
    ...PROIBIDOS.filter((re) => re.test(t)).map((re) => `proibido: ${re}`),
    ...OBRIGATORIOS.filter((o) => !t.includes(o)).map((o) => `em falta: ${o}`),
  ];
}

test("TERMOS · a página v5.0 passa: zero proibidos, todos os obrigatórios", () => {
  assert.deepEqual(violacoes(texto), []);
});

test("TERMOS · BIDIRECCIONAL — o mesmo verificador REPROVA o Regulamento v4", () => {
  const v = violacoes(lerDoc("REGULAMENTO-v4.md"));
  assert.ok(v.some((x) => x.startsWith("proibido")), "o v4 tinha de cair por termo proibido");
  assert.ok(v.includes("em falta: ECOQUILDO"));
});

test("TERMOS · BIDIRECCIONAL — o mesmo verificador REPROVA as Regras Oficiais v1.0 (texto antigo da página)", () => {
  const v = violacoes(lerDoc("regras-oficiais.md"));
  assert.ok(v.includes("proibido: /torneio de habilidade/i"));
  assert.ok(v.includes("em falta: pontos de fidelidade"));
});

test("TERMOS · R18-110h-B — «Cotas» é do v5 aprovado e NÃO é violação", () => {
  assert.ok(texto.includes("Cotas Bronze e Cotas Prata"));
  assert.deepEqual(violacoes("Cotas Ouro e Cotas Diamante · " + OBRIGATORIOS.join(" ")), []);
});

// ── 5. Factos que a Google Play exige divulgados (todos vindos do texto do v5) ─────────────────
test("PLAY · proporções fixas, palpite subordinado, habilidade e elementos obrigatórios", () => {
  for (const f of [
    "preço fixo de R$ 2,00 (dois reais)",
    "1 (um) Passe Desafio = 10 (dez) pontos de fidelidade",
    "50 (cinquenta) pontos de fidelidade = 1 (um) cartão colecionável físico",
    "Os pontos de bónus do palpite não contam para o resgate do cartão colecionável",
    "não de mecanismos de aleatoriedade",
    "7 (sete) dias corridos",
    "Lei Geral de Proteção de Dados",
    "desafiogut01@gmail.com",
    "23.040.066/0001-00",
    "Comarca de Manaus/AM",
  ]) assert.ok(texto.includes(f), `a página não divulga «${f}»`);
});

test("RENDER · tem link de volta ao app", () => {
  assert.match(html, /href="\/"/);
  assert.match(texto, /Voltar ao app/);
});

// ── 6. Rota + links (o utilizador tem de CONSEGUIR chegar lá) ─────────────────────────────────
const ler = (rel) => readFileSync(resolve(FRONTEND, rel), "utf8");

test("ROTA · /regras-oficiais está registada no App.jsx (lazy + <Route>)", () => {
  const app = ler("src/App.jsx");
  assert.match(app, /const RegrasOficiais\s*=\s*lazy\(\(\) => import\("\.\/pages\/RegrasOficiais\.jsx"\)\)/);
  assert.match(app, /<Route path="\/regras-oficiais" element=\{<RegrasOficiais \/>\}/);
  const dentro = app.slice(app.indexOf("<Route element={<AppLayout />}>"));
  assert.ok(dentro.includes('path="/regras-oficiais"'), "a rota tem de viver dentro do AppLayout");
});

test("LINK · «Mais» (BottomNav.SECONDARY_LINKS) tem as Regras Oficiais", () => {
  const nav = ler("src/widgets/layout/BottomNav.jsx");
  const bloco = nav.slice(nav.indexOf("const SECONDARY_LINKS"), nav.indexOf("const SECONDARY_LINKS") + 1400);
  assert.match(bloco, /path: "\/regras-oficiais"/);
});

test("LINK · a Sidebar tem as Regras Oficiais na MESMA posição relativa (ordem sincronizada)", () => {
  const nav = ler("src/widgets/layout/BottomNav.jsx");
  const side = ler("src/widgets/layout/Sidebar.jsx");
  const ordemNav = [...nav.matchAll(/path: "(\/[a-z-]+)"/g)].map((m) => m[1]);
  const ordemSide = [...side.matchAll(/path: "(\/[a-z-]+)"/g)].map((m) => m[1]);
  const secundarios = ["/vitrine", "/programacao", "/ativos", "/regras-oficiais", "/configuracoes"];
  for (const p of secundarios) {
    assert.ok(ordemNav.includes(p), `BottomNav sem ${p}`);
    assert.ok(ordemSide.includes(p), `Sidebar sem ${p}`);
  }
  const posNav = secundarios.map((p) => ordemNav.indexOf(p));
  const posSide = secundarios.map((p) => ordemSide.indexOf(p));
  assert.deepEqual(posNav, [...posNav].sort((a, b) => a - b), "BottomNav fora de ordem");
  assert.deepEqual(posSide, [...posSide].sort((a, b) => a - b), "Sidebar fora de ordem");
});

test("LINK · as Ofertas Programadas e o acesso rápido do Início ligam às Regras Oficiais", () => {
  assert.match(ler("src/pages/OfertasProgramadas.jsx"), /to="\/regras-oficiais"/);
  assert.match(ler("src/pages/Dashboard.jsx"), /to: "\/regras-oficiais"/);
});
