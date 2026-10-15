# UTAC110h.2 · SEG0 — FRENTE A · ECOQUILDO NA INDICAÇÃO
> Backend credita ECOQUILDO por indicação (Art. 51º do Regulamento v5.0), em paralelo com os +50 pontos.
> R18-110h.2-1 e -2. Baseline `3f5aac6`. Alterações: 1 ficheiro de produção + 2 de teste.

---

## A0 — Decisão do operador que desbloqueou a frente (R18-110h.2-A)
O SEG-1 mediu que o sítio autorizado (`_lib/referral.mjs`) era o sítio ERRADO (endereços mascarados,
DEBT-025 ⇒ crédito inerte). O operador autorizou (opção 4):
> «Implementar em `_lib/fontes-lance.mjs::creditarIndicacao` (junto dos +50, endereços REAIS). Refs
> `eco-indicacao:<indicado>` e `eco-indicacao-recebida`; motivo `indicacao`; indicante respeita o limite
> de 10/mês; lastro via `registarEmissaoNoLastro(3)`. Regista o desvio no R14.»

⇒ **DESVIO DECLARADO:** o enunciado dizia `_lib/referral.mjs`; o sítio correcto é
`_lib/fontes-lance.mjs::creditarIndicacao`. Registado aqui, no relatório do Desktop e no R14.

## A1 — A alteração (mínima)

`netlify/functions/_lib/fontes-lance.mjs` (+ ~60 linhas, nenhuma linha existente removida):

| acrescentado | função |
|---|---|
| `import { creditarEcoQuildo, registarEmissaoNoLastro, reverterEcoQuildo } from "./eco-quildo.mjs";` | reutiliza o módulo do 110e (Ponytail) |
| `ECOQUILDO_INDICACAO_INDICANTE = 2` · `ECOQUILDO_INDICACAO_INDICADO = 1` · `MOTIVO_ECO_INDICACAO = "indicacao"` · `REF_ECO_INDICACAO_RECEBIDA` · `refEcoIndicacao()` | constantes do Art. 51º, num só lugar |
| `creditarEcoQuildoDaIndicacao(indicante, indicado, indicanteRes)` | o crédito + lastro + reversão |
| `creditarIndicacao(...)` → `return { ok, indicante, indicado, ecoQuildo }` | campo NOVO; `ok` continua a depender **só** dos pontos (contrato anterior intacto) |

Regras implementadas (todas com prova):
1. **+2 ao indicante, +1 ao indicado** (Art. 51º, verbatim lido no `docs/REGULAMENTO-v5.md:225`).
2. **Coexistência** com os +50 pontos (R18-110h.2-2): são dois créditos separados, em tabelas separadas,
   com idempotência separada.
3. **Refs próprias**: `eco-indicacao:<indicado>` (1× por par indicante/indicado) e
   `eco-indicacao-recebida` (1× por vida — a carteira só pode ser indicada uma vez: `ja_indicado` → 409).
4. **Motivo `indicacao`** — já estava na lista FECHADA `MOTIVOS_EMISSAO` do `eco-quildo.mjs` ⇒ **zero
   alterações ao `_lib/eco-quildo.mjs`** (o enunciado só o autorizava «se necessário»).
5. **Limite mensal** (R18-110h.2-3 e teu 4.): o indicante só recebe ECOQUILDO quando a indicação contou
   para o mês (mesmo gate dos +50, `LIMITE_INDICACOES_MES = 10`); o **indicado** recebe sempre.
6. **Lastro** (Art. 50º): `registarEmissaoNoLastro(emitido real)` — DERIVADO, nunca somado à mão. O
   valor é o **realmente criado** neste passo (3 no caso normal; 1 quando o indicante está no limite).
   Se o lastro falhar, as emissões **daquele passo** são revertidas (`reverterEcoQuildo`) — doutrina do
   `_lib/comprar-passe-tipado.mjs`: ECOQUILDO sem reserva em R$ não existe.
