# UTAC110b — VALIDADOR ADVERSARIAL (commit c1d080d)

Worktree próprio: `C:/Users/Moltbot/tmp-110b-val/wt` (criado com `scripts/worktree-helper.mjs criar … c1d080d`).
Scratch fora do repo: `C:/Users/Moltbot/tmp-110b-val/scratch` (blobs lidos) e `…/scripts` (call.mjs, cmp.mjs).
Nada escrito no repo, nos Blobs, nas env vars; nenhum deploy; nenhum valor de credencial impresso (só nomes + booleano não-vazio).
Chamadas a produção: 2 (o limite).

## Veredito por afirmação

### D1 — NÃO REFUTADA
`node call.mjs "Quanto custa participar e como funciona a modalidade Programada?"`
```
2026-10-12T21:49:14.805Z HTTP 200 5092ms
{"resposta":"Encontrei isto no regulamento: «--- ## 1. O que é o DesafioGUT …","fontes":[{"id":"rag:0","score":0.2864},{"id":"rag:1","score":0.1419}],"modoBusca":"textual","modoResposta":"template","perfil":"visitante"}
```
2.ª chamada («O prémio pode ser pago em dinheiro?»): HTTP 200 1702ms, `textual`/`template`, fontes rag:1 0.5308 / rag:0 0.3521.
Ressalva: «scores idênticos ⇒ nada mudou / não é intermitente» é inferência fraca — no modo textual o score é determinístico (TF sobre o mesmo índice); a igualdade só prova índice+pergunta iguais, não o estado de HF/LLM.

### D2 — PARCIAL
`netlify env:list --context production --json | node (só nomes + booleano)`:
```
total 54
HF_API_TOKEN true true | LLM_API_KEY true true | LLM_BASE_URL true true | LLM_MODEL true true | CHATBOT_ATIVO true true
HF_FORCE_REMOTE false | NETLIFY false | AWS_LAMBDA_FUNCTION_NAME false | OPENAI_API_KEY false
```
Os 5 nomes existem e não-vazios — confirmado. MAS:
1. A lista de vars lidas está incompleta: `rag.mjs:206-209` (`ehProducaoLambda`) lê `NETLIFY`, `AWS_LAMBDA_FUNCTION_NAME`, `HF_FORCE_REMOTE` e decide entre HF e o ramo Xenova local (`rag.mjs:218`, dynamic import que falharia no Lambda). Não definidos no Netlify — dependem do runtime. O executor não os menciona.
2. «Causa chave AUSENTE DESCARTADA» é afirmada como facto, mas `env:list` não mostra os **scopes** (builds/functions/runtime). Uma var presente no contexto production mas fora do scope `functions` chega ao código como `undefined` → `chamarLLM` lança `"LLM_API_KEY ausente"` (`chatbot.mjs:1314`) → `template`, indistinguível na resposta. Não medido pelo executor (nem por mim). Atenuante: o deploy publicado (d2c8bea, 2026-10-12T19:46Z) é recente, logo o «var adicionada depois do deploy» é improvável.

### D3 — PARCIAL
`chatbot.mjs:1451-1459`: o `try` envolve `gerarEmbedding` **e** `buscarChunksRelevantes`; qualquer throw → `textual`. `:1465`: chunks vazios sem throw → `semantica-vazia-fallback-textual`. O núcleo está certo. Caminhos para `textual` omitidos/mal formulados:
- erro de rede do `fetch` (TypeError/DNS) — não listado (só «HTTP não-ok, hf_resposta_invalida, timeout, embedding_invalido»);
- ramo **Xenova** se `ehProducaoLambda()` for falso (import de `@xenova/transformers` falha no Lambda) — não considerado; por isso «Logo, em produção o pedido à HF falha» é conclusão mais forte do que a evidência (provável, não provado);
- «forma errada sem lançar ⇒ semantica-vazia» só vale para dimensão errada (`rag.mjs:129`); um vector vazio `[]` lança `embedding_invalido` (`rag.mjs:103-104`) ⇒ `textual`. O próprio executor lista `embedding_invalido`, logo é imprecisão de redacção.

### D4 — NÃO REFUTADA (com ressalva no raciocínio)
Resposta HTTP sem campo de motivo (ambas as chamadas). `console.warn` em `chatbot.mjs:1457` e `:1489` (o diagnóstico cita `:1491`, que é comentário).
Ressalva: a evidência «os console.warn não chegam à API de logs» assenta em 1 linha `info` com `message:""` em 72 h — mas cada pedido também emite `console.info("[chatbot] resposta gerada"…)` (`:1503`) e esses também não apareceram. O instrumento (`netlify logs`) está cego em geral; não se pode concluir que é o `warn` em particular que se perde. Não re-medi os logs.

