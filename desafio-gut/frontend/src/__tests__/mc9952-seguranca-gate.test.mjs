// mc9952-seguranca-gate.test.mjs — MC99.5.2.
// SSRF: testa a FUNÇÃO REAL exportada (isBlockedHostname) + a cadeia de decisão das linhas 78-80
// do img-proxy, em vez de uma cópia da lógica. BIDIRECIONAL (HARD GATE 7): malicioso recusado E
// legítimo aceite — senão um "block all" passaria o teste.
// Gate: botão de expansão (decisão do operador: SEM resumo, só o botão).
// ⚠️ Mede sobre CÓDIGO (stripper), porque os comentários desta correcção nomeiam os payloads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (p) => readFileSync(p, "utf8");
const codigo = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

// ── importa a função REAL do backend ──
const { isBlockedHostname } = await import("file://" + resolve(FE, "netlify/functions/img-proxy.mjs").replace(/\\/g, "/"));

/** Reproduz a cadeia de decisão das linhas 78-80 (bloqueia? salta o DNS?). */
function passaria(alvo) {
  const u = new URL(alvo);
  if (u.protocol !== "http:" && u.protocol !== "https:") return "esquema";
  if (isBlockedHostname(u.hostname)) return "403";
  const ehIpLiteral = /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":");
  return ehIpLiteral ? "PASSA(dns saltada)" : "PASSA(dns corre)";
}

test("controlo positivo: a função REAL foi importada e bloqueia o óbvio", () => {
  assert.equal(typeof isBlockedHostname, "function", "não importei a função real");
  assert.equal(isBlockedHostname("127.0.0.1"), true);
  assert.equal(isBlockedHostname("localhost"), true);
});

test("MC99.5.2/SSRF · (a) IPv6 entre brackets é RECUSADO (4 payloads explorados)", () => {
  // antes da correcção, estes 4 passavam a validação e o DNS era saltado
  for (const h of ["[::1]", "[::ffff:127.0.0.1]", "[fc00::1]", "[fd00::1]"]) {
    assert.equal(isBlockedHostname(h), true, h + " NAO e bloqueado (SSRF reaberto)");
  }
  for (const alvo of ["http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://[fc00::1]/", "http://[fd00::1]/"]) {
    assert.equal(passaria(alvo), "403", alvo + " ainda passa a validação");
  }
  // o hex normalizado pelo WHATWG URL é o caso que a 1.ª correcção deixou aberto
  assert.equal(isBlockedHostname("[::ffff:7f00:1]"), true, "forma HEX nao bloqueada");
});

test("MC99.5.2/SSRF · (a2) IPv4 EMBUTIDO + TODAS as familias (meus 16 + os 12 do validador)", () => {
  // A 1.ª correcção fechou 3 de 4. A 2.ª fechou o mapeado em hex e parecia completa — e o
  // VALIDADOR INDEPENDENTE refutou-a com ≥12 payloads novos. Cada iteração parecia completa.
  // A correcção final ABANDONA a enumeração de prefixos: allowlist de intervalo (só 2000::/3).
  // Aqui ficam TODOS, os que eu imaginei e os que ele encontrou.
  // ⚠️ Mede-se sobre o hostname JA NORMALIZADO pelo URL — e o que a função recebe em produção.
  const FAMILIAS = [
    "http://[::ffff:0:127.0.0.1]/", "http://[2002:7f00:1::]/", "http://[64:ff9b::7f00:1]/",
    // as que o validador encontrou (eu não as tinha imaginado):
    "http://[fe90::1]/", "http://[fea0::1]/", "http://[febf::1]/",     // cauda de fe80::/10
    "http://[fec0::1]/", "http://[feff::1]/",                          // site-local fec0::/10
    "http://[::ffff:0:0:a00:1]/", "http://[::7f00:1]/", "http://[::a00:1]/",
    "http://[64:ff9b:1::7f00:1]/", "http://[0:0:0:0:0:ffff:7f00:1]/",
  ];
  for (const alvo of FAMILIAS) {
    const host = new URL(alvo).hostname;
    assert.equal(isBlockedHostname(host), true, host + " NAO e bloqueado (familia de IPv4 embutido)");
    assert.equal(passaria(alvo), "403", alvo + " ainda passa (DNS saltada)");
  }
  // e um IPv4-mapeado PUBLICO continua a passar — nao e bloqueio cego da familia.
  const pub = new URL("http://[::ffff:8.8.8.8]/").hostname;
  assert.equal(isBlockedHostname(pub), false, "bloqueou um IPv4-mapeado PUBLICO: " + pub);
  assert.match(passaria("http://[::ffff:8.8.8.8]/"), /^PASSA/);
  // IPv6 publico (2000::/3) tem de passar
  for (const ip of ["http://[2606:4700::1111]/", "http://[2a00:1450:4001::1]/"]) {
    assert.match(passaria(ip), /^PASSA/, ip + " — IPv6 PUBLICO foi bloqueado");
  }
});

