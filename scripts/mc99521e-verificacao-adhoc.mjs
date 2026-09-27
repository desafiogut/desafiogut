// mc99521e-verificacao-adhoc.mjs — SEG4 do MC99.5.2.1e. Corre UMA VEZ. Implementação INDEPENDENTE
// do PoC de propósito: se copiasse o PoC, mediria o PoC, não a guarda.
//
// Verifica, de fora: (1) o âmbito do commit (nenhuma área fora do autorizado); (2) o guard em
// disco (hash + presença das decisões da 7.ª geração); (3) o HANDLER REAL contra a lista de
// payloads; (4) a suíte; (5) que o verificador CONSEGUE falhar (controlo de sanidade do instrumento).
import { spawnSync, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const R = resolve(AQUI, "..");
const FE = R + "/desafio-gut/frontend";
const GUARD = FE + "/netlify/functions/img-proxy.mjs";
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

const falhas = [], notas = [];
const check = (ok, msg) => { console.log("  " + (ok ? "OK   " : "FALHA") + " " + msg); if (!ok) falhas.push(msg); return ok; };

// ── controlo de sanidade do PRÓPRIO verificador: tem de saber dizer NÃO ──
console.log("=== 0. controlo de sanidade do instrumento (tem de conseguir FALHAR) ===");
const sanidade = [];
const assertFalso = (cond, msg) => { if (!cond) sanidade.push(msg); };
assertFalso(false, "esperado");                                  // um falso explícito -> tem de recolher
check(sanidade.length === 1, "o verificador recolhe uma condicao falsa (sabe falhar)");

// ── 1. âmbito do commit ──
console.log("\n=== 1. ambito do commit (R1: zero alteracao fora do autorizado) ===");
let scopeOk = true;
try {
  const base = execFileSync("git", ["-C", R, "rev-parse", "HEAD~1"], { encoding: "utf8" }).trim();
  const ficheiros = execFileSync("git", ["-C", R, "diff", "--name-only", base, "HEAD"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const AUTORIZADOS = [
    /^desafio-gut\/frontend\/netlify\/functions\/img-proxy\.mjs$/,
    /^desafio-gut\/frontend\/netlify\/functions\/package(-lock)?\.json$/,
    /^desafio-gut\/frontend\/src\/__tests__\/mc9952-seguranca-gate\.test\.mjs$/,
    /^scripts\/mc9952-poc-ssrf\.mjs$/, /^scripts\/mc9952-prova-mutacao\.mjs$/,
    /^scripts\/mc99521e-.*\.mjs$/, /^_logs\/.*$/,
    /^CLAUDE\.md$/,   // R14 obriga a actualizar o CLAUDE.md antes do commit final
  ];
  const PROIBIDOS = [/^desafio-gut\/contracts\//, /^desafio-gut\/frontend\/src\/(?!__tests__)/, /^supabase\//, /^netlify\.toml$/, /^desafio-gut\/frontend\/vite\.config/];
  console.log("  HEAD=" + execFileSync("git", ["-C", R, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() + "  base=" + base);
  console.log("  alterados: " + ficheiros.length);
  for (const f of ficheiros) console.log("    " + f);
  const fora = ficheiros.filter((f) => !AUTORIZADOS.some((r) => r.test(f)));
  const proib = ficheiros.filter((f) => PROIBIDOS.some((r) => r.test(f)));
  scopeOk = check(fora.length === 0, "nenhum ficheiro fora dos autorizados" + (fora.length ? " -> " + fora.join(", ") : ""));
  scopeOk = check(proib.length === 0, "nenhuma area proibida tocada (contrato/React/design/gate legal/Supabase)" + (proib.length ? " -> " + proib.join(", ") : "")) && scopeOk;
} catch (e) { check(false, "nao consegui medir o ambito: " + e.message); scopeOk = false; }

// ── 2. o guard em disco ──
console.log("\n=== 2. o guard em disco (as decisoes da 7.ª geracao estao la?) ===");
if (!existsSync(GUARD)) { console.log("ABORTA: guard ausente"); process.exit(2); }
console.log("  md5 do guard: " + md5(GUARD));
const src = readFileSync(GUARD, "utf8");
check(/import \{ Agent \} from "undici";/.test(src), "importa o Agent do undici");
check(/connect: \{ lookup: lookupValidado \}/.test(src), "declara o connect.lookup (a decisao na ligacao)");
check(/if \(bloqueado\) return callback\(new Error\(HOST_BLOQUEADO\)\)/.test(src), "RECUSA na ligacao (nao e informativo)");
check(/dispatcher: agenteValidado/.test(src), "o fetch leva o dispatcher validado");
check(!/await resolvesToBlocked\(u\.hostname\)\) return texto\(403/.test(src), "NAO ha pre-check de DNS separado (uma so resolucao)");
check(/he\[5\] === 0x5efe/.test(src), "autoriza IPv6 por marcador de transicao (ISATAP)");
check(/isBlockedHostname/.test(src) && src.includes('if (h.includes(":")) return true;'), "a 5.ª geracao (literais IPv6) intacta");
check(/"undici": "\^6/.test(readFileSync(FE + "/netlify/functions/package.json", "utf8")), "undici DECLARADO no manifesto das functions");

// ── 3. o HANDLER REAL ──
console.log("\n=== 3. handler REAL: payloads e controlos positivos ===");
const M = await import(pathToFileURL(GUARD).href);
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5e0000000049454e44ae426082", "hex");
let hits = 0;
const isco = createServer((_q, r) => { hits++; r.writeHead(200, { "Content-Type": "image/png" }); r.end(PNG); });
await new Promise((ok, err) => { isco.once("error", err); isco.listen(0, "::1", ok); });
const P = isco.address().port;
const B = "http://localhost/.netlify/functions/img-proxy";
const comTO = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __t: true }), ms))]);
const chamar = async (alvo) => {
  const r = await comTO(M.default(new Request(B + "?url=" + encodeURIComponent(alvo))), 12000);
  if (r && r.__t) return { st: "TIMEOUT", ct: "", corpo: "" };
  let ct = r.headers.get("content-type") || "", corpo = "";
  try { corpo = await comTO(r.text(), 4000); } catch { }
  return { st: r.status, ct, corpo: String(corpo).slice(0, 40) };
};
// ⚠️ Cada payload traz o estado ESPERADO. `file:`/`gopher:` são recusados mais cedo, no teste de
// esquema, com 400 do próprio handler — exigir 403 deles era a minha asserção a ser mais estreita
// que o alvo (defeito do verificador, não da guarda). Ambos são BLOQUEIO; só o código difere.
const MAL = [
  ["nome prefixado A publico + AAAA ::1", "http://1-1-1-1.--1.sslip.io:" + P + "/x.png", 403],
  ["nome prefixado + AAAA ISATAP", "http://1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io:" + P + "/x.png", 403],
  ["nome prefixado + AAAA 6to4", "http://1-1-1-1.2002-a9fe-a9fe--1.sslip.io:" + P + "/x.png", 403],
  ["nome prefixado + AAAA Teredo", "http://1-1-1-1.2001-0-0-0-0-0-80ff-fffe.sslip.io:" + P + "/x.png", 403],
  ["sslip simples so AAAA", "http://--1.sslip.io:" + P + "/x.png", 403],
  ["nip.io A 127.0.0.1", "http://127.0.0.1.nip.io:" + P + "/x.png", 403],
  ["literal IPv6 loopback", "http://[::1]/", 403],
  ["literal IPv6 publico", "http://[2606:4700::1111]/", 403],
  ["IPv4 metadata", "http://169.254.169.254/latest/meta-data/", 403],
  ["esquema file:", "file:///etc/passwd", 400],
  ["esquema gopher:", "gopher://127.0.0.1:11211/_stats", 400],
  ["esquema ftp:", "ftp://127.0.0.1/x.png", 400],
];
for (const [nome, alvo, esperado] of MAL) {
  const r = await chamar(alvo);
  check(r.st === esperado, nome + " -> " + r.st + " (esperado " + esperado + ")" + (r.corpo ? " (" + r.corpo + ")" : ""));
}
const POS = ["https://i.imgur.com/removed.png", "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/brands/github.svg"];
for (const alvo of POS) {
  const r = await chamar(alvo);
  check(r.st === 200 && /^image\//i.test(r.ct), "LEGITIMO HTTPS -> " + r.st + " " + r.ct + "  " + alvo);
}
check(hits === 0, "o isco em [::1] NUNCA foi alcancado pelos payloads maliciosos (toques=" + hits + ")");
isco.close();

// ── 4. a suíte ──
console.log("\n=== 4. suites (harness de 3 estados) ===");
const h = spawnSync("node", [R + "/scripts/mc966-suite-harness.mjs", "ambos"], { encoding: "utf8", cwd: R, maxBuffer: 64 * 1024 * 1024 });
const saida = ((h.stdout || "") + (h.stderr || "")).trim();
console.log("  " + saida.split("\n").join("\n  "));
check(/^frontend: VERDE/m.test(saida) && /^backend: VERDE/m.test(saida), "frontend e backend VERDE (uma suite que nao corre nao e uma suite verde)");

console.log("\n=== RESUMO SEG4 ===");
console.log("  falhas: " + falhas.length);
for (const f of falhas) console.log("    - " + f);
console.log(falhas.length ? "\nVEREDITO SEG4: FALHOU" : "\nVEREDITO SEG4: TUDO VERIFICADO");
process.exit(falhas.length ? 1 : 0);
