// MC39.20 — Onda 7: fila de tarefas (enfileirar/processarLote).
// node --test --experimental-test-module-mocks _tests/mc3920-fila.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Fake Supabase encadeável: rpc() + from().insert/update/eq/select/single.
function fakeSupabase({ rpcResult = [], rpcError = null, insertId = "id-1" } = {}) {
  const updates = [];
  return {
    _updates: updates,
    rpc: async () => (rpcError ? { data: null, error: { message: rpcError } } : { data: rpcResult, error: null }),
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: insertId }, error: null }) }) }),
      update: (patch) => ({ eq: async (col, val) => { updates.push({ patch, val }); return { error: null }; } }),
    }),
  };
}

let fake;
mock.module("../_lib/supabase-client.mjs", {
  namedExports: { getSupabase: () => fake, getSupabaseReadOnly: () => fake },
});

let fila;
before(async () => { fila = await import("../_lib/fila.mjs"); });
beforeEach(() => { fake = fakeSupabase(); });

test("enfileirar devolve o id da tarefa", async () => {
  fake = fakeSupabase({ insertId: "tarefa-42" });
  const id = await fila.enfileirar("notificacao-email", { to: "x@y.z" });
  assert.equal(id, "tarefa-42");
});

test("processarLote INERTE quando a migração não foi aplicada (RPC ausente)", async () => {
  fake = fakeSupabase({ rpcError: "could not find the function reservar_tarefas in the schema cache" });
  const r = await fila.processarLote({}, 10);
  assert.equal(r.ok, true);
  assert.equal(r.inerte, true);
  assert.equal(r.processadas, 0);
});

test("processarLote: tarefa processada com sucesso → status done", async () => {
  fake = fakeSupabase({ rpcResult: [{ id: "t1", tipo: "x", payload: { v: 1 }, tentativas: 1 }] });
  let visto = null;
  const r = await fila.processarLote({ x: async (payload) => { visto = payload; } }, 10);
  assert.equal(r.done, 1);
  assert.equal(r.falhas, 0);
  assert.deepEqual(visto, { v: 1 });
  assert.equal(fake._updates[0].patch.status, "done");
});

test("processarLote: handler que lança → status failed + backoff (DLQ ao esgotar)", async () => {
  fake = fakeSupabase({ rpcResult: [{ id: "t2", tipo: "x", payload: {}, tentativas: 2 }] });
  const r = await fila.processarLote({ x: async () => { throw new Error("falhou"); } }, 10);
  assert.equal(r.falhas, 1);
  assert.equal(fake._updates[0].patch.status, "failed");
  assert.match(fake._updates[0].patch.ultimo_erro, /falhou/);
  assert.ok(fake._updates[0].patch.agendado_para); // reagendado (backoff)
});

test("processarLote: tipo sem handler → failed (não derruba o lote)", async () => {
  fake = fakeSupabase({ rpcResult: [{ id: "t3", tipo: "desconhecido", payload: {}, tentativas: 1 }] });
  const r = await fila.processarLote({}, 10);
  assert.equal(r.falhas, 1);
  assert.equal(fake._updates[0].patch.status, "failed");
});
