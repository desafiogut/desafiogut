# VEREDICTO ADVERSARIAL — UTAC107a-back-mapeamento.md

**Documento auditado:** `_logs/UTAC107a-back-mapeamento.md` (36078 bytes)
**Repo de referência:** `C:/Users/Moltbot/Desktop/DESAFIOGUT` @ `f498fded2ecc929e0d3fd66dbb3f712d85d7b82a` (== origin/main)
**Worktree isolado:** `C:/Users/Moltbot/tmp-107aback-val/wt` @ `f498fde` (auditado; só-leitura)
**Auditor:** subagente Hermes (deepseek-v4-flash) — técnica adversarial: tentar REFUTAR, não confirmar.
**Data:** 2026-10-05

---

## ⚖️ VEREDICTO: **PARCIAL — 4 bloqueantes**

O núcleo do mapa **resiste** à auditoria (83/83 endpoints exactos, contratos A.5 conformes com o código,
rotas §B.1 correctas linha a linha, ausência de badge «NOVO» e de notificação por depósito confirmadas,
suíte VERDE reproduzida). Mas **quatro** alegações quantitativas/classificatórias **não se reproduzem** e
duas delas (órfãos mal classificados) tocam precisamente o objectivo do documento — alimentar o
`107a-front` com o mapa de contratos/navegação fiável. Um «0»/«26»/«1 origem» obtido sem varredura
do CORPUS TODO não é medição; onde o doc declara contagens, elas falham.

**Bloqueantes (4):** (B1) contagem de órfãos «26» ≠ 20 medidos; (B2) `pontuacao` mal classificada
(órfão omitido + consumidor falso); (B3) `comprar-passe` com consumidor inexistente (alegação refutada);
(B4) subcontagem grosseira das duplicações `/privacidade` e `/excluir-conta` por exclusão de `<a href>`.

---

## 🔬 «Reproduzido por execução» (comandos + saída real)

### Baseline / integridade (item h)
```
$ cd wt && git rev-parse HEAD            → f498fded2ecc929e0d3fd66dbb3f712d85d7b82a
$ git status --porcelain | wc -l         → 0            (worktree LIMPO)
$ cd DESAFIOGUT && git status --porcelain | grep -v '^??' | wc -l → 0   (NENHUM tracked modificado)
   (main só tem 31 untracked em _logs/*.md — inclui o próprio doc auditado e o VEREDICTO)
$ node scripts/mc966-suite-harness.mjs ambos < /dev/null
   frontend: VERDE 774/774 pass
   backend:  VERDE 1061/1067 pass
   VEREDITO: VERDE
```
⇒ Nenhum ficheiro de CÓDIGO foi alterado. Ambiente não contaminado. Suíte **reproduzida exactamente**.

### (a) Endpoints — A.1 vs. disco
```
$ ls desafio-gut/frontend/netlify/functions/*.mjs | grep -v _tests | grep -v _lib | wc -l   → 83
# parse da tabela A.1 (nºs 1..83):
#   declarados: 83 | reais: 83 | duplicados no doc: 0 | fantasma (doc∖real): 0 | não-mapeados (real∖doc): 0
```
⇒ **A.1 é EXACTA: 83 = 83, 1:1, sem fantasmas nem omissões.** (Nota: os 83 `.mjs` raw == 83 filtrados,
porque `_tests/` e `_lib/` são SUBDIRECTORES — o filtro `grep -v` não remove nada no topo.)

### (a) Órfãos — o «26» não existe
```
# método naive do doc (substring crua, src/, excl. .bak):  → 20 endpoints com 0 hits
# fronteira de token, excl. testes:                          → 22 (adiciona comprar-passe, pontuacao)
# fronteira de token, corpus TODO (inclui testes):            → 21 (adiciona pontuacao)
# backticks enumerados nas linhas 169-176 do doc:             → 20 endpoints + `schedule` (rodapé)
```
⇒ O cabeçalho **«— 26:»** (linha 169) **não corresponde a nenhuma medição**: nem à própria lista
enumerada (20), nem ao método naive (20), nem ao total com `schedule` (21). **B1.**

