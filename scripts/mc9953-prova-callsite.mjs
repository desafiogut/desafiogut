// mc9953-prova-callsite.mjs — MC99.5.3, prova de mutação do SÍTIO DE CHAMADA.
//
// PORQUÊ: o validador adversarial deste MC mediu que 2 mutantes que abrem buracos REAIS no handler e
// em `resolverEEscolher` deixavam a suíte **8/8 VERDE** (VÁCUO — verde sobre código vivo). Duas
// asserções novas foram escritas para fechar essa cegueira; este script prova que elas MORDEM.
// Sem ele, as asserções novas seriam mais duas linhas decorativas.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FN = R + "/desafio-gut/frontend/netlify/functions";
const GUARD = FN + "/img-proxy.mjs";
const TESTE = "_tests/img-proxy.test.mjs";
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente"); process.exit(2); }

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const suite = () => {
  const r = spawnSync(process.execPath, ["--test", "--test-concurrency=1", TESTE], { cwd: FN, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  return { exit: r.status, pass: /(?:ℹ|#) pass (\d+)/.exec(out)?.[1] ?? "?", falhas: [...new Set([...out.matchAll(/^\u2716 (.+?) \(\d/gm)].map((m) => m[1].trim()))] };
};

const snap = readFileSync(GUARD);
const md0 = md5(GUARD);
const base = snap.toString("utf8");

// A mutação é feita sobre CÓDIGO (sem comentários) para a verificação de «entrou» — os comentários
// deste ficheiro nomeiam as duas linhas mutadas.
const codigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

const MUT = [
  {
    id: "C1", nome: "TIRAR a chamada à guarda no HANDLER (isBlockedHostname)",
    apl: (s) => s.replace('  if (isBlockedHostname(u.hostname)) return texto(403, "host not allowed");\n', ""),
    entrou: (s) => !/isBlockedHostname\(u\.hostname\)/.test(codigo(s)),
  },
  {
    id: "C2", nome: "TIRAR isBlockedIp da autorização do DNS (resolverEEscolher)",
    apl: (s) => s.replace("(r) => isBlockedIp(r.address) || (r.address.includes(\":\") && temIpv4EmbutidoPorTransicao(r.address))",
      "(r) => (r.address.includes(\":\") && temIpv4EmbutidoPorTransicao(r.address))"),
    entrou: (s) => !/isBlockedIp\(r\.address\)/.test(codigo(s)),
  },
];

const antes = suite();
console.log("baseline (com as asserções novas): " + JSON.stringify(antes) + "\n");
let todas = true; const linhas = [];
for (const m of MUT) {
  const mut = m.apl(base);
  if (mut === base) { console.error("ABORTA " + m.id + ": o mutador nao alterou nada"); process.exit(2); }
  writeFileSync(GUARD, mut, "utf8");
  let entrou = false, r = { exit: null, pass: "?", falhas: [] };
  try { entrou = m.entrou(readFileSync(GUARD, "utf8")); if (entrou) r = suite(); }
  finally { writeFileSync(GUARD, snap); }
  const red = r.exit !== 0;
  const ok = entrou && red;
  todas = todas && ok;
  console.log(m.id + " — " + m.nome);
  console.log("  entrou=" + (entrou ? "SIM" : "NAO") + "  " + (red ? "RED" : "VERDE(!)") + "  pass=" + r.pass + "  -> " + (ok ? "PROVADO (a asserção do sítio de chamada morde)" : "VACUO — ALARME"));
  console.log("  matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
  linhas.push(m.id + " " + m.nome + "\n  entrou=" + entrou + " red=" + red + " pass=" + r.pass + " provado=" + ok + "\n  matou: " + r.falhas.join(" | "));
}
const restaurou = md5(GUARD) === md0;
const rf = suite();
console.log("\nrestauracao md5-identica: " + restaurou + " | suite apos restaurar: " + (rf.exit === 0 ? "VERDE (" + rf.pass + " pass)" : "VERMELHO"));
const ok = todas && restaurou && rf.exit === 0;
console.log("\nMC99.5.3 (call-site) mutacao: " + (ok ? "TODAS PROVADAS + RESTAURACAO EXACTA" : "FALHOU"));
writeFileSync(R + "/_logs/MC99.5.3_PROVA-MUTACAO-CALLSITE.txt",
  linhas.join("\n\n") + "\n\nmd5_restaurado_identico=" + restaurou + "\nsuite_final=" + (rf.exit === 0 ? "VERDE " + rf.pass : "VERMELHO") + "\n", "utf8");
process.exitCode = ok ? 0 : 1;
