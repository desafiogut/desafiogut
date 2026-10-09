// UTAC109h.2 — REVERT do layout do UTAC109h + UMA só cor de destaque (amarelo `#f5a623`).
//
// Decisão do operador (2026-10-09, depois de o UTAC109h estar em produção): «o layout mudou, não era
// pra ter mudado, volte ao anterior, era somente a cor, e não deixe laranja, deixe apenas amarelo, no
// tom que já temos no app, como o amarelo do botão palpite».
//
// Tom medido: `COR.gold = "#f5a623"` — o dourado do botão «Dar palpite» (`Dashboard.jsx:462` e
// `OfertasProgramadas.jsx:153`, ambos `background: COR.gold`) e de 56 ficheiros de `src/`.
//
// O que este ficheiro defende (e o que NÃO defende):
//   1 · no CÓDIGO das duas peças do ecrã só existe UMA cor de destaque — o amarelo `#f5a623`;
//       laranja `#ff6b35`, ciano `#00d4ff`, verde-água `#00d4aa`/`#0aa37e`, verde `#10b981`,
//       `#fbbf24`, violeta `#a78bfa` e o gradiente `#e89400` estão AUSENTES;
//   2 · os estados de erro continuam VERMELHOS (`#ef4444`), que é semântico e não é decoração;
//   3 · o LAYOUT é o de `1a41cf7` — as marcas do redesenho do UTAC109h (2.º vidro, variáveis
//       `TAM_*`, `data-vidro`, `data-testid` novos) estão AUSENTES e os tamanhos antigos voltaram;
//   4 · os botões do saldo voltaram a viver no MESMO vidro (Passe + MLC + OP + senhas antigas);
//   5 · os alvos da Carteira mantêm 48 px e o «↻» 48×48;
//   6 · contraste WCAG AA nos pares tocados, com CONTROL NEGATIVO (branco sobre o amarelo reprova);
//   7 · o texto visível não mudou — a mudança é de COR (e de nada mais);
//   8 · nenhum botão usa preenchimento AMARELO SÓLIDO: o padrão é o tingido (UTAC109h.3).
//
// ⚠️ LIMITES DECLARADOS (não são regressões deste UTAC — vinham do estado anterior e o revert
//    repõe-nos de propósito): (a) o `PainelIndicacao` («Indique e Ganhe») não tem `minHeight` nos
//    botões «📋 Copiar código»/«📤 Compartilhar» — medidos em 44-45 px no SEG-1 do UTAC109h, abaixo
//    dos 48 px; (b) a ordem/taxonomia dos botões é a antiga (4 estilos), não a padronizada do 109h.
//    Análise estática sobre o texto-fonte (não prova render).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Leitura tolerante ao FIM DE LINHA. O `.gitattributes` fixa LF para `*.mjs/.js/.json/…` mas **não**
 *  para `*.jsx`; com `core.autocrlf=true` um checkout/clone/worktree limpo entrega os `.jsx` em CRLF.
 *  Sem esta normalização, os regex multi-linha deste teste falham num worktree limpo — medido pelo
 *  validador adversarial do UTAC109h.2 (F1): 2 falhas (testes 5 e 8) em fonte CRLF, 9/9 em LF. */
const ler = (p) => readFileSync(resolve(SRC, p), "utf8").replace(/\r\n/g, "\n");
const CART = ler("pages/MinhaCarteira.jsx");
const PAINEL = ler("components/PainelIndicacao.jsx");

/** Texto de CÓDIGO: fora os comentários de bloco, os comentários JSX e os `//` de fim de linha —
 *  preservando o número de linhas. (Um `grep` cru apanha os hex citados em comentários e inventa
 *  cores que não existem: medido no UTAC109h.) */
function codigo(t) {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => "\n".repeat(m.split("\n").length - 1))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/[^\n]*/g, "");
}

/** Texto JSX VISÍVEL (nós de texto), que é o que o utilizador lê no ecrã. */
function visivel(t) {
  return [...t.matchAll(/>\s*([^<>{}]{4,}?)\s*</g)].map((m) => m[1].trim());
}

