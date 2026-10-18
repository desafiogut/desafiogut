// utac110m2-regulamento.test.mjs — UTAC110m.2. As correcções de TEXTO do Regulamento (frentes B, C
// e D) e a vigilância da frente A, que ficou BLOQUEADA.
//
// Porque este teste existe: as correcções são texto em três ficheiros que têm de dizer o MESMO
// (invariante do UTAC110k.1). Sem teste, a próxima edição do Regulamento volta a meter a «perda de
// métricas» que o código não implementa, ou o ECOQUILDO no app que a decisão R18-110e-2 proíbe.
//
// FRENTE A (Arts. 9º e 53º — o cartão é RESGATADO e não «adquirido») NÃO foi aplicada: o gate legal
// (`TermosConsentimento.jsx`, Art. 9º) tem de ser um TRECHO LITERAL do artigo (teste
// `citacoesRegulamento`), e esse ficheiro está fora da lista de autorizações deste UTAC. O último
// teste deste ficheiro VIGIA esse acoplamento: quem mudar o Art. 9º sozinho fica vermelho aqui, com
// a explicação, em vez de descobrir no meio de 1200 testes.
//
// node --test src/components/__tests__/utac110m2-regulamento.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ler = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\r\n/g, "\n");
const V5 = ler("../../../../../docs/REGULAMENTO-v5.md");
const GUTO = ler("../../../../../docs/GUTO-REGULAMENTO.md");
const MJS = ler("../../../netlify/functions/_lib/guto-regulamento.mjs");
const TERMOS = ler("../../components/TermosConsentimento.jsx");

const FONTES = [["REGULAMENTO-v5.md", V5], ["GUTO-REGULAMENTO.md", GUTO], ["guto-regulamento.mjs", MJS]];
const norm = (s) => s.replace(/\s+/g, " ").trim();

/** Texto do artigo N do v5 (mesma leitura do teste `citacoesRegulamento`). */
function artigoV5(n) {
  const linhas = V5.split("\n");
  const i = linhas.findIndex((l) => l.startsWith(`Art. ${n}º — `));
  assert.ok(i >= 0, `o v5 não tem o Art. ${n}º`);
  const out = [linhas[i].slice(`Art. ${n}º — `.length)];
  for (const l of linhas.slice(i + 1)) {
    if (/^Art\. \d+º — /.test(l) || /^CAPÍTULO /.test(l)) break;
    out.push(l.replace(/^- /, ""));
  }
  return norm(out.join(" "));
}

// ─────────────────── FRENTE B — a «perda de métricas» sai dos Arts. 21º e 32º ───────────────────
test("B: Arts. 21º e 32º deixam de prometer a perda de métricas (o código não tem esse mecanismo)", () => {
  for (const [nome, src] of FONTES) {
    assert.doesNotMatch(src, /perde o acesso às métricas do Desafio/, `${nome}: a perda de métricas não pode sobreviver`);
    assert.doesNotMatch(src, /benefício de (lance|palpite) opcional da edição seguinte/, `${nome}: idem para o benefício opcional`);
  }
  for (const n of [21, 32]) {
    const a = artigoV5(n);
    assert.match(a, /mantém integralmente os pontos de fidelidade e o ECOQUILDO adquiridos com o Passe/, `Art. ${n}º: tem de dizer o que MANTÉM`);
    assert.match(a, /acesso ao assistente virtual GUTO/, `Art. ${n}º: o GUTO mantém-se`);
  }
  // O que o artigo NÃO pode passar a prometer: nada de «perde» invertido em prémio novo.
  assert.doesNotMatch(artigoV5(21), /perde/, "Art. 21º: nenhuma perda nova pode entrar pela porta do texto");
  assert.doesNotMatch(artigoV5(32), /perde/, "Art. 32º: idem");
});

