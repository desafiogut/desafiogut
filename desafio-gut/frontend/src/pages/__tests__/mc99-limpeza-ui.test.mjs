// mc99-limpeza-ui.test.mjs — MC99. Guardas das alterações de UX/UI.
//
// Cada teste corresponde a uma alteração do MC99 e é o alvo declarado de uma mutação
// (ver scripts/mc99-prova-mutacao.mjs): se alguém repuser o que foi removido, isto fica RED.
//
// ⚠️ CADA UM DESTES GUARDAS TINHA DE MEDIR SOBRE `semComentarios()` — E NÃO É TEÓRICO.
// O MC99 documenta as remoções EM COMENTÁRIO no próprio sítio onde removeu (R3:
// rastreabilidade), e esses comentários NOMEIAM o que saiu ("Saldo de Senhas",
// "MC10 · Growth", "Pipeline de lance", "BannerCard"). Um grep ao FICHEIRO encontraria
// o nome no comentário e daria RED a um ficheiro CORRECTO — a guarda a gritar no sítio
// errado (classe 4 da skill verification-blindspots).
//
// ⚠️ E o stripper da 1.ª versão do MC98 NÃO bastava: ele removia linhas que COMEÇAM por
// `//`, `*`, `/*` ou `{/*` — mas um comentário JSX (`{/* … */}`) ocupa VÁRIAS linhas, e as
// linhas de continuação não começam por nenhum desses prefixos. Aqui o stripper remove o
// BLOCO JSX inteiro (`/\{\/\*[\s\S]*?\*\/\}/`) antes de olhar para seja o que for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ler = (p) => readFileSync(resolve(RAIZ, p), "utf8");

/** Texto de CÓDIGO: fora comentários JSX multi-linha, blocos /* *\/ e comentários // (de
 * linha inteira E de FIM DE LINHA).
 * ⚠️ O `//` de fim de linha foi uma REFUTAÇÃO do validador: a versão anterior filtrava só
 * linhas que COMEÇAM por «//», e uma linha de código terminada com
 * `const x = 1; // «Saldo de Senhas»` sobrevivia → o guarda dava RED num ficheiro CORRECTO.
 * O guarda a gritar no sítio errado é a classe de defeito que esta série mais paga. */
function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")   // comentário JSX (multi-linha)
    .replace(/\/\*[\s\S]*?\*\//g, "")        // bloco /* … */
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))   // // de fim de linha (não casa :// de URL)
    .filter((l) => !/^\s*\*/.test(l))                    // continuações de bloco
    .join("\n");
}

// ── Controlo positivo do stripper: sem isto, a limpeza podia cegar TODOS os testes ──
test("controlo positivo: o stripper apaga comentários (JSX multi-linha incluído) e poupa código", () => {
  const amostra = `
      {/* MC99 — removeu-se o card "Saldo de Senhas".
          Continuação do MESMO comentário, com "MC10 · Growth" lá dentro.
          E mais uma linha, com "Pipeline de lance". */}
      <h3>Minha Carteira</h3>
      const x = "Saldo de Senhas";   // comentário de fim de linha
`;
  const c = codigo(amostra);
  assert.ok(!c.includes("MC10 · Growth"), "o stripper não apagou o comentário JSX multi-linha");
  assert.ok(!c.includes("Pipeline de lance"), "o stripper não apagou a continuação do comentário");
  assert.ok(c.includes("Minha Carteira"), "o stripper apagou CÓDIGO — ficou cego ao contrário");
  assert.ok(c.includes('const x = "Saldo de Senhas"'), "o stripper apagou uma string de código");
});

// ═══ SEG0 — (UTAC108h.3) guarda APOSENTADA, com o objecto dela
// A guarda do MC99 media o scroll LATERAL das edições do Início («Outras Edições» → prateleira
// única → duas prateleiras). O UTAC108h.3 substituiu tudo isso por DOIS vidros (um por família),
// sem lista nem carrossel. Uma guarda cujo objecto desapareceu fica verde por vacuidade — o que
// esta série combate —, por isso sai em vez de ser deixada a mentir. O que ela protegia
// (as edições do Início não voltarem a um grid empilhado) deixou de ter sujeito.
// O mutador correspondente (MUT1 de scripts/mc99-prova-mutacao.mjs) foi retirado no mesmo movimento.

