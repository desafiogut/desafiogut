# UTAC110c-2c — RE-TESTE APÓS A TROCA DA CHAVE: **A VAR NÃO MUDOU**

> **Ficheiro:** `_logs/UTAC110c-2c-recheque-var.md`. Saída crua: `_logs/UTAC110c-2c_SEG0_saida.txt`.
> Contexto: o operador substituiu a `LLM_API_KEY` no Netlify (antiga `…75e6`, de conta sem saldo;
> nova `…334687243`, da conta com saldo) e fez redeploy. Pediu re-teste das 5 perguntas.

---

## 1. O re-teste: **continua em fallback**

| # | pergunta | HTTP | latência | `modoBusca` | `modoResposta` | chars | frases | proibidos | Via B | cita artigo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | O que é o DesafioGUT? | 200 | 4 025 ms | regulamento | **template** | 171 | 3 | nenhum | nenhum | não |
| 2 | Quanto custa o Passe Desafio? | 200 | 1 026 ms | regulamento | **template** | 171 | 3 | nenhum | nenhum | não |
| 3 | Como consigo o cartão colecionável? | 200 | 986 ms | regulamento | **template** | 171 | 3 | nenhum | nenhum | não |
| 4 | O que é o ECOQUILDO? | 200 | 975 ms | regulamento | **template** | 171 | 3 | nenhum | nenhum | não |
| 5 | Como funciona o Menor Lance Único? | 200 | 992 ms | regulamento | **template** | 171 | 3 | nenhum | nenhum | não |

**Critérios: `modoResposta == "llm"` 0/5 ❌ · cita artigo 0/5 ❌ · vocabulário Via B 0/5 ❌ ·
termos proibidos 0 ✅ (vacuamente) · ≤ 5 frases ✅ (vacuamente).**

## 2. O erro persiste — nos logs, e **no deploy novo**

`netlify logs --source functions --function chatbot --since 15m`:

```
WARN [chatbot] LLM indisponível, usando resposta template:
     llm_http_402: {"error":{"message":"Insufficient Balance (request_id: 538bf098-…)",
                              "code":"invalid_request_error"}}
```

…uma vez por chamada, com `request_id` novos (`538bf098…`, `3d74f602…`, `f9280f8d…`).
⚠️ **Nota de método (lição G2 do validador):** a 1.ª consulta aos logs, feita ~2 min depois, veio
**VAZIA** — o stream é *laggy*. Re-consultada a mesma janela minutos depois, apareceu. **Não se conclui
«não há erro» de um stream vazio.**

**E o deploy É o novo:** `netlify api listSiteDeploys` → o mais recente é **`6acdc2a1…`, state
`ready`, `published_at 05:36:29Z`, branch `main`**; as minhas chamadas foram às **05:41-05:42**, ou
seja **DEPOIS** da publicação. (Antes dele, três deploys em `error`: 05:11, 05:22, 05:30.)

## 3. ⭐ A PROVA DE QUE A VARIÁVEL **NÃO MUDOU**

O CLI do Netlify **mascara** os segredos, mas mostra **os últimos 4 caracteres** do valor. Isso dá-me uma
impressão digital **sem ler a chave**. Três medições independentes:

| # | medição | resultado |
|---|---|---|
| a | **Controlo — a máscara deriva mesmo do valor?** Padrões de cauda de **7 segredos** distintos | **6 padrões diferentes em 7** ⇒ a máscara **mostra a cauda real**, não é uma máscara fixa. *(Se fossem todos iguais, eu não poderia concluir nada — foi por isso que medi isto primeiro.)* |
| b | Cauda do `LLM_API_KEY` **em produção**, agora | **`DDLD`** (dígito, dígito, letra, dígito) |
| c | Cauda da mesma variável **na ronda anterior** (antes da troca) | **`DDLD`** — **idêntica** |

E o cruzamento com o que tu próprio descreveste:

| chave | terminação que descreveste | padrão esperado | o que a máscara mostra |
|---|---|---|---|
| **antiga** | `…75e6` | `DDLD` (7-5-e-6) | **`DDLD`** ✅ |
| **nova** | `…334687243` | `DDDD` (7-2-4-3) | — |
| **chave do Hermes** (mesma conta da nova, medida por mim) | — | **`DDDD`** ✅ (confere com a nova) | — |

⇒ **A cauda em produção é `DDLD` = a chave ANTIGA.** A nova daria `DDDD` (como dá a chave do Hermes).
**A alteração da variável não chegou à produção.**

**Verificações que fiz para descartar as outras causas:**
- **Não há duplicados:** existe **uma só** entrada com o nome `LLM_API_KEY` (o Netlify permite o mesmo
  nome em scopes diferentes — não é o caso aqui).
- **Não é um contexto diferente:** li os **4 contextos** (`production`, `deploy-preview`,
  `branch-deploy`, `dev`) — **todos mostram `DDLD`**. Não há um valor novo escondido noutro contexto.
- **Não é dinheiro:** a conta do Hermes (a mesma da chave nova, segundo o operador) tem **USD 1,48** e
  `is_available: true` **agora** — a conta está boa e a funcionar. Dinheiro não é o problema.

## 4. Conclusão

**O que falha é o transporte do valor novo até à produção.** Não é saldo, não é código, não é o deploy
(o deploy novo está publicado e foi ele que correu), não é duplicado nem contexto. **O valor guardado no
Netlify continua a ser o antigo** — e é por isso que o GUTO segue em fallback com o mesmo 402.

## 5. O que fazer

1. **Netlify → Site `silly-stardust-ca71bc` → Environment variables → `LLM_API_KEY`.**
   Olha para os **últimos caracteres do valor**: devem terminar em **`7243`**. Se ainda vês **`75e6`**,
   **o Save não pegou** — volta a colar a chave e **confirma o Save**.
2. **Depois de guardar, dispara um deploy novo** (Deploys → Trigger deploy → Deploy site).
3. **Diz-me.** Eu confirmo duas coisas antes de re-testar: (i) que o deploy está `ready` **e**
   `published`; (ii) que a cauda mascarada mudou de `DDLD` para **`DDDD`** — que é a assinatura da chave
   nova. Com essas duas, o re-teste vale a pena; sem elas, seria repetir o mesmo teste.

## 6. Declarado

- **Custo do GUTO nesta ronda: ZERO** (o 402 recusa antes de facturar).
- ⚠️ **Calibração do meu estimador de custo:** o Hermes tinha **1,71** e tem **1,48** ⇒ gastou
  **0,23 USD** reais nesta sessão, enquanto o `state.db` estimava **0,6059**. **O meu número
  sobrestima ~2,6×** — a corrigir na leitura do custo das próximas rondas.
- **Nada alterado:** zero código, zero env vars, zero deploy. Só leitura (chamadas, logs, API de
  deploys, nomes/padrões de env). O **valor** de nenhuma credencial foi lido ou impresso — o padrão de
  classes é a impressão digital que permite comparar sem revelar.
- **B-4 continua ABERTO.**
