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
- **R18-F:** «em início, eu gostava de como estava antes» + «os 4 botões que tínhamos» → Início variante **A · Fiel ao
  actual** (recomendada): cabeçalho GUTO/logo/«Olá», **os 4 tiles** (Saldo, **Passe Desafio** 12/50, Lances Únicos, Total de
  Lances — os 2 KPIs de lances **voltam**, o que substitui a parte da R18-A sobre eles), Edição Ativa, Acesso Rápido com os 7
  atalhos. O cartão 🏆 continua fora (decisão 3).
- **R18-G:** «preserve o estilo de rolagem lateral que já tínhamos» → todos os carrosséis passam ao padrão do
  `Dashboard.jsx` (MC99): `flex: 0 0 100%`, `scroll-snap-type: x mandatory` + `start`, sem «peek» nem pontos; cartões no
  desenho do `EdicaoCard`.
- **R18-H:** MLC — «reformule de uma forma limpa o primeiro glass… muito feio e cheio de informação» + «deixe mais limpo,
  tem muito glass muita informação» → MLC com **3 vidros** (título · edição + lance · tabela), ≈ 9 textos (eram ≈ 20 em 5
  superfícies). «O segundo glass ficou bom» → **aprovado** pelo operador; não se mexe mais.
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

**1.ª ronda** (subagente independente, worktree `C:/Users/Moltbot/tmp-107afront-val/wt` @ `dff04c7`, sem junctions;
browser em contexto isolado; auditor próprio + parser HTML). **Veredicto: PARCIAL · 1 bloqueante.** Texto verbatim em
`_logs/UTAC107a-front_SEG6_VALIDADOR.md`.