// ───────────────────── FRENTE C — o ECOQUILDO é do SITE, não do aplicativo ──────────────────────
// ⚠️ O 1.º texto desta correcção usava um «Parágrafo único» DEPOIS da alínea I. O validador adversarial
// (2.ª ronda, achado ⚠️1) mediu que a página `/regras-oficiais` cola qualquer parágrafo seguinte à
// ÚLTIMA alínea (`RegrasOficiais.jsx:74-75`, ramo `else if (ultimo)`) ⇒ o parágrafo saía DENTRO do
// `<li>`, invertendo a hierarquia legal (o parágrafo vale para o artigo, não para a alínea). O renderer
// está fora da autorização deste UTAC ⇒ a restrição passou para o CAPUT e o parágrafo único deixou de
// existir. As asserções abaixo fixam essa estrutura: a restrição tem de vir ANTES da alínea.
test("C: Art. 48º restringe o ECOQUILDO ao site no CAPUT (não num parágrafo dentro da alínea)", () => {
  for (const [nome, src] of FONTES) {
    assert.doesNotMatch(src, /Aquisição de novos Passes Desafio no aplicativo/, `${nome}: a alínea II antiga não pode sobreviver`);
    assert.doesNotMatch(src, /Parágrafo único — O ECOQUILDO/, `${nome}: não pode voltar a haver parágrafo único (a página desenha-o dentro da alínea)`);
    assert.match(src, /é utilizado exclusivamente no site oficial do Grupo União e Trabalho \(ecossistema GUT\), não sendo aceite como forma de pagamento dentro do aplicativo DesafioGUT\. Pode ser utilizado para:/,
      `${nome}: a restrição tem de estar no caput do artigo`);
  }
  const a = artigoV5(48);
  const iRestricao = a.indexOf("não sendo aceite como forma de pagamento dentro do aplicativo DesafioGUT");
  const iAlinea = a.indexOf("I — Aquisição de produtos e serviços");
  assert.ok(iRestricao > 0, "Art. 48º: a restrição ao site tem de estar no artigo");
  assert.ok(iAlinea > 0, "Art. 48º: a alínea I tem de existir");
  assert.ok(iRestricao < iAlinea,
    "Art. 48º: a restrição tem de vir ANTES da alínea — depois dela, a página /regras-oficiais desenha-a como parte do <li>");
  assert.match(a, /Aquisição de produtos e serviços no site oficial www\.grupouniaoetrabalho\.com\.br/, "Art. 48º: o uso no site mantém-se");
});

// ──────────────────────── FRENTE D — o DPO é canal oficial de LGPD ──────────────────────────────
test("D: Arts. 57º e 69º dão o DPO como canal de LGPD, e o Gmail fica como suporte geral", () => {
  const DPO = "dpo@grupouniaoetrabalho.com.br";
  for (const [nome, src] of FONTES) {
    assert.ok(src.includes(DPO), `${nome}: o e-mail do DPO tem de estar no texto`);
  }
  // O Art. 57º tem de nomear o DPO ANTES do Gmail (o DPO deixa de ser um caminho escondido).
  const a57 = artigoV5(57);
  const iDpo = a57.indexOf(DPO);
  const iGmail = a57.indexOf("desafiogut01@gmail.com");
  assert.ok(iDpo > 0, "Art. 57º: o DPO tem de estar no artigo");
  assert.ok(iGmail > 0, "Art. 57º: o Gmail não pode desaparecer (continua a ser suporte)");
  assert.ok(iDpo < iGmail, `Art. 57º: o DPO tem de vir ANTES do Gmail (DPO em ${iDpo}, Gmail em ${iGmail})`);
  assert.match(a57, /Encarregado de Proteção de Dados \(DPO\) dpo@grupouniaoetrabalho\.com\.br/, "Art. 57º: DPO nomeado como Encarregado");
  assert.match(artigoV5(69), /Encarregado de Proteção de Dados \(DPO\)/, "Art. 69º: o DPO tem de ser um canal nomeado");
  assert.doesNotMatch(artigoV5(69), /exclusivamente através do e-mail desafiogut01@gmail\.com/,
    "Art. 69º: «exclusivamente» contradiz o DPO — tinha de sair");
});

