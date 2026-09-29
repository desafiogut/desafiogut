// MC-ECOMMERCE-01a — lógica pura dos pedidos no frontend (não há runner de React).
// node --test src/lib/pedidos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { erroDoEndereco, estadoDoPedido, formatarCep, textoPrazo, resumoEndereco, ENDERECO_VAZIO, podeMarcarRecebido } from "./pedidos.js";

const OK = { ...ENDERECO_VAZIO, nome: "Maria Silva", cpf: "529.982.247-25", cep: "69027-010",
  logradouro: "Rua 5 de Setembro", numero: "86", bairro: "São Raimundo", cidade: "Manaus", uf: "am" };

test("formulário completo passa; cada campo obrigatório em falta é apontado", () => {
  assert.equal(erroDoEndereco(OK), null);
  assert.match(erroDoEndereco({ ...OK, cep: "6902" }), /CEP/);
  assert.match(erroDoEndereco({ ...OK, cpf: "123" }), /CPF/);
  assert.match(erroDoEndereco({ ...OK, uf: "" }), /estado/);
  assert.match(erroDoEndereco({ ...OK, numero: "  " }), /número/);
  assert.match(erroDoEndereco({ ...OK, telefone: "999" }), /Telefone/);
  assert.equal(erroDoEndereco({ ...OK, telefone: "(92) 99999-0000" }), null, "telefone é opcional mas, se vier, com DDD");
});

test("estado do pedido segue o fluxo endereço → envio", () => {
  assert.equal(estadoDoPedido({ morada: null }), "sem_endereco");
  assert.equal(estadoDoPedido({ morada: {}, rastreio: null }), "aguarda_envio");
  assert.equal(estadoDoPedido({ morada: {}, rastreio: { codigo: "X" } }), "enviado");
});

test("CEP, prazo e resumo", () => {
  assert.equal(formatarCep("69027010"), "69027-010");
  assert.equal(formatarCep("690"), "690");
  assert.equal(textoPrazo(10), "Entrega em até 10 dias após o envio");
  assert.equal(textoPrazo(null), null, "sem prazo informado não se inventa um");
  assert.equal(resumoEndereco({ logradouro: "Rua A", numero: "1", bairro: "B", cidade: "C", uf: "AM", cep: "69027010" }),
    "Rua A, 1 — B, C/AM — CEP 69027-010");
});

// MC102 — «Recebi»: só o dono, só depois do envio, só uma vez. Bidireccional.
const DONO = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ENV = { comprador: DONO, morada: { nome: "M" }, rastreio: { codigo: "AA123456789BR" } };
test("podeMarcarRecebido: dono + enviado + por confirmar → true; qualquer condição a falhar → false", () => {
  assert.equal(podeMarcarRecebido(ENV, DONO), true);
  assert.equal(podeMarcarRecebido(ENV, DONO.toUpperCase().replace("0X", "0x")), true);
  assert.equal(podeMarcarRecebido(ENV, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), false);
  assert.equal(podeMarcarRecebido(ENV, null), false);
  assert.equal(podeMarcarRecebido({ ...ENV, rastreio: null }, DONO), false);
  assert.equal(podeMarcarRecebido({ ...ENV, recebido_em: "2026-09-25T10:00:00.000Z" }, DONO), false);
  assert.equal(podeMarcarRecebido(null, DONO), false);
  assert.equal(podeMarcarRecebido({ ...ENV, comprador: undefined }, DONO), false);
});
test("estadoDoPedido: recebido_em só conta depois do envio", () => {
  assert.equal(estadoDoPedido({ ...ENV, recebido_em: "2026-09-25T10:00:00.000Z" }), "recebido");
  assert.equal(estadoDoPedido(ENV), "enviado");
  assert.equal(estadoDoPedido({ ...ENV, rastreio: null, recebido_em: "x" }), "aguarda_envio");
});
