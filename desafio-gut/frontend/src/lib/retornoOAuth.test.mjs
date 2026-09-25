// retornoOAuth.test.mjs — MC94.3.2. Trava a regressão do bug de login (beco #2).
//
// Corre com:  node --test src/lib/retornoOAuth.test.mjs   (a partir de desafio-gut/frontend)
//
// O DEFEITO era uma rota que não existia. Por isso o teste mais importante deste
// ficheiro NÃO é o da função pura: é o que LÊ o App.jsx e exige que a rota de
// retorno do OAuth esteja declarada. Nenhum teste de componente apanharia isto (o
// App.jsx não é renderizável em teste) — e foi exactamente o que faltou durante
// meses, com o utilizador preso numa página vazia depois de o login concluir.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROTA_RETORNO_OAUTH, DESTINO_APOS_LOGIN, MS_ATE_OFERECER_SAIDA_MANUAL,
  decidirSaidaDoRetorno, deveOferecerSaidaManual,
} from "./retornoOAuth.js";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = readFileSync(resolve(RAIZ, "src/App.jsx"), "utf8");

test("⛔ o App.jsx DECLARA uma rota para o retorno do OAuth (o defeito era a rota ausente)", () => {
  const re = new RegExp(`<Route\\s+path="${ROTA_RETORNO_OAUTH}"`);
  assert.match(APP, re,
    `não há <Route path="${ROTA_RETORNO_OAUTH}"> em App.jsx — o browser fica preso ` +
    "nessa página depois de o Privy concluir o login");
  assert.equal(ROTA_RETORNO_OAUTH, "/redirect",
    "o customOAuthRedirectUrl do PrivyRoot aponta para /redirect; se mudar aqui, mude lá");
});

test("o PrivyRoot continua a apontar para a mesma rota (as duas pontas têm de coincidir)", () => {
  const privy = readFileSync(resolve(RAIZ, "src/PrivyRoot.jsx"), "utf8");
  const m = privy.match(/customOAuthRedirectUrl:\s*"[^"]*?(\/[a-z-]+)"/);
  assert.ok(m, "não encontrei customOAuthRedirectUrl em PrivyRoot.jsx");
  assert.equal(m[1], ROTA_RETORNO_OAUTH,
    `o Privy devolve o browser a ${m[1]} e a app só trata ${ROTA_RETORNO_OAUTH}`);
});

test("com sessão pronta, segue para o destino do login", () => {
  assert.deepEqual(decidirSaidaDoRetorno({ ready: true, isConnected: true }),
    { tipo: "navegar", para: DESTINO_APOS_LOGIN });
});

test("sem sessão pronta, espera — navegar antes mandaria o utilizador ao login outra vez", () => {
  assert.deepEqual(decidirSaidaDoRetorno({ ready: true,  isConnected: false }), { tipo: "aguardar" });
  assert.deepEqual(decidirSaidaDoRetorno({ ready: false, isConnected: true  }), { tipo: "aguardar" });
  assert.deepEqual(decidirSaidaDoRetorno({ ready: false, isConnected: false }), { tipo: "aguardar" });
  assert.deepEqual(decidirSaidaDoRetorno(), { tipo: "aguardar" });
});

test("ao fim do prazo oferece-se saída manual (nunca página em branco sem clique)", () => {
  assert.equal(deveOferecerSaidaManual(0), false);
  assert.equal(deveOferecerSaidaManual(MS_ATE_OFERECER_SAIDA_MANUAL - 1), false);
  assert.equal(deveOferecerSaidaManual(MS_ATE_OFERECER_SAIDA_MANUAL), true);
  assert.equal(deveOferecerSaidaManual(Number.NaN), false);
  assert.ok(MS_ATE_OFERECER_SAIDA_MANUAL > 0);
});
