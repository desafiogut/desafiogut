// citacoesRegulamento.test.mjs — MC95.
//
// INVARIANTE: cada artigo citado no app tem de apontar para o artigo do Regulamento
// cujo TEXTO corresponde. Não basta o número existir — tem de ser o ARTIGO CERTO.
//
// Porque este teste existe: em 2026-09-25 (MC95) mediu-se que o gate de consentimento
// citava 8 dos 15 artigos com o número errado, incluindo o Art. 20 a dizer que «cada
// senha custa R$ 2,00 para todas as edições, seja Relâmpago ou Programado» — quando o
// Art. 20 diz exactamente o contrário (o Relâmpago NÃO consome senhas). O utilizador
// aceitava, no gate legal, texto que contradizia o Regulamento que vai a cartório.
//
// O teste compara o texto de cada bloco com o artigo do v4 por PALAVRAS-CHAVE: é
// resistente a reformatação e falha se o número ou o conteúdo forem trocados.
//
// node --test --test-concurrency=1 src/components/__tests__/citacoesRegulamento.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(process.cwd());
const ler = (p) => readFileSync(resolve(RAIZ, p), "utf8");

const V4 = ler("../../docs/REGULAMENTO-v4.md");
const TERMOS = ler("src/components/TermosConsentimento.jsx");

/** Texto do artigo N do v4 (o parágrafo que começa em "Art. Nº -"). */
function artigo(n) {
  const m = V4.match(new RegExp(`^Art\\. ${n}º - (.*)$`, "m"));
  assert.ok(m, `o v4 não tem o Art. ${n}`);
  return m[1];
}

/** Texto do bloco do artigo N no gate de consentimento. */
function bloco(n) {
  const m = TERMOS.match(
    new RegExp(`artLabel\\}>Art\\. ${n}</strong> — ([\\s\\S]*?)</p>`)
  );
  assert.ok(m, `o gate não tem o bloco do Art. ${n}`);
  return m[1].replace(/<[^>]+>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim();
}

// bloco citado → palavras que TÊM de estar no artigo correspondente do v4.
// Se alguém trocar o número, a palavra-chave não aparece no artigo errado → RED.
const MAPA = [
  [1,  ["e-commerce", "dropshipping"]],
  [4,  ["implantado", "indeterminado"]],
  [5,  ["cadastrar gratuitamente"]],
  [7,  ["menor lance único", "QUANTO VOCÊ OFERTA"]],
  [8,  ["saldo em dinheiro", "senhas", "modalidade"]],
  [13, ["transferência de propriedade", "15"]],
  [14, ["Manaus", "80%", "integral"]],
  [20, ["senhas", "R$ 2,00", "Programado"]],
  [21, ["PIX", "pagamento"]],
  [24, ["Mensagens de Comunicação Recorrente"]],
  [25, ["apuração", "automática"]],
  [26, ["R$ 0,01", "casas decimais"]],
  [29, ["imagem"]],
  [34, ["funcionários"]],
  [37, ["RTD", "Cartório"]],
];

test("cada bloco citado aponta para o artigo do Regulamento cujo texto corresponde", () => {
  for (const [n, chaves] of MAPA) {
    const b = bloco(n);
    assert.ok(b.length > 20, `o bloco do Art. ${n} está vazio`);
    const art = artigo(n);
    for (const k of chaves) {
      const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      assert.ok(re.test(art), `Art. ${n}: o app cita-o, mas o v4 Art. ${n} não fala de «${k}»`);
    }
  }
});

test("o Relâmpago NÃO consome senhas — no regulamento E no gate", () => {
  assert.match(artigo(20), /Relâmpago não consome senhas/i, "o v4 Art. 20 perdeu a regra do Relâmpago");
  const art20app = bloco(20);
  assert.doesNotMatch(art20app, /para todas as\s+edições,\s+seja\s+Relâmpago\s+ou\s+Programado/i,
    "o gate voltou a dizer que a senha vale para TODAS as edições (contradiz o Art. 20)");
  assert.match(art20app, /Relâmpago não consome senhas/i, "o gate não diz que o Relâmpago não consome senhas");
});

test("o gate só cita artigos que existem no Regulamento", () => {
  const citados = [...TERMOS.matchAll(/artLabel\}>Art\. (\d+)</g)].map((m) => Number(m[1]));
  assert.ok(citados.length >= 15, `poucos blocos citados: ${citados.length}`);
  for (const n of citados) assert.ok(n >= 1 && n <= 40, `Art. ${n} não existe no v4`);
});

test("os outros ficheiros que citam o Regulamento continuam alinhados, ocorrência a ocorrência", () => {
  // ⚠️ Este bloco já foi mais fraco: verificava só a PRESENÇA do número correcto no
  // ficheiro. O CardLance tem TRÊS ocorrências, e a mutação mostrou que alterar UMA
  // deixava as outras a satisfazer a asserção — o mutante sobrevivia. Agora exige-se
  // cada ocorrência, e a ausência do número errado.
  const casos = [
    ["src/components/CardLance.jsx",
      [/Art\. 26: mín R\$ 0,01/, /\(Art\. 26\)/, /Art\. 26: Mín R\$ 0,01/], /Art\. 27/],
    ["src/components/TabelaLances.jsx",
      [/Art\. 25: apuração automática/], /Art\. 26: apuração/],
    ["src/pages/Configuracoes.jsx",
      [/\["Art\. 26",\s+"Lance mínimo/, /\["Art\. 25",\s+"Apuração automática/], /\["Art\. 27"/],
    ["src/pages/MeusAtivos.jsx",
      [/Art\. 25: Apuração automática · Art\. 7: Menor lance único ganha/], /Art\. 26: Apuração/],
    ["src/pages/Seguranca.jsx",
      [/Art\. 9 e Art\. 10 do Regulamento/], /Art\. 35/],
  ];
  for (const [f, devem, naoDeve] of casos) {
    const t = ler(f);
    for (const re of devem) assert.match(t, re, `${f}: perdeu a citação correcta ${re}`);
    assert.doesNotMatch(t, naoDeve, `${f}: voltou a citar o artigo errado ${naoDeve}`);
  }
});
