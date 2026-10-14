# UTAC110f-front — SEG4 — Validador adversarial independente

**Commit sob teste:** `c93d269` («feat(UTAC110f-front): «Missões de hoje» na Carteira»), pai `2e6e43c`.
**Worktree próprio:** `C:/Users/Moltbot/tmp-110f-front-val/wt` (criado e removido com `scripts/worktree-helper.mjs`).
**Data:** 2026-10-13.

## Veredicto: **APROVADO COM RESSALVAS** — 0 bloqueantes

O núcleo resiste: o contrato do backend, a leitura estrita no hook, os 4 estados, o rodapé, a posição dentro do 1.º vidro, a cor e o escopo do diff conferem. A suíte e a mutação do executor reproduzem-se. Uma alegação cai **em parte**: a 4, sobre o estado neutro «em erro» (ver ⚠️ F1). Dos meus 12 mutantes, **3 sobrevivem**: texto sr-only, `aria-hidden` do glifo e rodapé calculado localmente.

⚠️ **RAM abaixo da A14.** Livre: **1355 / 1357 / 1342 MB**, abaixo do limiar de 1 500. Por isso os números da suíte valem como **evidência fraca**. O resultado coincide exactamente com o que o executor declarou, o que reduz o risco de um verde ou vermelho artificial.

---

## Tabela das alegações 1-10

| # | Alegação | Resultado | Evidência |
|---|---|---|---|
| 1 | `ler-pontos` devolve `missoesHoje {dia, loginFeito, lanceFeito, pontosHoje}`, com `pontosHoje = 5·login + 10·lance`, sem indicação e em fail-soft | **NÃO REFUTADA** | `ler-pontos.mjs:28-36` (`missoesDeHoje` com `try/catch → null`) e `:75` (chamada depois do `try` dos pontos, fora dele). `estadoMissoesHoje` (`fontes-lance.mjs:63-68`) só olha para as refs `login:<dia>` e `missao-lance:<dia>`, por isso a indicação não pode entrar. Mutantes próprios mortos: V2 (constantes trocadas, 3 falhas), V5 (o `catch` inventa zeros, 1 falha) e V12 (o `null` é substituído por «tudo feito», 1 falha). |
| 2 | Nenhum ficheiro de backend além do `ler-pontos.mjs` | **NÃO REFUTADA** | `git diff 2e6e43c c93d269 --stat` dá 10 ficheiros. No backend só `ler-pontos.mjs` (+17), mais o teste novo. `fontes-lance.mjs` e `ledger-lance.mjs` estão fora do diff. |
| 3 | O hook expõe `missoesHoje` com leitura estrita; um campo ausente ou ilegível dá `null`; não há hook novo | **NÃO REFUTADA** | `usePontos.js:30-37` (`typeof boolean`, `Number.isSafeInteger`, `>= 0`, `VAZIO.missoesHoje = null`). Mutantes próprios mortos: V6 (sem `isSafeInteger`) e V7 (aceita negativo). M4 e M5 do executor também morrem. Nenhum hook novo no diff. |
| 4 | Bloco dentro do 1.º vidro, depois dos 3 saldos e antes dos botões; 4 estados; rodapé correcto; «…» a carregar, «—» com `null` ou em erro; sem botões | **REFUTADA EM PARTE** (só no caso do erro, por leitura) | Posição, estados e rodapé confirmados (mutantes V3, V9 e V11 mortos). **Mas** `estadoMissoes` (`MinhaCarteira.jsx:149`) olha só para `pontosCarregando` e `missoesHoje`, **nunca para `pontosErro`**. Quando a releitura falha, `usePontos.refetch` (`usePontos.js:52-55`) faz `setErro(...)` e `return null` **sem** `setDados`, logo `missoesHoje` mantém o valor antigo. Resultado: os 3 saldos mostram «—» e o bloco das missões mostra ✓/⏳ e «Você ganhou X» **da leitura anterior**. O «—» em erro só vale para o **1.º carregamento**, porque aí os dados ainda são `VAZIO`. Ver ⚠️ F1. |
| 5 | Os 3 saldos não foram tocados (só uma linha removida, um destructure); CardLance, CartaoEdicao e GlassHeader intactos; `EM_BREVE_MODE` continua `true` | **NÃO REFUTADA** | `git diff ... MinhaCarteira.jsx \| grep '^-'` dá **1 linha**, o destructure. CardLance, CartaoEdicao e GlassHeader estão fora do diff. `src/lib/leilaoLock.js:10` tem `EM_BREVE_MODE = true`. |
| 6 | Feito = `#f5a623`, pendente = `#6b7db8`, sem verde, AA ≥ 4,5:1 sobre `#0c1131` | **NÃO REFUTADA** (com margem curta) | Os meus cálculos sobre `#0c1131`: dourado **9,09**, muted **4,61**, texto `#e8f0fe` **16,07**, texto a 85 % **11,77**. Pixel medido no PNG de 375 px atrás do bloco: (11,17,50), coerente. ⚠️ O muted só passa se o que está por trás do vidro for escuro. Com o vidro `rgba(13,18,53,.88)` sobre cinzento `#808080` dá **4,00**; sobre branco, **3,27**. Ver ℹ️ F5. |
| 7 | Testes bidireccionais e não vácuos; mutação 9/9 | **NÃO REFUTADA** (mas com lacunas) | `scripts/utac110f-front-prova-mutacao.mjs` dá **9/9 PROVADOS** no meu worktree. Os meus mutantes: **9/12 mortos**. Sobrevivem V4, V8 e V10 (abaixo). |
| 8 | Suíte frontend 1029/1029 e backend 1194/1200, VERDE | **NÃO REFUTADA** (evidência fraca: RAM < 1 500) | `node ../../scripts/mc966-suite-harness.mjs ambos < /dev/null` em primeiro plano, no worktree: `frontend: VERDE 1029/1029 · backend: VERDE 1194/1200 · VEREDITO: VERDE`. |
| 9 | Capturas a 375 e 1280 px; 0 px de overflow lateral | **NÃO REFUTADA** (inspecção visual) | Abri os dois PNG. O bloco está dentro do 1.º cartão de vidro, por baixo do ECOQUILDO e antes de «Depositar PIX», e é legível. A 1280 px a lista tem `max-width 26rem`, o que deixa espaço vazio à direita, aceitável. Não há scroll horizontal visível. O valor de 0 px **não foi re-medido** por mim. |
| 10 | Copy em pt-BR (sem «Ganhaste» nem «Volta amanhã») e a guarda pt-BR passa | **NÃO REFUTADA** | Há 0 ocorrências em `MinhaCarteira.jsx`. `node --test src/__tests__/utac107g2-pt-br.test.mjs` dá **pass 3, fail 0**. |

