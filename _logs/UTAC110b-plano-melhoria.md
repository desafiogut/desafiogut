# UTAC110b — PLANO DE MELHORIA DO GUTO (para o 110c) · Frente B

> **Recomenda, não decide.** A decisão é do operador. Base: `_logs/UTAC110b-guto-diagnostico.md` (causas C1–C5).
> `fn/` = `desafio-gut/frontend/netlify/functions/`. Custos = estimativa do executor (não medidos); riscos com mitigação.
> **Cenário diagnosticado: «Múltiplas»** (C1 + C2 + C3 + C4 + C5).

## Pré-condição comum (antes de qualquer nível)

**P0 — Fechar a LACUNA L-1 (o motivo exacto de C1).** É o operador que faz, porque os valores são credenciais (R5).
Sonda sugerida (o operador corre-a na **própria shell** e define ele as variáveis; imprime só status/primeiros bytes):

```js
// sonda-chaves.mjs — o operador define $env:HF_API_TOKEN / $env:LLM_API_KEY / $env:LLM_BASE_URL / $env:LLM_MODEL
const M="sentence-transformers/all-MiniLM-L6-v2";
const hf=await fetch(`https://router.huggingface.co/hf-inference/models/${M}/pipeline/feature-extraction`,
  {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.HF_API_TOKEN}`},
   body:JSON.stringify({inputs:"teste",options:{wait_for_model:true}})});
const hfTxt=await hf.text(); console.log("HF",hf.status,hfTxt.slice(0,80));
const base=(process.env.LLM_BASE_URL||"https://api.deepseek.com/v1").replace(/\/$/,"");
const ll=await fetch(`${base}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",
  Authorization:`Bearer ${process.env.LLM_API_KEY}`},body:JSON.stringify({model:process.env.LLM_MODEL||"deepseek-chat",
  messages:[{role:"user",content:"oi"}],max_tokens:5})});
