// especial.test.mjs — MC94.2. Lógica pura + renderização REAL dos componentes
// da edição especial.
//
// Corre com:  node --test src/components/edicao-especial/__tests__/especial.test.mjs
// (a partir de desafio-gut/frontend). Arnês: ../../meus-ativos/__tests__/_render.mjs.
//
// Horários e fronteiras fixam-se em LITERAL (lição do MC93-A). E NENHUM teste lê
// o relógio real: a hora entra sempre por argumento — um teste com data fixa e
// `Date.now()` caduca no dia do evento (achado da validação do MC94.1).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { carregar, render, texto, fechar } from "../../meus-ativos/__tests__/_render.mjs";
import {
  ESTADO_ESPECIAL, estadoEspecial, alvoDaContagem, decompor, formatarContagem,
  escolherEspecial, metricasDeLances, nomeDoVencedor, ehEspecial,
} from "../_estilo-especial.js";
import { calcularOffset } from "../../../hooks/useEdicoes.js";

const INICIO  = Date.parse("2026-10-04T23:00:00.000Z");
const TERMINO = Date.parse("2026-10-04T23:30:00.000Z");
const AIRFRYER = Object.freeze({
  id: "ESPECIAL-AIRFRYER", tipo: "programado", produto: "Air Fryer",
  inicio_em: "2026-10-04T23:00:00.000Z", termino_em: "2026-10-04T23:30:00.000Z",
  status: "agendado", imagem_url: "/artes/edicao-especial-airfryer.jpg",
});
const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ZERO = "0x0000000000000000000000000000000000000000";

// ───────────────────────────────────────────────────────────────────────────
describe("MC94.2 · os quatro estados (HARD GATE 4)", () => {
  test("agendada até 60 s antes das 20:00", () => {
    assert.equal(estadoEspecial(AIRFRYER, Date.parse("2026-09-25T12:00:00Z")), "agendada");
    assert.equal(estadoEspecial(AIRFRYER, INICIO - 60_001), "agendada");
  });
  test("a_abrir nos últimos 60 s (inclusive os 60 s em ponto)", () => {
    assert.equal(estadoEspecial(AIRFRYER, INICIO - 60_000), "a_abrir");
    assert.equal(estadoEspecial(AIRFRYER, INICIO - 1), "a_abrir");
  });
  test("activa das 20:00 às 20:30, inclusive nas duas pontas", () => {
    assert.equal(estadoEspecial(AIRFRYER, INICIO), "activa");
    assert.equal(estadoEspecial({ ...AIRFRYER, status: "aberto" }, INICIO + 900_000), "activa");
    assert.equal(estadoEspecial(AIRFRYER, TERMINO), "activa");
  });
  test("encerrada depois das 20:30", () => {
    assert.equal(estadoEspecial(AIRFRYER, TERMINO + 1), "encerrada");
  });
  test("encerrada se o admin a encerrou, mesmo dentro da janela", () => {
    assert.equal(estadoEspecial({ ...AIRFRYER, status: "encerrado" }, INICIO + 60_000), "encerrada");
    assert.equal(estadoEspecial({ ...AIRFRYER, status: "apurado" }, INICIO - 3_600_000), "encerrada");
  });
  test("sem datas legíveis não há estado (não se inventa um)", () => {
    assert.equal(estadoEspecial(null, INICIO), null);
    assert.equal(estadoEspecial({ ...AIRFRYER, inicio_em: "lixo" }, INICIO), null);
    assert.equal(estadoEspecial({ ...AIRFRYER, termino_em: undefined }, INICIO), null);
    assert.equal(estadoEspecial(AIRFRYER, NaN), null);
  });
  test("os valores dos estados são os do enunciado", () => {
    assert.deepEqual({ ...ESTADO_ESPECIAL },
      { AGENDADA: "agendada", A_ABRIR: "a_abrir", ACTIVA: "activa", ENCERRADA: "encerrada" });
  });
  test("a contagem aponta para as 20:00 antes de abrir e para as 20:30 depois", () => {
    assert.equal(alvoDaContagem(AIRFRYER, "agendada"), INICIO);
    assert.equal(alvoDaContagem(AIRFRYER, "a_abrir"), INICIO);
    assert.equal(alvoDaContagem(AIRFRYER, "activa"), TERMINO);
    assert.equal(alvoDaContagem(AIRFRYER, "encerrada"), null);
  });
});

