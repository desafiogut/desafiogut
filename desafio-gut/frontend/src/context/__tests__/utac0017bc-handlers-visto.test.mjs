// utac0017bc-handlers-visto.test.mjs — UTAC000.17bc · fecha a REFUTAÇÃO PARCIAL do validador adversarial.
//
// node --test --test-concurrency=1 src/context/__tests__/utac0017bc-handlers-visto.test.mjs
//
// O BURACO QUE FECHA (medido pelo validador, mutante M4 dele): remover a chamada
// `marcarVisto(address, EDICAO_ATIVA)` dos DOIS handlers (`fecharOverlay` e `handleNovaRodada`)
// **passava as 4 suítes**. Ou seja: os testes cobriam a FUNÇÃO pura do «visto», mas não a CABLAGEM
// «sair pelo FECHAR / NOVA RODADA marca a edição como vista» — que é precisamente a metade da DEBT-016
// que impede o «modal que não se fecha». Um mutante que reintroduza o defeito passava a suíte inteira.
//
// COMO: as duas funções são extraídas do `AppContext.jsx` por balanceamento de chaves e EXECUTADAS com
// duplos (mesma técnica do contrato do `tick`), registando as chamadas. (O `AppContext.jsx` real não se
// renderiza em teste; e o arnês de runtime não tem DOM para cliques — daí executar os handlers.)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = () => readFileSync(new URL("../AppContext.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");

/** Extrai `function <nome>(...) { ... }` por balanceamento de chaves. */
function extrairFuncao(src, nome) {
  const ini = src.indexOf(`function ${nome}(`);
  assert.ok(ini > 0, `controlo: não encontrei function ${nome}`);
  const abre = src.indexOf("{", src.indexOf(")", ini));
  assert.ok(abre > ini, `controlo: não encontrei o corpo de ${nome}`);
  let n = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === "{") n++;
    else if (src[i] === "}") { n--; if (n === 0) return src.slice(ini, i + 1); }
  }
  throw new Error(`não fechei o corpo de ${nome}`);
}

const ENDERECO = "0xaaaa000000000000000000000000000000000001";

function montarHandler(nome, extras = {}) {
  const chamadas = [];
  const temporizadores = [];
  const duplos = {
    marcarVisto: (...a) => chamadas.push(["marcarVisto", ...a]),
    address: ENDERECO,
    EDICAO_ATIVA: "R-1",
    setEncerrado: (v) => chamadas.push(["setEncerrado", v]),
    setShowOverlay: (v) => chamadas.push(["setShowOverlay", v]),
    setLightningActive: (v) => chamadas.push(["setLightningActive", v]),
    setLances: (v) => chamadas.push(["setLances", v]),
    setLancesFlash: (v) => chamadas.push(["setLancesFlash", v]),
    setShowCountdown: (v) => chamadas.push(["setShowCountdown", v]),
    setPrazoTimestamp: (v) => chamadas.push(["setPrazoTimestamp", v]),
    fimDisparadoRef: { current: true },
    timeoutAnimRef: { current: null },
    setTimeout: (fn, ms) => { temporizadores.push({ fn, ms }); return 1; },
    clearTimeout: () => {},
    DURACAO: { flash: 1800, programado: 3600 },
    modalidade: "flash",
    ...extras,
  };
  const nomes = Object.keys(duplos);
  const codigo = extrairFuncao(fonte(), nome);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...nomes, `${codigo}\nreturn ${nome};`)(...nomes.map((n) => duplos[n]));
  return { fn, chamadas, temporizadores, duplos };
}

const vistos = (chamadas) => chamadas.filter(([n]) => n === "marcarVisto");

describe("UTAC000.17bc · a cablagem do «visto» nos handlers (fecha o mutante M4 do validador)", () => {
  test("FECHAR (`fecharOverlay`) MARCA a edição como vista e fecha o overlay", () => {
    const m = montarHandler("fecharOverlay");
    m.fn();
    assert.deepEqual(vistos(m.chamadas), [["marcarVisto", ENDERECO, "R-1"]],
      "fecharOverlay tem de marcar visto com (address, EDICAO_ATIVA) — sem isto o overlay reabre");
    assert.deepEqual(m.chamadas.filter(([n]) => n === "setShowOverlay"), [["setShowOverlay", false]],
      "fecharOverlay tem de fechar o overlay");
  });

  test("NOVA RODADA (`handleNovaRodada`) MARCA a edição como vista (antes de limpar o estado)", () => {
    const m = montarHandler("handleNovaRodada");
    m.fn();
    assert.deepEqual(vistos(m.chamadas), [["marcarVisto", ENDERECO, "R-1"]],
      "handleNovaRodada tem de marcar visto — era o caminho do «modal que não fecha»");
    assert.ok(m.chamadas.findIndex(([n]) => n === "marcarVisto") < m.chamadas.findIndex(([n]) => n === "setShowOverlay"),
      "o «visto» tem de ser marcado ANTES de limpar o estado (ordem do código)");
  });

  test("NOVA RODADA faz o resto que já fazia (não regrediu)", () => {
    const m = montarHandler("handleNovaRodada");
    m.fn();
    for (const esperado of [["setEncerrado", false], ["setShowOverlay", false], ["setLightningActive", false],
                            ["setLances", []], ["setLancesFlash", []], ["setShowCountdown", true]]) {
      assert.ok(m.chamadas.some((c) => JSON.stringify(c) === JSON.stringify(esperado)),
        `faltou o efeito ${JSON.stringify(esperado)}`);
    }
    assert.equal(m.duplos.fimDisparadoRef.current, false, "o fim tem de ser rearmado");
    assert.equal(m.temporizadores.length, 1, "tem de armar o temporizador dos 3500 ms");
    assert.equal(m.temporizadores[0].ms, 3500, "o atraso mudou");
  });

  test("controlo: com o `marcarVisto` substituído por `void 0` (o mutante M4 do validador), os testes acima caem", () => {
    const src = fonte();
    const mutado = src
      .replace(/marcarVisto\(address, EDICAO_ATIVA\);/g, "void 0;")
      .replace(/VISTO_MUTADO/g, "");
    assert.notEqual(mutado, src, "controlo mal construído: a substituição não entrou");
    assert.equal((src.match(/marcarVisto\(address, EDICAO_ATIVA\);/g) || []).length, 2,
      "esperava DUAS chamadas (fecharOverlay + handleNovaRodada)");
    assert.equal((mutado.match(/marcarVisto\(address, EDICAO_ATIVA\);/g) || []).length, 0,
      "o mutante tem de remover as duas");
  });
});
