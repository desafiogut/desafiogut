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
import { lookup } from "node:dns/promises";
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
const { isBlockedHostname, isBlockedIp, resolvesToBlocked } = await import("file://" + GUARD.replace(/\\/g, "/"));
if (typeof isBlockedHostname !== "function" || typeof isBlockedIp !== "function" || typeof resolvesToBlocked !== "function") {
  console.error("ABORTA: importei o ficheiro mas faltam funcoes (isBlockedHostname/isBlockedIp/resolvesToBlocked)");
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
// ── os que a 4.ª geração DEIXOU PASSAR (achados pelo 4.º validador): o PoC cresce com o achado
//    que o derrubou, senão a geração seguinte repete o erro com um nome novo por fora ──
const QUARTA_GERACAO = [
  "http://[2601::5efe:a9fe:a9fe]/",   // ISATAP -> 169.254.169.254 (METADATA CLOUD)
  "http://[2600::5efe:0a00:0001]/",   // ISATAP -> 10.0.0.1
  "http://[3ffe::5efe:7f00:0001]/",   // ISATAP -> 127.0.0.1
  "http://[2001:db8:1:2::a9fe:a9fe]/",// 6rd/documentação com IPv4 embutido
  "http://[2001:1:2:3::c0a8:101]/",   // 6rd com prefixo próprio -> 192.168.1.1
  "http://[2a01:4f8:1:2::a9fe:a9fe]/",// NAT64-custom / 6rd -> 169.254.169.254
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
// ── controlos POSITIVOS: DOMÍNIOS. Se algum for bloqueado, o proxy de imagens morre (regressão) ──
const LEGITIMOS = [
  "https://i.imgur.com/foto.png", "https://cdn.jsdelivr.net/x.png", "https://exemplo.com/a.jpg",
  "https://images.unsplash.com/x.jpg", "https://a.b.c.d.com.br/img.png",
];
// ── MC99.5.2.1c — literais IPv6 são recusados POR DESENHO, mesmo públicos. A inversão troca
//    «este IPv4 embutido é privado?» por «preciso mesmo de aceitar um literal IPv6?» — e a
//    resposta é não: quem serve imagens legitimamente usa NOMES. Estes TÊM de dar 403; se um
//    passar, a inversão tem um buraco. (A promessa antiga aceitava IPv6 público — foi trocada,
//    e o instrumento passa a medir a promessa NOVA.) ──
const LITERAIS_V6 = ["http://[2606:4700::1111]/", "http://[2a00:1450:4001::1]/", "http://[::ffff:8.8.8.8]/"];

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
const maus4a = bloco("ISATAP / 6rd / NAT64-CUSTOM (os que a 4.ª geração deixou passar)", QUARTA_GERACAO);
const mausAnteriores = bloco("ANTERIORES (1.ª/2.ª geração)", ANTERIORES);
const v6 = bloco("IPv6 LITERAL (recusado POR DESENHO — tem de dar 403)", LITERAIS_V6);
const legitimos = bloco("CONTROLOS POSITIVOS: DOMINIOS (tem de PASSAR)", LEGITIMOS);
const bloqueadosLegitimos = LEGITIMOS.filter((p) => !legitimos.includes(p));

// ── CAMINHO_DNS (MC99.5.2.1d) — a INVERSÃO QUE FALTAVA. O handler, para um DOMINIO, decide por
//    resolvesToBlocked. Um atacante NAO precisa de DNS hostil: o sslip.io e um DNS PUBLICO que
//    devolve o endereco codificado no proprio nome. Mede-se a FUNCAO REAL, nao uma replica. ──
const MAL_DNS = ["2601--5efe-a9fe-a9fe.sslip.io", "2600--5efe-0a00-0001.sslip.io", "3ffe--5efe-7f00-0001.sslip.io"];
const BOM_DNS = ["i.imgur.com", "cdn.jsdelivr.net", "exemplo.com"];
let dnsBypass = 0, dnsRegressao = 0;
console.log("\n=== CAMINHO_DNS (resolucao DNS REAL, funcao real) ===");
for (const h of MAL_DNS) {
  let addrs = []; try { addrs = (await lookup(h, { all: true })).map((a) => a.address); } catch { }
  const bloqueado = await resolvesToBlocked(h);
  if (!bloqueado) dnsBypass++;
  console.log("  " + (bloqueado ? "403   " : "PASSA ") + h.padEnd(38) + " -> " + (addrs.join(",") || "(nao resolveu)"));
}
for (const h of BOM_DNS) {
  const bloqueado = await resolvesToBlocked(h);
  if (bloqueado) dnsRegressao++;
  console.log("  " + (bloqueado ? "403(!)" : "PASSA ") + " " + h.padEnd(38) + " (legitimo)");
}

console.log("\n=== RESUMO ===");
console.log("  buracos do validador a passar: " + mausDoValidador.length + "/" + DO_VALIDADOR.length);
console.log("  buracos anteriores a passar:   " + mausAnteriores.length + "/" + ANTERIORES.length);
console.log("  legítimos ACEITES:             " + legitimos.length + "/" + LEGITIMOS.length);
console.log("  legítimos BLOQUEADOS (mau!):   " + bloqueadosLegitimos.length + (bloqueadosLegitimos.length ? " -> " + bloqueadosLegitimos.join(" ") : ""));

console.log("  buracos da 4.ª geração a passar: " + maus4a.length + "/" + QUARTA_GERACAO.length);
console.log("  literais IPv6 que PASSARAM (tem de ser 0): " + v6.length + "/" + LITERAIS_V6.length);
console.log("  CAMINHO_DNS: maliciosos que PASSARAM (tem de ser 0): " + dnsBypass + "/" + MAL_DNS.length);
console.log("  CAMINHO_DNS: legitimos BLOQUEADOS (tem de ser 0):    " + dnsRegressao + "/" + BOM_DNS.length);
const total = mausDoValidador.length + maus4a.length + mausAnteriores.length + v6.length + dnsBypass;
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
