# UTAC106a — Mapeamento do fluxo actual

**Tipo:** mapeamento puro (sem alteração de código) · **Skill:** `skills/utac` (protocolo) ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) · **HEAD:** `884eed9409829eecbce0e137665abc2640bfc453`.

> **Objectivo:** documento de base para o **UTAC106b** (reestruturação da navegação + frases de efeito) e o
> **UTAC106c** (redesenho da Carteira). Todas as referências são `ficheiro:linha` medidas no HEAD acima.
> **Zero** alteração de código de produção. A entrega é este documento.

> **Navegação alvo (do UTAC106b):** Carteira → Menor Lance Único → Início → Ofertas Programadas → Mais.
> **Navegação actual (medida):** Início → Carteira → Lances → Mais (4 itens: 3 tabs + botão «Mais»).

---

## §Baseline

| Item | Medido | Comando |
|---|---|---|
| Data | 2026-10-04 | `date` |
| `HEAD` | `884eed9409829eecbce0e137665abc2640bfc453` | `git rev-parse HEAD` |
| `origin/main` | `884eed9…` (== HEAD, 0/0) | `git rev-parse origin/main` |
| Último commit | `884eed9 docs(UTAC106x.6): registo final …` | `git log -1 --oneline` |
| Sujeira (tracked) | **0** | `git status --porcelain \| grep -v '^??'` |
| Suíte (HARD GATE 1 · HI1) | **frontend VERDE 694/694 · backend VERDE 992/998** — `VEREDITO: VERDE` | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |

Suíte **coincide** com o esperado do enunciado (694/694 + 992/998) ⇒ RESSALVA 6 satisfeita, ambiente não
alterado.

**Ficheiros candidatos listados no SEG-1 (antes da leitura):**

| Área | Candidatos encontrados |
|---|---|
| Navegação | `src/widgets/layout/BottomNav.jsx` · `src/widgets/layout/navModel.jsx` · `src/widgets/layout/Sidebar.jsx` · `src/widgets/layout/Layout.jsx` · `src/widgets/layout/AppLayout.jsx` · `src/lib/rotasTrabalho.js` |
| Carteira | `src/pages/MinhaCarteira.jsx` · `src/components/WalletCard.jsx` · `src/pages/CorporativoCarteira.jsx` |
| Lances | `src/pages/MercadoLances.jsx` · `src/components/CardLance.jsx` · `src/components/TabelaLances.jsx` · `src/components/LanceStatusBadge.jsx` · `src/components/meus-ativos/FeedbackLance.jsx` · `src/hooks/useLanceFeedback.js` · `src/components/glass/*` |
| AppContext | `src/context/AppContext.jsx` · `src/context/IdiomaContext.jsx` |
| i18n | `src/i18n/pt.js` · `src/context/IdiomaContext.jsx` |

---

## §Navegação

### 1.1 BottomNav (mobile)
- **Ficheiro/componente:** `src/widgets/layout/BottomNav.jsx` — `export default function BottomNav()` em
  **`BottomNav.jsx:49`**; export secundário `export { NAV_HEIGHT as BOTTOM_NAV_HEIGHT }` em `:381`.
- **Estrutura:** `<nav aria-label="Navegação principal">` (`:101-115`) com um `<NavLink>` por tab principal
  (`:116-131`) + `<button>` «Mais» (`:132-143`) que abre um *sheet* `<div role="dialog">` (`:158-310`).
- **Props:** o componente **não recebe props** — lê tudo do contexto via `useAppContext()` (`:53-61`:
  `isConnected, address, userLabel, abrirModal, desconectar, ready, authenticated, tipoUsuario`) e
  `useAdmin(address)` (`:62`). Usa `useNavigate()` (`:51`) e `useLocation()` (`:52`).
- **Estilo do dock:** `DOCK_HEIGHT=60`, `DOCK_MARGIN=14`, `NAV_HEIGHT=88` (`:44-46`).

### 1.2 Ordem actual das abas (nomes exactos)
**`MAIN_TABS`** — `BottomNav.jsx:24-28` (ordem de renderização = ordem do array):

| # | `path` | `label` (literal) | `end` | `ariaLabel` | ícone |
|---|---|---|---|---|---|
| 1 | `/` | **`Início`** | `true` | «Ir para Dashboard» | `NavIcon name="dashboard"` |
| 2 | `/carteira` | **`Carteira`** | `false` | «Ir para Minha Carteira» | `NavIcon name="wallet"` |
| 3 | `/mercado` | **`Lances`** | `false` | «Ir para Mercado de Lances» | `NavIcon name="target"` |
| 4 | (botão) | **`Mais`** | — | «Mais opções» | `NavIcon name="more"` |

