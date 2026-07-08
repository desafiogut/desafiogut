// MC59.2 — B-2 (parte segura): antes de auto-reembolsar uma compra de senhas
// cuja chamada on-chain lançou, RE-VERIFICAR on-chain se as senhas foram mesmo
// creditadas. Se foram (falha transitória de RPC no wait/leitura enquanto a tx
// minerou), NÃO reembolsar — seria devolver R$ de uma compra confirmada.
//
// Testa o helper puro de decisão. (A migração para fila assíncrona — resposta
// 202 — depende da migração MC39.20 ainda não aplicada e fica para MC59.3.)
// node --test _tests/mc592-b2-reembolso-guard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { creditoConfirmadoApesarDoErro } from "../comprar-senhas.mjs";

test("B-2: senhas aumentaram >= qtd → crédito confirmou (NÃO reembolsar)", () => {
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: 2, senhasAgora: 3, qtd: 1 }), true);
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: 0, senhasAgora: 3, qtd: 3 }), true);
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: 5, senhasAgora: 9, qtd: 2 }), true); // >= também vale
});

test("B-2: senhas não subiram o suficiente → crédito não landou (reembolsar)", () => {
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: 2, senhasAgora: 2, qtd: 1 }), false);
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: 5, senhasAgora: 6, qtd: 2 }), false);
});

test("B-2: sem baseline confiável → default seguro = reembolsar (false)", () => {
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: undefined, senhasAgora: 5, qtd: 1 }), false);
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: 2, senhasAgora: undefined, qtd: 1 }), false);
  assert.equal(creditoConfirmadoApesarDoErro({ senhasAntes: NaN, senhasAgora: 5, qtd: 1 }), false);
});
