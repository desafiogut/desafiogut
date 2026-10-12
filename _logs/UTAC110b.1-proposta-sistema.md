# UTAC110b.1 — Proposta de sistema para o GUTO

**Baseline:** `ae72248` · Propõe; **não decide** (a decisão é do operador). Caminhos `fn/` = `desafio-gut/frontend/netlify/functions/`.
Base factual: `_logs/UTAC110b.1-guto-arquitectura.md`. Substitui o plano Nível 2 do 110b **só na parte do RAG**. O resto
do Nível 2 (reescrever a fonte, falhas visíveis, testes) mantém-se.

## 1. Recomendação

**«Conhecimento no prompt» + DeepSeek `deepseek-flash`.** Tirar o HuggingFace, o índice no Blob e os dois scripts de
build. O texto do GUTO passa a viver no repo e entra **inteiro** no prompt. Os dados vivos (intents) ficam como estão.

**Porquê esta e não «arranjar as chaves e reindexar»** (que também resolveria o B-4):
- Medido: o índice tem 3 excertos e o GUTO pede sempre 3 (§1 da arquitectura). A busca não escolhe nada, e o corte
  aos 4000 caracteres deita fora ~40% do texto, conforme a ordem.
- Um fornecedor externo a menos (HF), uma credencial a menos, um passo de build manual a menos.
- Fecha **por construção** os problemas C3 (índice desactualizado) e C5 (dois builds, comentários falsos) do 110b, em
  vez de os vigiar.
- Custo: cerca de 2–5 mil tokens de entrada por pergunta, quase todos **repetidos** (prefixo igual) e, por isso,
  elegíveis para o preço de cache.

**Quando NÃO serve:** se o conhecimento crescer além de ~50–100 mil tokens. Nessa altura volta o RAG com um
fornecedor de embeddings. Não é o caso hoje (o regulamento v4 inteiro tem ~4.500 tokens).

## 2. Arquitectura proposta

```
 ChatbotWidget.jsx ──POST /chatbot──▶ chatbot.mjs
                                        │
                                        ├─ CHATBOT_ATIVO · rate limit · validação · perfil · conformidade  (igual)
                                        ├─ INTENT ROUTER ──▶ Blobs / Supabase  (igual; + intents Via B no futuro)
                                        │
                                        ▼
                     _lib/guto-conhecimento.mjs  ◀── docs/GUTO-CONHECIMENTO.md (repo, Via B, aprovado)
                        texto INTEIRO, embutido no bundle (sem Blob, sem índice, sem HF)
                                        │
                                        ▼
                     chamarLLM ──▶ DeepSeek  deepseek-flash
                        [system+perfil+CONHECIMENTO, ...histórico, user]
                                        │ falha (rede/chave/vazio)
                                        ▼
                     resposta de indisponibilidade + contacto  (sem colar texto cru)
                     + campo `motivo` no JSON e log estruturado (falha visível — 110b C2)
```

## 3. As 5 causas do 110b — como esta proposta trata cada uma

| Causa 110b | Tratamento |
|---|---|
| C1 chaves falham (agora sabemos: 401 nas duas) | DeepSeek: chave nova. HF: **deixa de existir** |
| C2 falha silenciosa | campo `motivo` na resposta + log com `modoResposta`/`motivo`. Teste |
| C3 índice desactualizado (o «80%») | **sem índice**: o conhecimento é o ficheiro do repo, o mesmo que vai no deploy |
| C4 a fonte descreve o modelo antigo | reescrita para a Via B; **texto aprovado pelo operador** (bloqueante) |
| C5 comentários falsos / dois builds | `rag.mjs`, `build-rag-index.mjs` e `mc964-gerar-chunks.mjs` saem do caminho de runtime (e depois do repo) |

## 4. Ordem de implementação (110c)

⛔ **Ordem obrigatória (herdada do 110b):** o LLM só volta a funcionar **depois** de o conhecimento novo estar
publicado. Hoje o que esconde o «80%» é o LLM estar em baixo.

