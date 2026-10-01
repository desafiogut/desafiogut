# UTAC000.7 — SEG-2 · VEREDICTO DO VALIDADOR ADVERSARIAL (preservado) — 2026-10-01

**Alvo:** regra **A12** · **Commit:** `f0f02a6` · **Validador:** subagente independente, instruído a
**TENTAR REFUTAR** · Relatório integral: `C:/Users/Moltbot/tmp-utac0007-val/VEREDICTO-VALIDADOR.md`.

## VEREDICTO: **APROVADO COM RESSALVAS** — 0 refutações do núcleo da A12 · **1 sub-afirmação REFUTADA** · 4 ressalvas

## O que foi CONFIRMADO
| # | verificação | resultado |
|---|---|---|
| 1 | contagem/integridade | A=**12** · ID A12 único · **0** linhas removidas · `utac01`=0 ✅ |
| 2 | soma REAL das regras (contada ficheiro a ficheiro) | **75** = declarado ✅ |
| 3 | núcleo causal | mutante → suíte **15 falhas**, split **exacto 6+1+8**; religar → **VERDE 535/535** ✅ |
| 5 | cross-references | **HI10, A9, A11, T4** existem todas e são pertinentes ✅ |
| 6 | escopo | zero produção tocada ✅ |
| 7 | versão | 1.2 + changelog + bump minor correcto ✅ |

## ⛔ REFUTAÇÃO R-A12-1 — a cláusula da cache é FALSA (afirmação minha)
**O que eu escrevi na A12:** «com `node_modules/.vite` **apagado** o mutante dá **0/15** e com a cache
**quente** dá **6/15** — a cifra muda; declarar sempre o estado da cache».

**O que o validador mediu:**

| condição da cache | `mc1021a` (15 testes) | suíte |
|---|---|---|
| `.vite` **ausente** | **6 falhas** | `# fail 15` |
| `.vite` **quente** (pré-bundle criado de propósito) | **6 falhas** | `# fail 15` |

**As duas condições dão exactamente o mesmo.** O estado da cache é **inerte** aqui — com
`configFile:false` + `optimizeDeps.noDiscovery` as corridas não consomem pré-bundle.

**Raiz do erro (o meu instrumento):** o `0/15` que eu citei **não vinha da cache** — vinha de eu ter
comparado medições de **estados de código DIFERENTES**. No código de antes da redução do UTAC000.6,
desligar o load da ponte também repunha o renderizador no React do Node (`ReactSsr`/`renderSsr` ficavam
com os valores iniciais do Node) — era uma **dupla mutação**. Depois da redução, o mutante isola o load
e dá **6/15**. Eu atribuí a diferença à cache em vez de a atribuir à mudança de mutante.

**Impacto:** não derruba o núcleo da A12 (verdadeiro e verificado), mas declarava como «medido» algo
que não reproduz — contra o **GATE 17** da própria skill.

**Correcção aplicada:** a cláusula foi substituída e o texto errado **mantido à vista, marcado
REFUTADO**, dentro da própria regra (HI6/GATE 15: o erro documenta-se, não se apaga).

## RESSALVAS DO VALIDADOR
- **RES-1 — contagens obsoletas em 3 sítios (pré-existentes do v1.1):** `SKILL.md` ×2 diziam `A1-A8` →
  **corrigidas neste UTAC** (SKILL.md era escopo autorizado); `protocol/regras-legado.md` («61 regras em
  9 categorias», `A8`) **NÃO está no escopo autorizado** → **registada como pendência**.
- **RES-2 — a A12 não dizia ONDE se registava o load** → **corrigida**: a regra passa a nomear
  `_render.mjs`/`obterServidor()` e o `ssrLoadModule(...)`; sem esse load a ponte não faz nada.
- **RES-3 — estilo:** corpo da A12 com ~23 linhas e `Cross-ref:` em linha própria divergem de A9-A11 e
  do `aplicador.md` §1.5 («1-3 linhas»). **Não corrigido:** o spec do UTAC000.7 §0.2 pediu
  explicitamente este conteúdo (mecanismo + solução + como se verifica + origem + cross-ref). Tensão
  entre o spec e o estilo da skill → **declarada para decisão do operador**.
- **RES-4 —** `VERSAO.md` não declara o total (75) em campo próprio; vive no `SKILL.md`/`README.md`.

## O que o validador NÃO conseguiu verificar
O mecanismo íntimo (ordem de carregamento dentro do Vite); se a cache é de facto consumida; a cifra
histórica «68 falhas» do baseline (não a re-mediu).

## Integridade
`_render.mjs` revertido, md5 `58796203dd2a6edcddfe0c9c1b3190e8` **idêntico** (confirmado por mim, não
só pelo auto-relato); cache criada para medir e removida; nada commitado pelo validador; suíte de
fecho **VERDE 535/535 · 967/973**.
