// utac106h-regras.test.mjs — UTAC106h · Regras Oficiais (página /regras-oficiais).
//
// Cobre: a PÁGINA renderiza (SSR) com o título, a hierarquia e os factos-chave; a ROTA está
// registada no App.jsx; o LINK existe no menu «Mais» (BottomNav.SECONDARY_LINKS) e na Sidebar,
// com a MESMA ordem; o ecrã das Ofertas Programadas liga às regras; e — a guarda mais importante —
// o DOCUMENTO FONTE (`docs/regras-oficiais.md`) e a PÁGINA dizem os MESMOS factos (sem deriva entre
// a fonte legal e o que o utilizador lê no app).
//
// Instrumentos do repo (nenhum ficheiro de produção alterado): `_servidor-teste.mjs` + duplo do
// router (`_stubs-106c/rr.jsx`, que traz `Link`). ⚠️ LIMITE DECLARADO: sem DOM real; «renderiza»
// é o markup SSR (prova que o componente não rebenta e que o texto sai), não o pixel.

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

let vite, React, renderToStaticMarkup, RegrasOficiais, html, texto;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(FRONTEND, "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  RegrasOficiais = (await vite.ssrLoadModule("/src/pages/RegrasOficiais.jsx")).default;
  html = renderToStaticMarkup(React.createElement(RegrasOficiais));
  texto = html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
});
after(async () => { if (vite) await vite.close(); });

// ── 1. A página renderiza, com hierarquia e conteúdo ───────────────────────────────────────────
test("RENDER · a página renderiza com título, versão e o vendedor legal", () => {
  assert.match(texto, /Regras Oficiais/);
  assert.match(texto, /Programa de Fidelidade/);
  assert.match(texto, /Associação Recreativa dos Nordestinos no Amazonas/);
});

