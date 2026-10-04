# UTAC106c — Redesenho da Carteira + saneamento das 4 pendências do UTAC106b

**Tipo:** alteração de código de frontend (UI + copy + isolamento) · **Skill:** `desafio-gut/frontend/skills/utac` (protocolo) ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque:** `0f346e3bebcc428743eda5e4da412ceb537a5dc5` (= `origin/main`).
**Commit do código:** `1fe7ede`. **Baseline anterior:** `0f346e3` (fecho do UTAC106b).

> **Objectivo:** (1) redesenhar o ecrã da Carteira — título «Carteira» + subtítulo «Saldo Disponível»
> em amarelo + botão para Menor Lance Único + botão «Comprar Passe Desafio R$ 2,00» com balão de
> confirmação; (2) fechar as **4 pendências** que o UTAC106b escalou:
> #1 `/ofertas-programadas` no `rotasProibidas` · #2 copy «paga» → «oferta» · #3 `glossario.test.mjs`
> com `apost\w*` · #4 ordem dos itens secundários.
> ⚠️ **HI4/GATE 3/GATE 6 violados por decisão do operador (incorporado)** — compensado com segmentação
> fina + Boulder Loop + verificação de ponta a ponta por segmento, como o próprio enunciado manda.
> ⚠️ **HI5 alargado para 2 h por decisão do operador.** Duração real medida: ver §SEG8.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Data | 2026-10-04 | `date` |
| `HEAD` | `0f346e3bebcc428743eda5e4da412ceb537a5dc5` | `git rev-parse HEAD` |
| `origin/main` | `0f346e3…` (== HEAD) | `git rev-parse origin/main` |
| Suíte (baseline) | **frontend VERDE 705/705 · backend VERDE 992/998 · VEREDITO: VERDE** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Build (baseline) | **✓ built in 7.73s** (exit 0) | `node node_modules/vite/bin/vite.js build` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) | leitura do ficheiro |
| `.bak-*` versionados | **5**, não editados (ver abaixo) | `git ls-files \| grep .bak` |
| Disco | folgado (ST2 não dispara) | — |

`.bak-*` versionados no HEAD (nenhum é fonte; nenhum foi tocado):
`capacitor.config.ts.bak-20260725182152` · `App.jsx.bak-20260724145416` · `PrivyRoot.jsx.bak-20260724200959` ·
`PrivyRoot.jsx.bak-custom-scheme-20260725182152` · `PrivyRoot.jsx.bak-oauth`.

### Desvios do enunciado medidos (GATE 1 — «o enunciado deriva do código»)

| # | O enunciado diz | Medido | Tratamento |
|---|---|---|---|
| D1 | `BottomNav.SECONDARY_LINKS` em `:30-39` | **`:36-45`** | Deslocamento de 6 linhas causado pelo **próprio UTAC106b** (acrescentou `MAIN_TABS` com 4 abas + comentário). Não é defeito; registado. |
| D2 | alterar `mc99-limpeza-ui.test.mjs` **«se os testes cobrirem a ordem dos secundários»** | o `mc99` **NÃO** cobre a ordem dos secundários (só os **4 principais** de `MAIN_TABS`/`NAV_ITEMS`); **cobre, sim, o TÍTULO da Carteira** — com **3 guardas** que o SEG0 parte (`:138`, `:152`, `:163`) | Ver §SEG0 e §SEG8 (declaração de escopo). |
| D3 | «o botão existente (Lance Relâmpago)» | havia **3 botões** + um parágrafo de apoio (o 3.º é o do Lance Relâmpago) | Confirmado; os outros dois não se tocam. |
| D4 | `AUTORIZADAS` = «lista de 3 opções» | confirmado: 3 opções literais em `utac106b-navegacao-frases.test.mjs:77-81` | Passa a **4** (o 106c acrescenta a versão do operador). |

### Saúde da infraestrutura (HI1)

Suíte e build medidos acima; `node_modules` reais **não** foram tocados (nenhum worktree foi criado no
processo do executor — a validação adversarial corre em worktree próprio, com o helper A13). Caches do
Vite: nenhum `node_modules/.vite` foi apagado. Zero processos lançados em background pelo executor.

