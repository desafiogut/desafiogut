# UTAC140 — SEG0..SEG3 (frentes) · Opus 5.5 · 2026-11-19

Ordem de execução: B → D → C → A → E (B primeiro porque D e E dependem da tabela). A abertura do Blob (Frente A, dados) só corre depois do deploy, para que o primeiro lance já entre no ranking.

## Frente B — `ranking_especial` (Supabase)
- **PoC / medição:** a app só tem cliente anon (sem sessão Supabase). `public.lances` tem 0 linhas e os lances vivem no Key-Per-Bid.
- **Feito:** migração `supabase/migrations/20261119_utac140_ranking_especial.sql`, **aplicada em produção** (MCP `apply_migration`, autorizada pelo enunciado).
  - A tabela tem `id` (lanceId, PK), `edicao_id`, `endereco` (CHECK só aceita o formato encurtado), `valor_oculto` (NULL até à apuração), `posicao` (ordem de chegada) e `criado_em`.
  - RLS: SELECT para anon/authenticated só em `ESPECIAL-RELAMPAGO1` (R18-140-C). O privilégio de coluna exclui `valor_oculto` e `id`.
  - Funções: `registar_lance_especial` (só service_role, advisory lock, idempotente pelo id), `revelar_ranking_especial` (só service_role) e `get_ranking_especial` (anon recebe sempre o valor a NULL).
  - A tabela entra na publicação `supabase_realtime`.
- **Código:** `_lib/ranking-especial.mjs`. Gancho no `lance-relampago.mjs` (passo 7a', depois de o lance existir, fail-soft, sem o valor). Revelação no `_lib/apuracao-especial.mjs`, só depois do resultado gravado (fim + 65 s).
- **Prova em produção com a chave anon real** (`_logs/UTAC140_SEG1_SONDA-REALTIME-ANON.txt`). Inseriram-se 2 lances de sonda; uma repetição do mesmo id devolveu a mesma posição (1, 1, 2). Os valores foram revelados (`revelados = 2`) e o anon:
  - recebeu 4 eventos Realtime (2 INSERT, 2 UPDATE), todos com `new: {}` — **0 com valor**;
  - teve `SELECT *` negado (*permission denied*);
  - via `SELECT posicao,endereco`, viu as 2 linhas;
  - via RPC, recebeu `valor_oculto: null` mesmo com o valor gravado;
  - teve `registar_lance_especial` negado.
  - As linhas de sonda foram apagadas (restantes = 0).
- **Consequência para o frontend:** o payload do Realtime não traz colunas, por isso o evento serve só de **gatilho** para reler pela RPC.

## Frente D — Top 10 completo só com Passe (R18-140-D)
- Assenta sobre a apuração existente (`resultado-edicao` + Blob `edicoes-resultados`), não sobre uma RPC SQL nova (decisão do operador).
- Ramo público: Top 10 **sem valores** (`valoresRestritos: true`). O vencedor mantém-se, porque o valor vencedor já é público on-chain depois da consolidação.
- `?acao=completo` + Bearer user-session: 401 sem token ou com token inválido · 403 `acesso_restrito_passe` «Acesso restrito a portadores de Passe» · 410 depois de fim + 24 h · 503 com o inventário em baixo · 200 com valores a quem tem Passe Relâmpago **ou** Programado (`passes_inventario`, endereços em minúsculas, medido 3/3).
- Frontend: `Top10EspecialPasse.jsx` em Meus Ativos (só desenha com a resposta 200 completa) e `ResultadosEdicao.jsx` com «****» para o valor restrito.
- ⚠️ Mudança intencional que partiu um teste antigo: `utac138-apuracao-especial` E1 (Top 10 público com valores). Actualizado, com o texto antigo em comentário.

## Frente C — GUTO
- `guto-perfis.mjs`: `blocoEdicaoEspecial` (boas-vindas + FAQ «Como ganho?» / «Quando saberei o resultado?» / «O que é o lance único?» + sigilo), `quandoApuracao` (hora de Brasília, derivada do `termino_em`) e `PRODUTO_ESPECIAL_PADRAO = "Air Fryer"`.
- `chatbot.mjs`: `especialParaGuto()` lê a edição gravada (falha ⇒ sem bloco; produto ausente ⇒ «Air Fryer» + aviso no log). `especialAindaSecreta()` fecha o simulador do vencedor e o pulso para ESPECIAL-* antes do fim, em todos os perfis (fail-closed).
- ⚠️ **Desvio declarado:** o texto do enunciado acaba em «Boa sorte!». A `REGRA_LINGUAGEM` do GUTO e o glossário oficial proíbem «sorte» (guardado pelo teste mc962 c2), por isso o GUTO diz «Bons lances!».
- Em produção, o produto lido é «Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin», logo não se usou o padrão.

## Frente A — cronómetro de apuração
- O `ContagemDecrescente.jsx` **já não é usado** desde o UTAC138: o tempo vive na faixa do `CartaoEdicao`. A mudança foi feita onde o tempo é desenhado (`CardEdicaoEspecial.jsx`): com a edição aberta mostra «A apuração será em: 10d 23:36:54», com o alvo `termino_em` (já era esse o alvo no estado activo).
- Abertura: `scripts/utac140-abrir-especial.mjs` (`--print` verificado) muda só `status` / `inicio_em`, guarda o Blob anterior e tem `--reverter`.

## Frente E — tabela oculta em tempo real
- `RankingEspecialOculto.jsx` + `_ranking-especial.js` (puro). Leitura inicial pela RPC, depois subscrição `postgres_changes` filtrada pela edição, com releitura em 400 ms. Mostra «1º · 0x1234…abcd · **** pontos». O valor nunca é desenhado, nem que venha na resposta.
- Montado no `MercadoLances.jsx` por cima da `TabelaLances`, só com a especial no ecrã.
- Guarda de vocabulário: teste nos ficheiros novos + linhas UTAC140 (a palavra com acento), mais grep do diff no SEG6.

## Correcção pós-deploy (R18-140-H) — o layout é o da edição
- ⛔ Erro meu: criei uma caixa própria (`RankingEspecialOculto`, com título, legenda, lista e «**** pontos»). Isto viola a regra do UTAC138, agora explicitada pelo operador: **só há dois layouts oficiais de edição**, o Relâmpago («Dar lance») e a Programada («palpite»).
- Correcção:
  - `useRankingEspecial` (RPC + Realtime) entrega as linhas no formato da `TabelaLances` padrão: `oculto: true`, `valor: null`, ordem de chegada, `enderecoCurto`.
  - A `TabelaLances` aceita `enderecoCurto` só em linhas blindadas.
  - O `MercadoLances` passa `edicaoEspecial ? lancesEspecial : lances` à mesma tabela de sempre.
  - O componente e as chaves i18n `edicao.especial.ranking*` saíram.
- Testes: `src/components/__tests__/utac140-tabela-especial.test.mjs` (render real da `TabelaLances`, servidor do utac0009) + contrato de fonte no `MercadoLances`. Mutantes M18/M19 RED, M9 RED. Total da prova de mutação: 18/18.
