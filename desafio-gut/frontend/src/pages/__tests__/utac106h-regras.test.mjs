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

// Normalizador ÚNICO para as comparações md↔página. ⚠️ Lição da 2.ª ronda do validador (R3): o
// matcher tem de ser robusto à formatação — se só colapsar espaços, basta pôr `*ênfase*` no `.md`
// para a guarda partir, e a «correcção» acabaria por ser feita A EDITAR A FONTE OFICIAL (direcção
// invertida). Aqui tira-se a ênfase markdown (`**`/`*`/`` ` ``) e colapsa-se o espaço, nos DOIS lados.
const limpar = (s) => s
  .replace(/^>\s?/gm, "")          // marca de blockquote multilinha (`> continuação`) — partiria a frase
  .replace(/\*\*|\*|`/g, "")        // ênfase/código markdown
  .replace(/\s+/g, " ")
  .trim();

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
  // Sem o «9» fixo: TODOS os `## N.` da fonte (incluindo N ≥ 10) têm de estar na página. A versão
  // anterior fixava `=== 9` e ignorava uma secção nova acrescentada à fonte (ponto cego medido).
  const doMd = [...md.matchAll(/^##\s+(\d+)\.\s+(.+?)\s*$/gm)].map((m) => limpar(`${m[1]}. ${m[2]}`));
  assert.ok(doMd.length >= 9, `o .md devia ter pelo menos 9 secções, tem ${doMd.length}`);
  const paginaLimpa = limpar(texto);
  for (const h of doMd) {
    assert.ok(paginaLimpa.includes(h), `a página não publica a secção «${h}»`);
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
// ⚠️ LIMITE DECLARADO (2.ª ronda do validador adversarial, re-medido no fecho): esta guarda é
// **cabeçalhos + lista de factos materiais**, NÃO igualdade byte-a-byte. Continua a ser possível
// apagar um PARÁGRAFO de secção cujo conteúdo não esteja na lista de factos sem ela dar por isso
// (ponto cego D, medido por mutação e ainda ABERTO). Os outros dois pontos cegos que o validador
// mediu foram FECHADOS: E (secção ≥ 10 na fonte — a contagem de cabeçalhos deixou de ser fixa) e
// F (a cláusula anti-aposta do §2.1 — entrou na lista de factos). O fecho completo seria **gerar a
// página a partir do `.md`** (o projecto não tem motor de markdown — medido) ou comparar conteúdo
// normalizado unidade a unidade, o que colide com as paráfrases legítimas entre a fonte e a página.
// Fica ESCALADO como melhoria própria; o que esta guarda garante — e foi provado por mutação — é:
// (i) os cabeçalhos da fonte são os da página; (ii) 21 factos materiais (incl. as divulgações LGPD e
// a cláusula anti-aposta) têm de estar nos DOIS ficheiros.
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
    // ⚠️ 3.ª passagem (achados NÃO-bloqueantes da 2.ª ronda): a página continuava a publicar menos
    // que a fonte em 4 afirmações. Cada uma passou a estar nos DOIS ficheiros.
    "Idioma oficial",
    "Português do Brasil",
    "atrasos de transportadora serão comunicados",
    "A versão vigente é sempre a publicada nesta página",
    "medidas legais cabíveis",
    // ⚠️ 4.ª passagem (fecho dos pontos cegos medidos pelo validador na 2.ª ronda): a cláusula
    // ANTI-APOSTA do §2.1 podia ser apagada da página sem a guarda dar por isso. É material — entra.
    // (A comparação é feita no TEXTO-FONTE dos dois ficheiros: a frase tem de ser CONTÍGUA ali, por
    // isso entra a partir de «bilhete de sorteio…» e não desde «não é um…», que o `<strong>` parte.)
    "bilhete de sorteio, uma aposta ou uma participação em concurso",
  ];
  for (const f of factos) {
    // Comparação com o matcher normalizado (ênfase markdown fora, espaço colapsado) nos DOIS lados.
    assert.ok(limpar(md).includes(f), `o .md não traz «${f}»`);
    assert.ok(limpar(jsx).includes(f), `a página não traz «${f}»`);
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
