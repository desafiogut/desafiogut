// UTAC110k.1 — CONFORMIDADE PRÉ-AAB: as 4 lacunas do dossier 110k (B-2) fechadas.
//
//  A) Art. 17º do Regulamento diz a verdade (Passe pago = transação principal; crédito = benefício).
//  B/C) Data Safety deixa de declarar «NÃO» onde o código recolhe (Endereço e CPF).
//  D) DPO designado e divulgado (nome + e-mail) na política, na app e na página pública.
//  E) «Pseudonimizado» onde é pseudonimização — e dito que continua a ser dado pessoal.
//
// Porque este teste existe: as três primeiras lacunas são afirmações FALSAS em documentos que a
// Play Console e a ANPD leem. Um teste que não as vigie volta a deixá-las entrar.
//
// node --test src/components/__tests__/utac110k1-conformidade-pre-aab.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderizar, texto, fechar } from "../meus-ativos/__tests__/_render.mjs";

after(fechar);

const ler = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const V5      = ler("../../../../../docs/REGULAMENTO-v5.md");
const GUTO    = ler("../../../../../docs/GUTO-REGULAMENTO.md");
const DS      = ler("../../../../../docs/MC90.2-DATA-SAFETY-RASCUNHO.txt");
const POLITICA= ler("../../../../../docs/lgpd-politica-retencao.md");
const PRIV    = ler("../../pages/Privacidade.jsx");
const PAGINA  = ler("../../pages/ExcluirConta.jsx");
const MODAL   = ler("../ExcluirContaModal.jsx");

const semComentarios = (s) =>
  s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ─────────────────────────── FRENTE A — Art. 17º ───────────────────────────

test("A/Art. 17º (v5.1): descreve o Passe pago e o crédito como benefício — nos DOIS ficheiros", () => {
  const NOVO = /Art\. 17º — O Passe Desafio \(R\$ 2,00\) é a transação principal/;
  assert.match(V5, NOVO, "a transcrição tem de ter o texto novo");
  assert.match(GUTO, NOVO, "a FONTE (GUTO) tem de ter o MESMO texto — senão volta a divergir");
  for (const [nome, src] of [["v5", V5], ["GUTO", GUTO]]) {
    assert.doesNotMatch(src.replace(/>.*$/gm, ""), /pontos de lance não são comprados com dinheiro real/,
      `${nome}: a negação do pagamento não pode sobreviver no corpo`);
  }
  assert.match(V5, /benefício suplementar e subordinado à compra do Passe, não uma taxa separada/);
});

test("A/v5.1: a versão subiu nos dois ficheiros e o gate de aceite acompanhou", () => {
  for (const [nome, src] of [["v5", V5], ["GUTO", GUTO]]) {
    assert.match(src, /Versão 5\.1 · Vigente a partir de 02 de novembro de 2026/, `${nome}: versão do corpo`);
    assert.doesNotMatch(src, /Versão 5\.0 · Vigente/, `${nome}: a 5.0 não pode ficar no corpo`);
  }
  // A invariante FONTE (utac106h) só volta a valer se os corpos forem iguais — verificado aqui também,
  // porque é a razão pela qual esta correcção exigiu tocar na fonte.
  const corpo = (md, modo) => {
    const n = md.replace(/\r\n/g, "\n");
    return modo === "v5" ? n.slice(n.indexOf("\n---\n\n") + 6) : n.slice(n.indexOf("\nREGULAMENTO OFICIAL DO DESAFIOGUT\n") + 1);
  };
  assert.equal(corpo(V5, "v5"), corpo(GUTO, "guto"), "os corpos têm de ser byte a byte iguais");
  // Gate: subir a versão do Regulamento obriga a re-aceitar (o código diz isso em comentário e faz isso).
  const GATE = ler("../../../../../desafio-gut/frontend/netlify/functions/_lib/consentimento.mjs");
  const FRONT = ler("../../components/TermosConsentimento.jsx");
  const g = GATE.match(/VERSAO_GATE = "([^"]+)"/)?.[1];
  const f = FRONT.match(/VERSAO_CONSENTIMENTO = "([^"]+)"/)?.[1];
  assert.equal(g, f, "gate do backend e do frontend têm de ter a mesma versão");
  assert.notEqual(g, "3.0", "a versão 3.0 era a do Regulamento 5.0 — tem de subir com o texto");
});

// ──────────────────── FRENTE B/C — Data Safety (o bloqueante) ────────────────────

test("C/Data Safety: Endereço passa a «SIM» — e o fluxo que o recolhe está nomeado", () => {
  assert.doesNotMatch(DS, /- Endereço — NÃO/, "a declaração falsa não pode voltar");
  assert.match(DS, /- Endereço — \*\*SIM\*\*/);
  assert.match(DS, /validarMorada/, "tem de citar o código que recolhe a morada");
  assert.match(DS, /resgates\.morada/);
});