> Comentário de origem em `BottomNav.jsx:21-23`: «MC99 — ordem: Início · Carteira · Lances · Mais (era
> Início · Lances · Carteira)». É **esta** a ordem que o UTAC106b vai reordenar.

**`SECONDARY_LINKS`** (itens do *sheet* «Mais») — `BottomNav.jsx:30-39`:
`/vitrine` «Vitrine (4 Slots)» · `/programacao` «Programação» · `/ativos` «Meus Ativos» ·
`/seja-nosso-parceiro` «🤝 Seja nosso parceiro!» · `/configuracoes` «Configurações» (+ `/admin` «⚙️ Admin»
se `isAdmin`, `:72-74`).

**`CORP_TABS`** (utilizador corporativo) — `BottomNav.jsx:66-70`: `/corporativo` «Painel» ·
`/corporativo/cotas` «Cotas» · `/corporativo/banners` «Banners» (subtabs em `:77-85`).

### 1.3 Sidebar (desktop) — a outra navegação
- **Ficheiro:** `src/widgets/layout/Sidebar.jsx` — `NAV_ITEMS` em **`Sidebar.jsx:25-39`**:
  `/` «Dashboard» · `/carteira` «Minha Carteira» · `/mercado` «Mercado de Lances» · `/vitrine` «Vitrine (4
  Slots)» · `/programacao` «Programação» · `/ativos` «Meus Ativos» · `/configuracoes` «Configurações» ·
  `/seja-nosso-parceiro` «🤝 Seja nosso parceiro!».
  `CORPORATIVO_ITEMS` `:43-48` · `ADMIN_ITEM` `:51` · `SEGURANCA_ITEM` `:55`.
- ⚠️ **Os rótulos divergem** entre mobile («Início»/«Carteira»/«Lances») e desktop («Dashboard»/«Minha
  Carteira»/«Mercado de Lances») — a divergência é intencional (ver `navModel.jsx:8-12`: «mobile usa rótulos
  curtos … Essa divergência é de superfície (apresentação), não duplicação»).
- **Ícones partilhados:** `src/widgets/layout/navModel.jsx` — `PATHS` (`:18-69`) + `NavIcon` (`:75-91`);
  fonte única dos SVG (MC39.22.1).

### 1.4 Sistema de navegação (react-router + montagem)
- **Router:** `BrowserRouter` — import em `src/main.jsx:9`, montagem em **`main.jsx:113-121`**.
- **Rotas:** `src/App.jsx` — `<Routes>` em **`App.jsx:437`**.
- **Rota-mãe do app (shell):** `<Route element={<AppLayout />}>` em **`App.jsx:455`**.
- **Shell de 3 camadas:** `src/widgets/layout/AppLayout.jsx:27` (`AppLayout`) → renderiza
  `src/widgets/layout/Layout.jsx` dentro de `.gut-surface` (`AppLayout.jsx:34-35`).
- **Layout:** `src/widgets/layout/Layout.jsx:44` — desktop mostra `<Sidebar />` (`Layout.jsx:84`, condição
  `!isMobile`); mobile mostra `<BottomNav />` (`Layout.jsx:112`, condição `mostrarNav`), reservando
  `paddingBottom: BOTTOM_NAV_HEIGHT` (`Layout.jsx:93-95`). `<Outlet/>` em `Layout.jsx:101`.
- **Navegação pelos dados:** tabs principais via **`<NavLink to=…>`** (`BottomNav.jsx:117`; Sidebar idem);
  itens do «Mais» via **`navigate(path)`** (`BottomNav.jsx:284`); botão «Sair» via `desconectar()` (`:304`).
- **Quem esconde a navegação:** `src/lib/rotasTrabalho.js` — `ehRotaDeTrabalho()` (`:26-29`, prefixos
  `/admin` e `/corporativo`) e `escondeNavegacaoConsumo()` (`:40-43`, só `/admin*`). **3 consumidores**
  (declarados no próprio `rotasTrabalho.js:12`): `Layout.jsx:63-65`, `AppLayout.jsx:29` e
  **`BackgroundCanvas.jsx:25` (import) / `:40` (uso)** — este último mede o 3.º uso (achado A2 do
  validador, acrescentado no fecho).

