// UTAC106f — testes do PALPITE (`_lib/passe-pontos.mjs`: registarPalpite/lerPalpite/lerPalpites/apurarPalpite).
//
// Duplo só nas fronteiras de I/O: um Supabase INLINE que modela **public.pontos** + **public.palpites**
// com a semântica PostgREST MÍNIMA que o código usa (select/insert/update, eq/in/order, maybeSingle).
// Qualquer outra operação LANÇA — um duplo permissivo esconde o defeito que devia apanhar (lição do
// MC93-B/C). O `_lib/passe-pontos.mjs` testado é o REAL.
//
// ⚠️ O que estes testes NÃO provam: a DDL real (CHECK/UNIQUE/FK) — isso é do Postgres. O duplo
// REPRODUZ os três erros que interessam (23505 duplicado, 23503 FK, e a ausência de linha).
//
// node --test --experimental-test-module-mocks _tests/palpite.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "segredo-de-teste-palpite-com-comprimento-suficiente";

// ── Duplo Supabase ─────────────────────────────────────────────────────────────────────────────
function criarDuplo(seed = {}) {
  const db = {
    pontos: (seed.pontos ?? []).map((p) => ({ historico: [], ...p })),
    palpites: (seed.palpites ?? []).map((p) => ({ apurado: false, resultado: null, ...p })),
  };
  let seq = db.palpites.reduce((m, p) => Math.max(m, p.id ?? 0), 0);
  const erro = (code, message) => ({ data: null, error: { code, message, details: null, hint: null } });

  function from(tabela) {
    if (!(tabela in db)) throw new Error(`duplo: tabela ${tabela} não modelada`);
    const st = { op: null, dados: null, filtros: [], ordem: [], terminal: null };
    const api = {
      select() { if (st.op === null) st.op = "select"; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v, "eq"]); return api; },
      in(c, vs) { st.filtros.push([c, vs, "in"]); return api; },
      order(c, o) { st.ordem.push([c, o?.ascending !== false]); return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      single() { st.terminal = "single"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "gte", "lte", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado — acrescentar com a semântica real`); };
    }
    const casa = (l) => st.filtros.every(([c, v, op]) => (op === "eq" ? l[c] === v : v.includes(l[c])));
    function exec() {
      const t = db[tabela];
      if (st.op === "insert") {
        const l = { ...st.dados };
        if (tabela === "palpites") {
          l.id = ++seq;
          l.criado_em = l.criado_em ?? new Date().toISOString();
          l.apurado = l.apurado ?? false;
          l.resultado = l.resultado ?? null;
          if (t.some((x) => x.endereco === l.endereco && x.edicao_id === l.edicao_id)) return erro("23505", "duplicate key value violates unique constraint");
          if (!db.pontos.some((p) => p.endereco === l.endereco)) return erro("23503", "insert violates foreign key constraint");
        } else if (t.some((x) => x.endereco === l.endereco)) {
          return erro("23505", "duplicate key value violates unique constraint");
        }
        t.push(l);
        return { data: l, error: null };
      }
      if (st.op === "update") {
        // UTAC106g (facet do B2, 2.ª ronda): permite FORÇAR a falha da MARCAÇÃO da apuração.
        if (tabela === "palpites" && FALHAR_MARCACAO) return erro("XX000", "falha forçada na marcação");
        const alvo = t.filter(casa);
        for (const l of alvo) Object.assign(l, st.dados);
        return { data: alvo, error: null };
      }
      let linhas = t.filter(casa).slice();
      for (const [c, asc] of [...st.ordem].reverse()) {
        linhas.sort((a, b) => { const r = a[c] === b[c] ? 0 : (a[c] > b[c] ? 1 : -1); return asc ? r : -r; });
      }
      if (st.terminal === "maybe") return { data: linhas[0] ?? null, error: null };
      if (st.terminal === "single") return linhas.length === 1 ? { data: linhas[0], error: null } : erro("PGRST116", "não é single");
      return { data: linhas, error: null };
    }
    return api;
  }
  return { db, from };
}

let dup;
let FALHAR_MARCACAO = false;
mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => ({ from: (t) => dup.from(t) }),
    getSupabaseReadOnly: () => ({ from: (t) => dup.from(t) }),
    supabaseConfigurado: () => true,
  },
});

const {
  PONTOS_POR_PALPITE_CERTO, registarPalpite, lerPalpite, lerPalpites, apurarPalpite, getPontos,
  pontosDeCompra, podeResgatarCartaoComCompra, podeResgatarCartao, edicaoApurada,
} = await import("../_lib/passe-pontos.mjs");

const A = "0xaaa0000000000000000000000000000000000001";
const B = "0xbbb0000000000000000000000000000000000002";
const C = "0xccc0000000000000000000000000000000000003";
const ED = "PROG-7";
const pontosDe = (e) => dup.db.pontos.find((p) => p.endereco === e);

function semear(enderecos = [A, B]) {
  dup = criarDuplo({ pontos: enderecos.map((e) => ({ endereco: e, pontos: 0, historico: [], atualizado_em: "2026-10-04T00:00:00.000Z" })) });
  FALHAR_MARCACAO = false;
}

// ── Constante ───────────────────────────────────────────────────────────────────────────────────
test("PONTOS_POR_PALPITE_CERTO é 2 (valor fixo, não número mágico)", () => {
  assert.equal(PONTOS_POR_PALPITE_CERTO, 2);
});

// ── registarPalpite ─────────────────────────────────────────────────────────────────────────────
test("registarPalpite insere o palpite (criado:true) e fica legível", async () => {
  semear();
  const r = await registarPalpite(A, ED, 120);
  assert.equal(r.ok, true); assert.equal(r.criado, true);
  assert.equal(r.palpite.valor, 120); assert.equal(r.palpite.edicao_id, ED);
  const lido = await lerPalpite(A, ED);
  assert.equal(lido.valor, 120); assert.equal(lido.apurado, false);
});

test("registarPalpite é IDEMPOTENTE por (endereco, edicao): a 2.ª chamada devolve o existente", async () => {
  semear();
  await registarPalpite(A, ED, 120);
  const r2 = await registarPalpite(A, ED, 999);
  assert.equal(r2.ok, true); assert.equal(r2.criado, false, "não pode criar 2.º palpite na mesma edição");
  assert.equal(r2.palpite.valor, 120, "o valor original NÃO pode ser substituído");
  assert.equal(dup.db.palpites.length, 1, "só pode existir 1 linha");
});

test("registarPalpite recusa SEM_PASSE quando o endereço não tem linha em public.pontos (FK)", async () => {
  semear([A]);
  const r = await registarPalpite(C, ED, 10);
  assert.equal(r.ok, false); assert.equal(r.code, "SEM_PASSE");
  assert.equal(dup.db.palpites.length, 0, "nada foi escrito");
});

test("registarPalpite valida valor (inteiro ≥0) e edição", async () => {
  semear([A]);
  for (const valor of [-1, 1.5, "12", null, Infinity]) {
    const r = await registarPalpite(A, ED, valor);
    assert.equal(r.ok, false, `valor ${valor} devia ser recusado`);
    assert.equal(r.code, "VALOR_INVALIDO");
  }
  assert.equal((await registarPalpite(A, "nao-e-edicao", 1)).code, "EDICAO_INVALIDA");
  assert.equal((await registarPalpite("0xZZZ", ED, 1)).code, "ENDERECO_INVALIDO");
});

test("lerPalpites devolve só os do endereço, mais recentes primeiro", async () => {
  semear([A, B]);
  await registarPalpite(A, "PROG-1", 10);
  await registarPalpite(A, "PROG-2", 20);
  await registarPalpite(B, "PROG-1", 30);
  // ⚠️ Os dois palpites do A nascem no MESMO milissegundo ⇒ `criado_em` empata e a ordem não é
  // determinada por ele (o PostgREST real também não promete ordem em empates). O contrato é
  // «descendente por criado_em» ⇒ separa-se os carimbos para o testar a sério.
  dup.db.palpites.find((p) => p.edicao_id === "PROG-1" && p.endereco === A).criado_em = "2026-10-04T10:00:00.000Z";
  dup.db.palpites.find((p) => p.edicao_id === "PROG-2" && p.endereco === A).criado_em = "2026-10-04T11:00:00.000Z";
  const lista = await lerPalpites(A);
  assert.equal(lista.length, 2);
  assert.deepEqual(lista.map((p) => p.edicao_id), ["PROG-2", "PROG-1"]);
});

// ── apurarPalpite ───────────────────────────────────────────────────────────────────────────────
test("apurarPalpite credita +2 pontos SÓ ao mais próximo e marca os restantes «perdeu»", async () => {
  semear([A, B, C]);
  await registarPalpite(A, ED, 100);
  await registarPalpite(B, ED, 130);
  await registarPalpite(C, ED, 900);
  const r = await apurarPalpite(ED, 128);
  assert.equal(r.ok, true); assert.equal(r.total, 3);
  assert.equal(r.vencedor.endereco, B);
  assert.equal(r.pontosCreditados, 2);

  assert.equal((await getPontos(B)), 2, "o vencedor recebeu +2");
  assert.equal((await getPontos(A)), 0, "o 2.º mais próximo NÃO recebe");
  assert.equal((await getPontos(C)), 0);

  const hist = pontosDe(B).historico;
  assert.equal(hist.length, 1);
  assert.equal(hist[0].tipo, "palpite");
  assert.equal(hist[0].pontos, 2);
  assert.equal(hist[0].ref, `palpite-certo:${ED}`);

  const marcados = dup.db.palpites.map((p) => [p.endereco, p.apurado, p.resultado]);
  assert.deepEqual(marcados, [[A, true, "perdeu"], [B, true, "mais_proximo"], [C, true, "perdeu"]]);
});

test("apurarPalpite SEM palpites → vencedor null e NINGUÉM creditado", async () => {
  semear([A]);
  const r = await apurarPalpite(ED, 50);
  assert.equal(r.ok, true); assert.equal(r.total, 0);
  assert.equal(r.vencedor, null); assert.equal(r.pontosCreditados, 0);
  assert.equal(await getPontos(A), 0, "sem vencedor, ninguém é creditado");
});

test("apurarPalpite só apura UMA vez (2.ª corrida não credita de novo)", async () => {
  semear([A, B]);
  await registarPalpite(A, ED, 100);
  await registarPalpite(B, ED, 200);
  const r1 = await apurarPalpite(ED, 100);
  assert.equal(r1.vencedor.endereco, A);
  const saldoApos = await getPontos(A);

  const r2 = await apurarPalpite(ED, 200); // já apurados ⇒ nada por apurar
  assert.equal(r2.ok, true); assert.equal(r2.total, 0); assert.equal(r2.vencedor, null);
  assert.equal(await getPontos(A), saldoApos, "re-apurar não pode creditar outra vez");
  assert.equal(await getPontos(B), 0);
  assert.equal(pontosDe(A).historico.length, 1, "um só movimento de bónus");
});

test("apurarPalpite: EMPATE → ganha o palpite mais antigo (determinístico)", async () => {
  semear([A, B]);
  await registarPalpite(A, ED, 100);
  await registarPalpite(B, ED, 100);
  // O duplo ordena por criado_em; garante que o B é estritamente mais recente.
  dup.db.palpites.find((p) => p.endereco === A).criado_em = "2026-10-04T10:00:00.000Z";
  dup.db.palpites.find((p) => p.endereco === B).criado_em = "2026-10-04T11:00:00.000Z";
  const r = await apurarPalpite(ED, 100);
  assert.equal(r.vencedor.endereco, A, "empate → mais antigo");
  assert.equal(await getPontos(A), 2); assert.equal(await getPontos(B), 0);
});

test("apurarPalpite credita exactamente +2 (nunca mais), sobre pontos PREEXISTENTES", async () => {
  semear([A]);
  pontosDe(A).pontos = 48;
  await registarPalpite(A, ED, 10);
  await apurarPalpite(ED, 11);
  assert.equal(await getPontos(A), 50, "48 (compra) + 2 (bónus) = 50 no TOTAL");
});

// ── R1 (achado ⚠️ do validador adversarial) — o CARTÃO conta SÓ pontos de COMPRA ────────────────
// ⚠️ ERRADO ANTES (mantido à vista, GATE 15): a 1.ª versão deste ficheiro afirmava
// «48 + 2 = 50 (a regra do cartão é de COMPRA, o bónus soma)» — ou seja, codificava o DEFEITO como
// comportamento esperado, e o mutante MP6 não o apanhava (testava o gate, não a soma). Os 4 testes
// abaixo são a correcção (decisão do operador = opção A).
test("R1 · pontosDeCompra conta compra/resgate e IGNORA o bónus de palpite", () => {
  assert.equal(pontosDeCompra({ historico: [
    { tipo: "compra", pontos: 1 }, { tipo: "palpite", pontos: 2 },
    { tipo: "compra", pontos: 1 }, { tipo: "resgate", pontos: -50 },
  ] }), -48);
  assert.equal(pontosDeCompra({ historico: [{ tipo: "palpite", pontos: 2 }] }), 0);
  assert.equal(pontosDeCompra(null), 0);
  assert.equal(pontosDeCompra({}), 0);
});

test("R1 REGRESSÃO · 48 de COMPRA + 2 de bónus = 50 NÃO desbloqueia o cartão", async () => {
  semear([A]);
  pontosDe(A).pontos = 48;
  pontosDe(A).historico = Array.from({ length: 48 }, (_, i) => ({ data: "2026-10-01T00:00:00.000Z", tipo: "compra", pontos: 1, ref: `k${i}` }));
  await registarPalpite(A, ED, 10);
  await apurarPalpite(ED, 10);
  assert.equal(await getPontos(A), 50, "o TOTAL chega a 50 (48 compra + 2 bónus)");
  assert.equal(await podeResgatarCartaoComCompra(A), false, "mas o CARTÃO conta só 48 ⇒ NÃO desbloqueia");
  assert.equal(await podeResgatarCartao(A), true,
    "a função ANTIGA (total) diria que sim — é exactamente por isso que deixou de decidir o cartão");
});

test("R1 · 50 pontos de COMPRA desbloqueiam o cartão", async () => {
  semear([A]);
  pontosDe(A).pontos = 50;
  pontosDe(A).historico = Array.from({ length: 50 }, (_, i) => ({ data: "2026-10-01T00:00:00.000Z", tipo: "compra", pontos: 1, ref: `k${i}` }));
  assert.equal(await podeResgatarCartaoComCompra(A), true);
});

test("R1 · um bónus de palpite SOZINHO nunca desbloqueia o cartão", async () => {
  semear([A]);
  await registarPalpite(A, ED, 10);
  await apurarPalpite(ED, 10); // +2 pontos sem nenhuma compra
  assert.equal(await getPontos(A), 2);
  assert.equal(await podeResgatarCartaoComCompra(A), false, "bónus não compra cartão (prestígio)");
});

test("apurarPalpite é independente por edição (apurar a PROG-7 não toca na PROG-8)", async () => {
  semear([A]);
  await registarPalpite(A, "PROG-7", 10);
  await registarPalpite(A, "PROG-8", 20);
  await apurarPalpite("PROG-7", 10);
  const p8 = dup.db.palpites.find((p) => p.edicao_id === "PROG-8");
  assert.equal(p8.apurado, false, "a PROG-8 continua por apurar");
});

// ── UTAC106g · R2 — idempotência da apuração POR EDIÇÃO ────────────────────────────────────────
// Defeito medido pelo validador do R1v: a `ref` do bónus (`palpite-certo:<edicaoId>`) é verificada no
// histórico DE CADA ENDEREÇO — um palpite NOVO na MESMA edição já apurada + uma 2.ª apuração creditava
// +2 a OUTRO endereço (a edição pagava 4). Nota: a `ref` JÁ incluía o `edicaoId`, logo «acrescentar
// edicaoId à chave» era no-op (premissa do enunciado refutada por medição). Fecha-se a edição a
// palpites novos depois de apurada.

test("R2 · edição JÁ APURADA não aceita palpites novos (fecha o pagamento duplo)", async () => {
  semear([A, B, C]);
  await registarPalpite(A, ED, 100);
  await registarPalpite(B, ED, 500);

  const r1 = await apurarPalpite(ED, 100);
  assert.equal(r1.ok, true);
  assert.equal(r1.vencedor.endereco, A, "o mais próximo (A) ganha");
  assert.equal(await getPontos(A), 2);

  // O CENÁRIO DA R2: um palpite novo na MESMA edição já apurada.
  const rC = await registarPalpite(C, ED, 100);
  assert.equal(rC.ok, false, "a edição apurada tem de RECUSAR palpites novos");
  assert.equal(rC.code, "EDICAO_APURADA");

  // 2.ª apuração: nada por apurar ⇒ ninguém mais é pago.
  const r2 = await apurarPalpite(ED, 100);
  assert.equal(r2.total, 0);
  assert.equal(r2.pontosCreditados, 0);
  assert.equal(await getPontos(C), 0, "a MESMA edição não pode pagar +2 duas vezes (R2)");
  assert.equal(await getPontos(A), 2, "o bónus total da edição é UM só (+2)");
});

test("R2 · edicaoApurada() é false antes da apuração e true depois", async () => {
  semear([A]);
  await registarPalpite(A, ED, 10);
  assert.equal(await edicaoApurada(ED), false, "ainda não há palpites apurados");
  await apurarPalpite(ED, 10);
  assert.equal(await edicaoApurada(ED), true, "depois de apurar, a edição está apurada");
  assert.equal(await edicaoApurada("RELAMP-1"), false, "outra edição continua livre");
});

test("R2 · a recusa é POR EDIÇÃO — uma edição nova continua a aceitar palpites", async () => {
  semear([A, B]);
  await registarPalpite(A, ED, 100);
  await apurarPalpite(ED, 100);
  const outra = await registarPalpite(B, "PROG-8", 42);
  assert.equal(outra.ok, true, "a PROG-8 não foi apurada — tem de aceitar");
  assert.equal(outra.criado, true);
});

// ── UTAC106g · facet do B2 — o crédito do bónus NÃO pode sobreviver a uma marcação falhada ────────
// Medido pelo validador adversarial na 2.ª ronda ([B2-4]): o crédito é aplicado ANTES da marcação;
// se a marcação falhar, nenhum palpite fica `apurado:true` ⇒ `edicaoApurada()` é false ⇒ uma 2.ª
// apuração volta a pagar +2 a OUTRO endereço ⇒ a MESMA edição paga 4. Fix in-escopo: desfazer o
// crédito recém-criado com `reverterMovimento()`.

test("B2 · se a MARCAÇÃO falhar, o crédito do bónus é DESFEITO (a edição não pode pagar 4)", async () => {
  semear([A, B]);
  await registarPalpite(A, ED, 100);
  await registarPalpite(B, ED, 500);

  FALHAR_MARCACAO = true;                       // a marcação da apuração falha
  const r1 = await apurarPalpite(ED, 100);
  assert.equal(r1.ok, false);
  assert.equal(r1.code, "ERRO_DB");
  assert.equal(await getPontos(A), 0, "o crédito do bónus tem de ser DESFEITO");
  assert.equal(await edicaoApurada(ED), false, "nada ficou marcado");

  FALHAR_MARCACAO = false;                      // a marcação volta a funcionar
  const r2 = await apurarPalpite(ED, 100);
  assert.equal(r2.ok, true);
  assert.equal(r2.pontosCreditados, 2);
  assert.equal(await getPontos(A), 2, "a edição paga UMA só vez (+2), nunca 4");
  assert.equal(await getPontos(B), 0);
  assert.equal(await edicaoApurada(ED), true, "agora sim a edição está apurada");
});
