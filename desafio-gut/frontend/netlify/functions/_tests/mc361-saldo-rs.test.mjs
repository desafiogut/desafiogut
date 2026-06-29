// MC36.1 — Testes do saldo R$ off-chain (saldoRs.mjs) sobre Supabase (mock do store).
// Cobre o caminho usado pelo fluxo de lance (lance-relampago → debitarSaldoRs):
// crédito idempotente, débito suficiente/insuficiente, reembolso. Escrita só Supabase.
// node --test --experimental-test-module-mocks _tests/mc361-saldo-rs.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// mock saldoRs-store (Supabase) em memória
const saldoMem  = new Map(); // cliente_id -> payload { centavos, atualizadoEm }
const creditMem = new Map(); // pedido_id -> payload
mock.module("../_lib/saldoRs-store.mjs", {
  namedExports: {
    getSaldo:   async (id) => saldoMem.get(String(id)) ?? null,
    setSaldo:   async (id, payload) => { saldoMem.set(String(id), payload); },
    // CAS atômico simulado (MC39.17.2 B-P1-3): só troca se o saldo atual ainda
    // for o valor esperado — espelha o UPDATE … WHERE payload->>centavos=$ do Postgres.
    casSaldo:   async (id, expected, payload) => {
      const cur  = saldoMem.get(String(id));
      const curC = Math.floor(Number(cur?.centavos ?? 0));
      if (curC !== Math.floor(Number(expected))) return false;
      saldoMem.set(String(id), payload);
      return true;
    },
    getCredito: async (pid) => creditMem.get(String(pid)) ?? null,
    setCredito: async (pid, payload) => { creditMem.set(String(pid), payload); },
    getDebito:  async () => null,
    setDebito:  async () => {},
  },
});
// fallback de leitura vazio (nada nos Blobs legados durante o teste)
mock.module("../_lib/financeiro-fallback.mjs", {
  namedExports: { lerSaldoLegado: async () => null, lerCreditoLegado: async () => null },
});

let saldo;
before(async () => { saldo = await import("../_lib/saldoRs.mjs"); });
beforeEach(() => { saldoMem.clear(); creditMem.clear(); });

const ADDR = "0xAbc0000000000000000000000000000000000abc";

test("credita R$ e lê saldo", async () => {
  const r = await saldo.creditarSaldoRsIdempotente({ pedidoId: "pix1", endereco: ADDR, valorCentavos: 5000, fonte: "teste" });
  assert.equal(r.ok, true);
  assert.equal(r.idempotent, false);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 5000);
});

test("crédito idempotente por pedidoId não duplica", async () => {
  await saldo.creditarSaldoRsIdempotente({ pedidoId: "pix2", endereco: ADDR, valorCentavos: 3000 });
  const r2 = await saldo.creditarSaldoRsIdempotente({ pedidoId: "pix2", endereco: ADDR, valorCentavos: 3000 });
  assert.equal(r2.idempotent, true);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 3000); // não 6000
});

test("débito com saldo suficiente (fluxo de lance) debita", async () => {
  await saldo.creditarSaldoRsIdempotente({ pedidoId: "pix3", endereco: ADDR, valorCentavos: 1000 });
  const d = await saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 400, motivo: "lance-R1" });
  assert.equal(d.ok, true);
  assert.equal(d.resultado.saldoDepoisCentavos, 600);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 600);
});

test("débito com saldo insuficiente bloqueia sem alterar saldo", async () => {
  await saldo.creditarSaldoRsIdempotente({ pedidoId: "pix4", endereco: ADDR, valorCentavos: 200 });
  const d = await saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 500, motivo: "lance-R1" });
  assert.equal(d.ok, false);
  assert.equal(d.code, "saldo_insuficiente");
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 200); // intacto
});

test("reembolso devolve ao saldo (compensação pós-falha de lance)", async () => {
  await saldo.creditarSaldoRsIdempotente({ pedidoId: "pix5", endereco: ADDR, valorCentavos: 1000 });
  await saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 1000, motivo: "lance-R1" });
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 0);
  const r = await saldo.reembolsarSaldoRs({ endereco: ADDR, valorCentavos: 1000, motivo: "lance-falhou" });
  assert.equal(r.ok, true);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 1000);
});

// B-P1-3 (MC39.17.2) — atomicidade: 3 débitos concorrentes de 400 sobre saldo
// 1000 não podem todos vencer (double-spend). Exatamente 2 debitam (→ 200) e o
// 3º falha (saldo_insuficiente OU conflito_concorrencia). O saldo nunca fica < 0.
test("débito concorrente é atômico (anti double-spend via CAS)", async () => {
  await saldo.creditarSaldoRsIdempotente({ pedidoId: "pixC", endereco: ADDR, valorCentavos: 1000 });
  const resultados = await Promise.all([
    saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 400, motivo: "conc-1" }),
    saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 400, motivo: "conc-2" }),
    saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 400, motivo: "conc-3" }),
  ]);
  const ok    = resultados.filter((r) => r.ok).length;
  const falha = resultados.filter((r) => !r.ok);
  assert.equal(ok, 2, "exatamente 2 débitos de 400 cabem em 1000");
  assert.equal(falha.length, 1);
  assert.ok(["saldo_insuficiente", "conflito_concorrencia"].includes(falha[0].code));
  const saldoFinal = await saldo.lerSaldoRsCentavos(ADDR);
  assert.equal(saldoFinal, 200, "saldo final = 1000 - 2*400");
  assert.ok(saldoFinal >= 0);
});
