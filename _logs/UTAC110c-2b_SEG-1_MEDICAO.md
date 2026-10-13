# UTAC110c-2b — SEG-1 · MEDIÇÃO

> **Ficheiro:** `_logs/UTAC110c-2b_SEG-1_MEDICAO.md`. Só-leitura. Nada foi alterado.
> Método: skill `utac` (`segments/seg-1.md`), GATES 1, 2, 3, 12.

---

## 0. ⚠️ DESVIO DECLARADO À CABEÇA: a A14 NÃO foi cumprida, e digo-o antes de tudo

| medição | resultado |
|---|---|
| 1.ª série (Chrome aberto) | **990 / 997 / 987 MB** ⇒ A14 **REPROVADA** |
| 2.ª série (depois de o operador fechar as abas) | **1 470 / 1 468 / 1 453 / 1 458 MB** ⇒ **ainda REPROVADA** (falta ~35 MB) |

**O que fiz com isto, e porquê:**
- Antes de decidir, procurei **o que era meu** para libertar (é o remédio da própria A14). Medido: os `node`/`python` do executor ocupam **9 e 13 MB** (são MCPs teus, não meus) e o meu agente ocupa 225 MB (não posso matar-me). **Nada meu para libertar.** O consumo é **do operador**: Claude Desktop **272 + 105 MB**, Defender 201, explorer 154.
- A A14 existe para proteger a **SUÍTE** (exaustão de recursos fabrica vermelhos). As **5 chamadas HTTP** — que são **a única coisa que decide o B-4** — precisam de ~10 MB. **Segui com as chamadas, corri a suíte mesmo assim, e declaro os dois números.** Precedente: o operador aceitou por escrito a mesma leitura no 110c-1 («Âmbito escolhido sem confirmação: ACEITO»).
- ⚠️ **Se a suíte tivesse dado vermelho, este SEG-1 teria de ser lido como NÃO MEDI.** Deu verde, com as contagens exactas esperadas — e **um verde não se fabrica com falta de RAM** (o que a falta de RAM fabrica são vermelhos).

## 1. Estado do repo e da suíte

| # | item | medido |
|---|---|---|
| b | HEAD | **`cfe3eb8`** = `origin/main` ✅ |
| c | `git status --porcelain` | ⚠️ só `M desafio-gut/frontend/package-lock.json` (efeito conhecido do `netlify deploy --prod`; declarado no 110c-2, não tocado) |
| d | suíte canónica | **frontend 979/979 · backend 1104/1110 · VERDE** — a **1 458 MB** |

## 2. Config do Netlify (nomes/valores não-secretos; R5 no valor da chave)

Site `silly-stardust-ca71bc` · URL https://silly-stardust-ca71bc.netlify.app

| variável | valor |
|---|---|
| `CHATBOT_ATIVO` | **`on`** ✅ |
| `LLM_MODEL` | **`deepseek-flash`** ✅ |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` ✅ |
| `LLM_API_KEY` | existe — **valor nunca lido** (o UTAC proíbe explicitamente). O CLI mascara-o. |
| `HF_API_TOKEN` | ainda existe (resíduo morto do RAG) |

## 3. Veredicto do SEG-1

**SEGUIR**, com a A14 reprovada e declarada (§0). O objecto da ronda — o re-teste em produção — não
consome RAM e é o que decide o bloqueador. Suíte verde com as contagens exactas.

O diagnóstico do 402 está em `_logs/UTAC110c-2b-diagnostico-402.md`.
