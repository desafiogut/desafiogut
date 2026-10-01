# UTAC000.5 — SEG-1 · Medição, diagnóstico e PARAGEM (GATE 4) — 2026-10-01

**Baseline:** `135d190` = `origin/main`. **Objectivo:** 25 falhas → 0.
**Veredito: PARAR no fim do SEG-1.** O PoC foi medido e **refutado**; a fase seguinte
(arquitectura do runner SSR) tem orçamento de 3-4 h e **excede o disponível nesta sessão** —
iniciá-la e deixá-la a meio seria pior do que não a começar (HI5/GATE 4, GATE 13).

## -1.1 Estado medido
| item | valor |
|---|---|
| `git rev-parse HEAD` | **`135d190`** = `origin/main` |
| suíte frontend | **25 falhas** (`# tests 535 · pass 510 · fail 25`) |
| suíte backend | **967/973** (6 `skipped` pré-existentes) |
| disco | 21 GB livres |
| caches | `node_modules/.vite/deps` **ausente** (sem pré-empacotamento) |
| trabalho em curso | nenhum (working tree: só `package-lock.json`, pré-existente) |

## -1.2 As 25 falhas são PRÉ-EXISTENTES (HI2) — confirmado
Reproduzidas no baseline `00610b0` em worktree isolado (UTAC000.4, evidência em
`_logs/UTAC105b.3_SEG6_VERIFICACAO.md` §6.9): **as mesmas 68 falhas** antes da correcção parcial.
Nenhuma alteração de produto as introduziu.

## -1.3 Evidência preservada ANTES (HI10/GATE 5)
`_logs/UTAC000.5_SEG-1_EVIDENCIA.txt` — cabeçalho com o comando, resumo TAP, lista dos ficheiros em
falha e o **TAP bruto** da corrida.

## -1.4 Os 4 ficheiros e o padrão que os une
| ficheiro | falhas | render que cai |
|---|---|---|
| `src/pages/__tests__/Dashboard.test.mjs` | 10 | `useContext` no `react-router` |
| `src/components/meus-ativos/__tests__/mc1021a-timeline.test.mjs` | 6 | **só** os que renderizam o **cartão** (`CartaoPedido`, `MeusPedidos.jsx:156`) |
| `src/components/__tests__/mc1043-retencao.test.mjs` | 1 | modal |
| `src/components/edicao-especial/__tests__/especial-i18n.test.mjs` | — | 3/3 **isolado**; falha só na suíte (interferência) |

### DIAGNÓSTICO AFIADO (novo, medido neste UTAC)
Sondas próprias, **mesmo componente, mesmo servidor, mesmo ficheiro de transporte**:
```
_cartao-pedido.jsx via _render.mjs, como SCRIPT simples ....... RENDER OK  (len=700)
_cartao-pedido.jsx via _render.mjs, sob `node --test` ....... RENDER OK  (len=706)
TimelineRastreio.jsx + JSX mínimo com hook, pelo helper ...... RENDER OK
_cartao-pedido.jsx no teste REAL (mc1021a) ................... FALHOU  (useState null)
```
**O transporte está certo; o que falha é o render que atravessa o ramo da timeline** — ou seja, o que
carrega MAIS módulos pelo runner. O `mc102-recebi`, que renderiza o mesmo `Cartao` **sem**
`pedido.rastreio.eventos`, passa 9/9. A diferença não é configuração: é o **grafo** que o runner
avalia. Isso confirma que o que resta é **arquitectural** (como o UTAC000.4 concluiu) e dá o alvo
exacto para a fase seguinte: `MeusPedidos.jsx` → `TimelineRastreio.jsx` (o único ramo que distingue
os casos que passam dos que caem).

## -1.5 Saúde global (HI1)
Disco 21 GB livres · backend intacto · sem ficheiros de produção tocados · cache de dependências
ausente (nada a limpar) · nenhum processo/servidor em execução.

## -1.6 VEREDITO DO SEG-1: **PARAR**
- PoC (Vite 7) **refutado** com medição → não se aplica (GATE 17).
- Fase arquitectural: **não iniciada** (orçamento insuficiente; GATE 4/13).
- **GATE 8 (validador adversarial): não despachado** — não há correcção nova para refutar; validar o
  diagnóstico em vez da correcção seria pedir confirmação, não refutação.
- `DEBT-004` mantida **aberta (parcial)**, com o diagnóstico novo anexado.