### (g) Amostra ≥15 de `ficheiro:linha` (grep -n + sed -n '<l>p')
| Ref citada | Verificado | Veredicto |
|---|---|---|
| `App.jsx:470` (alias `/menor-lance-unico`→`/mercado`) | `<Route path="/menor-lance-unico" element={<Navigate to="/mercado" replace />} />` | ✅ |
| `App.jsx:444/447/450/451/455/460/461/462/474…522` | todas as rotas batem com a §B.1 | ✅ |
| `BottomNav.jsx:29-34` `MAIN_TABS` | 4 tabs (Carteira/Mercado/Início/Ofertas) | ✅ |
| `BottomNav.jsx:36-49` `SECONDARY_LINKS` | 6 itens + admin condicional `:82-84` | ✅ |
| `BottomNav.jsx:76-80` `CORP_TABS` | 3 tabs | ✅ |
| `BottomNav.jsx:127/275/294/314` | NavLink / navigate("/cadastro") / navigate(path) / desconectar() | ✅ |
| `Sidebar.jsx:34-56` `NAV_ITEMS` | 10 itens, mesma ordem do BottomNav | ✅ |
| `Sidebar.jsx:60-65/68/72/202` | CORPORATIVO_ITEMS / ADMIN_ITEM / SEGURANCA_ITEM / NavLink | ✅ |
| `MinhaCarteira.jsx:199-213` (R$ a dourado) | `color: COR.gold` | ✅ |
| `MinhaCarteira.jsx:247` disabled `<2` | `disabled={… saldoReais < VALOR_POR_SENHA_BRL}` | ✅ |
| `MinhaCarteira.jsx:265` disabled `<2` | `disabled={!saldoReais}` (**≠ «<2»**) | ⚠️ ver ℹ️-5 |
| `MinhaCarteira.jsx:413-416` onSucesso refetch | `onSucesso={() => { refetchSaldoRs?.(); refetchSaldo?.(); }}` | ✅ |
| `ler-pontos.mjs:1-70` (ficheiro tem 70 linhas) | contrato/saída/R1 batem | ✅ |
| `comprar-passe-pontos.mjs` 113 l. | idempotência/CAS/reembolso batem | ✅ |
| `registar-palpite.mjs` 99 l. | `valor∈[0,1000000]` Number.isInteger | ✅ |
| `resgatar-cartao.mjs:111` | `adicionarNotificacao(t.endereco, {…})` (fail-soft) | ✅ |
| `resgatar-cartao.mjs` 124 l. | códigos 400/401/402/405/502/503 batem | ✅ |
| `ChatbotWidget.jsx:522-537` | badge 🔔 `notificacoesNaoLidas > 0` | ✅ |
| `EdicaoBanner.jsx:62` | `onClick={() => setAberto(true)}` | ✅ |
| `EdicaoBanner.jsx:7` / `EdicaoCard.jsx:8,124` | comentário↔código (navega `/mercado`) | ✅ |
| `OfertasProgramadas.jsx:137` | `{pontosCartao} / {pontosParaCartao} pontos` | ✅ |
| `CorporativoDashboard.jsx:347-351` / `Dashboard.jsx:52-60,174-180` | arrays `to:` batem | ✅ |
| `CotaInativa.jsx:102/124` | `navigate("/corporativo/carteira")` / `navigate("/corporativo/cotas")` | ✅ |

⇒ **Todas as referências de linha de FICHEIRO/ROTA testadas estão CORRECTAS.** As falhas estão na coluna
**«Consumidor»** da A.1 e nas contagens da §B.

### (d)/(f) Caminhos mortos e indicador «novo»
```
$ git grep -n "/edicao/"   -- src   → só comentários (EdicaoBanner:6-7, EdicaoCard:8, EdicaoDetalhe:1) + teste
$ git grep -nE "['\"]/corp['\"]" -- src → só App.jsx:513 (rota) [+ .bak]
$ git grep -n "/redirect" -- src → rota App.jsx:455 + lib/retornoOAuth.js:21 (fluxo OAuth)
$ git grep -n "menor-lance-unico" -- src → rota App.jsx:470 + comentários
$ git grep -nE "(NOVO|>Novo<|>Nova<)" -- src → 0 badges JSX (só comentários)
$ for f in confirmar-pagamento webhook-mercadopago saldo-rs; do git grep -n notificac $f.mjs; done → exit 1 (0 hits)
$ git grep -n notificac _lib/saldoRs.mjs → exit 1 (0 hits)
```
⇒ **(d) os 4 caminhos mortos confirmam-se**; **(f) sem badge «NOVO» e o depósito R$2 não cria
notificação — confirmado.**

