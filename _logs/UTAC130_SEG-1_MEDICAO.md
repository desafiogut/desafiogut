# UTAC130 — SEG-1 MEDIÇÃO (2026-11-05, Opus 5.5, skill UTAC)
Baseline medido: `eae7654` (fecho do UTAC129; o enunciado diz «12e31d4 ou o commit do UTAC129»). RAM livre: **563 MB** (< 1 500).

## A premissa «o UTAC129 reintroduziu Saldo/PIX» é REFUTADA pelo histórico
- `git log 12e31d4..HEAD -- MinhaCarteira.jsx Dashboard.jsx StatTile.jsx google-play-billing.js` → **nenhum commit**.
  O UTAC129 não tocou na Carteira nem no Início. A flag `isLeilaoAtivo` não governa estes elementos (0 ocorrências em `MinhaCarteira.jsx`).
- **Carteira:** «Saldo Disponível» e «💰 Depositar PIX» só aparecem se `depositoPix = pixPermitido(plataformaNativa)`
  (`MinhaCarteira.jsx:121, 331, 407`), e `pixPermitido` = `plataforma !== "android"` (`src/lib/google-play-billing.js:142-144`).
  ⇒ **no APK Android ficam escondidos** (UTAC111/UTAC116, `b0dfbfe`, 2026-10-25, com reavaliação no foco). **No PWA
  (browser) aparecem por desenho**: a web não tem Billing, e o depósito PIX é a única forma de comprar Passe lá.
- **Início:** o tile «Saldo (R$)» (`Dashboard.jsx:247`) **não tem condição de plataforma**: aparece no APK e no PWA desde
  `def73a9` (2026-05-03). O tile «Passe Desafio X/50» são os pontos de CARTÃO (`Dashboard.jsx:221-242`), não o inventário.
- **Navegação (Frente C):** já correcta. `MinhaCarteira.jsx:189` → `/mercado` (rota do Menor Lance Único, `App.jsx:368`);
  `:194` → `/ofertas-programadas` (`App.jsx:380`). Os tiles «Lances Únicos» → `/mercado` e «Total de Lances» → `/ativos`.

## ⚠️ Conflitos (não resolvidos pelo executor)
1. **C1 — de onde são os prints?** No APK, o código já esconde Saldo/PIX na Carteira. Se o print «quebrado» é do APK, a
   detecção de plataforma está a falhar no aparelho (precisa de diagnóstico, não de remoção). Se é do browser, é o desenho
   do PWA. Remover para **todos** tira ao PWA a única forma de comprar Passe.
2. **C2 — o tile «Carteira» do Início:** que valor mostra (o enunciado só dá o nome e o destino)? E muda em todas as
   plataformas ou só no APK?
3. **C3 — RAM 563 MB:** o build exige ≥ 1 500 MB.
(o tile 2 = total do inventário `passesRelampago + passesProgramado`; no PWA será sempre 0, porque o PIX não credita inventário)

## Veredito: **AJUSTAR** — perguntar C1-C3 antes do SEG0.

## Decisões do operador (R18, 2026-11-05) — veredito passa a SEGUIR
- **R18-130-1 (C1):** os prints são do **APK** ⇒ garantir que o APK nunca mostra Saldo/PIX.
- **R18-130-2 (C2):** tile 1 «Carteira» mostra os **pontos de lance**, em todas as plataformas.
- **R18-130-3 (C3):** o executor pode fechar programas para libertar RAM na suíte e no build.
