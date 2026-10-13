// mc963-guto-regulamento-v4.test.mjs — GUTO: o prompt corresponde ao REGULAMENTO OFICIAL.
//
// ⚠️ O NOME DO FICHEIRO É HISTÓRICO («v4»). O CONTEÚDO é do **Regulamento Oficial 5.0** desde o
// UTAC110c-1 (2026-10-12). O ficheiro manteve o nome para não partir a série; renomear testes
// fechados não é escopo de uma correcção (GATE 15) — declara-se em vez de se fazer.
//
// HISTÓRIA (o que este teste era, e porque mudou):
//   MC96.3 — `Art.N = 0` em `chatbot.mjs` e `guto-perfis.mjs`: o GUTO não citava artigo nenhum.
//   A resposta vinha dos chunks do RAG. Criou-se um resumo de 10 artigos do v4 (`ARTIGOS_V4`) e
//   este teste verificava-o contra `docs/REGULAMENTO-v4.md`.
//   UTAC110c-1 — o GUTO passou a levar o **Regulamento INTEIRO** no prompt e o resumo passou a
//   ser um **índice de ÂNCORAS para citação**. O que este teste vigia mudou com ele:
//   (a) os 4 perfis (e o modo de conformidade) levam a instrução de citar o artigo;
//   (b) cada âncora de `ARTIGOS_V4` é um excerto **VERBATIM** do artigo correspondente do
//       documento — é isto que impede o prompt de "saber" um regulamento que não existe;
//   (c) o módulo que o RUNTIME importa (`_lib/guto-regulamento.mjs`) é **byte a byte** igual a
//       `docs/GUTO-REGULAMENTO.md` — sem isto, o documento e o prompt podiam divergir em silêncio;
//   (d) o documento tem a estrutura declarada: 12 capítulos e 72 artigos (1..72, sem lacunas);
//   (e) a ERRATA DA FONTE continua verdadeira (o defeito de origem ainda lá está).
//   (f) BIDIRECCIONAL — o verificador RECUSA uma âncora que não conste do artigo.
//
// ⚠️ O CWD da suíte do backend é `netlify/functions` ⇒ subir 4 níveis para chegar à raiz do repo
// (medido: com 3 níveis lê-se `Desktop/docs/...`, que não existe).
//
// node --test --experimental-test-module-mocks _tests/mc963-guto-regulamento-v4.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  obterPromptSystem, REGRA_REGULAMENTO, ARTIGOS_V4, semEscapesDaFonte,
} from "../_lib/guto-perfis.mjs";
import {
  REGULAMENTO_TEXTO, REGULAMENTO_VERSAO, REGULAMENTO_FONTE,
} from "../_lib/guto-regulamento.mjs";

const RAIZ = resolve(process.cwd(), "..", "..", "..", "..");
const PERFIS = ["visitante", "comum", "corporativo", "admin"];

const DOC = readFileSync(resolve(RAIZ, REGULAMENTO_FONTE), "utf8");
/** O documento com o defeito de origem neutralizado (ver ERRATA DA FONTE). */
const DOC_OK = semEscapesDaFonte(DOC);
const DOC_UMA = DOC_OK.replace(/\s+/g, " ");

/** Texto de um artigo do documento, normalizado (espaços colapsados). */
function artigo(n) {
  const m = DOC_UMA.match(new RegExp(`Art\\. ${n}º\\s*[—–-]\\s*([\\s\\S]*?)(?=Art\\. \\d+º|$)`));
  return m ? m[1].trim() : null;
}

/**
 * Verificador de (b), ISOLADO de propósito: é o mesmo objecto testado em (f) com um valor falso.
 * @throws se o artigo não existir ou não contiver o texto.
 */
function exigirAncora(n, texto) {
  const t = artigo(n);
  if (!t) throw new Error(`Art. ${n}º ausente do documento`);
  if (!t.includes(texto)) throw new Error(`Art. ${n}º não contém «${texto}»`);
}

// ── (a) o prompt ────────────────────────────────────────────────────────────

test("(a) TODOS os perfis levam a regra do regulamento e a instrução de citar o artigo", () => {
  for (const perfil of PERFIS) {
    const p = obterPromptSystem(perfil, {});
    assert.ok(p.includes(REGRA_REGULAMENTO), `${perfil}: sem REGRA_REGULAMENTO`);
    assert.match(p, /CITA o artigo/i, `${perfil}: falta a instrução de citar`);
  }
  assert.ok(obterPromptSystem("visitante", { conformidade: true }).includes(REGRA_REGULAMENTO),
    "o modo de conformidade também tem de levar o regulamento");
});

test("(a2) a regra proíbe inventar artigos e manda usar o texto integral", () => {
  assert.match(REGRA_REGULAMENTO, /NUNCA cites um artigo que não esteja/i);
  assert.match(REGRA_REGULAMENTO, /nunca inventes o número de um artigo/i);
  assert.match(REGRA_REGULAMENTO, /texto INTEGRAL do Regulamento Oficial/i);
});

test("(a3) o Regulamento INTEIRO chega ao prompt (não um resumo, não um índice)", () => {
  for (const perfil of PERFIS) {
    const p = obterPromptSystem(perfil, {});
    assert.ok(p.includes(REGULAMENTO_TEXTO),
      `${perfil}: o prompt não leva o texto integral do Regulamento`);
  }
});

