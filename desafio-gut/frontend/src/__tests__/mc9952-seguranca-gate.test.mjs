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

test("MC99.5.2/SSRF · (a2) IPv4 EMBUTIDO em IPv6 — as 3 famílias achadas ao caçar 17 payloads", () => {
  // A 1.ª correcção fechou só o IPv4-mapeado. Ao caçar, apareceram mais 3 famílias que saltavam
  // o DNS: IPv4-traduzido, 6to4 e NAT64.
  // ⚠️ Mede-se sobre o hostname JÁ NORMALIZADO pelo URL — que é o que a função recebe em produção.
  // A 1.ª versão deste teste passava a forma decimal pontuada escrita à mão e dava RED a um código
  // correcto: `new URL("http://[::ffff:0:127.0.0.1]/").hostname` é "[::ffff:0:7f00:1]" (hex).
  for (const alvo of ["http://[::ffff:0:127.0.0.1]/", "http://[2002:7f00:1::]/", "http://[64:ff9b::7f00:1]/"]) {
    const host = new URL(alvo).hostname;
    assert.equal(isBlockedHostname(host), true, host + " NAO e bloqueado (familia de IPv4 embutido)");
    assert.equal(passaria(alvo), "403", alvo + " ainda passa (DNS saltada)");
  }
  // e um IPv4-mapeado PUBLICO continua a passar — nao e bloqueio cego da familia.
  // Tambem pela via real (o URL normaliza 8.8.8.8 para hex: [::ffff:808:808]).
  const pub = new URL("http://[::ffff:8.8.8.8]/").hostname;
  assert.equal(isBlockedHostname(pub), false, "bloqueou um IPv4-mapeado PUBLICO: " + pub);
  assert.match(passaria("http://[::ffff:8.8.8.8]/"), /^PASSA/);
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
  assert.match(c, /const emb = h\.match/, "falta a descodificacao do IPv4 embutido");
  assert.match(c, /64:ff9b::/, "falta a familia NAT64");
  assert.match(c, /2002:/, "falta a familia 6to4");
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
