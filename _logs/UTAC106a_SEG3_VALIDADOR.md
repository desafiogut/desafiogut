# UTAC106a — Validador adversarial independente (SEG3)

**Tipo:** validação adversarial do documento `_logs/UTAC106a-mapeamento.md` (316 linhas).
**Commit validado:** `771cbfe` (LOCAL, não empurrado) — **diff `884eed9..771cbfe` toca SÓ `_logs/UTAC106a-mapeamento.md`** (1 ficheiro, 316 inserções, 0 alterações de código). Logo o código de produção medido == o de `884eed9` == o do documento.
**Método:** medição directa por `git`/`grep -n`/`sed -n` no repo principal (`C:/Users/Moltbot/Desktop/DESAFIOGUT`), sem worktree (código inalterado). Nenhum ficheiro de código foi tocado.
**Sujeira introduzida:** zero (só se escreveu este veredicto em `%TEMP%`).

---

## VEREDICTO: **PARCIAL** — **0 bloqueantes**

O documento está **factualmente correcto em todos os `ficheiro:linha` que afirma** (navegação, carteira, lances, AppContext, i18n) e a **alegação forte** («`nav.*` (18) e `dash.*` (10) sem consumidor») **resistiu à refutação** (0 usos fora do dicionário, incluindo dinâmicos/tests). Não encontrei nenhuma referência a ficheiro inexistente, nenhum caminho `.bak-*` citado como se fosse produção, nem nenhuma linha inexistente.

É **PARCIAL** (e não APROVADO) porque o mapeamento **não é exaustivo** e tem **uma imprecisão de linha**: omite um 3.º consumidor de `rotasTrabalho`, omite superfícies de **saldo** reais (Dashboard, painel corporativo, modal PIX), omite um componente de **navegação** (admin) e não assinala os `.bak-*` **deprecated que estão versionados**. Nada disto é bloqueante para o UTAC106b/106c, mas um documento que é «a base» desses UTACs deve nomeá-los.

---

## Reproduzido por execução (comandos + saída real)

**1. O commit só mexe em docs (logo o código medido é o de `884eed9`):**
```
$ git diff --name-only 884eed9 771cbfe
_logs/UTAC106a-mapeamento.md
$ git show --stat 771cbfe | tail -3
 _logs/UTAC106a-mapeamento.md | 316 +++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 316 insertions(+)
```

**2. Contagens de linha (o doc afirma 1497 / 150 / 381 / 305 / 115 / 41 / 332 / 449 / 517 / 124):**
```
$ wc -l src/context/AppContext.jsx src/i18n/pt.js src/widgets/layout/BottomNav.jsx \
       src/widgets/layout/Sidebar.jsx src/widgets/layout/Layout.jsx src/widgets/layout/AppLayout.jsx \
       src/pages/MinhaCarteira.jsx src/pages/MercadoLances.jsx src/App.jsx src/main.jsx
 1497 150 381 305 115 41 332 449 517 124  → TOTAL 3911
```
→ **todas correctas**.

**3. Navegação (amostra de linhas exactas):**
```
$ grep -n 'export default function Layout\|<Sidebar\|<BottomNav\|paddingBottom\|<Outlet' widgets/layout/Layout.jsx
44:export default function Layout() {
84:        {!isMobile && <Sidebar />}
93:            paddingBottom: mostrarNav
101:            <Outlet />
112:      {mostrarNav && <BottomNav />}
```
`BottomNav.jsx`: `:24-28` MAIN_TABS · `:30-39` SECONDARY_LINKS · `:49` componente · `:66-70` CORP_TABS · `:101-115` `<nav>` · `:132-143` botão «Mais» · `:158` `role="dialog"` · `:284` `navigate(path)` · `:304` `desconectar()` · `:381` `export { NAV_HEIGHT as BOTTOM_NAV_HEIGHT }` → **todos conferem**. `Sidebar.jsx` `:25-39` NAV_ITEMS · `:43-48` CORPORATIVO_ITEMS · `:51` ADMIN_ITEM · `:55` SEGURANCA_ITEM → **conferem**.

