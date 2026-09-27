// mc9953-seg1-medir.mjs — MC99.5.3, SEG-1 (MEDIR ANTES DE TOCAR — HARD GATE 1).
//
// Mede, sobre o código REAL do commit base f0749a0:
//   A) isBlockedIp (N1) para as 6 faixas reservadas  -> passa? (esperado: false = PASSA)
//   B) handler REAL (N3) para as 6 faixas            -> 403 (guardou) | 502 (PASSOU a guarda)
//      + controlo positivo VIVO (CDN -> 200 image/*)  «bloquear tudo» passa em todos os negativos
//   C) grafo de módulos: que funções alcançam `ethers` por import ESTÁTICO
//   D) fontes: agrupa por md5 (duplicações reais) e soma bytes
//   E) fundo mobile/desktop: bytes + formato (headers RIFF)
//
// Exit: 0 = mediu | 2 = instrumento inválido (alvo ausente) — nunca "0 falhas" por cegueira.
// Nota: NÃO usa process.exit() (no Windows rebenta o teardown do libuv — skill ssrf-guard-testing).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, "..");
const FN = resolve(REPO, "desafio-gut", "frontend", "netlify", "functions");
const GUARD = resolve(FN, "img-proxy.mjs");
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente em " + GUARD); process.exit(2); }
const M = await import(pathToFileURL(GUARD).href);
if (typeof M.default !== "function" || typeof M.isBlockedIp !== "function") {
  console.error("ABORTA: o guard nao exporta handler/isBlockedIp (instrumento invalido)"); process.exit(2);
}

console.log("REPO  : " + REPO);
console.log("GUARD : " + GUARD);
console.log("md5   : " + createHash("md5").update(readFileSync(GUARD)).digest("hex"));

const BASE = "http://localhost/.netlify/functions/img-proxy";
const comTimeout = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __t: true }), ms))]);
const chamar = async (alvo, ms = 12000) => {
  const r = await comTimeout(M.default(new Request(BASE + "?url=" + encodeURIComponent(alvo))), ms);
  if (r && r.__t) return { st: "TIMEOUT", ct: "", corpo: "" };
  const ct = r.headers.get("content-type") || "";
  let corpo = ""; try { corpo = await comTimeout(r.text(), 4000); } catch { }
  if (corpo && corpo.__t) corpo = "(timeout no corpo)";
  return { st: r.status, ct, corpo: String(corpo).slice(0, 60) };
};

// ───────────────────────────── A) N1 — as 6 faixas reservadas ─────────────────────────────
const FAIXAS = [
  ["192.0.0.0/24",   "192.0.0.1",   "atribuicoes IETF"],
  ["192.88.99.0/24", "192.88.99.1", "6to4 relay anycast"],
  ["192.0.2.0/24",   "192.0.2.1",   "TEST-NET-1 (RFC 5737)"],
  ["198.18.0.0/15",  "198.18.0.1",  "benchmarking (RFC 2544)"],
  ["198.18.0.0/15",  "198.19.255.254","benchmarking (limite alto)"],
  ["198.51.100.0/24","198.51.100.1","TEST-NET-2 (RFC 5737)"],
  ["203.0.113.0/24", "203.0.113.1", "TEST-NET-3 (RFC 5737)"],
];
// controlos da mesma família que DEVEM estar bloqueados (senão a régua está cega)
const DEVEM_BLOQUEAR = [
  ["127.0.0.1", "loopback"], ["10.0.0.1", "privado"], ["169.254.169.254", "metadata cloud"],
  ["172.16.0.1", "privado"], ["192.168.1.1", "privado"], ["100.64.0.1", "CGNAT"], ["224.0.0.1", "multicast"],
];
// controlos que DEVEM passar (público legítimo) — impede a conclusão «bloqueio tudo»
const DEVEM_PASSAR = [["1.1.1.1", "publico"], ["8.8.8.8", "publico"], ["104.17.208.5", "Cloudflare"]];

console.log("\n=== A) N1 — isBlockedIp (a decisão pura da guarda) ===");
const passaFaixas = [];
for (const [cidr, ip, nota] of FAIXAS) {
  const b = M.isBlockedIp(ip);
  if (!b) passaFaixas.push(cidr + " (" + ip + ")");
  console.log("  " + (b ? "BLOQUEIA" : "PASSA   ") + "  " + String(ip).padEnd(18) + String(cidr).padEnd(18) + nota);
}
console.log("  --- controlos (devem BLOQUEAR) ---");
for (const [ip, nota] of DEVEM_BLOQUEAR) console.log("  " + (M.isBlockedIp(ip) ? "BLOQUEIA" : "PASSA !!") + "  " + String(ip).padEnd(18) + nota);
console.log("  --- controlos (devem PASSAR) ---");
for (const [ip, nota] of DEVEM_PASSAR) console.log("  " + (M.isBlockedIp(ip) ? "BLOQUEIA !!" : "PASSA   ") + "  " + String(ip).padEnd(18) + nota);

