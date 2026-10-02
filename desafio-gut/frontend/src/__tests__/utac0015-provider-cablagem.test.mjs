// utac0015-provider-cablagem.test.mjs — UTAC000.15 (DEBT-010).
//
// node --test --test-concurrency=1 src/__tests__/utac0015-provider-cablagem.test.mjs
//   (a partir de desafio-gut/frontend)
//
// O QUE SE PROVA (em RUNTIME, não por texto)
//   O `AppProvider` VERDADEIRO — com os seus efeitos reais (polling de `lances-flash` pelo `apiGet`
//   real) — expõe no contexto o vencedor OFICIAL quando existe, e a PÁGINA real que lê esse contexto
//   mostra-o. É a travessia `AppContext → página` que a DEBT-010 dizia não ter prova: o mutante M12
//   (texto da regra intacto, `vencedor` sobrescrito com o local em runtime) passava a suíte inteira.
//
// ⚠️ CASO DISCRIMINANTE (o mesmo do UTAC000.10): o vencedor LOCAL (o que chega por `lances-flash`:
// OUTRO, R$ 1,00) é DIFERENTE do OFICIAL (EU, R$ 3,00). Se a travessia ceder ao local, fica RED.
//
// ARNÊS: `_arnes-provider.mjs` (duplos só nas fronteiras de I/O; ver o cabeçalho de lá).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { criarArnes } from "./_arnes-provider.mjs";

const EU    = "0xaaaa000000000000000000000000000000000001";
const OUTRO = "0xbbbb000000000000000000000000000000000002";
const abrev = (e) => `${e.slice(0, 10)}...${e.slice(-6)}`;
const LOCAIS = [
  { endereco: OUTRO, valor: 100, repetido: false }, // o menor único LOCAL
  { endereco: EU,    valor: 300, repetido: false },
];
const OFICIAL = { vencedor: EU, menorUnicoCentavos: 300 };
const contar = (s, alvo) => s.split(alvo).length - 1;

/** UTAC000.17bc — R-1 REAL: a forma que o servidor devolve de `edicoes-metadata` (SEM o marcador de
 *  sintética). É o fixture que prova a travessia do PRAZO REAL do servidor → AppContext → página. */
const edicaoR1Real = (agoraSeg, { vencidoSeg = 5, sintetizada = false } = {}) => ({
  "R-1": {
    id: "R-1", tipo: "relampago", produto: null,
    termino_em: new Date((agoraSeg - vencidoSeg) * 1000).toISOString(),
    lances: 0, status: "aberto",
    ...(sintetizada ? { sintetizada: true } : {}),
  },
});

/** Espera (sem relógio fixo) até o temporizador REAL de 1200 ms do fim ter corrido: o relâmpago acende
 *  no tick e APAGA dentro desse temporizador — é ele que decide o overlay. Tecto de 5 s (sob carga). */
