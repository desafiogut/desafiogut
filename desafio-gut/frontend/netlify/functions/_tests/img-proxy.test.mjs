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
