# UTAC110b.1 — Arquitectura do GUTO (auditoria) + respostas às 3 perguntas

**Baseline:** `ae72248` · **Tipo:** diagnóstico (zero código, zero env, zero deploy) · **Data:** 2026-10-12
Caminhos `fn/` = `desafio-gut/frontend/netlify/functions/`.

## 0. Resumo em 5 linhas

1. O GUTO **pensa com o DeepSeek** (`chamarLLM`, `fn/chatbot.mjs:1310-1369`) e **consulta duas coisas**: um índice
   de texto do regulamento (Netlify Blobs, store `rag`) e **dados vivos** do app através de comandos (intents) que
   lêem Blobs e Supabase. Não existe um terceiro «banco de dados» próprio.
2. O HuggingFace só serve para uma coisa: transformar a pergunta num vector para escolher excertos do índice
   (`fn/_lib/rag.mjs:216`). **Medido:** o índice vivo tem **3 excertos** e o código pede sempre os **3 primeiros**
   (`TOP_K = 3`, `fn/chatbot.mjs:45`), sem limiar (`rag.mjs:136-137`). A busca por significado **não escolhe nada**:
   só decide a ordem, e portanto o que sobra quando `montarContexto` corta aos 4000 caracteres (`rag.mjs:299-313`).
3. Os dois 401 da sonda do operador explicam a causa C1 do 110b: as **duas chaves são inválidas**.
4. **Correcção de premissa (fonte oficial):** `deepseek-v4-flash` **não** está fora de serviço. A página de preços
   da DeepSeek diz que é um nome legado «still accepted», servido pelo DeepSeek-V4.1-Flash e cobrado ao preço do Flash.
   O nome actual recomendado é `deepseek-flash`. O nome do modelo **não** é a causa da falha: a causa é o 401 (chave).
5. O regulamento inteiro do GUTO cabe no prompt (~1.700 tokens hoje). Isso permite tirar o HuggingFace, o índice e
   os dois scripts de build.

## 1. Fluxo completo (entrada → resposta)

| # | Passo | Ficheiro:linha | Serviço | Se falhar |
|---|---|---|---|---|
| 1 | Widget envia `POST /chatbot {pergunta, historico, plataforma}` | `src/components/ChatbotWidget.jsx:367` | — | mostra erro no chat (`:426`) |
| 2 | Preflight CORS | `fn/chatbot.mjs:1375-1376` | — | — |
| 3 | Interruptor `CHATBOT_ATIVO` | `fn/chatbot.mjs:1378-1380` (função `:1257-1260`) | env | 503 `feature_desligada` |
| 4 | Rate limit 10/min | `fn/chatbot.mjs:1385-1386` | Blobs (rate-limiter) | 429 |
| 5 | Validação (≤ 500 car.) | `fn/chatbot.mjs:1388-1401` | — | 400 |
| 6 | Perfil (visitante/comum/corporativo/admin) | `fn/chatbot.mjs:1409-1417` (`detectarPerfil` `:289`) | JWT + cotas | assume visitante |
| 7 | Modo de conformidade das lojas | `fn/chatbot.mjs:1423-1430` | Supabase `config_remota` via `getConfig` | assume leilão activo |
| 8 | **Intent router** (comandos com dados vivos) | `fn/chatbot.mjs:1432-1438` → `tratarIntentEdicoes` `:1220-1255`, padrões `:76`, `detectarIntent` `:156`, handlers `:886` | Blobs + Supabase (§3) | cai no passo 9 |
| 9 | Abrir o índice | `fn/chatbot.mjs:1446` (`abrirStore` `:1262-1268`) | Blobs `rag` | `store = null` |
| 10 | Embedding da pergunta + busca por cosseno | `fn/chatbot.mjs:1451-1459` → `rag.mjs:211-216` (HF) e `:101-137` | **HuggingFace** (MiniLM 384) | `modoBusca = "textual"` |
| 11 | Busca textual (fallback) | `fn/chatbot.mjs:1462-1469` → `rag.mjs:258-292` | Blobs `rag` | 0 excertos |
| 12 | Montar contexto (corta a 4000 car., separador `---`) | `fn/chatbot.mjs:1471` → `rag.mjs:299-313` | — | contexto vazio |
| 13 | **LLM** `[system+perfil, ...histórico, user]`, `max_tokens 512`, `temperature 0.7` | `fn/chatbot.mjs:1479-1482` → `:1310-1369` | **DeepSeek** | passo 14 |
| 14 | Resposta-modelo: 1.º excerto cortado a 400 car. | `fn/chatbot.mjs:1483-1498` → `fn/_lib/guto-perfis.mjs:354` | — | — |
| 15 | Enquadramento por perfil + JSON | `fn/chatbot.mjs:1502-1513` (`guto-perfis.mjs:372`) | — | — |