describe("MC94.2 · formato do cronómetro", () => {
  test("dias, horas, minutos e segundos", () => {
    const ms = ((9 * 24 + 10) * 3600 + 49 * 60 + 33) * 1000;
    assert.deepEqual(decompor(ms), { dias: 9, horas: 10, minutos: 49, segundos: 33 });
    assert.equal(formatarContagem(ms), "9d 10:49:33");
  });
  test("menos de um dia não mostra dias; arredonda para CIMA (nunca 00:00:00 antes da hora)", () => {
    assert.equal(formatarContagem(3_725_000), "01:02:05");
    assert.equal(formatarContagem(400), "00:00:01");
    assert.equal(formatarContagem(0), "00:00:00");
  });
  test("negativo vira zero; não-finito não é contagem", () => {
    assert.deepEqual(decompor(-5_000), { dias: 0, horas: 0, minutos: 0, segundos: 0 });
    assert.equal(decompor(null), null);
    assert.equal(decompor(Infinity), null);
    assert.equal(formatarContagem(undefined), "…");
  });
});

describe("MC94.2 · relógio do servidor (HARD GATE 3)", () => {
  test("offset = hora do servidor − meio do pedido", () => {
    // Pedido saiu às t0 e voltou às t1 (relógio do aparelho, 5 min atrasado).
    const t0 = Date.parse("2026-09-25T12:55:00.000Z");
    const t1 = t0 + 400;
    const servidor = "2026-09-25T13:00:00.200Z"; // carimbado a meio do pedido
    assert.equal(calcularOffset(servidor, t0, t1), 300_000);
  });
  test("dois aparelhos com relógios diferentes vêem o MESMO tempo restante", () => {
    const servidor = Date.parse("2026-10-04T22:00:00.000Z");
    const restante = (relogioAparelho) => {
      const off = calcularOffset(new Date(servidor).toISOString(), relogioAparelho, relogioAparelho);
      return INICIO - (relogioAparelho + off);
    };
    const manaus    = restante(servidor - 3_600_000 * 7); // relógio mal acertado
    const saoPaulo  = restante(servidor + 123_456);
    assert.equal(manaus, 3_600_000);
    assert.equal(saoPaulo, 3_600_000);
  });
  test("sem `agora` legível não há offset (null, nunca 0)", () => {
    assert.equal(calcularOffset(undefined, 1, 2), null);
    assert.equal(calcularOffset("lixo", 1, 2), null);
    assert.equal(calcularOffset("2026-09-25T13:00:00Z", NaN, 2), null);
  });
});

describe("MC94.2 · escolher a especial entre os mapas", () => {
  const agora = Date.parse("2026-09-25T13:00:00Z");
  test("antes da hora vem de `agendadas`; depois, de `edicoes`", () => {
    assert.equal(escolherEspecial({ "R-1": { id: "R-1" } }, { "ESPECIAL-AIRFRYER": AIRFRYER }, agora)?.id,
      "ESPECIAL-AIRFRYER");
    assert.equal(escolherEspecial({ "ESPECIAL-AIRFRYER": { ...AIRFRYER, status: "aberto" } }, {}, INICIO)?.id,
      "ESPECIAL-AIRFRYER");
  });
  test("ignora o que não é ESPECIAL-* e o que não tem datas", () => {
    assert.equal(escolherEspecial({ "PROG-1": { ...AIRFRYER, id: "PROG-1" } }, {}, agora), null);
    assert.equal(escolherEspecial({}, { "ESPECIAL-X": { ...AIRFRYER, id: "ESPECIAL-X", inicio_em: null } }, agora), null);
    assert.equal(escolherEspecial(undefined, undefined, agora), null);
  });
  test("com várias, mostra a próxima por acabar, não uma já encerrada", () => {
    const velha = { ...AIRFRYER, id: "ESPECIAL-VELHA", inicio_em: "2026-01-01T00:00:00Z", termino_em: "2026-01-01T00:30:00Z" };
    assert.equal(escolherEspecial({ "ESPECIAL-VELHA": velha }, { "ESPECIAL-AIRFRYER": AIRFRYER }, agora)?.id,
      "ESPECIAL-AIRFRYER");
  });
  test("ehEspecial: prefixo, não 'contém'", () => {
    assert.ok(ehEspecial("ESPECIAL-AIRFRYER"));
    assert.ok(!ehEspecial("PROG-ESPECIAL-1"));
    assert.ok(!ehEspecial(undefined));
  });
});

