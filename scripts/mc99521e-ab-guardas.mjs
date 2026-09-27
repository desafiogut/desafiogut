// mc99521e-ab-guardas.mjs — A/B PAREADO: a MESMA sonda contra a guarda ANTIGA (df0439a) e a NOVA.
//
// Porquê: um 403 novo só é REGRESSÃO se a guarda antiga não o dava. Sem os dois lados na mesma
// passagem, cada número é interpretado à vontade. Este instrumento corre os dois handlers com a
// mesma lista, no mesmo processo, e imprime a tabela OLD|NEW — a única forma honesta de atribuir
// uma diferença à mudança.
//
// A guarda antiga é extraída do git (`git show <base>:<guard>`) para um ficheiro TEMPORÁRIO com
// nome único DENTRO da pasta das functions (para o import relativo `./_lib/cors.mjs` resolver) e
// é APAGADA no `finally` — mesmo se algo rebentar.
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const GUARD = resolve(RAIZ, "desafio-gut", "frontend", "netlify", "functions", "img-proxy.mjs");
const DIR_FN = dirname(GUARD);
const BASE = process.argv[2] || "df0439a";
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente"); process.exit(2); }

const TEMP = resolve(DIR_FN, "_mc99521e-ab-old-" + process.pid + ".mjs");
let limpo = false;
const limpar = () => { if (!limpo) { try { unlinkSync(TEMP); console.log("\n(limpeza: removido " + TEMP + ")"); } catch { } limpo = true; } };
process.on("exit", limpar);

try {
  const antigo = execFileSync("git", ["-C", RAIZ, "show", BASE + ":desafio-gut/frontend/netlify/functions/img-proxy.mjs"], { encoding: "utf8" });
  writeFileSync(TEMP, antigo, "utf8");
  console.log("guarda ANTIGA: " + BASE + " -> " + TEMP + " (" + antigo.length + " bytes)");
} catch (e) { console.error("ABORTA: nao consegui extrair " + BASE + " do git: " + e.message); process.exit(2); }

const NOVO = await import(pathToFileURL(GUARD).href);
const VELHO = await import(pathToFileURL(TEMP).href);
if (typeof VELHO.default !== "function" || typeof NOVO.default !== "function") {
  console.error("ABORTA: um dos handlers nao carregou (instrumento invalido)"); limpar(); process.exit(2);
}

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5e0000000049454e44ae426082", "hex");
let hits = 0;
const isco = createServer((_q, r) => { hits++; r.writeHead(200, { "Content-Type": "image/png" }); r.end(PNG); });
await new Promise((ok, err) => { isco.once("error", err); isco.listen(0, "::1", ok); });
const P = isco.address().port;

const B = "http://localhost/.netlify/functions/img-proxy";
const comTO = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __t: true }), ms))]);
const chamar = async (h, alvo, ms = 10000) => {
  const r = await comTO(h(new Request(B + "?url=" + encodeURIComponent(alvo))), ms);
  if (r && r.__t) return "TIMEOUT";
  return String(r.status);
};

const CASOS = [
  ["nome prefixado: A publico + AAAA ::1     (era SSRF VIVO)", "http://1-1-1-1.--1.sslip.io:" + P + "/x.png"],
  ["nome prefixado: A publico + AAAA ISATAP", "http://1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io:" + P + "/x.png"],
  ["nome prefixado: A publico + AAAA metadata AWS", "http://1-1-1-1.fd00-ec2--254.sslip.io:" + P + "/x.png"],
  ["nome prefixado: A publico + AAAA ULA", "http://1-1-1-1.fd00--1.sslip.io:" + P + "/x.png"],
  ["nome prefixado: A privado + AAAA ISATAP", "http://10-0-0-1.2601--5efe-a9fe-a9fe.sslip.io:" + P + "/x.png"],
  ["sslip simples: so AAAA ::1", "http://--1.sslip.io:" + P + "/x.png"],
  ["sslip simples: so AAAA ISATAP", "http://2601--5efe-a9fe-a9fe.sslip.io:" + P + "/x.png"],
  ["nip.io: A 127.0.0.1", "http://127.0.0.1.nip.io:" + P + "/x.png"],
  ["literal IPv6 loopback", "http://[::1]/"],
  ["literal IPv6 mapped", "http://[::ffff:127.0.0.1]/"],
  ["literal IPv6 publico (recusado por desenho)", "http://[2606:4700::1111]/"],
  ["IPv4 metadata", "http://169.254.169.254/latest/meta-data/"],
  ["IPv4 decimal", "http://2130706433/"],
  ["IPv4 hex", "http://0x7f.0.0.1/"],
  ["LEGITIMO dual-stack (CDN)", "https://cdn.jsdelivr.net/gh/github/explore@main/topics/nodejs/nodejs.png"],
  ["LEGITIMO dual-stack (imgur)", "https://i.imgur.com/removed.png"],
  ["LEGITIMO que existe", "https://exemplo.com/a.jpg"],
  ["LEGITIMO que NAO existe (NXDOMAIN)", "http://a.b.c.d.com.br/img.png"],
  ["LEGITIMO que NAO existe 2 (NXDOMAIN)", "https://images.unsplash.com/x.jpg"],
];

console.log("\n" + "CASO".padEnd(52) + "ANTIGA  NOVA    (403=bloqueou | 502=passou a guarda | 200=serviu)");
console.log("-".repeat(100));
const linhas = [];
for (const [nome, alvo] of CASOS) {
  const v = await chamar(VELHO.default, alvo);
  const n = await chamar(NOVO.default, alvo);
  linhas.push({ nome, alvo, v, n });
  const marca = v !== n ? "  <-- MUDOU" : "";
  console.log(nome.padEnd(52) + String(v).padEnd(8) + String(n).padEnd(8) + marca);
}
console.log("\nISCO alcancado: " + hits + " (so a guarda antiga pode ter chegado; a nova tem de dar 0)");
console.log("\n=== DIFF (o que a 7.ª geração mudou de facto) ===");
for (const l of linhas.filter((x) => x.v !== x.n)) console.log("  " + l.nome + ":  ANTIGA=" + l.v + "  NOVA=" + l.n);
isco.close();
limpar();
