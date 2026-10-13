# UTAC110c-2b — DIAGNÓSTICO DO 402 (FRENTE B/C)

> **Ficheiro:** `_logs/UTAC110c-2b-diagnostico-402.md`. Só-leitura + diagnóstico.
> Saídas cruas: `_logs/UTAC110c-2b_SEG0_saida.txt` e `_logs/UTAC110c-2b_SEG0_saida_2.txt`.
> Endpoint: `POST https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot`.

---

## 1. FRENTE A — RE-TESTE: **ainda falha, e não é timing**

Duas séries de 5 chamadas nesta ronda (as **mesmas** 5 perguntas do 110c-2), 10 no total:

| série | HTTP | `modoResposta` | chars | latências |
|---|---|---|---|---|
| 1.ª (05:0xZ) | 200 nas 5 | **`template`** nas 5 | 171 nas 5 | 4 190 / 1 075 / 991 / 975 / 1 092 ms |
| 2.ª (imediatamente depois) | 200 nas 5 | **`template`** nas 5 | 171 nas 5 | 1 389 / 985 / 1 043 / 982 / 1 004 ms |

📌 **`modoResposta == "llm": 0 de 10.** Resposta idêntica, 171 chars, `fontes: []`,
`modoBusca: "regulamento"`, `perfil: "visitante"`. **O critério de sucesso desta ronda NÃO foi
cumprido.** Não é volatilidade e não é cache (ver §2).

## 2. FRENTE C — LOGS: o erro é o MESMO, com prova de chamada real por invocação

`netlify logs --source functions --function chatbot --since 20m` (filtrado por erro):

```
WARN [chatbot] LLM indisponível, usando resposta template:
     llm_http_402: {"error":{"message":"Insufficient Balance (request_id: 86993279-a73a-4a58-9e5b-ebfb441f0e5c)",
                              "type":"unknown_error","param":null,"code":"invalid_request_error"}}
```

…e o mesmo, **uma vez por chamada**, com `request_id` **distinto** em todas:
`86993279…`, `9cbe8e00…`, `4995feff…`, `3773162d…`, `9d64d1ca…`, `5c9d7d23…`, `9b284d09…`,
`1b79af2b…`, `0d68b8fb…`, `5e0fbbb8…`.

⇒ **Cada chamada é real e independente**: o `request_id` é emitido pelo **servidor da DeepSeek**, uma
vez por pedido. Isto fecha, outra vez e com 10 provas novas, a hipótese «as respostas iguais são
cache/stub». São iguais porque **o template é fixo**.

## 3. FRENTE B — DIAGNÓSTICO SISTEMÁTICO

### B1 · Timing — ❌ DESCARTADO
O redeploy e a chave foram postos **antes** do UTAC110c-2 (que já dava 402). Esta ronda é **depois**
disso e dá 402 **outra vez**, 10/10. **Não é timing de propagação.**

### B2 · Conta DeepSeek correcta — ⭐ **É AQUI QUE ESTÁ, e tenho uma medição que muda o problema**

**Facto medido nesta sessão, a teu pedido explícito:** a chave que o **Hermes** usa (`DEEPSEEK_API_KEY`
do meu `.env`, `len=35`, `sk-…`) responde ao endpoint de saldo com:

```
{"is_available": true, "balance_infos": [{"currency":"USD","total_balance":"1.71",
                                          "granted_balance":"0.00","topped_up_balance":"1.71"}]}
```

Isto é decisivo por uma razão simples: **o saldo na DeepSeek é por CONTA, não por chave.**
- Se a chave do Netlify pertencesse **à mesma conta** que a minha, o GUTO veria os **mesmos 1,71** e
  **estaria a funcionar**. Não está: recebe `Insufficient Balance`.
- Logo **a chave do Netlify pertence a OUTRA conta** — uma conta **sem saldo de API**.

⚠️ **A implicação prática:** se o saldo que vês em `platform.deepseek.com` é da conta que usas para o
**Hermes** (a única que consigo medir, e que tem 1,71), então **essa não é a conta da chave do GUTO**.
Carregar saldo *nela* não resolve o GUTO — foi o que eu já tinha dito no 110c-2 e agora tem medição por
trás.

🛑 **Não posso comparar as duas chaves** (nem por igualdade, nem por hash): o AUTORIZA desta ronda diz
«NÃO AUTORIZA: ler valores de credenciais». Sou eu que o cumpro. **Só tu podes responder a: qual é o
email da conta onde criaste a chave que está no Netlify?** É essa conta que precisa de saldo.

### B3 · Tipo de saldo (API vs «Chat») — a verificar por ti
Não afirmo que a DeepSeek separe «API balance» de «Chat balance» — **não medi** e não tenho como medir
sem credenciais. O que **medi** na conta que consigo ver: `granted_balance: 0.00`,
`topped_up_balance: 1.71` — ou seja, a DeepSeek **distingue crédito oferta de crédito carregado**, e
**uma conta com só crédito oferta pode ser recusada pela API**. Confirmação tua em
`platform.deepseek.com → Top up / Billing`.

### B4 · Moeda — ✅ coerente
A conta que medi devolve **USD**. A API usa USD. Não há indício de problema de moeda. (Na tua conta do
GUTO, vale a pena confirmar que o carregamento foi **para a API**, não para outra coisa.)

### B5 · Modelo `deepseek-flash` — ⛔ **LACUNA DECLARADA, não medi**
O teu enunciado diz explicitamente para **não** fazer uma chamada directa de teste (R5). **Cumpro.**
Portanto **não sei** se `deepseek-flash` é aceite. O que sei: o erro actual é **402 antes** de qualquer
resolução de modelo, logo esta ronda **não consegue** distinguir «nome certo» de «nome errado» — essa
pergunta fica **por medir**, e é a segunda coisa a testar assim que houver saldo (se aparecer
`llm_http_400 Model Not Exist`, o nome estava errado).

### B6 · Logs — sem mais nenhum erro
Na janela varrida **não há** 401 (chave errada), nem DNS, nem timeout, nem `LLM_API_KEY ausente`.
**Só 402.** Um 402 vem **depois** da autenticação ⇒ **a chave autentica** e o endereço está certo.

## 4. Conclusão do diagnóstico

**O GUTO está em fallback por uma condição de CONTA, não de chave, nem de código, nem de modelo
conhecido.** Em 20 chamadas medidas (10 minhas + 10 anteriores) o fornecedor respondeu sempre
`402 Insufficient Balance`, e a chave autenticou sempre.

**O que consigo provar:** existe (pelo menos) **uma** conta DeepSeek com saldo — a que serve o Hermes,
com **USD 1,71** — e ela **não é** a que serve o GUTO. **O saldo está na conta errada.**

**O que NÃO consigo provar (e não invento):** qual é a conta do GUTO (não leio credenciais), se o nome
do modelo é aceite, e se a DeepSeek trata «crédito oferta» de forma diferente de «crédito carregado».

## 5. O que o operador tem de fazer — as instruções accionáveis estão em

`Desktop/RELATORIO-UTAC110c-2b-GUTO.txt` (§4). Resumo: **descobrir qual o email da conta que é dona da
chave do Netlify** e **carregar saldo NESSA conta** (ou gerar ali uma chave nova e substituir a var).

## 6. B-4

⛔ **CONTINUA ABERTO.** Zero respostas do modelo para inspeccionar, em duas rondas seguidas.
