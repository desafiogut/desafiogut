# MC104 — SEG2 · VALIDADOR ADVERSARIAL

Subagente independente, worktree próprio, commit validado `3024796` (pai `42e76d0`). Instrução: TENTAR REFUTAR.
Reproduziu os números do executor (9/9, 8/8, 7/7; mutação 23/23; suíte 515/515 · 817/823).
**Veredicto: APROVADO COM RESSALVAS — 0 bloqueantes no código; 1 ressalva ALTA a decidir antes de publicar.**

| Foco | Resultado | Evidência (medida pelo validador) |
|---|---|---|
| F1 adulteração | PARCIAL | Resiste: outro endereço 403, admin por outro 403, `aceiteEm`/`contexto`/`ip`/`key` forjados ignorados (só 8 chaves do servidor), `__proto__` → 400, DELETE/PUT/PATCH 405. Fraco: sobrescrita em **concorrência** no mesmo ms (201/201, 1 registo); `aceiteDeclaradoEm` arbitrário (9999-…) → flood de registos + `list()` O(N) |
| F2 só o titular | CONFIRMADO c/ ressalvas | sufixo `:0x+40hex` exacto; `.or` sem injecção (endereço validado); URLs reais do postgrest-js válidos (`payload->>endereco=eq.…`, `or=(…)`); 0 endereços mistos em produção. Ressalvas: o pedido real traz `lojista` (vendedor, público); o duplo aceitava colunas inexistentes |
| F3 todos os tipos | PARCIAL | fora e não declarados: Blobs `referral-*`, `fingerprint`, `admin_logs.alvo`; transitórios `wallet_idem`, `cotas_pagas`, `fila_tarefas` |
| F4 gate sem regressão | CONFIRMADO + **⚠️ ALTA** | `Boot` intacto; efeito sem loop; import sem ciclo. **Mas: aceite por APARELHO enviado para QUALQUER conta** que entre nele (A e B → ambos «enviado») → prova de consentimento **falsa** para B. Decisão implícita não declarada (R20) |
| F5 logs | CONFIRMADO limpo | console mascarado; `_logs/MC104_*` 0 endereços, 0 e-mails |
| F6 escopo | CONFIRMADO | 10 ficheiros; nenhum proibido; AppContext autorizado (R18) |
| F7 mutação | PARCIAL | 23/23 entram e morrem; dos 11 dele, sobreviviam: cotas só por `endereco`, `troco_senhas`/`saldo_rs_debitos` fora, `lojistas` coluna errada, `consent_log` por prefixo (+2 equivalentes) |
| F8 R20 | PARCIAL | a decisão do F4 não estava declarada |

## Acções
| # | Achado | Acção |
|---|---|---|
| 1 ALTA | Aceite do aparelho atribuído a outra conta | **Decisão do operador (R18 #4): o aceite vale só para a 1.ª conta.** `src/lib/consentimento.js` fixa `titularLocal` **antes** do envio (uma falha da conta A não o passa à B). Teste + mutantes C6/C7. As contas seguintes no aparelho **ficam sem registo** (não com um falso) |
| 2 MÉDIA | `aceiteDeclaradoEm` arbitrário | **Limite de plausibilidade:** a hora declarada não pode ser posterior à chegada (+5 min de tolerância). Mutante C8. ⚠️ Residual: datas passadas distintas continuam a criar registos (limitado a 10/min/IP e ao próprio titular autenticado); O(N) do `list()` é do desenho do `consent-log` (partilhado com exportação/exclusão) |
| 3 MÉDIA | Tipos não exportados | **Declarados** (não executados — âmbito): `referral-*`, `fingerprint`, `admin_logs`, `usuarios_bloqueio`, `notifications`, `notificacoes`, `pedidos-pagos`/`-meta` → candidatos ao MC115 |
| 4 MÉDIA | Testes cegos à completude | duplo do Supabase com **esquema real** (coluna inexistente → 42703); sementes do titular em `troco_senhas`, `saldo_rs_debitos`, `lojistas`, cota **só por `cliente_id`**; endereço **quase igual** no `consent-log`; asserção do conjunto exacto de tabelas. Mutantes C1–C5 |
| 5 BAIXA | Concorrência no mesmo ms | **Declarado.** O `@netlify/blobs` das functions (8.2.0) não tem escrita condicional (MC102.0); o mesmo vale para o `comprar-senhas` |
| 6 BAIXA | `lojista` no pedido | **Declarado:** é o vendedor do pedido DO titular, já público na listagem; semeado no teste |
| 7 BAIXA | Cota por CNPJ sem endereço | **Declarado:** não alcançável a partir da carteira |

Pós-correcção: testes 9 + 8 + 8 · **mutação 31/31 RED** (A 14 · B 9 · C 8), restauro byte-idêntico · suíte **516/516 · 817/823**.
Nota de instrumento: o limite de plausibilidade fez falhar 3 testes meus que usavam `2026-09-30T10:00Z`/`2026-10-01` — datas
no **futuro** à hora da corrida (~05h UTC). O limite estava certo; os testes passaram a datas passadas.