## 2. Serviços externos

| Serviço | Para quê | Credencial | Onde está a credencial |
|---|---|---|---|
| **DeepSeek** (`api.deepseek.com/v1`) | gerar a resposta (passo 13) | `LLM_API_KEY` (+ `LLM_BASE_URL`, `LLM_MODEL`) | env do Netlify, `production` |
| **HuggingFace** (`router.huggingface.co`, `all-MiniLM-L6-v2`) | vector da pergunta (passo 10) | `HF_API_TOKEN` | env do Netlify, `production` |
| **Netlify Blobs** | índice `rag`; edições; referral; wizard; estado do sistema; memória operacional; lances | automática no runtime Netlify | — |
| **Supabase** | config das lojas; saldo/troco (via `data-store`); métricas e notificações do admin | `SUPABASE_*` (já existentes) | env do Netlify |

**HF noutro sítio?** Medido com `git grep` em todo o repo (sem `.md` nem `_logs`): o único uso em runtime é
`fn/_lib/rag.mjs:216`. O resto são comentários, o `@xenova/transformers` do `package.json` (usado só nos builds
locais, sem token) e `desafio-gut/frontend/scripts/test-mc9.1.mjs`. O `LLM_API_KEY` só é lido em
`fn/chatbot.mjs:1311` (os outros resultados são testes, docs e o `monitor-corporativo.mjs`, que só procura a
palavra nas respostas).

## 3. O «banco de dados para consultar» — o que é, medido

Há **dois** tipos de consulta, ambos já existentes:

**(a) Conhecimento (regulamento)** — Netlify Blobs, store `rag`:
`rag:meta = {"totalChunks":3,"dimensao":384,"modelo":"Xenova/all-MiniLM-L6-v2","tamanho":500,"overlap":50,"fonte":"docs/RAG-GUTO-v2.md","criadoEm":"2026-09-26T05:54:10.835Z"}`
+ `rag:0` (2.879 car.), `rag:1` (3.063 car.), `rag:2` (698 car.) = **6.640 car. ≈ 1.700 tokens**. O índice é
consultado por **vector** (cosseno) ou, se o HF falhar, por **frequência de palavras**. É actualizado **à mão**
(`mc964-gerar-chunks.mjs` + `netlify blobs:set`; 110b). Conteúdo: o modelo antigo (110b C3/C4).

**(b) Dados vivos (comandos)** — o intent router, **antes** do índice:

| Intent (perfil que pode) | Fonte de dados |
|---|---|
| `listar_edicoes` (todos) · `criar/encerrar_edicao`, wizard (admin) | Blob `edicoes-metadata` (`_lib/edicoes-core.mjs`), Blob do wizard |
| `meu_saldo` (com sessão) | `lerTroco` → `data-store` → Supabase (`DATA_STORE_BACKEND=supabase`) |
| `indique_e_ganhe` (com sessão) · `relatorio_indicacoes` (admin) | Blobs `referral-*` (`_lib/referral.mjs`) |
| `pacotes_cotas`, `comprar_cotas`, `suporte` (todos) | texto fixo em `guto-perfis.mjs` |
| `pulso_edicao`, `simular_vencedor`, `dados_mercado` (corporativo/admin) | Blobs de lances/edições (`pulso.mjs`, `simulador.mjs`) |
| `metricas_*`, `auditoria`, `relatorio_compras`, `memoria`, `panic`, `comando_alfa` (admin) | Supabase `fila_tarefas`, `saldo_rs_creditos`, `vw_utilizadores`, `notifications`, `cotas`, `lances`, `saldo_rs` + Blobs `system-state`/log operacional |

⚠️ **Lacuna de produto (não é defeito de código):** **nenhum intent da Via B**. O GUTO não sabe responder a
«quantos pontos tenho», «quando chego ao cartão» nem «o meu palpite». Esses dados existem (`ler-pontos`,
`ler-palpites`, tabelas `pontos`/`palpites`) e o GUTO não os lê.

## 4. Diagrama — arquitectura actual

