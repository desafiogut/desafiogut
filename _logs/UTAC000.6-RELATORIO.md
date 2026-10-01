# UTAC000.6 — Relatório de fecho: runner SSR do Vite 8 — suíte VERDE

**Data:** 2026-10-01 · **Executor:** Hermes Agent · **Baseline:** `f980651`
**Objectivo:** 25 falhas residuais → 0 · **VEREDICTO: FECHADO** (validador: **APROVADO COM RESSALVAS**)

---

## 1. Resultado
| | início | fim |
|---|---|---|
| suíte **frontend** | **25 falhas** | **VERDE 535/535** |
| suíte **backend** | 967/973 | **VERDE 967/973** |
| código de produção | — | **intocado** (verificado pelo validador) |

## 2. A causa final (medida)
O runner SSR do Vite 8 serve a um módulo carregado **mais tarde** uma instância de React **diferente** da
do primeiro — `ReactCurrentDispatcher` a `null`. Isso explica as observações acumuladas (o `TimelineRastreio`
passava por ser o 1.º carregado; o `Cartao` caía por ser o 2.º; `mc102-recebi` passava por carregar um
só componente).

## 3. A correcção — **no mínimo medido** (HI3/Ponytail)
Depois do veredicto do validador, reduzida ao que ele próprio mediu como necessário. **Diff final vs
baseline: 3 ficheiros, +21/−3.**
| ficheiro | mudança |
|---|---|
| `src/__tests__/_ponte-ssr.mjs` | **NOVO** — o 1.º módulo que o servidor carrega; importa `react`, `react-dom/server`, `react-router-dom`, `framer-motion` |
| `src/components/meus-ativos/__tests__/_render.mjs` | **+2** — o load da ponte |
| `src/pages/__tests__/Dashboard.test.mjs` | React/renderizador e `MemoryRouter` vindos da ponte |

## 4. Provas (GATE 6 / GATE 7)
| prova | resultado |
|---|---|
| **Mutação** (desligar o load da ponte em `_render.mjs`) | suíte → **VERMELHO 15 falhas** (6+1+8) |
| **Restauro** (`md5 dd464867ded6…`) | **VERDE 535/535** |
| Bidireccional | 25 → **0** · `_logs/UTAC000.6_SEG-2_ANTES-DEPOIS.txt` |
| Verdadeiros positivos (validador) | mutou 1 asserção real em cada um dos 4 ficheiros → **todos ficaram VERMELHOS** |

## 5. ⚠️ REFUTAÇÕES — conclusões minhas que o validador DERRUBOU
> Mantidas **à vista** de propósito (GATE 15/HI6: o erro documenta-se, não se apaga). Não derrubam a
> correcção — derrubam a **necessidade** que eu lhe atribuí.

**R1 — «os 5 arnês carregam a ponte antes de qualquer componente» → REFUTADO.**
Falso para 3 dos 5: removendo a ponte de `Dashboard`, `MeusAtivos` e `utac105b-painel`, a suíte
continua **535/535**. `MeusAtivos` e `utac105b-painel` **não precisavam de nada** disto.

**R2 — «os 3 ficheiros que resistiam resolveram-se ao acrescentar `react-router-dom`/`framer-motion` à
ponte» → REFUTADO.** Revertendo **só** o `ssr.external`/`dedupe` de `_servidor-teste.mjs`, o `Dashboard`
ficou **10/10** e a suíte **535/535**.

**R3 — «o que fixa é o LOAD da ponte» (implicando o commit inteiro) → REFUTADO.** Só é verdade para
`_render.mjs`. Mutante combinado → **VERMELHO 10** (= só o `Dashboard`); e o `Dashboard` ficava verde com
**qualquer uma** das duas vias isoladamente → eram **redundantes**, uma era código morto.

*(Também declarado por mim e confirmado pelo validador: a reatribuição do renderizador em `_render.mjs`
**não é load-bearing** — código dispensável, agora **removido**.)*

## 6. Erros dos MEUS instrumentos (declarados)
1. **A cifra «`mc1021a` 0 pass/15 fail» não reproduz.** Medi-a com `node_modules/.vite` **apagado**; o
   validador mediu **6/15** com a cache **quente**. Ambas são reais — **a minha não declarou a condição**.
   Lição: em medições deste tipo, declarar sempre o estado da cache.
2. **Generalizei de um caso para cinco.** Mutei só o `_render.mjs` e estendi a correcção aos outros 4
   arnês **por analogia** — e a analogia estava errada em 2 dos 5.

## 7. Escopo (GATE 2 / HI4)
Só `**/__tests__/**` + `CLAUDE.md` + `_logs/*`. **Verificado pelo validador: nenhum ficheiro de produção
tocado; `netlify/functions/**` ausente do commit; nenhuma dependência nova** (`package.json` não tocado).
GATE 15 respeitado; contrato das 74 regras intacto.

## 8. Dívida (GATE 14)
**DEBT-004 FECHADA**, com a linhagem **68 → 25 → 19 → 0** à vista. A pedido do validador, a **redacção
anterior** da entrada foi **arquivada** (não apagada) numa secção de histórico do `_logs/DEBT.md`.

## 9. Pendente de autorização
A regra **A12** (instância do React no runner SSR / `@vitejs/plugin-react`) **não foi escrita** — a
autorização deste UTAC não incluía a skill. É a lição mais valiosa da série; proponho escrevê-la num UTAC
de skill próprio (1.1 → 1.2).

## 10. Registo R18 (3 lugares)
> **R18 (UTAC000.6):** o operador mandou corrigir o ramo `MeusPedidos→TimelineRastreio`, o `Dashboard` e
> os restantes, **sem** repetir o downgrade do Vite (já refutado no UTAC000.5). Executado; o validador
> adversarial **aprovou a correcção com ressalvas e derrubou 3 sub-afirmações minhas**, que ficam
> registadas acima e nos `_logs`. Correcção reduzida ao mínimo medido depois do veredicto.
> — `_logs/UTAC000.6-RELATORIO.md` · `CLAUDE.md` · `Desktop/UTAC000.6-RELATORIO.md`.

## 11. Custo
Ver fecho da sessão (`sessions` do `state.db`).
