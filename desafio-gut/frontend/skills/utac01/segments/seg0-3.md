# SEGMENTOS SEG0 a SEG3 — FRENTES (execução)

**Auto-contido.** Conjunto de segmentos em que se trabalha. Aplica HARD GATES 4, 5, 6, 7, 8, 15.
O trabalho faz-se **uma frente de cada vez** (A → B → C → D); cada frente tem o seu log.

---

## Estrutura
Um ficheiro por segmento/frente: `_logs/UTAC<NNN>_SEG<n>[_FRENTE-<X>].md`.
O nome do segmento reflecte a ordem: `SEG0`, `SEG1`, `SEG2`, `SEG3`.

## Padrão de uma frente (nesta ordem)
1. **PoC primeiro** — script pequeno que mede o comportamento actual antes de tocar. O PoC cresce
   ANTES de se mexer no alvo. *(Lição MC102.1b/MC104.3.)*
2. **Correcção** — a alteração mínima que resolve (HARD GATE 5). Caminhos antigos **ficam** (GATE 4);
   se algo sai, regista-se onde a informação passou a viver.
3. **Teste bidirecional** (HARD GATE 8) — no mesmo ficheiro: (a) o positivo passa; (b) o negativo
   falha; (c) a entrada inválida é recusada com erro visível.
4. **A/B pareado** (HARD GATE 2) — braços alternados (antes, depois, antes, depois), **mesmos dados**.
5. **Mutação** (HARD GATE 7 / R16) — introduzir a falha que o teste devia apanhar → **RED** →
   restaurar → md5 idêntico. Mutante equivalente declara-se.
6. **Verificar regressões** — suíte + testes dos ficheiros antigos (GATE 4).
7. **Relatório do segmento** — o log da frente, com tabela `resultado medido`.

## Regras do segmento
- Uma frente de cada vez; não se abre a seguinte antes de fechar a anterior (GATE 6).
- Só se toca nos ficheiros autorizados (GATE 3). Achados fora do escopo escalam-se (GATE 12).
- Nada de `git add -A` (GATE 10); commits nomeados, em foreground.

## Critério de saída (por frente)
Log escrito + testes + mutação RED + A/B + suíte verde. Então, e só então, a frente seguinte.
