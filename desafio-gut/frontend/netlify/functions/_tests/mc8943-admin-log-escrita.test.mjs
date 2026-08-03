// MC89.43 (S0) — a auditoria escreve no PRIMÁRIO, nunca na réplica.
//
// PORQUE ESTE TESTE EXISTE:
// `registrarAcao`/`confirmarAcao` escreviam via `getSupabaseReadOnly()`. Isso
// passava despercebido porque, sem `SUPABASE_READ_REPLICA_URL`, o cliente RO cai
// para o primário — verde por acidente. Este teste força o caso que hoje não
// existe em produção (réplica CONFIGURADA) e prende o contrato:
//   escrita → primário   ·   leitura → réplica
//
// Sem ele, alguém volta a trocar o cliente e ninguém dá por isso até o dia em que
// uma réplica for ligada e TODAS as ações de admin passarem a 503 (fail-CLOSED).
//
// node --test --experimental-test-module-mocks _tests/mc8943-admin-log-escrita.test.mjs

import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

// ── Duplos: dois clientes DISTINGUÍVEIS ────────────────────────────────────
// O ponto do teste é só este: saber QUAL dos dois foi usado.
const chamadas = [];

function criarCliente(nome) {
  return {
    from(tabela) {
      return {
        insert() {
          chamadas.push({ cliente: nome, op: "insert", tabela });
          return {
            select: () => ({ single: async () => ({ data: { id: "log-1" }, error: null }) }),
          };
        },
        update() {
          chamadas.push({ cliente: nome, op: "update", tabela });
          return { eq: async () => ({ error: null }) };
        },
        select() {
          chamadas.push({ cliente: nome, op: "select", tabela });
          const obj = {
            then: (r) => Promise.resolve({ data: [], error: null, count: 0 }).then(r),
          };
          for (const m of ["order", "limit", "eq", "gte", "lte", "lt", "or"]) obj[m] = () => obj;
          return obj;
        },
      };
    },
  };
}

const PRIMARIO = criarCliente("primario");
const REPLICA  = criarCliente("replica");

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => PRIMARIO,
    getSupabaseReadOnly: () => REPLICA,   // réplica CONFIGURADA e diferente
    supabaseConfigurado: () => true,
  },
});

let log;
before(async () => { log = await import("../_lib/admin-log.mjs"); });
beforeEach(() => { chamadas.length = 0; });

test("registrarAcao escreve no PRIMÁRIO, não na réplica", async () => {
  await log.registrarAcao({
    admin_endereco: "0xABC", tipo_acao: "sonda", alvo: "alvo",
  });

  const insert = chamadas.find((c) => c.op === "insert");
  assert.ok(insert, "registrarAcao devia ter feito um insert");
  assert.equal(insert.tabela, "admin_logs");
  assert.equal(
    insert.cliente, "primario",
    "auditoria escrita na RÉPLICA: com réplica real o INSERT falha e, por ser " +
    "fail-CLOSED, todas as ações de admin devolvem 503",
  );
  assert.ok(
    !chamadas.some((c) => c.cliente === "replica"),
    "nenhuma operação de escrita pode tocar na réplica",
  );
});

test("confirmarAcao atualiza no PRIMÁRIO, não na réplica", async () => {
  await log.confirmarAcao("log-1", { sucesso: true });

  const update = chamadas.find((c) => c.op === "update");
  assert.ok(update, "confirmarAcao devia ter feito um update");
  assert.equal(
    update.cliente, "primario",
    "o UPDATE de confirmação também é escrita — a réplica rejeita-o",
  );
});

test("lerLogs continua a LER da réplica (é consulta, tolera atraso)", async () => {
  await log.lerLogs({ limite: 10 });

  const select = chamadas.find((c) => c.op === "select");
  assert.ok(select, "lerLogs devia ter feito um select");
  assert.equal(
    select.cliente, "replica",
    "leitura deve aproveitar a réplica — se for ao primário, perde-se o alívio de carga",
  );
});

test("o duplo injetado (_sb) continua a ganhar aos dois clientes", async () => {
  // Garante que a mudança não parte a injeção usada pelos testes existentes.
  const injetado = criarCliente("injetado");
  await log.registrarAcao({
    _sb: injetado, admin_endereco: "0xABC", tipo_acao: "sonda",
  });
  assert.equal(chamadas.find((c) => c.op === "insert").cliente, "injetado");
});
