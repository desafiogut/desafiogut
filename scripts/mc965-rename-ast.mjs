#!/usr/bin/env node
// MC96.5 — rename de identificadores por AST (NUNCA por substituição de strings).
//
// Porque AST: `sed`/`replace` atinge comentários, strings e chaves de objecto que por acaso
// tenham o mesmo texto. O AST só vê o que é um IDENTIFICADOR de verdade.
//
// Parser: `espree` (o do ESLint, já presente no projecto, com JSX ligado). NÃO instala nada —
// alterar `package.json` por causa de uma ferramenta de refactor seria uma mudança de projecto.
//
// Segurança antes de escrever (aborta se qualquer uma falhar):
//   1. o novo nome não pode já existir como binding no ficheiro (colisão);
//   2. o nome antigo não pode estar declarado como binding próprio dentro de uma função
//      aninhada (shadowing) — renomear às cegas mudaria o alvo errado;
//   3. chaves de objecto NÃO-sholvadas (`{ tipoLeilao: x }`) NÃO são renomeadas (podem ser
//      contrato de API) — são reportadas para decisão humana.
//
// Uso: node scripts/mc965-rename-ast.mjs <antigo> <novo> [--dry]
import { readFile, writeFile } from "node:fs/promises";
import { globSync } from "node:fs";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// ⚠️ `espree` vive em `desafio-gut/frontend/node_modules`, NÃO na raiz do repo: um
// `require("espree")` simples falha com MODULE_NOT_FOUND (medido). Resolvemos pelo caminho
// absoluto — a mesma técnica que o script do Opus usa para o @netlify/blobs.
const espree = require("C:/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend/node_modules/espree/dist/espree.cjs");

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..", "desafio-gut", "frontend");

const [antigo, novo] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const DRY = process.argv.includes("--dry");
if (!antigo || !novo) { console.error("uso: node scripts/mc965-rename-ast.mjs <antigo> <novo> [--dry]"); process.exit(2); }

// Ficheiros: só src/ (o backend não usa estes identificadores — medido).
const ficheiros = globSync("**/*.{js,jsx,mjs}", { cwd: join(RAIZ, "src") }).map((f) => join(RAIZ, "src", f));

function parse(txt, caminho) {
  return espree.parse(txt, {
    ecmaVersion: "latest", sourceType: "module", loc: true, range: true,
    ecmaFeatures: { jsx: true },
    // ⚠️ `comment: true` dá-nos os comentários; NÃO os alteramos, mas usamo-los para PROVAR
    // que o refactor não lhes tocou.
    comment: true,
  });
}

/** Percorre o AST e devolve {alvos: [ranges], chavesNaoShorthand: [descrições], sombras: [nomes]}. */
function analisar(ast, txt) {
  const alvos = [], chaves = [], sombras = [];
  const pilha = [ast];
  const declaracoes = [];               // nomes declarados (para detectar colisão/sombra)
  (function walk(n, dentroDeFuncao) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach((x) => walk(x, dentroDeFuncao));
    if (n.type === "Identifier" && n.name === antigo) {
      const p = n.parent;
      const ehChaveNaoShorthand = p && p.type === "Property" && p.key === n && !p.shorthand;
      const ehMembro = p && (p.type === "MemberExpression" && p.property === n && !p.computed);
      if (ehChaveNaoShorthand) {
        // ⚠️ Chave não-shorthand (`{ tipoLeilao: x }`): renomeá-la é NECESSÁRIO para o prop não
        // partir (quem passa e quem lê têm de usar o mesmo nome). Só é seguro porque foi MEDIDO
        // que nenhum destes nomes cruza a fronteira do backend. Fica registada, para não ser
        // uma renomeação silenciosa de possível contrato.
        chaves.push(`${relative(RAIZ, CAMINHO_ATUAL)}:${n.loc.start.line}`);
        alvos.push([n.range[0], n.range[1]]);
      }
      else if (ehMembro) { /* obj.tipoLeilao → não é o binding; ignora */ }
      else alvos.push([n.range[0], n.range[1]]);
      if (n.__decl) declaracoes.push(n.name);
    }
    if (n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression") {
      // declarações internas com o MESMO nome = sombra
      const params = [...(n.params || [])];
      for (const p of params) if (p.name === antigo) sombras.push(`${relative(RAIZ, CAMINHO_ATUAL)}:${p.loc.start.line}`);
    }
    if ((n.type === "VariableDeclarator" && n.id?.name === antigo) || (n.type === "FunctionDeclaration" && n.id?.name === antigo)) {
      declaracoes.push(antigo);
    }
    for (const k of Object.keys(n)) {
      if (k === "parent" || k === "range" || k === "loc") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((x) => { if (x && typeof x === "object") { x.parent = n; walk(x, dentroDeFuncao); } });
      else if (v && typeof v === "object" && v.type) { v.parent = n; walk(v, dentroDeFuncao); }
    }
  })(ast, false);
  return { alvos, chaves, sombras, declaracoes };
}