test("C/Data Safety: CPF passa a «SIM», com as duas finalidades reais", () => {
  assert.doesNotMatch(DS, /\[15\][\s\S]{0,200}NÃO coletado[\s\S]{0,120}CPF do utilizador não é coletado/,
    "a negação do CPF não pode voltar");
  assert.match(DS, /\[15\] INFORMAÇÕES FINANCEIRAS DO GOVERNO \(NIF\/CPF\)[\s\S]{0,120}\*\*SIM — coletado\*\*/);
  assert.match(DS, /iniciar-pagamento\.mjs:86/, "finalidade (a): identificação do pagador no PIX");
  assert.match(DS, /validarCPF[\s\S]{0,200}entrega|entrega[\s\S]{0,200}validarCPF/,
    "finalidade (b): entrega do cartão");
});

test("C/Data Safety: deixa de chamar «anonimizado» ao que é pseudonimizado", () => {
  assert.match(DS, /pseudonimizado/i);
  assert.match(DS, /\*\*Pseudonimização não é anonimização\*\*/,
    "tem de dizer, com a ANPD, que o registo continua a ser dado pessoal");
});

// ─────────────────────────── FRENTE D — DPO ───────────────────────────

test("D/DPO: nome e contacto divulgados na política, na app e na página de exclusão (art. 41)", () => {
  for (const [nome, src] of [["política de retenção", POLITICA], ["Política de Privacidade", PRIV], ["página de exclusão", PAGINA]]) {
    assert.match(src, /Francisco Canindé Marinho/, `o DPO tem de estar nomeado em ${nome}`);
    assert.match(src, /dpo@desafiogut\.com\.br/, `o contacto do DPO tem de estar em ${nome}`);
  }
  // A lacuna formal que isto fecha: «a designar» não pode voltar.
  assert.doesNotMatch(POLITICA, /DPO\): a designar/, "«a designar» era a lacuna do art. 41");
  assert.match(POLITICA, /R18-110k\.1-DPO/, "a designação tem de estar registada como decisão");
});

test("D/DPO: a Política de Privacidade tem secção própria do Encarregado", () => {
  assert.match(PRIV, /14\. ENCARREGADO DE PROTEÇÃO DE DADOS \(DPO\) E CONTACTO/);
  assert.match(PRIV, /Encarregado é o canal para exercer os direitos do artigo 18 da LGPD/);
});

// ──────────────────── FRENTE E — pseudonimização ────────────────────

test("E/nada promete anonimização onde só há pseudonimização (nem «sem vínculo»)", () => {
  for (const [nome, src] of [["página", semComentarios(PAGINA)], ["modal", semComentarios(MODAL)]]) {
    assert.doesNotMatch(src, /deixam de identificar você/i, `${nome}: equivalência falsa`);
    assert.doesNotMatch(src, /sem vínculo com você/i, `${nome}: «sem vínculo» é impreciso`);
    assert.doesNotMatch(src, /sem o identificar/i, `${nome}: «sem o identificar» é o mesmo erro`);
  }
  assert.match(semComentarios(PAGINA), /pseudonimiz/i);
  assert.match(semComentarios(MODAL), /pseudonimiz/i);
});

test("E/o ecrã diz que o registo pseudonimizado CONTINUA a ser dado pessoal (LGPD)", () => {
  assert.match(semComentarios(MODAL), /ainda é dado pessoal/);
  assert.match(semComentarios(PAGINA), /ainda é dado pessoal/);
  assert.match(semComentarios(PAGINA), /Pseudonimizado não é\s+anónimo|Pseudonimizado não é anónimo/);
});

test("E/modal renderizado: o utilizador lê «pseudonimizados» e o aviso da LGPD", async () => {
  const t = texto(await renderizar("/src/components/ExcluirContaModal.jsx",
    { aberto: true, onFechar: () => {}, address: "0xabc", authToken: "t", onExcluido: () => {} }));
  assert.match(t, /pseudonimizados/i, "o texto renderizado tem de dizer pseudonimizados");
  assert.match(t, /ainda é dado pessoal/, "o aviso tem de chegar ao ecrã, não só ao fonte");
  assert.match(t, /dpo@desafiogut\.com\.br/, "o canal do Encarregado tem de estar no ecrã");
  assert.doesNotMatch(t, /deixam de identificar você/i);
});

// ─────────────────── coerência entre os três lugares ───────────────────

test("coerência: Data Safety, política e ecrã contam a MESMA história sobre o que fica", () => {
  // O resgate é o caso-limite: morada pseudonimizada, registo retido. Tem de aparecer nos três.
  assert.match(DS, /morada é[\s\S]{0,80}anonimizada|\[Conta Deletada\]/i);
  assert.match(POLITICA, /resgates|morada/i);
  assert.match(semComentarios(PAGINA), /\[Conta Deletada\]|morada passa a/i);
});