| # | Passo | Quem | Ficheiro:linha | Tempo | Risco | Custo |
|---|---|---|---|---|---|---|
| P0 | Gerar chave DeepSeek nova (**não** a pôr ainda no Netlify). Sonda local de 2 chamadas com `deepseek-flash`: (a) `max_tokens 512` devolve texto ou `""`? (b) `deepseek-chat` ainda é aceite? | operador (+ script do 110b) | — | 15 min | baixo | ~US$ 0,001 |
| 1 | Reescrever o conhecimento para a Via B → `docs/GUTO-CONHECIMENTO.md` (base: `docs/RAG-GUTO-v2.md` + NORTE + `docs/regras-oficiais.md`). **Operador aprova o texto** | executor + operador | `docs/RAG-GUTO-v2.md:17` (o `---`), `:90-91` (Art. 14) | 1–2 h | médio (jurídico) | 0 |
| 2 | `_lib/guto-conhecimento.mjs`: exporta o texto (gerado do `.md` por um teste de igualdade; sem leitura de disco em runtime) | executor | novo | 30 min | baixo | 0 |
| 3 | `chatbot.mjs`: trocar o bloco RAG pelo conhecimento inteiro; system = perfil + conhecimento | executor | `fn/chatbot.mjs:1446-1471` (sai), `:1317-1319` (userContent), `:1479-1482` | 1 h | médio | 0 |
| 4 | Fallback sem texto cru + campo `motivo` + log | executor | `fn/chatbot.mjs:1483-1498`, `fn/_lib/guto-perfis.mjs:354` | 45 min | baixo | 0 |
| 5 | Default do modelo `deepseek-flash`; `max_tokens` conforme o P0 (ex.: 1024–2048 se for de raciocínio) | executor | `fn/chatbot.mjs:58`, `:1339` | 10 min | baixo | 0 |
| 6 | Testes: conhecimento ↔ `.md` iguais; o prompt contém o conhecimento; zero «80%»/«1 senha por lance»/«1.207/2024»; fallback sem texto cru; mutação | executor | `fn/_tests/` (novo) | 1–1,5 h | baixo | 0 |
| 7 | Deploy (push) **com a chave ainda inválida** → produção responde fallback com `motivo` | executor | — | 15 min | baixo | créditos Netlify |
| 8 | Operador põe a chave nova + `LLM_MODEL=deepseek-flash` (production, scope Functions) | operador | — | 5 min | baixo | — |
| 9 | Verificar em produção: `modoResposta:"llm"`; 5 perguntas-teste (Passe, pontos, cartão, Art. 14, contacto) | executor | — | 30 min | baixo | ~US$ 0,01 |
| 10 | Limpeza: retirar `HF_API_TOKEN` do Netlify; apagar o Blob `rag`, `rag.mjs`, os 2 scripts e as dependências `@xenova/transformers` (só depois de uma semana estável) | operador + executor (UTAC próprio) | `fn/_lib/rag.mjs`, `scripts/build-rag-index.mjs`, `scripts/mc964-gerar-chunks.mjs`, `desafio-gut/frontend/package.json:28` | 1 h | médio (lockfile: 2 modos de `npm install`) | 0 |

**Total executor:** ~5–7 h ⇒ ultrapassa o HI5 (2 h). Dividir: **110c-1** (passos 2–7, código e testes, com o texto
P1 já aprovado) e **110c-2** (8–9, ligar e verificar). O passo 10 é UTAC próprio.

## 5. Custos estimados (API)

Pressupostos: system ~1.000 tokens + conhecimento ~2.000–4.500 + histórico ~500 + pergunta ~50 ⇒ **~3.500–6.000
tokens de entrada**; saída ~300–600 (mais se for modelo de raciocínio). Preços oficiais do `deepseek-flash` (pico).

