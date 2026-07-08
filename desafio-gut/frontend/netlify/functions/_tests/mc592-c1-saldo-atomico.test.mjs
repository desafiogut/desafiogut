// MC59.2 — C-1: crédito e reembolso de saldo R$ devem ser ATÓMICOS (CAS), como
// já é o débito. Prova de lost-update determinística: um mock injeta uma
// modificação concorrente (um débito que já venceu) ENTRE a leitura e a escrita
// do crédito/reembolso. Sob overwrite (código antigo) o débito é perdido; sob
// CAS (correção) o resultado é consistente.
//
// node --test --experimental-test-module-mocks _tests/mc592-c1-saldo-atomico.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const ADDR = "0xAbc0000000000000000000000000000000000abc";
const KEY  = ADDR.toLowerCase();

// Store Supabase simulado em memória, com CAS real e um gancho de injeção one-shot.
const mem = new Map(); // cliente_id -> { centavos, atualizadoEm }
let injectOnce = null; // se setado: {para:centavos} aplicado na 1ª leitura de KEY

mock.module("../_lib/saldoRs-store.mjs", {
  namedExports: {
    getSaldo: async (id) => {
      const k = String(id);
      const snap = mem.get(k) ?? null;
      // Injeta a modificação concorrente DEPOIS de capturar o snapshot lido,
      // simulando um débito que venceu entre o read e o write do caller.
      if (injectOnce && k === KEY) {
        const { para } = injectOnce; injectOnce = null;
        mem.set(k, { centavos: para, atualizadoEm: new Date().toISOString() });
      }
      return snap;
    },
    setSaldo: async (id, payload) => { mem.set(String(id), payload); },
    casSaldo: async (id, expected, payload) => {
      const k = String(id);
      const curC = Math.floor(Number(mem.get(k)?.centavos ?? 0));
      if (curC !== Math.floor(Number(expected))) return false; // CAS perdeu
      mem.set(k, payload);
      return true;
    },
    getCredito: async () => null,
    setCredito: async () => {},
    getDebito:  async () => null,
    setDebito:  async () => {},
  },
});
mock.module("../_lib/financeiro-fallback.mjs", {
  namedExports: { lerSaldoLegado: async () => null, lerCreditoLegado: async () => null },
});

let saldo;
before(async () => { saldo = await import("../_lib/saldoRs.mjs"); });
beforeEach(() => { mem.clear(); injectOnce = null; });

// ── C-1 (RED → GREEN): crédito não pode perder um débito concorrente ─────────
test("C-1: crédito concorrente com débito NÃO perde o débito (atómico)", async () => {
  mem.set(KEY, { centavos: 1000, atualizadoEm: "seed" });   // saldo inicial 1000
  injectOnce = { para: 600 };                                // débito de 400 vence no meio
  const r = await saldo.creditarSaldoRsIdempotente({ pedidoId: "pixC1", endereco: ADDR, valorCentavos: 500, fonte: "teste" });
  assert.equal(r.ok, true);
  // Correto: 1000 - 400 (débito concorrente) + 500 (crédito) = 1100.
  // Antigo (overwrite): 1000 + 500 = 1500 → débito de 400 perdido.
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 1100);
});

test("C-1: reembolso concorrente com débito NÃO perde o débito (atómico)", async () => {
  mem.set(KEY, { centavos: 1000, atualizadoEm: "seed" });
  injectOnce = { para: 600 };                                // débito de 400 vence no meio
  const r = await saldo.reembolsarSaldoRs({ endereco: ADDR, valorCentavos: 300, motivo: "teste" });
  assert.equal(r.ok, true);
  // Correto: 600 + 300 = 900. Antigo (overwrite): 1000 + 300 = 1300.
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 900);
});

// ── Regressão: comportamento normal (sem concorrência) preservado ────────────
test("C-1(reg): crédito normal credita e persiste idempotência", async () => {
  const r = await saldo.creditarSaldoRsIdempotente({ pedidoId: "pixN", endereco: ADDR, valorCentavos: 2500 });
  assert.equal(r.ok, true);
  assert.equal(r.idempotent, false);
  assert.equal(r.resultado.saldoDepoisCentavos, 2500);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 2500);
});

test("C-1(reg): reembolso normal devolve ao saldo", async () => {
  mem.set(KEY, { centavos: 200, atualizadoEm: "seed" });
  const r = await saldo.reembolsarSaldoRs({ endereco: ADDR, valorCentavos: 800, motivo: "reg" });
  assert.equal(r.ok, true);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 1000);
});

test("C-1(reg): crédito em endereço novo (sem linha) cria e credita", async () => {
  const r = await saldo.creditarSaldoRsIdempotente({ pedidoId: "pixNew", endereco: ADDR, valorCentavos: 700 });
  assert.equal(r.ok, true);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 700);
});
