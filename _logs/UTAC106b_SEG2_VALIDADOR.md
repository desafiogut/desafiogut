# VEREDICTO — Validação adversarial independente do UTAC106b (commit local `a1927ad`)

**Repo:** C:/Users/Moltbot/Desktop/DESAFIOGUT (branch `main`) · **HEAD validado:** `a1927ad` (commit LOCAL, não empurrado)
**Método:** validador adversarial independente — mutação + refutação, em worktree próprio (`scripts/worktree-helper.mjs criar … a1927ad`), sem tocar no repo principal.

---

## VEREDICTO: **PARCIAL** — 0 bloqueantes

As **7 alegações do enunciado (a)–g foram TODAS tentadas e NENHUMA foi refutada**. O commit cumpre cada um dos critérios que o enunciado manda atacar. O veredicto é **PARCIAL** — e não APROVADO — por **1 achado ⚠ não-bloqueante, FORA das 7 alíneas** (`rotasProibidas` do isolamento corporativo não estendida aos aliases novos) e por **5 notas ℹ**. Nada aqui bloqueia o commit; tudo é tratável em seguimento.

---

## Reproduzido por execução (comandos + saída real)

**(a),(e) Rotas antigas e `.bak-*`**
```
$ git diff --name-only 3a7695d..a1927ad
_logs/UTAC106b-navegacao.md
desafio-gut/frontend/src/App.jsx
desafio-gut/frontend/src/__tests__/mc991-rotas.test.mjs
desafio-gut/frontend/src/__tests__/utac106b-navegacao-frases.test.mjs
desafio-gut/frontend/src/pages/MercadoLances.jsx
desafio-gut/frontend/src/pages/OfertasProgramadas.jsx
desafio-gut/frontend/src/pages/__tests__/mc99-limpeza-ui.test.mjs
desafio-gut/frontend/src/widgets/layout/BottomNav.jsx
desafio-gut/frontend/src/widgets/layout/Sidebar.jsx
desafio-gut/frontend/src/widgets/layout/navModel.jsx
$ git diff --name-only 3a7695d..a1927ad | grep -i '\.bak'  →  NENHUM .bak NO DIFF
```
Os 5 `.bak-*` **existem e estão tracked, intactos**: `capacitor.config.ts.bak-20260725182152`, `src/App.jsx.bak-20260724145416`, `src/PrivyRoot.jsx.bak-20260724200959`, `src/PrivyRoot.jsx.bak-custom-scheme-20260725182152`, `src/PrivyRoot.jsx.bak-oauth`.

Rotas antigas registadas e vivas (App.jsx): `<Route index … DashboardOuCorporativo>` (`/`), `path="/carteira"`, `path="/mercado"`. **Só houve ADIÇÕES** (diff de App.jsx = 9 linhas, todas `+`): `/menor-lance-unico` (alias de `MercadoLances`) e `/ofertas-programadas`.

**(g) Trava EM_BREVE_MODE**
```
$ grep -n "EM_BREVE_MODE" src/lib/leilaoLock.js
10:export const EM_BREVE_MODE = true;      ← LIGADO
```

**(f) Suíte de navegação — harness oficial**
```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 703/703 pass
backend: VERDE 992/998 pass
VEREDITO: VERDE
```
Os 3 ficheiros-alvo, isolados: **26/26 pass, 0 fail** (`mc99-limpeza-ui` 20, `utac106b-navegacao-frases` 7, `mc991-rotas`).

**(b),(c),(d) Mutação em worktree próprio (prova de que os testes MORDEM)** — 9 mutações, restauradas e verificadas (`RESTORED: True`):
| # | Mutação | Resultado |
|---|---|---|
| M1 | frase passa a «… O menor lance único leva — é uma **aposta**!» | ✖ cai a asserção de álea ✔ morde |
| M2 | frase passa a «**aposte agora**» | ✖ caem 2 (invariante + Art.7); a asserção de álea **NÃO** cai (ver N1) |
| M3 | `EM_BREVE_MODE = false` | ✖ cai «EM_BREVE_MODE continua LIGADO» ✔ morde |
| M4 | trocar ordem dos 2 primeiros itens da Sidebar | ✖ cai «Sidebar em SINCRONIA» ✔ morde |
| M5 | remover `<Route path="/mercado">` | ✖ cai «rota antiga /mercado continua registada» ✔ morde |
| M6 | remover `/ofertas-programadas` | ✖ cai «tem rota e página própria» ✔ morde |
| M7b | neutralizar TODOS os usos de `EM_BREVE_MODE` na página | ✖ cai «página TRAVADA por EM_BREVE_MODE» ✔ morde |
| M8 | trocar ordem de `MAIN_TABS` | ✖ cai «barra inferior na ordem…» ✔ morde |
| M9 | renomear rótulo «Menor Lance Único»→«Lances» | ✖ cai «barra inferior na ordem…» ✔ morde |
*(M7 à 1.ª tentativa foi INCONCLUSIVA por mismatch de CRLF; refeita como M7b removendo os DOIS gates e o resultado morde. Declaro-o.)*