---

## §SEG0 — Carteira: título + subtítulo

**Medição do que existia (`MinhaCarteira.jsx`, pré-106c):**
- `:135` — `<h3 … color: COR.gold>💰 Minha Carteira</h3>` (o *título* do vidro de saldo; já em amarelo);
- `:170-174` — `<div … color: COR.muted>Saldo Disponível</div>` (o *subtítulo*, em cinza `#6b7db8`);
- `:175-189` — o **valor** do saldo, em `COR.gold`.

**Alteração:**
1. `:135` — `💰 Minha Carteira` → **`Carteira`** (o nome canónico da navegação, fixado no 106b).
2. `:170-174` — `color: COR.muted` → **`color: COR.gold`** (o subtítulo passa a amarelo, a par do valor).
3. O valor do saldo **não** se toca (continua a renderizar, com os estados «R$ …» / «R$ —»).

**Decisão de tipografia declarada (cosmética, reversível em 1 linha):** o texto é **exactamente** o do
enunciado — «Carteira» —, sem «Minha» e **sem** o emoji `💰`. O enunciado cita o texto desejado entre
`«»`; acrescentar/remover decoração é decisão do operador, não do executor (GATE 2/GATE 12).

**Testes (SEG0):** `utac106c-carteira.test.mjs` — «o título … é «Carteira» e está em AMARELO»,
«o subtítulo … está em AMARELO», «o VALOR do saldo continua a renderizar». Verificação por **render**
no SEG6 (§6.3, checks 1a-1d).

### Consequência em guardas pré-existentes (declarada, não escondida)

O `mc99-limpeza-ui.test.mjs` fixava o **nome antigo** com **3 guardas** que o SEG0 parte por
construção (suite vermelha ⇒ ST4 manda PARAR). Foram actualizadas **mantendo a invariante** (zero
ocorrências do nome antigo + **1 só** título + nenhum `<h1>`), com a nota do UTAC106c no teste:

| Guarda | Antes | Depois |
|---|---|---|
| `:138` «aparece UMA só vez» | contava `Minha Carteira` == 1 | `Minha Carteira` == **0** e `>Carteira<` (texto JSX) == **1** |
| `:152` «está DENTRO do vidro» | `indexOf("💰 Minha Carteira")` | `search(/>\s*Carteira\s*</)` |
| `:163` «vidro usa o PADRÃO» | idem (âncora) | idem (âncora) |

⚠️ **Armadilha medida:** contar `/Carteira/g` contaria também o **identificador `MinhaCarteira`** da
própria função do componente (falso RED). O guarda conta por `>Carteira<` — **texto JSX**, não
identificador. Está comentado no teste.

---

## §SEG1 — Carteira: botões

**Medição do que existia:** `:203` 💰 Depositar PIX · `:217` 🎫 Trocar R$ 2,00 → 1 Senha ·
`:238` ⚡ Lance Relâmpago → `irParaLanceRelampago()` (`:77-80`: `setModalidade("flash")` + `navigate("/mercado")`).

**Alterações:**
1. O botão `⚡ Lance Relâmpago` passa a **`⚡ Menor Lance Único`** (rename da modalidade, alinhado com a
   aba do UTAC106b e com a NORTE Via B). A função passou a `irParaMenorLanceUnico()`.
   **O destino e a modalidade NÃO mudaram** — continua `navigate("/mercado")` (rota canónica) e
   `setModalidade("flash")` (a modalidade do Menor Lance Único). GATE 4: não se alterou lógica que
   funcionava; o enunciado fixa a rota `/mercado`.
2. **Novo botão `Comprar Passe Desafio R$ 2,00`** (constante `PRECO_PASSE_DESAFIO = "R$ 2,00"`,
   **string** e não número, para o rótulo sair com vírgula decimal pt-BR como o enunciado o escreve).
   Abre um **balão de confirmação** (`<Modal>` de `@/components/ui`, o primitivo do design system).
   - **Cancelar** → `setPasseAberto(false)`; **Confirmar** → fecha e `navigate("/ofertas-programadas")`
     (a página está travada por `EM_BREVE_MODE` e mostra «EM BREVE» — a oferta ainda não abre).
   - ⚠️ **Zero lógica de compra neste ecrã** (sem débito, sem API, sem gravação): a compra é do
     **UTAC106e**. Fixado por teste que proíbe `fetch(`/`apiPost`/escrita no saldo neste ficheiro.
