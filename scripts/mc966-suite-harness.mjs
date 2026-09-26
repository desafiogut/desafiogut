#!/usr/bin/env node
// MC96.6 — harness de verificação da suíte.
//
// PORQUE EXISTE: no MC96.5 o rename AST foi abortado porque a verificação da suíte era
// ilegível. O grep usado era `^. (tests|pass|fail)` — e `^.` NÃO casa com o `ℹ` multi-byte do
// reporter do node. Devolvia VAZIO, que eu li como VERMELHO e reverti um rename que talvez
// estivesse bom. A reversão ficou parcial e o código ficou inconsistente.
//
// A correcção é uma linha. Mas o essencial é a GUARDA:
//   saída vazia NÃO é "0 falhas" — é "NÃO MEDI".
// Um harness que não distingue "medi e está verde" de "não consegui medir" transforma
// silêncio em aprovação. É o defeito que atravessa toda a série MC96.
//
// Uso: node scripts/mc966-suite-harness.mjs [frontend|backend|ambos]
// Saída: "VERDE <n>/<n>" | "VERMELHO <n> falha(s)" | "NAO_MEDI <razão>"  (exit 0/1/2)

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FE = join(__dirname, "..", "desafio-gut", "frontend");
const FN = join(FE, "netlify", "functions");

// ⚠️ O caractere é `ℹ` (U+2139), MULTI-BYTE. Um `.` no lugar dele casa bytes, não o símbolo,
// e o grep devolve vazio — o que se lê como "sem resumo" e portanto "falhou". Medido.
const RE_RESUMO = /^ℹ (tests|pass|fail|skipped|cancelled) (\d+)$/gm;

function ficheirosFrontend() {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      if (e === "node_modules" || e === "dist" || e === ".vite" || e === "android") continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (e.endsWith(".test.mjs")) out.push(p);
    }
  })(join(FE, "src"));
  return out.sort();
}

/** Corre a suíte e devolve {estado, tests, pass, fail, skipped, motivo}. */
function correr(qual) {
  let cmd, args;
  if (qual === "frontend") {
    const fs_ = ficheirosFrontend();
    if (!fs_.length) return { estado: "NAO_MEDI", motivo: "nenhum ficheiro de teste encontrado em src/" };
    cmd = "node"; args = ["--test", "--test-concurrency=1", ...fs_];
  } else {
    cmd = "node"; args = ["--test", "--experimental-test-module-mocks", "_tests/*.test.mjs"];
  }
  const cwd = qual === "frontend" ? FE : FN;
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: false });
  const saida = `${r.stdout || ""}${r.stderr || ""}`;
  const n = {};
  for (const m of saida.matchAll(RE_RESUMO)) n[m[1]] = Number(m[2]);
  // GUARDA: sem `tests` E sem `pass`, não medi — independentemente do exit code.
  if (n.tests === undefined && n.pass === undefined) {
    const pista = saida.trim().split("\n").slice(-3).join(" | ").slice(0, 200) || "(saída vazia)";
    return { estado: "NAO_MEDI", motivo: `sem resumo do reporter — ${pista}` };
  }
  const o = { tests: n.tests ?? 0, pass: n.pass ?? 0, fail: n.fail ?? 0, skipped: n.skipped ?? 0 };
  if (o.fail > 0) return { estado: "VERMELHO", ...o, motivo: `${o.fail} falha(s)` };
  if (o.pass === 0) return { estado: "NAO_MEDI", ...o, motivo: "resumo presente mas 0 passaram" };
  return { estado: "VERDE", ...o, motivo: `${o.pass}/${o.tests} pass` };
}

const alvo = (process.argv[2] || "ambos").toLowerCase();
const quais = alvo === "ambos" ? ["frontend", "backend"] : [alvo];
let pior = "VERDE";
for (const q of quais) {
  const r = correr(q);
  console.log(`${q}: ${r.estado} ${r.motivo}`);
  if (r.estado === "NAO_MEDI") pior = "NAO_MEDI";          // NAO_MEDI é mais grave que VERMELHO:
  else if (r.estado === "VERMELHO" && pior !== "NAO_MEDI") pior = "VERMELHO"; // um falso VERDE é pior
}
console.log(`VEREDITO: ${pior}`);
process.exit(pior === "VERDE" ? 0 : pior === "VERMELHO" ? 1 : 2);
