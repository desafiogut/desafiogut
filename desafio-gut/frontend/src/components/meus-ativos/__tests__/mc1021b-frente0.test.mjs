// MC102.1b — Frente 0: as 6 decisões do operador, RENDERIZADAS no cartão do pedido (o uso, não só a função).
// node --test src/components/meus-ativos/__tests__/mc1021b-frente0.test.mjs   (a partir de desafio-gut/frontend)

// UTC de propósito: a data tem de sair em hora de Brasília venha o fuso da máquina que vier (DEC-102.1b-4).
process.env.TZ = "UTC";

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { carregar, render, texto, fechar } from "./_render.mjs";

const DONO = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PEDIDO = {
  produtoId: "11111111-2222-3333-4444-555555555555", edicaoId: "RELAMP-1", comprador: DONO,
  produtoNome: "Air Fryer", valorPagoCentavos: 137,
  morada: { nome: "Maria", logradouro: "Rua A", numero: "1", bairro: "B", cidade: "Manaus", uf: "AM", cep: "69027010" },
};
const rastreio = (eventos) => ({ codigo: "AA123456789BR", transportadora: "Correios", enviado_em: "2026-09-20T12:00:00.000Z", eventos });
const A_CAMINHO = [{ codigo: "0", data: "2026-09-20T15:00:00Z" }, { codigo: "1", data: "2026-09-21T15:00:00Z" }];
const TENTATIVAS = [{ codigo: "A1", data: "2026-09-22T15:00:00Z" }, { codigo: "A1", data: "2026-09-23T15:00:00Z" }, { codigo: "A1", data: "2026-09-24T15:00:00Z" }];

let Cartao;
before(async () => { Cartao = await carregar("/src/components/meus-ativos/__tests__/_cartao-pedido.jsx"); });
after(fechar);
const cartao = (pedido) => render(Cartao, { pedido, endereco: DONO, authToken: "tok", isMobile: false, aoGravar() {} });
const estado = (html) => (texto(html).match(/Air Fryer (\S+)/) || [])[1];

test("DEC-102.1b-6: timeline em «Entregue» → o cartão diz «Entregue» e o «Recebi» continua lá", () => {
  const html = cartao({ ...PEDIDO, rastreio: rastreio([...A_CAMINHO, { codigo: "4", data: "2026-09-25T15:00:00Z" }]) });
  assert.equal(estado(html), "Entregue");
  assert.match(html, /data-acao="recebi"/);
});

test("DEC-102.1b-6 (oposto): sem «Entregue» o cartão diz «Enviado»; com o comprador confirmado diz «Recebido» (DEC-102.1b-8)", () => {
  assert.equal(estado(cartao({ ...PEDIDO, rastreio: rastreio(A_CAMINHO) })), "Enviado");
  const recebido = cartao({ ...PEDIDO, recebido_em: "2026-09-26T10:00:00Z", rastreio: rastreio([...A_CAMINHO, { codigo: "4", data: "2026-09-25T15:00:00Z" }]) });
  assert.equal(estado(recebido), "Recebido");
  assert.doesNotMatch(recebido, /data-acao="recebi"/);
});

test("DEC-102.1b-1: com «Entregue», os banners desaparecem do cartão; sem ele, aparecem", () => {
  const sem = cartao({ ...PEDIDO, rastreio: rastreio([...A_CAMINHO, ...TENTATIVAS]) });
  assert.match(sem, /data-alerta="A1"/);
  const com = cartao({ ...PEDIDO, rastreio: rastreio([...A_CAMINHO, ...TENTATIVAS, { codigo: "4", data: "2026-09-25T15:00:00Z" }]) });
  assert.doesNotMatch(com, /data-alerta=|role="status"/);
});

test("DEC-102.1b-2/-4/-7: 3 tentativas → UM banner «3 tentativas de entrega · 24/09» (a mais recente, dd/mm Brasília)", () => {
  const html = cartao({ ...PEDIDO, rastreio: rastreio([...A_CAMINHO, ...TENTATIVAS]) });
  assert.equal((html.match(/role="status"/g) || []).length, 1);
  assert.match(texto(html), /3 tentativas de entrega · 24\/09/);
  assert.doesNotMatch(texto(html), /3×|Tentativa de entrega sem sucesso/);
});

test("DEC-102.1b-4: 01:30Z do dia 25 aparece como 24/09 (Brasília), sem ano nem hora", () => {
  const html = cartao({ ...PEDIDO, rastreio: rastreio([{ codigo: "A2", data: "2026-09-25T01:30:00Z" }]) });
  assert.match(texto(html), /Aguardando retirada na agência · 24\/09/);
  assert.doesNotMatch(texto(html), /2026|01:30|25\/09/);
});

test("DEC-102.1b-3: os banners saem por ordem cronológica da 1.ª ocorrência", () => {
  const html = cartao({ ...PEDIDO, rastreio: rastreio([{ codigo: "A3", data: "2026-09-24T10:00:00Z" }, { codigo: "A2", data: "2026-09-22T10:00:00Z" }]) });
  assert.deepEqual([...html.matchAll(/data-alerta="([^"]+)"/g)].map((m) => m[1]), ["A2", "A3"]);
});
