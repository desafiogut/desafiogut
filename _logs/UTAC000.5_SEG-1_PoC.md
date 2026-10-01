# UTAC000.5 — SEG-1 · PoC «baixar o Vite» (Frente A) — 2026-10-01

**Objectivo do PoC:** testar se `vite@8.1.0` → `vite@7.x` faz desaparecer as 25 falhas residuais.
**GATE 17:** branch local, nada commitado. **GATE 3:** PoC antes da arquitectura.

## Método (exacto)
```
git checkout -b poc/vite7                      # branch local, descartada no fim
cd desafio-gut/frontend
npm install vite@7 --save-dev --legacy-peer-deps --no-audit --no-fund   # 15 s
node scripts/mc966-suite-harness.mjs ambos     # da raiz
```
Versão instalada: **`vite@7.3.6`** (medida em `node_modules/vite/package.json`).

## Resultado — REFUTADO
| versão do Vite | suíte frontend | suíte backend |
|---|---|---|
| **8.1.0** (baseline, com a correcção parcial do UTAC000.4) | **25 falhas** | 967/973 |
| **7.3.6** (PoC) | **152 falhas** | 967/973 |

**O downgrade não resolve — agrava (25 → 152).** Hipótese mais provável: as opções do
`_servidor-teste.mjs` (`ssr.external`, `configFile:false`, ausência do `@vitejs/plugin-react`) foram
calibradas contra o Vite 8; no Vite 7 a externalização/comportamento do optimizador difere e o
transporte dos testes desalinha-se ainda mais.

## Decisão
**GATE 17 respeitado: o downgrade NÃO foi aplicado.** Reposto o `vite@8.1.0` e o `package.json` do
`HEAD`; branch `poc/vite7` eliminada; `main` limpo (`package.json` sem diferenças vs `HEAD`).
Conforme a árvore de decisão do operador: **PoC não resolve → avançar para a arquitectura do runner SSR.**
