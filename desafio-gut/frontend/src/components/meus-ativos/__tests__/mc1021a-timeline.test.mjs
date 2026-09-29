// MC102.1a — timeline do rastreio, RENDERIZADA (Frente C): o componente sozinho e ligado no cartão do pedido.
// node --test src/components/meus-ativos/__tests__/mc1021a-timeline.test.mjs   (a partir de desafio-gut/frontend)

// O processo corre em UTC de propósito: a data tem de sair em hora de Brasília venha o fuso da máquina que vier
// (numa máquina já em America/Sao_Paulo, tirar o timeZone do componente passava despercebido — validador, C1).
process.env.TZ = "UTC";

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { carregar, render, texto, fechar } from "./_render.mjs";
import { construirTimeline } from "../../../lib/rastreio.js";

const DONO = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EVENTOS = [
  { data: "2026-09-20T15:00:00.000Z", codigo: "0", local: "Rua Secreta, 99", descricao: "Postado por Maria Silva" },
  { data: "2026-09-21T15:00:00.000Z", codigo: "1", local: "Manaus/AM", descricao: "Em trânsito" },
];
const RASTREIO = { codigo: "AA123456789BR", transportadora: "Correios", enviado_em: "2026-09-20T12:00:00.000Z" };
const PEDIDO = {
  produtoId: "11111111-2222-3333-4444-555555555555", edicaoId: "RELAMP-1", comprador: DONO,
  produtoNome: "Air Fryer", valorPagoCentavos: 137,
  morada: { nome: "Maria", cpf: "12345678909", logradouro: "Rua A", numero: "1", bairro: "B", cidade: "Manaus", uf: "AM", cep: "69027010" },
  rastreio: { ...RASTREIO, eventos: EVENTOS },
};

let Timeline, Cartao;
before(async () => {
  Timeline = await carregar("/src/components/meus-ativos/TimelineRastreio.jsx");
  Cartao = await carregar("/src/components/meus-ativos/__tests__/_cartao-pedido.jsx");
});
after(fechar);

const passos = (html) => [...html.matchAll(/<li[^>]*data-passo="([^"]+)"[^>]*data-feito="(true|false)"/g)].map((m) => [m[1], m[2]]);
const blocoTimeline = (html) => (html.match(/<div data-rastreio="timeline"[\s\S]*?<\/ol><\/div>/) || [""])[0];
const cartao = (pedido) => render(Cartao, { pedido, endereco: DONO, authToken: "tok", isMobile: false, aoGravar() {} });

test("renderiza os 5 passos, por ordem, com os rótulos", () => {
  const html = render(Timeline, construirTimeline(EVENTOS));
  assert.deepEqual(passos(html).map(([c]) => c), ["0", "1", "2", "3", "4"]);
  assert.match(texto(html), /Postado.*A caminho.*Na cidade de destino.*Saiu para entrega.*Entregue/);
});

test("5 passos mesmo sem evento nenhum — todos pendentes", () => {
  const html = render(Timeline, construirTimeline([]));
  assert.deepEqual(passos(html), [["0", "false"], ["1", "false"], ["2", "false"], ["3", "false"], ["4", "false"]]);
});

test("passo feito vs pendente: marcador e estado", () => {
  const html = render(Timeline, construirTimeline(EVENTOS));
  assert.deepEqual(passos(html).map(([, f]) => f), ["true", "true", "false", "false", "false"]);
  assert.equal((html.match(/●/g) || []).length, 2);
  assert.equal((html.match(/○/g) || []).length, 3);
  assert.match(html, /aria-label="Postado: concluído"/);
  assert.match(html, /aria-label="Entregue: pendente"/);
  assert.match(texto(html), /20\/09/, "a data do passo feito aparece (hora de Brasília)");
});

test("com alertas → banner(s) com role=status; sem alertas → nenhum banner", () => {
  const com = render(Timeline, construirTimeline([...EVENTOS, { data: "2026-09-23T15:00:00.000Z", codigo: "A1" }]));
  assert.equal((com.match(/role="status"/g) || []).length, 1);
  assert.match(com, /data-alerta="A1"/);
  assert.match(texto(com), /Tentativa de entrega sem sucesso · 23\/09/);
  assert.equal(passos(com).length, 5, "o alerta não tira nem acrescenta passos");
  const sem = render(Timeline, construirTimeline(EVENTOS));
  assert.doesNotMatch(sem, /role="status"|data-alerta/);
});