**Limpeza:** worktree removido; `git worktree list` já não o lista; dir residual `wt` (vazio) apagado; **repo principal intacto** (`git status` = 0 ficheiros tracked modificados; HEAD continua `a1927ad`). Nenhum processo node de background deixado (só corridas em foreground).

---

## Tabela de achados

| # | Gravidade | Achado | Tratamento proposto |
|---|---|---|---|
| A1 | ⚠ (não-bloqueante) | **`rotasProibidas` (AppContext.jsx:634-637) não foi estendida.** O conjunto é `{"/", "/carteira", "/mercado", "/vitrine", "/programacao", "/ativos", "/seja-nosso-parceiro"}` e é consultado por `rotasProibidas.has(location.pathname)` (match EXATO). As rotas novas `/menor-lance-unico` (alias do MESMO ecrã `MercadoLances` de `/mercado`, que É proibido) e `/ofertas-programadas` ficaram de fora ⇒ um utilizador **corporativo** que abra esses URL **já não é reencaminhado** para `/corporativo` — o isolamento do mundo comum ganha um caminho alternativo não coberto. Sem impacto de dados/segurança (as páginas não expõem dados privados do comum; `/ofertas` é placeholder) e **inalcançável por cliques** (a nav corporativa usa `CORP_TABS`/`CORPORATIVO_ITEMS`, que não incluem estas rotas) ⇒ só por URL direta/link antigo. Nenhum teste cobre a lista. | Acrescentar as 2 rotas a `rotasProibidas`; idealmente um teste que exija que a lista proibida do corporativo cubra TODA a `MAIN_TABS` comum. |
| N1 | ℹ | **Buraco na guarda de álea.** `PROIBIDOS = /\bapostas?\b/` não apanha formas verbais («aposte/apostar/apostou»). Medido (M2): a asserção *de álea* não cai com «aposte agora» (caem outras duas, logo o ficheiro fica vermelho — mas a guarda específica não morde). Mesmo buraco herdado de `glossario.test.mjs`. | Alargar a `apost\w*` (ou lista `aposta|aposte|apostar|apostou|apostas`) no teste novo E no glossário. |
| N2 | ℹ | **Divergência terminológica com o gate legal.** A frase diz «Quanto você **paga** por esse item?»; o `TermosConsentimento.jsx` Art. 7 fixa «QUANTO VOCÊ **OFERTA** POR…». «paga» sugere preço/pagamento — a MESMA família semântica que o próprio ficheiro usou para DESCARTAR a opção «compra» («sugere um preço de venda fixo que a modalidade não tem»). Não é álea/oferta enganosa (no menor-lance-único o vencedor paga o próprio lance), mas a âncora não é 1:1. O teste só exige partilhar «menor lance único». | Ponderar «Quanto você **oferta** por esse item?» para ancorar 1:1 ao Art. 7; se ficar «paga», aceitar a decisão de forma explícita. |
| N3 | ℹ | **A frase não é renderizada no build das lojas.** `MercadoLances` tem `early-return` em :270-271 (`MercadoSkeleton`/`MercadoConformidade`) ANTES do return principal que mostra a frase (:301). Com `isLeilaoAtivo=false` (loja/APK) a aba «Menor Lance Único» abre na vista de conformidade, sem frase. Nenhum teste mede isto. | Confirmar que é intencional e, se for, documentar/testar. |
| N4 | ℹ | **Ordem dos itens SECUNDÁRIOS diverge entre as navs.** BottomNav `SECONDARY_LINKS`: `…/seja-nosso-parceiro, /configuracoes`; Sidebar `NAV_ITEMS` (cauda): `…/configuracoes, /seja-nosso-parceiro`. Pré-existente e fora do âmbito das «4 principais» sincronizadas (o teste compara só as 4 primeiras). | Nota de dívida cosmética, se se quiser sincronia total. |
| N5 | ℹ | **Testes são proxy de TEXTO-FONTE**, não de renderização: provam que a rota/ordem/gate existem no código, não que o utilizador os vê. A composição (gate na página + `EM_BREVE_MODE=true` verificado à parte) garante o comportamento, mas não há teste de render. | Aceitável no padrão do repo; assinalar como limite. |

---

