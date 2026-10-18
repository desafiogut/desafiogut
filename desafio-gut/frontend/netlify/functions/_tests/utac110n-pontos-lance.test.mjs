// UTAC110n — O LANCE GASTA PONTOS DE LANCE (Frentes A–G).
//
// REAIS: `_lib/ledger-lance.mjs`, `_lib/fontes-lance.mjs`, `_lib/pontuacao-store.mjs`,
// `_lib/comprar-passe-tipado.mjs` (via `comprar-passe-relampago.mjs`), `ranking-pontos-lance.mjs`,
// `_lib/jwt.mjs` (tokens ASSINADOS — nunca se mocka o verificador).
// Duplos só nas fronteiras de I/O: Blobs (`_blobs-cas-duplo.mjs`), Supabase
// (`_supabase-duplo-mc105a.mjs`, que passou a modelar `pontos`, `pontuacoes` e `rankings_ciclo` com
// as colunas e CHECKs reais) e Sentry (espiado).
//
// node --test --experimental-test-module-mocks _tests/utac110n-pontos-lance.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110n-pontos-de-lance-comprimento-suficiente";

const alertas = [];
let B = criarBlobs(), S = criarSupabase(), cliente = S.cliente;

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/sentry-server.mjs", { namedExports: {
  captureSecurityAlert: async (k, p) => { alertas.push([k, p]); }, Sentry: {} } });

const L  = await import("../_lib/ledger-lance.mjs");
const F  = await import("../_lib/fontes-lance.mjs");
const PS = await import("../_lib/pontuacao-store.mjs");
const { default: hPasseRelampago } = await import("../comprar-passe-relampago.mjs");
const { default: hRanking } = await import("../ranking-pontos-lance.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C2 = "0xcccccccccccccccccccccccccccccccccccccccc";

beforeEach(() => {
  B = criarBlobs(); S = criarSupabase(); cliente = S.cliente;
  alertas.length = 0;
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
  S.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "x" });
});

const linha = (e = A) => S.tabelas.pontos.find((l) => l.endereco === e);
const pontosLance = (e = A) => Number(linha(e)?.pontos_lance ?? 0);
const movimentos = (e = A) => (linha(e)?.historico_lance ?? []);

/** Semeia pontos de lance por ENGajamento (a fonte é indiferente para o teste). */
async function semearPontos(e, quantidade) {
  const r = await L.creditarPontosLance(e, quantidade, "boas-vindas", `semear:${e}:${quantidade}`);
  assert.equal(r.ok, true, `semear falhou: ${r.code}`);
  return r;
}

// ═══ FRENTE A — o lance gasta PONTOS DE LANCE ═════════════════════════════════════════════════════

test("A1 · um lance de 37 pontos gasta 37 pontos do saldo (e nada mais)", async () => {
  await semearPontos(A, 200);
  const antes = pontosLance();
  assert.equal(antes, 200);

  const r = await L.consumirPontosLance(A, 37, "lance:teste-37");
  assert.equal(r.ok, true);
  assert.equal(r.criado, true);
  assert.equal(pontosLance(), 163, "200 − 37 = 163");
  assert.equal(Number(linha().creditos_lance), 0, "o lance NÃO toca nos créditos legados");
  assert.equal(Number(linha().pontos), 0, "o lance NÃO toca nos pontos de fidelidade");

  const mov = movimentos().at(-1);
  assert.equal(mov.campo, "pontos_lance");
  assert.equal(mov.motivo, "lance");
  assert.equal(mov.delta, -37);
  assert.equal(mov.ref, "lance:teste-37");
});

test("A2 · saldo insuficiente RECUSA e não escreve nada (nunca saldo negativo)", async () => {
  await semearPontos(A, 10);
  const r = await L.consumirPontosLance(A, 37, "lance:sem-saldo");
  assert.equal(r.ok, false);
  assert.equal(r.code, "PONTOS_LANCE_INSUFICIENTES");
  assert.equal(pontosLance(), 10, "o saldo fica intacto");
  assert.equal(movimentos().length, 1, "nenhuma entrada nova no histórico");
});