// ── (b) BIDIRECCIONAL: as âncoras correspondem ao DOCUMENTO ─────────────────

test("(b) cada âncora de ARTIGOS_V4 é um excerto VERBATIM do artigo correspondente", () => {
  const entradas = Object.entries(ARTIGOS_V4);
  assert.ok(entradas.length >= 10, `esperava >=10 âncoras, vi ${entradas.length}`);
  for (const [n, texto] of entradas) exigirAncora(n, texto);
});

test("(b2) os valores críticos estão ancorados nos artigos certos", () => {
  for (const [n, frag] of [
    ["6", "R$ 2,00"], ["8", "10 (dez) pontos"], ["9", "50 (cinquenta) pontos"],
    ["18", "R$ 0,01"], ["33", "+2 (dois) pontos"], ["47", "R$ 1,00"],
  ]) {
    assert.ok(artigo(n), `Art. ${n}º ausente`);
    assert.ok(artigo(n).includes(frag), `Art. ${n}º não contém «${frag}»`);
  }
});

// ── (c) o módulo do RUNTIME espelha o documento ─────────────────────────────

test("(c) `_lib/guto-regulamento.mjs` é o documento tal e qual (controlo de vitalidade incluído)", () => {
  assert.ok(DOC.length > 15_000, `o documento parece vazio (${DOC.length} chars) — medição inválida`);
  assert.equal(REGULAMENTO_TEXTO, DOC,
    "o módulo que o runtime importa DIVERGIU de " + REGULAMENTO_FONTE +
    " — regenerar (ver cabeçalho do módulo)");
  assert.equal(REGULAMENTO_VERSAO, "5.0");
});

test("(c2) o módulo exporta o texto com os escapes do documento intactos (não os 'corrige')", () => {
  // O texto que vai no prompt é o que está impresso no documento oficial. Se alguém "limpar" os
  // escapes SÓ no módulo, as duas cópias divergem e (c) cai — este teste diz PORQUÊ.
  assert.match(REGULAMENTO_TEXTO, /R\\\$ 2,00/, "o escape do Art. 6º desapareceu do módulo");
  assert.match(REGULAMENTO_TEXTO, /1\\text\{ ponto\}/, "o escape do Art. 18º desapareceu do módulo");
});

// ── (d) estrutura do documento ─────────────────────────────────────────────

test("(d) o documento tem 12 capítulos e os 72 artigos, sem lacunas", () => {
  const caps = DOC_UMA.match(/CAPÍTULO [IVX]+/g) || [];
  assert.equal(new Set(caps).size, 12, `capítulos: ${new Set(caps).size}`);
  const arts = new Set([...DOC_UMA.matchAll(/Art\. (\d+)º/g)].map((m) => Number(m[1])));
  const falta = [];
  for (let i = 1; i <= 72; i++) if (!arts.has(i)) falta.push(i);
  assert.deepEqual(falta, [], `artigos em falta no documento: ${falta.join(", ")}`);
  assert.ok(arts.has(72), "o Art. 72º (disposições finais) tem de existir");
});

// ── (e) a ERRATA DA FONTE continua verdadeira ──────────────────────────────

test("(e) os 9 escapes do defeito de origem continuam no CORPO do documento (a ERRATA não mente)", () => {
  // ⚠️ Contar no CORPO, não no ficheiro todo: a própria ERRATA cita os escapes (é o objecto dela),
  // e contá-los dava 24 em vez de 9 — medido. A ERRATA documenta; o defeito é do corpo.
  const CORPO = DOC.slice(DOC.indexOf("CAPÍTULO I"));
  const escapes = CORPO.match(/\\text\{|\\\$/g) || [];
  assert.equal(escapes.length, 9,
    `o corpo passou a ter ${escapes.length} escapes — corrigir a ERRATA em ${REGULAMENTO_FONTE}`);
  const errata = DOC.slice(0, DOC.indexOf("CAPÍTULO I"));
  assert.match(errata, /ERRATA DA FONTE/);
  for (const frag of ["R\\$ 2,00", "1\\text{ ponto} = R\\$ 0,01", "1\\text{ ECOQUILDO} = R\\$ 1,00"]) {
    assert.ok(errata.includes(frag), `a ERRATA não documenta «${frag}»`);
  }
});

// ── (f) a metade que faz o teste valer: o verificador MORDE ────────────────

test("(f) BIDIRECCIONAL: o verificador RECUSA uma âncora que o artigo não diz", () => {
  assert.doesNotThrow(() => exigirAncora("6", ARTIGOS_V4["6"]), "o caso válido tem de passar");
  assert.throws(() => exigirAncora("6", "O Passe Desafio custa R$ 5,00 (cinco reais)"),
    /não contém/, "uma âncora falsa tem de ser recusada");
  assert.throws(() => exigirAncora("34", "Os pontos do palpite CONTAM para o cartão"),
    /não contém/, "uma âncora com o sentido invertido tem de ser recusada");
  assert.throws(() => exigirAncora("999", "seja o que for"), /ausente/);
});
