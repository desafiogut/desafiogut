// UTAC110h.4 — o PONTO DE ESTRANGULAMENTO do Sentry (achados F2/F3 do validador adversarial).
//
// PORQUE EXISTE ESTE FICHEIRO (e não um teste dentro do `utac110h4-grafo.test.mjs`): aquele ficheiro
// faz `mock.module("../_lib/sentry-server.mjs")` — substitui o WRAPPER. Isso é óptimo para testar os
// CHAMADORES, e inútil para testar o wrapper. Aqui é o contrário: o wrapper é REAL e o que é
// substituído é o `@sentry/node`. É assim que se mede o que SAI.
//
// O QUE MEDE: a 1.ª versão da correcção mascarava **por nome de identificador**. O validador
// refutou-a com um mutante que passava verde — `captureSecurityAlert("sybil_suspect", { addresses })`,
// `{ lancador }` (monitor-onchain) e `{ address }` (cliente) escapavam. A correcção passou o critério
// do NOME para o **VALOR**: o wrapper mascara qualquer `0x[0-9a-fA-F]{40}` em qualquer profundidade.
//
// node --test --experimental-test-module-mocks _tests/utac110h4-sentry-mascara.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

// DSN definido ⇒ o wrapper toma o caminho do Sentry (e não o `console.warn` de fallback).
process.env.SENTRY_DSN = "https://chave@exemplo.invalido/1";

const capturado = [];
mock.module("@sentry/node", { namedExports: {
  init: () => {},
  captureMessage: (msg, ctx) => { capturado.push({ msg, ctx }); },
  flush: async () => true,
} });

const { captureSecurityAlert, mascararEnderecosProfundo } = await import("../_lib/sentry-server.mjs");

const A = "0x" + "a".repeat(40);
const B = "0x" + "b".repeat(40);
const COMPLETO = /0x[a-fA-F0-9]{40}/;

test("UNITÁRIO: `mascararEnderecosProfundo` mascara em QUALQUER profundidade (critério = VALOR)", () => {
  // Objecto aninhado, array, string solta e string dentro de string — nenhum escapa.
  const entrada = {
    lancador: A,                                  // nome que a 1.ª guarda não via
    addresses: [A, B],                            // array de endereços (sybil-check)
    wallet: { dono: B },                          // aninhado
    texto: `lance de ${A} confirmado`,            // endereço DENTRO de uma string
    txHashes: ["0xdeadbeef"],                     // NÃO é um endereço (não tem 40 hex) — fica intacto
    count: 3, nulo: null, flag: true,
  };
  const saida = mascararEnderecosProfundo(entrada);
  const serializado = JSON.stringify(saida);
  assert.doesNotMatch(serializado, COMPLETO, `sobrou um endereço completo: ${serializado}`);
  // CONTROL POSITIVO: as chaves e os valores NÃO-endereço sobrevivem (o diagnóstico não foi destruído).
  assert.equal(saida.count, 3);
  assert.equal(saida.flag, true);
  assert.deepEqual(saida.txHashes, ["0xdeadbeef"]);
  assert.equal(saida.lancador, "0xaaaa…aaaa");
  assert.deepEqual(saida.addresses, ["0xaaaa…aaaa", "0xbbbb…bbbb"]);
  assert.equal(saida.wallet.dono, "0xbbbb…bbbb");
  assert.equal(saida.texto, "lance de 0xaaaa…aaaa confirmado");
  // A MESMA função aplicada 2× não muda nada (idempotente).
  assert.deepEqual(mascararEnderecosProfundo(saida), saida);
  // Trava de recursão: um payload patológico não rebenta a pilha.
  let fundo = { x: 1 }; for (let i = 0; i < 30; i++) fundo = { x: fundo };
  assert.doesNotThrow(() => mascararEnderecosProfundo(fundo));
});

test("COMPORTAMENTAL: o wrapper REAL mascara o payload antes de o entregar ao Sentry", async () => {
  capturado.length = 0;
  // Reproduz os 3 sítios que o validador encontrou — com os nomes que a guarda por nome não via.
  await captureSecurityAlert("sybil_suspect", {
    visitorId: "v-1", endpoint: "auth-user",
    addresses: [A, B], limiar: 3,
  });
  await captureSecurityAlert("onchain_burst", { edicaoId: 7, lancador: A, count: 5 });
  await captureSecurityAlert("burst_compras", { address: B, count: 11 });
  await captureSecurityAlert("ninhado", { extra: { carteira: A, lista: [B] } }, "error");

  // CONTROL POSITIVO: o stub TEM de ter recebido os 4 alertas — senão o verde seria por cegueira.
  assert.equal(capturado.length, 4, `o stub recebeu ${capturado.length} alertas (esperado 4)`);
  const TIPOS = ["sybil_suspect", "onchain_burst", "burst_compras", "ninhado"];
  for (const [i, { msg, ctx }] of capturado.entries()) {
    const serializado = JSON.stringify(ctx);
    assert.doesNotMatch(serializado, COMPLETO, `o alerta «${msg}» saiu com um endereço COMPLETO: ${serializado}`);
    // …e o diagnóstico sobreviveu: o tipo do alerta e as chaves continuam lá, mascaradas.
    assert.equal(ctx.tags.security_alert, TIPOS[i], `o tag do alerta ${i} perdeu-se`);
    assert.match(msg, /^\[sec\] /);
  }
  assert.equal(capturado[0].ctx.extra.addresses[0], "0xaaaa…aaaa", "o array de endereços não foi mascarado");
  assert.equal(capturado[1].ctx.extra.lancador, "0xaaaa…aaaa", "o campo `lancador` não foi mascarado");
  assert.equal(capturado[2].ctx.extra.address, "0xbbbb…bbbb", "o campo `address` do cliente não foi mascarado");
});

test("COMPORTAMENTAL: o nome da chave NÃO importa — qualquer nome com um endereço é mascarado", async () => {
  capturado.length = 0;
  const nome = "qualquerCoisaQueNaoEstaEmNenhumaLista";
  await captureSecurityAlert("teste", { [nome]: A, subnome: { outroNome: B } });
  assert.equal(capturado.length, 1);
  const extra = capturado[0].ctx.extra;
  assert.equal(extra[nome], "0xaaaa…aaaa", "um nome fora de qualquer allowlist não foi mascarado");
  assert.equal(extra.subnome.outroNome, "0xbbbb…bbbb", "um nome aninhado fora de qualquer allowlist não foi mascarado");
});