test("A3 · idempotência: a MESMA ref não debita duas vezes (retry do mesmo lance)", async () => {
  await semearPontos(A, 100);
  const r1 = await L.consumirPontosLance(A, 40, "lance:abc");
  const r2 = await L.consumirPontosLance(A, 40, "lance:abc");
  assert.equal(r1.criado, true);
  assert.equal(r2.criado, false, "o 2.º pedido é o mesmo movimento");
  assert.equal(pontosLance(), 60, "100 − 40, uma só vez");
});

test("A4 · reversão devolve os pontos: o retry volta a poder gastar", async () => {
  await semearPontos(A, 100);
  await L.consumirPontosLance(A, 40, "lance:reverter");
  assert.equal(pontosLance(), 60);

  const rev = await L.reverterMovimentoLance(A, "lance:reverter");
  assert.equal(rev.revertido, true);
  assert.equal(pontosLance(), 100, "o lance falhado devolve tudo");
  assert.equal(movimentos().some((h) => h.ref === "lance:reverter"), false);

  const deNovo = await L.consumirPontosLance(A, 40, "lance:reverter");
  assert.equal(deNovo.criado, true, "depois de revertido, a mesma ref volta a consumir");
  assert.equal(pontosLance(), 60);
});

test("A5 · cadeia do lance: 200 pontos − 37 do lance + 10 da missão do dia = 173", async () => {
  await semearPontos(A, 200);
  await L.consumirPontosLance(A, 37, "lance:cadeia");
  const m = await F.creditarMissaoLance(A);
  assert.equal(m.ok, true);
  assert.equal(pontosLance(), 173);
});

test("A6 · quantidade inválida é recusada (0, negativo, fraccionário) — sem escrita", async () => {
  await semearPontos(A, 50);
  for (const q of [0, -5, 1.5, "10", null]) {
    const r = await L.consumirPontosLance(A, q, `lance:invalida:${q}`);
    assert.equal(r.ok, false, `quantidade ${q} devia ser recusada`);
    assert.equal(r.code, "QUANTIDADE_INVALIDA");
  }
  assert.equal(pontosLance(), 50);
});

// ═══ FRENTE B — o Passe Relâmpago dá +200 PONTOS DE LANCE ════════════════════════════════════════

