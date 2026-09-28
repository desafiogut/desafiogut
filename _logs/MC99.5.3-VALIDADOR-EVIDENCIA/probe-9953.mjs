// VAL-9953 — sonda adversarial ao alargamento de isBlockedIp (commit 3fb6d1e, "Opção A").
// Mede por EXECUÇÃO. N1 = isBlockedIp/isBlockedHostname ; N3 = handler REAL (403=bloqueou |
// 502=passou a guarda | 200=SSRF vivo). Sem process.exit (Windows/libuv).
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { pathToFileURL } from "node:url";

const GUARD = process.env.GUARD || "C:/Users/Moltbot/Desktop/_VAL-9953/desafio-gut/frontend/netlify/functions/img-proxy.mjs";
if (!existsSync(GUARD)) { console.error("ABORTA: guard ausente em " + GUARD); process.exit(2); }
const M = await import(pathToFileURL(GUARD).href);
if (typeof M.default !== "function" || typeof M.isBlockedIp !== "function") { console.error("ABORTA: instrumento invalido"); process.exit(2); }
console.log("GUARD: " + GUARD);
console.log("md5  : " + createHash("md5").update(readFileSync(GUARD)).digest("hex") + "\n");

const BASE = "http://localhost/.netlify/functions/img-proxy";
const TO = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ __t: true }), ms))]);
async function chamar(h, alvo, ms = 9000) {
  const p = (async () => {
    try {
      const r = await h(new Request(BASE + "?url=" + encodeURIComponent(alvo)));
      let corpo = ""; try { corpo = String(await r.text()).slice(0, 48); } catch { }
      return { st: r.status, ct: r.headers.get("content-type") || "", corpo };
    } catch (e) { return { st: "ERRO", ct: "", corpo: String(e?.message || e).slice(0, 60) }; }
  })();
  const r = await TO(p, ms);
  return r && r.__t ? { st: "TIMEOUT", ct: "", corpo: "" } : r;
}
const rot = (r) => r.st === 403 ? "BLOQUEOU" : r.st === 200 ? "*** 200 SSRF VIVO ***"
  : r.st === 502 ? (/upstream error/.test(r.corpo) ? "passou (upstream error)" : "*** passou a guarda (fetch failed) ***")
  : String(r.st);
const cls = (r) => r.st === 403 ? "BLOQUEADO" : "PASSA";

const novos = [], regressoes = [], notas = [];
const linha = (res, ip, nota = "") => {
  console.log("  " + String(ip).padEnd(30) + " N1=" + (M.isBlockedIp(ip) ? "BLOQ" : "PASSA").padEnd(6) +
    " N3=" + String(res.st).padEnd(8) + rot(res).padEnd(34) + nota);
};

// ═════════════════ A) LIMITES das 6 faixas (primeiro e último) + vizinhos ═════════════════
console.log("═══ A) LIMITES das 6 faixas (N1 + N3 handler real) + vizinhos imediatos ═══");
const A = [
  ["192.0.0.0", "192.0.0.0/24 primeiro", true], ["192.0.0.255", "192.0.0.0/24 último", true],
  ["192.88.99.0", "192.88.99.0/24 primeiro", true], ["192.88.99.255", "192.88.99.0/24 último", true],
  ["192.0.2.0", "192.0.2.0/24 primeiro", true], ["192.0.2.255", "192.0.2.0/24 último", true],
  ["198.18.0.0", "198.18.0.0/15 primeiro", true], ["198.19.255.255", "198.18.0.0/15 último", true],
  ["198.51.100.0", "198.51.100.0/24 primeiro", true], ["198.51.100.255", "198.51.100.0/24 último", true],
  ["203.0.113.0", "203.0.113.0/24 primeiro", true], ["203.0.113.255", "203.0.113.0/24 último", true],
  ["192.0.1.1", "vizinho: 192.0.1.0/24", false], ["192.0.3.1", "vizinho: depois TEST-NET-1", false],
  ["192.88.98.1", "vizinho: antes 6to4 relay", false], ["192.88.100.1", "vizinho: depois 6to4 relay", false],
  ["198.17.255.255", "vizinho: antes /15", false], ["198.20.0.1", "vizinho: depois /15", false],
  ["198.51.99.255", "vizinho: antes TEST-NET-2", false], ["198.51.101.1", "vizinho: depois TEST-NET-2", false],
  ["203.0.112.255", "vizinho: antes TEST-NET-3", false], ["203.0.114.1", "vizinho: depois TEST-NET-3", false],
  ["192.169.0.1", "vizinho: 192.169/16 (não é privado)", false],
];
for (const [ip, nota, deveBloquear] of A) {
  const res = await chamar(M.default, "http://" + ip + "/x.png");
  linha(res, ip, nota);
  const n1 = M.isBlockedIp(ip), n3b = res.st === 403;
  if (deveBloquear && !(n1 && n3b)) novos.push("ESPERADO BLOQUEAR mas não: " + ip + " N1=" + n1 + " N3=" + res.st);
  if (!deveBloquear && (n1 || n3b)) regressoes.push("REGRESSÃO (complemento bloqueado): " + ip + " N1=" + n1 + " N3=" + res.st);
}

