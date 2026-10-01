# REVIEW AUTOMÁTICO — a skill aprende com cada UTAC

**Auto-contido.** Supervisão **depois** do UTAC fechado: um modelo revisor (Opus) lê o que foi feito e
**sugere** regras e lições. Não executa, não corrige, não decide.

## Porquê
Sem review, cada UTAC é isolado: o executor repete os erros do anterior. Com review, cada UTAC fechado
deixa sugestões; as aceites entram na skill; o UTAC seguinte corre com a skill mais sábia (efeito composto).

## Fluxo
1. **Executor** (DeepSeek/Hermes ou outro) corre o UTAC completo (SEG-1 … SEG6, logs, commit, push).
2. **Revisor** (Opus) corre `/utac-review <UTAC>` — ver `prompt.md`. **Só leitura.**
3. Sai `_logs/REVIEWS/<UTAC>_REVIEW.md` (formato em `template.md`) + uma linha em `_logs/REVIEWS/INDEX.md`.
4. **Operador** lê e decide, sugestão a sugestão: aceita, rejeita ou adia.
5. As aceites aplicam-se **à mão**, pelo `aplicador.md` (regra → `protocol/regras/`, lição → `protocol/licoes.md`).
6. A versão sobe em `VERSAO.md` (1.0 → 1.1 → …).

## O que o review NÃO faz
- Não altera código, logs, UTACs fechados, nem a skill (`protocol/`, `types/`, `segments/`, …).
- Não aplica sugestões — só as escreve. Quem aplica é o operador (aplicador manual).
- Não substitui o validador adversarial do UTAC: esse tenta refutar o **trabalho**; o review extrai **lições** do processo.

## Ficheiros
| ficheiro | para quê |
|---|---|
| `prompt.md` | o comando `/utac-review <UTAC>` para o revisor (o que ler, o que produzir, o que é proibido) |
| `template.md` | as 7 secções do Review Report |
| `aplicador.md` | como o operador aplica uma sugestão aceite (passos manuais) |
| `VERSAO.md` | versão actual da skill + changelog |
| `_logs/REVIEWS/` (raiz do repo) | os Review Reports + `INDEX.md` |