### 1.5 Rotas do AppLayout (ordem do ficheiro, `App.jsx`)
| Rota | Elemento | Linha |
|---|---|---|
| index `/` | `DashboardOuCorporativo` | `App.jsx:456` |
| `/carteira` | `MinhaCarteira` | `App.jsx:457` |
| `/mercado` | `MercadoLances` | `App.jsx:458` |
| `/vitrine` e `/vitrine/:slot` | `Vitrine` | `App.jsx:459-460` |
| `/produto/:id` | `DetalheProduto` | `App.jsx:462` |
| `/edicao/:id` | `EdicaoDetalhe` | `App.jsx:464` |
| `/programacao` | `ScheduleView` | `App.jsx:465` |
| `/ativos` | `MeusAtivos` | `App.jsx:466` |
| `/seguranca` | `Seguranca` (gated `CorporativoRoute`) | `App.jsx:469` |
| `/configuracoes` | `Configuracoes` | `App.jsx:470` |
| `/admin` (+ filhas) | `AdminLayout` (gated `AdminAuthProvider`) | `App.jsx:476-490` |
| `/seja-nosso-parceiro` | `SejaNossoParceiro` | `App.jsx:492` |
| `/corp` · `/corporativo/*` | `CorporativoDashboard` etc. (gated) | `App.jsx:494-503` |
Rotas públicas fora do `AppLayout`: `/excluir-conta` `:440` · `/privacidade` `:443` · `/cadastro` `:446` ·
`/login-email` `:447` · `/redirect` `:451`.

### 1.6 Nomes das abas — i18n ou literais?
**Literais** (`strings` no código), **não** chaves i18n: as `label` de `MAIN_TABS`/`SECONDARY_LINKS`
(`BottomNav.jsx:25-38`) e de `NAV_ITEMS` (`Sidebar.jsx:26-38`) são strings directas.
⚠️ Existem chaves i18n correspondentes em `src/i18n/pt.js:6-23` (`nav.inicio`, `nav.carteira`, `nav.lances`,
`nav.mais`, …) mas **nenhuma delas tem consumidor** (ver §i18n e a observação no fim do documento).

### 1.7 Outras navegações (fora do escopo «nav de consumo» do UTAC106b — declaradas)
- **Nav do painel ADM:** `src/components/admin/NavAdminPersistente.jsx` — **não** está no §Baseline de
  candidatos (achado A5 do validador); é renderizado em **`src/components/admin/AdminLayout.jsx:276`**
  (import `:36`). É a navegação do `/admin`, separada do BottomNav/Sidebar.
- **Breadcrumbs (`<nav>` de trilha):** `src/pages/DetalheProduto.jsx:135` e
  `src/pages/Vitrine.jsx:370` (esta com `aria-label="Trilha de navegação"`).
- **Fronteira declarada:** o UTAC106b mexe na navegação **de consumo** (BottomNav + Sidebar); a nav do
  admin, a do corporativo (`CORP_TABS`) e os breadcrumbs ficam **de fora** — ficam nomeados aqui para não
  serem confundidos.

### 1.8 Ficheiros DEPRECATED versionados — NÃO editar (achado A6 do validador)
`git ls-files` mostra **5** backups `.bak-*` **tracked** (presentes no HEAD):
`desafio-gut/frontend/src/App.jsx.bak-20260724145416` · `src/PrivyRoot.jsx.bak-20260724200959` ·
`src/PrivyRoot.jsx.bak-custom-scheme-20260725182152` · `src/PrivyRoot.jsx.bak-oauth` ·
`capacitor.config.ts.bak-20260725182152`.
⚠️ O **`App.jsx.bak-*`** contém uma **tabela de rotas ANTIGA/divergente** (ex.: `/carteira` e `/mercado`
**sem** o wrapper `AppLayout`). **O UTAC106b/106c NÃO devem editar estas cópias** — a fonte é
`src/App.jsx`. Ficam declarados para evitar editar o ficheiro errado.

---

## §Carteira

### 2.1 Ecrã da Carteira
- **Ficheiro/componente:** `src/pages/MinhaCarteira.jsx` — `export default function MinhaCarteira()` em
  **`MinhaCarteira.jsx:31`**. Rota `/carteira` em `App.jsx:457`.
- **Constante de preço:** `VALOR_POR_SENHA_BRL = 2` em `MinhaCarteira.jsx:12`.
- (Variante **lojista**: `src/pages/CorporativoCarteira.jsx`, rota `/corporativo/carteira` `App.jsx:502`.)

