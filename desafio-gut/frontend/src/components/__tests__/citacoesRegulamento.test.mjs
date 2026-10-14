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
const V5 = ler("../../docs/REGULAMENTO-v5.md");
const TERMOS = ler("src/components/TermosConsentimento.jsx");

const norm = (s) => s.replace(/\s+/g, " ").trim();

/** Texto do artigo N do v5: da linha «Art. Nº —» até ao próximo artigo/capítulo, sem os «- » das alíneas. */
function artigoV5(n) {
  const linhas = V5.split(/\r?\n/);
  const i = linhas.findIndex((l) => l.startsWith(`Art. ${n}º — `));
  assert.ok(i >= 0, `o v5 não tem o Art. ${n}º`);
  const out = [linhas[i].slice(`Art. ${n}º — `.length)];
  for (const l of linhas.slice(i + 1)) {
    if (/^Art\. \d+º — /.test(l) || /^CAPÍTULO /.test(l)) break;
    out.push(l.replace(/^- /, ""));
  }
  return norm(out.join(" "));
}

/** Texto do bloco do artigo N no gate (tags e expressões JSX fora). */
function bloco(n) {
  const m = TERMOS.match(new RegExp(`artLabel\\}>Art\\. ${n}º</strong> — ([\\s\\S]*?)</p>`));
  assert.ok(m, `o gate não tem o bloco do Art. ${n}º`);
  return norm(m[1].replace(/<[^>]+>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+([.,;:)])/g, "$1"));
}

/** O bloco é um trecho LITERAL do artigo? (o ponto final do bloco pode ser o fim de uma frase que continua no artigo) */
const trechoDoArtigo = (txtBloco, txtArtigo) => {
  const b = txtBloco.replace(/\.$/, "");
  return b.length > 20 && txtArtigo.includes(b);
};

const citados = () => [...TERMOS.matchAll(/artLabel\}>Art\. (\d+)º</g)].map((m) => Number(m[1]));

test("controlo positivo: o v5 é legível e o leitor de artigos encontra o que deve", () => {
  assert.ok(V5.length > 15000, "o Regulamento v5 não foi lido — medição inválida");
  assert.match(artigoV5(14), /competição de habilidade/);
  assert.match(artigoV5(2), /Oferta Programada: modalidade de palpite/, "alíneas do Art. 2º não foram juntas");
  assert.ok(citados().length >= 10, `poucos blocos citados no gate: ${citados().length}`);
});

test("cada bloco do gate é TEXTO LITERAL do artigo do v5 que cita (nada de redacção nova)", () => {
  const maus = [];
  for (const n of citados()) {
    const b = bloco(n);
    if (!trechoDoArtigo(b, artigoV5(n))) maus.push(`Art. ${n}º: «${b.slice(0, 90)}…» não está no artigo`);
  }
  assert.deepEqual(maus, [], "blocos do gate que não são texto do v5:\n" + maus.join("\n"));
});

test("BIDIRECCIONAL: o mesmo verificador REPROVA blocos do gate antigo (v4)", () => {
  // Trechos LITERAIS do gate até ao UTAC110h (Art. 8 e Art. 20 do v4), com o número que citavam.
  const antigos = [
    [8,  "O participante poderá ofertar lances por meio de saldo em dinheiro, na modalidade Relâmpago (Flash), ou de senhas, na modalidade Programado (adquiridas pela conversão de saldo)"],
    [6,  "As senhas, quando utilizadas na modalidade Programado, têm custo unitário de R$ 2,00 (dois reais), adquiridas exclusivamente pela conversão de saldo em dinheiro"],
    [1,  "O DesafioGUT é uma atividade comercial em formato de E-commerce através de Dropshipping, operada pelo Grupo União e Trabalho (GUT)"],
  ];
  for (const [n, txt] of antigos) {
    assert.equal(trechoDoArtigo(norm(txt), artigoV5(n)), false, `o verificador aceitou texto do gate antigo como Art. ${n}º do v5`);
  }
});

test("o gate só cita artigos que existem no v5 (1..72) e cita os que o resumo exige", () => {
  const c = citados();
  for (const n of c) assert.ok(n >= 1 && n <= 72, `Art. ${n}º não existe no v5`);
  // Passe (6º), pontos (8º/9º), competição de habilidade (14º), ECOQUILDO (47º), imagem (66º).
  for (const n of [1, 6, 8, 9, 14, 47, 66]) assert.ok(c.includes(n), `o resumo perdeu o Art. ${n}º`);
});

