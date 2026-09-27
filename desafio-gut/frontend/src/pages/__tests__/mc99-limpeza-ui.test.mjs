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

/** Texto de CÓDIGO: fora comentários JSX multi-linha, blocos /* *\/ e linhas // … */
function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")   // comentário JSX (multi-linha) — o que faltava no MC98
    .replace(/\/\*[\s\S]*?\*\//g, "")        // bloco /* … */
    .split(/\r?\n/)
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
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

// ═══ SEG0 — Início: Outras Edições em scroll lateral ════════════════════════════
test("MC99/SEG0 · Outras Edições em scroll LATERAL (não empilhado)", () => {
  const d = codigo(ler("src/pages/Dashboard.jsx"));
  const bloco = d.match(/data-testid="outras-edicoes-scroll"[\s\S]{0,700}/)?.[0];
  assert.ok(bloco, "o contentor do scroll lateral desapareceu (data-testid=outras-edicoes-scroll)");
  assert.match(bloco, /display:\s*"flex"/, "o contentor deixou de ser flex");
  assert.match(bloco, /overflowX:\s*"auto"/, "sem overflowX:auto não há scroll lateral");
  assert.match(bloco, /scrollSnapType:\s*"x mandatory"/, "sem scroll-snap o swipe para a meio");
  assert.match(bloco, /scrollSnapAlign:\s*"start"/, "cada edição tem de prender ao início");
  assert.match(bloco, /flex:\s*"0 0 100%"/, "cada edição tem de ocupar a largura toda (1 visível)");
  // e o grid empilhado NÃO pode voltar
  assert.doesNotMatch(d, /gridTemplateColumns:\s*isMobile \? "1fr" : "repeat\(auto-fit, minmax\(240px/,
    "o grid de Outras Edições voltou (era empilhado no telemóvel)");
});

// ═══ SEG1 — Barra inferior: Início · Carteira · Lances · Mais ═══════════════════
test("MC99/SEG1 · barra inferior na ordem Início · Carteira · Lances", () => {
  const b = codigo(ler("src/widgets/layout/BottomNav.jsx"));
  const bloco = b.match(/const MAIN_TABS = \[[\s\S]*?\];/)?.[0];
  assert.ok(bloco, "MAIN_TABS desapareceu");
  const ordem = [...bloco.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ordem, ["/", "/carteira", "/mercado"],
    `ordem das tabs mudou: ${JSON.stringify(ordem)} — tem de ser Início · Carteira · Lances`);
  // "Mais" continua a ser o último (é um <button>, não um MAIN_TAB): garantir que o
  // dock o renderiza DEPOIS do map das tabs.
  const posMap = b.indexOf("tabsAtivas.map");
  const posMais = b.indexOf(">Mais<");
  assert.ok(posMap !== -1 && posMais > posMap, "«Mais» deixou de vir depois das tabs");
});

// ═══ SEG2 — Carteira limpa ══════════════════════════════════════════════════════
test("MC99/SEG2 · a Carteira tem 2 vidros (login + saldo) e mais nenhum", () => {
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  const n = (c.match(/<GlassCard/g) || []).length;
  assert.equal(n, 2,
    `a Carteira tem ${n} <GlassCard>; tem de ter 2 (prompt de login + Minha Carteira/saldo)`);
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
  assert.ok(!/<h1[^>]*>\s*💰 Minha Carteira/.test(c), "o glass de cabeçalho voltou");
});

test("MC99/SEG2 · «Minha Carteira» está DENTRO do vidro de saldo, e «Saldo Disponível» etiqueta o número", () => {
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  const posTitulo = c.indexOf("💰 Minha Carteira");
  const posEtiqueta = c.indexOf(">Saldo Disponível<");
  assert.ok(posTitulo > -1, "o nome «💰 Minha Carteira» desapareceu do vidro de saldo");
  assert.ok(posEtiqueta > -1, "falta a etiqueta «Saldo Disponível» sobre o número");
  assert.ok(posTitulo < posEtiqueta, "a ordem inverteu-se: a etiqueta tem de vir sob o título");
});

test("MC99/SEG2 · o vidro de saldo usa o PADRÃO (sem background/borderColor inline)", () => {
  const c = codigo(ler("src/pages/MinhaCarteira.jsx"));
  const pos = c.indexOf("💰 Minha Carteira");
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

test("MC99/SEG3.2 · os heroes de Seja Nosso Parceiro estão em vidro padrão", () => {
  const s = codigo(ler("src/pages/SejaNossoParceiro.jsx"));
  // ⚠️ SÃO DOIS. A página tem dois ramos de render (o normal e o de "cadastro
  // indisponível"), cada um com o seu hero. A 1.ª versão desta guarda olhava só para o
  // PRIMEIRO `<motion.header` — e por isso deixou passar uma correcção INCOMPLETA: eu
  // tinha glazado apenas o do segundo ramo. Um guarda que verifica "o primeiro" quando
  // existem dois é meio guarda. Agora são TODOS.
  const posicoes = [...s.matchAll(/<motion\.header/g)].map((m) => m.index);
  assert.ok(posicoes.length >= 2, `esperava 2 heroes (2 ramos de render), vi ${posicoes.length}`);
  posicoes.forEach((pos, i) => {
    const tag = s.slice(pos, s.indexOf(">", pos));
    assert.match(tag, /className="gut-glass-standard"/,
      `o hero #${i + 1} está SOLTO sobre a ilustração (sem superfície) — o defeito do MC89.4`);
  });
  assert.ok(s.includes("Seja Nosso Parceiro!"), "o título do hero desapareceu");
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
