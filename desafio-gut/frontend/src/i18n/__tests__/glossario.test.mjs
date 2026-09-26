// glossario.test.mjs — MC97. Alinha PT/EN/ES com a tese de torneio de habilidade.
//
// PORQUE EXISTE: o MC96 corrigiu o vocabulario em PT (codigo, UI, GUTO, RAG). EN e ES ficaram
// para tras: quem mudasse de idioma via «Bids»/«Pujas» — o app contradizia-se entre idiomas,
// diante da revisao da Play Store e das regras da Apple 5.3.4.
//
// HARD GATE 4 — bidireccional:
//   (a) nao ha termos PROIBIDOS em nenhum idioma;
//   (b) os termos do GLOSSARIO estao presentes;
//   (c) mutacao que reintroduza um proibido -> RED.
// HARD GATE 5 — as 3 linguas tem as MESMAS CHAVES (a mesma ideia, nao a mesma string).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FE = process.cwd();
const IDIOMAS = ["pt", "en", "es"];
const ler = (l) => readFileSync(resolve(FE, `src/i18n/${l}.js`), "utf8");

/** Extrai o mapa chave->valor. */
function dict(lang) {
  const out = {};
  for (const m of ler(lang).matchAll(/"([a-zA-Z0-9_.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) out[m[1]] = m[2];
  return out;
}

const PROIBIDOS = {
  // ⚠️ TODOS os termos levam plural (`s?`). A 1.ª versão tinha `\bsubasta\b`, e a mutação que
  // reintroduzia «Subastas» SOBREVIVEU — o plural não casava. Um padrão que só apanha o singular
  // é uma guarda com um buraco do tamanho do uso real: ninguém escreve «Subasta» num botão.
  en: /\bauctions?\b|\bbets?\b|\bbids?\b|\bbidding\b|\bgambling\b|\blotter(y|ies)\b|\braffles?\b|\bchances?\b|\bluck\b|\bpasswords?\b/i,
  es: /\bsubastas?\b|\bapuestas?\b|\bpujas?\b|\bloter[ií]as?\b|\bsorteos?\b|\bazar\b|\bsuertes?\b|\bcontrase(ñ|n)as?|\bfichas?\b|\btickets?\b/i,
  pt: /\bleil[ãõa]o\b|\bleil[õo]es\b|\bapostas?\b|\bsortes?\b|\bazar\b|\bloterias?\b/i,
};
const OBRIGATORIOS = {
  pt: [/torneio de habilidade/i, /menor lance[^.]{0,24}[úu]nico/i],
  en: [/skill-based tournament/i, /lowest unique offer/i, /\boffers?\b/i],
  es: [/torneo de habilidad/i, /oferta [úu]nica m[áa]s baja/i, /\bofertas?\b/i],
};

// ⚠️ MC97 — O GUARDA ERA «VALUE-BLIND» E O VALIDADOR PROVOU-O com 4 mutações que SOBREVIVIAM:
//   «Skill-based tournament»→«Skill tournament»  (o COMENTÁRIO do ficheiro mantinha a frase: o
//      teste fazia grep ao FICHEIRO, não ao VALOR — o escape file-vs-value)
//   EN «Offers»→«Lances»  e  ES «Ofertas»→«Lances»  (um valor em PORTUGUÊS passava!)
//   PT «Senhas»→«Tokens»  (desalinhamento do glossário em PT passava)
// Agora: (a) os termos obrigatórios são medidos sobre os VALORES concatenados; (b) há uma
// verificação de IDIOMA — um valor em EN/ES não pode conter marcadores de PT; (c) o PT tem de
// respeitar o seu próprio glossário.
// ⚠️ Só formas INEQUIVOCAMENTE portuguesas — com acento ou grafia exclusiva. A 1.ª versão
// usou `pr[ée]mio`, que casa o ESPANHOL correto «premio» e acusava 2 falsos positivos em es.js.
// `premio` é espanhol; `prémio` é português. A distinção é o acento, e o regex tem de a fazer.
const MARCADORES_PT = /\blances?\b|\bsenhas?\b|\bediç[ãa]o\b|\bprémios?\b|\bganhador(es)?\b|\bapuração\b/i;
const GLOSSARIO_PT = [/torneio de habilidade/i, /\bsenhas?\b/i];   // PT mantém «senha»
test("os 3 dicionarios sao legiveis e nao vazios (guarda contra medicao vazia)", () => {
  for (const l of IDIOMAS) {
    const n = Object.keys(dict(l)).length;
    assert.ok(n > 50, `${l}.js: so' ${n} chaves — medicao suspeita`);
  }
});

test("NENHUM idioma tem termos proibidos (nos VALORES, nao nas chaves)", () => {
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

test("as 3 linguas tem as MESMAS CHAVES (consistencia entre idiomas)", () => {
  const chaves = IDIOMAS.map((l) => Object.keys(dict(l)).sort());
  assert.ok(chaves[0].length > 50, "deteccao de chaves falhou — medicao invalida");
  for (let i = 1; i < IDIOMAS.length; i++) {
    const soA = chaves[0].filter((k) => !chaves[i].includes(k));
    const soB = chaves[i].filter((k) => !chaves[0].includes(k));
    assert.ok(soA.length === 0 && soB.length === 0,
      `chaves desalinhadas entre ${IDIOMAS[0]} e ${IDIOMAS[i]}: so em ${IDIOMAS[0]}=[${soA}] so em ${IDIOMAS[i]}=[${soB}]`);
  }
});

test("nenhum valor esta VAZIO (chave presente mas por traduzir)", () => {
  const vazios = [];
  for (const l of IDIOMAS) for (const [k, v] of Object.entries(dict(l))) if (!v.trim()) vazios.push(`${l}.js ${k}`);
  assert.deepEqual(vazios, [], "valores vazios: " + vazios.join(", "));
});

test("IDIOMA: um valor em EN/ES nao pode conter marcadores de portugues", () => {
  // A mutação «Offers»->«Lances» em EN SOBREVIVIA ao guarda antigo: nada verifica que o valor
  // está no idioma certo. Um dicionário traduzido para a língua errada passa todas as outras
  // verificações — e é o que o utilizador vê.
  const maus = [];
  for (const l of ["en", "es"]) {
    for (const [k, v] of Object.entries(dict(l))) {
      if (MARCADORES_PT.test(v)) maus.push(`${l}.js ${k} = «${v}»`);
    }
  }
  assert.deepEqual(maus, [], "valores em portugues dentro de outro idioma:\n" + maus.join("\n"));
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
