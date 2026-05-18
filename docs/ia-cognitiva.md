# IA Cognitiva — Chatbot RAG 24/7

> Mega Comando 9 · Assistente conversacional do DESAFIOGUT com Retrieval-Augmented Generation sobre o regulamento oficial.

## Visão geral

Um chatbot disponível em todas as rotas do app (`<ChatbotWidget />` em `App.jsx`) que responde dúvidas sobre regras, cotas, pagamentos, vouchers e o sistema "Indique e Ganhe" usando exclusivamente o conteúdo de `docs/chatbot/regulamento.md` — sem alucinar respostas fora do regulamento.

## Arquitetura RAG

```
┌─────────────────────────────────────────────────────────────┐
│                       FASE 1 — INDEXAÇÃO                    │
│                  (offline, executada manualmente)            │
└─────────────────────────────────────────────────────────────┘

  docs/chatbot/regulamento.md
            │
            ▼
  scripts/build-rag-index.mjs
   ├── splitIntoChunks(500 palavras, overlap 50)   ~50–100 chunks
   ├── gerarEmbedding() × N                        text-embedding-3-small
   └── store.setJSON("rag:{n}", { texto, embedding })
                                                   + rag:meta

┌─────────────────────────────────────────────────────────────┐
│                       FASE 2 — CONSULTA                     │
│                   (online, por request)                      │
└─────────────────────────────────────────────────────────────┘

  Usuário digita pergunta no <ChatbotWidget />
            │
            ▼
  POST /.netlify/functions/chatbot { pergunta }
   ├── aplicarRateLimit (10/min/IP)
   ├── gerarEmbedding(pergunta)                    text-embedding-3-small
   ├── buscarChunksRelevantes(store, embedding, 3) cosine similarity
   ├── montarContexto(chunks)                      até 4000 caracteres
   └── chamarLLM(pergunta, contexto)               DeepSeek V4 Flash
            │
            ▼
  { resposta: string, fontes: [{id, score}] }
```

## Como construir o índice

```bash
# Pré-requisitos
export NETLIFY_SITE_ID=...
export NETLIFY_AUTH_TOKEN=...
export OPENAI_API_KEY=sk-...

# Rodar
cd desafio-gut/frontend
npm run build:rag
# ou diretamente:
node ../../scripts/build-rag-index.mjs
```

O script é idempotente: se já houver um índice anterior (`rag:meta` no store `rag`), ele pergunta antes de sobrescrever. Use `--yes` para CI/CD.

## Modelos utilizados

| Camada | Modelo | Provedor | Custo aproximado |
|---|---|---|---|
| Embeddings | `text-embedding-3-small` (1536 dim) | OpenAI | $0,02 / 1M tokens |
| LLM (chat) | `deepseek-chat` (DeepSeek V4 Flash) | DeepSeek | $0,14 / 1M tokens input · $0,28 / 1M output |

> Os endpoints são compatíveis com a API OpenAI Chat Completions. Você pode trocar o provedor via env vars `LLM_BASE_URL` / `LLM_MODEL` (ex.: `https://api.openai.com/v1` + `gpt-4o-mini`).

### Custo estimado mensal

Cenário moderado (50 perguntas/dia):

- Embedding da pergunta: ~50 tokens × 50 × 30 = 75k tokens/mês → **$0,002**
- Contexto + pergunta ao LLM: ~2k tokens input + 200 output × 1500 = 3M input + 300k output → **$0,50**
- Build do índice (1× por mês ao atualizar regulamento): ~30k tokens → **$0,001**
- **Total: ~$0,50–$1/mês** em uso real

Cenário stress (10 reqs/min/IP × 10 IPs únicos × 1h/dia): ~6k perguntas/mês → ainda dentro de **$5–$15/mês**.

## Variáveis de ambiente

| Variável | Onde configurar | Obrigatório | Default |
|---|---|---|---|
| `CHATBOT_ATIVO` | Netlify Dashboard | recomendado | `on` |
| `OPENAI_API_KEY` | Netlify Dashboard + ambiente do build script | sim | — |
| `OPENAI_BASE_URL` | opcional | não | `https://api.openai.com/v1` |
| `EMBED_MODEL` | opcional | não | `text-embedding-3-small` |
| `LLM_API_KEY` | Netlify Dashboard | sim | — |
| `LLM_BASE_URL` | opcional | não | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | opcional | não | `deepseek-chat` |
| `NETLIFY_SITE_ID` | ambiente do build script | sim para script | — |
| `NETLIFY_AUTH_TOKEN` | ambiente do build script | sim para script | — |