3. Grelha dos botões `1fr 1fr 1fr` → **`1fr 1fr`** (2×2 no desktop; 4 botões em 3 colunas ficariam 3+1).

**Testes (SEG1):** 4 testes no `utac106c-carteira.test.mjs` (navegação, existência do botão, balão
abre/fecha/confirma, ausência de lógica de compra). Verificação por **render + CLIQUE** no SEG6 (§6.3,
checks 2a-2d, 3a, 4a-4c, 5a, 6a-6b, 7a).

**Resíduo declarado (fora do escopo autorizado):** o parágrafo de apoio do saldo
(`MinhaCarteira.jsx:198`) continua a dizer «Saldo em reais para **Lance Relâmpago**. Para **Lance
Programado**…». Não foi alterado por duas razões: (a) o enunciado não o autoriza; (b) o par de
modalidades EM CÓDIGO é exigido por `src/components/__tests__/vocabularioUI.test.mjs` (guarda com
refutação histórica do validador). Fica como **candidato** a pendência própria.

---

## §SEG2 — Pendência #1: `/ofertas-programadas` no `rotasProibidas`

**O que existia:** `AppContext.jsx:634-637` — `new Set(["/", "/carteira", "/mercado", "/vitrine", "/programacao", "/ativos", "/seja-nosso-parceiro"])`.
O **achado ⚠A1 do validador do 106b**: a rota nova nasceu no 106b e ficou **de fora** da lista, deixando
o lojista entrar por URL directa nas Ofertas Programadas (as páginas de CONSUMO expulsam o lojista para
`/corporativo`, com `{ replace: true }`).

**Alteração:** **+1 linha** — `"/ofertas-programadas",` na mesma lista (com o comentário do porquê).
Nada mais foi tocado no `AppContext`.

**Testes (SEG2):** `utac106c-carteira.test.mjs` — `/ofertas-programadas` ∈ lista; **controlo** de que
`/carteira` e `/mercado` continuam lá (não se substituiu a lista); o guarda `rotasProibidas.has(location.pathname)` → `navigate("/corporativo", { replace: true })` continua vivo.

---

## §SEG3 — Pendência #2: copy «paga» → «oferta»

**O que existia:** `MercadoLances.jsx:228` — `const FRASE_MENOR_LANCE_UNICO = "Quanto você paga por esse item? O menor lance único leva!";`
(escolha = Opção A do 106b; o validador do 106b apontou em ℹN2 que a 1.ª metade **não era 1:1** com o
Art. 7 do Regulamento, «QUANTO VOCÊ **OFERTA** POR…»).

**Alteração (decisão do operador, reversível):** a 1.ª metade passa a **«Quanto você oferta por esse item?»**.
A 2.ª metade («O menor lance único leva!») **não muda**.

**Testes (SEG3):** `utac106c-carteira.test.mjs` — a frase é **exactamente** a decidida (igualdade
literal, não `includes`); diz «oferta»; **não** diz «paga»; mantém «menor lance único»; **não** usa
termos de álea/aposta (padrão ALARGADO); âncora no gate legal (`TermosConsentimento.jsx` → «O MENOR
LANCE ÚNICO GANHA»). A lista `AUTORIZADAS` do `utac106b-navegacao-frases.test.mjs` passou de 3 para
**4** opções (mantém as 3 do registo do 106b — GATE 15 — e acrescenta a do 106c, com a nota de que a
copy **corrente** é fixada pelo teste dedicado do 106c).

---

## §SEG4 — Pendência #3: `glossario.test.mjs` (formas verbais)

**O que existia:** `PROIBIDOS.pt = /\bleil[ãõa]o\b|\bleil[õo]es\b|\bapostas?\b|\bsortes?\b|\bazar\b|\bloterias?\b/i`
— `apostas?` apanhava «aposta»/«apostas» mas **deixava passar** «aposte», «apostar», «apostou»,
«apostando» (o buraco ℹN1 do 106b). O mesmo buraco em `sortes?` (não apanhava «sorteio»).