**4. Rotas (`App.jsx`) e router (`main.jsx`):**
```
437:<Routes>  455:<Route element={<AppLayout />}>  456:<Route index … DashboardOuCorporativo>
457:/carteira  458:/mercado  459-460:/vitrine  462:/produto/:id  464:/edicao/:id
465:/programacao  466:/ativos  469:/seguranca  470:/configuracoes  476:/admin
492:/seja-nosso-parceiro  494:/corp  496-503:/corporativo/*
Públicas fora do AppLayout: 440 /excluir-conta · 443 /privacidade · 446 /cadastro · 447 /login-email · 451 /redirect
App.jsx:424 <IdiomaProvider>  425 <AppProvider>
main.jsx:9 import { BrowserRouter }  113-121 montagem
```
→ **conferem** (a tabela §1.5 e o §1.4/§4.1 estão certos).

**5. Carteira:**
```
MinhaCarteira.jsx: :12 VALOR_POR_SENHA_BRL · :14 COR · :16 muted:"#6b7db8" / gold:"#f5a623"
 :31 componente · :43 saldoRsCentavos/saldoRsStatus/refetchSaldoRs · :77-80 irParaLanceRelampago
 :130 GlassCard · :135 «💰 Minha Carteira» · :174 «Saldo Disponível» (color COR.muted)
 :175-189 valor · :176 gut-valor-pendente · :203-216 Depositar PIX · :217-237 Trocar · :238-254 Lance Relâmpago
WalletCard.jsx:42 componente · :118 «Saldo disponível» · CorporativoCarteira.jsx:307 uso
```
→ **conferem**.

**6. Lances:**
```
MercadoLances.jsx: :212 componente · :252 recursosCarregando→Skeleton · :253 !isLeilaoAtivo→Conformidade
 :278 GlassHeader · :307-317 CardLance · :319-323 LanceStatusBadge · :327 TabelaLances · :372 MercadoConformidade
 :25 CountdownOverlay · :71 OverlayVencedor · :423 MercadoSkeleton · :149 «Carteira Vencedora» · :170 «As suas participações» · :389 «Edições na versão Web»
ComingSoonHero.jsx :37:Edição{R-1} · :48:EM BREVE · :55:Menor lance único vence · Art. 8
ModeSelector.jsx :7 ⚡Relâmpago · :8 🎫Programado · :14 «Modo:»
CardLance.jsx :396:Aceito o DesafioGUT · :416:programado · :417:flash · :436:Art.26
AuctionStatusBar.jsx:12 CNPJ · useLanceFeedback.js :4 hook · :38 setInterval(verificar,5000)
FeedbackLance.jsx:37 · MeusAtivos.jsx:192 · LanceStatusBadge.jsx:3 · DetalheProduto.jsx:229
```
→ **conferem** (mesmo a ordem crítica `:416` programado / `:417` flash).

**7. AppContext (1497 linhas) — todas as linhas citadas:**
```
145 createContext · 178 AppProvider · 1454 <AppContext.Provider value={value}>
180 modalidade · 189 lances · 190 lancesFlash · 195 prazoFlash · 198 prazoProgramado · 208 encerrado
209 showOverlay · 212 lightningActive · 213 showCountdown · 333 saldoSenhas · 334 saldoSenhasStatus
339 saldoRsCentavos · 340 saldoRsStatus · 347 notificacoes · 354 cotaCorporativa · 355 tipoCarregando
266 adminProvavel · 279 lojistaProvavel · 377 visitorId · 432 authToken
imports: :2 router · :3 privy · :17 fingerprint · :21 retryAuth · :22 useEdicoes · :24 useResultadoOficial
 :37 api.js · :38 consentimento · :39 EM_BREVE_MODE · :41 overlayVisto · :42 VERSAO_CONSENTIMENTO
```
→ **conferem**.

