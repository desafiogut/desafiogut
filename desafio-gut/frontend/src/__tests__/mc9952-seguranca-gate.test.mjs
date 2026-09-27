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
  // MC99.5.2.1e — o `[^:"'`\\]` (acrescentado o `\`) evita comer CÓDIGO real: sem ele, a barra
  // de `/^image\//i` conta como início de comentário e a linha desaparecia do texto medido —
  // a régua comia o alvo (classe «asserção mais estreita/mais larga que o alvo»).
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`\\])\/\/.*$/, "$1")).join("\n");

const { isBlockedHostname, isBlockedIp } = await import("file://" + resolve(FE, "netlify/functions/img-proxy.mjs").replace(/\\/g, "/"));
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
  // MC99.5.2.1e — a validação de rede NÃO se perdeu: mudou de SÍTIO. Deixou de ser um pré-check
  // de DNS seguido de um `fetch` que resolve OUTRA VEZ (duas resoluções independentes = TOCTOU,
  // e foi por aí que o «nome prefixado» passou) e passou a acontecer DENTRO da ligação, no
  // `connect.lookup` do dispatcher — o conector usa o endereço que NÓS autorizámos.
  assert.match(c, /async function resolverEEscolher/, "desapareceu o resolverEEscolher (a decisao de rede)");
  assert.match(c, /const agenteValidado = new Agent\(\{ connect: \{ lookup: lookupValidado \} \}\)/,
    "desapareceu o dispatcher com lookup proprio — a validacao na ligacao perdeu-se");
  assert.match(c, /dispatcher: agenteValidado/, "o fetch deixou de passar o dispatcher validado");
  assert.ok(!/await resolvesToBlocked\(u\.hostname\)\) return texto\(403/.test(c),
    "voltou o pre-check de DNS separado do fetch — sao DUAS resolucoes (TOCTOU reaberto)");
});

test("MC99.5.2.1c/INVERSÃO · (d) os internos classicos continuam recusados", () => {
  for (const m of ["http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest/meta-data/",
                   "http://10.0.0.1/", "http://192.168.1.1/", "http://172.16.0.1/",
                   "http://2130706433/", "http://0177.0.0.1/", "http://0x7f.0.0.1/", "http://127.1/"]) {
    assert.equal(passaria(m), "403", m + " NAO e bloqueado");
  }
});

test("MC99.5.2.1d → 1e/DNS · (f) caminho do DNS: AAAA-only bloqueado, dominios legitimas passam", async () => {
  // A lacuna que o 5.º validador explorou: o caminho do DNS nao tinha teste, e o sslip.io (DNS
  // PUBLICO que codifica o endereco no nome) chegava ao fetch. Decisao do operador (R18) na 6.ª
  // geração: ignorar AAAA e validar A. ⚠️ ESSA regra FOI REFUTADA (MC99.5.2.1e) pelo «nome
  // prefixado» (A publico + AAAA interno: o A validado passou e o fetch ligou-se ao AAAA). O que
  // sobrevive dela — e continua a ser exigido — é o que este teste mede: sslip.io AAAA-only
  // bloqueado e os domínios legítimos a passar. A decisão de AAAA passou a ser por-endereço.
  const { resolvesToBlocked } = await import("file://" + resolve(FE, "netlify/functions/img-proxy.mjs").replace(/\\/g, "/"));
  assert.equal(typeof resolvesToBlocked, "function", "resolvesToBlocked tem de estar exportada para ser testavel");
  // (a) o ataque: sslip.io resolve SO para o endereco embutido -> sem IPv4 -> bloqueado
  for (const host of ["2601--5efe-a9fe-a9fe.sslip.io", "2600--5efe-0a00-0001.sslip.io", "--1.sslip.io"]) {
    assert.equal(await resolvesToBlocked(host), true, host + " NAO e bloqueado (exploit do DNS reaberto)");
  }
  // (b) dominios legitimos: PASSA (o CDN dual-stack tem de continuar a funcionar)
  for (const host of ["i.imgur.com", "cdn.jsdelivr.net", "exemplo.com"]) {
    assert.equal(await resolvesToBlocked(host), false, host + " foi BLOQUEADO (o proxy de imagens morre)");
  }
  // (c) o desenho: autoriza CADA endereco devolvido e isola os IPv4 para fixar
  const c = codigo(ler(FE + "/netlify/functions/img-proxy.mjs"));
  assert.match(c, /const v4 = results\.filter\(\(r\) => !r\.address\.includes\(":"\)\)/,
    "falta o filtro que isola os IPv4");
  assert.match(c, /algumNaoAutorizado = results\.some\(/,
    "o guard deixou de autorizar CADA endereco devolvido (validacao de rede perdida)");
  assert.match(c, /isBlockedIp\(r\.address\)/, "o isBlockedIp deixou de ser aplicado aos enderecos do DNS");
});

test("MC99.5.2.1e/7.ª GERAÇÃO · (g) o «nome prefixado» deixou de passar, e a ligação é FIXADA", async () => {
  // O ataque que REFUTOU a 6.ª geração: um A público (isca que a validação aprova) + um AAAA
  // interno (o alvo, escolhido pela 2.ª resolução do próprio fetch). Agora resolve-se UMA vez, e
  // o endereço que o conector usa é o que NÓS devolvemos — o fetch já não escolhe.
  const { resolverEEscolher } = await import("file://" + resolve(FE, "netlify/functions/img-proxy.mjs").replace(/\\/g, "/"));
  assert.equal(typeof resolverEEscolher, "function", "resolverEEscolher tem de estar exportada (a decisao que a ligacao usa)");
  // (a) os nomes prefixados que antes passavam -> bloqueados, e SEM endereço para fixar.
  //     Inclui as FAMÍLIAS DE TRANSIÇÃO, cada uma com a mesma isca A pública: era esta a
  //     cobertura que faltava (as mutações do 6to4/Teredo ficavam OBSOLETAS por ninguém as medir).
  for (const host of [
    "1-1-1-1.--1.sslip.io",                          // AAAA ::1                      (o ataque que refutou a 6.ª)
    "1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io",         // AAAA ISATAP  -> 169.254.169.254 (metadata)
    "1-1-1-1.fd00-ec2--254.sslip.io",                // AAAA fd00:ec2::254              (metadata AWS v6)
    "1-1-1-1.2002-a9fe-a9fe--1.sslip.io",            // AAAA 6to4    -> 169.254.169.254 (metadata)
    "1-1-1-1.2001-0-0-0-0-0-80ff-fffe.sslip.io",     // AAAA Teredo  -> 127.0.0.1
    "1-1-1-1.64-ff9b--7f00-1.sslip.io",              // AAAA NAT64   -> 127.0.0.1
  ]) {
    const d = await resolverEEscolher(host);
    assert.equal(d.bloqueado, true, host + " NAO e bloqueado — o ataque do nome prefixado esta aberto outra vez");
    assert.equal(d.pin, null, host + " foi bloqueado mas devolveu um endereco para fixar");
  }
  // (b) legítimos dual-stack: passam E devolvem um IPv4 PÚBLICO — é esse endereço que a ligação usa
  for (const host of ["cdn.jsdelivr.net", "i.imgur.com", "exemplo.com"]) {
    const d = await resolverEEscolher(host);
    assert.equal(d.bloqueado, false, host + " foi BLOQUEADO (o proxy de imagens morre)");
    assert.match(String(d.pin), /^\d+\.\d+\.\d+\.\d+$/, host + " nao devolveu um IPv4 publico para fixar: " + d.pin);
    assert.equal(isBlockedIp(d.pin), false, host + " devolveu para fixar um endereco que a guarda considera bloqueado: " + d.pin);
  }
  // (c) o desenho: UM Agent com lookup PRÓPRIO que devolve o endereço fixado (a ligação não resolve)
  const c = codigo(ler(FE + "/netlify/functions/img-proxy.mjs"));
  assert.match(c, /connect: \{ lookup: lookupValidado \}/, "falta o connect.lookup — a decisao deixou de estar na ligacao");
  assert.match(c, /callback\(null, \[\{ address: pin, family: pin\.includes\(":"\) \? 6 : 4 \}\]\)/,
    "o lookup deixou de devolver o endereco FIXADO (volta a haver resolucao propria no fetch)");
  assert.match(c, /if \(bloqueado\) return callback\(new Error\(HOST_BLOQUEADO\)\)/,
    "o lookup deixou de RECUSAR na ligacao (a decisao passou a ser so informativa)");
  assert.ok(!/await resolvesToBlocked\(u\.hostname\)\) return texto\(403/.test(c),
    "ha um pre-check de DNS separado do fetch — sao DUAS resolucoes (TOCTOU)");
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
