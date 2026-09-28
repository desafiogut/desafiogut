// MC31 — Guardas SSRF do proxy de imagem (_lib n/a; função img-proxy.mjs).
// Executar: node --test img-proxy.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlockedIp, isBlockedHostname } from "../img-proxy.mjs";
import handler, { resolverEEscolher } from "../img-proxy.mjs";

test("isBlockedIp: ranges privados/loopback/link-local são bloqueados", () => {
  for (const ip of [
    "127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "::1", "::",
    "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1",
  ]) {
    assert.equal(isBlockedIp(ip), true, `${ip} deveria ser bloqueado`);
  }
});

test("isBlockedIp: IPs públicos são permitidos", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "192.169.0.1", "2606:4700:4700::1111"]) {
    assert.equal(isBlockedIp(ip), false, `${ip} deveria ser permitido`);
  }
});

test("isBlockedHostname: nomes locais e IPs literais bloqueados", () => {
  for (const h of ["localhost", "foo.localhost", "db.internal", "printer.local", "127.0.0.1", "10.1.2.3"]) {
    assert.equal(isBlockedHostname(h), true, `${h} deveria ser bloqueado`);
  }
});

test("isBlockedHostname: hostnames públicos passam a guarda literal (resolução é à parte)", () => {
  for (const h of ["brendboom.ru", "images.example.com", "cdn.shopify.com"]) {
    assert.equal(isBlockedHostname(h), false, `${h} não deveria ser bloqueado pela guarda literal`);
  }
});

// ═══ MC99.5.3 (Opção A) — FAIXAS DE PROPÓSITO ESPECIAL ════════════════════════════════════
// Teste BIDIRECCIONAL (HARD GATE 8). Um teste que só diz «as 6 faixas são bloqueadas» fica verde
// também se a guarda passar a bloquear TUDO — e foi exactamente assim que a 1.ª geração deste
// guard bloqueou i.imgur.com. As três direcções vão no mesmo ficheiro, de propósito.
test("isBlockedIp: as faixas de propósito especial são bloqueadas (Opção A + as 3 do validador)", () => {
  for (const ip of [
    "192.0.0.1", "192.0.0.255",                 // 192.0.0.0/24   atribuições IETF
    "192.88.99.1", "192.88.99.255",             // 192.88.99.0/24 6to4 relay anycast
    "192.0.2.1", "192.0.2.255",                 // 192.0.2.0/24   TEST-NET-1 (RFC 5737)
    "198.18.0.0", "198.18.255.255",             // 198.18.0.0/15  benchmarking (RFC 2544)
    "198.19.0.1", "198.19.255.255",             // 198.18.0.0/15  (limite alto do /15)
    "198.51.100.1", "198.51.100.255",           // 198.51.100.0/24 TEST-NET-2 (RFC 5737)
    "203.0.113.1", "203.0.113.255",             // 203.0.113.0/24 TEST-NET-3 (RFC 5737)
    // MC99.5.3 — as 3 faixas irmãs que o validador adversarial mediu a passar (R15)
    "192.31.196.1", "192.31.196.255",           // 192.31.196.0/24 AS112-v4 (RFC 7534)
    "192.175.48.1", "192.175.48.255",           // 192.175.48.0/24 AS112 direct (RFC 7535)
    "192.52.193.1", "192.52.193.255",           // 192.52.193.0/24  AMT (RFC 7450)
  ]) {
    assert.equal(isBlockedIp(ip), true, `${ip} deveria ser bloqueado (faixa de propósito especial)`);
  }
});