### (e) Contraste com `UTAC106a-mapeamento.md`
```
$ git log -6 --oneline -- .../BottomNav.jsx .../Sidebar.jsx
   55beab5 feat(UTAC106h): Regras Oficiais… · 1fe7ede feat(UTAC106c)…
   ba9443e fix(UTAC106b): /menor-lance-unico passa a redirect · a1927ad feat(UTAC106b): nova navegacao…
```
⇒ As divergências de **linhas e rótulos** entre 106a e 107a (ex.: 106a: BottomNav:24-28 / «Lances» /
Início-Carteira-Lances; 107a: BottomNav:29-34 / «Menor Lance Único» / Carteira-Mercado-Início-Ofertas)
**são REAIS mas DECLARADAS** (§B «Pré-aviso de drift (RESSALVA 5)») e **atribuíveis a 106b/106c/106h**
(git log confirma). **Não há contradição não-declarada a escalar** — o 106a já anotava a «navegação alvo»
como as 4 tabs. Aceitável.

### Migrações (A.4)
```
$ ls supabase/migrations/*.sql | wc -l → 18 ; nomes idênticos 1:1 à tabela A.4
```
⇒ **18/18 exactas.**

---

## 📋 Tabela de achados

| # | Sev | Achado | Tratamento proposto |
|---|---|---|---|
| B1 | ⚠️ grave (bloqueante) | **§A.3.1 linha 169 declara «Órfãos … — 26:» mas enumera 20** (+`schedule` no rodapé). O método naive do próprio doc (`0 hits em src/`) dá **20**. | Corrigir o cabeçalho para **20** (ou explicitar a definição que daria outro número). |
| B2 | ⚠️ grave (bloqueante) | **A.1 linha 81 `pontuacao`** dá consumidores `FeedbackLance.jsx:13` / `ProgressoBonus.jsx:6` — são **COMENTÁRIOS** sobre `_lib/pontuacao-utils.mjs`; **não há chamada** ao endpoint `pontuacao` em `src/` → é **órfão omitido** da A.3.1. | Mover `pontuacao` para órfãos; trocar a coluna «consumidor» por sítios de CHAMADA. |
| B3 | ⚠️ grave (bloqueante) | **A.1 linha 74 `comprar-passe`** e **A.3.3 (linhas 193-194)** afirmam consumidor (`useComprarPasse` «usa ambos»). `useComprarPasse.js:55` só chama `comprar-passe-pontos`; o teste do próprio repo `utac106c-carteira.test.mjs:114-118` **asserta que o ecrã NUNCA referencia `comprar-passe`**. `comprar-passe` é órfão de frontend. | Corrigir A.1 e A.3.3; acrescentar `comprar-passe` à A.3.1. |
| B4 | ⚠️ grave (bloqueante) | **§B.4 (linhas 337/340) dá `/excluir-conta`=1 e `/privacidade`=1 origem**; medido: **`/excluir-conta` ≥5** (Configuracoes:81, Privacidade:213/309, RegrasOficiais:294, Layout:38) e **`/privacidade` ≥6** (TermosConsentimento:214, ExcluirConta:131, MercadoLances:387, RegrasOficiais:269, Seguranca:27, Seguranca:28). A §B.5 **não lista** estas duplicações. Causa: o regex declarado exclui `<a href>` e arrays `href:`. | Alargar a extracção a `<a href="/…">` e `href:`; corrigir as contagens e a §B.5. |
| ℹ️-5 | ℹ️ nota | **§B.6(c) linha 403**: atribui a `MinhaCarteira.jsx:265` o gate «disabled enquanto `saldoReais < 2`»; o código é `disabled={!saldoReais}` (só 0/null), **não** `<2`. O `<2` vale para `:247`, não `:265`. | Reescrever a linha: `:247` = `<2`; `:265` = falsy. |
| ℹ️-6 | ℹ️ nota | **Coluna «Consumidor» da A.1 cita COMENTÁRIOS/prosa como se fossem chamadas** em ≥6 linhas: `voucher`(:630 é placeholder; A.3.3 admite 0 consumidor directo), `produtos`(CotaInativa:96/Termos:124 = prosa «produtos»), `pedidos`(CarrosselGUTO:21/Chatbot:110 = comentários; real: `MeusPedidos.jsx:27/82/176`), `cotas`(App.jsx:104/113 = comentários; reais: AppContext/CorpCarteira/…), `saldo-rs`(ComprarFichasModal:489/AppContext:235 = comentários; real: `AppContext.jsx:1017`), `edicoes`(EdicaoBanner:23/EdicaoCard:6 = comentários; real: `useEdicoes.js:138`). | Re-derivar a coluna por sítios de invocação (`apiGet/apiPost/fetch/chamarAdmin`), não por substring crua. |
| ℹ️-7 | ℹ️ nota | **Grafo §B.4 omite o modelo `lib/adminNav.js`** (10 `href:` das rotas-admin) e as entradas `Seguranca.jsx:27-28`. | Incluir `adminNav.js` no grafo. |
| ℹ️-8 | ℹ️ nota | **§B.5**: «só `App.jsx:398` usa `window.location`» — `App.jsx:147` também (`window.location.search`); e `App.jsx:360` tem `<a href="/">`. | Precisar a frase (contexto era só o retorno OAuth). |
| ℹ️-9 | ℹ️ nota | **§B.2** lista uma 5ª linha «(botão) Mais» dentro de `MAIN_TABS` :29-34, mas o array tem **4** entradas; «Mais» é `<button>`, não item do array. | Separar a linha «Mais» da tabela do array. |
| ℹ️-10 | ℹ️ nota | **A.5 `registar-palpite`** enumera códigos mas usa «503 …» e omite `502 palpite_falhou` (real: `:92`) e `400 edicaoId_invalido` (:86). `comprar-passe-pontos`: «502 debito_falhou\|creditar_pontos_falhou (com reembolso)» — só `creditar_pontos_falhou` reembolsa. | Completar a lista de códigos. |

