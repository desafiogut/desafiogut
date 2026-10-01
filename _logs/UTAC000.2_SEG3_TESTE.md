# UTAC000.2 — SEG3 Frente D: teste real — review do UTAC105b (2026-09-30)

Segui `review/prompt.md` passo a passo (como revisor), sobre o UTAC105b (fechado: spec, SEG-1…SEG5, relatório; baseline `5cac238`).

## Passo 0 — pré-condições (teste bidireccional)
- **(b) UTAC sem logs:** `ls _logs/UTAC999_*` → `No such file or directory` → resposta do prompt: «ERRO: UTAC999 sem logs em _logs/ — nada a rever». Nenhum ficheiro criado.
- **(a) UTAC105b:** 12 ficheiros `_logs/UTAC105b*` · relatório em `_logs/` e `Desktop/` · `_logs/REVIEWS/UTAC105b_REVIEW.md` inexistente → segue.

## Passo 1 — lido
9 ficheiros .md/.yml (spec 41 l., SEG-1 39, SEG0 19, SEG1 23, SEG2 24, SEG3_VALIDADOR 32, SEG3b 15, SEG5 24, RELATORIO 35) + `_MIGRACAO.sql` e 2 saídas;
commits por `git log --grep=UTAC105b` (sem `UTAC105b.1`): `b6e8488 0811c2b 4cbb9f3 5e7ed24`; `git diff --stat 5cac238..5e7ed24` = 29 ficheiros, +1164/−6;
skill actual (regras, `licoes.md`, `ambiente.md`, `VERSAO.md` 1.0) — cobertura verificada por grep (crawl/bundle: 0 nas regras/lições; heredoc: `ambiente.md:16`;
duplo: T3 só «mais estrito»; enunciado: lição 8).

## Passo 3 — escrito (só 2 ficheiros)
`_logs/REVIEWS/UTAC105b_REVIEW.md` (7 secções; 3 regras sugeridas T-novo-1, T-novo-2, A-novo-1; 3 lições L-novo-1..3; avisos; notas com o **conflito
de interesse** declarado — o revisor é a mesma sessão que executou o UTAC105b) + 1 linha em `_logs/REVIEWS/INDEX.md` (`pendente`, versão 1.0).
⚠️ Auto-verificação das citações: 2 intervalos estavam desviados (`SEG-1:21-29/31-38` → `20-27/31-36`; `SEG3_VALIDADOR:9-14` → `8-13`) — corrigidos
antes de fechar (lida cada linha citada com `sed -n`).

## Passo 4 — nada mudou
`git status --short` e `git diff --stat` antes/depois do review: **diff dos ficheiros versionados idêntico**; só surgiram ficheiros em `_logs/REVIEWS/`.
Regras e lições: 11 ficheiros (`protocol/regras/*.md` + `licoes.md`) **iguais ao HEAD** (verificador D). Versão continua **1.0**.

## Qualidade (verificador D → VERDE 7/7; mutação 7/7)
7 secções 1..7 · fontes declaradas · IDs provisórios com origem (≥4 evidências `UTAC105b — \``) · L1 sem endereço 0x completo · INDEX `pendente` ·
nada aplicado (versão, changelog, regras, lições). Mutantes: secção removida, regra aplicada a `T-testes.md`, versão subida, endereço completo, decisão
tomada pelo revisor, lição acrescentada, fontes omitidas → todos VERMELHO. Veredito: **SEGUIR**.