```
 ChatbotWidget.jsx ──POST /chatbot──▶ chatbot.mjs
                                        │
                                        ├─ CHATBOT_ATIVO? ──off──▶ 503
                                        ├─ rate limit · validação · perfil (JWT) · conformidade (Supabase)
                                        │
                                        ├─ INTENT ROUTER ──casa──▶ handler ──▶ Blobs / Supabase ──▶ resposta
                                        │        │ não casa
                                        ▼        ▼
                              ┌──────── RAG ────────────────────────────────┐
                              │ gerarEmbedding ──▶ HuggingFace  ✗ 401        │
                              │      │ falha → busca TEXTUAL                  │
                              │ Blobs "rag": 3 excertos (modelo ANTIGO)      │
                              │ TOP_K=3 de 3 → devolve TUDO; corta a 4000 c. │
                              └──────────────────┬──────────────────────────┘
                                                 ▼
                              chamarLLM ──▶ DeepSeek  ✗ 401
                                                 │ falha
                                                 ▼
                              TEMPLATE: 1.º excerto cru, 400 car.  ◀── o que produção mostra hoje
```

## 5. Respostas às 3 perguntas do operador

### Pergunta 1 — O `HF_API_TOKEN` ainda é preciso?

**Resposta: hoje o código chama-o, mas não é preciso. Recomendo retirá-lo.**
- **Para que serve hoje:** só para o vector da pergunta (`rag.mjs:216`), que escolhe 3 excertos num índice que tem 3
  excertos. O resultado é sempre o mesmo conjunto; o vector só muda a ordem e, com ela, o que se perde no corte dos
  4000 caracteres.
- **O que o substitui:** pôr o texto do conhecimento **inteiro** no prompt. São ~1.700 tokens hoje e, mesmo que a
  reescrita para a Via B ou o regulamento v4 inteiro entrem (`docs/REGULAMENTO-v4.md` = 16.770 B ≈ 4.500 tokens),
  fica muito abaixo do contexto do DeepSeek. Sem vector, não há HF.
- **A DeepSeek não substitui o HF em embeddings:** a documentação oficial (página principal e de preços) só lista
  `chat/completions` e **nenhum** modelo de embeddings. Os sites que dizem o contrário são de agregadores e
  contradizem-se. Se um dia o conhecimento crescer tanto que não caiba no prompt, aí é preciso um fornecedor de
  embeddings (o HF serve; o token teria de ser renovado).
- **Se o operador preferir manter o RAG:** o HF continua necessário e a chave está inválida (401) → é preciso gerar
  um token novo.

### Pergunta 2 — Qual o modelo DeepSeek correcto?

**Resposta: `deepseek-flash`.**
- É o nome actual na página oficial de preços: «Use `deepseek-flash` as the model name». Preço por 1M tokens:
  cache hit 0,003/0,006 US$ · cache miss 0,15/0,30 US$ · saída 0,60/1,20 US$ (fora de pico / pico).
- `deepseek-v4-pro` custa ~4,4× na entrada e 3,3× na saída. Um assistente de regulamento com respostas curtas não
  justifica esse custo.
- `deepseek-v4-flash` (o valor actual de `LLM_MODEL`) **ainda funciona**, porque é legado mas aceite. Mudar o nome é
  arrumação, **não** a correcção do 401.
- O default do código `deepseek-chat` (`fn/chatbot.mjs:58`) **não aparece** na documentação actual. **LACUNA:** não
  sei se ainda é aceite, e não fiz chamadas (exigiria uma chave). Deve passar a `deepseek-flash`.
- ⚠️ **Risco a medir antes de ligar:** a memória do projecto Devir (setembro) regista o `deepseek-flash` como modelo
  **de raciocínio**: o `max_tokens` cobre o pensamento **e** a resposta, e com valores curtos devolve `content = ""`.
  O GUTO usa `max_tokens: 512` (`fn/chatbot.mjs:1339`) e trata a string vazia como falha (`:1365-1366` →
  `llm_resposta_vazia`), o que faria cair outra vez no template. A sonda P0 tem de medir isto.
- **Como corrigir:** o operador muda `LLM_MODEL` para `deepseek-flash` no Netlify (contexto `production`, scope
  Functions). Só **depois** de a fonte ter sido reescrita (ordem do 110b, mantida).

### Pergunta 3 — O banco de dados actual serve ou precisa de mudar?

**Resposta: o armazenamento serve; o conteúdo não. E para o conhecimento recomendo deixar de ter «banco».**
- **Dados vivos (Blobs + Supabase dos intents):** **SERVEM**. Estão a funcionar e não são a causa do B-4.
- **Conhecimento (Blob `rag`):** o Netlify Blobs funciona bem como armazenamento, mas aqui é a origem de três dos
  cinco problemas do 110b: conteúdo desactualizado (C3), dois builds divergentes e comentários que mentem (C5), e
  actualização manual sem guarda. Para ~2–5 mil tokens, um índice não traz nada. **Recomendo:** a fonte vive **no
  repo** e é embutida no código da função. Assim, editar e fazer deploy **é** actualizar o GUTO, e o problema
  «editei o regulamento e o GUTO não mudou» (MC88.44) deixa de poder acontecer.
