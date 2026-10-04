# UTAC106b — Reestruturação da navegação + frases de efeito

**Tipo:** alteração de código de frontend (navegação + copy) · **Skill:** `skills/utac` (protocolo) ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) · **HEAD de arranque:**
`3a7695defb195ff97b67a6412a29993dc5eed104` (= `origin/main`).

> **Objectivo:** reordenar/renomear as abas (BottomNav + Sidebar), manter as rotas antigas como
> aliases, criar a aba **Ofertas Programadas** (bloqueada por `EM_BREVE_MODE`) e aplicar a **frase de
> efeito** em «Menor Lance Único». Base: `_logs/UTAC106a-mapeamento.md`.
> ⚠️ **HI4/GATE 6 violados por decisão do operador (incorporado)** — compensado com segmentação fina
> (SEG0 estrutura → SEG1 frases) e paragem imediata se algo falhasse. Nada teve de parar.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Data | 2026-10-04 | `date` |
| `HEAD` | `3a7695defb195ff97b67a6412a29993dc5eed104` | `git rev-parse HEAD` |
| `origin/main` | `3a7695d…` (== HEAD) | `git rev-parse origin/main` |
| Suíte | **frontend VERDE 694/694 · backend VERDE 992/998** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) | leitura do ficheiro |
| `.bak-*` versionados | **5**, não editados (ver §1.8 do mapeamento) | `git ls-files \| grep .bak` |

Suíte **coincide** com o esperado do enunciado (694/694 + 992/998) ⇒ ambiente não alterado.

---

## §SEG0 — Estrutura da navegação

### Ordem nova (idêntica em BottomNav e Sidebar)
**Carteira → Menor Lance Único → Início → Ofertas Programadas → Mais** (4 tabs + botão «Mais»).

| # | `path` | `label` | Antes (MC99) |
|---|---|---|---|
| 1 | `/carteira` | Carteira | 2.º, «Carteira» |
| 2 | `/menor-lance-unico` | Menor Lance Único | 3.º, `/mercado`, «Lances» |
| 3 | `/` | Início | 1.º, «Início» |
| 4 | `/ofertas-programadas` | Ofertas Programadas | **não existia** |
| 5 | (botão) | Mais | igual |

### Ficheiros e linhas (medidos no fecho)
| Ficheiro | O que mudou | Linhas-chave |
|---|---|---|
| `src/widgets/layout/navModel.jsx` | **novo PATH `ticket`** (+ comentário de sincronia) | `ticket: (` → **:62** · comentário `:8-14` |
| `src/widgets/layout/BottomNav.jsx` | `MAIN_TABS` (nova ordem/rótulos/`IconTicket`) + `dockLabelStyle` com quebra de linha | `MAIN_TABS` → **:29** · `IconTicket` → `:15` · `dockLabelStyle` → `:336-341` |
| `src/widgets/layout/Sidebar.jsx` | `NAV_ITEMS` (mesma ordem/rótulos) + `IconTicket` | `NAV_ITEMS` → **:31** · `IconTicket` → `:18` |
| `src/App.jsx` | rotas novas + `lazy` da página | `lazy` → **:49** · `/menor-lance-unico` → **:463** · `/ofertas-programadas` → **:467** |
| `src/pages/OfertasProgramadas.jsx` | **novo** — placeholder travado por `EM_BREVE_MODE` | `:17` (import) · `:46`/`:53` (gate) |

**Diff:** `+116/−19` em 7 ficheiros alterados + 2 novos (`OfertasProgramadas.jsx`,
`utac106b-navegacao-frases.test.mjs`). **Zero** `.bak-*` tocados; **zero** alterações a
saldo/lances/Passe/AppContext.

### Decisões tomadas (todas reversíveis pelo operador — decisões 1-5 do enunciado)
1. **Ordem** Carteira → Menor Lance Único → Início → Ofertas Programadas → Mais. ✅
2. **Rotas antigas mantidas**: `/`, `/carteira`, `/mercado` continuam registadas ⇒ **nenhum link
   quebra** (`/menor-lance-unico` é **alias** do mesmo ecrã `MercadoLances`). ✅
3. **Ofertas Programadas bloqueada por `EM_BREVE_MODE`** — a trava é do **CONTEÚDO** (a página
   mostra «EM BREVE»), não da aba: a aba aparece na barra, a oferta é que ainda não abre. ✅
4. **BottomNav e Sidebar em sincronia** — mesma ordem, mesmos caminhos, **mesmos rótulos**. Isto
   **supersede** a divergência de rótulos que era intencional no desktop («Dashboard»/«Mercado de
   Lances»); o comentário do `navModel.jsx` foi actualizado para o declarar. ✅
5. **`EM_BREVE_MODE` fica ligado** (verificado por teste: `leilaoLock.js:10` = `true`). ✅

### Ajuste de apresentação (declarado)
Com **4 abas + «Mais»** e rótulos mais longos («Menor Lance Único», «Ofertas Programadas»), o
`dockLabelStyle` passou a permitir **2 linhas centradas** (`textAlign:center`, `lineHeight:1.05`,
`whiteSpace:normal`) e o contentor interno do `DockItem` ganhou `width:"100%"` — sem isto o texto
transbordava o item. **Não** se alterou o tamanho da fonte nem a altura do dock.

### Testes (SEG0)
- `src/pages/__tests__/mc99-limpeza-ui.test.mjs` (SEG1) — **actualizado**: passou a exigir a nova
  ordem **e** os 4 rótulos, **e** (novo) que **cada destino de `MAIN_TABS` exista como
  `<Route path=…>` no `App.jsx`** — fecha o blindspot do extractor de `mc991-rotas` (que não vê
  `<NavLink to={path}>`, destino por variável). Mais dois testes novos: **Sidebar em sincronia** e
  **`/mercado` continua registada (alias)**.