### 2.2 Título / etiqueta «Saldo Disponível»
- **Localização:** `src/pages/MinhaCarteira.jsx:174` — `<div …>Saldo Disponível</div>`.
- **Estilo (inline — NÃO há classe CSS):** `fontSize: "0.62rem"`, `color: COR.muted` (**`#6b7db8`**),
  `fontWeight: 700`, `textTransform: "uppercase"`, `letterSpacing: "0.06em"` (`MinhaCarteira.jsx:170-174`).
  `COR.muted` definido em `MinhaCarteira.jsx:16`.
- **Valor logo abaixo:** `MinhaCarteira.jsx:175-189` — `fontSize: isMobile ? "2.4rem" : "3rem"`,
  `fontWeight: 900`, `color: COR.gold` (**`#f5a623`**); classe condicional **`gut-valor-pendente`** quando
  `saldoRsStatus === "stale"` (`:176`). Formatação `R$ …`/`R$ —` em `:183-185`.
- **Cartão contentor:** `<GlassCard>` em `MinhaCarteira.jsx:130` (classe `.gut-glass-standard` do design
  system; sem `background`/`borderColor` inline — nota em `:124-129`).
- **Título do próprio cartão:** «💰 Minha Carteira» em `MinhaCarteira.jsx:135` (`color: COR.gold`).
- ⚠️ **Não confundir:** «Saldo disponível» (minúsculas) também existe em `src/components/WalletCard.jsx:118`
  — mas esse é o cartão **Vale-Crédito**, usado só em `CorporativoCarteira.jsx:307`.

### 2.3 Botões da Carteira (grille de 3, `MinhaCarteira.jsx:198-255`)
| Botão | Linha | Handler | Destino |
|---|---|---|---|
| **💰 Depositar PIX** | `:203-216` | `onClick={() => setComprarAberto(true)}` (`:204`) | abre `<ComprarFichasModal>` (`:320-329`) |
| **🎫 Trocar R$ 2,00 → 1 Senha** | `:217-237` | `await trocarPorSenhas(1)` (`:219`) | hook `useTrocarPorSenhas` (`:6`, `:55-60`); se 202, `setCreditoTxHash` (`:221`) |
| **⚡ Lance Relâmpago** | `:238-254` | `irParaLanceRelampago()` (`:239`) | `setModalidade?.("flash")` + `navigate("/mercado")` — `MinhaCarteira.jsx:77-80` |

Desactivado quando `saldoReais < 2` ou `null` (`:223`, `:240`). Nota PIX + e-mail em `:263-268`.
`ComprarFichasModal` (`:7`, `:320`), `CreditoStatus` (`:8`, `:276`), `PainelIndicacao` (`:9`, `:291`).

### 2.4 Componente/fonte de saldo
- **Fonte primária:** `AppContext` — destructure em `MinhaCarteira.jsx:39-45`:
  `saldoRsCentavos, saldoRsStatus, refetchSaldoRs` (saldo em **R$/off-chain**) e `refetchSaldo` (saldo de
  senhas on-chain). Derivado: `saldoReais = saldoRsCentavos / 100` (`:75`).
- **Onde nasce o valor:** `src/context/AppContext.jsx:339` (`saldoRsCentavos`) e `:333` (`saldoSenhas`);
  comentário de origem do blob em `MinhaCarteira.jsx:121-123` («Fonte: blob `saldo-rs:${address}`»).
- **Auto-refresh:** ~30 s (comentário `MinhaCarteira.jsx:150-151`; botão manual «↻» em `:153-165`).
- **Outro componente de saldo:** `src/components/WalletCard.jsx:42` (`WalletCard`) — lê
  `apiGet("wallet?endereco=…")` (`WalletCard.jsx:53`); usado só no painel corporativo
  (`CorporativoCarteira.jsx:307`).
- ⚠️ **Outras superfícies onde o saldo aparece** (achado A4 do validador — **directamente relevante ao
  UTAC106c**, que redesenha a Carteira: o saldo aparece em **mais de um ecrã**):
  - **Dashboard:** `src/pages/Dashboard.jsx:174` (card «Senhas», `to:"/carteira"`) e `:177` (card «Saldo
    (R$)», `to:"/carteira"`), com `pendente` quando o estado é `"stale"`.
  - **Painel corporativo:** `src/pages/CorporativoDashboard.jsx:350` (card «Saldo wallet»,
    `to:"/corporativo/carteira"`).
  - **Modal de depósito PIX:** `src/components/ComprarFichasModal.jsx:308` («Saldo R$ disponível…») e
    `:517-533` («Saldo Antes» / «Saldo Depois» = pré-visualização da compra).

---

## §Lances