- **pgvector (Supabase):** **não** recomendado. Para 3 excertos é desproporcionado (Nível 3 do 110b, mantido fora).
- **Em qualquer caso**, o conteúdo tem de ser reescrito para a Via B, com o texto aprovado pelo operador (C4 do 110b).

## 6. Porque é que as chaves dão 401 (hipótese, NÃO medida)

O `desafio-gut/docs/MC89-relatorio-final.txt:616-634` registou uma **chave DeepSeek exposta** e recomendou ao operador **revogá-la**
(P0). Se a chave revogada for a mesma que está no `LLM_API_KEY`, o 401 é o resultado esperado. Não li o valor (R5),
portanto **não confirmo**. Serve para orientar o operador: gerar uma chave nova no painel da DeepSeek.

## 7. Limites desta auditoria

- **Zero chamadas** à API DeepSeek ou HF: as respostas sobre modelo e embeddings vêm da documentação oficial,
  não de medição.
- O scope «Functions» das variáveis continua por medir (110b L-1).
- Não abri o widget num browser (o gate LGPD exige aceites em nome de alguém).

## ERRATA (pós-validador adversarial, 2026-10-12) — o texto acima fica à vista; estas linhas prevalecem

Veredicto do validador: **PARCIAL, 1 bloqueante** (`_logs/UTAC110b.1_SEG4_VALIDADOR.md`). Todos os pontos confirmados por mim antes de os aceitar.

- **E1 ⛔ (REFUTA «não existe um terceiro banco», §0.1 e §3):** existe uma **terceira fonte de conhecimento**, que eu não mapeei e o 110b também não. É o próprio **system prompt**: `obterPromptSystem` (`fn/_lib/guto-perfis.mjs:159-162`) junta a cada chamada `REGRA_LINGUAGEM` (`:100-109`), `REGRA_REGULAMENTO` (`:139-157`) e `ARTIGOS_V4` (texto literal dos artigos, `:119-137`). Esses blocos afirmam o **modelo antigo**:
  - «TORNEIO DE HABILIDADE» com base na «Portaria SPA/MF 1.207/2024» (`:102`, `:147`);
  - «Programado (consome SENHAS)» (`:149`);
  - «Senha: R$ 2,00» (`:150`).

  ⇒ **Mesmo com chaves válidas e índice novo, o GUTO continuaria a ensinar o modelo antigo.** É a fonte com mais peso, porque está no system prompt. O teste `fn/_tests/mc963-guto-regulamento-v4.test.mjs` prende estes blocos.
- **E2 ⚠️ (corrige §0.2 e o diagrama §4):** a busca **textual**, o caminho que corre hoje em produção, **descarta** excertos sem termos da pergunta (`fn/_lib/rag.mjs:287`, `if (hits === 0) continue`). Pode devolver **menos** de 3 (o validador mediu 2 de 3, e o 110b mediu 2 fontes em produção). «TOP_K=3 de 3 → devolve TUDO» só vale para o caminho **semântico**, e mesmo aí a ordem pode tirar do corte dos 4000 caracteres um excerto inteiro. A conclusão mantém-se: a busca não acrescenta valor com 3 excertos. A justificação fica corrigida.
- **E3 ⚠️ (§3, «dados vivos servem»):** os intents `pacotes_cotas`/`comprar_cotas` (`fn/_lib/guto-perfis.mjs:321-332`) ainda vendem cotas Bronze–Diamante ao lojista, que saiu do app no 108f. Os dados servem; **este texto não**.
- **E4 ℹ️ (citação errada, SEG-1 §5 e §1):** `rag.mjs:152-153` são comentários. A leitura real de `NETLIFY`/`AWS_LAMBDA_FUNCTION_NAME` está em `fn/_lib/rag.mjs:207-208`. E `desafio-gut/frontend/scripts/test-mc9.1.mjs` **lê o texto** de `rag.mjs` mas não o importa.
- **E5 ℹ️ (§6, hipótese do 401):** a chave exposta referida no MC89 era a do Claude Code (`settings.json`), não necessariamente a do Netlify. A hipótese fica **mais fraca**: o motivo do 401 continua não medido.
- **E6 ℹ️:** a documentação oficial dá o `base_url` `https://api.deepseek.com`, sem `/v1`. O código e a env usam `/v1`. Não testado (as APIs compatíveis com OpenAI costumam aceitar os dois).
- **E7 ⚠️ (P2):** a página oficial diz que o **thinking é o modo por omissão**. Isto reforça o risco do `max_tokens: 512` (`fn/chatbot.mjs:1339`): o passo P0 da proposta tem de o medir.
