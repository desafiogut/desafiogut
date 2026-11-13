// citacoesRegulamento.test.mjs — MC95 / MC95.2 → UTAC110h.1 (Regulamento v5.0).
//
// INVARIANTE: cada bloco de artigo do gate de consentimento tem de apontar para o artigo
// do Regulamento cujo TEXTO corresponde — E o texto do bloco tem de ser o do artigo.
//
// ⚠️ HISTÓRIA DESTE TESTE (vale a pena ler antes de o "simplificar"):
//
// 1. Em 2026-09-25 (MC95) mediu-se que o gate citava 8 dos 15 artigos com o número errado,
//    incluindo o Art. 20 a dizer que «cada senha custa R$ 2,00 para todas as edições, seja
//    Relâmpago ou Programado» — quando o Art. 20 diz o contrário. O utilizador aceitava, no
//    gate legal, texto que contradizia o Regulamento que ia a cartório.
//
// 2. A 1.ª versão deste teste verificava só (a) bloco não-vazio e (b) palavras-chave curadas
//    no artigo. Uma auditoria adversarial mostrou que isso NÃO trava o que o nome promete:
//    repor um bloco na redacção antiga dava 9/9 PASS. Passou a verificar NOS DOIS SENTIDOS.
//
// 3. UTAC110h.1 (2026-10-14): o gate passou do Regulamento v4 para o **v5.0**
//    (`docs/REGULAMENTO-v5.md`, 12 capítulos, 72 artigos). A verificação ficou MAIS forte do
//    que as palavras-chave: cada bloco do gate tem de ser um TRECHO LITERAL do artigo que cita
//    (espaços normalizados). Os blocos do v4 (senhas, PIX/agência, «O MENOR LANCE ÚNICO GANHA»)
//    deixaram de existir; o texto antigo continua no histórico do git, e há um controlo
//    BIDIRECCIONAL abaixo: o mesmo verificador REPROVA blocos do gate antigo.
//
// node --test --test-concurrency=1 src/components/__tests__/citacoesRegulamento.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ler = (p) => readFileSync(resolve(process.cwd(), p), "utf8");
// ⚠️ UTAC137 — o gate passou ao Regulamento **v6.0** (`docs/REGULAMENTO-v6.md`, o texto registado no RTD). Esta
// guarda passou a verificar contra o v6, com a mesma força: cada bloco do gate tem de ser TEXTO LITERAL do artigo que
// cita. O v6 escreve «Art. 1º O presente…» e «Art. 10. A…» (uma linha por artigo, sem travessão).
const V6 = ler("../../docs/REGULAMENTO-v6.md");
const TERMOS = ler("src/components/TermosConsentimento.jsx");

const norm = (s) => s.replace(/\s+/g, " ").trim();

/** Texto do artigo N do v6 (uma linha por artigo). */
function artigoV6(n) {
  const re = new RegExp(`^Art\\. ${n}(?:º|\\.) (.*)$`);
  const linha = V6.split(/\r?\n/).map((l) => l.trim()).find((l) => re.test(l));
  assert.ok(linha, `o v6 não tem o Art. ${n}`);
  return norm(linha.match(re)[1]);
}

/** Texto do bloco do artigo N no gate (tags e expressões JSX fora). */
function bloco(n) {
  const m = TERMOS.match(new RegExp(`artLabel\\}>Art\\. ${n}(?:º|\\.)</strong> — ([\\s\\S]*?)</p>`));
  assert.ok(m, `o gate não tem o bloco do Art. ${n}`);
  return norm(m[1].replace(/<[^>]+>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+([.,;:)])/g, "$1"));
}

/** O bloco é um trecho LITERAL do artigo? */
const trechoDoArtigo = (txtBloco, txtArtigo) => {
  const b = txtBloco.replace(/\.$/, "");
  return b.length > 20 && txtArtigo.includes(b);
};

const citados = () => [...TERMOS.matchAll(/artLabel\}>Art\. (\d+)(?:º|\.)</g)].map((m) => Number(m[1]));

test("controlo positivo: o v6 é legível e o leitor de artigos encontra o que deve", () => {
  assert.ok(V6.length > 6000, "o Regulamento v6 não foi lido — medição inválida");
  assert.match(artigoV6(11), /habilidade, estratégia e menor valor único de lance/);
  assert.match(artigoV6(6), /o Passe não concede pontos de lance/);
  assert.match(artigoV6(30), /Cartório de Títulos e Documentos/);
  assert.ok(citados().length >= 10, `poucos blocos citados no gate: ${citados().length}`);
});

