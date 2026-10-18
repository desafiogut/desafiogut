# UTAC110j.4b — SEG4 — VALIDADOR ADVERSARIAL INDEPENDENTE

**Data:** 2026-10-18 · **HEAD:** `e995f1c` (alterações do executor NÃO commitadas, copiadas para worktree próprio)
**Worktree:** `C:/Users/Moltbot/tmp-110j4b-val/wt` (criado com `scripts/worktree-helper.mjs criar … e995f1c`, A13; 4 junctions)
**Mandato:** tentar REFUTAR C1–C6. Nenhum ficheiro do repo principal alterado (excepto este). Sem commit/push/deploy. Backend não tocado.

## VEREDICTO: **APROVADO COM RESSALVAS** — 0 bloqueantes

Nenhuma das alegações C1–C6 foi refutada. Ressalvas: incoerência de vocabulário «pontos» na mesma página (resíduo MC93 declarado), 1 mutante cosmético sobrevivente, e notas menores abaixo.

---

## Setup (medido)

| passo | resultado |
|---|---|
| Worktree via helper | OK, 4 junctions (`node_modules`, `desafio-gut/node_modules`, `frontend/node_modules`, `functions/node_modules`) |
| Cópia dos 13 ficheiros (7 M + 6 novos) | md5 **13/13 idênticos** ao main tree (ex.: `PainelPontosLance.jsx` 495741358c80…, `MeusAtivos.jsx` 18018221981d…, `pontosLance.js` 64a1c67de3cc…, `usePontos.js` 6301b2571ae4…) |
| Ficheiros alterados no main tree fora da lista declarada (frontend/docs/scripts) | **nenhum** (`git status -- desafio-gut docs scripts`) |
| RAM livre antes da suíte | **1714 MB** (A14 ≥ 1500 cumprida) |
| `node_modules` do main tree antes | frontend **499** · functions **414** · desafio-gut **568** · raiz **380** |

## C1 — «Produto patrocinado» + sponsor indisponível — **CONFIRMADA**

- Diff: `CartaoEdicao.jsx:83` e `EdicaoCard.jsx:96` só trocam o literal de fallback. `grep "a anunciar"` em `src` (sem testes) → 0 no texto visível (resta só no comentário).
- Sponsor: `_lib/edicoes-core.mjs:103-104` expõe só `produto` e `produtoId`; nenhum campo `patrocinador/sponsor/lojista` na edição. Existe ligação **indireta** `produtoId → produtos.mjs produto.lojista` (endereço/`cnpj:`, não nome de exibição), e o nome da empresa vive em `cotas` (protegido, MC87). Logo «nome do patrocinador não disponível nos dados da edição» é verdadeiro; mostrá-lo exigiria backend.
- ℹ️ «Produto patrocinado» aparece no lugar do NOME do produto quando não há produto — lê-se como rótulo genérico, aceitável.

## C2 — PainelTorneio substituído por PainelPontosLance (só UI) — **CONFIRMADA**

- `MeusAtivos.jsx`: import de `PainelTorneio` removido, `usePontos()` + `<PainelPontosLance temSessao carregando erro lance>`; `ProgressoBonus`, `EstadoBonus`, `FeedbackLance`, `RankingCiclo` continuam renderizados. `PainelTorneio.jsx`, `EstadoBonus.jsx`, `ProgressoBonus.jsx` continuam no disco.
- Fonte de dados verificada no backend (não tocado): `ler-pontos.mjs:101-104` devolve `lance: {creditos, pontos, historico}`; `_lib/ledger-lance.mjs:92` grava `{data, campo, motivo, delta, ref}`; `MOTIVOS_PONTOS_LANCE = ["boas-vindas","login","missao","indicacao","sequencia"]` = exactamente os 5 `FONTES` do painel; histórico **não truncado** (logo a soma por fonte é completa); reversão apaga a entrada (`:161`).
- Hook: `usePontos.js` campo aditivo `lance: pontosLanceDaResposta(data)`; `VAZIO.lance = null`.

## C3 — estados: anónimo / carregando / erro / créditos / negativos — **CONFIRMADA**

