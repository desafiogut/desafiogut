// Meus mutantes (VAL-9953): cobrir as 6 linhas nas DUAS direcções + mutantes de "call site".
// Regra (skill §10): PROVADO = entrou + suíte RED | OBSOLETA = entrou + verde esperado | VACUO = alarme.
// Confirmação de entrada sobre CÓDIGO sem comentários. Restauro por snapshot binário + md5.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FN = resolve(R, "desafio-gut", "frontend", "netlify", "functions");
const GUARD = resolve(FN, "img-proxy.mjs");
const TESTE = "_tests/img-proxy.test.mjs";
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente"); process.exit(2); }
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const codigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/)
  .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

const suite = () => {
  const r = spawnSync(process.execPath, ["--test", "--test-concurrency=1", TESTE],
    { cwd: FN, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  return {
    exit: r.status,
    falhas: [...new Set([...out.matchAll(/^\u2716 (.+?) \(\d/gm)].map((m) => m[1].trim()))],
    pass: /^ℹ pass (\d+)$/m.exec(out)?.[1] ?? "?",
  };
};

const L = {
  ietf: "    if (a === 192 && b === 0 && c === 0) return true;",
  relay: "    if (a === 192 && b === 88 && c === 99) return true;",
  tn1: "    if (a === 192 && b === 0 && c === 2) return true;",
  bench: "    if (a === 198 && (b === 18 || b === 19)) return true;",
  tn2: "    if (a === 198 && b === 51 && c === 100) return true;",
  tn3: "    if (a === 203 && b === 0 && c === 113) return true;",
};
const apagar = (linha) => (s) => {
  const re = new RegExp("\\n" + linha.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/;$/, ";") + "[^\\n]*");
  const out = s.replace(re, "");
  if (out === s) throw new Error("nao casou: " + linha);
  return out;
};
const MUT = [
  // ── direcção 1: cada uma das 6 linhas REMOVIDA (a suíte morde em cada uma?) ──
  { id: "N1", nome: "remover 192.0.0.0/24", apl: apagar(L.ietf), entrou: (s) => !/a === 192 && b === 0 && c === 0/.test(codigo(s)) },
  { id: "N2", nome: "remover 192.88.99.0/24", apl: apagar(L.relay), entrou: (s) => !/b === 88 && c === 99/.test(codigo(s)) },
  { id: "N3", nome: "remover 192.0.2.0/24", apl: apagar(L.tn1), entrou: (s) => !/a === 192 && b === 0 && c === 2/.test(codigo(s)) },
  { id: "N4", nome: "remover 198.18.0.0/15", apl: apagar(L.bench), entrou: (s) => !/b === 18 \|\| b === 19/.test(codigo(s)) },
  { id: "N5", nome: "remover 198.51.100.0/24", apl: apagar(L.tn2), entrou: (s) => !/b === 51 && c === 100/.test(codigo(s)) },
  { id: "N6", nome: "remover 203.0.113.0/24", apl: apagar(L.tn3), entrou: (s) => !/b === 0 && c === 113/.test(codigo(s)) },
  // ── direcção 2: ALARGAR DEMAIS (as 6, uma a uma) ──
  { id: "W1", nome: "alargar 192.0.0.0/24 -> 192.0.0.0/16", apl: (s) => s.replace(L.ietf, "    if (a === 192 && b === 0) return true;"), entrou: (s) => /a === 192 && b === 0\) return true/.test(codigo(s)) },
  { id: "W2", nome: "alargar 192.88.99.0/24 -> 192.88.0.0/16", apl: (s) => s.replace(L.relay, "    if (a === 192 && b === 88) return true;"), entrou: (s) => /a === 192 && b === 88\) return true/.test(codigo(s)) },
  { id: "W3", nome: "alargar 192.0.2.0/24 -> 192.0.0.0/16 (repete ietf)", apl: (s) => s.replace(L.tn1, "    if (a === 192 && b === 0) return true;"), entrou: (s) => (codigo(s).match(/a === 192 && b === 0\) return true/g) || []).length >= 1 },
  { id: "W4", nome: "alargar 198.18.0.0/15 -> 198.0.0.0/8", apl: (s) => s.replace(L.bench, "    if (a === 198) return true;"), entrou: (s) => /if \(a === 198\) return true;/.test(codigo(s)) },
  { id: "W5", nome: "alargar 198.51.100.0/24 -> 198.51.0.0/16", apl: (s) => s.replace(L.tn2, "    if (a === 198 && b === 51) return true;"), entrou: (s) => /a === 198 && b === 51\) return true/.test(codigo(s)) },
  { id: "W6", nome: "alargar 203.0.113.0/24 -> 203.0.0.0/16", apl: (s) => s.replace(L.tn3, "    if (a === 203 && b === 0) return true;"), entrou: (s) => /a === 203 && b === 0\) return true/.test(codigo(s)) },
  // ── direcção 3: ESTREITAR (perde parte da faixa) ──
  { id: "S1", nome: "estreitar 198.18.0.0/15 -> só 198.18.0.0/16 (perde 198.19.x)", apl: (s) => s.replace(L.bench, "    if (a === 198 && b === 18) return true;"), entrou: (s) => /a === 198 && b === 18\) return true/.test(codigo(s)) && !/b === 19/.test(codigo(s)) },
  { id: "S2", nome: "estreitar 192.0.0.0/24 -> só 192.0.0.1/32 (perde .0 e .255)", apl: (s) => s.replace(L.ietf, "    if (a === 192 && b === 0 && c === 0 && +v4[4] === 1) return true;"), entrou: (s) => /\+v4\[4\] === 1/.test(codigo(s)) },
  { id: "S3", nome: "trocar 192.0.2.0/24 por 192.0.3.0/24 (perde TEST-NET-1)", apl: (s) => s.replace(L.tn1, "    if (a === 192 && b === 0 && c === 3) return true;"), entrou: (s) => /b === 0 && c === 3\) return true/.test(codigo(s)) },
  // ── direcção 4: mutantes de SÍTIO DE CHAMADA (a suíte protege o uso, não só a função?) ──
  { id: "C1", nome: "handler: remover a chamada isBlockedHostname (o literal deixa de ser recusado)", apl: (s) => s.replace('  if (isBlockedHostname(u.hostname)) return texto(403, "host not allowed");\n', ""), entrou: (s) => !/isBlockedHostname\(u\.hostname\)/.test(codigo(s)), esperadoVerde: true },
  { id: "C2", nome: "resolverEEscolher: ignorar isBlockedIp no resultado do DNS", apl: (s) => s.replace("(r) => isBlockedIp(r.address) || (r.address.includes(\":\") && temIpv4EmbutidoPorTransicao(r.address))", "(r) => (r.address.includes(\":\") && temIpv4EmbutidoPorTransicao(r.address))"), entrou: (s) => !/isBlockedIp\(r\.address\)/.test(codigo(s)), esperadoVerde: true },
  // ── direcção 5: bloquear tudo ──
  { id: "B1", nome: "«bloquear tudo» no ramo IPv4", apl: (s) => s.replace("    const a = +v4[1], b = +v4[2], c = +v4[3];", "    const a = +v4[1], b = +v4[2], c = +v4[3];\n    if (a >= 1) return true;"), entrou: (s) => /if \(a >= 1\) return true;/.test(codigo(s)) },
];

