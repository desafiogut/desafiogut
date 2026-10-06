# UTAC107a-back — Mapeamento de Contratos + Navegação

**Tipo:** mapeamento puro (sem alteração de código) · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-05 · **Modelo:** deepseek-v4-flash (Hermes Agent) · **HEAD:** `f498fde` (= `origin/main`).

> **Objectivo:** fornecer ao **UTAC107a-front** (Opus 5.5) o mapa dos CONTRATOS (endpoints, payloads,
> auth, migrações) e da NAVEGAÇÃO (botões → destinos, duplicações, caminhos mortos, indicador «novo»)
> do app actual. **Zero** alteração de código de produção. A entrega é este documento.
>
> **Não repete o `_logs/UTAC106a-mapeamento.md`** (o mapa estático por ecrã: BottomNav/Sidebar/Layout/
> AppLayout/App.jsx/Carteira/Lances/AppContext/i18n). O 107a-back mede o que o 106a **não** mediu:
> contratos de endpoint e o grafo de navegação botão→destino.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Data/hora de arranque | 2026-10-05 22:18 | `date +"%H:%M"` |
| `HEAD` | `f498fded2ecc929e0d3fd66dbb3f712d85d7b82a` | `git rev-parse HEAD` |
| `origin/main` | `f498fded…` (**== HEAD**, 0/0) | `git rev-parse origin/main` |
| Último commit | `f498fde docs(UTAC106j-fix): declara o vazamento de npm install do validador via junction A13` | `git log -1 --oneline` |
| Sujeira (tracked) | **0** | `git status --porcelain \| grep -v '^??'` |
| Suíte (HI1) | **frontend VERDE 774/774 · backend VERDE 1061/1067** → `VEREDITO: VERDE` | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Deploy (site) | `https://silly-stardust-ca71bc.netlify.app/` → **200** | `curl -s -o /dev/null -w '%{http_code}'` |
| Deploy (`/health`) | **200** | `curl` |
| Saldo API (arranque) | **US$ 3,22** | `curl /user/balance` |

**Suíte e HEAD coincidem** com o esperado do enunciado (774/774 · 1061/1067 · `f498fde`) ⇒ ambiente não
alterado, RESSALVA 6 satisfeita. A suíte correu com `< /dev/null` (HARD GATE 1 · HI1).

> ⚠️ **Sonda de path inexistente na SPA.** `GET /nao-existe-xyz` devolve **200** (não 404): o
> `netlify.toml` tem `[[redirects]] from="/*" to="/index.html" status=200` — qualquer path desconhecido
> cai no `index.html` (a SPA resolve no cliente). Consequência de medição: a existência de um **endpoint**
> prova-se por `/.netlify/functions/<nome>` (aí sim, nome inexistente → 404), **nunca** por um path de rota.

**Divergência de arranque declarada:** o enunciado cita saldo **US$ 3,46**; medido **US$ 3,22** (drift de
≈0,24 desde o fecho do 106j-fix — consistente com o Δ medido nesse UTAC). Registado, não corrigido.

---

## §Frente A — Contratos (SEG0)

### A.0 Inventário e método

- **83 endpoints** (`ls <repo>/desafio-gut/frontend/netlify/functions/*.mjs | grep -v _tests | grep -v _lib`).
- **Diretório real:** `desafio-gut/frontend/netlify/functions/` (o `netlify.toml` da raiz resolve
  `base = "desafio-gut/frontend"` e `[functions] directory = "netlify/functions"`). O `netlify/functions/`
  da **raiz** está **vazio** (só o `.netlify/functions-serve/` de rascunho local existe).
- **Padrão de runtime:** funções Netlify **v2** (`export default async (req) => …`), método lido de
  `req.method !== "…"`; `OPTIONS`/CORS por `respostaPreflight(req)` de `_lib/cors.mjs` (todas as que
  respondem a browser). Erros em `snake_case` (`jsonError(status, codigo, msg)`, `_lib/validate.mjs`).
- **Auth:** `verificarUserSession` (`_lib/jwt.mjs`, aceita `user-session`/`admin-access`) e
  `verificarLanceAuth` (`lance-auth`) — medido no 106j-fix. `admin` = `_lib/admin-auth.mjs`; `mfa` =
  `_lib/require-mfa.mjs`; `admin-token` = comparação com `ADMIN_TOKEN` (cron/back-office).
- **Contrato por ficheiro:** cada endpoint tem **docblock de topo** com método, path, payload, resposta e
  códigos HTTP — é a fonte citada nas tabelas abaixo.

> ⚠️ **Método: leitura dupla.** A coluna «Método» vem do **código** (`req.method !==`). Endpoints com `—`
> não fazem check explícito de método (ou verificam-no de forma indirecta) — listados assim, não inferidos.

### A.1 Tabela de endpoints

