// utac0008-resultado-oficial-hook.test.mjs — UTAC000.8: o EFEITO REAL do hook novo.
//
// Corre com:  node --test --test-concurrency=1 src/hooks/__tests__/utac0008-resultado-oficial-hook.test.mjs
// (a partir de desafio-gut/frontend)
//
// PORQUE ESTE FICHEIRO EXISTE (lacuna declarada na 1.ª versão da correcção):
// os testes da PÁGINA injectam o resultado oficial por um DUPLO do hook — logo o corpo do
// efeito (`await lerResultado`, o `setResultado`, o `clearInterval` ao consolidar, o `catch`
// fail-soft e a limpeza do intervalo) NUNCA era exercitado. O `normalizarResultadoOficial` é
// testado como função pura, mas «a função pura está bem» não é «o hook faz o que promete».
// Aqui o hook corre A SÉRIO, com o condutor de hooks do projeto (`_hook-runner.mjs`).
//
// ⚠️ Carregado pelo servidor Vite (e não por `import` directo): `useResultadoOficial` importa
// `useResultadoEspecial` → `utils/web3.js`, que usa o alias `@/` e `import.meta.env` — nada
// disso existe no Node puro (medido: `Cannot find package '@/lib'`). O `opcoesServidorTeste()`
// externaliza `react`, para o condutor e o hook verem a MESMA instância de React (A12).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

let vite = null;
let montar = null;
let useResultadoOficial = null;

before(async () => {
  vite = await createServer(opcoesServidorTeste());
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ useResultadoOficial } = await vite.ssrLoadModule("/src/hooks/useResultadoOficial.js"));
});

after(async () => { if (vite) await vite.close(); });

const OUTRO = "0xbbbb000000000000000000000000000000000002";
const CONSOLIDADO = { consolidado: true, vencedor: OUTRO, menorUnicoCentavos: 100 };

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Leitor duplo que conta chamadas e devolve o que lhe for dito (ou lança). */
function leitor(respostas) {
  const estado = { chamadas: 0 };
  const fn = async () => {
    estado.chamadas += 1;
    const r = typeof respostas === "function" ? respostas(estado.chamadas) : respostas;
    if (r instanceof Error) throw r;
    return r;
  };
  return { fn, estado };
}

const args = (lerResultado, intervaloMs) => ["R-1", { lerResultado, intervaloMs }];