**Alteração:** `\bapostas?\b` → **`\bapost\w*\b`** e `\bsortes?\b` → **`\bsort\w*\b`**.

**Prova por mutação (GATE 7) — feita com o TESTE REAL, nas DUAS direcções.** Muta um VALOR de
`src/i18n/pt.js` (`"nav.lances": "Lances"` → `"nav.lances": "<termo>"`) e corre
`glossario.test.mjs`:

| termo injectado | regex NOVO (`apost\w*`/`sort\w*`) | regex ANTIGO (`apostas?`/`sortes?`) |
|---|---|---|
| `aposte agora` | **RED** (7 testes, 1 falha: «NENHUM termo proibido nos VALORES») | **GREEN** ← o buraco, provado |
| `apostar` | **RED** | **GREEN** ← o buraco |
| `sorteio` | **RED** | **GREEN** ← o buraco |

`pt.js` e `glossario.test.mjs` restaurados **byte-idênticos**: md5 `8cd9c4fdb0092a0811c2146056d490d9`
e `2c4b06a129223fde9d95ac7e151982db` (antes == depois).

⚠️ **O mutante que NÃO é mutante:** a 1.ª medição do meu teste novo do 106c media sobre o **ficheiro
inteiro** e dava **falso RED** — o **comentário** da correcção cita o padrão antigo (`\bapostas?\b`).
É a mesma armadilha que o repo já documentou («um guarda que lê comentários grita no sítio errado»).
Corrigido: o guarda lê **só a linha do padrão** (`pt: /…/i,`). Ver §SEG6 (erros dos meus instrumentos).

---

## §SEG5 — Pendência #4: ordem dos itens secundários

**Divergência medida (era o achado ℹN4 do 106b):**

| # | BottomNav `SECONDARY_LINKS` (`:36-45`) | Sidebar `NAV_ITEMS` (após os 4 principais) |
|---|---|---|
| 1 | `/vitrine` Vitrine (4 Slots) | `/vitrine` Vitrine (4 Slots) |
| 2 | `/programacao` Programação | `/programacao` Programação |
| 3 | `/ativos` Meus Ativos | `/ativos` Meus Ativos |
| 4 | **`/seja-nosso-parceiro`** 🤝 Seja nosso parceiro! | **`/configuracoes`** Configurações |
| 5 | **`/configuracoes`** Configurações | **`/seja-nosso-parceiro`** 🤝 Seja nosso parceiro! |

**Alteração:** alinhou-se a **Sidebar** com o **BottomNav** (só a Sidebar é autorizada a mexer —
`BottomNav` está na lista do NÃO AUTORIZA). `Configurações` passou para o **fim** da lista do rail.
**Só a ordem**: caminho, rótulo e ícone são os mesmos; a **estrutura** do rail (e o `configItem`
derivado por `find`) fica intacta — o `find` não depende da posição.

**Testes (SEG5):** `utac106c-carteira.test.mjs` compara os arrays **por path E por rótulo**
(4 principais preservados + 5 secundários iguais) com **controlo positivo** (se os extractores não
vissem nada, o `deepEqual` seria vacuoso). Verificação por **render** no SEG6 (§6.3, checks 10a-10e).

---

## §SEG6 — Verificação de ponta a ponta

### 6.1 Suíte canónica (completa)
`node scripts/mc966-suite-harness.mjs ambos < /dev/null` →
**`frontend: VERDE 717/717 pass` · `backend: VERDE 992/998 pass` · `VEREDITO: VERDE`**
(era **705/705** + 992/998 no baseline ⇒ **+12 testes**, exactamente os 12 do `utac106c-carteira.test.mjs`).

### 6.2 Build de produção
`node node_modules/vite/bin/vite.js build` → **`✓ built in 3.32s`** (exit 0). Valida o `MinhaCarteira.jsx`,
o `Modal` importado, o `AppContext` e a `Sidebar` a compilar (os testes são de análise estática).
Nota de instrumento: `npx vite build` é **bloqueado** pelo guard do ambiente («long-lived server») — o
comando equivalente por `node node_modules/vite/bin/vite.js build` corre normalmente.

