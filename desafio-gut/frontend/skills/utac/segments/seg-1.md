# SEGMENTO SEG-1 — MEDIÇÃO

**Auto-contido.** Primeiro segmento de todo o UTAC. **Nada é alterado aqui.**
Objectivo: substituir o enunciado pela realidade medida. HARD GATES 1, 2, 3, 12.

---

## Estrutura
Ficheiro: `_logs/UTAC<NNN>_SEG-1_MEDICAO.md`. Passos numerados `-1.1`, `-1.2`, … (o «-1» é a
posição do segmento antes do SEG0).

## Passos padrão
- **-1.1 Estado do repo** — `git rev-parse HEAD` · `git log --oneline -5` · `git status --short`.
  **Comparar com o baseline do spec** e declarar o desvio (a série mediu desvio em todos os UTACs).
- **-1.2 Existência dos caminhos nomeados** — `ls` de cada ficheiro/pasta que o spec nomeia
  (criar dá erro ⇒ registar; usar dá erro ⇒ PARAR).
- **-1.3 Fontes / inventário** — listar o que existe (ficheiros, tabelas, endpoints) que serve de fonte.
- **-1.4 Medições específicas** — as que o spec pede (contratos de funções, schema, estado em produção).
- **-1.5 Disco** — `df -h /c`. **SE < 5 GB → PARAR.**
- **-1.6 Log** — escrever `_logs/UTAC<NNN>_SEG-1_MEDICAO.md` (este ficheiro é o produto do segmento).
- **-1.7 Veredito** — **SEGUIR** / **PARAR** / **AJUSTAR**, escrito no fim do log.

## Secção obrigatória: conflitos e ambiguidades (AU3 / HARD GATE 12)
Listar **perguntas ao operador** — não as resolver sozinho:
> ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
> 1. …
As respostas do operador tornam-se **R18-(letra)** e registam-se em 3 lugares (log, relatório, R14).

## Regras do segmento
- Só `SELECT`. Sem escrita em produção, sem migração, sem deploy.
- Cada número tem o ficheiro/comando que o produziu (HARD GATE 2).
- Se o medido contradiz o enunciado, **executa-se a INTENÇÃO do enunciado** e declara-se o desvio
  com o número — nunca se inventa o número.

## Critério de saída
Log escrito + veredito explícito. Se **AJUSTAR/PARAR**: parar e reportar ao operador antes do SEG0.
