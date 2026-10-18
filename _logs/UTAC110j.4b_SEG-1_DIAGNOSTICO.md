# UTAC110j.4b — SEG-1 DIAGNÓSTICO (o bónus passa a dar pontos de lance?)

Baseline `e995f1c`. RAM 1 577–1 647 MB depois de um trim de working sets (nada fechado) ⇒ A14 cumprida.
Suíte baseline: **1208/1208 · 1351/1357 VERDE** (medida no 110j.4, mesma árvore).

## Nota de processo (operador: «eu tinha definido errado»)
Chegou primeiro uma versão do 110j.4b («Referência do ciclo de pontos»). Comecei a implementá-la e PAREI
quando chegou a versão correcta (esta). O trabalho da versão abandonada foi **desfeito** na árvore
(`MeusAtivos.jsx`, `usePontos.js`, `_stubs/usePontos.js` repostos ao HEAD) e **arquivado** fora do repo:
`…/scratchpad/utac110j4b-versao-ciclo/` (componentes `ComoGanharPontos`/`ComoUsarPontos`, `cicloPontos.js`,
o patch e o bloco de testes). Fica na árvore só a **Frente C** (igual nas duas versões, já verificada).

## Frente A — como é creditado o bónus de 5 acertos (MEDIDO)
Cadeia **automática, toda no backend, com fim on-chain**:
1. `consolidar-lances` → `_lib/consolidacao.mjs:26,143` chama `registrarPontuacaoRodada` (também `POST /pontuacao`, `pontuacao.mjs:47`).
2. `_lib/pontuacao-store.mjs`: calcula a sequência, grava `rankings_ciclo.senhas_a_creditar` + `bonus_emitido` por CAS
   (`:153-178`) e **enfileira** `creditar-senhas-bonus` (`:34`, `:194`; e o sweeper `_lib/sweeper-divida-orfa.mjs:99`).
3. `fila-processor-scheduled.mjs:31` → `_lib/worker-bonus.mjs:45,102` → **`creditarSenhas` = `adicionarSenhas` on-chain**
   (`_lib/contract.mjs`), atrás da flag `BONUS_EMISSAO_ATIVA` (`_lib/bonus-emissao.mjs:38`; hoje dry-run).
4. A UI (`EstadoBonus.jsx`, `ProgressoBonus.jsx`) só LÊ: `useFeedback` → `GET /ranking?recurso=feedback` → `lerFeedback`.

Os pontos de lance existem e são consultáveis pelo titular (`GET /ler-pontos` → `lance.{pontos,creditos,historico}`).
O ledger até já aceita o motivo `"sequencia"` (`_lib/ledger-lance.mjs:36`, Art. 16º V), mas **ninguém o credita**
(só `_lib/fontes-lance.mjs` chama `creditarPontosLance`: login, missão, indicação).

**Veredicto A: EXIGE BACKEND.** Mudar só a UI faria o ecrã prometer «+N pontos de lance» que o servidor nunca
credita (continuaria a gravar senhas a creditar on-chain). O redireccionamento é no `pontuacao-store`/`worker-bonus`
(creditar `creditarPontosLance(…, "sequencia", ref)` em vez de enfileirar senhas) ⇒ **escalar ao Hermes**.

## Frente B — de onde vem a «Competição de habilidade» (MEDIDO)
- `PainelTorneio` (posição/pontos/acertos) ← `lerFeedback`; `RankingCiclo` ← `GET /ranking` → `lerRankingCiclo`
  (`ranking.mjs:25,83,86`), tabela `rankings_ciclo` com a pontuação 1/3 do motor MC93.
- Pontos de lance: **só os do PRÓPRIO** estão disponíveis (`ler-pontos`, Bearer). `public.pontos` tem RLS só para
  `service_role` e **não há endpoint agregado** de pontos de lance de todos.

**Veredicto B: PARCIAL.** O *progresso* de pontos de lance do titular dá para fazer só na UI (com +1 campo no
`usePontos`). Um *ranking* de pontos de lance exige **endpoint novo** (backend) ⇒ escalar ao Hermes, junto com a A.
A pontuação 1/3 continuaria nos dados do `ranking` até o backend mudar.

## Frente C — FEITA (herdada do 110j.4)
«Prêmio a anunciar» → «Produto patrocinado» (`CartaoEdicao.jsx:83`, `EdicaoCard.jsx:96`); teste
`utac110j4-produto-patrocinado.test.mjs` 4/4; mutação 2/2; restauro md5 idêntico.

## R18-110j.4b-1 — decisão do operador (verbatim)
«corroborando mais ainda oque temos no regulamento, fazendo com oque nos afastemos da logica de pagar pela
possibilidade de ganhar, e sim ter esse pontos para dar no menor lance unico, assim os pontos sao dados de forma
grautita pelo app e os 2 reais paga pelo passe relampago que é um produto»
⇒ O lance do Menor Lance Único passa a ser feito com **pontos de lance gratuitos** (Art. 16º); o Passe Relâmpago
(R$ 2,00) é um produto. ⚠️ **Contradiz o estado actual do código** (R18-110d-2: o lance consome 1 CRÉDITO, que só
vem do Passe pago; os pontos de lance não são consumidos) ⇒ revê o 110d no backend ⇒ UTAC do Hermes.

