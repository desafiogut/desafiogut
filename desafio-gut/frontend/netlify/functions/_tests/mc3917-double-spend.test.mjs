// MC39.17.3 — B-P1-3: teste dedicado de double-spend do débito atômico (CAS).
// Cobre, de forma determinística, o que a concorrência real produz:
//   - escrita concorrente entre leitura e CAS → retry relê e debita certo (sem double-spend);
//   - contenção que esgota as tentativas → conflito_concorrencia, saldo intacto;
//   - dois débitos que somados estouram o saldo → só os que cabem vencem.
// node --test --experimental-test-module-mocks _tests/mc3917-double-spend.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const saldoMem = new Map(); // cliente_id -> { centavos, atualizadoEm }
let injetarAntesDoCas = null; // hook 1x: simula escrita concorrente entre read e CAS
let casSempreFalha = false;   // simula contenção perpétua

mock.module("../_lib/saldoRs-store.mjs", {
  namedExports: {
    getSaldo: async (id) => saldoMem.get(String(id)) ?? null,
    setSaldo: async (id, payload) => { saldoMem.set(String(id), payload); },
    casSaldo: async (id, expected, payload) => {
      if (injetarAntesDoCas) { const f = injetarAntesDoCas; injetarAntesDoCas = null; await f(); }
      if (casSempreFalha) return false;
      const cur = saldoMem.get(String(id));
      const curC = Math.floor(Number(cur?.centavos ?? 0));
      if (curC !== Math.floor(Number(expected))) return false; // CAS perdeu
      saldoMem.set(String(id), payload);
      return true;
    },
    getCredito: async () => null,
    setCredito: async () => {},
    getDebito: async () => null,
    setDebito: async () => {},
  },
});
mock.module("../_lib/financeiro-fallback.mjs", {
  namedExports: { lerSaldoLegado: async () => null, lerCreditoLegado: async () => null },
});

let saldo;
before(async () => { saldo = await import("../_lib/saldoRs.mjs"); });
beforeEach(() => { saldoMem.clear(); injetarAntesDoCas = null; casSempreFalha = false; });

const ADDR = "0xDdd0000000000000000000000000000000000ddd";

test("retry após escrita concorrente entre read e CAS (sem double-spend)", async () => {
  saldoMem.set(ADDR.toLowerCase(), { centavos: 1000 });
  // Um competidor debita 300 (1000→700) exatamente entre a leitura e o CAS desta operação.
  injetarAntesDoCas = async () => { saldoMem.set(ADDR.toLowerCase(), { centavos: 700 }); };
  const d = await saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 600, motivo: "ds-1" });
  assert.equal(d.ok, true);
  // 1ª tentativa: lê 1000, CAS espera 1000 mas já é 700 → falha; relê 700, debita → 100.
  assert.equal(d.resultado.saldoDepoisCentavos, 100);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 100); // 1000 - 300(competidor) - 600 = 100
});

test("contenção perpétua esgota tentativas → conflito_concorrencia, saldo intacto", async () => {
  saldoMem.set(ADDR.toLowerCase(), { centavos: 1000 });
  casSempreFalha = true;
  const d = await saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 100, motivo: "ds-2" });
  assert.equal(d.ok, false);
  assert.equal(d.code, "conflito_concorrencia");
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 1000); // nada debitado
});

test("dois débitos de 500 sobre saldo 500 → exatamente um vence (anti double-spend)", async () => {
  saldoMem.set(ADDR.toLowerCase(), { centavos: 500 });
  const [a, b] = await Promise.all([
    saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 500, motivo: "ds-3a" }),
    saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 500, motivo: "ds-3b" }),
  ]);
  const oks = [a, b].filter((r) => r.ok).length;
  assert.equal(oks, 1, "só um débito de 500 cabe em 500");
  const falha = [a, b].find((r) => !r.ok);
  assert.ok(["saldo_insuficiente", "conflito_concorrencia"].includes(falha.code));
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 0);
});

test("débito exatamente igual ao saldo zera (boundary)", async () => {
  saldoMem.set(ADDR.toLowerCase(), { centavos: 250 });
  const d = await saldo.debitarSaldoRs({ endereco: ADDR, valorCentavos: 250, motivo: "ds-4" });
  assert.equal(d.ok, true);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 0);
});