test("vários alertas → um banner por alerta, pela ordem recebida", () => {
  const html = render(Timeline, construirTimeline([{ codigo: "A1", data: "2026-09-23T15:00:00Z" }, { codigo: "A2", data: "2026-09-24T15:00:00Z" }]));
  assert.deepEqual([...html.matchAll(/data-alerta="([^"]+)"/g)].map((m) => m[1]), ["A1", "A2"]);
  assert.equal((html.match(/role="status"/g) || []).length, 2);
});

test("data em hora de Brasília, só dia/mês: 01:30Z do dia 24 é o dia 23 (com o processo em UTC)", () => {
  const html = render(Timeline, construirTimeline([{ codigo: "0", data: "2026-09-24T01:30:00Z" }]));
  assert.match(texto(html), /Postado 23\/09/);
  assert.doesNotMatch(texto(html), /24\/09|2026|:30/);
});

test("sem passos recebidos, o componente mostra os 5 passos pendentes (não só a lib garante os 5)", () => {
  assert.deepEqual(passos(render(Timeline, {})).map(([c, f]) => `${c}${f}`), ["0false", "1false", "2false", "3false", "4false"]);
});

test("isMobile: coluna no telemóvel, linha no desktop — e o cartão passa o isMobile", () => {
  const t = construirTimeline(EVENTOS);
  assert.match(render(Timeline, { ...t, isMobile: true }), /<ol[^>]*flex-direction:column/);
  assert.match(render(Timeline, { ...t, isMobile: false }), /<ol[^>]*flex-direction:row/);
  const noCartao = render(Cartao, { pedido: PEDIDO, endereco: DONO, authToken: "tok", isMobile: true, aoGravar() {} });
  assert.match(blocoTimeline(noCartao), /<ol[^>]*flex-direction:column/);
});

test("fallback → só o código em bruto: sem timeline, sem link, sem URL (P9)", () => {
  const html = render(Timeline, { fallback: { codigo: "AA123456789BR" } });
  assert.match(html, /data-rastreio="fallback"/);
  assert.match(texto(html), /Código de rastreio: AA123456789BR/);
  assert.doesNotMatch(html, /<ol|<li|<a\b|href=|https?:|www\./i);
});

test("a timeline não mostra local, descrição, nome nem CPF (P8)", () => {
  const html = render(Timeline, construirTimeline(EVENTOS));
  assert.doesNotMatch(html, /Rua Secreta|Maria Silva|Em trânsito|Manaus/);
});

// ── Ligação no cartão (o USO, não só o componente) ────────────────────────────────────────────
test("cartão: rastreio com eventos → a timeline aparece dentro do cartão, com 5 passos", () => {
  const html = cartao(PEDIDO);
  assert.match(html, /data-rastreio="timeline"/);
  assert.equal(passos(html).length, 5);
});

test("cartão: rastreio SEM eventos (a produção de hoje) → sem timeline; fica a linha do código em bruto", () => {
  const html = cartao({ ...PEDIDO, rastreio: RASTREIO });
  assert.doesNotMatch(html, /data-rastreio=/);
  assert.match(texto(html), /Correios: AA123456789BR/);
});

test("cartão: sem rastreio → sem timeline", () => {
  assert.doesNotMatch(cartao({ ...PEDIDO, rastreio: null }), /data-rastreio=/);
});

test("cartão: o «Recebi» e o estado continuam como estavam (HARD GATE 4)", () => {
  const html = cartao(PEDIDO);
  assert.match(html, /data-acao="recebi"/);
  assert.match(texto(html), /\bEnviado\b/);
  assert.match(texto(html), /Correios: AA123456789BR/, "a linha do código coexiste com a timeline (P2)");
});

test("cartão: o bloco da timeline não contém morada nem CPF do pedido (P8)", () => {
  const bloco = blocoTimeline(cartao(PEDIDO));
  assert.ok(bloco.length > 0, "o bloco tem de ser encontrado (controlo positivo)");
  assert.doesNotMatch(bloco, /Rua A|12345678909|Maria|69027/);
});