console.log("LLM",ll.status,(await ll.text()).slice(0,120));
```
Leitura: `401/403` ⇒ chave inválida/revogada → **rotar**; `402` ⇒ sem saldo → **carregar**; `404/410` no HF ⇒ o
modelo saiu do fornecedor `hf-inference` → **mudar de endpoint/modelo** (Nível 2, acção 2.6); `200` ⇒ o problema
está noutro lado (rede da Lambda) → re-diagnosticar. **Custo:** 2 min do operador. **Risco:** nenhum (só leitura).

---

## NÍVEL 1 — CORRECÇÃO MÍNIMA (Ponytail) · ≈ 45 min a 1 h 30

Objectivo: o GUTO **conversa** (LLM ligado), com **conteúdo correcto à data da última fonte** e sem `---`.

| # | acção | onde | custo | risco |
|---|---|---|---|---|
| 1.1 | Repor a(s) chave(s) que a P0 apontar (`LLM_API_KEY` e/ou `HF_API_TOKEN`) + **redeploy** (as functions só lêem env no arranque) | Netlify env (operador) | 10-15 min | baixo; mitigação: rotar sem apagar a antiga até a sonda dar 200 |
| 1.2 | **Reindexar** a fonte actual (`70a36eb`) pelo caminho REAL (`scripts/mc964-gerar-chunks.mjs` + `netlify blobs:set`) — tira o «80 %» do Art. 14 do índice vivo | `scripts/mc964-gerar-chunks.mjs:23,32`; Blob `rag` | 15-20 min | médio: escrever em produção; mitigação: guardar os 4 blobs actuais (`blobs:get`) antes; reverter = `blobs:set` dos antigos |
| 1.3 | Corrigir os comentários que mentem (só texto, zero comportamento) | `fn/_lib/rag.mjs:9-10`, `:145-146`, `:248`; `scripts/build-rag-index.mjs:5-6,10,19` | 15 min | nulo; mitigação: diff só de comentários |
| 1.4 | Tirar o `---` da 1.ª linha do chunk 0: remover o separador inicial na fonte derivada **ou** fazer o `mc964` aparar `---` iniciais | `docs/RAG-GUTO-v2.md` (início) / `scripts/mc964-gerar-chunks.mjs:32` | 10 min | baixo; o `mc967` compara as 2 fontes — actualizar as duas pelo `mc967-unificar-fontes.mjs` |

**Critérios de sucesso (medidos em produção, 1 chamada cada):**
- `modoResposta:"llm"` (não `"template"`) na pergunta do 109i;
- `modoBusca:"semantica"` se a 1.1 incluir o HF (senão `"textual"` é aceitável neste nível);
- `blobs:get rag rag:1` **sem** «80%» e **com** «não há conversão nem substituição por dinheiro»;
- nenhum chunk começa por `---`;
- `grep 1536|text-embedding-3-small|OPENAI_API_KEY` em `rag.mjs`/`build-rag-index.mjs` = 0.

**⚠️ O que o Nível 1 NÃO resolve:** **C4 — o GUTO continua a ensinar o modelo antigo** («1 senha por lance»,
«SPA/MF 1.207/2024», «menor lance único» na Programada), porque **a fonte do repo também está assim**. Com o LLM
ligado, o efeito pode até piorar: passa a **explicar com fluência** o modelo errado. ⇒ **Nível 1 sozinho não chega
para o AAB.**

---

## NÍVEL 2 — CORRECÇÃO SÓLIDA · ≈ 3 a 5 h (+ tempo do operador para o conteúdo)

Inclui o Nível 1, mais as 5 fraquezas do 109i e as falhas silenciosas.

| # | acção | onde | custo | risco / mitigação |
|---|---|---|---|---|
| 2.0 | **Reescrever a fonte do RAG para a Via B** (Passe → pontos → cartão; palpite = bónus; SPA/MF não se aplica; vendedor = Associação). **Conteúdo de produto ⇒ o operador aprova o texto** (AU3) | `docs/RAG-GUTO-v2.md:21,26-27,44-54,76-78,111` → `scripts/mc967-unificar-fontes.mjs` → `docs/chatbot/regulamento.md` | 1-2 h (redacção) + revisão do operador | ALTO se inventado; mitigação: copiar só factos já medidos em `docs/regras-oficiais.md` e na secção NORTE do CLAUDE.md (fontes vigentes) |
| 2.1 (F1) | Comentários verdadeiros (= 1.3) | ver 1.3 | — | — |
| 2.2 (F2) | Ler o índice **uma vez** em paralelo (`Promise.all`) **e** guardar em memória do módulo com TTL (ex.: 10 min, chave = `rag:meta.criadoEm`) | `fn/_lib/rag.mjs:122-135`, `:266-290` | 45 min | baixo; teste: nº de `store.get` por pergunta = 0 com cache quente; invalidar quando `criadoEm` muda |
| 2.3 (F3) | Chunking **por secção** (`## `) com tecto de palavras e fusão de secções curtas; aparar `---`/HTML | `fn/_lib/rag.mjs:45-64` (nova função; manter `splitIntoChunks` por compatibilidade) | 45 min | médio: muda o índice; mitigação: reindexar só após A/B de recuperação (2.7) |
| 2.4 (F4) | **Limiar de score** + topK adaptativo: abaixo do limiar ⇒ «não encontrei» em vez de 3 chunks irrelevantes; re-ranking simples (bónus por termos da pergunta presentes no título da secção) | `fn/chatbot.mjs:45`; `fn/_lib/rag.mjs:136-137`, `:291-292` | 45 min | médio: o limiar por calibrar; mitigação: calibrar com o conjunto de perguntas do 2.7 |
| 2.5 (F5) | **Um só build** (apagar ou alinhar `build-rag-index.mjs` com o `mc964`: mesma fonte, mesmo `<!-- -->` removido) + gravar no `rag:meta` o **sha256 da fonte** + **teste** que compara esse sha com o ficheiro do repo (falha se o índice estiver stale) | `scripts/build-rag-index.mjs:78-86,124-133`; `scripts/mc964-gerar-chunks.mjs`; `fn/_tests/` (novo) | 1 h | baixo; o teste precisa de ler o Blob ⇒ ou corre só em CI com token, ou compara contra um `docs/chatbot/rag-meta.json` versionado |
| 2.6 | **Falha visível** (fim de C2): devolver `diagnostico:{busca:"hf_http_401",llm:"llm_http_402"}` (só código, sem segredo) no JSON **ou** enviar ao Sentry; e um `GET /chatbot?saude=1` que diga se HF/LLM respondem | `fn/chatbot.mjs:1456-1459`, `:1483-1491` | 45 min | baixo; não expor corpo de erro do fornecedor (pode trazer IDs); mitigação: só o código `*_http_<status>` |
| 2.7 | **Testes de recuperação** (não existem — E1): ≥ 10 perguntas reais com o chunk esperado (ex.: «quanto custa o Passe?» → secção do Passe); + testes unitários de `rag.mjs` (hoje 0) | `fn/_tests/rag-*.test.mjs` (novo) | 1 h | baixo; com duplo do store **fiel** (lição MC93: duplo não pode ser mais permissivo que o real) |
| 2.8 | Coerência do template com a regra que ele próprio cita (E3): ou cumprir «nunca despejar o chunk bruto» (frase-resumo + contacto), ou corrigir o comentário | `fn/_lib/guto-perfis.mjs:354-369` | 20 min | baixo |

