// MC93-D — sweeper da dívida órfã (offline, Supabase mockado).
//
// PORQUÊ ESTE SWEEPER EXISTE: `_lib/pontuacao-store.mjs:184` enfileira a tarefa
// de bónus DENTRO do compare-and-set que faz a dívida nascer. Uma dívida só
// gera tarefa uma vez, no instante em que é criada. E em dry-run o handler
// consome a tarefa (fica `done`) sem liquidar nada.
//
// Consequência, medida no MC93-C: toda a dívida criada com
// `BONUS_EMISSAO_ATIVA` desligado fica PERMANENTEMENTE fora do alcance da fila.
// Quando o operador ligar a emissão, essas dívidas não são pagas por ninguém.
//
// ⚠️ O CRITÉRIO É O ESTADO, NÃO A IDADE. O enunciado propunha
// `atualizado_em < now() - interval 'X'`. Uma janela temporal ESCONDE dívidas
// recentes que já são órfãs — em dry-run a tarefa é consumida no minuto
// seguinte ao nascimento. O que torna uma dívida órfã é estar por liquidar,
// não ser velha. A protecção contra re-enfileirar de mais vem da idempotência
// do handler (compare-and-set no livro-razão), não de uma janela.
//
// node --test --experimental-test-module-mocks _tests/mc93d-sweeper.test.mjs

import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const db = { rankings_ciclo: [], fila_tarefas: [] };
const fila = [];
let erroForcado = null;

function builder(nome) {
  const tabela = () => db[nome] || [];
  const st = { filtros: {}, is: {} };
  const api = {
    select() { return api; },
    // ⚠️ O duplo RECUSA `.eq(col, null)`, como o PostgREST faz: gera `eq.null`
    // e o PostgreSQL responde 22007 numa coluna TIMESTAMPTZ. Regra permanente
    // do projeto desde o MC93-C.
    eq(c, v) {
      if (v === null) throw new Error(`[duplo] .eq("${c}", null) → eq.null → 400; use .is()`);
      st.filtros[c] = v; return api;
    },
    is(c, v) { st.is[c] = v; return api; },
    gt(c, v) { st.gt = { c, v }; return api; },
    neq(c, v) { st.neq = { c, v }; return api; },
    order(c, o) { st.order = { c, asc: o?.ascending !== false }; return api; },
    limit(n) { st.limite = n; return api; },
    then(res, rej) {
      if (erroForcado) {
        return Promise.resolve({ data: null, error: { message: erroForcado } }).then(res, rej);
      }
      let linhas = tabela().filter((r) => {
        const base = Object.entries(st.filtros).every(([k, v]) => r[k] === v);
        const isOk = Object.entries(st.is).every(([k, v]) => (v === null ? r[k] == null : r[k] === v));
        const gtOk = !st.gt || Number(r[st.gt.c]) > Number(st.gt.v);
        const neqOk = !st.neq || r[st.neq.c] !== st.neq.v;
        return base && isOk && gtOk && neqOk;
      });
      if (st.order) {
        const { c, asc } = st.order;
        linhas = [...linhas].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      }
      // ⚠️ `limit` é do SERVIDOR. O duplo tem de o aplicar AQUI: se o cliente
      // fatiasse depois, o total reportado mentiria — foi o achado da
      // validação independente (1500 órfãs, `encontradas: 1000`).
      if (st.limite != null) linhas = linhas.slice(0, st.limite);
      return Promise.resolve({ data: linhas, error: null }).then(res, rej);
    },
  };
  return api;
}

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    supabaseConfigurado: () => true,
    getSupabase: () => ({ from: builder }),
    getSupabaseReadOnly: () => ({ from: builder }),
  },
});
mock.module("../_lib/fila.mjs", {
  namedExports: {
    enfileirar: async (tipo, payload) => { fila.push({ tipo, payload }); return { id: "t" }; },
  },
});

const { varrerDividaOrfa } = await import("../_lib/sweeper-divida-orfa.mjs");
const { TIPO_TAREFA_BONUS } = await import("../_lib/pontuacao-store.mjs");
const { REGRAS } = await import("../_lib/pontuacao-utils.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const divida = (endereco, over = {}) => ({
  ciclo_id: "R-1", endereco, bonus_emitido: true,
  senhas_a_creditar: REGRAS.SENHAS_BONUS, liquidado_em: null,
  atualizado_em: "2026-09-24T00:00:00Z", ...over,
});

// ⚠️ O sweeper é no-op com a emissão desarmada (evita o moto-contínuo). Os
// testes que exercem a varredura têm de a armar explicitamente.
const ARMADA = "BONUS_EMISSAO_ATIVA";
beforeEach(() => {
  db.rankings_ciclo.length = 0; db.fila_tarefas.length = 0; fila.length = 0;
  erroForcado = null; process.env[ARMADA] = "true";
});
afterEach(() => { delete process.env[ARMADA]; });

