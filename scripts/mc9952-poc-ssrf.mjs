// mc9952-poc-ssrf.mjs — PoC do SSRF contra a FUNÇÃO REAL de img-proxy.mjs.
//
// ⚠️ MC99.5.2.1b — ESTE INSTRUMENTO ESTEVE MORTO E EU CITEI-O TRÊS VEZES.
// A 1.ª versão fazia `import { isBlockedHostname } from "./img-proxy.mjs"`, que resolvia enquanto o
// ficheiro vivia em netlify/functions/ (onde eu o corria). Ao copiá-lo para scripts/ o import
// apontou para o vazio (ERR_MODULE_NOT_FOUND), eu NUNCA o voltei a correr, e continuei a citar
// «34 payloads, 0 bypass» em 3 relatórios e num commit.
// Correção: o caminho do guard é DERIVADO de import.meta.url (absoluto, independente de onde o
// script é corrido) — e o script FALHA ALTO se não o encontrar, em vez de dar um resultado vazio.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));            // .../DESAFIOGUT/scripts
const GUARD = resolve(AQUI, "..", "desafio-gut", "frontend", "netlify", "functions", "img-proxy.mjs");

// Controlo de sanidade do próprio instrumento: se o alvo não existir, ABORTA em vez de "0 falhas".
if (!existsSync(GUARD)) {
  console.error("ABORTA: nao encontrei o guard em " + GUARD);
  console.error("(sem alvo, este PoC nao mede nada — e um instrumento cego mente nos dois sentidos)");
  process.exit(2);
}
const { isBlockedHostname } = await import("file://" + GUARD.replace(/\\/g, "/"));
if (typeof isBlockedHostname !== "function") {
  console.error("ABORTA: importei o ficheiro mas isBlockedHostname nao e uma funcao");
  process.exit(2);
}

// Cadeia de decisao real do handler (linhas ~78-80): 403 se bloqueado; senao, se NAO for IP literal,
// corre resolvesToBlocked (DNS); senao vai a fetch.
const decidir = (alvo) => {
  let u; try { u = new URL(alvo); } catch { return "400 url invalida"; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "400 esquema";
  if (isBlockedHostname(u.hostname)) return "403";
  const lit = /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":");
  return lit ? "PASSA (dns saltada) -> fetch" : "PASSA (dns corre) -> fetch";
};

// ── os 8 payloads que o VALIDADOR ADVERSARIAL encontrou a passar (3.ª geração) ──
const DO_VALIDADOR = [
  "http://[2002:a00::1]/", "http://[2002:7f00::1]/", "http://[2002:c0a8::1]/", "http://[2002:ac10::1]/",
  "http://[2002:a9fe::1]/", "http://[2002:64::1]/", "http://[2002:a::1]/",
  "http://[2001:0:0:0:0:0:80ff:fffe]/",
];
// ── os 34 das gerações anteriores (brackets, mapeado, traduzido, NAT64, decimais alternativos) ──
const ANTERIORES = [
  "http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest/meta-data/", "http://10.0.0.1/",
  "http://192.168.1.1/", "http://172.16.0.1/", "http://[::1]/", "http://[fc00::1]/", "http://[fd00::1]/",
  "http://[fe80::1]/", "http://[fe90::1]/", "http://[febf::1]/", "http://[fec0::1]/", "http://[feff::1]/",
  "http://[::ffff:127.0.0.1]/", "http://[::ffff:0:127.0.0.1]/", "http://[::7f00:1]/", "http://[::a00:1]/",
  "http://[0:0:0:0:0:0:0:1]/", "http://[2002:7f00:1::]/", "http://[64:ff9b::7f00:1]/",
  "http://[64:ff9b:1::7f00:1]/", "http://[::ffff:169.254.169.254]/", "http://[::ffff:10.0.0.1]/",
  "http://2130706433/", "http://0177.0.0.1/", "http://0x7f.0.0.1/", "http://127.1/", "http://[ff02::1]/",
  "http://[100::1]/", "http://[::ffff:0:0:a00:1]/", "http://[0:0:0:0:0:ffff:7f00:1]/",
];
// ── controlos POSITIVOS: se algum destes for bloqueado, o guard morreu o produto (regressão do MC99.5.2) ──
const LEGITIMOS = [
  "https://i.imgur.com/foto.png", "https://cdn.jsdelivr.net/x.png", "https://exemplo.com/a.jpg",
  "http://[2606:4700::1111]/", "http://[2a00:1450:4001::1]/", "http://[::ffff:8.8.8.8]/",
];

const bloco = (nome, lista) => {
  const passam = [];
  console.log("\n=== " + nome + " (" + lista.length + ") ===");
  for (const p of lista) {
    const d = decidir(p);
    const passa = /^PASSA|^400/.test(d);
    if (passa) passam.push(p);
    console.log("  " + (passa ? "PASSA " : "403   ") + p.padEnd(40) + " -> " + d);
  }
  return passam;
};

const mausDoValidador = bloco("OS 8 DO VALIDADOR (3.ª geração)", DO_VALIDADOR);
const mausAnteriores = bloco("ANTERIORES (1.ª/2.ª geração)", ANTERIORES);
const legitimos = bloco("CONTROLOS POSITIVOS (tem de PASSAR)", LEGITIMOS);
const bloqueadosLegitimos = LEGITIMOS.filter((p) => !legitimos.includes(p));

console.log("\n=== RESUMO ===");
console.log("  buracos do validador a passar: " + mausDoValidador.length + "/" + DO_VALIDADOR.length);
console.log("  buracos anteriores a passar:   " + mausAnteriores.length + "/" + ANTERIORES.length);
console.log("  legítimos ACEITES:             " + legitimos.length + "/" + LEGITIMOS.length);
console.log("  legítimos BLOQUEADOS (mau!):   " + bloqueadosLegitimos.length + (bloqueadosLegitimos.length ? " -> " + bloqueadosLegitimos.join(" ") : ""));

const total = mausDoValidador.length + mausAnteriores.length;
if (bloqueadosLegitimos.length) {
  console.log("\nVEREDITO: REGRESSÃO — o guard bloqueia tráfego legítimo (" + bloqueadosLegitimos.length + ")");
  process.exit(1);
} else if (total === 0) {
  console.log("\nVEREDITO: 0 BYPASS — nenhum payload interno passa e os legítimos passam");
  process.exit(0);
} else {
  console.log("\nVEREDITO: SSRF ABERTO — " + total + " payloads passam (" + mausDoValidador.length + " do validador)");
  process.exit(1);
}