| id | grav. | achado (resumo) | tratamento (commit `057f5e4`) |
|---|---|---|---|
| R2-1 | ⛔ | Coluna «Estado» cortada a 320–375 px no estado encerrado; nota «cabe em 343 px» falsa; medição do log só cobria o estado aberto | Tabela a **3 colunas** (#, Participante, Valor), sem rodapé, estado só em ícone com `aria-label`. **Medido:** 0 cortes a 320/360/375/768/1024, aberta e encerrada; cab 56 / th 48 / td 48 / largura 286·326·341·592·592 nas 3 instâncias |
| E-1 | ⚠️ | Tabela da OP sem endpoint de leitura de lances de edição Programada | Lacuna anotada para o 107b |
| E-2 | ⚠️ | Copy «se acertares / ACERTASTE» falsa: o backend premeia o **mais próximo** | Copy → «o palpite mais próximo ganha +2» · «MAIS PRÓXIMO» · «NÃO FOI DESSA VEZ» |
| E-3 | ⚠️ | Sidebar é só desktop → no mobile o utilizador deixa de ver as senhas on-chain | Anotação corrigida + lacuna para o 107b |
| D-1 | ⚠️ | MLC-C alargava a tabela a 718/912 px | Tabela a 640 px em baixo; medido 286/341/592/592 = às outras |
| B-1 | ⚠️ | Contraste não-textual: borda do campo 2,41, pontos 2,35, placeholder 4,21 | Borda `#6b7db8` (4,60 / 4,83), placeholder `#8fa0d8` (7,54), pontos removidos (R18-G) |
| G-1 | ⚠️ | Modal OP-C sem label, no fluxo, sem `aria-modal` | `label for`, `aria-labelledby`, `aria-modal`, sobreposto com véu |
| H-1 | ⚠️ | Carteira-C fora da ordem; OP B/C com 2 de 5 estados; OP-C sem cartão Quildo | Notas explícitas; cartão Quildo acrescentado |
| I-1 | ⚠️ | Scroll horizontal de 8 px a 375 px (tokens: 496) | Media query < 420 px + tabelas de tokens com scroll próprio + linhas de tipografia que quebram. **Medido com viewport mobile emulado de 375 px:** scrollWidth 375 nas 8 pranchas |
| ℹ️ | ℹ️ | PT-PT no ecrã; «Dar lance» activo em EM BREVE; 3 atalhos retirados sem decisão; comentário desactualizado | Copy dos «depois» em PT-BR (os «antes» mantêm o texto real); «Abre em breve» desactivado; 7 atalhos repostos; comentário corrigido |

**Erro meu durante as correcções (declarado):** a 1.ª correcção do I-1 (`width: min(375px, 100%)`) resolvia o 100% contra uma
coluna flex que encolhe → o telefone ficava com 265 px a «375». Apanhado pela auditoria seguinte e revertido para larguras
fixas + media query. E o script do D-1 inseriu a tabela **dentro** do vidro da edição — apanhado pela medição (tabela a 274 px)
e reescrito à mão.

**Medição final (executor, `057f5e4`):** 4 pranchas × 3 variantes × 320/375/768/1024 → toque < 48: **0** · fora de vidro: **0** ·
overflow da tela: **0** · cortes (h1–h3, td/th, .btn): **0** · tabela = último vidro e com a mesma largura nas pranchas MLC e
OP. «Antes»: Carteira 5/2 · Início 1/1 · MLC 5/1 · OP 4/3.

**2.ª ronda** (o mesmo validador, worktree NOVO `C:/Users/Moltbot/tmp-107afront-val2/wt` @ `057f5e4`, browser num contexto
isolado novo; 4 pranchas × 3 variantes × 320/360/375/768/1024 + viewport mobile real). **Veredicto: APROVADO · 0 bloqueantes.**
Verbatim em `_logs/UTAC107a-front_SEG6_VALIDADOR-R2.md`. Todas as correcções da 1.ª ronda confirmadas por medição própria
(tabela 284/324/339/590/590 nas 3 instâncias, 0 cortes; D-1 286/326/341/592/592 em MLC e OP; B-1 4,61/4,85/7,56; G-1; I-1);
**0 regressões** em 60 combinações; o `.carrossel` corresponde ao `Dashboard.jsx:465-481`.

| id | grav. | ressalva | tratamento |
|---|---|---|---|
| N-1 | ⚠️ | O `.slides` do MLC não seguia o MC99 (`overflow-y`, padding, gap) | **Corrigido** (commit final): `hidden`, 4 px, gap 12 → 16 px ≥ 700; medido 0/0 nas 3 variantes |
| N-2 | ⚠️ | O rótulo do valor só existe para leitores de ecrã; «Dar lance» activo com o slide EM BREVE visível | **Para o 107b** (decisão do operador): um rótulo visível acrescenta texto ao vidro que ele aprovou (R18-H); o botão inactivo é comportamento do componente real |
| N-3 | ⚠️ | O atalho «Converter Ficha» leva a uma Carteira sem botão de troca | **Para o 107b** (decisão do operador): retirar ou re-apontar; já anotado na prancha do Início |
| N-4 | ℹ️ | Ícones de estado sem `role="img"`; vencedor só pelo 🏆 | **Corrigido**: `role="img"` + `aria-label="vencedor"` |

*Correcções N-1/N-4 pós-veredicto da 2.ª ronda: medidas pelo executor, **não re-validadas** (sem 3.ª ronda — declarado).*

## §SEG7 — Registo e custo

### Registo em 3 lugares (R18)
1. `_logs/UTAC107a-front-mockups.md` (este) + `_logs/UTAC107a-front_SEG6_VALIDADOR.md` (1.ª ronda) + `_SEG6_VALIDADOR-R2.md` (2.ª).
2. `CLAUDE.md` — bloco R14 (apêndice no EOF; bytes de controlo intactos, verificado por contagem antes/depois).
3. `Desktop/RELATORIO-UTAC107a-front-MOCKUPS.txt`.

### Commits (foreground, ficheiros individuais — nunca `git add -A`)
`dff04c7` (mockups) → `057f5e4` (correcções da 1.ª ronda + R18-D..H) → commit de fecho (N-1/N-4 + registos).

### Para o 107b (handoff)
Lacunas: E-1 (endpoint de lances de edição Programada), E-3 (senhas on-chain invisíveis no mobile), Dashboard sem `usePontos`,
`/mercado` fixo na R-1 (ligar o slide visível ao lance), nº real de lances no apuramento do palpite (`ler-pontos`), confirmar que
o modal PIX mostra o e-mail antes de retirar a nota, N-2, N-3, «Trocar R$ 2 → 1 Senha» (caminho Via A). Propostas de token:
dourado único, texto navy sobre dourado (2,03 → 9,45), `--gut-touch 48`, rótulos ≥ 12 px, vidro único sem `backdrop-filter`.

### Custo
Claude Code não tem `state.db` neste ambiente: **custo em USD não medido**. Medido: validador 1.ª ronda **217 553 tokens**
(73 chamadas, 14,8 min); 2.ª ronda **252 906 tokens** (33 chamadas, 4,4 min) → **≈ 470 k tokens de subagente**. Os tokens da
sessão principal não são expostos à sessão. Duração: 23:22 → ≈ 00:30.
