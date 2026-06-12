# DESAFIOGUT — cloud.md (Documentação Viva do Sistema)

> Manifesto único do sistema auto-governado. O projeto deve ser compreensível
> apenas lendo este ficheiro. Atualizado em: 2026-06-12 (MC20.3).
> Pilares: **Superpers** (auto-revisão) · **Everything Cloud Code** (modular) · **RUFLO** (orquestração de agentes).

---

## 1. Visão geral

DESAFIOGUT é uma plataforma de leilão de "menor lance único" (Art. VIII) com pipeline de
lance **100% on-chain** (Sepolia testnet), autenticação sem barreira via **Privy** (Google/
E-mail/Apple → embedded wallet) e um assistente cognitivo (**GUTO**, RAG sobre o regulamento).
Há dois mundos: **participante** (leilão) e **corporativo/lojista** (cotas, banners, analytics).

### Stack

| Camada | Tecnologia |
|---|---|
| Build | Vite 8 |
| UI | React 18.3 · Tailwind v4 (CSS-first, @theme em `globals.css`) · Shadcn manual |
| Animações | Framer Motion 12 |
| Auth + Wallet | Privy (embedded, Sepolia `11155111`) |
| Blockchain | ethers v6 · contrato `LeilaoGUT` (Sepolia) |
| Hash off-chain | Argon2id via `hash-wasm` |
| Backend | Netlify Functions (`.mjs`) |
| Observabilidade | Sentry (scrub de `argon2id_`) |
| Deploy | Netlify (SPA rewrite) |

Raiz frontend: `desafio-gut/frontend/`. Alias `@` → `src/`.

---

## 2. Os 3 Agentes RUFLO (orquestração)

Modelo conceptual de responsabilidades. Comunicam por **estado partilhado** (React Context),
não por acoplamento direto. Cada agente é um conjunto lógico de módulos (mapeamento na §4).

### 🎨 Agente de Interface (UI/UX, GUTO, animações)
- **Dono de:** AppLayout (3 camadas), Nav Dock, GutoSpritePlayer, BackgroundCanvas,
  AtmosphereFilter, vidro temperado (`.gut-glass`), ChatbotWidget (apresentação), cards.
- **Estado partilhado:** `useAppContextEnvironment` (`appState`, `gutoMood`, `activeTab`).
- **Animações do GUTO (MC-PRE20):** `idle.webm` (respiração, constante) · `thinking.webm`
  (pergunta no chatbot) · `celebration.webm` (fim de rodada com vencedor). Mesmo ficheiro
  desktop/mobile. Fundo oficial **limpo** (sem GUTO estático, MC20.PRE.2).

### 🔐 Agente de Transação (segurança on-chain, PIX, cotas)
- **Dono de:** fluxo de lance (CardLance + `web3.js`), idempotência, rate limit, assinatura
  EIP-191, edições on-chain, cotas/voucher corporativo, referral.
- **Verdade do saldo:** SEMPRE on-chain (`getSaldoSenhasOnChain` + eventos `LanceDado`/
  `SenhasCreditadas`). A UI nunca é fonte de verdade (optimistic updates ADIADOS — ver §6).

### 📊 Agente de Monitoramento (auditoria, logs, performance)
- **Dono de:** Sentry (`main.jsx`), `[GUT-DEBUG]` (erros/CSP), notificações/auditoria,
  funções `monitor-onchain`, `ia-preditiva`, `purge-logs` (scheduled), `security_audit.md`.
- **Métricas-alvo:** CLS=0, FCP sem degradação, 60 FPS mobile.

### Protocolo de comunicação entre agentes
- **Estado partilhado central:** `AppContext` (negócio: saldo, perfil, edições, notificações)
  + `AppEnvironmentProvider` (ambiente: appState/gutoMood/activeTab) — provider ANINHADO,
  nunca substitui o AppContext (anti-regressão).