**Critérios de sucesso:** todos os do Nível 1 **+** (a) ≥ 9/10 perguntas do conjunto 2.7 recuperam o chunk certo;
(b) a pergunta «o Passe e os pontos» devolve a secção do Passe (no 109i devolvia a tabela de pagamentos);
(c) 0 ocorrências de «1 senha por lance», «1.207/2024» e «menor lance único» **ligado à Programada** no índice vivo;
(d) teste de sincronia índice × fonte **vermelho** quando se muda a fonte sem reindexar (prova por mutação);
(e) uma falha simulada do HF/LLM aparece na resposta/Sentry com o código.

---

## NÍVEL 3 — CORRECÇÃO ESTRUTURAL · ≈ 1 a 2 dias

| # | acção | onde | custo | risco |
|---|---|---|---|---|
| 3.1 | Base vectorial real: **Supabase pgvector** (extensão + tabela `rag_chunks(id, secao, texto, embedding vector(384), fonte_sha)` + índice HNSW) e busca por RPC | migração nova `supabase/migrations/`; `fn/_lib/rag.mjs` (novo backend de busca) | 4-6 h | médio: migração em produção (autorização ST3); mitigação: tabela nova, sem tocar no Blob até o A/B passar |
| 3.2 | Índice construído em **CI/CD** quando `docs/RAG-GUTO-v2.md` muda (job com o token em segredo do GitHub) | `.github/workflows/` (novo job) | 2-3 h | médio: segredo novo no CI; mitigação: job só em `main`, `--dry-run` em PR |
| 3.3 | Embeddings sem dependência frágil: fixar um fornecedor com SLA (ou embeddings pré-calculados das perguntas mais comuns) | `fn/_lib/rag.mjs:176-221` | 2 h | médio: custo recorrente; decisão do operador |
| 3.4 | Avaliação contínua: conjunto de perguntas-ouro + métrica (recall@3) a correr em CI | `fn/_tests/` + workflow | 2 h | baixo |
| 3.5 | Fallback **explícito** em vez de template silencioso: com LLM em baixo, responder com um texto curto e honesto + contacto, e alertar | `fn/chatbot.mjs:1483-1500` | 1 h | baixo |

**Critérios de sucesso:** os do Nível 2 **+** índice sempre igual à fonte em `main` (CI vermelho se não);
recall@3 ≥ 0,9 no conjunto-ouro; latência p95 da busca < 300 ms; zero respostas `template` sem alerta.

