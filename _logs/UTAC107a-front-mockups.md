# UTAC107a-front — Mockups HTML/CSS das alterações UI/UX

**Tipo:** produção de mockups (sem alteração de código) · **Skill:** `skills/utac` + 4 skills de design ·
**Data:** 2026-10-05 · **Modelo:** Claude Opus 5.5 (Claude Code) · **HEAD de partida:** `536c9cb` (= `origin/main`).

> **Entrega:** `docs/mockups-107a/` — 8 pranchas HTML + `tokens.css` + `mockup.js` (auditores) + `DESIGN.md`
> (+ `lint-design-md.json`). **Zero** ficheiros de `src/`, `netlify/`, `scripts/`, `_lib/`, `package*.json`,
> `.bak-*`, NORTE/ESCOPO/FICHA/MC100_MATRIZ tocados (verificado: `git status --porcelain | grep -v '^??'` = vazio).

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Arranque | 2026-10-05 23:22 | `date` |
| `HEAD` / `origin/main` | `536c9cb46d45…` / `536c9cb46d45…` (0/0) | `git rev-parse HEAD origin/main` |
| Sujeira (tracked) | **0** | `git status --porcelain \| grep -v '^??'` |
| Suíte (HI1) | **frontend VERDE 774/774 · backend VERDE 1061/1067** → `VEREDITO: VERDE` (= esperado) | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `vite build` | **✓ built in 15.11s**, exit 0 — para o **scratchpad** (`--outDir`), NÃO para o `dist/` que alimenta o APK | `npx vite build --outDir <scratch>` |
| Disco C: | 11 GB livres (> 5 GB) | `df -h /c` |
| Worktree helper (A9/A13) | `scripts/worktree-helper.mjs` presente (`criar\|check\|remover`) | `ls` |
| `docs/mockups-107a/` | não existia → criado | `ls` |

### Skills de design (RESSALVA 5)
As 4 estão **acessíveis**, mas **não onde o enunciado diz** (desvio declarado, não é PARAR):

| Skill | Enunciado | Medido |
|---|---|---|
| `mobile-ux-design` | `skills/mobile-ux-design/` | `~/AppData/Local/hermes/skills/mobile-ux-design/SKILL.md` (+ 4 references) |
| `claude-design` | bundled | `~/AppData/Local/hermes/skills/creative/claude-design/SKILL.md` |
| `popular-web-designs` | bundled | `~/AppData/Local/hermes/skills/creative/popular-web-designs/` (54 templates) |
| `design-md` | bundled | `~/AppData/Local/hermes/skills/creative/design-md/SKILL.md` |

São skills do **Hermes**, não registadas no Claude Code; foram **lidas** (SKILL.md) e aplicadas. Uso efectivo:
`mobile-ux-design` → 48 dp, zona do polegar, carrossel com «peek» de 14 %, campos 16 px (sem zoom iOS), barra
inferior com rótulos; `claude-design` → surface-first (Monitor/Operate, não hero), 3 variantes conservadora/
recomendada/divergente, auto-verificação no browser, anti-slop (sem gradientes novos, sem blur); `design-md` →
`DESIGN.md` + **lint oficial** `npx -p @google/design.md designmd lint` → **0 erros · 0 avisos** (inclui
`contrast-ratio`); `popular-web-designs` → referência de qualidade (padrões Linear/Revolut de densidade e
tabela), **sem copiar** — a paleta do produto manda.

### Medições visuais (o que o 107a-back não mediu)
- **Contraste WCAG** (vidro composto `#0c1132`; pior caso sobre branco `#2a2e4d`) — `scratchpad/contraste.mjs`:
  muted `#6b7db8` **4,60** (passa no limite; 3,29 no pior caso) · faint `#3d4f8a` **2,35 ✗** · **botão «Comprar
  Passe Desafio» branco s/ `#f5a623` = 2,03 ✗** · branco s/ `#a78bfa` 2,72 ✗ · navy `#0a0f1a` s/ `#f5a623` 9,45 ✓.
- **Toque:** `Button md` = `h-11` = **44 px**; botões inline ≈ 44 px; «↻» da Carteira ≈ **20 px**; link das Regras
  Oficiais ≈ **13–15 px** de altura.
- **Desalinhamento do vidro no MLC (decisão 4):** `TabelaLances` usa vidro próprio `rgba(10,16,42,.6)` +
  **`backdrop-filter: blur(20px)`** + r12 + borda laranja (`TabelaLances.jsx:347`) — o único blur do app, contra o
  MC82.1; `CardLance` usa `Card` com **`p-6` (24 px)** vs 16 px nos outros; margens: frase `0.85rem 1rem`, wrapper
  do `GlassHeader` `1rem 1rem 0`, `main` `1rem` (desktop `1.5rem 2rem` em 2 colunas) vs Carteira 2rem e Início
  1,25rem.
- **Deriva de tokens:** dourado `#f5a623` (páginas) vs `#ff9500` (`@theme`/`glassTokens`); vermelho `#ef4444` ·
  `#ff3d71` · `#ff5a5f`; rótulos a 0,58–0,62rem (≈ 9–10 px).
- **Regra 1 (violações no código actual):** frase do MLC (`MercadoLances.jsx:305`), `<header>` da OP
  (`OfertasProgramadas.jsx:111`), link das Regras (`:276`), aviso 402 da Carteira (`MinhaCarteira.jsx:392`).
- **«Antes» reconstruído em HTML a partir do código** — não houve captura: exigiria aceitar o gate LGPD (consentimento
  legal) em nome do operador (precedente MC99.2).

### ⚠️ Conflitos enunciado × medido (escalados — R20/AU3) e respostas do operador (R18)
1. **Início não tem tabela de lances** (`TabelaLances` só existe em `MercadoLances.jsx:368`). → **R18-A:** saem do
   Início **todos** os blocos de lances: KPIs «Lances Únicos» e «Total de Lances» e o cartão «🏆 Menor Lance Único».