// ─────────────────────────── A INVARIANTE (corpo(v5) == corpo(GUTO)) ───────────────────────────
test("INVARIANTE: corpo(v5) e corpo(GUTO) continuam byte a byte iguais (e o .mjs diz o mesmo)", () => {
  const corpo = (md, modo) => (modo === "v5"
    ? md.slice(md.indexOf("\n---\n\n") + 6)
    : md.slice(md.indexOf("\nREGULAMENTO OFICIAL DO DESAFIOGUT\n") + 1));
  const a = corpo(V5, "v5");
  const b = corpo(GUTO, "guto");
  assert.equal(a, b, "os corpos do v5 e do GUTO têm de ser iguais — é a invariante do UTAC110k.1");
  // O .mjs é o runtime do GUTO: tem de conter cada frase nova, senão o assistente responde o antigo.
  for (const frase of [
    "mantém integralmente os pontos de fidelidade e o ECOQUILDO adquiridos com o Passe",
    "não sendo aceite como forma de pagamento dentro do aplicativo DesafioGUT",
    "Encarregado de Proteção de Dados (DPO) dpo@grupouniaoetrabalho.com.br",
  ]) assert.ok(MJS.includes(frase), `guto-regulamento.mjs: falta «${frase.slice(0, 50)}…»`);
});

// ─────────────── FRENTE A — o cartão é RESGATADO (não «adquirido» nem pago por PIX) ─────────────
// Esta frente esteve BLOQUEADA (DEBT-065) até o operador autorizar os dois ficheiros que a travavam:
// o gate legal (`TermosConsentimento.jsx`) e o dicionário do GUTO (`guto-perfis.mjs`). O acoplamento
// é o que a torna delicada: o bloco do gate tem de ser TRECHO LITERAL do artigo (`citacoesRegulamento`)
// e a âncora do GUTO tem de ser EXCERTO VERBATIM (`mc963`) — as asserções abaixo mantêm os dois.
test("A: Art. 9º resgata gratuitamente (50 pontos) e o Art. 53º tira o cartão do PIX", () => {
  const GATE = TERMOS;
  const PERFIS = ler("../../../netlify/functions/_lib/guto-perfis.mjs");
  const a9 = artigoV5(9);
  assert.match(a9, /poderá resgatar gratuitamente 1 \(um\) cartão/, "Art. 9º: tem de dizer RESGATAR");
  assert.doesNotMatch(a9, /poderá adquirir 1 \(um\) cartão/, "Art. 9º: «adquirir» não pode voltar");
  assert.match(a9, /sem qualquer pagamento adicional/, "Art. 9º: gratuidade explícita");
  assert.match(a9, /Esta proporção é fixa e igual para todos os utilizadores/, "proporção fixa mantida (Art. 6º/8º intactos)");

  const a53 = artigoV5(53);
  assert.doesNotMatch(a53, /cartão colecionável, produto patrocinado/, "Art. 53º: o cartão sai da lista do PIX");
  assert.match(a53, /produto patrocinado do Relâmpago\) poderá ser realizada via PIX/, "Art. 53º: o produto patrocinado continua por PIX");
  assert.match(a53, /cartão colecionável da Família Quildo não é adquirido por PIX: é resgatado gratuitamente com 50 \(cinquenta\) pontos de fidelidade, nos termos do Art\. 9º/,
    "Art. 53º: tem de remeter ao Art. 9º — é o que fecha a contradição");

  // o acoplamento que fez esta frente parar: gate e GUTO têm de acompanhar o artigo
  const m = GATE.match(/artLabel\}>Art\. 9º<\/strong> — ([\s\S]*?)<\/p>/);
  const blocoGate = norm(m[1].replace(/<[^>]+>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+([.,;:)])/g, "$1")).replace(/\.$/, "");
  assert.ok(a9.includes(blocoGate), "o bloco do Art. 9º no gate deixou de ser TRECHO LITERAL do artigo");
  assert.match(blocoGate, /resgatar gratuitamente/, "o gate tem de dizer o mesmo que o artigo");
  const ancoraGuto = PERFIS.match(/"9":\s+"([^"]+)"/)?.[1];
  assert.ok(ancoraGuto && a9.includes(ancoraGuto.replace(/\.$/, "")), "a âncora do Art. 9º no GUTO deixou de ser excerto VERBATIM");
  assert.match(ancoraGuto, /resgatar gratuitamente/, "o GUTO tem de responder o mesmo que o artigo");
});