**8. i18n — a ALEGAÇÃO FORTE (testada, não refutada):**
```
$ cat -n i18n/pt.js → 150 linhas; nav.* = linhas 6-23 (18 chaves); dash.* = 26-37 (10 chaves);
                        ativos.* 61-117; edicao.especial.* 119-149; config.* 40-58  ✓ (doc certo)
$ grep -rn 'nav\.\|dash\.' --include=*.jsx --include=*.js --include=*.mjs . | grep -v "\./i18n/pt.js" | grep -v "\.bak"
  (vazio — as únicas 28 ocorrências estão TODAS em ./i18n/pt.js)
$ grep -rho 't("ativos\.' (js+jsx)     → 57 ;  + mjs → 58  ✓ doc «58 usos»
$ grep -rho 't("edicao\.especial\.'    → 25  ✓ doc «25»
$ grep -rho 't("config\.'              → 12  ✓ doc «12»
$ grep -rho 't("nav\.'  → 0 ;  t("dash\.' → 0
```
→ Sem `t(\`nav.${x}\`)`, sem mapa de chaves, sem consumidor em testes (`pt-only.test.mjs` / `glossario.test.mjs` / `ativos-i18n.test.mjs` **não** referenciam `nav.`/`dash.`; o `dash` de `utac105b-painel.test.mjs:70` é uma **variável local** = fonte do CorporativoDashboard, não chave i18n). **A alegação é verdadeira.** Único importador de `pt.js` é `IdiomaContext.jsx:13`.

---

## Tabela de achados

| # | Sev | Achado | Tratamento proposto |
|---|-----|--------|---------------------|
| A1 | ⚠ grave | **Nenhum.** Nenhum `ficheiro:linha` errado-que-aponta-para-o-sítio-errado, nenhum caminho inexistente, nenhum `.bak-*` apresentado como produção. | — |
| A2 | ℹ nota | **`rotasTrabalho.js` tem 3 consumidores; o doc lista 2.** Além de `AppLayout.jsx:29` e `Layout.jsx:63-65`, também `BackgroundCanvas.jsx:25` (import) e `:40` (uso) importam/usam `ehRotaDeTrabalho`. O próprio `rotasTrabalho.js:12` declara os 3 consumidores no comentário. | Acrescentar `BackgroundCanvas.jsx:25/:40` ao §1.4. Relevante se o 106b mexer no critério «rota de trabalho». |
| A3 | ℹ nota | **`GlassHeader.jsx:47-56` é impreciso como «localização do componente».** O componente define-se em `GlassHeader.jsx:12`; o bloco de composição dos filhos vai de `:41` (`<AuthArea/>`) a `:56` (`<AuctionStatusBar/>`) — `AuthArea` cai **fora** de `47-56`. | Corrigir a linha da tabela para `GlassHeader.jsx:12` (def) e «compõe em `:41-56`». |
| A4 | ℹ nota | **Superfícies de SALDO não cobertas** (§Carteira só nomeia `MinhaCarteira` + `WalletCard` como fontes): (a) `Dashboard.jsx:174-178` mostra cartões-estatística «Saldo (R$)» e «Senhas» (fonte: `saldoRsCentavos`/`saldoSenhas`; `to:"/carteira"`); (b) `CorporativoDashboard.jsx:350` mostra «Saldo wallet» → `/corporativo/carteira`; (c) `ComprarFichasModal.jsx:308` («Saldo R$ disponível…») e `:517-533` («Saldo Antes/Depois»). | Registar no §2.4 como «outras superfícies de saldo». **Directamente relevante ao UTAC106c** (redesenho da Carteira): o saldo aparece em >1 ecrã. |
| A5 | ℹ nota | **Componente de NAVEGAÇÃO não coberto:** `src/components/admin/NavAdminPersistente.jsx` (nav do painel ADM; renderizado em `AdminLayout.jsx:276`). Também há `<nav>` de breadcrumb em `DetalheProduto.jsx:135` e `Vitrine.jsx:370`. O §Baseline lista candidatos e omite `NavAdminPersistente`. | Nota no §1 (fora do escopo «nav de consumo» do 106b, mas declarar a fronteira). |
| A6 | ℹ nota | **Ficheiros `.bak-*` DEPRECATED e VERSIONADOS não assinalados.** `git ls-files` mostra 5 tracked: `src/App.jsx.bak-20260724145416` (contém uma tabela de rotas ANTIGA/divergente — ex.: `/carteira` e `/mercado` em `:128-129` **sem** o wrapper `AppLayout`), `src/PrivyRoot.jsx.bak-20260724200959`, `src/PrivyRoot.jsx.bak-custom-scheme-20260725182152`, `src/PrivyRoot.jsx.bak-oauth`, `capacitor.config.ts.bak-20260725182152`. O doc mapeia `App.jsx`/`PrivyRoot` mas não avisa que existem cópias obsoletas versionadas do **mesmo** ficheiro de navegação. | Declarar no §Baseline «ficheiros deprecated presentes (ignorar)» — sobretudo o `App.jsx.bak-*`, para o UTAC106b não editar a cópia errada. |

