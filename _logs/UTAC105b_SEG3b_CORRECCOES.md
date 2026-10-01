# UTAC105b — SEG3b: resposta ao validador (2026-09-30)

| achado | estado | o quê |
|---|---|---|
| ⛔-1 ramo admin morto | **corrigido** | `cupons.mjs`: `chamador` só autentica a sessão; `temPosse(req,…)` segue a regra MC89.38 à letra: próprio → `autenticarAdmin(req)` → cota vinculada. Teste B5 usa **`assinarAdminAccess` + `autenticarAdmin` REAIS** (só `getAdminAddresses` fixado) e cobre «admin-JWT de quem já não é admin → 403». Mutante B-M10 (tirar o ramo admin) → RED |
| ⚠️-1 V7 | **corrigido** | C8: produto de outro lojista (`cnpj:`) → passe só com os cupons desse lojista. C-M5 passa a morrer por 2 testes |
| ⚠️-1 V3 | **corrigido** | A7b: corrida em `actualizarCupom` (outro pedido cria com estado oposto) → o pedido final prevalece. A-M8 → RED |
| ⚠️-1 V4 | **corrigido** | B5b: `cliente_id` do próprio em maiúsculas + espaços → 200 normalizado. B-M11 → RED |
| ℹ️ V2 | **corrigido (teste)** | A7c: valor 7 gravado na BD não conta como activo. A-M9 → RED |
| ⚠️-2 escrita item a item | declarado | sem transacção; cada item idempotente; inválidos recusados antes de gravar |
| ℹ️ restantes | declarados | sem CHECK de valor na BD (regra no código, decisão de migração não pedida) · snapshot · mensagem do 403 no painel · 0 cupons em produção → 409 até haver oferta |

Mutação: **27/27 mortos** (A 9 · B 11 · C 7). ⚠️ Instrumento: 2.ª vez que `\n` dentro de template JS num heredoc virou quebra real no
script de mutação (SyntaxError antes de mutar — nada mutado); corrigido com Edit + `node --check` antes de correr.
Suíte: frontend **VERDE 535/535** · backend **VERDE 913/919**.
