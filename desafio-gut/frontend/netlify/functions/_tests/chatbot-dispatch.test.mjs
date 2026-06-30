// MC39.22.1 — Caracterização do despacho de intents do GUTO (tratarIntentEdicoes).
//
// Trava o comportamento do GATE RBAC e do shape de resposta ANTES e DEPOIS do
// refactor para tabela declarativa (P0-1). Cobre os caminhos que NÃO dependem de
// Blobs/Supabase/LLM: recusa-perfil (visitante/comum) e intents informativos de
// qualquer perfil (comprar_cotas/pacotes_cotas) + listar_edicoes(visitante).
// Estes são exatamente os ramos onde vivia a duplicação (39× shape, 12× recusa).
//
// Uso (a partir de desafio-gut/frontend):
//   node --test netlify/functions/_tests/chatbot-dispatch.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { tratarIntentEdicoes } from "../chatbot.mjs";

const reqVazio = { headers: { get: () => "" } };

async function corpo(resp) {
  assert.ok(resp, "esperava um Response, recebeu null");
  return await resp.json();
}

// Intents que recusam o visitante via recusa-perfil (gate falha → obterResposta no tom do perfil).
const RECUSA_VISITANTE = [
  "mostrar auditoria",                  // auditoria (admin-only)
  "relatório de indicações",            // relatorio_indicacoes (admin-only)
  "indique e ganhe",                    // indique_e_ganhe (autenticado; recusaRole=visitante)
  "dados de mercado",                   // dados_mercado (corp/admin)
  "quem ganha agora?",                  // simular_vencedor (corp/admin)
  "qual o pulso da edição",             // pulso_edicao (corp/admin)
  "meu saldo",                          // meu_saldo (autenticado; recusaRole=visitante)
  "quero criar uma edição",             // criar_edicao_wizard (admin-only)
  "encerrar edição PROG-3",             // encerrar_edicao (admin-only)
];

for (const frase of RECUSA_VISITANTE) {
  test(`visitante "${frase}" → recusa-perfil (gate nega, sem vazar)`, async () => {
    const data = await corpo(await tratarIntentEdicoes(reqVazio, frase, "visitante", null));
    assert.equal(data.modoResposta, "recusa-perfil");
    assert.equal(data.perfil, "visitante");
    assert.equal(data.modoBusca, "intent");
    assert.deepEqual(data.fontes, []);
    assert.equal(typeof data.resposta, "string");
    assert.ok(data.resposta.length > 0);
  });
}

// Intents informativos liberados a QUALQUER perfil (sem I/O externo).
test('visitante "pacotes de cota" → perfil (qualquer perfil)', async () => {
  const data = await corpo(await tratarIntentEdicoes(reqVazio, "pacotes de cota", "visitante", null));
  assert.equal(data.intent, "pacotes_cotas");
  assert.equal(data.modoResposta, "perfil");
  assert.equal(data.perfil, "visitante");
});

test('comum "quero contratar uma cota" → perfil', async () => {
  const data = await corpo(await tratarIntentEdicoes(reqVazio, "quero contratar uma cota", "comum", "0xabc"));
  assert.equal(data.intent, "comprar_cotas");
  assert.equal(data.modoResposta, "perfil");
  assert.equal(data.perfil, "comum");
});

// listar_edicoes para visitante: público, mas sem listar (lista vazia) → perfil.
test('visitante "listar edições" → perfil, sem I/O de edições', async () => {
  const data = await corpo(await tratarIntentEdicoes(reqVazio, "listar edições", "visitante", null));
  assert.equal(data.intent, "listar_edicoes");
  assert.equal(data.modoResposta, "perfil");
});

// Sem intent → null (cai no RAG). Anti-regressão do roteamento.
test('"qual o lance mínimo?" → null (RAG)', async () => {
  const resp = await tratarIntentEdicoes(reqVazio, "qual o lance mínimo?", "visitante", null);
  assert.equal(resp, null);
});

// comum (autenticado mas não-admin) recusa intents admin-only.
test('comum "mostrar auditoria" → recusa-perfil (tom comum)', async () => {
  const data = await corpo(await tratarIntentEdicoes(reqVazio, "mostrar auditoria", "comum", "0xabc"));
  assert.equal(data.modoResposta, "recusa-perfil");
  assert.equal(data.perfil, "comum");
});