test("cada bloco do gate é TEXTO LITERAL do artigo do v6 que cita (nada de redacção nova)", () => {
  const maus = [];
  for (const n of citados()) {
    const b = bloco(n);
    if (!trechoDoArtigo(b, artigoV6(n))) maus.push(`Art. ${n}: «${b.slice(0, 90)}…» não está no artigo`);
  }
  assert.deepEqual(maus, [], "blocos do gate que não são texto do v6:\n" + maus.join("\n"));
});

test("BIDIRECCIONAL: o mesmo verificador REPROVA os blocos do gate do v5.0 (até ao UTAC136)", () => {
  // Trechos LITERAIS do gate do v5.0, com o número que citavam.
  const antigos = [
    [8,  "Cada Passe Desafio adquirido concede ao utilizador 10 (dez) pontos de fidelidade"],
    [6,  "O Passe Desafio é o produto digital adquirido pelo utilizador, com preço fixo de R$ 2,00 (dois reais), nas modalidades Passe Relâmpago e Passe Programado"],
    [1,  "O DesafioGUT é um programa de fidelidade gamificado operado pela Associação Recreativa dos Nordestinos no Amazonas"],
    [21, "O ECOQUILDO é uma moeda social interna do Grupo União e Trabalho, com lastro em reais à razão de 1 ECOQUILDO = R$ 1,00 (um real)"],
  ];
  for (const [n, txt] of antigos) {
    assert.equal(trechoDoArtigo(norm(txt), artigoV6(n)), false, `o verificador aceitou texto do gate v5 como Art. ${n} do v6`);
  }
});

test("o gate só cita artigos que existem no v6 (1..30) e cita os que o resumo exige", () => {
  const c = citados();
  for (const n of c) assert.ok(n >= 1 && n <= 30, `Art. ${n} não existe no v6`);
  // identificação (1º), 18+ (2º), Passe opcional/preço/sem pontos de lance/1 ponto (3º/5º/6º/7º), cartão (8º),
  // habilidade (11.), ECOQUILDO R$ 0,50 e conversão (21./23.).
  for (const n of [1, 2, 3, 5, 6, 7, 8, 11, 21, 23]) assert.ok(c.includes(n), `o resumo perdeu o Art. ${n}`);
});

test("vocabulário do gate: v6 presente, modelo antigo ausente (texto inteiro, sem comentários)", () => {
  const visivel = TERMOS.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ")
    .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
  for (const re of [/\bsenhas?\b/i, /torneio/i, /Portaria SPA/i, /1\.207\/2024/, /Agência\s+\d/i, /\bTED\b/,
                    /10 \(dez\) pontos/, /10 pontos de fidelidade/, /R\$ 1,00/, /200 pontos/, /v5\.0/])
    assert.doesNotMatch(visivel, re, `o gate voltou a dizer ${re}`);
  for (const re of [/Passe Desafio/, /R\$ 2,00/, /pontos de fidelidade/, /ECOQUILDO/, /menor valor único de lance/,
                    /o Passe não concede pontos de lance/, /R\$ 0,50/, /Regulamento Oficial v6\.0/])
    assert.match(visivel, re, `o gate perdeu ${re}`);
});

test("a caixa «termos» repete os números do v6 (Art. 5º R$ 2,00 · Art. 7º 1 ponto) — achado X1 do SEG4", () => {
  const m = TERMOS.match(/Aceito os Termos de Participação:([^<]*)<\/span>/);
  assert.ok(m, "não encontrei a caixa «termos»");
  const preco = m[1].match(/R\$ ([\d,]+)/), pontos = m[1].match(/concede (\d+) ponto/);
  assert.ok(preco && pontos, `a caixa perdeu preço ou pontos: «${m[1]}»`);
  assert.ok(artigoV6(5).includes(`R$ ${preco[1]} (dois reais)`), `R$ ${preco[1]} não é o preço do Art. 5º`);
  assert.ok(artigoV6(7).includes(`${pontos[1]} (um) ponto de fidelidade`), `${pontos[1]} ponto não é o Art. 7º`);
  assert.match(m[1], /sem pontos de lance/, "a caixa tem de dizer que o Passe não dá pontos de lance (Art. 6º)");
});