## R18-110j.4b-2/3/4 — detalhes decididos pelo operador
- **2** um lance gasta **o seu próprio valor** em pontos de lance (Arts. 14º/18º); só se licita até ao saldo.
- **3** o Passe Relâmpago mantém 10 pontos de fidelidade + ECOQUILDO + acesso e dá um **bónus de pontos de lance**
  (Art. 16º VI); deixa de ser condição para licitar. ⚠️ O valor do bónus do Passe **não foi fixado** — perguntar.
- **4** bónus de 5 acertos seguidos = **+50 pontos de lance** (motivo `sequencia`, Art. 16º V), em vez de 20 senhas.
Enunciado para o Hermes: `_logs/UTAC110n.spec-HERMES.md`.

## R18-110j.4b-2..5 — CONFIRMADAS pelo operador (2.ª mensagem, valores finais)
- **R18-110j.4b-2 Custo do lance:** o lance gasta o seu valor em pontos de lance (37 = 37). Art. 18º: o vencedor
  adquire o produto pelo valor do lance (1 ponto = R$ 0,01). ⚠️ Por esclarecer no UTAC do Hermes: o vencedor paga
  também o valor em R$ por PIX (Art. 19º), ou os pontos gastos já pagam o produto?
- **R18-110j.4b-3 Passe Relâmpago:** mantém 10 pontos de fidelidade + ECOQUILDO + métricas/GUTO e dá um BÓNUS de
  **200 pontos de lance** (Art. 16º VI). Não é condição para licitar, é um acelerador.
- **R18-110j.4b-4 Bónus de 5 acertos:** **+50 pontos de lance** (motivo `sequencia`), em vez de senhas on-chain.
- **R18-110j.4b-5 Ciclo de missões:** **200 pontos** (= o Passe), alcançável de graça num tempo razoável (o Passe é
  atalho, não condição; conformidade Play). Número de dias a definir no UTAC do Hermes (sugestões: 20 × 10 ou 14 × 15).
- Ordem: a parte só-UI da Frente B (progresso PESSOAL de pontos de lance em Meus Ativos, via `ler-pontos`) é feita
  já (Opus); backend e ranking de todos → Hermes.
## R18-110j.4b-6/7/8 — 3.ª mensagem do operador
(O operador numerou-as «5 a 8»; o R18-5 já era o ciclo de missões ⇒ o seu «5» fica como CONFIRMAÇÃO do -3 e do -5:
Passe = +200 pontos de lance além de 10 fidelidade + ECOQUILDO + acesso; o ciclo de missões também dá 200.)
- **R18-110j.4b-6 Créditos existentes:** converter **1 crédito de lance = 200 pontos de lance** (quem comprou não
  fica prejudicado). Migração no backend → **DEBT-071** (Hermes).
- **R18-110j.4b-7 Ranking de pontos de lance:** ordenado pelo **saldo actual**, endereços **mascarados** como no
  `/ranking` actual. Endpoint novo → Hermes.
- **R18-110j.4b-8 Art. 17º do Regulamento:** rever «1 crédito de lance» → «200 pontos de lance» (extensão do 110m.2
  ou UTAC próprio) — Hermes.
- ⚠️ O operador chamou ao UTAC do Hermes «110m.3»; o enunciado do 110j.4 diz que o 110m.3 é o GUTO ⇒ nome
  provisório **UTAC110n** até o operador confirmar.

## Veredicto: **PARAR e escalar** (A exige backend; B é parcial e o ranking exige backend)
Perguntas ao operador:
1. Abrir o UTAC do **Hermes** para: (a) bónus de 5 acertos → `creditarPontosLance(…, "sequencia")` em vez de senhas
   on-chain (quantos pontos? o Regulamento não fixa); (b) ranking de pontos de lance (endpoint novo, com que
   privacidade — endereços mascarados como o `ranking` actual?).
2. Enquanto isso, faço já a parte só-UI da B (o progresso de pontos de lance do próprio em Meus Ativos)?

## R18-110j.4b-9/10/11 — 4.ª mensagem do operador (aceitação)
- **R18-110j.4b-9 Nome:** o UTAC do backend é o **UTAC110n** (o 110m.3 é o GUTO).
- **R18-110j.4b-10 Pagamento do vencedor:** o lance GASTA os pontos (custo de licitar); o vencedor PAGA o produto em
  reais por PIX pelo valor do lance (Art. 18º, 1 ponto = R$ 0,01). Não é cobrança dupla. Confirmação → **DEBT-072**.
- **R18-110j.4b-11:** ressalvas aceites; dívida registada: mistura de pontos → **DEBT-073**; pontos de lance ainda
  sem uso no lance → **DEBT-074**. Commit + push autorizados (lista de ficheiros um a um).
