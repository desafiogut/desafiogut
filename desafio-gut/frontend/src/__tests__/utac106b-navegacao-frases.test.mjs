// UTAC106b — contratos da REESTRUTURAÇÃO DA NAVEGAÇÃO + da FRASE DE EFEITO.
//
// Porque este ficheiro existe (e o que NÃO duplica): a ordem/rótulos das tabs e a
// sincronia BottomNav↔Sidebar vivem em `src/pages/__tests__/mc99-limpeza-ui.test.mjs`
// (que já era o guarda da barra inferior). Aqui ficam os contratos NOVOS do UTAC106b:
//   1. `/ofertas-programadas` tem rota + página própria, e a página está TRAVADA por
//      EM_BREVE_MODE (a trava é do CONTEÚDO, não da aba);
//   2. o EM_BREVE_MODE continua LIGADO (ninguém o desligou «por engano»);
//   3. a FRASE DE EFEITO existe, é renderizada, e não usa termos de álea/aposta
//      (glossário oficial) — conformidade Google Play;
//   4. a frase partilha o invariante com o Regulamento que o utilizador aceitou (Art. 7:
//      «QUANTO VOCÊ OFERTA POR... — O MENOR LANCE ÚNICO GANHA»);
//   5. o ícone `ticket` (novo no navModel) é realmente usado pelas duas navegações.
//
// ⚠️ Este ficheiro vive em `src/__tests__/`, logo `SRC` = `src/` e os caminhos são
// relativos a `src/` (é a mesma convenção do `mc991-rotas.test.mjs`, ao lado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => readFileSync(resolve(SRC, p), "utf8");

/** Frase de efeito, extraída do fonte onde vive (controlo positivo: se a constante
 *  desaparecer, o extractor devolve undefined e os testes falham por ASSERT, não por
 *  vacuidade). */
function fraseEfeito() {
  const m = ler("pages/MercadoLances.jsx").match(/const FRASE_MENOR_LANCE_UNICO = "([^"]+)";/);
  return m?.[1];
}

// ── 1) Ofertas Programadas ─────────────────────────────────────────────────────────
test("UTAC106b · /ofertas-programadas tem rota e página própria", () => {
  const app = ler("App.jsx");
  assert.match(app, /<Route\s+path="\/ofertas-programadas"/, "a rota /ofertas-programadas não existe");
  assert.match(app, /import\("\.\/pages\/OfertasProgramadas\.jsx"\)/, "a página não é importada (lazy)");
});

test("UTAC106b · a página OfertasProgramadas é TRAVADA por EM_BREVE_MODE", () => {
  const pg = ler("pages/OfertasProgramadas.jsx");
  assert.match(pg, /from\s+"\.\.\/lib\/leilaoLock\.js"/, "a página não importa a trava única (leilaoLock)");
  assert.match(pg, /EM_BREVE_MODE\s*\?/, "EM_BREVE_MODE não é usado como gate na renderização");
  assert.match(pg, /EM_BREVE_LABEL/, "o rótulo «EM BREVE» não é usado");
});

test("UTAC106b · EM_BREVE_MODE continua LIGADO (nada foi desligado por engano)", () => {
  const lock = ler("lib/leilaoLock.js");
  assert.match(lock, /export const EM_BREVE_MODE = true;/,
    "EM_BREVE_MODE deixou de ser `true` — o UTAC106b proíbe desligá-lo");
});

// ── 2) Frase de efeito ─────────────────────────────────────────────────────────────
test("UTAC106b · a frase de efeito existe e é renderizada no topo de MercadoLances", () => {
  const frase = fraseEfeito();
  assert.ok(frase, "a constante FRASE_MENOR_LANCE_UNICO desapareceu de MercadoLances.jsx");
  assert.match(frase, /menor lance único/i, `a frase perdeu o invariante da modalidade: «${frase}»`);
  assert.ok(ler("pages/MercadoLances.jsx").includes("{FRASE_MENOR_LANCE_UNICO}"),
    "a frase não chega ao ecrã (não é renderizada)");
});