let ip = 0;
async function comprar({ key = "idem-110n-1", token } = {}) {
  const tk = token ?? await assinarUserSession(A);
  const req = new Request("https://x/.netlify/functions/comprar-passe-relampago", {
    method: "POST", body: JSON.stringify({ idempotencyKey: key }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": `10.8.0.${++ip % 250}`,
      authorization: `Bearer ${tk}` },
  });
  const r = await hPasseRelampago(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

test("B1 · comprar o Passe Relâmpago credita 200 pontos de lance (motivo passe-relampago)", async () => {
  const { status, corpo } = await comprar({ key: "idem-110n-passe-1" });
  assert.equal(status, 201, JSON.stringify(corpo));
  assert.equal(corpo.pontosLance, 200);
  assert.equal(corpo.pontosFidelidade, 10);
  assert.equal(corpo.creditosLance, 0, "o crédito legado já não é creditado");

  assert.equal(pontosLance(), 200);
  assert.equal(Number(linha().creditos_lance), 0);
  const mov = movimentos().at(-1);
  assert.equal(mov.campo, "pontos_lance");
  assert.equal(mov.motivo, "passe-relampago");
  assert.equal(mov.delta, 200);
});

test("B2 · idempotência do Passe: repetir a chave NÃO credita outros 200", async () => {
  await comprar({ key: "idem-110n-passe-2" });
  const { status, corpo } = await comprar({ key: "idem-110n-passe-2" });
  assert.equal(status, 200);
  assert.equal(corpo.idempotent, true);
  assert.equal(pontosLance(), 200, "uma compra, um crédito");
});

test("B3 · rollback: falha do ECOQUILDO desfaz os 200 pontos e o R$ volta", async () => {
  // O lastro é actualizado (não inserido) por `registarEmissaoNoLastro` — a falha tem de ser no UPDATE.
  S.g.falhar.eco_quildo_lastro = { op: "update", code: "XX000" };
  const { status, corpo } = await comprar({ key: "idem-110n-passe-3" });
  assert.equal(status, 502, JSON.stringify(corpo));
  assert.equal(pontosLance(), 0, "os 200 pontos de lance foram desfeitos");
  assert.equal(Number(linha().pontos ?? 0), 0, "os 10 de fidelidade também");
  assert.equal(movimentos().some((h) => h.motivo === "passe-relampago"), false, "nem rasto no histórico");
  const saldo = S.tabelas.saldo_rs.find((l) => l.cliente_id === A)?.payload?.centavos;
  assert.equal(saldo, 500, "o R$ 2,00 voltou");
});

test("B4 · o Passe Programado NÃO dá pontos de lance", async () => {
  const { default: hProgramado } = await import("../comprar-passe-programado.mjs");
  const tk = await assinarUserSession(A);
  const req = new Request("https://x/.netlify/functions/comprar-passe-programado", {
    method: "POST", body: JSON.stringify({ idempotencyKey: "idem-110n-prog-1" }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": "10.8.0.200",
      authorization: `Bearer ${tk}` },
  });
  const r = await hProgramado(req);
  const corpo = await r.json();
  assert.equal(r.status, 201, JSON.stringify(corpo));
  assert.equal("pontosLance" in corpo, false);
  assert.equal(pontosLance(), 0);
});

// ═══ FRENTE C — o bónus de 5 acertos dá +50 PONTOS (não senhas) ══════════════════════════════════

/** Uma rodada em que `e` ACERTA (valor único) e `outro` não. */
const rodadaAcerto = (e, valor) => [{ endereco: e, valorCentavos: valor }];
/** Uma rodada em que `e` NÃO acerta (valor repetido). */
const rodadaFalha = (e) => [{ endereco: e, valorCentavos: 700 }, { endereco: B2, valorCentavos: 700 }];

async function cincoAcertos() {
  for (let i = 1; i <= 5; i++) {
    const r = await PS.registrarPontuacaoRodada(`R-${i}`, rodadaAcerto(A, 100 + i));
    assert.equal(r.participantes, 1);
  }
}

test("C1 · 5 acertos seguidos creditam 50 pontos de lance, motivo sequencia, com ref por ciclo", async () => {
  await cincoAcertos();
  assert.equal(pontosLance(), PS.PONTOS_LANCE_BONUS_SEQUENCIA);
  assert.equal(PS.PONTOS_LANCE_BONUS_SEQUENCIA, 50);
  const mov = movimentos().at(-1);
  assert.equal(mov.campo, "pontos_lance");
  assert.equal(mov.motivo, "sequencia");
  assert.equal(mov.delta, 50);
  assert.equal(mov.ref, "sequencia:R-5", "a ref é do ciclo em que o bónus fechou");
});

test("C2 · o bónus NÃO enfileira senhas on-chain (a coluna fica a 0)", async () => {
  await cincoAcertos();
  const rank = S.tabelas.rankings_ciclo.find((l) => l.ciclo_id === "R-5" && l.endereco === A);
  assert.equal(rank.bonus_emitido, true);
  assert.equal(Number(rank.senhas_a_creditar ?? 0), 0, "senhas_a_creditar deixou de ser escrita");
});

test("C3 · 1 bónus por ciclo: reconsolidar o mesmo ciclo não paga outros 50", async () => {
  await cincoAcertos();
  assert.equal(pontosLance(), 50);
  await PS.registrarPontuacaoRodada("R-5", rodadaAcerto(A, 105));
  await PS.registrarPontuacaoRodada("R-5", rodadaAcerto(A, 106));
  assert.equal(pontosLance(), 50, "continua um só bónus");
});

test("C4 · anti-cumulativa (MC93-C): ciclos seguintes com derrotas não voltam a pagar", async () => {
  await cincoAcertos();
  assert.equal(pontosLance(), 50);
  for (let i = 6; i <= 15; i++) await PS.registrarPontuacaoRodada(`R-${i}`, rodadaFalha(A));
  assert.equal(pontosLance(), 50, "a sequência já paga não volta a pagar em cada ciclo novo");
});

test("C5 · se o crédito falhar, a reclamação é LIBERTADA e o retry paga (não se perde o bónus)", async () => {
  await semearPontos(A, 0 + 1); // garante que a linha existe (o UPDATE é o caminho exercitado)
  for (let i = 1; i <= 4; i++) await PS.registrarPontuacaoRodada(`R-${i}`, rodadaAcerto(A, 100 + i));
  assert.equal(pontosLance(), 1, "só o valor semeado");

  S.g.falhar.pontos = { op: "update", code: "XX000" };
  await PS.registrarPontuacaoRodada("R-5", rodadaAcerto(A, 105));
  const rank = S.tabelas.rankings_ciclo.find((l) => l.ciclo_id === "R-5" && l.endereco === A);
  assert.equal(rank.bonus_emitido, false, "a reclamação foi devolvida");
  assert.equal(pontosLance(), 1, "nada creditado");

  delete S.g.falhar.pontos;
  await PS.registrarPontuacaoRodada("R-5", rodadaAcerto(A, 105));
  assert.equal(pontosLance(), 51, "o retry credita os 50 que faltavam, uma só vez");
});

// ═══ FRENTE D — o ciclo de missões vale 225 pontos (210 líquidos), alcançável DE GRAÇA ═══════════

test("D1 · o ciclo: alvo 225 · 15 pontos/dia · 15 dias (15×15 = 225 ≥ 225)", () => {
  assert.equal(F.PONTOS_CICLO_MISSOES, 225);
  assert.equal(F.PONTOS_DIA_MISSOES, F.PONTOS_LOGIN_DIARIO + F.PONTOS_MISSAO_LANCE);
  assert.equal(F.PONTOS_DIA_MISSOES, 15);
  assert.equal(F.DIAS_CICLO_MISSOES, 15);
  assert.ok(F.DIAS_CICLO_MISSOES * F.PONTOS_DIA_MISSOES >= F.PONTOS_CICLO_MISSOES);
});

test("D2 · um utilizador que SÓ faz missões chega ao alvo em 15 dias (sem Passe)", async () => {
  const base = Date.parse("2026-11-01T12:00:00Z");
  for (let d = 0; d < F.DIAS_CICLO_MISSOES; d++) {
    const agora = new Date(base + d * 24 * 3600 * 1000);
    await F.creditarLoginDiario(A, agora);
    await F.creditarMissaoLance(A, agora);
  }
  assert.equal(pontosLance(), F.DIAS_CICLO_MISSOES * F.PONTOS_DIA_MISSOES);
  assert.ok(pontosLance() >= 200, "225 brutos ≥ 200: alcançável de graça");

  const prog = F.progressoCicloMissoes(linha());
  assert.equal(prog.completo, true);
  assert.equal(prog.pontos, 225);
  assert.equal(prog.faltam, 0);
});

test("D3 · o progresso do ciclo não conta o bónus do Passe nem o gasto do lance", async () => {
  await semearPontos(A, 0 + 190); // «boas-vindas» CONTA como ganho gratuito
  await L.creditarPontosLance(A, 200, "passe-relampago", "passe:progresso");
  await L.consumirPontosLance(A, 37, "lance:progresso");
  const prog = F.progressoCicloMissoes(linha());
  assert.equal(prog.ganhos, 190, "só boas-vindas: o Passe não é ganho de ciclo");
  assert.equal(pontosLance(), 353, "190 + 200 − 37 (saldo real, que É o que o lance gasta)");
  assert.equal(prog.completo, false);
  assert.equal(prog.faltam, 35, "225 − 190");
});

// UTAC110n — achado ⚠️2 do validador SEG8: o número do ciclo é BRUTO. A missão de +10 exige dar um
// lance, e um lance custa no mínimo 1 ponto. Este teste mede os DOIS lados para o número não voltar a
// ser lido como se fosse líquido.
// UTAC110n.1 (decisão do operador): 14 dias davam 196 LÍQUIDOS — abaixo dos 200. Passou a 15 dias ⇒
// 210 líquidos, que é o que o teste agora exige: o ciclo tem de fechar TAMBÉM no líquido.
test("D2b · o ciclo é BRUTO: com 1 lance de 1 ponto/dia, 15 dias dão 210 líquidos (≥ 200)", async () => {
  const base = Date.parse("2026-12-01T12:00:00Z");
  for (let d = 0; d < F.DIAS_CICLO_MISSOES; d++) {
    const agora = new Date(base + d * 24 * 3600 * 1000);
    await F.creditarLoginDiario(A, agora);            // +5
    await L.consumirPontosLance(A, 1, `lance:dia-${d}`); // −1 (o lance mínimo, para a missão contar)
    await F.creditarMissaoLance(A, agora);            // +10
  }
  assert.equal(pontosLance(), 210, "15 dias × (5 + 10 − 1)");
  const prog = F.progressoCicloMissoes(linha());
  assert.equal(prog.ganhos, 225, "o medidor conta GANHOS (bruto), por desenho");
  assert.equal(prog.completo, true);
  assert.ok(pontosLance() >= 200,
    "…e a carteira TEM os 200 para licitar: é este o requisito que 14 dias não cumpriam (196)");
  assert.equal(F.DIAS_CICLO_MISSOES, 15, "14 dias voltariam a dar 196 líquidos");
});

// ═══ FRENTE E — conversão de créditos em pontos (DEBT-071) ══════════════════════════════════════

const MIGRACAO = new URL("../../../supabase/migrations/20261018_utac110n_conversao_creditos_lance.sql", import.meta.url);
const SQL = (await import("node:fs")).readFileSync(MIGRACAO, "utf8");
const SQL_CORPO = SQL.replace(/--[^\n]*/g, "");

test("E1 · a migração converte 1 crédito em 200 pontos e zera os créditos", () => {
  assert.match(SQL_CORPO, /pontos_lance\s*=\s*pontos_lance\s*\+\s*\(creditos_lance\s*\*\s*200\)/);
  assert.match(SQL_CORPO, /creditos_lance\s*=\s*0/);
  assert.match(SQL_CORPO, /WHERE\s+creditos_lance\s*>\s*0/);
});

test("E2 · é IDEMPOTENTE por construção: o guard e a zeragem estão na MESMA instrução", () => {
  const instrucoes = SQL_CORPO.split(";").map((s) => s.trim()).filter(Boolean);
  const update = instrucoes.find((s) => /^UPDATE\s+public\.pontos/i.test(s));
  assert.ok(update, "não encontrei o UPDATE da conversão");
  assert.match(update, /creditos_lance\s*=\s*0/, "zera na mesma instrução");
  assert.match(update, /WHERE\s+creditos_lance\s*>\s*0/, "uma 2.ª execução não encontra linhas");
  assert.equal(/DROP\s+COLUMN/i.test(SQL_CORPO), false, "não apaga a coluna (o histórico fica)");
});

test("E3 · regista a conversão no historico_lance com motivo próprio e o delta certo", () => {
  assert.match(SQL_CORPO, /historico_lance\s*=\s*historico_lance\s*\|\|/);
  assert.match(SQL_CORPO, /'motivo',\s*'conversao-creditos'/);
  assert.match(SQL_CORPO, /'delta',\s*creditos_lance\s*\*\s*200/);
  assert.match(SQL_CORPO, /'campo',\s*'pontos_lance'/);
});

test("E4 · deriva: 3 créditos ⇒ 600 pontos (a aritmética do SQL, aplicada)", () => {
  const factor = Number(/(\d+)\s*\)/.exec(/creditos_lance\s*\*\s*(\d+)\)/.exec(SQL_CORPO)[0])[1]);
  assert.equal(factor, 200);
  assert.equal(factor * 1, 200, "1 crédito = 200 pontos");
  assert.equal(factor * 3, 600);
});

