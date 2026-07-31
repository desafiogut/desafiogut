// MC59.5 — worker de confirmação de crédito (background). Confirma o receipt da tx
// já submetida: confirmado → nada (senhas já on-chain); revertido → reembolsa R$
// (idempotente por pedidoId); pendente → lança (re-enfileira via backoff da fila).
// node --test --experimental-test-module-mocks _tests/mc595-worker-credito.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

let estadoReceipt = "confirmado";
const reembolsos = [];
const debitoMem = new Map();      // idempotência da reconciliação
const alertas = [];
let reembolsoOk = true;

mock.module("../_lib/contract.mjs", {
  namedExports: { confirmarReceiptOnchain: async () => ({ estado: estadoReceipt }) },
});
mock.module("../_lib/saldoRs.mjs", {
  namedExports: {
    reembolsarSaldoRs: async ({ endereco, valorCentavos, motivo }) => {
      reembolsos.push({ endereco, valorCentavos, motivo });
      return reembolsoOk ? { ok: true, resultado: {} } : { ok: false, code: "gravar_saldo_falhou" };
    },
  },
});
mock.module("../_lib/saldoRs-store.mjs", {
  namedExports: {
    getDebito: async (id) => debitoMem.get(String(id)) ?? null,
    setDebito: async (id, payload) => { debitoMem.set(String(id), payload); },
  },
});
mock.module("../_lib/sentry-server.mjs", {
  namedExports: { captureSecurityAlert: async (kind, payload, level) => { alertas.push({ kind, payload, level }); } },
});

let worker;
before(async () => { worker = await import("../_lib/worker-credito.mjs"); });
beforeEach(() => { estadoReceipt = "confirmado"; reembolsos.length = 0; debitoMem.clear(); alertas.length = 0; reembolsoOk = true; });

const base = { pedidoId: "pped1", endereco: "0xabc", qtd: 2, valorCentavos: 400, txHash: "0xtx" };

test("worker: confirmado → NÃO reembolsa (senhas já on-chain)", async () => {
  estadoReceipt = "confirmado";
  await worker.confirmarCreditoSenhas({ ...base });
  assert.equal(reembolsos.length, 0);
});

test("worker: revertido → reembolsa R$ (uma vez)", async () => {
  estadoReceipt = "revertido";
  await worker.confirmarCreditoSenhas({ ...base });
  assert.equal(reembolsos.length, 1);
  assert.equal(reembolsos[0].valorCentavos, 400);
});

test("worker: revertido é IDEMPOTENTE por pedidoId (não reembolsa 2x)", async () => {
  estadoReceipt = "revertido";
  await worker.confirmarCreditoSenhas({ ...base });
  await worker.confirmarCreditoSenhas({ ...base }); // reprocesso
  assert.equal(reembolsos.length, 1, "não pode reembolsar duas vezes o mesmo pedido");
});

test("worker: revertido + voucher (valorCentavos 0) → não tenta reembolso", async () => {
  estadoReceipt = "revertido";
  await worker.confirmarCreditoSenhas({ ...base, valorCentavos: 0 });
  assert.equal(reembolsos.length, 0);
});

test("worker: revertido + reembolso falha → alerta level=error", async () => {
  estadoReceipt = "revertido"; reembolsoOk = false;
  await worker.confirmarCreditoSenhas({ ...base });
  assert.equal(alertas.length, 1);
  assert.equal(alertas[0].level, "error");
});

test("worker: pendente → LANÇA (re-enfileira via backoff da fila)", async () => {
  estadoReceipt = "pendente";
  await assert.rejects(() => worker.confirmarCreditoSenhas({ ...base }), /pendente/i);
  assert.equal(reembolsos.length, 0);
});
