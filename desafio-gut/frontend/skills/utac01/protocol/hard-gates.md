# HARD GATES 1-16 — protocolo da série UTAC (DesafioGUT)

Extraído dos UTACs fechados da série (MC100 … MC105a.1). **Auto-contido:** este ficheiro
funciona sozinho, sem consultar UTACs antigos.

A numeração **1-16 é fixa**; o que muda por UTAC é o **critério concreto** de cada gate
(ex.: «HG2 A/B pareado» num UTAC de dados mede linhas de tabela; num UTAC de UI mede cliques).
Ver `../types/*.md` para os critérios concretos por tipo.

Medido na série: no `MC105a-RELATORIO.md` os gates aparecem em tabela `HG1 medir · HG2 A/B ·
HG7/8 · HG9 · HG13 · HG14 · HG15 · HG16` — confirma o mapa posicional abaixo.

---

## GATE 1 — MEDIR ANTES DE CRIAR
Antes de tocar em qualquer ficheiro, medir: commit real (`git rev-parse HEAD` vs o do enunciado),
suíte, existência dos caminhos nomeados, estado declarado. **O enunciado deriva do código com
regularidade** — em toda a série houve divergências (baseline errado, número de testes errado,
caminho errado). Declarar o desvio **com o número medido**.
- Como se verifica: `_logs/UTAC*_SEG-1_MEDICAO.md` com o baseline real e a lista de desvios.
- Exemplo medido: MC105a — enunciado `7648192`, real `b31dbd8`; suíte declarada 528/826, real 530/842.

## GATE 2 — NÃO INVENTAR CONTEÚDO
Toda afirmação do relatório tem de vir de uma medição ou de uma fonte primária. O que não
existe regista-se como **lacuna** — nunca se preenche com suposições.
- Como se verifica: cada número do relatório aponta o ficheiro/comando que o produziu.

## GATE 3 — ESCOPO CIRÚRGICO
Só se aplicam as alterações autorizadas no spec. Tocar fora do scope é falha grave.
- Como se verifica: lista de ficheiros alterados vs lista `autoriza`/`proibe`.
- Exemplo medido: MC104.2 — «1 ficheiro de produção; `delete-account.mjs`, `pedidos.mjs`,
  `exportar-dados.mjs` intactos».

## GATE 4 — NÃO ALTERAR NADA QUE FUNCIONA
O que já funciona fica intacto; o caminho antigo **fica** e é declarado. Se algo tiver de sair,
regista-se **onde a informação passou a viver**.
- Como se verifica: A/B dos consumidores existentes; testes do ficheiro antigo continuam verdes.

## GATE 5 — PONYTAIL É A REGRA
A solução mínima que funciona é a certa. Markdown simples > framework; ficheiro curto > longo.
Nada de features não pedidas.
- Como se verifica: cada ficheiro justifica-se pela sua função; não há código morto nem abstração especulativa.

## GATE 6 — UMA FRENTE DE CADA VEZ
Executa-se A → B → C → D. Não se abre a frente seguinte antes de fechar a anterior com o seu log.
- Como se verifica: um ficheiro de relatório por frente (`_logs/UTAC*_SEG<n>*.md`), sequencial.

## GATE 7 — MUTAÇÃO OBRIGATÓRIA (R16)
Todo teste que nasce verde precisa de prova de mutação: **introduzir a falha que o teste devia
apanhar** e confirmar que o teste fica **RED**; depois restaurar e confirmar md5 idêntico.
Mutante equivalente (não pode ser morto por construção, ex.: chave primária) declara-se como equivalente.
- Como se verifica: `scripts/mc*-prova-mutacao.mjs`; contagem `n/n` mutantes RED; md5 restaurado.
- Exemplo medido: MC105a — mutação 30/30; MC104.3 — 27/27.

## GATE 8 — TESTE BIDIRECIONAL
Para cada alegação, provar **as três direcções** no mesmo ficheiro:
(a) o positivo passa; (b) o negativo falha; (c) a entrada inválida é recusada com erro visível.
- Como se verifica: testes nomeados A/B/C no mesmo ficheiro de teste.

## GATE 9 — VALIDADOR ADVERSARIAL OBRIGATÓRIO
Despachar **subagente independente, em worktree próprio**, com a instrução explícita de
**TENTAR REFUTAR** (não confirmar). Ler o veredicto e tratar cada achado.
- Como se verifica: `_logs/UTAC*_SEG*VALIDADOR.md` com veredicto + achados ⚠️/ℹ️ e tratamento.
- Achados típicos: lacunas de teste, mutantes sobreviventes, texto que promete mais que o código.

## GATE 10 — COMMIT EM FOREGROUND
Commit + push em foreground (nunca background). **NUNCA `git add -A`** — adicionam-se os
ficheiros nomeados um a um.
- Como se verifica: `git status --short` limpo do que foi commitado; histórico com a mensagem do UTAC.

## GATE 11 — O UTAC TEM DE FECHAR
Um UTAC só fecha com: entregáveis presentes, validador lido, logs escritos, verificação ad-hoc
verde, commit final. Pendências ficam **declaradas**, não escondidas.
- Como se verifica: relatório com secção «Pendências (não executadas)» + critério de fecho cumprido.

## GATE 12 — O EXECUTOR NÃO CONCEBE (R20)
O executor executa o spec. Se encontrar ambiguidade, conflito ou lacuna → **PARA e escala ao
operador** com a pergunta e as opções. Não decide produto, não redesenha, não inventa.
- Como se verifica: secção de conflitos/ambiguidades no SEG-1; decisões do operador (R18) registadas.

## GATE 13 — AUTO-CONTIDO
Cada ficheiro/log tem contexto suficiente para funcionar isolado. O executor de um UTAC futuro
**nunca** precisa de «ir buscar» a UTACs antigos.
- Como se verifica: um leitor sem contexto percebe o ficheiro; não há «ver o MC anterior».

## GATE 14 — VERSIONADO
Os artefactos são ficheiros do repo (versionados em git), não ficheiros de sistema nem de sessão.
- Como se verifica: `git ls-files` lista os entregáveis; existem no commit.

## GATE 15 — NÃO ALTERAR OS UTACs FECHADOS
Os UTACs já fechados ficam intactos: nem renomear, nem reformatar, nem reescrever. Só se acrescenta.
- Como se verifica: A/B de `_logs/` e `Desktop/` existentes — zero diff.

## GATE 16 — EXEMPLO FUNCIONAL
A solução prova-se com um exemplo que corre de ponta a ponta (spec → artefacto), não só com a
descrição da função. **Testar o USO, não só a FUNÇÃO.**
- Como se verifica: `_logs/UTAC*_SEG6_saida.txt` com a execução real; exemplo versionado no repo.
