// pt-only.test.mjs — MC98. Guardas da declaração «o DesafioGUT é PT-BR only».
//
// PORQUE EXISTE: o MC97 provou que remover um dicionário que o produto não lê não muda
// o produto. O MC98 foi mais longe — removeu `en.js`/`es.js`, fechou `SUPPORTED` a
// `["pt"]` e tirou o selector de idioma da UI. Uma remoção sem guarda é uma remoção que
// volta. Cada teste daqui é o alvo declarado de uma mutação do SEG2.
//
// ⚠️ TRÊS ARMADILHAS QUE ESTE FICHEIRO TEM DE EVITAR — a 1.ª e a 2.ª estão medidas, a 3.ª
// foi APANHADA PELO VALIDADOR INDEPENDENTE e é a razão da versão que aqui está:
//
//  1. ESCAPE FILE-vs-VALUE (MC97). O guarda antigo fazia grep ao FICHEIRO: mutar um VALOR
//     sobrevivia porque o COMENTÁRIO mantinha a frase. Aqui é pior, porque o código deste
//     MC FALA de `en.js`, `es.js` e `navigator.language` nos seus próprios comentários
//     explicativos — um grep cru dava RED a um ficheiro CORRECTO. Solução: `semComentarios()`.
//
//  2. EXTRACTOR CEGO (MC96.3). Uma regex partida passa a verde sem verificar nada. Daí os
//     controlos positivos: o detector tem de casar fixtures que SABEMOS ser selectores, e
//     o varrimento tem de visitar um número plausível de ficheiros.
//
//  3. A 1.ª VERSÃO DESTAS GUARDAS ERA CEGA A DUAS VARIANTES REALISTAS, e foi o validador
//     independente que o provou com duas mutações de evasão SOBREVIVENTES:
//       E1  `<option value='en'>English</option>`  — aspas SIMPLES e rótulo sem «(US)».
//           O detector exigia aspas duplas e o literal «English (US)».
//       E2  `src/i18n/en.mjs` + `import en from "../i18n/en.mjs"` — a guarda da pasta
//           filtrava `.endsWith(".js")` e as outras procuravam `i18n/(en|es)\.js`.
//     A lição: a mutação do executor usava **a mesma forma que o detector testava** — era
//     circular. Uma guarda tem de ser testada contra as variantes que o ATACANTE escolheria,
//     não contra a que o autor escreveu. Agora: i18n/ só pode conter `pt.js` (seja qual for
//     a extensão) e o detector de selector casa as 3 grafias de rótulo e as 2 de aspas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FRONTEND = resolve(RAIZ, "..");
const DIR_I18N = join(RAIZ, "i18n");
const CONTEXTO = "src/context/IdiomaContext.jsx";
const ler = (p) => readFileSync(resolve(FRONTEND, p), "utf8");

/**
 * Stripper de comentários. Não é um parser — é o suficiente para JS/JSX deste projecto
 * e é conservador (na dúvida sobre-mede, e um falso positivo vê-se logo no teste).
 * Cobre: `// …`, `* …` (continuação de bloco), `/* …`, `{/* …` (comentário JSX).
 * ⚠️ NÃO remove comentários no fim da linha de código — assumido e documentado.
 * Medido: as 3 ocorrências de «português» nos ficheiros de produção estão TODAS em linhas
 * de comentário, logo desaparecem aqui (senão o detector de rótulos dava falso positivo).
 */
function semComentarios(src) {
  return src
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*"));
    })
    .join("\n");
}

/** Ficheiros do PRODUTO (não os testes: os testes FALAM de en/es para os proibir). */
function ficheirosDoProduto(dir = RAIZ) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === "dist" || e === "__tests__" || e === "_stubs") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...ficheirosDoProduto(p));
    else if (/\.(jsx?|mjs|cjs)$/.test(e) && !e.endsWith(".test.mjs")) out.push(p);
  }
  return out.sort();
}