// ───────────────────────────────────────────────────────────────────────────
describe("UTAC000.8 · useResultadoOficial — o efeito a correr", () => {
  test("lê ao montar e expõe o resultado normalizado (só os 3 campos, vencedor em minúsculas)", async (t) => {
    const { fn } = leitor({ consolidado: true, vencedor: OUTRO.toUpperCase(), menorUnicoCentavos: 100 });
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.deepEqual(c.resultado(), CONSOLIDADO);
    await c.desmontar();
  });

  test("edição por consolidar → null (o hook NÃO inventa um vencedor)", async (t) => {
    const { fn } = leitor({ consolidado: false, vencedor: OUTRO, menorUnicoCentavos: 100 });
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.equal(c.resultado(), null);
    await c.desmontar();
  });

  test("edição sem lance único (endereço nulo) → null", async (t) => {
    const { fn } = leitor({ consolidado: true, vencedor: "0x0000000000000000000000000000000000000000", menorUnicoCentavos: 0 });
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.equal(c.resultado(), null);
    await c.desmontar();
  });

  test("leitura que FALHA → null e a excepção não escapa (fail-soft)", async (t) => {
    const { fn } = leitor(new Error("RPC em baixo"));
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.equal(c.resultado(), null);
    await c.desmontar();
  });

  test("sem edicaoId → não lê nada", async (t) => {
    const { fn, estado } = leitor(CONSOLIDADO);
    const c = montar(useResultadoOficial, ["", { lerResultado: fn, intervaloMs: 5 }]);
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    await esperar(30);
    assert.equal(estado.chamadas, 0, "leu sem edição");
    assert.equal(c.resultado(), null);
    await c.desmontar();
  });

  test("DEPOIS de consolidar PARA de reler (o resultado não muda mais)", async (t) => {
    const { fn, estado } = leitor(CONSOLIDADO);
    const c = montar(useResultadoOficial, args(fn, 5));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.deepEqual(c.resultado(), CONSOLIDADO);
    await esperar(60); // ~12 ciclos se o intervalo continuasse vivo
    assert.equal(estado.chamadas, 1, `releu ${estado.chamadas}× depois de consolidar`);
    await c.desmontar();
  });

  test("enquanto NÃO consolida, relê (e o desmonte corta a releitura)", async (t) => {
    const { fn, estado } = leitor({ consolidado: false, vencedor: OUTRO, menorUnicoCentavos: 100 });
    const c = montar(useResultadoOficial, args(fn, 5));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    await esperar(30);
    const antesDeDesmontar = estado.chamadas;
    assert.ok(antesDeDesmontar > 1, `não releu enquanto o leilão corre (chamadas=${antesDeDesmontar})`);
    await c.desmontar();
    await esperar(40);
    assert.equal(estado.chamadas, antesDeDesmontar, "continuou a reler depois de desmontado (intervalo sem limpeza)");
    assert.deepEqual(c.tardias(), [], "escreveu estado depois de desmontado");
  });

  test("mudar de edição volta a ler (o argumento é respeitado)", async (t) => {
    const { fn, estado } = leitor({ consolidado: false, vencedor: OUTRO, menorUnicoCentavos: 100 });
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    await c.actualizar(["R-2", { lerResultado: fn, intervaloMs: 1_000_000 }]);
    assert.equal(estado.chamadas, 2, "não releu ao mudar de edição");
    await c.desmontar();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ACHADO DO VALIDADOR ADVERSARIAL (2.ª ronda): a 1.ª versão guardava o resultado
// SEM a edição a que pertencia. Ao mudar de edição — ou quando a leitura da edição
// nova falha ou fica pendente — a página continuava a mostrar o vencedor da edição
// ANTERIOR. Um vencedor de outra edição é exactamente a mentira que este UTAC combate.
describe("UTAC000.8 · troca de edição — NUNCA servir o vencedor de OUTRA edição", () => {
  test("CONTROLO: com a edição nova a RESPONDER (não consolidada), o vencedor anterior sai", async (t) => {
    let consolidada = true;
    const fn = async () => (consolidada
      ? CONSOLIDADO
      : { consolidado: false, vencedor: OUTRO, menorUnicoCentavos: 100 });
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.deepEqual(c.resultado(), CONSOLIDADO);
    consolidada = false;
    await c.actualizar(["R-2", { lerResultado: fn, intervaloMs: 1_000_000 }]);
    assert.equal(c.resultado(), null);
    await c.desmontar();
  });

  test("a leitura da edição nova FALHA → não fica com o vencedor da anterior", async (t) => {
    let falhar = false;
    const fn = async () => {
      if (falhar) throw new Error("RPC em baixo");
      return CONSOLIDADO;
    };
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.deepEqual(c.resultado(), CONSOLIDADO);
    falhar = true;
    await c.actualizar(["R-2", { lerResultado: fn, intervaloMs: 1_000_000 }]);
    assert.equal(c.resultado(), null, "serviu o vencedor da edição ANTERIOR");
    await c.desmontar();
  });

  test("a edição activa passa a vazio → não fica com o vencedor da anterior", async (t) => {
    const { fn } = leitor(CONSOLIDADO);
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.deepEqual(c.resultado(), CONSOLIDADO);
    await c.actualizar(["", { lerResultado: fn, intervaloMs: 1_000_000 }]);
    assert.equal(c.resultado(), null, "serviu o vencedor de uma edição que já não é a activa");
    await c.desmontar();
  });

  test("a leitura da edição nova fica PENDENTE → não fica com o vencedor da anterior", async (t) => {
    let pendente = false;
    const fn = async () => {
      if (pendente) return new Promise(() => {}); // nunca resolve: leitura em voo
      return CONSOLIDADO;
    };
    const c = montar(useResultadoOficial, args(fn, 1_000_000));
    t.after(() => c.desmontar()); // limpeza mesmo se um assert rebentar
    await c.assentar();
    assert.deepEqual(c.resultado(), CONSOLIDADO);
    pendente = true;
    await c.actualizar(["R-2", { lerResultado: fn, intervaloMs: 1_000_000 }]);
    assert.equal(c.resultado(), null, "mostrou o vencedor da edição anterior enquanto a nova carrega");
    await c.desmontar();
  });
});