| # | Path | Método | Auth | Via | Sítios de chamada em `src/` |
|---|---|---|---|---|---|
| 1 | `apurar-palpite` | POST | admin | Via B | **órfão** |
| 2 | `comprar-passe-pontos` | POST | user-session | Via B | hooks/useComprarPasse.js:55 |
| 3 | `cupons` | GET/PUT | user-session,admin | Via B | pages/CorporativoCupons.jsx:40<br>pages/CorporativoCupons.jsx:58 |
| 4 | `ler-pontos` | GET | user-session | Via B | hooks/usePontos.js:33 |
| 5 | `registar-palpite` | POST | user-session | Via B | hooks/usePalpite.js:39 |
| 6 | `resgatar-cartao` | POST | user-session | Via B | hooks/useResgatarCartao.js:53 |
| 7 | `auth-lance` | POST | público | Via A | components/CardLance.jsx:120<br>hooks/useTrocarPorSenhas.js:45 |
| 8 | `comprar-passe` | POST | user-session | Via A | **órfão** |
| 9 | `comprar-senhas` | POST | lance-auth,mfa | Via A | hooks/useTrocarPorSenhas.js:58 |
| 10 | `consolidar-lances` | POST | admin | Via A | **órfão** |
| 11 | `edicoes` | — | admin | Via A | hooks/useEdicoes.js:138<br>pages/admin/Pedidos.jsx:120 |
| 12 | `lance-relampago` | POST | lance-auth,mfa | Via A | components/CardLance.jsx:206 |
| 13 | `lances-flash` | GET | público | Via A | components/edicao-especial/useResultadoEspecial.js:58<br>context/AppContext.jsx:791 (+1) |
| 14 | `minhas-participacoes` | GET | user-session | Via A | hooks/useMinhasParticipacoes.js:31 |
| 15 | `pontuacao` | POST | admin | Via A | **órfão** |
| 16 | `purge-lances` | POST | admin | Via A | context/AppContext.jsx:743 |
| 17 | `ranking` | GET | user-session | Via A | hooks/useFeedback.js:64<br>hooks/useRanking.js:68 (+1) |
| 18 | `saldo-senhas` | GET | user-session | Via A | context/AppContext.jsx:863<br>context/AppContext.jsx:868 |
| 19 | `troco` | — | user-session,lance-auth | Via A | pages/CorporativoCarteira.jsx:92<br>pages/CorporativoCarteira.jsx:146 |
| 20 | `voucher` | — | user-session,lance-auth,admin,mfa | Via A | **órfão** |
| 21 | `wallet` | — | user-session,admin,mfa | Via A | PrivyRoot.jsx:130<br>components/WalletCard.jsx:53 (+2) |
| 22 | `analytics` | POST | público | Core | lib/analytics.js:13 |
| 23 | `auth-user` | POST | público | Core | context/AppContext.jsx:921 |
| 24 | `chatbot` | POST | user-session,admin | Core | components/ChatbotWidget.jsx:367 |
| 25 | `consentimento` | GET/POST | user-session | Core | lib/consentimento.js:48 |
| 26 | `delete-account` | POST | user-session | Core | components/ExcluirContaModal.jsx:47 |
| 27 | `exportar-dados` | POST | user-session | Core | **órfão** |
| 28 | `health` | GET | admin | Core | **órfão** |
| 29 | `img-proxy` | GET | público | Core | lib/imagem.js:22 |
| 30 | `notificacoes` | GET | user-session,admin | Core | App.jsx:502<br>context/AppContext.jsx:1062 (+3) |
| 31 | `pedidos` | — | user-session,admin | Core | App.jsx:508<br>components/meus-ativos/MeusPedidos.jsx:27 (+8) |
| 32 | `produtos` | — | user-session,admin | Core | pages/CorporativoDashboard.jsx:170<br>pages/CorporativoDashboard.jsx:249 (+6) |
| 33 | `recursos-app` | GET | público | Core | hooks/useRecursosApp.js:126 |
| 34 | `referral` | — | user-session | Core | components/PainelIndicacao.jsx:43<br>components/ReferralRegistrar.jsx:64 |
| 35 | `saldo-rs` | GET | user-session | Core | context/AppContext.jsx:1017<br>context/AppContext.jsx:1023 (+1) |
| 36 | `confirmar-pagamento` | POST | público | Pagto | components/ComprarFichasModal.jsx:23<br>pages/CorporativoCarteira.jsx:127 |
| 37 | `debug-pedido` | GET | público | Pagto | **órfão** |
| 38 | `info-pagamento` | GET | público | Pagto | **órfão** |
| 39 | `iniciar-pagamento` | POST | público | Pagto | components/ComprarFichasModal.jsx:22 |
| 40 | `webhook-frenet` | POST | público | Pagto | **órfão** |
| 41 | `webhook-mercadopago` | POST | público | Pagto | **órfão** |
| 42 | `banners` | — | lance-auth,admin | Corp | components/BannerCard.jsx:36<br>components/BannerUpload.jsx:97 (+5) |
| 43 | `corporativo-analytics` | GET | user-session | Corp | pages/CorporativoAnalytics.jsx:37<br>pages/CorporativoBanners.jsx:52 (+1) |
| 44 | `cotas` | — | user-session,admin | Corp | App.jsx:507<br>context/AppContext.jsx:479 (+14) |
| 45 | `iniciar-cota` | POST | público | Corp | pages/CorporativoCarteira.jsx:105 |
| 46 | `renovacao-adesao` | — | user-session,admin | Corp | **órfão** |
| 47 | `admin-alerts` | GET | admin | Admin | pages/admin/VisaoGeral.jsx:110 |
| 48 | `admin-aprovacao` | — | user-session,admin,mfa | Admin | pages/admin/Aprovacoes.jsx:38<br>pages/admin/Aprovacoes.jsx:56 |
| 49 | `admin-commands` | POST | admin | Admin | pages/admin/Operacoes.jsx:97 |
| 50 | `admin-config` | GET | admin | Admin | pages/admin/ConfiguracoesAdmins.jsx:80<br>pages/admin/ConfiguracoesAdmins.jsx:89 |
| 51 | `admin-financeiro-relatorio` | GET | admin | Admin | pages/admin/GestaoFinanceira.jsx:62 |
| 52 | `admin-financeiro-resumo` | GET | admin | Admin | pages/admin/GestaoFinanceira.jsx:38 |
| 53 | `admin-financeiro-transacoes` | GET | admin | Admin | pages/admin/GestaoFinanceira.jsx:39 |
| 54 | `admin-list` | — | admin | Admin | hooks/useAdmin.js:123<br>pages/admin/ConfiguracoesAdmins.jsx:30 (+1) |
| 55 | `admin-logs` | GET | admin | Admin | pages/admin/LogsAuditoria.jsx:45<br>pages/admin/LogsAuditoria.jsx:64 |
| 56 | `admin-notifications` | GET | admin | Admin | pages/admin/Comunicacao.jsx:34 |
| 57 | `admin-notify` | POST | admin | Admin | pages/admin/Comunicacao.jsx:49 |
| 58 | `admin-onchain` | GET | admin | Admin | pages/admin/GestaoFinanceira.jsx:41<br>pages/admin/VisaoGeral.jsx:35 (+2) |
| 59 | `admin-queue` | GET | admin | Admin | pages/admin/Operacoes.jsx:78<br>pages/admin/Operacoes.jsx:106 |
| 60 | `admin-series` | GET | admin | Admin | pages/admin/GestaoFinanceira.jsx:40<br>pages/admin/VisaoGeral.jsx:100 |
| 61 | `admin-sessions` | GET | admin | Admin | pages/admin/ConfiguracoesAdmins.jsx:56 |
| 62 | `admin-sessions-revoke` | POST | admin | Admin | pages/admin/ConfiguracoesAdmins.jsx:66 |
| 63 | `admin-stats` | GET | admin | Admin | pages/admin/VisaoGeral.jsx:71 |
| 64 | `admin-status` | GET | admin | Admin | pages/admin/Operacoes.jsx:77 |
| 65 | `admin-user` | GET | admin | Admin | pages/admin/PerfilUsuario.jsx:43 |
| 66 | `admin-user-ajuste` | POST | admin | Admin | pages/admin/PerfilUsuario.jsx:82 |
| 67 | `admin-user-bloqueio` | POST | admin | Admin | pages/admin/PerfilUsuario.jsx:61 |
| 68 | `admin-users` | GET | admin | Admin | pages/admin/GestaoUsuarios.jsx:71 |
| 69 | `auth-admin` | POST | admin,admin-token | Admin | lib/adminAuth.js:27 |
| 70 | `backup-blobs` | — | admin | Infra/Cron | **órfão** |
| 71 | `backup-blobs-scheduled` | — | público | Infra/Cron | **órfão** |
| 72 | `cron-reset-programado` | — | admin | Infra/Cron | **órfão** |
| 73 | `fila-processor-scheduled` | — | público | Infra/Cron | **órfão** |
| 74 | `ia-preditiva-scheduled` | — | público | Infra/Cron | **órfão** |
| 75 | `mc302-aceitar` | — | público | Infra/Cron | **órfão** |
| 76 | `mc302-diagnostico` | — | público | Infra/Cron | **órfão** |
| 77 | `monitor-onchain` | — | admin | Infra/Cron | **órfão** |
| 78 | `monitor-onchain-scheduled` | — | público | Infra/Cron | **órfão** |
| 79 | `purge-logs` | — | admin,admin-token | Infra/Cron | **órfão** |
| 80 | `purge-logs-scheduled` | — | público | Infra/Cron | **órfão** |
| 81 | `schedule` | — | admin | Infra/Cron | data/programacao-junho-2026.js:86 |
| 82 | `scheduled-anuncio-especial` | — | público | Infra/Cron | **órfão** |
| 83 | `scheduled-encerrar-especial` | — | público | Infra/Cron | **órfão** |
### A.2 Categorização