## Feature flag

- `CHATBOT_ATIVO=on` (default) → endpoint funcional.
- `CHATBOT_ATIVO=off` → endpoint responde 503 `feature_desligada` e o widget mostra "assistente temporariamente indisponível". Rollback instantâneo via env var no Netlify Dashboard.

## Rate limit

`/chatbot` aceita até **10 reqs/min/IP** (padrão MC1 para endpoints públicos). Excedido → 429 `rate_limit_excedido`. O widget mostra mensagem amigável ao usuário.

## Convenções de Blob

Store `rag` (consistency strong):

| Chave | Conteúdo |
|---|---|
| `rag:meta` | `{ totalChunks, dimensao, modelo, tamanho, overlap, fonte, criadoEm }` |
| `rag:{n}` | `{ id, ordem, texto, embedding: number[1536] }` para `n` em `[0, totalChunks)` |

`buscarChunksRelevantes` lê `rag:meta`, itera de 0 a `totalChunks-1` e ranqueia por similaridade do cosseno.

## Limitações

- **Só responde com base no regulamento.** Para perguntas fora do escopo, o assistente diz "Não tenho essa informação no regulamento. Para detalhes específicos, contate suporte@desafiogut.com.br."
- **Não tem memória conversacional persistente no backend.** O histórico fica em `localStorage.gut_chat_history` (apenas exibição) — cada pergunta é enviada isolada para o `/chatbot`. Para conversas multi-turn reais, será necessário enviar histórico no body (futuro).
- **Latência:** ~1–3 s por resposta (embedding + busca + LLM). Indicador de digitação no widget mostra que está processando.
- **Idioma:** o regulamento é em pt-br; respostas devem ser em pt-br. O LLM é multilíngue mas o prompt system instrui resposta em português.
- **Sem RAG re-rank.** A versão atual usa apenas top-3 por cosine similarity. Se a qualidade das respostas degradar, considerar re-rank com cross-encoder (próxima onda).

## Operação

### Atualizar a base de conhecimento

1. Edite `docs/chatbot/regulamento.md`.
2. Rode `npm run build:rag` (ou `node scripts/build-rag-index.mjs --yes` em CI).
3. Verifique no Netlify Blobs UI: store `rag`, chave `rag:meta` deve refletir `criadoEm` recente.

### Trocar de provedor LLM

```bash
# Para OpenAI gpt-4o-mini:
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...

# Para Anthropic (compatibilidade beta):
LLM_BASE_URL=https://api.anthropic.com/v1
LLM_MODEL=claude-haiku-4-5-20251001
LLM_API_KEY=sk-ant-...
```

### Debugar respostas ruins

1. No request, capture `data.fontes` — os `chunk_ids` com score < 0.4 sugerem pergunta fora do escopo.
2. Cheque o conteúdo do chunk via `netlify blobs:get rag rag:0`.
3. Se o regulamento não cobre a pergunta, **atualize `regulamento.md`** e rode o build novamente. Não tente fazer o LLM "lembrar" via prompt — viola o princípio do RAG.

## Observabilidade

- `console.info("[chatbot] resposta gerada", { perguntaLen, chunks, scoreTop })` em cada request bem-sucedido.
- Erros: `console.error("[chatbot] LLM falhou:", ...)`, `console.warn("[chatbot] buscarChunks falhou:", ...)`.
- Para métricas (volume, latência, falhas): use o painel do Netlify Functions ou Logflare/Datadog.

## Próximos passos

1. **Re-rank por cross-encoder** (ex.: `bge-reranker-base`) após top-K para melhorar precisão.
2. **Conversa multi-turn:** enviar histórico no body do POST e expandir `PROMPT_SYSTEM` para `messages` com role rotation.
3. **Quotas por usuário autenticado:** rate-limit atual é só por IP; adicionar JWT user-session quando logado.
4. **Stream de resposta:** SSE para mostrar a resposta sendo "digitada" em tempo real.
5. **Avaliação automática:** golden set de perguntas/respostas com cron que mede taxa de acerto semanal.