Ordem em `PainelPontosLance`: `!temSessao → sem-sessao` › `erro → erro` › `carregando → carregando` › `!lance → erro` › `dados`. Página: `pontosCarregando = pontos.loading || (temSessao && !authToken)`.
- Anónimo com dados no hook → sem números (teste ⛔ ANÓNIMO; mutantes M5 e V13 mortos).
- Janela do token → «Carregando…», não «Entre na sua conta» (M2 morto).
- Falha/ilegível → erro, nunca zeros (M7, V13 mortos; `pontosLanceDaResposta` sem coerção — V2/V3/V4 mortos).
- `campo !== "pontos_lance"` (créditos) excluído (M4 morto); deltas ≤ 0 não contam como ganho (M3 morto); delta 0 e data inválida excluídos (V11/V12 mortos).
- ℹ️ Se o `authToken` nunca chegar (auth-user esgota retries), o painel fica em «Carregando…» indefinidamente — mesmo comportamento pré-existente das secções do feedback.

## C4 — copy não promete o que o backend não faz — **CONFIRMADA**

Textos: «⭐ Seus pontos de lance», «Ganhos de graça pelo seu engajamento no app (Art. 16º).», «Você ainda não ganhou pontos de lance. Comece pelo login de hoje.», «Últimos movimentos», «Carregando seus pontos…», «Não foi possível carregar seus pontos agora. Tente novamente mais tarde.»
- Nada afirma consumo/uso dos pontos (correcto: só `creditarPontosLance` escreve `pontos_lance`; não há débito; o lance consome `creditos_lance` — `consumirCreditoLance`).
- «de graça»: correcto — `creditarPontosLance` recusa motivos fora de engajamento (nunca por compra, Art. 17º). O Art. 16º VI (bónus no Passe Relâmpago) não é implementado como pontos — por R18-110d-2 é crédito, coerente.
- «login de hoje»: `login-diario` credita +5 (UTAC110f).
- pt-BR: nenhuma forma pt-PT («tens», «a carregar», «estás») no painel nem em `pontosLance.js`. Nenhuma ocorrência de «torneio» em texto visível (`MeusAtivos.jsx`, `meus-ativos/*.jsx`, `pt.js`).
- Contraste (fundo da `caixa` = rgba(13,18,53,.92) sobre #050818 ≈ #0c1133): muted #6b7db8 **4,59:1**, danger #ef4444 **4,88:1**, gold #f5a623 **9,06:1**, text #e8f0fe **16,02:1** — todos ≥ 4,5 (muted com margem curta, padrão pré-existente).

## C5 — alterações de teste não enfraquecem guardas — **CONFIRMADA (com nota)**

- `MeusAtivos.test.mjs`: `painel-torneio → pontos-lance` nas 5 secções + **novas** assert `doesNotMatch painel-torneio` e «Competição de habilidade» (reforço). Os loops que retiraram `painel-torneio` (cablagem loading/erro/semSessao, janela do token) estão cobertos para o painel novo pelo novo `describe` (dados, erro, loading, anónimo, janela do token, chamada ao hook) — V1/V5/V6/V13/V14 e M1/M2/M5/M7 morrem aí. Asserts de posição/pontos (4º, 13, 2º) eram do painel removido — remoção legítima.
- `pontos: { loading: true }` no teste de espera: necessário porque o stub tem `loading:false, lance:null` (estado «erro»); o hook real arranca com `loading:true`. Não esconde defeito.
- `artigosUI.test.mjs`: entrada `"16"` **aditiva** (acrescenta exigência) — reforço.
- Stub `usePontos`: `lance: null, missoesHoje: null` aditivos.
- ℹ️ A guarda de cablagem para o painel novo é por fixture (stub do hook) — o teste `utac110j4b-usepontos-lance` cobre o hook real (M6 morto).

## C6 — suíte e mutação — **CONFIRMADA**

- `timeout 590 node ../../scripts/mc966-suite-harness.mjs ambos </dev/null` (foreground, worktree): **frontend VERDE 1226/1226 · backend VERDE 1351/1357 · VEREDITO VERDE**.
- `node scripts/utac110j4b-prova-mutacao.mjs` (no worktree): **7/7 PROVADOS**, restauro md5 idêntico em todos.
- Nota: o script corre só o ficheiro de teste alvo de cada mutante (não a suíte) — suficiente para provar mordida.

## Mutantes próprios do validador (15) — `scratchpad/mut-val.mjs`, contra 5 ficheiros de teste, restauro md5 verificado

| # | mutante | resultado |
|---|---|---|
| V1 | painel ignora `carregando` | MORTO (3) |
| V2 | aceita pontos negativos | MORTO (1) |
| V3 | coerção em `inteiro()` (Number(x)) | MORTO (2) |
| V4 | histórico não-array aceite como [] | MORTO (1) |
| V5 | página passa `feedback.erro` em vez de `pontos.erro` | MORTO (1) |
| V6 | página passa `feedbackCarregando` | MORTO (1) |
| V7 | CartaoEdicao volta a «Prêmio a anunciar» | MORTO (2) |
| V8 | EdicaoCard volta a «Prêmio a anunciar» | MORTO (2) |
| V9 | recentes em ordem ascendente | MORTO (1) |
| V10 | motivo desconhecido descartado (não vai a «outro») | MORTO (1) |
| V11 | data inválida aceite | MORTO (1) |
| V12 | delta 0 aceite | MORTO (1) |
| V13 | sem `lance` ⇒ «dados» com zeros | MORTO (3) |
| V14 | saldo = soma dos ganhos em vez de `lance.pontos` | MORTO (1) |
| V15 | limite de «Últimos movimentos» 5 → 50 | **SOBREVIVE** (cosmético) |

**14/15 mortos.** V15: nenhum teste fixa N=5 na página (P4 testa `recentes(…, N)` puro com N do teste).

---

## Achados

- ⚠️ **A1 — Dois sistemas de «pontos» na mesma página (incoerente com v5.1).** O painel novo diz «pontos de lance» (Art. 16º), mas logo ao lado `FeedbackLance` continua a dizer «vale 3 pontos / vale 1 ponto» («Projeção pela regra da competição…») e `RankingCiclo` ordena por `pontosTotais` do motor MC93 (1/3); `ProgressoBonus`/`EstadoBonus` falam de «Bônus de senhas» e «acertos seguidos» — vocabulário que o Regulamento v5.1 não tem. O executor declarou estes resíduos como fora de escopo (bónus = backend+on-chain; ranking = endpoint novo), e isso é legítimo, mas o utilizador vê duas contabilidades de «pontos» sem relação entre si. Recomenda-se pelo menos ajustar a copy do `FeedbackLance`/`RankingCiclo` (ex.: «pontos do ranking do ciclo») num UTAC de copy, ou esconder `FeedbackLance` até o motor ser migrado.
- ⚠️ **A2 — Pontos de lance sem uso visível.** O painel mostra saldo que hoje não se consome em nada (o lance gasta créditos). A copy não promete uso (correcto), mas o Art. 16º diz «o lance é registado em pontos de lance» — a lacuna é de produto/backend, não desta UI.
- ℹ️ **A3** — V15 sobrevive (limite de 5 movimentos não fixado na página). Cosmético.
- ℹ️ **A4** — «A mostrar os» (pt-PT) em `RankingCiclo` (`ativos.rank.mostrando`) — pré-existente, fora do escopo.
- ℹ️ **A5** — `MeusAtivos` passa a fazer 1 pedido extra a `/ler-pontos` por montagem (antes não chamava). Esperado.
- ℹ️ **A6** — «Carregando» indefinido se o `authToken` nunca chegar (padrão pré-existente).
- ℹ️ **A7** — Fallback «Produto patrocinado» aparece onde estaria o nome do produto, a dourado; aceitável, mas é um rótulo genérico, não um nome.

## Limpeza

- `node scripts/worktree-helper.mjs remover` 1.ª chamada: junctions rmdir OK, mas o git **recusou** (worktree sujo com as cópias) e o helper **não forçou** (correcto). Repostas as cópias (`git checkout -- .` + `git clean` só nos caminhos copiados) → 2.ª chamada: **reparse points 0**, `git worktree remove` exit 0, `"ok": true`.
- `node_modules` do main tree depois: frontend **499** · functions **414** · desafio-gut **568** · raiz **380** — **inalterados**.
- md5 dos ficheiros do executor no main tree inalterados (re-verificados após limpeza).
