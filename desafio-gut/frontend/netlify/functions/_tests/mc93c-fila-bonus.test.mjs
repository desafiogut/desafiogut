// MC93-C — decisão de emissão do bónus (função PURA, sem I/O).
//
// PORQUÊ ESTE TESTE EXISTE: esta função decide se saem R$ 40,00 (20 senhas ×
// R$ 2,00) do sistema, por participante e por ciclo. É a última barreira antes
// de uma transação irreversível na mainnet.
//
// Uma flag de ambiente sozinha é fail-OPEN por omissão de disciplina: basta
// alguém pôr `BONUS_EMISSAO_ATIVA=true` no painel do Netlify para tudo começar
// a emitir. Por isso a emissão exige TRÊS condições simultâneas, e a função é
// pura para poder ser exercida sem ambiente nenhum:
//   1. a flag estar ligada;
//   2. a dívida existir e estar POR LIQUIDAR no livro-razão — a idempotência
//      ancora em `rankings_ciclo`, não na fila (uma tarefa pode ser
//      reprocessada; o livro-razão é a verdade);
//   3. a quantidade do payload coincidir com `REGRAS.SENHAS_BONUS` — um
//      payload adulterado é RECUSADO, nunca "ajustado".
//
// node --test --experimental-test-module-mocks _tests/mc93c-fila-bonus.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { podeEmitir, MOTIVOS } from "../_lib/bonus-emissao.mjs";
import { REGRAS } from "../_lib/pontuacao-utils.mjs";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/** Estado em que a emissão DEVE acontecer — o resto dos testes parte daqui. */
const bom = () => ({
  flagAtiva: true,
  divida: {
    ciclo_id: "R-1", endereco: A, bonus_emitido: true,
    senhas_a_creditar: REGRAS.SENHAS_BONUS, liquidado_em: null,
  },
  payload: { cicloId: "R-1", endereco: A, quantidade: REGRAS.SENHAS_BONUS },
});

test("com as três condições satisfeitas, emite", () => {
  const r = podeEmitir(bom());
  assert.equal(r.emitir, true);
  assert.equal(r.quantidade, REGRAS.SENHAS_BONUS);
});

// ── condição 1: a flag ───────────────────────────────────────────────────────

test("sem a flag, NÃO emite — e diz porquê", () => {
  const r = podeEmitir({ ...bom(), flagAtiva: false });
  assert.equal(r.emitir, false);
  assert.equal(r.motivo, MOTIVOS.FLAG_DESLIGADA);
});

test("a flag é o default: ausente ou indefinida NÃO emite", () => {
  for (const flagAtiva of [undefined, null, 0, "", "false", "TRUE", "1", "sim"]) {
    const r = podeEmitir({ ...bom(), flagAtiva });
    assert.equal(r.emitir, false,
      `flagAtiva=${JSON.stringify(flagAtiva)} não pode emitir — só o booleano true`);
  }
});

// ── condição 2: a dívida no livro-razão ──────────────────────────────────────

test("sem dívida registada, NÃO emite (a fila não é a verdade)", () => {
  for (const divida of [null, undefined, {}]) {
    const r = podeEmitir({ ...bom(), divida });
    assert.equal(r.emitir, false);
    assert.equal(r.motivo, MOTIVOS.SEM_DIVIDA);
  }
});

test("dívida JÁ liquidada NÃO emite outra vez (idempotência)", () => {
  // Este é o caso que evita pagar duas vezes: a tarefa foi reprocessada depois
  // de a emissão ter corrido, e o livro-razão já tem `liquidado_em`.
  const e = bom();
  e.divida.liquidado_em = "2026-09-24T10:00:00Z";
  const r = podeEmitir(e);
  assert.equal(r.emitir, false);
  assert.equal(r.motivo, MOTIVOS.JA_LIQUIDADA);
});

test("dívida com senhas_a_creditar a zero NÃO emite", () => {
  const e = bom();
  e.divida.senhas_a_creditar = 0;
  assert.equal(podeEmitir(e).emitir, false);
});

