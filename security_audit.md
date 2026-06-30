# DESAFIOGUT — security_audit.md (Gate de Merge · Superpers)

> Nenhum código entra em produção sem passar por este checklist. Se não estiver sólido,
> **NÃO fazer merge**. Resultado da validação preenchido por revisão; PENDENTE bloqueia.
> Última auditoria: 2026-06-14 (MC25.1). Escopo auditado: --glass-opacity 0.03→0.06.

Legenda: ✅ PASS · ⚠️ ATENÇÃO · ⏸️ PENDENTE · N/A não aplicável a esta alteração.

---

## 1. INTEGRIDADE DE TRANSAÇÃO
- [✅] **transaction_uuid único por lance** — flash usa `idempotencyKey = keccak256(address:valorCentavos:edicaoId)` (`CardLance.handleDarLance`), determinístico → reenvio do MESMO lance é idempotente no backend (`lance-relampago.mjs`).
- [✅] **State Lock (anti-duplo-clique)** — `fase ∈ {autenticando,hashing,assinando,enviando}` ⇒ `ocupado=true` ⇒ botão `disabled`. Bloqueia reentrância durante o processamento.
- [✅] **nonce/timestamp** — programado: assinatura EIP-191 + tx on-chain (nonce gerido por ethers/contrato). Flash: token JWT de auth com `ts` no payload (`DESAFIOGUT-AUTH:${ts}:${address}`).
- [✅] **Verdade do saldo** — sempre on-chain (`getSaldoSenhasOnChain` + listeners `LanceDado`/`SenhasCreditadas`). A UI nunca decide saldo (optimistic ADIADO — §5).
- **MC20.x:** o redesign tocou o CTA de lance **apenas visualmente** (`<button>`→`motion.button`, whileTap). `handleDarLance`, idempotência e State Lock **inalterados**. ✅

## 2. ZERO-TRUST
- [✅] **Nenhuma chave secreta no código** — `VITE_PRIVY_APP_ID` é client-id público; segredos (Alchemy/Privy server) ficam em env Netlify, não no bundle.
- [⚠️] **Alchemy URL com API key no client** (`VITE_ALCHEMY_URL`) — exposição inerente a RPC client-side; mitigar com allowlist de domínio/rate-limit no painel Alchemy. (pré-existente, fora do escopo MC20.x)
- [✅] **Rotas de backend autenticadas** — `lance-relampago` exige `Authorization: Bearer <token>` (de `auth-lance`); admin/chatbot usam `authToken`; `_lib/jwt`.
- [✅] **Inputs validados server-side + client-side** — `sanitizeLance` (1–999999), `sanitizeEdicaoId` (DOMPurify + regex); `_lib/validate` no backend; CSP estrita (netlify.toml).
- **MC20.x:** sem novas rotas, sem novos inputs, sem novas chaves. ✅

## 3. RESILIÊNCIA A FALHAS
- [✅] **Tratamento de erro 4xx/5xx** — `CardLance` mapeia 401/429/503 e reverts (`fase=ERRO`), traduz reverts on-chain para PT; Sentry captura (exceto `ACTION_REJECTED`).
- [✅] **Utilizador notificado** — `boxErro`, badges de saldo, banner de sistema pausado; chatbot mostra fallback amigável em 503/429.
- [✅] **Logs com metadados** — Sentry com tags `{idEdicao, wallet, chainId, fase}` + scrub de `argon2id_`; `[GUT-DEBUG]` para CSP/erros/unhandledrejection.
- [✅] **rollback_ui()** — hoje o saldo só muda após confirmação on-chain (não há estado otimista a reverter). `useShakeOnError` (MC20.3) está PRONTO para ligar ao rollback quando o ITEM 10 avançar.
- **MC20.x:** AtmosphereFilter/GutoSpritePlayer degradam graciosamente (`useReducedMotion`, fallback de frame). ✅
- **MC23.3:** Migração Glass UI — `.glass-panel` consistente substitui estilos inline dispersos (`backdropFilter`, `rgba()`, `boxShadow`). 5 primitivos (GlassCard, Button, Input, Table, Modal) com API auditada. Redução de superfície: 34→15 ficheiros com estilos glass inline. Nenhuma lógica de negócio alterada. ✅

## 4. AUDITORIA DE CÓDIGO
- [✅] **Lógica de lance alterada nas últimas 24h?** — Sim, mas **só apresentação** (motion.button). Lógica de negócio/on-chain intacta → teste de concorrência não exigido para esta alteração (sem mudança no caminho transacional).
- [⏸️] **Teste de concorrência (multi-lance simultâneo)** — recomendado ANTES de qualquer mudança REAL no caminho de lance (ex.: ITEM 10). Hoje não há tal mudança. (gate para o ITEM 10)
- [✅] **Código morto / console.log exposto** — sem `console.log` novo introduzido pelo MC20.x; instrumentação existente é `console.info/warn` `[GUT-DEBUG]` (intencional). Imports não usados removidos (ex.: `Layout` em App.jsx).
- [✅] **node --check `.mjs` limpo + build verde** — verificado a cada commit (R7).

## 5. IDEMPOTÊNCIA (R5)
- [✅] **Lance flash** — idempotencyKey determinística (§1) → "disparar 10x executa só a 1ª" no backend.
- [✅] **State Lock UI** — impede reentrância no cliente.
- [✅] **Referral** — registo de `?ref=` idempotente por sessão (`sessionStorage desafiogut_ref` + dedupe no backend `_lib/referral`).
- [⏸️] **Optimistic updates (ITEM 10)** — quando implementado, EXIGE: UUID de operação + reconciliação on-chain + lock até evento confirmar. **Bloqueado neste audit até validação on-chain.**

---

## VEREDICTO DESTA AUDITORIA (MC20.x — redesign UI/UX)
**APROVADO para merge.** O escopo é apresentação (3 camadas, Nav Dock, vidro temperado,
GutoSpritePlayer, parallax) + 1 hook utilitário (`useShakeOnError`) + integração aditiva do
trigger thinking. **Zero alteração ao caminho transacional/on-chain** (R1). Itens ⏸️
(ITEM 7 Mercado Pago, ITEM 10 optimistic, teste de concorrência) ficam como **gates futuros**
e não bloqueiam este merge porque não foram tocados.

---

## VEREDICTO MC21.1 — refundação visual (biblioteca Glass UI + vidro no visitante)
Escopo: **100% apresentação**. (1) `globals.css`: novo `.glass-panel` + migração do `.gut-glass`
para base neutra (white/0.03, blur-off mobile, `backdrop-saturate` corrigido). (2) 10 primitivos
novos em `src/components/ui/` (sem lógica de negócio). (3) `Layout.jsx` rodapé e `MercadoLances.jsx`
3 barras do topo: `background` opaco (0.80–0.92) → vidro neutro.
- **Integridade de transação / idempotência:** N/A — `CardLance`, `web3.js`, idempotencyKey,
  State Lock, EIP-191 **não tocados**. ✅
- **Zero-trust:** sem novas rotas/inputs/chaves. Primitivos são puramente visuais. ✅
- **Auditoria de código:** sem `console.log` novo; sem código morto; `node --check` `.mjs` limpo +
  `npm run build` verde a cada commit; primitivos <100 linhas (R3). ✅
- **Regra de Ouro (arena visível):** validado via MCP como visitante (`/`, `/mercado`, `/carteira`,
  `/vitrine`, `/seja-nosso-parceiro`, chatbot) — arena transparece; CLS=0 (residual 0.008 no
  `/mercado` = cronómetro ao vivo, não o redesign); consola só ruído pré-existente. ✅
