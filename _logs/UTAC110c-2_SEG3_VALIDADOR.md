# UTAC110c-2 — VEREDICTO DO VALIDADOR ADVERSARIAL

**Worktree:** `C:/Users/Moltbot/tmp-utac110c-2-val/wt` (detached, `b1de277`).
Nada foi escrito no repo principal nem no worktree. `git status --porcelain` no worktree = **limpo**.
Sondas: curl a produção + `netlify logs` + leitura de código/git (tudo leitura).
⚠️ Facto corrigido: `origin/main` **deixou de ser `b1de277`** — passou a `cd61bfd`
(o commit de *docs* do executor, `_logs/UTAC110c-2_*`, 3 ficheiros, 248 inserções, **só docs**),
que é descendente de `b1de277`. Pré-existente e alheio: `M .../frontend/package-lock.json`.

## Veredicto: **APROVADO COM RESSALVAS**   ## Bloqueantes (contra o diagnóstico): **0**

## O B-4 pode ser fechado?
**NÃO.** Confirmo o executor, com uma razão independente do mérito do diagnóstico: o objectivo
declarado do 110c-1 é «o GUTO responde pelo Regulamento INTEIRO, citando o artigo». Nesta ronda o
LLM **nunca executou** (10/10 chamadas caíram no template). Logo **zero** evidência de produção de
que o Regulamento chega ao modelo e produz resposta citada. Fechar B-4 aqui seria fechar um
bloqueador com base em respostas que **não passaram pelo modelo**. Fica **ABERTO**.

## A causa é MESMO saldo (não código)?
**SIM, com o alcance exacto declarado.** A causa imediata medida é `llm_http_402 Insufficient
Balance` devolvido **pela própria API da DeepSeek** (não pelo nosso código). O nosso código só
**reage**: apanha o 402 no `catch` e escreve o template. Não há bug nosso a montante: o pedido
saiu, chegou ao fornecedor, e o fornecedor respondeu com um erro **de facturação** dele.
- **Prova dura:** o `WARN` em produção é literalmente `"LLM indisponível, usando resposta template:
  llm_http_402: {...\"Insufficient Balance (request_id: <uuid>)...}"` — string montada em
  `chatbot.mjs:1374` (`throw new Error(\`llm_http_${resp.status}: ${txt...}\`)`) e impressa em
  `chatbot.mjs:1484`. O `request_id` é **do servidor da DeepSeek** ⇒ prova que houve resposta dela.
- **A correcção NÃO é código** ⇒ concordo: é carregar saldo na conta DeepSeek. Escalar para 110c-2b
  (ajustar prompt) seria tratar um problema de facturação com cosmética de prompt.

## Reproduzido por execução (pelo validador)

Comando base: `curl -s -X POST -H "Content-Type: application/json" -d '{"pergunta":"…"}' https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot`

| # | pergunta (minha) | HTTP | latência | modoBusca | modoResposta | perfil | chars |
|---|---|---|---|---|---|---|---|
| 1 | Quanto custa o Passe Desafio? | 200 | 1 535 ms | regulamento | **template** | visitante | 171 |
| 2 | O que é o ECOQUILDO? | 200 | 1 335 ms | regulamento | **template** | visitante | 171 |
| 3 | Como funciona o Menor Lance Único? | 200 | 1 023 ms | regulamento | **template** | visitante | 171 |
| 4 | Qual o valor da cota de ouro? | 200 | 1 377 ms | regulamento | **template** | visitante | 171 |
| 5 | Como funciona o sistema de pontos do Passe? | 200 | 1 358 ms | regulamento | **template** | visitante | 171 |

→ **5/5 template**, mesma string de 171 chars. Bate 1:1 com o executor (que fez outras 5 perguntas).

**Logs, medidos por mim** (`netlify logs --source functions --function chatbot --since 30m`, do repo
raiz): duas rajadas de invocações — a do executor (04:32Z, `perguntaLen` 21/29/35/20/34) e a **minha**
(04:35Z, 5 invocações). Cada chamada minha gerou o seu **próprio** `WARN … llm_http_402` com
`request_id` **distinto** (`ec58200c…`, `35a2d809…`, `1626ee5e…`, `68427c56…`, `5e0fbbb8…`),
`Duration` 989/841/809/793/770 ms, `Memory Usage` 184–185 MB.

**Env vars** (`netlify env:list --json --context production`, filtrado — R5, valores de credencial
**nunca** impressos): `CHATBOT_ATIVO="on"`, `LLM_MODEL="deepseek-flash"`,
`LLM_BASE_URL="https://api.deepseek.com/v1"`, `LLM_API_KEY` **existe**.

## Achados ⚠️ grave / ℹ️ nota (com tratamento proposto)

- ℹ️ **`origin/main` = `cd61bfd` (docs), não `b1de277`.** O commit do executor foi *pushado*.
  Tratamento: nenhum (só `_logs/`; não é código). Registado para não repetir a premissa errada.
