// Demonstra que o mutante C2 (suíte VERDE) é um BURACO REAL: resolverEEscolher sem isBlockedIp.
// + artefacto do meu próprio instrumento (isBlockedIp("0.0.0.0/32") vs "0.0.0.0")
// + A/B só-N1 do COMPLEMENTO (sem rede).
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const FN = "C:/Users/Moltbot/Desktop/_VAL-9953/desafio-gut/frontend/netlify/functions";
const GUARD = FN + "/img-proxy.mjs";
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const snap = readFileSync(GUARD); const md0 = md5(GUARD);
const restaurar = () => writeFileSync(GUARD, snap);

console.log("=== 1) artefacto do MEU instrumento ===");
const M = await import(pathToFileURL(GUARD).href + "?v=" + Date.now());
console.log('  isBlockedIp("0.0.0.0/32") = ' + M.isBlockedIp("0.0.0.0/32") + "   <- eu passei uma STRING CIDR (bug meu, nao do guard)");
console.log('  isBlockedIp("0.0.0.0")    = ' + M.isBlockedIp("0.0.0.0") + "   <- o endereco de facto");
console.log('  isBlockedIp("255.255.255.255") = ' + M.isBlockedIp("255.255.255.255"));

console.log("\n=== 2) A/B só-N1 do COMPLEMENTO (sem rede) ===");
const { execFileSync } = await import("node:child_process");
const T = FN + "/_val9953-old-" + process.pid + ".mjs";
writeFileSync(T, execFileSync("git", ["-C", "C:/Users/Moltbot/Desktop/_VAL-9953", "show", "f0749a0:desafio-gut/frontend/netlify/functions/img-proxy.mjs"], { encoding: "utf8" }), "utf8");
const VELHO = await import(pathToFileURL(T).href);
const COMP = ["192.0.1.1", "192.0.3.1", "192.88.98.1", "192.88.100.1", "198.17.255.255", "198.20.0.1", "198.51.99.255", "198.51.101.1", "203.0.112.255", "203.0.114.1", "192.169.0.1"];
let iguais = 0, difs = [];
for (const ip of COMP) {
  const v = VELHO.isBlockedIp(ip), n = M.isBlockedIp(ip);
  if (v === n) iguais++; else difs.push(ip + " antiga=" + v + " nova=" + n);
  console.log("  " + ip.padEnd(18) + "ANTIGA=" + (v ? "BLOQ" : "passa") + "  NOVA=" + (n ? "BLOQ" : "passa") + (v === n ? "" : "   <-- MUDOU"));
}
console.log("  identicos: " + iguais + "/" + COMP.length + "  mudaram: " + (difs.join(",") || "nenhum"));

console.log("\n=== 3) o mutante C2 (suíte VERDE) e um BURACO REAL? ===");
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5e0000000049454e44ae426082", "hex");
let hits = 0;
const isco = createServer((_q, r) => { hits++; r.writeHead(200, { "Content-Type": "image/png" }); r.end(PNG); });
await new Promise((ok, err) => { isco.once("error", err); isco.listen(0, "127.0.0.1", ok); });
const P = isco.address().port;
const BASE = "http://localhost/.netlify/functions/img-proxy";
const chamar = async (h, alvo, ms = 9000) => {
  const r = await Promise.race([h(new Request(BASE + "?url=" + encodeURIComponent(alvo))), new Promise((o) => setTimeout(() => o({ status: "TO" }), ms))]);
  let c = ""; try { c = String(await r.text()).slice(0, 40); } catch { }
  return { st: r.status, c };
};
const alvo = "http://127.0.0.1.nip.io:" + P + "/x.png";
let antes = hits;
const ok0 = await chamar(M.default, alvo);
console.log("  guard INTACTA   st=" + ok0.st + " iscoHits+=" + (hits - antes) + "  (" + ok0.c + ")");
try {
  writeFileSync(GUARD, snap.toString("utf8").replace("(r) => isBlockedIp(r.address) || (r.address.includes(\":\") && temIpv4EmbutidoPorTransicao(r.address))", "(r) => (r.address.includes(\":\") && temIpv4EmbutidoPorTransicao(r.address))"), "utf8");
  const MUT = await import(pathToFileURL(GUARD).href + "?v=" + Date.now());
  antes = hits;
  const r2 = await chamar(MUT.default, alvo);
  console.log("  mutante C2     st=" + r2.st + " iscoHits+=" + (hits - antes) + "  (" + r2.c + ")  <- a suíte fica 8/8 VERDE com isto");
} finally { restaurar(); }
console.log("  restauro md5-identico: " + (md5(GUARD) === md0));
isco.close();
const { unlinkSync } = await import("node:fs");
try { unlinkSync(T); } catch { }
process.exitCode = 0;