### 3.1 Ecrã de lances
- **Ficheiro/componente:** `src/pages/MercadoLances.jsx` — `export default function MercadoLances()` em
  **`MercadoLances.jsx:212`** (rota `/mercado`, `App.jsx:458`; também em `/corporativo/mercado`
  `App.jsx:503`).
- **Gates internos:** `recursosCarregando` → `<MercadoSkeleton>` (`:252`); `!isLeilaoAtivo` →
  `<MercadoConformidade>` (`:253`, componente em `:372`).
- **Composição:** `<GlassHeader>` (`:278-289`) · `<CardLance>` (`:307-317`) ·
  `<LanceStatusBadge>` (`:319-323`) · `<TabelaLances>` (`:327`) · `<OverlayVencedor>` quando
  `showOverlay` (`:259-270`) · `<CountdownOverlay>` quando `showCountdown` (`:257`).

### 3.2 Frases de efeito actuais
| Texto (verbatim) | Localização |
|---|---|
| **«EM BREVE»** (herói principal, `h2`, Orbitron, `COR.primary`) | `src/components/glass/ComingSoonHero.jsx:48` |
| **«Menor lance único vence · Art. 8»** | `src/components/glass/ComingSoonHero.jsx:55` |
| «Edição {edicao \|\| "R-1"}» (selo) | `src/components/glass/ComingSoonHero.jsx:37` |
| **«⚡ Relâmpago»** / **«🎫 Programado»** (selector de modo) + «Modo:» | `src/components/glass/ModeSelector.jsx:7-8`, `:14` |
| «DesafioGUT Flash · 30 min · debita saldo R$ · menor lance único vence (Art. 8).» | `src/components/CardLance.jsx:417` |
| «Lance programado consome 1 senha (Art. 20: R$ 2,00) — sem senha, o app converte R$ 2,00 do saldo automaticamente.» | `src/components/CardLance.jsx:416` |
| «Art. 26: Mín R$ 0,01 · Máx 5 lances/min · Cooldown 3s» | `src/components/CardLance.jsx:436` |
| «⚡ Aceito o DesafioGUT» / «⏳ Aguarde…» | `src/components/CardLance.jsx:396` |
| «Carteira Vencedora» (overlay) | `src/pages/MercadoLances.jsx:149` |
| «As suas participações» (overlay) | `src/pages/MercadoLances.jsx:170` |
| «Edições na versão Web» (vista de conformidade) | `src/pages/MercadoLances.jsx:389` |
| «DesafioGUT — Grupo União e Trabalho · CNPJ 23.040.066/0001-00» | `src/components/glass/AuctionStatusBar.jsx:12` |
| «QUANTO VOCÊ OFERTA POR... este produto ou serviço?» ⚠️ **(não está na tela de lances)** — vive no gate legal | `src/components/TermosConsentimento.jsx:109` |

> ⚠️ A «pergunta do torneio» **«QUANTO VOCÊ OFERTA POR…»** foi **removida da tela de lances** (o banner que
> a mostrava saiu no MC99 — comentário `MercadoLances.jsx:291-296`); o texto sobrevive no
> `TermosConsentimento.jsx:109`. Registado para o UTAC106b não o procurar onde já não está.

### 3.3 Componentes de lance
| Componente | Ficheiro:linha | Props / uso |
|---|---|---|
| `CardLance` | `src/components/CardLance.jsx` (formulário de lance; usa `estilos.*` e handlers de `darLance`) | props: `idEdicao, onLanceSucesso, address, isConnected, onConnect, onDisconnect, encerrado, modalidade, ready` — `MercadoLances.jsx:307-317` |
| `TabelaLances` | `src/components/TabelaLances.jsx` | `lances, idEdicao, prazoTimestamp, encerrado` — `MercadoLances.jsx:327` |
| `LanceStatusBadge` | `src/components/LanceStatusBadge.jsx:3` | `valor, status, mudou` — `MercadoLances.jsx:319-323`; também `DetalheProduto.jsx:229` |
| `FeedbackLance` | `src/components/meus-ativos/FeedbackLance.jsx:37` | usado em `MeusAtivos.jsx:192` |
| `GlassHeader` | `src/components/glass/GlassHeader.jsx:12` (def) — compõe os filhos em `:41-57` | `AuthArea :41` · `ComingSoonHero :49` · `ModeSelector :50` · `AuctionStatusBar :54` |
| `ComingSoonHero` / `ModeSelector` / `AuctionStatusBar` / `AuthArea` | `src/components/glass/` (`glassTokens.js` = `COR`) | herói, selector, rodapé fino, área de auth |
| `OverlayVencedor` / `CountdownOverlay` / `MercadoConformidade` / `MercadoSkeleton` | `src/pages/MercadoLances.jsx` (`:71`, `:25`, `:372`, `:423`) | locais ao ficheiro |

