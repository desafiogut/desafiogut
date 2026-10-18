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
// UTAC110h.1 — ver a nota acima dos testes: gate v5, sem dados bancários.
//
// node --test --test-concurrency=1 src/components/__tests__/dadosPagamento.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ler = (p) => readFileSync(resolve(process.cwd(), p), "utf8");
const TERMOS = ler("src/components/TermosConsentimento.jsx");
const V5 = ler("../../docs/REGULAMENTO-v5.md");

// ⚠️ UTAC110h.1 — o gate passou ao Regulamento v5.0 e deixou de mostrar dados bancários: o v5 não
// tem o «Art. 21» do v4 (PIX/BB) e o Art. 54º veda contas de pessoas físicas. A invariante deste
// ficheiro mantém-se — o gate NÃO pode mostrar dados de pagamento que o Regulamento não regista —
// e passa a ser verificada pela AUSÊNCIA desses dados (as 3 guardas do MC95.1 continuam lá dentro).
const GATE_SEM_COMENTARIOS = TERMOS.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

test("o gate não mostra dados bancários nem chave PIX (o v5 não os regista no texto que o gate resume)", () => {
  assert.doesNotMatch(GATE_SEM_COMENTARIOS, /Agência|Conta Corrente|TED|chave:/i, "o gate voltou a mostrar dados bancários");
  assert.doesNotMatch(GATE_SEM_COMENTARIOS, /181627|198627|847534/, "o gate voltou a mostrar agência/conta");
  assert.doesNotMatch(V5, /Agência 181627/, "o v5 regista a agência errada?");
});

test("nenhum e-mail de pessoa física aparece como meio de pagamento (v5, Art. 54º)", () => {
  assert.match(V5, /Art\. 54º — É vedada a utilização de contas bancárias de pessoas físicas/);
  assert.doesNotMatch(GATE_SEM_COMENTARIOS, /renascendoam@gmail\.com|grupouniaoetrabalhoam@gmail\.com/, "o gate mostra um gmail pessoal/antigo");
});

test("o contacto do gate é o canal oficial de dúvidas do v5 (Art. 69º)", () => {
  // ⚠️ UTAC110m.2 (2026-10-18) — a asserção anterior exigia «exclusivamente», que o Art. 69º já
  // não diz: o canal de LGPD passou a ser o DPO (Art. 57º/69º). Texto antigo, preservado à vista:
  //   assert.match(V5, /Art\. 69º — Dúvidas, informações e sugestões deverão ser encaminhadas
  //                      exclusivamente através do e-mail desafiogut01@gmail\.com/);
  // O que se exige agora: o Gmail continua a ser o canal de DÚVIDAS, e o DPO é o de LGPD.
  assert.match(V5, /Art\. 69º — Dúvidas, informações e sugestões deverão ser encaminhadas através do e-mail desafiogut01@gmail\.com/);
  assert.match(V5, /As questões relativas à proteção de dados pessoais \(LGPD\) podem ser encaminhadas diretamente ao Encarregado de Proteção de Dados \(DPO\)[^\n]*dpo@grupouniaoetrabalho\.com\.br/);
  assert.match(GATE_SEM_COMENTARIOS, /Dúvidas: desafiogut01@gmail\.com/, "o gate perdeu o contacto oficial de dúvidas");
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
