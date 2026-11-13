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
//   (e) o ficheiro está LIMPO das marcas de formatação e a ERRATA DA FONTE continua a documentar
//       o defeito do PDF oficial (descrito em palavras — UTAC110c-1b: o corpo é o texto que o
//       GUTO lê, logo não pode conter «1\text{ ponto} = R\$ 0,01»);
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
// UTAC137 — o v6 escreve «Art. 1º O presente…» e «Art. 10. A…» (sem travessão). O padrão aceita os dois
// formatos (o do v5 era «Art. Nº — …») e corta no artigo seguinte ou no capítulo seguinte.
function artigo(n) {
  const m = DOC_UMA.match(new RegExp(`Art\\. ${n}(?:º|\\.)(?:\\s*[—–-])?\\s+([\\s\\S]*?)(?=Art\\. \\d+(?:º|\\.) |#+ CAPÍTULO|$)`));
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
  // UTAC137 (v6) — eram Arts. 6/8/9/18/33/47 do v5 (R$ 2,00 · 10 pontos · 50 pontos · R$ 0,01 · +2 · R$ 1,00).
  for (const [n, frag] of [
    ["5", "R$ 2,00"], ["6", "o Passe não concede pontos de lance"], ["7", "1 (um) ponto de fidelidade"],
    ["8", "a cada 50 pontos de fidelidade"], ["12", "R$ 0,01"], ["21", "R$ 0,50"], ["23", "50 (cinquenta) ECOQUILDOs"],
  ]) {
    assert.ok(artigo(n), `Art. ${n}º ausente`);
    assert.ok(artigo(n).includes(frag), `Art. ${n}º não contém «${frag}»`);
  }
});

// ── (c) o módulo do RUNTIME espelha o documento ─────────────────────────────

test("(c) `_lib/guto-regulamento.mjs` é o documento tal e qual (controlo de vitalidade incluído)", () => {
  // UTAC137: o v6 tem ~7,5 mil caracteres (era > 15 000 com o v5.1). O controlo de vitalidade acompanha.
  assert.ok(DOC.length > 6_000, `o documento parece vazio (${DOC.length} chars) — medição inválida`);
  assert.equal(REGULAMENTO_TEXTO, DOC,
    "o módulo que o runtime importa DIVERGIU de " + REGULAMENTO_FONTE +
    " — regenerar (ver cabeçalho do módulo)");
  assert.equal(REGULAMENTO_VERSAO, "6.0", "UTAC137: o Regulamento passou a v6.0 — o módulo do GUTO acompanha");
  // e o corpo do documento do GUTO é o texto registado, byte a byte (3.º sítio da invariante)
  const V6 = readFileSync(resolve(RAIZ, "docs", "REGULAMENTO-v6.md"), "utf8");
  assert.ok(DOC.endsWith(V6), "docs/GUTO-REGULAMENTO.md deixou de terminar no texto de docs/REGULAMENTO-v6.md");
});

test("(c2) o texto que vai no prompt está LIMPO das marcas de formatação (UTAC110c-1b)", () => {
  // ⚠️ ANTES do UTAC110c-1b este teste exigia o CONTRÁRIO: que os escapes se MANTIVESSEM, por
  // «fidelidade ao documento oficial». O 1b inverteu-o, e com razão: o GUTO não pode ler
  // «1\text{ ponto} = R\$ 0,01» e responder isso ao utilizador. A invariante que fica é melhor:
  // **ZERO marcas** no texto que vai ao modelo, e o **valor legível** presente. O PDF do cliente
  // continua defeituoso — isso é documentado na ERRATA, não propagado para o prompt.
  assert.doesNotMatch(REGULAMENTO_TEXTO, /\\text\{/, "sobrou a marca `text{` no texto do prompt");
  assert.doesNotMatch(REGULAMENTO_TEXTO, /\\\$/, "sobrou barra invertida antes do cifrão");
  // UTAC137 (v6): Art. 5º R$ 2,00 · Art. 12. R$ 0,01 · Art. 21. R$ 0,50 (no v5 eram os Arts. 6º/18º/47º).
  assert.match(REGULAMENTO_TEXTO, /valor fixo de R\$ 2,00/, "o Art. 5º tem de trazer o valor legível");
  assert.match(REGULAMENTO_TEXTO, /1 ponto equivale a R\$ 0,01/, "o Art. 12. tem de trazer o valor legível");
  assert.match(REGULAMENTO_TEXTO, /1 ECOQUILDO equivalente a R\$ 0,50/, "o Art. 21. tem de trazer o valor legível");
  assert.doesNotMatch(REGULAMENTO_TEXTO, /1 ECOQUILDO = R\$ 1,00|10 \(dez\) pontos de fidelidade|200 pontos de lance/,
    "sobrou um valor do v5 no texto do GUTO");
});

// ── (d) estrutura do documento ─────────────────────────────────────────────

// UTAC137 — (d) e (e) eram do v5.1: 12 capítulos / 72 artigos e a ERRATA DA FONTE do PDF (as marcas `R\$`).
// O v6 é texto limpo (sem marcas de formatação), 6 capítulos e 30 artigos.
test("(d) o documento tem 6 capítulos e os 30 artigos (v6.0), sem lacunas", () => {
  const caps = DOC_UMA.match(/CAPÍTULO [IVX]+/g) || [];
  assert.equal(new Set(caps).size, 6, `capítulos: ${new Set(caps).size}`);
  const arts = new Set([...DOC_UMA.matchAll(/Art\. (\d+)(?:º|\.) /g)].map((m) => Number(m[1])));
  const falta = [];
  for (let i = 1; i <= 30; i++) if (!arts.has(i)) falta.push(i);
  assert.deepEqual(falta, [], `artigos em falta no documento: ${falta.join(", ")}`);
  assert.ok(!arts.has(31), "o v6 acaba no Art. 30.");
});

test("(e) ZERO marcas de formatação no ficheiro (o v6 não tem o defeito do PDF do v5.1)", () => {
  const marcas = DOC.match(/\\text\{|\\\$/g) || [];
  assert.equal(marcas.length, 0, `ficaram ${marcas.length} marcas de formatação em ${REGULAMENTO_FONTE}`);
  assert.doesNotMatch(REGRA_REGULAMENTO, /ERRATA DA FONTE|DEFEITO CONHECIDO/, "o prompt ainda fala do defeito do PDF do v5.1");
});

// ── (f) a metade que faz o teste valer: o verificador MORDE ────────────────

test("(f) BIDIRECCIONAL: o verificador RECUSA uma âncora que o artigo não diz", () => {
  assert.doesNotThrow(() => exigirAncora("6", ARTIGOS_V4["6"]), "o caso válido tem de passar");
  assert.throws(() => exigirAncora("5", "O Passe Desafio é um produto digital comercializado pelo valor fixo de R$ 5,00"),
    /não contém/, "uma âncora falsa tem de ser recusada");
  assert.throws(() => exigirAncora("6", "o Passe concede 200 pontos de lance"),
    /não contém/, "uma âncora com o sentido invertido (o +200 do v5.1) tem de ser recusada");
  assert.throws(() => exigirAncora("7", "1 (um) ponto de fidelidade ao sistema. Os pontos de lance"),
    /não contém/, "o corte do artigo não pode engolir o artigo seguinte");
  assert.throws(() => exigirAncora("999", "seja o que for"), /ausente/);
});