// ═════════════════ B) IANA IPv4 Special-Purpose Address Registry — o que MAIS passa ═════════
console.log("\n═══ B) IANA IPv4 SPECIAL-PURPOSE REGISTRY (RFC 6890/5737/2544/7534/7450) — N1 + N3 ═══");
const REG4 = [
  ["0.1.2.3", "0.0.0.0/8 This network"], ["0.0.0.0/32", "This host"], ["10.1.2.3", "10/8 Private"],
  ["100.64.0.1", "100.64/10 Shared"], ["100.127.255.255", "100.64/10 último"], ["127.0.0.1", "127/8 Loopback"],
  ["169.254.1.1", "169.254/16 LinkLocal"], ["172.16.0.1", "172.16/12"], ["172.31.255.255", "172.16/12 último"],
  ["192.0.0.1", "192.0.0.0/24 IETF"], ["192.0.0.8", "192.0.0.8/32 dummy"], ["192.0.0.9", "192.0.0.9/32 PCP anycast"],
  ["192.0.0.10", "192.0.0.10/32 TURN anycast"], ["192.0.0.170", "192.0.0.170/32 NAT64 disc"],
  ["192.0.0.171", "192.0.0.171/32 NAT64 disc"], ["192.0.2.1", "192.0.2.0/24 TEST-NET-1"],
  ["192.31.196.1", "192.31.196.0/24 AS112-v4"], ["192.31.196.255", "192.31.196.0/24 último"],
  ["192.52.193.1", "192.52.193.0/24 AMT"], ["192.52.193.255", "192.52.193.0/24 último"],
  ["192.88.99.1", "192.88.99.0/24 6to4 relay"], ["192.168.1.1", "192.168/16"],
  ["192.175.48.1", "192.175.48.0/24 AS112 direct"], ["192.175.48.255", "192.175.48.0/24 último"],
  ["198.18.0.1", "198.18/15 benchmarking"], ["198.51.100.1", "198.51.100.0/24 TEST-NET-2"],
  ["203.0.113.1", "203.0.113.0/24 TEST-NET-3"], ["224.0.0.1", "224/4 multicast"],
  ["233.252.0.1", "233.252.0.0/24 MCAST-TEST"], ["239.255.255.255", "224/4 último"],
  ["240.0.0.1", "240/4 reserved"], ["254.255.255.255", "240/4 último"], ["255.255.255.255", "limited broadcast"],
  ["1.1.1.1", "PUBLICO (controlo)"], ["8.8.8.8", "PUBLICO (controlo)"], ["104.17.208.5", "PUBLICO Cloudflare (controlo)"],
];
const passamR4 = [];
for (const [ip, nota] of REG4) {
  const res = await chamar(M.default, "http://" + ip + "/x.png");
  linha(res, ip, nota);
  if (M.isBlockedIp(ip) === false) passamR4.push(ip + "  [" + nota + "]  N3=" + res.st + " " + rot(res));
}
console.log("  >> N1 NÃO bloqueia (passa a classificação): " + (passamR4.length ? "" : "nenhum"));
for (const p of passamR4) console.log("     - " + p);