### 3.4 Lógica de lance (frontend)
- **Hook de feedback em tempo real:** `src/hooks/useLanceFeedback.js:4` — `useLanceFeedback(edicaoId,
  meuValor)`; faz `apiGet` (`:20`) e **`setInterval(verificar, 5000)`** (`:38`). Consumido em
  `MercadoLances.jsx:239-242`.
- **Estado de lance no ecrã:** `meuUltimoLance` (`MercadoLances.jsx:238`) + `onLanceSucessoWrapper`
  (`:244-247`) que chama `handleLanceSucesso` do contexto.
- **Handler de submissão:** dentro de `CardLance.jsx` — caminho **relâmpago** (POST `lance-relampago` +
  pipeline de fases; mensagens de erro em `CardLance.jsx:224-232`) e caminho **programado**
  (`CardLance.jsx:252-281`). Construção on-chain via `privyWallet` (import de Privy).
- **Estado no contexto:** `modalidade/setModalidade` (`AppContext.jsx:180`), `lances` (`:189`),
  `lancesFlash` (`:190`), `encerrado` (`:208`), `showOverlay` (`:209`), `vencedor`, `handleLanceSucesso`,
  `handleNovaRodada`, `fecharOverlay` — expostos em `AppContext.jsx:1454` e consumidos em
  `MercadoLances.jsx:214-225`.
- **Gate de plataforma:** `useRecursosApp()` (`MercadoLances.jsx:235`) → `isLeilaoAtivo` decide se os
  componentes de lance são montados.

---

## §AppContext

### 4.1 Localização
- **Ficheiro:** `src/context/AppContext.jsx` (**1497 linhas**).
  - `const AppContext = createContext(null)` — **`AppContext.jsx:145`**.
  - `export function AppProvider({ children })` — **`AppContext.jsx:178`**.
  - `<AppContext.Provider value={value}>` — **`AppContext.jsx:1454`** (o objecto `value` é construído
    imediatamente antes, ~`:1400-1454`).
  - Hook consumidor: `useAppContext()` (usado por `BottomNav.jsx:4`, `MinhaCarteira.jsx:3`,
    `MercadoLances.jsx`, `WalletCard.jsx:13`, …).
- **Montagem:** `<AppProvider toastApi={{ add, remove }}>` em `App.jsx:425` (dentro de `IdiomaProvider`
  `App.jsx:424`).

### 4.2 O que gere (medido por medição das declarações de estado e do objecto exposto)
- **Modalidade e edição:** `modalidade` (`:180`), prazos `prazoFlash` (`:195`) e `prazoProgramado`
  (`:198`), `prazoTimestamp`, `encerrado` (`:208`), edições via `useEdicoes` (`:22`).
- **Lance/overlay:** `lances` (`:189`), `lancesFlash` (`:190`), `showOverlay` (`:209`), `lightningActive`
  (`:212`), `showCountdown` (`:213`), `vencedor`, `handleLanceSucesso`, `handleNovaRodada`, `fecharOverlay`.
- **Saldo:** `saldoSenhas`/`saldoSenhasStatus` (`:333-334`), `saldoRsCentavos`/`saldoRsStatus` (`:339-340`),
  `refetchSaldo`, `refetchSaldoRs`; cache inicial `lerSaldoCache` (`:249`).
- **Conta/autenticação:** `address, privyWallet, isConnected, userLabel, ready, authenticated, user`
  (Privy), `authToken` (`:432`), `obterAuthToken`, `abrirModal`, `desconectar`.
- **Tipo de utilizador / corporativo:** `tipoUsuario`, `tipoCarregando` (`:355`), `cotaCorporativa`
  (`:354`), `corporativoWallet`, `addressCorporativo`, `cotaAtiva`, `adminProvavel` (`:266`),
  `lojistaProvavel` (`:279`).
- **Notificações:** `notificacoes` (`:347`), `notificacoesNaoLidas` (`:348`), `refetchNotificacoes`,
  `marcarNotificacoesLidas`.
- **Analytics/consentimento:** `trackPageview`, `trackClickComprar`, `trackTempoSessao`, `trackScroll`,
  `visitorId` (`:377`), `systemPausado`.

