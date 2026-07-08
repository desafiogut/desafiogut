// MC59.6 — lógica PURA de polling (sem React, sem import.meta) → testável com node:test.
// node --test src/lib/creditoPolling.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { aguardarConfirmacaoCredito } from "./creditoPolling.js";

// sleep injetável (no-op) para os testes rodarem instantaneamente.
const noSleep = () => Promise.resolve();

test("confirma na 2ª verificação → { estado: confirmado } (sleep entre tentativas)", async () => {
  let n = 0, sleeps = 0;
  const r = await aguardarConfirmacaoCredito({
    verificar: async () => (++n >= 2 ? "confirmado" : "pendente"),
    sleep: async () => { sleeps++; },
    intervaloMs: 1, maxTentativas: 5,
  });
  assert.equal(r.estado, "confirmado");
  assert.equal(r.tentativas, 2);
  assert.equal(sleeps, 1, "dormiu uma vez entre as duas verificações");
});

test("revertido → { estado: revertido }", async () => {
  const r = await aguardarConfirmacaoCredito({ verificar: async () => "revertido", sleep: noSleep });
  assert.equal(r.estado, "revertido");
});

test("sempre pendente → { estado: timeout } após maxTentativas", async () => {
  let n = 0;
  const r = await aguardarConfirmacaoCredito({
    verificar: async () => { n++; return "pendente"; },
    sleep: noSleep, maxTentativas: 4,
  });
  assert.equal(r.estado, "timeout");
  assert.equal(n, 4, "verificou exatamente maxTentativas vezes");
});

test("erro de rede em verificar → tratado como pendente, re-tenta e recupera", async () => {
  let n = 0;
  const r = await aguardarConfirmacaoCredito({
    verificar: async () => { n++; if (n === 1) throw new Error("rede caiu"); return "confirmado"; },
    sleep: noSleep, maxTentativas: 5,
  });
  assert.equal(r.estado, "confirmado");
  assert.equal(n, 2);
});

test("cancelado() → para imediatamente sem verificar", async () => {
  let n = 0;
  const r = await aguardarConfirmacaoCredito({
    verificar: async () => { n++; return "pendente"; },
    sleep: noSleep, cancelado: () => true, maxTentativas: 5,
  });
  assert.equal(r.estado, "cancelado");
  assert.equal(n, 0, "não deve verificar se já cancelado");
});

test("verificar ausente → lança erro claro", async () => {
  await assert.rejects(() => aguardarConfirmacaoCredito({}), /verificar/);
});
