// UTAC106c — contratos do REDESENHO DA CARTEIRA + das 4 PENDÊNCIAS escaladas pelo UTAC106b.
//
// O que fica aqui (e o que NÃO reposiciona):
//   SEG0 · o vidro de saldo da Carteira: título «Carteira» e subtítulo «Saldo Disponível» AMBOS
//          em amarelo (COR.gold), com o valor do saldo a continuar a renderizar;
//   SEG1 · os botões: o antigo «Lance Relâmpago» passa a «Menor Lance Único» (destino `/mercado`,
//          a rota canónica do 106b) e nasce o botão «Comprar Passe Desafio R$ 2,00», que abre um
//          BALÃO de confirmação — sem lógica de compra (essa é do UTAC106e);
//   SEG2 · pendência #1: `/ofertas-programadas` entra no `rotasProibidas` (isolamento do lojista);
//   SEG3 · pendência #2: a frase de efeito passa de «paga» para «oferta» (Art. 7 do Regulamento);
//   SEG4 · pendência #3: o glossário cobre as formas VERBAIS (`apost\w*`, `sort\w*`);
//   SEG5 · pendência #4: a ordem dos itens SECUNDÁRIOS coincide entre a barra e o rail.
//
// ⚠️ LIMITE DECLARADO (o mesmo ℹN5 do UTAC106b): estes testes são de ANÁLISE ESTÁTICA sobre o
// texto-fonte — não provam render. A verificação por RENDER (ponte SSR do repo) é feita ad-hoc no
// SEG6 do UTAC106c e registada no log; a mutação que prova que estes testes MORDEM é do SEG6.
// Vive em `src/__tests__/`, logo `SRC` = `src/` (mesma convenção do `utac106b-navegacao-frases`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => readFileSync(resolve(SRC, p), "utf8");

/** Texto de CÓDIGO: fora comentários JSX multi-linha, blocos /* *\/ e `//` (de linha inteira e de
 * fim de linha). Copiado do `mc99-limpeza-ui.test.mjs` (é o mesmo padrão de remoção do repo) — a
 * contagem da ordem das navs encontrava rótulos DENTRO de comentários sem isto. */
function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .filter((l) => !/^\s*\*/.test(l))
    .join("\n");
}

const CART = codigo(ler("pages/MinhaCarteira.jsx"));

// ── Controlo positivo do extractor: sem isto, uma limpeza errada cegava TUDO ────────
test("UTAC106c · controlo positivo: o extractor vê o código e ignora os comentários", () => {
  assert.match(CART, /<GlassCard/, "o extractor apagou CÓDIGO — os testes seguintes seriam vacuosos");
  assert.ok(CART.includes("<h3"), "o <h3> do título não é visível ao extractor");
});

// ═══ SEG0 — Carteira: título + subtítulo ════════════════════════════════════════════
test("UTAC106c/SEG0 · o título do vidro de saldo é «Carteira» e está em AMARELO (COR.gold)", () => {
  const m = CART.match(/<h3 style=\{\{([^}]*)\}\}>Carteira<\/h3>/);
  assert.ok(m, "não encontrei `<h3 …>Carteira</h3>` — o título do UTAC106c desapareceu");
  assert.match(m[1], /color:\s*COR\.gold/, `o título não está em amarelo: «${m[1]}»`);
  // o nome ANTIGO não pode ter ficado a conviver com o novo (dois títulos na mesma dobra)
  assert.ok(!CART.includes("Minha Carteira"),
    "«Minha Carteira» continua no código — o título passou a ser «Carteira»");
});

test("UTAC106c/SEG0 · o subtítulo «Saldo Disponível» está em AMARELO (COR.gold)", () => {
  const i = CART.indexOf(">Saldo Disponível<");
  assert.ok(i > -1, "a etiqueta «Saldo Disponível» desapareceu do ecrã");
  const bloco = CART.slice(CART.lastIndexOf("<div style={{", i), i);
  assert.match(bloco, /color:\s*COR\.gold/, `o subtítulo não está em amarelo: «${bloco}»`);
  assert.doesNotMatch(bloco, /color:\s*COR\.muted/, `o subtítulo ficou em cinza (muted): «${bloco}»`);
});

