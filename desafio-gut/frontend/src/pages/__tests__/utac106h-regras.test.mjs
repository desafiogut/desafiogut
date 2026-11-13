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
// ⚠️ UTAC137 — a página publica o Regulamento **v6.0** (`docs/REGULAMENTO-v6.md`, o texto registado no RTD). As guardas
// abaixo mantêm a força das do v5 (fonte única com o GUTO, cobertura total, palavras exactas pela ordem, estrutura),
// medidas contra o v6. O v5 continua lido para provar que o parser não o partiu (compatibilidade).
const MD_V5 = lerDoc("REGULAMENTO-v5.md");
const MD_V6 = lerDoc("REGULAMENTO-v6.md");
const MD_GUTO = lerDoc("GUTO-REGULAMENTO.md");
const CORPO_GUTO = MD_GUTO.slice(MD_GUTO.indexOf("\n---\n\n") + 6);
/** As linhas do v6 sem a marcação Markdown («# », «## ») — o que a página tem de mostrar. */
const LINHAS_V6 = MD_V6.split("\n").map((l) => colapsarLinha(l.replace(/^#+\s*/, ""))).filter(Boolean);
function colapsarLinha(s) { return s.replace(/\s+/g, " ").trim(); }
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
test("FONTE · o corpo de docs/GUTO-REGULAMENTO.md é docs/REGULAMENTO-v6.md, byte a byte", () => {
  assert.ok(MD_GUTO.includes("\n---\n\n"), "falta o separador cabeçalho/corpo no documento do GUTO");
  assert.ok(MD_V6.startsWith("# REGULAMENTO OFICIAL DO APLICATIVO DESAFIOGUT (VERSÃO 6.0)"), "o v6 tem de começar no título");
  assert.equal(CORPO_GUTO, MD_V6, "o Regulamento publicado divergiu do que o GUTO lê");
});

test("FONTE · o cabeçalho do documento do GUTO declara a versão 6.0 e a regra de alteração", () => {
  const cab = MD_GUTO.slice(0, MD_GUTO.indexOf("\n---\n\n"));
  assert.match(cab, /Versão 6\.0/);
  assert.match(cab, /Fonte de verdade para o GUTO\. Não alterar sem actualizar o regulamento oficial\./);
  assert.match(cab, /cópia byte a byte/);
});

test("FONTE · a página não escreve texto jurídico à mão: importa o .md do v6 em bruto", () => {
  const jsx = readFileSync(resolve(FRONTEND, "src", "pages", "RegrasOficiais.jsx"), "utf8");
  const codigo = jsx.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.match(codigo, /from "\.\.\/\.\.\/\.\.\/\.\.\/docs\/REGULAMENTO-v6\.md\?raw"/);
  assert.doesNotMatch(codigo, /REGULAMENTO-v5\.md/, "a página voltou a importar o v5");
  for (const juridico of ["R$ 2,00", "pontos de fidelidade", "ECOQUILDO", "23.040.066/0001-00", "Comarca de Manaus"]) {
    assert.ok(!codigo.includes(juridico), `texto jurídico escrito à mão na página: «${juridico}»`);
  }
});

// ── 2. Cobertura total: cada linha do documento está na página ─────────────────────────────────
test("COBERTURA · TODAS as linhas do Regulamento v6 aparecem na página (título, 6 capítulos, 30 artigos)", () => {
  assert.equal(LINHAS_V6.length, 37, `esperava 37 linhas (1 + 6 + 30), vi ${LINHAS_V6.length}`);
  const faltam = LINHAS_V6.filter((l) => !texto.includes(l));
  assert.deepEqual(faltam, [], `a página não publica ${faltam.length} linha(s)`);
});

// Achado do validador SEG5 (UTAC110h): `includes` mede PRESENÇA, não igualdade. A sequência de palavras da página
// (do 1.º capítulo ao fim) tem de ser IGUAL à do documento (do 1.º capítulo ao fim, sem a marcação «##»).
test("COBERTURA · a página publica EXACTAMENTE as palavras do documento, pela ordem (nada a mais, nada a menos)", () => {
  const palavras = (s) => colapsar(s).split(" ").filter(Boolean);
  const doDoc = palavras(MD_V6.slice(MD_V6.indexOf("CAPÍTULO I —")).replace(/^#+\s*/gm, ""));
  const ini = html.indexOf("<section");
  const fim = html.indexOf("<p data-fim-regulamento");
  assert.ok(ini > 0 && fim > ini, "marcadores da página em falta");
  const trecho = html.slice(ini, fim).replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const daPagina = palavras(trecho);
  assert.equal(daPagina.length, doDoc.length, `contagem de palavras: página ${daPagina.length} vs documento ${doDoc.length}`);
  assert.deepEqual(daPagina, doDoc);
  assert.ok(!daPagina.includes("—") || doDoc.includes("—"), "a página acrescentou travessões que o v6 não tem");
});

test("ACESSIBILIDADE · os alvos de toque da página (sumário e «Voltar») têm 48 px", () => {
  const jsx = readFileSync(resolve(FRONTEND, "src", "pages", "RegrasOficiais.jsx"), "utf8");
  assert.match(jsx, /const linkSumario = \{[^}]*minHeight: "48px"/);
  assert.match(jsx, /<Link to="\/" style=\{\{[^}]*minHeight: "48px"/);
  // UTAC137: o v6 não tem rodapé («Documento oficial…» era do v5); o fecho continua dentro do último vidro.
  assert.doesNotMatch(html, /data-rodape/);
  assert.ok(html.indexOf("data-fim-regulamento") > html.lastIndexOf("gut-glass-standard"), "o fecho tem de viver dentro do último vidro");
});

// ── 3. Estrutura: 6 capítulos, 30 artigos ───────────────────────────────────────────────────────
test("ESTRUTURA · um <h1> com o título e a versão do v6.0", () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1[^>]*>REGULAMENTO OFICIAL DO APLICATIVO DESAFIOGUT \(VERSÃO 6\.0\)<\/h1>/);
  assert.equal(mod.VERSAO_REGULAMENTO, "6.0");
});

test("ESTRUTURA · os 6 capítulos em <h2>, pela ordem do documento", () => {
  const doMd = [...MD_V6.matchAll(/^## CAPÍTULO ([IVXL]+) — (.+?)\s*$/gm)].map((m) => `CAPÍTULO ${m[1]} — ${m[2]}`);
  assert.equal(doMd.length, 6);
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => colapsar(m[1].replace(/<!-- -->/g, "")));
  const capsPagina = h2.filter((t) => t.startsWith("CAPÍTULO "));
  assert.deepEqual(capsPagina, doMd);
});

test("ESTRUTURA · os 30 artigos, de 1 a 30, sem lacunas e pela ordem, com o rótulo do documento", () => {
  const rot = [...html.matchAll(/<strong[^>]*>(Art\. \d+(?:º|\.))<\/strong>/g)].map((m) => m[1]);
  assert.deepEqual(rot.map((r) => Number(r.match(/\d+/)[0])), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual([rot[0], rot[8], rot[9], rot[29]], ["Art. 1º", "Art. 9º", "Art. 10.", "Art. 30."]);
});

test("ESTRUTURA · sumário com 6 âncoras que existem na página", () => {
  const hrefs = [...html.matchAll(/href="#(cap-[ivxl]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, 6);
  for (const h of hrefs) assert.ok(html.includes(`id="${h}"`), `âncora sem destino: ${h}`);
});

test("PARSER · lê o v6 (uma linha por artigo, títulos «#») e continua a ler o v5 como antes", () => {
  const blocos = mod.REGULAMENTO.capitulos.flatMap((c) => c.blocos);
  const arts = Object.fromEntries(blocos.filter((b) => b.tipo === "artigo").map((b) => [b.rotulo, b]));
  assert.equal(Object.keys(arts).length, 30);
  assert.equal(arts["Art. 1º"].separador, " ", "o v6 não tem travessão depois do rótulo");
  assert.ok(arts["Art. 10."].texto.startsWith("A Associação reserva-se o direito"));
  assert.ok(arts["Art. 15."].texto.endsWith("conforme o Art. 19."), "a referência a outro artigo dentro do texto não pode abrir artigo novo");
  assert.equal(blocos.filter((b) => b.tipo === "paragrafo").length, 0);
  assert.equal(mod.REGULAMENTO.rodape, null);
  // compatibilidade: o mesmo parser sobre o v5 dá o que dava (12 capítulos, 72 artigos, rodapé, alíneas)
  const v5 = mod.lerRegulamento(MD_V5);
  const arts5 = Object.fromEntries(v5.capitulos.flatMap((c) => c.blocos).filter((b) => b.tipo === "artigo").map((b) => [b.rotulo, b]));
  assert.equal(v5.capitulos.length, 12);
  assert.equal(Object.keys(arts5).length, 72);
  assert.equal(arts5["Art. 1º"].separador, " — ");
  assert.deepEqual([13, 22, 25, 43, 48].map((n) => arts5[`Art. ${n}º`].itens.length), [5, 6, 5, 6, 1]);
  assert.match(v5.rodape, /Versão 5\.1 — vigente a partir de 02 de novembro de 2026\.$/);
});

// ── 4. Termos: proibidos / obrigatórios — BIDIRECCIONAL ────────────────────────────────────────
const PROIBIDOS = [/\bsenhas?\b/i, /torneio de habilidade/i, /Portaria SPA\/MF/i, /1\.207\/2024/];
// UTAC137: o v6 escreve «Cartão Colecionável» e «menor valor único de lance» (o v5: «cartão colecionável» / «competição de habilidade»).
const OBRIGATORIOS = ["Passe", "pontos de fidelidade", "ECOQUILDO", "Cartão Colecionável", "menor valor único de lance"];
function violacoes(t) {
  return [
    ...PROIBIDOS.filter((re) => re.test(t)).map((re) => `proibido: ${re}`),
    ...OBRIGATORIOS.filter((o) => !t.includes(o)).map((o) => `em falta: ${o}`),
  ];
}

test("TERMOS · a página v6.0 passa: zero proibidos, todos os obrigatórios", () => {
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

test("TERMOS · BIDIRECCIONAL — o mesmo verificador REPROVA o v5.1 como texto do v6 (não diz «menor valor único de lance»)", () => {
  assert.ok(violacoes(MD_V5).includes("em falta: menor valor único de lance"));
});

// ── 5. Factos que a Google Play exige divulgados (todos vindos do texto do v6) ─────────────────
test("PLAY · preço, Passe sem pontos de lance, proporções fixas, habilidade e elementos obrigatórios", () => {
  for (const f of [
    "valor fixo de R$ 2,00 (dois reais)",
    "o Passe não concede pontos de lance",
    "1 (um) ponto de fidelidade",
    "a cada 50 pontos de fidelidade acumulados, o sistema credita automaticamente 1 Cartão Digital",
    "1 ECOQUILDO equivalente a R$ 0,50 (cinquenta centavos)",
    "não configurando sorte, loteria ou jogo de azar",
    "7 (sete) dias corridos",
    "Lei Geral de Proteção de Dados",
    "dpo@grupouniaoetrabalho.com.br",
    "23.040.066/0001-00",
    "Foro da Comarca de Manaus",
  ]) assert.ok(texto.includes(f), `a página não divulga «${f}»`);
  for (const velho of ["10 (dez) pontos de fidelidade", "1 ECOQUILDO = R$ 1,00", "200 pontos de lance", "Versão 5.1"]) {
    assert.ok(!texto.includes(velho), `a página ainda mostra «${velho}» (v5.1)`);
  }
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