// ═════════════════ C) IPv6 de propósito especial dentro de 2000::/3 ═════════════════
console.log("\n═══ C) IPv6 SPECIAL-PURPOSE (RFC 6890) — N1 + N3 literal + N3 pelo caminho do DNS ═══");
const REG6 = [
  ["2001::1", "2001::/32 Teredo"], ["2001:1::1", "2001:1::1/128 PCP anycast"], ["2001:1::2", "2001:1::2/128 TURN anycast"],
  ["2001:2::1", "2001:2::/48 Benchmarking"], ["2001:3::1", "2001:3::/32 AMT"],
  ["2001:4:112::1", "2001:4:112::/48 AS112-v6"], ["2001:10::1", "2001:10::/28 ORCHID"],
  ["2001:20::1", "2001:20::/28 ORCHIDv2"], ["2001:db8::1", "2001:db8::/32 Documentation"],
  ["2002::1", "2002::/16 6to4"], ["3fff::1", "3fff::/20 Documentation (RFC 9637)"],
  ["2620:4f:8000::1", "2620:4f:8000::/48 AS112"],
  ["::1", "loopback"], ["fd00::1", "ULA"], ["fe80::1", "link-local"], ["::ffff:127.0.0.1", "IPv4-mapped loopback"],
  ["2606:4700::1111", "PUBLICO (controlo)"],
];
const passam6 = [];
for (const [ip, nota] of REG6) {
  const res = await chamar(M.default, "http://[" + ip + "]/x.png");
  const n1 = M.isBlockedIp(ip);
  console.log("  " + String("[" + ip + "]").padEnd(30) + " N1=" + (n1 ? "BLOQ" : "PASSA").padEnd(6) + " N3=" + String(res.st).padEnd(8) + rot(res).padEnd(34) + nota);
  if (!n1) passam6.push(ip + "  [" + nota + "]  literal N3=" + res.st);
}
console.log("  >> N1 NÃO bloqueia: " + (passam6.length ? passam6.length + " endereços" : "nenhum"));
for (const p of passam6) console.log("     - " + p);

console.log("\n  --- caminho do DNS (sslip.io): nome SÓ-AAAA vs nome A-público + AAAA ---");
const NOMES6 = [
  ["2001-2--1.sslip.io", "AAAA 2001:2::1 só", "1-1-1-1.2001-2--1.sslip.io"],
  ["3fff--1.sslip.io", "AAAA 3fff::1 só", "1-1-1-1.3fff--1.sslip.io"],
  ["2001-10--1.sslip.io", "AAAA 2001:10::1 só", "1-1-1-1.2001-10--1.sslip.io"],
  ["2001-20--1.sslip.io", "AAAA 2001:20::1 só", "1-1-1-1.2001-20--1.sslip.io"],
  ["2001-3--1.sslip.io", "AAAA 2001:3::1 só", "1-1-1-1.2001-3--1.sslip.io"],
  ["2001-4-112--1.sslip.io", "AAAA 2001:4:112::1 só", "1-1-1-1.2001-4-112--1.sslip.io"],
  ["2620-4f-8000--1.sslip.io", "AAAA 2620:4f:8000::1 só", "1-1-1-1.2620-4f-8000--1.sslip.io"],
  ["2001-1--1.sslip.io", "AAAA 2001:1::1 só", "1-1-1-1.2001-1--1.sslip.io"],
  ["2602-a9fe-a9fe--1.sslip.io", "AAAA 6rd só", "1-1-1-1.2602-a9fe-a9fe--1.sslip.io"],
  ["2a00-64--a9fe-a9fe.sslip.io", "AAAA NAT64-custom só", "1-1-1-1.2a00-64--a9fe-a9fe.sslip.io"],
  ["1-1-1-1.--1.sslip.io", "A publico + AAAA ::1 (referencia)", null],
  ["1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io", "A publico + AAAA ISATAP (referencia)", null],
];
for (const [so6, nota, comA] of NOMES6) {
  const d1 = await M.resolverEEscolher(so6);
  const r1 = await chamar(M.default, "http://" + so6 + "/x.png");
  let s = "  " + so6.padEnd(40) + " decisao=" + (d1.bloqueado ? "BLOQ" : "PASSA") + " pin=" + String(d1.pin).padEnd(16) + " N3=" + String(r1.st).padEnd(8) + rot(r1) + "   [" + nota + "]";
  if (comA) {
    const d2 = await M.resolverEEscolher(comA);
    const r2 = await chamar(M.default, "http://" + comA + "/x.png");
    s += "\n      + A isco: " + comA.padEnd(38) + " decisao=" + (d2.bloqueado ? "BLOQ" : "PASSA") + " pin=" + String(d2.pin).padEnd(16) + " N3=" + String(r2.st).padEnd(8) + rot(r2);
  }
  console.log(s);
}

