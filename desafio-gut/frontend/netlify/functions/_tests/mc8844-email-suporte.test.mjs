// MC88.44 — o GUTO não pode mandar ninguém para um endereço que não existe.
//
// PORQUÊ ESTE TESTE EXISTE: o G1 do MC88.41 apanhou o GUTO a oferecer
// `suporte@desafiogut.com.br` — domínio que devolve NXDOMAIN — em quatro
// respostas, incluindo "não recebi as senhas" e uma acusação de roubo. Quem
// tinha dinheiro preso escrevia para o vazio.
//
// O S0 mostrou que o endereço vinha do índice de embeddings (Blob store `rag`),
// não de uma constante. Editar o regulamento não muda o índice: só
// `scripts/build-rag-index.mjs` o faz, e isso é do operador (chaves + custo).
// Daí a rota determinística testada aqui — um intent que responde ANTES do RAG.
//
// node --test --experimental-test-module-mocks _tests/mc8844-email-suporte.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { detectarIntent } from "../chatbot.mjs";
import { obterResposta, EMAIL_SUPORTE } from "../_lib/guto-perfis.mjs";

// _tests → functions → netlify → frontend → desafio-gut → raiz do repo.
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const ler = (rel) => readFileSync(resolve(REPO, rel), "utf8");

const MORTO   = "suporte@desafiogut.com.br";
const PERFIS  = ["visitante", "comum", "corporativo", "admin"];

// ─────────────────────────────────────────────────────────────────────────────
// 1. O endereço
// ─────────────────────────────────────────────────────────────────────────────

test("EMAIL_SUPORTE é o endereço que a app já usa e que RECEBE", () => {
  assert.equal(EMAIL_SUPORTE, "desafiogut01@gmail.com");
  // Continua a bater com o rodapé — se um mudar sem o outro, voltam as
  // "três vozes" que o MC88.41 registou.
  assert.match(ler("desafio-gut/frontend/src/widgets/layout/Layout.jsx"),
    new RegExp(`mailto:${EMAIL_SUPORTE}`),
    "o rodapé deixou de coincidir com EMAIL_SUPORTE");
});

test("nenhum perfil recebe o domínio morto", () => {
  for (const perfil of PERFIS) {
    const r = obterResposta("suporte", perfil, {});
    assert.ok(r.includes(EMAIL_SUPORTE), `${perfil} não recebeu o endereço`);
    assert.ok(!r.includes(MORTO),        `${perfil} recebeu o domínio NXDOMAIN`);
  }
});

test("o tom por perfil respeita a regra do MC15.5 (sem emojis em corp/admin)", () => {
  const emoji = /\p{Extended_Pictographic}/u;
  assert.ok(emoji.test(obterResposta("suporte", "visitante", {})));
  assert.ok(emoji.test(obterResposta("suporte", "comum", {})));
  // corporativo/admin: formato profissional. O 📧 do corporativo é deliberado
  // (marca o canal), mas o admin é relatório — sem pictogramas.
  assert.ok(!emoji.test(obterResposta("suporte", "admin", {})),
    "o perfil admin é operacional: sem emojis");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. O roteador
// ─────────────────────────────────────────────────────────────────────────────

test("pedidos de contacto humano caem no intent suporte", () => {
  const casos = [
    "Como entro em contato com o suporte?",
    "qual o e-mail de contato?",
    "quero falar com alguém",
    "quero falar com a coordenação",
    "como faço uma reclamação?",
    "atendimento",
    "ouvidoria",
    "como falo com vocês?",
  ];
  for (const c of casos) {
    assert.equal(detectarIntent(c), "suporte", `não apanhou: "${c}"`);
  }
});

test("o intent suporte NÃO rouba intents mais específicos", () => {
  // É testado por ÚLTIMO em detectarIntent precisamente para isto: quem
  // pergunta por um ASSUNTO deve receber dados reais, não um endereço.
  const casos = [
    ["quanto custam as cotas?",        "pacotes_cotas"],
    ["meu saldo",                      "meu_saldo"],
    ["como indico um amigo?",          "indique_e_ganhe"],
    ["quem ganha agora?",              "simular_vencedor"],
    ["quero uma cota",                 "comprar_cotas"],
    ["lista as edições",               "listar_edicoes"],
  ];
  for (const [frase, esperado] of casos) {
    assert.equal(detectarIntent(frase), esperado, `"${frase}" foi desviada para outro intent`);
  }
});

test("acentos e maiúsculas não escapam (o bug do MC15.4.3)", () => {
  // detectarIntent desacentua NFD antes de testar; o padrão é escrito sem
  // acentos. Se alguém acrescentar acentos ao padrão, isto cai.
  assert.equal(detectarIntent("QUERO FALAR COM A COORDENAÇÃO"), "suporte");
  assert.equal(detectarIntent("Reclamação"), "suporte");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. A fonte do RAG
// ─────────────────────────────────────────────────────────────────────────────

test("o regulamento — fonte do índice RAG — não cita o domínio morto", () => {
  const reg = ler("docs/chatbot/regulamento.md");
  assert.ok(!reg.includes(MORTO),
    "o regulamento voltou a citar suporte@desafiogut.com.br; " +
    "é ele que alimenta build-rag-index.mjs, logo o GUTO volta a repeti-lo");
  assert.ok(reg.includes(EMAIL_SUPORTE), "o regulamento não cita o endereço correto");
});

test("os documentos internos também não o citam", () => {
  // Não alimentam o GUTO, mas são o que a coordenação lê durante um incidente.
  // Se ficarem desalinhados, o endereço morto volta a entrar por aqui.
  for (const rel of ["docs/incident-response.md", "docs/disaster-recovery.md", "docs/ia-cognitiva.md"]) {
    assert.ok(!ler(rel).includes(MORTO), `${rel} ainda cita o domínio morto`);
  }
});

test("o placeholder de pagador do Mercado Pago fica INTOCADO", () => {
  // Mesmo domínio, uso completamente diferente: é o e-mail do PAGADOR enviado à
  // API do Mercado Pago, aceite como placeholder. Trocá-lo mexeria no fluxo de
  // pagamento sem necessidade nenhuma. Esta guarda impede um "corrige tudo"
  // distraído num MC futuro.
  const mp = ler("desafio-gut/frontend/netlify/functions/_lib/pix-provider/mercadopago.mjs");
  assert.ok(mp.includes("pagador@desafiogut.com.br"),
    "alguém trocou o e-mail do pagador do Mercado Pago — não é canal de suporte");
});
