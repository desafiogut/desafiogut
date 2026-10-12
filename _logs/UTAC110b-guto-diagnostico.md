# UTAC110b — DIAGNÓSTICO DO GUTO (B-4) · Frente A

> Tipo `diagnostico` (skill UTAC). Baseline `e64bf28`. Spec: `_logs/UTAC110b.spec.yml`. SEG-1: `_logs/UTAC110b_SEG-1_MEDICAO.md`.
> **Nenhum ficheiro de código, env var, índice ou deploy foi alterado.** Nenhum valor de credencial foi lido (R5).
> Data: 2026-10-12. Caminhos relativos à raiz do git (`Desktop/DESAFIOGUT`); `fn/` = `desafio-gut/frontend/netlify/functions/`.

## Veredito (curto)
**B-4 confirmado. Há MÚLTIPLAS causas (cenário e):**

| # | classe | causa | estado |
|---|---|---|---|
| C1 | (a)/(b) | As duas chamadas externas falham em produção (embedding HF **e** LLM DeepSeek) **com as chaves presentes** | **CONFIRMADO o sintoma; motivo exacto = LACUNA L-1** (exige o valor da chave ou logs, ambos fora do R5) |
| C2 | (b) | O código **degrada em silêncio**: 2 `catch` transformam a falha em `textual`+`template`, e a única pista é um `console.warn` que os logs do Netlify **não mostram** | **CONFIRMADO** |
| C3 | (c) | **Índice vivo desactualizado** — construído de `acad017` (26/09); a fonte mudou em `70a36eb` (28/09): o índice ainda diz «Prémio em dinheiro… 80%», que o Art. 14 corrigido proíbe | **CONFIRMADO** |
| C4 | (c′) | **A própria FONTE do repo descreve o modelo antigo** (0× «Passe», 0× «pontos»; 1× «1 senha por lance»; 1× «SPA/MF 1.207/2024») — reconstruir o índice **não** corrige o conteúdo | **CONFIRMADO** (achado novo, não estava no enunciado) |
| C5 | (d) | Comentários que mentem (1536/OpenAI vs 384/MiniLM; «free tier sem token» vs 401) | **CONFIRMADO** — não causa a falha actual, é armadilha para o 110c |

---

## §1 · Reprodução em produção (1 chamada)

Script: `scratchpad/guto110b.mjs` (Node `fetch`, UTF-8 — evita o mangling do PowerShell). Saída bruta:

```
2026-10-12T21:39:30.922Z HTTP 200 5039ms
{"resposta":"Encontrei isto no regulamento: «--- ## 1. O que é o DesafioGUT O DesafioGUT é um **torneio de habilidade** operado pelo Grupo União e Trabalho (GUT), CNPJ 23.040.066/0001-00, em formato de e-commerce por venda à ordem (dropshipping). O resultado é determinado pela **estratégia do participante** — a escolha do valor do lance e a leitura do comportamento dos demais. **Não** há sorteio, **não** há gerador de números aleatórios (RNG…». Se não responder ao que precisas, escreve para contato@grupouniaoetrabalho.com.br. Cria uma conta para participar das edições! 😊","fontes":[{"id":"rag:0","score":0.2864},{"id":"rag:1","score":0.1419}],"modoBusca":"textual","modoResposta":"template","perfil":"visitante"}
```

Pergunta = a mesma do 109i («Quanto custa participar e como funciona a modalidade Programada?»).
**Scores idênticos aos do 109i (0,2864 / 0,1419) ⇒ nada mudou desde 2026-10-09.** B-4 **não** é intermitente.

## §2 · Fluxo do GUTO (ficheiro:linha)

