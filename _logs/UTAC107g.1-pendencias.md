# UTAC107g.1 — Pendências pequenas do 107g (copy pt-BR · comentários · dívida `?rc=1`)

**Tipo:** produto/higiene (frontend: copy + comentários; registo de dívida) · **Executor:** Claude Code (Opus 5.5)
**Data:** 2026-10-06 · **Arranque:** 17:29 · **HI5:** 30 min · **Skill:** `desafio-gut/frontend/skills/utac/`

---

## Baseline (SEG-1)

| Item | Medido |
|---|---|
| `HEAD` / `origin/main` | **`d1e150e`** / `d1e150e` (= esperado) |
| Sujidade (tracked) | 0 |
| Logs lidos | `_logs/UTAC107g-navegacao.md` (§Pendências 1, 2, 5) · `_logs/UTAC107g_SEG7_VALIDADOR.md` (ℹ️5, ℹ️6, ℹ️7) |

### Frases pt-PT (`grep -rn "Tens\|Não tens\|\btens\b" src/pages src/components`)

| Ficheiro:linha | Texto | Origem | Neste UTAC |
|---|---|---|---|
| `src/pages/MeusAtivos.jsx:258` | «Não tens senhas antigas.» | 107g | **corrige** |
| `src/pages/MeusAtivos.jsx:261` | «Tens N senha(s) antiga(s).» | 107g | **corrige** |
| `src/pages/MinhaCarteira.jsx:337` | «Tens N senhas antigas → ver em Meus Ativos» | 107g | **corrige** |
| `src/pages/OfertasProgramadas.jsx:310` | «Ainda não tens pontos. Compra o teu primeiro Passe na Carteira.» | **107e** (não 107g) | ⚠️ **fora do escopo** (ficheiro e UTAC diferentes) — registado |

Restantes frases da secção de senhas do 107g («Entre na sua conta para ver as senhas antigas.», «Verificando as senhas…»,
«Não foi possível ler as senhas agora.», «São usadas no Lance Programado do Menor Lance Único.», «ver em Meus Ativos»): **pt-BR** ✔.

### Comentários com a rota removida `/edicao/:id`

- `src/components/EdicaoCard.jsx:8` — «O banner (quadrado) é o elemento clicável → /edicao/:id (EdicaoBanner).» (**falso**: o banner abre um modal; o card navega para `/mercado`)
- `src/components/EdicaoBanner.jsx:6-7` — «…página /edicao/:id) … (navegava para /edicao/:id).» (descreve o passado — certo, mas não diz que a rota já não existe)

### Código que lê `?rc=1`

- `src/App.jsx:107,148` — `CorporativoRoute`: sem sessão, só deixa passar se `location.search` incluir `rc=1`.
- `src/pages/CorporativoDashboard.jsx:30-35` — limpa `?rc=1` da URL ao montar o painel.
- **Produtores:** 0 em `src/` e `netlify/functions/` (medido no 107g; o último, `SejaNossoParceiro`, foi substituído no MC99.1).
  ⇒ **ninguém o usa** → registar dívida, não apagar.

**Suíte (baseline):** frontend **VERDE 838/838** · backend **VERDE 1095/1101** (`mc966-suite-harness.mjs ambos`).
**Veredito SEG-1: SEGUIR** (as 3 frases têm o contexto esperado; `?rc=1` sem consumidor ⇒ dívida, sem PARAR).

---

## SEG0 — Copy (Frente A)

| Onde | Antes (pt-PT) | Depois (pt-BR) |
|---|---|---|
| `MeusAtivos.jsx` (estado `vazio`) | «Não tens senhas antigas.» | **«Você não tem senhas antigas.»** |
| `MeusAtivos.jsx` (estado `dados`) | «Tens N senhas antigas.» | **«Você tem N senhas antigas.»** |
| `MinhaCarteira.jsx` (indicador) | «Tens N senhas antigas → ver em Meus Ativos» | **«Você tem N senhas antigas → ver em Meus Ativos»** |

Restantes frases da secção: já pt-BR (sem alteração). ⚠️ **Fora do escopo, registado:** `OfertasProgramadas.jsx:310`
(«Ainda não tens pontos. Compra o teu primeiro Passe na Carteira.», UTAC107e) e o `ComprarPasseModal` («Vais comprar…»,
UTAC106e) também são pt-PT — outros ficheiros/UTACs, não autorizados aqui.

## SEG1 — Comentários (Frente B)

- `EdicaoCard.jsx:8` — dizia «banner clicável → /edicao/:id» (**falso**): passa a dizer que o banner abre um MODAL (MC47), que a
  página `/edicao/:id` foi removida no UTAC107g e que o único destino do card é o CTA → `/mercado`.
