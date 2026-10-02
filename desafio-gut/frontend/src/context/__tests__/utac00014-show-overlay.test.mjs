// utac00014-show-overlay.test.mjs — UTAC000.14 (religar o `showOverlay`, decisão do operador).
//
// node --test --test-concurrency=1 src/context/__tests__/utac00014-show-overlay.test.mjs
//   (a partir de desafio-gut/frontend)
//
// O QUE SE PROVA
//   Quando o prazo da edição chega a 0, a máquina de fim de leilão do `AppContext` liga o
//   relâmpago e, 1200 ms depois, ABRE o overlay do vencedor (`setShowOverlay(true)`) — UMA vez.
//   Estava desligado desde o MC63/64 (linha comentada); o UTAC000.14 religou-o.
//
// ARNÊS: o `AppContext.jsx` não se renderiza em teste (importa o Privy e faz I/O — ver a nota de
// `utac0010-vencedor-contexto.test.mjs`). Aqui vai-se um passo além da extracção por regex: a
// função `tick` REAL é extraída do ficheiro e EXECUTADA com duplos (relógio, `setTimeout` e
// setters controlados). Prova comportamento da função, não só a forma do código.
// (Limite declarado: não prova a cablagem do `useEffect` nem o render; o render do overlay com
// `showOverlay: true` está nos testes das páginas — Dashboard e MercadoLances.)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = () => readFileSync(new URL("../AppContext.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");

/** Extrai o corpo da `tick` da máquina de fim de leilão (do `const tick = () => {` ao `tick();`). */
function extrairTick(src) {
  const ancora = src.indexOf("Máquina de fim de leilão");
  assert.ok(ancora > 0, "controlo: a secção «Máquina de fim de leilão» não foi encontrada");
  const ini = src.indexOf("const tick = () => {", ancora);
  const fim = src.indexOf("\n    tick();", ini);
  assert.ok(ini > 0 && fim > ini, "controlo: a função `tick` não foi encontrada");
  return src.slice(ini, fim);
}

/** Monta a `tick` com duplos e devolve o registo das chamadas. */
function montar(codigoTick, { prazoTimestamp, encerrado = false, agoraSeg }) {
  const chamadas = [];
  const temporizadores = [];
  const duplos = {
    prazoTimestamp, encerrado,
    setEncerrado: (v) => chamadas.push(["setEncerrado", v]),
    setLightningActive: (v) => chamadas.push(["setLightningActive", v]),
    setShowOverlay: (v) => chamadas.push(["setShowOverlay", v]),
    fimDisparadoRef: { current: false },
    timeoutAnimRef: { current: null },
    setTimeout: (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; },
    clearTimeout: () => {},
    Date: { now: () => agoraSeg * 1000 },
  };
  const nomes = Object.keys(duplos);
  // eslint-disable-next-line no-new-func
  const tick = new Function(...nomes, `${codigoTick}\nreturn tick;`)(...nomes.map((n) => duplos[n]));
  return { tick, chamadas, temporizadores, duplos };
}

const disparos = (chamadas, v) => chamadas.filter(([n, x]) => n === "setShowOverlay" && x === v).length;

describe("UTAC000.14 · AppContext — o overlay do vencedor volta a abrir no fim do leilão", () => {
  test("prazo a 0: relâmpago já, e 1200 ms depois `setShowOverlay(true)`", () => {
    const m = montar(extrairTick(fonte()), { prazoTimestamp: 1000, agoraSeg: 1000 });
    m.tick();
    assert.deepEqual(m.chamadas, [["setEncerrado", true], ["setLightningActive", true]],
      "antes do temporizador: só encerrado + relâmpago (o overlay ainda não pode abrir)");
    assert.equal(m.temporizadores.length, 1, "controlo: devia haver UM temporizador");
    assert.equal(m.temporizadores[0].ms, 1200, "o atraso do overlay mudou (era 1200 ms)");
    m.temporizadores[0].fn();
    assert.equal(disparos(m.chamadas, true), 1, "o overlay NÃO abriu ao fim do temporizador");
    assert.deepEqual(m.chamadas.slice(-2), [["setLightningActive", false], ["setShowOverlay", true]],
      "a ordem mudou: o relâmpago apaga-se e SÓ DEPOIS o overlay abre");
  });

  test("anti-duplicação: ticks seguintes com prazo a 0 não reabrem o overlay", () => {
    const m = montar(extrairTick(fonte()), { prazoTimestamp: 1000, agoraSeg: 1005 });
    m.tick(); m.temporizadores[0].fn();
    m.tick(); m.tick();
    assert.equal(m.temporizadores.length, 1, "um 2.º temporizador foi armado (fimDisparadoRef falhou)");
    assert.equal(disparos(m.chamadas, true), 1, "o overlay abriu mais de uma vez");
  });

  test("prazo no futuro: o overlay NÃO abre (controlo negativo)", () => {
    const m = montar(extrairTick(fonte()), { prazoTimestamp: 2000, agoraSeg: 1000 });
    m.tick();
    assert.equal(m.temporizadores.length, 0);
    assert.equal(disparos(m.chamadas, true), 0, "o overlay abriu antes do fim do leilão");
  });

  test("prazo reaberto on-chain depois de encerrado: fecha o overlay (inalterado)", () => {
    const m = montar(extrairTick(fonte()), { prazoTimestamp: 2000, agoraSeg: 1000, encerrado: true });
    m.tick();
    assert.deepEqual(m.chamadas, [["setEncerrado", false], ["setShowOverlay", false]]);
  });

  test("CONTROLO: com a linha de novo comentada (em memória), o overlay NÃO abre — o teste morde", () => {
    const desligado = extrairTick(fonte()).replace("setShowOverlay(true);", "// setShowOverlay(true);");
    assert.notEqual(desligado, extrairTick(fonte()), "controlo mal construído: a substituição não entrou");
    const m = montar(desligado, { prazoTimestamp: 1000, agoraSeg: 1000 });
    m.tick(); m.temporizadores[0].fn();
    assert.equal(disparos(m.chamadas, true), 0, "o teste não distingue ligado de desligado");
  });
});