### 4.3 Dependências relevantes (imports de topo)
- `react-router-dom` (`useLocation`, `useNavigate`) — `AppContext.jsx:2`.
- `@privy-io/react-auth` (`usePrivy`, `useWallets`) — `:3`.
- `src/lib/api.js` (`apiGet`, `apiPost`) — `:37` · `src/lib/consentimento.js` — `:38`.
- `src/lib/leilaoLock.js` → **`EM_BREVE_MODE`** — `:39` · `src/lib/overlayVisto.js` — `:41`.
- `src/hooks/useEdicoes.js` — `:22` · `src/hooks/useResultadoOficial.js` — `:24`.
- `src/lib/fingerprint.js` — `:17` · `src/lib/retryAuth.js` — `:21`.
- `src/components/TermosConsentimento.jsx` → `VERSAO_CONSENTIMENTO` — `:42`.

---

## §i18n

### 5.1 Ficheiro
- **`src/i18n/pt.js`** (**150 linhas**) — export default com **um único dicionário** (chaves planas
  `dot.notation`). É o **único** dicionário: `en.js`/`es.js` foram removidos (**MC98 — PT-BR only**,
  `pt.js:2-3`). Não há outro ficheiro sob `src/i18n/` além de `__tests__/`.
- **Motor:** `src/context/IdiomaContext.jsx` — `import pt from "../i18n/pt.js"` (`:13`),
  `useIdioma()` (`:62`), `useT()`/`t(key, fallback)` (`:70`); `<IdiomaProvider>` montado em `App.jsx:424`.

### 5.2 Chaves relevantes
| Grupo | Chaves | `pt.js` | Consumidor medido |
|---|---|---|---|
| **Navegação** | `nav.inicio`, `nav.lances`, `nav.carteira`, `nav.mais`, `nav.vitrine`, `nav.programacao`, `nav.ativos`, `nav.seguranca`, `nav.parceiro`, `nav.config`, `nav.admin`, `nav.painel`, `nav.cotas`, `nav.banners`, `nav.analytics`, `nav.maisOpcoes`, `nav.fechar`, `nav.sair` (**18 chaves**) | `pt.js:6-23` | ⚠️ **NENHUM** (`grep 't("nav.'` → 0) — a navegação usa literais |
| **Saldo** | `dash.saldo` («Saldo (R$)»), `dash.senhas` («Senhas») | `pt.js:28-29` | ⚠️ **NENHUM** (o ecrã usa «Saldo Disponível» literal — `MinhaCarteira.jsx:174`) |
| **Lances/Torneio** | `dash.menorLanceUnico`, `dash.nenhumLanceUnico` | `pt.js:36-37` | ⚠️ **NENHUM** |
| **Lances (ativos)** | `ativos.lance.*` (`titulo`, `unico`, `menor`, `repetido`, `vale`, `ponto1/N`, `aviso`) | `pt.js:91-101` | `MeusAtivos.jsx` / `components/meus-ativos/*` |
| **Meus Ativos** | `ativos.torneio.*`, `ativos.bonus.*`, `ativos.rank.*`, `ativos.cupons.*`, `ativos.palpites.*` | `pt.js:61-117` | `MeusAtivos.jsx` e filhos |
| **Edição especial** | `edicao.especial.*` | `pt.js:119-149` | `components/edicao-especial/*` |
| **Configurações** | `config.*` | `pt.js:40-58` | `Configuracoes.jsx:21` |

**Prefixos efectivamente consumidos** (medido): `ativos.*` (58 usos), `edicao.especial.*` (25),
`config.*` (12). **Prefixos sem consumidor:** `nav.*` (18 chaves) e `dash.*` (10 chaves).

> ⚠️ **OBSERVAÇÃO DECLARADA (possível dívida técnica — NÃO registada em `DEBT.md`).** As **18 chaves
> `nav.*`** e as **10 chaves `dash.*`** do dicionário **não têm qualquer consumidor** — os componentes de
> navegação (`BottomNav.jsx:25-38`, `Sidebar.jsx:26-38`) e os ecrãs usam **literais hardcoded**. Isto é
> relevante para o **UTAC106b** (que vai mexer nos rótulos): mudar a navegação exige editar **dois**
> ficheiros de componentes (mobile + desktop), não as chaves i18n. **Per RESSALVA 7, NÃO registo isto em
> `DEBT.md`** (o UTAC não autoriza alterar o `DEBT.md` sem parar): fica **declarado aqui e ao operador**
> para decisão (registar como dívida própria ou aceitar como escolha de apresentação).

---

## §Validador adversarial (SEG3)

**Despachado:** subagente Hermes independente, instruído a **TENTAR REFUTAR** (veredicto verbatim +
resposta do executor em `_logs/UTAC106a_SEG3_VALIDADOR.md`).

