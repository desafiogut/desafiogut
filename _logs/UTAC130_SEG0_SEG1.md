# UTAC130 — SEG0/SEG1 (Frentes A, B e C)

## Frente A — Carteira sem Saldo/PIX no APK
- **Sem alteração de código: já é o comportamento do APK.** `MinhaCarteira.jsx:331/407` só desenham «Saldo Disponível» e
  «💰 Depositar PIX» com `depositoPix = pixPermitido(plataformaNativa)`. `detectarPlataformaNativa` tem 3 sinais, e o 3.º
  (origem `https://localhost` sem porta) é determinístico neste APK: o `capacitor.config.json` não tem `server.url`, logo
  a WebView serve sempre `https://localhost`. Prova automática existente: `src/__tests__/utac116-pix-apk.test.mjs`
  («APK: origin https://localhost sem porta ⇒ 'android' MESMO SEM bridge visível» + «a Carteira usa a função testada e
  REAVALIA a plataforma no mount»): **10/10**.
- ⚠️ **Hipótese mais provável para o print (não verificável sem o print/aparelho):** ou é um APK **anterior ao v4** (antes
  do UTAC116), ou é o **site no navegador do telemóvel**. O login Google pelo APK da Play cai no Chrome em
  `silly-stardust…/redirect`, porque o App Link não verifica (UTAC124, `assetlinks.json` só com o SHA debug). Aí a pessoa
  vê o PWA, que mostra Saldo/PIX por desenho. Sinal para distinguir: barra de endereço visível = navegador.
- O que o APK mostrava de facto em R$ era o tile «Saldo (R$)» do **Início** (Frente B), que não tinha condição nenhuma.

## Frente B — Início (`src/pages/Dashboard.jsx`)
| Tile | Antes | Depois |
|---|---|---|
| 1 | «Saldo (R$)» `R$ x,xx` → /carteira | **«Carteira» 👛 `N pts`** (pontos de lance, `usePontos().lance.pontos`) → /carteira |
| 2 | «Passe Desafio» `X / 50` (pontos de cartão) → /ofertas-programadas | **«Passe Desafio» `N`** (total do inventário Relâmpago + Programado, `useInventarioPasses`) → /carteira |
| 3, 4 | «Lances Únicos», «Total de Lances» | **iguais** (o render dos 4 tiles ficou byte-igual: sha `0b037a…` mantido) |
- Funções puras exportadas: `valorTileCarteira`, `valorTilePasses` (`null` = skeleton; sem conta/erro/ilegível → «—»,
  nunca um 0 inventado). Saíram o cálculo morto do saldo R$ e as leituras `saldoRsCentavos/saldoRsStatus` do Início.
  `estadoPasse` (UTAC107c) fica exportada, sem uso no tile.
- Testes: 9 do UTAC107c (que fixavam «Saldo (R$)» e «X / 50») substituídos por 9 do UTAC130. 3 do UTAC109f actualizados
  (marca de ordem «Lances Únicos»; nova linha de base do hash dos DADOS = UTAC130; o hash do RENDER mantém-se `0b037a…`).
  Duplo novo `_stubs/useInventarioPasses.js` + alias no arnês. `Dashboard.test.mjs` **53/53**.
- Mutação: **M7** (repor o tile «Saldo (R$)») → **10 RED** · **M8** (Passe → /ofertas-programadas) → **2 RED** · md5 restaurado.

## Frente C — navegação
- Já correcta, sem alteração: Carteira «⚡ Menor Lance Único» → `/mercado` (`MinhaCarteira.jsx:189`, rota `App.jsx:368`);
  «Ofertas Programadas» → `/ofertas-programadas` (`:194`, rota `App.jsx:380`). Os tiles 1 e 2 do Início → `/carteira`.

## Suíte
- 1.ª corrida: frontend **1 RED**: `utac123-build-blindado` fixava `versionCode 7`. ⚠️ **Resíduo do UTAC129, erro meu
  declarado:** subi para 8 no commit `5841193` e só re-corri o backend; o «suíte verde» do UTAC129 não cobria esse último
  commit no frontend. Teste actualizado para 8.
- Final: **frontend 1302/1302 · backend 1456/1462 VERDE** (`_logs/UTAC130_SUITE.txt`).