---

## Os meus mutantes (aplicados no worktree; cada ficheiro restaurado e verificado por sha256)

Script: `<scratchpad>/val-mut.mjs`. Restauro confirmado em todos (sha256 `c5b67ae83c8a` MinhaCarteira, `a628e209a69c` ler-pontos, `78e4819c1440` usePontos). No fim, `git status --porcelain` saiu vazio.

| Mutante | Alvo | Resultado |
|---|---|---|
| V1 UI troca os pontos login/lance (+10 / +5) | MinhaCarteira | **MORTO** (5 falhas) |
| V2 backend troca as constantes `PONTOS_LOGIN_DIARIO` / `PONTOS_MISSAO_LANCE` | ler-pontos | **MORTO** (3) |
| V3 «Volte amanhã!» com **só o login** feito | MinhaCarteira | **MORTO** (1) |
| V4 texto sr-only invertido (« — feito» ↔ « — pendente») | MinhaCarteira | **SOBREVIVE** |
| V5 o `catch` do fail-soft devolve zeros (inventa «pendente») | ler-pontos | **MORTO** (1) |
| V6 hook sem `Number.isSafeInteger` | usePontos | **MORTO** (1) |
| V7 hook aceita `pontosHoje` negativo | usePontos | **MORTO** (1) |
| V8 o glifo ✓/⏳ perde o `aria-hidden` | MinhaCarteira | **SOBREVIVE** |
| V9 o bloco fica sempre neutro (nunca mostra a lista) | MinhaCarteira | **MORTO** (10) |
| V10 o rodapé usa a soma local `5·login + 10·lance` em vez do `pontosHoje` do servidor | MinhaCarteira | **SOBREVIVE** |
| V11 neutro mostra «…» também em erro | MinhaCarteira | **MORTO** (1) |
| V12 `missoesHoje` nulo passa a «tudo feito, 15» | ler-pontos | **MORTO** (1) |

**9/12 mortos.** Não escrevi o mutante «tirar o bloco do vidro» como movimento físico de JSX. A guarda `S` (`utac110f-front-missoes.test.mjs:193-205`) compara as posições de `gut-glass-standard`, dos saldos, do bloco e do botão PIX, e verifica que o bloco fecha antes do 2.º vidro. Por leitura, morderia.

---

## Achados

### ⛔ Bloqueantes
Nenhum.

