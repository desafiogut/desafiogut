# UTAC000.2 — SEG0 Frente A: estrutura de review (2026-09-30)

PoC (padrão medido): ficheiros da skill abrem com `# TÍTULO` + `**Auto-contido.**`; pt-PT; tabelas markdown; sem referências a «este MC».
Criados: `skills/utac01/review/README.md` (o que é, porquê, fluxo executor → revisor → operador → aplicador → versão, o que NÃO faz, ficheiros) ·
`review/template.md` (7 secções obrigatórias, evidência ficheiro:linha, L1, IDs provisórios `<CAT>-novo-<n>`) · `_logs/REVIEWS/INDEX.md` (tabela com
coluna «decisão do operador»).

Verificador versionado: `scripts/utac0002-verifica-review.mjs A` → **VERDE 9/9**.
Mutação em CÓPIAS (`scripts/utac0002-prova-mutacao.mjs A`, ficheiros reais intocados; controlo «cópia intacta → VERDE»): **6/6 mortos**.
1.ª ronda 5/6 — A-M3 (secção repetida fora de ordem) sobreviveu: a ordem era verificada por `indexOf` (1.ª ocorrência). Agora exige a sequência
exacta `## 1.`…`## 7.`. Veredito: **SEGUIR**.