test("re-enfileira a dívida órfã com o payload que o handler espera", async () => {
  db.rankings_ciclo.push(divida(A));
  const r = await varrerDividaOrfa();
  assert.equal(r.reenfileiradas, 1);
  assert.equal(fila.length, 1);
  assert.equal(fila[0].tipo, TIPO_TAREFA_BONUS, "tem de ser o tipo que o handler trata");
  assert.deepEqual(fila[0].payload,
    { cicloId: "R-1", endereco: A, quantidade: REGRAS.SENHAS_BONUS },
    "o payload tem de coincidir com o do produtor, senão o handler recusa");
});

test("NÃO re-enfileira dívida já liquidada", async () => {
  db.rankings_ciclo.push(divida(A, { liquidado_em: "2026-09-24T10:00:00Z" }));
  const r = await varrerDividaOrfa();
  assert.equal(r.reenfileiradas, 0);
  assert.equal(fila.length, 0);
});

test("NÃO re-enfileira linha sem bónus concedido", async () => {
  db.rankings_ciclo.push(divida(A, { bonus_emitido: false }));
  assert.equal((await varrerDividaOrfa()).reenfileiradas, 0);
});

test("NÃO re-enfileira dívida de quantidade zero", async () => {
  db.rankings_ciclo.push(divida(A, { senhas_a_creditar: 0 }));
  assert.equal((await varrerDividaOrfa()).reenfileiradas, 0);
});

test("uma dívida RECENTE também é órfã — não há janela temporal", async () => {
  // Em dry-run a tarefa é consumida no minuto seguinte ao nascimento. Filtrar
  // por idade esconderia exactamente o caso mais comum.
  db.rankings_ciclo.push(divida(A, { atualizado_em: new Date().toISOString() }));
  assert.equal((await varrerDividaOrfa()).reenfileiradas, 1,
    "o que torna a dívida órfã é o estado, não a idade");
});

test("varre várias dívidas de uma vez", async () => {
  db.rankings_ciclo.push(divida(A), divida(B, { ciclo_id: "R-2" }));
  const r = await varrerDividaOrfa();
  assert.equal(r.reenfileiradas, 2);
  assert.deepEqual(fila.map((t) => t.payload.endereco).sort(), [A, B].sort());
});

test("a quantidade enfileirada vem do LIVRO-RAZÃO, não de uma constante", async () => {
  // Se o registo divergir da regra, o handler recusa — e é isso que se quer.
  // O sweeper não "corrige" o valor: re-enfileira o que está escrito.
  db.rankings_ciclo.push(divida(A, { senhas_a_creditar: 40 }));
  await varrerDividaOrfa();
  assert.equal(fila[0].payload.quantidade, 40,
    "adulterar aqui esconderia um registo corrompido em vez de o expor");
});

test("erro do Supabase PROPAGA — não passa em silêncio", async () => {
  erroForcado = "rls negou";
  await assert.rejects(() => varrerDividaOrfa(), /sweeper/);
});

test("sem dívidas por liquidar, é um no-op silencioso", async () => {
  const r = await varrerDividaOrfa();
  assert.equal(r.reenfileiradas, 0);
  assert.equal(fila.length, 0);
});