// ── WCAG 2.x: luminância relativa e razão de contraste ──────────────────────────────────────────
const lum = (hex) => {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Compõe um `rgba` sobre um fundo opaco — o par real que o olho vê. */
const sobre = (rgba, fundo) => {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const f = fundo.replace("#", "").match(/../g).map((x) => parseInt(x, 16));
  const c = [r, g, b].map((v, i) => Math.round(a * v + (1 - a) * f[i]));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
};

const VIDRO = "#0c1131"; // rgba(13,18,53,.88) sobre o fundo da página
const AMARELO = "#f5a623";
const PROIBIDAS = ["#ff6b35", "#00d4ff", "#00d4aa", "#0aa37e", "#10b981", "#fbbf24", "#a78bfa", "#e89400", "#f97316"];

test("UTAC109h.2 · 1 — uma só cor de destaque: o amarelo #f5a623, mais nenhuma", () => {
  for (const [nome, fonte] of [["MinhaCarteira", CART], ["PainelIndicacao", PAINEL]]) {
    const c = codigo(fonte);
    for (const p of PROIBIDAS) {
      assert.equal(c.includes(p), false, `${nome}: a cor ${p} voltou ao código (devia estar ausente)`);
    }
    assert.ok(c.includes(AMARELO), `${nome}: o amarelo ${AMARELO} desapareceu`);
    // os rgba das cores retiradas também não podem voltar
    for (const rgb of ["0,212,255", "0,212,170", "16,185,129", "255,107,53"]) {
      assert.equal(c.includes(rgb), false, `${nome}: o rgb(${rgb}) da cor retirada voltou`);
    }
  }
});

test("UTAC109h.2 · 1b — os TOKENS de destaque do objecto COR são o amarelo (um a um)", () => {
  // Sem isto, trocar `gold` por um neutro (ex.: `#6b7db8`) sobrevivia: o teste só exigia que
  // ALGUM `#f5a623` existisse. Medido: o mutante M9 sobreviveu antes desta asserção existir.
  const bloco = (f) => {
    const m = f.match(/const COR = \{[\s\S]*?\n\};/);
    assert.ok(m, "não encontrei o objecto COR");
    return m[0];
  };
  const valor = (b, k) => {
    const m = b.match(new RegExp(`\\b${k}\\s*:\\s*"([^"]+)"`));
    assert.ok(m, `o token «${k}» desapareceu do COR`);
    return m[1];
  };
  const MC = bloco(CART);
  for (const k of ["primary", "gold", "success", "blue300", "purple", "pix"]) {
    assert.equal(valor(MC, k), AMARELO, `MinhaCarteira: o token «${k}» não é o amarelo ${AMARELO}`);
  }
  assert.equal(valor(MC, "danger"), "#ef4444", "MinhaCarteira: o token «danger» deixou de ser vermelho");
  const PI = bloco(PAINEL);
  for (const k of ["primary", "gold", "success", "blue300"]) {
    assert.equal(valor(PI, k), AMARELO, `PainelIndicacao: o token «${k}» não é o amarelo ${AMARELO}`);
  }
});

test("UTAC109h.2 · 2 — os erros continuam VERMELHOS (#ef4444, semântico)", () => {
  for (const [nome, fonte] of [["MinhaCarteira", CART], ["PainelIndicacao", PAINEL]]) {
    const c = codigo(fonte);
    assert.ok(c.includes("#ef4444"), `${nome}: o vermelho de erro desapareceu`);
    assert.ok(!c.includes(`danger: "${AMARELO}"`), `${nome}: o vermelho de erro passou a amarelo`);
  }
});

test("UTAC109h.2 · 3 — o LAYOUT é o de 1a41cf7: sem as marcas do redesenho do UTAC109h", () => {
  // marcas que o 109h introduziu e que o revert tem de remover
  for (const marca of ['data-vidro', 'data-testid="titulo-carteira"', 'data-testid="subtitulo-carteira"', 'data-testid="valor-saldo"', "TAM_TITULO", "TAM_SUBTITULO", "TAM_VALOR", "ON_COR"]) {
    assert.equal(CART.includes(marca), false, `a marca do 109h «${marca}» sobreviveu ao revert`);
  }
  // tamanhos do estado anterior
  assert.match(CART, /fontSize: isMobile \? "0\.85rem" : "0\.88rem",/, "o título perdeu o tamanho antigo (0,85/0,88 rem)");
  assert.match(CART, /fontSize: isMobile \? "2\.4rem" : "3rem",/, "o valor do saldo perdeu o tamanho antigo (2,4/3 rem)");
  // o ecrã volta a ter só DOIS vidros (o do login e o do saldo), não três
  assert.equal(CART.match(/<GlassCard/g).length, 2, "o ecrã não tem os 2 vidros do estado anterior");
});

test("UTAC109h.2 · 4 — os 4 botões voltaram ao MESMO vidro do saldo (nada foi para um 2.º vidro)", () => {
  const inicio = CART.indexOf("${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}");
  assert.ok(inicio > 0, "não encontrei o vidro do saldo");
  const vidro = CART.slice(inicio, CART.indexOf("</GlassCard>", inicio));
  for (const alvo of ["💰 Depositar PIX", "Comprar Passe Desafio", "⚡ Menor Lance Único", "🎫 Ofertas Programadas", "senha antiga"]) {
    assert.ok(vidro.includes(alvo), `«${alvo}» não está no vidro do saldo (voltou a ser movido para outro vidro?)`);
  }
});

test("UTAC109h.2 · 5 — alvos da Carteira: botões a 48 px e o «↻» a 48×48", () => {
  assert.match(CART, /width: "100%",\n    minHeight: "48px",/, "o botão base da Carteira perdeu os 48 px");
  assert.match(CART, /minWidth: "48px", minHeight: "48px",/, "o botão «↻» perdeu o alvo 48×48");
});

test("UTAC109h.2 · 6 — contraste WCAG AA nos pares tocados (com controlo negativo)", () => {
  // o botão do PIX passou de ciano a amarelo: o par novo é amarelo sobre o próprio tingido
  const tingido = sobre("rgba(245,166,35,0.14)", VIDRO);
  assert.ok(ratio(AMARELO, VIDRO) >= 4.5, `amarelo/vidro = ${ratio(AMARELO, VIDRO).toFixed(2)}`);
  assert.ok(ratio(AMARELO, tingido) >= 4.5, `amarelo sobre o tingido do botão = ${ratio(AMARELO, tingido).toFixed(2)}`);
  assert.ok(ratio("#0a0f1a", AMARELO) >= 4.5, `navy sobre o CTA dourado = ${ratio("#0a0f1a", AMARELO).toFixed(2)}`);
  assert.ok(ratio("#ef4444", VIDRO) >= 4.5, `vermelho de erro/vidro = ${ratio("#ef4444", VIDRO).toFixed(2)}`);
  // CONTROL NEGATIVO — se este passar, o instrumento não mede nada
  assert.ok(ratio("#ffffff", AMARELO) < 4.5, "o controlo negativo (branco sobre amarelo) devia reprovar o AA");
});

test("UTAC109h.2 · 7 — o texto visível não mudou: a mudança é de cor, não de copy", () => {
  const v = visivel(CART).join(" | ");
  for (const frase of ["Carteira", "Saldo Disponível", "Depositar PIX", "Menor Lance Único", "Ofertas Programadas", "Faça login"]) {
    assert.ok(v.includes(frase), `a frase «${frase}» desapareceu do que se lê no ecrã`);
  }
  // (esta linha tem expressões `{}` dentro do nó de texto => lê-se na fonte, não no extractor)
  assert.ok(CART.includes("ver em Meus Ativos"), "o atalho «ver em Meus Ativos» desapareceu");
  const vp = visivel(PAINEL).join(" | ");
  for (const frase of ["🎁 Indique e Ganhe", "Seu código de indicação", "👥 Indicados", "✅ Converteram", "🎁 Senhas ganhas"]) {
    assert.ok(vp.includes(frase), `a frase «${frase}» desapareceu do painel`);
  }
  assert.ok(PAINEL.includes("📋 Copiar código") && PAINEL.includes("📤 Compartilhar"), "os botões do Indique perderam o rótulo");
});

test("UTAC109h.2 · 8 — nenhum botão das 2 peças usa preenchimento AMARELO SÓLIDO (padrão único)", () => {
  // UTAC109h.3 (decisão do operador, 2026-10-09): «Comprar Passe Desafio» e «📋 Copiar código»
  // destoavam por serem CHEIOS; passaram ao padrão amarelo tingido dos restantes botões.
  assert.match(CART, /const ON_GOLD = "#0a0f1a";/, "a constante ON_GOLD desapareceu (contrato do UTAC106c)");
  assert.doesNotMatch(codigo(CART), /color:\s*ON_GOLD/, "uma CTA da Carteira voltou ao par dourado-sólido+navy");
  assert.doesNotMatch(codigo(CART), /background:\s*COR\.gold/, "um botão da Carteira voltou ao dourado SÓLIDO");
  assert.doesNotMatch(codigo(PAINEL), /background:\s*"#f5a623"/, "um botão do painel voltou ao amarelo SÓLIDO");
  assert.doesNotMatch(codigo(PAINEL), /const botaoPrimario/, "o objecto cheio `botaoPrimario` do painel voltou");
  // e o botão do Passe está no padrão tingido, igual aos irmãos
  const i = CART.indexOf("Comprar Passe Desafio ${PRECO_PASSE_DESAFIO}");
  const bloco = CART.slice(CART.lastIndexOf("<button", i), i);
  assert.match(bloco, /background:\s*"rgba\(245,166,35,0\.14\)"/, "o Passe não segue o padrão tingido");
  assert.ok((codigo(CART).match(/rgba\(245,166,35,0\.14\)/g) || []).length >= 4,
    "menos de 4 botões da Carteira no padrão tingido (PIX, Passe, MLC, OP)");
  assert.match(PAINEL, /onClick=\{copiarCodigo\}[^>]*style=\{botaoSecundario\}/, "o «Copiar código» não usa o padrão dos irmãos");
});
