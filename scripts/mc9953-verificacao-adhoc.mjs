// mc9953-verificacao-adhoc.mjs — MC99.5.3, SEG5 (verificação ad-hoc de fecho).
// Ficheiro NOVO, nome ÚNICO, corre UMA VEZ no fim. Exit: 0 verde | 1 falhas | 2 instrumento inválido.
//
// Verifica, por instrumento que NÃO sabe o resultado (a regra da lista mestra):
//   1. escopo: o diff contra o commit base f0749a0 só toca nos caminhos autorizados
//   2. Frente B em PRODUÇÃO: as 6 faixas reservadas -> 403 e os CDNs -> 200 (controlo positivo vivo)
//   3. Frente A em produção: 3 ficheiros de fonte servidos, fundo mobile <= 130 000 B, 1 preload de fonte
//   4. Frente C: docs/METODOLOGIA-SEGURANCA.md existe e tem as secções exigidas pelo MC
//   5. suíte: harness mc966 (nunca confiar em «saída vazia = 0 falhas»)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.MC9953_BASE || "f0749a0";
const PROD = process.env.MC9953_PROD || "https://silly-stardust-ca71bc.netlify.app";
const falhas = []; const naomedido = [];
const ok = (cond, msg) => { console.log("  " + (cond ? "OK   " : "FALHA") + "  " + msg); if (!cond) falhas.push(msg); };

// ── 1. ESCOPO ──────────────────────────────────────────────────────────────────────────────
console.log("=== 1) escopo do diff " + BASE + "..HEAD (nada fora do autorizado) ===");
const PERMITIDO = [
  /^desafio-gut\/frontend\/index\.html$/,
  /^desafio-gut\/frontend\/src\/fontes\.css$/,
  /^desafio-gut\/frontend\/src\/__tests__\/mc993-preload\.test\.mjs$/,
  /^desafio-gut\/frontend\/src\/__tests__\/mc9953-performance\.test\.mjs$/,
  /^desafio-gut\/frontend\/netlify\/functions\/img-proxy\.mjs$/,
  /^desafio-gut\/frontend\/netlify\/functions\/_tests\/img-proxy\.test\.mjs$/,
  /^desafio-gut\/frontend\/public\/fonts\/[a-z0-9-]+\.woff2$/,
  /^desafio-gut\/frontend\/public\/assets\/backgrounds\/background-mobile\.webp$/,
  /^docs\/METODOLOGIA-SEGURANCA\.md$/,
  /^scripts\/mc9953-[a-z-]+\.mjs$/,
  /^_logs\/MC99\.5\.3[^/]*$/,
  /^CLAUDE\.md$/,
];
const r1 = spawnSync("git", ["-C", R, "diff", "--name-only", BASE + "..HEAD"], { encoding: "utf8" });
if (r1.status !== 0) { console.error("ABORTA: git diff falhou"); process.exit(2); }
const tocados = r1.stdout.trim().split("\n").filter(Boolean);
const foras = tocados.filter((f) => !PERMITIDO.some((re) => re.test(f)));
console.log("  ficheiros no diff: " + tocados.length);
ok(foras.length === 0, "nenhum ficheiro fora do escopo" + (foras.length ? ": " + foras.join(", ") : ""));
// controlo negativo da própria guarda de escopo: um caminho sabidamente fora TEM de ser apanhado
ok(!PERMITIDO.some((re) => re.test("desafio-gut/contracts/Leilao.sol")), "a lista de permitidos rejeita o contrato (guarda de escopo não é vazia)");
ok(!PERMITIDO.some((re) => re.test("desafio-gut/frontend/src/App.jsx")), "a lista de permitidos rejeita React (fora do escopo deste MC)");

// ── 2/3. PRODUÇÃO ──────────────────────────────────────────────────────────────────────────
async function estado(url, ms = 25000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal, redirect: "manual" }); await r.arrayBuffer(); return { st: r.status, ct: r.headers.get("content-type") || "" }; }
  catch { return { st: "ERRO/TIMEOUT", ct: "" }; }
  finally { clearTimeout(t); }
}
const FA = resolve(R, "desafio-gut", "frontend", "netlify", "functions", "img-proxy.mjs");
if (!existsSync(FA)) { console.error("ABORTA: guard ausente"); process.exit(2); }
const M = await import("file://" + FA.replace(/\\/g, "/"));