// UTAC110n — achado ⚠️4 do validador SEG8 (medido em PostgreSQL 16): sem o instante na ref, converter
// de novo créditos REINTRODUZIDOS na mesma linha criava uma 2.ª entrada com a MESMA ref — e o ledger
// assume que a ref é única.
test("E5 · a ref da conversão leva o instante, para não colidir numa re-conversão", () => {
  assert.match(SQL_CORPO, /'ref',\s*'conversao-creditos:'\s*\|\|\s*endereco\s*\|\|\s*':'\s*\|\|\s*creditos_lance/);
  assert.match(SQL_CORPO, /to_char\(now\(\)[^)]*YYYYMMDDHH24MISSMS/, "falta o sufixo de instante na ref");
});

// UTAC110n — achado ⚠️3 do validador SEG8: o índice do placar tem de poder ser aplicado SEM a conversão
// (o endpoint público já está no ar).
test("E6 · o índice do placar vive em migração PRÓPRIA, não na conversão", async () => {
  assert.equal(/CREATE\s+INDEX/i.test(SQL_CORPO), false, "a conversão não pode ser quem cria o índice");
  const fs = await import("node:fs");
  const idx = fs.readFileSync(new URL("../../../supabase/migrations/20261018_utac110n_indice_ranking.sql", import.meta.url), "utf8");
  assert.match(idx, /CREATE INDEX IF NOT EXISTS pontos_pontos_lance_idx/);
  assert.match(idx, /ON public\.pontos \(pontos_lance DESC\)/);
  assert.match(idx, /NÃO está aplicada|NAO esta aplicada|não foi aplicada/i, "o cabeçalho tem de dizer por que é separado");
});

