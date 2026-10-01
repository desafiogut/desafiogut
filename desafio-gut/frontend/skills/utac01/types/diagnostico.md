# TIPO: `diagnostico` — UTAC que MEDE sem alterar

**Auto-contido.** UTACs de leitura: produzem diagnóstico, inventário, plano ou medição.
**Não alteram** código de produção; o produto do trabalho são ficheiros de `_logs/`.

## HARD GATES extra
Nenhum gate adicional. Aplicam-se os 16 com este critério concreto:
- **HG2 (A/B)** — não aplicável (não há causalidade); substitui-se por **A/B de ficheiros**
  (zero diff nas fontes lidas).
- **HG7 (mutação)** — adaptado: prova-se que o **medidor** distingue (controlo positivo com um
  caso de valor conhecido), não que um código foi mutado.
- **HG4** — proibição reforçada: nada é escrito fora de `_logs/` e `Desktop/`.

## Segmentos típicos
`SEG-1` (medir) → `SEG0` (todas as frentes de leitura) → `SEG3` (validador adversarial) → `SEG6`
(verificação ad-hoc + fecho).

## Autorizações típicas
- AUTORIZA ler código, `_logs/`, `Desktop/`, Supabase (só `SELECT`).
- NÃO AUTORIZA escrever em produção, aplicar migrações, `git add -A`, deploy.

## Ficheiros típicos afectados
- Saída: `_logs/UTAC*_SEG*.md`, `Desktop/UTAC*-RELATORIO.md`.
- Leitura: todo o repo + Supabase (read-only) + PDFs do Desktop.

## Exemplo
**UTAC100** — inventário de módulos, mapa de camadas, matriz de conformidade, plano dos UTACs 101+.

## Prompt de arranque (para o executor)
> Meça [ALVO] com [INSTRUMENTO]. Não altere nada. Prove cada número com o ficheiro/comando que o
> produziu. Registe as divergências entre o enunciado e a realidade **com o número medido**.
