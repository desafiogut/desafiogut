// mc99521e-producao.mjs — SEG3.4 do MC99.5.2.1e: sondar a PRODUÇÃO.
//
// Corre ANTES e DEPOIS do deploy. As SONDAS DIFERENCIAIS fixam QUAL geração está viva: cada
// geração refutada deixa uma assinatura (o que bloqueia e o que deixa passar).
//   403 = a guarda bloqueou
//   502 ("fetch failed")   = PASSOU a guarda, a ligação falhou  <-- a assinatura do buraco
//   502 ("upstream error") = falou com alguém e não era 2xx      <-- prova mais forte de que passou
//   200 = SSRF VIVO
// O controlo POSITIVO é obrigatório: se o CDN der 403, a produção está a bloquear tudo e todos os
// 403 dos maliciosos não valem nada.
const BASE = process.env.BASE || "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/img-proxy";
const comTO = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __t: true }), ms))]);
const chamar = async (alvo, ms = 15000) => {
  const r = await comTO(fetch(BASE + "?url=" + encodeURIComponent(alvo), { redirect: "error" }), ms);
  if (r && r.__t) return { st: "TIMEOUT", corpo: "" };
  let corpo = ""; try { corpo = await comTO(r.text(), 5000); } catch { }
  return { st: r.status, corpo: String(corpo || "").slice(0, 50) };
};
const rotulo = (c) => (c === "403" ? "BLOQUEOU" : c === "200" ? "*** SSRF VIVO ***" : /fetch failed/.test(c) ? "*** PASSOU A GUARDA ***" : "passou/outro");

const MAL = [
  ["nome prefixado A publico + AAAA ISATAP (o ataque da 6.ª)", "http://1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io/x.png"],
  ["nome prefixado A publico + AAAA ::1", "http://1-1-1-1.--1.sslip.io:80/x.png"],
  ["nome prefixado A publico + AAAA metadata AWS", "http://1-1-1-1.fd00-ec2--254.sslip.io/x.png"],
  ["nome prefixado A publico + AAAA 6to4", "http://1-1-1-1.2002-a9fe-a9fe--1.sslip.io/x.png"],
  ["sslip simples so AAAA (5.ª geração fechou)", "http://2601--5efe-a9fe-a9fe.sslip.io/x.png"],
  ["literal IPv6 loopback", "http://[::1]/x.png"],
  ["IPv4 metadata", "http://169.254.169.254/latest/meta-data/"],
];
const POS = [
  ["CDN dual-stack (jsdelivr)", "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/brands/github.svg"],
  ["CDN dual-stack (imgur)", "https://i.imgur.com/removed.png"],
];
// ── FAIXAS RESERVADAS DE PROPÓSITO ESPECIAL (RFC 5737/6890/2544) ──
// ⚠️ FRAGILIDADE RESIDUAL encontrada pelo VALIDADOR ADVERSARIAL (não pela minha lista): `isBlockedIp`
// NÃO cobre estas faixas — passam a classificação (502 "fetch failed", não 403). NÃO são alvos
// internos (são globalmente não-roteáveis, para documentação/benchmarking), logo NÃO é SSRF vivo.
// Ficam MEDIDAS e à vista: era este o ponto cego da minha lista de payloads (as 6 gerações
// anteriores repetiram sempre este erro — a lista da correcção é a cegueira seguinte).
const RESERVADAS = [
  ["192.0.0.0/24 (atribuições IETF)", "http://192.0.0.1:80/x.png"],
  ["192.88.99.0/24 (6to4 relay anycast)", "http://192.88.99.1:80/x.png"],
  ["192.0.2.0/24 (TEST-NET-1)", "http://192.0.2.1:80/x.png"],
  ["198.18.0.0/15 (benchmarking)", "http://198.18.0.1:80/x.png"],
  ["198.51.100.0/24 (TEST-NET-2)", "http://198.51.100.1:80/x.png"],
  ["203.0.113.0/24 (TEST-NET-3)", "http://203.0.113.1:80/x.png"],
];

console.log("BASE: " + BASE);
console.log("\n=== MALICIOSOS ===");
let passoGuarda = 0;
const assinatura = [];
for (const [nome, alvo] of MAL) {
  const r = await chamar(alvo);
  if (!String(r.st).startsWith("403")) passoGuarda++;
  assinatura.push(r.st);
  console.log("  st=" + String(r.st).padEnd(8) + rotulo(String(r.st)).padEnd(24) + nome);
  console.log("      " + alvo + "   corpo: " + r.corpo);
}
console.log("\n=== CONTROLOS POSITIVOS (se derem 403, a produção bloqueia TUDO e nada acima vale) ===");
let positivosOk = 0;
for (const [nome, alvo] of POS) {
  const r = await chamar(alvo);
  if (r.st === 200) positivosOk++;
  console.log("  st=" + String(r.st).padEnd(8) + nome + "  corpo: " + r.corpo);
}
console.log("\n=== FAIXAS RESERVADAS (fragilidade residual MEDIDA — passa a classificação, NAO e' alvo interno) ===");
let reservadasPassam = 0;
for (const [nome, alvo] of RESERVADAS) {
  const r = await chamar(alvo);
  if (!String(r.st).startsWith("403")) reservadasPassam++;
  console.log("  st=" + String(r.st).padEnd(8) + nome + "   " + alvo + "   corpo: " + r.corpo);
}
console.log("\n=== ASSINATURA: " + assinatura.join(",") + " ===");
console.log("  maliciosos que PASSARAM a guarda: " + passoGuarda + "/" + MAL.length);
console.log("  controlos positivos OK: " + positivosOk + "/" + POS.length);
console.log("  faixas reservadas que passam a classificacao (declarado, nao e' SSRF): " + reservadasPassam + "/" + RESERVADAS.length);
if (positivosOk === 0) { console.log("\nVEREDITO PROD: INCONCLUSIVO — os controlos positivos falharam (não medi)"); process.exit(2); }
if (passoGuarda > 0) { console.log("\nVEREDITO PROD: SSRF ABERTO em produção (" + passoGuarda + "/" + MAL.length + " passam a guarda)"); process.exit(1); }
console.log("\nVEREDITO PROD: FECHADO em produção (todos 403, positivos servem imagem)");
process.exit(0);
