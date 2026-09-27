// MC99.3 / SEG-1 — instala as 5 skills de performance em .claude/skills/.
// Verifica CADA download (existe + tamanho + frontmatter), em vez de confiar no comando.
import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const RAIZ = "C:/Users/Moltbot/Desktop/DESAFIOGUT";
const BASE = "https://raw.githubusercontent.com";

const ALVOS = [
  { skill: "ponytail", repo: "DietrichGebert/ponytail", ramo: "main",
    ficheiros: [{ de: ".openclaw/skills/ponytail/SKILL.md", para: "SKILL.md" }],
    origem: "ladder: YAGNI -> reutilizar -> stdlib -> nativo -> dep existente -> uma linha" },
  { skill: "vercel-react-best-practices", repo: "vercel-labs/agent-skills", ramo: "main",
    ficheiros: [{ de: "skills/react-best-practices/SKILL.md", para: "SKILL.md" }],
    origem: "45 regras React do código de produção da Vercel" },
  { skill: "huashu-flash", repo: "alchaincyf/huashu-flash", ramo: "master",
    ficheiros: [
      { de: "SKILL.md", para: "SKILL.md" },
      { de: "scripts/bench.py", para: "scripts/bench.py" },
      { de: "scripts/ratchet.py", para: "scripts/ratchet.py" },
    ],
    origem: "medir/provar/subir com ratchet que só permite melhorar" },
  { skill: "perf-analyzer", repo: "hardikpandya/perf-analyzer", ramo: "main",
    ficheiros: [{ de: "SKILL.md", para: "SKILL.md" }],
    origem: "Lighthouse + Core Web Vitals, correcções por severidade" },
  { skill: "chrome-devtools-mcp", repo: "justfinethanku/cc_chrome_devtools_mcp_skill", ramo: "main",
    ficheiros: [{ de: "SKILL.md", para: "SKILL.md" }],
    origem: "Core Web Vitals via Chrome DevTools Protocol" },
];

const baixar = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
};

let falhas = 0;
const linhas = [];
for (const a of ALVOS) {
  const dir = resolve(RAIZ, ".claude/skills", a.skill);
  mkdirSync(dir, { recursive: true });
  console.log(`\n=== ${a.skill}  (${a.repo}) ===`);
  for (const f of a.ficheiros) {
    const url = `${BASE}/${a.repo}/${a.ramo}/${f.de}`;
    const dest = resolve(dir, f.para);
    try {
      const txt = await baixar(url);
      if (!txt || txt.length < 100) throw new Error(`conteudo suspeito (${txt.length} bytes)`);
      mkdirSync(resolve(dest, ".."), { recursive: true });
      writeFileSync(dest, txt, "utf8");
      const md5 = createHash("md5").update(txt).digest("hex").slice(0, 8);
      const existe = existsSync(dest);
      const bytes = existe ? statSync(dest).size : 0;
      const nome = (txt.match(/^name:\s*(.+)$/m) || [])[1] || "(sem frontmatter name)";
      console.log(`  OK  ${f.para}  ${bytes} B  md5:${md5}  name: ${nome}`);
      linhas.push(`| ${a.skill} | ${f.para} | ${bytes} B | ${md5} | ${url} |`);
      if (!existe || bytes < 100) falhas++;
    } catch (e) {
      console.log(`  FALHA  ${f.para}  -> ${e.message}`);
      linhas.push(`| ${a.skill} | ${f.para} | FALHA: ${e.message} | - | ${url} |`);
      falhas++;
    }
  }
}

// verificação final, independente do que ficou em memória: ler do disco
console.log("\n=== VERIFICAÇÃO NO DISCO (independente) ===");
const rel = [];
for (const a of ALVOS) {
  for (const f of a.ficheiros) {
    const p = resolve(RAIZ, ".claude/skills", a.skill, f.para);
    const ok = existsSync(p);
    const b = ok ? statSync(p).size : 0;
    console.log(`  ${ok && b > 100 ? "OK   " : "FALHA"} ${a.skill}/${f.para}  ${b} B`);
    if (!ok || b <= 100) falhas++;
    rel.push([a.skill, f.para, b].join("\t"));
  }
}

writeFileSync(resolve(RAIZ, "_logs/MC99.3_SEG-1_SKILLS.txt"),
  ["### SKILLS INSTALADAS (MC99.3)", "",
   "| skill | ficheiro | bytes | md5 (8) | origem |",
   "|---|---|---|---|---|", ...linhas, "",
   "### EFEITO DECLARADO", ...ALVOS.map((a) => `- ${a.skill}: ${a.origem}`), ""].join("\n"), "utf8");
console.log(`\nMANIFESTO -> _logs/MC99.3_SEG-1_SKILLS.txt`);
console.log(falhas ? `SEG-1: ${falhas} FALHA(S)` : "SEG-1: 5 SKILLS INSTALADAS E VERIFICADAS NO DISCO");
process.exit(falhas ? 1 : 0);