---

## ❌ Alegações REFUTADAS (com prova)

1. **«§A.3.1 — Órfãos de frontend (0 hits em src/) — 26»** → a varredura do CORPUS dá **20** (naive) /
   21 (com `pontuacao`). O «26» não se reproduz por nenhum método. **(B1)**
2. **«A.1 #15 `pontuacao` consumido por `FeedbackLance.jsx:13`/`ProgressoBonus.jsx:6`»** → essas linhas
   são comentários sobre `_lib/pontuacao-utils.mjs`; `git grep "functions/pontuacao" -- src` = 0.
   `pontuacao` é **órfão**. **(B2)**
3. **«A.3.3 `comprar-passe` tem consumidor (`useComprarPasse` … usa ambos, medido no 106j-fix)»** →
   `useComprarPasse.js:55` chama só `comprar-passe-pontos`; `utac106c-carteira.test.mjs:114/118`
   (`assert.doesNotMatch(CART, /comprar-passe(?!-pontos)/)`) afirma o **oposto**. **(B3)**
4. **«§B.4 `/excluir-conta` = 1 origem», «`/privacidade` = 1 origem»** → ≥5 e ≥6 origens reais. **(B4)**
5. **«§B.6(c) `MinhaCarteira.jsx:265` disabled enquanto `saldoReais < 2`/null»** → o código é
   `disabled={!saldoReais}` (falsy), não `<2`. **(ℹ️-5)**

---

## ✅ Alegações que NÃO consegui refutar

- **83 endpoints** e a tabela **A.1 completa e 1:1** com o disco (sem fantasmas/omissões/duplicados). *(item a)*
- **Contratos §A.5** (`ler-pontos` 70 l., `comprar-passe-pontos` 113 l., `registar-palpite` 99 l.,
  `resgatar-cartao` 124 l.): auth, payload, saídas, códigos, idempotência, CAS, reembolso/rollback — **conformes**.
- **Todas as rotas §B.1** (linhas 444-522) e **todas as referências de linha** de BottomNav/Sidebar/
  MinhaCarteira/EdicaoBanner/EdicaoCard/ChatbotWidget/CorporativoDashboard/Dashboard — **exactas**.
- **4 caminhos mortos** (`/edicao/:id`, `/corp`, `/redirect`, `/menor-lance-unico`) — **sem botão**, confirmado. *(item d)*
- **Sem badge «NOVO»** e **depósito R$2 não cria notificação** (`grep notificac` = 0 em
  `confirmar-pagamento`/`webhook-mercadopago`/`saldo-rs`/`_lib/saldoRs.mjs`). *(item f)*