- ℹ️ **`package-lock.json` do frontend sujo** (`M`), pré-existente, efeito conhecido do
  `netlify deploy --prod` (build local). Não é desta ronda. Tratamento: operador decide (reverter ou
  aceitar) — **não é bloqueante** e o worktree do validador está limpo.
- ℹ️ **`HF_API_TOKEN` ainda existe no Netlify** (resíduo morto do RAG removido no 110c-1).
  Tratamento: arrumação, remover quando conveniente. Não bloqueia.
- ℹ️ **`LLM_API_KEY` — não se pode medir o comprimento.** O `env:list --json` devolve **máscara de
  tamanho fixo** (vários segredos meus apareceram todos com `len=20`), logo **não** prova nem o
  comprimento nem o prefixo. Só se prova que **existe**. (Correcto manter R5.)
- ℹ️ **O prompt contém a palavra «leilão»** (no bloco de PALAVRAS PROIBIDAS, `guto-perfis.mjs:126`:
  `PALAVRAS PROIBIDAS: "leilão", "leilões", …`). Não é vazamento do modelo antigo — é a **regra que
  proíbe** a palavra. Medi `obterPromptSystem('visitante').includes('leil')` = `true`, mas as
  ocorrências são a regra e os comentários, **nenhuma** é conteúdo a ensinar. Não é achado; registo
  porque o teste de «termos proibidos» do SEG2 pode dar falso-positivo se algum dia medir o prompt
  em vez da resposta.
- ℹ️ **Distingo o que um 402 PROVA do que NÃO prova** (§ abaixo) — o executor já o declarou e eu
  **concordo**; repito-o aqui porque é o ponto mais frágil de todo o diagnóstico.

## Alegações REFUTADAS

**Nenhuma das 6 alegações centrais caiu.** Tentei derrubar cada uma; transcrevo o resultado honesto:

- **(f) «5 respostas iguais = cache/stub?» — REFUTADO (a hipótese cai, a alegação do executor fica
  de pé).** Prova decisiva: cada chamada minha produziu um `WARN` **próprio** com `request_id`
  **único** emitido pela DeepSeek, mais `Duration` e `Memory Usage` por invocação e `perguntaLen`
  distintos (20/29/34/29/41). Cache/stub não gera `request_id` do fornecedor nem `Duration` distinto.
  Respostas idênticas porque o **template é fixo** — não porque a chamada não foi feita.
- **(d) «o executor enganou-se no caminho de código?» — REFUTADO.** Medi no código:
  `grep -n '"template"' chatbot.mjs` → **uma só** ocorrência: `chatbot.mjs:1485`, dentro do `catch`
  de `chamarLLM` (`1479-1487`). O `catch` só re-lança em `err?.code === "systemprompt_ausente"`
  (`1483`). A chamada leva mesmo `obterPromptSystem(perfil, { conformidade: modoConformidade })`
  (`chatbot.mjs:1476`).
- **(h) «`modoBusca:"regulamento"` prova código novo?» — CONFIRMADO (não era falso).**
  `git log -S'"regulamento"' -- chatbot.mjs` → a string aparece **só** no commit `f665200`
  (UTAC110c-1). No baseline `c1a8aa9:chatbot.mjs` os valores de `modoBusca` eram `"semantica"`,
  `"textual"`, `"semantica-vazia-fallback-textual"`, `"intent"` — **nunca** `"regulamento"`. Logo
  ver `"regulamento"` em produção prova que o **110c-1 está deployado**. ✅
- **(c) «chave vazia daria outro erro?» — CONFIRMADO.** `chatbot.mjs:1318`: `if (!apiKey) throw new
  Error("LLM_API_KEY ausente")` — é um *throw local*, **sem HTTP**. Uma chave ausente/vazia NUNCA
  produziria `llm_http_402`. Logo ver `llm_http_402` **prova** que a chave existe e não está vazia.
- **(i) «o fallback é seguro?» — CONFIRMADO.** Lido em `guto-perfis.mjs:438-447`: com `trecho=""`
  (é o que o `catch` passa, `chatbot.mjs:1486`), devolve frase natural + saída para o suporte
  (`contato@grupouniaoetrabalho.com.br`). **Não** despeja o chunk bruto (o antigo bug de 1 800 chars),
  **não** expõe configuração interna, **não** ensina o vocabulário antigo, **não** inventa valores.
  A cauda « Cria uma conta para participar das edições! 😊» vem do `fallback_rag.visitante`
  (`guto-perfis.mjs:463`), que só a acrescenta porque ainda não há convite — daí os 171 chars.

## O que NÃO consegui refutar

1. **A causa é saldo (402 da DeepSeek).** O `request_id` do fornecedor + a string exacta do código
   deixam pouca margem. Não encontrei caminho alternativo que produza `llm_http_402 Insufficient
   Balance` a não ser a API da DeepSeek a recusar por saldo.
2. **A chave está certa e o endereço está certo** (402 pressupõe autenticação aceite; um 401/404 ou
   DNS não daria 402 com `code:"invalid_request_error"`).
