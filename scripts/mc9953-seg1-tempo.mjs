// mc9953-seg1-tempo.mjs — MC99.5.3, SEG-1: A/B PAREADO (HARD GATE 2) do custo de `ethers` no
// arranque do módulo + identificação do codec real dos fundos.
//
// Regra: duas medições separadas não são uma comparação. Aqui ALTERNA os braços na MESMA
// passagem (A,B,A,B,...), N por braço, e reporta mediana + intervalo (min/max) de cada braço.
// Cada medição é um PROCESSO NOVO (o import é cacheado dentro de um processo — mediria 0).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, "..");
const FRONT = resolve(REPO, "desafio-gut", "frontend");
const FNNM = resolve(FRONT, "netlify", "functions", "node_modules");
if (!existsSync(resolve(FRONT, "netlify", "functions", "auth-admin.mjs"))) { console.error("ABORTA: repo inesperado"); process.exit(2); }

const N = Number(process.env.N || 11);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

// ── runner: mede num processo novo o tempo até o import estar resolvido ──
function medirImport(expressao, pastaDeResolucao) {
  const tmp = resolve(AQUI, "_tmp-mc9953-import-" + process.pid + ".mjs");
  writeFileSync(tmp, [
    "const t0 = performance.now();",
    "await import(" + JSON.stringify(expressao) + ");",
    "console.log(performance.now() - t0);",
  ].join("\n"), "utf8");
  try {
    const r = spawnSync(process.execPath, [tmp], { cwd: pastaDeResolucao, encoding: "utf8", timeout: 120000 });
    if (r.status !== 0) return null;
    const v = Number(String(r.stdout).trim().split("\n").pop());
    return Number.isFinite(v) ? v : null;
  } finally { try { unlinkSync(tmp); } catch { } }
}

function abPareado(nomeA, exprA, nomeB, exprB, cwdA, cwdB) {
  const a = [], b = [], pares = [];
  for (let i = 0; i < N; i++) {
    let va, vb;
    if (i % 2 === 0) { va = medirImport(exprA, cwdA); vb = medirImport(exprB, cwdB); }
    else { vb = medirImport(exprB, cwdB); va = medirImport(exprA, cwdA); }
    if (va === null || vb === null) { console.log("  (medição falhou na iteracao " + i + " — braço ignorado)"); continue; }
    a.push(va); b.push(vb); pares.push(va - vb);
  }
  const mA = med(a), mB = med(b), mP = med(pares);
  console.log("  " + nomeA.padEnd(28) + " mediana=" + mA.toFixed(1).padStart(7) + " ms  [" + Math.min(...a).toFixed(0) + "-" + Math.max(...a).toFixed(0) + "]  n=" + a.length);
  console.log("  " + nomeB.padEnd(28) + " mediana=" + mB.toFixed(1).padStart(7) + " ms  [" + Math.min(...b).toFixed(0) + "-" + Math.max(...b).toFixed(0) + "]  n=" + b.length);
  console.log("  DIFERENCA PAREADA (A-B): mediana=" + mP.toFixed(1) + " ms   [" + Math.min(...pares).toFixed(0) + " .. " + Math.max(...pares).toFixed(0) + "]");
  return { mA, mB, mP };
}

console.log("A/B PAREADO — custo de carregar `ethers` (N=" + N + " por braço, alternado, processo novo)");
console.log("node " + process.version + "   cwd de resolucao: " + FNNM);
console.log("\n[1] ethers isolado vs builtin (o custo PURO da dependencia)");
const r1 = abPareado("ethers", "ethers", "node:crypto (controlo)", "node:crypto", FNNM, FNNM);

console.log("\n[2] grafo ESTATICO de uma funcao real");
console.log("    A = _lib/contract.mjs (alcanca ethers)  |  B = _lib/cors.mjs (nao alcanca)");
{
  const A = pathToFileURL(resolve(FRONT, "netlify", "functions", "_lib", "contract.mjs")).href;
  const B = pathToFileURL(resolve(FRONT, "netlify", "functions", "_lib", "cors.mjs")).href;
  if (existsSync(resolve(FRONT, "netlify", "functions", "_lib", "contract.mjs")) && existsSync(resolve(FRONT, "netlify", "functions", "_lib", "cors.mjs")))
    abPareado("_lib/contract.mjs", A, "_lib/cors.mjs", B, FNNM, FNNM);
  else console.log("    (alvos ausentes)");
}

console.log("\n[3] fundos: chunk RIFF real (VP8 legado vs VP8L/VP8X modernos)");
for (const f of ["background-desktop.webp", "background-mobile.webp", "background-mobile-backup.webp"]) {
  const p = resolve(FRONT, "public", "assets", "backgrounds", f);
  if (!existsSync(p)) { console.log("  (ausente) " + f); continue; }
  const b = readFileSync(p);
  console.log("  " + String(b.length).padStart(7) + " B  " + f.padEnd(32) + " tag='" + b.subarray(12, 16).toString("ascii") + "'  riff='" + b.subarray(0, 4).toString("ascii") + "/" + b.subarray(8, 12).toString("ascii") + "'");
}
console.log("\n[4] encoders disponiveis localmente");
const ff = spawnSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" });
if (ff.status === 0) {
  const linhas = String(ff.stdout).split("\n").filter((l) => /webp|avif|libaom|libwebp/i.test(l));
  console.log("  ffmpeg: " + (linhas.length ? linhas.map((l) => l.trim().slice(0, 60)).join(" | ") : "sem webp/avif"));
} else console.log("  ffmpeg AUSENTE");
process.exitCode = 0;