## Alegações REFUTADAS
**Nenhuma.** Nenhuma das 7 alíneas do enunciado se confirmou como violação:
- (a) **nova ordem não quebra links/rotas antigas** — `/`, `/carteira`, `/mercado` todas registadas; `/mercado` tem 12+ consumidores vivos (`Dashboard` ×3, `EdicaoCard`, `EdicaoDetalhe` ×2, `MinhaCarteira.irParaLanceRelampago`, `Vitrine`, `useAppContextEnvironment`, `BackgroundCanvas`, `AppContext`); a remoção de `/mercado` faz cair o teste (M5).
- (b) **Sidebar sincronizada** — 4 primeiras entradas com MESMA ordem e MESMOS rótulos (`/carteira` Carteira · `/menor-lance-unico` Menor Lance Único · `/` Início · `/ofertas-programadas` Ofertas Programadas); dessincronizar faz cair o teste (M4/M8/M9).
- (c) **Ofertas Programadas realmente travada** — página usa `EM_BREVE_MODE ? EM_BREVE_LABEL : …` (:46) e segundo gate (:53-55), importando a trava única de `leilaoLock.js`; `EM_BREVE_MODE = true`. Remover o gate faz cair o teste (M7b). A aba aparecer é INTENCIONAL por desenho (a trava é do CONTEÚDO) — critério cumprido.
- (d) **frase não sugere álea/aposta** — «Quanto você paga por esse item? O menor lance único leva!» não contém nenhum termo proibido (leilão/aposta/sorte/azar/loteria) nem `aleat*|chance|sorteio|previs`; injetar «aposta» faz cair o teste (M1). Coerente com o Art. 7 («O MENOR LANCE ÚNICO GANHA»).
- (e) **nenhum `.bak-*` editado** — provado acima.
- (f) **suíte verde** — frontend 703/703, backend 992/998, VEREDITO VERDE.
- (g) **EM_BREVE_MODE continua `true`** — provado acima.

## Alegações que NÃO consegui refutar
Todas as 7 de (a) a (g) **resistiram** à tentativa adversarial. Cada uma foi atacada por medição directa no repo e por mutação em worktree; nenhuma se refutou.

## O que NÃO medi
- **Layout real do dock** (4 abas + «Mais», `maxWidth 460px`, altura fixa 60px, rótulos agora a 2 linhas): só li o código (`dockLinkStyle` com `flex:1; minWidth:0` por item, `dockLabelStyle` com `whiteSpace:normal; wordBreak:break-word`) — **não há overflow/transbordo EVIDENTE no código, mas NÃO o vi a correr** (sem render de browser/screenshot).
- **Comportamento em runtime com `tipoUsuario=corporativo`**: o achado A1 é deduzido por leitura de `rotasProibidas.has(...)`, não exercido a correr.
- **6 testes backend não-passados (992/998)**: assumidos como baseline pré-existente (skips conhecidos), não investigados por não haver relação com este commit.
- **Contraste visual/cores** da frase de efeito e do ícone `ticket`.


---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: PARCIAL · 0 bloqueantes · 0 alegações REFUTADAS** (as 7 alíneas (a)-(g) do enunciado
foram atacadas e todas resistiram; o validador fez **9 mutações** em worktree próprio — todas mordem).
O veredicto é PARCIAL por **1 achado ⚠ fora das 7** e **5 notas ℹ**. Tratamento — aplicado **neste
UTAC** (correcções pós-veredicto **não re-validadas** — sem 2.ª ronda):