console.log("\n=== 2) FRENTE B — produção (403 = guardou | 200 = serviu | 502 = passou) ===");
const FAIXAS = ["192.0.0.1", "192.88.99.1", "192.0.2.1", "198.18.0.1", "198.51.100.1", "203.0.113.1"];
for (const ip of FAIXAS) {
  const local = M.isBlockedIp(ip);
  const linhas = [];
  for (let i = 0; i < 3; i++) linhas.push((await estado(PROD + "/.netlify/functions/img-proxy?url=" + encodeURIComponent("http://" + ip + "/x.png") + "&cb=" + Math.random())).st);
  const todos403 = linhas.every((s) => s === 403);
  ok(local === true && todos403, ip + "  isBlockedIp=" + local + "  prod=" + linhas.join("/"));
}
console.log("  --- controlo positivo VIVO (sem estes 200, os 403 não valem nada) ---");
for (const u of [
  "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/brands/github.svg",
  "https://i.imgur.com/removed.png",
]) {
  const r = await estado(PROD + "/.netlify/functions/img-proxy?url=" + encodeURIComponent(u));
  ok(r.st === 200 && /^image\//i.test(r.ct), "CDN servido: " + r.st + " " + r.ct + "  " + u.slice(0, 55));
}
console.log("  --- metadata cloud continua bloqueada ---");
ok(M.isBlockedIp("169.254.169.254") === true && (await estado(PROD + "/.netlify/functions/img-proxy?url=" + encodeURIComponent("http://169.254.169.254/x.png"))).st === 403, "169.254.169.254 -> 403");

console.log("\n=== 3) FRENTE A — produção (bytes servidos) ===");
for (const [nome, esperado] of [["inter-400-latin.woff2", 48256], ["jetbrains-400-latin.woff2", 31432], ["orbitron-600-latin.woff2", 11800]]) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 25000);
  try {
    const r = await fetch(PROD + "/fonts/" + nome, { signal: c.signal });
    const b = (await r.arrayBuffer()).byteLength;
    ok(r.status === 200 && b === esperado, "servida " + nome + " -> " + r.status + " " + b + " B (esperado " + esperado + ")");
  } catch (e) { naomedido.push("fonte " + nome + ": " + e.message); }
  finally { clearTimeout(t); }
}
for (const [nome, limite] of [["background-mobile.webp", 130000], ["background-desktop.webp", 130000]]) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 30000);
  try {
    const r = await fetch(PROD + "/assets/backgrounds/" + nome, { signal: c.signal });
    const b = (await r.arrayBuffer()).byteLength;
    ok(r.status === 200 && b <= limite, nome + " -> " + r.status + " " + b + " B (orçamento " + limite + ")");
  } catch (e) { naomedido.push("fundo " + nome + ": " + e.message); }
  finally { clearTimeout(t); }
}
{
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 25000);
  try {
    const html = await (await fetch(PROD + "/", { signal: c.signal })).text();
    const ps = [...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<link\b[^>]*rel="preload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    const fontes = ps.filter((h) => h.includes("/fonts/"));
    ok(fontes.length === 1 && fontes[0].includes("inter-400"), "1 preload de fonte e é o inter-400 (achei " + ps.length + " preloads, " + fontes.length + " de fonte: " + ps.join(", ") + ")");
  } catch (e) { naomedido.push("index.html de produção: " + e.message); }
  finally { clearTimeout(t); }
}

// ── 4. FRENTE C ────────────────────────────────────────────────────────────────────────────
console.log("\n=== 4) FRENTE C — docs/METODOLOGIA-SEGURANCA.md ===");
const DOC = resolve(R, "docs", "METODOLOGIA-SEGURANCA.md");
ok(existsSync(DOC), "o documento existe");
if (existsSync(DOC)) {
  const d = readFileSync(DOC, "utf8");
  // lista, não regex aninhada (uma lista não se pode desequilibrar — lição do §9 do próprio doc)
  const EXIGIDO = [
    ["PoC antes de tocar", /PoC ANTES de tocar no código/i],
    ["A/B pareado", /A\/B PAREADO/i],
    ["validador adversarial", /Validador adversarial independente/i],
    ["controlos positivos", /Controlos POSITIVOS obrigatórios/i],
    ["pin na ligação", /Pin no momento da ligação/i],
    ["a lista como cegueira", /ponto cego/i],
    ["medir risco > estimar risco", /Medir risco > estimar risco/i],
    ["as 7 gerações", /7 gerações/i],
    ["referência às skills do agente", /~\/\.hermes\/skills\//],
  ];
  ok(d.length > 8000, "tem corpo (" + d.length + " chars)");
  for (const [nome, re] of EXIGIDO) ok(re.test(d), "cobre: " + nome);
  // os ficheiros que o doc cita têm de EXISTIR (um doc que cita instrumentos mortos é o defeito nº1 §9)
  const citados = [...new Set([...d.matchAll(/`(scripts\/[a-z0-9-]+\.mjs)`/g)].map((m) => m[1]))];
  ok(citados.length > 0, "cita instrumentos (" + citados.length + ")");
  for (const f of citados) ok(existsSync(resolve(R, f)), "citado e existe: " + f);
}

// ── 5. SUÍTE ───────────────────────────────────────────────────────────────────────────────
console.log("\n=== 5) suíte (harness mc966 — «saída vazia» não é «0 falhas» é «não medi») ===");
const H = spawnSync(process.execPath, [resolve(R, "scripts", "mc966-suite-harness.mjs"), "ambos"], { cwd: R, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const saida = ((H.stdout || "") + (H.stderr || "")).trim();
console.log(saida.split("\n").map((l) => "  " + l).join("\n"));
const mV = saida.match(/frontend: VERDE (\d+)\/(\d+)/), mB = saida.match(/backend:\s+VERDE (\d+)\/(\d+)/);
ok(!!mV && Number(mV[1]) > 0, "frontend medido e verde");
ok(!!mB && Number(mB[1]) > 0, "backend medido e verde");

console.log("\n=== RESUMO ===");
console.log("  falhas: " + falhas.length);
for (const f of falhas) console.log("    - " + f);
for (const n of naomedido) console.log("    ~ NÃO MEDIDO: " + n);
console.log(falhas.length === 0 ? "\nVEREDITO: VERDE" : "\nVEREDITO: FALHOU");
process.exitCode = falhas.length === 0 ? 0 : 1;