test("vocabulário do gate: v5 presente, modelo antigo ausente (texto inteiro, sem comentários)", () => {
  const visivel = TERMOS.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ")
    .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
  for (const re of [/\bsenhas?\b/i, /torneio/i, /Portaria SPA/i, /1\.207\/2024/, /Agência\s+\d/i, /\bTED\b/])
    assert.doesNotMatch(visivel, re, `o gate voltou a dizer ${re}`);
  for (const re of [/Passe Desafio/, /R\$ 2,00/, /pontos de fidelidade/, /ECOQUILDO/, /competição de\s+habilidade/])
    assert.match(visivel, re, `o gate perdeu ${re}`);
});

test("a caixa «termos» repete os números do v5 (Art. 6º R$ 2,00 · Art. 8º 10 pontos) — achado X1 do SEG4", () => {
  const m = TERMOS.match(/Aceito os Termos de Participação:([^<]*)<\/span>/);
  assert.ok(m, "não encontrei a caixa «termos»");
  const preco = m[1].match(/R\$ ([\d,]+)/), pontos = m[1].match(/concede (\d+) pontos de fidelidade/);
  assert.ok(preco && pontos, `a caixa perdeu preço ou pontos: «${m[1]}»`);
  assert.ok(artigoV5(6).includes(`R$ ${preco[1]} (dois reais)`), `R$ ${preco[1]} não é o preço do Art. 6º`);
  assert.ok(artigoV5(8).includes(`${pontos[1]} (dez) pontos de fidelidade`), `${pontos[1]} pontos não é o Art. 8º`);
});

test("o gate não apresenta datas que o v5 não regista", () => {
  assert.doesNotMatch(TERMOS, /junho|5 de outubro de 2026/i, "o gate voltou a uma data do v4");
  assert.match(TERMOS, /2 de novembro de 2026/, "o gate perdeu a vigência do v5 (Art. 4º: 02 de novembro de 2026)");
  assert.match(V5, /Vigente a partir de 02 de novembro de 2026/, "o v5 mudou a vigência — actualizar o gate");
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

// ⚠️ UTAC110h.1 — estes ficheiros AINDA citam o v4 (alinhamento regulamento ↔ app = UTAC110j, P4).
// O teste fica como estava: guarda contra o artigo ERRADO dentro da numeração que cada um usa.
test("os outros ficheiros que citam o Regulamento continuam alinhados, ocorrência a ocorrência", () => {
  // ⚠️ Este bloco já foi mais fraco: verificava só a PRESENÇA do número correcto no
  // ficheiro. O CardLance tem TRÊS ocorrências, e a mutação mostrou que alterar UMA
  // deixava as outras a satisfazer a asserção — o mutante sobrevivia.
  const casos = [
    ["src/components/CardLance.jsx",
      [/Art\. 26: mín R\$ 0,01/, /\(Art\. 26\)/, /Art\. 26: Mín R\$ 0,01/], /Art\. 27/],
    // UTAC107d (R18-D, mockup completo) — o rodapé «🔒 Dados sanitizados · Art. 25: apuração
    // automática» saiu da tabela. A citação continua nos outros ficheiros desta lista
    // (Configurações, Meus Ativos); aqui fica só a guarda contra o artigo ERRADO.
    ["src/components/TabelaLances.jsx", [], /Art\. 26: apuração/],
    ["src/pages/Configuracoes.jsx",
      [/\["Art\. 26",\s+"Lance mínimo/, /\["Art\. 25",\s+"Apuração automática/], /\["Art\. 27"/],
    ["src/pages/MeusAtivos.jsx",
      [/Art\. 25: Apuração automática · Art\. 7: Menor lance único ganha/], /Art\. 26: Apuração/],
    // UTAC108f — `Seguranca.jsx` (só do lojista) foi apagada com o painel do lojista.
  ];
  for (const [f, devem, naoDeve] of casos) {
    const t = ler(f);
    for (const re of devem) assert.match(t, re, `${f}: perdeu a citação correcta ${re}`);
    assert.doesNotMatch(t, naoDeve, `${f}: voltou a citar o artigo errado ${naoDeve}`);
  }
});
