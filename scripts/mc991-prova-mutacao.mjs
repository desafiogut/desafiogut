// MC99.1 — instrumento preservado (estava em _tmp/mc991/, movido para scripts/ no fecho).
// Uso: node scripts/mc991-prova-mutacao.mjs
// MC99.1 — prova de mutação acumulada (HARD GATE 5/R16). Regras:
//   cada mutação tem de ENTRAR (verificado por leitura ANTES de medir) e dar RED;
//   restauração por SNAPSHOT BINÁRIO + md5 idêntico.
// ⚠️ Os .jsx são CRLF: normalizar ao LER e repor CRLF ao ESCREVER, senão a mutação
// multi-linha "não altera nada" e lê-se como guarda boa (lição do MC99).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = resolve(R, "desafio-gut", "frontend");
const abs = (p) => resolve(FE, p);
const md5 = (p) => createHash("md5").update(readFileSync(abs(p))).digest("hex");
const LER = (p) => readFileSync(abs(p), "utf8").replace(/\r\n/g, "\n");
const ESC = (p, s) => writeFileSync(abs(p), s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");

const M = [
  // ── SEG0 · rotas (HARD GATE 6) ───────────────────────────────────────────────
  // ⚠️ Os caminhos em `f` são relativos a desafio-gut/frontend (é o que o `abs()` espera).
  { id: "M1", nome: "SEG0 — introduzir rota órfã ALCANÇADA (referência sem registo)",
    f: "src/pages/Dashboard.jsx",
    apl: (s) => s.replace('onClick={() => navigate("/mercado")}', 'onClick={() => navigate("/rota-que-nao-existe")}'),
    entrou: (s) => s.includes('"/rota-que-nao-existe"'),
    testes: ["src/__tests__/mc991-rotas.test.mjs"] },
  { id: "M2", nome: "SEG0 — registar rota NOVA que ninguém alcança",
    f: "src/App.jsx",
    apl: (s) => s.replace('<Route path="/programacao"', '<Route path="/rota-orfa-nova" element={<ScheduleView />} />\n          <Route path="/programacao"'),
    entrou: (s) => s.includes('path="/rota-orfa-nova"'),
    testes: ["src/__tests__/mc991-rotas.test.mjs"] },
  // ── SEG2 / SEG6 ──────────────────────────────────────────────────────────────
  { id: "M3", nome: "SEG2 — repor um navigate directo (segundo ponto de entrada)",
    f: "src/pages/SejaNossoParceiro.jsx",
    apl: (s) => s.replace(/\n\s+irParaPainel\(\);/, '\n        navigate("/corporativo", { replace: true });'),
    // ⚠️ Contar sobre CÓDIGO: o comentário do helper nomeia navigate("/corporativo") e o
    // contador cru dava 3 em vez de 2, declarando "não entrou" um mutante que entrou (6.ª
    // ocorrência da contaminação por comentário neste dia).
    entrou: (s) => {
      const cod = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n").map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
      return (cod.split('navigate("/corporativo"').length - 1) === 2;
    },
    testes: ["src/__tests__/mc991-ui.test.mjs"] },
  { id: "M4", nome: "SEG6 — tirar o guarda corporativo das cotas",
    f: "src/pages/Vitrine.jsx",
    apl: (s) => s.replace('{corporativo && (\n          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "0.75rem" }}>',
      '<div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "0.75rem" }}>'),
    entrou: (s) => s.includes('{corporativo && (\n          <div style={{ display: "grid"') === false,
    testes: ["src/__tests__/mc991-ui.test.mjs"] },
];

const PROTS = [...new Set(M.map((m) => m.f))];
const SNAP = new Map(PROTS.map((p) => [p, readFileSync(abs(p))]));
const ANTES = Object.fromEntries(PROTS.map((p) => [p, md5(p)]));
const restaurar = () => { for (const [p, b] of SNAP) writeFileSync(abs(p), b); };

function suite(ficheiros) {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", ...ficheiros],
    { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const falhas = [...new Set([...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1].trim()))];
  const n = {};
  for (const m of out.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gm)) n[m[1]] = Number(m[2]);
  return { exit: r.status, falhas, ...n };
}

let todas = true;
const linhas = [];
for (const m of M) {
  const orig = LER(m.f);
  const mut = m.apl(orig);
  if (mut === orig) { console.error(`ABORTA ${m.id}: mutação não alterou nada`); process.exit(1); }
  ESC(m.f, mut);
  const entrou = m.entrou(LER(m.f));
  const r = entrou ? suite(m.testes) : { exit: null, falhas: [], nota: "nao entrou" };
  const red = r.exit !== 0, ok = entrou && red;
  todas = todas && ok;
  console.log(`${m.id} — ${m.nome}`);
  console.log(`  entrou=${entrou ? "SIM" : "NAO"}  ${red ? `RED (exit ${r.exit})` : "VERDE (!)"}  ${ok ? "PROVADO" : "NAO PROVADO"}`);
  console.log(`  matou: ${r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"}`);
  linhas.push({ ...m, entrou, red, ok, falhas: r.falhas, r });
  restaurar();
}

console.log("\n=== RESTAURAÇÃO (snapshot binário) ===");
let exacto = true;
for (const p of PROTS) {
  const idem = md5(p) === ANTES[p];
  exacto = exacto && idem;
  console.log(`  ${idem ? "IDÊNTICO " : "DIFERENTE"}  ${p.split("/").slice(-3).join("/")}  ${md5(p)}`);
}
const rf = suite(["src/__tests__/mc991-rotas.test.mjs"]);
console.log(`\nsuite após restaurar: ${rf.exit === 0 ? "VERDE" : "VERMELHO"} (tests=${rf.tests} pass=${rf.pass} fail=${rf.fail})`);
const ok = todas && exacto && rf.exit === 0;
console.log(`\nMC99.1 mutação: ${ok ? `${M.length} MUTACOES PROVADAS + RESTAURACAO EXACTA` : "FALHOU"}`);
writeFileSync(resolve(R, "_logs/MC99.1_PROVA-MUTACAO.txt"),
  linhas.map((l) => `${l.id} ${l.nome}\n  entrou=${l.entrou} red=${l.red} provado=${l.ok}\n  matou: ${l.falhas.join(" | ")}\n  suite: ${JSON.stringify(l.r)}`).join("\n\n")
  + `\n\nrestauracao_md5_identica=${exacto}\nfinal=${rf.exit === 0 ? "VERDE" : "VERMELHO"} tests=${rf.tests} pass=${rf.pass} fail=${rf.fail}\n`);
process.exit(ok ? 0 : 1);
