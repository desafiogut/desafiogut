// UTAC137-SEG3 (validador adversarial) — o «MODELO DE HOJE» do prompt do GUTO é PROSA do executor (não é texto
// do Regulamento) e nenhum teste a amarrava: trocar «1 ECOQUILDO = R$ 0,50» por «R$ 1,00», ou «O palpite não
// exige Passe» por «O palpite exige 1 Passe Programado», deixava os 102 testes do GUTO verdes (medido). E citava
// o Art. 6º para «indicações», que o Art. 6º exclui («exclusivamente» engajamento, login e missões).
// Aqui cada número da prosa é comparado com o artigo do v6 que ela cita.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REGRA_REGULAMENTO } from "../_lib/guto-perfis.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
// UTAC138 — a prosa passou ao v6.1 (Arts. 6º/7º com o bônus do Passe Relâmpago); a fonte da comparação acompanha.
const V6 = readFileSync(resolve(RAIZ, "docs", "REGULAMENTO-v6.1.md"), "utf8").replace(/\r\n/g, "\n");
const norm = (s) => s.replace(/\s+/g, " ").trim();
const artigo = (rot) => norm((V6.split("\n").find((l) => l.startsWith(`${rot} `)) || "").slice(rot.length));
const ini = REGRA_REGULAMENTO.indexOf("MODELO DE HOJE");
const MODELO = norm(REGRA_REGULAMENTO.slice(ini, REGRA_REGULAMENTO.indexOf("ÂNCORAS DE CITAÇÃO")));

test("SEG3 · controlo: o v6 e a prosa foram lidos", () => {
  assert.ok(ini > 0 && MODELO.length > 200, "o bloco MODELO DE HOJE desapareceu");
  assert.match(artigo("Art. 21."), /R\$ 0,50/);
});

test("SEG3 · os valores da prosa do GUTO são os do artigo do v6 que cita", () => {
  const eco = artigo("Art. 21.").match(/1 ECOQUILDO equivalente a (R\$ \d+,\d{2})/)[1];
  assert.ok(MODELO.includes(`1 ECOQUILDO = ${eco}`), `prosa sem «1 ECOQUILDO = ${eco}» (Art. 21.)`);
  const preco = artigo("Art. 5º").match(/(R\$ \d+,\d{2})/)[1];
  assert.ok(MODELO.includes(`custa ${preco}`), `prosa sem o preço do Art. 5º (${preco})`);
  assert.match(artigo("Art. 7º"), /1 \(um\) ponto de fidelidade/);
  assert.match(MODELO, /1 ponto de fidelidade \(Art\. 7º\)/);
  assert.match(artigo("Art. 23."), /50 \(cinquenta\) ECOQUILDOs/);
  assert.match(MODELO, /cada 50 ECOQUILDOs convertem-se sozinhos em 1 Passe/);
  // ⛔ UTAC147 (R18-147-H, decisão do operador): a prosa passa ao modelo de Passes diretos ANTES do Regulamento (cujo
  // corpo ainda descreve pontos de lance — dívida para o jurídico). Eram aqui: «O palpite não exige Passe.», o bônus de
  // 100 do Passe Relâmpago (Art. 7º) e «o Passe Programado não dá pontos de lance» (Art. 6º).
  assert.match(MODELO, /1 Passe Relâmpago = 1 lance no Menor Lance Único/);
  assert.match(MODELO, /1 Passe Programado =\s+1 palpite/);
  assert.match(MODELO, /Sem Passe não há lance nem palpite/);
  assert.match(MODELO, /vale o MODELO DE HOJE/, "sem a cláusula, o GUTO citaria os Arts. 6º/7º antigos contra o modelo");
  assert.doesNotMatch(MODELO, /bônus de 100|O palpite não\s+exige Passe/);
});

test("SEG3 · a prosa não ensina o v5 nem atribui ao Art. 6º o que ele exclui", () => {
  assert.doesNotMatch(MODELO, /R\$ 1,00|10 pontos de fidelidade|\b200\b|palpite exige|f[íi]sico/i);
  // UTAC147 — era: a prosa dizia de onde vinham os pontos de lance (Art. 6º: engajamento, login, missões). Essas fontes
  // foram DESCONTINUADAS (R18-147-C) e a prosa tem de o dizer, sem as voltar a ensinar como gratuitas.
  assert.match(MODELO, /login diário, missões, sequência de acertos e boas-vindas foram DESCONTINUADOS/);
  assert.doesNotMatch(MODELO, /pontos de lance são gratuitos/);
});
