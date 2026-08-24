# closed-testing/ — Pasta de trabalho do closed testing de 30 dias (MC92.10)

Estrutura de entregáveis definida pela skill `closed-testing-30d`:

- `inicio.txt`          — data ISO do início do teste (criar quando o operador
                          informar; sem ele os monitores ficam silenciosos)
- `logs/`               — evidências dos monitores (monitor-testadores-*,
                          monitor-backend-*, coleta-*) e da sentinela
- `relatorios-diarios/` — MC-CT-DIA-<n>.txt (cron diário 23h)
- `relatorios-semanais/`— MC-CT-SEMANA-<n>.txt (dias 7/14/21/28)
- `feedback-sintetizado-<data>.txt` — sugestões ao operador (cron 6h)
- `relatorio-final.txt` — relatório executivo do dia 30 (one-shot na data
                          real; cópia também no Desktop)

Regras: nunca inventar números (evidência real); ações com custo (prémios,
gas on-chain) só com autorização explícita do operador (R2); sem chaves/
credenciais no repo (R5). Ver skill `closed-testing-30d`.
