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
| 2 | `/mercado` (**canónica**; `/menor-lance-unico` = alias por **redirect**) | Menor Lance Único | 3.º, `/mercado`, «Lances» |
| 3 | `/` | Início | 1.º, «Início» |
| 4 | `/ofertas-programadas` | Ofertas Programadas | **não existia** |
| 5 | (botão) | Mais | igual |

> ⚠️ **Porque a aba aponta para `/mercado` (e não para o alias)** — decisão medida no fecho, depois do
> achado ⚠A1 do validador: `/mercado` é a rota **canónica** e a única que (a) mantém o `activeTab`
> derivado da rota (`useAppContextEnvironment.tabFromPath` → «lances») e (b) **está** na lista
> `rotasProibidas` do `AppContext` (isolamento corporativo). O alias `/menor-lance-unico` é um
> **`<Navigate to="/mercado" replace />`** — não um segundo render — para não abrir um caminho que o
> isolamento não cobre. Fixado por teste.

### Ficheiros e linhas (re-medidos no fecho, pós-correcções)
| Ficheiro | O que mudou | Linhas-chave |
|---|---|---|
| `src/widgets/layout/navModel.jsx` | **novo PATH `ticket`** (+ comentário de sincronia) | `ticket: (` → **:62** · comentário `:8-14` |
| `src/widgets/layout/BottomNav.jsx` | `MAIN_TABS` (nova ordem/rótulos/`IconTicket`) + `dockLabelStyle` com quebra de linha | `MAIN_TABS` → **:29** · `IconTicket` → `:15` |
| `src/widgets/layout/Sidebar.jsx` | `NAV_ITEMS` (mesma ordem/rótulos) + `IconTicket` | `NAV_ITEMS` → **:34** · `IconTicket` → `:18` |
| `src/App.jsx` | rotas: canónica `/mercado` (:459) · **alias por redirect** (:467) · `/ofertas-programadas` (:471) · `lazy` (:49) | ver coluna |
| `src/pages/OfertasProgramadas.jsx` | **novo** — placeholder travado por `EM_BREVE_MODE` | `:17` (import) · `:46`/`:53` (gate) |
| `src/pages/MercadoLances.jsx` | frase de efeito (constante + render + nota do limite nas lojas) | const **:228** · render **:301-306** |

**Diff total do UTAC:** 2 commits — `a1927ad` (feat, +416/−19) e `ba9443e` (correcções do validador,
**+50/−11**). **Zero** `.bak-*` tocados; **zero** alterações a saldo/lances/Passe/AppContext.

### Decisões tomadas (todas reversíveis pelo operador — decisões 1-5 do enunciado)
1. **Ordem** Carteira → Menor Lance Único → Início → Ofertas Programadas → Mais. ✅
2. **Rotas antigas mantidas**: `/`, `/carteira`, `/mercado` continuam registadas ⇒ **nenhum link
   quebra**; `/mercado` é a **rota canónica** da modalidade e `/menor-lance-unico` é o **alias por
   redirect** (ver a nota acima). ✅
3. **Ofertas Programadas bloqueada por `EM_BREVE_MODE`** — a trava é do **CONTEÚDO** (a página
   mostra «EM BREVE»), não da aba: a aba aparece na barra, a oferta é que ainda não abre. ✅
4. **BottomNav e Sidebar em sincronia** — mesma ordem, mesmos caminhos, **mesmos rótulos**. Isto
   **supersede** a divergência de rótulos que era intencional no desktop («Dashboard»/«Mercado de
   Lances»); os comentários do `navModel.jsx` e do `Sidebar.jsx` foram actualizados para o declarar. ✅
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
- **Suíte: frontend 705/705 · backend 992/998 (VERDE)** — era 694/694 + 992/998 (+11 testes).
- **Mutação (GATE 7/8 — prova de que os testes MORDEM), em worktree próprio criado/removido com o
  helper A13:** a frase do worktree foi trocada por «aposte agora» → **4 FAIL** (incl. a asserção de
  álea, **que o regex antigo deixava passar** — achado ℹN1 fechado); restaurado → 9/9, **byte-idêntico**.
  O validador independente fez **9 mutações** próprias (todas mordem) — tabela no veredicto.
- **`node_modules` reais intactos** no fim (frontend **499** · functions **414**); `%TEMP%` limpo.
- **Build de produção:** `npx vite build` → **✓ built** (exit 0) — valida que o `App.jsx`, o `lazy` da
  página nova e o redirect compilam (os testes de navegação são de análise estática e não o fariam).

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
com a justificação completa em comentário) renderizada no **topo da página** (**:301-306**), acima do
`GlassHeader`, em `COR.gold`. Coberta por teste (`utac106b-navegacao-frases.test.mjs`), incluindo uma
**trava de copy**: o teste exige que a frase seja **literalmente uma das 3 opções** do enunciado — o
executor não inventa texto.

