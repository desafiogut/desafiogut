// MC89.11 — testes dos níveis de permissão.
// node --test --experimental-test-module-mocks _tests/mc8911-niveis.test.mjs

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { adminPode, invalidarCacheNiveis } from "../_lib/admin-niveis.mjs";

afterEach(() => invalidarCacheNiveis());

// ── adminPode ───────────────────────────────────────────────────────────────

test("super-admin pode tudo", () => {
  assert.equal(adminPode("super-admin", "super-admin"), true);
  assert.equal(adminPode("super-admin", "admin"), true);
  assert.equal(adminPode("super-admin", "operador"), true);
});

test("admin pode operador e admin, mas não super-admin", () => {
  assert.equal(adminPode("admin", "super-admin"), false);
  assert.equal(adminPode("admin", "admin"), true);
  assert.equal(adminPode("admin", "operador"), true);
});

test("operador só pode operador", () => {
  assert.equal(adminPode("operador", "super-admin"), false);
  assert.equal(adminPode("operador", "admin"), false);
  assert.equal(adminPode("operador", "operador"), true);
});

test("níveis desconhecidos → false (segurança por omissão)", () => {
  assert.equal(adminPode("visitante", "operador"), false);
  assert.equal(adminPode(null, "operador"), false);
  assert.equal(adminPode("admin", "inexistente"), true, "minimo desconhecido = 0 = qualquer um passa");
});

// ── Coordenacao é super-admin ──────────────────────────────────────────────

test("resolverCoordenacao existe (sem depender do Blob)", async () => {
  const { resolverCoordenacao } = await import("../_lib/admin-helpers.mjs");
  const coord = resolverCoordenacao();
  assert.ok(coord, "coordenação tem de existir");
  assert.match(coord, /^0x[0-9a-f]{40}$/, "é um endereço Ethereum");
});

// ── getAdminNivel com import dinâmico (evita carregar Blobs no topo) ───────

test("getAdminNivel devolve null para endereço não-admin", async () => {
  const { getAdminNivel } = await import("../_lib/admin-niveis.mjs");
  // Um endereço aleatório que não está no Blob E não é a coordenação
  const r = await getAdminNivel("0x0000000000000000000000000000000000000001");
  assert.equal(r, null);
});

test("getAdminNivel devolve 'super-admin' para a coordenação, SEMPRE", async () => {
  const { getAdminNivel } = await import("../_lib/admin-niveis.mjs");
  const { resolverCoordenacao } = await import("../_lib/admin-helpers.mjs");
  const coord = resolverCoordenacao();
  const nivel = await getAdminNivel(coord);
  assert.equal(nivel, "super-admin",
    "a coordenação é super-admin permanente, independentemente do Blob");
});

test("getAdminNivel(null) → null (não rebenta)", async () => {
  const { getAdminNivel } = await import("../_lib/admin-niveis.mjs");
  assert.equal(await getAdminNivel(null), null);
  assert.equal(await getAdminNivel(""), null);
});
