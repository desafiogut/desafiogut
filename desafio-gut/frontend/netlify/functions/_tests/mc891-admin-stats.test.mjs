// MC89.1 — estrutura de métricas do ADM.
//
// PORQUÊ ESTE TESTE EXISTE: o painel ADM é para DECIDIR com ele. Um número
// errado num painel de administração é pior do que não ter painel — foi o risco
// R-2 do MC89. Estas asserções protegem as duas coisas que tornam o número
// confiável: nunca inventar um zero, e nunca custar tanto que ninguém o abra.
//
// node --test --experimental-test-module-mocks _tests/mc891-admin-stats.test.mjs

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (rel) => readFileSync(resolve(AQUI, "..", rel), "utf8");
const semComentarios = (s) =>
  s.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

const CAMINHO_METRICAS = "../_lib/admin-metricas.mjs";

/** Carrega admin-metricas com o cliente Supabase substituído por um duplo. */
async function comSupabase(resposta) {
  mock.module("../../../netlify/functions/_lib/supabase-client.mjs", {
    namedExports: {
      supabaseConfigurado: () => true,
      getSupabase: () => resposta,
      getSupabaseReadOnly: () => resposta,
    },
  });
  const mod = await import(`${CAMINHO_METRICAS}?t=${Math.random()}`);
  return mod.obterMetricas;
}

