# UTAC000.4 — SEG-1 · Medição e PARAGEM por limite de tempo (HI5 / GATE 4) — 2026-10-01

**Baseline:** `9f9c59d` = `origin/main`. **Objectivo:** suíte do frontend a 0 falhas.
**Veredito: PARAR** — a correcção excedeu **1 hora** (HI5/GATE 4) sem atingir o objectivo.
Progresso **parcial**, verificado, commitado. Nada de produção foi tocado.

## -1.1 Estado medido
| item | baseline `9f9c59d` | agora |
|---|---|---|
| suíte frontend | **68 falhas** (`# tests 535 · pass 467 · fail 68`) | **25 falhas** (`# tests 535 · pass 510 · fail 25`) |
| suíte backend | 967/973 (6 `skipped` pré-existentes) | **967/973** — intacto |
| disco | 21 GB livres | 21 GB livres |

## -1.2 É PRÉ-EXISTENTE (HI2/GATE 1) — confirmado
A suíte do frontend foi corrida num **worktree isolado no baseline `00610b0`**, sem nenhuma alteração
deste ou do UTAC105b.3, e deu **as mesmas 68 falhas**. Evidência commitada em
`_logs/UTAC105b.3_SEG6_VERIFICACAO.md` §6.9. Zero ficheiros de `frontend/src/**` foram tocados pelo
UTAC105b.3.

## -1.3 Causa raiz (medida com sonda própria)
O `@vitejs/plugin-react` da `vite.config.js` injecta `react`, `react-dom`, `react/jsx-runtime` e
`react/jsx-dev-runtime` no `optimizeDeps.include`; o optimizador pré-empacota o `react` num bundle
PRÓPRIO e o componente passa a usar ESSA cópia — instância **diferente** da que o ficheiro de teste
importa pelo Node — deixando o `ReactCurrentDispatcher` a `null`
(`Cannot read properties of null (reading 'useState'|'useContext')`).
A/B isolado, mesma sonda, mesmo componente real:
```
SEM @vitejs/plugin-react  →  RENDER OK    optimizeDeps.include = []
COM @vitejs/plugin-react  →  FALHOU       optimizeDeps.include = ["react","react-dom","react/jsx-runtime","react/jsx-dev-runtime"]
```

## -1.4 Frentes A/B — o que foi feito e verificado
- **NOVO** `src/__tests__/_servidor-teste.mjs`: servidor dos testes **isolado da config de produção**
  (`configFile: false`, **sem** `@vitejs/plugin-react`, `ssr.external` de
  react/react-dom/jsx-runtime/jsx-dev-runtime/scheduler, `resolve.dedupe`, aliases da config repetidos).
- Os **5** arnês passaram a usá-lo: `_render.mjs`, `_recursos-arnes.mjs`, `utac105b-painel.test.mjs`,
  `Dashboard.test.mjs`, `MeusAtivos.test.mjs`.
- **68 → 25.** Já verdes: `_render.mjs` e os seus 6 ficheiros de teste, `utac105b-painel` (5/5),
  `MeusAtivos` (27/27), `mc102-recebi` (9/9), `especial-i18n` (3/3 isolado).

### A Frente A proposta no spec é INSUFICIENTE — medido, por isso NÃO aplicada
O spec propunha `resolve.dedupe` + `optimizeDeps.exclude` na `vite.config.js`. Medido: com a config
**carregada**, o `exclude` **perde** para o `include` que o plugin acrescenta (a sonda mostrou o
`include` re-populado e `m.R === React` a `false`). E, corrigidos os arnês para **não carregarem** a
config, alterá-la **já não os afecta**. Aplicar a alteração seria uma mudança **sem medição que a
justifique** (E1/GATE 3) — a `vite.config.js` ficou **intacta**.

## -1.5 O que falta (resistiu a 5 variantes mínimas)
| ficheiro | falhas | erro |
|---|---|---|
| `src/pages/__tests__/Dashboard.test.mjs` | 10 | `useContext` no `react-router` (carregado pelo Node; a árvore renderiza pelo Vite) |
| `src/components/meus-ativos/__tests__/mc1021a-timeline.test.mjs` | 6 | `useState` — **só** os casos do `Cartao`; os do `Timeline` passam |
| `src/components/__tests__/mc1043-retencao.test.mjs` | 1 | `useState` (modal) |
| `src/components/edicao-especial/__tests__/especial-i18n.test.mjs` | 0 isolado | falha **só na suíte** — interferência entre ficheiros |

**Tentado e medido (todos falharam):** `optimizeDeps.exclude` · `ssr.external` sozinho ·
`resolve.dedupe` · `configFile: false` sozinho · aliases de `react/jsx-runtime` para o ficheiro
concreto (**pior**: o runner SSR do Vite 8 não avalia CJS → `module is not defined`) ·
`ssrLoadModule("react")` (mesmo erro).
**Sonda reveladora:** com o servidor do helper, `TimelineRastreio` **e** um JSX mínimo com hook
renderizam **OK** — logo o que resta é **interacção/ordem dentro do runner**, não um defeito de um
componente; não se resolve com um ajuste de opções.

## -1.6 VEREDITO DO SEG-1: **PARAR**
HI5/GATE 4 accionado. Escalado ao operador com o estado medido. `DEBT-004` mantida **aberta
(parcial)** — fechar não apaga (GATE 14).