### D5 — NÃO REFUTADA
Blobs lidos (`blobs:list rag` → rag:0..2, rag:meta). `rag:meta` = `{"totalChunks":3,"dimensao":384,"modelo":"Xenova/all-MiniLM-L6-v2","tamanho":500,"overlap":50,"fonte":"docs/RAG-GUTO-v2.md","criadoEm":"2026-09-26T05:54:10.835Z"}`. Re-chunk com o `splitIntoChunks` real (500/50):
```
src e22e866 raw ✗✗✗ | strip ✓✓✓      reg e22e866 strip ✗✗✗
src acad017 raw ✗✗✗ | strip ✓✓✓      reg acad017 strip ✓✓✓
src 70a36eb raw ✗✗✗ | strip ✓✗✗      reg 70a36eb strip ✓✗✗
src HEAD    raw ✗✗✗ | strip ✓✗✗      controlo índice×índice true
```
Bate exactamente com a tabela do executor. Nota: `criadoEm` 05:54Z = 02:54 -03, **3 min antes** do commit `acad017` (02:56:55 -03); o conteúdo é igual ao de `e22e866` e `acad017` — «construído de acad017» é igualdade de conteúdo, não origem cronológica.

### D6 — NÃO REFUTADA (afirmação); gravidade sobrestimada (ver ⚠️-1)
rag:1 contém `80%`×1, `valor integral`×2 (medido); `git diff acad017 HEAD -- docs/RAG-GUTO-v2.md` mostra o Art. 14 substituído por «não há conversão nem substituição por dinheiro» (`:90-91`).

### D7 — NÃO REFUTADA
Contagens (índice / RAG-GUTO-v2.md HEAD / regulamento.md HEAD): `Passe` 0/0/0 (também 0 case-insensitive), `pontos` 0/0/0, `1 senha por lance` 1/1/1, `1.207/2024` 1/1/1, `menor lance` 3/3/3. Linhas 21, 26-27, 49, 76, 111 conferidas.

### D8 — NÃO REFUTADA (e incompleta)
`rag.mjs:9-10` (text-embedding-3-small, float[1536]), `:145-146` («Free tier funciona sem token») vs `:30-31` («EXIGE HF_API_TOKEN»), `:248` (OPENAI_API_KEY); `build-rag-index.mjs:5-6,10,19` — todos conferidos. **Falhou um:** `rag.mjs:154` diz «HF_API_TOKEN ou HF_FORCE_REMOTE → força HTTP mesmo localmente», mas `:206-209` só olha `HF_FORCE_REMOTE` — mais um comentário que mente, e é precisamente o que decide o ramo de embedding.

### D9 — NÃO REFUTADA (um argumento é fraco)
A prova decisiva é a de conteúdo: `build-rag-index.mjs:78-86` não remove `<!-- -->` e o raw dá ✗✗✗. Porém o argumento «gravaria fonte docs/chatbot/regulamento.md (`:130`)» só vale sem `--fonte`: `:130` é `args.fonte || "docs/chatbot/regulamento.md"`, logo `--fonte docs/RAG-GUTO-v2.md` gravaria exactamente o `fonte` vivo. Conclusão mantém-se pelo conteúdo, não pelo campo `fonte`.

### D10 — NÃO REFUTADA (com nota)
`git grep` por `_lib/rag|splitIntoChunks|buscarChunksTextual|cosineSimilarity|montarContexto`: nenhum ficheiro em `_tests/`. Existe `desafio-gut/frontend/scripts/test-mc9.1.mjs`, que só faz regex sobre o fonte de `rag.mjs` (`:74-76`) e não está na suíte — não é teste unitário. Afirmação correcta.

### D11 — NÃO REFUTADA (com ressalva)
A hipótese «token revogado / sem saldo» está marcada «NÃO medida… Não se afirma isto como causa» (§3) e L-1 está declarada (§7). Mas §3 fecha o espaço de causas cedo de mais: «O que resta é chave presente mas rejeitada / sem saldo / modelo indisponível» — omite scope da var, valor errado de `LLM_BASE_URL`/`LLM_MODEL`, rede, ramo Xenova (ver D2/D3).

### P1 — NÃO REFUTADA (pequenos erros)
Todas as acções têm onde/custo/risco; critérios de sucesso para N1, N2, N3. Linhas conferidas: `rag.mjs:122-135,266-290,136-137,291-292,45-64`, `chatbot.mjs:45,1378-1380`, `build-rag-index.mjs:78-86,124-133`, `guto-perfis.mjs:354-369` ✓. Erro: `mc964-gerar-chunks.mjs:23` — o default da fonte está em `:22` (`:32` correcto). Diagnóstico: `chamarLLM :1310-1371` (termina em `:1369`; `:1371` é o `export default`); `:1491` é comentário.

### P2 — NÃO REFUTADA
F1→2.1/1.3, F2→2.2, F3→2.3, F4→2.4, F5→2.5. Cobertas.