// ───────────────────────── B) N3 — handler REAL: 403 (guardou) vs 502 (PASSOU) ─────────────────────────
console.log("\n=== B) N3 — handler REAL (403 = guardou | 502 = passou a guarda) ===");
for (const [cidr, ip, nota] of FAIXAS) {
  const r = await chamar("http://" + ip + "/x.png");
  const veredicto = r.st === 403 ? "GUARDOU" : r.st === 502 ? "*** PASSOU A GUARDA ***" : "?? " + r.st;
  console.log("  " + String(r.st).padEnd(8) + veredicto.padEnd(26) + String(ip).padEnd(18) + cidr);
}
console.log("  --- CONTROLO POSITIVO VIVO (se falhar, os 403 acima nao valem nada) ---");
for (const a of ["https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/brands/github.svg",
                 "https://cdn.jsdelivr.net/gh/github/explore@main/topics/nodejs/nodejs.png"]) {
  const r = await chamar(a);
  console.log("  " + (r.st === 200 && /^image\//i.test(r.ct) ? "OK   " : "FALHA") + "  st=" + String(r.st).padEnd(6) + " ct=" + String(r.ct).padEnd(26) + a.slice(0, 60));
}

// ─────────────────────── C) grafo de módulos: quem alcança `ethers` (import ESTÁTICO) ───────────────────────
console.log("\n=== C) quem alcanca `ethers` por import ESTATICO ===");
const cache = new Map();
function alcancaEthers(ficheiro, vistos = new Set()) {
  if (cache.has(ficheiro)) return cache.get(ficheiro);
  if (vistos.has(ficheiro)) return false;
  vistos.add(ficheiro);
  let src; try { src = readFileSync(ficheiro, "utf8"); } catch { return false; }
  const semComentarios = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const re = /(?:^|\n)\s*import\s+(?:[^;]*?\sfrom\s+)?["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(semComentarios)) !== null) {
    const alvo = m[1];
    if (alvo === "ethers") { cache.set(ficheiro, true); return true; }
    if (!alvo.startsWith(".")) continue;
    const p = resolve(dirname(ficheiro), alvo);
    for (const cand of [p, p + ".mjs", p + ".js"]) {
      if (existsSync(cand) && !cand.includes("_tests")) { if (alcancaEthers(cand, vistos)) { cache.set(ficheiro, true); return true; } break; }
    }
  }
  cache.set(ficheiro, false);
  return false;
}
const entradas = readdirSync(FN).filter((f) => f.endsWith(".mjs") && !f.startsWith("_")).sort();
const comEthers = [], semEthers = [];
for (const f of entradas) (alcancaEthers(join(FN, f)) ? comEthers : semEthers).push(f);
console.log("  ALCANCAM ethers (" + comEthers.length + "): " + comEthers.join(", "));
console.log("  NAO alcancam  (" + semEthers.length + "): " + semEthers.join(", "));
console.log("  -- na lista mestra (DEP2-05): lance-relampago, auth-admin, _lib/contract, _lib/consolidacao, _lib/ia-preditiva, _lib/kms-signer, auth-lance, auth-user, _lib/signer");

// ───────────────────────────── D) fontes: duplicações por md5 ─────────────────────────────
console.log("\n=== D) fontes — agrupamento por md5 (dist/fonts) ===");
const DIRF = resolve(REPO, "desafio-gut", "frontend", "dist", "fonts");
if (existsSync(DIRF)) {
  const porMd5 = new Map();
  for (const f of readdirSync(DIRF).filter((x) => x.endsWith(".woff2")).sort()) {
    const b = readFileSync(join(DIRF, f));
    const h = createHash("md5").update(b).digest("hex");
    if (!porMd5.has(h)) porMd5.set(h, { bytes: b.length, ficheiros: [] });
    porMd5.get(h).ficheiros.push(f);
  }
  let total = 0, unico = 0;
  for (const [h, v] of porMd5) {
    total += v.bytes * v.ficheiros.length; unico += v.bytes;
    console.log("  " + h.slice(0, 8) + "  " + String(v.bytes).padStart(7) + " B x " + String(v.ficheiros.length).padStart(2) + " = " + String(v.bytes * v.ficheiros.length).padStart(7) + " B   " + v.ficheiros.join(" "));
  }
  console.log("  TOTAL em disco: " + total + " B   |   unico: " + unico + " B   |   DESPERDICIO: " + (total - unico) + " B");
} else console.log("  (dist/fonts ausente — build nao corrido)");

// ───────────────────────────── E) fundos ─────────────────────────────
console.log("\n=== E) fundos (public/assets/backgrounds) ===");
const DIRB = resolve(REPO, "desafio-gut", "frontend", "public", "assets", "backgrounds");
if (existsSync(DIRB)) {
  for (const f of readdirSync(DIRB).filter((x) => x.endsWith(".webp")).sort()) {
    const b = readFileSync(join(DIRB, f));
    const tag = b.subarray(0, 4).toString("ascii") + "/" + b.subarray(8, 12).toString("ascii");
    console.log("  " + String(b.length).padStart(7) + " B  " + String(f).padEnd(34) + " RIFF=" + tag);
  }
} else console.log("  (pasta ausente)");

console.log("\n=== RESUMO SEG-1 ===");
console.log("  faixas que PASSAM a guarda (N1): " + (passaFaixas.length ? passaFaixas.join(" | ") : "nenhuma"));
process.exitCode = 0;
