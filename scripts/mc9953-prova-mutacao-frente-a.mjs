// mc9953-prova-mutacao-frente-a.mjs — MC99.5.3, prova de MUTAÇÃO da FRENTE A (performance).
// HARD GATE 7 + R16. Cada mutante tem de ENTRAR antes de se ler o resultado.
//
// Os mutantes REPÕEM exactamente os defeitos que as correcções fecharam — se algum deles ficar
// VERDE, a guarda é decorativa:
//   MA1 repor um .woff2 duplicado            -> guarda do dedup (estrutural)
//   MA2 repor o 2.º preload da fonte         -> guarda do preload duplicado
//   MA3 apontar um @font-face a um src morto -> guarda do src morto
//   MA4 repor o fundo mobile de 200 KB       -> orçamento + ordem mobile<=desktop
//   MA5 repor o fontes.css antigo (dedup revertido, ficheiros já apagados) -> src morto
// Reposição por git show (o original está no commit base) — o mutador não depende de backups soltos.
import { readFileSync, writeFileSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = R + "/desafio-gut/frontend";
const FONTES = FE + "/public/fonts";
const FUNDOS = FE + "/public/assets/backgrounds";
const CSS = FE + "/src/fontes.css";
const HTML = FE + "/index.html";
const SUITE = ["src/__tests__/mc9953-performance.test.mjs", "src/__tests__/mc993-preload.test.mjs"];
const REL = (p) => p.slice(R.length + 1).replace(/\\/g, "/");

const gitShow = (rel) => {
  const r = spawnSync("git", ["-C", R, "show", "f0749a0:" + rel], { maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) { console.error("ABORTA: git show falhou para " + rel); process.exit(2); }
  return r.stdout;
};
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const suite = () => {
  const r = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...SUITE], { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  return { exit: r.status, falhas: [...new Set([...out.matchAll(/^\u2716 (.+?) \(\d/gm)].map((m) => m[1].trim()))] };
};

// snapshots
const snapCss = readFileSync(CSS), mdCss = md5(CSS);
const snapHtml = readFileSync(HTML), mdHtml = md5(HTML);
const snapMob = readFileSync(FUNDOS + "/background-mobile.webp"), mdMob = md5(FUNDOS + "/background-mobile.webp");
const DUP = FONTES + "/inter-900-latin.woff2";

console.log("baseline: " + JSON.stringify(suite()) + "\n");
let todas = true; const linhas = [];

const casos = [
  {
    id: "MA1", nome: "repor um .woff2 duplicado em public/fonts (dedup desfeito)",
    correr: () => { copyFileSync(FONTES + "/inter-400-latin.woff2", DUP); return existsSync(DUP) && md5(DUP) === md5(FONTES + "/inter-400-latin.woff2"); },
    limpar: () => { try { rmSync(DUP); } catch { } },
  },
  {
    id: "MA2", nome: "repor o 2.º preload da fonte (o mesmo ficheiro duas vezes)",
    correr: () => {
      const linha = '<link rel="preload" href="/fonts/inter-400-latin.woff2" as="font" type="font/woff2" crossorigin>';
      const s = snapHtml.toString("utf8");
      if (!s.includes(linha)) throw new Error("nao encontrei a linha de preload no index.html");
      writeFileSync(HTML, s.replace(linha, linha + "\n    " + linha));
      // conta as tags REAIS (fora de comentários) — é o que o teste mede
      const semComent = readFileSync(HTML, "utf8").replace(/<!--[\s\S]*?-->/g, "");
      const n = [...semComent.matchAll(/<link\b[^>]*\brel="preload"[^>]*\bas="font"[^>]*>/g)].length;
      return n >= 2;
    },
    limpar: () => writeFileSync(HTML, snapHtml),
  },
  {
    id: "MA3", nome: "apontar um @font-face a um src inexistente (/fonts/inter-900-latin.woff2)",
    correr: () => {
      writeFileSync(CSS, snapCss.toString("utf8").replace("/fonts/inter-400-latin.woff2') format('woff2'); /* MC99.5.3: era inter-900", "/fonts/inter-900-latin.woff2') format('woff2'); /* MC99.5.3: era inter-900"));
      return readFileSync(CSS, "utf8").includes("url('/fonts/inter-900-latin.woff2')");
    },
    limpar: () => writeFileSync(CSS, snapCss),
  },
  {
    id: "MA4", nome: "repor o fundo mobile original (200 068 B) do commit base",
    correr: () => { writeFileSync(FUNDOS + "/background-mobile.webp", gitShow(REL(FUNDOS + "/background-mobile.webp"))); return readFileSync(FUNDOS + "/background-mobile.webp").length > 190000; },
    limpar: () => writeFileSync(FUNDOS + "/background-mobile.webp", snapMob),
  },
  {
    id: "MA5", nome: "repor o fontes.css ANTIGO (dedup revertido) com os duplicados já apagados",
    correr: () => { writeFileSync(CSS, gitShow(REL(CSS))); return readFileSync(CSS, "utf8").includes("url('/fonts/inter-900-latin.woff2')"); },
    limpar: () => writeFileSync(CSS, snapCss),
  },
];

for (const c of casos) {
  let entrou = false, r = { exit: null, falhas: [] };
  try {
    entrou = c.correr();
    if (entrou) r = suite();
  } catch (e) { console.log("  (erro no mutador: " + (e && e.message) + ")"); }
  finally { c.limpar(); }
  const red = r.exit !== 0;
  const ok = entrou && red;
  todas = todas && ok;
  console.log(c.id + " — " + c.nome);
  console.log("  entrou=" + (entrou ? "SIM" : "NAO(mutante invalido)") + "  " + (red ? "RED" : "VERDE(!)") + "  -> " + (ok ? "PROVADO" : entrou ? "VACUO — ALARME" : "INVALIDO"));
  console.log("  matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
  linhas.push(c.id + " " + c.nome + "\n  entrou=" + entrou + " red=" + red + " provado=" + ok + "\n  matou: " + r.falhas.join(" | "));
}

const restaurado = md5(CSS) === mdCss && md5(HTML) === mdHtml && md5(FUNDOS + "/background-mobile.webp") === mdMob && !existsSync(DUP);
const rf = suite();
console.log("\nrestauracao exacta: " + restaurado + " | suite apos restaurar: " + (rf.exit === 0 ? "VERDE" : "VERMELHO"));
const ok = todas && restaurado && rf.exit === 0;
console.log("\nMC99.5.3 (Frente A) mutacao: " + (ok ? "TODAS PROVADAS + RESTAURACAO EXACTA" : "FALHOU"));
writeFileSync(R + "/_logs/MC99.5.3_PROVA-MUTACAO-FRENTE-A.txt",
  linhas.join("\n\n") + "\n\nrestauracao_exacta=" + restaurado + "\nsuite_final=" + (rf.exit === 0 ? "VERDE" : "VERMELHO") + "\n", "utf8");
process.exitCode = ok ? 0 : 1;
