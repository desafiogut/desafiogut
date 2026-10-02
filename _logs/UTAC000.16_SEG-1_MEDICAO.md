# UTAC000.16 — SEG-1 — Medição

**Data:** 2026-10-02 · **Base medida:** `3e80c64` = `origin/main` = HEAD (o spec diz `04a842d`; o `3e80c64` é `04a842d` + **só** `_logs/UTAC000.14-RELATORIO.md` — o registo do deploy do UTAC000.14; zero código).
Evidência bruta: `_logs/UTAC000.16_SEG-1_EVIDENCIA.txt`.

## 1. Estado
- Suíte: **frontend 663/663 · backend 967/973 VERDE** (= declarado).
- `git status`: só `M desafio-gut/frontend/package-lock.json` (+ `_logs/` não versionados antigos).
- Disco C: **12 GB livres (95%)** — ⚠️ desceu 6 GB desde o SEG-1 do UTAC000.14 (18 GB); sinalizado, não é deste UTAC.
- Worktrees: `main` + `wt-94` de outra sessão (não se toca).

## 2. Item 1 — os 2 testes novos do UTAC000.14
`src/context/__tests__/utac00014-show-overlay.test.mjs`, commit `04a842d`, testes **#6** («EM BREVE: também com prazo 0 e com prazo já vencido há muito, o overlay NÃO abre») e **#7** («EM BREVE: prazo reaberto on-chain depois de encerrado continua a FECHAR o overlay»). Ficheiro 9/9.
⚠️ **Premissa do spec corrigida:** o GATE 7 fala no «mutante M12» — não existe M12 no UTAC000.14 (o M12 da série é do UTAC000.10, DEBT-010). Os mutantes que estes 2 testes cobrem são o **R5** e o **R7** do validador da 2.ª ronda.

## 3. Item 2 — `package-lock.json`: alteração REAL e PREJUDICIAL (não é ruído)
- `+119/−138`, conteúdo real (`--ignore-cr-at-eol` igual). **Remove os 4 peers** `typescript`, `@types/react`, `@tanstack/react-query`, `@tanstack/query-core` e muda versões — o padrão exacto do **MC93-G** (`npm install --legacy-peer-deps` reverte o lock).
- **Medido em cópia isolada** (`npm ci --dry-run --ignore-scripts`): HEAD **rc=0** (1011 pacotes) · working **rc=1 `EUSAGE` «Missing: typescript@5.9.3 / @types/react@19.3.0 from lock file»** ⇒ commitá-lo partiria o job `install` da CI.
- mtime 2026-10-01 12:18 (anterior ao UTAC000.14; origem fora deste UTAC — HI2).
- ⇒ **Decisão: REVERTER** (o spec autoriza; cópia de segurança preservada fora do repo antes — GATE 5/20).

## 4. Item 3 — custo
Esta sessão é Claude Code; não há `state.db` (procurado em `~` até profundidade 3 no UTAC000.14: nenhum). Limitação a declarar (Frente C).

## 5. Item 4 — branch `claude/zen-goldberg-ce8759`
- Local e **remota** existem, ponta `24f82af`; merge-base com `main` = `39382d9`.
- 4 commits (`12b5b2c`, `acab406`, `ce1e3dd`, `24f82af`) · **12 ficheiros, +603/−65** (= DEBT-015).
- Varredura de segredos no diff: 0 (Privy App ID é público); chave Alchemy: **0** no diff e no mbox (a P1 conhecida continua só no HEAD).
- **Ajuste proposto (R1/GATE 21):** além do diff `main...branch` pedido (perde mensagens/autoria dos 4 commits), arquivar também o **`git format-patch`** (mbox, `_logs/DEBT-015_zen-goldberg.mbox`), que permite recriar os commits exactos com `git am`. A verificação do GATE 21 faz-se aplicando no **merge-base** (o `main` avançou muito: aplicar no `main` não reproduziria o diff).

## 6. Veredito do SEG-1: **SEGUIR** (com os 2 ajustes declarados: base `3e80c64`; mutantes R5/R7 em vez de M12; + mbox).
