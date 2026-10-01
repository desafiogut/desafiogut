# COMANDOS da Skill UTAC

**Auto-contido.** Os comandos que a skill expõe. Cada comando diz o que faz, o que lê, o que
escreve e quando PARAR.

---

## `/utac-run <spec.yml>`
Compõe e executa um UTAC completo a partir de um spec.
- **Lê:** `<spec.yml>` + `spec-template.yml` (schema) + `protocol/*` + `types/<type>.md` + `segments/*`.
- **Faz:** valida o spec (campos obrigatórios) → compõe o UTAC → corre SEG-1 → SEG0 → SEG1 → SEG2 →
  SEG3 → SEG4 → SEG5 → SEG6.
- **Escreve:** `_logs/UTAC<NNN>_*` + `Desktop/UTAC<NNN>-RELATORIO.md`.
- **PARA se:** o spec não tiver um campo obrigatório → reporta o campo em falta (não inventa).

## `/utac-validate`
Corre **só** o validador adversarial (SEG4) sobre o trabalho actual.
- **Faz:** despacha subagente independente em worktree próprio, instruído a **TENTAR REFUTAR**.
- **Escreve:** `_logs/UTAC<NNN>_SEG4_VALIDADOR.md`.
- **Para quando usar:** antes de fechar um UTAC, ou para re-validar depois de correcções.

## `/utac-close`
Corre **só** o fecho (SEG5-SEG6).
- **Faz:** consolida logs, escreve o relatório de fecho, faz a verificação ad-hoc (script 1× +
  controlo positivo), P4 (decisões em 3 lugares), P5 (`CLAUDE.md` ou nota `REGISTO-CLAUDE.md`), commit/push.
- **Escreve:** `_logs/UTAC<NNN>_SEG5_VERIFICACAO.md`, `_SEG6_VERIFICACAO.md`, `_*_saida.txt`,
  `Desktop/UTAC<NNN>-RELATORIO.md`.
- **PARA se:** houver pendências não declaradas ou o controlo positivo falhar.

## `/utac-new <nome>`
Cria um spec novo a partir do template.
- **Faz:** copia `spec-template.yml` → `<nome>.spec.yml` e abre os campos para preencher.
- **Não** valida conteúdo (é só o esqueleto).

## `/utac-types`
Lista os tipos disponíveis + o que cada um traz de extra.
- **Lê:** `types/*.md`. **Escreve:** nada (saída no ecrã).

---

## Ordem dos segmentos (referência)
`SEG-1` medição · `SEG0..SEG3` frentes (uma de cada vez) · `SEG4` validador adversarial ·
`SEG5` verificação em produção + relatório · `SEG6` verificação ad-hoc + fecho.

## Regras transversais a todos os comandos
- **Nunca `git add -A`** — ficheiros nomeados, um a um.
- **Commit/push em foreground.**
- **O executor não concebe** (AU3): ambiguidade → PARA e escala.
- **Validador adversarial é obrigatório** antes de fechar.
