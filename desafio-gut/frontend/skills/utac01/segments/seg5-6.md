# SEGMENTOS SEG5 e SEG6 — VERIFICAÇÃO EM PRODUÇÃO + FECHO

**Auto-contido.** Últimos segmentos. Aplica HARD GATES 10, 11, 13, 14, 16.

---

## SEG5 — CONSOLIDAÇÃO E RELATÓRIO FINAL

Ficheiro: `_logs/UTAC<NNN>_SEG5_VERIFICACAO.md` (+ `_SEG5_saida.txt` com a execução real).

Passos:
1. Escrever/consolidar os logs de todos os segmentos anteriores.
2. Escrever o **relatório de fecho** `Desktop/UTAC<NNN>-RELATORIO.md`, com:
   - veredicto (**FECHADO** / …) e o que existe agora;
   - tabela de provas por HARD GATE (`gate | resultado`);
   - decisões (R18) — **3 lugares** (log, relatório, `CLAUDE.md` ou nota `REGISTO-CLAUDE.md`);
   - **Pendências (não executadas)** — declaradas, nunca escondidas (GATE 11).
3. **R14:** actualizar `CLAUDE.md` — **excepto** se o UTAC o proibir; então escrever
   `_logs/UTAC<NNN>_REGISTO-CLAUDE.md` (nota para aplicação futura) e declará-lo.
4. Commit individual + **push em foreground** (nunca background). **Nunca `git add -A`.**
5. Copiar os artefactos para `Desktop/UTAC<NNN>_*.md`.

## SEG6 — VERIFICAÇÃO AD-HOC E FECHO

Ficheiro: `_logs/UTAC<NNN>_SEG6_VERIFICACAO.md` (+ `_SEG6_saida.txt`).

Passos:
1. Criar um **script ad-hoc com nome único**, correr **UMA vez** (não fica no repo).
2. Verificações:
   - todos os entregáveis existem;
   - os formatos são válidos (`yml` parseável; estrutura md correcta);
   - **nada que não devia mudar mudou** (A/B dos ficheiros fechados/produção);
   - suíte verde (nada quebrou);
   - disco OK.
3. **Controlo positivo** — o script tem de distinguir um caso «errado» conhecido (senão o verde não vale).
4. Documentar no log com a saída real (`_SEG6_saida.txt`).
5. Consolidar logs. **R18** (decisões em 3 lugares).
6. Confirmar fecho: entregáveis + validador + verificação + commit final.
7. Commit final. Confirmar que o **próximo UTAC** pode arrancar com a skill.

## Critério de saída
Fecho declarado + relatório em `Desktop/` + logs em `_logs/` + commit/push em foreground +
pendências declaradas + controlo positivo do script ad-hoc.