### ⚠️
- **F1 — Missões desactualizadas depois de uma releitura falhada (refuta em parte a alegação 4).** `MinhaCarteira.jsx:149` decide o estado sem consultar `pontosErro`, e `usePontos.refetch` não repõe os dados quando o pedido falha (`usePontos.js:52-55` e `:71-73`). A Carteira chama `refetchPontos` depois de comprar um Passe (`MinhaCarteira.jsx:166`). Se essa releitura falhar, os saldos passam a «—» e as missões continuam a afirmar ✓/⏳ e «Você ganhou X pontos hoje.» com dados antigos. No mesmo vidro ficam um «não sei» e um «sei». Correcção de uma linha: `pontosCarregando ? "carregando" : (pontosErro || !missoesHoje) ? "neutro" : "ok"`. Não há teste que cubra o caso. Identificado **por leitura**, sem reprodução em runtime.
- **F2 — Corrida entre `POST /login-diario` e a leitura da Carteira.** O AppContext dispara `login-diario` uma vez por sessão (`AppContext.jsx:917-925`) sem esperar a resposta, e nada volta a ler os pontos quando ele termina. Num carregamento directo de `/carteira`, o `GET /ler-pontos` pode correr antes do crédito. Nesse caso aparece «⏳ Login diário» e «Você ganhou 0 pontos hoje.» até à próxima visita ou releitura. Corrige-se sozinho e não perde dados, mas no primeiro ecrã do dia mostra pendente uma missão que acabou de ser feita. Identificado **por leitura**, sem medição.

### ℹ️
- **F3 — Testes sem guarda para 3 propriedades** (mutantes sobreviventes): (a) o texto sr-only (« — feito»/« — pendente»), que é a única forma de um leitor de ecrã saber o estado, porque o glifo é `aria-hidden`; (b) o `aria-hidden` do glifo; (c) o rodapé vir do `pontosHoje` do **servidor**. Nas fixtures o servidor é sempre coerente com a soma local, por isso trocar a fonte não muda nada.
- **F4 — Leitura dupla da mesma linha.** `lerPontos` faz `select("*")` em `pontos`, e `estadoMissoesHoje → lerLedgerLance` volta a ler a mesma linha (`ledger-lance.mjs:38,56`), **em série**. Custa um ida-e-volta extra ao Supabase por pedido. As duas leituras também não são atómicas entre si, o que é benigno. Bastava derivar as missões de `registo.historico_lance`, que já vem no `select("*")`.
- **F5 — O contraste do muted tem margem curta.** 4,61:1 sobre `#0c1131` (o mínimo é 4,5). O vidro é translúcido a 0,88. Se o fundo da arena por trás tiver zonas médias ou claras, o par muted/vidro desce para 4,00 (cinzento médio) ou 3,27 (branco). As capturas foram tiradas sobre fundo escuro.
- **F6 — Acessibilidade dos ícones.** O 🎯 do `<h4>` não tem `aria-hidden`, e o leitor de ecrã lê «alvo, Missões de hoje». O span sr-only usa `position:absolute` + `clip`, sem `white-space:nowrap` nem `margin:-1px` (o padrão habitual). Funciona, mas é frágil. O `+5`/`+10` muted é lido sem dizer se já foi ganho.
- **F7 — Duas fontes para os valores.** A UI tem `pontos: 5` e `pontos: 10` literais (`MinhaCarteira.jsx:151-152`), enquanto o servidor usa `PONTOS_LOGIN_DIARIO` e `PONTOS_MISSAO_LANCE`. Se as constantes mudarem, o «+N» da linha e o rodapé divergem. V10 mostra que nenhum teste o apanharia.
- **F8 — Mudança de dia em Manaus.** O `dia` é calculado no servidor e o hook descarta-o. Nada volta a ler os dados à meia-noite de Manaus (04:00 UTC), por isso um ecrã aberto antes dessa hora mostra o dia anterior até a página voltar a ler.
- **F9 — Os 404 do Privy e do `cotas` não se aplicam aqui.** Não foram afectados pelo commit.

---

## O que NÃO medi
- O comportamento em runtime de F1 e F2. Ambos vêm de leitura do código, sem reprodução com browser ou arnês.
- Overflow lateral em px: não re-medi, só inspeccionei os PNG.
- Contraste sobre o fundo real da arena (imagem ou vídeo): só calculei o pior caso teórico.
- O leitor de ecrã real (NVDA/TalkBack).
- O backend contra o Supabase real. Os testes usam duplos.
- A suíte com RAM ≥ 1 500 MB. Tive 1 342 a 1 357 MB, **abaixo** da A14, por isso a evidência é fraca.

## Higiene
- O worktree foi criado e removido com `node scripts/worktree-helper.mjs`.
- `node_modules` do repo principal, antes e depois: frontend **498** e functions **414** entradas (ver linha de fecho abaixo).
- Nenhum ficheiro da árvore principal foi alterado além deste.