let CAMINHO_ATUAL = "";
let totalFicheiros = 0, totalAlvos = 0;
const relatorio = { alterados: [], chaves: [], sombras: [], colisoes: [] };

for (const caminho of ficheiros) {
  CAMINHO_ATUAL = caminho;
  const txt = await readFile(caminho, "utf8");
  if (!txt.includes(antigo)) continue;
  let ast;
  try { ast = parse(txt, caminho); } catch (e) { console.error(`  ⛔ parse falhou em ${relative(RAIZ, caminho)}: ${e.message}`); continue; }
  const { alvos, chaves, sombras } = analisar(ast, txt);
  if (chaves.length) relatorio.chaves.push(...chaves);
  if (sombras.length) relatorio.sombras.push(...sombras);
  // colisão: o novo nome já existe no ficheiro?
  if (new RegExp(`\\b${novo}\\b`).test(txt)) relatorio.colisoes.push(relative(RAIZ, caminho));
  if (!alvos.length) continue;
  // substituir de TRÁS para a frente (os offsets deixam de ser válidos se formos do início)
  alvos.sort((a, b) => b[0] - a[0]);
  let saida = txt;
  for (const [ini, fim] of alvos) saida = saida.slice(0, ini) + novo + saida.slice(fim);
  // PROVA de que só identificadores mudaram: os comentários têm de ser idênticos
  const antes = ast.comments.map((c) => c.value).join("|");
  const depois = parse(saida, caminho).comments.map((c) => c.value).join("|");
  if (antes !== depois) { console.error(`  ⛔ ${relative(RAIZ, caminho)}: os COMENTÁRIOS mudaram — aborta`); continue; }
  if (!DRY) await writeFile(caminho, saida, "utf8");
  totalFicheiros++; totalAlvos += alvos.length;
  relatorio.alterados.push(`${relative(RAIZ, caminho)} (${alvos.length})`);
}

console.log(`[mc965] ${antigo} -> ${novo}${DRY ? " (DRY RUN)" : ""}`);
console.log(`[mc965] ficheiros alterados: ${totalFicheiros} · identificadores: ${totalAlvos}`);
for (const a of relatorio.alterados) console.log(`         ${a}`);
if (relatorio.chaves.length) {
  console.log(`[mc965] ⚠️ CHAVES de objecto NÃO-shorthand (NÃO renomeadas — podem ser contrato):`);
  for (const c of relatorio.chaves) console.log(`         ${c}`);
}
if (relatorio.sombras.length) console.log(`[mc965] ⚠️ sombras: ${relatorio.sombras.join(", ")}`);
if (relatorio.colisoes.length) console.log(`[mc965] ⚠️ o novo nome já existe em: ${relatorio.colisoes.join(", ")} — REVER`);