| Cenário | Por pergunta | 1.000 perguntas/mês |
|---|---|---|
| Pior caso (sem cache, 6k in + 1k out, pico) | ~US$ 0,0030 | ~US$ 3 |
| Típico (prefixo em cache, 300 out) | ~US$ 0,0005 | ~US$ 0,50 |

O rate limit (10/min por IP, `fn/chatbot.mjs:43`) limita abusos. Hoje o HF não custa nada (está a falhar). Retirá-lo
também elimina a latência de uma chamada a mais por pergunta.

## 6. Alternativas (para o operador comparar)

| Opção | O que faz | Prós | Contras |
|---|---|---|---|
| **A — recomendada** | conhecimento no prompt; sem HF | menos peças; fecha C3/C5; actualiza com o deploy | ~3–5k tokens/pergunta (barato) |
| B | mantém o RAG; chaves novas (HF + DeepSeek); reindexa | menor mudança de código | 2 credenciais; build manual continua; a busca continua a não escolher nada com 3 excertos |
| C | pgvector no Supabase | escala para muito conteúdo | desproporcionado; migração + build + credenciais |

## 7. Fora desta proposta (registado)

- **Intents da Via B** (pontos, cartão, palpite): lacuna de produto, UTAC próprio depois do 110c.
- `CHATBOT_ATIVO=off` como mitigação interina continua disponível (`fn/chatbot.mjs:1378-1380`).
- O tom «tu» (pt-PT) da `INSTRUCAO_CONTEXTO` (`fn/chatbot.mjs:1284-1287`) é prompt, não UI. Rever na reescrita.

## ERRATA (pós-validador adversarial, 2026-10-12) — o texto acima fica à vista; estas linhas prevalecem

- **E1 ⛔ → NOVO PASSO 3b (obrigatório, ANTES do passo 7):** reescrever para a Via B os blocos do system prompt `REGRA_LINGUAGEM`, `REGRA_REGULAMENTO` e `ARTIGOS_V4` (`fn/_lib/guto-perfis.mjs:100-162`).
  - Hoje afirmam senhas, «torneio de habilidade» e Portaria SPA/MF 1.207/2024.
  - Entram no mesmo texto que o operador aprova no passo 1.
  - Actualizar o teste `fn/_tests/mc963-guto-regulamento-v4.test.mjs`, que hoje os prende.
  - **Executor + operador, 1–1,5 h, risco médio (jurídico).**

  Sem isto, o passo 8 religa o LLM com um system prompt que ensina o modelo antigo e **viola a ordem obrigatória**.
- **E1 → passo 6 corrigido:** o teste «zero 80% / 1 senha por lance / 1.207/2024» mede o **`obterPromptSystem` completo**, para os 4 perfis e em modo de conformidade. Não basta o ficheiro de conhecimento.
- **Nota que reforça a recomendação A:** o padrão «conhecimento inteiro no prompt» **já existe e já está em produção** (`ARTIGOS_V4` entra literal em todas as chamadas). A opção A não é arquitectura nova: junta duas fontes de conhecimento numa só e tira a que depende do HF.
- **E2:** com a busca textual, o índice pode devolver 2 de 3 excertos (`fn/_lib/rag.mjs:287`). A conclusão da secção 1 mantém-se; a justificação é a do E2 da arquitectura.
- **E3 → passo 1 alargado:** rever também os textos fixos `pacotes_cotas`/`comprar_cotas` (`fn/_lib/guto-perfis.mjs:321-332`), que ainda vendem cotas ao lojista (saiu no 108f).
- **E7 → custos:** o caso típico não contava os tokens de raciocínio (o thinking vem ligado por omissão). Valor realista: **~3–5× o típico**, ou seja ~US$ 1,5–2,5 por 1.000 perguntas. Continua barato.
- **Total do executor revisto:** ~6–8,5 h ⇒ a divisão em 110c-1/110c-2 mantém-se. O 110c-1 inclui o passo 3b.
