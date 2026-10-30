// utac120-inventario.test.mjs — UTAC120. Inventário de Passes: crédito, dedução e fail-closed.
//
// Dois níveis, de propósito:
//  (1) COMPORTAMENTO — a lib contra o duplo do Supabase (que modela as três RPCs da migração
//      20261030). Prova a semântica atómica e o fail-closed.
//  (2) CABLAGEM — os endpoints têm de USAR essa lib nos sítios certos (lance, palpite) e de
//      creditar no fim da compra. Uma mutação que apague a chamada tem de ficar RED — sem este
//      nível, a lib podia estar perfeita e ninguém a chamar.
//
// node --test --experimental-test-module-mocks _tests/utac120-inventario.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

let S = criarSupabase();
let cliente = S.cliente;

// ⚠️ `mock.module` só pode ser chamado UMA vez por módulo (o Node recusa a segunda chamada:
// ERR_INVALID_STATE). O duplo é fixo; o que muda por teste é o `cliente` capturado na closure.
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true,
} });

const L = await import("../_lib/passes-inventario.mjs");

beforeEach(() => {
  S = criarSupabase();
  cliente = S.cliente;
});

const END = "0x1111111111111111111111111111111111111111";

test("UTAC120 · crédito soma ao inventário e o consumo atómico desconta", async () => {
  S.g.passesIniciais = { relampago: 0, programado: 0 };

  const c = await L.creditarPasse({ endereco: END, tipo: "relampago", quantidade: 2 });
  assert.equal(c.ok, true, JSON.stringify(c));
  assert.equal(c.passesRelampago, 2);
  assert.equal(c.passesProgramado, 0);

  const u = await L.consumirPasse({ endereco: END, tipo: "relampago" });
  assert.equal(u.ok, true, JSON.stringify(u));
  assert.equal(u.restantes, 1);
});

test("UTAC120 · sem stock ⇒ sem_passes (e o inventário NÃO fica negativo)", async () => {
  S.g.passesIniciais = { relampago: 0, programado: 0 };

  const u = await L.consumirPasse({ endereco: END, tipo: "relampago" });
  assert.equal(u.ok, false);
  assert.equal(u.code, "sem_passes");

  const inv = await L.lerInventario(END);
  assert.equal(inv.passesRelampago, 0, "o contador ficou negativo com um consumo sem stock");
});

test("UTAC120 · os dois tipos são independentes (relâmpago não paga palpite)", async () => {
  S.g.passesIniciais = { relampago: 1, programado: 0 };

  const u = await L.consumirPasse({ endereco: END, tipo: "programado" });
  assert.equal(u.ok, false);
  assert.equal(u.code, "sem_passes");

  const r = await L.consumirPasse({ endereco: END, tipo: "relampago" });
  assert.equal(r.ok, true, "o Passe Relâmpago devia estar disponível");
});

test("UTAC120 · devolver repõe o passe (reversão de um fluxo que falhou)", async () => {
  S.g.passesIniciais = { relampago: 1, programado: 0 };

  assert.equal((await L.consumirPasse({ endereco: END, tipo: "relampago" })).ok, true);
  assert.equal((await L.devolverPasse({ endereco: END, tipo: "relampago" })).ok, true);
  const inv = await L.lerInventario(END);
  assert.equal(inv.passesRelampago, 1, "o passe não voltou");
});

test("UTAC120 · erro da RPC ⇒ fail-closed inventario_indisponivel (nunca ok:true)", async () => {
  cliente = { from: cliente.from, rpc: async () => ({ data: null, error: { code: "XX000", message: "boom" } }) };

  const u = await L.consumirPasse({ endereco: END, tipo: "relampago" });
  assert.equal(u.ok, false);
  assert.equal(u.code, "inventario_indisponivel");
});

// ── nível (2): cablagem nos endpoints ────────────────────────────────────────────────────────
const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("UTAC120 · o LANCE consome 1 Passe Relâmpago e responde sem_passes_disponiveis a zero", () => {
  const src = fonte("../lance-relampago.mjs");
  assert.match(src, /consumirPasse\(\{\s*endereco,\s*tipo:\s*"relampago"/, "o lance não consome o Passe");
  assert.match(src, /"sem_passes_disponiveis"/, "o lance não devolve o erro próprio");
  assert.match(src, /devolverPasse\(/, "o lance não devolve o Passe quando o fluxo falha depois");
});

test("UTAC120 · o PALPITE consome 1 Passe Programado e devolve o Passe se não registar", () => {
  const src = fonte("../registar-palpite.mjs");
  assert.match(src, /consumirPasse\(\{\s*endereco:\s*t\.endereco,\s*tipo:\s*"programado"/, "o palpite não consome o Passe");
  assert.match(src, /"sem_passes_disponiveis"/);
  assert.match(src, /devolverPasse\(/, "o palpite não devolve o Passe quando falha");
});

test("UTAC120 · a COMPRA credita o inventário depois de creditar os benefícios", () => {
  const src = fonte("../validar-compra-google.mjs");
  assert.match(src, /creditarPasse\(\{\s*endereco,\s*tipo,\s*quantidade:\s*v\.quantity\s*\}\)/, "a compra não credita o inventário");
  const iCred = src.indexOf("creditarPasseGoogle(");
  const iInv = src.indexOf("creditarPasse({");
  assert.ok(iCred >= 0 && iInv > iCred, "o inventário é creditado antes dos benefícios");
});
