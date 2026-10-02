# UTAC000.14 — SEG-1 — Medição

**Data:** 2026-10-02 · **Base medida:** `3a0f6fa` = `origin/main` = HEAD · **Spec:** `_logs/UTAC000.14.spec.yml`

## 1. Estado (medido)
- `git status --short`: só `M desafio-gut/frontend/package-lock.json` (pré-existente, **não** é deste UTAC, não se toca) + `_logs/` não versionados antigos (MC100…).
- Suíte (`node scripts/mc966-suite-harness.mjs ambos </dev/null`): **frontend VERDE 630/630 · backend VERDE 967/973** (= o declarado no spec).
- md5 baseline: `FimEdicaoOverlay.jsx 2818b188…` · `AppContext.jsx ae868cf6…` · `MercadoLances.jsx 7f40ab23…`.
- Cópias de segurança fora do repo (GATE 20): `C:/Users/Moltbot/tmp-utac00014/{FimEdicaoOverlay,AppContext}.jsx.orig`.

## 2. Defeito DEBT-013 (reproduzido — evidência bruta em `_SEG-1_EVIDENCIA.txt`)
Ficheiro real: **`src/components/FimEdicaoOverlay.jsx`** (o spec diz `components/edicao-especial/` — esse caminho não existe).
- l.13-15 `enderecoAbrev = vencedor ? vencedor.endereco.slice(…) : "—"` — truthiness.
- l.16 `valorFmt = vencedor ? \`R$ ${(vencedor.valor / 100).toFixed(2)}\` : "—"` — truthiness.

Teste novo (`src/components/__tests__/utac00014-fim-edicao-overlay.test.mjs`, 24 casos) contra o código ANTIGO: **17 RED / 7 verdes** (os 7 verdes = 6 valores válidos + «sem vencedor»).
| entrada (valor; endereço válido) | antes |
|---|---|
| ausente, `{}`, `NaN`, `"abc"` | «R$ NaN» |
| `Infinity` | «R$ Infinity» |
| `-1` | «R$ -0.01» |
| `300n` | **LANÇA** `TypeError: Cannot mix BigInt and other types` |
| `Symbol()` | **LANÇA** `TypeError: Cannot convert a Symbol value to a number` |
| `"300"` | «R$ 3.00» (coerção) |

| entrada (endereço) | antes |
|---|---|
| `vencedor: {}`, `{valor:300}` | **LANÇA** `Cannot read properties of undefined (reading 'slice')` |
| `endereco: null` | **LANÇA** `…of null (reading 'slice')` |
| `endereco: 12345 / true / {}` | **LANÇA** `vencedor.endereco.slice is not a function` |
| `endereco: [] / ""` | mostra «...» |

## 3. `showOverlay` (medido)
- O `setShowOverlay(true)` comentado está em **`src/context/AppContext.jsx` l.1205** (dentro do `setTimeout` de 1200 ms do relâmpago; comentário «MC63/64: animação de vencedor desabilitada»), **não** no `MercadoLances.jsx` (premissa do spec refutada — igual ao medido no UTAC000.13).
- Único produtor possível de `true`. Os outros `setShowOverlay` (l.757, 1212, 1325) são todos `false`.
- Consumidores: `MercadoLances.jsx` l.209 (`OverlayVencedor`, já guardado UTAC000.11) e `Dashboard.jsx` l.524 (`FimEdicaoOverlay` — **sem guarda até este UTAC**).

## 4. Saúde global (HI1)
- Disco C: 18 GB livres (93% usado) — suficiente, sinalizado.
- Worktrees: `main` + 1 worktree destacado antigo de outra sessão (`…/ffd22ecc…/wt-94`, `e3d8791`) — **não é deste UTAC, não se toca**.
- `node v24.14.1`; harness corre com `</dev/null` (lição do UTAC000.13).

## 5. Conflitos do spec ⇒ veredito **AJUSTAR** (decididos pelo operador, R18)
1. **l.14 (endereço)** também rebenta (6 casos, incluindo `vencedor: {}` que o GATE 22 exige não rebentar); o spec só autorizava a l.16. **Operador: «Guardar l.14 + l.16».**
2. **`setShowOverlay(true)`** está no `AppContext.jsx` (proibido no spec). **Operador: «Autorizar AppContext l.1205»** (só descomentar essa linha).

**Veredito SEG-1: SEGUIR** (após as duas decisões).