| passo | onde | comportamento |
|---|---|---|
| entrada, CORS, rate-limit 10 rpm | `fn/chatbot.mjs:1371-1390` | — |
| intents determinísticos (antes do RAG) | `fn/chatbot.mjs` (router, fail-soft em `:1436`) | não entram nesta pergunta |
| abrir store `rag` | `fn/chatbot.mjs:1262-1268` | erro → `null` + `console.warn` |
| **1. embedding** | `fn/chatbot.mjs:1451-1459` → `fn/_lib/rag.mjs:211-221` → `gerarEmbeddingHF` `:176-204` | **qualquer throw → `modoBusca="textual"`** (`:1458`) |
| 1b. busca semântica | `fn/_lib/rag.mjs:101-138` | 1 `store.get` por chunk, em série (`:123-126`); salta chunks de dimensão diferente em silêncio (`:129`) |
| **2. fallback textual** | `fn/chatbot.mjs:1462-1469` → `rag.mjs:258-293` | TF normalizado, sem limiar |
| contexto | `rag.mjs:299-314` (`montarContexto`, máx 4000 car.) | — |
| **3. LLM** | `fn/chatbot.mjs:1475-1482` → `chamarLLM` `:1310-1371` (DeepSeek, `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`) | **qualquer throw (excepto `systemprompt_ausente`) → `modoResposta="template"`** (`:1483-1500`) |
| template | `fn/chatbot.mjs:1494-1500` + `fn/_lib/guto-perfis.mjs:354-369` | 1.º chunk cortado a 400 car. (`LIMITE_TRECHO_TEMPLATE`, `chatbot.mjs:49`) entre «» |

**Interpretação dos modos (do código):** `"textual"` só acontece quando `gerarEmbedding` **lança**
(HTTP não-ok, `hf_resposta_invalida`, timeout de 25 s ou `embedding_invalido`). Se o embedding viesse
com forma errada mas sem lançar, o modo seria `"semantica-vazia-fallback-textual"` (`:1465`). Logo, **em
produção o pedido à HF falha com excepção.** A latência total de 5 s exclui o timeout de 25 s.

## §3 · Chaves (só NOMES — R5)

`netlify env:list --context production --json` canalizado para um filtro que imprime **só o nome e um booleano
«não-vazio»** (o valor nunca foi impresso nem guardado). Contexto `production`: **54 variáveis**.

| variável que o GUTO usa | onde é lida | existe | não-vazia |
|---|---|---|---|
| `HF_API_TOKEN` | `rag.mjs:216` | ✅ | ✅ |
| `LLM_API_KEY` | `chatbot.mjs:1311` | ✅ | ✅ |
| `LLM_BASE_URL` | `chatbot.mjs:1312` | ✅ | ✅ |
| `LLM_MODEL` | `chatbot.mjs:1313` | ✅ | ✅ |
| `CHATBOT_ATIVO` | `chatbot.mjs:1258` | ✅ | ✅ |
| `OPENAI_API_KEY` | só nos **comentários** de `build-rag-index.mjs:10` e `rag.mjs:248` | ❌ | — (não é usada pelo código) |

⇒ **Causa (a) «chave AUSENTE» está DESCARTADA.** *⚠️ PARCIALMENTE REFUTADO — ver ERRATA E3: o scope das variáveis não foi medido.* O que resta é «chave presente mas rejeitada / sem
saldo / modelo indisponível no fornecedor».

### Sondas anónimas (sem credenciais) — `scratchpad/sonda110b.mjs`
```
HF router (anon)                       HTTP 401 129ms  <!DOCTYPE html>…
HF router token-falso                  HTTP 401 144ms  {"error":"Invalid username or password."}
HF router modelo-inexistente (controlo) HTTP 401   9ms <!DOCTYPE html>…
DeepSeek default (anon)                HTTP 401 786ms  Authentication Fails (governor)
```
O **controlo** (modelo inexistente) também dá 401 ⇒ **sem credencial, o instrumento NÃO distingue** «token
inválido» de «modelo removido». Os endpoints respondem (não há DNS/rede em baixo). Confirma-se também que a HF
**exige** token (contradiz `rag.mjs:145-146`).

### Logs da função
`netlify logs --source functions --function chatbot --since 72h --json` → **1 linha** (`level:"info"`,
`message:""`, 21:39:19Z). Os `console.warn` com o motivo (`hf_http_<status>`, `llm_http_<status>`) **não
chegam** à API de logs. ⇒ **LACUNA L-1** (ver §7).

**Hipótese (NÃO medida, marcada como tal):** as duas falhas simultâneas, com chaves presentes, apontam para uma
causa de conta: token HF revogado/expirado e/ou chave DeepSeek revogada ou sem saldo. Há um precedente
registado de uma chave DeepSeek exposta e marcada para revogação (MC89). **Não se afirma isto como causa.**

## §4 · Índice (Netlify Blobs, store `rag`)

