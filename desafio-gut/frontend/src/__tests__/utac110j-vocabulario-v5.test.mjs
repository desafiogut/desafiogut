// utac110j-vocabulario-v5.test.mjs — UTAC110j: a UI alinhada ao Regulamento v5 (decisões R18-110j-1..5).
//
// O que trava (cada guarda tem um mutante em `scripts/utac110j-prova-mutacao.mjs`):
//   1-B  a copy do ramo Programado (legado/inalcançável) não volta a prometer «senha a R$ 2,00»;
//        o código fica, marcado legado, com UMA mensagem (`MSG_PROGRAMADO_LEGADO`).
//   1-E  o depósito PIX fala em R$, não em «senhas» — e o COMPORTAMENTO não mudou (qtd × R$ 2,00).
//   1-A  as senhas antigas aparecem como «(on-chain, legado)».
//   1-D  a lista LGPD diz o que o `conta-delete` APAGA de facto (o registro off-chain) e o que RETÉM
//        (as senhas on-chain) — cruzado com o backend real, não com uma cópia da regra.
//   4    nenhuma citação de artigo do v4 sem correspondente (25/26) e as substituições (6º, 14º).
//   5a   «Prêmio» → «Produto»; 5b nota do LeilaoGUT; 2 cotas fora da UI do comprador.
// Mede a FONTE com os comentários retirados: os comentários de UTAC citam a copy antiga de propósito
// (lição do MC99 — uma guarda que lê comentários mede a menção, não o uso).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (p) => readFileSync(resolve(FRONT, p), "utf8");

/** Fora: comentários JSX, blocos e `//` (sem comer `://` de URLs). */
function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .join("\n");
}

/** Ficheiros de produção do frontend (sem testes, stubs nem cópias .bak). */
function ficheirosProducao() {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      if (["node_modules", "__tests__", "_stubs"].includes(e) || e.includes(".bak")) continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|mjs)$/.test(e) && !/\.test\./.test(e)) out.push(p);
    }
  })(resolve(FRONT, "src"));
  return out;
}

test("controlo: o stripper apaga a frase quando ela só está em comentário, e não apaga texto real", () => {
  assert.ok(!codigo("{/* consome 1 senha */}\n<p>x</p>").includes("consome 1 senha"));
  assert.ok(!codigo("// consome 1 senha\nconst a = 1;").includes("consome 1 senha"));
  assert.ok(codigo('<p>consome 1 senha</p>').includes("consome 1 senha"));
  assert.ok(codigo('const u = "https://x.y/z";').includes("https://x.y/z"), "o stripper comeu um URL");
});

// ── Varredura GLOBAL (todas as superfícies): as promessas do modelo antigo não voltam ─────────────
const PROMESSAS_V4 = [
  [/consome 1 senha/i, "lance que consome senha"],
  [/converte R\$ ?2,00/i, "conversão R$ 2,00 → senha"],
  [/R\$ ?→ ?senha|R\$ em senhas?\b/i, "conversão R$ → senha"],
  [/−1 senha/, "lance a −1 senha"],
  [/Quantas senhas\?/, "depósito em senhas"],
  [/troca por senhas/i, "troca R$ → senhas"],
  [/Pr[eê]mio (especial|em disputa)/i, "«Prêmio» na edição especial (v5: produto)"],
  [/Custo de cada senha/, "preço da senha (v4 Art. 20)"],
  // SEG4 (R3 do validador) — variantes que furavam a 1.ª versão:
  [/convert\w*\s+(?:o\s+)?R\$ ?2,00/i, "conversão de R$ 2,00 (outra conjugação)"],
  [/senha[^.\n<]{0,40}R\$ ?2,00|R\$ ?2,00 ?(?:\/|por) ?senha/i, "preço da senha (qualquer artigo citado)"],
  [/debita do saldo/i, "o lance debita R$ (B1: o lance consome 1 crédito de lance)"],
];
test("UTAC110j · nenhuma superfície de produção promete o modelo antigo (senha R$ 2,00, prémio)", () => {
  const fs_ = ficheirosProducao();
  assert.ok(fs_.length > 100, `a varredura viu ${fs_.length} ficheiros — medição suspeita`);
  const achados = [];
  for (const f of fs_) {
    const c = codigo(readFileSync(f, "utf8"));
    for (const [re, o] of PROMESSAS_V4) if (re.test(c)) achados.push(`${f.replace(/\\/g, "/").replace(/^.*\/frontend\//, "")}: ${o}`);
  }
  assert.deepEqual(achados, [], achados.join("\n"));
});

