// pt-only.test.mjs — MC98. Guardas da declaração «o DesafioGUT é PT-BR only».
//
// PORQUE EXISTE: o MC97 provou que remover um dicionário que o produto não lê não muda
// o produto. O MC98 foi mais longe — removeu `en.js`/`es.js`, fechou `SUPPORTED` a
// `["pt"]` e tirou o selector de idioma da UI. Uma remoção sem guarda é uma remoção que
// volta. Cada teste daqui é o alvo declarado de uma mutação do SEG2:
//   MUT1  reintroduzir `en.js` / um import de `i18n/en.js`   -> RED
//   MUT2  reintroduzir o selector de idioma na UI            -> RED
//   MUT3  remover `pt.js`                                    -> RED
//
// ⚠️ DUAS ARMADILHAS QUE ESTE FICHEIRO TEM DE EVITAR (ambas medidas nesta série):
//
//  1. ESCAPE FILE-vs-VALUE (MC97). O guarda antigo fazia grep ao FICHEIRO: mutar um
//     VALOR sobrevivia porque o COMENTÁRIO mantinha a frase. Aqui é pior, porque o
//     código que este MC escreveu FALA de `en.js`, `es.js` e `navigator.language` nos
//     seus próprios comentários explicativos. Um grep cru ao ficheiro dava RED a um
//     ficheiro correcto — uma guarda que grita no sítio errado. Solução: `semComentarios()`
//     antes de qualquer asserção sobre código.
//
//  2. EXTRACTOR CEGO (MC96.3). Uma regex partida passa a verde sem verificar nada. Por
//     isso há dois CONTROLES POSITIVOS: (a) o detector de selector tem de casar um
//     fixture que SABEMOS ter selector; (b) o varrimento tem de visitar um número
//     plausível de ficheiros. Sem eles, «0 ocorrências» pode ser «0 olhares».
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
    else if (/\.(jsx?|mjs)$/.test(e) && !e.endsWith(".test.mjs")) out.push(p);
  }
  return out.sort();
}

/** Detector do selector de idioma: a opção que só existe para escolher EN/ES. */
const RE_SELECTOR = /<option\s+value="(en|es)"|English\s*\(US\)|Espa[nñ]ol/i;

// ── Controlo positivo #1: o detector tem de RECONHECER o que foi removido ─────
// Sem isto, uma regex partida (ex.: um typo que devolva sempre `false`) passaria
// todos os testes desta secção a verde sem ter olhado para nada.
test("controlo positivo: o detector de selector reconhece o selector que o MC98 removeu", () => {
  const fixture = `<select value={lang} onChange={(e) => setLang(e.target.value)}>
      <option value="pt">🇧🇷 Português (Brasil)</option>
      <option value="en">🇺🇸 English (US)</option>
      <option value="es">🇪🇸 Español</option>
    </select>`;
  assert.ok(RE_SELECTOR.test(fixture), "o detector não casou o fixture — está cego");
  assert.ok(!RE_SELECTOR.test(`<option value="email">E-mail</option>`),
    "o detector casa opções que não são de idioma — falso positivo");
  assert.ok(!RE_SELECTOR.test(`<option value="especifico">Específico</option>`),
    "o detector casa «especifico» — a fronteira do valor tem de ser exacta");
});

test("MC98 · a pasta i18n tem UM só dicionário: pt.js", () => {
  const js = readdirSync(DIR_I18N).filter((f) => f.endsWith(".js")).sort();
  assert.deepEqual(js, ["pt.js"],
    `i18n/ devia ter só pt.js; tem [${js}] — en.js/es.js voltaram?`);
});

test("MC98 · nenhum ficheiro do produto importa i18n/en.js nem i18n/es.js", () => {
  const ficheiros = ficheirosDoProduto();
  // Controlo positivo #2: um varrimento que não visita nada «não encontra» nada.
  assert.ok(ficheiros.length >= 30,
    `só ${ficheiros.length} ficheiros varridos — o walker está cego (medicao suspeita)`);
  const maus = [];
  for (const f of ficheiros) {
    const codigo = semComentarios(readFileSync(f, "utf8"));
    if (/i18n\/(en|es)\.js/.test(codigo)) maus.push(f.replace(FRONTEND, "").replace(/\\/g, "/"));
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
  assert.doesNotMatch(codigo, /DICTS\s*=\s*\{[^}]*\ben\b/,
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