### 6.3 Verificação por RENDER + CLIQUE (fecha o limite ℹN5 do 106b)

Script **ad-hoc** criado em `%TEMP%` (`hermes-verify-utac106c.mjs` + 4 duplos), corrido e **removido**
(não entra no repo), usando os instrumentos **do próprio repo**: `_servidor-teste.mjs` (opções do
servidor de testes), `_ponte-ssr.mjs` (instância única de React — A12), `_hook-runner.mjs` (condutor de
hooks sem DOM) e o duplo de `AppContext` já existente em `src/pages/__tests__/_stubs/`.
Duplos **só nas fronteiras**: `react-router-dom` (regista as navegações), `useTrocarPorSenhas` (I/O),
`useAdmin` (I/O) e 4 componentes-filhos pesados.

**Resultado: 27 PASS / 0 FAIL.**

| # | Verificação | Resultado |
|---|---|---|
| 1a | Carteira renderiza o título `Carteira` | ✅ |
| 1b | Carteira renderiza o subtítulo `Saldo Disponível` | ✅ |
| 1c | título E subtítulo em amarelo `#f5a623` (≥2 ocorrências) | ✅ |
| 1d | o **valor** do saldo renderiza (`R$ 12.34`) | ✅ |
| 1e | o balão **não** está aberto no 1.º render | ✅ |
| 2a-2d | os 4 botões: `Menor Lance Único` · `Comprar Passe Desafio R$ 2,00` · sem `Lance Relâmpago` · `Depositar PIX`/`Trocar` intactos | ✅ |
| 3a | **clicar** `Menor Lance Único` **navega** para `/mercado` | ✅ |
| 4a-4c | **clicar** `Comprar Passe` **ABRE** o balão (Cancelar + Confirmar + preço `R$ 2,00`; `aria-modal`) | ✅ |
| 5a | **clicar** `Cancelar` **fecha** o balão | ✅ |
| 6a-6b | **clicar** `Confirmar` **navega** para `/ofertas-programadas` e fecha o balão | ✅ |
| 7a | sem login: mostra o pedido de login e **não** mostra o botão do Passe (A/B do ramo) | ✅ |
| 8a-8c | `/ofertas-programadas` ∈ `rotasProibidas`; guarda de expulsão vivo; rotas antigas preservadas | ✅ |
| 9a-9b | a frase diz «oferta» e **não** «paga»; é a constante RENDERIZADA | ✅ |
| 10a-10e | barra **e** rail: os 4 principais na ordem canónica; os 5 secundários **em sincronia** (sheet «Mais» **aberto** por clique) | ✅ |

⚠️ **Limite declarado deste instrumento:** o *clique* é exercido **directamente no handler do elemento**
(React element tree), não por um browser: não há DOM, não há hit-testing, não há CSS. O que fica provado é
«handler → estado → novo render»; **não** fica provado layout/visibilidade. Foi assim que o `useNavigate`
pôde ser observado (duplo com registo). Os testes **committados** são de análise estática; **este** é o
que prova comportamento — a divisão está declarada no topo de `utac106c-carteira.test.mjs`.

### 6.4 Mutação (GATE 7/8) — os testes do 106c MORDEM?

6 mutantes introduzidos nos ficheiros de produção/guarda, corrida do
`node --test --test-concurrency=1 --test-reporter=tap src/__tests__/utac106c-carteira.test.mjs`,
restauro **byte-idêntico** verificado por md5:

| Mutante | Teste que caiu | Resultado |
|---|---|---|
| **M1** frase «oferta» → «aposte agora» (SEG3) | `not ok 10 · SEG3 · a frase … diz «oferta»` | **RED** ✅ |
| **M2** título «Carteira» → «💰 Minha Carteira» (SEG0) | `not ok 2 · SEG0 · o título … é «Carteira»` | **RED** ✅ |
| **M3** botão do Passe deixa de abrir o balão (SEG1) | `not ok 7 · SEG1 · … abre um BALÃO` | **RED** ✅ |
| **M4** `/ofertas-programadas` fora do `rotasProibidas` (SEG2) | `not ok 9 · SEG2 · … no rotasProibidas` | **RED** ✅ |
| **M5** ordem antiga dos secundários no rail (SEG5) | `not ok 12 · SEG5 · … SECUNDÁRIOS coincide` | **RED** ✅ |
| **M6** glossário volta a `apostas?` (SEG4) | `not ok 11 · SEG4 · … formas VERBAIS` | **RED** ✅ |