> **VEREDICTO: PARCIAL · 0 bloqueantes · 0 alegações REFUTADAS.** O validador confirmou **todos** os
> `ficheiro:linha` do documento (incluindo as 10 contagens de linha: AppContext 1497 · pt.js 150 ·
> BottomNav 381 · Sidebar 305 · Layout 115 · AppLayout 41 · MinhaCarteira 332 · MercadoLances 449 ·
> App.jsx 517 · main.jsx 124) e a **alegação forte** («`nav.*` 18 + `dash.*` 10 sem consumidor»,
> testada por 5 vias incluindo `t() ` dinâmico e testes → **verdadeira**). **PARCIAL** porque o mapeamento
> **não era exaustivo**: apontou **5 lacunas de cobertura + 1 imprecisão**, todas **corrigidas neste
> UTAC**.

| Achado | Grav. | Lacuna | Tratamento (aplicado) |
|---|---|---|---|
| A1 | ⚠ | **Nenhum** `ficheiro:linha` errado / inexistente / `.bak-*` apresentado como produção | — |
| A2 | ℹ | `rotasTrabalho.js` tem **3** consumidores (faltava `BackgroundCanvas.jsx:25/:40`) | §1.4 corrigido |
| A3 | ℹ | `GlassHeader` localizado por intervalo impreciso (`:47-56` em vez de def `:12`, composição `:41-57`) | §3.3 corrigido |
| A4 | ℹ | Superfícies de **saldo** não cobertas: `Dashboard.jsx:174/:177`, `CorporativoDashboard.jsx:350`, `ComprarFichasModal.jsx:308/:517-533` | §2.4 acrescentado |
| A5 | ℹ | Navegação **admin** não coberta: `NavAdminPersistente.jsx` (`AdminLayout.jsx:276`) + breadcrumbs | §1.7 nova |
| A6 | ℹ | **5 `.bak-*` DEPRECATED versionados** (incl. `App.jsx.bak-*` com rotas antigas) | §1.8 nova |

**Erros dos meus instrumentos (declarados na resposta):** (1) cobertura inflacionada — não varri os
**consumidores** de `rotasTrabalho.js` (que o próprio ficheiro declara) nem as superfícies alternativas
de saldo; (2) citei `GlassHeader` pelo **fim** do bloco e tomei-o pelo **todo**; (3) não varri o repo por
ficheiros deprecated versionados.
**Limites do validador (declarados por ele):** não re-correu a suíte; sem verificação em runtime.
**Correcções pós-veredicto: não re-validadas** (sem 2.ª ronda).

---

## §Registos e custo (SEG4)

**Registo em 3 lugares (R18):**
1. `_logs/UTAC106a-mapeamento.md` (este documento) + `_logs/UTAC106a_SEG3_VALIDADOR.md` (veredicto).
2. `CLAUDE.md` — bloco **R14** resumido.
3. `Desktop/RELATORIO-UTAC106a-MAPEAMENTO.txt` (relatório ao operador).

**Ficheiros criados:** `_logs/UTAC106a-mapeamento.md` · `_logs/UTAC106a_SEG3_VALIDADOR.md` · bloco R14 no
`CLAUDE.md`. **Zero** ficheiros de código tocados (verificável: `git diff --name-only` só lista docs/logs).

**Dívida nova:** as **18 chaves `nav.*` + 10 `dash.*`** sem consumidor ficam **declaradas** (não
registadas em `DEBT.md` — RESSALVA 7 manda reportar antes de registar). Candidata a `DEBT` própria.

**Custo de API (medido no fecho):**
- **Executor** (mesma sessão CLI do UTAC106x.6 — `20261004_104512_7dad39`, `source=cli`): a plataforma
  **não** abre sessão por UTAC. Leitura no fecho do x.6 = US$ 0,0621; leitura agora = US$ 0,1191 ⇒
  **106a ≈ US$ 0,057** (diferença). ⚠️ é **estimativa**.
- **Validador adversarial** (sessão própria `20261004_123433_c76e1c`, `source=subagent`): 58 mensagens ·
  36 tool calls · **≈ US$ 0,0228**.
- **Total estimado do UTAC106a: ≈ US$ 0,080.**
- **Saldo real da API (medido):** arranque **US$ 7,28** → fecho **US$ 7,22** ⇒ **consumo real ≈ US$ 0,06**
  (inclui as delegações). Reportadas as duas leituras separadas — *estimativa da base* vs *saldo real*.
