# MC105a — SEG5 · Verificação ad-hoc + SEG6 · Fecho (2026-09-30)

## Publicação
Push `b31dbd8..e95003f` → auto-deploy **`6abd081305a28700081425f4`**, acompanhado em foreground até **`ready`**,
`commit_ref e95003f`. Nenhum deploy manual.

## Supabase de produção (SELECT, via MCP, projecto `vjslwowwrpcawijdiksm`)
`passes`: 0 linhas · RLS `true` · 5 constraints · **0 grants a anon/authenticated** · `saldo_rs`: 8 linhas, total 2375
(igual ao antes da migração).

## `scripts/mc105a-verificacao-adhoc.mjs`: corrido uma vez, **VERDE 10/10** (saída em `MC105a_SEG5_saida.txt`)
**Produção** (nada foi escrito):
- deploy `ready`, com `commit_ref` = HEAD;
- `comprar-passe`: sem sessão dá **401 JSON `token_ausente`**; o preflight dá 204; GET dá 405 JSON;
- `comprar-senhas` **continua vivo** (401 JSON sem token);
- **controlo:** uma função inventada devolve `404 text/html`, logo o JSON acima vem mesmo das funções.

**Local:**
- testes do MC105a 32/32;
- **controlo positivo:** uma cópia adulterada do endpoint (sem verificação de idempotência) é apanhada (1 falha); md5 restaurado.

**Suíte** (harness, antes do push): frontend **530/530** · backend **874/880**.

## Não medido em produção (declarado)
Não fiz nenhuma compra real: exigiria um user-session real (R5) e gastaria saldo real (P12). Uma compra ponta a ponta
com conta de operador é o **MC105d**. Em produção só está provado o que a sonda sem sessão mostra; o fluxo de compra
está provado pelos 32 testes com o handler e o `saldoRs` reais.

## SEG6 · Fecho
- **R18 (3 lugares: SEG0, relatório, CLAUDE.md):** DEC-01…03, DEC-104.3-3/-5, R18-1…3.
- `git add` sempre ficheiro a ficheiro; o `package-lock.json`, modificado antes do MC, ficou fora.
- **MC105a FECHADO.**
- **O MC105b (cupons) pode arrancar:** `passes.cupons_ids` (jsonb array, com CHECK) está pronto, e o `voucher.mjs` foi
  medido como referência.
- Pendências para o operador:
  - DELETE/TRUNCATE do `service_role` em `passes`;
  - **`passes` fora do `exportar-dados`/`conta-delete`** (LGPD — antes de passes reais);
  - o ficheiro de migração não está em `supabase/migrations/`.