const snap = readFileSync(GUARD);
const md0 = md5(GUARD);
const base = snap.toString("utf8");
const base0 = suite();
console.log("baseline (com a correccao): suit exit=" + base0.exit + " pass=" + base0.pass + "\n");

let provados = 0, vacuos = [], obsoletos = [], invalidos = [];
for (const m of MUT) {
  let mut, err = null;
  try { mut = m.apl(base); } catch (e) { err = e.message; }
  if (err || mut === base) { console.log(m.id + " ABORTA: mutador invalido (" + (err || "nao alterou") + ")"); invalidos.push(m.id); continue; }
  writeFileSync(GUARD, mut, "utf8");
  let entrou = false, r = { exit: null, falhas: [], pass: "?" };
  try { entrou = m.entrou(readFileSync(GUARD, "utf8")); if (entrou) r = suite(); }
  finally { writeFileSync(GUARD, snap); }
  const red = r.exit !== 0;
  const estado = !entrou ? "MUTANTE NAO ENTROU" : red ? "PROVADO" : (m.esperadoVerde ? "OBSOLETA/VACUO-ESPERADO" : "VACUO — ALARME");
  if (entrou && red) provados++;
  if (entrou && !red && !m.esperadoVerde) vacuos.push(m.id + " " + m.nome);
  if (entrou && !red && m.esperadoVerde) obsoletos.push(m.id + " " + m.nome);
  console.log(m.id.padEnd(4) + m.nome.slice(0, 66).padEnd(68) + "entrou=" + (entrou ? "SIM" : "NAO") + " " + (red ? "RED  " : "VERDE") + " pass=" + String(r.pass).padEnd(4) + " -> " + estado);
  console.log("      matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
}
const restaurou = md5(GUARD) === md0;
const rf = suite();
console.log("\nrestauracao md5-identica: " + restaurou + " | suite apos restaurar: " + (rf.exit === 0 ? "VERDE (" + rf.pass + ")" : "VERMELHO"));
console.log("PROVADOS " + provados + "/" + MUT.length + " | invalidos: " + (invalidos.join(",") || "nenhum"));
console.log("VACUOS (entrou + verde em codigo vivo): " + vacuos.length);
for (const v of vacuos) console.log("   ! " + v);
console.log("verde esperado (sítio de chamada nao coberto): " + obsoletos.length);
for (const v of obsoletos) console.log("   ~ " + v);
process.exitCode = 0;
