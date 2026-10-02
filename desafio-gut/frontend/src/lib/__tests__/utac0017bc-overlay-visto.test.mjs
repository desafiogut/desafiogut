// utac0017bc-overlay-visto.test.mjs — UTAC000.17bc (17c/GATE 22).
//
// node --test --test-concurrency=1 src/lib/__tests__/utac0017bc-overlay-visto.test.mjs
//
// O QUE SE PROVA: a memória do «visto» no aparelho (localStorage) — por ENDEREÇO e por EDIÇÃO.
// É ela que garante que o overlay terminado não volta a abrir (o «modal que não se fecha»).
// Casos: marca/lê; `jaVisto` é por endereço E por edição (não confunde titulares); idempotente;
// aguenta storage ausente/corrompido sem lançar (nunca pode derrubar o fim do leilão).

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { lerVistos, jaVisto, marcarVisto, limparVistos } from "../overlayVisto.js";

const EU = "0xaaaa000000000000000000000000000000000001";
const OUTRO = "0xbbbb000000000000000000000000000000000002";
const CHAVE = "gut_overlay_visto";

/** localStorage mínimo, com o mesmo contrato do browser. */
function storageFalso({ falhar = false } = {}) {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (falhar) throw new Error("quota"); m.set(k, String(v)); },
    removeItem: (k) => m.delete(k),
    _mapa: m,
  };
}

beforeEach(() => { global.window = { localStorage: storageFalso() }; });

describe("UTAC000.17bc (17c/GATE 22) · «marcar como visto» do overlay agregado", () => {
  test("marcar e ler: a edição vista é lembrada por ENDEREÇO", () => {
    assert.equal(jaVisto(EU, "R-1"), false, "começa sem nada visto");
    assert.equal(marcarVisto(EU, "R-1"), true);
    assert.equal(jaVisto(EU, "R-1"), true);
    assert.deepEqual(lerVistos(EU), ["R-1"]);
  });

  test("é POR ENDEREÇO: o que eu vi não conta para outro titular", () => {
    marcarVisto(EU, "R-1");
    assert.equal(jaVisto(OUTRO, "R-1"), false, "outro endereço não pode herdar o «visto»");
    assert.deepEqual(lerVistos(OUTRO), []);
  });

  test("é POR EDIÇÃO: ver a R-1 não marca a R-2", () => {
    marcarVisto(EU, "R-1");
    assert.equal(jaVisto(EU, "R-2"), false);
    marcarVisto(EU, "R-2");
    assert.deepEqual(lerVistos(EU).sort(), ["R-1", "R-2"]);
  });

  test("idempotente: marcar duas vezes não duplica", () => {
    marcarVisto(EU, "R-1");
    marcarVisto(EU, "R-1");
    assert.deepEqual(lerVistos(EU), ["R-1"]);
  });

  test("endereço é normalizado (EIP-55 em maiúsculas casa com minúsculas)", () => {
    marcarVisto(EU.toUpperCase().replace("0X", "0x"), "R-1");
    assert.equal(jaVisto(EU, "R-1"), true, "o mesmo endereço em maiúsculas tem de casar");
  });

  test("sobrevive a JSON corrompido e a storage que lança (nunca rebenta)", () => {
    global.window.localStorage.setItem(CHAVE, "{isto não é json");
    assert.deepEqual(lerVistos(EU), [], "corrompido = nada visto");
    assert.equal(jaVisto(EU, "R-1"), false);
    global.window.localStorage = storageFalso({ falhar: true });
    assert.equal(marcarVisto(EU, "R-1"), true, "a escrita falha em silêncio (devolve true, não lança)");
  });

  test("limpar apaga só o endereço indicado", () => {
    marcarVisto(EU, "R-1");
    marcarVisto(OUTRO, "R-9");
    limparVistos(EU);
    assert.deepEqual(lerVistos(EU), []);
    assert.deepEqual(lerVistos(OUTRO), ["R-9"], "o «visto» do outro titular ficou intacto");
  });

  test("sem `window` (SSR) não lança e assume «nada visto»", () => {
    delete global.window;
    assert.deepEqual(lerVistos(EU), []);
    assert.equal(jaVisto(EU, "R-1"), false);
    assert.equal(marcarVisto(EU, "R-1"), true);
  });
});
