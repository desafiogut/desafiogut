// citacoesRegulamento.test.mjs — MC95 / MC95.2.
//
// INVARIANTE: cada bloco de artigo do gate de consentimento tem de apontar para o artigo
// do Regulamento cujo TEXTO corresponde — E o texto do bloco tem de ser o do artigo.
//
// ⚠️ HISTÓRIA DESTE TESTE (vale a pena ler antes de o "simplificar"):
//
// 1. Em 2026-09-25 (MC95) mediu-se que o gate citava 8 dos 15 artigos com o número errado,
//    incluindo o Art. 20 a dizer que «cada senha custa R$ 2,00 para todas as edições, seja
//    Relâmpago ou Programado» — quando o Art. 20 diz o contrário (o Relâmpago NÃO consome
//    senhas). O utilizador aceitava, no gate legal, texto que contradizia o Regulamento
//    que ia a cartório.
//
// 2. A 1.ª versão deste teste verificava só (a) bloco não-vazio e (b) que o ARTIGO do v4
//    continha palavras-chave curadas. Uma auditoria adversarial independente mostrou que
//    isso NÃO trava o que o nome promete: repor o bloco Art. 14 ou Art. 24(d) na redacção
//    pré-MC95 dava **9/9 PASS, fail 0**. Ele nunca comparava o texto do BLOCO.
//
// 3. Esta versão verifica NOS DOIS SENTIDOS: as mesmas chaves têm de estar no artigo do v4
//    E no bloco do gate. É o que faz uma regressão de CONTEÚDO morrer (mutantes M-Q14 e
//    M-Q24 abaixo).
//
// node --test --test-concurrency=1 src/components/__tests__/citacoesRegulamento.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ler = (p) => readFileSync(resolve(process.cwd(), p), "utf8");
const V4 = ler("../../docs/REGULAMENTO-v4.md");
const TERMOS = ler("src/components/TermosConsentimento.jsx");

/** Texto do artigo N do v4. */
function artigo(n) {
  const m = V4.match(new RegExp(`^Art\\. ${n}º - (.*)$`, "m"));
  assert.ok(m, `o v4 não tem o Art. ${n}`);
  return m[1];
}

/** Texto do bloco do artigo N no gate (só o parágrafo; a lista de mensagens do Art. 24
 *  fica fora do <p>, por isso o Art. 24 é verificado contra o ficheiro inteiro). */