| Categoria | Nº | Definição |
|---|---|---|
| **Via A** (senhas on-chain / leilão) | 15 | pipeline de lance on-chain: `comprar-senhas`→`lance-relampago`; senhas, troco, voucher, ranking, edições |
| **Via B** (programa de fidelidade) | 6 | Passe R$ 2,00 → pontos → cartão: `comprar-passe-pontos`, `ler-pontos`, `registar-palpite`, `resgatar-cartao`, `cupons`, `apurar-palpite` |
| **Core** (conta/infra partilhada) | 14 | `auth-user`, `saldo-rs`, `notificacoes`, `recursos-app`, `consentimento`, LGPD, `produtos`, `pedidos`, `chatbot`, `analytics`… |
| **Pagto** (mercado pago / frete) | 6 | `iniciar-pagamento`, `confirmar-pagamento`, `info-pagamento`, webhooks |
| **Corp** (lojista) | 5 | `cotas`, `corporativo-analytics`, `banners`, `iniciar-cota`, `renovacao-adesao` |
| **Admin** (painel ADM) | 23 | `admin-*` + `auth-admin` (RBAC + MFA) |
| **Infra/Cron** | 14 | `*-scheduled`, `cron-reset-programado`, `schedule`, `mc302-*`, `backup-blobs`, `monitor-onchain`, `purge-logs` |

### A.3 Endpoints órfãos · duplicados · legado

**Consumidor = literal de endpoint em `src/**` (grep).** «Órfão de frontend» = **0 hits** em `src/` —
não significa «não usado»: pode ser consumido por **cron/schedule** (o próprio handler é o único
consumidor) ou por terceiros (webhook).

**Órfãos de frontend (0 sítio de chamada em `src/`) — **25**:

`apurar-palpite` · `backup-blobs` · `backup-blobs-scheduled` · `comprar-passe` · `consolidar-lances` · `cron-reset-programado` · `debug-pedido` · `exportar-dados` · `fila-processor-scheduled` · `health` · `ia-preditiva-scheduled` · `info-pagamento` · `mc302-aceitar` · `mc302-diagnostico` · `monitor-onchain` · `monitor-onchain-scheduled` · `pontuacao` · `purge-logs` · `purge-logs-scheduled` · `renovacao-adesao` · `scheduled-anuncio-especial` · `scheduled-encerrar-especial` · `voucher` · `webhook-frenet` · `webhook-mercadopago`.

