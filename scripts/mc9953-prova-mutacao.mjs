// mc9953-prova-mutacao.mjs — MC99.5.3, prova de MUTAÇÃO da Frente B (Opção A).
// HARD GATE 7: cada mutante tem de ENTRAR (lido do ficheiro ANTES de medir) e dar RED.
// R16: todo o teste que nasce verde precisa de mutação.
//
// Três estados (skill ssrf-guard-testing §10):
//   PROVADO  mutante entrou + suíte RED            -> a guarda morde
//   OBSOLETA mutante entrou + verde ESPERADO       -> código inalcançável (documentar)
//   VACUO    mutante entrou + verde em código VIVO -> alarme real
//
// Restauração por snapshot binário + md5 (o ficheiro tem LF; nunca reescrever com CRLF).
// ⚠️ `entrou` mede sobre CÓDIGO (comentários removidos): o comentário da correcção nomeia as
// faixas — 14× nesta série um mutante «não entrou» por isso.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FN = R + "/desafio-gut/frontend/netlify/functions";
const GUARD = FN + "/img-proxy.mjs";
const TESTE = "_tests/img-proxy.test.mjs";
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente em " + GUARD); process.exit(2); }

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const codigo = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

const suite = () => {
  const r = spawnSync(process.execPath, ["--test", "--test-concurrency=1", TESTE], { cwd: FN, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  return { exit: r.status, falhas: [...new Set([...out.matchAll(/^\u2716 (.+?) \(\d/gm)].map((m) => m[1].trim()))], passou: /# pass (\d+)/.exec(out)?.[1] ?? /pass (\d+)/.exec(out)?.[1] ?? "?" };
};

const snap = readFileSync(GUARD);
const md0 = md5(GUARD);
const base = snap.toString("utf8");
const baseMd = (s) => createHash("md5").update(s).digest("hex");
const baseCod = codigo(base);

const MUT = [
  { id: "M1", nome: "repor 192.0.0.0/24 (atribuicoes IETF) ao estado anterior",
    apl: (s) => s.replace("    if (a === 192 && b === 0 && c === 0) return true;            // 192.0.0.0/24   atribuições IETF\n", ""),
    entrou: (s) => !/a === 192 && b === 0 && c === 0/.test(codigo(s)) },
  { id: "M2", nome: "repor 198.18.0.0/15 (benchmarking) ao estado anterior",
    apl: (s) => s.replace("    if (a === 198 && (b === 18 || b === 19)) return true;        // 198.18.0.0/15  benchmarking (RFC 2544)\n", ""),
    entrou: (s) => !/b === 18 \|\| b === 19/.test(codigo(s)) },
  { id: "M3", nome: "repor 203.0.113.0/24 (TEST-NET-3) ao estado anterior",
    apl: (s) => s.replace("    if (a === 203 && b === 0 && c === 113) return true;          // 203.0.113.0/24 TEST-NET-3 (RFC 5737)\n", ""),
    entrou: (s) => !/a === 203 && b === 0 && c === 113/.test(codigo(s)) },
  // ── MUTANTE DA DIRECÇÃO OPOSTA: alargar DEMAIS (o defeito clássico desta família de guardas) ──
  { id: "M4", nome: "alargar demais: 192.0.0.0/24 sem o `c` (passa a bloquear 192.0.1.x e 192.0.3.x)",
    apl: (s) => s.replace("if (a === 192 && b === 0 && c === 0) return true;", "if (a === 192 && b === 0) return true;"),
    entrou: (s) => /a === 192 && b === 0\) return true/.test(codigo(s)) && !/a === 192 && b === 0 && c === 0/.test(codigo(s)) },
  { id: "M5", nome: "«bloquear tudo»: devolver true para qualquer IPv4",
    apl: (s) => s.replace("    const a = +v4[1], b = +v4[2], c = +v4[3];", "    const a = +v4[1], b = +v4[2], c = +v4[3];\n    if (a >= 1) return true;"),
    entrou: (s) => /if \(a >= 1\) return true;/.test(codigo(s)) },
];

const ESPERADO_VERDE = new Set([]); // nenhum mutante desta frente deve ficar verde
let todas = true; const linhas = [];
const base0 = suite();
console.log("baseline (com a correccao): " + JSON.stringify(base0) + "\n");

for (const m of MUT) {
  const mut = m.apl(base);
  if (mut === base) { console.error("ABORTA " + m.id + ": o mutador nao alterou o ficheiro (mutante invalido)"); process.exit(2); }
  writeFileSync(GUARD, mut, "utf8");
  let entrou = false, r = { exit: null, falhas: [], passou: "?" };
  try {
    entrou = m.entrou(readFileSync(GUARD, "utf8"));
    if (entrou) r = suite();
  } finally {
    writeFileSync(GUARD, snap);                    // restauro SEMPRE, mesmo se rebentar
  }
  const red = r.exit !== 0;
  const estado = !entrou ? "MUTANTE NAO ENTROU (invalido)" : red ? "PROVADO" : (ESPERADO_VERDE.has(m.id) ? "OBSOLETA (verde esperado)" : "VACUO — ALARME");
  const ok = entrou && red;
  todas = todas && ok;
  console.log(m.id + " — " + m.nome);
  console.log("  entrou=" + (entrou ? "SIM" : "NAO") + "  " + (red ? "RED" : "VERDE(!)") + "  pass=" + r.passou + "  -> " + estado);
  console.log("  matou: " + (r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"));
  linhas.push(m.id + " " + m.nome + "\n  entrou=" + entrou + " red=" + red + " estado=" + estado + "\n  matou: " + r.falhas.join(" | "));
}

const restaurou = md5(GUARD) === md0;
const rf = suite();
console.log("\nrestauracao md5-identica: " + restaurou + " | suite apos restaurar: " + (rf.exit === 0 ? "VERDE (" + rf.passou + " pass)" : "VERMELHO"));
const ok = todas && restaurou && rf.exit === 0;
console.log("\nMC99.5.3 (Frente B) mutacao: " + (ok ? "TODAS PROVADAS + RESTAURACAO EXACTA" : "FALHOU"));
console.log("  (md5 base do guard: " + md0 + ")");
writeFileSync(R + "/_logs/MC99.5.3_PROVA-MUTACAO-FRENTE-B.txt",
  linhas.join("\n\n") + "\n\nmd5_com_correccao=" + md0 + "\nmd5_restaurado_identico=" + restaurou + "\nsuite_final=" + (rf.exit === 0 ? "VERDE " + rf.passou : "VERMELHO") + "\n", "utf8");
process.exitCode = ok ? 0 : 1;
