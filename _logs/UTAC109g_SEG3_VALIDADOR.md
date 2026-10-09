# UTAC109g — SEG-3 Validador adversarial independente

Commit validado: **1fc7321** (base fee1609). Worktree próprio via helper: C:/Users/Moltbot/tmp-109g-val/wt (removido no fim).
Nenhum ficheiro da árvore principal tocado; sem commit, sem push.

## Veredicto: **PARCIAL — aprovável com ressalvas (0 ⛔)**
Alinhamento, estrutura, cópia, suites e mutação confirmados com medição. Refutado um ponto da alegação 11
(contraste do selo de estado da nova tabela) e encontradas 3 lacunas de teste relevantes (mutantes sobreviventes).

## Tabela alegação a alegação
| # | Alegação | Resultado | Evidência |
|---|---|---|---|
| 1 | Edição = 2.º vidro em todos os estados | CONFIRMADA | Testes A1 (3 estados) verdes; mutante V9 (edição movida p/ o fim) morto com 6 RED. Browser: ordem `HEADER > ARTICLE(edição) > DIV(aviso bónus) > SECTION(pontos)` em sem/com edição a 320/375/1280. |
| 2 | Topo da edição OP == MLC ±4px | CONFIRMADA (0 px) | medir-val.mjs (porta 3001): cartão top MLC/OP = 320/320 @320, 299/299 @375, 299/299 @414, 414/414 @768, 334/334 @1024, 311/311 @1280; larguras 288/343/382/452/708/964 iguais; igual também SEM edição. |
| 3 | Topo espelhado | CONFIRMADA | glass1 top/altura idênticos em todos os viewports (ex.: 16/267 @375, 32/255 @1280); gap 16 (mobile) / 24 (≥768) nas duas abas. |
| 4 | «📋 Palpites» segue o molde | CONFIRMADA | Diff linha a linha vs TabelaLances.jsx (título Orbitron, span dourado, selo `est.cor`, «Prazo» só com timer==null, «🔒 valores ocultos até o fim», 📭, MobileList/3 col). Desvios declarados conferem. |
| 5 | P1 palpite/lance | CONFIRMADA (só por teste) | B2 verde; M9 morto. EM_BREVE_MODE=true em leilaoLock.js:10 ⇒ não observável em browser. |
| 6 | P2 vazio | CONFIRMADA | Browser sem edição: article aria-label «Sem edições programadas no momento.» @320/375/1280; M10 morto. |
| 7 | Nome ≥200px @375 | CONFIRMADA | 283 px @375, 228 px @320, 322 @414. (ℹ️ @768 só 252 px e truncado: o tempo cabe na mesma linha.) |
| 8 | MLC/Início/Carteira/backend/package intactos, EM_BREVE true, .bak intactos | CONFIRMADA | `git diff --stat fee1609 1fc7321 -- MercadoLances.jsx TabelaLances.jsx components/glass Dashboard.jsx Carteira* netlify package*.json backend` = vazio; 5 .bak-* fora do diff. |
| 9 | CartaoEdicao reutilizado | CONFIRMADA | `import CartaoEdicao` + uso em vazio e no map; único diff no componente é 9rem→12.5rem. |
| 10 | Sem copy inventada | CONFIRMADA | Todas as strings novas existem em TabelaLances/OP anterior; «Palpite 🔒» é a composição directa de «Valor 🔒»; frase R18-D é do operador. |
| 11 | Toque ≥44 e contraste ≥AA nos elementos novos | **PARCIALMENTE REFUTADA** | Toque: só o botão login 33 px @320/375/414 (40 @≥768) — residual declarado, confirmado. Contraste: selo `op-tabela-estado` texto #fff 0,7rem/700 sobre `#ff6b35` (EM BREVE) = **2,84:1**; ATIVA #10b981 = 2,54:1; ENCERRADA #ef4444 = 3,76:1 — todos < 4,5 (texto pequeno). Herdado do molde (TabelaLances tem o mesmo), mas é elemento NOVO na OP. Muted #6b7db8 em fundo escuro ≈ 4,3–5,0 (limítrofe). |
| 12 | Mutação 10/10; suites 958/958 e 1095/1101 | CONFIRMADA | `utac109g-prova-mutacao.mjs M1..M5` e `M6..M10`: 10/10 PROVADOS, md5 restaurado. Harness `ambos`, foreground: frontend VERDE 958/958, backend VERDE 1095/1101, VEREDITO VERDE. Ficheiros alterados: 129/129. |