---

## Alegações que consegui REFUTAR

**Nenhuma.** Todas as afirmações positivas do documento que testei resistiram. Em particular, tentei refutar a alegação forte por 5 vias e todas falharam:
1. uso dinâmico `t(\`nav.${x}\`)` → **0** (nenhum `t(\`` é i18n);
2. módulo de mapeamento `{ nav: {…} }` → **0**;
3. uso em testes (`i18n/__tests__/*.test.mjs`) → **0**;
4. uso em `Toast`/`Configuracoes`/`AdminLayout` (os consumidores de `useT`) → **0**;
5. qualquer literal `"nav."`/`"dash."` fora de `pt.js` → **0**.

---

## Alegações que NÃO consegui refutar (corroboradas por medição)

- **Contagens de linha** (AppContext 1497 · pt.js 150 · BottomNav 381 · Sidebar 305 · Layout 115 · AppLayout 41 · MinhaCarteira 332 · MercadoLances 449 · App.jsx 517 · main.jsx 124). **Todas.**
- **Toda a §Navegação** (§1.1–§1.6): BottomNav `:49/:24-28/:30-39/:66-70/:132-143/:381/:101-115`; Sidebar `:25-39/:43-48/:51/:55`; Layout `:44/:84/:112/:93-95/:101`; AppLayout `:27/:29`; rotas §1.5; `main.jsx:9/:113-121`; `rotasTrabalho.js:26-29/:40-43` (só a *lista de consumidores* é incompleta, cf. A2).
- **Toda a §Carteira**: `MinhaCarteira` `:31/:12/:174/:16/:130/:135/:203-216/:217-237/:238-254/:77-80/:43`; cores `#6b7db8`/`#f5a623`; `WalletCard:42/:118`, `CorporativoCarteira:307`.
- **Toda a §Lances**: incluindo a ordem crítica `:416` programado / `:417` flash, `ComingSoonHero:37/48/55`, `ModeSelector:7-8/14`, `AuctionStatusBar:12`, `useLanceFeedback:4/38`, e a nota (verdadeira) de que o banner «QUANTO VOCÊ OFERTA POR…» saiu da tela de lances (sobrevive em `TermosConsentimento.jsx:109`).
- **Toda a §AppContext**: 22 linhas de estado + 11 imports, todas exactas.
- **A alegação FORTE** (`nav.*`=18 e `dash.*`=10 sem consumidor) → **verdadeira**.
- Métricas moles: `ativos.*` 58 ✓ · `edicao.especial.*` 25 ✓ · `config.*` 12 ✓.
- **Baseline git:** `origin/main = 884eed9` (== o `HEAD` declarado no doc); hoje `771cbfe` está `0/1` à frente — **coerente** com «commit local, não empurrado».

---

## O que NÃO mediste

- **Não re-corri a suíte** (`node scripts/mc966-suite-harness.mjs ambos`) — aceitei a linha de baseline «frontend 694/694 · backend 992/998 VERDE» como **não verificada** (é alegação do SEG1 do doc).
- **Nenhuma execução em runtime/browser** — tudo é leitura estática; não validei a ordem de renderização **efectiva** nem o comportamento dos gates em execução.
- **Não inspeccionei todos os 449+517+305 linhas** linha-a-linha: verifiquei por `grep -n`/`sed -n` as linhas **citadas** e as estruturas que o doc afirma; não procurei exaustivamente cada elemento de carteira/lances não citado (o que existe está na tabela A4/A5/A6).
- **Não avaliei dívida técnica declarada** (o doc diz que `nav.*`/`dash.*` órfãs **não** foram para `DEBT.md` por RESSALVA 7) — fora do meu mandato.

---

## O que o documento NÃO cobriu

1. **3.º consumidor de `rotasTrabalho.js`** → `BackgroundCanvas.jsx:25/:40` (A2).
2. **Superfícies de saldo** fora de `MinhaCarteira`/`WalletCard`: `Dashboard.jsx:174-178`, `CorporativoDashboard.jsx:350`, `ComprarFichasModal.jsx:308/:517-533` (A4).
3. **Componente de navegação admin:** `NavAdminPersistente.jsx` (+ breadcrumbs `DetalheProduto.jsx:135`, `Vitrine.jsx:370`) (A5).
4. **`.bak-*` deprecated e versionados** (5 ficheiros, incl. `App.jsx.bak-*` com tabela de rotas antiga) (A6).
5. **Localização exacta do `GlassHeader`** (def `:12`, composição `:41-56`, não `:47-56`) (A3).