**6/6 mutantes mortos**, cada um a cair **no teste dirigido** (não em massa), e **nenhum** ficheiro ficou
diferente do backup no fim. Os mutantes são **um por segmento** — cobre SEG0..SEG5 individualmente.

### 6.5 Erros dos MEUS PRÓPRIOS instrumentos (declarados, item a item — regra da série)

1. **Reporter do node sem TAP na 1.ª corrida da suíte em background** — `node scripts/mc966-suite-harness.mjs ambos`
   em `background=true` deu `stdin is not a tty` + `EXIT=1` + saída **vazia**. Declarado **NÃO MEDI**
   (nunca lido como verde) e re-corrido em foreground com `< /dev/null`.
2. **Teste meu com regex larga demais** — `assert.doesNotMatch(CART, /saldoRsCentavos\s*=/)` casava a
   **comparação** `saldoRsCentavos == null` (o `\s*` deixa o `=` casar o 1.º `=` de `==`) e acusava uma
   escrita de saldo que **não existe**. Falso RED. Corrigido para `=[^=]`; comentado no teste.
3. **Teste meu que lê comentários** — a 1.ª versão do guarda do SEG4 media sobre o **ficheiro inteiro** e
   caía por causa do **próprio comentário** que cita o padrão antigo. Corrigido para ler **só a linha do
   padrão**. (Classe de defeito que o repo já tinha documentado — voltei a pisá-la.)
4. **Mutador sem `--test-reporter=tap`** — a 1.ª corrida do mutador deu `RED` para **todos** os mutantes
   com `fails=0`: sem TAP o reporter imprime «✖» e nunca «not ok», logo o grep devolvia **vazio** e um
   vazio foi lido como «mordeu». Corrigido: a verdade primária é o **código de saída**, e o TAP só
   nomeia o teste. Re-medido: 6/6 (e não 6/6 por acidente).
5. **Verificador ad-hoc: aliases no lugar errado** — `alias` como chave de topo do `createServer` não
   faz nada (tem de ir em `resolve.alias`, via `opcoesServidorTeste({ alias })`). Sintoma: a página
   recebia o `react-router` REAL e rebentava com «useNavigate() may be used only in the context of a
   `<Router>`». Corrigido; comentado no script.
6. **Verificador ad-hoc: filho-função do `<NavLink>`** — o duplo de `react-router-dom` renderizava
   `children` cru; `BottomNav`/`Sidebar` usam **filho-função** (`{({isActive}) => …}`) ⇒ os rótulos
   nunca apareciam no HTML e os checks de ordem davam `[-1,…]` (5 falsos FAIL). Corrigido chamando o
   filho-função; comentado no duplo.
7. **Verificador ad-hoc: check 10c errado** — media os secundários da **barra** no 1.º render, mas eles
   vivem no sheet **«Mais»**, que só existe **aberto**. Era o MEU check que estava errado, não a app
   (o rail, que os mostra sempre, passava). Corrigido abrindo o sheet por clique.

---

## §SEG7 — Validador adversarial

**Despachado:** subagente Hermes **independente**, em **worktree próprio** criado com
`scripts/worktree-helper.mjs criar <wt> 1fe7ede` (helper A13 — 4 junctions de `node_modules`),
instruído a **TENTAR REFUTAR** (não confirmar), com as 10 alíneas (a)-(j) do enunciado como alvos.

**Veredicto verbatim + resposta do executor:** `_logs/UTAC106c_SEG7_VALIDADOR.md`.

