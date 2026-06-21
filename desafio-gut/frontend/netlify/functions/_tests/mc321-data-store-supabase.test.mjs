// MC32.1 — Testes do adaptador Supabase (offline, mock do supabase-client).
// Executar: node --test --experimental-test-module-mocks mc321-data-store-supabase.test.mjs
//
// Valida que data-store-supabase.mjs implementa a interface do data-store com
// fidelidade aos contratos dos Blobs (R1): config em config_remota.valor (JSONB)
// e o registro imutável completo do lance em lances.payload (JSONB), com as
// colunas planas (edicao_id, endereco, hash_lance, valor_centavos) replicadas.
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── Supabase fake in-memory com query builder encadeável e "thenable" ──────────
const db = { config: new Map(), lances: [] };
let seq = 0; // ordem de inserção → created_at monotónico

function builder(table) {
  const st = { table, filters: {} };
  const api = {
    select() { return api; },
    eq(col, val) { st.filters[col] = val; return api; },
    order() {
      // getLances: filtra por edicao_id e ordena por created_at asc
      const rows = db.lances
        .filter((r) => r.edicao_id === st.filters.edicao_id)
        .sort((a, b) => a.created_at - b.created_at)
        .map((r) => ({ payload: r.payload }));
      return Promise.resolve({ data: rows, error: null });
    },
    maybeSingle() {
      const row = db.config.get(st.filters.chave);
      return Promise.resolve({ data: row ? { valor: row } : null, error: null });
    },
    upsert(obj) { db.config.set(obj.chave, obj.valor); return Promise.resolve({ error: null }); },
    insert(obj) { db.lances.push({ ...obj, created_at: ++seq }); return Promise.resolve({ error: null }); },
  };
  return api;
}

const fakeClient = { from: (table) => builder(table) };
mock.module("../_lib/supabase-client.mjs", {
  namedExports: { getSupabase: () => fakeClient, supabaseConfigurado: () => true },
});

let store;
before(async () => { store = await import("../_lib/data-store-supabase.mjs"); });
beforeEach(() => { db.config.clear(); db.lances.length = 0; seq = 0; });

const ADDR = "0xDe70000000000000000000000000000000000009";

test("config: setConfig/getConfig faz round-trip de objeto aninhado", async () => {
  const cfg = {
    isLeilaoAtivo: { ios: false, android: false, pwa: true },
    isPagamentoNativoAtivo: { ios: false, android: false, pwa: false },
  };
  await store.setConfig("recursos_app", cfg);
  assert.deepEqual(await store.getConfig("recursos_app"), cfg);
});

test("config: chave ausente → null (fail-soft)", async () => {
  assert.equal(await store.getConfig("inexistente"), null);
});

test("addLance: devolve key, replica colunas e guarda payload completo", async () => {
  const lance = {
    lanceId: "l1", edicaoId: "R-1", endereco: ADDR, valorCentavos: 4242,
    nomeExibicao: "Guto", commitmentHash: "0xabc", processadoEm: "2026-06-20T00:00:00.000Z",
  };
  const key = await store.addLance("R-1", lance);
  assert.match(key, /^bid:R-1:0xde70000000000000000000000000000000000009:[0-9a-f]{8}$/);

  assert.equal(db.lances.length, 1);
  const row = db.lances[0];
  assert.equal(row.edicao_id, "R-1");
  assert.equal(row.endereco, ADDR.toLowerCase()); // endereço normalizado
  assert.equal(row.hash_lance, "0xabc");          // ← commitmentHash
  assert.equal(row.valor_centavos, 4242);         // ← valorCentavos
  // payload = registro imutável COMPLETO + key (espelha Key-Per-Bid)
  assert.equal(row.payload.nomeExibicao, "Guto");
  assert.equal(row.payload.key, key);
  assert.equal(row.payload.valorCentavos, 4242);
});

test("addLance legado (sem commitmentHash) → hash_lance null, ainda persiste", async () => {
  const key = await store.addLance("R-1", { endereco: ADDR, valorCentavos: 10 });
  assert.ok(key);
  assert.equal(db.lances[0].hash_lance, null);
  assert.equal(db.lances[0].valor_centavos, 10);
});

test("addLance sem endereco/lancador lança erro", async () => {
  await assert.rejects(() => store.addLance("R-1", { valorCentavos: 1 }), /sem endereco\/lancador/);
});

test("getLances devolve payloads na ordem cronológica, fiéis ao registro", async () => {
  await store.addLance("R-1", { endereco: ADDR, valorCentavos: 1, nomeExibicao: "A" });
  await store.addLance("R-1", { endereco: ADDR, valorCentavos: 2, nomeExibicao: "B" });
  await store.addLance("R-2", { endereco: ADDR, valorCentavos: 9, nomeExibicao: "X" }); // outra edição

  const lances = await store.getLances("R-1");
  assert.equal(lances.length, 2);
  assert.deepEqual(lances.map((l) => l.nomeExibicao), ["A", "B"]);
  assert.equal(lances[0].valorCentavos, 1);
  assert.ok(lances[0].key); // key preservada no payload
});