- **18 migrações** Supabase (1:1 com A.4). *(item a)*
- **Suíte e baseline**: `774/774` + `1061/1067` → `VEREDITO: VERDE`, `< /dev/null`. *(item h/baseline)*
- **Drift vs 106a** é declarado e consistente com o histórico git (106b/106c/106h). *(item e)*
- **Nenhum ficheiro de código alterado** (`git status` limpo de tracked em wt e main). *(item h)*

---

## 🚫 O que NÃO mediste (e porquê)

- **Rede/deploy**: `GET /` 200, `/health` 200 e «saldo API US$ 3,22» — não fiz chamadas HTTP externas
  (fora do escopo de leitura local; não validado aqui).
- **Correcção semântica das 18 migrações** (tabelas/índices por ficheiro): contei-os e comparei nomes,
  mas **não** abri cada `.sql` a confirmar tabelas e nº de índices.
- **Execução visual** dos ecrãs (glass, cores, touch targets) — é escopo do `107a-front`, não medido.
- **Varredura exaustiva de `<button onClick>` sem navegação** nos 38 ecrãs (§B.6(b) do doc admite ser
  «por leitura») — não a reproduzi a 100%.
- **Todos os 83 consumidores** da A.1 — verifiquei uma amostra representativa (>20) + os 6 suspeitos;
  não re-derivei as 83×2 células.

---

## 🧭 Decisão

**PARCIAL (4 bloqueantes).** Não recomendo aceitar o documento como está para handoff ao `107a-front`:
o mapa de CONTRATOS é fiável (A.1 83/83, A.5 conforme, 18 migrações certas), mas o bloco
**órfãos/duplicações** tem 4 defeitos mensuráveis que induziriam o front em erro:
o «26» fantasma (B1), `pontuacao` e `comprar-passe` mal classificados (B2/B3), e as contagens de
`/privacidade` e `/excluir-conta` (B4).

**Correcção mínima para APROVADO:** (i) trocar «26»→«20» e acrescentar `pontuacao`+`comprar-passe` aos
órfãos; (ii) reescrever A.3.3 para `comprar-passe` = órfão; (iii) alargar a §B.4 a `<a href>`/`href:` e
corrigir as contagens e a §B.5; (iv) os ℹ️-5 a ℹ️-10 como polimento. **Nenhuma alteração exige mexer em
código de produção** — são correcções do próprio documento de mapeamento.

---

## ➕ Anexo — achados suplementares (2.ª passagem adversarial)

### Confirmações extra (subsídios ao veredicto)
- **§A.2 soma = 83** (Via A 15 + Via B 6 + Core 14 + Pagto 6 + Corp 5 + Admin 23 + Infra 14) — bate com a A.1.
- **§A.0 «root `netlify/functions/` está vazio»** — confirmado no repo de referência (`ls -la netlify/functions/` → `total 0`; `.netlify/` é git-ignored).
- **`App.jsx:495-509` (admin + 10 filhas)** — confirmado exacto (`/admin` em 495, filhas 496-508, `</Route>` 509).

### Reforço do B4 (mesma causa-raiz: `<a href>`/arrays fora do regex)
As contagens de «Nº origens» da §B.4 e a lista §B.5 **subcontam sistematicamente** os destinos que
têm origens em **arrays de dados** e em **`<a href>`**:

| Destino | Declarado (§B.4 / §B.5) | Medido | Origem em falta |
|---|---|---|---|
| `/corporativo/cotas` | **1** (só `CotaInativa.jsx:124`) e **ausente da §B.5** | **4** | `CorporativoDashboard.jsx:347`, `BottomNav.jsx:78`, `Sidebar.jsx:62` |
| `/corporativo/carteira` | **2** (`CotaInativa:102`, `CorporativoCotas:50`) | **3** | `CorporativoDashboard.jsx:350` |
| `/privacidade` | **1** (`RegrasOficiais:269`) | **≥6** | `TermosConsentimento:214`, `ExcluirConta:131`, `MercadoLances:387`, `Seguranca:27/28` |
| `/excluir-conta` | **1** (`RegrasOficiais:294`) | **≥5** | `Configuracoes:81`, `Privacidade:213/309`, `Layout:38` |

