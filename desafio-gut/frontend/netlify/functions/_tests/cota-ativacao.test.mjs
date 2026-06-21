// MC17.1/MC37/MC38 — Testes da ativação automática de cota.
// MC37: cota em Supabase (cotas-store); troco continua em Blobs. MC38: fallback removido.
// Mock de ../_lib/cotas-store.mjs (cota) + @netlify/blobs (troco-senhas).
// node --test --experimental-test-module-mocks _tests/cota-ativacao.test.mjs
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// --- mock cotas-store (Supabase) — cota em memória ---
const cotasMem = new Map(); // cliente_id -> registro
const pagasMem = new Map(); // pedidoId -> resultado
mock.module("../_lib/cotas-store.mjs", {
  namedExports: {
    getCota:     async (id)  => cotasMem.get(String(id)) ?? null,
    upsertCota:  async (id, reg) => { cotasMem.set(String(id), reg); return reg; },
    getCotaPaga: async (pid) => pagasMem.get(String(pid)) ?? null,
    setCotaPaga: async (pid, reg) => { pagasMem.set(String(pid), reg); },
  },
});

// --- mock troco-senhas-store (Supabase) + fallback vazio (MC36.1) ---
const trocoMem = new Map(); // cliente_id -> JSON string do payload
mock.module("../_lib/troco-senhas-store.mjs", {
  namedExports: {
    getTroco:  async (id) => { const v = trocoMem.get(String(id)); return v === undefined ? null : JSON.parse(v); },
    setTroco:  async (id, payload) => { trocoMem.set(String(id), JSON.stringify(payload)); },
    listTroco: async () => [...trocoMem.entries()].map(([cliente_id, v]) => ({ cliente_id, payload: JSON.parse(v) })),
  },
});
mock.module("../_lib/financeiro-fallback.mjs", {
  namedExports: { lerTrocoLegado: async () => null },
});

function limpar() { cotasMem.clear(); pagasMem.clear(); trocoMem.clear(); }

let cota, troco;
before(async () => {
  cota  = await import("../_lib/cota-ativacao.mjs");
  troco = await import("../_lib/troco-senhas.mjs");
});

const ADDR = "0xDe70000000000000000000000000000000000009";

test("ativa cota Bronze e credita troco do excedente (R$500 -> 80 senhas)", async () => {
  limpar();
  const r = await cota.ativarCotaPaga({ pedidoId: "p1", endereco: ADDR, categoria: "bronze", produtoValor: 500 });
  assert.equal(r.ok, true);
  assert.equal(r.idempotent, false);
  assert.equal(r.resultado.troco.senhas, 80); // (660-500)/2
  const reg = cotasMem.get(ADDR.toLowerCase());
  assert.equal(reg.vendida, true);
  assert.equal(reg.categoria, "bronze");
  const t = await troco.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 80);
});

test("idempotência por pedidoId não duplica troco nem reativa", async () => {
  // mesmo pedidoId do teste anterior NÃO deve creditar mais troco (estado persiste)
  const r2 = await cota.ativarCotaPaga({ pedidoId: "p1", endereco: ADDR, categoria: "bronze", produtoValor: 500 });
  assert.equal(r2.idempotent, true);
  const t = await troco.lerTroco(ADDR);
  assert.equal(t.saldoTroco, 80); // continua 80, não 160
});

test("produto >= mínimo não gera troco mas ativa a cota", async () => {
  limpar();
  const r = await cota.ativarCotaPaga({ pedidoId: "p2", endereco: ADDR, categoria: "ouro", produtoValor: 3000 });
  assert.equal(r.ok, true);
  assert.equal(r.resultado.troco, null); // 3000 >= 2250
  const reg = cotasMem.get(ADDR.toLowerCase());
  assert.equal(reg.categoria, "ouro");
  assert.equal(reg.vendida, true);
});

test("categoria inválida falha", async () => {
  const r = await cota.ativarCotaPaga({ pedidoId: "p3", endereco: ADDR, categoria: "platina", produtoValor: 100 });
  assert.equal(r.ok, false);
  assert.equal(r.code, "categoria_invalida");
});

test("preserva tipo corporativo existente ao ativar", async () => {
  limpar();
  cotasMem.set(ADDR.toLowerCase(),
    { cliente_id: ADDR, tipo: "corporativo", empresa: "Loja X", cnpj: "11222333000181" });
  await cota.ativarCotaPaga({ pedidoId: "p4", endereco: ADDR, categoria: "prata", produtoValor: 1000 });
  const reg = cotasMem.get(ADDR.toLowerCase());
  assert.equal(reg.tipo, "corporativo");
  assert.equal(reg.empresa, "Loja X");
  assert.equal(reg.categoria, "prata");
  assert.equal(reg.vendida, true);
});