---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: PARCIAL · 0 bloqueantes · 0 alegações REFUTADAS.** O validador confirmou **todos** os
`ficheiro:linha` do documento (contagens de linha incluídas) e a alegação forte sobre o i18n; apontou
**5 lacunas de cobertura + 1 imprecisão de linha** (achados A2-A6). Tratamento — **todos aplicados neste
mesmo UTAC** (correcções **não re-validadas** — não houve 2.ª ronda):

| Achado | Grav. | Tratamento |
|---|---|---|
| **A1** — nenhum `ficheiro:linha` errado, nenhum caminho inexistente, nenhum `.bak-*` apresentado como produção | ⚠ | **Nada a corrigir.** |
| **A2** — `rotasTrabalho.js` tem **3** consumidores; o doc listava 2 (faltava `BackgroundCanvas.jsx:25/:40`) | ℹ | **CORRIGIDO** — §1.4 actualizado com o 3.º consumidor (verificado por medição própria). |
| **A3** — «`GlassHeader.jsx:47-56`» era impreciso: a def está em `:12` e a composição vai `:41-57` (o `<AuthArea/>` cai fora de 47-56) | ℹ | **CORRIGIDO** — tabela §3.3 passa a `:12` (def) + composição `:41-57` com os 4 filhos e as suas linhas (`:41/:49/:50/:54`). |
| **A4** — superfícies de **saldo** não cobertas: `Dashboard.jsx` (cards «Saldo (R$)»/«Senhas» → `/carteira`), `CorporativoDashboard.jsx:350` («Saldo wallet»), `ComprarFichasModal.jsx:308/:517-533` | ℹ | **ACRESCENTADO** — §2.4 ganhou «outras superfícies de saldo» (relevante ao **UTAC106c**). |
| **A5** — componente de **navegação** não coberto: `NavAdminPersistente.jsx` (renderizado em `AdminLayout.jsx:276`) + breadcrumbs (`DetalheProduto.jsx:135`, `Vitrine.jsx:370`) | ℹ | **ACRESCENTADO** — nova §1.7 com as «outras navegações» + a fronteira do escopo do UTAC106b. |
| **A6** — **5 ficheiros `.bak-*` DEPRECATED e versionados** (incl. `App.jsx.bak-*` com tabela de rotas ANTIGA) não assinalados | ℹ | **ACRESCENTADO** — nova §1.8 «NÃO editar» (verificado: `git ls-files` devolve os 5). |

## Erros dos meus PRÓPRIOS instrumentos (declarados)

1. **O documento tratava o mapeamento como completo quando só cobria as superfícies PRINCIPAIS.** Não
   varri os **consumidores** de `rotasTrabalho.js` (o próprio `rotasTrabalho.js:12` **declara os 3** — e
   era `import` + `use` a 3 linhas de distância) nem as **superfícies alternativas de saldo**. Uma
   cobertura alegada sem varredura de consumidores é uma cobertura inflacionada.
2. **`GlassHeader` citado por um intervalo que partia o próprio componente** (`:47-56` excluía o
   `<AuthArea/>`): li o **fim** do bloco e tomei-o pelo todo — a def está em `:12`. Lição: ler a **def**
   antes de citar o **uso**.
3. **Não varri o repo por ficheiros deprecated versionados** (`git ls-files | grep .bak`) — 5 existem e
   um deles (`App.jsx.bak-*`) contém uma **tabela de rotas divergente**, exactamente o tipo de isca que
   faria o UTAC106b editar a cópia errada.

**Nota de âmbito (declarada):** o validador **não** re-correu a suíte (aceitou o baseline do SEG-1 como
não verificado por ele) e **não** fez nenhuma verificação em runtime — as suas conclusões são de leitura
estática. Nenhum ficheiro de código foi tocado por ele (o UTAC não altera código).

Correcções pós-veredicto: **declaradas como «não re-validadas»**.