test("UTAC106c/SEG0 · o VALOR do saldo continua a renderizar (não se perdeu o número)", () => {
  assert.match(CART, /R\$ \$\{saldoReais\.toFixed\(2\)\}/,
    "o valor do saldo deixou de ser renderizado no vidro");
  assert.match(CART, /saldoRsStatus === "loading" \? "R\$ …" : "R\$ —"/,
    "os estados de carregamento/sem-dados do saldo desapareceram");
});

// ═══ SEG1 — Carteira: botões ════════════════════════════════════════════════════════
test("UTAC106c/SEG1 · o botão existente é «Menor Lance Único» e navega para /mercado", () => {
  assert.match(CART, /⚡ Menor Lance Único/, "o botão deixou de ser «Menor Lance Único»");
  assert.ok(!/Lance Relâmpago<\/button>/.test(CART),
    "«Lance Relâmpago» continua a ser o rótulo de um botão da Carteira");
  const fn = CART.match(/function irParaMenorLanceUnico\(\)\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(fn, "a função `irParaMenorLanceUnico` desapareceu");
  assert.match(fn[1], /navigate\("\/mercado"\)/,
    "o botão deixou de navegar para `/mercado` (rota canónica do 106b)");
  assert.match(CART, /onClick=\{irParaMenorLanceUnico\}/,
    "o botão deixou de estar ligado à navegação");
});

test("UTAC106c/SEG1 · existe o botão «Comprar Passe Desafio R$ 2,00»", () => {
  assert.match(CART, /const PRECO_PASSE_DESAFIO = "R\$ 2,00";/,
    "o preço do Passe desapareceu (tem de estar literal «R$ 2,00», em pt-BR)");
  assert.match(CART, /Comprar Passe Desafio \$\{PRECO_PASSE_DESAFIO\}/,
    "o rótulo do botão «Comprar Passe Desafio R$ 2,00» desapareceu");
});

test("UTAC106c/SEG1 · o botão «Comprar Passe» abre o BALÃO, que fecha e COMPRA (UTAC106e)", () => {
  // UTAC106e — o balão passou de inline a COMPONENTE (`ComprarPasseModal`) e «Confirmar» deixou de
  // navegar: passou a COMPRAR. Guarda-se a invariante: o botão ABRE o balão, o balão FECHA por
  // «Cancelar» e «Confirmar» está ligado à compra.
  assert.match(CART, /onClick=\{\(\) => setPasseAberto\(true\)\}/,
    "o botão não abre o balão (falta `setPasseAberto(true)`)");
  assert.match(CART, /<ComprarPasseModal[\s\S]{0,240}aberto=\{passeAberto\}/,
    "não há um <ComprarPasseModal> ligado ao estado `passeAberto` (o balão não existe)");
  assert.match(CART, /onCancelar=\{\(\) => setPasseAberto\(false\)\}/,
    "o balão não fecha (falta o `onCancelar`)");
  assert.match(CART, /onConfirmar=\{async \(\) => \{[\s\S]{0,140}await comprarPasse\(\)/,
    "confirmar não chama `comprarPasse()` (o botão não está ligado ao endpoint do Passe)");
  // as DUAS saídas continuam a existir — agora no componente do balão.
  const MODAL = codigo(ler("components/ComprarPasseModal.jsx"));
  assert.match(MODAL, />\s*Cancelar\s*</, "o balão não tem o botão «Cancelar»");
  assert.match(MODAL, /"Confirmar"/, "o balão não tem o botão «Confirmar»");
});

test("UTAC106c/SEG1 · a Carteira delega a compra ao hook (sem I/O inline) — UTAC106e", () => {
  // UTAC106e — a Carteira PASSOU a comprar o Passe, mas SEM I/O inline: a chamada vive no hook
  // `useComprarPasse`. Mantém-se a invariante do 106c (o ECRÃ não faz fetch/apiPost) e acrescenta-se
  // a nova: o ecrã NUNCA referencia o endpoint da Via A (`comprar-passe`) — só o do Passe Via B.
  assert.doesNotMatch(CART, /fetch\(|apiPost|async function comprar/,
    "a Carteira voltou a fazer I/O inline — a chamada tem de viver no hook `useComprarPasse`");
  assert.match(CART, /useComprarPasse\(\)/, "a Carteira deixou de usar o hook de compra do Passe");
  assert.doesNotMatch(CART, /comprar-passe(?!-pontos)/,
    "a Carteira referencia o endpoint da Via A (`comprar-passe`) — só o `comprar-passe-pontos` é dela");
  // ⚠️ ARMADILHA MEDIDA (erro do MEU instrumento, 1.ª versão): `/saldoRsCentavos\s*=/` casava a
  // COMPARAÇÃO `saldoRsCentavos == null` (o `\s*` deixa o `=` casar o 1.º `=` de `==`) e acusava
  // uma escrita que não existe. Exigir que o `=` NÃO seja seguido de `=` fecha isso.
  assert.doesNotMatch(CART, /setSaldoRs|saldoRsCentavos\s*=[^=]/,
    "a Carteira passou a ESCREVER no saldo local (o saldo só se lê aqui)");
});

// ═══ SEG2 — pendência #1: /ofertas-programadas no rotasProibidas ════════════════════
test("UTAC106c/SEG2 · /ofertas-programadas está no rotasProibidas (expulsão do lojista)", () => {
  const ac = codigo(ler("context/AppContext.jsx"));
  const m = ac.match(/const rotasProibidas = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(m, "o `rotasProibidas` desapareceu do AppContext");
  const rotas = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(rotas.includes("/ofertas-programadas"),
    `a lista não expulsa o lojista de /ofertas-programadas: ${JSON.stringify(rotas)}`);
  // controlo: as rotas de consumo que já lá estavam continuam lá (não se substituiu a lista)
  for (const r of ["/carteira", "/mercado"]) {
    assert.ok(rotas.includes(r), `a lista perdeu ${r} — partiu o isolamento que já funcionava`);
  }
  // e o mecanismo de expulsão continua vivo
  assert.match(ac, /if \(rotasProibidas\.has\(location\.pathname\)\)\s*\{\s*navigate\("\/corporativo", \{ replace: true \}\)/,
    "o guarda que reencaminha o lojista desapareceu");
});

// ═══ SEG3 — pendência #2: copy «paga» → «oferta» ════════════════════════════════════
test("UTAC106c/SEG3 · a frase de efeito diz «oferta» (fecha a divergência com o Art. 7)", () => {
  const m = ler("pages/MercadoLances.jsx").match(/const FRASE_MENOR_LANCE_UNICO = "([^"]+)";/);
  assert.ok(m, "a constante FRASE_MENOR_LANCE_UNICO desapareceu");
  const frase = m[1];
  assert.equal(frase, "Quanto você oferta por esse item? O menor lance único leva!",
    `a copy corrente não é a decidida pelo operador: «${frase}»`);
  assert.match(frase, /oferta/i, "a frase deixou de dizer «oferta»");
  assert.doesNotMatch(frase, /paga/i, "a frase voltou a dizer «paga» (pendência #2 reaberta)");
  assert.match(frase, /menor lance único/i, "a frase perdeu o invariante da modalidade");
  // âncora no gate legal + trava de álea/aposta (mesmo padrão ALARGADO do glossário)
  assert.match(ler("components/TermosConsentimento.jsx"), /O MENOR LANCE ÚNICO GANHA/i,
    "o gate legal deixou de fixar «O MENOR LANCE ÚNICO GANHA»");
  assert.doesNotMatch(frase, /\bapost\w*|\bsort\w*|\bazar\b|loterias?|aleat[óo]ri/i,
    `a frase usa termo de álea/aposta: «${frase}»`);
});

// ═══ SEG4 — pendência #3: glossário alargado às formas verbais ══════════════════════
test("UTAC106c/SEG4 · o glossário cobre as formas VERBAIS (apost\\w*, sort\\w*)", () => {
  const g = ler("i18n/__tests__/glossario.test.mjs");
  // ⚠️ Olhar SÓ para a linha do padrão (`pt: /…/i,`). A 1.ª versão media sobre o ficheiro inteiro e
  // dava um FALSO RED: o COMENTÁRIO que explica a correcção cita o padrão antigo («\bapostas?\b») —
  // a mesma armadilha que o repo já documentou (um guarda que lê comentários grita no sítio errado).
  const linhaPt = g.split(/\r?\n/).find((l) => /^\s*pt:\s*\/.*\/i,\s*$/.test(l));
  assert.ok(linhaPt, "não encontrei a definição `PROIBIDOS.pt` no glossário");
  assert.match(linhaPt, /\\bapost\\w\*\\b/, "a guarda de «aposte/apostar/apostou» não ficou alargada");
  assert.match(linhaPt, /\\bsort\\w\*\\b/, "a mesma família de buraco («sorteio») não foi fechada");
  assert.doesNotMatch(linhaPt, /\\bapostas\?\\b/, "o padrão antigo (`apostas?`) voltou ao filtro");
  assert.doesNotMatch(linhaPt, /\\bsortes\?\\b/, "o padrão antigo de «sorte» (`sortes?`) voltou ao filtro");
  // controlo: os restantes termos do glossário não se perderam na substituição
  for (const termo of ["leil", "azar", "loterias"]) {
    assert.ok(linhaPt.includes(termo), `o glossário perdeu o termo «${termo}»`);
  }
});

// ═══ SEG5 — pendência #4: ordem dos secundários em sincronia ════════════════════════
test("UTAC106c/SEG5 · a ordem dos itens SECUNDÁRIOS coincide entre a barra e o rail", () => {
  const bn = codigo(ler("widgets/layout/BottomNav.jsx"));
  const sb = codigo(ler("widgets/layout/Sidebar.jsx"));
  const blocoBN = bn.match(/const SECONDARY_LINKS = \[[\s\S]*?\];/)?.[0];
  const blocoSB = sb.match(/const NAV_ITEMS = \[[\s\S]*?\];/)?.[0];
  assert.ok(blocoBN, "SECONDARY_LINKS desapareceu do BottomNav");
  assert.ok(blocoSB, "NAV_ITEMS desapareceu da Sidebar");

  const pathsBN = [...blocoBN.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  const pathsSB = [...blocoSB.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  const rotBN = [...blocoBN.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const rotSB = [...blocoSB.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);

  // controlo positivo: se os extractores não vissem nada, o deepEqual era vacuoso... ou trivial.
  assert.ok(pathsBN.length >= 5, `a barra só tem ${pathsBN.length} secundários — extractor cego?`);
  assert.ok(pathsSB.length >= 9, `o rail só tem ${pathsSB.length} itens — extractor cego?`);

  // os 4 PRINCIPAIS continuam iguais, pela mesma ordem (nada disto pode ter mexido)
  assert.deepEqual(pathsSB.slice(0, 4), ["/carteira", "/mercado", "/", "/ofertas-programadas"],
    `os 4 principais do rail mudaram: ${JSON.stringify(pathsSB.slice(0, 4))}`);

  // os SECUNDÁRIOS passam a coincidir (era a divergência declarada no 106b, achado ℹN4)
  assert.deepEqual(pathsSB.slice(4), pathsBN,
    `secundários dessincronizados · rail=${JSON.stringify(pathsSB.slice(4))} barra=${JSON.stringify(pathsBN)}`);
  assert.deepEqual(rotSB.slice(4), rotBN,
    `rótulos dos secundários dessincronizados · rail=${JSON.stringify(rotSB.slice(4))} barra=${JSON.stringify(rotBN)}`);
});
