// MC39.19 — Onda 1 (item 28): cliente read-only env-gated com fallback ao primário.
// node --test _tests/mc3919-read-replica.test.mjs
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getSupabase, getSupabaseReadOnly } from "../_lib/supabase-client.mjs";

const SAVED = { ...process.env };
beforeEach(() => {
  process.env.SUPABASE_URL = "https://primario.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});
afterEach(() => {
  process.env = { ...SAVED };
});

test("sem SUPABASE_READ_REPLICA_URL → fallback ao cliente primário (mesma instância)", () => {
  delete process.env.SUPABASE_READ_REPLICA_URL;
  const ro = getSupabaseReadOnly();
  const primary = getSupabase();
  assert.equal(ro, primary, "deve devolver o singleton primário (zero regressão)");
});

test("getSupabaseReadOnly devolve um cliente utilizável (tem .from)", () => {
  delete process.env.SUPABASE_READ_REPLICA_URL;
  const ro = getSupabaseReadOnly();
  assert.equal(typeof ro.from, "function");
});
