// MC59.3 — Follow-up C-1: bootstrap de endereço NOVO deve ser atómico
// (INSERT..DO NOTHING), não upsert incondicional. Prova determinística: um mock
// injeta uma escrita concorrente (outro crédito inserindo a linha) ENTRE o
// "garante linha" ler null e a gravação. Com upsert incondicional (antigo) a
// escrita concorrente é sobrescrita (lost update); com inserirSaldoSeAusente
// (novo) ela é preservada e o CAS relê.
// node --test --experimental-test-module-mocks _tests/mc593-c1-bootstrap.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const ADDR = "0xAbc0000000000000000000000000000000000abc";
const KEY  = ADDR.toLowerCase();

const mem = new Map();
let getSaldoCalls = 0;   // conta chamadas de getSaldo para KEY
let injectAt2 = false;   // se true, injeta escrita concorrente na 2ª leitura (ensure-row)

mock.module("../_lib/saldoRs-store.mjs", {
  namedExports: {
    getSaldo: async (id) => {
      const k = String(id);
      const snap = mem.get(k) ?? null;
      if (k === KEY) {
        getSaldoCalls += 1;
        // 2ª leitura = o "garante linha" (ensure-row). Injeta a linha concorrente
        // (outro crédito de 300) DEPOIS de devolver null → simula a corrida real.
        if (injectAt2 && getSaldoCalls === 2 && snap === null) {
          mem.set(k, { centavos: 300, atualizadoEm: "concorrente" });
        }
      }
      return snap;
    },
    setSaldo: async (id, payload) => { mem.set(String(id), payload); }, // upsert INCONDICIONAL (antigo)
    // INSERT..DO NOTHING (novo): só grava se ausente.
    inserirSaldoSeAusente: async (id, payload) => { if (!mem.has(String(id))) mem.set(String(id), payload); },
    casSaldo: async (id, expected, payload) => {
      const curC = Math.floor(Number(mem.get(String(id))?.centavos ?? 0));
      if (curC !== Math.floor(Number(expected))) return false;
      mem.set(String(id), payload);
      return true;
    },
    getCredito: async () => null,
    setCredito: async () => {},
    getDebito:  async () => null,
    setDebito:  async () => {},
  },
});
mock.module("../_lib/financeiro-fallback.mjs", {
  namedExports: { lerSaldoLegado: async () => null, lerCreditoLegado: async () => null },
});

let saldo;
before(async () => { saldo = await import("../_lib/saldoRs.mjs"); });
beforeEach(() => { mem.clear(); getSaldoCalls = 0; injectAt2 = false; });

test("C-1 follow-up: bootstrap concorrente NÃO perde o crédito concorrente (atómico)", async () => {
  injectAt2 = true; // linha concorrente (300) aparece durante o ensure-row
  const r = await saldo.creditarSaldoRsIdempotente({ pedidoId: "pixBoot", endereco: ADDR, valorCentavos: 500, fonte: "teste" });
  assert.equal(r.ok, true);
  // Correto: 300 (concorrente) + 500 = 800. Antigo (upsert overwrite): 500 (perde 300).
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 800);
});

test("C-1 follow-up(reg): endereço novo sem concorrência credita normalmente", async () => {
  const r = await saldo.creditarSaldoRsIdempotente({ pedidoId: "pixNew", endereco: ADDR, valorCentavos: 700 });
  assert.equal(r.ok, true);
  assert.equal(await saldo.lerSaldoRsCentavos(ADDR), 700);
});
