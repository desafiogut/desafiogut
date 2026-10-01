# UTAC000.6 — SEG-3 · VEREDICTO DO VALIDADOR ADVERSARIAL (preservado) — 2026-10-01

**Commit validado:** `5fe1a4b` · **Validador:** subagente independente, instruído a **TENTAR REFUTAR**
**VEREDICTO: APROVADO COM RESSALVAS** — **0 refutações da correcção**; **3 sub-afirmações do EXECUTOR
REFUTADAS**. Relatório integral: `C:/Users/Moltbot/tmp-utac0006-val/VEREDICTO-VALIDADOR.md`.

## O que o validador CONFIRMOU
| # | verificação | resultado |
|---|---|---|
| 1 | suíte verde | `frontend VERDE 535/535` · `backend VERDE 967/973` ✅ |
| 2 | verdadeiros positivos | mutou 1 asserção real em cada um dos 4 ficheiros → **cada um ficou VERMELHO**; md5 revertido idêntico ✅ |
| 4 | a declaração honesta do executor (reatribuição não é load-bearing) | **VERDADEIRA** ✅ |
| 5 | escopo | só `**/__tests__/**`, `CLAUDE.md`, `_logs/*`; **zero produção**; backend intacto ✅ |
| 6 | dependências | **nenhuma nova** (`package.json` fora do commit) ✅ |
| 7 | histórico da DEBT-004 | fechada com a linhagem **68 → 25 → 19 → 0** à vista ✅ |

## REFUTAÇÕES (sub-afirmações do executor DERRUBADAS)
> Não derrubam a correcção (que funciona e está bem escopada); derrubam a **necessidade** que eu lhe atribuí.

**R1 — «os 5 arnês carregam a ponte antes de qualquer componente» → FALSO para 3 dos 5.**
Removendo a ponte de `Dashboard`, `MeusAtivos` e `utac105b-painel` (React pelo Node), a suíte continua
**535/535**. Ou seja: `MeusAtivos` e `utac105b-painel` **não precisam de nada** disto.

**R2 — «os 3 ficheiros que resistiam resolveram-se ao acrescentar `react-router-dom`/`framer-motion` à
ponte» → FALSO.** Revertendo **só** o `ssr.external`/`dedupe` de `_servidor-teste.mjs`, o `Dashboard`
fica **10/10** e a suíte **535/535** — o alargamento do `ssr.external` não era o que os resolvia.

**R3 — «o que fixa é o LOAD da ponte» (implicando o commit inteiro) → só é verdade para `_render.mjs`.**
Mutante combinado (3 arnês sem ponte + `ssr.external` revertido + reatribuição revertida) → **VERMELHO 10**
(= só o `Dashboard`). E o `Dashboard` fica verde com **qualquer uma** das duas vias isoladamente (ponte
**ou** `ssr.external`) → eram **redundantes**; uma delas era código morto.

## RESSALVAS DO VALIDADOR
1. **Mais código morto do que eu declarei**: load da ponte em `MeusAtivos`/`utac105b-painel`, o
   alargamento do `ssr.external`/`dedupe` e a reatribuição do renderizador — todos dispensáveis (HI3).
2. **A minha cifra de evidência «`mc1021a` 0 pass/15 fail» NÃO reproduz**: o validador mediu **6/15**
   isolado (15 é o número da *suíte*). Erro do MEU instrumento — ver §Erros dos meus instrumentos.
3. **DEBT.md:** a linha anterior da DEBT-004 foi **substituída** em vez de arquivada à vista.
4. Não isolou o mecanismo íntimo do Vite; não mediu cache frio nem CI; não mediu em paralelo.

## Erros dos MEUS instrumentos (declarados, não escondidos)
- **A cifra «0/15» era dependente do estado da cache.** Medi-a com `node_modules/.vite` **apagado**;
  o validador mediu **6/15** com a cache **quente**. As duas medições são reais — a minha não declarou
  a condição. **Lição:** em medições deste tipo, declarar sempre o estado da cache.
- **Generalizei de `_render.mjs` para os 5 arnês sem os medir um a um.** O `mc1021a` foi o único que
  mutou; estendi a correcção por analogia — e a analogia estava errada em 2 dos 5 casos.

## Correcção aplicada depois do veredicto (HI3/Ponytail)
Reduzido ao **mínimo medido**: `_ponte-ssr.mjs` (novo) + o seu load em `_render.mjs` + **uma** via no
`Dashboard`. Removidos: o load da ponte em `MeusAtivos`/`utac105b-painel`, o alargamento do
`ssr.external`/`dedupe` e a reatribuição do renderizador. **Diff final vs baseline: 3 ficheiros, +21/−3.**
Re-verificado: **frontend VERDE 535/535 · backend VERDE 967/973.**
