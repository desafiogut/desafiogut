// glossario.test.mjs — MC97, simplificado pelo MC98 (PT-BR only).
//
// HISTÓRIA: o MC96 corrigiu o vocabulário em PT (código, UI, GUTO, RAG). Este teste
// nasceu no MC97 para garantir que EN e ES não ficavam para trás — quem mudasse de
// idioma via «Bids»/«Pujas», e o app contradizia-se entre idiomas diante da revisão
// da Play Store e das regras da Apple 5.3.4.
//
// MC98 — DECISÃO DO OPERADOR (R18, 27/09/2026): o DesafioGUT é PT-BR ONLY. `en.js` e
// `es.js` foram removidos. As asserções que mediam «os 3 idiomas» deixaram de ter
// objecto e foram REMOVIDAS:
//   · «as 3 linguas tem as MESMAS CHAVES (consistencia entre idiomas)»
//   · «IDIOMA: um valor em EN/ES nao pode conter marcadores de portugues»
//   · as listas PROIBIDOS/OBRIGATORIOS de en e es
// O que fica é o que continua a ter objecto: o dicionário PT tem de respeitar o
// GLOSSARIO-OFICIAL — sem termos proibidos, com os termos obrigatórios, medidos
// sobre os VALORES.
//
// HARD GATE 4 — bidireccional:
//   (a) não há termos PROIBIDOS nos VALORES;
//   (b) os termos do GLOSSARIO estão presentes;
//   (c) a medição é sobre os VALORES, não sobre o ficheiro (o escape file-vs-value
//       que o validador do MC97 apanhou: mutar «Skill-based tournament» para
//       «Skill tournament» sobrevivia porque o COMENTÁRIO mantinha a frase).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FE = process.cwd();
const IDIOMAS = ["pt"];   // MC98 — PT-BR only. Era ["pt","en","es"].
const ler = (l) => readFileSync(resolve(FE, `src/i18n/${l}.js`), "utf8");

/** Extrai o mapa chave->valor. */
function dict(lang) {
  const out = {};
  for (const m of ler(lang).matchAll(/"([a-zA-Z0-9_.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) out[m[1]] = m[2];
  return out;
}

const PROIBIDOS = {
  // ⚠️ TODOS os termos levam plural (`s?`). A 1.ª versão tinha `\bsubasta\b`, e a mutação
  // que reintroduzia «Subastas» SOBREVIVEU — o plural não casava. Um padrão que só apanha
  // o singular é uma guarda com um buraco do tamanho do uso real: ninguém escreve
  // «Subasta» num botão.
  //
  // UTAC106c — PENDÊNCIA #3 do 106b: `\bapostas?\b` só apanhava «aposta»/«apostas»; as formas
  // VERBAIS («aposte», «apostar», «apostou», «apostando») escapavam. Passa a `\bapost\w*\b`,
  // que cobre o radical inteiro — a mesma classe de buraco que o plural tinha aberto.
  // `\bsortes?\b` → `\bsort\w*\b` pelo mesmo motivo (apanha «sorteio», «sortudo», …).
  pt: /\bleil[ãõa]o\b|\bleil[õo]es\b|\bapost\w*\b|\bsort\w*\b|\bazar\b|\bloterias?\b/i,
};
const OBRIGATORIOS = {
  pt: [/torneio de habilidade/i, /menor lance[^.]{0,24}[úu]nico/i],
};
const GLOSSARIO_PT = [/torneio de habilidade/i, /\bsenhas?\b/i];   // PT mantém «senha»

test("o dicionario PT e legivel e nao vazio (guarda contra medicao vazia)", () => {
  // ✅ CONTROLO POSITIVO: sem isto, um extractor partido devolvia 0 chaves, o teste de
  // «termos proibidos» passava por vacuidade, e o silêncio leria-se como aprovação.
  for (const l of IDIOMAS) {
    const n = Object.keys(dict(l)).length;
    assert.ok(n > 50, `${l}.js: so' ${n} chaves — medicao suspeita`);
  }
});

test("MC98 — o dicionario PT e o UNICO (en.js/es.js nao voltaram)", () => {
  for (const removido of ["en", "es"]) {
    assert.ok(!existsSync(resolve(FE, `src/i18n/${removido}.js`)),
      `src/i18n/${removido}.js reapareceu — o DesafioGUT e PT-BR only`);
  }
});

test("NENHUM termo proibido nos VALORES do dicionario PT", () => {
  const maus = [];
  for (const l of IDIOMAS) {
    for (const [k, v] of Object.entries(dict(l))) {
      if (PROIBIDOS[l].test(v)) maus.push(`${l}.js ${k} = «${v}»`);
    }
  }
  assert.deepEqual(maus, [], "termos proibidos nos valores:\n" + maus.join("\n"));
});

test("os termos OBRIGATORIOS do glossario estao presentes", () => {
  const faltam = [];
  for (const l of IDIOMAS) {
    const t = ler(l);
    for (const re of OBRIGATORIOS[l]) if (!re.test(t)) faltam.push(`${l}.js: falta ${re}`);
  }
  assert.deepEqual(faltam, [], "glossario incompleto:\n" + faltam.join("\n"));
});

test("nenhum valor esta VAZIO (chave presente mas por traduzir)", () => {
  const vazios = [];
  for (const l of IDIOMAS) for (const [k, v] of Object.entries(dict(l))) if (!v.trim()) vazios.push(`${l}.js ${k}`);
  assert.deepEqual(vazios, [], "valores vazios: " + vazios.join(", "));
});

test("os termos obrigatorios sao medidos sobre os VALORES, nao sobre o ficheiro", () => {
  // O escape file-vs-value: mutar «Skill-based tournament»->«Skill tournament» num VALOR
  // sobrevivia porque o COMENTARIO do ficheiro mantinha a frase. Medir sobre os valores fecha-o.
  const faltam = [];
  for (const l of IDIOMAS) {
    const vals = Object.values(dict(l)).join(" \n ");
    for (const re of OBRIGATORIOS[l]) if (!re.test(vals)) faltam.push(`${l}.js: ${re} ausente dos VALORES`);
  }
  assert.deepEqual(faltam, [], "glossario ausente dos valores:\n" + faltam.join("\n"));
});

test("PT respeita o proprio glossario (Senha continua «senha», nao «token»)", () => {
  const vals = Object.values(dict("pt")).join(" \n ");
  assert.ok(!/\btokens?\b/i.test(vals), "PT passou a dizer «token» — o glossario PT diz «senha»");
  for (const re of GLOSSARIO_PT) assert.ok(re.test(vals), `PT perdeu ${re}`);
});