// ═══ FRENTE F — ranking de pontos de lance ═══════════════════════════════════════════════════════
test("F1 · ordena pelo SALDO ACTUAL, com posições 1-2-2-4 e endereços mascarados", async () => {
  const cliente = await import("../ranking-pontos-lance.mjs");
  const out = cliente.ordenarPorPontosLance([
    { endereco: A, pontos_lance: 100 },
    { endereco: B2, pontos_lance: 300 },
    { endereco: C2, pontos_lance: 300 },
  ]);
  assert.deepEqual(out.map((l) => l.posicao), [1, 1, 3]);
  assert.equal(out[0].pontos, 300);
  assert.equal(out[0].endereco, "0xbbbb…bbbb", "mascarado no formato 0x1234…abcd");
  assert.match(out[0].endereco, /^0x[0-9a-f]{4}…[0-9a-f]{4}$/);
  assert.equal(out[2].pontos, 100);
});

test("F2 · endpoint: devolve o placar do saldo, sem endereço inteiro e sem quem tem 0", async () => {
  S.tabelas.pontos.push(
    { endereco: A,  pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 150, historico_lance: [] },
    { endereco: B2, pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 400, historico_lance: [] },
    { endereco: C2, pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 0,   historico_lance: [] },
  );
  const r = await hRanking(new Request("https://x/.netlify/functions/ranking-pontos-lance?limite=10", {
    method: "GET", headers: { "x-nf-client-connection-ip": "10.7.0.1" } }));
  assert.equal(r.status, 200);
  const corpo = await r.json();
  assert.equal(corpo.total, 2);
  assert.equal(corpo.ranking[0].pontos, 400);
  assert.equal(corpo.ranking[0].posicao, 1);
  assert.equal(corpo.ranking[1].pontos, 150);
  for (const l of corpo.ranking) {
    assert.equal(l.endereco.includes("0xaaaaaaaaaaaaaaaa"), false, "nunca o endereço inteiro");
    assert.match(l.endereco, /^0x[0-9a-f]{4}…[0-9a-f]{4}$/);
  }
});

