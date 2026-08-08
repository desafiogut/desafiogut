// MC89.44 (S2) — testes da ordenação dos alertas da Visão Geral.
// node --test src/lib/alertasAdmin.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { ordenarAlertas, pesoUrgencia } from "./alertasAdmin.js";

const ids = (lista) => lista.map((a) => a.id);

test("critical vem antes de warning, que vem antes de info", () => {
  const fora = [
    { id: "c", nivel: "info" },
    { id: "b", nivel: "warning" },
    { id: "a", nivel: "critical" },
  ];
  assert.deepEqual(ids(ordenarAlertas(fora)), ["a", "b", "c"]);
});

test("⚠️ O CASO REAL: o critical do frontend deixa de ficar em último", () => {
  // Reprodução fiel do que a Visão Geral montava antes do MC89.44:
  // `_lib/admin-alertas.mjs` emite por ordem de construção — e a essa lista o
  // frontend concatenava no FIM `alertasDoFrontend`, onde nasce o único
  // `critical` do painel. O resultado é o de baixo, e é a lista que o
  // administrador via.
  const doBackend = [
    { id: "fila_indisponivel", nivel: "warning" },
    { id: "webhook_inativo",   nivel: "warning" },
    { id: "rag_sem_metadado",  nivel: "info" },
    { id: "blobs_cego",        nivel: "warning" },
    { id: "cache_sem_redis",   nivel: "info" },
  ];
  const doFrontend = [{ id: "eoa_baixa", nivel: "critical" }];

  const antes = [...doBackend, ...doFrontend];
  assert.equal(antes[antes.length - 1].id, "eoa_baixa",
    "controlo: sem ordenação, «a EOA está sem gás» era a ÚLTIMA das seis linhas");

  const depois = ordenarAlertas(antes);
  assert.equal(depois[0].id, "eoa_baixa",
    "com ordenação, o que impede as compras de serem creditadas vem primeiro");
  // E o `info` deixa de aparecer antes do `warning` que o backend emitia depois.
  assert.deepEqual(ids(depois), [
    "eoa_baixa",
    "fila_indisponivel", "webhook_inativo", "blobs_cego",
    "rag_sem_metadado", "cache_sem_redis",
  ]);
});

test("um nível desconhecido cai para o FIM, não para o topo", () => {
  // Um alerta que ninguém sabe classificar não pode empurrar para baixo um que
  // se sabe ser crítico. `undefined` num objeto de pesos daria NaN, e NaN numa
  // comparação de sort deixa a ordem por conta do motor.
  const lista = [
    { id: "x", nivel: "inventado" },
    { id: "y", nivel: "critical" },
    { id: "z" },
  ];
  assert.deepEqual(ids(ordenarAlertas(lista)), ["y", "x", "z"]);
  assert.equal(pesoUrgencia("inventado") > pesoUrgencia("info"), true);
  assert.equal(pesoUrgencia(undefined) > pesoUrgencia("info"), true);
});

test("dentro do mesmo nível, a ordem de origem mantém-se", () => {
  // O `sort` de JS é estável desde o ES2019. Entre iguais, quem decide a ordem
  // continua a ser o backend — a ordenação sobe o grave, não reembaralha tudo.
  const lista = [
    { id: "w1", nivel: "warning" },
    { id: "w2", nivel: "warning" },
    { id: "w3", nivel: "warning" },
    { id: "c",  nivel: "critical" },
  ];
  assert.deepEqual(ids(ordenarAlertas(lista)), ["c", "w1", "w2", "w3"]);
});

test("não altera a lista recebida", () => {
  const original = [{ id: "i", nivel: "info" }, { id: "c", nivel: "critical" }];
  const copia = [...original];
  ordenarAlertas(original);
  assert.deepEqual(ids(original), ids(copia), "`sort` in-place mutaria o estado do React");
});

test("lista vazia, null e undefined devolvem []", () => {
  // A Visão Geral chama isto antes de qualquer fetch responder.
  assert.deepEqual(ordenarAlertas([]), []);
  assert.deepEqual(ordenarAlertas(null), []);
  assert.deepEqual(ordenarAlertas(undefined), []);
});
