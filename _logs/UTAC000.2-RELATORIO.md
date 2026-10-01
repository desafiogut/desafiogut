# UTAC000.2 — Relatório final: review automático da Skill UTAC01 (2026-09-30)

**Skill:** UTAC01 (tipo `infra`), spec `_logs/UTAC000.2.spec.yml`. **Commits:** `753e054` (4 frentes) · `6858292` (validador) + docs. Baseline `5e7ed24`.
**Validador:** APROVADO COM RESSALVAS → refutações corrigidas (SEG4).

## Entregue
| Frente | Ficheiros |
|---|---|
| A — estrutura | `skills/utac01/review/README.md` (o que é, fluxo, o que NÃO faz) · `review/template.md` (7 secções, «já coberta por?», L1, IDs provisórios) · `_logs/REVIEWS/INDEX.md` |
| B — `/utac-review` | `review/prompt.md`: pré-condições (sem logs/relatório/review existente → PARA), prefixo MC, commits por âmbito exacto + `git show` por commit, lê skill + `ambiente.md` + `CLAUDE.md` + reviews anteriores, escreve só 2 ficheiros, PROIBIDO explícito, `git status` no fim |
| C — aplicador | `review/aplicador.md` (MANUAL: decidir → regra no fim da categoria com ID seguinte + contagens/faixas → lição no fim da última secção → bump em `VERSAO.md` → R18 em 3 lugares → verificar) · `review/VERSAO.md` (**1.0** + changelog) · `SKILL.md` +1 linha |
| D — teste | `_logs/REVIEWS/UTAC105b_REVIEW.md` + linha no INDEX (`pendente`, 1.0). Resultado após deduplicação: **1 regra nova (A-novo-1), 1 lição nova (L-novo-3)**, 4 reforços/migrações. Nada aplicado |

## Decisão do operador (R18-A) — também em `_logs/UTAC000.2_SEG-1_MEDICAO.md` e no `CLAUDE.md`
A versão da skill vive em `skills/utac01/review/VERSAO.md` (actual 1.0, changelog: versão · data · UTAC de origem · o que entrou); o `SKILL.md` tem 1 linha a apontar.

## Prova
Verificador versionado `scripts/utac0002-verifica-review.mjs` → **VERDE 45/45** (D é teste pontual, ancorado no baseline `5e7ed24`).
Mutação em cópias `scripts/utac0002-prova-mutacao.mjs` → **43/43** com controlo «cópia intacta». O caso «UTAC sem logs» → erro do Passo 0 (UTAC999).
Árvore versionada idêntica antes/depois do review; os 30 ficheiros da skill do baseline intactos (SKILL.md só +1).

## Pendentes / candidatos
- O review foi testado pela **mesma sessão** que executou o UTAC105b (conflito de interesse declarado); um Opus «fresco» não foi medido.
- O aplicador nunca correu ponta a ponta (nenhuma sugestão aceite). As 6 sugestões do UTAC105b aguardam decisão do operador no INDEX.
- `/utac-review` não está em `comandos.md` (fora da autorização) — candidato.
- Árvore partilhada com o UTAC105b.1 (commit `828f719` de outra sessão intercalado) — nenhum ficheiro dele tocado.