test("RENDER · hierarquia de títulos: um <h1> e as 9 secções em <h2>, IGUAIS às do documento fonte", () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  // COBERTURA ESTRUTURAL (não amostra): os <h2> da página têm de ser EXACTAMENTE os cabeçalhos do
  // `.md`. Foi esta a falha que o validador adversarial apanhou em 1.ª ronda: a página publicava
  // MENOS do que a fonte legal e a guarda de factos, sendo amostra, não dava por isso.
  const md = readFileSync(resolve(REPO, "docs", "regras-oficiais.md"), "utf8");
  const doMd = [...md.matchAll(/^##\s+(\d)\.\s+(.+?)\s*$/gm)]
    .map((m) => `${m[1]}. ${m[2]}`.replace(/\*\*/g, "").replace(/\s+/g, " ").trim());
  assert.ok(doMd.length === 9, `o .md devia ter 9 secções, tem ${doMd.length}`);
  for (const h of doMd) {
    assert.ok(texto.includes(h), `a página não publica a secção «${h}»`);
  }
  const h2 = html.match(/<h2[^>]*>([^<]*)</g) || [];
  assert.equal(h2.length, 9, `esperava 9 secções, vi ${h2.length}`);
  assert.match(h2[0], /1\. IDENTIFICAÇÃO/);
  assert.match(h2[8], /9\. DISPOSIÇÕES FINAIS/);
});

test("RENDER · tem link de volta ao app", () => {
  assert.match(html, /href="\/"/);
  assert.match(texto, /Voltar ao app/);
});

// ── 2. Os factos que a Google Play exige que estejam divulgados ────────────────────────────────
test("RENDER · divulga as PROPORÇÕES FIXAS (1 Passe = 1 ponto · 50 pontos = 1 cartão)", () => {
  assert.ok(texto.includes("1 Passe Desafio (R$ 2,00) = 1 ponto"), "falta a proporção de acúmulo");
  assert.ok(texto.includes("50 (cinquenta) pontos de compra = 1 (um) cartão colecionável"), "falta a proporção de resgate");
});

test("RENDER · declara que o PALPITE é bónus e NÃO conta para o cartão", () => {
  assert.match(texto, /\+2 pontos/);
  assert.ok(texto.includes("NÃO conta para o cartão") || texto.includes("NÃO contam para o resgate"));
  assert.match(texto, /nunca por acertar palpites/);
});

test("RENDER · declara expressamente que NÃO é concurso/sorteio/aposta", () => {
  assert.match(texto, /NÃO É UM CONCURSO/);
  assert.ok(texto.includes("aposta de quota fixa ou jogo de azar"), "falta a declaração anti-concurso");
  assert.match(texto, /Não há sorteio/);
});

test("RENDER · traz os elementos obrigatórios: arrependimento (CDC 49), LGPD, contacto, foro", () => {
  assert.ok(texto.includes("7 (sete) dias corridos"), "falta o prazo de arrependimento");
  assert.match(texto, /Código de Defesa do Consumidor/);
  assert.match(texto, /LGPD/);
  assert.ok(texto.includes("desafiogut01@gmail.com"), "falta o e-mail de contacto");
  assert.ok(texto.includes("23.040.066/0001-00"), "falta o CNPJ");
  assert.ok(texto.includes("Manaus/AM"), "falta o foro");
  assert.match(texto, /30 \(trinta\) dias corridos/);
});

// ── 3. Rota + links (o utilizador tem de CONSEGUIR chegar lá) ─────────────────────────────────
const ler = (rel) => readFileSync(resolve(FRONTEND, rel), "utf8");

test("ROTA · /regras-oficiais está registada no App.jsx (lazy + <Route>)", () => {
  const app = ler("src/App.jsx");
  assert.match(app, /const RegrasOficiais\s*=\s*lazy\(\(\) => import\("\.\/pages\/RegrasOficiais\.jsx"\)\)/);
  assert.match(app, /<Route path="\/regras-oficiais" element=\{<RegrasOficiais \/>\}/);
  // Dentro do AppLayout (alcançável pelo «Mais» com navegação intacta).
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
  const secundarios = ["/vitrine", "/programacao", "/ativos", "/seja-nosso-parceiro", "/regras-oficiais", "/configuracoes"];
  for (const p of secundarios) {
    assert.ok(ordemNav.includes(p), `BottomNav sem ${p}`);
    assert.ok(ordemSide.includes(p), `Sidebar sem ${p}`);
  }
  const posNav = secundarios.map((p) => ordemNav.indexOf(p));
  const posSide = secundarios.map((p) => ordemSide.indexOf(p));
  assert.deepEqual(posNav, [...posNav].sort((a, b) => a - b), "BottomNav fora de ordem");
  assert.deepEqual(posSide, [...posSide].sort((a, b) => a - b), "Sidebar fora de ordem");
});

test("LINK · o ecrã das Ofertas Programadas liga às Regras Oficiais", () => {
  const of = ler("src/pages/OfertasProgramadas.jsx");
  assert.match(of, /to="\/regras-oficiais"/);
});

// ── 4. GUARDA DE CONSISTÊNCIA: documento fonte ↔ página (sem deriva) ──────────────────────────
test("CONSISTÊNCIA · o docs/regras-oficiais.md e a página dizem os MESMOS factos", () => {
  const md = readFileSync(resolve(REPO, "docs", "regras-oficiais.md"), "utf8");
  const jsx = readFileSync(resolve(FRONTEND, "src", "pages", "RegrasOficiais.jsx"), "utf8");
  // Factos que NÃO podem divergir entre a fonte legal e o que o utilizador lê no app.
  const factos = [
    "1 Passe Desafio (R$ 2,00) = 1 ponto",
    "50 (cinquenta) pontos de compra = 1 (um) cartão colecionável",
    "+2 pontos",
    "aposta de quota fixa ou jogo de azar",
    "7 (sete) dias corridos",
    "30 (trinta) dias corridos",
    "23.040.066/0001-00",
    "desafiogut01@gmail.com",
    "Manaus/AM",
    "Menor Lance Único",
    // ⚠️ Acrescentados na 2.ª ronda (achado do validador adversarial): a página publicava MENOS que a
    // fonte legal e a guarda — sendo amostra — não o apanhava. Cada um destes factos tem de estar nos
    // DOIS ficheiros.
    "comércio eletrónico por dropshipping",
    "um por Oferta Programada",
    "regras de devolução de produto",
    "apenas com os prestadores necessários à operação",
    "mantidos pelo prazo exigido pela legislação fiscal brasileira",
  ];
  for (const f of factos) {
    // Comparação com o ESPAÇO NORMALIZADO: os dois ficheiros partem frases em linhas diferentes
    // (o .md por largura, o JSX por indentação) — a quebra de linha não é uma divergência de conteúdo.
    assert.ok(md.replace(/\s+/g, " ").includes(f), `o .md não traz «${f}»`);
    assert.ok(jsx.replace(/\s+/g, " ").includes(f), `a página não traz «${f}»`);
  }
});

test("CONSISTÊNCIA · o .md declara a mesma versão/vigência que a página exporta", () => {
  const md = readFileSync(resolve(REPO, "docs", "regras-oficiais.md"), "utf8");
  const jsx = readFileSync(resolve(FRONTEND, "src", "pages", "RegrasOficiais.jsx"), "utf8");
  const v = jsx.match(/VERSAO_REGRAS = "([^"]+)"/)[1];
  const g = jsx.match(/VIGENCIA_REGRAS = "([^"]+)"/)[1];
  assert.ok(md.includes(`Versão ${v}`), `o .md não traz a versão ${v}`);
  assert.ok(md.includes(`vigente a partir de ${g}`), `o .md não traz a vigência ${g}`);
  assert.ok(html.includes(v) && html.includes(g), "a página não mostra a versão/vigência");
});

// ── 5. A regra mais sensível (R1): o palpite não pode aparecer como decisor ────────────────────
test("R1 na página · nenhuma frase deixa o palpite decidir o cartão", () => {
  const t = texto.toLowerCase();
  for (const proibido of ["palpite decide", "decide o cartão pelo palpite", "cartão por palpite", "acertar o palpite dá o cartão"]) {
    assert.ok(!t.includes(proibido), `frase proibida na página: «${proibido}»`);
  }
  assert.ok(texto.includes("não decide") || texto.includes("NÃO decide"), "tem de dizer explicitamente que o palpite não decide");
});