// O COMPLEMENTO da correcção é o próximo ponto cego («a lista do autor»): se eu alargar as
// condições por engano (ex.: `a === 192 && b === 0` sem o `c`), estas caem e o app perde imagens
// legítimas. Cada linha abaixo é o vizinho IMEDIATO de uma faixa bloqueada.
test("isBlockedIp: o COMPLEMENTO das faixas continua permitido (a correcção não alarga demais)", () => {
  for (const ip of [
    "192.0.1.1",      // vizinho de 192.0.0.0/24 e de 192.0.2.0/24 (192.0.1.0/24 NÃO é reservado)
    "192.0.3.1",      // imediatamente depois de TEST-NET-1
    "192.88.98.1", "192.88.100.1",   // vizinhos de 192.88.99.0/24
    "192.169.0.1",    // 192.169.x.x é público (não confundir com 192.168/16)
    "198.17.255.255", "198.20.0.1",  // vizinhos de 198.18.0.0/15
    "198.51.99.255", "198.51.101.1", // vizinhos de 198.51.100.0/24
    "203.0.112.255", "203.0.114.1",  // vizinhos de 203.0.113.0/24
    "192.31.195.255", "192.31.197.1",   // vizinhos de 192.31.196.0/24 (AS112)
    "192.175.47.255", "192.175.49.1",   // vizinhos de 192.175.48.0/24 (AS112)
    "192.52.192.255", "192.52.194.1",   // vizinhos de 192.52.193.0/24 (AMT)
  ]) {
    assert.equal(isBlockedIp(ip), false, `${ip} NÃO é reservado — bloquear aqui é regressão`);
  }
});

test("isBlockedHostname: CDNs legítimos continuam a passar (controlo positivo da Opção A)", () => {
  for (const h of ["i.imgur.com", "cdn.jsdelivr.net", "images.unsplash.com", "res.cloudinary.com"]) {
    assert.equal(isBlockedHostname(h), false, `${h} bloqueado — regressão (controlo positivo)`);
  }
});

test("isBlockedHostname: a metadata cloud e o loopback continuam bloqueados (não regrediu)", () => {
  for (const h of ["169.254.169.254", "127.0.0.1", "192.0.2.1", "198.18.0.1", "203.0.113.9"]) {
    assert.equal(isBlockedHostname(h), true, `${h} deveria continuar bloqueado`);
  }
});

// ═══ MC99.5.3 — O SÍTIO DE CHAMADA (o ponto cego que o VALIDADOR provou) ═══════════════════
// O validador adversarial deste MC mediu 2 mutantes que este ficheiro deixava **VERDES** — código
// VIVO, não obsoleto (VÁCUO na suíte), com prova de buraco real:
//   C1  remover `if (isBlockedHostname(u.hostname)) return texto(403,…)` do HANDLER  -> 8/8 verde
//   C2  remover `isBlockedIp(r.address)` de `resolverEEscolher`                      -> 8/8 verde
//       (com C2 aplicado, `http://127.0.0.1.nip.io:<porta>/x.png` chegou a `200` = SSRF VIVO)
// Causa: as 8 asserções exercitavam `isBlockedIp`/`isBlockedHostname` directamente, **nunca o
// handler nem `resolverEEscolher`**. As 2 asserções abaixo fecham essa cegueira. Nenhuma precisa de
// rede externa: o guard recusa antes de qualquer `fetch` e `localhost` resolve pelo ficheiro hosts.
test("SÍTIO DE CHAMADA · o handler REAL recusa um alvo bloqueado com 403 (não 502 — 502 seria deixar passar)", async () => {
  for (const alvo of ["http://127.0.0.1/x.png", "http://192.0.2.1/x.png", "http://[::1]/x.png", "http://10.0.0.1/x.png"]) {
    const r = await handler(new Request("http://localhost/.netlify/functions/img-proxy?url=" + encodeURIComponent(alvo)));
    assert.equal(r.status, 403, `${alvo}: o handler devolveu ${r.status} — se for 502, a guarda deixou passar`);
  }
});

test("SÍTIO DE CHAMADA · resolverEEscolher recusa um NOME que resolve para loopback (a 2.ª porta)", async () => {
  const d = await resolverEEscolher("localhost");
  assert.equal(d.bloqueado, true, "um nome que resolve para 127.0.0.1 passou a decisão da ligação");
  assert.equal(d.pin, null, "não pode haver endereço fixado quando está bloqueado");
});
