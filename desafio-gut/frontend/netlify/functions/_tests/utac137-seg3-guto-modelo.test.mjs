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
const V6 = readFileSync(resolve(RAIZ, "docs", "REGULAMENTO-v6.md"), "utf8").replace(/\r\n/g, "\n");
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
  assert.match(MODELO, /O palpite não exige Passe\./);
  assert.match(MODELO, /O Passe NÃO dá pontos de lance/);
});

test("SEG3 · a prosa não ensina o v5 nem atribui ao Art. 6º o que ele exclui", () => {
  assert.doesNotMatch(MODELO, /R\$ 1,00|10 pontos|\b200\b|palpite exige|f[íi]sico/i);
  const a6 = MODELO.match(/pontos de lance são[^()]*\(Art\. 6º\)/);
  assert.ok(a6, "a prosa deixou de dizer de onde vêm os pontos de lance (Art. 6º)");
  assert.doesNotMatch(a6[0], /indica/i, "o Art. 6º diz «exclusivamente» engajamento, login e missões — sem indicações");
  assert.ok(artigo("Art. 6º").includes("engajamento diário, login contínuo e cumprimento de missões"));
  assert.ok(a6[0].includes("engajamento diário, login contínuo e cumprimento de missões"));
});
