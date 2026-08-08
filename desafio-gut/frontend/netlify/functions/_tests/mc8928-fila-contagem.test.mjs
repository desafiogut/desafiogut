// MC89.28 — `estadoFila` conta por status sobre a TABELA, não sobre a janela.
//
// PORQUÊ ESTE TESTE EXISTE: até ao MC89.28 os contadores por status eram
// derivados das `limite` linhas carregadas (30, em admin-queue.mjs), enquanto o
// `total` vinha de um count exato global. Com a fila acima de 30 tarefas o
// painel podia mostrar "Total 500 · Pendentes 0" — e um zero, ao contrário de
// um "—", afirma que a fila está limpa. O operador decide com base nisso.
//
// O defeito era LATENTE quando foi encontrado (a fila tinha 5 linhas, logo a
// janela cobria tudo). Este teste é o que impede que volte em silêncio quando a
// fila crescer: o cenário abaixo é exatamente o que a produção há de encontrar.
//
// node --test _tests/mc8928-fila-contagem.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoFila } from "../_lib/admin-comandos.mjs";

/**
 * Duplo do cliente Supabase.
 *
 * Modela a diferença que interessa: `.limit(n)` devolve só n linhas, mas
 * `.in(status).head` devolve a contagem REAL da tabela inteira.
 */
function fakeSb({ tabela, contagens, falhar = [], rejeitar = [] }) {
  return {
    from() {
      const q = { _estados: null };

      q.select = (_cols, opts = {}) => { q._opts = opts; return q; };
      q.order  = () => q;
      q.limit  = (n) => {
        // Ramo "linhas": promessa já resolvida com a janela.
        const janela = tabela.slice(0, n);
        return Promise.resolve({ data: janela, error: null, count: tabela.length });
      };
      q.in = (_coluna, estados) => {
        const chave = estados.join("+");
        if (rejeitar.includes(chave)) return Promise.reject(new Error(`rede caiu: ${chave}`));
        if (falhar.includes(chave))   return Promise.resolve({ data: null, error: { message: `erro: ${chave}` }, count: null });
        return Promise.resolve({ data: null, error: null, count: contagens[chave] ?? 0 });
      };
      return q;
    },
  };
}

/** 500 tarefas: as 30 mais recentes estão todas `done`; há 120 pendentes atrás. */
function filaGrande() {
  const linhas = [];
  for (let i = 0; i < 30; i++)  linhas.push({ id: i, status: "done" });
  for (let i = 0; i < 120; i++) linhas.push({ id: 100 + i, status: "pending" });
  for (let i = 0; i < 350; i++) linhas.push({ id: 500 + i, status: "done" });
  return linhas;
}

// ─────────────────────────────────────────────────────────────────────────────

test("pendentes fora da janela de 30 NÃO desaparecem", async () => {
  const sb = fakeSb({
    tabela: filaGrande(),
    contagens: { pending: 120, processing: 0, done: 380, "failed+falha": 0 },
  });

  const r = await estadoFila({ sb, limite: 30 });

  assert.equal(r.total, 500, "o total continua a ser global");
  assert.equal(r.linhas.length, 30, "a tabela do painel continua limitada a 30");

  // A asserção que falha contra o código anterior: ele contava sobre `linhas`,
  // que aqui são 30× "done" — logo devolvia pendentes: 0.
  assert.equal(r.pendentes, 120, "pendentes tem de vir da tabela inteira, não da janela");
  assert.equal(r.concluidas, 380);
});

test("uma contagem que falha vale null (→ «—»), nunca 0", async () => {
  const sb = fakeSb({
    tabela: filaGrande(),
    contagens: { processing: 0, done: 380, "failed+falha": 2 },
    falhar: ["pending"],
  });

  const r = await estadoFila({ sb, limite: 30 });

  assert.equal(r.pendentes, null, "consulta falhada não pode virar zero");
  assert.notEqual(r.pendentes, 0, "um 0 aqui afirmaria que a fila está limpa");
  assert.equal(r.falhas, 2, "as outras contagens degradam sozinhas");
});

test("uma contagem que REJEITA também vale null, e não derruba o resto", async () => {
  const sb = fakeSb({
    tabela: filaGrande(),
    contagens: { pending: 120, processing: 0, done: 380, "failed+falha": 0 },
    rejeitar: ["failed+falha"],
  });

  const r = await estadoFila({ sb, limite: 30 });

  assert.equal(r.falhas, null);
  assert.equal(r.pendentes, 120, "a rejeição de uma consulta não contamina as outras");
});

test("zero legítimo continua a ser 0, não «—»", async () => {
  // Distinção que o R-UI-1 exige nos dois sentidos: ausência de dado é null,
  // mas uma fila genuinamente sem pendentes é 0 e deve dizê-lo.
  const sb = fakeSb({
    tabela: [{ id: 1, status: "done" }],
    contagens: { pending: 0, processing: 0, done: 1, "failed+falha": 0 },
  });

  const r = await estadoFila({ sb, limite: 30 });

  assert.equal(r.pendentes, 0);
  assert.equal(r.total, 1);
});

test("erro na consulta das linhas continua a devolver { erro }", async () => {
  const sb = {
    from() {
      const q = {};
      q.select = () => q;
      q.order  = () => q;
      q.limit  = () => Promise.resolve({ data: null, error: { message: "42P13" }, count: null });
      q.in     = () => Promise.resolve({ data: null, error: null, count: 0 });
      return q;
    },
  };

  const r = await estadoFila({ sb, limite: 30 });
  assert.equal(r.erro, "42P13");
});