// ═══ SEG1 — Barra inferior: Início · Carteira · Lances · Mais ═══════════════════
test("MC99/SEG1 (UTAC106b) · barra inferior na ordem Carteira · Menor Lance Único · Início · Ofertas Programadas", () => {
  const b = codigo(ler("src/widgets/layout/BottomNav.jsx"));
  const bloco = b.match(/const MAIN_TABS = \[[\s\S]*?\];/)?.[0];
  assert.ok(bloco, "MAIN_TABS desapareceu");
  const ordem = [...bloco.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ordem, ["/carteira", "/mercado", "/", "/ofertas-programadas"],
    `ordem das tabs mudou: ${JSON.stringify(ordem)} — tem de ser Carteira · Menor Lance Único · Início · Ofertas Programadas (UTAC106b)`);
  const rotulos = [...bloco.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rotulos, ["Carteira", "Menor Lance Único", "Início", "Ofertas Programadas"],
    `rótulos das tabs mudaram: ${JSON.stringify(rotulos)}`);
  // "Mais" continua a ser o último (é um <button>, não um MAIN_TAB): garantir que o
  // dock o renderiza DEPOIS do map das tabs.
  const posMap = b.indexOf("tabsAtivas.map");
  const posMais = b.indexOf(">Mais<");
  assert.ok(posMap !== -1 && posMais > posMap, "«Mais» deixou de vir depois das tabs");
  // UTAC106b — cada destino da barra TEM de existir como rota registada em App.jsx.
  // Fecha o buraco do extractor de `mc991-rotas`: ele não vê `<NavLink to={path}>`
  // (destino por VARIÁVEL), logo as rotas novas passariam como «órfãs justificadas».
  const app = ler("src/App.jsx");
  const semRota = ordem.filter((p) => p !== "/" && !app.includes(`path="${p}"`));
  assert.deepEqual(semRota, [],
    `destinos da barra SEM rota registada em App.jsx: ${semRota.join(", ")}`);
});

test("MC99/SEG1 (UTAC106b) · Sidebar em SINCRONIA com a barra (mesma ordem e rótulos)", () => {
  const s = codigo(ler("src/widgets/layout/Sidebar.jsx"));
  const bloco = s.match(/const NAV_ITEMS = \[[\s\S]*?\];/)?.[0];
  assert.ok(bloco, "NAV_ITEMS desapareceu");
  const ordem = [...bloco.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]).slice(0, 4);
  const rotulos = [...bloco.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]).slice(0, 4);
  assert.deepEqual(ordem, ["/carteira", "/mercado", "/", "/ofertas-programadas"],
    `o rail dessincronizou da barra: ${JSON.stringify(ordem)}`);
  assert.deepEqual(rotulos, ["Carteira", "Menor Lance Único", "Início", "Ofertas Programadas"],
    `rótulos do rail dessincronizados: ${JSON.stringify(rotulos)}`);
});

test("MC99/SEG1 (UTAC106b) · a rota antiga /mercado continua registada (alias)", () => {
  const app = ler("src/App.jsx");
  assert.ok(app.includes('path="/mercado"'),
    "a rota /mercado desapareceu — links antigos passariam a 404 (UTAC106b mantém-na como alias)");
});

// ═══ SEG2 — Carteira limpa ══════════════════════════════════════════════════════
// UTAC109h (R18-B, decisão do operador) — o 1.º vidro passou a dizer só «quanto tenho + como carrego»
// e Comprar Passe / MLC / OP / senhas antigas foram para um 2.º vidro («usar o saldo»). A invariante
// do MC99 mantém-se: nenhum vidro além destes (login + saldo + usar-saldo), sem cabeçalho repetido.
test("MC99+109h/SEG2 · a Carteira tem 3 vidros (login + saldo + usar o saldo) e mais nenhum", () => {
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  const n = (c.match(/<GlassCard/g) || []).length;
  assert.equal(n, 3,
    `a Carteira tem ${n} <GlassCard>; tem de ter 3 (prompt de login + saldo + usar o saldo)`);
  assert.match(c, /data-vidro="saldo"/, "o vidro do saldo perdeu a marca");
  assert.match(c, /data-vidro="usar-saldo"/, "o 2.º vidro (R18-B) desapareceu");
});

