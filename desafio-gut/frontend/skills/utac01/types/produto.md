# TIPO: `produto` — UTAC que CONSTRÓI uma feature

**Auto-contido.** UTACs de desenvolvimento: criam ou alteram comportamento no produto
(frontend, backend, endpoint). Maior risco: regressão + efeito colateral.

## HARD GATES extra
- **Idempotência** — a operação tem de ser repetível sem efeito duplo (chave de idempotência, UNIQUE
  com compensação, ou CAS). Medir o efeito líquido.
- **Testes E2E / teste do USO** — provar o caminho real de ponta a ponta, não só a função.
- **HG13 (concorrência)** — testar com `Promise.all` (10 cliques simultâneos revelaram 402 falso e
  cobrança sem reembolso no MC105a).
- **A/B pareado** dos consumidores existentes — zero diff onde não devia haver comportamento novo.
- **Preservação fiscal** — NF-e, `txHash`, rastreio e commitment **nunca** alterados.

## Segmentos típicos
`SEG-1` (medir) → `SEG0-2` (frentes: construir) → `SEG3` (validador adversarial) → `SEG4`
(correcções) → `SEG5` (verificar) → `SEG6` (fecho).

## Autorizações típicas
- AUTORIZA criar/alterar ficheiros nomeados em `src/`, `netlify/functions/`, `_lib/`, `_tests/`,
  `scripts/`.
- NÃO AUTORIZA alterar ficheiros não nomeados, `CLAUDE.md` (se proibido), nem `git add -A`.

## Ficheiros típicos afectados
- `src/`, `netlify/functions/`, `_lib/`, `_tests/`, `scripts/` (prova de mutação).

## Exemplos
**UTAC102** («Recebi» pelo comprador) · **UTAC105a** (Passe: `_lib/passe.mjs` + `comprar-passe.mjs`) ·
**UTAC106** (Concurso de Previsões).

## Prompt de arranque (para o executor)
> Construa [FEATURE] em [FICHEIROS]. Idempotência obrigatória; testes E2E do uso real + mutação;
> A/B dos consumidores existentes. Escale qualquer ambiguidade em vez de decidir.