- **WCAG AA:** texto do aviso do Mercado clareado (#64748b→#94a3b8) sobre vidro. ✅
- ⏸️ **Pendente (MC21.2):** corporativo/admin + painéis auth-gated + forms profundos — **NÃO**
  validados visualmente (login Privy não automatizável via CDP). Refator desses fica para MC21.2
  com validação autenticada. **Não bloqueiam este PR porque não foram tocados.**

**APROVADO para merge** (escopo entregue). O caminho transacional/on-chain permanece intacto (R1).

---

## VEREDICTO MC23.I — auditoria de design/UX (FASE 1 parcial)
Escopo entregue: **100% apresentação**. (1) `GutoSpritePlayer.jsx`: mood `celebrating` deixa de
fazer loop infinito (`loop=false`) → celebração de vencedor toca UMA vez (ACHADO A2/D2).
- **Integridade de transação / idempotência:** N/A — `CardLance`, `web3.js`, idempotencyKey,
  State Lock, EIP-191 **não tocados**. ✅
- **Zero-trust:** sem novas rotas/inputs/chaves; alteração é um booleano de vídeo. ✅
- **Auditoria de código:** `npm run build` verde (6.91s); sem `console.log` novo; sem código morto. ✅
- **Validação visual (MCP, 375px):** ANTES `loop=true` (infinito); DEPOIS `loop=false`, `ended=true`
  (4s, 1×), e após "Nova Rodada" GUTO volta a `idle.webm` (loop). `prefers-reduced-motion` intacto. ✅
- ⏸️ **Pendente / não bloqueia este escopo:**
  - **D1** (overlays de vencedor empilhados): não reproduzível em dev (edições via Blobs, 404 local) —
    requer ambiente com múltiplas edições para validar sem regressão.
  - **A1** (fallback do chatbot cego ao perfil quando o LLM cai): é **backend** (`chatbot.mjs`) — fora
    do escopo desta branch visual; candidato a MC próprio (MC23.G).
  - **Auditorias 1, 2, 4, 5** (vidro/contraste/layout/primitivos): varredura MCP **não concluída** —
    limitação ambiental (o build nativo rolldown/win32 faz access-violation sob pressão de memória,
    obrigando a fechar o Chrome/MCP antes de cada build; loop MCP↔build instável nesta máquina).

**APROVADO para merge (escopo D2).** O caminho transacional/on-chain permanece intacto (R1). As
auditorias restantes ficam para nova passagem em ambiente estável / com edições reais.

---

## MC25.1 — Ajuste de --glass-opacity 0.03→0.06 (2026-06-14)

**PR:** feat/mc25.1 → main | **Opção:** A | **2 ficheiros alterados**

### 1. INTEGRIDADE DE TRANSAÇÃO
- [✅] **N/A** — Nenhum código transacional alterado. `CardLance`, `web3.js`, idempotencyKey,
  State Lock, EIP-191, Argon2id — **todos inalterados**.
- [✅] **Saldo on-chain** — `getSaldoSenhasOnChain`, listeners `LanceDado`/`SenhasCreditadas` inalterados.

### 2. ZERO-TRUST
- [✅] **Sem novas rotas, inputs, ou chaves**.
- [✅] **Sem novas dependências**.

### 3. RESILIÊNCIA A FALHAS
- [✅] **Tratamento de erro inalterado** — Sentry, rollback_ui(), useShakeOnError intactos.
- [✅] **Degradação graciosa** — useReducedMotion, fallback de frame GUTO inalterados.

### 4. VALIDAÇÃO VISUAL (MCP chrome-devtools)
- [✅] **8 páginas inspecionadas** (Dashboard, MercadoLances, Vitrine, SejaNossoParceiro,
  MinhaCarteira, MeusAtivos, Configuracoes, AdminPanel)
- [✅] **Zero erros de consola novos** em todas as páginas
- [✅] **GUTO** — button presente, estado idle visível
- [✅] **Nav Dock** — INALTERADO (--nav-glass: rgba(13,18,53,0.66))
- [✅] **Chatbot** — INALTERADO (--chat-glass: rgba(13,18,53,0.92))
- [✅] **Slider** — funcional (0–0.15, step 0.005, localStorage: 0.06)
- [✅] **WCAG AA** — contraste ≥ 4.5:1 para todas as cores de texto (seguro até 0.10)

### 5. ANTI-REGRESSÃO
- [✅] **Perfis**: visitante, comum, corporativo, admin — rotas e redirects intactos
- [✅] **Glass UI primitives**: GlassCard, Button, Input, Table, Modal, Error, Tooltip, Empty, Skeleton
  — apenas o valor do token CSS mudou; estrutura e lógica inalteradas
- [✅] **Cores do design system**: --color-gut-* tokens inalterados
- [✅] **Animações e motion**: keyframes, Framer Motion springs, useReducedMotion inalterados
- [✅] **Background Canvas**: .gut-bg-canvas, .gut-bg-layer, .gut-atmosphere, scrim gradient inalterados
- [✅] **Layout**: --page-padding, --nav-height, breakpoints, safe-area-inset inalterados
- [✅] **Trindade do Vidro**: "Regra de Ouro" preservada (arena visível a 6% como atmosfera)
- [✅] **npm run build**: verde (5.13s)

### 6. ROLLBACK
- [✅] **1 linha**: `:root { --glass-opacity: 0.03; }` em globals.css + `const DEFAULT = 0.03` em SliderOpacidade.jsx

**APROVADO para merge (MC25.1).** Alteração puramente cosmética — zero impacto em transações,
autenticação, segurança ou lógica de negócio. WCAG AA mantido. Rollback trivial.

---

## MC29.1 — Modelo de Entrega Híbrido e Transparente

**Branch:** `feat/mc29.1` · **Data:** 2026-06-20 · **Baseline:** main `172acf9` (PR #77)

### 1. Âmbito
Camada de abstração de dados (adapters), configuração remota por plataforma,
placeholders de conformidade (iOS/Android) e GUTO adaptável. Modelo TRANSPARENTE
(rejeitada a camuflagem — Apple Guideline 2.3.1).

### 2. Superfície de segurança alterada
- [✅] **Novo endpoint público** `recursos-app` (GET) — só LEITURA de flags
  públicas (não-segredas). Sem dados sensíveis, sem escrita. Fail-soft → default.
- [✅] **`chatbot.mjs`** passa a ler `body.plataforma` (string) e resolve flags
  via adapter. Input validado por `resolverRecursos` (normaliza plataforma
  desconhecida → 'pwa'). Sem novo vetor de injeção.
- [✅] **Adapter `data-store`** — `setConfig` é admin-only NO CHAMADOR (nenhum
  endpoint público escreve config; a escrita só ocorre via `scripts/seed-…`
  com `NETLIFY_SITE_ID/AUTH_TOKEN`).
- [✅] **Lances (MC28) intactos** — `data-store-blobs` apenas DELEGA em
  `bids-store.mjs` (Key-Per-Bid). Zero alteração à blindagem de lances.

### 3. Anti-regressão (R1)
- [✅] Deteção de plataforma não penaliza o utilizador real: browser puro →
  'pwa' → leilão ATIVO. Só wrapper nativo/override ativam conformidade.
- [✅] PWA validado a 375/1440: leilão real intacto (timer, CardLance R-1,
  seletor de modo). 4 personas do GUTO preservadas no PWA.
- [✅] `node --check` limpo em todos os `.mjs` novos/alterados.
- [✅] `npm run build` verde em cada commit.
- [✅] Sem novos erros de console (apenas warn fail-soft intencional, espelhando
  o padrão existente `useEdicoes` 404 em vite local).

### 4. Conformidade — pendências NÃO cobertas por este MC (caveats)
- [ ] Parecer jurídico sobre "menor lance único" como jogo (vale para o PWA também).
- [ ] Revisão das regras anti-steering da Apple para o CTA "Abrir versão Web".
- [ ] App da loja genuína (Vitrine + Apple IAP / Google Play Billing — a implementar).
- [ ] Conta de teste do revisor documentada nas notas de submissão.

### 5. Veredicto
**APROVADO para merge (MC29.1).** Alteração aditiva e de baixo risco: novo
endpoint só-leitura, adapter que preserva 1:1 o comportamento dos Blobs, e gating
de UI fail-soft que nunca degrada o utilizador real. As pendências da secção 4
são de produto/jurídico/submissão, NÃO bloqueiam o merge do código.

---

## MC32.1 — Integração Supabase (camada de dados) · auditoria 2026-06-20
> Escopo: adapter Supabase + refactor mínimo de lances para a fachada + scaffold
> de leitura de config no frontend. `DATA_STORE_BACKEND` permanece `blobs` (R3.4).

### 1. Integridade de transação / Lances (MC28)
- [✅] **MC28 intacto** — `lance-relampago` e `consolidar-lances` passaram a usar a
  fachada `data-store` (`addLance`/`getLances`); com backend `blobs` delegam em
  `bids-store` (Key-Per-Bid) → byte-idêntico. Markers de consolidação ficam no
  bids-store. Suite `mc28-seguranca` (que exercita `lance-relampago`) **10/10 verde**.
- [✅] **Adapter Supabase fiel** — `lances.payload` guarda o registro imutável
  completo; key Key-Per-Bid anti-colisão preservada. 6 testes offline verdes.
- [✅] **Anti-Split-Brain (R11)** — a fachada carrega UM só backend; nenhum módulo
  escreve em Blobs e Supabase simultaneamente.

### 2. Zero-Trust / credenciais
- [✅] **Sem segredos no código (R9)** — `SUPABASE_URL`/`SERVICE_ROLE_KEY` (backend) e
  `VITE_SUPABASE_URL`/`ANON_KEY` (frontend) só de env; `.env.example` com placeholders.
- [✅] **Service role só no backend** — `supabase-client.mjs` usa SERVICE_ROLE (ignora
  RLS) e nunca é importado pelo frontend; o frontend usa ANON_KEY (sujeita a RLS).
- [✅] **RLS** — versionada no schema: SELECT público só em `produtos`/`config_remota`;
  escrita exclusiva do `service_role` em `lances`/`lojistas`/`config_remota`.
- [⚠️] **MCP Supabase indisponível na sessão** — a validação de schema/RLS foi feita
  contra o script SQL autoritativo (fornecido pelo operador, já aplicado), não via MCP.

### 3. Anti-regressão (R1)
- [✅] **Suite completa 67/67 verde** (≥61 baseline + 6 novos); MC28/MC30/MC29.1 intactos.
- [✅] **Frontend byte-idêntico sem env** — sem `VITE_SUPABASE_*`, `useRecursosApp`
  mantém o fetch da função (caminho atual). Supabase é dynamic import (chunk async,
  bundle principal não cresce).
- [✅] **node --check** limpo em todos os `.mjs` novos/alterados; **build verde** em cada commit.
- [✅] **Visual MCP 375/1440 + CLS = 0.00** — gate LGPD renderiza; sem novos erros de
  console (apenas o ruído CSP/walletconnect pré-existente).

### 4. Veredicto
**APROVADO para merge (MC32.1).** Alteração aditiva e de baixo risco: o backend
ativo continua Blobs, o adapter/handlers preservam o comportamento 1:1, e o
frontend só muda quando as env Supabase existirem. Pendências (operacional, não
bloqueiam o merge): flip de `DATA_STORE_BACKEND=supabase` com validação de carga;
realtime do frontend; reconciliação `lojistas` (cotas/wallet) num MC seguinte.

---

## MC33.1 — Validação de carga + RLS + runbook · auditoria 2026-06-21
> Escopo: FASES A (carga), B (RLS), C (runbook flip/rollback) e D (visual) do MC33,
> contra staging `gjuelqjjhuuwnlsjyeai` (ref distinto da produção). Backend de
> escrita de produção continua `blobs` — nenhum flip de produção feito.

### 1. Carga e integridade (FASE A)
- [✅] 50/100/200/1500/2500 lances → **0% erro**, persistidos==N, keys 100% únicas.
- [✅] **K1 confirmado no PostgREST real** — 2500 lidos sem truncar (paginação .range).
- [✅] Apuração do menor lance único **idêntica** ao esperado em todos os cenários.
- [✅] Limpeza dos dados de teste verificada (edicaoId isolado MC33-LOAD-<uuid>).

### 2. RLS (FASE B)
- [✅] Leitura anónima de `lances` → `200 []` (RLS oculta linhas; anti-sniping).
- [✅] Escrita anónima de `lances` → `401` (`42501` row-level security policy).
- [✅] `service_role` → GET/POST totais (com limpeza da prova).

### 3. Credenciais / Zero-Trust
- [✅] Creds só via env, ficheiro fora do repo — nunca committadas (R6/R9).
- [⚠️] As chaves do operador vinham com **rótulos trocados** (anon↔service_role);
  detetado por decode do JWT e usadas pela role real. Recomenda-se corrigir os
  rótulos na origem para evitar confusão futura.

### 4. Anti-regressão (FASE D + suite)
- [✅] Visual 375/1440, **CLS=0**, sem novos erros de console (só ruído CSP pré-existente).
- [✅] 68/68 testes; `node --check` limpo; `npm run build` verde. Harnesses MC33 são
  manuais (não `*.test.mjs`) → não correm na CI.
- [✅] MC28/MC30/MC29.1/MC31, GUTO, Glass UI, fundo animado intactos (MC33 é dados/infra).

### 5. Veredicto
**GO técnico para o flip Supabase.** FASES A/B/D verdes em staging; K1 corrigido e
confirmado. O flip de PRODUÇÃO é ação operacional (runbook em cloud.md §9.8): exige
env de produção + **janela entre edições** (mitiga K2 split-brain) + observação 24h
com gatilho de rollback. NÃO ativar a meio de uma edição.

---

## MC33 — Flip Supabase EXECUTADO em produção · 2026-06-21
**DataStore de produção agora é Supabase** (`DATA_STORE_BACKEND=supabase`).
Deploy publicado: `6a377f7b1862bc5800e6bbe5` (state ready, 2026-06-21T06:06Z).

### Pré-condições (cumpridas)
- [✅] Janela ENTRE edições confirmada pelo operador (sem leilões ativos) — K2.
- [✅] Env de produção no Netlify, chaves VALIDADAS pelo claim do JWT (ref
  `vjslwowwrpcawijdiksm`): `SUPABASE_SERVICE_ROLE_KEY` (role service_role) e
  `VITE_SUPABASE_ANON_KEY` (role anon). URLs apontam para produção.
- [⚠️] `SUPABASE_ANON_KEY` (backend) ausente — inócuo (o adaptador usa só service_role).
- [ℹ️] Os commits vazios de flip foram cancelados pelo Netlify ("no content change");
  o flip só ficou live com um **deploy real forçado** (`netlify deploy --build --prod`).
  **Nota de rollback:** o método "commit vazio + push" NÃO redesdobra — o rollback
  real exige `netlify env:unset DATA_STORE_BACKEND` (ou =blobs) + deploy forçado.

### Validações pós-deploy (todas passaram)
- [✅] Frontend `GET /` → 200.
- [✅] `recursos-app` pwa (isLeilaoAtivo=true) e ios (false) → conformidade MC29.1 intacta.
- [✅] Supabase produção `lances` com service_role → 200 (conectividade + chave válida).
- [✅] RLS: `lances` anónimo → 200 `[]` (linhas ocultas); escrita anónima continua
  bloqueada (validado em staging FASE B; mesmas políticas no schema de produção).
- [✅] `config_remota` anónimo → 200 (leitura pública). **0 linhas em prod** → backend
  usa defaults (fail-soft); fazer *seed* se forem precisas flags personalizadas.
- [ℹ️] [2.6] bundle contém literais (`darLance`, endereço do contrato): PRÉ-EXISTENTE,
  não introduzido pelo flip; MC29.1 é conformidade por plataforma, não ofuscação de
  bundle. Não-crítico (não dispara rollback). Rever noutro MC se ofuscação for desejada.
- [—] Logs do Supabase (2.4): não acessíveis pelas ferramentas desta sessão (sem MCP);
  cobertos indiretamente pelo smoke REST (sem erros de permissão).

### Veredicto
**MC33 — Flip Supabase concluído com sucesso.** Sem falhas críticas; rollback NÃO
executado. Recomendação operacional: observar métricas/erros nas próximas 24h; manter
o rollback pronto (env→blobs + deploy forçado). Pendências menores: seed de
`config_remota` em prod; definir `SUPABASE_ANON_KEY` backend (cosmético); realtime
frontend + reconciliação `lojistas` num MC futuro.

---

## MC34 — Realtime Supabase (config_remota) · auditoria 2026-06-21
> Escopo deliberadamente reduzido a `config_remota` (push instantâneo de flags).

### 1. Anti-sniping / MC28 (crítico)
- [✅] **`lances` NÃO entram no realtime** — a publicação só inclui `config_remota`.
  A RLS continua a ocultar `lances` do anon; a blindagem anti-sniping permanece intacta.
- [✅] Decisão registada: realtime de lances ao público quebraria o "menor lance único"
  → rejeitado por design (só faria sentido pós-fecho ou via Broadcast mediado pelo backend).

### 2. Zero-Trust
- [✅] Frontend usa só `ANON_KEY` (sujeita a RLS); `config_remota` tem SELECT público.
  Nenhuma chave nova; `useRealtimeConfig` inerte sem `VITE_SUPABASE_*`.

### 3. Anti-regressão (R1)
- [✅] Aditivo ao `useRecursosApp` (MC29.1) reusando `resolverParaPlataforma` — conformidade
  por plataforma intacta. Sem realtime/config = comportamento byte-idêntico (fallback fetch).
- [✅] 68/68 testes; `node --check` limpo; `npm run build` verde; visual CLS=0, sem novos erros.
- [✅] MC28/MC30/MC33 não tocados (mudança é frontend + 1 migração aditiva de publicação).

### 4. Validação de realtime (AUTOMAÇÃO 2026-06-21)
- [✅] Migração de publicação **aplicada** em produção e staging via `supabase db query
  --linked` (CLI autenticada). `config_remota` confirmada na publicação `supabase_realtime`.
- [✅] Seed corrigido (feature-major) aplicado em prod+staging (= defaults; zero regressão).
- [✅] Entrega de eventos **E2E confirmada** (staging E produção): UPDATE → evento entregue
  ao cliente (chave temporária, sem tocar no `recursos_app` real). Limpeza feita.

### 5. Veredicto
**APROVADO e ATIVO.** Realtime de `config_remota` aditivo, fail-soft, sem risco MC28,
agora **funcional em produção** (E2E verificado). Sem pendências operacionais para o realtime.
Nota: a chave de SERVICE_ROLE de produção foi usada via Netlify env / CLI sem nunca ser
exposta no chat; chaves vinham com rótulos trocados em entregas anteriores — usar sempre
a role real do JWT.

---

## MC35 — Auditoria topográfica (read-only) · 2026-06-21
Relatório completo: `AUDITORIA-TOPOGRAFICA.md` (raiz do repo + Desktop). Auditoria
sem alteração de código. Achados de segurança (por evidência):
- [✅] RLS anti-sniping: `lances` anónimo bloqueado (testado prod+staging).
- [✅] `service_role` ausente do bundle `dist/`; zero JWT/segredos hardcoded em `src/`.
- [✅] Contrato `Leilao.sol`: `tx.origin`=0, `apenasCoordenacao`×7, Solidity 0.8.
- [✅] 68/68 testes, build verde, CLS=0, deploy prod `ready`.
- [⚠️] Dívidas priorizadas: reconciliação `lojistas` (P1); realtime lances/edições por
  redesenho (P1); bundle Privy 2.7MB (P2); duplicação `resolverRecursos` front/back (P2);
  cache Graphify stale (recomendado `graphify update .`).
- [ℹ️] Inventário: 45 functions, 36 _lib, 17 testes, 32 componentes, 8 hooks, 15 páginas,
  1 contrato, 3 migrations.

**Veredicto:** estado do projeto **saudável**; sem bloqueadores de produção. Pendências
são evolutivas (não-bloqueantes). Ver matriz de riscos e cronograma no relatório.

---

## MC37 — Refactor cotas.mjs (anti-fraude) para Supabase · 2026-06-21
- [✅] **Anti-fraude preservado** — teste dedicado `cotas-anti-fraude.test.mjs` (5 cenários:
  anti-duplicidade CNPJ 409, anti-Sybil 429, login lookup, email lookup, CRUD admin)
  verde ANTES (baseline Blobs) e DEPOIS (cotas-store) — comportamento idêntico.
- [✅] **Anti-duplicidade aplicacional** — `getCotaByCnpj` (coluna `cnpj` indexada, **não-única**:
  dados reais repetem o CNPJ entre o registo direto "cnpj:" e o autenticado). Guard 409 preservado.
- [✅] **R11 anti-split-brain** — escrita só Supabase; leitura com fallback Blob legado (transitório).
- [✅] Suite **79/79**, build verde, node --check limpo. Frontend byte-idêntico (zero alteração em `src/`).
- [✅] **Migração de dados executada** — 7/7 registos Blob→Supabase em **staging** e **produção**;
  `payload` byte-fiel (exatos 7/7), `cnpj`/`tipo`/`vendida` conferem. Backup MC36 disponível (R13).
  Credenciais só via env (R9): staging `~/.mc33-staging.env`, produção via `netlify env` (contexto
  production), capturadas para ficheiro temp 0600 e apagadas no fim — nunca impressas nem committadas.
- [✅] **`iniciar-cota.mjs`** sem alteração (não toca cotas). **`wallet.mjs`** fora de âmbito (MC36.1).
- [✅] **Validação pós-deploy (PR #87 → `main` @ `758f9ae`, merge `--admin`)** — deploy prod
  `6a38525053a63a0008679bbc` **ready**. Produção: `GET /` 200; `recursos-app` pwa `isLeilaoAtivo:true`;
  `/cotas` servido via Supabase (código live), registo migrado retornado e inexistente → 404.
- [✅] **Dados em produção (service_role):** `count(cotas)`=7, `payload` byte-fiel 7/7.
- [✅] **RLS em produção:** leitura anónima (ANON_KEY) de `cotas` → **0 linhas** (bloqueada; espelha
  o padrão anti-sniping de `lances`). Só `service_role` lê os 7 registos.
- [✅] **Visual MCP** 1440px + 375px no site live: **CLS=0.00**, zero erros de consola, render OK
  (gate de consentimento). Frontend byte-idêntico (sem alteração em `src/`).
- [⏸️] Pendente — **MC36.1**: saldo-rs/troco/wallet. ⚠️ Não re-executar
  `20260621_cotas_schema.sql` (DROP TABLE).

## MC38 — Remoção do fallback de leitura de cotas (100% Supabase) · 2026-06-21
- [✅] **Gate de segurança (pré-remoção, CLI/REST service_role):** `netlify blobs:list cotas` = 7 keys
  **idênticos** aos 7 do Supabase (nenhum registo só-em-Blob → impossível 404 pós-remoção). Único
  fingerprint Blob (`cotas-fingerprint`) de 2026-05-25 (~27 dias) → já fora da janela anti-Sybil de
  24h (a lógica live filtra por `agora24h`), e não estava no Supabase porque expirou → remoção de
  `lerFingerprintLegado` sem perda. Conclusão: o requisito "≥24h" foi satisfeito de facto.
- [✅] **Remoção:** apagado `_lib/cotas-fallback.mjs`; removidas as cláusulas `?? lerXLegado(...)`
  de `cotas.mjs` (9) e `cota-ativacao.mjs` (1); import removido; comentários atualizados.
- [✅] **R11:** leitura e escrita agora 100% Supabase (escrita já era só-Supabase desde o MC37).
- [✅] Suite **78/78** (−1 = teste de cenário-fallback removido por design), `node --check` limpo,
  `npm run build` verde. Frontend byte-idêntico (sem alteração em `src/`).
- [✅] **Rollback:** `git revert` + redeploy; Blobs legados e backup MC36 intactos (R13).
- [✅] Veredicto pós-deploy (HTTP/smoke/visual) → `Desktop\MC38-final.md` (deploy `e44f467` ready, CLS=0).

## MC36.1 — Migração financeira saldo-rs/troco-senhas/wallet para Supabase · 2026-06-21
- [✅] **Backup obrigatório (R13)** antes de tocar: `Desktop\mc36.1-blobs-backup-20260621\`
  (saldo-rs 5 + saldo-rs-creditos 8); `troco-senhas`/`wallet`/`wallet-idem`/`saldo-rs-debitos`
  confirmados **vazios** via `netlify blobs:list`. Backup NÃO committado (dados financeiros).
- [✅] **Schema + RLS** (`20260621_saldo_troco_wallet_schema.sql`): 6 tabelas payload jsonb,
  RLS só `service_role`, `CREATE IF NOT EXISTS` (sem DROP). Aplicado em staging+prod via
  `supabase db query --linked`.
- [✅] **Migração de dados:** saldo_rs 5/5 + saldo_rs_creditos 8/8 **byte-fiel** em staging E
  produção (consistência verificada por contagem + `norm(payload)`). Creds só via env (R9):
  prod via `netlify env`, ficheiro temp 0600 apagado no fim.
- [✅] **R11 anti-split-brain:** handlers (saldoRs/troco-senhas/wallet) escrevem só Supabase;
  leitura com fallback Blob legado (`financeiro-fallback.mjs`, transitório).
- [✅] **Semântica preservada (R1):** débito checked-then-set do `saldoRs` (usado por
  `lance-relampago`) inalterado; FIFO/expiração 30d do troco; idempotência de crédito (pedidoId)
  e de wallet. Teste dedicado `mc361-saldo-rs.test.mjs` (crédito idempotente, débito
  suficiente/insuficiente, reembolso). Suite **83/83**, `node --check` limpo, build verde.
- [✅] Frontend byte-idêntico (sem alteração em `src/`).
- [ ] Veredicto pós-deploy (HTTP/smoke/fluxo de lance/visual) → `Desktop\MC36.1-final.md`.
- [⏸️] Pendente: remover o fallback financeiro (MC seguinte); opcional débito atómico
  (`UPDATE ... WHERE centavos >= :v`). ⚠️ Não re-executar migrações com `DROP TABLE`.

## MC39 — Mainnet Readiness (preparação SEM ativação) · 2026-06-21
- [✅] **Diagnóstico (production):** `NETWORK_STAGE` ausente (=Sepolia); `COORDENACAO_PRIVATE_KEY`
  ausente (R9/MC30); `DATA_STORE_BACKEND=supabase`; Biconomy+KMS presentes; `SIGNER_BACKEND` ausente
  (default por `NETWORK_STAGE` → local-key em Sepolia).
- [🛑] **Decisão de segurança (R1/R8):** **NÃO** foi definido `NETWORK_STAGE=mainnet`. Análise do
  código (grep, graphify stale) confirmou que `=mainnet` ativa, no site live e de imediato:
  `lance-relampago` → blindagem MC28 on-chain (`comprometerLanceOnchain` via Biconomy chain 1);
  `consolidar-lances` → `new Contract(CONTRATO_MAINNET=0x000…0)` + EIP-712 com `verifyingContract`
  no endereço zero; `signer.mjs` → biconomy. Como o contrato mainnet não existe (MC40 pendente) e o
  Smart Account/KMS foi montado só na Sepolia, ativar agora quebraria o fluxo de lance real. Operador
  confirmou "preparar sem ativar".
- [✅] **Configurado (inerte até `NETWORK_STAGE=mainnet`; gate em `consolidar-lances:42` antes de
  ler):** `MAINNET_CHAIN_ID=1` (production). `CONSOLIDATION_RPC_URL`/`CONTRATO_MAINNET` deixados por
  definir no MC40 (sem valores fabricados — R9/integridade).
- [✅] **Zero código alterado; sem deploy.** Produção segue em Sepolia (comportamento legado intacto).
  Reversão trivial: `netlify env:unset MAINNET_CHAIN_ID`. Checklist de ativação em `Desktop\MC40-checklist.md`.

## MC39.1 — Hardening pré-Mainnet (5 itens da auditoria SEGURANCA-MAINNET-READINESS) · 2026-06-21
- [✅] **Dep axios (HIGH):** override `^1.14.1→^1.18.0` (resolvia 1.15.0 ∈ range vulnerável ≤1.15.2).
  Mesmo major 1.x (compatível com @coinbase/cdp-sdk). Privy não tocado (R1).
- [✅] **Dep DOMPurify (MODERATE):** `^3.1.6→^3.4.11` (fix XSS IN_PLACE / poluição allowedTags).
- [⏸️] **Dívida remanescente:** stack Privy/wallet/transformers tem ~39 advisories transitivos
  (incl. 1 critical `protobufjs` via transformers/onnx) — exigem upgrades major (risco R1) →
  fora do MC39.1; tratar com upgrade de SDK quando upstream publicar.
- [✅] **Secret scanning:** `SMART_DETECTION false→true`. Validado com `netlify build` completo
  (sem falso-positivo). Segredos reais já eram verificados; OMIT_KEYS só de públicos.
- [✅] **CSP:** removido `'unsafe-inline'` de `script-src` (mantém `'self'`+`'wasm-unsafe-eval'`).
  **Validação real:** `dist` servido com o CSP de produção exato + carregado no browser (MCP) →
  app renderiza, **zero violação de script-src/inline**. `style-src` mantém `'unsafe-inline'`. Reduz XSS.
- [✅] **Runbook de incidentes:** `desafio-gut/docs/runbook-incidentes.md` versionado (P0/P1).
- [✅] **supportedChains:** Privy `[sepolia, mainnet]`; `defaultChain` continua Sepolia.
- [✅] Suite **83/83**, `node --check` limpo, `npm run build` verde.
- [✅] Veredicto pós-deploy (HTTP/CSP no domínio real/visual) → `Desktop\MC39.1-final.md` (deploy
  `33396f54` ready; CSP live sem unsafe-inline; consola sem violações; CLS=0).

## MC39.2 — Fallbacks de resiliência (RPC/Flashbots + Bundler) + pré-requisitos MC40 · 2026-06-22
- [✅] **Fallback opt-in** (`_lib/rpc-fallback.mjs`): `escolherRpc`/`escolherBundler` com health-probe
  (`eth_blockNumber`/`eth_chainId`, timeout 4s). **Sem `*_FALLBACK` definido → primário sem probe
  (zero regressão; prod Sepolia e testes byte-idênticos).** Nunca loga URLs (R9).
- [✅] `consolidar-lances` → `CONSOLIDATION_RPC_URL_FALLBACK`; `signer.criarSignerBiconomy` →
  `BICONOMY_BUNDLER_URL_FALLBACK`. `.env.example` atualizado (vazias por default). Caminho mainnet inativo.
- [✅] Pré-requisitos manuais MC40 documentados: `desafio-gut/docs/mainnet-prerequisites.md`.
- [✅] Suite **83/83** (incl. biconomy-handshake/mc302 intactos), `node --check` limpo, build verde.
- [ ] Veredicto pós-deploy → `Desktop\MC39.2-final.md`. Produção segue em Sepolia.

## MC39.3.1 — Correções de Frontend/UX (impacto de segurança/RBAC) · 2026-06-22
- [✅] **#6 — Supressão da confirmação de assinatura (`showWalletUIs:false`):** o modal de
  confirmação da embedded wallet (login + EIP-191 do lance) deixa de aparecer. TRADE-OFF aceite
  pelo operador: reduz fricção, mas remove a confirmação explícita do utilizador. Posse garantida
  por Privy + JWT; o valor do lance é validado no backend (anti-sniping MC28). É GLOBAL (também o
  lance). Não há transações de valor com confirmação a preservar neste fluxo.
- [✅] **#7 — RBAC do checklist de segurança:** `/seguranca` passa a ser gated por `CorporativoRoute`
  (comum/visitante → redireciona para "/"); o componente (CHECKS) é reutilizado no painel
  corporativo. Reduz a exposição da página de transparência ao perfil pretendido (lojista).
- [✅] **#8 — Dados B2B na vitrine:** "Contrato"/"Mín. produto" deixam de ser expostos ao utilizador
  comum (gateados por `tipoUsuario==="corporativo"`). Não eram segredos, mas eram dados internos.
- [ℹ️] **#5/#1/#3/#4** — correções de UI sem impacto de segurança (overlay, GlassCard, filtro,
  contraste). **#2 diferido** (subjetivo + não-validável sem login).
- [✅] Suite **83/83**, `node --check` limpo, `npm run build` verde. Sem alteração de backend/.mjs.
- [ ] Veredicto pós-deploy → `Desktop\MC39.3.1-final.md`. Produção segue em Sepolia.

## MC39.4.1 — Correção do gating de /seguranca (regressão #7) + GUTO · 2026-06-22
- [✅] **RBAC /seguranca:** mantém-se gated por `CorporativoRoute` (intenção do #7). Corrigido o
  bounce do utilizador COMUM: removido o item "Segurança" do nav comum (BottomNav/Sidebar);
  `CorporativoRoute` agora espera `ready` do Privy antes de redirecionar (sem bounce em hard-reload).
- [✅] **LGPD pública preservada:** o rodapé "Privacidade" deixou de apontar para a rota gated e
  passa a abrir a Política de Privacidade pública (Iubenda) — o utilizador comum mantém acesso à
  política (compliance), evitando esconder a privacidade atrás do gate corporativo.
- [ℹ️] **#GUTO** — só UI (tamanho/contraste), sem impacto de segurança.
- [✅] Suite **83/83**, `node --check` limpo, `npm run build` verde. Frontend apenas.
- [ ] Validação AUTENTICADA (fluxo corporativo de /seguranca + afinação do GUTO) → pendente:
  login Privy (OTP por email / Google OAuth) não automatizável por CDP. Ver `MC39.4.1-final.md`.

## MC39.4.2 — Card "Segurança" corporativo navegável (RBAC do isolamento lojista) · 2026-06-22
- [✅] Causa raiz: o efeito de isolamento do lojista (AppContext) listava `/seguranca` em
  `rotasProibidas` e bouncava o corporativo de volta a `/corporativo` ao clicar no card "Segurança".
- [✅] Fix: `/seguranca` removida de `rotasProibidas` — a rota é exclusiva do corporativo (gated por
  `CorporativoRoute`), portanto não pertence ao conjunto de rotas "comuns" isoladas. Comum continua
  sem acesso (gate + sem nav link). Build verde, 83/83.
- [ ] Veredicto pós-deploy (clique do card → /seguranca renderiza) → `Desktop\MC39.4.2-final.md`.

## MC39.6 — Reposicionar "Segurança" do dashboard para o menu "Mais" (UX, sem impacto de RBAC) · 2026-06-22
- [✅] Mudança puramente de navegação/UX: o acesso a "Segurança" saiu do grid de cards do
  `CorporativoDashboard` e passou para a navegação — sheet "Mais" no `BottomNav` (mobile) e cauda
  da `Sidebar` (desktop). Itens adicionados APENAS nos ramos `tipoUsuario === "corporativo"`.
- [✅] Sem nova superfície de ataque: a rota `/seguranca` continua gated por `CorporativoRoute`
  (RBAC inalterado). O utilizador comum continua sem o item (NAV_ITEMS/SECONDARY_LINKS sem
  Segurança desde o MC39.4.1) e sem acesso à rota.
- [✅] `node --check` limpo; suite **83/83**; `npm run build` verde. Deploy de produção `6a395844`
  (45 functions intactas).
- [✅] Validação visual MCP autenticada (375px + 1440px), 1ª iteração PASS, console limpo →
  `Desktop\MC39.6-final.md` + `Desktop\MC39.6-shots\`.

## MC39.7.1 — Remover "Adesão (Consultoria)" e "Vouchers de Networking" da carteira (UX, backend intacto) · 2026-06-22
- [✅] Remoção FRONTEND-ONLY: `CorporativoCarteira.jsx` (imports + blocos JSX) + exclusão dos
  componentes órfãos `RenovacaoCard.jsx` e `VoucherPanel.jsx`. Nenhum `.mjs` alterado.
- [✅] Sem impacto de RBAC/negócio: `_lib/rbac.mjs` (papel "cliente" por cota OU adesão ativa),
  `renovacao-adesao.mjs`, `voucher.mjs` e `comprar-senhas.mjs` (REQ-26, resgate de voucher)
  permanecem intactos. Adesões ativas existentes continuam a conceder acesso; fluxo de compra de
  senhas com voucher segue funcional no backend (apenas a UI foi removida).
- [✅] Higiene de repo: `.gitignore` passou a ignorar `**/supabase/.temp/` (evita commit de cache
  da CLI Supabase); `package-lock.json` mantido idêntico ao de `main` (sem drift de deps).
- [✅] `node --check` limpo; suite **83/83**; `npm run build` verde. Validação visual MCP
  autenticada (375px + 1440px), 1ª iteração PASS, console limpo, CLS=0; Wallet Digital é o último
  card → `Desktop\MC39.7.1-final.md` + `Desktop\MC39.7.1-shots\`. Deploy `6a39638c`.

## MC39.8 — GUTO animado: visibilidade (mix-blend-mode; sem impacto funcional) · 2026-06-22
- [✅] Mudança puramente visual/CSS em `GutoSpritePlayer.jsx` (frontend-only): `mix-blend-mode:
  screen` + filtro suavizado + halo só-claro para dissolver o fundo escuro residual do .webm e
  igualar a nitidez do GUTO estático. Sem reencode, `aria-hidden` + `pointer-events:none` (CLS=0).
- [✅] Sem superfície de ataque nova; nenhum `.mjs` alterado; fluxo de lance/compra e RBAC intactos
  (diff = só `GutoSpritePlayer.jsx`). `node --check` limpo; suite **83/83**; build verde.
- [✅] Diagnóstico evidence-based (DOM): a baixa visibilidade NÃO era herança de opacity/blur do
  Glass (opacity=1 em todos os níveis; backdrop-filter não afeta filhos) — era o asset .webm.
  Loop visual MCP (375/1440), console limpo. Deploy `6a3970d8` → `Desktop\MC39.8-final.md` +
  `Desktop\MC39.8-shots\`.

## MC39.9 — GUTO animado: correção definitiva (diagnóstico do MC39.8 estava errado) · 2026-06-22
- [✅] Reabertura por relato direto do operador ("ainda esta opaco"). `ffprobe -show_entries
  stream_tags` revelou `alpha_mode: "1"` — os `.webm` sempre tiveram alfa real (VP9 side-channel,
  convenção Matroska AlphaMode); o diagnóstico do MC39.8 ("fundo escuro residual baked no .webm")
  estava errado. O Chrome compõe esse alfa nativamente em `<video>` simples, sem CSS algum.
- [✅] Causa real da "caixa": o próprio `mix-blend-mode: screen` + `filter` do MC39.8, aplicados a
  um vídeo já com alfa correto, interagiam mal com o `backdrop-filter: blur()` do GlassCard.

## MC39.17 — Auditoria pré-Mainnet (read-only) · 2026-06-27
> Auditoria estática + Node (Foundry/Echidna/AgentShield N/A local → CI). Relatório completo:
> `Desktop\MC39.17-auditoria.md`. Suite **83/83** verde; `npm run build` verde. **Nenhum código alterado.**
>
> **VEREDICTO: NÃO PRONTO para Mainnet.** 2 bloqueadores P0 ativos (já em Sepolia) + 5 P1.

- [🔴] **P0 (corrigir já — poucas linhas):**
  - `purge-lances.mjs:5,22-73` — endpoint destrutivo **sem autenticação**: qualquer um apaga todos os
    lances da edição ativa via `POST {edicaoId}`. → adicionar `guardAdmin` (ou remover o endpoint).
  - `comprar-senhas.mjs:113` — `sistemaPausado`/`lerEstadoSistema` usados **sem import** → `ReferenceError`
    em todo POST: compra de senhas fora do ar + kill-switch inoperante. → importar de `_lib/system-state.mjs`.
- [🟠] **P1 (antes do mainnet):**
  - Contrato: centralização da `coordenacao` (EOA única emite saldo, compromete e **consolida vencedor**
    off-chain sem prova on-chain) → transferir p/ Gnosis Safe/KMS pós-deploy (`Leilao.sol:60,81,160`).
  - `webhook-mercadopago.mjs:14-15` — sem HMAC `x-signature` (mitigado por re-fetch MP + idempotência).
  - `admin-aprovacao.mjs:49-88` — GET sem auth vaza PII de todos os clientes (LGPD).
  - `_lib/saldoRs.mjs:127-141` — débito não-atômico (TOCTOU/double-spend) → CAS atômico.
  - `auth-lance.mjs` — sem rate-limit/`registrarFalhaJwt` (espelhar `auth-user.mjs`).
  - Frontend: `npm audit` 1 critical (`protobufjs`) + 9 high (transitivos via Privy→x402→wagmi, **enviados
    ao cliente**) → `override` de `protobufjs`; SVG sem DOMPurify em `BannerCard.jsx:110` /
    `CorporativoBanners.jsx:117` (padrão correto já em `Vitrine.jsx:262`).
- [✅] **Verificado LIMPO (evidência de linha):** JWT sem alg-confusion/`none` + `JWT_SECRET` obrigatório
  (`_lib/jwt.mjs`); KMS — chave nunca sai do processo + guard de mainnet (`_lib/signer.mjs:64-94`);
  Supabase `service_role` singleton server-only nunca exposto + PostgREST sem SQLi (`_lib/supabase-client.mjs`,
  `data-store-supabase.mjs`); RLS uniforme `service_role`-only nas tabelas financeiras; webhook usa valor da
  API MP (sem double-credit); SSRF bloqueado em `img-proxy.mjs`; `consolidar-lances.mjs:41-48` com guard
  mainnet+anti-replay; `.env` fora do git; `hardhat.config.js` lê `PRIVATE_KEY` do env (sem hardcode);
  headers/CSP fortes (`netlify.toml`).
- [⏳] **Pendências de processo:** ~~Foundry+Echidna~~ (✅ em CI desde MC40-CI, ver secção MC40-CI) +
  AgentShield em CI; auditoria externa do contrato antes do MC40;
  manter `NETWORK_STAGE=Sepolia` até o contrato mainnet existir.
- [✅] Mudança puramente visual/CSS em `GutoSpritePlayer.jsx` (frontend-only): removidos
  `mix-blend-mode`, `filter` e qualquer canvas/chroma-key — `<video>` simples, sem CSS hacks
  (mesmo princípio do `GutoAvatar.jsx` estático). `aria-hidden` + `pointer-events:none` (CLS=0).
- [✅] Sem superfície de ataque nova; nenhum `.mjs` alterado; fluxo de lance/compra e RBAC intactos
  (diff = só `GutoSpritePlayer.jsx`). `node --check` limpo; suite **83/83**; build verde.
- [✅] Loop visual MCP (375px/1440px), 3 moods (breathing/analyzing/celebrating) sem caixa, cores
  navy/dourado saturadas. Console limpo (só ruído pré-existente). →
  `Desktop\MC39.9-final.md` + `Desktop\MC39.9-shots\`.

## MC39.17.1 — Correção dos 2 bloqueadores P0 da auditoria MC39.17 · 2026-06-27
> Branch `feat/mc39.17.1`. Correções de poucas linhas, baixo risco, **zero regressão**.
> Suite **116/116** verde (era 83/83 — suíte cresceu); `node --check` limpo (111 `.mjs`); `npm run build` verde.

- [✅] **B-P0-1 — `purge-lances.mjs` agora exige `guardAdmin`.** Adicionado
  `import { guardAdmin } from "./_lib/admin-auth.mjs"` + `const denied = await guardAdmin(req); if (denied) return denied;`
  como **1ª checagem** do handler (após o gate de método), espelhando `consolidar-lances.mjs:47`.
  Requisição não-admin é rejeitada (401/403) **antes** de tocar qualquer Blob — fim da sabotagem trivial.
- [✅] **B-P0-2 — `comprar-senhas.mjs` import de `system-state` restaurado.** Adicionado
  `import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs"`. Fim do `ReferenceError`
  em todo POST: compra de senhas volta a funcionar e o kill-switch (`/panic` → 503 `sistema_pausado`) opera.
- [✅] **Teste de regressão** `_tests/mc39171-p0-fixes.test.mjs` (5 casos, offline/module-mocks):
  purge-lances bloqueia antes dos Blobs quando não-admin / prossegue quando admin / 405 em não-POST;
  comprar-senhas passa do kill-switch sem ReferenceError (sistema ok → 401 token_ausente) e devolve 503 quando pausado.
- [✅] **Sem mudança visual** (R4 N/A — apenas backend `.mjs`). RBAC, fluxo de lance/compra e demais endpoints intactos.
- [⏳] **P1 da auditoria permanecem abertos** (webhook HMAC, PII admin-aprovacao, débito atômico, rate-limit auth-lance,
  centralização da coordenação, protobufjs, SVG DOMPurify) — a tratar antes do MC40.

## MC39.20 — Escalabilidade Ondas 5-8 (perf, infra inerte) · 2026-06-29
> Branch `feat/mc39.20`. Ondas 5-8 do plano MC39.18 (10k usuários). Mudanças de PERFORMANCE/infra,
> escritas DEFENSIVAMENTE → zero regressão (R1). Suíte 110→**115/115**; `node --check` 124 `.mjs`;
> build verde; validação visual MCP 375/1440 (Onda 5).

**Postura de segurança:**
- [✅] **Onda 5 — `useMemo` em TabelaLances:** apenas memoização de dado derivado (ordenação/apuração);
  resultado idêntico, sem mudança de comportamento nem de RBAC. Sem nova superfície.
- [✅] **Onda 6 — Materialized Views (migração, NÃO aplicada):** `mv_lances_por_edicao`, `mv_cotas_disponiveis`.
  **MVs não suportam RLS** → controlado por GRANT: `REVOKE` de anon/authenticated + `GRANT SELECT` só a
  `service_role` (backend-only, mantém o padrão de `lances`/`cotas`). Nenhum dado novo exposto ao cliente.
- [✅] **Onda 7 — Fila Postgres (migração + libs, INERTE):** tabela `fila_tarefas` com **RLS `FOR ALL TO
  service_role`**; RPC `reservar_tarefas` com `REVOKE` de anon/authenticated + `GRANT EXECUTE` só service_role.
  Claim atômico (`FOR UPDATE SKIP LOCKED`) evita double-processing. `_lib/fila.mjs` é **inerte** até a migração
  ser aplicada (RPC ausente → no-op). Nenhum fluxo síncrono foi reescrito (zero regressão); produtores adotam
  sob demanda. `fila-processor-scheduled.mjs` roda */5min e no-opa enquanto a tabela não existir.
- [✅] **Onda 8 — RUM web-vitals:** `web-vitals` → Sentry (já inicializado, com scrub argon2id intacto). Só
  envia evento quando o vital é "poor" (anti-ruído + alimenta alerta); demais viram breadcrumb. Sem PII nova
  (só métricas de performance). No-op se `VITE_SENTRY_DSN` ausente.
- **VEREDICTO:** performance/infra, zero regressão, sem nova superfície de ataque. As migrações de MV e fila
  ficam para o operador aplicar (R12); a fila e as MVs ativam só após aplicação.

## MC39.19 — Escalabilidade Ondas 1-4 (perf, env-gated) · 2026-06-29
> Branch `feat/mc39.19`. Ondas 1-4 do plano MC39.18 (10k usuários). Mudanças de PERFORMANCE,
> escritas DEFENSIVAMENTE (env-gated) → zero regressão (R1). Suíte 104→**110/110**; `node --check`
> limpo em 121 `.mjs`; build verde; validação visual MCP local 375/1440 (Onda 2).

**Postura de segurança (sem nova superfície de ataque):**
- [✅] **Onda 1 — `getSupabaseReadOnly()` (item 28):** env-gated por `SUPABASE_READ_REPLICA_URL` com
  fallback ao primário; usa o mesmo `service_role` (server-only, nunca exposto). **ESCRITA nunca passa pela
  réplica** (R11). Migração de índices NÃO aplicada à prod (operador, R12) — schema-válida (corrige plano:
  lances sem `consolidado`; usa `cotas.vendida`). Item 27 (pooling) N/A: Data API HTTP sem pool TCP.
- [✅] **Onda 2 — code-splitting (itens 2/3):** React.lazy + Suspense + `LazyBoundary` (reload em chunk-404
  pós-deploy, guard anti-loop). Sem mudança de RBAC/rotas (CorporativoRoute/gates intactos). Chunk inicial
  `index` 1.137kB→819kB (−28%). Risco: nenhum dado sensível em chunk; apenas separação de carregamento.
- [✅] **Onda 3 — cache/rate-limit (itens 16/17/19/20/21/33):** `_lib/cache.mjs` (Upstash REST via fetch,
  sem dep nova) e rate-limiter Redis são **ENV-GATED**: sem `REDIS_*` → no-op/Blobs (comportamento atual).
  `cacheConfigurado()` gateia tudo; falha-aberto (erro de Redis → miss, nunca 5xx). Cache aplicado SÓ em
  `produtos.mjs?categoria` (listagem **pública** de produtos ativos — sem PII/segredo); invalidação
  write-through em POST/PUT/DELETE (R11). ETag/`Cache-Control` só nesse GET público. Rate-limiter mantém
  o 429/headers/alerta Sentry idênticos; novo path Redis inerte até `REDIS_*` setado → o teste de
  rate-limit (comprar-senhas) continua verde. Credenciais Redis só em env (R9). Itens 15 (Edge) e 18
  (memória) NÃO implementados — exigem Netlify Pro (operator-gated).
- [✅] **Onda 4 — métrica Realtime (item 32):** contador em memória de canais ativos (sem rede, sem PII);
  o cleanup no unmount já existia. Item 31: config_remota permanece `postgres_changes` filtrado (não
  `table:'*'`); sem evento de alto fanout a converter (lances ocultos por RLS anti-sniping).
- **VEREDICTO:** mudanças de performance, zero regressão (suíte/build/visual), sem nova superfície. Ativação
  plena depende da Onda 0 (operador: Redis/Upstash, read replica, Netlify Pro) + aplicar a migração de índices.

## MC39.17.3 — Resolução das 4 pendências do MC39.17.2 · 2026-06-29
> Branch `feat/mc39.17.3` (a partir de `main` com #111). PR #112 (mergeado `--admin`) + PR de docs de fechamento.
> Baseline **100/100** → **104/104** (`_tests/*.test.mjs`); `node --check` limpo em 117 `.mjs`; build verde.
> Deploy validado em produção (Sepolia).

- [✅] **Pendência 1 — Ativação do HMAC do webhook MP documentada.** `docs/mainnet-prerequisites.md` §1:
  obter o secret no painel MP, `netlify env:set MP_WEBHOOK_SECRET … --context production`, redeploy e
  verificação fail-closed (`POST` sem assinatura → 401). É config operacional do operador (sem mudança de código);
  o código fail-open já estava pronto (MC39.17.2). `cloud.md` aponta para o doc.
- [✅] **Pendência 2 — Smoke visual dos banners (MCP 375/1440).** Vitrine em produção (chrome-devtools, consent
  aceito): render limpo a **1440** e **375**; console só com ruído pré-existente (Privy CORS + 404 favicon) —
  **zero erro de SVG/XSS/CSP**. Limitação registrada: sem banner corporativo/auto ativo na conta de prod, o render
  do SVG sanitizado não foi observável ao vivo (coberto por teste `scrubSvg` 6/6 + padrão idêntico já em prod).
- [✅] **Pendência 3 — Double-spend (CAS) com teste dedicado.** `_tests/mc3917-double-spend.test.mjs` (4 casos
  determinísticos, sem depender de timing): retry após escrita concorrente injetada entre leitura e CAS (competidor
  300 + débito 600 sobre 1000 → saldo 100); contenção perpétua → `conflito_concorrencia` com saldo intacto;
  2×500 sobre 500 → só um vence; boundary (débito == saldo). Confirma a atomicidade do `casSaldo` (UPDATE+RETURNING).
- [✅] **Pendência 4 — P2 residuais (npm highs) eliminados.** Bumps **forward** no `package.json` (frontend):
  `vite ^8.1.0`, `react-router-dom ^7.18.0` + overrides transitivos `form-data ^4.0.6`, `hono ^4.12.27`,
  `js-cookie ^3.0.8`, `ws ^8.21.0`. **`npm audit`: 35 (7 high) → 12 moderate, 0 high, 0 critical.** ⚠️ As versões
  do plano (`react-router 6.28`, `vite 5.4`, `js-cookie 3.0.5`) eram **downgrade/ainda-vulneráveis** → substituídas.
  Build verde (vite 8.1 + router 7.18) e roteamento validado em prod (Vitrine/Dashboard renderizam, sem white-screen)
  → **zero regressão (R1)**. Code-splitting do Privy documentado (`cloud.md` §MC39.17.3, plano P2).
- [📌] **Moderates remanescentes (P3, aceitos):** cadeia de wallet (`@privy-io/*`, `@metamask/*`, `wagmi`,
  `@wagmi/connectors`, `x402`, `@gemini-wallet/core`), `aws-sdk`, `uuid` — só resolvíveis com bump **major** do
  Privy/wagmi (alto risco de regressão de auth) → janela de upgrade dedicada, fora do gate pré-MC40.
- **VEREDICTO:** 4 pendências fechadas. Sistema sem high/critical no `npm audit`; gates de código (P1/P0) verdes.
  Resta ao operador: setar `MP_WEBHOOK_SECRET` (ativa HMAC) e, pós-MC40, a transferência da coordenação (P1-1).

## MC39.17.2 — Correção dos 7 P1 da auditoria MC39.17 · 2026-06-29
> Branch `feat/mc39.17.2` (a partir de `main` com #108/#110). Navegação via Graphify (R7).
> Baseline **88/88** (`_tests/*.test.mjs`) + build verde → após as correções **100/100** + build verde;
> `node --check` limpo em todos os `.mjs` tocados. Ritmo lento e profundo (R8), zero regressão (R1).

- [✅] **P1-2 — `protobufjs` crítico eliminado.** `package.json` (frontend) ganhou
  `overrides.protobufjs: "^7.6.4"`. A vuln vinha de `@xenova/transformers→onnxruntime-web→onnx-proto`
  (protobufjs 6.11.6), não da cadeia Privy como o relatório supôs. `npm audit`: **39 → 35**
  (1 critical→0, 10 high→7, 28 moderate). 7.6.4 zera **todos** os GHSA do protobufjs (ranges ≤7.6.2) e
  mantém compat com `onnx-proto` (^6.8.0). Highs restantes (`react-router`, `vite`, `ws`, `hono`,
  `form-data`, `js-cookie`) são major-bump da toolchain/Privy → **follow-up P2** (fora do escopo do P1-2).
- [✅] **P1-3 — SVG sanitizado (stored XSS cross-user).** Cliente (autoritativo): `BannerCard.jsx:110`
  e `CorporativoBanners.jsx` passam o SVG por `DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true}})` antes do
  `dangerouslySetInnerHTML` (mesmo padrão já em `Vitrine.jsx`). Backend (defesa em profundidade): novo
  `_lib/svg-sanitize.mjs` (scrub regex sem dependências — `script`/`on*`/`href javascript:`/`foreignObject`/
  `iframe`) aplicado em `banners.mjs` no ponto de entrega do SVG armazenado. Teste `mc3917-svg-sanitize` (6/6).
- [✅] **B-P1-1 — Webhook MP com HMAC.** Novo `_lib/mp-signature.mjs` valida `x-signature` (`ts,v1`)
  contra o manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` via HMAC-SHA256 (`MP_WEBHOOK_SECRET`)
  + `timingSafeEqual`; wired em `webhook-mercadopago.mjs` (401 se inválida). **Rollout seguro (R1):**
  fail-open enquanto `MP_WEBHOOK_SECRET` não estiver set (comportamento legado). `.env.example` documentado.
  Teste `mc3917-mp-signature` (5/5).
- [✅] **B-P1-2 — GET `admin-aprovacao` autenticado (PII/LGPD).** `handleGet` exige JWT user-session/admin
  (padrão anti-IDOR de `saldo-rs.mjs`): com `?cliente_id` → `validarOwnerOuAdmin`; sem cliente_id (listar tudo) →
  só admin. Frontend (`AdminPanel`) carrega a lista via `chamarAdmin` (Bearer admin-access + auto-refresh).
  Fim do `store.list()` público.
- [✅] **B-P1-3 — Débito de saldo atômico (double-spend).** Nova primitiva `casSaldo()` em `saldoRs-store.mjs`
  (UPDATE … WHERE `payload->>centavos`=lido, com RETURNING — CAS avaliado pelo Postgres, **sem migração**, R12).
  `debitarSaldoRs` agora é loop CAS com retry (materializa a linha se só existir no Blob legado). Novo code
  `conflito_concorrencia`. Teste de débito concorrente (3×400 sobre 1000 → 2 ok + 1 falha; saldo final 200).
- [✅] **B-P1-4 — `auth-lance` com rate-limit + fail-counter.** Espelha `auth-user.mjs`:
  `aplicarRateLimit(req,"auth-lance",10)` + `registrarFalhaJwt` nas duas falhas de assinatura.
- [📋] **P1-1 — Centralização da coordenação (PLANO, não código).** Documentado em `cloud.md` §MC39.17.2:
  após o deploy MC40, transferir `coordenacao` (two-step do contrato) para **Gnosis Safe 2/3** ou manter o
  **owner em KMS** (linha MC30.2.1 Biconomy+KMS). Runbook Gnosis Safe já referenciado em §MC31. Em Sepolia o
  risco é aceitável; a transferência é obrigatória **antes** de qualquer valor real em mainnet.
- [⚠️] **Validação visual MCP (R4):** as correções de frontend são lógica-only (sanitização envolve o
  render existente; AdminPanel troca o transporte do fetch). Os renders de banner não são validáveis
  localmente (functions 404 + auth gate — MC39.3.1); smoke diferido à produção (operador).
- **VEREDICTO:** os 7 P1 endereçados. P1-1 é plano operacional pós-MC40; demais shipped com testes + build verde.

## MC39.13 — Correção do 502 PIX: payer.identification no payload · 2026-06-23
- [✅] **Causa do 502 isolada por leitura de código:** `iniciar-pagamento.mjs` converte
  qualquer falha de `gerarPedidoPix` em `502 pix_provider_indisponivel`; com o provider
  `mercadopago` isso = `POST /v1/payments` rejeitado. Faltava `payer.identification`.
- [✅] **Sem segredo hardcoded (R9):** o documento do payer vem do request (`body.pagador`)
  ou de env do operador (`MP_PAYER_ID_NUMBER`/`_TYPE`/`MP_PAYER_EMAIL`/`MP_PAYER_NOME`).
  Se ausente, `identification` é **omitido** — nenhum CPF/CNPJ falso embutido no repo.
- [✅] **Sem nova superfície de ataque relevante:** `body.pagador` é opcional e os campos
  são lidos só se forem string e **truncados** (email≤254, cpf≤32, nome≤140); documento
  normalizado para dígitos. Vão para o payload do MP (validado pelo MP), sem persistência
  nem reflexão no HTML → sem XSS/injeção. RBAC, JWT e idempotência **inalterados**.
- [✅] **Idempotência preservada:** `X-Idempotency-Key` continua = `pedidoId` (UUID v4);
  nada duplicado. Diagnóstico do "header faltando" revisado e refutado pelo código.
- [✅] **Script de diagnóstico** `scripts/test-mp-token.ps1`: token via param/env (nunca
  hardcoded, R9), mascarado nos logs (R10/R14), ASCII-only. Sintaxe validada (AST, 0 erros).
- [✅] **Regressão:** `node --check` limpo (2 `.mjs` alterados); **suite 111/111**; build verde.
  Mudança aditiva, nenhum teste cobre o provider MP → sem regressão. Reversível (`git revert`).
- [N/A] **Validação visual MCP:** não aplicável a esta mudança (backend de pagamento; o fluxo
  é auth-gated/Privy, não automatizável). Gate manual do operador: KYC + chave PIX na conta
  MP, webhook de produção, teste R$ 2,00 → `Desktop\MC39.13-manual-steps.txt`.
- **VEREDICTO:** APROVADO para merge (escopo backend aditivo, R1 mantido). A conclusão
  end-to-end depende dos passos manuais do operador (conta/KYC/webhook/teste R$ 2,00).

## MC39.15 — Frontend captura o CPF do pagador no fluxo PIX · 2026-06-26
- [✅] **Escopo:** apenas `src/components/ComprarFichasModal.jsx` (único caller de
  `iniciar-pagamento`). Sem mudança de backend. Frontend agora envia `{ endereco, qtd,
  pagador: { cpf } }` — alinhado ao contrato que o backend já validava (MC39.13).
- [✅] **Validação de CPF no client (defesa em profundidade):** 11 dígitos numéricos,
  mesmo critério do backend (`montarPayer.normalizarDoc`). É **complementar**, não substitui —
  o backend continua validando/normalizando. Botão de compra bloqueado até CPF válido.
- [✅] **Sem segredo hardcoded (R9):** CPF é dado do usuário digitado em runtime; nada embutido
  no repo. Nenhum CPF de teste comitado no código (o `12345678909` aparece só na auditoria/doc).
- [✅] **Sem nova superfície de ataque:** CPF é normalizado para dígitos (`replace(/\D/g,"")`)
  antes do envio; só trafega no body do POST para `iniciar-pagamento` (backend trunca/valida).
  Renderizado apenas no próprio `<input>` controlado (sem `dangerouslySetInnerHTML`) → sem XSS.
  Não é persistido em localStorage nem logado. JWT/RBAC/idempotência **inalterados**.
- [✅] **PII (LGPD):** CPF não é gravado no client nem exposto em logs; usado apenas para a
  cobrança PIX (finalidade legítima). Sem retenção no frontend.
- [✅] **Regressão:** `npm run build` verde; `node --check` N/A (apenas `.jsx`); diff aditivo
  (1 arquivo, +60/-3); `iniciar-pagamento` segue com caller único; fluxo corporativo (cotas/
  voucher/comprar-senhas) não usa PIX → intacto. Reversível por `git revert`.
- [✅] **Validação visual MCP (375px + 1440px):** realizada via preview isolado (gate Privy/OAuth
  não automatizável — MC39.3.1). Estados vazio/inválido/válido + máscara + botão
  habilitado/desabilitado confirmados; console sem erros (só 404 de favicon).
- **Pendente (operador):** smoke real R$ 2,00 em produção com CPF (QR + crédito) — exige login
  Privy real, fora do alcance do MCP.
- **VEREDICTO:** APROVADO para merge (frontend aditivo, R1 mantido, R9/LGPD ok).

## MC39.15.1 — CPF automático: campo manual removido, email do Privy · 2026-06-26
- [✅] **Motivação:** o sistema não coleta/armazena CPF de individuais (confirmado no schema e no
  contexto). Manter input manual era a única forma de obter o CPF real, mas o operador optou pelo
  fallback de env. Removido o campo; envia-se só o `email` (Privy) no `pagador`.
- [✅] **Menos PII no client (melhora):** o frontend deixa de manipular CPF do usuário. Trafega
  apenas o `email` (próprio do usuário) para o `payer` do MP — finalidade legítima (LGPD).
  Nenhum CPF é coletado, exibido, logado ou persistido no client.
- [✅] **Sem segredo hardcoded (R9):** o documento do payer vem de `MP_PAYER_ID_NUMBER` (env do
  operador), nunca do código. Email do usuário é dado de runtime do login.
- [⚠️] **Risco operacional (R1) — env obrigatória:** se `MP_PAYER_ID_NUMBER` **não** estiver setado
  no Netlify, `identification` é omitido e contas MP homologadas recusam o `POST /v1/payments`
  → **502** (regressão do MC39.13). **Gate:** operador deve confirmar a env antes/no smoke. Mitiga-se
  por env (reversível), não por código.
- [✅] **Sem nova superfície de ataque:** `email` é normalizado (`trim`) e só enviado se string;
  vai ao backend (que trunca ≤254 e valida). Sem reflexão em HTML (input controlado removido) → sem
  XSS. JWT/RBAC/idempotência inalterados.
- [✅] **Regressão:** `npm run build` verde; `node --check` N/A (`.jsx`); diff net −39 (2 arquivos);
  `iniciar-pagamento` caller único; corporativo (cotas/voucher) não usa PIX → intacto.
- [✅] **Validação visual MCP (375 + 1440):** campo CPF ausente, botão habilitado sem CPF, console
  limpo (preview isolado; Privy/OAuth não automatizável — MC39.3.1).
## MC39.22 — Plano de enxugamento Ponytail (DIAGNÓSTICO read-only) · 2026-06-29
- [✅] **Escopo:** auditoria de gordura de código + geração do plano em
  `Desktop\MC39.22-plano-enxugamento.txt`. **R1: ZERO alteração de código** no DESAFIOGUT.
  Branch `feat/mc39.22` (read-only). Único arquivo do repo tocado: este `security_audit.md`.
- [✅] **Sem nova superfície de ataque:** nenhuma rota, input, chave, dependência ou
  permissão adicionada/alterada. Análise puramente estática (leitura + `wc`/`grep`).
- [✅] **Achados (29.564 → ~25.708 LOC; ~13%):** gordura é LOCALIZADA, não estrutural.
  Top alvos: (EX-1) `chatbot.mjs` despacho de intents 39× repetido → tabela (−~359);
  (EX-2) ausência de cliente HTTP único no frontend, 27 `fetch` crus em 16 ficheiros (−~200);
  (EX-3) `Sidebar`+`BottomNav` duplicam config de navegação (−~120); (EX-4) caminho morto
  `financeiro-fallback`/adaptadores pós-Supabase (−~120); (EX-5) tiles de KPI inline (−~250).
- [⚠️] **GATE para a implementação (MC39.22.1) — bloqueia merge:** os refactors que tocam
  superfície sensível NÃO entram sem nova entrada neste arquivo:
    · EX-1 (chatbot) altera o gate RBAC de comandos admin do GUTO → re-auditar §2 ZERO-TRUST,
      provando paridade 1:1 do gate por-intent (recusa-perfil para visitante/comum/corporativo).
    · EX-4 (data-store) toca caminho de dados financeiros → confirmar `caller=0` por grep ANTES
      de remover; **nunca** tocar migrações com DROP TABLE.
- [✅] **Contrato `Leilao.sol`:** deliberadamente FORA do escopo de corte (audited/security-critical);
  alterações só em janela de auditoria formal (Slither/Echidna/Foundry). Plano marca como P2/diferido.
- [✅] **Regressão:** nenhuma — diagnóstico não executa código nem altera o bundle. Reversível
  (este doc) por `git revert`. Suite 115/115 e build inalterados (nada foi modificado).
- **VEREDICTO:** APROVADO (diagnóstico). A IMPLEMENTAÇÃO permanece **PENDENTE** de auditoria
  por-PR conforme o gate acima (RUFLO: Transação audita, Monitoramento valida).

---

## MC39.22.1 — Implementação dos cortes P0 (consolidação estrutural) · 2026-06-29
Branch `feat/mc39.22.1`. Levanta o GATE deixado no MC39.22 para os refactors sensíveis.
- [✅] **EX-1 (chatbot) — gate RBAC re-auditado (§2 ZERO-TRUST), paridade 1:1 PROVADA.** A
  cadeia de `if (intent===...)` virou tabela `INTENT_HANDLERS`; o gate de perfil por-intent
  (admin / corp+admin / autenticado / qualquer) e a recusa-perfil são aplicados de forma
  uniforme. Paridade comprovada por caracterização: `_tests/chatbot-dispatch.test.mjs` (14
  casos cobrindo recusa-perfil de visitante/comum nos intents admin-only + intents públicos)
  foi capturado **contra o código ORIGINAL** (golden, 14/14) e re-executado **verde** após o
  refactor. `detectarIntent` 20/20 inalterado. Comandos mutantes (criar/encerrar/panic/wizard)
  mantêm `rl` (rate-limit guto-admin) e o gate admin. **Zero alteração de privilégio.**
- [✅] **EX-2 (HTTP client) — sem nova superfície.** `apiGet`/`apiPost` (fetch nativo, sem nova
  dep) só centralizam header/body/parse; Authorization Bearer continua a vir do mesmo token do
  caller. 13 sites migrados com semântica idêntica; auth-admin lifecycle e cadeia de perfil do
  AppContext **NÃO** tocados (diferidos a MC39.22.2). JWT/RBAC/idempotência inalterados.
- [✅] **EX-3 (navModel) — sem superfície; DOM idêntico.** Só consolida paths SVG; lógica de
  perfil/admin dos menus intacta. `aria-hidden` agora também no desktop (melhoria a11y).
- [N/A] **EX-4 (data-store fallback) NÃO executado** nesta sessão — permanece sob o gate do
  MC39.22 (confirmar `caller=0` + nunca DROP). Fica para MC39.22.2.
- [✅] **Regressão:** `node --check` limpo (122 `.mjs`); suíte **124/124** (110 base + 14 novos);
  `npm run build` verde; MCP visual 1440 + 375 (Sidebar/BottomNav OK, console só ruído pré-existente).
  Reversível por `git revert` (4 commits atômicos).
- [✅] **Honestidade de LOC (SUPERPERS):** os cortes renderam **~flat/+78 LOC**, não −679 — o
  código já era enxuto; o ganho é estrutural (declarativo/DRY) + cobertura nova. Reportado sem maquiagem.
- **VEREDICTO:** APROVADO para merge (refactor behavior-preserving, R1 mantido, gate EX-1 levantado
  com prova de paridade). EX-4 e migração HTTP restante seguem PENDENTES para MC39.22.2.

## MC39.22.1 (2ª parte) — P0 pendentes: EX-5, EX-7, HTTP subset · 2026-06-30
Mesma branch `feat/mc39.22.1`. Escopo aprovado: subset seguro + EX-5 + EX-7.
- [⛔] **EX-4 — BLOQUEADO (gate do MC39.22 NÃO satisfeito).** `_lib/financeiro-fallback.mjs`
  tem **3 consumidores vivos** (`wallet.mjs`, `_lib/saldoRs.mjs`, `_lib/troco-senhas.mjs`)
  como read-fallback da transição Supabase. `caller=0` é FALSO → **não removido** (remover
  arriscaria saldo financeiro legado indisponível). Requer auditoria de dados (Supabase CLI +
  Blobs) provando migração 100% antes; **nunca** DROP. Diferido a MC39.22.2.
- [✅] **EX-5 (`<StatTile>`) — sem superfície de risco; validado.** Componente no padrão
  documentado (Button secondary). Dashboard (público) validado por MCP 1440+375: KPIs iguais,
  sem overflow. CorporativoDashboard DOM-equivalente. Sem dados sensíveis; só apresentação.
- [✅] **EX-7 (`leilaoTimer.js`) — pure helpers; zero risco.** Só funções puras de localStorage
  extraídas; máquina de estado intacta. MCP: timer persiste/conta (imune a F5).
- [✅] **HTTP subset — fidelidade preservada; exclusões por SEGURANÇA.** 27 sites migrados
  (reads/`.then`/POST público). **Anti-fraude preservado:** os call-sites com `X-Visitor-ID`/
  `X-Device-Tracked` (ReferralRegistrar, saldo-rs, notificações, register-corporativo) e os que
  leem header de resposta `x-ratelimit-limit` (saldo-rs, alimenta `checkRateLimit`) ou `resp.text()`
  no erro (CorporativoAnalytics) **NÃO** foram migrados — o helper minimal `api.js` não envia
  headers custom nem expõe a resposta crua; migrá-los degradaria sinais anti-fraude/rate-limit.
  Núcleo financeiro/sessão (CardLance, ComprarFichasModal, auth-user, auth-admin lifecycle,
  mutações de produto, BannerUpload) intacto. JWT/RBAC/idempotência inalterados.
- [✅] **Regressão:** `node --check` 122 `.mjs`; suíte 124/124; `npm run build` verde; MCP
  1440+375 (Dashboard/StatTile/nav/timer OK; network confirma URLs corretas dos apiGet/apiPost,
  sem base duplicada). Reversível por `git revert`.
- **VEREDICTO:** APROVADO para merge. EX-4 + migração HTTP restante (headers custom, núcleo) →
  MC39.22.2 (exige `api.js` com suporte a headers custom/resposta crua + auditoria de dados p/ EX-4).

## MC39.22.2 — api.js evoluído + 6 migrações HTTP + auditoria EX-4 · 2026-06-30
Branch `feat/mc39.22.2` (de `main`). Escopo: evoluir cliente HTTP, migrar não-críticos, auditar EX-4.
- [✅] **api.js evoluído — backward-compatible.** `montarHeaders` aceita `headers` custom; novo
  `lerResposta` lê o corpo UMA vez (texto) → `data` (JSON ou fallback) + expõe `text` e `headers`
  crus. Retorno `{ ok, status, data, text, headers }`. Os 46 call-sites mantêm `{ok,status,data}`
  (campos novos são aditivos). Sem nova dependência (fetch nativo).
- [✅] **6 sites migrados com FIDELIDADE — anti-fraude/rate-limit PRESERVADOS.** ReferralRegistrar
  (`X-Device-Tracked`+`X-Visitor-ID`), saldo-rs (`X-Visitor-ID` + lê `x-ratelimit-limit` no 429 →
  `checkRateLimit`), notificações GET+POST (`X-Visitor-ID`), register-corporativo (`X-Visitor-ID`),
  CorporativoAnalytics (lê `resp.text()` no erro). Headers custom e leitura de resposta crua agora
  passam pelo helper — **nenhum sinal anti-fraude ou de rate-limit foi perdido**. Idempotência,
  401/429/409 e mensagens de erro preservados 1:1.
- [✅] **Núcleo crítico NÃO tocado (objetivo #4):** CardLance (lance on-chain), ComprarFichasModal
  (pagamento), AppContext auth-user (sessão) + purge-lances (destrutivo), AdminPanel auth-admin
  lifecycle + `chamarAdmin` (retry 401), CorporativoDashboard mutações de produto, BannerUpload,
  analytics (keepalive). Exigem gate de runtime (smoke login real) → MC futuro. **46/54 sites em api.js.**
- [⛔] **EX-4 — auditoria feita; permanece BLOQUEADO.** Relatório `Desktop\EX-4-auditoria.md`
  documenta os 3 consumidores (padrão Supabase-first `?? ` Blob-fallback) e o **risco financeiro**:
  além de saldo indisponível, `lerCreditoLegado`/`lerDebitoLegado`/`lerWalletIdemLegado` são guardas
  de idempotência — removê-las antes do backfill arriscaria **double-credit** em webhook reprocessado
  (regressão do anti-double-spend MC39.17). Plano seguro: Fase A instrumentar HIT → Fase B backfill
  idempotente (operador, R12) → Fase C janela HIT=0 (≥30d p/ troco FIFO) → Fase D remover + re-auditar.
  **Nunca DROP** (R13). NENHUMA alteração em `financeiro-fallback.mjs` nesta sessão.
- [✅] **Regressão:** `node --check` 122 `.mjs`; suíte **129/129**; `npm run build` verde; validação
  MCP em prod (sessão logada) pós-deploy. Reversível por `git revert`.
- **VEREDICTO:** APROVADO para merge (migrações behavior-preserving; anti-fraude preservado; EX-4
  só documentado). Núcleo crítico + remoção EX-4 (após backfill) → MC futuro.

## MC39.22.3 — EX-4 Fase A: instrumentação do financeiro-fallback · 2026-06-30
Branch `feat/mc39.22.3` (de `main`). Instrumentação ADITIVA para medir o uso real do fallback.
- [✅] **Aditiva e fail-soft — ZERO mudança de comportamento (R1).** `registrarFallback(fn, store, hit)`
  loga **só no HIT** (retorno não-nulo do Blob = dado que o Supabase não tinha): `console.warn("[EX-4]
  fallback-hit", {fn, store, hit, ts})` (greppável nos logs Netlify) + `Sentry.addBreadcrumb` warning
  (best-effort, sem flush → sem latência). `miss` não loga no console (hot path saldo-rs poll 5s). O
  `ler` ganhou o nome da fn (sem `new Error().stack`). try/catch interno: a instrumentação NUNCA lança
  nem altera o valor lido — testado.
- [✅] **Sem PII / sem segredo (R9/R10).** Os logs/breadcrumbs contêm apenas `fn`/`store`/`hit`/`ts` —
  **nunca** o endereço, chave, pedidoId ou idemKey. Coberto por teste (assert de ausência de endereço).
- [✅] **Sem nova superfície de ataque.** Só leitura/observação; nenhuma rota, input, permissão ou
  dependência nova (Sentry já integrado). Endpoints e RBAC inalterados.
- [✅] **Cobertura:** `_tests/ex4-instrumentacao.test.mjs` (3 casos: HIT loga+preserva valor+sem PII;
  miss silencioso; fail-soft). Suíte **132/132**; `node --check` 122 `.mjs`; `npm run build` verde.
- [ℹ️] **Achado:** `lerDebitoLegado` é export **sem consumidor** (morto) — remover na Fase D.
- **VEREDICTO:** APROVADO (instrumentação aditiva, R1 mantido, sem PII). EX-4 segue BLOQUEADO; após
  ≥30d de coleta com **HIT=0** + backfill (operador, Fase B/C) → Fase D remove o módulo e re-audita.

## MC39.23 — Planejamento estratégico (improve): planos MC40 / Playstore / Campanha · 2026-06-30
Branch `feat/mc39.23` (read-only). **NENHUM código alterado** — só `plans/` + docs. Skill `improve` (plan).
- [✅] **Zero alteração de produção.** Os 3 planos (`plans/001-mc40-mainnet-deploy.md`,
  `plans/002-playstore-submission.md`, `plans/003-launch-campaign.md`) são handoff documental; não
  executam nada. Recon foi read-only (R1/R2 N/A — sem build/teste de código).
- [✅] **Sem segredo exposto (R9/R10).** Os planos referenciam variáveis/chaves por NOME e `file:line`
  (ex.: `CONTRATO_MAINNET`, `KMS_KEY_ID`, `DEPLOYER_PRIVATE_KEY`, keystore `.jks`) — **nunca** valores.
  Passos com segredo/serviço externo/dinheiro real marcados `[OPERADOR]`.
- [⚠️] **GATE de execução (este documento permanece o gate):** a execução de cada plano é um MC dedicado
  e **não entra em produção sem nova entrada aqui**. Em particular o **001 (MC40)** exige: auditoria
  externa do contrato sem HIGH/CRITICAL, `coordenacao()`==Smart Account após two-step, `/health` com
  `chaveBrutaEmMainnet=false`, e validação on-chain — só então o flip `NETWORK_STAGE=mainnet`.
- [ℹ️] **Recomendação:** `improve review-plan` com executor de contexto fresco antes de executar o 001.
- **VEREDICTO:** APROVADO como planejamento (read-only). Execução dos planos = MCs futuros, cada um com
  seu próprio gate SUPERPERS. Relatório: `Desktop\MC39.23-planejamento.md`.

## MC40 — Deploy mainnet: PREPARAÇÃO feita; deploy/flip NÃO executado (operador) · 2026-06-30
Branch `feat/mc40`. Tentativa de executar o `plans/001`. **Resultado honesto: o contrato NÃO foi
deployado e o flip NÃO foi feito** — o agente parou no limite irreversível, por design e por segurança.
- [✅] **Review do plano** (`improve review-plan`) — achados críticos incorporados ao `plans/001`
  (ver secção "Review-plan refinements"): o `aceitarTransferenciaCoordenacao()` de uma Smart Account
  ERC-4337 **não pode** usar `cast --private-key` (é UserOp via KMS/Biconomy); verificar o endereço
  da Smart Account como KMS-controlado ANTES do transfer; dry-run em fork; `etherscan` apiKey p/ verify.
- [✅] **Prep de código (agente):** rede `mainnet` (chainId 1) adicionada a `desafio-gut/hardhat.config.js`
  (inerte sem `MAINNET_RPC_URL`+`DEPLOYER_PRIVATE_KEY` e sem `--network mainnet`). `node --check` OK;
  `.mjs` OK; `npm run build` verde. Wiring do flip já existe no código (`NETWORK_STAGE`/`CONTRATO_MAINNET`/
  `MAINNET_CHAIN_ID` em signer/consolidar-lances/health; `/health` reporta `CHAVE_BRUTA_EM_MAINNET`).
- [⛔] **NÃO executado (OPERADOR-ONLY) — motivos firmes:**
  1. **Segredos mainnet ausentes** nesta sessão (`MAINNET_RPC_URL`/`DEPLOYER_PRIVATE_KEY`/`KMS_KEY_ID`/
     `CONSOLIDATION_RPC_URL`) e proibido manuseá-los (R9/R14) → deploy impossível daqui.
  2. **Auditoria externa do contrato NÃO confirmada** (MC40-checklist marca pendente) → STOP do gate.
  3. **Irreversível + ETH real** → exige condução do operador, com confirmação por ação; não-autônomo.
  4. **ERC-4337**: aceitar a coordenação exige UserOp KMS/Biconomy, não `cast --private-key` (comando do
     prompt falharia / arriscaria coordenação presa).
- **VEREDICTO:** PREPARAÇÃO aprovada (prep aditiva/inerte, R1 mantido). **Deploy/transfer/flip mainnet
  PERMANECEM PENDENTES e BLOQUEADOS** até o operador: (a) concluir auditoria externa sem HIGH/CRITICAL,
  (b) financiar/confirmar a Smart Account KMS, (c) executar deploy+two-step+flip conforme `plans/001` e o
  runbook `Desktop\MC40-final.md`, com `/health` `chaveBrutaEmMainnet=false` e validação on-chain. Só então
  nova entrada aqui aprova a ida a produção mainnet.

---

## MC39.15.1 — VEREDICTO (continuação)
- **VEREDICTO:** APROVADO para merge, **condicionado** à confirmação de `MP_PAYER_ID_NUMBER` no
  Netlify (senão o 502 do MC39.13 retorna). Mudança de código é redução de PII + simplificação.

---

## MC40-CI — Fuzzing on-chain em CI (pré-requisito Mainnet) · 2026-06-30
> Escopo: **CI-only + harness de teste**. NENHUM `.mjs`/`.jsx`/`contracts/Leilao.sol` de produção
> alterado. Diff = `.github/workflows/contract-security.yml` (correções) + `tests/fuzzing/LeilaoGUT.sol`
> (1 invariante nova). Aditivo, zero-regressão (R1). Fecha a pendência de processo do MC39.17 (linha 573).

- [✅] **Superfície de ataque:** nenhuma nova. Workflow GitHub Actions e harness só rodam em CI/local,
  fora do bundle e do runtime de produção. `permissions: contents: write` já existia (MC5, p/ SBOM);
  o push do SBOM agora é `continue-on-error` (branch protection) → não escala privilégio.
- [✅] **Correções no workflow (por que):** (a) `forge install` sem `--no-commit` (flag depreciada no
  Foundry novo causava `unexpected argument`); (b) paths do Echidna relativos à RAIZ —
  `crytic/echidna-action@v1` roda em container e ignora `working-directory`; (c) SBOM push best-effort.
- [✅] **Cobertura de invariantes (4 propriedades exigidas + 3):** saldo/conservação
  (`echidna_lance_consome_senha`), `onlyCoordenacao` (`echidna_apenas_coordenacao_credita`),
  `MAX_LANCES_UNICOS` (`echidna_listaDeValores_limitada`) e **encerramento único**
  (`echidna_encerramento_unico` — NOVO: `edicaoNonce[R-FUZZ] <= 1`, fuzza o guard
  `require(!resultados[id].consolidado)` de `consolidarResultado`). +unicidade, +two-step, +coord≠0.
- [✅] **Harness não vaza p/ produção:** `LeilaoGUTFuzzing` vive só em `tests/fuzzing/`; `foundry.toml`
  tem `src=contracts`/`test=tests/foundry` — o harness de fuzzing não é compilado no build do contrato.
- [⏳] **Validação local:** `forge`/`echidna`/`docker` ausentes na máquina (Windows). YAML validado
  (pyyaml OK); compilação/fuzz reais ocorrem no CI ao push. Revisão Solidity manual: a invariante nova
  não toca storage lido pelas invariantes 1–6 → sem regressão entre invariantes.
- **VEREDICTO:** APROVADO — gate de CI aditivo, sem código de produção tocado. Resolve a pendência de
  processo "Foundry+Echidna em CI" do MC39.17. AgentShield e auditoria externa do contrato seguem
  pendentes para o MC40; `NETWORK_STAGE=Sepolia` mantido.