> ⚠️ **Correcção do meu próprio argumento (achado ℹN2 do validador) — declarada.** A razão com que
> descartei a **opção B** («compra» *«sugere um preço de venda fixo que a modalidade não tem»*) aplica-se
> em parte à própria opção A, que diz «Quanto você **paga** por esse item?». O validador tem razão: a
> âncora ao Art. 7 («QUANTO VOCÊ **OFERTA** POR…») **não é 1:1**. **O descarte de B mantém-se** por outra
> razão (o Regulamento **não** caracteriza o desfecho como compra — usa «ganha»/«contemplado», Art. 13),
> mas o argumento «preço» era impreciso. **A frase NÃO foi alterada** (o enunciado fixou 3 opções e
> manda escolher 1 — inventar copy é decisão do operador, GATE 12); fica **escalado** com a alternativa
> pronta: «Quanto você **oferta** por esse item? O menor lance único leva!».

> ⚠️ **Limite declarado (achado ℹN3):** a frase vive no `return` **principal** de `MercadoLances`, depois
> dos early-returns de `recursosCarregando`/`!isLeilaoAtivo` ⇒ na **build das lojas** (APK) a aba abre na
> vista de conformidade e a frase **não** aparece. É **intencional** (não há copy de lances num ecrã que
> declara que as edições acontecem na versão Web) e ficou **documentado no código**.

> ⚠️ **Divergência declarada (não bloqueia):** a 1.ª metade da frase («Quanto você paga por esse item?»)
> **não é verbatim** a pergunta do Art. 7 («QUANTO VOCÊ OFERTA POR... este produto ou serviço?»). O
> enunciado fixava 3 opções e nenhuma é verbatim ⇒ escolheu-se a mais próxima e declarou-se a diferença.
> **Recomendação ao operador:** alinhar o Regulamento e a frase numa das duas direcções (não executado —
> é decisão de produto/gate legal, fora do escopo).
> **Não** foi tocado `CardLance.jsx` nem `ComingSoonHero.jsx` (autorizados): a frase é uma só, no
> topo da página — editar os outros seria mudança sem pedido (GATE 3/Ponytail).

---

## §SEG2 — Validador adversarial

**Despachado:** subagente Hermes independente, em **worktree próprio** (helper A13), instruído a
**TENTAR REFUTAR** (veredicto verbatim + resposta do executor em `_logs/UTAC106b_SEG2_VALIDADOR.md`).

> **VEREDICTO: PARCIAL · 0 bloqueantes · 0 alegações REFUTADAS.** As **7 alíneas (a)-(g)** do enunciado
> foram atacadas e **todas resistiram**; o validador fez **9 mutações** no worktree dele e **todas
> mordem** (frase→«aposta», «aposte agora», `EM_BREVE_MODE=false`, dessincronizar a Sidebar, remover
> `/mercado`, remover `/ofertas-programadas`, neutralizar o gate, trocar a ordem, renomear rótulo).
> É **PARCIAL** por **1 achado ⚠ não-bloqueante FORA das 7 alíneas** + **5 notas ℹ**.

| # | Grav. | Achado | Tratamento |
|---|---|---|---|
| **A1** | ⚠ | `rotasProibidas` (isolamento corporativo, `AppContext.jsx:634-637`) **não estendida** às rotas novas ⇒ o lojista que abrisse `/menor-lance-unico` ou `/ofertas-programadas` **deixava de ser reencaminhado** | **CORRIGIDO o que é corrigível em escopo:** `/menor-lance-unico` passou a **REDIRECT** para `/mercado` (que está na lista) e as 4 abas apontam para a rota **canónica** ⇒ buraco fechado **sem tocar no `AppContext`** (proibido). **RESÍDUO ESCALADO:** `/ofertas-programadas` continua fora da lista ⇒ precisa de **1 linha** no `AppContext` (fora do escopo). Teste novo fixa o desenho do redirect. |
| **N1** | ℹ | Guarda de álea não apanhava a **forma verbal** («aposte/apostar») | **CORRIGIDO** no teste novo (`apost\w*`, `sort\w*`) + **mutação própria**: «aposte agora» → **4 FAIL**. Buraco idêntico no `glossario.test.mjs` → **escalado** (teste fora da autorização). |
| **N2** | ℹ | «paga» vs Art. 7 «OFERTA» — mesma família semântica usada para descartar B | **ACEITE + ESCALADO**; copy **não** alterada (era do operador; trava de copy por teste). Correcção do **meu argumento** declarada na §SEG1. |
| **N3** | ℹ | A frase não renderiza na build das lojas (early-return de `!isLeilaoAtivo`) | **DOCUMENTADO no código** (comentário) + declarado. Intencional. |
| **N4** | ℹ | Ordem dos itens **secundários** diverge entre as navs | Declarado (cosmético, **pré-existente**, fora do âmbito das 4 principais). |
| **N5** | ℹ | Testes são proxy de texto-fonte, não de render | Declarado como limite (padrão do repo). |

