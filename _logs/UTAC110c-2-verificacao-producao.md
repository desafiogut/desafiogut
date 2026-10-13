# UTAC110c-2 — VERIFICAÇÃO EM PRODUÇÃO (SEG0/SEG1/SEG2)

> **Ficheiro:** `_logs/UTAC110c-2-verificacao-producao.md`. Saída crua: `_logs/UTAC110c-2_SEG0_saida.txt`.
> Script: `%TEMP%/utac110c2-chamadas.mjs` (fora do repo, foreground).
> **Nada foi alterado**: nem código, nem env vars, nem deploy. Endpoint:
> `POST https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot` com `{"pergunta": "…"}`.

---

## ⛔ RESULTADO EM UMA LINHA

**As 5 chamadas foram reais e todas devolveram `modoResposta: "template"`** ⇒ o GUTO **não está a usar
o LLM**. Causa medida nos logs do fornecedor: **`llm_http_402 Insufficient Balance`** — a conta
**DeepSeek está sem saldo**. **O bloqueador B-4 NÃO pode ser fechado.** A correcção **não é código**.

## 1. As 5 chamadas (dados crus)

| # | pergunta | HTTP | latência | `modoBusca` | `modoResposta` | chars | frases |
|---|---|---|---|---|---|---|---|
| 1 | O que é o DesafioGUT? | 200 | 4 241 ms | `regulamento` | **`template`** | 171 | 3 |
| 2 | Quanto custa o Passe Desafio? | 200 | 1 024 ms | `regulamento` | **`template`** | 171 | 3 |
| 3 | Como consigo o cartão colecionável? | 200 | 1 101 ms | `regulamento` | **`template`** | 171 | 3 |
| 4 | O que é o ECOQUILDO? | 200 | 967 ms | `regulamento` | **`template`** | 171 | 3 |
| 5 | Como funciona o Menor Lance Único? | 200 | 949 ms | `regulamento` | **`template`** | 171 | 3 |

**Resposta, idêntica nas 5** (é o `fallback_sem_llm` do perfil `visitante`, `guto-perfis.mjs:443`):

> Poxa, essa não achei no regulamento! 😅 Tenta perguntar de outra forma — ou escreve para
> contato@grupouniaoetrabalho.com.br. Cria uma conta para participar das edições! 😊

`fontes: []` em todas; `perfil: visitante` em todas (as chamadas não levam Bearer).

## 2. Diagnóstico — a causa, lida nos logs de produção

`netlify logs --source functions --function chatbot --since 15m` (verbatim, 3 ocorrências iguais):

```
WARN [chatbot] LLM indisponível, usando resposta template:
     llm_http_402: {"error":{"message":"Insufficient Balance",
                              "type":"unknown_error","param":null,
                              "code":"invalid_request_error"}}
INFO [chatbot] resposta gerada { perguntaLen: 21, modoResposta: 'template', perfil: 'visitante' }
INFO Duration: 3459 ms   Memory Usage: 184 MB
```

E a lógica que produz isto está em `chatbot.mjs:1472-1486`: `modoResposta = "template"` **só** é
atribuído dentro do `catch` de `chamarLLM` — ou seja, **o LLM LANÇOU**, o código apanhou, escreveu o
aviso e caiu no template do perfil. É o comportamento **projectado** («o GUTO responde SEMPRE algo»,
comentário em `chatbot.mjs:1468`).

### 2.1 O que o 402 PROVA (e o que NÃO prova)

| prova | como |
|---|---|
| ✅ **A chave está CERTA.** | Um 402 vem **depois** da autenticação. Chave errada daria **401**. O operador pôs a chave boa. |
| ✅ **`LLM_BASE_URL` está certo.** | O pedido chegou à API da DeepSeek e ela respondeu com um erro *do negócio* dela (`invalid_request_error`), não com DNS/404. |
| ✅ **O código novo está vivo em produção.** | `modoBusca: "regulamento"` (valor que só existe desde o 110c-1) e `fontes: []` (lista vazia como projectado). |
| ✅ **O fallback é seguro.** | Não ensina o modelo antigo, não inventa valores, dá a saída para o suporte. |
| ⚠️ **NÃO prova que `deepseek-flash` é aceite.** | O saldo pode ser verificado **antes** do nome do modelo. Se o nome estivesse errado, o erro só apareceria **depois de haver saldo**. Fica por testar. |
| ⛔ **NÃO prova que o Regulamento chega ao modelo.** | Como o LLM nunca corre, **nada** desta ronda confirma o objectivo principal do 110c-1 em produção. |

## 3. SEG1 — respostas curtas: **vacuamente aprovado, e digo-o**

| critério | resultado |
|---|---|
| ≤ 5 frases | ✅ 3 frases (nas 5) |
| ≤ 800 chars | ✅ 171 chars (nas 5) |
| não despeja o regulamento | ✅ (não despeja nada) |
| cita artigo | ❌ **nenhuma cita** — e não pode: é um template fixo |

⚠️ **Estes «✅» não valem nada para a hipótese em teste.** Estão a medir a **frase de fallback**, não a
resposta do LLM. Uma resposta do modelo com 900 chars passaria a bater aqui exactamente da mesma forma.
**Não conto isto como prova de que o prompt produz respostas curtas** — verifica-se na próxima ronda,
com saldo.

## 4. SEG2 — conformidade

| termos PROIBIDOS (devem ser 0) | nas 5 respostas |
|---|---|
| «Portaria SPA/MF», «1.207/2024», «torneio», «leilão», «senha» (sentido de lance) | ✅ **ZERO** |

| termos OBRIGATÓRIOS | esperado em | encontrado |
|---|---|---|
| «Passe», «pontos de fidelidade», «competição de habilidade» | Q2/Q5 | ❌ ausentes |
| «cartão colecionável» | Q3 | ❌ ausente |
| «ECOQUILDO» | Q4 | ❌ ausente |

⚠️ **A ausência dos obrigatórios NÃO é uma regressão do prompt**: é a consequência directa de o LLM não
correr. Como o texto sai do `fallback_sem_llm`, o vocabulário Via B nunca chega a ser usado. **Não há
aqui evidência contra o 110c-1 nem a favor dele.**

## 5. Interpretação honesta do resultado

O GUTO **não falhou por bug**. Falhou por **saldo zero** — um estado **externo ao repo**, que a própria
API declara em português claro («Insufficient Balance»). O que esta verificação produziu de valor é:

1. **A chave e o endereço estão certos** (402 ≠ 401) — o operador fez a parte dele bem;
2. **O código novo está em produção e a responder** (`modoBusca: "regulamento"`), com o fallback a
   comportar-se como projectado;
3. **A acção necessária é carregar saldo na conta DeepSeek** — e só depois disso esta verificação
   pode ser concluída (é barata: 5 chamadas, ~5 s);
4. ⚠️ **`deepseek-flash` continua por confirmar** (§2.1) — só se saberá com saldo.

**O bloqueador B-4 fica ABERTO.** Não fecho um bloqueador com base em 5 respostas de template.

## 6. ⛔ Escalado ao operador (não é para o 110c-2b)

O enunciado previa escalar para **110c-2b** se houvesse **textão** ou respostas evasivas — e remete
para lá «ajustar instruções do prompt». **Esse não é o caso.** Não há textão (171 chars) e não há nada
a ajustar no prompt: o problema está **fora do código**. Escalar para 110c-2b seria mexer no prompt para
resolver um problema de facturação. **Escalo a ti: carrega saldo na conta DeepSeek** e eu re-corro as
mesmas 5 perguntas.