| # | Grav. | Achado | Tratamento |
|---|---|---|---|
| **A1** | ⚠ não-bloqueante | **`rotasProibidas` (isolamento corporativo, `AppContext.jsx:634-637`) não foi estendida** — `/menor-lance-unico` e `/ofertas-programadas` ficavam de fora ⇒ o lojista que abrisse esses URL **já não era reencaminhado** para `/corporativo` | **CORRIGIDO (a parte corrigível em escopo):** o alias `/menor-lance-unico` passou a **REDIRECT** (`<Navigate to="/mercado" replace />`) → o pathname efectivo é `/mercado`, que ESTÁ na lista ⇒ o buraco fechou-se sem tocar no `AppContext` (**proibido** neste UTAC). As 4 abas passaram a apontar para a rota **canónica** `/mercado`. **RESÍDUO DECLARADO:** `/ofertas-programadas` continua fora da lista ⇒ **exige 1 linha no `AppContext.jsx`** (adicionar a rota ao `Set`) — **fora do escopo autorizado** («Não altera AppContext»). Severidade baixa (placeholder sem dados; **inalcançável por cliques** — a nav corporativa usa `CORP_TABS`/`CORPORATIVO_ITEMS`). **Escalado ao operador** — ver §Pendências. Teste novo fixa o desenho do redirect. |
| **N1** | ℹ | **Buraco na guarda de álea:** `apostas?` não apanhava a forma verbal («aposte/apostar/apostou»); medido no M2 dele | **CORRIGIDO no teste novo** para `apost\w*` (e `sort\w*`), **com mutação própria que prova que morde**: «aposte agora» → **4 FAIL**, incluindo a asserção de álea. O mesmo buraco em `glossario.test.mjs` fica **declarado como pendência** (não é teste de navegação — fora da autorização de `*.test.mjs`). |
| **N2** | ℹ | **Terminologia:** a frase diz «Quanto você **paga**…» vs Art. 7 «QUANTO VOCÊ **OFERTA** POR…» — e «paga» é da mesma família semântica que usei para DESCARTAR a opção B | **ACEITE EXPLICITAMENTE + ESCALADO.** A frase **não foi alterada**: o enunciado fixou **3 opções** e manda *escolher 1* — inventar copy é decisão do operador (GATE 12). **Teste novo trava a copy** («tem de ser uma das 3 opções verbatim»). **Recomendação ao operador:** «Quanto você **oferta** por esse item? O menor lance único leva!» ancora 1:1 ao Art. 7. ⚠️ **Correcção do meu próprio argumento:** a razão que dei para descartar B («sugere preço de venda fixo») aplica-se em parte a «paga» — o validador tem razão; o descarte de B mantém-se por outra razão (o Regulamento não caracteriza o desfecho como compra). |
| **N3** | ℹ | A frase **não é renderizada na build das lojas** (`isLeilaoAtivo=false` → early-return para a vista de conformidade, antes do bloco da frase) | **DOCUMENTADO no código** (comentário junto ao bloco, declara que é intencional) + declarado aqui/relatório. Sem teste (nenhum render de plataforma existe no repo). |
| **N4** | ℹ | Ordem dos itens **secundários** diverge (BottomNav: `…parceiro, configuracoes`; Sidebar: `…configuracoes, parceiro`) | **DECLARADO como nota cosmética pré-existente** (fora do âmbito das «4 principais» sincronizadas). Candidato a dívida cosmética, não corrigido (não pedido). |
| **N5** | ℹ | Os testes são **proxy de texto-fonte**, não de render | **DECLARADO como limite** (padrão do repo; o validador também não fez render). O comportamento é garantido pela composição gate+`EM_BREVE_MODE=true` verificada à parte. |

## Erros dos meus PRÓPRIOS instrumentos (declarados)

1. **A rota nova do alias abria um caminho não coberto pelo isolamento corporativo** — eu tinha medido
   `useAppContextEnvironment.tabFromPath` mas **não** procurei outros consumidores da lista de rotas
   (`rotasProibidas` no `AppContext`) antes de escolher o desenho. Encontrei-o **em paralelo com o
   validador** (que o reportou como A1) — a correcção em escopo é o redirect.
2. **A guarda de álea que escrevi herdava o furo de `glossario.test.mjs`** (`apostas?` sem forma verbal):
   copiei o padrão em vez de o testar contra as variantes que um atacante escolheria. Só depois do
   veredicto o alarguei — e provei por mutação que morde.
3. **A justificação da opção A tinha uma inconsistência interna** (descartar B por «preço» e escolher uma
   frase que diz «paga») — corrigida na §SEG1 e na N2 acima; a *escolha* mantém-se (o texto era do
   operador).
4. **1.º run do meu script ad-hoc deu 1 FAIL falso** — contava `EM_BREVE_MODE =` também na **menção no
   comentário** de `leilaoLock.js` (contaminação por comentário). Corrigido com stripper; 18/18.

**Limpeza:** o worktree do validador e o meu (mutação) foram removidos com o helper A13; `node_modules`
reais intactos (**499 · 414**); `%TEMP%` limpo; repo principal intacto (`git status` tracked = 0).

Correcções pós-veredicto: **declaradas como «não re-validadas»**.

---

## §Pendências escaladas ao operador (não corrigidas — fora do escopo autorizado)

1. **`/ofertas-programadas` fora do `rotasProibidas`** (`AppContext.jsx`) — **1 linha** (juntar a rota ao
   `Set`) fecha o resíduo do A1 para essa rota. Exige autorização (o UTAC proíbe alterar o `AppContext`).
2. **Terminologia «paga» vs «OFERTA»** (N2) — decisão de copy/gate legal do operador. Alternativa pronta:
   «Quanto você **oferta** por esse item? O menor lance único leva!».
3. **Guarda do glossário** (`glossario.test.mjs`: `apostas?` → `apost\w*`) — buraco medido, num teste
   **fora** dos «testes de navegação afectados» que o UTAC autoriza alterar.
4. **Ordem dos itens secundários** divergente entre as duas navs (N4) — puramente cosmético.