test("MC99.5.2.1b/SSRF · (a5) 4.ª GERAÇÃO: 6to4 e Teredo — os 8 que o validador deixou passar", () => {
  // A 3.ª geração (allowlist `2000::/3`) foi REFUTADA: 6to4 (2002::/16) e Teredo (2001::/32) VIVEM
  // dentro de 2000::/3 e transportam IPv4. Passavam 8 payloads, incluindo a METADATA CLOUD.
  // A causa de fundo era regex que exigiam hextetos presentes: `2002:h1:h2` não casava com a forma
  // COMPRIMIDA `2002:a00::1`. Agora há um parser de hextetos + descodificação do IPv4 embutido.
  const OITO = [
    "http://[2002:a00::1]/",      // 10.0.0.0
    "http://[2002:7f00::1]/",     // 127.0.0.0
    "http://[2002:c0a8::1]/",     // 192.168.0.0
    "http://[2002:ac10::1]/",     // 172.16.0.0
    "http://[2002:a9fe::1]/",     // 169.254.0.0  <-- METADATA CLOUD
    "http://[2002:64::1]/",       // 100.64.0.0   (CGNAT)
    "http://[2002:a::1]/",        // 10.0.0.0     (hexteto de 1 digito)
    "http://[2001:0:0:0:0:0:80ff:fffe]/", // Teredo -> 127.0.0.1 (XOR 0xffffffff)
  ];
  for (const alvo of OITO) {
    const host = new URL(alvo).hostname;
    assert.equal(isBlockedHostname(host), true, host + " NAO e bloqueado (6to4/Teredo)");
    assert.equal(passaria(alvo), "403", alvo + " ainda passa -> fetch");
  }
  // 6to4 com IPv4 PUBLICO tem de continuar a passar (nao e bloqueio cego do prefixo)
  for (const alvo of ["http://[2002:0808:0808::]/", "http://[2606:4700::1111]/"]) {
    assert.match(passaria(alvo), /^PASSA/, alvo + " — IPv6/6to4 PUBLICO foi bloqueado");
  }
  // e o desenho tem de usar o parser de hextetos, nao regex sobre a string
  const c = codigo(ler(FE + "/netlify/functions/img-proxy.mjs"));
  assert.match(c, /function hextetos/, "falta o parser de hextetos (a compressao e o que falhava)");
  assert.match(c, /he\[0\] === 0x2002/, "falta o bloco 6to4 explicito");
  assert.match(c, /he\[0\] === 0x2001 && he\[1\] === 0x0000/, "falta o bloco Teredo explicito");
});

test("MC99.5.2/SSRF · (a4) REGRESSÃO: um DOMINIO legitimo NAO e bloqueado", () => {
  // isBlockedIp é chamado TAMBEM com NOMES de dominio (última linha de isBlockedHostname). A 1.ª
  // versão do guard de intervalo nao distinguiu dominio de IPv6 e bloqueou i.imgur.com — o proxy
  // recusava TODAS as imagens. Apanhado pelos controlos POSITIVOS: «bloquear tudo» passa em todos
  // os controlos negativos e num teste só de payloads.
  for (const d of ["i.imgur.com", "cdn.jsdelivr.net", "exemplo.com", "a.b.c.d.com.br"]) {
    assert.equal(isBlockedHostname(d), false, d + " (dominio legitimo) foi BLOQUEADO");
  }
  for (const alvo of ["https://i.imgur.com/foto.png", "https://cdn.jsdelivr.net/x.png"]) {
    assert.match(passaria(alvo), /^PASSA/, alvo + " foi bloqueado — o proxy de imagens morreu");
  }
});

