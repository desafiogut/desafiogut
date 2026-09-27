// mc99521e-seg1-poc-prefixo.mjs — SEG-1 do MC99.5.2.1e (7.ª geração).
//
// HARD GATE 1: o PoC tem de medir a CADEIA COMPLETA, no HANDLER REAL:
//   (a) nome PREFIXADO do sslip.io -> A público + AAAA privado  (o buraco da 6.ª geração)
//   (b) confirmação de que a guarda ACTUAL passa
//   (c) isco HTTP local em [::1] para medir o handler real (não argumentar)
//
// Discriminador (skill ssrf-guard-testing §2):
//   403 -> a guarda bloqueou
//   502 -> *** a guarda DEIXOU PASSAR *** (só a ligação falhou)
//   200 -> SSRF VIVO (o isco respondeu)
//
// Corre UMA VEZ. Nome único. Não toca no guard (só o importa).
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(AQUI, "..", "desafio-gut", "frontend", "netlify", "functions", "img-proxy.mjs");
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente em " + GUARD); process.exit(2); }
const M = await import("file://" + GUARD.replace(/\\/g, "/"));
if (typeof M.default !== "function" || typeof M.resolvesToBlocked !== "function") {
  console.error("ABORTA: o ficheiro nao exporta o handler/isBlockedHostname"); process.exit(2);
}
console.log("GUARD: " + GUARD);
console.log("md5 alvo: (ver md5sum no relatorio)");

// ── (c) ISCO HTTP local em [::1] — escuta SÓ em ::1 (se responder, veio do AAAA) ──
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5e0000000049454e44ae426082",
  "hex"
);
let atingido = 0;
const isco = createServer((_q, r) => {
  atingido++;
  r.writeHead(200, { "Content-Type": "image/png", "Content-Length": PNG.length });
  r.end(PNG);
});
await new Promise((ok, err) => { isco.once("error", err); isco.listen(0, "::1", ok); });
const PORTA = isco.address().port;
console.log("ISCO: http://[::1]:" + PORTA + "/ (escuta SO em ::1)");

const BASE = "http://localhost/.netlify/functions/img-proxy";
const comTimeout = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __timeout: true }), ms))]);
const chamar = async (alvo) => {
  const req = new Request(BASE + "?url=" + encodeURIComponent(alvo));
  const r = await comTimeout(M.default(req), 8000);
  if (r && r.__timeout) return { st: "TIMEOUT", corpo: "" };
  let corpo = ""; try { corpo = await comTimeout(r.text(), 3000); } catch { }
  if (corpo && corpo.__timeout) corpo = "(timeout no corpo)";
  return { st: r.status, corpo: String(corpo).slice(0, 60) };
};
const classificar = (st) => (st === 403 ? "BLOQUEOU" : st === 502 ? "*** DEIXOU PASSAR ***" : st === 200 ? "*** SSRF VIVO ***" : "?");

// ── (a) o DNS das duas formas que o MC nomeia ──
console.log("\n=== (a) DNS REAL (funcao real do resolvedor) ===");
const NOMES = [
  "1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io",     // A publico + AAAA ISATAP->metadata
  "10-0-0-1.2601--5efe-a9fe-a9fe.sslip.io",    // A privado + AAAA privado  (CONTRASTE)
  "1-1-1-1.--1.sslip.io",                      // A publico + AAAA ::1      (isco)
  "1-1-1-1.fd00-ec2--254.sslip.io",            // A publico + AAAA metadata AWS v6
];
for (const n of NOMES) {
  let r = []; try { r = await lookup(n, { all: true }); } catch (e) { console.log(n + " ERRO " + e.code); continue; }
  const a = r.filter((x) => x.family === 4).map((x) => x.address);
  const aaaa = r.filter((x) => x.family === 6).map((x) => x.address);
  console.log("  " + n.padEnd(40) + " A=" + (a.join(",") || "-") + "  AAAA=" + (aaaa.join(",") || "-"));
}

// ── (b)+(c) o HANDLER REAL ──
console.log("\n=== (b)+(c) HANDLER REAL (await handler(new Request(...))) ===");
const CASOS = [
  { alvo: "http://1-1-1-1.--1.sslip.io:" + PORTA + "/x.png", esperado: "SSRF VIVO (isco ::1)", ataque: true },
  { alvo: "http://1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io:" + PORTA + "/x.png", esperado: "passa a guarda (ligacao falha)", ataque: true },
  { alvo: "http://1-1-1-1.fd00-ec2--254.sslip.io:" + PORTA + "/x.png", esperado: "passa a guarda (ligacao falha)", ataque: true },
  { alvo: "http://10-0-0-1.2601--5efe-a9fe-a9fe.sslip.io:" + PORTA + "/x.png", esperado: "403 (A privado -> bloqueia)", ataque: true },
  { alvo: "http://1-1-1-1.--1.sslip.io:" + PORTA + "/x.png".replace("x.png", "y.png"), esperado: "repeticao (determinismo)", ataque: true },
];
const res = [];
for (const c of CASOS) {
  const host = new URL(c.alvo).hostname;
  const rb = await M.resolvesToBlocked(host);
  const lit = M.isBlockedHostname(host);
  const r = await chamar(c.alvo);
  res.push({ ...c, rb, lit, ...r });
  console.log("  st=" + String(r.st).padEnd(8) + classificar(r.st).padEnd(24) + " resolvesToBlocked=" + rb + " isBlockedHostname=" + lit);
  console.log("      " + c.alvo);
  console.log("      esperado: " + c.esperado + " | corpo: " + r.corpo);
}

console.log("\n=== ISCO atingido: " + atingido + " vez(es) ===");
isco.close();

// ── VEREDITO ──
const vivo = res.filter((x) => x.st === 200).length;
const passouGuarda = res.filter((x) => x.st === 502).length;
const bloqueou = res.filter((x) => x.st === 403).length;
console.log("\n=== RESUMO SEG-1 ===");
console.log("  200 (SSRF VIVO, isco serviu imagem): " + vivo);
console.log("  502 (a guarda DEIXOU PASSAR, ligacao falhou): " + passouGuarda);
console.log("  403 (a guarda bloqueou): " + bloqueou);
if (vivo > 0) {
  console.log("\nVEREDITO SEG-1: *** SSRF VIVO *** o isco em [::1] serviu imagem pelo nome prefixado");
  process.exit(1);
}
if (passouGuarda > 0) {
  console.log("\nVEREDITO SEG-1: *** BURACO *** nome prefixado passou a guarda (ligacao falhou)");
  process.exit(1);
}
if (bloqueou === res.length) {
  console.log("\nVEREDITO SEG-1: FECHADO — os " + res.length + " casos deram 403 e o isco NUNCA foi alcancado");
  process.exit(0);
}
console.log("\nVEREDITO SEG-1: AMBIGUO (" + res.length + " casos, contagens acima) — PARAR e investigar");
process.exit(2);