test("linha sem bonus_emitido NÃO emite, mesmo com senhas a creditar", () => {
  const e = bom();
  e.divida.bonus_emitido = false;
  const r = podeEmitir(e);
  assert.equal(r.emitir, false);
  assert.equal(r.motivo, MOTIVOS.SEM_DIVIDA);
});

// ── condição 3: o payload tem de coincidir ───────────────────────────────────

test("quantidade do payload diferente do livro-razão NÃO emite — nem ajusta", () => {
  for (const quantidade of [10, 40, 21, 0, -20, "20", null, undefined]) {
    const e = bom();
    e.payload.quantidade = quantidade;
    const r = podeEmitir(e);
    assert.equal(r.emitir, false,
      `quantidade=${JSON.stringify(quantidade)} tem de ser recusada`);
    assert.equal(r.motivo, MOTIVOS.QUANTIDADE_DIVERGENTE);
  }
});

test("payload de outro endereço ou de outro ciclo NÃO emite", () => {
  const outro = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const e1 = bom(); e1.payload.endereco = outro;
  assert.equal(podeEmitir(e1).emitir, false, "endereço do payload ≠ do livro-razão");
  assert.equal(podeEmitir(e1).motivo, MOTIVOS.ALVO_DIVERGENTE);

  const e2 = bom(); e2.payload.cicloId = "R-9";
  assert.equal(podeEmitir(e2).emitir, false, "ciclo do payload ≠ do livro-razão");
});

test("endereço compara-se sem distinguir maiúsculas", () => {
  const e = bom();
  e.payload.endereco = A.toUpperCase();
  assert.equal(podeEmitir(e).emitir, true, "é a mesma carteira");
});

// ── a quantidade emitida vem do LIVRO-RAZÃO, não do payload ─────────────────

test("a quantidade emitida é a do livro-razão", () => {
  // Se algum dia as duas divergissem sem ser apanhado pela condição 3, o que
  // manda é o registo, não a mensagem da fila.
  const r = podeEmitir(bom());
  assert.equal(r.quantidade, bom().divida.senhas_a_creditar);
});

test("entrada completamente inválida não rebenta — recusa", () => {
  for (const entrada of [undefined, null, {}, "x", 42]) {
    const r = podeEmitir(entrada);
    assert.equal(r.emitir, false);
    assert.ok(typeof r.motivo === "string" && r.motivo.length > 0);
  }
});

test("dívida com quantidade fora da REGRA não emite, mesmo coincidindo com o payload", () => {
  // A 3ª perna do cadeado: não basta payload e livro-razão concordarem — têm
  // de concordar COM A REGRA. Se alguma vez o livro-razão registar 40 (por
  // migração, por edição manual, por um defeito futuro do produtor), o
  // handler recusa em vez de pagar o dobro.
  const e = bom();
  e.divida.senhas_a_creditar = REGRAS.SENHAS_BONUS * 2;
  e.payload.quantidade = REGRAS.SENHAS_BONUS * 2;
  const r = podeEmitir(e);
  assert.equal(r.emitir, false, "40 senhas não são a regra em vigor");
  assert.equal(r.motivo, MOTIVOS.QUANTIDADE_DIVERGENTE);
});

test("poluição de protótipo NÃO arma a emissão", async () => {
  // `process.env.X` resolve pela cadeia de protótipos: sem `Object.hasOwn`,
  // `Object.prototype.BONUS_EMISSAO_ATIVA = "true"` armava a emissão sem
  // variável de ambiente nenhuma. Provado por execução na validação
  // independente do MC93-D — chegou a creditar no arnês.
  const { emissaoArmada, FLAG_EMISSAO } = await import("../_lib/bonus-emissao.mjs");
  try {
    Object.prototype[FLAG_EMISSAO] = "true";                 // eslint-disable-line no-extend-native
    assert.equal({}[FLAG_EMISSAO], "true", "o cenário está mesmo montado");
    assert.equal(emissaoArmada({}), false,
      "só uma propriedade PRÓPRIA pode armar a emissão");
    assert.equal(emissaoArmada(), false, "nem através de process.env");
  } finally {
    delete Object.prototype[FLAG_EMISSAO];
  }
});
