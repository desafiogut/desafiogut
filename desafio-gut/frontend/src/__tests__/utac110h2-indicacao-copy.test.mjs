// UTAC110h.2 · FRENTE B — os 3 sítios «+1 senha» passam a dizer o crédito REAL da indicação.
//
// Decisão do operador (R18-110h.2-3): «+50 pontos de lance e +2 ECOQUILDO» ao indicante. O modelo
// antigo (bónus on-chain de +1 senha) morreu no caminho do endpoint (DEBT-025) e o Regulamento v5.0
// (Art. 51º) manda ECOQUILDO — os sítios de UI têm de dizer o que o app faz HOJE:
//   UTAC110f  → +50 pontos de lance ao indicante e ao indicado (`_lib/fontes-lance.mjs`);
//   UTAC110h.2 → +2 ECOQUILDO ao indicante e +1 ao indicado (Art. 51º).
//
// Análise estática sobre o texto-fonte (não prova render — a prova visual são as 2 capturas do SEG4).
//
// node --test src/__tests__/utac110h2-indicacao-copy.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Leitura tolerante ao FIM DE LINHA (o `.gitattributes` não fixa `*.jsx`; um worktree limpo
 *  entrega-os em CRLF — lição F1 do validador do UTAC109h.2). */
const ler = (p) => readFileSync(resolve(SRC, p), "utf8").replace(/\r\n/g, "\n");
const PAINEL = ler("components/PainelIndicacao.jsx");
const CHAT = ler("components/ChatbotWidget.jsx");

/** Texto de CÓDIGO: fora comentários de bloco, comentários JSX e `//` de fim de linha. */
function codigo(t) {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => "\n".repeat(m.split("\n").length - 1))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/[^\n]*/g, "");
}
/** Texto JSX VISÍVEL (nós de texto), que é o que o utilizador lê no ecrã. */
function visivel(t) {
  return [...t.matchAll(/>\s*([^<>{}]{4,}?)\s*</g)].map((m) => m[1].trim());
}

/** O verificador: uma cópia de indicação está certa se diz os DOIS créditos e não fala de «senha». */
function problemas(txt) {
  const p = [];
  if (/\bsenhas?\b/i.test(txt)) p.push("fala de «senha»");
  if (!/\+50 pontos de lance/.test(txt)) p.push("não diz «+50 pontos de lance»");
  if (!/\+2 ECOQUILDO/.test(txt)) p.push("não diz «+2 ECOQUILDO» (indicante)");
  return p;
}

test("controlo positivo: o verificador apanha a cópia antiga e aprova a nova", () => {
  assert.ok(problemas("vocês dois ganham +1 senha!").length >= 2, "não apanhou a cópia antiga");
  assert.deepEqual(problemas("você ganha +50 pontos de lance e +2 ECOQUILDO"), []);
});

// ── B1 — PainelIndicacao ───────────────────────────────────────────────────────────────────────
test("B1 PainelIndicacao: ZERO «senha» no código e a recompensa dita pelos dois créditos", () => {
  const c = codigo(PAINEL);
  assert.doesNotMatch(c, /\bsenhas?\b/i, "ainda há «senha»/«senhas» no painel");
  assert.match(c, /\+50 pontos de lance/, "o painel não diz «+50 pontos de lance»");
  assert.match(c, /\+2 ECOQUILDO/, "o painel não diz «+2 ECOQUILDO»");
  // A recompensa do AMIGO também é dita (é ele que recebe a mensagem de convite).
  assert.match(c, /\+1 ECOQUILDO/, "o painel não diz «+1 ECOQUILDO» (o que o amigo ganha)");
  // O contador `senhas_ganhas` (bónus on-chain morto — DEBT-025) deixou de ser mostrado.
  assert.doesNotMatch(c, /dados\.senhas_ganhas/, "o painel ainda mostra o contador `senhas_ganhas`");
});

test("B1 PainelIndicacao: o que se LÊ no ecrã diz os dois créditos", () => {
  const v = visivel(PAINEL).join(" | ");
  assert.match(v, /\+50 pontos de lance e \+2 ECOQUILDO/, `o painel não mostra a recompensa: «${v}»`);
  assert.ok(!/\bsenhas?\b/i.test(v), "o ecrã do painel ainda fala de «senha»");
});

// ── B2 — ChatbotWidget (card «Indique e Ganhe») ────────────────────────────────────────────────
test("B2 ChatbotWidget: ZERO «Senhas ganhas» e a recompensa dita pelos dois créditos", () => {
  const c = codigo(CHAT);
  assert.doesNotMatch(c, /\bsenhas?\b/i, "ainda há «senha»/«senhas» no card do chat");
  assert.doesNotMatch(c, /senhas_ganhas/, "o card do chat ainda mostra o contador `senhas_ganhas`");
  assert.match(c, /\+50 pontos de lance/, "o card do chat não diz «+50 pontos de lance»");
  assert.match(c, /\+2 ECOQUILDO/, "o card do chat não diz «+2 ECOQUILDO»");
});

// ── B3 — _lib/referral.mjs (a notificação) ─────────────────────────────────────────────────────
test("B3 a notificação de indicação (mensagemInducao) diz os dois créditos, sem «senha»", async () => {
  const { mensagemInducao } = await import("../../netlify/functions/_lib/referral.mjs");
  const um = mensagemInducao(1, "Ana");
  const tres = mensagemInducao(3, "Ana");
  for (const t of [um, tres]) {
    assert.ok(!/\bsenhas?\b/i.test(t), `ainda fala de «senha»: «${t}»`);
    assert.match(t, /\+\d+ pontos de lance/, `sem pontos de lance: «${t}»`);
    assert.match(t, /\+\d+ ECOQUILDO/, `sem ECOQUILDO: «${t}»`);
  }
  assert.match(um, /Ana/, "o singular perdeu o nome do primeiro indicado do dia");
  assert.match(um, /\+50 pontos de lance e \+2 ECOQUILDO/, `singular errado: «${um}»`);
  // Os números do plural são os do código: n × 50 pontos e n × 2 ECOQUILDO.
  assert.match(tres, /\+150 pontos de lance e \+6 ECOQUILDO/, `números do plural errados: «${tres}»`);
});

// ── BIDIRECCIONAL (GATE 8) — a cópia ANTIGA (verbatim, até ao UTAC110h.1) é reprovada ───────────
test("BIDIRECCIONAL: as cópias antigas dos 3 sítios são reprovadas pelo verificador", () => {
  const antigas = [
    "🎯 Te convido para o DesafioGUT! Use meu código IND-ABC123 e, no seu 1º lance, nós dois ganhamos +1 senha.",
    "Quando um amigo entra com o seu código e dá o 1º lance, vocês dois ganham +1 senha!",
    'stat("Senhas ganhas", 7)',
    "Parabéns! O teu amigo Ana entrou no DESAFIOGUT. +1 senha creditada!",
    "3 amigos teus entraram hoje no DESAFIOGUT! +3 senhas creditadas.",
    // A cópia do UTAC110h.1 (já sem «senha», mas sem ECOQUILDO) também tem de reprovar.
    "você ganha +50 pontos de lance na hora (e o seu amigo também), até 10 indicações por mês.",
  ];
  for (const a of antigas) assert.ok(problemas(a).length > 0, `o verificador aprovou a cópia antiga: «${a}»`);
});
