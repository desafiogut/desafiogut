# UTAC105b.1 — SEG2 · Frente C: A/B dos consumidores (2026-09-30)

## 2.1 Consumidores legítimos — nenhum foi quebrado
| consumidor | como autenticava antes | depois |
|---|---|---|
| `CorporativoDashboard.jsx` (painel do lojista, botão «Salvar») | **sem token** (bug do par) | envia `Bearer` via `apiPost(…, { token })` |
Base: lista da SEG-0 §0.3 (1 consumidor; `dist/`/`android/` são o mesmo código compilado).

## 2.2 Fluxo legítimo simulado (como o painel o faz agora)
| quem | resultado |
|---|---|
| **dono** (`cliente_id` == endereço do JWT) | **200** e gravou a cota |
| **admin** | **200** e gravou a cota |
| dono de cota `cnpj:` **com** `endereco` == JWT | **200** (ramo (b)) |
(= testes A1, A12, A9.)

## 2.3 Fluxo ilegítimo simulado
| quem | resultado |
|---|---|
| **sem token** | **401 `token_ausente`** — e **não gravou** |
| token inválido | **401** |
| token **expirado** (`ERR_JWT_EXPIRED`) | **401** |
| **token de outro** | **403 `endereco_nao_corresponde`** — e **não gravou** |
| outro + cota inexistente | **403** (não 404: não revela existência) |
| cota `cnpj:` **sem** `endereco` (dono) | **403** (aceite, R18-2) |
(= testes A3/A5/A6/A7/A8/A10.)

## 2.4 A/B PAREADO (mesmos casos, mesmos dados, braços HEAD → novo)
Medido com o PoC (`poc-utac105b1.mjs`), executado **antes** e **depois** da correcção:

| caso | ANTES (HEAD `5e7ed24`) | DEPOIS | veredicto |
|---|---|---|---|
| sem token | **200** e escreveu | **401** e não escreveu | ✅ fechado |
| token de outro | **200** e escreveu | **403** e não escreveu | ✅ fechado |
| **dono** (controlo positivo) | **200** e escreveu | **200** e escreveu | ✅ **zero regressão** |
| **admin** (controlo positivo) | **200** e escreveu | **200** e escreveu | ✅ **zero regressão** |

Os dois controlos positivos são o que torna o resultado interpretável: o «recusou» dos dois primeiros
casos não é um endpoint quebrado a recusar tudo — o dono e o admin continuam a gravar.

## 2.5 Outros consumidores / outros endpoints
- `git diff --name-only` (fora do `package-lock.json`, que já vinha modificado no SEG-1 e não é meu):
  **apenas** `cotas.mjs` e `CorporativoDashboard.jsx`.
- Escopo provado ao carácter: em `cotas.mjs` tudo o que vem **antes** e **depois** do bloco
  `update-corporativo` é byte-idêntico ao HEAD.
- Suíte **535/535 · 929/935 VERDE** (913/919 + os 16 testes novos); build do frontend **✓ 9.24s**.

## 2.6 VEREDITO DO SEG2: **SEGUIR** — Frente C fechada, zero regressão para consumidores legítimos.