- **Fluxo de sinal (ex.):** ChatbotWidget → `signalThinking()` → `appState='thinking'` →
  `gutoMood='analyzing'` → GutoSpritePlayer troca `thinking.webm` + AtmosphereFilter borra o
  fundo. Resposta chega → `signalIdle()` → volta a `idle.webm`.
- **Memória centralizada:** `localStorage` (`gut_chat_history`, `gut_consentimento`,
  `desafiogut_ref`) + estado on-chain (carteira/saldo).

---

## 3. Skills (capacidades existentes)

| Skill | O que faz | Ficheiros âncora |
|---|---|---|
| **guto-chatbot** | RAG 24/7 sobre o regulamento (DeepSeek), cards (wizard/notif/indicação), estados do GUTO | `components/ChatbotWidget.jsx`, `functions/chatbot.mjs` |
| **guto-notificacoes** | Eventos (lance único, venceu, perdeu exclusividade, sistema) como cards | `functions/notificacoes.mjs`, AppContext (`notificacoes`) |
| **indique-e-ganhe** | Código pessoal, link, estatísticas, registo de `?ref=` | `components/ReferralRegistrar.jsx`, `ReferralTracker.jsx`, `functions/referral.mjs`, `_lib/referral` |
| **referral** | Vínculo de indicação e conversão | idem acima |
| **corporativo** | Painel lojista, cotas, banners, analytics, carteira | `pages/Corporativo*.jsx`, `functions/cotas.mjs` |
| **edicoes** | CRUD de edições + cronómetros (relâmpago/programado) | `utils/web3.js` (`getEdicaoPrazo`), `Dashboard` (EdicaoTimerCard) |
| **perfis (RBAC)** | Deteção de tipoUsuario (comum/corporativo) + admin | `App.jsx` (CorporativoRoute, DashboardOuCorporativo), `hooks/useAdmin.js` |
| **lance** | Pipeline de lance flash/programado, Argon2id, EIP-191, idempotência | `components/CardLance.jsx`, `utils/web3.js`, `functions/lance-relampago.mjs`, `auth-lance` |
| **animacoes-guto (MC-PRE20)** | 3 animações oficiais + fundo limpo | `public/assets/guto/animations/*.webm`, `public/assets/backgrounds/*.webp` |

---

## 4. Estrutura modular (Everything Cloud Code) — mapeamento lógico

> Decisão MC20.3: **mapeamento LÓGICO documentado**, sem mover ficheiros físicos. Mover
> componentes React para `/skills /agents /hooks` na raiz quebraria o alias `@`/build do Vite
> (R1/R7). A modularidade é expressa aqui (donos, fronteiras, comunicação) e nos commits.
> Convenção para código NOVO: agrupar por agente/skill conforme abaixo.

```
DESAFIOGUT/
├── cloud.md                  ← este manifesto
├── security_audit.md         ← checklist de segurança (gate de merge)
└── desafio-gut/frontend/src/
    ├── [AGENTE INTERFACE]
    │   ├── widgets/layout/{AppLayout,BackgroundCanvas,AtmosphereFilter,Layout,Sidebar,BottomNav}.jsx
    │   ├── components/{GutoSpritePlayer,GutoAvatar,ChatbotWidget}.jsx
    │   ├── components/ui/{card,badge,progress}.jsx   (+ .gut-glass em globals.css)
    │   └── context/useAppContextEnvironment.jsx      (estado de ambiente)
    ├── [AGENTE TRANSACAO]
    │   ├── components/{CardLance,TabelaLances}.jsx
    │   ├── utils/{web3,sanitize,rateLimiter}.js
    │   ├── hooks/useTrocarPorSenhas.js
    │   └── pages/Corporativo*.jsx
    ├── [AGENTE MONITORAMENTO]
    │   ├── main.jsx (Sentry + [GUT-DEBUG] + CSP listener)
    │   └── components/ReferralTracker.jsx
    ├── [SHARED STATE] context/AppContext.jsx
    └── [HOOKS] hooks/{useShakeOnError,useIsMobile,useAdmin,useTrocarPorSenhas}.js
                + context/useAppContextEnvironment.jsx
└── desafio-gut/frontend/  (raiz) netlify functions: chatbot, lance-relampago, cotas,
        referral, notificacoes, voucher, wallet, monitor-onchain(.scheduled),
        ia-preditiva(.scheduled), purge-logs(.scheduled), auth-lance; _lib/{jwt,rate-limiter,...}
```

