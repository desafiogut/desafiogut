// MC98 — instrumento preservado (estava em _tmp/mc98/, movido para scripts/ na limpeza
// final). Uso: node scripts/mc98-prova-mutacao.mjs
// Ficam os instrumentos que FUNCIONAM; o scratch que falhou foi apagado.
// MC98 — SEG2 (revisto após refutação parcial do validador independente): prova de mutação.
// Regra: confirmar que o mutante ENTROU antes de ler o resultado; restaurar por SNAPSHOT
// BINÁRIO (não por substituições inversas — deixam lixo de fim de linha).
//
// A 1.ª versão desta bateria usava, no MUT2, a MESMA forma que o próprio detector testava
// (`value="en"` + «English (US)»). Era CIRCULAR: provava que a guarda casa o que o autor
// escreveu, não que apanha o que um atacante faria. O validador independente mostrou-o com
// duas evasões sobreviventes (aspas simples + rótulos «English»/«Spanish»; dicionário .mjs).
// MUT2b/MUT2c/MUT1c são essas evasões, agora dentro da bateria.
import { readFileSync, writeFileSync, renameSync, existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = resolve(R, "desafio-gut/frontend");
const abs = (p) => resolve(FE, p);
const md5 = (p) => createHash("md5").update(readFileSync(abs(p))).digest("hex");

const PROTEGIDOS = [
  "src/context/IdiomaContext.jsx",
  "src/pages/Configuracoes.jsx",
  "src/i18n/pt.js",
];
const LIXO = ["src/i18n/en.js", "src/i18n/en.mjs", "src/i18n/pt.js.mutado"];

const SNAP = new Map(PROTEGIDOS.map((p) => [p, readFileSync(abs(p))]));
const ANTES = Object.fromEntries(PROTEGIDOS.map((p) => [p, md5(p)]));

function restaurarTudo() {
  for (const [p, bytes] of SNAP) writeFileSync(abs(p), bytes);
  for (const p of LIXO) if (existsSync(abs(p))) rmSync(abs(p));
}
function suite(alvos) {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", ...alvos],
    { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const falhas = [...new Set([...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1].trim()))];
  const n = {};
  for (const m of out.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gm)) n[m[1]] = Number(m[2]);
  return { exit: r.status, falhas, ...n };
}
const LER = (p) => readFileSync(abs(p), "utf8");
const ESCREVER = (p, s) => writeFileSync(abs(p), s);

// marcadores do selector, injectados no Configuracoes.jsx antes de {/* Sobre */}
const SEL_ORIGINAL = '<select aria-label="Idioma"><option value="pt">Português (Brasil)</option><option value="en">English (US)</option><option value="es">Español</option></select>';
const SEL_EVASAO_1 = "<select aria-label=\"Idioma\"><option value='pt'>Portugues</option><option value='en'>English</option><option value='es'>Spanish</option></select>";
const SEL_EVASAO_2 = "<select aria-label=\"Idioma\"><option value='en'>Inglés</option><option value='es'>Español</option></select>";

const MUTACOES = [
  { id: "MUT1", nome: "reintroduzir o dicionário src/i18n/en.js",
    aplicar() { ESCREVER("src/i18n/en.js", 'export default { "nav.lances": "Bids" };\n'); },
    entrou() { return existsSync(abs("src/i18n/en.js")); } },
  { id: "MUT1b", nome: "reintroduzir o IMPORT de i18n/en.js no IdiomaContext",
    aplicar() { const p = PROTEGIDOS[0];
      ESCREVER(p, LER(p).replace('import pt from "../i18n/pt.js";', 'import pt from "../i18n/pt.js";\nimport en from "../i18n/en.js";')); },
    entrou() { return /(^|\n)import en from "\.\.\/i18n\/en\.js";/.test(LER(PROTEGIDOS[0])); } },
  { id: "MUT1c", nome: "EVASÃO E2 — dicionário como src/i18n/en.mjs + import .mjs",
    aplicar() { const p = PROTEGIDOS[0];
      ESCREVER("src/i18n/en.mjs", 'export default { "nav.lances": "Bids" };\n');
      ESCREVER(p, LER(p).replace('import pt from "../i18n/pt.js";', 'import pt from "../i18n/pt.js";\nimport en from "../i18n/en.mjs";')); },
    entrou() { return existsSync(abs("src/i18n/en.mjs")) && /import en from "\.\.\/i18n\/en\.mjs";/.test(LER(PROTEGIDOS[0])); } },
  { id: "MUT2", nome: "reintroduzir o selector (forma ORIGINAL: aspas duplas + «English (US)»)",
    aplicar() { ESCREVER(PROTEGIDOS[1], LER(PROTEGIDOS[1]).replace("{/* Sobre */}", "{/* Sobre */}\n" + SEL_ORIGINAL)); },
    entrou() { return /<option value="en">English \(US\)<\/option>/.test(LER(PROTEGIDOS[1])); } },
  { id: "MUT2b", nome: "EVASÃO E1 — selector com ASPAS SIMPLES + rótulos «English»/«Spanish»",
    aplicar() { ESCREVER(PROTEGIDOS[1], LER(PROTEGIDOS[1]).replace("{/* Sobre */}", "{/* Sobre */}\n" + SEL_EVASAO_1)); },
    entrou() { return /<option value='en'>English<\/option>/.test(LER(PROTEGIDOS[1])); } },
  { id: "MUT2c", nome: "EVASÃO E1b — selector com rótulos «Inglés»/«Español»",
    aplicar() { ESCREVER(PROTEGIDOS[1], LER(PROTEGIDOS[1]).replace("{/* Sobre */}", "{/* Sobre */}\n" + SEL_EVASAO_2)); },
    entrou() { return /<option value='en'>Inglés<\/option>/.test(LER(PROTEGIDOS[1])); } },
  { id: "MUT3", nome: "remover o pt.js (o único dicionário)",
    aplicar() { renameSync(abs("src/i18n/pt.js"), abs("src/i18n/pt.js.mutado")); },
    entrou() { return !existsSync(abs("src/i18n/pt.js")) && existsSync(abs("src/i18n/pt.js.mutado")); } },
];