test("F3 · o placar segue o SALDO: quem gasta num lance desce", async () => {
  S.tabelas.pontos.push(
    { endereco: A,  pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 300, historico_lance: [] },
    { endereco: B2, pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 100, historico_lance: [] },
  );
  const antes = await (await hRanking(new Request("https://x/.netlify/functions/ranking-pontos-lance", {
    method: "GET", headers: { "x-nf-client-connection-ip": "10.7.0.2" } }))).json();
  assert.equal(antes.ranking[0].endereco.startsWith("0xaaaa"), true);

  await L.consumirPontosLance(A, 250, "lance:placar");
  const depois = await (await hRanking(new Request("https://x/.netlify/functions/ranking-pontos-lance", {
    method: "GET", headers: { "x-nf-client-connection-ip": "10.7.0.3" } }))).json();
  assert.equal(depois.ranking[0].endereco.startsWith("0xbbbb"), true, "B2 passou a liderar");
  assert.equal(depois.ranking[1].pontos, 50, "A ficou com 50");
});

test("F4 · método e limite inválidos", async () => {
  const post = await hRanking(new Request("https://x/.netlify/functions/ranking-pontos-lance", {
    method: "POST", headers: { "x-nf-client-connection-ip": "10.7.0.4" } }));
  assert.equal(post.status, 405);

  const mau = await hRanking(new Request("https://x/.netlify/functions/ranking-pontos-lance?limite=0", {
    method: "GET", headers: { "x-nf-client-connection-ip": "10.7.0.5" } }));
  assert.equal(mau.status, 400);
  assert.equal((await mau.json()).error.code, "limite_invalido");
});

