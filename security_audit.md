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