3. **O código do 110c-1 está vivo em produção** (`modoBusca:"regulamento"`, valor pós-`f665200`).
4. **O fallback é seguro** e é o comportamento projectado («o GUTO responde SEMPRE algo»).
5. **A correcção não é código.** Não há bug nosso no caminho: o código reage como desenhado.

## O que NÃO medi

1. **Se `deepseek-flash` é um nome de modelo aceite.** Impossível sem saldo: qualquer pedido válido
   devolve 402 antes de o modelo ser resolvido (ou não). **Não medi; não afirmo.**
2. **A ORDEM em que a DeepSeek valida saldo vs modelo.** Não tenho acesso a essas contas nem
   documentação que fixe a ordem. Raciocínio (não prova): um nome de modelo inválido na DeepSeek
   tende a devolver **HTTP 400 `"Model Not Exist"`**, não 402 `"Insufficient Balance"` — mas isso é
   conhecimento externo, **não** uma medição minha. Fica **por confirmar com saldo**.
3. **Se o Regulamento chega ao LLM e produz resposta citada.** O modelo nunca correu nesta ronda.
4. **A latência ≤ 30 s / respostas curtas / citation** como propriedades do **prompt** — os «✅» das
   tabelas do executor medem a **frase de fallback**, não a resposta do modelo (o próprio executor o
   declara; concordo — são vacuamente verdadeiros e **não servem** como prova do 110c-1).
5. **O saldo real da conta DeepSeek.** Não tenho credenciais (e não as procuraria — R5).
6. **Se a produção corresponde byte-a-byte a `b1de277`.** Inferi por *schema da resposta + linhas de
   log* que batem com o código de `b1de277`; **não** descarreguei o bundle do deploy para o comparar.

## Contra-prova por afirmação (o que teria de observar para cair)

| afirmação que aceito | o que teria de observar para ela CAIR |
|---|---|
| Causa = saldo (402 DeepSeek) | Um log com `llm_http_401`/`llm_resposta_vazia`/`LLM_API_KEY ausente`, **ou** a DeepSeek a responder 200 depois de o operador dizer que não carregou saldo. |
| Chave certa / endereço certo | Log com `llm_http_401 Authentication Fails` (chave errada) ou erro de DNS/404 (URL errada). |
| Código 110c-1 vivo em produção | Resposta com `modoBusca:"textual"`/`"semantica"` (valores pré-`f665200`). |
| `modoResposta:"template"` só vem do `catch` de `chamarLLM` | Um segundo `grep` que encontrasse `modoResposta = "template"` fora de `chatbot.mjs:1485`, ou um `throw` do `catch` que não fosse só `systemprompt_ausente`. |
| Fallback seguro | Encontrar no `fallback_sem_llm`/`fallback_rag` do visitante: despejo de chunk, valor inventado, ou exposição de config interna. |
| Chamadas foram REAIS (não cache/stub) | Logs com **um só** `request_id` repetido, ausência de `Duration`/`Memory Usage` por invocação, ou `perguntaLen` constante apesar de perguntas diferentes. |
| `deepseek-flash` por confirmar (ressalva) | Com saldo: `llm_http_400 "Model Not Exist"` (⇒ a ressalva era **real**) **ou** resposta 200 citada (⇒ ressalva cai, `deepseek-flash` é válido). |
| B-4 não pode fechar | Uma resposta com `modoResposta:"llm"` **citando um artigo** do Regulamento — nesse momento B-4 fecharia. |
| Executor não mexeu em código | `git diff b1de277..cd61bfd` a tocar em `.mjs`/config, ou `git status` do worktree sujo. |

## Decisão

**APROVADO COM RESSALVAS · 0 bloqueantes contra o diagnóstico.**
O diagnóstico do UTAC110c-2 **resiste** ao ataque: fiz as minhas próprias 5 chamadas (5/5 `template`),
li os logs do fornecedor com `request_id` **único por chamada**, confirmei no código o caminho único
do `template` (`chatbot.mjs:1485`) e o `catch` que só re-lança `systemprompt_ausente`, confirmei que o
402 pressupõe chave não-vazia (`chatbot.mjs:1318`) e que `modoBusca:"regulamento"` é posterior a
`f665200`. **A causa é saldo (402 DeepSeek); a chave e o endereço estão certos; a correcção não é
código; o B-4 fica ABERTO.**

**Ressalvas (não bloqueantes) a ratificar pelo operador:**
1. `deepseek-flash` **por confirmar** — só se saberá com saldo (não medi, não afirmo).
2. O Regulamento a chegar ao LLM e a produzir resposta citada **por medir** — é exactamente por isso
   que o B-4 não fecha.
3. `origin/main` avançou para `cd61bfd` (docs) — corrigir a premissa de que `= b1de277`.
4. `package-lock.json` do frontend sujo (pré-existente) e `HF_API_TOKEN` residual — arrumação.

**Próximo passo (não é 110c-2b):** operador carrega saldo DeepSeek → re-correr as mesmas 5 perguntas
(~5 s) → só então medir `modoResposta:"llm"`, citação de artigo e `deepseek-flash`. Só com isso o B-4
pode fechar-se.
