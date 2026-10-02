// utac00014-show-overlay.test.mjs — UTAC000.14 (religar o `showOverlay`) · ADAPTADO no UTAC000.17bc.
//
// node --test --test-concurrency=1 src/context/__tests__/utac00014-show-overlay.test.mjs
//   (a partir de desafio-gut/frontend)
//
// ⚠️ PORQUE ESTE FICHEIRO FOI ADAPTADO (UTAC000.17bc / DEBT-016) — e o que NÃO mudou:
//   A regra do UTAC000.14 (o overlay abre UMA vez, 1200 ms depois do fim, e NUNCA em EM BREVE) mantém-se
//   e todos os casos continuam aqui. O que mudou é a FONTE do prazo: era o cronómetro LOCAL
//   (`prazoTimestamp` = localStorage/agora+30min) e passou a ser o `termino_em` REAL do servidor
//   (`edicoes[EDICAO_ATIVA]`), ignorando edições SIN TÉTICAS — é o que fecha a DEBT-016 (o overlay abria
//   «a cada 30 min»). Por isso os duplos passaram a fornecer `edicoes`/`EDICAO_ATIVA`/`offsetRelogioMs`
//   em vez de `prazoTimestamp`, e há casos NOVOS para o prazo inventado e para a ausência de prazo.
//
// ARNÊS: o `AppContext.jsx` não se renderiza em teste (importa o Privy e faz I/O — ver a nota de
// `utac0010-vencedor-contexto.test.mjs`). Aqui a função `tick` REAL é extraída do ficheiro e EXECUTADA
// com duplos (relógio, `setTimeout` e setters controlados). Prova comportamento da função, não a forma.
// (Limite declarado: não prova a cablagem do `useEffect` nem o render; a travessia servidor → Provider
//  está no arnês de runtime `src/__tests__/_arnes-provider.mjs` — ver `utac0017bc-prazo-real.test.mjs`.)

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

const iso = (seg) => new Date(seg * 1000).toISOString();
const R1 = "R-1";

/**
 * Monta a `tick` com duplos. `terminoEm` (ISO) é o prazo do SERVIDOR para a edição activa;
 * `sintetizada: true` marca-o como inventado (não conta); `semEdicao` remove a edição do mapa.
 */
function montar(codigoTick, {
  terminoEm = null, agoraSeg, encerrado = false, emBreve = false,
  sintetizada = false, offsetRelogioMs = 0, semEdicao = false, fimJaDisparado = false,
  vistos = [],
} = {}) {
  const chamadas = [];
  const temporizadores = [];
  const edicoes = semEdicao || terminoEm == null
    ? {}
    : { [R1]: { id: R1, tipo: "relampago", termino_em: terminoEm, lances: 0, status: "aberto", sintetizada } };
  const duplos = {
    edicoes, EDICAO_ATIVA: R1, offsetRelogioMs, EM_BREVE_MODE: emBreve, encerrado,
    // UTAC000.17bc (GATE 22) — o tick pergunta se a edição JÁ FOI VISTA (localStorage) antes de abrir.
    address: "0xaaaa000000000000000000000000000000000001",
    jaVisto: (_endereco, id) => vistos.includes(id),
    setEncerrado: (v) => chamadas.push(["setEncerrado", v]),
    setLightningActive: (v) => chamadas.push(["setLightningActive", v]),
    setShowOverlay: (v) => chamadas.push(["setShowOverlay", v]),
    fimDisparadoRef: { current: fimJaDisparado },
    timeoutAnimRef: { current: null },
    setTimeout: (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; },
    clearTimeout: () => {},
    Date: { now: () => agoraSeg * 1000, parse: (s) => Date.parse(s), },
  };
  const nomes = Object.keys(duplos);
  // eslint-disable-next-line no-new-func
  const tick = new Function(...nomes, `${codigoTick}\nreturn tick;`)(...nomes.map((n) => duplos[n]));
  return { tick, chamadas, temporizadores, duplos };
}

const disparos = (chamadas, v) => chamadas.filter(([n, x]) => n === "setShowOverlay" && x === v).length;

const EPOCH = 1_760_000_000; // ≈ 2025-10, um prazo realista em segundos

