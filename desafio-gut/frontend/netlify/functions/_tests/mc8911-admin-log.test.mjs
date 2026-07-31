// MC89.11 — testes do módulo admin-log (fail-CLOSED).
// node --test --experimental-test-module-mocks _tests/mc8911-admin-log.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { registrarAcao, confirmarAcao, lerLogs } from "../_lib/admin-log.mjs";

// ── Duplo de Supabase ──────────────────────────────────────────────────────

function criarSb({ insertError = null, insertData = null, updateError = null, selectData = [], selectError = null, selectCount = null }) {
  // Cadeia select: cada método devolve o mesmo objeto, que é thenable.
  function criarSelecao() {
    const obj = {
      then(resolve) {
        return Promise.resolve({
          data: selectData,
          error: selectError ? { message: selectError } : null,
          count: selectCount ?? selectData.length,
        }).then(resolve);
      },
    };
    // Todos os métodos da cadeia devolvem o mesmo objeto thenable
    obj.order = () => obj;
    obj.limit = () => obj;
    obj.eq = () => obj;
    obj.neq = () => obj;
    obj.gte = () => obj;
    obj.lte = () => obj;
    obj.lt = () => obj;
    obj.or = () => obj;
    obj.select = () => obj;
    obj.filter = () => obj;
    obj.single = () => obj;
    return obj;
  }

  return {
    from() { return this; },
    insert() {
      return {
        select: () => ({
          single: () => Promise.resolve(
            insertError
              ? { data: null, error: { message: insertError } }
              : { data: insertData || { id: "abc-123" }, error: null }
          ),
        }),
      };
    },
    update() {
      return {
        eq: () => Promise.resolve(updateError ? { error: { message: updateError } } : { error: null }),
      };
    },
    select: criarSelecao,
  };
}

// ── registrarAcao (fail-CLOSED) ────────────────────────────────────────────

test("registrarAcao bem-sucedido → devolve { id }", async () => {
  const sb = criarSb({ insertData: { id: "log-1" } });
  const r = await registrarAcao({
    _sb: sb, admin_endereco: "0xabcd", tipo_acao: "test",
  });
  assert.equal(r.id, "log-1");
});

test("registrarAcao com erro no INSERT → LANÇA (fail-closed)", async () => {
  const sb = criarSb({ insertError: "connection refused" });
  await assert.rejects(
    () => registrarAcao({ _sb: sb, admin_endereco: "0xabcd", tipo_acao: "test" }),
    /connection refused/,
    "se o registo falha, a ação não pode acontecer — fail-CLOSED",
  );
});

test("registrarAcao sem admin_endereco → lança", async () => {
  const sb = criarSb({});
  await assert.rejects(
    () => registrarAcao({ _sb: sb, tipo_acao: "x" }),
    /admin_endereco/,
  );
});

test("registrarAcao insere sucesso=NULL (ainda por executar)", async () => {
  let captured = null;
  const sb = {
    from() { return this; },
    insert(body) {
      captured = body;
      return { select: () => ({ single: () => Promise.resolve({ data: { id: "x" }, error: null }) }) };
    },
    select() { return this.insert({}); },
  };
  await registrarAcao({ _sb: sb, admin_endereco: "0xabcd", tipo_acao: "panic" });
  assert.equal(captured.sucesso, null, "sucesso=NULL = registado, ainda por executar");
  assert.equal(captured.tipo_acao, "panic");
  assert.equal(captured.admin_endereco, "0xabcd");
});

// ── confirmarAcao (fail-soft) ──────────────────────────────────────────────

test("confirmarAcao bem-sucedido não lança", async () => {
  const sb = criarSb({});
  // Não deve lançar
  await confirmarAcao("log-1", { sucesso: true, _sb: sb });
});

test("confirmarAcao com erro NÃO lança (fail-soft — ação já executada)", async () => {
  const sb = criarSb({ updateError: "timeout" });
  // Não deve lançar — a ação já foi executada, só o registo fica incompleto
  await confirmarAcao("log-1", { sucesso: true, _sb: sb });
});

// ── lerLogs ────────────────────────────────────────────────────────────────

test("lerLogs devolve linhas e total", async () => {
  const linhas = [{ id: "1", tipo_acao: "panic", criado_em: "2026-07-31T00:00:00Z" }];
  const sb = criarSb({ selectData: linhas });
  const r = await lerLogs({ _sb: sb });
  assert.equal(r.linhas.length, 1);
  assert.equal(r.total, 1);
});

test("lerLogs com erro → devolve array vazio, não lança", async () => {
  const sb = criarSb({ selectError: "timeout" });
  const r = await lerLogs({ _sb: sb });
  assert.equal(r.linhas.length, 0);
  assert.ok(r.erro);
});

test("lerLogs com limite pequeno gera proximoCursor quando há mais resultados", async () => {
  // O duplo devolve sempre todos os selectData — a paginação real é do
  // Supabase. Mas o cálculo de proximoCursor é nosso.
  const linhas = [{ id: "1", tipo_acao: "x", criado_em: "2026-07-31T00:00:00Z" }, { id: "2", tipo_acao: "y", criado_em: "2026-07-30T00:00:00Z" }];
  const sb = criarSb({ selectData: linhas, selectCount: 100 });
  const r = await lerLogs({ _sb: sb, limite: 2 });
  assert.equal(r.linhas.length, 2);
  assert.ok(r.proximoCursor, "com 100 total e 2 devolvidos, tem de haver cursor");
});

test("lerLogs com menos resultados que o limite → sem proximoCursor", async () => {
  const linhas = [{ id: "1", tipo_acao: "x", criado_em: "2026-07-31T00:00:00Z" }];
  const sb = criarSb({ selectData: linhas, selectCount: 1 });
  const r = await lerLogs({ _sb: sb, limite: 10 });
  assert.equal(r.proximoCursor, null, "todos os resultados couberam nesta página");
});
