// ativos-i18n.test.mjs — MC94. O dicionário e os fallbacks não podem divergir.
//
// Corre com:  node --test src/i18n/__tests__/ativos-i18n.test.mjs
// (a partir de desafio-gut/frontend). Não precisa de Vite: só lê ficheiros.
//
// PORQUÊ ESTE FICHEIRO EXISTE
// A 2.ª validação independente encontrou `ativos.lance.aviso` com **"Projecção"**
// no fallback e **"Projeção"** no dicionário. Parece cosmético e não é: TODOS os
// testes de componente renderizam com `T_PADRAO` (`_estilo.js`), que devolve o
// FALLBACK. Logo a prosa que a suíte assere não era a que embarca — uma suíte que
// mede um texto e um utilizador que lê outro.
// Encontrou também `ativos.bonus.completo`: uma chave ÓRFÃ nos três idiomas, a
// carregar exactamente a frase ("bónus conquistado!") que a spec proíbe. Uma arma
// carregada no dicionário, que nenhum teste apanhava porque ninguém a usava.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMPONENTES = [
  "src/components/meus-ativos/PainelTorneio.jsx",
  "src/components/meus-ativos/ProgressoBonus.jsx",
  "src/components/meus-ativos/EstadoBonus.jsx",
  "src/components/meus-ativos/FeedbackLance.jsx",
  "src/components/meus-ativos/RankingCiclo.jsx",
];
const IDIOMAS = ["pt", "en", "es"];

const ler = (p) => readFileSync(resolve(RAIZ, p), "utf8");

/** Pares `t("ativos.x", "fallback")` tal como estão no código. */
function fallbacks() {
  const padrao = /t\(\s*"(ativos\.[^"]+)"\s*,\s*\n?\s*"((?:[^"\\]|\\.)*)"\s*\)/gs;
  const mapa = new Map();
  for (const f of COMPONENTES) {
    for (const [, chave, valor] of ler(f).matchAll(padrao)) {
      const anterior = mapa.get(chave);
      assert.ok(anterior === undefined || anterior === valor,
        `"${chave}" tem dois fallbacks diferentes: ${JSON.stringify(anterior)} vs ${JSON.stringify(valor)}`);
      mapa.set(chave, valor);
    }
  }
  return mapa;
}

/** Entradas `ativos.*` de um dicionário. */
function dicionario(lang) {
  const padrao = /^\s*"(ativos\.[^"]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm;
  const mapa = new Map();
  for (const [, chave, valor] of ler(`src/i18n/${lang}.js`).matchAll(padrao)) {
    assert.ok(!mapa.has(chave), `"${chave}" está duplicada em ${lang}.js`);
    mapa.set(chave, valor);
  }
  return mapa;
}

describe("MC94 · i18n das secções do torneio", () => {
  test("o dicionário pt é IGUAL aos fallbacks, entrada a entrada", () => {
    // ⚠️ O pt não é uma tradução: é a língua em que o fallback foi escrito. Se
    // divergirem, a suíte mede um texto e o utilizador lê outro.
    const fb = fallbacks();
    const pt = dicionario("pt");
    for (const [chave, valor] of fb) {
      assert.equal(pt.get(chave), valor,
        `"${chave}": o dicionário pt diz ${JSON.stringify(pt.get(chave))} e o fallback diz ${JSON.stringify(valor)}`);
    }
  });

  test("não há chaves órfãs: tudo o que está no dicionário é usado", () => {
    // ⚠️ `ativos.bonus.completo` viveu nos três idiomas sem nenhum uso, a guardar
    // a frase "bónus conquistado!" que a spec proíbe.
    const fb = fallbacks();
    for (const lang of IDIOMAS) {
      const orfas = [...dicionario(lang).keys()].filter((k) => !fb.has(k));
      assert.deepEqual(orfas, [],
        `${lang}.js tem chaves que ninguém usa (apagar, ou usar): ${orfas.join(", ")}`);
    }
  });

  test("não há chaves em falta: tudo o que o código usa existe nos três idiomas", () => {
    const fb = fallbacks();
    for (const lang of IDIOMAS) {
      const dic = dicionario(lang);
      const faltam = [...fb.keys()].filter((k) => !dic.has(k));
      assert.deepEqual(faltam, [], `${lang}.js não tem: ${faltam.join(", ")}`);
    }
  });

  test("os três idiomas têm exactamente o mesmo conjunto de chaves", () => {
    const conjuntos = IDIOMAS.map((l) => [...dicionario(l).keys()].sort());
    assert.deepEqual(conjuntos[1], conjuntos[0], "en diverge de pt");
    assert.deepEqual(conjuntos[2], conjuntos[0], "es diverge de pt");
  });

  test("nenhum idioma promete um bónus que só o backend pode confirmar", () => {
    // A spec (§4f) proíbe declarar o bónus a partir do ecrã. Aqui a regra é
    // aplicada ao DICIONÁRIO, não só ao componente: foi de lá que a frase
    // sobreviveu à primeira correcção.
    // ⚠️ É a AFIRMAÇÃO que é proibida, não a palavra. "Nenhum bônus conquistado"
    // e "Ningún bono conseguido" são a NEGAÇÃO — e são o texto certo. A primeira
    // versão desta asserção reprovava-as, o que a tornava uma guarda que grita no
    // sítio errado. Olha-se para o que vem ANTES da frase.
    // "Sequência completa" NÃO é uma reivindicação de bónus: é o que esta secção
    // observa, e o texto defere a confirmação para a coordenação. O proibido é
    // dizer que o bónus FOI conquistado.
    const reivindicacao = /b[oôó]nus conquistad[oa]|bonus earned|bono conseguido/gi;
    const negacao = /(nenhum|nenhuma|ningún|ninguna|no|sem|sin|without|not)\s+$/i;
    for (const lang of IDIOMAS) {
      for (const [chave, valor] of dicionario(lang)) {
        for (const m of valor.matchAll(reivindicacao)) {
          const antes = valor.slice(0, m.index);
          assert.ok(negacao.test(antes),
            `${lang}.js "${chave}" DECLARA o bónus — só o backend o pode fazer: ${JSON.stringify(valor)}`);
        }
      }
    }
  });

  test("a copy portuguesa é pt-BR, como o resto da app", () => {
    // ⚠️ Medido: a app diz "Carregando" (93×) e "bônus"; a minha copy nova dizia
    // "A carregar" e "bónus" — dois dialectos no MESMO ecrã, ao lado de "Nenhum
    // lance registrado". Achado da 2.ª validação independente.
    const pt = dicionario("pt");
    for (const [chave, valor] of pt) {
      for (const [errado, certo] of [["bónus", "bônus"], ["A carregar", "Carregando"],
                                     ["Projecção", "Projeção"], ["secção", "seção"]]) {
        assert.ok(!valor.includes(errado),
          `pt.js "${chave}" usa ${JSON.stringify(errado)} (pt-PT); a app usa ${JSON.stringify(certo)}`);
      }
    }
  });

  test("a palavra 'saldo' não entra no dicionário de nenhum idioma", () => {
    // `senhasACreditar` é um DIREITO por liquidar. O saldo que autoriza lances é
    // on-chain — ver §4b. A proibição vale também para as traduções.
    for (const lang of IDIOMAS) {
      for (const [chave, valor] of dicionario(lang)) {
        assert.doesNotMatch(valor, /\bsaldo(s)?\b|\bbalance\b/i,
          `${lang}.js "${chave}" chama isto de saldo: ${JSON.stringify(valor)}`);
      }
    }
  });
});