describe("UTAC000.14/17bc · AppContext — o overlay abre no fim do leilão pelo PRAZO REAL do servidor", () => {
  test("prazo real vencido: relâmpago já, e 1200 ms depois `setShowOverlay(true)`", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH });
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

  test("anti-duplicação: ticks seguintes com o prazo vencido não reabrem o overlay", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH + 5 });
    m.tick(); m.temporizadores[0].fn();
    m.tick(); m.tick();
    assert.equal(m.temporizadores.length, 1, "um 2.º temporizador foi armado (fimDisparadoRef falhou)");
    assert.equal(disparos(m.chamadas, true), 1, "o overlay abriu mais de uma vez");
  });

  test("prazo real no futuro: o overlay NÃO abre (controlo negativo)", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH + 60), agoraSeg: EPOCH });
    m.tick();
    assert.equal(m.temporizadores.length, 0);
    assert.equal(disparos(m.chamadas, true), 0, "o overlay abriu antes do fim do leilão");
  });

  test("prazo reaberto depois de encerrado: fecha o overlay e rearma o fim (inalterado)", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH + 60), agoraSeg: EPOCH, encerrado: true, fimJaDisparado: true });
    m.tick();
    assert.deepEqual(m.chamadas, [["setEncerrado", false], ["setShowOverlay", false]]);
    assert.equal(m.duplos.fimDisparadoRef.current, false, "o fim não foi rearmado");
  });

  test("EM BREVE: prazo vencido mas o overlay NÃO abre (o relâmpago, sim)", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH, emBreve: true });
    m.tick(); m.temporizadores[0].fn();
    assert.equal(disparos(m.chamadas, true), 0, "o overlay abriu em EM BREVE (o defeito do SEG-3)");
    assert.deepEqual(m.chamadas.slice(-1), [["setLightningActive", false]], "a máquina do relâmpago mudou");
  });

  test("EM BREVE: prazo no futuro — nada dispara", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH + 3600), agoraSeg: EPOCH, emBreve: true });
    m.tick();
    assert.equal(m.temporizadores.length, 0);
    assert.deepEqual(m.chamadas, [], "algo disparou antes do fim do leilão em EM BREVE");
  });

  // ── DEBT-016 (UTAC000.17bc): a fonte do prazo é o SERVIDOR, e o prazo inventado não conta ─────────
  test("DEBT-016: edição SINTÉTICA com prazo vencido NÃO abre o overlay (é prazo inventado)", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH + 3600, sintetizada: true });
    m.tick();
    assert.equal(m.temporizadores.length, 0, "tratou um prazo inventado como prazo real");
    assert.deepEqual(m.chamadas, [], "nada pode disparar sem prazo real");
  });

  test("DEBT-016/GATE 26: SEM prazo do servidor (nenhuma edição) não abre — a espera é o comportamento seguro", () => {
    for (const opcoes of [{ semEdicao: true }, { terminoEm: null }]) {
      const m = montar(extrairTick(fonte()), { agoraSeg: EPOCH, ...opcoes });
      m.tick();
      assert.equal(m.temporizadores.length, 0, `disparou sem prazo real (${JSON.stringify(opcoes)})`);
      assert.deepEqual(m.chamadas, [], `nada pode disparar sem prazo real (${JSON.stringify(opcoes)})`);
    }
  });

  test("o fim lê o relógio do SERVIDOR (offset aplicado), não o do aparelho", () => {
    // Aparelho atrasado 1h: com o offset do servidor o prazo JÁ venceu; sem ele, ainda não.
    const offset = 3600;
    const comOffset = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH - offset, offsetRelogioMs: offset * 1000 });
    comOffset.tick();
    assert.equal(disparos(comOffset.chamadas, true) + comOffset.temporizadores.length, 1,
      "com o offset do servidor o prazo real já tinha vencido");
    const semOffset = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH - offset, offsetRelogioMs: 0 });
    semOffset.tick();
    assert.equal(semOffset.temporizadores.length, 0, "sem offset o prazo ainda não venceu");
  });

  // UTAC000.17bc — ressalva de PRECISÃO do validador adversarial (corrigida): sem o `agora` do servidor
  // (`offsetRelogioMs === null`) o fim NÃO pode ser decidido pelo relógio do aparelho. Antes desta
  // correcção o `|| 0` deixava o aparelho decidir — e a minha alegação «o relógio local NUNCA o decide»
  // era, por isso, imprecisa.
  test("GATE 26: sem o `agora` do servidor (offset null) o fim NÃO dispara, mesmo com prazo real vencido", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH, offsetRelogioMs: null });
    m.tick();
    assert.equal(m.temporizadores.length, 0, "decidiu o fim sem o relógio do servidor");
    assert.deepEqual(m.chamadas, [], "nada pode disparar sem o relógio do servidor");
  });

  test("controlo: com a linha do overlay comentada (em memória), NÃO abre — o teste morde", () => {
    const desligado = extrairTick(fonte()).replace("if (!EM_BREVE_MODE && !jaVisto(address, EDICAO_ATIVA)) setShowOverlay(true);", "// setShowOverlay(true);");
    assert.notEqual(desligado, extrairTick(fonte()), "controlo mal construído: a substituição não entrou");
    const m = montar(desligado, { terminoEm: iso(EPOCH), agoraSeg: EPOCH });
    m.tick(); m.temporizadores[0].fn();
    assert.equal(disparos(m.chamadas, true), 0, "o teste não distingue ligado de desligado");
  });

  // UTAC000.17bc (17c/GATE 22) — «marcar como visto»: uma edição já vista NÃO reabre o overlay.
  test("GATE 22: edição JÁ VISTA não abre o overlay (o relâmpago ainda corre)", () => {
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH, vistos: [R1] });
    m.tick();
    assert.equal(m.temporizadores.length, 1, "o fim continua a armar o temporizador do relâmpago");
    m.temporizadores[0].fn();
    assert.equal(disparos(m.chamadas, true), 0, "o overlay reabriu numa edição já vista (GATE 22)");
    assert.deepEqual(m.chamadas.slice(-1), [["setLightningActive", false]], "a máquina do relâmpago mudou");
  });

  test("hoje (`EM_BREVE_MODE` real do leilaoLock.js): o AppContext usa ESSA flag", async () => {
    const { EM_BREVE_MODE } = await import("../../lib/leilaoLock.js");
    assert.ok(fonte().includes('\nimport { EM_BREVE_MODE } from "../lib/leilaoLock.js";\n'),
      "o AppContext deixou de ler a flag da fonte única (leilaoLock.js)");
    const m = montar(extrairTick(fonte()), { terminoEm: iso(EPOCH), agoraSeg: EPOCH, emBreve: EM_BREVE_MODE });
    m.tick(); if (m.temporizadores.length) m.temporizadores[0].fn();
    assert.equal(disparos(m.chamadas, true), EM_BREVE_MODE ? 0 : 1,
      `com EM_BREVE_MODE=${EM_BREVE_MODE} o overlay devia ${EM_BREVE_MODE ? "ficar fechado" : "abrir"}`);
  });
});