test("o gate não apresenta datas que o v6 não regista", () => {
  assert.doesNotMatch(TERMOS, /junho|5 de outubro de 2026|2 de novembro de 2026/i, "o gate voltou a uma data do v4/v5");
  assert.match(TERMOS, /registo no Cartório de Títulos e Documentos/, "o gate perdeu a vigência do v6 (Art. 30)");
  assert.match(V6, /vigência inicia-se na data do seu respectivo registro no Cartório de Títulos e Documentos/,
    "o v6 mudou a vigência — actualizar o gate");
});

test("o gate liga para o v5 integral em /regras-oficiais, e a rota é pública (lê-se ANTES de aceitar)", () => {
  // Os DOIS sítios: no fim do resumo e na caixa «Li e compreendi» (é aí que se declara ter lido).
  assert.match(TERMOS, /Regras completas[\s\S]{0,160}<a href="\/regras-oficiais"/, "o resumo perdeu o link para as Regras Oficiais");
  assert.match(TERMOS, /Li e compreendi o regulamento completo[\s\S]{0,200}<a href="\/regras-oficiais"/,
    "a caixa «Li e compreendi» perdeu o link para o regulamento que declara ter lido");
  const boot = ler("src/Boot.jsx");
  const m = boot.match(/const ROTAS_PUBLICAS = \[([^\]]*)\]/);
  assert.ok(m, "não encontrei ROTAS_PUBLICAS no Boot.jsx");
  assert.match(m[1], /"\/regras-oficiais"/, "a /regras-oficiais não é pública — o link do gate devolvia o próprio gate");
});

// UTAC110j (R18-110j-4) — estes ficheiros citavam o v4 (Arts. 7/8/20/25/26) e passaram ao v5:
// Art. 20 → Art. 6º (Passe R$ 2,00); Art. 7/8 → Art. 14º (menor lance único); Arts. 25 e 26 não
// existem no v5 → a citação saiu (e o texto que só dependia dela). A guarda continua OCORRÊNCIA A
// OCORRÊNCIA (a lição do mutante que sobrevivia quando se verificava só a presença) e ganha a outra
// direcção: nenhuma citação v4 órfã pode voltar.
// UTAC137 — a mesma guarda, agora no v6: Art. 6º → 5º (preço do Passe), Art. 14º → 11. (menor valor único de lance).
test("os outros ficheiros que citam o Regulamento estão no v6, ocorrência a ocorrência (era v5)", () => {
  const ORFAOS_V4 = /Art\.\s*(?:7|8|20|25|26)\b(?!º)/;
  const casos = [
    ["src/components/CardLance.jsx",          [/Mín R\$ 0,01 · Máx 5 lances\/min/]],
    ["src/components/glass/ComingSoonHero.jsx", [/Menor valor único de lance vence · Art\. 11\./]],
    ["src/pages/Configuracoes.jsx",           [/\["Art\. 5º",\s+"Passe Desafio: R\$ 2,00\."\]/]],
    ["src/pages/MeusAtivos.jsx",              [/Art\. 11\.: vence o menor valor único de lance/]],
    ["src/pages/MinhaCarteira.jsx",           [/Passe Desafio: R\$ \{VALOR_POR_SENHA_BRL\.toFixed\(2\)\} \(Art\. 5º\)/]],
    // UTAC107d — o rodapé da TabelaLances já tinha saído; fica a guarda contra o regresso.
    ["src/components/TabelaLances.jsx",       []],
  ];
  for (const [f, devem] of casos) {
    // Comentários fora (os comentários de UTAC citam os números antigos de propósito).
    const t = ler(f).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/[^\n]*/g, " ");
    for (const re of devem) assert.match(t, re, `${f}: perdeu a citação v6 ${re}`);
    assert.doesNotMatch(t, /Art\. 14º|\["Art\. 6º"|\(Art\. 6º\)/, `${f}: voltou a citar o v5 (Art. 14º / Art. 6º do preço)`);
    assert.doesNotMatch(t, ORFAOS_V4, `${f}: voltou a citar um artigo do v4 (7/8/20/25/26)`);
  }
});