describe("MC94.2 · métricas e vencedor", () => {
  const lista = [
    { endereco: A, nomeExibicao: "Maria" },
    { endereco: A.toUpperCase().replace("0X", "0x"), nomeExibicao: "Maria" },
    { endereco: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", nomeExibicao: null },
  ];
  test("conta lances e participantes distintos (endereço sem caixa)", () => {
    assert.deepEqual(metricasDeLances(lista), { totalLances: 3, participantes: 2 });
    assert.deepEqual(metricasDeLances([]), { totalLances: 0, participantes: 0 });
    assert.equal(metricasDeLances(null), null);
  });
  test("o nome do vencedor vem do lance dele; sem nome → null", () => {
    assert.equal(nomeDoVencedor(lista, A.toUpperCase().replace("0X", "0x")), "Maria");
    assert.equal(nomeDoVencedor(lista, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), null);
    assert.equal(nomeDoVencedor(null, A), null);
  });
});

// ───────────────────────────────────────────────────────────────────────────
const D = "/src/components/edicao-especial";
let Card, Contagem, Painel;
before(async () => {
  Card     = await carregar(`${D}/CardEdicaoEspecial.jsx`);
  Contagem = await carregar(`${D}/ContagemDecrescente.jsx`);
  Painel   = await carregar(`${D}/PainelVencedorEspecial.jsx`);
});
after(fechar);

describe("MC94.2 · ContagemDecrescente", () => {
  test("mostra dias, horas, minutos e segundos com rótulo", () => {
    const ms = ((9 * 24 + 10) * 3600 + 49 * 60 + 33) * 1000;
    const html = render(Contagem, { restanteMs: ms });
    const t = texto(html);
    for (const par of ["09 dias", "10 horas", "49 min", "33 seg"]) assert.match(t, new RegExp(par), par);
    assert.match(html, /role="timer"/);
    assert.match(html, /data-estado="a-contar"/);
  });
  test("sem relógio do servidor ainda: '…', nunca um número inventado", () => {
    const html = render(Contagem, { restanteMs: null });
    assert.match(html, /data-estado="sincronizando"/);
    assert.doesNotMatch(texto(html), /\d/);
  });
});

describe("MC94.2 · PainelVencedorEspecial (D4)", () => {
  const base = { metricas: { totalLances: 12, participantes: 5 } };
  test("consolidado: vencedor (nome), menor único em R$, lances e participantes", () => {
    const t = texto(render(Painel, { ...base,
      resultado: { consolidado: true, vencedor: A, menorUnicoCentavos: 137 }, nomeVencedor: "Maria" }));
    assert.match(t, /Edição encerrada/);
    assert.match(t, /Vencedor: Maria/);
    assert.match(t, /R\$ 1,37/);
    assert.match(t, /12 lances/);
    assert.match(t, /5 participantes/);
  });
  test("sem nome: endereço ENCURTADO, nunca inteiro (R4)", () => {
    const html = render(Painel, { ...base, resultado: { consolidado: true, vencedor: A, menorUnicoCentavos: 5 } });
    assert.match(texto(html), /0xaaaa…aaaa/);
    assert.doesNotMatch(html, new RegExp(A));
  });
  test("ainda não consolidado: 'apuração em curso', sem vencedor", () => {
    const html = render(Painel, { ...base, resultado: { consolidado: false } });
    assert.match(html, /data-estado="apuracao"/);
    assert.doesNotMatch(texto(html), /Vencedor:/);
  });
  test("zero lances: diz que não houve lances", () => {
    const html = render(Painel, { metricas: { totalLances: 0, participantes: 0 }, resultado: { consolidado: false } });
    assert.match(html, /data-estado="sem-lances"/);
  });
  test("consolidado com vencedor zero: sem lance único vencedor", () => {
    const html = render(Painel, { ...base, resultado: { consolidado: true, vencedor: ZERO, menorUnicoCentavos: 0 } });
    assert.match(html, /data-estado="sem-vencedor"/);
    assert.doesNotMatch(texto(html), /Vencedor:/);
  });
  test("consolidado com métricas a ZERO (lances-flash falhou com 200): o vencedor on-chain manda", () => {
    const html = render(Painel, {
      metricas: { totalLances: 0, participantes: 0 },
      resultado: { consolidado: true, vencedor: A, menorUnicoCentavos: 42 }, nomeVencedor: null,
    });
    assert.match(html, /data-estado="vencedor"/);
    assert.doesNotMatch(texto(html), /Nenhum lance/);
  });
  test("a carregar e erro são estados próprios", () => {
    assert.match(render(Painel, { carregando: true }), /data-estado="carregando"/);
    const erro = render(Painel, { erro: "falhou", ...base });
    assert.match(erro, /data-estado="erro"/);
    assert.doesNotMatch(texto(erro), /Vencedor:/);
  });
});

describe("MC94.2 · CardEdicaoEspecial — os quatro estados no ecrã", () => {
  const lanceChamado = [];
  const renderLance = (p) => { lanceChamado.push(p); return "[FORMULARIO-DE-LANCE]"; };
  const props = (agoraMs, extra = {}) => ({ edicao: AIRFRYER, offsetMs: 0, agoraMs, renderLance, ...extra });

  test("agendada: arte com alt, prémio, cronómetro para as 20:00, sem formulário", () => {
    lanceChamado.length = 0;
    const html = render(Card, props(INICIO - 3_600_000 * 24 - 1000));
    assert.match(html, /data-estado="agendada"/);
    assert.match(html, /src="\/artes\/edicao-especial-airfryer\.jpg"/);
    assert.match(html, /alt="[^"]*Air Fryer[^"]*"/);
    assert.match(texto(html), /01 dias.*00 horas.*00 min.*01 seg/);
    assert.match(texto(html), /20:00/, "a hora de Brasília aparece");
    assert.equal(lanceChamado.length, 0);
    assert.doesNotMatch(html, /FORMULARIO-DE-LANCE/);
  });
  test("a hora mostrada é a de Brasília, qualquer que seja o fuso do aparelho", () => {
    assert.match(texto(render(Card, props(INICIO - 3_600_000))), /04\/10.*20:00.*20:30/);
  });
  test("a_abrir: aviso de abertura + contagem, ainda sem formulário", () => {
    const html = render(Card, props(INICIO - 30_000));
    assert.match(html, /data-estado="a_abrir"/);
    assert.match(texto(html), /Abrindo/);
    assert.match(texto(html), /30 seg/);
    assert.doesNotMatch(html, /FORMULARIO-DE-LANCE/);
  });
  test("activa: o formulário de lance é o DESTA edição, pago em senha", () => {
    lanceChamado.length = 0;
    const html = render(Card, props(INICIO + 60_000));
    assert.match(html, /data-estado="activa"/);
    assert.match(html, /FORMULARIO-DE-LANCE/);
    assert.deepEqual(lanceChamado.at(-1), { idEdicao: "ESPECIAL-AIRFRYER", tipoLeilao: "programado", encerrado: false });
    assert.match(texto(html), /29 min/, "conta até às 20:30");
  });
  test("encerrada: painel do vencedor, sem formulário nem cronómetro", () => {
    const html = render(Card, props(TERMINO + 1, {
      resultadoEspecial: { resultado: { consolidado: true, vencedor: A, menorUnicoCentavos: 42 },
        metricas: { totalLances: 3, participantes: 2 }, nomeVencedor: "Maria" },
    }));
    assert.match(html, /data-estado="encerrada"/);
    assert.match(texto(html), /Vencedor: Maria/);
    assert.doesNotMatch(html, /FORMULARIO-DE-LANCE/);
    assert.doesNotMatch(html, /role="timer"/);
  });
  test("o cronómetro usa o offset do servidor, não o relógio do aparelho", () => {
    // Aparelho 2 h adiantado: sem offset, a especial pareceria já aberta.
    const aparelho = INICIO + 3_600_000;
    const html = render(Card, props(aparelho, { offsetMs: -2 * 3_600_000 }));
    assert.match(html, /data-estado="agendada"/);
    assert.match(texto(html), /01 horas/);
  });
  test("sem offset: o formulário NÃO abre por um relógio de aparelho adiantado", () => {
    lanceChamado.length = 0;
    const html = render(Card, props(INICIO + 60_000, { offsetMs: null }));
    assert.doesNotMatch(html, /FORMULARIO-DE-LANCE/);
    assert.equal(lanceChamado.length, 0);
    assert.match(html, /data-estado="sincronizando"/);
  });
  test("sem offset ainda: '…' em vez de uma contagem pelo relógio do aparelho", () => {
    const html = render(Card, props(INICIO - 3_600_000, { offsetMs: null }));
    assert.match(html, /data-estado="sincronizando"/);
  });
  test("edição sem datas legíveis: não renderiza nada", () => {
    assert.equal(render(Card, props(INICIO, { edicao: { ...AIRFRYER, inicio_em: null } })), "");
  });
});