## Achados
### ⛔ Bloqueantes
- Nenhum.

### ⚠️
1. **Contraste do selo de estado da tabela «📋 Palpites»** (alegação 11): branco sobre #ff6b35 = 2,84:1 a 11,2 px — falha WCAG AA 1.4.3. Copiado do molde MLC (mesmo defeito em TabelaLances.jsx, pré-existente), mas o executor declarou AA para os elementos novos e não declarou este residual.
2. **Mutante V6 sobrevive — botão de login da OP sem guarda**: `onLogin={abrirModal}` → `onLogin={() => {}}` passa todos os testes (109g+106f+108e1+107e2). A OP ganhou um botão de login novo e nenhum teste prova que abre o modal. Idem V7 (`isConnected={false}` fixo) e V8 (`encerrado={true}`): as props do GlassHeader na OP não estão ancoradas.
3. **Mutante V5 sobrevive — fuga MC88.43 sem guarda na tabela nova**: `{est.timer == null && (` → `{true && (` mostra «Prazo: <data real>» ao lado do selo EM BREVE e nenhum teste falha. O código está correcto hoje; falta a guarda.
4. Botão login 33 px @≤414 (residual declarado; agora também na OP) — confirmado, continua aberto.

### ℹ️
- `<main>` aninhado no `<main>` do Layout (Layout.jsx:84): 2 `main` na OP medidos no browser — padrão já existente no MLC, agora replicado.
- Mutantes V2 (`alignContent:start`) e V3 (`minWidth:0` no main) sobrevivem — só se provam por browser; overflow lateral medido = 0 em 320–1280 com e sem edição.
- @320: a frase R18-D quebra em 2 linhas (43 px); o título «Palpites — Edição PROG-1» parte o id («PROG-» / «1»); «DesafioGUT» truncado para «D.» no GlassHeader (componente partilhado, igual no MLC).
- @768 o nome do produto fica com 252 px e truncado (o tempo cabe na mesma linha) — mais estreito que a 375.
- Alteração de 12.5rem no CartaoEdicao partilhado também afecta o MLC (decisão R18-C); invisível hoje porque o MLC mostra o cartão vazio (EM_BREVE).
- Sem ids/data-testid duplicados; `frase-mlc` aparece 1× por aba. Hierarquia h1→h2→h3 correcta nas duas abas.
- A intercepção de /ler-palpites no browser não teve efeito (utilizador não autenticado); lista mobile com palpites revelados foi verificada só por SSR (testes B1).

## Comandos executados
- `node scripts/worktree-helper.mjs criar C:/Users/Moltbot/tmp-109g-val/wt 1fc7321`
- `git diff fee1609 1fc7321 -- …` (stat e conteúdo)
- `node --test utac109g-op-alinhamento utac106f-ofertas utac108e1-mlc-op utac107e2-etiqueta Dashboard` → 129/129
- `node scripts/utac109g-prova-mutacao.mjs M1 M2 M3 M4 M5` e `M6 M7 M8 M9 M10` → 10/10
- `node C:/Users/Moltbot/tmp-109g-val/scripts/mut-val.mjs V1..V12` (12 mutantes do validador; 6 mortos / 6 sobreviventes; md5 restaurado)
- `npm run dev -- --host 127.0.0.1 --port 3001 --strictPort` + `CEN=com|sem|longo node scripts/medir-val.mjs` (Chrome do sistema, perfil mkdtemp apagado: «perfil apagado» ×3); servidor morto por PID 18072.
- `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (foreground) → VERDE 958/958 · 1095/1101
- Contraste: cálculo WCAG relativo em node.
- `node scripts/worktree-helper.mjs remover C:/Users/Moltbot/tmp-109g-val/wt`
