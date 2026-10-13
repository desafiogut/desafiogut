# UTAC110c-2 — SEG-1 · MEDIÇÃO

> **Ficheiro:** `_logs/UTAC110c-2_SEG-1_MEDICAO.md`. Segmento **só-leitura**. Nada foi alterado.
> Método: skill `utac` (`segments/seg-1.md`), GATES 1, 2, 3, 12.

---

## 1. Ambiente

| # | item | medido |
|---|---|---|
| a | **RAM (A14)** | **1 621 / 1 622 / 1 628 MB** ⇒ **CUMPRIDA** (limite 1 500) |
| b | `git rev-parse HEAD` | **`b1de277`** = `origin/main` ✅ |
| c | `git status --porcelain` | ⚠️ **1 ficheiro sujo**: `M desafio-gut/frontend/package-lock.json` (ver §3) |
| d | suíte baseline | frontend **979/979** · backend **1104/1110** · VERDE (ver §4) |
| g | `max_tokens` | **4000** em `chatbot.mjs:1352` ✅ |

## 2. Configuração do Netlify — **só nomes, nunca valores (R5)**

Site: **`silly-stardust-ca71bc`** · siteId `be1cc8bb-…` · Project URL **https://silly-stardust-ca71bc.netlify.app**

Lido com `netlify env:list --json --context production` e processado por um filtro que **imprime apenas os
nomes das chaves** (o valor nunca chega ao meu output). As 3 variáveis existem:

| variável | existe? | valor / forma |
|---|---|---|
| `CHATBOT_ATIVO` | ✅ | **`on`** (não é segredo) |
| `LLM_MODEL` | ✅ | **`deepseek-flash`** (não é segredo) — o nome legado `deepseek-v4-flash` já não está lá |
| `LLM_BASE_URL` | ✅ | `https://api.deepseek.com/v1` (não é segredo) |
| `LLM_API_KEY` | ✅ | ⚠️ **não imprimido**. O CLI **mascara-o**: o padrão de classes é `SSSSSSSSSSSSSSSSDDLD` (16 símbolos + 4 caracteres de dica) ⇒ **não é possível confirmar comprimento nem prefixo `sk-` por aqui**, e não o faço por outra via (R5) |

⚠️ **`HF_API_TOKEN` ainda existe no Netlify** — resíduo morto (o código que o usava foi apagado no
110c-1). Declarado, não bloqueia; a remoção é arrumação (o plano do 110b.1 já a previa).

**Nota de método:** imprimir o *padrão de classes* (`L`=letra, `D`=dígito, `S`=símbolo) foi a forma de
dizer «isto é uma máscara, não uma chave» sem revelar um único carácter do valor.

## 3. Desvio declarado: `package-lock.json` do FRONTEND sujo

`31 insertions / 53 deletions` em `desafio-gut/frontend/package-lock.json`. É o **efeito conhecido** de
`netlify deploy --prod`: o comando corre o **build LOCAL**, que faz `npm install` no frontend e reescreve
o lockfile. **Não é trabalho desta ronda** e nada aqui o justifica. O lockfile da **RAIZ** está intacto.

Tratamento: este UTAC é **só verificação** e não altera código ⇒ **não foi tocado**. Fica à vista, com
o número medido, para o operador decidir (é do mesmo tipo do que já foi tratado noutras rondas).

## 4. Suíte canónica (baseline)

```
frontend: VERDE 979/979 pass
backend:  VERDE 1104/1110 pass
VEREDITO: VERDE
```
Igual ao estado declarado no enunciado. RAM ≥ 1 500 MB ⇒ medição válida, **sem ressalva**.

## 5. `rag.mjs` — o critério do enunciado («`git grep` → deve estar vazio») é FALSO como escrito

`git grep 'rag.mjs'` devolve **dezenas de linhas**. Separei-as por natureza:

| onde | quantos | é resíduo? |
|---|---|---|
| **código de runtime** (`chatbot.mjs`) | 2 — **comentários** de histórico. **Zero imports.** | não |
| os 2 testes que VIGIAM a ausência (`utac110c-guto-via-b`, `utac110c-prova-mutacao`) | 2 ficheiros | não — é o guarda |
| `docs/` e `_logs/` históricos · `CLAUDE.md` | muitos | **sim**, documental (C5 do inventário) |
| `graphify-out/graph.json` e `manifest.json` | artefacto **gerado** | **sim**, C4 (regenerar) |
| `AUDITORIA-TOPOGRAFICA.md`, `desafio-gut/CLAUDE_DEBUG.md`, `netlify.toml:30` (comentário), `netlify.toml.backup-*` | 4 | **sim**, C5 |

O critério correcto — e o que interessa — **verifica-se**: **zero imports e zero usos de `rag.mjs` em
código de runtime**. A formulação «deve estar vazio» não podia ser satisfeita sem apagar documentação
histórica (proibido pelo GATE 4). **Declarado, não varrido para debaixo do tapete.**

## 6. Veredicto do SEG-1

**SEGUIR** para as chamadas de produção. A14 cumprida, HEAD confirmado, config com os nomes certos
(inclusive `LLM_MODEL=deepseek-flash` e `CHATBOT_ATIVO=on`), `max_tokens=4000` no sítio. Dois desvios
declarados, **nenhum deles bloqueante para medir a produção**: o lockfile sujo (§3) e a formulação do
critério do `rag.mjs` (§5).