- `src/__tests__/mc991-rotas.test.mjs` — **actualizado**: `POR_CONFIG` ganhou `/menor-lance-unico` e
  `/ofertas-programadas`, com o comentário do porquê (chegam-se por variável) e a nota de que a
  cobertura passou a ser exigida pelos testes novos.
- `src/__tests__/utac106b-navegacao-frases.test.mjs` — **novo** (7 testes): rota+página de Ofertas,
  gate `EM_BREVE_MODE`, `EM_BREVE_MODE` ainda `true`, frase presente/renderizada, frase sem
  álea/aposta, frase consistente com o gate legal, ícone `ticket` usado nas duas navegações.
- **Suíte: frontend 703/703 · backend 992/998 (VERDE)** — era 694/694 + 992/998 (+9 testes).
- **Build de produção:** `npx vite build` → **✓ built in 13.33 s** (exit 0) — valida que o `App.jsx`
  e o `lazy` da página nova compilam (os testes de navegação são de análise estática e não o fariam).

---

## §SEG1 — Frases de efeito

### Medição das frases actuais (mapeamento §3.2, reconfirmada)
- «EM BREVE» — `ComingSoonHero.jsx:48`; «Menor lance único vence · Art. 8» — `:55`.
- «⚡ Relâmpago» / «🎫 Programado» — `ModeSelector.jsx:7-8`.
- Hints do `CardLance.jsx:416` (programado) / `:417` (flash) / `:436` (Art. 26).
- «QUANTO VOCÊ OFERTA POR...» **não** está na tela de lances — vive no gate legal
  (`TermosConsentimento.jsx:109`, Art. 7).

### Gate legal (fonte de conformidade, lida)
`TermosConsentimento.jsx` **Art. 7**: «O DesafioGUT funciona sempre através da pergunta:
*"QUANTO VOCÊ OFERTA POR... este produto ou serviço?"* — **O MENOR LANCE ÚNICO GANHA.**»
Glossário proibido (`glossario.test.mjs`): `leil[ãõ]o|leil[õo]es|apostas?|sortes?|azar|loterias?`.

### Escolha: **OPÇÃO A** — «Quanto você paga por esse item? O menor lance único leva!»

| Critério | A | B (compra) | C (se ninguém der igual) |
|---|---|---|---|
| Google Play — sem álea | ✅ | ✅ | ✅ |
| Google Play — sem aposta | ✅ | ✅ | ✅ |
| Invariante «menor lance único» | ✅ | ✅ | ✅ |
| Conformidade com o desfecho do Regulamento («GANHA») | ✅ «leva» ≈ «ganha» | ⚠️ «compra» — caracterização que o Regulamento **não** usa | ⚠️ «o item é seu» |
| Descreve a regra CORRECTAMENTE | ✅ | ✅ | ❌ **omite a condição «menor»** — um lance único mas não menor NÃO ganha (oferta enganosa, CDC 30/31) |
| **Veredicto** | **ESCOLHIDA** | descartada | **descartada (descreve mal)** |

**Justificação (medida, não opinada):**
1. **A** usa o **invariante que o próprio Regulamento fixa** («o menor lance único») e o verbo do
   desfecho em «leva» — sinónimo coloquial de **«ganha»**, o verbo que a regra que o utilizador
   aceitou usa.
2. **B** foi descartada por afirmar **«compra»**: o Regulamento caracteriza o desfecho como
   *ganho/contemplação* (Art. 13, «participante contemplado»), não como uma compra a preço de venda;
   e «compra» sugere um preço fixo que a modalidade não tem (o valor é o **lance do participante**).
3. **C** foi descartada por **descrever mal a regra**: afirmar «se ninguém der igual, o item é seu»
   deixa de fora a condição **menor** — é exactamente a classe de texto que o CDC 30/31 (oferta
   clara) pune e que contradiria os termos aceites.
4. **Google Play:** nenhum termo de álea/aposta em A; o que decide é **habilidade** (escolher o menor
   valor que fique **único**), preservando o «jogo de habilidade» da NORTE Via B.

**Onde foi aplicada:** `src/pages/MercadoLances.jsx` — constante `FRASE_MENOR_LANCE_UNICO` (**:228**,
com a justificação completa em comentário) renderizada no **topo da página** (**:293-301**), acima do
`GlassHeader`, em `COR.gold`. Coberta por teste (`utac106b-navegacao-frases.test.mjs`).

> ⚠️ **Divergência declarada (não bloqueia):** a 1.ª metade da frase («Quanto você paga por esse
> item?») **não é verbatim** a pergunta do Art. 7 («QUANTO VOCÊ OFERTA POR... este produto ou
> serviço?»). O enunciado fixava 3 opções e nenhuma é verbatim ⇒ escolheu-se a mais próxima e
> declarou-se a diferença. **Recomendação ao operador:** alinhar o Regulamento e a frase numa das
> duas direcções (não executado — é decisão de produto/gate legal, fora do escopo).
> **Não** foi tocado `CardLance.jsx` nem `ComingSoonHero.jsx` (autorizados): a frase é uma só, no
> topo da página — editar os outros seria mudança sem pedido (GATE 3/Ponytail).

---

## §Validador adversarial (SEG2)

_(a preencher — ver `_logs/UTAC106b_SEG2_VALIDADOR.md`)_

---

## §Registos e custo (SEG3)

_(a preencher no fecho)_