test("MC99/SEG2 · os 5 cards removidos não voltaram", () => {
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  for (const [titulo, etiqueta] of [
    ["Saldo de Senhas",   "card «Saldo de Senhas»"],
    ["Dados para Pagamento", "card «Dados para Pagamento»"],
    ["Meus Lances",       "card «Meus Lances»"],
    ["Carteira Conectada","card «Carteira Conectada»"],
  ]) {
    assert.ok(!c.includes(titulo), `${etiqueta} voltou ao ficheiro`);
  }
  // o glass de cabeçalho também não pode voltar (era um <h1> a repetir o título)
  assert.ok(!/<h1[^>]*>\s*(?:💰\s*)?(?:Minha\s+)?Carteira/.test(c), "o glass de cabeçalho voltou");
});

test("MC99/SEG2 (UTAC106c) · o título «Carteira» aparece UMA só vez — o cabeçalho não pode voltar", () => {
  // ⚠️ REFUTAÇÃO do validador: a versão anterior procurava só o literal `<h1 …>💰 Minha Carteira`
  // e olhava apenas a PRIMEIRA ocorrência. Duas evasões passavam VERDE, ambas reintroduzindo
  // exactamente o defeito que o MC99 removeu (dois títulos iguais na mesma dobra):
  //   1. título escrito como {`💰 Minha Carteira`} ou com outro emoji;
  //   2. um segundo vidro de cabeçalho colocado DEPOIS do cartão de saldo.
  // A invariante certa é a CONTAGEM: o nome só pode existir no título do cartão de saldo.
  //
  // UTAC106c — o título do cartão passou de «Minha Carteira» para «Carteira» (nome canónico
  // da navegação; decisão do operador no enunciado do UTAC106c). A invariante NÃO muda:
  // zero ocorrências do nome antigo + UM só título, e nenhum <h1>.
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  assert.equal((c.match(/Minha Carteira/g) || []).length, 0,
    "«Minha Carteira» voltou ao código — o UTAC106c renomeou o título para «Carteira»");
  // ⚠️ contar por `>Carteira<` (texto JSX) e NÃO por /Carteira/g: o identificador
  // `MinhaCarteira` do componente contém a palavra e inflacionaria a contagem (falso RED).
  const titulos = (c.match(/>\s*Carteira\s*</g) || []).length;
  assert.equal(titulos, 1,
    `o título «Carteira» aparece ${titulos}× como texto JSX; tem de ser 1 (só o título do cartão de saldo)`);
  assert.ok(!/<h1/.test(c), "há um <h1> — o glass de cabeçalho voltou noutra forma");
});

test("MC99/SEG2 (UTAC106c) · «Carteira» está DENTRO do vidro de saldo, e «Saldo Disponível» etiqueta o número", () => {
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  const posTitulo = c.search(/>\s*Carteira\s*</);
  const posEtiqueta = c.indexOf(">Saldo Disponível<");
  assert.ok(posTitulo > -1, "o título «Carteira» desapareceu do vidro de saldo");
  assert.ok(posEtiqueta > -1, "falta a etiqueta «Saldo Disponível» sobre o número");
  assert.ok(posTitulo < posEtiqueta, "a ordem inverteu-se: a etiqueta tem de vir sob o título");
});

test("MC99/SEG2 · o vidro de saldo usa o PADRÃO (sem background/borderColor inline)", () => {
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  const pos = c.search(/>\s*Carteira\s*</);
  assert.ok(pos > -1, "não encontrei o vidro de saldo");
  // a abertura do GlassCard que contém o título: olhar para trás até ao <GlassCard
  const abre = c.lastIndexOf("<GlassCard", pos);
  const tag = c.slice(abre, c.indexOf(">", abre));
  assert.ok(tag, "não consegui isolar a tag do vidro de saldo");
  assert.doesNotMatch(tag, /background/, "o vidro de saldo voltou a ter `background` inline (era o vidro próprio, quase transparente)");
  assert.doesNotMatch(tag, /borderColor/, "o vidro de saldo voltou a ter `borderColor` inline");
  assert.match(tag, /gut-glass-standard|GlassCard/,
    "o vidro de saldo deixou de ser o GlassCard padrão (que aplica .gut-glass-standard)");
});

test("MC99/SEG2.3 · o rótulo técnico «MC10 · Growth» saiu do Indique e Ganhe", () => {
  const p = codigo(ler("src/components/PainelIndicacao.jsx"));
  assert.ok(!p.includes("MC10 · Growth"), "o rótulo «MC10 · Growth» voltou (texto técnico, não do utilizador)");
  assert.ok(p.includes("🎁 Indique e Ganhe"), "o título do painel desapareceu — o guarda removeria a coisa errada");
});