// ── 1-B · CardLance: copy fora, código fica, marcado legado ──────────────────────────────────────
test("1-B · o ramo Programado do CardLance usa só a mensagem de legado e continua no código", () => {
  const cru = ler("src/components/CardLance.jsx");
  const c = codigo(cru);
  assert.match(c, /export const MSG_PROGRAMADO_LEGADO = "Esta modalidade não está disponível\.";/);
  assert.match(c, /const isProgramado = modalidade === "programado";/, "o código do ramo foi removido (a decisão manda MANTER)");
  assert.match(cru, /LEGADO \/ INALCANÇÁVEL desde o UTAC108e\.1/, "falta o comentário que marca o ramo como legado");
  // A mensagem é usada nos sítios do ramo (erros + aviso + hint), não declarada à toa.
  assert.ok((c.match(/MSG_PROGRAMADO_LEGADO/g) || []).length >= 8, "a mensagem de legado não está a ser usada no ramo");
  // O Relâmpago (vivo) continua a dizer o que faz (R18-110j-3 = backend).
  // ⚠️ UTAC110j.5 — ALTERADO (declarado): o backend UTAC110n passou a gastar o VALOR do lance em pontos.
  // Asserção antiga: assert.match(c, /Cada lance consome 1 crédito de lance \(Passe Relâmpago\)/);
  // Invariante mantida: o hint diz o que o servidor faz — e o modelo antigo não pode voltar.
  assert.match(c, /Cada lance gasta o seu valor em pontos de lance \(um lance de 37 gasta 37\)/);
  assert.doesNotMatch(c, /Cada lance consome 1 crédito/);
});