`netlify blobs:list rag` → `rag:0`, `rag:1`, `rag:2`, `rag:meta`.
```
rag:meta = {"totalChunks":3,"dimensao":384,"modelo":"Xenova/all-MiniLM-L6-v2","tamanho":500,"overlap":50,
            "fonte":"docs/RAG-GUTO-v2.md","criadoEm":"2026-09-26T05:54:10.835Z"}
```

**Correspondência com a fonte** (`scratchpad/hist110b.mjs`: re-chunking com o `splitIntoChunks` real e
comparação por igualdade exacta; **controlo positivo** índice×índice = `true`):

| versão da fonte | raw | sem comentários HTML |
|---|---|---|
| `e22e866` (26/09 02:17) `RAG-GUTO-v2.md` | ✗✗✗ | ✓✓✓ |
| **`acad017` (26/09 02:56)** `RAG-GUTO-v2.md` e `regulamento.md` | ✗✗✗ | **✓✓✓** |
| **`70a36eb` (28/09) = HEAD** | ✗✗✗ | **✓✗✗** |

⇒ **O índice vivo = fonte de `acad017`, sem comentários HTML. Está 1 commit de conteúdo atrás.**
A diferença (`git diff acad017 HEAD -- docs/RAG-GUTO-v2.md`, linhas 90-93) é o **Art. 14**:
- índice vivo (`rag:1`): «**Prémio em dinheiro**: … recebe o **valor integral**; os demais recebem **80%**…» (medido: `80%`×1, `valor integral`×2)
- fonte actual: «**não há conversão nem substituição por dinheiro** (Art. 14º)»

⚠️ **O GUTO vivo pode dizer a um consumidor que o prémio é convertível em dinheiro**, o que o regulamento
corrigido (MC-SORTEIO-01a) proíbe. Gravidade de conformidade **superior** à do texto colado.
*⚠️ REFUTADO quanto a «HOJE» — ver ERRATA E1: com o LLM em baixo o template só mostra 400 car. e o «80%» está na
posição 1541 do `rag:1`; o risco é **LATENTE** e materializa-se **no instante em que o LLM voltar**.*

**Quem construiu o índice:** não foi `scripts/build-rag-index.mjs` (esse lê `docs/chatbot/regulamento.md`
**sem** remover comentários, `:78-86`, e gravaria `fonte:"docs/chatbot/regulamento.md"`, `:130`). Foi
`scripts/mc964-gerar-chunks.mjs` (remove `<!-- -->` em `:32`, default `docs/RAG-GUTO-v2.md` em `:22`) + upload
manual com `netlify blobs:set`. ⇒ **Há DOIS caminhos de build divergentes no repo.**

**Origem do `---`:** a fonte começa com um comentário HTML seguido de `---`
(`docs/chatbot/regulamento.md:1-2`). O `mc964` remove o comentário e o `---` passa a ser a 1.ª palavra do
chunk 0. O template cola esse chunk ⇒ «Encontrei isto no regulamento: «--- ## 1. …».

### C4 — a fonte também está desactualizada (contagem medida, `scratchpad/cmp110b.mjs`)
| termo | índice vivo | `docs/RAG-GUTO-v2.md` | `docs/chatbot/regulamento.md` |
|---|---|---|---|
| «1 senha por lance» | 1 | 1 | 1 |
| «1.207/2024» | 1 | 1 | 1 |
| «menor lance» | 3 | 3 | 3 |
| «Passe» | **0** | **0** | **0** |
| «pontos» | **0** | **0** | **0** |
| «Associação Recreativa» | 0 | 0 | 0 |
| «Grupo União e Trabalho» | 2 | 2 | 2 |

Linhas: `docs/RAG-GUTO-v2.md:21` (GUT), `:26-27` (SPA/MF 1.207/2024; menor lance único), `:49` (1 senha por
lance), `:76`, `:111`. ⇒ **Reindexar a fonte actual NÃO resolve o «modelo antigo».** A fonte tem de ser
reescrita para a Via B — **é conteúdo de produto (decisão do operador, AU3)**.

## §5 · As 5 fraquezas do 109i (confirmadas no código actual)

