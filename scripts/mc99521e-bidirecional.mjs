// mc99521e-bidirecional.mjs — MC99.5.2.1e, HARD GATE 5 (teste BIDIRECCIONAL) + SEG1.1.
//
// Mede, no HANDLER REAL, as DUAS direcções:
//   MALICIOSO  -> 403   (nome prefixado, sslip.io, literais IPv6, IPv4 privado)
//   LEGÍTIMO   -> PASSA (dominios HTTP/HTTPS; a imagem TEM de chegar, 200 image/*)
// e ainda a prova do MECANISMO (SEG1.1: «o fetch liga ao IP validado, não ao nome»):
//   pin -> ::1 num Agent com `connect.lookup` e fetch a um NOME diferente: se o isco em
//   [::1] responder, a ligação foi ao endereço FIXADO e não ao que o DNS do nome dava.
//
// Controlo positivo OBRIGATÓRIO: um proxy morto devolve 403 a tudo e parece uma guarda
// perfeita. Sem estes 200, nenhum 403 vale nada.
//
// Exit: 0 fechado + positivos a passar | 1 buraco/regressao | 2 instrumento invalido.
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(AQUI, "..", "desafio-gut", "frontend", "netlify", "functions", "img-proxy.mjs");
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente em " + GUARD); process.exit(2); }
const M = await import(pathToFileURL(GUARD).href);
if (typeof M.default !== "function" || typeof M.resolverEEscolher !== "function") {
  console.error("ABORTA: o guard nao exporta handler/resolverEEscolher (instrumento invalido)");
  process.exit(2);
}
// undici do MESMO sitio que o guard usa (a versao que produz o comportamento medido)
const UNDICI = createRequireShim();
function createRequireShim() {
  // importa o undici resolvido a partir da pasta do guard, para medir a MESMA versao
  const p = resolve(AQUI, "..", "desafio-gut", "frontend", "netlify", "functions", "node_modules", "undici", "index.js");
  return existsSync(p) ? p : null;
}

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5e0000000049454e44ae426082", "hex");
let iscoHits = 0;
const isco = createServer((_q, r) => { iscoHits++; r.writeHead(200, { "Content-Type": "image/png" }); r.end(PNG); });
await new Promise((ok, err) => { isco.once("error", err); isco.listen(0, "::1", ok); });
const PORTA = isco.address().port;

const BASE = "http://localhost/.netlify/functions/img-proxy";
const comTimeout = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __t: true }), ms))]);
const chamar = async (alvo, ms = 12000) => {
  const r = await comTimeout(M.default(new Request(BASE + "?url=" + encodeURIComponent(alvo))), ms);
  if (r && r.__t) return { st: "TIMEOUT", ct: "", corpo: "" };
  let ct = r.headers.get("content-type") || "";
  let corpo = ""; try { corpo = await comTimeout(r.text(), 4000); } catch { }
  if (corpo && corpo.__t) corpo = "(timeout no corpo)";
  return { st: r.status, ct, corpo: String(corpo).slice(0, 40) };
};

// ─────────────────────────── MALICIOSOS ───────────────────────────
const MAL_NOME_PREFIXADO = [
  "http://1-1-1-1.--1.sslip.io:" + PORTA + "/x.png",                   // A publico + AAAA ::1  (era 200: SSRF VIVO)
  "http://1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io:" + PORTA + "/x.png",  // A publico + AAAA ISATAP->metadata
  "http://1-1-1-1.fd00-ec2--254.sslip.io:" + PORTA + "/x.png",          // A publico + AAAA metadata AWS v6
  "http://1-1-1-1.fd00--1.sslip.io:" + PORTA + "/x.png",                // A publico + AAAA fd00::1 (ULA)
  "http://10-0-0-1.2601--5efe-a9fe-a9fe.sslip.io:" + PORTA + "/x.png", // A privado + AAAA ISATAP
];
const MAL_SSLP_AAAASO = [
  "http://--1.sslip.io:" + PORTA + "/x.png",                            // so AAAA ::1
  "http://2601--5efe-a9fe-a9fe.sslip.io:" + PORTA + "/x.png",           // so AAAA ISATAP
  "http://127.0.0.1.nip.io:" + PORTA + "/x.png",                        // A 127.0.0.1
];
const MAL_LITERAIS_V6 = ["http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://[2606:4700::1111]/", "http://[2a00:1450:4001::1]/"];
const MAL_V4_PRIV = ["http://127.0.0.1/", "http://10.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://192.168.1.1/", "http://2130706433/", "http://0x7f.0.0.1/"];

// ─────────────────────────── LEGÍTIMOS (controlo positivo VIVO) ───────────────────────────
// i.imgur.com é DUAL-STACK (HARD GATE 4) e serve uma imagem real -> tem de dar 200 image/*
const LEG_IMAGENS = [
  "https://i.imgur.com/removed.png",
  "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/brands/github.svg",
  "https://cdn.jsdelivr.net/gh/github/explore@main/topics/nodejs/nodejs.png",
];
// Só domínios que RESOLVEM entram aqui. Um nome NXDOMAIN dá 403 nas DUAS gerações
// (medido no A/B pareado: ANTIGA=403 NOVA=403) — é o fail-closed histórico, não uma regressão.
const LEG_NAO_403 = ["https://exemplo.com/a.jpg", "https://images.unsplash.com/x.jpg"];
// Documentado à parte, com o resultado do A/B: NXDOMAIN -> 403 (comportamento herdado).
const NXDOMAIN = ["http://a.b.c.d.com.br/img.png", "https://nao-existe-99521e.example/x.png"];