2. **«Senhas» é um KPI de senhas on-chain** (`Dashboard.jsx:174`, Via A). → **R18-B:** o «Passe Desafio» mostra
   **pontos de cartão X/50** (`GET /ler-pontos → pontosCartao`).
3. **Tabela «Lances — Edição R-1» na OP duplicaria a do MLC.** → **R18-C:** mostra a **edição Programada** do palpite.
4. Declarados sem pergunta: a frase real termina em «**leva!**», não «passa» (remove-se igual); retirar «Trocar R$ 2 →
   1 Senha» elimina o único caminho visível de compra de senhas Via A (para o 107b).

Decisões tomadas pelo operador **durante** o trabalho (mensagens a meio do UTAC):
- **R18-D:** «eu gostava do layout de carteira como tava antes» → a variante **A · Fiel ao actual** passou a
  recomendada (mesmo cartão único; só muda o que as decisões obrigam).
- **R18-E:** «existem muitos textos pequenos que estão muito técnicos, e em alguns casos desnecessários» → retirados
  do ecrã: pílula «R$ OFF-CHAIN», frase de apoio do saldo, nota do e-mail PIX (com aviso para o 107b — o MC99 repôs-a
  de propósito), «Art. 8/26», «5 lances/min · cooldown 3 s», «sincroniza a cada 30 s», coluna «ID do Lance»,
  «Status (Art. 24)», descrição longa do cartão Quildo.

**Veredito SEG-1: AJUSTAR → respondido (R18-A/B/C) → SEGUIR.**

---

## §SEG0 — Tokens + Regra 1

- `tokens.css` — tokens actuais + **propostas marcadas** (`--gut-gold` único `#f5a623`, `--gut-on-gold #0a0f1a`,
  `--gut-danger #ff5a5f`, `--gut-muted-strong #8fa0d8`, `--gut-touch 48px`, `--gut-label 12px`, `--gut-coluna 640px`,
  `--gut-pad 16/20`). Componentes: `.glass`, `.btn*`, `.carrossel`, `.tabela-especial`, `.bottomnav`.
- `tokens.html` — folha de tokens; contraste **calculado no browser** (fórmula WCAG) para 13 cores e 6 pares de botão.
- `DESIGN.md` + `lint-design-md.json` — lint oficial: **0 erros, 0 avisos**.
- `regra-1-glass.html` — componente `.glass` + 4 exceções (BottomNav, modais, botões, rodapé).
- `mockup.js` — **auditores** que correm na prancha: (1) toque — todo `button/a/summary/input/select/[role]` visível
  ≥ 48 × 48; (2) Regra 1 — todo o nó de texto do conteúdo tem antepassado `.glass`/exceção. **Controlo positivo:**
  o «antes» da Regra 1 acusa **5 blocos fora / 1 alvo 196×16**; o «depois» 0/0.

## §SEG1–SEG4 — Pranchas das 4 abas

Cada uma: «antes» (reconstruído), «depois» com **3 variantes**, larguras **375/768/1024**, anotações numeradas.

| Prancha | Variantes | Recomendada |
|---|---|---|
| `carteira.html` | A Fiel ao actual · B Saldo + ações · C Divergente (mosaicos + CTA fixo) | **A** (R18-D) |
| `inicio.html` | A 2 tiles · B Passe com barra · C separador Relâmpago/Programadas | **B** |
| `menor-lance-unico.html` | A coluna única · B lance no cartão · C 2 colunas ≥ 700 | **A** |
| `ofertas-programadas.html` | A campo + botão · B − / + · C folha inferior | **A** (5 estados do palpite) |

## §SEG5 — Regra 2 (`tabela-especial.html`)

Componente único `.tabela-especial`: mesmo vidro (0,88 · r14 · sem blur), cabeçalho do cartão **56 px**, cabeçalho da
tabela **48 px**, linhas **48 px**, alternância subtil, 4 colunas. **Medido no browser (8 medidas × 3 larguras):
igual.** A 1.ª medição apanhou **56 vs 67 px** (o título «Edição PROG-1» quebrava) → corrigido (altura fixa + título
sem emoji). Posição: **último vidro** antes do rodapé — verificado em todas as variantes de MLC e OP (a variante C da
OP **não tinha a tabela** → corrigido, achado pela auditoria).

## §Verificação ad-hoc (antes do validador)

Auditoria por navegação directa (chrome-devtools) — todas as variantes × 3 larguras:

| Prancha | «antes» toque<48 / fora de vidro | «depois» (todas as variantes × 3 larguras) |
|---|---|---|
| Carteira | 5 / 2 | 0 / 0 · sem overflow horizontal |
| Início | 1 / 1 | 0 / 0 · sem overflow |
| MLC | 5 / 1 | 0 / 0 · sem overflow · tabela = último vidro |
| OP | 4 / 3 | 0 / 0 · sem overflow · tabela = último vidro |

Consola: 0 erros/avisos. **Erros dos meus instrumentos (declarados):** (1) `.tela{display:flex}` anulava `[hidden]` →
as 3 variantes apareciam juntas (corrigido em `tokens.css`); (2) o auditor tratava só `.btn` como exceção de botão e
o vidro antigo da tabela como «fora de vidro» → inflacionava o «antes» (corrigido: `button` e `.vidro-antigo`
permitidos); (3) `<summary>` fora dos alvos medidos (acrescentado); (4) iframes `file://` sem acesso ao documento →
auditoria refeita por navegação.

## §SEG6 — Validador adversarial

*(a preencher com o veredicto verbatim)*

## §SEG7 — Registo e custo

*(a preencher)*
