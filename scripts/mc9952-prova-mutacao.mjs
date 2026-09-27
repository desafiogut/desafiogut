// MC99.5.2 — prova de mutação (HARD GATE 6). 5 mutações em 2 ficheiros, cada uma tem de ENTRAR
// (lida do ficheiro, sobre CÓDIGO) e dar RED. Restauração por snapshot binário + md5.
// A mutação do gate usa predicados sobre CÓDIGO (os comentários desta correcção nomeiam details).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const R = "C:/Users/Moltbot/Desktop/DESAFIOGUT";
const FE = R + "/desafio-gut/frontend";
const PROXY = FE + "/netlify/functions/img-proxy.mjs";
const TERMOS = FE + "/src/components/TermosConsentimento.jsx";
const TESTE = "src/__tests__/mc9952-seguranca-gate.test.mjs";
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const norm = (s) => s.replace(/\r\n/g, "\n");
const escr = (p, s) => writeFileSync(p, s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");
const codigo = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const suite = () => {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", TESTE], { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  return { exit: r.status, falhas: [...new Set([...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1].trim()))] };
};
const snapP = readFileSync(PROXY), mdP = md5(PROXY);
const snapT = readFileSync(TERMOS), mdT = md5(TERMOS);
const baseP = norm(snapP.toString("utf8")), baseT = norm(snapT.toString("utf8"));

const M = [
  { id: "M1", nome: "SSRF: tirar a normalizacao dos brackets (reabre os 4 payloads)", f: "P",
    apl: (s) => s.replace('.replace(/^\\[|\\]$/g, "")', ""),
    entrou: (s) => !/replace\(\/\^\\\[\|\\\]\$\/g/.test(codigo(s)) },
  { id: "M2", nome: "SSRF: tirar o tratamento da forma HEX do IPv4-mapeado", f: "P",
    apl: (s) => s.replace('  const mappedHex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);', '  const mappedHex = null;'),
    entrou: (s) => /const mappedHex = null;/.test(codigo(s)) },
  { id: "M3", nome: "gate: abrir o <details> por padrao (mostra o texto todo)", f: "T",
    apl: (s) => s.replace("<details style={estilos.regulamento}>", "<details open style={estilos.regulamento}>"),
    entrou: (s) => /<details open/.test(codigo(s)) },
  { id: "M4", nome: "gate: tirar o botao (summary)", f: "T",
    apl: (s) => s.replace('          <summary style={estilos.botaoExpandir}>📖 Ler o regulamento completo</summary>\n', ""),
    entrou: (s) => !/<summary/.test(codigo(s)) },
  { id: "M5", nome: "gate: meter os 4 aceites DENTRO do details (escondidos quando fechado)", f: "T",
    apl: (s) => s.replace("        </details>\n\n        {/* Checkboxes de consentimento */}", "\n        {/* Checkboxes de consentimento */}").replace("          </p>\n        </div>\n\n        {/* Checkboxes", "          </p>\n        </div>\n        </details>\n\n        {/* Checkboxes"),
    entrou: (s) => { const c = codigo(s); const ab = c.indexOf("<details"), fe = c.indexOf("</details>"), cb = c.indexOf("estilos.checkboxes"); return cb > fe || (cb > ab && fe > cb); } },
];

console.log("baseline: " + JSON.stringify(suite()) + "\n");
let todas = true; const linhas = [];
for (const m of M) {
  const base = m.f === "P" ? baseP : baseT;
  const alvo = m.f === "P" ? PROXY : TERMOS;
  const snap = m.f === "P" ? snapP : snapT;
  const mut = m.apl(base);
  if (mut === base) { console.error("ABORTA " + m.id + ": nao alterou nada"); writeFileSync(alvo, snap); process.exit(1); }
  escr(alvo, mut);
  const entrou = m.entrou(readFileSync(alvo, "utf8"));
  const r = entrou ? suite() : { exit: null, falhas: ["(nao entrou)"] };
  const ok = entrou && r.exit !== 0;
  todas = todas && ok;
  console.log(m.id + " — " + m.nome);
  console.log("  entrou=" + (entrou ? "SIM" : "NAO") + "  " + (r.exit ? "RED" : "VERDE(!)") + "  " + (ok ? "PROVADO" : "NAO PROVADO"));
  console.log("  matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
  linhas.push(m.id + " " + m.nome + "\n  entrou=" + entrou + " red=" + (r.exit !== 0) + " provado=" + ok + "\n  matou: " + r.falhas.join(" | "));
  writeFileSync(alvo, snap);
}
const exP = md5(PROXY) === mdP, exT = md5(TERMOS) === mdT;
const rf = suite();
const ok = todas && exP && exT && rf.exit === 0;
console.log("\nrestauracao md5-identica: proxy=" + exP + " termos=" + exT + " | suite apos restaurar: " + (rf.exit === 0 ? "VERDE" : "VERMELHO"));
console.log("\nMC99.5.2 mutacao: " + (ok ? M.length + " MUTACOES PROVADAS + RESTAURACAO EXACTA" : "FALHOU"));
writeFileSync(R + "/_logs/MC99.5.2_PROVA-MUTACAO.txt", linhas.join("\n\n") + "\n\nmd5_proxy=" + exP + " md5_termos=" + exT + "\n", "utf8");
process.exit(ok ? 0 : 1);