- `EdicaoBanner.jsx:5-9` — deixou de listar «a própria página /edicao/:id» como contexto de uso e passa a registar a remoção
  (URL antiga → catch-all → Início).
- Diff dos dois ficheiros: **só linhas de comentário** (verificado: nenhuma linha `+/-` fora de `//`). Menções restantes a
  `/edicao/:id` em `src/`: todas descrevem-na como **removida** (`App.jsx:85,526`, os dois comentários novos).
  ℹ️ `App.jsx:85` diz «modal desde o MC45» e o `EdicaoBanner` diz MC47 — imprecisão menor num ficheiro não autorizado.

## SEG2 — Dívida (Frente C)

Leitores: `App.jsx:107,148` (`CorporativoRoute`) e `CorporativoDashboard.jsx:30-35`. Produtores: **0** em `src/`,
`netlify/functions/`, `public/`, `index.html` (a única outra ocorrência é o bundle ANTIGO empacotado em
`android/app/src/main/assets/public/…/PrivyRoot-*.js`, que contém o mesmo código LEITOR). ⇒ **DEBT-021** acrescentada a
`_logs/DEBT.md` (severidade baixa, aberta). **Código NÃO apagado.**

## SEG3 — Testes + mutação

- `src/pages/__tests__/utac105c-meus-ativos.test.mjs`: frases esperadas → pt-BR + **guarda nova**: nenhum dos 5 estados da secção
  contém «tens» (`/\btens\b/i`).
- `src/__tests__/utac106c-carteira-render.test.mjs`: frases esperadas → pt-BR + **guarda nova**: o indicador começa por «Você tem»
  e não contém «tens».
- Suíte: frontend **840/840** (+2) · backend **1095/1101** → **VERDE**. `vite build` ✓ (13,89 s, para o scratchpad); os chunks
  `MinhaCarteira-*`/`MeusAtivos-*` contêm as frases pt-BR. `package-lock.json` não sujado.
- **Mutação 4/4** (script ad-hoc no scratchpad — `scripts/` não está no AUTORIZA): P1 «Não tens» → RED(2) · P2 «Tens <strong>» →
  RED(3) · P3 Carteira «Tens» → RED(4) · P4 frase com «tens» sem a forma exacta → RED(2); md5 restaurado idêntico nos 4.
- `.bak-*` ×5 md5 = baseline · `EM_BREVE_MODE = true`.

---

## SEG3b — Validador adversarial

Subagente independente, worktree `C:/Users/Moltbot/tmp-107g1-val/wt` @ `f7171f6` (helper A13; removido no fim — `node_modules`
498 intacto). 119 031 tokens, 31 chamadas, 345 s.

**VEREDICTO: APROVADO** (0 achados graves), com 2 notas ℹ️:
- (a) sem pt-PT nas superfícies do 107g · (b) só frases mudaram · (c) só comentários, sem afirmação falsa · (d) 0 produtores de
  `?rc=1` · (f) código de `?rc=1` intacto · (h) suíte 840/840 · 1095/1101 VERDE · (i) escopo: 8 ficheiros, todos autorizados ·
  (j) o log bate com o código. Não reproduziu o `vite build` nem o bundle Android (não versionado).
- **ℹ️1** — a DEBT-021 descrevia mal o alcance: a guarda `includes("rc=1")` da `CorporativoRoute` abre **8 rotas** do lojista a
  um anónimo (fica nas 7 que não limpam o parâmetro; em `/corporativo` só um relance) e é **substring** (`?src=1` também abre).
  → **corrigido** o texto da DEBT-021 (o código continua por apagar, como decidido).
- **ℹ️2** — a guarda de dialecto só procurava «tens»: A1 «Inicia sessão… tuas», A4 «Usas-as», A5 «A verificar as tuas», A6
  «tuas» sobreviviam (frases que hoje estão em pt-BR — limitação do teste, não defeito). → guarda **reforçada** com marcadores
  pt-PT (`tens|tu|teu(s)|tua(s)|usas|inicia|vê`, «a verificar/carregar», `-as`).
- ℹ️ menor: o comentário do `EdicaoBanner` não lista o `CardEdicaoEspecial` como contexto (pré-existente; não toca em rotas).

**Mutantes do validador re-corridos na árvore principal depois da correcção: 11/11 MORTOS** (A1-A7, B1-B4), md5 restaurado.
Suíte final **840/840 · 1095/1101 VERDE**. Correcções pós-veredicto não re-validadas por 2.ª ronda (provadas por mutação).