⇒ `ℹ️-11`: «§B.5 Duplicações de caminho» lista 9 destinos; **faltam pelo menos `/corporativo/cotas`,
`/corporativo/carteira`, `/privacidade` e `/excluir-conta`** (todos com ≥3 origens). O bloco de
duplicações — que é um dos produtos esperados pelo `107a-front` — está incompleto para o mundo corporativo
e para as rotas legais/LGPD.


---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: PARCIAL — 4 bloqueantes.** Aceite integralmente. Os 4 bloqueantes foram corrigidos **no
próprio documento de mapeamento** (nenhuma correcção exige tocar em código de produção).

| Achado | Tratamento aplicado |
|---|---|
| **B1** — «órfãos — 26» ≠ medido | **Corrigido para 25**, com a **definição reescrita**: «sítio de chamada» = literal de invocação (entre quotes/backtick ou `/.netlify/functions/<ep>`), **com comentários removidos**. O método anterior (substring crua) contava comentários como consumidores. Lista explícita dos 25. |
| **B2** — `pontuacao` mal classificada | **Corrigido**: `pontuacao` passou a **órfão** (os «hits» eram comentários sobre `_lib/pontuacao-utils.mjs`). |
| **B3** — `comprar-passe` com consumidor inexistente | **Corrigido**: `comprar-passe` é **órfão de frontend** (`useComprarPasse.js:55` chama só `comprar-passe-pontos`). A alegação antiga fica **à vista, marcada REFUTADA** na §A.3.3. |
| **B4** — subcontagem `/privacidade` e `/excluir-conta` | **Corrigido**: extractor **alargado a `<a href>` e arrays `href:`**; `/privacidade` 1→**6**, `/excluir-conta` 1→**5**; `/corporativo/cotas` e `/corporativo/carteira` acrescentados à §B.5. |
| **ℹ️-5** — gate de `MinhaCarteira.jsx:265` | **Corrigido**: `:247` = `< 2`; `:265` = falsy (0/`null`). |
| **ℹ️-6** — coluna «Consumidor» citava comentários | **Fechado com a causa medida**: a coluna A.1 passou a **«Sítios de chamada em `src/`»** (chamadas reais, comentários excluídos). |
| **ℹ️-7** — `lib/adminNav.js` fora do grafo | **Corrigido**: as 10 rotas-admin (`href:` de `adminNav.js`) e as entradas de `Seguranca.jsx:27-28` entraram no grafo §B.4. |
| **ℹ️-8** — `window.location` | **Precisado**: `App.jsx:398` (OAuth) + `:147` (`window.location.search`) + `:360` (`<a href="/">`). |
| **ℹ️-9** — «Mais» dentro de `MAIN_TABS` | **Corrigido**: nota explícita de que `MAIN_TABS` tem **4** entradas e «Mais» é `<button>` separado. |
| **ℹ️-10** — códigos incompletos | **Corrigido**: `registar-palpite` +`400 edicaoId_invalido`+`502 palpite_falhou`; `comprar-passe-pontos` distingue `502 debito_falhou` (sem reembolso — antes de debitar) de `502 creditar_pontos_falhou` (com reembolso). |
| **ℹ️-11** — §B.5 incompleta | **Fechado** (mesma correcção do B4). |

**Erros dos meus PRÓPRIOS instrumentos (declarados):**
1. **Contagem de consumidores por substring crua** — contava **comentários** como consumidores
   (`pontuacao`, `comprar-passe`, `consolidar-lances`, `renovacao-adesao`, `voucher`, `produtos`, `pedidos`,
   `cotas`, `saldo-rs`, `edicoes`). Causa-raiz dos B1/B2/B3/ℹ️-6. Corrigido: extrator por **sítio de invocação**.
2. **Extractor de navegação sem `<a href>`/`href:`** — subcontava duplicações legais/LGPD (B4/ℹ️-11).
3. **`strip_comments` inicial removia blocos `/* */` apagando newlines** e **deslocava** os `ficheiro:linha`
   (apanhado por medição própria: `App.jsx:470` passou a `:431`). Corrigido preservando a contagem de linhas
   **antes** de publicar as contagens — é exactamente a classe de erro que a §13 do protocolo descreve.
4. **Cabeçalho «26» sem medição** — número publicado sem a varredura que o sustentasse (B1).

**Correcções pós-veredicto: NÃO re-validadas** (sem 2.ª ronda). Declarado por GATE 11.