7. **Fail-soft para com os pontos**: um erro no ECOQUILDO nunca desfaz os +50. `ok` inalterado.

## A2 — Testes (`_tests/utac110h2-eco-indicacao.test.mjs`) — 8/8 VERDE

Corre o **endpoint real** (`referral.mjs`) com `_lib/jwt.mjs`, `_lib/referral.mjs`, `_lib/fontes-lance.mjs`
e `_lib/eco-quildo.mjs` REAIS; duplos só nas fronteiras (Blobs, Supabase — dispatcher que junta a `pontos`
do 110f ao `eco_quildo`/`eco_quildo_lastro` do 110e com as CHECKs da migração 20261014 —, contrato
on-chain, Sybil, Sentry, rate-limit, admins).

| # | teste | resultado |
|---|---|---|
| R1 | indicação válida → 200, +50/+50 pontos **e** +2/+1 ECOQUILDO, refs e motivos certos, lastro `3 / 0 emitido-usado / 300 centavos` | ✅ |
| R2 | auto-indicação → `400 auto_indicacao` e ZERO crédito (pontos e ECOQUILDO) | ✅ |
| R3 | 2.º código, mesma carteira → `409 ja_indicado`, nenhum ECOQUILDO extra | ✅ |
| R4 | re-execução do mesmo pedido → sem crédito duplo (1 entrada por histórico, lastro parado) | ✅ |
| R5 | 11.º indicado do mês → indicante sem +50 **nem** ECOQUILDO; indicado com os seus; lastro 31/3100 | ✅ |
| R6 | **fail-soft**: ECOQUILDO falha → pontos 50/50 intactos, ECOQUILDO 0, lastro 0 | ✅ |
| R7 | lastro falha → emissões revertidas, histórico limpo, lastro 0 (Art. 50º) | ✅ |
| R8 | unitário: constantes 2/1/`indicacao`/refs e endereço inválido → `ENDERECO_INVALIDO` | ✅ |

`node --test --experimental-test-module-mocks _tests/utac110h2-eco-indicacao.test.mjs` → `ℹ pass 8 · ℹ fail 0`.

⚠️ **Lição medida nesta frente:** o teste `R5` nasceu com uma expectativa **minha** errada (lastro `30/3000`
em vez de `31/3100` — a 11.ª indicação emite 1 ECOQUILDO, o do indicado). O teste reprovou e foi a MINHA
aritmética que estava errada, não o código. Corrigida a expectativa (não o código).

## A3 — Mutação (GATE 7) — `_tests/utac110h2-prova-mutacao.mjs` → **10/10 PROVADOS**, md5 restaurado

| mutante | fail |
|---|---|
| M1 ECOQUILDO ao indicante = 3 (≠ Art. 51º) | 5 |
| M2 ECOQUILDO ao indicado = 2 | 5 |
| M3 motivo fora da lista fechada (`MOTIVO_INVALIDO` silencioso) | 5 |
| M4 ref do indicante sem o indicado (idempotência global) | 3 |
| M5 sem o gate do limite mensal | 1 |
| M6 lastro com +3 fixo em vez do emitido real | 1 |
| M7 sem reversão quando o lastro falha | 1 |
| M8 papéis trocados (indicante ↔ indicado) | 6 |
| M9 sem registo no lastro | 5 |
| M10 ECOQUILDO do indicado por indicante | 7 |

Baseline do mutador: `baseline VERDE pass=8`. Cada mutante confirmado ENTRADO (md5 mudou) e o ficheiro
restaurado com md5 **idêntico**.

## A4 — Regressões (GATE 4)
`_tests/utac110f-referral.test.mjs` (o UTAC que criou os +50) **não foi tocado** e continua a passar: ver
a suíte completa no SEG4.

## A5 — Verdicto da frente
**FECHADA.** ECOQUILDO creditado por indicação, com lastro, idempotência, limite e fail-soft — 8/8 testes
e 10/10 mutantes. O `_lib/eco-quildo.mjs` NÃO foi alterado (o motivo `indicacao` já existia).