const ALVOS = ["src/i18n/__tests__/pt-only.test.mjs", "src/i18n/__tests__/glossario.test.mjs"];
let todasOk = true;
const linhas = [];

for (const m of MUTACOES) {
  m.aplicar();
  const entrou = m.entrou();                        // ← só DEPOIS de confirmar se lê o resultado
  const r = entrou ? suite(ALVOS) : { exit: null, falhas: [], nota: "mutante NAO entrou" };
  const red = r.exit !== 0, ok = entrou && red;
  todasOk = todasOk && ok;
  console.log(`\n${m.id} — ${m.nome}`);
  console.log(`  mutante entrou: ${entrou ? "SIM" : "NAO"}   veredicto: ${red ? "RED (exit " + r.exit + ")" : "VERDE (!)"}   ${ok ? "PROVADO" : "NAO PROVADO"}`);
  console.log(`  testes que dispararam: ${r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"}`);
  if (r.tests !== undefined) console.log(`  suite: tests=${r.tests} pass=${r.pass} fail=${r.fail}`);
  linhas.push({ id: m.id, nome: m.nome, entrou, red, falhas: r.falhas, tests: r.tests, pass: r.pass, fail: r.fail, ok });
  restaurarTudo();
}

// ─── INSTRUMENTO: o medidor da ficha tem de funcionar com o ficheiro em CRLF ───────
// (defeito de reprodutibilidade medido pelo validador: num worktree limpo os .md recebem
// CRLF e a 1.ª versão do script devolvia exit 2 NUM FICHEIRO CORRECTO.)
console.log("\n### INSTRUMENTO — o medidor da ficha com o documento em CRLF");
const P_FICHA = resolve(R, "docs/FICHA-PLAY-PT.md");
const original = readFileSync(P_FICHA);
const crlfBuf = Buffer.from(original.toString("utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");
let instrumentoOk = false, saidaCRLF = "";
try {
  writeFileSync(P_FICHA, crlfBuf);
  const cr = crlfBuf.toString("utf8").split("\n").length - 1;
  console.log(`  ficheiro em CRLF escrito (linhas=${cr}, bytes=${crlfBuf.length}) — mutante entrou: ${crlfBuf.includes(13) ? "SIM" : "NAO"}`);
  const r = spawnSync("node", [resolve(R, "scripts/mc97-medir-ficha.mjs")], { cwd: R, encoding: "utf8" });
  saidaCRLF = `${r.stdout || ""}${r.stderr || ""}`.trim();
  console.log(`  exit=${r.status}`);
  console.log("  saída: " + saidaCRLF.split("\n").join("\n         "));
  instrumentoOk = r.status === 0 && /3\/3 campos dentro dos limites/.test(saidaCRLF);
} finally {
  writeFileSync(P_FICHA, original);
}
const restauradoFicha = Buffer.compare(readFileSync(P_FICHA), original) === 0;
console.log(`  ficha restaurada byte a byte: ${restauradoFicha ? "SIM" : "NAO"}`);
console.log(`  resultado: ${instrumentoOk && restauradoFicha ? "PROVADO" : "NAO PROVADO"}`);

console.log("\n=== RESTAURAÇÃO (snapshot binário) ===");
let restaurado = true;
for (const p of PROTEGIDOS) {
  const agora = md5(p), igual = agora === ANTES[p];
  restaurado = restaurado && igual;
  console.log(`  ${igual ? "IDÊNTICO " : "DIFERENTE"}  ${p}  ${agora}`);
}
const lixoOk = LIXO.every((p) => !existsSync(abs(p)));
console.log(`  lixo removido (${LIXO.join(", ")}): ${lixoOk ? "SIM" : "NAO"}`);

const rFinal = suite(ALVOS);
console.log(`\nSuíte alvo após restaurar: ${rFinal.exit === 0 ? "VERDE" : "VERMELHO"} (tests=${rFinal.tests} pass=${rFinal.pass} fail=${rFinal.fail})`);
const sucesso = todasOk && instrumentoOk && restaurado && restauradoFicha && lixoOk && rFinal.exit === 0;
console.log(`\nSEG2: ${sucesso ? "TODAS AS MUTACOES (7) + O INSTRUMENTO PROVADOS, RESTAURACAO EXACTA" : "FALHOU"}`);

writeFileSync(resolve(R, "_logs/MC98_SEG2_MUTACAO.txt"),
  linhas.map((l) => `${l.id} ${l.nome}\n  entrou=${l.entrou} red=${l.red} provado=${l.ok}\n  falhas: ${l.falhas.join(" | ")}\n  suite: tests=${l.tests} pass=${l.pass} fail=${l.fail}`).join("\n\n")
  + `\n\nINSTRUMENTO (ficha em CRLF): exit_ok=${instrumentoOk} restaurado=${restauradoFicha}\n  saida: ${saidaCRLF.replace(/\n/g, " | ")}\n`
  + `\nrestauracao_md5_identica=${restaurado} lixo_removido=${lixoOk}\nfinal=${rFinal.exit === 0 ? "VERDE" : "VERMELHO"} tests=${rFinal.tests} pass=${rFinal.pass} fail=${rFinal.fail}\n`);
process.exit(sucesso ? 0 : 1);
