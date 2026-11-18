// UTAC138 (Frente D) — painel de resultados da edição especial: vencedor + Top 10 dos menores lances únicos,
// lidos da apuração instantânea do backend (`GET resultado-edicao`). Renderização REAL (arnês _render.mjs).
//
// Corre com: node --test src/components/edicao-especial/__tests__/utac138-top10.test.mjs (de desafio-gut/frontend).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { carregar, render, texto, fechar } from "../../meus-ativos/__tests__/_render.mjs";
import { escolherEspecial, estadoEspecial, RETENCAO_APOS_FIM_MS } from "../_estilo-especial.js";

const D = "/src/components/edicao-especial";
let Painel, Top10;
before(async () => {
  Painel = await carregar(`${D}/PainelVencedorEspecial.jsx`);
  Top10 = await carregar(`${D}/ResultadosEdicao.jsx`);
});
after(fechar);

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const linha = (posicao, valorCentavos, extra = {}) => ({ posicao, valorCentavos, endereco: `0x${String(posicao).padStart(4, "0")}…abcd`, nome: null, ...extra });
const TOP = Object.freeze(Array.from({ length: 10 }, (_, i) => linha(i + 1, (i + 1) * 7)));
const APURACAO = Object.freeze({
  pronto: true, vencedor: linha(1, 7, { nome: "Ana" }), top10: [linha(1, 7, { nome: "Ana" }), ...TOP.slice(1)],
  totalLances: 23, participantes: 17,
});
const posicoes = (html) => [...html.matchAll(/data-posicao="(\d+)"/g)].map((m) => Number(m[1]));

describe("UTAC138 · ResultadosEdicao (Top 10)", () => {
  test("desenha as 10 linhas pela ordem, com o valor em R$ e 🏆 no 1.º", () => {
    const html = render(Top10, { top10: TOP });
    assert.deepEqual(posicoes(html), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const t = texto(html);
    assert.match(t, /R\$ 0,07/);
    assert.match(t, /R\$ 0,70/);
    assert.match(t, /🏆/);
    assert.match(t, /Top 10 — menores lances únicos/);
  });
  test("nunca mais de 10 linhas; linhas inválidas (sem valor/posição) caem fora", () => {
    const html = render(Top10, { top10: [...TOP, linha(11, 99), { posicao: 2 }, { valorCentavos: 3 }, null] });
    assert.equal(posicoes(html).length, 10);
  });
  test("lista vazia / ausente ⇒ não desenha nada", () => {
    assert.equal(render(Top10, { top10: [] }), "");
    assert.equal(render(Top10, {}), "");
  });
  test("mostra o nome do lance ou o endereço ENCURTADO que o servidor devolve", () => {
    const t = texto(render(Top10, { top10: [linha(1, 5, { nome: "Bia" }), linha(2, 9)] }));
    assert.match(t, /Bia/);
    assert.match(t, /0x0002…abcd/);
  });
});

describe("UTAC138 · PainelVencedorEspecial com a apuração instantânea", () => {
  test("SEM consolidação on-chain mas COM apuração ⇒ vencedor e Top 10 já (não «apuração em curso»)", () => {
    const html = render(Painel, { resultado: { consolidado: false }, metricas: { totalLances: 0, participantes: 0 }, apuracao: APURACAO });
    assert.match(html, /data-estado="vencedor"/);
    const t = texto(html);
    assert.match(t, /Vencedor: Ana/);
    assert.match(t, /Menor lance único: R\$ 0,07/);
    assert.match(t, /23 lances/, "as métricas vêm da apuração (todos os lances), não do lances-flash");
    assert.equal(posicoes(html).length, 10);
    assert.doesNotMatch(t, /Apuração em curso/);
  });
  test("COM consolidação on-chain ⇒ o vencedor é o on-chain (autoritativo) e o Top 10 vem da apuração", () => {
    const html = render(Painel, { resultado: { consolidado: true, vencedor: A, menorUnicoCentavos: 7 }, apuracao: APURACAO, nomeVencedor: "Ana" });
    assert.match(html, /data-estado="vencedor"/);
    assert.match(texto(html), /Vencedor: Ana/);
    assert.equal(posicoes(html).length, 10);
  });
  // UTAC138-SEG4 — on-chain e apuração divergentes (consolidação no 1.º tick deixou de fora um lance em voo):
  // o vencedor é o on-chain e o Top 10 (cujo 🏆 seria outro) não se mostra.
  test("COM consolidação on-chain DIVERGENTE da apuração ⇒ vencedor on-chain, sem o Top 10 contraditório", () => {
    const html = render(Painel, { resultado: { consolidado: true, vencedor: A, menorUnicoCentavos: 9 }, apuracao: APURACAO, nomeVencedor: "Ana" });
    assert.match(html, /data-estado="vencedor"/);
    assert.match(texto(html), /R\$ 0,09/);
    assert.equal(posicoes(html).length, 0, "um Top 10 com outro 🏆 não pode aparecer");
  });
  test("apuração sem lance único ⇒ «Não houve lance único», sem Top 10", () => {
    const html = render(Painel, { resultado: { consolidado: false }, apuracao: { pronto: true, vencedor: null, top10: [], totalLances: 4, participantes: 2 } });
    assert.match(html, /data-estado="sem-vencedor"/);
    assert.equal(posicoes(html).length, 0);
  });
  test("apuração ainda não pronta ⇒ comportamento anterior («apuração em curso»)", () => {
    const html = render(Painel, { resultado: { consolidado: false }, metricas: { totalLances: 3, participantes: 2 }, apuracao: { pronto: false, motivo: "a_apurar" } });
    assert.match(html, /data-estado="apuracao"/);
  });
  test("erro na leitura on-chain NÃO esconde a apuração pronta", () => {
    const html = render(Painel, { erro: "rpc caiu", apuracao: APURACAO });
    assert.match(html, /data-estado="vencedor"/);
  });
});

describe("UTAC138 · janela de 24 h (a regra do enunciado: termino < agora < termino + 24 h)", () => {
  const ESP = { id: "ESPECIAL-RELAMPAGO1", inicio_em: "2026-11-30T22:00:00.000Z", termino_em: "2026-11-30T23:00:00.000Z", status: "aberto" };
  const FIM = Date.parse(ESP.termino_em);
  test("às 20:00:00.001 BRT a especial está ENCERRADA (painel de resultados) e mostra-se", () => {
    assert.equal(estadoEspecial(ESP, FIM + 1), "encerrada");
    assert.equal(escolherEspecial({ [ESP.id]: ESP }, {}, FIM + 1)?.id, ESP.id);
  });
  test("24 h depois do fim ainda se mostra; 24 h + 1 ms já não", () => {
    assert.equal(RETENCAO_APOS_FIM_MS, 24 * 60 * 60 * 1000);
    assert.equal(escolherEspecial({ [ESP.id]: ESP }, {}, FIM + RETENCAO_APOS_FIM_MS)?.id, ESP.id);
    assert.equal(escolherEspecial({ [ESP.id]: ESP }, {}, FIM + RETENCAO_APOS_FIM_MS + 1), null);
  });
  test("às 19:59:59 BRT ainda está ACTIVA (sem painel de resultados)", () => {
    assert.equal(estadoEspecial(ESP, FIM - 1000), "activa");
  });
});