R3 (segmentação >100 linhas): aplica-se a código NOVO. Ficheiros legados grandes (Dashboard,
ChatbotWidget) **não** são refatorados retroativamente sem necessidade (evita regressão R1).

---

## 5. Regras de revisão Superpers (auto-governo)

1. **Gate de merge:** nenhum código entra em produção sem passar pelo `security_audit.md`.
   Se não estiver sólido, **não fazer merge**.
2. **Ciclo de auto-revisão por commit:** `node --check` limpo em todos os `.mjs` + `npm run build`
   verde (R7) + validação visual MCP (ANTES/DEPOIS, 375px+1440px) + CLS=0 (R9).
3. **Boulder Loop:** máx. 3 iterações por fase; à 3ª falha, parar e reportar (R10).
4. **Otimizar > criar:** preferir melhorar funções existentes a criar novas desnecessárias (R2).
5. **Skills de design** consultadas antes de cada implementação visual: @design-engineering
   (spring/anti-CLS), @impeccable-design (consistência/contraste), @taste-engineering
   (minimalismo, copy honesta) (R11).

---

## 6. Estado do redesign (MC20.x) e riscos abertos

| Fase | Estado |
|---|---|
| MC20.PRE.2 — fundos oficiais limpos (sem GUTO estático) | ✅ |
| FASE 1 — AppLayout 3 camadas + env context + 3 animações | ✅ |
| FASE 2 — Nav Dock flutuante + Active Indicator + morph do "Dar Lance" | ✅ |
| FASE 3 — GutoSpritePlayer + parallax + useShakeOnError | ✅ |
| Vidro temperado (`.gut-glass`) nos componentes glassmórficos | ✅ |
| ITEM 7 — prefetch Mercado Pago | ⏸️ sem credenciais (achado A) — faseável |
| ITEM 10 — Optimistic Updates no lance | ⏸️ **RISCO ADIADO** — ver §abaixo |

### ITEM 10 (optimistic updates) — risco registado
Decremento otimista do saldo na UI + rollback + reconciliação com `LanceDado`/`SenhasCreditadas`.
**Não implementado** por não ser validável localmente (sem Privy/Sepolia no dev). Quando avançar:
ligar o `useShakeOnError` ao `onError`, garantir reconciliação on-chain (a UI nunca é verdade)
e correr o checklist de concorrência do `security_audit.md`.

---

## 7. Paleta e tokens (globals.css @theme)
- Navy: `#050818` (void) · `#0d1235` / `#131844` (superfícies). Acentos laranja: `#ff6b35` / `#ff9500`.
- Vidro temperado: `.gut-glass` — bg navy/25, backdrop-blur-xl, border white/10, shadow,
  ring-inset white/5, reflexo superior (::before), hover/active.
- Z-Index Matrix: `-z-50` Arena (BackgroundCanvas) · `-z-40` Atmosfera · `z-0` Superfície.

---

## 8. Como contribuir (resumo operacional)
1. Branch a partir do último estado validado. Commits atómicos (1 por item/fase).
2. A cada commit: `node --check` `.mjs` + `npm run build` verde.
3. Validar via MCP (chrome-devtools) a 375px e 1440px; CLS=0.
4. Registar a alteração neste `cloud.md` e o veredicto no `security_audit.md`.
5. PR para `main` (sem merge direto).