// UTAC110n — achado ⚠️6 do validador SEG8: o duplo aplicava as ordens por ordem de chamada, de modo que
// a ÚLTIMA mandava (o PostgREST usa a PRIMEIRA como primária). Com `limit`, isso devolvia o conjunto
// ERRADO — e um teste que combine multi-order+limit ficaria vacuamente verde.
test("F5 · duplo: a 1.ª ordem é a primária e o limit corta o conjunto certo", async () => {
  S.tabelas.pontos.push(
    { endereco: A,  pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 100, historico_lance: [] },
    { endereco: B2, pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 400, historico_lance: [] },
    { endereco: C2, pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 150, historico_lance: [] },
  );
  const r = await hRanking(new Request("https://x/.netlify/functions/ranking-pontos-lance?limite=1", {
    method: "GET", headers: { "x-nf-client-connection-ip": "10.7.0.9" } }));
  const corpo = await r.json();
  assert.equal(corpo.ranking.length, 1);
  assert.equal(corpo.ranking[0].pontos, 400, "o limit tem de cortar DEPOIS de ordenar pelo saldo (400, não 100)");
});

// ═══ FRENTE G — Art. 17º e a invariante dos 3 sítios ════════════════════════════════════════════

const raiz = new URL("../../../../../", import.meta.url); // …/DESAFIOGUT/
const ler = async (rel) => (await import("node:fs")).readFileSync(new URL(rel, raiz), "utf8");
const corpo = (txt) => txt.slice(txt.indexOf("CAPÍTULO I"));

test("G1 · Art. 17º diz «200 pontos de lance» e já não promete «1 crédito de lance»", async () => {
  for (const f of ["docs/REGULAMENTO-v5.md", "docs/GUTO-REGULAMENTO.md"]) {
    const doc = await ler(f);
    const art = /Art\. 17º — ([^\n]+)/.exec(doc)?.[1] ?? "";
    assert.match(art, /200 pontos de lance/, `${f}: Art. 17º sem «200 pontos de lance»`);
    assert.equal(art.includes("1 crédito de lance"), false, `${f}: Art. 17º ainda promete o crédito`);
    assert.match(art, /não são condição para participar/, `${f}: falta a não-subordinação`);
  }
});

test("G2 · a invariante corpo(v5) == corpo(GUTO) mantém-se byte a byte", async () => {
  const v5 = corpo(await ler("docs/REGULAMENTO-v5.md"));
  const guto = corpo(await ler("docs/GUTO-REGULAMENTO.md"));
  assert.ok(v5.length > 15_000, `medição inválida: ${v5.length}`);
  assert.equal(v5, guto, "os dois documentos divergiram");
});

test("G3 · o módulo do runtime espelha o documento (3.º sítio da invariante)", async () => {
  const guto = await ler("docs/GUTO-REGULAMENTO.md");
  const { REGULAMENTO_TEXTO, REGULAMENTO_VERSAO } = await import("../_lib/guto-regulamento.mjs");
  assert.equal(REGULAMENTO_VERSAO, "5.1");
  assert.equal(REGULAMENTO_TEXTO, guto, "o módulo que o runtime importa divergiu do documento — regenerar");
  assert.match(REGULAMENTO_TEXTO, /200 pontos de lance/);
});

