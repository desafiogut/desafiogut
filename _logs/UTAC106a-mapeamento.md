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
  `/admin` e `/corporativo`) e `escondeNavegacaoConsumo()` (`:40-43`, só `/admin*`); consumidos em
  `Layout.jsx:63-65` e `AppLayout.jsx:29`.

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
  `apiGet("wallet?endereco=…")` (`WalletCard.jsx:53`); usado só no painel corporativo.

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
| `GlassHeader` | `src/components/glass/GlassHeader.jsx:47-56` | compõe `AuthArea` + `ComingSoonHero` + `ModeSelector` + `AuctionStatusBar` |
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

_(a preencher — ver `_logs/UTAC106a_SEG3_VALIDADOR.md`)_

---

## §Registos e custo (SEG4)

_(a preencher no fecho)_