### P3 — PARCIAL
Tabela de decisão completa, linha medida acrescentada, N3 recusado com razão (3 chunks/~1100 palavras). Mas a justificação (2) da recomendação — «há uma afirmação de conformidade errada **a sair hoje** (prémio convertível em dinheiro)» — é falsa no estado actual (ver ⚠️-1). E a ordem não protege contra esse risco quando ele se tornar real (ver ⚠️-2).

### P4 — NÃO REFUTADA
«Recomenda, não decide»; 2.0 exige aprovação do operador (AU3); `CHATBOT_ATIVO=off` só oferecido («este UTAC não a toma»).

### S1 — NÃO REFUTADA
`git show --name-status c1d080d` → 4 × `A _logs/UTAC110b*`; `git diff e64bf28 c1d080d --stat` → 4 files, 447 insertions. Nenhum código. Env: só nomes (consistente com o que reproduzi).

## Achados

⚠️-1 **A «afirmação errada a sair hoje» não sai hoje.** Em modo `template` só se mostram os primeiros 400 car. do 1.º chunk (`chatbot.mjs:49,1492-1497`). Em rag:1 (texto normalizado) «optar por dinheiro» está na posição 1473, «valor integral» 1503, «80%» 1541 de 3063 — inalcançável. A minha 2.ª chamada (pergunta directa sobre prémio em dinheiro) devolveu rag:1 em 1.º e o excerto **não** contém o 80%. O risco é **latente**: materializa-se no instante em que o LLM voltar (recebe o chunk inteiro via `montarContexto`, 4000 car.). O diagnóstico diz «pode dizer» (aceitável); o plano (Recomendação, ponto 2) afirma como facto presente — errado.

⚠️-2 **Consequência de ordem não explicitada.** Como o risco nasce ao repor a chave, a regra tem de ser «nunca repor `LLM_API_KEY`/redeploy antes de reindexar a fonte corrigida (e de C4)». A tabela do N1 lista 1.1 (chaves) antes de 1.2 (reindexar), e a P0 manda o operador «rotar» perante um 401 — se o operador rodar a chave na P0, o «80 %» e o modelo antigo (C4) passam a ser explicados com fluência. A ordem final (passo 6) junta 1.1+1.2, mas sem a interdição explícita.

⚠️-3 **«Chave AUSENTE descartada» sobre-afirmado** (D2): scopes das env vars não verificados; vars `NETLIFY`/`AWS_LAMBDA_FUNCTION_NAME`/`HF_FORCE_REMOTE` que decidem o ramo de embedding omitidas.

ℹ️-1 L-2 é fechável (e não foi): `netlify api getSite` → published_deploy `d2c8bea…` (ready, 2026-10-12T19:46:46Z); `git diff --stat d2c8bea c1d080d -- desafio-gut/frontend/netlify netlify.toml` = vazio ⇒ as functions em produção = código do HEAD.
ℹ️-2 Os 4 deploys de produção seguintes (78d53e4, 4ddd93a, be7a172, e64bf28) estão em estado **error** (`listSiteDeploys`). Fora do escopo do 110b, mas relevante para o 110c (o «redeploy» do plano pode falhar).
ℹ️-3 Origem do `---` mal citada: o índice veio de `docs/RAG-GUTO-v2.md` (comentário `:1-15`, `---` em `:17`), não de `docs/chatbot/regulamento.md:1-2`.
ℹ️-4 §8 do diagnóstico remete para `_logs/UTAC110b_SEG2_VERIFICACAO.md`, que não existe (nem no commit nem na árvore principal).
ℹ️-5 Cabeçalho do SEG-1 ainda diz «PARADO… nenhuma chamada a produção, nenhuma env var lida» e §3 repete que o índice só muda com `build-rag-index.mjs` + `OPENAI_API_KEY` — contradiz o próprio diagnóstico (D9/D8). Não corrigido.
ℹ️-6 `rag.mjs:154` — comentário mentiroso adicional (D8).
ℹ️-7 Linhas ligeiramente erradas: `mc964:23`→`:22`; `chamarLLM :1310-1371`→`:1310-1369`; warn do LLM em `:1489`, não `:1491`.

## Não medido
- Scopes das env vars (exigiria `netlify api getEnvVars`, que devolve valores — fora do R5).
- Motivo real das falhas HF/LLM (L-1) — não medível sem credenciais.
- Se `AWS_LAMBDA_FUNCTION_NAME` existe no runtime (decide HF vs Xenova).
- Logs da função (não corri `netlify logs`).
- Suíte de testes (proibido por RAM).

## Veredito final: **APROVADO COM RESSALVAS**
Os factos centrais (D1, D5, D6, D7, D8, D9, D10, S1) resistiram à reprodução independente com números idênticos. Ressalvas: D2/D3/D11 fecham o espaço de causas cedo de mais; P3 apoia a recomendação numa afirmação falsa («a sair hoje»); falta a interdição de ordem LLM-antes-de-reindexar.