// ═════════════════ D) controlo positivo VIVO: CDNs ═════════════════
console.log("\n═══ D) CONTROLO POSITIVO VIVO — CDNs (N1 + handler real 200 image/*) ═══");
const CDN = ["i.imgur.com", "cdn.jsdelivr.net", "images.unsplash.com", "res.cloudinary.com"];
for (const h of CDN) {
  const n1 = M.isBlockedHostname(h);
  let addrs = "(nao resolvido)";
  try { const r = await lookup(h, { all: true }); addrs = r.map((x) => x.address + "/" + x.family).join(" "); } catch (e) { addrs = "ERRO " + (e.code || "?"); }
  const d = await M.resolverEEscolher(h);
  console.log("  " + h.padEnd(22) + " isBlockedHostname=" + (n1 ? "BLOQ(!)" : "passa") + "  resolver=" + (d.bloqueado ? "BLOQ(!)" : "passa") + "  pin=" + String(d.pin).padEnd(18) + "  DNS: " + addrs);
  if (n1 || d.bloqueado) regressoes.push("CDN bloqueado: " + h);
}
for (const u of ["https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/brands/github.svg",
  "https://cdn.jsdelivr.net/gh/github/explore@main/topics/nodejs/nodejs.png",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=100"]) {
  const r = await chamar(M.default, u, 15000);
  const ok = r.st === 200 && /^image\//i.test(r.ct);
  console.log("  " + (ok ? "OK   " : "FALHA") + " st=" + String(r.st).padEnd(6) + " ct=" + String(r.ct).padEnd(20) + u.slice(0, 78));
  if (!ok) notas.push("controlo positivo nao serviu 200 image/*: " + u + " -> " + r.st + " " + r.ct + " " + r.corpo);
}

// ═════════════════ E) regressões nos outros caminhos ═════════════════
console.log("\n═══ E) REGRESSÃO noutros caminhos ═══");
const E = [
  ["http://169.254.169.254/latest/meta-data/", "metadata cloud", 403],
  ["http://[fd00:ec2::254]/x.png", "metadata AWS IPv6 (literal)", 403],
  ["http://127.0.0.1/", "loopback", 403],
  ["http://[::1]/x.png", "IPv6 entre brackets", 403],
  ["http://[::ffff:127.0.0.1]/", "IPv6 mapped", 403],
  ["http://2130706433/", "IPv4 decimal", 403],
  ["http://0x7f.0.0.1/", "IPv4 hex", 403],
  ["http://1-1-1-1.--1.sslip.io/x.png", "prefixado A+AAAA ::1", 403],
  ["http://1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io/x.png", "prefixado A+AAAA ISATAP", 403],
  ["http://1-1-1-1.fd00-ec2--254.sslip.io/x.png", "prefixado A+AAAA metadata AWS", 403],
  ["http://1-1-1-1.fd00--1.sslip.io/x.png", "prefixado A+AAAA ULA", 403],
  ["http://2601--5efe-a9fe-a9fe.sslip.io/x.png", "só AAAA ISATAP", 403],
  ["http://127.0.0.1.nip.io/x.png", "nip.io loopback", 403],
  ["http://2606:4700::1111/x.png", "IPv6 cru sem brackets (URL inválida)", null],
  ["http://nao-existe-9953-val.example/x.png", "NXDOMAIN (fail-closed herdado)", 403],
  ["http://192-0-2-1.sslip.io/x.png", "faixa NOVA via DNS (A do DNS, nao literal)", 403],
];
for (const [alvo, nota, esperado] of E) {
  const r = await chamar(M.default, alvo, 9000);
  const ok = esperado === null ? (r.st !== 200) : r.st === esperado;
  console.log("  " + (ok ? "OK   " : "MUDOU") + " st=" + String(r.st).padEnd(8) + rot(r).padEnd(34) + nota + "   (" + alvo.slice(0, 56) + ")");
  if (!ok) notas.push("mudou: " + alvo + " -> " + r.st + " (esperado " + esperado + ") " + r.corpo);
}

console.log("\n═══ RESUMO ═══");
console.log("  limites/complemento com problema: " + (novos.length + regressoes.length));
for (const x of [...novos, ...regressoes]) console.log("    ! " + x);
console.log("  faixas IPv4 do registo IANA que NÃO são bloqueadas (N1): " + passamR4.length);
console.log("  endereços IPv6 do registo IANA que NÃO são bloqueados (N1): " + passam6.length);
console.log("  notas: " + (notas.length ? "" : "nenhuma"));
for (const n of notas) console.log("    ~ " + n);
console.log("  EXITCODE_LOGICO=" + ((novos.length + regressoes.length) ? 1 : 0));
process.exitCode = (novos.length + regressoes.length) ? 1 : 0;
