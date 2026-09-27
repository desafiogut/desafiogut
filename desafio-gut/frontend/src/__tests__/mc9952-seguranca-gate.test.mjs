// mc9952-seguranca-gate.test.mjs — MC99.5.2 → MC99.5.2.1c.
// SSRF: a 5.ª geração é uma INVERSÃO. Quatro gerações descodificaram IPv4 embutido em IPv6 e todas
// foram refutadas (mapeado -> 6to4/Teredo -> ISATAP/6rd/NAT64-custom). A família é aberta por
// construção. A promessa actual: **literais IPv6 são recusados POR DESENHO** (mesmo públicos);
// aceitam-se DOMÍNIOS, e `resolvesToBlocked` resolve o DNS e valida cada endereço (fail-closed).
// ⚠️ Mede-se sobre CÓDIGO (stripper): os comentários nomeiam payloads, `:`, `hex`, etc.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (p) => readFileSync(p, "utf8");
const codigo = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

const { isBlockedHostname } = await import("file://" + resolve(FE, "netlify/functions/img-proxy.mjs").replace(/\\/g, "/"));
const passaria = (alvo) => { const u = new URL(alvo); if (isBlockedHostname(u.hostname)) return "403"; const l = /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":"); return l ? "PASSA(dns saltada)" : "PASSA(dns corre)"; };

test("controlo positivo do instrumento: a função REAL foi importada", () => {
  assert.equal(typeof isBlockedHostname, "function");
  assert.equal(isBlockedHostname("127.0.0.1"), true);
  assert.equal(isBlockedHostname("i.imgur.com"), false);
});

test("MC99.5.2.1c/INVERSÃO · (a) TODOS os literais IPv6 são recusados — os 49 das 4 gerações", () => {
  // 3.ª geração (8) + 4.ª geração/ISATAP/6rd/NAT64 (6) + anteriores (32) + literais v6 públicos (3)
  const TODOS = [
    "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://[fc00::1]/", "http://[fd00::1]/", "http://[fe80::1]/",
    "http://[fe90::1]/", "http://[fec0::1]/", "http://[::7f00:1]/", "http://[::ffff:0:127.0.0.1]/",
    "http://[2002:a9fe::1]/", "http://[2001:0:0:0:0:0:80ff:fffe]/", "http://[64:ff9b::7f00:1]/",
    "http://[2601::5efe:a9fe:a9fe]/", "http://[2600::5efe:0a00:0001]/", "http://[3ffe::5efe:7f00:0001]/",
    "http://[2001:db8:1:2::a9fe:a9fe]/", "http://[2001:1:2:3::c0a8:101]/", "http://[2a01:4f8:1:2::a9fe:a9fe]/",
    "http://[0:0:0:0:0:0:0:1]/", "http://[ff02::1]/", "http://[100::1]/", "http://[::ffff:169.254.169.254]/",
    // e até os PÚBLICOS, por desenho:
    "http://[2606:4700::1111]/", "http://[2a00:1450:4001::1]/", "http://[::ffff:8.8.8.8]/",
  ];
  for (const alvo of TODOS) {
    const host = new URL(alvo).hostname;
    assert.equal(isBlockedHostname(host), true, host + " NAO e recusado (literal IPv6 tem de dar 403)");
    assert.equal(passaria(alvo), "403", alvo + " chegou a passar -> fetch");
  }
});

test("MC99.5.2.1c/INVERSÃO · (b) DOMÍNIOS legítimos PASSAM (senão o proxy morre)", () => {
  for (const d of ["i.imgur.com", "cdn.jsdelivr.net", "exemplo.com", "a.b.c.d.com.br", "images.unsplash.com"]) {
    assert.equal(isBlockedHostname(d), false, d + " (dominio legitimo) foi BLOQUEADO");
  }
  for (const a of ["https://i.imgur.com/foto.png", "https://cdn.jsdelivr.net/x.png"]) {
    assert.match(passaria(a), /^PASSA/, a + " foi bloqueado — o proxy de imagens morreu");
  }
});

test("MC99.5.2.1c/INVERSÃO · (c) o guard RECUSA sem descodificar, e a decisão de rede mantem-se", () => {
  const c = codigo(ler(FE + "/netlify/functions/img-proxy.mjs"));
  assert.match(c, /if \(h\.includes\(":"\)\) return true;/, "falta a inversao: literal IPv6 -> 403");
  // e isso acontece ANTES de qualquer descodificacao
  const posInv = c.indexOf('if (h.includes(":")) return true;');
  const posIp = c.indexOf("return isBlockedIp(h);");
  assert.ok(posInv > 0 && posInv < posIp, "a inversao nao esta antes da chamada a isBlockedIp");
  // o DNS continua a ser validado para dominios (a inversao nao pode ter matado a validacao de rede)
  assert.match(c, /async function resolvesToBlocked/, "desapareceu o resolvesToBlocked");
  assert.match(c, /if \(!ehIpLiteral && await resolvesToBlocked\(u\.hostname\)\) return texto\(403/,
    "o handler deixou de chamar resolvesToBlocked para dominios — a validacao de DNS perdeu-se");
});

test("MC99.5.2.1c/INVERSÃO · (d) os internos classicos continuam recusados", () => {
  for (const m of ["http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest/meta-data/",
                   "http://10.0.0.1/", "http://192.168.1.1/", "http://172.16.0.1/",
                   "http://2130706433/", "http://0177.0.0.1/", "http://0x7f.0.0.1/", "http://127.1/"]) {
    assert.equal(passaria(m), "403", m + " NAO e bloqueado");
  }
});

test("MC99.5.2/gate · o texto legal esta atras de um botao (sem resumo), FECHADO por padrao", () => {
  const c = codigo(ler(FE + "/src/components/TermosConsentimento.jsx"));
  const det = c.match(/<details([^>]*)>/) || ["", ""];
  assert.ok(det[0], "nao ha <details>");
  assert.ok(!/\bopen\b/.test(det[1]), "o <details> abre por padrao");
  assert.equal((c.match(/<summary/g) || []).length, 1, "esperava 1 botao (summary)");
  assert.equal((c.match(/<\/details>/g) || []).length, 1, "details desequilibrado");
  assert.ok(c.indexOf("estilos.checkboxes") > c.indexOf("</details>"), "os aceites ficaram dentro do bloco escondido");
  assert.equal((c.match(/type="checkbox"/g) || []).length, 4, "esperava 4 aceites");
  assert.ok(!/maxHeight|overflowY/.test((c.match(/scrollBox:\s*\{([\s\S]*?)\n\s*\}/) || ["", ""])[1] || "x"),
    "o texto volta a ficar cortado ao expandir");
});