test("1-B · o ramo Programado continua inalcançável: ninguém chama setModalidade", () => {
  for (const f of ficheirosProducao()) {
    const c = codigo(readFileSync(f, "utf8"));
    assert.doesNotMatch(c, /setModalidade\s*\(/, `${f}: alguém voltou a mudar a modalidade — o ramo legado deixa de ser inalcançável`);
  }
});

// ── 1-E · depósito PIX: copy em R$, comportamento intacto ────────────────────────────────────────
test("1-E · o depósito pergunta em R$ e o comportamento (qtd × R$ 2,00 ao backend) não mudou", () => {
  const c = codigo(ler("src/components/ComprarFichasModal.jsx"));
  // SEG4 (R1) — o campo conta UNIDADES de R$ 2,00: o rótulo tem de o dizer (escrever «10» = R$ 20,00).
  assert.match(c, /Quanto quer depositar\? \(em múltiplos de R\$ 2,00\)/);
  assert.match(c, /R\$ \{\(p \* VALOR_POR_SENHA_BRL\)\.toFixed\(2\)\.replace\("\.", ","\)\}/, "os botões de valor não mostram R$ com centavos");
  assert.match(c, /O saldo em R\$ serve para comprar o Passe Desafio/);
  assert.doesNotMatch(c, /\{qtd === 1 \? "senha" : "senhas"\}|\{pedido\.qtd === 1 \? "senha"/, "voltou a unidade «senhas»");
  // Comportamento: as mesmas constantes e o mesmo corpo enviado.
  assert.match(c, /const VALOR_POR_SENHA_BRL = 2;/);
  assert.match(c, /const PRESETS = \[1, 5, 10\];/);
  assert.match(c, /const valorBRL = qtd \* VALOR_POR_SENHA_BRL;/);
  assert.match(c, /const body = \{ endereco: address, qtd \};/);
});

// ── 1-A · senhas antigas = on-chain, legado ──────────────────────────────────────────────────────
test("1-A · as senhas antigas aparecem como «(on-chain, legado)» em Meus Ativos e na Carteira", () => {
  const ativos = codigo(ler("src/pages/MeusAtivos.jsx"));
  assert.match(ativos, /🎫 Senhas antigas \(on-chain, legado\)/);
  assert.match(ativos, /Ficam registradas on-chain \(legado\)\./);
  assert.doesNotMatch(ativos, /São usadas no Lance Programado/);
  assert.match(codigo(ler("src/pages/MinhaCarteira.jsx")), /senhas antigas"\} \(on-chain, legado\) → ver em Meus Ativos/);
});

// ── 1-D · LGPD = o que o backend faz ─────────────────────────────────────────────────────────────
test("1-D · a lista de exclusão diz o que o conta-delete APAGA e RETÉM (cruzado com o backend real)", () => {
  const back = ler("netlify/functions/_lib/conta-delete.mjs");
  // A verdade do backend: apaga o registro off-chain `troco_senhas`; as senhas on-chain não se apagam.
  assert.match(back, /SUPA_DELETE_POR_CLIENTE = \["saldo_rs", "troco_senhas", "wallet"\]/,
    "o conta-delete mudou o que apaga — rever a copy de exclusão (ela tem de dizer o mesmo)");
  const pag = codigo(ler("src/pages/ExcluirConta.jsx"));
  const iRet = pag.indexOf("Retido para cumprimento legal");
  assert.ok(iRet > 0, "controlo: não encontrei a lista «Retido»");
  const eliminados = pag.slice(0, iRet), retidos = pag.slice(iRet);
  assert.match(eliminados, /Saldo em R\$ e registro off-chain de senhas \(legado\)/);
  assert.doesNotMatch(eliminados, /senhas disponíveis|senhas on-chain/, "diz que apaga senhas on-chain — é falso");
  assert.match(retidos, /saldo de senhas on-chain \(legado\)/);
  const modal = codigo(ler("src/components/ExcluirContaModal.jsx"));
  // UTAC110j.1 — a lista do modal passou a ser item a item («O QUE É ELIMINADO» / «O QUE É RETIDO POR
  // LEI») e a cobrir as famílias que o 110j tinha escalado como pendência. O que NÃO pode mudar:
  // o on-chain nunca aparece como eliminado.
  const corte = (txt, nome) => {
    const i = txt.indexOf(`export const ${nome} = [`);
    assert.ok(i >= 0, `controlo: não encontrei a lista ${nome}`);
    return txt.slice(i, txt.indexOf("];", i));
  };
  const apagadosM = corte(modal, "APAGADOS"), retidosM = corte(modal, "RETIDOS");
  assert.match(apagadosM, /Saldo em R\$, registro off-chain de senhas e carteira/i);
  assert.doesNotMatch(apagadosM, /on-chain|senhas disponíveis/i,
    "a lista do que é ELIMINADO não pode incluir o on-chain — é falso");
  assert.match(retidosM, /saldo de senhas on-chain \(legado\)/);
  // UTAC110j.1 (R18-110j.1-1) — a LACUNA do 110j está fechada e DITA no ecrã.
  for (const [nome, re] of [
    ["pontos", /[Pp]ontos de fidelidade/],
    ["palpites", /Palpites do Passe Desafio/],
    ["resgates/morada", /Resgates do cartão colecionável — o registo da entrega/],
    ["indicações", /v[íi]nculos de indica/i],
    ["ECOQUILDO", /ECOQUILDO/],
    ["google_play_compras", /Google Play/],
  ]) assert.match(modal, re, `o modal não fala de ${nome} (a lacuna do UTAC110j.1)`);
  // ⚠️ O limite declarado do 110j («estas famílias não são apagadas nem declaradas») fica FECHADO:
  // a deriva política ↔ migração SQL ↔ texto dos dois ecrãs é agora verificada em
  // `netlify/functions/_tests/utac110j1-exclusao-lgpd.test.mjs` (deriva SQL↔JS e deriva JS↔ecrã).
});

// ── 4 · artigos ──────────────────────────────────────────────────────────────────────────────────
test("4 · Art. 20 → 6º, Art. 7/8 → 14º, Arts. 25/26 (sem correspondente no v5) fora da UI", () => {
  const conf = codigo(ler("src/pages/Configuracoes.jsx"));
  assert.match(conf, /\["Art\. 6º",\s+"Passe Desafio: R\$ 2,00\."\]/);
  assert.doesNotMatch(conf, /Apuração automática|Lance mínimo: R\$ 0,01/, "voltou o texto que só dependia de um artigo órfão");
  assert.match(codigo(ler("src/components/glass/ComingSoonHero.jsx")), /Menor lance único vence · Art\. 14º/);
  assert.match(codigo(ler("src/pages/MeusAtivos.jsx")), /Art\. 14º: Menor lance único ganha/);
  // O v5 tem mesmo esses dois artigos com esse assunto (não se inventa a correspondência).
  const v5 = readFileSync(resolve(FRONT, "..", "..", "docs", "REGULAMENTO-v5.md"), "utf8");
  assert.match(v5, /^Art\. 6º — O Passe Desafio .*R\$ 2,00/m);
  assert.match(v5, /^Art\. 14º — .*menor lance único/m);
  for (const f of ficheirosProducao()) {
    if (f.replace(/\\/g, "/").endsWith("components/TermosConsentimento.jsx")) continue; // o gate cita o v5 (teste próprio)
    const c = codigo(readFileSync(f, "utf8"));
    // SEG4 (R3) — também «Artigo 25» / «Art.25» e os 7/8 do v4 sem o º (o v5 escreve sempre «Nº»).
    assert.doesNotMatch(c, /Art(?:igo|\.)?\s*(?:7|8|20|25|26)\b(?!º)/i, `${f}: citação de artigo do v4 sem correspondente no v5`);
  }
});

// ── 5a/5b/2 ──────────────────────────────────────────────────────────────────────────────────────
test("5a · a edição especial fala de «Produto», e o dicionário bate com o fallback", () => {
  const card = codigo(ler("src/components/edicao-especial/CardEdicaoEspecial.jsx"));
  assert.match(card, /t\("edicao\.especial\.premioEmDisputa", "Produto em disputa"\)/);
  assert.match(card, /t\("edicao\.especial\.premio", "Produto especial"\)/);
  const pt = ler("src/i18n/pt.js");
  assert.match(pt, /"edicao\.especial\.premioEmDisputa": "Produto em disputa",/);
});

test("3 (B1 do validador) · a regra da edição especial diz «crédito de lance», não débito em R$", () => {
  const card = codigo(ler("src/components/edicao-especial/CardEdicaoEspecial.jsx"));
  // ⚠️ UTAC110j.5 / DEBT-075 (2026-10-18): o texto do UTAC110j («cada lance consome 1 crédito de lance»,
  // conservado aqui à vista) descrevia um crédito que já não existe. Passou a dizer o modelo em vigor: o
  // lance gasta o SEU VALOR em pontos de lance e o Passe é que dá +200. O título do teste fica histórico.
  const frase = "Lance relâmpago · vence o menor lance único · cada lance gasta o seu valor em pontos de lance · o Passe dá +200 pontos de lance";
  assert.ok(card.includes(`t("edicao.especial.regra", "${frase}")`), "o fallback da regra da especial mudou");
  // ⚠️ comparação por TEXTO, não por RegExp: a frase tem «+200» e o `+` é quantificador em regex
  // (a 1.ª versão deste teste deu falso vermelho por isso).
  assert.ok(ler("src/i18n/pt.js").includes(`"edicao.especial.regra": "${frase}",`),
    "o i18n não tem a frase nova");
  // O crédito não pode reaparecer no texto visível da especial nem no i18n.
  for (const f of ["src/components/edicao-especial/CardEdicaoEspecial.jsx", "src/i18n/pt.js"]) {
    assert.doesNotMatch(codigo(ler(f)).replace(/^\s*\/\/.*$/gm, ""), /1 crédito de lance/,
      `${f}: o crédito de lance já não existe no modelo`);
  }
});

test("5b · a Privacidade explica que LeilaoGUT é o nome do contrato on-chain (imutável)", () => {
  assert.match(codigo(ler("src/pages/Privacidade.jsx")), /smart contract LeilaoGUT \(nome do contrato on-chain, imutável\)/);
});

test("2 · cotas fora da UI do comprador (GUTO e Vitrine); o painel admin fica", () => {
  const chat = codigo(ler("src/components/ChatbotWidget.jsx"));
  assert.match(chat, /Pergunte sobre regras, pagamentos, vouchers ou o sistema "Indique e Ganhe"\./);
  assert.doesNotMatch(chat, /Pergunte sobre regras, cotas/);
  const vit = codigo(ler("src/pages/Vitrine.jsx"));
  assert.doesNotMatch(vit, /label="Cotas"|sistema de cotas/);
  // SEG4 (R3) — em TODAS as páginas do comprador (não só nas duas tocadas): nenhum texto JSX fala de cotas.
  const paginas = ficheirosProducao().filter((f) => /[\\/]pages[\\/][^\\/]+\.jsx$/.test(f));
  assert.ok(paginas.length > 10, "controlo: poucas páginas vistas");
  for (const f of paginas) {
    // Texto JSX = depois de `>` OU de `}` (ex.: `{" "}Texto`), até `<`/`{`, na mesma linha. As linhas
    // de chamada de API (`apiGet("cotas")`) não são texto ao utilizador.
    const linhas = codigo(readFileSync(f, "utf8")).split("\n").filter((l) => !/apiGet|apiPost|chamarAdmin|fetch\(/.test(l));
    const mau = linhas.find((l) => /[>}][^<{}\n]*\bcotas?\b/i.test(l));
    assert.equal(mau, undefined, `${f}: texto de «cotas» numa página do comprador → ${mau}`);
  }
  // Controlo: o admin continua com a gestão de patrocinadores (R18-110j-2: «manter tudo»).
  assert.match(codigo(ler("src/pages/admin/Cotas.jsx")), /Salvar cota/);
});
