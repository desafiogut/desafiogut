// retryAuth.test.mjs — MC94.3.2. Regras da política de tentativas da sessão.
//
// Corre com:  node --test src/lib/retryAuth.test.mjs   (a partir de desafio-gut/frontend)
//
// ⚠️ ÂMBITO, declarado sem o disfarçar: estes testes provam a REGRA (quando se
// tenta e com que recuo), não o efeito de React que a usa. O AppContext não é
// testável por unidade neste projecto — os testes do Dashboard substituem-no por
// um duplo e ele importa os hooks do Privy. A integração fica por verificar com
// uma conta real (ver o relatório do MC94.3.2, secção do bug de login).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TENTATIVAS_AUTH, atrasoDaTentativaAuth, deveTentarAuth,
} from "./retryAuth.js";

test("sem endereço não se tenta — não há nada para assinar", () => {
  assert.equal(deveTentarAuth({ address: null, authToken: null, tentativa: 0 }), false);
  assert.equal(deveTentarAuth({ address: "", authToken: null, tentativa: 0 }), false);
  assert.equal(deveTentarAuth({}), false);
});

test("com token já obtido não se tenta de novo", () => {
  assert.equal(deveTentarAuth({ address: "0xabc", authToken: "jwt", tentativa: 0 }), false);
});

test("tenta enquanto não houver token e houver endereço", () => {
  assert.equal(deveTentarAuth({ address: "0xabc", authToken: null, tentativa: 0 }), true);
  assert.equal(deveTentarAuth({ address: "0xabc", authToken: null, tentativa: 1 }), true);
});

test("desiste em MAX_TENTATIVAS_AUTH — laço infinito seria pior que o defeito", () => {
  assert.equal(MAX_TENTATIVAS_AUTH, 4);
  assert.equal(deveTentarAuth({ address: "0xabc", authToken: null, tentativa: MAX_TENTATIVAS_AUTH - 1 }), true);
  assert.equal(deveTentarAuth({ address: "0xabc", authToken: null, tentativa: MAX_TENTATIVAS_AUTH }), false);
  assert.equal(deveTentarAuth({ address: "0xabc", authToken: null, tentativa: 99 }), false);
});

test("o recuo é exponencial, nunca zero e tem tecto", () => {
  assert.deepEqual([0, 1, 2, 3].map(atrasoDaTentativaAuth), [800, 1600, 3200, 6400]);
  assert.ok(atrasoDaTentativaAuth(0) > 0, "atraso zero martelaria a function no cold start");
  assert.equal(atrasoDaTentativaAuth(50), 30_000, "o tecto tem de segurar");
  assert.equal(atrasoDaTentativaAuth(-1), 800, "entrada inválida não pode dar NaN/negativo");
  assert.equal(atrasoDaTentativaAuth(Number.NaN), 800);
});