// ═══ SEG3 — Lances sem banner, Parceiro com glass ═══════════════════════════════
test("MC99/SEG3.1 · o banner (2.º vidro) saiu dos Lances", () => {
  const m = codigo(ler("src/pages/MercadoLances.jsx"));
  assert.ok(!/BannerCard/.test(m), "o BannerCard voltou aos Lances");
  assert.ok(!/clienteAtivo/.test(m), "o estado/fetch do banner do cliente voltou");
  // o painel principal TEM de continuar lá (não se removeu a tela)
  assert.ok(m.includes("TabelaLances"), "o painel de lances desapareceu — removeu-se a coisa errada");
});

// UTAC108f (R18) — a página «Seja Nosso Parceiro» saiu com o lojista: o guarda dos heroes ficou sem objecto.
test("UTAC108f · os heroes de Seja Nosso Parceiro já não existem (página removida)", async () => {
  const { existsSync } = await import("node:fs");
  assert.equal(existsSync(new URL("../SejaNossoParceiro.jsx", import.meta.url)), false);
});

// ═══ SEG4 — coerência para o utilizador comum ══════════════════════════════════
test("MC99/SEG4 · o rodapé TÉCNICO da Vitrine não está exposto ao utilizador", () => {
  const v = codigo(ler("src/pages/Vitrine.jsx"));
  assert.ok(!/Pipeline de lance/.test(v), "o rodapé técnico («Pipeline de lance em /mercado (Edição R-1, validada em produção)») voltou");
  assert.ok(!/validada em produção/.test(v), "a referência a «validada em produção» voltou à UI do comum");
  // a Vitrine continua funcional
  assert.ok(v.includes("Ver detalhes →") || v.includes("Ir para a edição →"),
    "os CTAs dos slots desapareceram");
});

// ── Correcções às REFUTAÇÕES do validador independente (a guarda de cada correcção) ──

test("controlo positivo: o stripper também trata o comentário `//` de FIM DE LINHA", () => {
  // REFUTAÇÃO: a versão anterior filtrava só linhas que COMEÇAM por `//`. Uma linha de
  // CÓDIGO terminada com `const x = 1; // «Saldo de Senhas»` sobrevivia, e a guarda dava
  // RED num ficheiro CORRECTO. Este teste é o controlo positivo dessa correcção: se o
  // stripper voltar a ser line-based, este teste morre.
  const amostra = [
    'const a = 1; // aqui fala-se de «Saldo de Senhas»',
    'const url = "https://exemplo.pt/xx"; // o :// nao pode ser comido',
    'const b = 2;',
  ].join("\n");
  const c = codigo(amostra);
  assert.ok(!c.includes("Saldo de Senhas"), "o `//` de fim de linha sobreviveu ao stripper");
  assert.ok(c.includes("https://exemplo.pt/xx"), "o stripper comeu o :// de um URL (falso negativo novo)");
  assert.ok(c.includes("const b = 2;"), "o stripper apagou código");
});

test("MC99/F1 · o email de pagamento perdido voltou ao CÓDIGO da Carteira", () => {
  // REFUTAÇÃO do validador: o card "Dados para Pagamento" foi removido e levou consigo o
  // ÚNICO sítio do frontend onde constava o email do Mercado Pago
  // (`grep -rn "desafiogut@gmail.com" src/` → 0 resultados). O custo da senha tinha
  // substituto; o email não. Guarda: tem de existir EM CÓDIGO (não num comentário).
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  assert.ok(c.includes("desafiogut@gmail.com"),
    "o email de pagamento desapareceu outra vez do código da Carteira");
});

test("MC99/F2 · a acção «atualizar saldo on-chain» tem um controlo na UI", () => {
  // REFUTAÇÃO do validador: o botão "↻ Atualizar saldo" saiu com o card e NÃO tinha
  // substituto — o Sidebar não chama refetchSaldo, os StatTile só navegam, e o auto-refresh
  // é de 30 s (AppContext: setInterval(refetchSaldo, 30000)). Guarda: o código tem de
  // continuar a oferecer o refresh manual.
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  assert.match(c, /onClick=\{\(\) => \{ try \{ refetchSaldo\?\.\(\); \} catch \{\} \}\}/,
    "o controlo de atualização manual do saldo on-chain desapareceu (a auto-atualização é de 30 s)");
});
