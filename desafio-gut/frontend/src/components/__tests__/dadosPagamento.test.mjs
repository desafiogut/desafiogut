// dadosPagamento.test.mjs — MC95.1.
//
// INVARIANTE: o gate de consentimento (texto legal que o utilizador aceita) NÃO pode
// contradizer o Regulamento registado em cartório sobre DADOS DE PAGAMENTO.
//
// Porque existe: em 2026-09-25 o gate mostrava PIX `desafiogut01@gmail.com` e
// «Agência 181627», enquanto o Regulamento v4 (Art. 21) regista o PIX chave CNPJ
// `23.040.066/0001-00` e a Agência `198627`. Um número de agência trocado num PIX é
// dinheiro que vai para o lado errado.
//
// ⚠️ O `desafiogut01@gmail.com` continua a ser o e-mail de SUPORTE/DPO (decisão do
// operador no MC88.44, `_lib/guto-perfis.mjs`): este teste trava as duas coisas ao
// mesmo tempo — que o PIX do gate seja o oficial, E que o suporte não tenha sido
// arrastado por um replace global.
//
// node --test --test-concurrency=1 src/components/__tests__/dadosPagamento.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ler = (p) => readFileSync(resolve(process.cwd(), p), "utf8");
const TERMOS = ler("src/components/TermosConsentimento.jsx");
const V4 = ler("../../docs/REGULAMENTO-v4.md");

/** O bloco do Art. 21 no gate, em texto puro. */
function art21Gate() {
  const m = TERMOS.match(/artLabel\}>Art\. 21<\/strong> — ([\s\S]*?)<\/p>/);
  assert.ok(m, "o gate não tem o bloco do Art. 21");
  return m[1].replace(/<[^>]+>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim();
}

test("o PIX do gate é o oficial (CNPJ), como no Regulamento — não um e-mail", () => {
  const art21 = art21Gate();
  assert.match(art21, /23\.040\.066\/0001-00/, "o Art. 21 do gate não traz o PIX oficial (CNPJ)");
  assert.doesNotMatch(art21, /[@]/, "o Art. 21 do gate ainda apresenta um e-mail como PIX");
  // e o CNPJ que o gate mostra é o mesmo que o Regulamento regista
  assert.match(V4, /PIX — chave: 23\.040\.066\/0001-00/, "o v4 mudou o PIX oficial?");
});

test("a agência do Banco do Brasil é a 198627, como no Regulamento", () => {
  const art21 = art21Gate();
  assert.match(art21, /Agência 198627/, "o gate não diz Agência 198627");
  assert.doesNotMatch(art21, /181627/, "o gate ainda diz a agência errada 181627");
  assert.match(V4, /Agência 198627/, "o v4 regista outra agência");
});

test("o e-mail institucional do Art. 1 é o oficial", () => {
  assert.match(TERMOS, /contato@grupouniaoetrabalho\.com\.br/, "falta o e-mail institucional oficial");
  assert.doesNotMatch(TERMOS, /grupouniaoetrabalhoam@gmail\.com/, "o gate ainda mostra o gmail institucional");
});

test("o e-mail de SUPORTE (MC88.44) NÃO foi arrastado pelo alinhamento", () => {
  const suporte = ler("netlify/functions/_lib/guto-perfis.mjs");
  assert.match(suporte, /EMAIL_SUPORTE = "desafiogut01@gmail\.com"/,
    "o e-mail de suporte mudou — era decisão do operador (MC88.44), não faz parte deste alinhamento");
});

test("o PIX de compra continua a ser GERADO dinamicamente (não fixado no código)", () => {
  const prov = ler("netlify/functions/iniciar-pagamento.mjs");
  assert.match(prov, /gerarPedidoPix/, "o backend deixou de gerar o PIX dinamicamente");
});
