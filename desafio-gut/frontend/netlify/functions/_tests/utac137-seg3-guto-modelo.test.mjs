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
// UTAC148 — a prosa passou ao v7; a fonte da comparação acompanha (era o v6.1).
const V6 = readFileSync(resolve(RAIZ, "docs", "REGULAMENTO-v8.0.md"), "utf8").replace(/\r\n/g, "\n");
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
  // UTAC150 (v8.0) — a conversão passou ao § único do Art. 21 (era o Art. 23 do v7).
  assert.match(V6, /^§ único\. A cada 50 \(cinquenta\) ECOQUILDOs acumulados/m);
  assert.match(MODELO, /cada 50 ECOQUILDOs convertem-se sozinhos em 1 Passe \(Art\. 21\.\)/);
  assert.match(artigo("Art. 23."), /Indique e Ganhe/);
  assert.match(MODELO, /para quem indica e 1 para quem é indicado \(Art\. 23\.\)/);
  // ⛔ UTAC147 (R18-147-H, decisão do operador): a prosa passa ao modelo de Passes diretos ANTES do Regulamento (cujo
  // corpo ainda descreve pontos de lance — dívida para o jurídico). Eram aqui: «O palpite não exige Passe.», o bônus de
  // 100 do Passe Relâmpago (Art. 7º) e «o Passe Programado não dá pontos de lance» (Art. 6º).
  // ⛔ UTAC148 — o Regulamento v7 já descreve o modelo de Passes: a cláusula «vale o MODELO DE HOJE» saiu e a prosa
  // cita os artigos do v7 (Arts. 3º, 5º, 6º, 12, 15 e 18).
  assert.match(MODELO, /1 Passe\s+Relâmpago = 1 lance na Oferta Relâmpago e 1 Passe Programado = 1 palpite na Oferta Programada \(Art\. 5º\)/);
  assert.match(MODELO, /sem Passe não há lance nem palpite, e o Passe consumido não é devolvido em caso de\s+derrota \(Art\. 6º\)/); // UTAC150 (v8.0)
  assert.match(artigo("Art. 18."), /50 \(cinquenta\) ECOQUILDOs/);
  assert.match(MODELO, /O vencedor do\s+palpite recebe 50 ECOQUILDOs \(Art\. 18\)/);
  assert.doesNotMatch(MODELO, /bônus de 100|O palpite não\s+exige Passe|vale o MODELO DE HOJE/);
});

test("SEG3 · a prosa não ensina o v5 nem atribui ao Art. 6º o que ele exclui", () => {
  assert.doesNotMatch(MODELO, /R\$ 1,00|10 pontos de fidelidade|\b200\b|palpite exige|f[íi]sico/i);
  // UTAC147 — era: a prosa dizia de onde vinham os pontos de lance (Art. 6º: engajamento, login, missões). Essas fontes
  // foram DESCONTINUADAS (R18-147-C) e a prosa tem de o dizer, sem as voltar a ensinar como gratuitas.
  // UTAC148 — o GUTO tem de negar os pontos de lance e as fontes retiradas (o v7 já não as prevê).
  assert.match(MODELO, /NÃO existem pontos de lance, nem pontos por login, missões, sequência de acertos ou\s+boas-vindas/);
  assert.doesNotMatch(MODELO, /pontos de lance são gratuitos/);
});