**Correcções pós-veredicto: NÃO re-validadas** (sem 2.ª ronda).

---

## §Registos e custo (SEG3)

**Registo em 3 lugares (R18):**
1. `_logs/UTAC106b-navegacao.md` (este log) + `_logs/UTAC106b_SEG2_VALIDADOR.md` (veredicto + resposta).
2. `CLAUDE.md` — bloco **R14** resumido.
3. `Desktop/RELATORIO-UTAC106b-NAVEGACAO.txt` (relatório ao operador).

**Commits:** `a1927ad` (feat) → `ba9443e` (correcções do validador) → **este** (registo final).
**Código:** `+466/−30` em 10 ficheiros (7 alterados + 3 novos: `OfertasProgramadas.jsx`,
`utac106b-navegacao-frases.test.mjs`, este log). **Zero** `.bak-*`, **zero** AppContext, **zero**
package-lock/package.json.

**Pendências escaladas (fora do escopo autorizado):** (1) `/ofertas-programadas` no `rotasProibidas`
(1 linha no `AppContext`); (2) terminologia «paga» vs «OFERTA» (copy/gate legal); (3) `glossario.test.mjs`
com o buraco `apostas?`; (4) ordem dos itens secundários (cosmético).

**Custo de API (medido no fecho):**
- **Executor** (mesma sessão CLI da série — `20261004_104512_7dad39`; a plataforma **não** abre sessão por
  UTAC): leitura no fecho do 106a = US$ 0,1191; leitura agora = US$ 0,2468 ⇒ **106b ≈ US$ 0,128**
  (diferença — **estimativa**).
- **Validador adversarial** (sessão própria `20261004_125829_80b509`, `source=subagent`): 62 mensagens ·
  37 tool calls · **≈ US$ 0,0178**.
- **Total estimado do UTAC106b: ≈ US$ 0,146.**
- **Saldo real da API (medido):** arranque **US$ 7,11** → fecho **US$ 6,91** ⇒ **consumo real ≈ US$ 0,20**
  (inclui as delegações). As duas leituras vão separadas — *estimativa da base* vs *saldo real*.

---

## §Adenda — verificação por RENDER (fecha parcialmente o limite ℹN5)

O validador assinalou (ℹN5) que os testes do UTAC são **proxy de texto-fonte**, não de render. Fechou-se
esse limite com uma verificação **própria, ad-hoc e temporária** (script `hermes-verify-*` em `%TEMP%`,
corrido e **removido** — não entrou no repo), usando a **ponte SSR** do próprio repo
(`src/__tests__/_ponte-ssr.mjs` + `_servidor-teste.mjs`, `renderToStaticMarkup` + `MemoryRouter`):

| # | Verificação de RENDER | Resultado |
|---|---|---|
| 1 | `BottomNav` renderizado: os **5 itens** estão no DOM | ✅ |
| 2 | `BottomNav` renderizado: ordem **Carteira → Menor Lance Único → Início → Ofertas Programadas → Mais** (índices crescentes, medidos no texto do DOM) | ✅ |
| 3 | `OfertasProgramadas` renderizada com o gate **LIGADO** (estado embarcado): mostra «EM BREVE» + a linha do programa de fidelidade | ✅ |
| 4 | idem: **não** mostra o estado neutro «em preparação» | ✅ |
| 5 | `OfertasProgramadas` renderizada com o gate **DESLIGADO** (A/B: **mesmo componente**, só o duplo de `leilaoLock` muda): cai no estado neutro «em preparação» | ✅ |
| 6 | idem: **deixou** de dizer «EM BREVE» | ✅ |

⇒ O gate `EM_BREVE_MODE` é **real e bidireccional ao nível do render** (não apenas um `?` no texto), e a
ordem das abas **vê-se no DOM**. O aviso `useLayoutEffect` do `react-router` no `stderr` é o conhecido de
SSR (benigno; igual nos testes do repo). **7/7 PASS.**

**Verificação (resumo do UTAC):** suíte canónica **705/705 · 992/998 VERDE** · ad-hoc estático **19/19** ·
ad-hoc de render **7/7** · mutação «aposte agora» → **4 FAIL** · `vite build` OK (exit 0).
Nota de instrumento: o guard do ambiente não auto-detecta o comando canónico deste repo
(`node scripts/mc966-suite-harness.mjs ambos`), daí a verificação ad-hoc ter sido feita por script
temporário explícito.