test("UTAC106b · a frase NÃO sugere álea nem aposta (glossário oficial)", () => {
  const frase = fraseEfeito() ?? "";
  // Mesma lista de PROIBIDOS de `src/i18n/__tests__/glossario.test.mjs`, mas com o buraco
  // que o validador do UTAC106b mediu FECHADO: a forma verbal («aposte/apostar/apostou»)
  // escapava a `apostas?` (achado ℹN1). Aqui é `apost\w*`.
  const PROIBIDOS = /\bleil[ãõa]o\b|\bleil[õo]es\b|\bapost\w*\b|\bsort\w*\b|\bazar\b|\bloterias?\b/i;
  assert.ok(!PROIBIDOS.test(frase), `a frase usa termo proibido (álea/aposta): «${frase}»`);
  assert.ok(!/aleat[óo]ri|chance|sorteio|previs/i.test(frase),
    `a frase sugere azar/previsão, não habilidade: «${frase}»`);
});

test("UTAC106b · a frase aplicada é LITERALMENTE uma das 3 opções autorizadas do enunciado", () => {
  // Guarda contra o executor INVENTAR copy: a frase tem de ser uma das três opções que o
  // enunciado fixou (A/B/C), verbatim. Mudar a copy é decisão do operador, não do executor.
  const AUTORIZADAS = [
    "Quanto você paga por esse item? O menor lance único leva!",
    "Quanto você paga por esse item? O menor lance único compra!",
    "Dê o seu menor lance único. Se ninguém der igual, o item é seu.",
  ];
  const frase = fraseEfeito();
  assert.ok(AUTORIZADAS.includes(frase),
    `a frase não é nenhuma das 3 opções autorizadas: «${frase}»`);
});

test("UTAC106b · /menor-lance-unico é ALIAS por REDIRECT (não um 2.º render)", () => {
  // Um segundo render da MESMA página numa rota nova abriria um caminho que o isolamento
  // corporativo (`rotasProibidas`, App.jsx do AppContext) não cobre — o achado ⚠A1 do
  // validador. Com redirect, o pathname efectivo passa a `/mercado` e a lista continua a
  // apanhar o lojista. Este teste fixa o desenho.
  const app = ler("App.jsx");
  const m = app.match(/<Route\s+path="\/menor-lance-unico"\s+element=\{([^}]+)\}/);
  assert.ok(m, "a rota /menor-lance-unico desapareceu");
  assert.match(m[1], /<Navigate\s+to="\/mercado"\s+replace\s*\/>/,
    `a rota /menor-lance-unico deixou de ser redirect para /mercado: ${m[1]}`);
});

test("UTAC106b · a frase é consistente com o gate legal (Regulamento Art. 7)", () => {
  const termos = ler("components/TermosConsentimento.jsx");
  assert.match(termos, /O MENOR LANCE ÚNICO GANHA/i,
    "o gate legal deixou de fixar «O MENOR LANCE ÚNICO GANHA» — a frase ficaria sem âncora");
  const frase = fraseEfeito() ?? "";
  assert.match(frase, /menor lance único/i,
    "a frase não partilha o invariante («menor lance único») com o Regulamento aceite");
});

// ── 3) Ícone novo ──────────────────────────────────────────────────────────────────
test("UTAC106b · o ícone `ticket` existe no navModel e é usado pelas DUAS navegações", () => {
  assert.match(ler("widgets/layout/navModel.jsx"), /\bticket:\s*\(/,
    "o PATH `ticket` não existe no navModel");
  assert.match(ler("widgets/layout/BottomNav.jsx"), /name="ticket"/,
    "o BottomNav não usa o ícone `ticket`");
  assert.match(ler("widgets/layout/Sidebar.jsx"), /name="ticket"/,
    "a Sidebar não usa o ícone `ticket`");
});