// ─── Detector do selector de idioma ────────────────────────────────────────────────
// (a) uma <option> cujo value é exactamente um código de idioma — com aspas simples OU
//     duplas (a variante E1 do validador);
const RE_OPT_IDIOMA = /<option\b[^>]*\bvalue\s*=\s*["'](pt|en|es)["']/i;
// (b) um rótulo de idioma. Fronteiras de palavra OBRIGATÓRIAS e medido: sem elas, «Espa»
//     casa `whiteSpace`/`espalhados` (73 ocorrências) e «Ingl» casa `paddingLeft` (24).
//     As variantes «Spanish»/«Inglés» são as que o validador usou para evadir (E1).
const RE_ROTULO_IDIOMA = /\bEnglish\b|\bEspa[nñ]ol\b|\bSpanish\b|\bIngl[eé]s\b|\bPortugu[eê]s\s*\(|\bPortuguese\b/i;
const RE_SELECTOR = new RegExp(RE_OPT_IDIOMA.source + "|" + RE_ROTULO_IDIOMA.source, "i");

// ─── Detector de dicionário removido, QUALQUER QUE SEJA A EXTENSÃO (variante E2) ────
// `i18n/en.js`, `i18n/en.mjs`, `i18n/es.json`, `i18n/en` — mas NÃO `i18n/estilo.js`
// (o lookahead exige que `en`/`es` termine como componente do caminho).
const RE_DIC_REMOVIDO = /i18n[\\/](en|es)(\.[A-Za-z0-9]+)?(?![A-Za-z0-9_.-])/;

// ── Controlo positivo #1: o detector tem de RECONHECER o que foi removido ──────────
test("controlo positivo: o detector reconhece as variantes REAIS do selector", () => {
  const deveCasar = [
    [`<option value="pt">🇧🇷 Português (Brasil)</option>`, "aspas duplas + rótulo completo"],
    [`<option value='en'>English</option>`, "aspas SIMPLES + «English» (evasão E1)"],
    [`<option value='es'>Spanish</option>`, "aspas SIMPLES + «Spanish» (evasão E1)"],
    [`<option value="en">Inglés</option>`, "«Inglés»"],
    [`<option value='es'>Español</option>`, "«Español» + aspas simples"],
    [`<option value="pt">Portuguese</option>`, "«Portuguese»"],
  ];
  for (const [fixture, porque] of deveCasar) {
    assert.ok(RE_SELECTOR.test(fixture), `o detector NÃO casou: ${porque} -> ${fixture}`);
  }
  const naoDeveCasar = [
    [`<option value="email">E-mail</option>`, "opção de canal"],
    [`<option value="especifico">Específico</option>`, "«especifico» — a fronteira do valor tem de ser exacta"],
    [`<option value="enviar_notificacao">Notificação</option>`, "«enviar_notificacao»"],
    [`const s = { whiteSpace: "nowrap", paddingLeft: "1rem" };`, "whiteSpace/paddingLeft (medidos: 73+24)"],
    [`const t = { espalhados: true, espaco: 1 };`, "«espalhados»/«espaco»"],
  ];
  for (const [fixture, porque] of naoDeveCasar) {
    assert.ok(!RE_SELECTOR.test(fixture), `o detector casou um FALSO positivo: ${porque} -> ${fixture}`);
  }
});

// ── Controlo positivo #2: o detector de dicionário cobre qualquer extensão ────────
test("controlo positivo: o detector de dicionário cobre QUALQUER extensão", () => {
  for (const caminho of ['"../i18n/en.js"', '"../i18n/es.mjs"', '"../i18n/en.json"', "./i18n/en.cjs", "src/i18n/en"]) {
    assert.ok(RE_DIC_REMOVIDO.test(caminho), `o detector NÃO casou o caminho removido: ${caminho}`);
  }
  for (const caminho of ['"../i18n/pt.js"', '"../i18n/estilo.js"', '"../i18n/espelho.js"', '"../i18n/pendente.js"']) {
    assert.ok(!RE_DIC_REMOVIDO.test(caminho), `o detector casou um falso positivo: ${caminho}`);
  }
});

test("MC98 · a pasta i18n só pode conter pt.js (seja qual for a extensão)", () => {
  const ficheiros = readdirSync(DIR_I18N, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
  assert.deepEqual(ficheiros, ["pt.js"],
    `i18n/ só pode conter pt.js; tem [${ficheiros}] — en.js/es.js (ou um en.mjs engenhoso) voltaram?`);
});

test("MC98 · nenhum ficheiro do produto importa um dicionário en/es removido", () => {
  const ficheiros = ficheirosDoProduto();
  // Controlo positivo #3: um varrimento que não visita nada «não encontra» nada.
  assert.ok(ficheiros.length >= 30,
    `só ${ficheiros.length} ficheiros varridos — o walker está cego (medicao suspeita)`);
  const maus = [];
  for (const f of ficheiros) {
    const codigo = semComentarios(readFileSync(f, "utf8"));
    if (RE_DIC_REMOVIDO.test(codigo)) maus.push(f.replace(FRONTEND, "").replace(/\\/g, "/"));
  }
  assert.deepEqual(maus, [], "imports de dicionários removidos:\n" + maus.join("\n"));
});

test("MC98 · o IdiomaContext está fechado a PT (SUPPORTED, sem navigator.language)", () => {
  const codigo = semComentarios(ler(CONTEXTO));
  assert.match(codigo, /from\s+"\.\.\/i18n\/pt\.js"/, "o contexto deixou de importar pt.js");
  assert.match(codigo, /const\s+SUPPORTED\s*=\s*\[\s*"pt"\s*\]/,
    "SUPPORTED não é exactamente [\"pt\"] — um idioma que não existe pode voltar a ser aceite");
  assert.doesNotMatch(codigo, /navigator\.language/,
    "o contexto voltou a detectar o idioma do aparelho — o app só tem um idioma");
  assert.doesNotMatch(codigo, /\bDICTS\s*=\s*\{[^}]*\b(en|es)\b/,
    "o mapa DICTS voltou a incluir um dicionário que não existe");
});

test("MC98 · nenhum selector de idioma na UI do produto", () => {
  const ficheiros = ficheirosDoProduto();
  assert.ok(ficheiros.length >= 30, `só ${ficheiros.length} ficheiros varridos — walker cego`);
  const maus = [];
  for (const f of ficheiros) {
    const codigo = semComentarios(readFileSync(f, "utf8"));
    if (RE_SELECTOR.test(codigo)) maus.push(f.replace(FRONTEND, "").replace(/\\/g, "/"));
  }
  assert.deepEqual(maus, [], "selector de idioma (EN/ES) encontrado em:\n" + maus.join("\n"));
});

test("MC98 · o dicionário PT existe e não está vazio (guarda contra medição vazia)", () => {
  const p = join(DIR_I18N, "pt.js");
  assert.ok(existsSync(p), "src/i18n/pt.js desapareceu — o app ficaria sem dicionário");
  const n = [...readFileSync(p, "utf8").matchAll(/"[a-zA-Z0-9_.]+"\s*:\s*"/g)].length;
  assert.ok(n > 100, `pt.js só tem ${n} chaves — medicao suspeita`);
});
