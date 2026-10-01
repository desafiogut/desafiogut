# UTAC000.6 — Relatório de fecho: runner SSR do Vite 8 — suíte VERDE

**Data:** 2026-10-01 · **Executor:** Hermes Agent · **Baseline:** `f980651`
**Objectivo:** 25 falhas residuais → 0 · **VEREDICTO: FECHADO**

---

## 1. Resultado
| | início | fim |
|---|---|---|
| suíte **frontend** | **25 falhas** | **VERDE 535/535** |
| suíte **backend** | 967/973 | **VERDE 967/973** |
| código de produção | — | **intocado** |

## 2. A causa final (medida)
O runner SSR do Vite 8 serve a um módulo carregado **mais tarde** uma instância de React
**diferente** da do primeiro — `ReactCurrentDispatcher` fica a `null`. O **primeiro**
`ssrLoadModule` de um processo/servidor acerta; os seguintes não. É isto que explicava TODAS as
observações acumuladas (o `Timeline` passava por ser o 1.º carregado; o `Cartao` caía por ser o 2.º;
`mc102-recebi` passava por carregar um só componente).

## 3. A correcção (mínima)
**NOVO** `src/__tests__/_ponte-ssr.mjs` — o **PRIMEIRO** módulo que o servidor de testes carrega.
Importa os pacotes que trazem React (`react`, `react-dom/server`, `react-router-dom`, `framer-motion`),
fixando a instância para **todos** os módulos seguintes. Os 5 arnês carregam-no antes de qualquer
componente; o `MemoryRouter` do `Dashboard` passa a vir dele (e não do Node).

## 4. Provas (GATE 6 / GATE 7)
| prova | resultado |
|---|---|
| **Mutação** (desligar o load da ponte em `_render.mjs`) | `mc1021a` → **0 pass / 15 fail** |
| **Restauro** (`md5` idêntico) | `mc1021a` → **15 pass / 0 fail** |
| Bidireccional (Antes/Depois) | 25 falhas → **0** · `_logs/UTAC000.6_SEG-2_ANTES-DEPOIS.txt` |
| PoC do Vite 7 (UTAC000.5) | **refutado** (152 falhas) — o downgrade não é a solução |

**Declaração honesta:** a *reatribuição* do renderizador em `_render.mjs` foi medida e **não é
load-bearing** (o mutante que a reverte continua 15/15). O que fixa é o **load** da ponte. Mantida por
coerência, declarada para o validador.

## 5. Os 3 ficheiros que resistiram
| ficheiro | antes | stack | resolvido por |
|---|---|---|---|
| `Dashboard.test.mjs` | 10 | `useContext` no `react-router` | `react-router-dom` na ponte + `MemoryRouter` dela |
| `especial.test.mjs` | 8 | `useState` | ponte |
| `mc1043-retencao.test.mjs` | 1 | `useReducedMotion` do `framer-motion` | `framer-motion` na ponte |

## 6. Escopo (GATE 2 / HI4)
Alterados: `_servidor-teste.mjs`, `_ponte-ssr.mjs` (novo), `_render.mjs`, `utac105b-painel.test.mjs`,
`Dashboard.test.mjs`, `MeusAtivos.test.mjs` + logs/documentação. **Verificado: nenhum ficheiro de
produção (`src/**` fora de `__tests__`, `netlify/functions/**`) foi tocado.** GATE 15 respeitado;
contrato das 74 regras intacto.

## 7. Dívida (GATE 14)
**DEBT-004 FECHADA** — cita este UTAC e mantém o histórico (68 → 25 → 19 → **0**) à vista; fechar não
apaga.

## 8. Pendente de autorização
A regra **A12** (`@vitejs/plugin-react` + instância do React no runner SSR) **não foi escrita**: a
autorização deste UTAC não incluía a skill. É a lição mais valiosa da série — **proponho** escrevê-la
como **A12** em `protocol/regras/A-ambiente.md` (skill 1.1 → 1.2) num UTAC de skill próprio.

## 9. Registo R18 (3 lugares)
> **R18 (UTAC000.6):** o operador mandou **corrigir** o ramo `MeusPedidos→TimelineRastreio`, o
> `Dashboard` e os restantes, **sem** repetir o downgrade do Vite (já refutado). Executado; a correcção
> mínima foi provada por mutação. Nota de escopo: a skill não foi tocada por falta de autorização.
> — `_logs/UTAC000.6-RELATORIO.md` · `CLAUDE.md` · `Desktop/UTAC000.6-RELATORIO.md`.

## 10. Custo
Ver fecho da sessão (`sessions` do `state.db`).
