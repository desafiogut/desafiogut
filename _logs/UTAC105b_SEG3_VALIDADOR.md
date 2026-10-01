# UTAC105b — SEG3 Validador adversarial (skill UTAC01) — commit sob teste `b6e8488`

Subagente independente, worktree próprio (checkout detached em `b6e8488`, restaurado; junctions removidas só o link).
Produção: só SELECT + sonda `DO … RAISE EXCEPTION` (revertida); no fim **cupons 0 · passes 0**.

## Veredicto: **REFUTADO (parcial)** — um ramo do R18-B não estava implementado e o teste que o declarava passava em falso.

### ⛔-1 Admin não conseguia configurar cupons (ramo admin = código morto)
`chamador()` tentava `verificarUserSession` primeiro, e `_lib/jwt.mjs:81` aceita também `tipo:"admin-access"` → um admin-JWT real devolvia
`{endereco}` sem `admin`, `autenticarAdmin` nunca era alcançado, `temPosse` → 403. Provado com `assinarAdminAccess` real + `autenticarAdmin` fiel:
`PUT /cupons` de outro lojista → **403 endereco_nao_corresponde** (R18-B pede 200). B5 passava porque o duplo aceitava a string `"admin-tk"`
(não-JWT) — duplo permissivo. `produtos.mjs:338-353` chama `autenticarAdmin` sempre que não é o próprio. Consequência: as 2 cotas `cnpj:` sem carteira
ficavam sem via nenhuma (fail-closed, sem fuga de segurança).

### ⚠️-1 Sobreviventes (código correcto, testes com lacunas)
V7 lojista fixo em vez de `produto.lojista` sobrevive (nenhum teste compra produto de 2.º lojista) · V3 caminho de corrida de `actualizarCupom` · V4 sem
normalização do `cliente_id` (efeito fail-closed).
### ⚠️-2 PUT grava item a item: falha de infra no 2.º item → 503 com o 1.º gravado (P9 só garantido para valores inválidos; cada item é idempotente).
### ℹ️ BD sem CHECK de `valor_rs`/formato de `lojista_id` (regra só em `_lib/cupom.mjs`; V2 sobrevivia) · `numeric(10,2)` arredonda 5.001→5 (app recusa
não-inteiros) · snapshot de ids (cupom desactivado entre leitura e INSERT entra) · painel mostra só «Não foi possível carregar» num 403 de `cnpj:` ·
**0 cupons em produção → toda a compra de Passe dá 409 até os lojistas configurarem** · `criarPasse` mudou de assinatura (coberto por R18-A/D, retrocompatível).

## Focos
1 idempotência CONFIRMADO (5 vs 5.00 → 23505) · 2 só 5/10/20 CONFIRMADO (`"5"`, `-0`, valueOf, 5.5, null recusados; tudo validado antes de gravar) ·
3 posse **REFUTADO parcialmente** (⛔-1; resto correcto; `cotas.cliente_id` 7/7 minúsculo) · 4 Passe↔cupons CONFIRMADO (não prova o lojista certo, V7) ·
5 UNIQUE CONFIRMADO (índice parcial de `passes` intacto) · 6 dados pessoais CONFIRMADO sem fuga · 7 âmbito CONFIRMADO (16 ficheiros, todos autorizados) ·
8 AU3 CONFIRMADO (desvios declarados e justificados) · 9 duplo numeric CONFIRMADO (`row_to_json` → número), **duplo do admin-auth infiel (⛔-1)** ·
10 mutação própria: 11 mutantes, mortos V1/V6/V8/V10/V11, sobreviventes V2/V3/V4/V7, equivalentes V5/V9.

## Não medido
`produto.lojista` real nos Blobs de produção · que lojista tem o produto das edições programadas · painel no browser/APK · suíte completa (só 7 ficheiros) ·
corrida de `actualizarCupom` contra PostgREST real.