| # | fraqueza | evidência (ficheiro:linha) | contribui para B-4? |
|---|---|---|---|
| F1 | Comentários mentem | `rag.mjs:9-10` («text-embedding-3-small… float[1536]»); `build-rag-index.mjs:5-6,10,19` (OpenAI/1536/`OPENAI_API_KEY`) vs `rag.mjs:28` + `build-rag-index.mjs:89-90` + `rag:meta.dimensao=384`. **Extra:** `rag.mjs:145-146` («Free tier funciona sem token») vs `rag.mjs:30-31` e a sonda (401). `rag.mjs:248` cita `OPENAI_API_KEY` | Não directamente; armadilha para quem corrigir (índice 1536 → `rag.mjs:129` salta tudo em silêncio) |
| F2 | 1 leitura de Blob por chunk, em série | `rag.mjs:123-127` e `:267-271` | Latência (3 chunks hoje ⇒ pequeno); não causa a falha |
| F3 | Chunking por palavras, cego a secções | `rag.mjs:45-64`; resultado: `rag:2` começa a meio de frase («pagamento** (Art. 21º)…») | Sim — degrada a recuperação e produz o `---` |
| F4 | Sem re-ranking nem limiar; topK fixo 3 | `chatbot.mjs:45`; `rag.mjs:136-137`, `:291-292` | Sim — devolve chunks irrelevantes com score 0,14 |
| F5 | Índice à mão, sem guarda de sincronia | `chatbot.mjs:534`; 2 scripts divergentes (`build-rag-index.mjs` vs `mc964-gerar-chunks.mjs`); `mc967-fontes-rag.test.mjs` compara 2 ficheiros, não o índice | **Sim — causa directa de C3** |

**Achados extra (não estavam no 109i):**
- **E1 — `rag.mjs` não tem UM teste unitário.** Nenhum ficheiro em `fn/_tests/` importa `_lib/rag.mjs` (grep). Toda a lógica de recuperação está sem rede.
- **E2 — falha silenciosa observável só por `console.warn`**, que os logs do Netlify não mostram (§3). A resposta HTTP não diz **porquê** caiu no fallback.
- **E3 — `guto-perfis.mjs:355`** diz «HARD GATE 4: NUNCA despejar o chunk bruto», mas `fallback_sem_llm` (`:357-358`) **cola** até 400 car. do chunk entre «». O comentário promete mais do que o código cumpre.

## §6 · Tabela de causa raiz

| causa | classe | evidência | ficheiro:linha |
|---|---|---|---|
| C1 embedding HF falha | (a)/(b) | `modoBusca:"textual"` com `HF_API_TOKEN` presente | `rag.mjs:189-191`, `chatbot.mjs:1456-1459` |
| C1 LLM falha | (a)/(b) | `modoResposta:"template"` com `LLM_API_KEY` presente | `chatbot.mjs:1359-1361`, `:1483-1490` |
| C2 degradação silenciosa | (b) | logs sem motivo; resposta sem `erro` | `chatbot.mjs:1457`, `:1491` |
| C3 índice stale | (c) | índice = `acad017`; fonte = `70a36eb`; «80%» vivo | Blob `rag:1`; `docs/RAG-GUTO-v2.md:90-91` |
| C4 fonte stale (modelo antigo) | (c′) | 0× Passe/pontos; 1× «1 senha por lance» | `docs/RAG-GUTO-v2.md:21,26-27,49,76,111` |
| C5 comentários | (d) | 1536 vs 384; «sem token» vs 401 | `rag.mjs:9-10,145-146`; `build-rag-index.mjs:5-6,10,19` |
| `---` no texto | (c)+F3 | chunk 0 começa por `---` | `docs/chatbot/regulamento.md:1-2`; `mc964-gerar-chunks.mjs:32` |

## §7 · Lacunas declaradas

- **L-1 — motivo exacto das falhas HF e LLM** (401? 402 sem saldo? 404 modelo removido?). Não medível sem o
  valor da chave (R5) e os logs não trazem o `console.warn`. **Como fechar (operador, 2 min):** correr a sonda
  do plano (Nível 1, acção 1.1) **na própria shell**, com as chaves que ele próprio define; devolve só o status HTTP.
- **L-2 — o deploy de produção corresponde ao HEAD?** Não verificado (o UTAC não toca deploy). O comportamento
  observado é coerente com o código do HEAD (formato do template `chatbot.mjs:1494-1500` + `guto-perfis.mjs:357`).

## §8 · Prova de escopo (zero alterações)
Ver `_logs/UTAC110b_SEG2_VERIFICACAO.md`. Os ficheiros de código foram lidos, não escritos; o índice foi
lido (`blobs:list`/`blobs:get`), não escrito; nenhuma env var foi escrita; nenhum deploy.