async function esperarFimDoRelampago(p) {
  const limite = Date.now() + 5000;
  let viuAceso = false;
  while (Date.now() < limite) {
    await p.assentar();
    const v = p.valor();
    if (v.lightningActive) viuAceso = true;
    if (v.encerrado && !v.lightningActive && (viuAceso || v.showOverlay)) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("o temporizador do fim (1200 ms) não correu em 5 s");
}

describe("UTAC000.15 · o Provider REAL expõe o vencedor oficial (valor do contexto)", () => {
  let a = null;
  before(async () => { a = await criarArnes(); });
  after(async () => { if (a) await a.fechar(); });

  /** Consumidor de teste: lê o contexto pelo hook REAL e escreve o vencedor no HTML. */
  const leitor = () => a.React.createElement(() => {
    const v = a.contexto.useAppContext()?.vencedor;
    return a.React.createElement("p", { "data-vencedor": v ? `${v.endereco}|${v.valor}` : "nenhum" });
  });

  test("CONTROLO: os lances locais CHEGAM ao Provider pelo efeito real (sem isto o M12 seria inócuo)", async (t) => {
    const p = await a.montarProvider({ children: leitor(), lancesFlash: LOCAIS, resultadoOficial: null });
    t.after(() => p.desmontar());
    assert.ok(p.chamadasFetch().some((u) => u.includes("lances-flash?edicaoId=R-1")), "o Provider não pediu os lances-flash");
    assert.equal(p.valor().lances.length, 2, "os lances locais não entraram no estado do Provider");
    // Sem oficial → a reserva LOCAL (comportamento anterior, zero regressões).
    assert.match(p.html(), new RegExp(`data-vencedor="${OUTRO}\\|100"`), "sem oficial devia expor o vencedor LOCAL");
  });

  test("com resultado OFICIAL: a página lê EU/300 do contexto, e não o local OUTRO/100", async (t) => {
    const p = await a.montarProvider({ children: leitor(), lancesFlash: LOCAIS, resultadoOficial: OFICIAL });
    t.after(() => p.desmontar());
    assert.equal(p.valor().lances.length, 2, "controlo: os lances locais têm de estar lá (pré-condição do M12)");
    assert.deepEqual({ ...p.valor().vencedor }, { endereco: EU, valor: 300 }, "o Provider não expôs o OFICIAL");
    const html = p.html();
    assert.match(html, new RegExp(`data-vencedor="${EU}\\|300"`), "a página não recebeu o OFICIAL pelo contexto");
    assert.doesNotMatch(html, new RegExp(OUTRO), "a página recebeu o vencedor LOCAL");
    assert.ok(p.edicoesPedidas().every((e) => e === "R-1") && p.edicoesPedidas().length > 0,
      "o Provider não pediu o resultado oficial da edição ACTIVA");
    // Validador ⚠️1: o hook REAL do resultado oficial começa em `null` — no 1.º render ainda não há
    // oficial nem lances. O oficial tem de chegar DEPOIS (efeito assíncrono). Um Provider que
    // congelasse o 1.º render (`useRef`, `useMemo` com deps velhas) fica aqui.
    assert.equal(p.valorInicial().vencedor, null, "controlo: no 1.º render ainda não devia haver vencedor");
    assertSemErros(p);
  });

  // Validador ⚠️2/ℹ️3: a modalidade `programado` (lances on-chain via `LanceDado`) e uma fixture com
  // repetidos e o menor único LOCAL abaixo de 50 centavos.
  for (const [nome, oficial, esperado] of [
    ["sem oficial → a reserva LOCAL dos lances on-chain", null, `${OUTRO}|30`],
    ["com oficial → o OFICIAL, mesmo em programado", OFICIAL, `${EU}|300`],
  ]) {
    test(`programado: ${nome}`, async (t) => {
      const p = await a.montarProvider({ children: leitor(), lancesFlash: [], resultadoOficial: oficial });
      t.after(() => p.desmontar());
      p.valor().setModalidade("programado");
      await p.assentar();
      assert.equal(p.valor().modalidade, "programado", "controlo: a modalidade não mudou");
      const ON = [
        { endereco: EU,    valor: 300, repetido: false, txHash: "0x01" },
        { endereco: OUTRO, valor: 30,  repetido: false, txHash: "0x02" }, // o menor único local
        { endereco: EU,    valor: 20,  repetido: false, txHash: "0x03" }, // 20 repete-se ⇒ não é único
        { endereco: OUTRO, valor: 20,  repetido: false, txHash: "0x04" },
      ];
      for (const l of ON) assert.equal(await p.emitirLanceDado(l), 1, "controlo: o Provider não subscreveu o LanceDado");
      assert.equal(p.valor().lances.length, 4, "controlo: os 4 lances on-chain não entraram");
      assert.match(p.html(), new RegExp(`data-vencedor="${esperado.replace("|", "\\|")}"`), `esperava ${esperado}`);
      assertSemErros(p);
    });
  }
});

/** Validador ℹ️: os avisos capturados eram ignorados — um erro novo do Provider passaria em silêncio. */
function assertSemErros(p) {
  const maus = p.avisos().filter((x) => /TypeError|ReferenceError|RangeError|Warning: |Uncaught|unhandled/i.test(x));
  assert.deepEqual(maus, [], "o Provider registou erros durante a montagem");
}

describe("UTAC000.15 · AppContext → MercadoLances: o overlay do fim abre e mostra o OFICIAL (leilão aberto)", () => {
  let a = null;
  before(async () => { a = await criarArnes({ leilaoAberto: true }); });
  after(async () => { if (a) await a.fechar(); });

  async function paginaNoFim(resultadoOficial) {
    const Pagina = (await a.carregar("/src/pages/MercadoLances.jsx")).default;
    const agora = Math.floor(Date.now() / 1000);
    const p = await a.montarProvider({
      children: a.React.createElement(a.MemoryRouter, null, a.React.createElement(Pagina)),
      lancesFlash: LOCAIS,
      resultadoOficial,
      // UTAC000.17bc (DEBT-016/GATE 23) — o fim vem do PRAZO REAL DO SERVIDOR: o arnês serve
      // `/edicoes` com uma R-1 real vencida há 5 s. O prazo LOCAL vencido fica no localStorage DE
      // PROPÓSITO: já não é ele que decide (era exactamente o defeito da DEBT-016).
      edicoes: edicaoR1Real(agora, { vencidoSeg: 5 }),
      localStorage: { gut_prazo_flash: String(agora - 5) },
    });
    await esperarFimDoRelampago(p);
    return p;
  }

  test("o Provider real abre o overlay (showOverlay) e a página mostra o vencedor OFICIAL", async (t) => {
    const p = await paginaNoFim(OFICIAL);
    t.after(() => p.desmontar());
    assert.equal(p.valor().encerrado, true, "controlo: o tick real não encerrou a edição");
    assert.equal(p.valor().showOverlay, true, "o Provider real não abriu o overlay com o leilão aberto");
    const html = p.html();
    const i = html.indexOf("Carteira Vencedora");
    assert.ok(i >= 0, "o OverlayVencedor não foi renderizado pela página");
    const bloco = html.slice(i, i + 1500);
    assert.ok(bloco.includes(abrev(EU)) && bloco.includes("R$ 3.00"), "o overlay não mostra o vencedor OFICIAL");
    assert.ok(!bloco.includes(abrev(OUTRO)) && !bloco.includes("R$ 1.00"), "o overlay mostra o vencedor LOCAL");
    assert.equal(contar(html, "Carteira Vencedora"), 1, "esperava UM overlay do vencedor");
  });

  // UTAC000.17bc (17c / ressalva E do validador adversarial): «a secção agregada e o botão FECHAR não
  // têm teste». Aqui prova-se o que o arnês PODE provar, e o resto fica declarado (em vez de um teste
  // que finge cobrir):
  //   ✔ o botão FECHAR (a saída explícita) é renderizado pela página real com o overlay aberto;
  //   ✔ SEM participações a secção agregada NÃO aparece (o comportamento desenhado: sem token o hook
  //     nem chama o endpoint — medido com sonda própria: neste arnês o `authToken` é null, visitante);
  //   ⚠️ LIMITE MEDIDO: o CONTEÚDO da secção (linhas + «🏆 VENCEU») não é renderizável neste arnês —
  //     exigiria efeitos + sessão autenticada, e a hidratação do token (sessionStorage) não está
  //     ligada no condutor do arnês (o `globalThis.sessionStorage` nem existe no contexto SSR).
  //     Fica coberto por contrato em `src/components/__tests__/utac0017bc-overlay-agregado.test.mjs`.
  test("o overlay aberto renderiza o botão FECHAR e NÃO mostra a secção agregada sem participações", async (t) => {
    const Pagina = (await a.carregar("/src/pages/MercadoLances.jsx")).default;
    const agora = Math.floor(Date.now() / 1000);
    const p = await a.montarProvider({
      children: a.React.createElement(a.MemoryRouter, null, a.React.createElement(Pagina)),
      lancesFlash: LOCAIS, resultadoOficial: OFICIAL,
      edicoes: edicaoR1Real(agora, { vencidoSeg: 5 }),
    });
    t.after(() => p.desmontar());
    await esperarFimDoRelampago(p);
    const html = p.html();
    assert.ok(html.includes("Carteira Vencedora"), "controlo: o overlay não abriu");
    assert.ok(html.includes("FECHAR"), "o botão FECHAR (onClose) não foi renderizado");
    assert.ok(!html.includes("As suas participações"), "sem participações a secção não pode aparecer");
  });
});

describe("UTAC000.15 · EM BREVE real: o mesmo fim NÃO abre o overlay (runtime do gate do UTAC000.14)", () => {
  let a = null;
  before(async () => { a = await criarArnes(); });
  after(async () => { if (a) await a.fechar(); });

  test("prazo vencido + EM_BREVE_MODE real (true): encerra, mas showOverlay fica false e não há overlay", async (t) => {
    const Pagina = (await a.carregar("/src/pages/MercadoLances.jsx")).default;
    const agora = Math.floor(Date.now() / 1000);
    const p = await a.montarProvider({
      children: a.React.createElement(a.MemoryRouter, null, a.React.createElement(Pagina)),
      lancesFlash: LOCAIS, resultadoOficial: OFICIAL,
      edicoes: edicaoR1Real(agora, { vencidoSeg: 5 }), // prazo REAL vencido (UTAC000.17bc)
      localStorage: { gut_prazo_flash: String(agora - 5) },
    });
    t.after(() => p.desmontar());
    await esperarFimDoRelampago(p);
    assert.equal(p.valor().encerrado, true, "controlo: o tick real não encerrou a edição");
    assert.equal(p.valor().showOverlay, false, "o overlay abriu em EM BREVE");
    assert.ok(!p.html().includes("Carteira Vencedora"), "o OverlayVencedor foi renderizado em EM BREVE");
  });

  // UTAC000.17bc (DEBT-016/GATE 26), em RUNTIME pela travessia servidor → AppContext → página: uma
  // edição cujo prazo é INVENTADO (`sintetizada: true`) NÃO pode encerrar o leilão — mesmo com o prazo
  // LOCAL vencido no localStorage (que era o que fazia abrir o overlay «a cada 30 min»).
  test("DEBT-016: edição SINTÉTICA com prazo vencido NÃO encerra nem abre o overlay (prazo inventado)", async (t) => {
    const Pagina = (await a.carregar("/src/pages/MercadoLances.jsx")).default;
    const agora = Math.floor(Date.now() / 1000);
    const p = await a.montarProvider({
      children: a.React.createElement(a.MemoryRouter, null, a.React.createElement(Pagina)),
      lancesFlash: LOCAIS, resultadoOficial: OFICIAL,
      edicoes: edicaoR1Real(agora, { vencidoSeg: 5, sintetizada: true }),
      localStorage: { gut_prazo_flash: String(agora - 5) },
    });
    t.after(() => p.desmontar());
    await new Promise((r) => setTimeout(r, 1600)); // mais do que os 1200 ms do fim
    await p.assentar();
    assert.equal(p.valor().encerrado, false, "tratou um prazo INVENTADO como prazo real");
    assert.equal(p.valor().showOverlay, false, "o overlay abriu com prazo inventado (DEBT-016)");
    assert.ok(!p.html().includes("Carteira Vencedora"), "o overlay foi renderizado com prazo inventado");
  });
});