test("MC99.5.2/SSRF · (a3) o que NAO e bypass: userinfo com IP interno no username", () => {
  // `http://[::1]@evil.com/` tem hostname `evil.com`: o pedido vai para evil.com e a resolucao
  // DNS corre normalmente. Nao e SSRF — foi um falso alarme da minha propria lista de caca.
  assert.equal(passaria("http://[::1]@evil.com/"), "PASSA(dns corre)");
  assert.equal(new URL("http://[::1]@evil.com/").hostname, "evil.com");
});

test("MC99.5.2/SSRF · (b) as URLs LEGÍTIMAS continuam a passar (senão era bloqueio total)", () => {
  for (const alvo of ["https://i.imgur.com/foto.png", "https://exemplo.com/a.jpg"]) {
    assert.match(passaria(alvo), /^PASSA/, alvo + " foi bloqueado — bloqueio total nao e correccao");
  }
  assert.equal(isBlockedHostname("i.imgur.com"), false);
});

test("MC99.5.2/SSRF · (c) a correcção está na função PARTILHADA, não num chamador", () => {
  const c = codigo(ler(FE + "/netlify/functions/img-proxy.mjs"));
  assert.match(c, /replace\(\/\^\\\[\|\\\]\$\/g, ""\)/, "falta a normalização dos brackets");
  assert.match(c, /function hextetos/, "falta o parser de hextetos (4.ª geração)");
  assert.match(c, /he\[0\] === 0x2002/, "falta o bloco 6to4 explicito");
  assert.match(c, /he\[0\] === 0x2001 && he\[1\] === 0x0000/, "falta o bloco Teredo explicito");
  // o desenho novo ABANDONA a lista de prefixos: o que tem de estar la e o intervalo 2000::/3
  assert.match(c, /0x2000/, "falta o limite inferior do intervalo 2000::/3");
  assert.match(c, /0x3fff/, "falta o limite superior do intervalo 2000::/3");
  assert.ok(!/startsWith\("fe80"\)/.test(c), "voltou a lista de prefixos (fe80/fc/fd) que falhava nas familias");
  assert.match(c, /if \(!h\.includes\(":"\)\) return false;/, "falta o corte dominio-vs-IPv6 (bloqueava i.imgur.com)");
  // o guard dos brackets tem de estar DENTRO de isBlockedHostname
  const fn = c.slice(c.indexOf("export function isBlockedHostname"));
  assert.ok(fn.indexOf('replace(/^\\[|\\]$/g') < fn.indexOf("return isBlockedIp(h)"),
    "a normalização saiu de isBlockedHostname");
});

test("MC99.5.2/gate · (a) o texto legal está atrás de um botão (sem resumo), FECHADO por padrão", () => {
  const c = codigo(ler(FE + "/src/components/TermosConsentimento.jsx"));
  const det = c.match(/<details([^>]*)>/);
  assert.ok(det, "nao ha <details> — o texto voltou a estar sempre a vista");
  assert.ok(!/\bopen\b/.test(det[1]), "o <details> tem 'open': o texto mostrava-se por padrão");
  assert.equal((c.match(/<summary/g) || []).length, 1, "esperava exactamente 1 botao (summary)");
  assert.match(c, /Ler o regulamento completo/, "o botao perdeu o texto");
  assert.equal((c.match(/<\/details>/g) || []).length, 1, "details desequilibrado");
});

test("MC99.5.2/gate · (b) os 4 aceites ficam FORA do details e o texto expande a 100%", () => {
  const c = codigo(ler(FE + "/src/components/TermosConsentimento.jsx"));
  const abre = c.indexOf("<details");
  const fecha = c.indexOf("</details>");
  const cbs = c.indexOf("estilos.checkboxes");
  assert.ok(cbs > fecha, "os aceites ficaram DENTRO do details — escondidos quando fechado");
  // ao expandir, o texto tem de ser 100% visivel: a caixa segue sem maxHeight (heranca do MC99.5.1)
  const bloco = (c.match(/scrollBox:\s*\{([\s\S]*?)\n\s*\}/) || [])[1] || "";
  assert.ok(!/maxHeight|overflowY/.test(bloco), "ao expandir o texto voltaria a ser cortado");
  assert.ok(abre < cbs && fecha < cbs);
  assert.equal((c.match(/type="checkbox"/g) || []).length, 4);
});
