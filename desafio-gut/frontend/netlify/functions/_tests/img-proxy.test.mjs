// MC31 — Guardas SSRF do proxy de imagem (_lib n/a; função img-proxy.mjs).
// Executar: node --test img-proxy.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlockedIp, isBlockedHostname } from "../img-proxy.mjs";

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
test("isBlockedIp: as 6 faixas de propósito especial são bloqueadas (Opção A)", () => {
  for (const ip of [
    "192.0.0.1", "192.0.0.255",                 // 192.0.0.0/24   atribuições IETF
    "192.88.99.1", "192.88.99.255",             // 192.88.99.0/24 6to4 relay anycast
    "192.0.2.1", "192.0.2.255",                 // 192.0.2.0/24   TEST-NET-1 (RFC 5737)
    "198.18.0.0", "198.18.255.255",             // 198.18.0.0/15  benchmarking (RFC 2544)
    "198.19.0.1", "198.19.255.255",             // 198.18.0.0/15  (limite alto do /15)
    "198.51.100.1", "198.51.100.255",           // 198.51.100.0/24 TEST-NET-2 (RFC 5737)
    "203.0.113.1", "203.0.113.255",             // 203.0.113.0/24 TEST-NET-3 (RFC 5737)
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