**Quando se justifica:** só se o volume de conteúdo crescer muito (hoje são **3 chunks / ~1 100 palavras**) ou se o
GUTO passar a precisar de vários documentos. **Com 3 chunks, pgvector é desproporcionado** (Ponytail) — o Nível 2
(cache em memória + chunking por secção) dá a mesma qualidade a custo quase nulo.

---

## Tabela de decisão final

| Cenário diagnóstico | Nível recomendado | 110c faz | Duração |
|---|---|---|---|
| Só chave ausente | Nível 1 | Repor + redeploy | 15 min |
| Só comentário mentiroso | Nível 1 | Corrigir comentário | 30 min |
| Chave + comentário | Nível 1 | Ambos | 45 min |
| Índice desactualizado | Nível 2 | Reconstruir + actualizar | 2 h |
| Código partido | Nível 2 | Corrigir fallback | 2 h |
| Múltiplas | Nível 2 ou 3 | Combinar | 2 h a 1 dia |
| **▶ MEDIDO NESTE UTAC: Múltiplas (C1 chave rejeitada · C2 falha silenciosa · C3 índice stale · C4 fonte desactualizada · C5 comentários)** | **Nível 2** | P0 (operador) → 2.0 (texto aprovado pelo operador) → 1.1/1.3/1.4 → 2.2–2.8 → 1.2 (reindexar no fim) | **3–5 h de executor + revisão de conteúdo pelo operador** |

**Ordem recomendada dentro do 110c** (cada passo desbloqueia o seguinte):
1. **P0** (operador, 2 min) — sem o motivo de C1 não se sabe se é rotar, carregar ou trocar de modelo.
2. **2.0** — o conteúdo Via B (o operador aprova o texto). Sem isto, tudo o resto faz o GUTO ensinar o errado melhor.
3. **1.3 + 2.6 + 2.8** — comentários e falhas visíveis (não mudam o que o utilizador vê; tiram as armadilhas).
4. **2.3 + 2.4 + 2.7** — chunking por secção, limiar, testes de recuperação (A/B antes de reindexar).
5. **2.2 + 2.5** — cache e build único com guarda de sincronia.
6. **1.1** (chaves) **+ 1.2** (reindexar a fonte nova) **+ redeploy**, e verificação em produção com 3 perguntas.

## Riscos transversais e mitigação

| risco | mitigação |
|---|---|
| Inventar conteúdo de produto na reescrita (2.0) | só factos já fixados em `docs/regras-oficiais.md` + NORTE; operador aprova antes de indexar (AU3) |
| Reindexar apaga o índice que funciona | `blobs:get` dos 4 blobs para `_logs/` **antes**; reverter = `blobs:set` |
| Mudar o modelo de embeddings sem reindexar | o `rag.mjs:129` salta tudo em silêncio — a 2.5 grava o modelo/dimensão no meta e o teste falha se divergir |
| O LLM ligado passa a «explicar» o regulamento contraditório (Art. 14 vs Art. 18, J-3.2 do 109i) | a 2.0 tem de usar a versão **corrigida** do Art. 14; o Art. 18 contraditório é decisão jurídica fora deste plano |
| Custos recorrentes (HF, DeepSeek) | declarar no 110c; P0 diz se há saldo |
| A14 (RAM) na suíte do 110c | medir 3× antes; fechar só servidores MCP não usados (como neste UTAC) |

## Recomendação do executor
**Nível 2.** Justificação medida: (1) o Nível 1 deixa o GUTO a ensinar o modelo antigo (C4); (2) há uma afirmação
de conformidade **errada a sair hoje** (prémio convertível em dinheiro, C3); (3) as falhas são silenciosas (C2) e o
`rag.mjs` não tem testes (E1) — corrigir sem rede repete o problema; (4) o Nível 3 é desproporcionado para 3 chunks.
**Mitigação interina possível, se o 110c demorar:** `CHATBOT_ATIVO=off` (o endpoint devolve 503, `chatbot.mjs:1378-1380`)
— tira a informação errada do ar. **É uma decisão do operador; este UTAC não a toma.**
