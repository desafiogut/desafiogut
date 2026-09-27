// MC99.3 — prova de mutação da guarda do preload (HARD GATE 7). 4 mutações, todas têm de
// ENTRAR (lidas do ficheiro ANTES de medir) e dar RED. Restauração por snapshot + md5.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const R = "C:/Users/Moltbot/Desktop/DESAFIOGUT";
const FE = R + "/desafio-gut/frontend";
const HTML = FE + "/index.html";
const TESTE = "src/__tests__/mc993-preload.test.mjs";
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const snap = readFileSync(HTML);
const antes = md5(HTML);
const suite = () => {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", TESTE],
    { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  return { exit: r.status, falhas: [...new Set([...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1].trim()))] };
};
// ⚠️ O index.html é CRLF. Sem normalizar, o `replace` de várias linhas não casa e o script
// aborta com «a mutação não alterou nada» — que à pressa se lê como «a guarda não a apanhou».
// (É a armadilha que o próprio enunciado deste MC avisa; e já me apanhou no MC99.2.)
const norm = (s) => s.replace(/\r\n/g, "\n");
const escrever = (s) => writeFileSync(HTML, s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");
const base = norm(snap.toString("utf8"));

const M = [
  { id: "M1", nome: "tirar o preload da fonte 400 (o corpo do texto)",
    apl: (s) => s.replace('    <link rel="preload" href="/fonts/inter-400-latin.woff2" as="font" type="font/woff2" crossorigin>\n', ""),
    entrou: (s) => !s.includes("inter-400-latin.woff2") },
  { id: "M2", nome: "pre-carregar o video decorativo de 345 KB",
    apl: (s) => s.replace('    <link rel="preload" href="/assets/guto/custom/guto-bemvindo.png" as="image">',
      '    <link rel="preload" href="/assets/backgrounds/loops/fundo-loop-v3-desktop.webm" as="video">\n    <link rel="preload" href="/assets/guto/custom/guto-bemvindo.png" as="image">'),
    entrou: (s) => s.includes("fundo-loop-v3-desktop.webm") },
  { id: "M3", nome: "tirar o media do fundo (seria pedido em ambos os ecras)",
    apl: (s) => s.replace(' as="image" media="(min-width: 768px)">', ' as="image">'),
    entrou: (s) => !s.includes('media="(min-width: 768px)"') },
  { id: "M4", nome: "apontar um preload para um ficheiro que nao existe (pedido a 404)",
    apl: (s) => s.replace('href="/assets/guto/custom/guto-bemvindo.png"', 'href="/assets/guto/custom/NAO-EXISTE.png"'),
    entrou: (s) => s.includes("NAO-EXISTE.png") },
  { id: "M5", nome: "fonte sem crossorigin (descarregada duas vezes)",
    apl: (s) => s.replace('href="/fonts/inter-900-latin.woff2" as="font" type="font/woff2" crossorigin>',
      'href="/fonts/inter-900-latin.woff2" as="font" type="font/woff2">'),
    entrou: (s) => !/inter-900-latin\.woff2" as="font" type="font\/woff2" crossorigin/.test(s) },
];

console.log("baseline: " + JSON.stringify(suite()) + "\n");
let todas = true;
const linhas = [];
for (const m of M) {
  const mut = m.apl(base);
  if (mut === base) { console.error("ABORTA " + m.id + ": mutação não alterou nada"); process.exit(1); }
  escrever(mut);
  const entrou = m.entrou(norm(readFileSync(HTML, "utf8")));
  const r = entrou ? suite() : { exit: null, falhas: ["(nao entrou)"] };
  const red = r.exit !== 0, ok = entrou && red;
  todas = todas && ok;
  console.log(m.id + " — " + m.nome);
  console.log("  entrou=" + (entrou ? "SIM" : "NAO") + "  " + (red ? "RED (exit " + r.exit + ")" : "VERDE (!)") + "  " + (ok ? "PROVADO" : "NAO PROVADO"));
  console.log("  matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
  linhas.push(m.id + " " + m.nome + "\n  entrou=" + entrou + " red=" + red + " provado=" + ok + "\n  matou: " + r.falhas.join(" | "));
  writeFileSync(HTML, snap);
}
const exacto = md5(HTML) === antes;
const rf = suite();
console.log("\nrestauracao md5-identica: " + exacto + " | suite apos restaurar: " + (rf.exit === 0 ? "VERDE" : "VERMELHO"));
const ok = todas && exacto && rf.exit === 0;
console.log("\nMC99.3 mutacao: " + (ok ? M.length + " MUTACOES PROVADAS + RESTAURACAO EXACTA" : "FALHOU"));
writeFileSync(R + "/_logs/MC99.3_PROVA-MUTACAO.txt",
  linhas.join("\n\n") + "\n\nrestauracao_md5_identica=" + exacto + "\nfinal=" + (rf.exit === 0 ? "VERDE" : "VERMELHO") + "\n", "utf8");
process.exit(ok ? 0 : 1);
