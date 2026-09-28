// mcsorteio01a-guto-entregas.test.mjs — MC-SORTEIO-01a, item 2.6.
//
// O prompt de conformidade mandava o GUTO «ajudar com prazos de entrega, trocas e devoluções»
// (guto-perfis.mjs:83). O sistema NÃO tem entrega, prazo, troca nem fluxo de devolução
// (MC-MAPA-02) — o GUTO era instruído a responder sobre o que não existe, e um LLM instruído a
// ajudar com prazos inventa prazos. Isso é oferta ao consumidor (CDC art. 30) sem lastro.
//
// BIDIRECCIONAL:
//   (a) o prompt NÃO manda ajudar com prazos/trocas/devoluções;
//   (b) o prompt MANDA não prometer e encaminhar para o suporte (EMAIL_SUPORTE);
//   (c) mutação: repor a linha antiga → (a) fica RED.
//
// node --test --experimental-test-module-mocks _tests/mcsorteio01a-guto-entregas.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { obterPromptSystem, EMAIL_SUPORTE } from "../_lib/guto-perfis.mjs";

const prompt = obterPromptSystem("visitante", { conformidade: true });

test("(a) o prompt de conformidade não manda ajudar com prazos de entrega, trocas e devoluções", () => {
  // Só a FRASE «Ajude com …» (até ao ponto): a regra nova fala de entregas na frase seguinte.
  assert.doesNotMatch(prompt, /Ajude com[^.\n]*(prazos? de entrega|trocas|devolu)/i,
    "o GUTO voltou a ser instruído a responder sobre entregas/trocas/devoluções que o sistema não tem");
});

test("(b) o prompt manda NÃO prometer prazo/condição e encaminha para o suporte", () => {
  const linha = prompt.split("\n").find((l) => /prazos? de entrega/i.test(l));
  assert.ok(linha, "o prompt deixou de tratar o tema — sem regra, o LLM improvisa");
  assert.match(linha, /NÃO prometa/, "a regra sobre entregas não proíbe prometer");
  assert.ok(linha.includes(EMAIL_SUPORTE), "a regra sobre entregas não encaminha para o EMAIL_SUPORTE");
});
