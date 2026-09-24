// MC93-B — persistência da pontuação do torneio (offline, Supabase mockado).
//
// PORQUÊ ESTE TESTE EXISTE: o store decide prémio e regista dívida. Três
// invariantes não podem cair, e nenhum é observável em produção hoje (o leilão
// está travado em EM_BREVE_MODE):
//   1. UM bónus por ciclo por participante — cada emissão a mais é uma dívida
//      de 20 senhas (R$ 40,00) que alguém terá de liquidar on-chain;
//   2. `senhas_a_creditar` é um DIREITO, não um saldo — nunca pode entrar em
//      `saldoEfetivo`, senão quebra `saldoEfetivo ≤ saldoOnChain`
//      (`saldo-senhas.mjs:2-4`) e o utilizador vê senhas que `darLance`
//      recusa (`Leilao.sol:88`);
//   3. a sequência de acertos tem de ver as RODADAS FALHADAS — senão a
//      corrente nunca se parte e o bónus paga a quem não o ganhou.
//
// ⚠️ LIÇÃO DA VALIDAÇÃO INDEPENDENTE (SEG4): a primeira versão destes testes
// fazia `db.rankings.push(...)` e depois só LIA. O caminho de ESCRITA nunca
// era ligado ao de LEITURA, e 10 mutações do validador sobreviveram por isso.
// Agora o estado é construído CHAMANDO `registrarPontuacaoRodada`, e só se
// injecta linha à mão onde o objectivo é mesmo um estado impossível de
// produzir pelo fluxo normal.
//
// node --test --experimental-test-module-mocks _tests/mc93b-pontuacao-store.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── Supabase falso in-memory, com update+select e propagação de erro ─────────
const db = { pontuacoes: [], rankings: [] };
const filaEnfileirada = [];
let erroForcado = null;   // { tabela, operacao } → força `error` naquela chamada
let relogio = 0;

const tabela = (nome) => (nome === "pontuacoes" ? db.pontuacoes : db.rankings);
const erro = (nome, op) =>
  (erroForcado && erroForcado.tabela === nome && erroForcado.operacao === op
    ? { data: null, error: { message: "falha simulada" } }
    : null);

