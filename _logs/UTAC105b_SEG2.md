# UTAC105b — SEG2 Frente C: ligação Passe ↔ cupons (2026-09-30)

**Baseline:** `comprar-passe.mjs` criava o passe com `cupons_ids` = DEFAULT `[]`. Uma edição vende 1 produto (`meta.produtoId`) → 1 lojista (`produto.lojista`).

## Alteração (acrescentar, não reescrever)
- `_lib/passe.mjs` (R18-A/R18-D): `criarPasse({…, cuponsIds = []})` — valida array de uuids sem repetidos e grava `cupons_ids` **no próprio INSERT**.
  Omitido → `[]` (comportamento MC105a). Nada mais no ficheiro mudou.
- `comprar-passe.mjs`: depois da verificação idempotente (passe existente → 200, como antes) e **antes do débito**: `listarCuponsAtivosDoLojista(produto.lojista)`;
  erro → 503 `store_indisponivel`; **0 activos → 409 `sem_cupons_ativos` (R18-C)**; ids → `criarPasse(…, cuponsIds)`. Snapshot dos activos na compra.
- `_tests/mc105a-e2e.test.mjs`: o `semear()` passou a dar ao produto um lojista com 1 cupom activo (sem isso 14 testes davam 409 — consequência da R18-C, não regressão).

## Testes — `_tests/utac105b-ligacao.test.mjs` (7, handler real)
C1 compra → 201 com os activos do lojista (inactivos e de outro lojista fora), débito R$ 2,00 · C2 2.ª compra → 200 idempotente, mesmo passe/cupons,
sem débito (mudar a oferta depois não mexe no passe) · C3 0 activos → 409, saldo intacto, 0 passes · C4 produto sem lojista → 409 · C5 erro a ler cupons →
503, saldo intacto · C6 **10 compras em paralelo** → 1 passe com cupons, débito líquido R$ 2,00 · C7 `criarPasse` recusa ids inválidos/repetidos, omitido → `[]`.

## A/B pareado
`comprar-passe` continua a debitar exactamente 200 centavos (500 → 300 em C1 e C6); `mc105a-e2e` 22/22 e `mc105a-passe` 10/10.

## Mutação — `scripts/utac105b-prova-mutacao.mjs todos`: **23/23 mortos** (A 7 · B 9 · C 7), todos confirmados a ENTRAR, restauro byte a byte.
ℹ️ C-M5 («cupons de qualquer lojista» fixado no lojista do teste) só morre por C4 — mutante fraco, declarado.
⚠️ Instrumento: 1.ª corrida da bateria C não chegou a executar (escape `\n` partido no script → SyntaxError antes de mutar); corrigido e repetido.

## Suíte: frontend **VERDE 535/535** · backend **VERDE 909/915**. Veredito: **SEGUIR** (para o validador).