test("o sweeper NUNCA credita nem toca on-chain", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const aqui = dirname(fileURLToPath(import.meta.url));
  // Sem comentários — HARD GATE 4 do MC93-D: um `replace` (ou uma regex de
  // guarda) pode acertar no comentário em vez do código.
  const codigo = readFileSync(resolve(aqui, "../_lib/sweeper-divida-orfa.mjs"), "utf8")
    .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const proibido of [/creditarSenhas/, /adicionarSenhas/, /from\s+["']ethers["']/, /contract\.mjs/]) {
    assert.doesNotMatch(codigo, proibido, "o sweeper só re-enfileira — não emite");
  }
  assert.doesNotMatch(codigo, /\.update\(|\.upsert\(|\.insert\(/,
    "o sweeper é READ-ONLY sobre rankings_ciclo: quem escreve é o handler");
});

// ── Achados da validação independente do MC93-D ─────────────────────────────

test("com a emissão DESARMADA o sweeper é no-op — não há moto-contínuo", async () => {
  // Sem esta guarda: o handler em dry-run consome a tarefa sem liquidar, a
  // dívida continua órfã, o sweeper volta a enfileirá-la 5 minutos depois —
  // ~51.840 linhas/dia em `fila_tarefas`. Medido pela validação independente.
  delete process.env[ARMADA];
  db.rankings_ciclo.push(divida(A));
  const r = await varrerDividaOrfa();
  assert.equal(r.inerte, true);
  assert.equal(r.reenfileiradas, 0);
  assert.equal(fila.length, 0, "com ninguém a liquidar, re-enfileirar é inútil");
});

test("não duplica dívida que já tem tarefa por concluir na fila", async () => {
  db.rankings_ciclo.push(divida(A));
  db.fila_tarefas.push({
    tipo: "creditar-senhas-bonus", status: "pending",
    payload: { cicloId: "R-1", endereco: A, quantidade: 20 },
  });
  const r = await varrerDividaOrfa();
  assert.equal(r.reenfileiradas, 0);
  assert.equal(r.saltadas, 1, "já está na fila — não se acrescenta outra");
});

test("uma tarefa JÁ CONCLUÍDA não impede nova varredura", async () => {
  // A tarefa `done` de uma passagem em dry-run não pode bloquear a liquidação
  // quando a flag for ligada.
  db.rankings_ciclo.push(divida(A));
  db.fila_tarefas.push({
    tipo: "creditar-senhas-bonus", status: "done",
    payload: { cicloId: "R-1", endereco: A, quantidade: 20 },
  });
  assert.equal((await varrerDividaOrfa()).reenfileiradas, 1);
});

test("o limite é aplicado no SERVIDOR e `encontradas` não mente", async () => {
  // Com `.slice()` no cliente, `encontradas` reportaria o total truncado pelo
  // PostgREST (db-max-rows) e não o que foi realmente processado.
  for (let i = 0; i < 12; i++) {
    db.rankings_ciclo.push(divida(A, { ciclo_id: `R-${i}`, atualizado_em: `2026-09-${10 + i}T00:00:00Z` }));
  }
  const r = await varrerDividaOrfa({ limite: 5 });
  assert.equal(r.encontradas, 5, "encontradas = o que o servidor devolveu, não o total da tabela");
  assert.equal(r.reenfileiradas, 5);
});

test("varre as dívidas MAIS ANTIGAS primeiro — garante progresso", async () => {
  // Sem ordenação, as mesmas dívidas podiam voltar em cada varredura e as do
  // fim nunca ser tratadas (inanição).
  db.rankings_ciclo.push(
    divida(A, { ciclo_id: "NOVA", atualizado_em: "2026-09-24T00:00:00Z" }),
    divida(A, { ciclo_id: "ANTIGA", atualizado_em: "2026-01-01T00:00:00Z" }),
  );
  await varrerDividaOrfa({ limite: 1 });
  assert.equal(fila[0].payload.cicloId, "ANTIGA");
});

test("ESTRUTURA: o compare-and-set do bónus tem de terminar em .select()", async () => {
  // Achado da validação: sem `.select()`, o PostgREST devolve 204 e `data:null`
  // — o código conclui que perdeu a corrida e o bónus NUNCA é concedido nem
  // creditado. Os duplos não vêem isto porque devolvem as linhas na mesma.
  // Mesma classe do P0 do MC93-C: o duplo é mais generoso que o servidor.
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const aqui = dirname(fileURLToPath(import.meta.url));
  const semComentarios = (src) =>
    src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

  // Por LINHAS, não por regex sobre o ficheiro inteiro: uma regex preguiçosa
  // atravessa blocos e acusa o `.update()` errado. (Foi o que aconteceu na
  // primeira versão deste teste — falso positivo meu, não defeito do código.)
  const CONDICAO_DE_CORRIDA = /\.is\(\s*["']liquidado_em["']\s*,\s*null\s*\)|\.eq\(\s*["']bonus_emitido["']\s*,\s*false\s*\)/;
  let encontrados = 0;

  for (const rel of ["../_lib/worker-bonus.mjs", "../_lib/pontuacao-store.mjs"]) {
    const linhas = semComentarios(readFileSync(resolve(aqui, rel), "utf8")).split("\n");
    linhas.forEach((linha, i) => {
      if (!CONDICAO_DE_CORRIDA.test(linha)) return;

      // ⚠️ Um UPDATE filtrado NÃO é um compare-and-set. O que distingue o CAS é
      // o RESULTADO SER LIDO: é por saber quantas linhas afectou que se decide
      // se ganhou a corrida. As UPDATEs condicionais de pontos, por exemplo,
      // filtram por `bonus_emitido` e descartam o resultado de propósito — e a
      // primeira versão deste guarda acusava-as. Falso positivo meu.
      let inicio = i;
      while (inicio > 0 && !/await\s+supabase\.from\(/.test(linhas[inicio])) inicio -= 1;
      const leOResultado = /(const|let)\s+.*=\s*await\s+supabase\.from\(/.test(linhas[inicio]);
      if (!leOResultado) return;   // resultado descartado → não é CAS

      encontrados += 1;
      assert.match(linhas.slice(i, i + 4).join("\n"), /\.select\(\)/,
        `${rel}:${i + 1} — o compare-and-set TEM de terminar em .select(). `
        + "Sem ele o PostgREST devolve 204 e `data: null`, o código conclui que "
        + "perdeu a corrida, e o bónus NUNCA é concedido nem creditado.");
    });
  }
  assert.ok(encontrados >= 2,
    `esperava pelo menos 2 compare-and-set, encontrei ${encontrados}`);
});