/** Duplo do cliente: devolve por tabela o que lhe mandarem. */
function fakeSb(porTabela) {
  return {
    from(tabela) {
      const r = porTabela[tabela];
      const resultado = r instanceof Error
        ? { data: null, error: { message: r.message } }
        : { data: r ?? [], error: null };
      return { select: async () => resultado };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Honestidade dos números — a razão de ser deste ficheiro
// ─────────────────────────────────────────────────────────────────────────────

test('uma tabela em baixo vira `parciais`, NUNCA um zero', async () => {
  const obterMetricas = await comSupabase(fakeSb({
    cotas: new Error("timeout"),
    saldo_rs: [{ cliente_id: "0x" + "a".repeat(40), payload: { centavos: 500 } }],
    saldo_rs_creditos: [],
    lances: [],
    fila_tarefas: [],
  }));
  const m = await obterMetricas();

  assert.ok(m.parciais.includes("cotas"), "a tabela em falha tem de aparecer pelo nome");
  assert.equal(m.cotas, null, "bloco sem fonte fica null — zero seria uma afirmação falsa");
  // E o resto continua a responder: degradar é por bloco, não pelo painel todo.
  assert.equal(m.financeiro.saldoTotalCentavos, 500);
  mock.reset();
});

test("tudo em baixo devolve tudo null e o painel sabe porquê", async () => {
  const erro = new Error("supabase indisponível");
  const obterMetricas = await comSupabase(fakeSb({
    cotas: erro, saldo_rs: erro, saldo_rs_creditos: erro, lances: erro, fila_tarefas: erro,
  }));
  const m = await obterMetricas();
  assert.equal(m.utilizadores, null);
  assert.equal(m.financeiro, null);
  assert.equal(m.cotas, null);
  assert.equal(m.operacao, null);
  assert.equal(m.parciais.length, 5);
  mock.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. A contagem
// ─────────────────────────────────────────────────────────────────────────────

test("utilizadores são endereços DISTINTOS entre as fontes", async () => {
  const a = "0x" + "a".repeat(40);
  const b = "0x" + "b".repeat(40);
  const obterMetricas = await comSupabase(fakeSb({
    cotas:    [{ endereco: a, vendida: false }, { endereco: null, vendida: true }],
    saldo_rs: [{ cliente_id: a.toUpperCase(), payload: { centavos: 100 } }], // mesmo, noutra caixa
    saldo_rs_creditos: [{ payload: { endereco: b, valorCentavos: 250 }, criado_em: new Date().toISOString() }],
    lances:   [{ endereco: b }],
    fila_tarefas: [],
  }));
  const m = await obterMetricas();

  assert.equal(m.utilizadores.comAtividade, 2, "a e b — maiúsculas não criam um terceiro");
  // A cota sem endereço (registada só por CNPJ) não conta e não desaparece:
  // fica visível na diferença entre `total` e `comCarteira`.
  assert.equal(m.cotas.total, 2);
  assert.equal(m.cotas.comCarteira, 1);
  mock.reset();
});

test("valores não numéricos no payload não contaminam as somas", async () => {
  const obterMetricas = await comSupabase(fakeSb({
    cotas: [],
    saldo_rs: [
      { cliente_id: "0x" + "c".repeat(40), payload: { centavos: 300 } },
      { cliente_id: "0x" + "d".repeat(40), payload: { centavos: "lixo" } },
      { cliente_id: "0x" + "e".repeat(40), payload: {} },
    ],
    saldo_rs_creditos: [], lances: [], fila_tarefas: [],
  }));
  const m = await obterMetricas();
  assert.equal(m.financeiro.saldoTotalCentavos, 300, "NaN não pode virar NaN na soma");
  mock.reset();
});

test("a janela de 30 dias exclui o que é mais antigo", async () => {
  const agora = new Date().toISOString();
  const velho = new Date(Date.now() - 45 * 864e5).toISOString();
  const obterMetricas = await comSupabase(fakeSb({
    cotas: [], saldo_rs: [], lances: [], fila_tarefas: [],
    saldo_rs_creditos: [
      { payload: { valorCentavos: 100 }, criado_em: agora },
      { payload: { valorCentavos: 200 }, criado_em: velho },
    ],
  }));
  const m = await obterMetricas();
  assert.equal(m.financeiro.creditos, 2,        "o total conta tudo");
  assert.equal(m.financeiro.creditosJanela, 1,  "a janela conta só os recentes");
  assert.equal(m.financeiro.creditadoCentavos, 300, "a soma é sobre o total, não sobre a janela");
  mock.reset();
});

test("a fila é contada por estado, com o mais recente", async () => {
  const obterMetricas = await comSupabase(fakeSb({
    cotas: [], saldo_rs: [], saldo_rs_creditos: [], lances: [],
    fila_tarefas: [
      { status: "done",    atualizado_em: "2026-07-27T00:21:52Z" },
      { status: "done",    atualizado_em: "2026-07-26T00:00:00Z" },
      { status: "pending", atualizado_em: "2026-07-25T00:00:00Z" },
    ],
  }));
  const m = await obterMetricas();
  assert.equal(m.operacao.fila.total, 3);
  assert.equal(m.operacao.fila.pendentes, 1);
  assert.equal(m.operacao.fila.porEstado.done, 2);
  assert.equal(m.operacao.fila.atualizadaEm, "2026-07-27T00:21:52Z");
  mock.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Estrutura — o que torna o painel utilizável
// ─────────────────────────────────────────────────────────────────────────────

test("nem a agregação nem os endpoints tocam em ethers", () => {
  // MC88.31, medido: `ethers` custa ~2 s de cold start. Um painel a 3 s deixa
  // de ser aberto, e aí não interessa se os números estão certos.
  for (const rel of ["_lib/admin-metricas.mjs", "admin-stats.mjs", "admin-onchain.mjs"]) {
    const codigo = semComentarios(ler(rel));
    assert.doesNotMatch(codigo, /from\s+["']ethers["']/, `${rel} importa ethers diretamente`);
    // E também não por transitividade pelos módulos que se sabe que o arrastam.
    assert.doesNotMatch(codigo, /_lib\/(signer|contract|kms-signer)\.mjs/,
      `${rel} importa um módulo que arrasta ethers`);
  }
});

test("os dois endpoints são gated e respondem a preflight", () => {
  for (const rel of ["admin-stats.mjs", "admin-onchain.mjs"]) {
    const codigo = semComentarios(ler(rel));
    assert.match(codigo, /guardAdmin\(req\)/,       `${rel} sem guardAdmin`);
    assert.match(codigo, /respostaPreflight\(req\)/, `${rel} sem preflight CORS (quebra o APK)`);
    assert.match(codigo, /aplicarRateLimit\(/,      `${rel} sem rate-limit`);
    // O preflight tem de vir ANTES do gate: o OPTIONS não leva Authorization,
    // logo um guardAdmin à frente responderia 401 e o browser abortava.
    // Compara as CHAMADAS, não os imports — a ordem dos imports não diz nada
    // sobre a ordem de execução (foi assim que esta guarda falhou à primeira).
    assert.ok(codigo.indexOf("respostaPreflight(req)") < codigo.indexOf("guardAdmin(req)"),
      `${rel}: a chamada a preflight tem de vir antes da chamada a guardAdmin`);
  }
});

test("o saldo on-chain converte wei sem perder precisão", async () => {
  // Number não representa 10^18 com exatidão; a conversão tem de ser BigInt.
  //
  // MC89.2 — a conversão MUDOU DE SÍTIO: passou para `_lib/admin-metricas.mjs`
  // quando ganhou um segundo consumidor (o intent `metricas_eoa` do GUTO). A
  // guarda seguiu-a, e passou a afirmar também o invariante novo: o endpoint NÃO
  // pode voltar a ter a sua própria conversão, senão são duas contas do mesmo
  // saldo — o defeito que o MC88.43 gastou um MC a eliminar noutro domínio.
  const lib = semComentarios(ler("_lib/admin-metricas.mjs"));
  assert.match(lib, /BigInt\(/, "conversão de wei sem BigInt perde precisão");
  assert.doesNotMatch(lib, /parseInt\(\s*hex/, "parseInt sobre wei é perda de precisão");

  const endpoint = semComentarios(ler("admin-onchain.mjs"));
  assert.match(endpoint, /obterSaldoEoa/, "o endpoint tem de usar a leitura partilhada");
  assert.doesNotMatch(endpoint, /10n \*\* 18n/, "o endpoint voltou a converter wei por conta própria");
});