> **Definição de «órfão» usada (corrigida):** endpoint **sem nenhum sítio de chamada** em `src/` — a
> busca é por **literal de invocação** (entre `"`/`'`/`` ` ``, ou caminho `/.netlify/functions/<ep>`),
> com **linhas de comentário removidas** (o `strip` preserva a numeração). Método anterior (substring
> crua) contava **comentários** como consumidores — **defeito corrigido** (o validador refutou-o).
> Não significa «não usado»: `*-scheduled` são invocados pelo **agendador Netlify**; `webhook-*` por
> **Mercado Pago / Frenet**; `health` é sonda de infra.

**A.3.2 Duplicações funcionais (mesma função em 2+ endpoints):**

| Par | O que duplica | Delta medido |
|---|---|---|
| `comprar-passe` × `comprar-passe-pontos` | compra de Passe por R$ 2,00 | **Via A** (senha) vs **Via B** (ponto). `comprar-passe` está **órfão de frontend** (só comentários o citam); o chamado é `comprar-passe-pontos`. O 107a-back **não** decide qual fica |
| `saldo-senhas` × `saldo-rs` | saldo do titular | `saldo-senhas` = on-chain (senhas); `saldo-rs` = off-chain (R$, blob `saldo-rs`). Modelo dual, **não** é duplicação |
| `minhas-participacoes` × `ranking` × `pontuacao` | estado de participação/pontos | 3 endpoints do mesmo domínio; `pontuacao` está **órfão** (só comentários); `ranking`/`minhas-participacoes` têm hooks |
| `lances-flash` × `edicoes` | leitura de edições | `lances-flash` = flash (`useResultadoEspecial.js:58`); `edicoes` = genérico (`useEdicoes.js:124`) |
| `admin-list` × `admin-users` × `admin-user` | listar/ler utilizadores | wrapper (`useAdmin.js:123`) vs páginas directas (`GestaoUsuarios.jsx:71`) |

**A.3.3 Legado Via A já não chamado pelo frontend (candidatos, não decididos):**

- **`comprar-passe`** (Via A) — **órfão de frontend**. O `useComprarPasse.js:55` chama **só**
  `comprar-passe-pontos`; o teste do repo (`utac106c-carteira.test.mjs`) **asserta** que o ecrã nunca
  referencia `comprar-passe`. ⚠️ **Alegação anterior REFUTADA pelo validador** (o doc dizia «usa ambos»).
- `voucher` (Via A) — **órfão**; só aparece em prosa/comentários.
- `consolidar-lances`, `renovacao-adesao`, `pontuacao` (Via A) — **órfãos** (só comentários).
- `troco` — **usado só no painel corporativo** (`CorporativoCarteira.jsx:92/146`); no fluxo de consumo
  o troco é automático (`_lib/troco-senhas.mjs`).

> **RESSALVA 3 / GATE 12:** o 107a-back **regista**, não decide. Nenhum endpoint é marcado «para remover».

### A.4 Migrações Supabase (18)

`desafio-gut/frontend/supabase/migrations/` (nenhuma alterada neste UTAC):

| Ficheiro | Tabela(s) criada(s)/alterada(s) | Índices |
|---|---|---|
| `20260620_amend_jsonb_payload.sql` | `config_remota`, `lances` | 0 |
| `20260620_schema_definitivo.sql` | `config_remota`, `lances`, `lojistas`, `produtos` | 3 |
| `20260621_cotas_schema.sql` | `cota_fingerprints`, `cotas`, `cotas_pagas` | 4 |
| `20260621_enable_realtime_config.sql` | `config_remota` | 0 |
| `20260621_saldo_troco_wallet_schema.sql` | `saldo_rs`, `saldo_rs_creditos`, `saldo_rs_debitos`, `troco_senhas`, `wallet`, `wallet_idem` | 0 |
| `20260629_fila_tarefas.sql` | `fila_tarefas` | 1 |
| `20260629_indices_escalabilidade.sql` | — | 5 |
| `20260629_materialized_views.sql` | — | 2 |
| `20260722_mc87_hardening_reservar_tarefas.sql` | — | 0 |
| `20260726_mc8829_fila_tarefas_corrigida.sql` | `fila_tarefas`, `public.fila_tarefas` | 1 |
| `20260802_mc8943_atividade_utilizadores.sql` | `atividade_utilizadores` | 1 |
| `20260923_mc93b_pontuacoes.sql` | `public.pontuacoes`, `public.rankings_ciclo` | 4 |
| `20260930_mc105a_passes.sql` | `public.passes` | 2 |
| `20260930_mc105a_passes_saneamento.sql` | `public.passes` | 0 |
| `20260930_mc105a_passes_saneamento_unique.sql` | `public.passes` | 1 |
| `20261004_mc106dv2_pontos.sql` | `public.pontos` | 1 |
| `20261005_mc106f_palpites.sql` | `public.palpites` | 1 |
| `20261006_mc106g_resgates.sql` | `public.resgates` | 2 |

### A.5 Contratos chave

**`GET /ler-pontos`** (`ler-pontos.mjs:1-70`) — leitura dos pontos do TITULAR.
- **Auth:** token `user-session` no header `Authorization` (o `endereco` sai do token, nunca do query). **Entrada:** sem corpo.
- **Saída 200:** `{ ok, pontos, pontosCartao, bonusPalpite, pontosParaCartao, podeResgatarCartao, historico[], palpites[] }` (`palpites[i] = { edicaoId, valor, criadoEm, apurado, resultado }`).
- **⚠️ R1:** `pontos` = TOTAL; `pontosCartao` = só COMPRA/RESGATE (o cartão conta **só** estes).
- **Códigos:** `401 token_ausente|token_invalido` · `405 metodo_invalido` · `503 sistema_pausado|store_indisponivel`.

**`POST /comprar-passe-pontos`** (`comprar-passe-pontos.mjs:1-113`) — Passe R$ 2,00 → 1 ponto.
- **Auth:** `Bearer <user-session>`. **Entrada:** `{ idempotencyKey }` (ou header `x-idempotency-key`, regex `^[A-Za-z0-9._:-]{8,200}$`).
- **Saída 201:** `{ ok, idempotent:false, pontos, saldoRsAntesCentavos, saldoRsDepoisCentavos }` · **200:** `{ ok, idempotent:true, pontos }`.
- **Códigos:** `400 idempotencyKey_invalida` · `401 token_*` · `402 saldo_insuficiente` · `405 metodo_invalido` · `502 debito_falhou` (**sem** reembolso — falha ANTES de debitar) | `502 creditar_pontos_falhou` (**com** reembolso) · `503 sistema_pausado|store_indisponivel`.
- **Fluxo:** idempotência → débito atómico CAS (`saldoRs.mjs`) → crédito → **reembolso** em qualquer falha pós-débito.

**`POST /registar-palpite`** (`registar-palpite.mjs:1-99`) — palpite do Passe (BÓNUS).
- **Auth:** `Bearer <user-session>`. **Entrada:** `{ edicaoId, valor }` (chave natural `(endereco, edicaoId)`).
- **Validações:** `edicaoId` string; `valor` inteiro `0 ≤ v ≤ 1 000 000` (`Number.isInteger`); edição **existe** e é `tipo=="programado"` e `status=="aberto"`.
- **Saída 201:** `{ ok, idempotent:false, palpites }` · **200:** `{ ok, idempotent:true }`.
- **Códigos:** `400 edicaoId_invalido` (`:86`)|`valor_invalido` · `401 token_*` · `404 edicao_inexistente` · `405 metodo_invalido` · `409 sem_passe|edicao_apurada|edicao_nao_programada|edicao_nao_aberta` · `502 palpite_falhou` (`:92`) · `503 sistema_pausado|store_indisponivel`.
- **⚠️** o palpite **NÃO decide** o cartão (Google Play · jogo de habilidade).

**`POST /resgatar-cartao`** (`resgatar-cartao.mjs:1-124`) — 50 pontos → 1 cartão.
- **Auth:** `Bearer <user-session>`. **Entrada:** `{ cartaoId, morada, idempotencyKey }` (`morada` pelo MESMO `validarMorada` de `_lib/pedidos.mjs`: nome, cpf, cep, logradouro, numero, complemento?, bairro, cidade, uf, telefone?).
- **Saída 201:** `{ ok, idempotent:false, resgateId, status:"pendente", pontos }` · **200** idempotente.
- **Códigos:** `400 morada_invalida|cartao_invalido|idempotencyKey_invalida` · `401 token_*` · `402 pontos_insuficientes` · `405 metodo_invalido` · `502 resgate_falhou` (rollback) · `503 …`.
- **Fluxo:** idempotência → gate `podeResgatarCartaoComCompra()` → **débito atómico (50)** → registo em `public.resgates` → **rollback** se falhar. Notifica o titular (fail-soft, `:111`).

---

## §Frente B — Navegação (SEG1)

> **Pré-aviso de drift vs 106a (RESSALVA 5).** O `UTAC106a-mapeamento.md` descreve a navegação **pré-106b**
> (`Início · Carteira · Lances · Mais`, 3 tabs). O **UTAC106b** reordenou para
> **`Carteira · Menor Lance Único · Início · Ofertas Programadas · Mais`** (4 tabs). Isto **não é
> contradição** — é a evolução declarada do 106b/106c/106h. O 107a-back regista o estado **actual**
> (HEAD `f498fde`) e **deixa à vista** o que o 106a dizia, para leitura. **Não há conflito a escalar.**

### B.1 Rotas registadas (`src/App.jsx`)

| Path | Elemento | Categoria | Linha |
|---|---|---|---|
| `/excluir-conta` | ExcluirConta | pública (fora do AppLayout) | `App.jsx:444` |
| `/privacidade` | Privacidade | pública (fora do AppLayout) | `App.jsx:447` |
| `/cadastro` | Cadastro | pública (fora do AppLayout) | `App.jsx:450` |
| `/login-email` | LoginEmail | pública (fora do AppLayout) | `App.jsx:451` |
| `/redirect` | EntradaOAuth | pública (fora do AppLayout) | `App.jsx:455` |
| `/` | DashboardOuCorporativo | autenticada | `App.jsx:460` |
| `/carteira` | MinhaCarteira | autenticada | `App.jsx:461` |
| `/mercado` | MercadoLances | autenticada (canónica do Menor Lance Único) | `App.jsx:462` |
| `/menor-lance-unico` | `<Navigate to="/mercado">` | alias (redirect) | `App.jsx:470` |
| `/ofertas-programadas` | OfertasProgramadas | autenticada (Via B) | `App.jsx:474` |
| `/vitrine` | Vitrine | autenticada | `App.jsx:475` |
| `/vitrine/:slot` | Vitrine | autenticada | `App.jsx:476` |
| `/produto/:id` | DetalheProduto | autenticada | `App.jsx:478` |
| `/edicao/:id` | EdicaoDetalhe | autenticada | `App.jsx:480` |
| `/programacao` | ScheduleView | autenticada | `App.jsx:481` |
| `/ativos` | MeusAtivos | autenticada | `App.jsx:482` |
| `/seguranca` | Seguranca | gated `CorporativoRoute` | `App.jsx:485` |
| `/configuracoes` | Configuracoes | autenticada | `App.jsx:486` |
| `/regras-oficiais` | RegrasOficiais | autenticada | `App.jsx:489` |
| `/admin (+ 10 filhas)` | AdminLayout | gated `AdminAuthProvider` | `App.jsx:495-509` |
| `/seja-nosso-parceiro` | SejaNossoParceiro | pública (dentro do AppLayout) | `App.jsx:511` |
| `/corp` | CorporativoDashboard | pública (pós-cadastro) | `App.jsx:513` |
| `/corporativo` | CorporativoDashboard | gated `CorporativoRoute` | `App.jsx:515` |
| `/corporativo/cotas · /banners · /analytics · /cupons · /carteira · /mercado` | Corporativo* | gated `CorporativoRoute` | `App.jsx:516-522` |

### B.2 BottomNav (mobile) — `src/widgets/layout/BottomNav.jsx` (394 linhas)

- **`MAIN_TABS`** (`BottomNav.jsx:29-34`) — ordem de renderização:

| # | `path` | Rótulo | `end` | `ariaLabel` |
|---|---|---|---|---|
| 1 | `/carteira` | Carteira | false | Ir para Minha Carteira |
| 2 | `/mercado` | Menor Lance Único | false | Ir para Menor Lance Único |
| 3 | `/` | Início | true | Ir para Dashboard |
| 4 | `/ofertas-programadas` | Ofertas Programadas | false | Ir para Ofertas Programadas |
| 5 | (botão) | Mais | — | Mais opções |

- **`SECONDARY_LINKS`** (sheet «Mais») — `BottomNav.jsx:36-49`: `/vitrine` «Vitrine (4 Slots)» ·
  `/programacao` «Programação» · `/ativos` «Meus Ativos» · `/seja-nosso-parceiro` «🤝 Seja nosso parceiro!» ·
  `/regras-oficiais` «📜 Regras Oficiais» · `/configuracoes` «Configurações» (+ `/admin` «⚙️ Admin» se `isAdmin`, `:82-84`).
- **`CORP_TABS`** (lojista) — `BottomNav.jsx:76-80`: `/corporativo`, `/corporativo/cotas`, `/corporativo/banners`.
- **Nota (validador ℹ️-9):** a 5.ª linha «Mais» **não** é item de `MAIN_TABS` (o array tem **4** entradas);
  «Mais» é um `<button>` separado (`:142-153`).
- **Modo de navegação:** `<NavLink to={path}>` (`:127`) para as tabs; `navigate(path)` no sheet (`:294`);
  `navigate("/cadastro")` (`:275`); «Sair» → `desconectar()` (`:314`).

### B.3 Sidebar (desktop) — `src/widgets/layout/Sidebar.jsx` (322 linhas)

- **`NAV_ITEMS`** (`Sidebar.jsx:34-56`) — 4 primeiras **em sincronia com o BottomNav** (106b, decisão 4):
  `/carteira` «Carteira» · `/mercado` «Menor Lance Único» · `/` «Início» · `/ofertas-programadas` «Ofertas Programadas» ·
  `/vitrine` «Vitrine (4 Slots)» · `/programacao` «Programação» · `/ativos` «Meus Ativos» ·
  `/seja-nosso-parceiro` «🤝 Seja nosso parceiro!» · `/regras-oficiais` «📜 Regras Oficiais» · `/configuracoes` «Configurações».
- **`CORPORATIVO_ITEMS`** (`:60-65`): `/corporativo`, `/corporativo/cotas`, `/corporativo/banners`, `/corporativo/analytics`.
- **`ADMIN_ITEM`** (`:68`) e **`SEGURANCA_ITEM`** (`:72`, só lojista).
- `<NavLink to={path}>` (`:202`); rodapé: `abrirModal`/`desconectar` (auth granular, `:258-310`).

**Diferenças BottomNav × Sidebar:** (a) no desktop **não há sheet «Mais»** — os secundários ficam todos no
rail; (b) o rail tem `Segurança` e `Analytics` (lojista) que no mobile vivem no sheet; (c) os 4 principais
têm **mesmos path + mesmos rótulos** (106b). Ícones partilhados: `src/widgets/layout/navModel.jsx`.

### B.4 Tabela botão/link → destino

Extraída por regex (`navigate(`, `<Link/NavLink to=`, `<Navigate to=`, `to:` em arrays, `location.href`)
sobre `src/**`; **não** resolve destinos por variável (`navigate(path)`) — esses vêm dos **arrays** das
§B.2/B.3 (fonte de verdade do menu).

| Destino | Nº origens | Origens (`ficheiro:linha`) |
|---|---|---|
| `/` | 12 | `src/pages/EdicaoDetalhe.jsx:38`, `src/pages/RegrasOficiais.jsx:318`, `src/App.jsx:147`, `src/App.jsx:168`, `src/App.jsx:170` … |
| `/mercado` | 9 | `src/pages/Vitrine.jsx:444`, `src/App.jsx:470`, `src/components/EdicaoCard.jsx:124`, `src/pages/Dashboard.jsx:398`, `src/pages/EdicaoDetalhe.jsx:142` … |
| `/privacidade` | 6 | `src/pages/RegrasOficiais.jsx:269`, `src/components/TermosConsentimento.jsx:214`, `src/pages/ExcluirConta.jsx:131`, `src/pages/MercadoLances.jsx:387`, `src/pages/Seguranca.jsx:27` … |
| `/carteira` | 5 | `src/pages/OfertasProgramadas.jsx:198`, `src/pages/Dashboard.jsx:174`, `src/pages/Dashboard.jsx:177`, `src/pages/Dashboard.jsx:52`, `src/pages/Dashboard.jsx:53` |
| `/corporativo` | 5 | `src/pages/SejaNossoParceiro.jsx:425`, `src/App.jsx:297`, `src/context/AppContext.jsx:643`, `src/pages/CorporativoDashboard.jsx:34`, `src/pages/SejaNossoParceiro.jsx:77` |
| `/excluir-conta` | 5 | `src/pages/RegrasOficiais.jsx:294`, `src/pages/Configuracoes.jsx:81`, `src/pages/Privacidade.jsx:213`, `src/pages/Privacidade.jsx:309`, `src/widgets/layout/Layout.jsx:38` |
| `/vitrine` | 5 | `src/pages/DetalheProduto.jsx:118`, `src/pages/DetalheProduto.jsx:136`, `src/pages/Vitrine.jsx:371`, `src/pages/Vitrine.jsx:562`, `src/pages/Dashboard.jsx:55` |
| `/admin` | 3 | `src/components/admin/AdminLayout.jsx:182`, `src/App.jsx:296`, `src/lib/adminNav.js:37` |
| `/corporativo/carteira` | 3 | `src/components/CotaInativa.jsx:102`, `src/pages/CorporativoCotas.jsx:50`, `src/pages/CorporativoDashboard.jsx:350` |
| `/ativos` | 2 | `src/pages/Dashboard.jsx:180`, `src/pages/Dashboard.jsx:56` |
| `/cadastro` | 2 | `src/pages/LoginEmail.jsx:126`, `src/widgets/layout/BottomNav.jsx:275` |
| `/admin/usuarios` | 2 | `src/pages/admin/PerfilUsuario.jsx:107`, `src/lib/adminNav.js:41` |
| `/corporativo/analytics` | 2 | `src/pages/Vitrine.jsx:54`, `src/pages/CorporativoDashboard.jsx:349` |
| `/corporativo/cotas` | 2 | `src/components/CotaInativa.jsx:124`, `src/pages/CorporativoDashboard.jsx:347` |
| `/admin/usuarios/${u.cliente_id` | 2 | `src/pages/admin/GestaoUsuarios.jsx:188`, `src/pages/admin/GestaoUsuarios.jsx:218` |
| `/configuracoes` | 1 | `src/pages/Dashboard.jsx:60` |
| `/login-email` | 1 | `src/pages/Cadastro.jsx:142` |
| `/programacao` | 1 | `src/pages/CorporativoDashboard.jsx:401` |
| `/regras-oficiais` | 1 | `src/pages/OfertasProgramadas.jsx:277` |
| `/seja-nosso-parceiro` | 1 | `src/pages/Dashboard.jsx:59` |
| `/admin/aprovacoes` | 1 | `src/lib/adminNav.js:70` |
| `/admin/configuracoes` | 1 | `src/lib/adminNav.js:61` |
| `/admin/cotas` | 1 | `src/lib/adminNav.js:75` |
| `/admin/financeiro` | 1 | `src/lib/adminNav.js:45` |
| `/admin/logs` | 1 | `src/lib/adminNav.js:53` |
| `/admin/notificacoes` | 1 | `src/lib/adminNav.js:57` |
| `/admin/operacoes` | 1 | `src/lib/adminNav.js:49` |
| `/admin/pedidos` | 1 | `src/lib/adminNav.js:84` |
| `/corporativo/banners` | 1 | `src/pages/CorporativoDashboard.jsx:348` |
| `/corporativo/cupons` | 1 | `src/pages/CorporativoDashboard.jsx:351` |
| `/corporativo/mercado` | 1 | `src/pages/CorporativoCarteira.jsx:214` |
| `/produto/${p.id` | 1 | `src/pages/Vitrine.jsx:285` |
### B.4.1 Destinos por **variável** (arrays de dados — não capturados pelo regex de JSX)

| Ficheiro | `ficheiro:linha` | Array | Destinos |
|---|---|---|---|
| `Dashboard.jsx` | `:51-61` (`ATALHOS`) | atalhos do Dashboard | `/carteira` (×2: «Depositar PIX», «Converter Ficha»), `/mercado`, `/vitrine`, `/ativos`, `/seja-nosso-parceiro`, `/configuracoes` |
| `Dashboard.jsx` | `:174/177/179/180` | StatTiles (KPIs) | `/carteira` (Senhas, Saldo R$), `/mercado` (Lance), `/ativos` |
| `CorporativoDashboard.jsx` | `:347-351` | cards do lojista | `/corporativo/cotas`, `/banners`, `/analytics`, `/carteira`, `/cupons` |
| `BottomNav.jsx` | `:294` | `navigate(path)` no sheet | `SECONDARY_LINKS` (§B.2) |
| `Sidebar.jsx` | `:202` | `<NavLink to={path}>` | `NAV_ITEMS` (§B.3) |

### B.5 Duplicações de caminho

| # | Destino | Nº origens (código) | Origens representativas | Leitura |
|---|---|---|---|---|
| 1 | `/` | 12 | `src/pages/EdicaoDetalhe.jsx:38`, `src/pages/RegrasOficiais.jsx:318`, `src/App.jsx:147`, `src/App.jsx:168` … | destino mais referenciado |
| 2 | `/mercado` | 9 | `src/pages/Vitrine.jsx:444`, `src/App.jsx:470`, `src/components/EdicaoCard.jsx:124`, `src/pages/Dashboard.jsx:398` … |  |
| 3 | `/privacidade` | 6 | `src/pages/RegrasOficiais.jsx:269`, `src/components/TermosConsentimento.jsx:214`, `src/pages/ExcluirConta.jsx:131`, `src/pages/MercadoLances.jsx:387` … |  |
| 4 | `/corporativo` | 5 | `src/pages/SejaNossoParceiro.jsx:425`, `src/App.jsx:297`, `src/context/AppContext.jsx:643`, `src/pages/CorporativoDashboard.jsx:34` … |  |
| 5 | `/excluir-conta` | 5 | `src/pages/RegrasOficiais.jsx:294`, `src/pages/Configuracoes.jsx:81`, `src/pages/Privacidade.jsx:213`, `src/pages/Privacidade.jsx:309` … |  |
| 6 | `/carteira` | 5 | `src/pages/OfertasProgramadas.jsx:198`, `src/pages/Dashboard.jsx:174`, `src/pages/Dashboard.jsx:177`, `src/pages/Dashboard.jsx:52` … |  |
| 7 | `/vitrine` | 5 | `src/pages/DetalheProduto.jsx:118`, `src/pages/DetalheProduto.jsx:136`, `src/pages/Vitrine.jsx:371`, `src/pages/Vitrine.jsx:562` … |  |
| 8 | `/admin` | 3 | `src/components/admin/AdminLayout.jsx:182`, `src/App.jsx:296`, `src/lib/adminNav.js:37` |  |
| 9 | `/corporativo/carteira` | 3 | `src/components/CotaInativa.jsx:102`, `src/pages/CorporativoCotas.jsx:50`, `src/pages/CorporativoDashboard.jsx:350` |  |

> **Correcção (validador, B4/ℹ️-11):** a 1.ª versão desta secção **excluía `<a href>` e arrays `href:`**,
> subcontando `/privacidade` (1→**6**) e `/excluir-conta` (1→**5**), e omitindo `/corporativo/cotas` e
> `/corporativo/carteira`. Agora o extractor inclui `navigate(`, `<Link/NavLink to>`, `<Navigate to>`,
> `<a href>`, `href:` (arrays — ex.: `lib/adminNav.js`), `to:` (arrays) e `location.href`.
> **Acrescem** as origens dos **menus por array** (`BottomNav`/`Sidebar` usam `path:`): +1 mobile e +1
> desktop para `carteira`/`mercado`/`/`/`ofertas-programadas`/`vitrine`/`programacao`/`ativos`/
> `seja-nosso-parceiro`/`regras-oficiais`/`configuracoes`/`corporativo`/`corporativo/cotas`/`seguranca`/`admin`.

**Rotas alias:** `/menor-lance-unico` → `<Navigate to="/mercado" replace />` (`App.jsx:470`, 106b). É o
**único** alias; não há segundo render (a canónica é `/mercado`).

**`/carteira` e `/mercado` também têm entradas em `<a href>` / `window.location`?** Não — medido:
`window.location` aparece em `App.jsx:398` (retorno OAuth, `${search}`) e em `App.jsx:147`
(`window.location.search`) mais `App.jsx:360` (`<a href="/">`); **nenhum** destes duplica o router com um full-reload de rota interna.

### B.6 Caminhos mortos

**(a) Rotas registadas SEM botão que leve lá (alcançáveis só por URL):**

| Rota | Porque é «sem botão» |
|---|---|
| **`/edicao/:id`** | **rota registada (`App.jsx:480`, `EdicaoDetalhe`) SEM caminho de UI.** O `EdicaoBanner.jsx:62` passou a abrir um **modal** (`onClick={() => setAberto(true)}`) — o comentário do próprio ficheiro (`:7`) confirma: «elimina a "página/aba" desnecessária que o clique abria antes (**navegava para `/edicao/:id`**)». ⚠️ **Divergência comentário↔código:** `EdicaoCard.jsx:8` continua a declarar «O banner (quadrado) é o elemento clicável → `/edicao/:id`», mas o código (`:124`) navega a **`/mercado`**. |
| **`/corp`** | só a rota (`App.jsx:513`, «rota directa pós-cadastro»); **nenhum** menu/atalho/card aponta para lá |
| `/redirect` | retorno do OAuth (`App.jsx:455`) — só acedida pelo fluxo de login (não de UI) |
| `/menor-lance-unico` | alias `<Navigate to="/mercado" replace />` (by design, 106b) — não se destina a botão; o menu aponta à canónica |

> **Alcançáveis (não são mortos, apesar de ausentes do grafo por variável):** `/produto/:id`
> (`Vitrine.jsx:285`), `/vitrine/:slot` (`Vitrine.jsx:342`), `/corporativo/cupons` (`CorporativoDashboard.jsx:351`),
> `/corporativo/carteira` (`:350` + `CotaInativa.jsx:102`), `/corporativo/mercado` (`CorporativoCarteira.jsx:214`).


**(b) Botões com `onClick` que não navegam** — as 4 tabs e o sheet usam `navigate`/`NavLink` e **funcionam**
(verificados por leitura). Não se identificou, por leitura, `<button>` de navegação **sem** `onClick`;
a varredura é **por leitura de ficheiro**, não exaustiva de todos os 38 ecrãs (declarado).

**(c) Desactivados por estado (não são «mortos», são gates):** em `MinhaCarteira.jsx`, «🎫 Trocar R$ 2,00 →
1 Senha» (`:247`) fica `disabled` com `saldoReais < 2`; «⚡ Menor Lance Único» (`:265`) fica `disabled`
com `saldoReais` **falsy** (0/`null` — não `< 2`, correcção do validador ℹ️-5);
«Resgatar cartão» em `OfertasProgramadas.jsx:170` fica `disabled` a <50 pontos.

### B.7 Indicador «novo» — o que aparece após adicionar R$ 2,00 (só registo, sem classificar)

**Medido (leitura + grep):**

| Sítio | `ficheiro:linha` | O que aparece | Gatilho |
|---|---|---|---|
| Modal de depósito PIX | `ComprarFichasModal.jsx:487-501` | bloco de sucesso: **«✅ PIX aprovado!»** + **«R$ 2,00 creditado»** (ou «🔁 Pedido já processado» se idempotente) | `etapa === "sucesso"` após `confirmar-pagamento`/polling |
| Carteira (saldo) | `MinhaCarteira.jsx:199-213` | o número **«R$ 2,00»** passa a estar pintado (`COR.gold`); antes «R$ 0,00» | `refetchSaldoRs()` em `onSucesso` (`:413-416`) |
| Carteira (botões) | `MinhaCarteira.jsx:247` e `:265` | **«🎫 Trocar R$ 2,00 → 1 Senha»** e **«⚡ Menor Lance Único»** deixam de estar esbatidos/`disabled` | `saldoReais >= 2` |
| Passe / Ofertas | `MinhaCarteira.jsx:283-290` → `OfertasProgramadas.jsx:137` | barra de progresso **«X / 50 pontos»** avança ao comprar Passe | `comprar-passe-pontos` |

**O que NÃO existe (medido):**

- **Nenhum badge/pílula «NOVO»** no app: `grep` por `>Novo<`/`NOVO`/`</Nova>` em `src/**` → **0**.
- **Adicionar R$ 2,00 NÃO cria notificação**: nenhum de `confirmar-pagamento`, `webhook-mercadopago`,
  `saldo-rs`, `_lib/saldoRs.mjs` cria notificação (grep `notificac` → 0). Quem cria notificações ao titular:
  `resgatar-cartao` (`:111`), `lance-relampago`, `pedidos`, `edicoes-core`, `scheduled-anuncio-especial`,
  `admin-notify`.
- **O único badge global** é o contador de **notificações não lidas** 🔔 — `ChatbotWidget.jsx:522-537`
  (`notificacoesNaoLidas > 0`), alimentado por `notificacoes`/`notificacoes-usuario.mjs`; **não** é
  accionado pelo depósito.

> **Registo sem veredicto (RESSALVA 3):** se o «indicador novo» que o operador observou é um destes
> quatro (sucesso do modal, número a dourado, botões a activar, barra de pontos) ou algo fora deste
> conjunto, **fica por decidir** — o 107a-back mede e regista; **não** classifica bug/feature.

---

## §Handoff para o 107a-front (SEG2)

### O que o 107a-front JÁ tem (deste UTAC)

1. **Mapa de contratos** — 83 endpoints com método/auth/categoria/consumidor (§A.1), órfãos/duplicados/
   legado (§A.3), 18 migrações (§A.4), 4 contratos-chave detalhados (§A.5).
2. **Mapa de navegação** — rotas (§B.1), BottomNav (§B.2), Sidebar (§B.3), grafo botão→destino (§B.4).
3. **Lista de duplicações** (§B.5) e **caminhos mortos** (§B.6).
4. **Estado do indicador «novo»** (§B.7).

### O que fica PARA o 107a-front (fora do escopo deste UTAC)

- **Alinhamento dos vidros** (glass) Carteira × Menor Lance Único × Ofertas Programadas.
- **Cores, tipografia, spacing** (tokens `COR`, `.gut-glass-standard`).
- **Estados visuais** (loading / erro / vazio) por ecrã.
- **Touch targets** (≥44 px) e **Regra 1** (glass em tudo).
- **Mockups HTML/CSS** com as 4 skills de design.

### Ficheiros de handoff

- `_logs/UTAC107a-back-mapeamento.md` (este documento).
- `_logs/UTAC106a-mapeamento.md` (mapa estático — **ler com o pré-aviso de drift do §B**).
- `_logs/UTAC106j-fix-401.md` (contexto dos 4 hooks Via B: fonte do Bearer = `authToken` user-session).

### Fronteira declarada (RESSALVA 4/6)

Sobreposição de escopo: **nenhuma** detetada. Este UTAC não mede **estado visual**; o 107a-front não
mede **contratos/navegação**. Se o front precisar de um dado visual que dependa de um endpoint, o
contrato já está aqui (§A.5).

---

## §Validador adversarial (SEG3)

**Despachado:** subagente Hermes independente (`deleg_a745de32`), worktree isolado
`C:/Users/Moltbot/tmp-107aback-val/wt` @ `f498fde` (4 junctions A13), instruído a **TENTAR REFUTAR**
(não confirmar). Veredicto verbatim + resposta do executor em **`_logs/UTAC107a-back_SEG3_VALIDADOR.md`**.

> **VEREDICTO: PARCIAL · 4 bloqueantes.** O núcleo do mapa **resistiu** (83/83 endpoints 1:1 com o disco,
> contratos §A.5 conformes, rotas §B.1 exactas linha a linha, 18 migrações 1:1, os 4 caminhos mortos
> confirmados, ausência de badge «NOVO» e de notificação por depósito confirmadas, suíte reproduzida
> `774/774 + 1061/1067`). **PARCIAL** porque **4 alegações quantitativas/classificatórias** não se
> reproduziram — três delas alimentadas por **comentários contados como consumidores** e uma por um
> extractor de navegação que excluía `<a href>`.

| # | Grav. | Achado do validador | Tratamento (aplicado) |
|---|---|---|---|
| B1 | ⚠️ | «órfãos — 26» ≠ medido (a lista enumerava 20) | **corrigido para 25** + definição reescrita (§A.3.1) |
| B2 | ⚠️ | `pontuacao` mal classificada (consumidor = comentário) | **passou a órfão** (§A.3.1/A.3.2) |
| B3 | ⚠️ | `comprar-passe` com consumidor inexistente | **órfão**; alegação antiga marcada **REFUTADA** (§A.3.3) |
| B4 | ⚠️ | `/privacidade` e `/excluir-conta` subcontados | **extractor alargado a `<a href>`/`href:`**; §B.5 corrigida |
| ℹ️-5 | ℹ️ | gate de `MinhaCarteira.jsx:265` escrito «<2» | corrigido para **falsy** (§B.6c) |
| ℹ️-6 | ℹ️ | coluna «Consumidor» citava comentários (≥6 linhas) | coluna → **«Sítios de chamada»** (chamadas reais) |
| ℹ️-7 | ℹ️ | `adminNav.js` fora do grafo | **incluído** (§B.4) |
| ℹ️-8 | ℹ️ | `window.location` impreciso | precisado (§B.5) |
| ℹ️-9 | ℹ️ | «Mais» dentro de `MAIN_TABS` | nota: array tem 4; «Mais» é `<button>` (§B.2) |
| ℹ️-10 | ℹ️ | códigos de erro incompletos | completados (§A.5) |
| ℹ️-11 | ℹ️ | §B.5 incompleta | fechado com o B4 |

**Erros dos meus instrumentos (declarados):** (1) contagem de consumidores por **substring crua** —
contava comentários (causa-raiz de B1/B2/B3/ℹ️-6); (2) extractor de navegação **sem `<a href>`/`href:`**
(B4/ℹ️-11); (3) `strip_comments` inicial **deslocava as linhas** ao remover blocos `/* */` (apanhado por
medição própria antes de publicar); (4) o cabeçalho **«26»** foi publicado **sem a varredura** que o
sustentasse (B1).
**Correcções pós-veredicto: NÃO re-validadas** (sem 2.ª ronda — declarado por GATE 11).

---

## §Registos e custo (SEG4)

### Registo em 3 lugares (R18)

1. `_logs/UTAC107a-back-mapeamento.md` (este documento) + `_logs/UTAC107a-back_SEG3_VALIDADOR.md` (veredicto verbatim + resposta do executor).
2. `CLAUDE.md` — bloco **R14** resumido (apêndice no EOF; 2×`0x00` + 2×`0x1F` intactos).
3. `Desktop/RELATORIO-UTAC107a-back-MAPEAMENTO.txt` (relatório ao operador).

### Ficheiros criados (só docs/logs — zero código)

`_logs/UTAC107a-back-mapeamento.md` · `_logs/UTAC107a-back_SEG3_VALIDADOR.md` · bloco R14 no `CLAUDE.md`.
**Verificável:** `git status --porcelain | grep -v '^??'` = vazio; nenhum ficheiro de `src/`, `netlify/`,
`_lib/`, `supabase/` tocado; `package*.json` intactos; nenhum `.bak-*` tocado; `EM_BREVE_MODE = true`.

### Commits (foreground, ficheiros individuais — NUNCA `git add -A`)

| SHA | O que fez |
|---|---|
| `f498fde` | baseline (heredado do UTAC106j-fix) |
| `6e06f0c` | mapa de contratos + navegação + veredicto do validador |
| *(este registo)* | bloco R14 do `CLAUDE.md` + §Registos |

### Dívida / ressalvas declaradas (não registadas em `DEBT.md` — RESSALVA 7)

- **`/edicao/:id`** (`EdicaoDetalhe`) é **rota registada sem caminho de UI** (o banner passou a abrir modal);
  `EdicaoCard.jsx:8` contradiz o código. **Candidata a UTAC** (decidir: remover rota ou repor o link).
- **25 endpoints órfãos de frontend** (lista §A.3.1) — dos quais os `*-scheduled`/`webhook-*`/`health` são
  esperados (agendador/terceiros). Os **legado Via A** (`comprar-passe`, `voucher`, `consolidar-lances`,
  `renovacao-adesao`, `pontuacao`) ficam **registados, não decididos**.
- **Indicador «novo»**: o 107a-back **não localizou** um badge «NOVO»; registou o que existe (§B.7) e
  deixou a decisão ao operador (RESSALVA 3).

### Custo (medido ao fecho)

| Sessão | `source` | msgs | chamadas | custo estimado (`state.db`) |
|---|---|---|---|---|
| `20261005_221738_6265f4` (executor, esta ronda) | `cli` | 154 | 88 | **≈ US$ 0,071** |
| `20261005_222746_c4f5f0` (validador adversarial) | `subagent` | 85 | 52 | **≈ US$ 0,033** |
| **Total estimado do UTAC** | | | | **≈ US$ 0,103** |

- **Duração:** arranque **22:18** → fecho **22:40** = **≈ 22 min** (dentro de HI5 = 2 h).
- **Saldo da API (medido):** arranque **US$ 3,22** → fecho **US$ 3,08** ⇒ **Δ ≈ US$ 0,14** (real, inclui a
  delegação). As duas leituras são reportadas **separadas** (a de `state.db` é estimativa; a do saldo é real —
  e aqui **não** reconciliam, a base é instável).
- **Sessão por UTAC:** a plataforma abriu sessão própria (`20261005_221738_6265f4`, `source='cli'`,
  arranque 22:17:38) — o custo é separável, como o operador pediu. O validador tem sessão própria.