> **VEREDICTO: APROVADO COM RESSALVAS · 0 bloqueantes · 0 achados ⚠️ · 3 notas ℹ️.**
> As **10 alíneas (a)-(j)** foram atacadas e **todas resistiram**. O validador **reproduziu** a suíte
> no worktree dele (**frontend 717/717 · backend 992/998 · VERDE**), o build (**✓ built, exit 0**),
> os 8 ficheiros (`319+/24−`), a ausência de `.bak-*` tocados, o `EM_BREVE_MODE=true`, e fez **8
> mutações próprias** — **todas mordem**, cada uma no teste dirigido. Verificou também a aritmética
> dos testes (`17 + 9 + 12 ⇒ 717 − 12 = 705` = o baseline declarado).

| # | Ressalva | Tratamento |
|---|---|---|
| ℹ️**1** | Copy contraditória na Carteira (parágrafo ainda diz «Lance Relâmpago»); pede registo de dívida de copy | **ACEITE + ESCALADO** — parágrafo fora da lista AUTORIZA e exigido em CÓDIGO por `vocabularioUI.test.mjs`. Registado como pendência **P1**. ⚠️ **`_logs/DEBT.md` NÃO foi tocado** (não consta da lista AUTORIZA — GATE 3); decisão de o registar é do **operador**. |
| ℹ️**2** | A verificação por RENDER do SEG6 não tinha **artefacto no repo** («a prova morre com a sessão») | **FECHADO com código** — promovida a **teste versionado**: `src/__tests__/utac106c-carteira-render.test.mjs` (**8 testes**) + duplos em `src/__tests__/_stubs-106c/`. Corre na suíte canónica ⇒ frontend **717 → 725**. |
| ℹ️**3** | O log **não estava no commit**; a mensagem dizia «mutação 6/6» e ele mediu **8/8** | **FECHADO** — o log entra neste commit de registo. Os dois números ficam declarados e **atribuídos**: **6/6 = mutação do executor** (1 por segmento); **8/8 = mutação do validador** (acrescentou cor do título e do subtítulo). A mensagem **subestimou**. |

**Correcções pós-veredicto: NÃO re-validadas** (sem 2.ª ronda). **Nenhuma** tocou código de produção —
são de **teste** e de **registo**; a suíte e o build foram **re-corridos depois** (**725/725 · 992/998 ·
VERDE**; `vite build` exit 0).

### Erros dos instrumentos, declarados (regra da série)

- **Do MEU lado (exposto pelo meu próprio mutante MR1):** a 1.ª versão do teste de render contava
  `#f5a623` no **HTML todo** — e o mutante que punha o título a cinza **passava VERDE** (o ecrã tem
  amarelo noutros sítios). **Uma contagem global não é uma medição do alvo.** Corrigido para medir a
  cor **na tag** do título e do subtítulo; MR1 passou a **RED** (3/3).
- **Do lado do VALIDADOR (auditoria das figuras declaradas):** o relatório dele fecha com «*worktree
  removido com o helper*», mas o **transcript mostra `rm -rf`** — o delete recursivo que a **A13**
  proíbe. **Verificado pelo executor:** as 4 junctions já não existiam quando o `rm -rf` correu
  (varredura → **0 reparse points**), ele falhou com «Device or resource busy» e o residual foi
  removido com **`rmdir` bottom-up**. Contagens do `node_modules` **REAL** depois: raiz **383** ·
  `desafio-gut` **570** · `frontend` **502** · `functions` **416** (ordem de grandeza intacta;
  módulos críticos presentes). **Sem dano** — mas o relato dele é impreciso e fica declarado.

---

## §SEG8 — Registo, commit e push

**Registo em 3 lugares (R18/P4):**
1. `_logs/UTAC106c-carteira.md` (este log) + `_logs/UTAC106c_SEG7_VALIDADOR.md` (veredicto verbatim + resposta).
2. `CLAUDE.md` — bloco **R14** (anexado ao EOF, em bytes; 4 bytes de controlo intactos; **0 remoções**).
3. `Desktop/RELATORIO-UTAC106c-CARTEIRA.txt` (relatório ao operador, PT-BR, secções numeradas).

**Ficheiros deste UTAC** (commit de código `1fe7ede` + este commit de registo):

