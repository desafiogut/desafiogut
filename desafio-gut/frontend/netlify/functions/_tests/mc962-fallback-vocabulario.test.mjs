// mc962-fallback-vocabulario.test.mjs — MC96.2.
//
// Duas correcções do SEG-1 do MC96, medidas antes de tocar:
//   #5 o fallback DESPEJAVA o chunk bruto («Olha o que encontrei no regulamento: ${trecho}»);
//   #10 o vocabulário «leilão» estava na PERSONA (24 linhas de guto-perfis.mjs), não só no prompt.
//
// HARD GATE 7 — bidireccional: (a) o despejo AUSENTE; (b) a frase NATURAL presente (com saída
// para o utilizador); (c) os mutantes que reponham o defeito TEM de morrer.
//
// ⚠️ ESCOPO MEDIDO, e o brief estava errado: «todas as 33 ocorrências têm de sair» NÃO pode ser
// levado à letra. Ficam deliberadamente:
//   - os COMENTÁRIOS que documentam a decisão MC29.1 (histórico, não persona);
//   - os REGEXES do intent router (`novo leilao`, `se (o leilao )?terminasse…`) — são palavras
//     do UTILIZADOR que o router tem de reconhecer; removê-las fazia o GUTO deixar de entender
//     quem escreve «leilão»;
//   - `isLeilaoAtivo` — chave de configuração de `_lib/recursos-app-config.mjs` (fora do escopo);
//   - um `console.warn` interno.
// O que sai é a PROSA DA PERSONA — o que o GUTO diz ao utilizador.
//
// node --test --experimental-test-module-mocks _tests/mc962-fallback-vocabulario.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { obterResposta } from "../_lib/guto-perfis.mjs";

const ler = (p) => readFileSync(resolve(process.cwd(), p), "utf8");
const GUTO = ler("_lib/guto-perfis.mjs");
const CHAT = ler("chatbot.mjs");
const PERFIS = ["visitante", "comum", "corporativo", "admin"];

/** Remove comentários (// e /* *​/) — um teste que aceita código comentado não testa nada
 *  (lição do MC96.1: a asserção de cablagem passava com a chamada comentada). */
const semComentarios = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CONTACTO = "contato@grupouniaoetrabalho.com.br";

// ── #5 O FALLBACK ────────────────────────────────────────────────────────────

test("(a) o fallback NÃO despeja o chunk bruto — nos 4 perfis", () => {
  for (const perfil of PERFIS) {
    const r = obterResposta("fallback_sem_llm", perfil, { trecho: "CHUNK-BRUTO-DO-RAG" });
    assert.ok(typeof r === "string" && r.length > 0, `${perfil}: fallback vazio`);
    assert.doesNotMatch(r, /^Olha o que encontrei no regulamento/, `${perfil}: ainda despeja o chunk`);
  }
});

test("(b) o fallback é uma frase natural com SAÍDA para o utilizador", () => {
  for (const perfil of PERFIS) {
    const semNada = obterResposta("fallback_sem_llm", perfil, { trecho: "" });
    assert.ok(typeof semNada === "string" && semNada.trim().length > 0, `${perfil}: fallback vazio sem trecho`);
    // o perfil admin é técnico de propósito (sem emojis, regra MC15.5 §D3) — não se exige contacto
    if (perfil !== "admin") {
      assert.match(semNada, new RegExp(CONTACTO.replace(/\./g, "\\.")),
        `${perfil}: o fallback tem de dar uma saída (o contacto oficial)`);
    }
  }
  // e com trecho: o trecho é ENQUADRADO (não colado cru), e continua a haver saída
  const comTrecho = obterResposta("fallback_sem_llm", "comum", { trecho: "RESPOSTA DO RAG" });
  assert.match(comTrecho, /RESPOSTA DO RAG/, "o trecho tem de aparecer (senão não informa nada)");
  assert.match(comTrecho, /regulamento/i, "o trecho tem de vir enquadrado (dizer de onde vem)");
  assert.match(comTrecho, new RegExp(CONTACTO.replace(/\./g, "\\.")), "e com uma saída");
});

test("(c) o chunk bruto NÃO é colado sem enquadramento (sem markdown de documento)", () => {
  const r = obterResposta("fallback_sem_llm", "comum", { trecho: "# Regulamento\n> Documento consolidado" });
  assert.doesNotMatch(r, /^#\s/m, "não pode começar uma linha com markdown de título");
  assert.match(r, /«/, "o trecho deve vir entre delimitadores (enquadrado), não cru");
});

// ── #10 O VOCABULÁRIO ────────────────────────────────────────────────────────

test("(a) NÃO há «leilão» na prosa do GUTO (só em comentários)", () => {
  const limpo = semComentarios(GUTO);
  const achados = [...limpo.matchAll(/.{0,40}(leil[ãõa]o|leil[õo]es).{0,40}/gi)].map((m) => m[0].trim());
  assert.deepEqual(achados, [], `a persona ainda diz «leilão»:\n  ${achados.join("\n  ")}`);
});

test("(b) a persona fala em torneio/edições", () => {
  const limpo = semComentarios(GUTO);
  // ⚠️ Exige-se «torneio» (medido: 2 ocorrências), NÃO a frase oficial completa «torneio de
  // habilidade»: essa vive no Regulamento v4 (Portaria SPA/MF 1.207/2024) e a ligação do GUTO
  // ao v4 é o MC96.3. Pôr aqui a exigência forte seria estender o escopo deste MC.
  assert.match(limpo, /torneio/i, "falta «torneio» (o vocabulário de substituição)");
  assert.match(limpo, /edições/i, "falta «edições» (o vocabulário de substituição)");
  assert.match(limpo, /participar das edições/i, "o CTA tem de dizer «participar das edições»");
});

test("os comentários que DOCUMENTAM a decisão MC29.1 continuam lá (histórico, não persona)", () => {
  assert.match(GUTO, /\/\/ MC29\.1/, "o comentário da decisão tem de ficar");
  assert.match(GUTO, /modo de conformidade/i, "e o conceito continua documentado");
});

test("o que fica em chatbot.mjs é deliberado e NÃO é prosa da persona", () => {
  const limpo = semComentarios(CHAT);
  const ocorr = [...limpo.matchAll(/.{0,30}(leil[ãõao]s?|leilões).{0,30}/gi)].map((m) => m[0].trim());
  // cada uma tem de ser uma das excepções justificadas
  const justificadas = ocorr.filter((o) =>
    /novo leilao/.test(o) || /se \(o leilao \)\?terminasse/.test(o) ||
    /como esta \(a edicao\|o leilao\|indo\)/.test(o) || /isLeilaoAtivo/.test(o) ||
    /leil[ãõ]o ativo/.test(o));
  assert.equal(justificadas.length, ocorr.length,
    `há «leilão» em prosa no chatbot.mjs:\n  ${ocorr.filter((o) => !justificadas.includes(o)).join("\n  ")}`);
  // e os regexes do router TEM de continuar a reconhecer a palavra do utilizador
  assert.match(CHAT, /novo leilao/, "o router tem de continuar a reconhecer «novo leilão» do utilizador");
});
