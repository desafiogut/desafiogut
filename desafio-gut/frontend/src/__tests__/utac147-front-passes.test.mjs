// UTAC147 — frontend no modelo de Passes diretos (1 Passe Relâmpago = 1 lance · 1 Passe Programado = 1 palpite).
// Lógica pura (sem DOM) + guardas de fonte para o que não tem arnês de render (Carteira por interruptor, Regras).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estadoPassesLance, rotuloPassesRelampago, QUANTIDADES_PASSE, precoTotal } from "../lib/passes.js";
import { PROPORCOES_TEXTO, MOSTRAR_PONTOS_ENGAJAMENTO } from "../lib/pontosLance.js";

const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("P1 · estadoPassesLance é fail-closed: sem sessão, a carregar, erro, ilegível ou 0 ⇒ não licita", () => {
  assert.equal(estadoPassesLance({ isConnected: false, passes: 5 }).podeLancar, false);
  assert.equal(estadoPassesLance({ isConnected: true, passes: 5, loading: true }).estado, "carregando");
  assert.equal(estadoPassesLance({ isConnected: true, passes: 5, erro: "x" }).estado, "erro");
  for (const v of [null, undefined, -1, 1.5, "3", NaN]) {
    assert.equal(estadoPassesLance({ isConnected: true, passes: v }).podeLancar, false, `passes=${String(v)}`);
  }
  const zero = estadoPassesLance({ isConnected: true, passes: 0 });
  assert.equal(zero.estado, "sem_passes");
  assert.match(zero.mensagem, /Compre Passes para participar/);
  assert.doesNotMatch(zero.mensagem, /login|missão|pontos/i, "a mensagem voltou a falar em pontos/missões");
});

test("P2 · com ≥ 1 Passe Relâmpago licita, e o custo é SEMPRE 1 Passe (não o valor do lance)", () => {
  const e = estadoPassesLance({ isConnected: true, passes: 1 });
  assert.equal(e.podeLancar, true);
  assert.equal(e.custo, 1);
  assert.equal(e.saldo, 1);
  assert.equal(rotuloPassesRelampago(1), "1 Passe Relâmpago");
  assert.equal(rotuloPassesRelampago(3), "3 Passes Relâmpago");
});

test("P3 · pacotes 1, 3 e 5 (o 10 saiu) a R$ 2,00 cada", () => {
  assert.deepEqual([...QUANTIDADES_PASSE], [1, 3, 5]);
  assert.equal(precoTotal(5), "R$ 10,00");
  assert.equal(precoTotal(10), null);
});

test("P4 · o CardLance decide pelo INVENTÁRIO de Passes e mostra «1 Passe Relâmpago»", () => {
  const c = ler("../components/CardLance.jsx").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.match(c, /useInventarioPasses\(\)/, "o CardLance não lê o inventário");
  assert.match(c, /estadoPassesLance\(\{[\s\S]{0,80}passes: inventario\.passesRelampago/, "o botão não depende dos Passes Relâmpago");
  assert.doesNotMatch(c, /estadoPontosLance\(/, "o botão voltou a depender dos pontos");
  assert.match(c, /sem_passes_disponiveis:/, "o 400 do servidor sem Passe não tem mensagem");
  assert.match(c, /Cada lance usa 1 Passe Relâmpago/);
  assert.doesNotMatch(c, /Ver missões de hoje/);
});

test("P5 · Carteira e Meus Ativos: o interruptor dos pontos de engajamento está DESLIGADO e guarda os dois blocos", () => {
  assert.equal(MOSTRAR_PONTOS_ENGAJAMENTO, false);
  const cart = ler("../pages/MinhaCarteira.jsx");
  assert.match(cart, /\{MOSTRAR_PONTOS_ENGAJAMENTO && \(<div data-saldo="pontos-lance"/, "o saldo de pontos de lance não está guardado");
  assert.match(cart, /\{MOSTRAR_PONTOS_ENGAJAMENTO && \(<section data-missoes-hoje=""/, "as Missões não estão guardadas");
});

test("P6 · Regras Oficiais: resumo em Passes, sem login/missão/sequência nem «pontos de lance grátis»", () => {
  const ids = PROPORCOES_TEXTO.map((b) => b.id);
  assert.ok(ids.includes("participar") && ids.includes("indique"), JSON.stringify(ids));
  const tudo = PROPORCOES_TEXTO.flatMap((b) => [b.titulo, ...b.linhas]).join("\n");
  assert.match(tudo, /1 Passe Relâmpago = 1 lance/);
  assert.match(tudo, /1 Passe Programado = 1 palpite/);
  assert.match(tudo, /pacotes de 1, 3 ou 5/);
  assert.doesNotMatch(tudo, /Login diário|Missão do dia|Sequência de|pontos de lance/i);
});

test("P7 · Regulamento v6.1: Art. 18 diz «produto» (não «prêmio»), igual nas cópias do GUTO", () => {
  const reg = ler("../../../../docs/REGULAMENTO-v6.1.md");
  const guto = ler("../../../../docs/GUTO-REGULAMENTO.md");
  const art = (t) => t.split("\n").find((l) => l.startsWith("Art. 18."));
  assert.match(art(reg), /^Art\. 18\. O produto correspondente/);
  assert.doesNotMatch(art(reg), /prêmio/);
  assert.equal(art(guto), art(reg), "a cópia do GUTO divergiu no Art. 18");
});

// UTAC147-val (SEG4) — o servidor passou a exigir 1 Passe Programado por palpite (`registar-palpite.mjs`, 400
// `sem_passes_disponiveis`). O ecrã do palpite traduzia qualquer 400 por «Palpite inválido».
test("V5 · palpite sem Passe Programado (400 sem_passes_disponiveis) ⇒ mensagem de compra, não «Palpite inválido»", async () => {
  const { mensagemErroPalpite } = await import("../lib/palpite.js");
  const m = mensagemErroPalpite(400, "sem_passes_disponiveis");
  assert.notEqual(m, "Palpite inválido");
  assert.match(m, /Passes? Programados?/);
  assert.match(m, /Compre Passes/);
  assert.match(mensagemErroPalpite(502, "inventario_indisponivel"), /verificar seus Passes/);
  // bidireccional: os outros 400 continuam «Palpite inválido» e o `sem_passe` (FK) continua sem pedir Passe
  assert.equal(mensagemErroPalpite(400, "valor_invalido"), "Palpite inválido");
  assert.doesNotMatch(mensagemErroPalpite(400, "sem_passe"), /passe/i);
  // a chave chega mesmo do servidor com este nome
  const back = ler("../../netlify/functions/registar-palpite.mjs");
  assert.match(back, /jsonError\(400, "sem_passes_disponiveis"/);
});