function bloco(n) {
  const m = TERMOS.match(new RegExp(`artLabel\\}>Art\\. ${n}</strong> — ([\\s\\S]*?)</p>`));
  assert.ok(m, `o gate não tem o bloco do Art. ${n}`);
  return m[1].replace(/<[^>]+>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim();
}
const alvo = (n, noFicheiroInteiro) => (noFicheiroInteiro ? TERMOS.replace(/\s+/g, " ") : bloco(n));

// [artigo, chaves que têm de estar NO ARTIGO DO V4 **E** NO BLOCO DO GATE, (opcional) usar o ficheiro inteiro]
const MAPA = [
  [1,  ["e-commerce", "dropshipping"]],
  [4,  ["implantado", "indeterminado"]],
  [5,  ["cadastrar gratuitamente"]],
  [6,  ["código único", "maior de idade"]],
  [7,  ["menor lance único", "QUANTO VOCÊ OFERTA"]],
  [8,  ["saldo em dinheiro", "senhas", "modalidade"]],
  [13, ["transferência de propriedade", "15"]],
  [14, ["Manaus/AM que optar por receber o prêmio em dinheiro receberá o valor integral", "80%"]],
  [20, ["R$ 2,00", "Programado", "Relâmpago não consome senhas"]],
  [21, ["PIX", "198627", "847534"]],
  [24, ["Mensagens de Comunicação Recorrente", "valor informado não é válido"], true],
  [25, ["apuração", "automática"]],
  [26, ["R$ 0,01", "casas decimais"]],
  [29, ["nome, imagem e som", "gratuitamente"]],
  [34, ["funcionários, colaboradores, prestadores"]],
  [37, ["RTD", "Cartório", "outubro de 2026", "5 (cinco)"]],
];

const esc = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

test("cada artigo citado: o TEXTO do bloco corresponde ao TEXTO do artigo do v4 (dois sentidos)", () => {
  for (const [n, chaves, inteiro] of MAPA) {
    const art = artigo(n);
    const txt = alvo(n, inteiro);
    assert.ok(txt.length > 20, `o Art. ${n} está vazio no gate`);
    for (const k of chaves) {
      assert.ok(esc(k).test(art), `v4 Art. ${n} não contém «${k}» — o mapa do teste está errado`);
      assert.ok(esc(k).test(txt), `GATE Art. ${n}: falta «${k}» — o texto do bloco não é o do artigo`);
    }
  }
});

test("o Relâmpago NÃO consome senhas — no regulamento E no gate", () => {
  assert.match(artigo(20), /Relâmpago não consome senhas/i, "o v4 Art. 20 perdeu a regra");
  const b = bloco(20);
  assert.doesNotMatch(b, /para todas as\s+edições,\s+seja\s+Relâmpago\s+ou\s+Programado/i,
    "o gate voltou a dizer que a senha vale para TODAS as edições (contradiz o Art. 20)");
  assert.match(b, /Relâmpago não consome senhas/i, "o gate não diz que o Relâmpago não consome senhas");
});

test("o gate não apresenta datas que o Regulamento não regista", () => {
  // A vigência do cabeçalho já foi «1º de junho de 2026» (em produção!) quando o v4 diz
  // 5 de outubro de 2026. Junho não existe em lado nenhum do Regulamento.
  assert.doesNotMatch(TERMOS, /junho/i, "o gate voltou a citar uma data de junho (o v4 não tem nenhuma)");
  assert.match(TERMOS, /5 de outubro de 2026/, "o gate perdeu a data de vigência do Regulamento");
});

test("nenhum bloco funde dois artigos, e não há texto que não seja de nenhum", () => {
  // O bloco «Art. 5» era uma FUSÃO: «cadastrar gratuitamente» (Art. 5) + «código único…
  // para comprar senhas e realizar lances» (Art. 6). A renomeação 6→5 corrigia metade.
  assert.doesNotMatch(TERMOS, /comprar senhas/i, "«comprar senhas» não existe em nenhum artigo do v4");
  const b5 = bloco(5), b6 = bloco(6);
  assert.match(b5, /cadastrar gratuitamente/, "o Art. 5 do gate perdeu o cadastro gratuito");
  assert.doesNotMatch(b5, /código único/, "o Art. 5 do gate voltou a fundir o conteúdo do Art. 6");
  assert.match(b6, /código único/, "o Art. 6 do gate perdeu o código único");
});

test("o gate só cita artigos que existem no Regulamento", () => {
  const citados = [...TERMOS.matchAll(/artLabel\}>Art\. (\d+)</g)].map((m) => Number(m[1]));
  assert.ok(citados.length >= 16, `poucos blocos citados: ${citados.length}`);
  for (const n of citados) assert.ok(n >= 1 && n <= 40, `Art. ${n} não existe no v4`);
});

test("os outros ficheiros que citam o Regulamento continuam alinhados, ocorrência a ocorrência", () => {
  // ⚠️ Este bloco já foi mais fraco: verificava só a PRESENÇA do número correcto no
  // ficheiro. O CardLance tem TRÊS ocorrências, e a mutação mostrou que alterar UMA
  // deixava as outras a satisfazer a asserção — o mutante sobrevivia.
  const casos = [
    ["src/components/CardLance.jsx",
      [/Art\. 26: mín R\$ 0,01/, /\(Art\. 26\)/, /Art\. 26: Mín R\$ 0,01/], /Art\. 27/],
    ["src/components/TabelaLances.jsx", [/Art\. 25: apuração automática/], /Art\. 26: apuração/],
    ["src/pages/Configuracoes.jsx",
      [/\["Art\. 26",\s+"Lance mínimo/, /\["Art\. 25",\s+"Apuração automática/], /\["Art\. 27"/],
    ["src/pages/MeusAtivos.jsx",
      [/Art\. 25: Apuração automática · Art\. 7: Menor lance único ganha/], /Art\. 26: Apuração/],
    ["src/pages/Seguranca.jsx", [/Art\. 9 e Art\. 10 do Regulamento/], /Art\. 35/],
  ];
  for (const [f, devem, naoDeve] of casos) {
    const t = ler(f);
    for (const re of devem) assert.match(t, re, `${f}: perdeu a citação correcta ${re}`);
    assert.doesNotMatch(t, naoDeve, `${f}: voltou a citar o artigo errado ${naoDeve}`);
  }
});