---

## ERRATA (pós-validador adversarial, SEG3 — `_logs/UTAC110b_SEG3_VALIDADOR.md`)

Veredicto: **APROVADO COM RESSALVAS**. Núcleo reproduzido por terceiro (D1, D5 com a mesma matriz ✓✓✓/✓✗✗, D6, D7,
D8, D9, D10, S1). As frases erradas acima **ficam à vista** (GATE 15); a correcção está aqui.

- **E1 (⚠️, refuta §4 e P3):** «o GUTO vivo **pode dizer HOJE** que o prémio é convertível em dinheiro» — **falso
  quanto a hoje**. Medido: em `rag:1` (texto normalizado) «optar por dinheiro» está na posição **1473** e «80%» na
  **1541**; o template corta a **400** car. (`chatbot.mjs:49`). A 2.ª chamada do validador perguntou directamente
  pelo prémio em dinheiro e o «80%» **não** saiu. ⇒ risco **LATENTE**: sai **quando o LLM voltar** (o LLM lê o chunk
  inteiro). Consequência: a **ordem** do 110c passa a obrigatória (ver E2).
- **E2 (⚠️, plano):** o plano permitia repor a chave do LLM (1.1) antes de reindexar (1.2). Corrigido: **ordem
  obrigatória 1.3 → 1.4 → 1.2 → 1.1** e, no Nível 2, a 2.0 antes de qualquer religação do LLM.
- **E3 (⚠️, refuta §3 em parte):** «chave AUSENTE DESCARTADA» excede o medido: vi **nomes** e «não-vazio» no
  contexto `production`, **não os scopes**. Uma variável sem scope `functions` chega ao código como `undefined` e o
  `chamarLLM` lança «LLM_API_KEY ausente» (`chatbot.mjs:1314`) — mesma resposta `template`. Correcção: a causa (a)
  **não está descartada**; está «chave presente no contexto, scope NÃO medido». Entra na sonda P0 do plano.
  Omitido também: `rag.mjs:206-209` lê `NETLIFY`, `AWS_LAMBDA_FUNCTION_NAME`, `HF_FORCE_REMOTE` (decidem HF vs Xenova).
- **E4 (parcial, §2):** além de HTTP não-ok/resposta inválida/timeout, chegam a `"textual"` também um **erro de
  rede do `fetch`** e o **ramo Xenova** (se nenhuma das 3 variáveis de ambiente estiver definida no runtime, o
  `import` dinâmico falha no Lambda). «O pedido à HF falha» é **provável, não provado**.
- **E5 (ℹ️):** origem do `---` mal citada — a fonte do índice é `docs/RAG-GUTO-v2.md`, com o `---` em **`:17`**
  (depois do comentário HTML), não `docs/chatbot/regulamento.md:1-2`. A conclusão mantém-se.
- **E6 (ℹ️):** comentário mentiroso **adicional** não apanhado: `rag.mjs:154` diz que `HF_API_TOKEN` «força HTTP»
  — não força (só `ehProducaoLambda()`/`opts.backend` decidem, `rag.mjs:206-216`). Entra no 1.3/2.1.
- **E7 (ℹ️):** **L-2 fechada pelo validador**: o deploy publicado é `d2c8bea` (19:46Z) e não há diff em
  `netlify/functions` entre ele e `c1d080d`; os 4 deploys seguintes estão em `error` (no content change).
- **E8 (ℹ️, números):** `mc964:23` → **`:22`** (corrigido no texto); `chamarLLM` termina em `:1369`; o `warn` do LLM
  está em **`:1488`**; «B-4 não é intermitente» não prova nada sobre o estado HF/LLM (o score textual é
  determinístico) — só prova que o índice não mudou; o `netlify logs` não mostrou **nem** o `console.info` ⇒ o
  instrumento está cego em geral (D4); o argumento do campo `fonte` (D9) é fraco (`--fonte` gravaria o mesmo) — a
  conclusão aguenta-se pelo **conteúdo** (comentários removidos), não pelo campo.
- **E9 (ℹ️):** §8 citava `_logs/UTAC110b_SEG2_VERIFICACAO.md`, que não existia — criado no fecho.

**Correcções pós-veredicto NÃO re-validadas** (sem 2.ª ronda) — declarado.
