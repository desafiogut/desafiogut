// MC99.5.1 — prova de mutação (HARD GATE 6). Cada mutante tem de ENTRAR (lido do ficheiro ANTES
// de medir) e dar RED. Restauração por snapshot binário + md5. Sem backticks.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const R = "C:/Users/Moltbot/Desktop/DESAFIOGUT";
const FE = R + "/desafio-gut/frontend";
const TERMOS = FE + "/src/components/TermosConsentimento.jsx";
const TESTE = "src/__tests__/mc9951-gate-legal.test.mjs";
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const suite = () => {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", TESTE], { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  return { exit: r.status, falhas: [...new Set([...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1].trim()))] };
};
const snapT = readFileSync(TERMOS), mdT = md5(TERMOS);
const ROB = FE + "/public/robots.txt";
const snapR = existsSync(ROB) ? readFileSync(ROB) : null;
const norm = (s) => s.replace(/\r\n/g, "\n");
const escr = (s) => writeFileSync(TERMOS, s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");
const base = norm(snapT.toString("utf8"));

const M = [
  { id: "M1", nome: "repor o maxHeight: 260px (a causa exacta do defeito)", f: "T",
    apl: (s) => s.replace('    flexShrink: 0,\n    padding: "1.25rem",', '    flexShrink: 0,\n    overflowY: "auto", maxHeight: "260px", padding: "1.25rem",'),
    entrou: (s) => /maxHeight\s*:\s*"260px"/.test(s) },
  { id: "M2", nome: "tirar o flexShrink: 0 (o flex volta a encolher a caixa)", f: "T",
    apl: (s) => s.replace('    flexShrink: 0,\n    padding: "1.25rem",', '    padding: "1.25rem",'),
    // ⚠️ 14.ª vez esta série: a 1.ª versão lia o ficheiro CRU e o comentário da correcção nomeia
    // `flexShrink: 0` — dando «não entrou» a um mutante que entrou. Mede-se sobre CÓDIGO.
    entrou: (s) => !/flexShrink:\s*0/.test(s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n")) },
  { id: "M3", nome: "tirar um aceite legal (checkbox do LGPD)", f: "T",
    apl: (s) => s.replace('type="checkbox"', 'type="checkbox-removido"'),
    entrou: (s) => /type="checkbox-removido"/.test(s) },
  { id: "M4", nome: "repor a data errada (1º de junho)", f: "H",
    apl: (s) => s.replace("5 de outubro de 2026", "1º de junho de 2026"),
    entrou: (s) => /junho de 2026/.test(s) },
];
let todas = true; const linhas = [];
console.log("baseline: " + JSON.stringify(suite()) + "\n");
for (const m of M) {
  let ok = false, entrou = false, r = { exit: null, falhas: [] };
  if (m.f === "T") {
    const mut = m.apl(base);
    if (mut === base) { console.error("ABORTA " + m.id + ": nao alterou nada"); process.exit(1); }
    escr(mut);
    entrou = m.entrou(norm(readFileSync(TERMOS, "utf8")));
    if (entrou) r = suite();
    writeFileSync(TERMOS, snapT);
    ok = entrou && r.exit !== 0;
  } else {
    const HTML = FE + "/index.html";
    const snap = readFileSync(HTML);
    const mut = m.apl(norm(snap.toString("utf8")));
    writeFileSync(HTML, mut.replace(/\n/g, "\r\n"), "utf8");
    entrou = m.entrou(readFileSync(HTML, "utf8"));
    if (entrou) r = suite();
    writeFileSync(HTML, snap);
    ok = entrou && r.exit !== 0;
  }
  todas = todas && ok;
  console.log(m.id + " — " + m.nome);
  console.log("  entrou=" + (entrou ? "SIM" : "NAO") + "  " + (r.exit ? "RED" : "VERDE(!)") + "  " + (ok ? "PROVADO" : "NAO PROVADO"));
  console.log("  matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
  linhas.push(m.id + " " + m.nome + "\n  entrou=" + entrou + " red=" + (r.exit !== 0) + " provado=" + ok + "\n  matou: " + r.falhas.join(" | "));
}
// M5: robots.txt ausente
if (snapR) {
  rmSync(ROB);
  const entrou = !existsSync(ROB);
  const r = entrou ? suite() : { exit: 0, falhas: [] };
  writeFileSync(ROB, snapR);
  const ok = entrou && r.exit !== 0;
  todas = todas && ok;
  console.log("M5 — apagar o robots.txt");
  console.log("  entrou=SIM  " + (r.exit ? "RED" : "VERDE(!)") + "  " + (ok ? "PROVADO" : "NAO PROVADO"));
  console.log("  matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
  linhas.push("M5 apagar robots.txt\n  entrou=true red=" + (r.exit !== 0) + " provado=" + ok + "\n  matou: " + r.falhas.join(" | "));
}
const exacto = md5(TERMOS) === mdT;
const rf = suite();
console.log("\nrestauracao md5-identica: " + exacto + " | suite apos restaurar: " + (rf.exit === 0 ? "VERDE" : "VERMELHO"));
const ok = todas && exacto && rf.exit === 0;
console.log("\nMC99.5.1 mutacao: " + (ok ? "TODAS PROVADAS + RESTAURACAO EXACTA" : "FALHOU"));
writeFileSync(R + "/_logs/MC99.5.1_PROVA-MUTACAO.txt", linhas.join("\n\n") + "\n\nmd5_restaurado=" + exacto + "\n", "utf8");
process.exit(ok ? 0 : 1);