console.log("GUARD: " + GUARD);
console.log("ISCO [::1]:" + PORTA + "   (escuta SO em ::1)");
console.log("undici do guard: " + (UNDICI ? "presente" : "AUSENTE"));

const falhas = [], bugs = [];
const linha = (alvo, r, ok, nota) => {
  console.log("  " + (ok ? "OK  " : "FALHA") + " st=" + String(r.st).padEnd(8) + " ct=" + String(r.ct).padEnd(28) + alvo + (nota ? "   " + nota : ""));
  return ok;
};

console.log("\n=== MALICIOSO: nome prefixado (A publico + AAAA privado) -> 403 ===");
for (const a of MAL_NOME_PREFIXADO) { const r = await chamar(a); if (!linha(a, r, r.st === 403)) falhas.push(a + " -> " + r.st); }

console.log("\n=== MALICIOSO: sslip.io / nip.io simples (so AAAA interno, ou A interno) -> 403 ===");
for (const a of MAL_SSLP_AAAASO) { const r = await chamar(a); if (!linha(a, r, r.st === 403)) falhas.push(a + " -> " + r.st); }

console.log("\n=== MALICIOSO: literais IPv6 -> 403 ===");
for (const a of MAL_LITERAIS_V6) { const r = await chamar(a); if (!linha(a, r, r.st === 403)) falhas.push(a + " -> " + r.st); }

console.log("\n=== MALICIOSO: IPv4 privado / notacoes alternativas -> 403 ===");
for (const a of MAL_V4_PRIV) { const r = await chamar(a); if (!linha(a, r, r.st === 403)) falhas.push(a + " -> " + r.st); }

console.log("\n=== CONTROLO POSITIVO VIVO: imagens HTTPS reais -> 200 image/* (senao o proxy morreu) ===");
for (const a of LEG_IMAGENS) {
  const r = await chamar(a);
  const ok = r.st === 200 && /^image\//i.test(r.ct);
  if (!linha(a, r, ok, "  <- HTTPS+SNI pelo dispatcher fixado")) falhas.push("LEGITIMO BLOQUEADO/QUEBRADO: " + a + " -> " + r.st + " " + r.ct);
}

console.log("\n=== CONTROLO POSITIVO: dominios legitimos NAO podem dar 403 ===");
for (const a of LEG_NAO_403) { const r = await chamar(a); if (!linha(a, r, r.st !== 403, "(nao-403 e o criterio)")) falhas.push("LEGITIMO 403: " + a); }

console.log("\n=== HERDADO (A/B: ANTIGA=403 NOVA=403): nome que nao resolve -> 403 fail-closed ===");
for (const a of NXDOMAIN) { const r = await chamar(a); if (!linha(a, r, r.st === 403, "(fail-closed herdado, nao e regressao)")) falhas.push("NXDOMAIN mudou para " + r.st + ": " + a); }

// ─────────── PROVA DO MECANISMO (SEG1.1): a ligação vai ao IP validado, não ao nome ───────────
console.log("\n=== MECANISMO: pin -> ::1, fetch a um NOME diferente (o isco responde?) ===");
let pinOk = false;
if (UNDICI) {
  const u = await import(pathToFileURL(UNDICI).href);
  let lookups = 0;
  const ag = new u.Agent({ connect: { lookup: (_h, _o, cb) => { lookups++; cb(null, [{ address: "::1", family: 6 }]); } } });
  const antes = iscoHits;
  try {
    const r = await u.fetch("http://nome-que-nao-e-o-do-isco.example:" + PORTA + "/x.png", { dispatcher: ag, redirect: "error" });
    pinOk = r.status === 200 && iscoHits > antes && lookups === 1;
    console.log("  " + (pinOk ? "OK  " : "FALHA") + " st=" + r.status + " resolucoes=" + lookups + " iscoHits+=" + (iscoHits - antes) + " -> ligou ao endereco FIXADO, nao ao nome");
  } catch (e) { console.log("  FALHA ERRO " + (e.cause?.message || e.message)); }
  if (!pinOk) bugs.push("o mecanismo do pin nao se reproduziu");
} else {
  console.log("  ignorado (undici ausente)");
  bugs.push("undici ausente: nao medi o mecanismo do pin");
}

// ─────────── decisão directa (resolverEEscolher) para o registo ───────────
console.log("\n=== resolverEEscolher (a decisão que a ligação usa) ===");
for (const n of ["1-1-1-1.--1.sslip.io", "1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io", "1-1-1-1.fd00-ec2--254.sslip.io",
                 "cdn.jsdelivr.net", "i.imgur.com", "exemplo.com"]) {
  const d = await M.resolverEEscolher(n);
  console.log("  bloqueado=" + String(d.bloqueado).padEnd(5) + " pin=" + String(d.pin).padEnd(42) + n);
}

console.log("\n=== RESUMO ===");
console.log("  isco alcancado: " + iscoHits + " vez(es)  (malicioso NAO pode chegar: esperado 1 = so a prova do mecanismo)");
console.log("  falhas: " + (falhas.length + bugs.length));
for (const f of falhas) console.log("    - " + f);
for (const b of bugs) console.log("    ! " + b);
isco.close();
if (bugs.length) { console.log("\nVEREDITO: INSTRUMENTO INVALIDO"); process.exit(2); }
if (falhas.length) { console.log("\nVEREDITO: FALHOU (buraco ou regressao)"); process.exit(1); }
console.log("\nVEREDITO: FECHADO — maliciosos 403, legitimas servidas 200 image/*, ligacao fixada ao IP validado");
process.exit(0);
