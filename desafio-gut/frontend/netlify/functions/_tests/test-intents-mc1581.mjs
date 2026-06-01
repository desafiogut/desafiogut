// Teste de routing de intents MC15.8.1 — confirma que as novas intents
// (relatorio_indicacoes, indique_e_ganhe) roteiam corretamente e NÃO colidem
// com as intents existentes (anti-regressão do intent-router MC15.4/15.6).
//
// Uso (a partir de desafio-gut/frontend):
//   node --test netlify/functions/_tests/test-intents-mc1581.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarIntent } from "../chatbot.mjs";

const casos = [
  // MC15.8.1 — novas intents
  ["indique e ganhe", "indique_e_ganhe"],
  ["qual é o meu código de indicação?", "indique_e_ganhe"],
  ["me dá o meu link", "indique_e_ganhe"],
  ["quero ganhar senhas com indicações", "indique_e_ganhe"],
  ["como funciona o programa de indicação", "indique_e_ganhe"],
  ["relatório de indicações", "relatorio_indicacoes"],
  ["indique e ganhe relatório", "relatorio_indicacoes"],
  ["como estão as indicações hoje?", "relatorio_indicacoes"],
  ["estatísticas de indicações", "relatorio_indicacoes"],
  // Anti-regressão — intents existentes continuam a rotear
  ["quero criar uma edição", "criar_edicao_wizard"],
  ["listar edições", "listar_edicoes"],
  ["encerrar edição PROG-3", "encerrar_edicao"],
  ["mostrar auditoria", "auditoria"],
  ["quem ganha agora?", "simular_vencedor"],
  ["qual o pulso da edição", "pulso_edicao"],
  ["/panic", "panic"],
  ["/unpanic", "unpanic"],
  ["dados de mercado", "dados_mercado"],
  // Sem intent → RAG
  ["qual o lance mínimo?", null],
  ["olá guto", null],
];

for (const [frase, esperado] of casos) {
  test(`"${frase}" → ${esperado}`, () => {
    assert.equal(detectarIntent(frase), esperado);
  });
}