// ⚠️ O duplo tem de ENCADEAR como o PostgREST real: `.update(x).eq(…).eq(…)`
// e só depois `await` ou `.select()`. A primeira versão aplicava o update de
// imediato e devolvia um objecto sem `.eq`, o que rebentava — e, pior, teria
// aplicado a escrita sem respeitar os filtros que vêm a seguir.
function builder(nome) {
  const st = { filtros: {}, ordem: [], update: null };
  const filtrar = () => tabela(nome)
    .filter((r) => Object.entries(st.filtros).every(([k, v]) => r[k] === v));

  // Aplica o UPDATE pendente (se houver) respeitando todos os `.eq()`.
  const resolver = () => {
    if (st.update) {
      const e = erro(nome, "update"); if (e) return e;
      const alvos = filtrar();
      for (const r of alvos) Object.assign(r, st.update);
      return { data: alvos, error: null };
    }
    const e = erro(nome, "select"); if (e) return e;
    let linhas = filtrar();
    for (const [col, asc] of st.ordem) {
      linhas = [...linhas].sort((a, b) =>
        (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
    }
    return { data: linhas, error: null };
  };

  const api = {
    select() { return api; },
    eq(col, val) { st.filtros[col] = val; return api; },
    order(col, opts) { st.ordem.push([col, opts?.ascending !== false]); return api; },
    update(campos) { st.update = campos; return api; },
    upsert(linhas, opts) {
      const e = erro(nome, "upsert"); if (e) return Promise.resolve(e);
      const chave = (opts?.onConflict || "").split(",").map((s) => s.trim());
      for (const linha of [].concat(linhas)) {
        const alvo = tabela(nome).find((r) => chave.every((k) => r[k] === linha[k]));
        if (alvo) Object.assign(alvo, linha);
        else tabela(nome).push({ criado_em: ++relogio, liquidado_em: null, ...linha });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() {
      const e = erro(nome, "select"); if (e) return Promise.resolve(e);
      return Promise.resolve({ data: filtrar()[0] ?? null, error: null });
    },
    then(res, rej) { return Promise.resolve(resolver()).then(res, rej); },
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
    enfileirar: async (tipo, payload) => { filaEnfileirada.push({ tipo, payload }); return { id: "t1" }; },
  },
});

const {
  registrarPontuacaoRodada, lerRankingCiclo, lerFeedback, ordenarRanking,
} = await import("../_lib/pontuacao-store.mjs");
const { atualizarRanking, REGRAS } = await import("../_lib/pontuacao-utils.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "0xcccccccccccccccccccccccccccccccccccccccc";
const D = "0xdddddddddddddddddddddddddddddddddddddddd";
const lance = (endereco, valorCentavos) => ({ endereco, valorCentavos });

/** Rodada em que `vencedor` faz o menor único e `perdedor` repete valor. */
const rodada = (vencedor, perdedor) => [
  lance(vencedor, 30), lance(perdedor, 50), lance(C, 50),
];

beforeEach(() => {
  db.pontuacoes.length = 0; db.rankings.length = 0;
  filaEnfileirada.length = 0; erroForcado = null; relogio = 0;
});

// ── persistência ─────────────────────────────────────────────────────────────

test("grava uma linha por PARTICIPANTE, com acerto ou sem ele", async () => {
  // Quem não acerta também tem de ficar registado: sem as falhas, a sequência
  // de acertos consecutivos nunca se parte.
  await registrarPontuacaoRodada("R-1", [lance(A, 30), lance(B, 70), lance(C, 50), lance(C, 50)]);

  assert.equal(db.pontuacoes.length, 3, "A, B e C — C participou e falhou");
  const a = db.pontuacoes.find((r) => r.endereco === A);
  assert.equal(a.ciclo_id, "R-1");
  assert.equal(a.pontos, 4, "menor único = 1 + 3");
  assert.equal(a.acertos, 1);
  assert.equal(a.menor_unico, true);
  assert.equal(db.pontuacoes.find((r) => r.endereco === B).pontos, 1);
  const c = db.pontuacoes.find((r) => r.endereco === C);
  assert.equal(c.acertos, 0, "valor repetido → participou, não acertou");
  assert.equal(c.pontos, 0);
});

test("fechar a mesma rodada duas vezes não duplica nem soma (idempotente)", async () => {
  const lances = [lance(A, 30), lance(B, 70), lance(C, 50), lance(C, 50)];
  await registrarPontuacaoRodada("R-1", lances);
  await registrarPontuacaoRodada("R-1", lances);

  assert.equal(db.pontuacoes.length, 3, "upsert por (ciclo_id, endereco)");
  assert.equal(db.pontuacoes.find((r) => r.endereco === A).pontos, 4);
  assert.equal(db.rankings.filter((r) => r.endereco === A).length, 1);
  assert.equal(db.rankings.find((r) => r.endereco === A).pontos_totais, 4);
});

test("refechar NÃO apaga os pontos do bónus já ganho", async () => {
  // Defeito real encontrado na validação: `pontos_totais` era reposto com os
  // pontos da rodada e os +5 do bónus desapareciam, ficando `bonus_emitido`
  // a true — o participante perdia pontos por se refechar a edição.
  for (const c of ["R-1", "R-2", "R-3", "R-4"]) await registrarPontuacaoRodada(c, rodada(A, B));
  await registrarPontuacaoRodada("R-5", rodada(A, B));
  const comBonus = db.rankings.find((r) => r.ciclo_id === "R-5" && r.endereco === A);
  assert.equal(comBonus.bonus_emitido, true);
  assert.equal(comBonus.pontos_totais, 4 + REGRAS.PONTOS_BONUS, "4 da rodada + 5 do bónus");

  await registrarPontuacaoRodada("R-5", rodada(A, B));
  const depois = db.rankings.find((r) => r.ciclo_id === "R-5" && r.endereco === A);
  assert.equal(depois.pontos_totais, 4 + REGRAS.PONTOS_BONUS, "refechar não pode apagar o bónus");
  assert.equal(filaEnfileirada.length, 1, "e não pode enfileirar outra vez");
});

test("rodada sem lances válidos não grava nada", async () => {
  await registrarPontuacaoRodada("R-9", []);
  assert.equal(db.pontuacoes.length, 0);
  assert.equal(db.rankings.length, 0);
});

test("erro do Supabase PROPAGA — não passa em silêncio", async () => {
  // Sem isto, uma escrita recusada por RLS ou constraint respondia 200 OK e o
  // fail-soft da integração não tinha nada para apanhar.
  erroForcado = { tabela: "pontuacoes", operacao: "upsert" };
  await assert.rejects(
    () => registrarPontuacaoRodada("R-1", rodada(A, B)),
    /pontuacao-store/,
    "a falha de escrita tem de chegar ao chamador");
});

// ── ranking e desempate ──────────────────────────────────────────────────────

test("ranking ordena por pontos e desempata por MAIS ACERTOS", async () => {
  // Construído pelo FLUXO, não injectado: A ganha 4 (menor único, 1 acerto),
  // B ganha 2 acertos sem ser menor → empatam a 4? não: B faz 2 únicos = 2.
  // Usa-se uma rodada desenhada para o empate com acertos diferentes.
  await registrarPontuacaoRodada("R-1", [
    lance(A, 10),                 // único e menor → 1 + 3 = 4, 1 acerto
    lance(B, 20), lance(B, 30), lance(B, 40), lance(B, 50), // 4 únicos → 4 pontos
    lance(C, 60), lance(D, 60),   // repetido → 0
  ]);
  const r = await lerRankingCiclo("R-1");
  assert.equal(r[0].endereco, B, "empate a 4 → ganha quem tem mais acertos (4 > 1)");
  assert.equal(r[0].acertosTotais, 4);
  assert.equal(r[1].endereco, A);
  assert.deepEqual(r.slice(0, 2).map((x) => x.posicao), [1, 2]);
});

test("desempate concorda com atualizarRanking quando os acertos são iguais", async () => {
  await registrarPontuacaoRodada("R-2", [
    lance(B, 10), lance(C, 20), lance(D, 30), lance(D, 30),
  ]);
  // B (menor único) 4 pts / C 1 pt — sem empate; força-se o empate a 1 acerto:
  await registrarPontuacaoRodada("R-3", [lance(B, 10), lance(C, 20)]);
  const doStore = (await lerRankingCiclo("R-3")).map((x) => x.endereco);
  const doMotor = atualizarRanking(
    db.rankings.filter((x) => x.ciclo_id === "R-3")
      .map((x) => ({ endereco: x.endereco, pontosTotais: x.pontos_totais })),
  ).map((x) => x.endereco);
  assert.deepEqual(doStore, doMotor, "acertos iguais → as duas regras coincidem");
});

test("ranking com empate total partilha posição (1-2-2-4)", () => {
  // Estado impossível de produzir por uma só rodada → injecção deliberada,
  // mas na FUNÇÃO PURA de ordenação, não na base.
  const r = ordenarRanking([
    { endereco: A, pontos_totais: 10, acertos_totais: 4 },
    { endereco: B, pontos_totais: 7, acertos_totais: 2 },
    { endereco: C, pontos_totais: 7, acertos_totais: 2 },
    { endereco: D, pontos_totais: 1, acertos_totais: 1 },
  ]);
  assert.deepEqual(r.map((x) => x.posicao), [1, 2, 2, 4]);
});

test("ranking: linha sem pontos_totais NÃO chega ao 1.º lugar", () => {
  // `b.x - a.x` com undefined dá NaN, que é falsy: o `||` saltava o critério
  // primário e a linha corrompida subia ao topo.
  const r = ordenarRanking([
    { endereco: A },                                        // sem pontos
    { endereco: B, pontos_totais: 9, acertos_totais: 2 },
  ]);
  assert.equal(r[0].endereco, B, "quem tem 9 pontos vem antes de quem não tem nenhum");
});

// ── bónus: um por ciclo, e é DIREITO, não saldo ──────────────────────────────

test("cinco ciclos seguidos com acerto dão UM bónus, pelo fluxo real", async () => {
  // O bónus tem de ser alcançável SEM o chamador passar histórico nenhum —
  // era exactamente esse o defeito: a integração nunca o passava e o bónus
  // era inalcançável em produção.
  for (const c of ["R-1", "R-2", "R-3", "R-4"]) {
    await registrarPontuacaoRodada(c, rodada(A, B));
    assert.equal(filaEnfileirada.length, 0, `${c}: ainda não são 5`);
  }
  const r = await registrarPontuacaoRodada("R-5", rodada(A, B));
  assert.equal(r.bonusRegistados, 1);
  assert.equal(filaEnfileirada.length, 1);
  assert.equal(filaEnfileirada[0].tipo, "creditar-senhas-bonus");
  assert.equal(filaEnfileirada[0].payload.quantidade, REGRAS.SENHAS_BONUS);
});

test("uma rodada FALHADA parte a sequência e adia o bónus", async () => {
  // Sem gravar quem falhou, a corrente nunca se parte e o bónus paga a mais.
  await registrarPontuacaoRodada("R-1", rodada(A, B));
  await registrarPontuacaoRodada("R-2", rodada(A, B));
  await registrarPontuacaoRodada("R-3", [lance(A, 50), lance(B, 50)]); // A falha
  await registrarPontuacaoRodada("R-4", rodada(A, B));
  await registrarPontuacaoRodada("R-5", rodada(A, B));
  assert.equal(filaEnfileirada.length, 0,
    "5 participações mas só 2 acertos seguidos depois da falha");
});

test("o bónus é um DIREITO por liquidar — nunca um saldo já creditado", async () => {
  for (const c of ["R-1", "R-2", "R-3", "R-4", "R-5"]) await registrarPontuacaoRodada(c, rodada(A, B));
  const linha = db.rankings.find((r) => r.ciclo_id === "R-5" && r.endereco === A);
  assert.equal(linha.senhas_a_creditar, REGRAS.SENHAS_BONUS);
  assert.equal(linha.liquidado_em, null, "só a liquidação on-chain preenche liquidado_em");
});

test("o store NUNCA credita senhas on-chain", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const aqui = dirname(fileURLToPath(import.meta.url));
  const codigo = readFileSync(resolve(aqui, "../_lib/pontuacao-store.mjs"), "utf8")
    .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const proibido of [/creditarSenhas/, /adicionarSenhas/, /from\s+["']ethers["']/, /contract\.mjs/]) {
    assert.doesNotMatch(codigo, proibido,
      "emissão on-chain está fora deste MC — o bónus é um direito enfileirado");
  }
});

// ── feedback ─────────────────────────────────────────────────────────────────

test("feedback devolve posição, sequência e quanto falta para o bónus", async () => {
  await registrarPontuacaoRodada("R-1", rodada(A, B));
  await registrarPontuacaoRodada("R-2", rodada(A, B));
  const f = await lerFeedback("R-2", A);
  assert.equal(f.pontosTotais, 4);
  assert.equal(f.posicao, 1);
  assert.equal(f.sequenciaAtual, 2, "dois ciclos seguidos com acerto");
  assert.equal(f.faltamParaBonus, REGRAS.ACERTOS_PARA_BONUS - 2);
  assert.equal(f.bonusEmitido, false);
});

test("feedback: rodada falhada NÃO conta para a sequência", async () => {
  await registrarPontuacaoRodada("R-1", rodada(A, B));
  await registrarPontuacaoRodada("R-2", [lance(A, 50), lance(B, 50)]); // A falha
  const f = await lerFeedback("R-2", A);
  assert.equal(f.sequenciaAtual, 0, "a última rodada foi falhada → corrente a zero");
});

test("feedback reflecte o bónus JÁ emitido e o direito por liquidar", async () => {
  for (const c of ["R-1", "R-2", "R-3", "R-4", "R-5"]) await registrarPontuacaoRodada(c, rodada(A, B));
  const f = await lerFeedback("R-5", A);
  assert.equal(f.bonusEmitido, true, "quem já ganhou tem de o ver");
  assert.equal(f.senhasACreditar, REGRAS.SENHAS_BONUS);
  assert.equal(f.liquidado, false, "liquidado_em NULL → dívida em aberto");
});

test("feedback de quem não jogou devolve zeros, não erro", async () => {
  const f = await lerFeedback("R-1", C);
  assert.equal(f.pontosTotais, 0);
  assert.equal(f.posicao, null);
  assert.equal(f.sequenciaAtual, 0);
  assert.equal(f.faltamParaBonus, REGRAS.ACERTOS_PARA_BONUS);
});

// ── Lacunas expostas pela mutação do Validador (SEG4) ────────────────────────

test("recalcularPosicoes NÃO mexe nas posições de outros ciclos", async () => {
  // Sem o filtro de ciclo, fechar R-2 reescrevia as posições de R-1.
  await registrarPontuacaoRodada("R-1", [lance(A, 10), lance(B, 20)]);
  const posA_R1 = db.rankings.find((r) => r.ciclo_id === "R-1" && r.endereco === A).posicao;
  await registrarPontuacaoRodada("R-2", [lance(B, 10), lance(A, 20)]); // ordem trocada
  assert.equal(db.rankings.find((r) => r.ciclo_id === "R-1" && r.endereco === A).posicao,
    posA_R1, "o ciclo R-1 não pode ser tocado ao fechar R-2");
  assert.equal(db.rankings.find((r) => r.ciclo_id === "R-2" && r.endereco === B).posicao, 1);
});

test("empate total é determinístico — a ordem do input não muda o ranking", () => {
  // O ranking decide prémio: sem o 3.º critério, duas leituras da mesma base
  // podiam devolver ordens diferentes.
  const linhas = [
    { endereco: C, pontos_totais: 7, acertos_totais: 2 },
    { endereco: B, pontos_totais: 7, acertos_totais: 2 },
  ];
  const r1 = ordenarRanking(linhas).map((x) => x.endereco);
  const r2 = ordenarRanking([...linhas].reverse()).map((x) => x.endereco);
  assert.deepEqual(r1, r2);
  assert.equal(r1[0], B, "endereço menor primeiro");
});

test("faltamParaBonus reinicia depois de completar uma sequência", async () => {
  // Com 5 acertos seguidos faltam 5 para o PRÓXIMO bónus, não 0.
  for (const c of ["R-1", "R-2", "R-3", "R-4", "R-5"]) await registrarPontuacaoRodada(c, rodada(A, B));
  const f = await lerFeedback("R-5", A);
  assert.equal(f.sequenciaAtual, 5);
  assert.equal(f.faltamParaBonus, REGRAS.ACERTOS_PARA_BONUS,
    "completou uma sequência → faltam 5 para a seguinte, não 0");
});

test("repontuar NÃO apaga a liquidação já feita (evita pagamento duplo)", async () => {
  for (const c of ["R-1", "R-2", "R-3", "R-4", "R-5"]) await registrarPontuacaoRodada(c, rodada(A, B));
  const linha = db.rankings.find((r) => r.ciclo_id === "R-5" && r.endereco === A);
  linha.liquidado_em = "2026-09-24T10:00:00Z";        // a coordenação liquidou

  await registrarPontuacaoRodada("R-5", rodada(A, B)); // repontuar a edição
  assert.equal(
    db.rankings.find((r) => r.ciclo_id === "R-5" && r.endereco === A).liquidado_em,
    "2026-09-24T10:00:00Z",
    "apagar liquidado_em faria a dívida parecer em aberto e pagar-se outra vez");
});

test("duas consolidações EM PARALELO do mesmo ciclo dão UM só bónus", async () => {
  // A validação independente mediu isto: com read-then-write, as duas chamadas
  // liam `bonus_emitido: false`, ambas gravavam 20 senhas e ambas enfileiravam
  // — o livro-razão dizia 20 e a fila mandava creditar 40. O compare-and-set
  // (`.eq("bonus_emitido", false)`) é o que impede a segunda de ganhar.
  for (const c of ["R-1", "R-2", "R-3", "R-4"]) await registrarPontuacaoRodada(c, rodada(A, B));
  filaEnfileirada.length = 0;

  const [r1, r2] = await Promise.all([
    registrarPontuacaoRodada("R-5", rodada(A, B)),
    registrarPontuacaoRodada("R-5", rodada(A, B)),
  ]);

  assert.equal(r1.bonusRegistados + r2.bonusRegistados, 1,
    "só uma das chamadas pode reclamar o bónus");
  assert.equal(filaEnfileirada.length, 1, "uma só ordem de crédito на fila");
  const linha = db.rankings.find((r) => r.ciclo_id === "R-5" && r.endereco === A);
  assert.equal(linha.senhas_a_creditar, REGRAS.SENHAS_BONUS,
    "20 senhas no livro-razão, não 40");
});

test("endereços são normalizados para minúsculas (o CHECK do SQL exige)", async () => {
  // `pontuacoes_endereco_check` é `^0x[0-9a-f]{40}$`: um endereço em
  // maiúsculas seria recusado pelo PostgreSQL com 23514.
  await registrarPontuacaoRodada("R-1", [
    { endereco: A.toUpperCase(), valorCentavos: 30 },
    lance(B, 50), lance(C, 50),
  ]);
  for (const linha of [...db.pontuacoes, ...db.rankings]) {
    assert.match(linha.endereco, /^0x[0-9a-f]{40}$/,
      `${linha.endereco} não passa no CHECK da migração`);
  }
});