test("G4 · a âncora do Art. 17º no GUTO é um excerto VERBATIM do artigo", async () => {
  const doc = await ler("docs/GUTO-REGULAMENTO.md");
  const art = /Art\. 17º — ([^\n]+)/.exec(doc)?.[1] ?? "";
  const { ARTIGOS_V4 } = await import("../_lib/guto-perfis.mjs");
  assert.ok(art.includes(ARTIGOS_V4["17"]), "a âncora do Art. 17º deixou de ser verbatim");
});

// ═══ FRENTE H — DEBT-076 (UTAC110n.1): as SENHAS antigas convertem-se em pontos ══════════════════

const MIG_SENHAS = new URL("../../../supabase/migrations/20261018_utac110n1_conversao_senhas_legadas.sql", import.meta.url);
const SQLS = (await import("node:fs")).readFileSync(MIG_SENHAS, "utf8");
const SQLS_CORPO = SQLS.replace(/--[^\n]*/g, "");

test("H1 · 1 senha = 200 pontos, e a dívida é zerada na MESMA instrução", () => {
  // ⚠️ Todas as ocorrências, não só a primeira: o valor aparece duas vezes (o UPSERT e o `delta` do
  // histórico). Um `assert.match` simples deixava passar um mutante que trocava UMA delas para 20 —
  // medido: o M15 sobreviveu à 1.ª versão deste teste (achado meu, corrigido aqui).
  const fatores = [...SQLS_CORPO.matchAll(/senhas\s*\*\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(fatores.length >= 2, `esperava o factor em 2 sítios, achei ${fatores.length}`);
  assert.deepEqual([...new Set(fatores)], [200], `todas as ocorrências têm de ser 200: ${fatores}`);
  assert.match(SQLS_CORPO, /SET\s+senhas_a_creditar\s*=\s*0/, "a dívida tem de ser zerada");
  // A aritmética, aplicada: 3 senhas ⇒ 600 pontos.
  assert.equal(3 * 200, 600);
});

test("H2 · idempotente por construção: a zeragem tem o guard na mesma instrução", () => {
  const update = SQLS_CORPO.split(";").map((s) => s.trim())
    .find((s) => /UPDATE\s+public\.rankings_ciclo/i.test(s));
  assert.ok(update, "não encontrei o UPDATE de rankings_ciclo");
  assert.match(update, /senhas_a_creditar\s*>\s*0/, "o guard da coluna");
  assert.match(update, /liquidado_em\s+IS\s+NULL/, "só dívidas por liquidar");
  assert.match(update, /senhas_a_creditar\s*=\s*0/, "zera na mesma instrução");
});

test("H3 · cobre quem NÃO tem linha em public.pontos (UPSERT, não UPDATE simples)", () => {
  assert.match(SQLS_CORPO, /INSERT\s+INTO\s+public\.pontos/i, "tem de inserir quando falta a linha");
  assert.match(SQLS_CORPO, /ON\s+CONFLICT\s*\(\s*endereco\s*\)\s*DO\s+UPDATE/i, "e somar quando existe");
  assert.match(SQLS_CORPO, /p\.pontos_lance\s*\+\s*EXCLUDED\.pontos_lance/);
});

test("H4 · a ref leva o instante da execução (não repete numa re-conversão) e o motivo é próprio", () => {
  assert.match(SQLS_CORPO, /'motivo',\s*'conversao-senhas'/);
  assert.match(SQLS_CORPO, /'ref',\s*'conversao-senhas:'/);
  assert.match(SQLS_CORPO, /HH24MISSMS/, "o sufixo tem de distinguir duas execuções");
});

test("H5 · não apaga nem reescreve a fila: só deixa de haver dívida (worker e sweeper ficam)", () => {
  assert.equal(/DELETE\s+FROM/i.test(SQLS_CORPO), false, "a migração não apaga linhas");
  assert.equal(/UPDATE\s+public\.fila_tarefas/i.test(SQLS_CORPO), false,
    "a fila não é tocada: o worker recusa sozinho quando senhas_a_creditar deixa de bater");
  assert.equal(/DROP\s+(TABLE|COLUMN)/i.test(SQLS_CORPO), false, "nada de DDL destrutivo");
});
