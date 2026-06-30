// MC39.22.3 — EX-4 Fase A: testa a instrumentação do financeiro-fallback.
// Garante que a instrumentação (1) NÃO altera o valor lido (R1), (2) loga `[EX-4]`
// só no HIT (retorno não-nulo), (3) NÃO vaza endereço/chave (PII — R9), e (4) é
// fail-soft (erro no breadcrumb não quebra a leitura). @netlify/blobs e o Sentry
// são mockados; o módulo real é exercitado.
// node --test --experimental-test-module-mocks _tests/ex4-instrumentacao.test.mjs
import { test, mock, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

let valorStub = null;          // o que o "Blob" devolve (null = miss; objeto = HIT)
let breadcrumbThrows = false;  // simula falha na instrumentação (testa fail-soft)
const breadcrumbs = [];

mock.module("@netlify/blobs", {
  namedExports: { getStore: () => ({ get: async () => valorStub }) },
});
mock.module("../_lib/sentry-server.mjs", {
  namedExports: {
    Sentry: {
      addBreadcrumb: (c) => { if (breadcrumbThrows) throw new Error("boom"); breadcrumbs.push(c); },
    },
  },
});

let fb;
before(async () => { fb = await import("../_lib/financeiro-fallback.mjs"); });

let warns;
let origWarn;
beforeEach(() => {
  warns = []; valorStub = null; breadcrumbThrows = false; breadcrumbs.length = 0;
  origWarn = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(" "));
});
afterEach(() => { console.warn = origWarn; });

const ADDR = "0xAbc0000000000000000000000000000000000abc";

test("HIT: retorna o valor (comportamento preservado), loga [EX-4] e NÃO vaza endereço", async () => {
  valorStub = { saldoCentavos: 400 };
  const out = await fb.lerSaldoLegado(ADDR);
  assert.deepEqual(out, { saldoCentavos: 400 }); // R1 — valor inalterado
  const hit = warns.find((w) => w.includes("[EX-4]"));
  assert.ok(hit, "esperava log [EX-4] no HIT");
  assert.match(hit, /lerSaldoLegado/);
  assert.match(hit, /saldo-rs/);
  assert.ok(!hit.includes(ADDR) && !hit.toLowerCase().includes("0xabc"), "endereço NÃO pode aparecer no log (PII)");
  const bc = breadcrumbs.find((b) => b.message?.includes("HIT"));
  assert.ok(bc && bc.level === "warning", "breadcrumb HIT deve ser warning");
  assert.ok(!("endereco" in (bc?.data || {})) && !("key" in (bc?.data || {})), "breadcrumb sem PII");
});

test("miss: retorna null e NÃO loga [EX-4] no console (sem ruído em hot path)", async () => {
  valorStub = null;
  const out = await fb.lerCreditoLegado("pedido-x");
  assert.equal(out, null);
  assert.ok(!warns.some((w) => w.includes("[EX-4]")), "miss não deve logar [EX-4]");
  const bc = breadcrumbs.find((b) => b.message?.includes("miss"));
  assert.ok(bc && bc.level === "info", "miss gera breadcrumb info (best-effort)");
});

test("fail-soft: erro na instrumentação NÃO quebra a leitura (R1)", async () => {
  breadcrumbThrows = true;
  valorStub = { saldoCentavos: 999 };
  const out = await fb.lerWalletLegado(ADDR);
  assert.deepEqual(out, { saldoCentavos: 999 }, "leitura preservada apesar do erro na instrumentação");
});