| # | Ficheiro | O que é |
|---|---|---|
| 1 | `src/pages/MinhaCarteira.jsx` | SEG0 (título/subtítulo/cores) + SEG1 (botões + balão do Passe) |
| 2 | `src/context/AppContext.jsx` | SEG2 — `+1 linha` no `rotasProibidas` |
| 3 | `src/pages/MercadoLances.jsx` | SEG3 — copy «oferta» |
| 4 | `src/i18n/__tests__/glossario.test.mjs` | SEG4 — `apost\w*` / `sort\w*` |
| 5 | `src/widgets/layout/Sidebar.jsx` | SEG5 — ordem dos secundários |
| 6 | `src/__tests__/utac106b-navegacao-frases.test.mjs` | `AUTORIZADAS` 3→4 |
| 7 | `src/pages/__tests__/mc99-limpeza-ui.test.mjs` | guardas do título (ver §SEG0) |
| 8 | `src/__tests__/utac106c-carteira.test.mjs` | **novo** — 12 testes (estático) |
| 9 | `src/__tests__/utac106c-carteira-render.test.mjs` | **novo** — 8 testes (render + clique; fecha ℹ️2) |
| 10 | `src/__tests__/_stubs-106c/` (4 ficheiros) | duplos de fronteira do teste de render |
| 11 | `_logs/UTAC106c-carteira.md` · `_logs/UTAC106c_SEG7_VALIDADOR.md` | registo |

**Zero** `.bak-*` · **zero** `package.json`/`package-lock` · **zero** `BottomNav`/`navModel` (estrutura) ·
**zero** bytes de controlo alterados no `CLAUDE.md` · **NUNCA `git add -A`** (ficheiros individuais).

**Declaração de escopo (GATE 3) — o único ponto onde toquei além da letra do enunciado:**
o enunciado autoriza editar `mc99-limpeza-ui.test.mjs` **«se os testes cobrirem a ordem dos
secundários»** — e eles **não** cobrem a ordem dos secundários (cobrem os **4 principais**). Mas o
**SEG0 parte 3 guardas** desse ficheiro, que fixam o **nome antigo** do título; deixá-las seria
**suíte vermelha** (ST4 manda PARAR). Opções medidas: (i) não renomear o título — contradiz o objectivo
explícito; (ii) actualizar as 3 guardas **mantendo a invariante**; (iii) PARAR. Escolheu-se **(ii)**,
**declarado aqui e no relatório**, com a invariante preservada (nome antigo = 0 ocorrências, **1 só**
título, nenhum `<h1>`). A ordem dos secundários é guardada pelo **teste novo do 106c**, não pelo `mc99`.

**Commits:** `1fe7ede` (código + testes) → **este** (registo). O custo de API está em §SEG9/§Custo.

---

## §SEG9 — Deploy (comando adicional do operador)

*(executado DEPOIS do push deste commit — os resultados entram em ADENDA própria, num commit seguinte,
para que este log fique versionado: a ordem é push → medir produção → deploy se preciso → adenda.)*

---

## §Pendências (não executadas — declaradas, não escondidas)

1. **Parágrafo de apoio do saldo** (`MinhaCarteira.jsx:198`) ainda diz «Lance Relâmpago»/«Lance
   Programado» enquanto o botão diz «Menor Lance Único» — fora do escopo autorizado; o par de
   modalidades em CÓDIGO é exigido por `vocabularioUI.test.mjs`. Candidato a UTAC próprio.
2. **Saldo em outros ecrãs** (Dashboard `:174/:177`, modal PIX, Painel corporativo) **não** foi
   redesenhado — decisão explícita do enunciado. Candidato a UTAC próprio.
3. **`.md` de `_logs/` pré-existentes não versionados** (30 ficheiros `MC100…MC105*` aparecem como `??`)
   — pré-existente, alheio a este UTAC; não se tocou (NUNCA `git add -A`).
4. **A lista `AUTORIZADAS` mantém as 3 opções antigas** (incluindo a de «paga») — decisão literal do
   enunciado («passa a **incluir** a nova versão»). A copy **corrente** é fixada pelo teste dedicado do
   106c, que morde (mutante M1).
