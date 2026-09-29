// MC102 — o botão «Recebi», RENDERIZADO (testar o uso, não só a função).
// node --test src/components/meus-ativos/__tests__/mc102-recebi.test.mjs   (a partir de desafio-gut/frontend)
//
// Bidireccional: aparece ao dono de um pedido enviado e por confirmar; NÃO aparece a outro
// endereço, sem envio, nem depois de confirmado. E a cablagem: quem passa o endereço, e para
// onde vai a chamada.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { carregar, render, texto, fechar } from "./_render.mjs";

const DONO = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ENVIADO = {
  produtoId: "11111111-2222-3333-4444-555555555555", edicaoId: "RELAMP-1", comprador: DONO,
  produtoNome: "Air Fryer", valorPagoCentavos: 137,
  morada: { nome: "Maria", logradouro: "Rua A", numero: "1", bairro: "B", cidade: "Manaus", uf: "AM", cep: "69027010" },
  rastreio: { codigo: "AA123456789BR", transportadora: "Correios", enviado_em: "2026-09-20T12:00:00.000Z" },
};
let Cartao;
before(async () => { Cartao = await carregar("/src/components/meus-ativos/__tests__/_cartao-pedido.jsx"); });
after(fechar);

const botao = (html) => /data-acao="recebi"/.test(html);
const props = (pedido, endereco) => ({ pedido, endereco, authToken: "tok", isMobile: false, aoGravar() {} });

test("aparece ao DONO de um pedido enviado e ainda não confirmado", () => {
  const html = render(Cartao, props(ENVIADO, DONO));
  assert.ok(botao(html), "o botão tem de estar no markup");
  assert.match(texto(html), /\bRecebi\b/);
  assert.match(texto(html), /\bEnviado\b/);
});

test("o dono em maiúsculas (checksum EIP-55) continua a ser o dono", () => {
  assert.ok(botao(render(Cartao, props(ENVIADO, DONO.toUpperCase().replace("0X", "0x")))));
});

test("NÃO aparece a outro endereço, nem sem sessão", () => {
  assert.ok(!botao(render(Cartao, props(ENVIADO, OUTRO))));
  assert.ok(!botao(render(Cartao, props(ENVIADO, null))));
});

test("NÃO aparece antes do envio (sem rastreio)", () => {
  assert.ok(!botao(render(Cartao, props({ ...ENVIADO, rastreio: null }, DONO))));
});

test("NÃO aparece depois de confirmado — e o estado passa a «Recebido»", () => {
  const html = render(Cartao, props({ ...ENVIADO, recebido_em: "2026-09-25T10:00:00.000Z" }, DONO));
  assert.ok(!botao(html));
  assert.match(texto(html), /\bRecebido\b/);
});

// Cablagem, lida da fonte SEM comentários (lição MC96.1: um teste que aceita código
// comentado não verifica cablagem nenhuma).
const semComentarios = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const fonte = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), "utf8"));

test("cablagem: MeusAtivos passa o endereço da sessão ao MeusPedidos, e este ao cartão", () => {
  assert.match(fonte("../../../pages/MeusAtivos.jsx"), /<MeusPedidos\b[^>]*\bendereco=\{address\}/);
  assert.match(fonte("../MeusPedidos.jsx"), /<CartaoPedido\b[^>]*\bendereco=\{endereco\}/);
});

test("cablagem: o clique chama PUT pedidos?acao=recebido do próprio produto", () => {
  const f = fonte("../MeusPedidos.jsx");
  assert.match(f, /apiPut\(`pedidos\?acao=recebido&produtoId=\$\{encodeURIComponent\(pedido\.produtoId\)\}`/);
  assert.match(f, /onClick=\{marcarRecebi\}/);
});
