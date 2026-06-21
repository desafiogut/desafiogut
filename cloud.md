# DESAFIOGUT — cloud.md (Documentação Viva do Sistema)

> Manifesto único do sistema auto-governado. O projeto deve ser compreensível
> apenas lendo este ficheiro. Atualizado em: 2026-06-14 (MC25.3).
> Pilares: **Superpers** (auto-revisão) · **Everything Cloud Code** (modular) · **RUFLO** (orquestração de agentes).
> MC25.3: Unificação total do vidro — .gut-glass-standard (navy-based fixo, padrão único).

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
  AtmosphereFilter, vidro temperado (`.gut-glass-standard`), ChatbotWidget (apresentação), cards.
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
    │   ├── components/ui/{GlassCard,Button,Input,Table,Modal}.jsx   (MC23.3 Glass UI primitives)
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
| **MC23.3 — Adoção completa Glass UI** (5 primitivos: GlassCard, Button, Input, Table, Modal; 19 ficheiros migrados; `.glass-panel` padrão) | ✅ (PR #54 feat/mc23.3) |
| **MC21.1 FASE 2 — Vidro no visitante** (rodapé global + MercadoLances; Dashboard/Vitrine/SejaParceiro/Chatbot já compatíveis) | ✅ parcial |
| **MC21.2** — Trindade do Vidro nas páginas corporativo/admin/auth-gated + visitante restante | ✅ (PR #48, merged) |
| **MC22.1 SecA** — i18n PT/EN/ES (`IdiomaProvider`+`useT()`, `src/i18n/*`, persiste `gut_lang`, `<html lang>`); Configuracoes migrado; shell faseável | ✅ |
| **MC22.1 SecB** — slider de opacidade do vidro: `--glass-opacity` em `:root`, `.glass-panel`/`.gut-glass` ligados; `SliderOpacidade` persiste `gut_glass_opacity` | ✅ |
| **MC22.1 SecC** — menu "Mais" denso e legível (não usa o `.gut-glass` ultra-transparente) | ✅ |
| **MC22.1 SecD** — GUTO: webm re-encodados c/ canal alfa (sem quadrado); `GutoSpritePlayer variant="inline"`; companion do cronómetro (Edição Ativa + Outras Edições); removido do global | ✅ |
| **MC22.2 SecA** — Padronizar Lances: 4 painéis migrados de `rgba(255,255,255,0.03)` para `var(--glass-opacity)`; blur adicionado | ✅ |
| **MC22.2 SecB** — Slider global: 13 ficheiros, 39 painéis migrados para `var(--glass-opacity)`; zero `0.03` hardcoded restante | ✅ |
| **MC22.2 SecC** — `--nav-glass` (`rgba(13,18,53,0.66)`): barrinha + menu "Mais" unificados; `.nav-glass` com blur(22px) sempre ligado | ✅ |
| **MC22.2 SecD** — Webm re-encodados com canal alfa REAL (VP9 yuva420p, colorkey #050818); cache-busting `?v=mc222` | ✅ |
| **MC22.2 SecE** — Barra lateral restaurada com `.nav-glass` (piso próprio); GUTO global reposto no canto (.gut-sprite) | ✅ |
| **MC23.1.1** — Nav Dock unificado (`.dock-icon` em todos os ícones) + Chatbot legível (`.chat-glass`, navy 0.92, blur sempre, independente do slider) | ✅ (merged) |
| **MC23.I/D2** — Celebração de vencedor do GUTO toca UMA vez (`GutoSpritePlayer` `loop=false` p/ `celebrating`); idle/thinking continuam em loop | ✅ |
| **MC23.I/D1** — Múltiplos `FimLeilaoOverlay` fullscreen empilhados quando >1 edição encerra junto (guards não coordenados: global `fimDisparadoRef` vs `fimDisparadoMapRef`) | ⏸️ não reproduzível em dev (edições vêm de Blobs/404 local) — ver §abaixo |
| **MC23.2** — Auditoria de design/UX (lotes 1-3): limpeza de contraste WCAG AA — textos muted ad-hoc `#334155`/`#4a6490`/`#5a7090`/`#64748b` (1.76-3.82:1) unificados ao token `--color-gut-muted #6b7db8` (~4.55:1) em 21 ficheiros; vidro/layout 375+1440 sem novos bugs | ✅ |
| ITEM 7 — prefetch Mercado Pago | ⏸️ sem credenciais (achado A) — faseável |
| ITEM 10 — Optimistic Updates no lance | ⏸️ **RISCO ADIADO** — ver §abaixo |

### MC23.I/D1 (overlay de vencedor duplicado) — registado para ambiente reproduzível
Quando >1 edição encerra em simultâneo, cada `FimLeilaoOverlay` é um modal fullscreen
(`fixed inset:0 z:10000`) com Confetti próprio → empilham-se 2-3 overlays (Dashboard.jsx:526
overlay global da edição ativa + Dashboard.jsx:145 overlay por-card de cada "Outra Edição").
Os guards não se coordenam. Correção proposta: coordenador ÚNICO (um overlay por encerramento)
ou cards só mostram estado "Encerrada" sem modal próprio. NÃO implementado nesta passagem por
não ser reproduzível/validável em dev (edições vêm de Netlify Blobs, 404 local) — implementar
e validar onde haja múltiplas edições reais (R1: zero-regressão exige validação visual).

### ITEM 10 (optimistic updates) — risco registado
Decremento otimista do saldo na UI + rollback + reconciliação com `LanceDado`/`SenhasCreditadas`.
**Não implementado** por não ser validável localmente (sem Privy/Sepolia no dev). Quando avançar:
ligar o `useShakeOnError` ao `onError`, garantir reconciliação on-chain (a UI nunca é verdade)
e correr o checklist de concorrência do `security_audit.md`.

---

## 7. Paleta e tokens (globals.css @theme)
- Navy: `#050818` (void) · `#0d1235` / `#131844` (superfícies). Acentos laranja: `#ff6b35` / `#ff9500`.
- Vidro temperado (sistema único MC21.1/MC25.1): **`.glass-panel`** canónico — `bg-white/[0.06]`
  (tinta NEUTRA, arena visível como ATMOSFERA — "Regra de Ouro" preservada).
  MC25.1 (2026-06-14) duplicou --glass-opacity de 0.03 → 0.06: após a migração Glass UI
  (MC23.3) universalizar o vidro por 30+ referências inline + 9 componentes, 3% era demasiado
  transparente (arena WebP dominava todos os painéis). A 6%, o vidro mantém translucidez mas
  garante hierarquia visual e legibilidade WCAG AA (contraste ≥ 4.5:1 até 0.10).
  DESFOQUE VIVO (`backdrop-blur-none` mobile / `md:backdrop-blur-xl` p/ 60fps),
  `backdrop-saturate-150`, border white/10, shadow `0_8px_32px/0.37`.
- Z-Index Matrix: `-z-50` Arena (BackgroundCanvas) · `-z-40` Atmosfera · `z-0` Superfície.
- **MC22.2 — `.nav-glass`**: superfície de navegação com piso de opacidade INDEPENDENTE do slider.
  Token `--nav-glass: rgba(13,18,53,0.66)` (navy translúcido intermédio). blur(22px) SEMPRE ligado
  (mobile + desktop). Aplicado ao Nav Dock, sheet "Mais" e Sidebar — nunca mais desaparecem na Arena.
  NÃO alterado pelo MC25.1 (já denso a 66% navy, não apresentava problema de legibilidade).
  Todos os painéis `rgba(255,255,255,0.03)` → `rgba(255,255,255,var(--glass-opacity,0.06))`.

---

## 7.1 MC25.1 — Ajuste de --glass-opacity (2026-06-14)

**PR:** feat/mc25.1 → main | **Opção:** A | **Branch:** feat/mc25.1

### Causa Raiz
Após a migração Glass UI (MC23.3) universalizar `.glass-panel` e `.gut-glass` para TODOS os
componentes (GlassCard, Button secondary, Input, Table, Modal, Error, Tooltip, Empty, Skeleton,
Card) + 30+ referências inline em 13 páginas, o valor `--glass-opacity: 0.03` calibrado no
MC21.1 tornou-se demasiado baixo. O efeito cumulativo de mais de 40 superfícies com apenas 3%
de branco fazia a arena WebP dominar visualmente todos os painéis ("vidro fantasma").

### Alterações
| Ficheiro | Linha | Antes | Depois |
|---|---|---|---|
| globals.css | L314 | `:root { --glass-opacity: 0.03 }` | `:root { --glass-opacity: 0.06 }` |
| SliderOpacidade.jsx | L7 | `const DEFAULT = 0.03` | `const DEFAULT = 0.06` |

### Não alterado
- --nav-glass: rgba(13,18,53,0.66) — independente do slider, já denso
- --chat-glass: rgba(13,18,53,0.92) — independente do slider
- .dock-icon: rgba(255,255,255,0.06) — hardcoded
- Slider: continua 0–0.15, step 0.005 (20% = valor antigo acessível)

### Validação
- ✅ MCP chrome-devtools: 8 páginas inspecionadas (Dashboard, MercadoLances, Vitrine,
  SejaNossoParceiro, MinhaCarteira, MeusAtivos, Configuracoes, AdminPanel)
- ✅ Zero erros de consola novos
- ✅ GUTO, Nav Dock, Chatbot presentes e funcionais
- ✅ Slider funcional (localStorage: gut_glass_opacity = 0.06)
- ✅ WCAG AA preservado (contraste ≥ 4.5:1 para todas as cores de texto)
- ✅ npm run build verde (5.13s)

---

## 7.2 MC25.3 — Unificação total do vidro: .gut-glass-standard (2026-06-14)

**PR:** feat/mc25.3 → main | **Opção:** C (Padrão Único e Imutável)

### Causa Raiz
5 sistemas de vidro em conflito (.glass-panel, .gut-glass, .nav-glass, .chat-glass, +
~30 referências inline a --glass-opacity) com propriedades divergentes (white-based vs
navy-based, blur só desktop vs sempre ligado, saturate 135/140/150, borderRadius
14/16/18/20px). Os 4 cards KPI do Dashboard usam inline navy/0.25 + blur(24px)
saturate(135%) como padrão-ouro — mas nenhum outro componente seguia este padrão.

### Solução
Criação de UMA classe CSS canónica `.gut-glass-standard` com o padrão extraído dos
4 cards KPI do Dashboard (Saldo, Senhas, Lances Únicos, Total de Lances):

```css
.gut-glass-standard {
  background: rgba(13,18,53,0.25);        /* navy 25%, FIXO */
  backdrop-filter: blur(24px) saturate(135%); /* SEMPRE ligado */
  -webkit-backdrop-filter: blur(24px) saturate(135%);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 8px 32px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(255,255,255,0.05);
  border-radius: 14px;                    /* raio canónico */
}
```

### Alterações (26 ficheiros)

**Removido (Segmento 2):**
- --glass-opacity, --nav-glass, --chat-glass do :root — 3 tokens CSS obsoletos
- .glass-panel, .gut-glass, .nav-glass, .chat-glass — 4 classes CSS conflituantes
- SliderOpacidade.jsx (68 linhas) — componente e applyStoredGlassOpacity()
- Secção "Intensidade do vidro" em Configuracoes.jsx — UI do slider
- ::before reflexo do .gut-glass — elemento decorativo desnecessário

**Substituído (Segmento 3):**
- Glass UI (8 componentes): GlassCard, Button (secondary), Input, Modal, Table/THead,
  ErrorState, Tooltip, Card (shadcn legado) → .gut-glass-standard
- Layout (4 widgets): BottomNav (Nav Dock + sheet "Mais"), Sidebar, Footer, ChatbotWidget
- Páginas (11): AdminPanel, Configuracoes, CorporativoAnalytics, CorporativoCarteira,
  CorporativoDashboard, DetalheProduto, MercadoLances, MinhaCarteira, Seguranca,
  SejaNossoParceiro, Vitrine
- ~26 referências inline: rgba(255,255,255,var(--glass-opacity,0.03)) →
  rgba(13,18,53,0.25) navy fixo

### Não alterado
- 4 cards KPI do Dashboard (Saldo, Senhas, Lances Únicos, Total de Lances) —
  **inalterados**, são o padrão-ouro
- Paleta de cores, tipografia, animações, estrutura de layout
- BackgroundCanvas, AtmosphereFilter, GUTO (GutoSpritePlayer)
- Lógica de negócio (AppContext, lances, auth)
- .dock-icon — cápsula de ícone, não é vidro

### Comportamento
| Propriedade | Antes (MC25.1) | Depois (MC25.3) |
|---|---|---|
| Cor base | white/0.06 (lavava dark mode) | navy/0.25 (tom sobre tom) |
| Blur mobile | OFF (fantasma) | blur(24px) SEMPRE |
| Blur desktop | blur-xl (24px) | blur(24px) |
| Saturate | 150% | 135% (padrão-ouro) |
| Border-radius | 16/18/20px (inconsistente) | 14px (canónico) |
| ::before reflexo | Sim (.gut-glass) | Não |
| Slider | Sim (white-based 0–0.15) | Não (valor fixo imutável) |
| Nav Dock opacidade | 66% (2.6× padrão) | 25% |
| Chatbot opacidade | 92% (3.7× padrão) | 25% |

### Validação
- ✅ MCP chrome-devtools: Dashboard, MercadoLances, Vitrine, Configuracoes, MinhaCarteira,
  AdminPanel, SejaNossoParceiro
- ✅ ZERO classes antigas (.glass-panel, .nav-glass, .chat-glass) em TODAS as páginas
- ✅ 4 cards KPI do Dashboard INALTERADOS (padrão-ouro preservado)
- ✅ .gut-glass-standard presente em todas as páginas com bg/blur/shadow corretos
- ✅ SliderOpacidade completamente removido (componente, import, UI, localStorage)
- ✅ Secção "Intensidade do vidro" removida de Configuracoes
- ✅ Zero erros de console novos (apenas CSP/Sentry/WalletConnect pré-existentes)
- ✅ npm run build verde (5.71s)
- ✅ node --check limpo para todos os .mjs

### Lição Aprendida
**Um padrão, uma fonte de verdade.** 5 sistemas de vidro criaram inconsistência visual
acumulada ao longo de 6 PRs (MC20–MC25.1). A convergência para um único token fixo,
extraído diretamente do padrão-ouro (cards KPI do Dashboard), elimina a classe inteira
de bugs de vidro. O slider de opacidade, embora flexível, introduzia uma variável de
inconsistência — cada utilizador via um vidro diferente, violando @taste-engineering
regra 7 (consistência) e @impeccable-design regra 5 (glass comedido).

---

## 7.3 MC27.1 — Fundo animado em looping (par v3: Profundidade Cinemática) (2026-06-14)

**PR:** feat/mc27.1 → main | **Branch:** feat/mc27.1

### Objetivo
Integrar o par de animações v3 (Profundidade Cinemática) como fundo animado oficial.
Melhoria progressiva: `<video>` WebM VP9 com fallback estático WebP intacto.

### Alterações
| Ficheiro | Linhas | Descrição |
|---|---|---|
| `src/widgets/layout/BackgroundCanvas.jsx` | +46 / −7 | Adiciona elementos `<video>` com autoPlay/muted/loop/playsInline, state `videoEnabled`/`videoError`, listener `prefers-reduced-motion`, fallback estático preservado |
| `src/globals.css` | +28 | Adiciona classes `.gut-bg-video`, `.gut-bg-video--mobile`, `.gut-bg-video--desktop` com crossfade idêntico às layers + `@media (prefers-reduced-motion: reduce) { display: none }` |

### Comportamento
| Condição | Vídeo renderiza? | Fundo estático? |
|---|---|---|
| Browser suporta WebM/VP9 | Sim (loop seamless 5s) | Coberto pelo vídeo (DOM order) |
| Browser NÃO suporta | Não (onError) | Sim (.gut-bg-layer) |
| prefers-reduced-motion | Não (JS + CSS) | Sim (.gut-bg-layer) |
| Erro de carregamento | Não (onError) | Sim (.gut-bg-layer) |
| Rede lenta | Poster visível (anti-flash) | Sim (fallback layer) |

### Estratégia de fallback
- **DOM order**: `<div>` layers renderizadas PRIMEIRO, `<video>` DEPOIS → mesmo z-index (-50), vídeo pinta por cima. Quando removido (erro/reduced-motion), layers voltam a ser visíveis.
- **Poster**: imagem estática oficial (WebP) → anti-flash + anti-CLS.
- **Dupla defesa acessibilidade**: JS (`matchMedia` listener + `useReducedMotion`) + CSS (`@media` query).
- **onError** no `<video>` → `setVideoError(true)` → React remove o vídeo do DOM.

### Arquivos de mídia
| Ficheiro | Dimensões | Tamanho | Codec |
|---|---|---|---|
| `fundo-loop-v3-desktop.webm` | 1920×1288 | 354 KB | VP9, 24fps, 5s seamless |
| `fundo-loop-v3-mobile.webm` | 1080×1935 | 411 KB | VP9, 24fps, 5s seamless |
| `background-desktop.webp` (poster/fallback) | 1920×1288 | 109 KB | WebP |
| `background-mobile.webp` (poster/fallback) | 1080×1935 | 200 KB | WebP |

### Não alterado
- App.jsx — BackgroundCanvas já montado globalmente (2×: gate LGPD + app principal)
- AppLayout.jsx — arquitetura de camadas inalterada
- AtmosphereFilter.jsx (-z-40), Layout, Sidebar, BottomNav — sem alterações
- Z-index Matrix: -50 (bg) → -40 (atmosfera) → 0 (superfície) → 6 (GUTO)
- Paleta navy+laranja, scrim (`--gut-bg-scrim`), Glass UI (`.gut-glass-standard`)
- GUTO (GutoSpritePlayer), Nav Dock, Chatbot — todos intactos

### Validação
- ✅ Vídeo desktop (1440px) a reproduzir em looping (readyState 4, 5s seamless)
- ✅ Vídeo mobile (375px) a reproduzir com crossfade CSS correto
- ✅ CLS = 0 (PerformanceObserver, poster = mesmas dimensões do vídeo)
- ✅ Fallback: onError → 0 vídeos no DOM, layers WebP estáticas visíveis
- ✅ prefers-reduced-motion: 0 vídeos (JS matchMedia + CSS @media)
- ✅ Zero erros de consola novos (apenas CSP/Sentry/WalletConnect pré-existentes)
- ✅ npm run build verde (4.93s)
- ✅ Cross-page smoke test: Dashboard, MercadoLances, Carteira, Corporativo

### Lição Aprendida
**DOM order determina paint order no mesmo z-index.** A primeira versão do MC27.1 renderizava
`<video>` antes das `<div>` layers no DOM. Como partilham `z-index: -50` e `position: fixed`,
as layers pintavam por cima e cobriam o vídeo completamente. A correção (1 iteração Boulder Loop)
foi inverter a ordem: layers primeiro, vídeo depois → vídeo pinta por cima, fallback automático
quando o vídeo é removido.

---

## MC30.2.1 — Migração da assinatura isolada (Defender → Biconomy + KMS)

**Branch:** `feat/mc30.2.1` | **Motivação:** sunset do OpenZeppelin Defender (2026-07-01).

### O que mudou
- Novo backend de assinatura **`biconomy`** (ERC-4337) na fachada `_lib/signer.mjs`,
  selecionável por `SIGNER_BACKEND=biconomy`. `defender` mantido como **fallback** (R11);
  `local-key` (testnet) inalterado. Os **3 call-sites não foram tocados** (adapter ethers v6).
- **Owner via KMS** (`_lib/kms-signer.mjs` + `_lib/kms/aws-kms.mjs`): a chave privada da
  coordenação vive no KMS/HSM remoto e **nunca entra no processo** (R9/R12). Normalização
  DER → low-S + recovery id `v` validada contra `ethers`.
- **Adapter** `BiconomySmartAccountSigner`: traduz `contract.metodo(...)` em UserOperation
  (Bundler resolve nonces; Paymaster opcional subsidia gás) e expõe o hash real + recibo.
- Guarda `assertChaveBrutaAusenteEmMainnet` endurecida para o modo biconomy.
- Dependências: `@biconomy/account` v4 (+ `viem ^2` peer) e `@aws-sdk/client-kms`.

### Mudança de endereço (achado #1)
Em ERC-4337 o `msg.sender` on-chain é o **Smart Account** (≠ EOA). Autoridade transferida
via two-step do contrato (`iniciar`/`aceitarTransferenciaCoordenacao`) — `Leilao.sol` **não muda**.

### Validação
- ✅ Suíte de funções **57/57** (38 originais + 19 novos: kms 6, biconomy 3, guarda 5, integração 5).
- ✅ `node --check` verde em 89 `.mjs`; `npm run build` verde (6.52s).
- ✅ Zero alterações em `src/`, GUTO, Glass UI, fundo animado, `Leilao.sol`.

### ✅ Conclusão — isolamento da chave concluído (2026-06-20)
A coordenação foi **transferida on-chain** para o Smart Account ERC-4337 com **owner em AWS KMS**:

- **Smart Account (nova coordenação):** `0xdEbe637d7f74C4bfe71263920F68589f0c672D92`
- **Owner KMS (EOA):** `0xAEFe11EDBb32fb6727693e5994a51df8ADb5EdFF` — a chave privada **vive no
  AWS KMS** (`ECC_SECG_P256K1`) e **nunca entra no processo Node**; o KMS só recebe digests
  e devolve assinaturas DER.
- **Transferência two-step (Sepolia, contrato `0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5`):**
  - Etapa 1 `iniciarTransferenciaCoordenacao` — tx `0xa32aaea1bad595d45c105a48b562ac4afe47a19d272be3b65c242da9f5908f5a`
  - Etapa 2 `aceitarTransferenciaCoordenacao` — tx `0xb8d92cae7a5d2b54cb5823a8fc1448e842d706a5f63f780b2b12811c8b150812` (`success=true`)
  - Estado final: `coordenacao()` = Smart Account · `coordenacaoPendente()` = `0x0` · Smart Account deployado.
- **Chaves antigas removidas do Netlify:** `COORDENACAO_PRIVATE_KEY`, `DEFENDER_API_KEY`,
  `DEFENDER_API_SECRET` (production) + redeploy. Endpoint de diagnóstico `mc302-aceitar`
  desativado (token `MC302_DIAG_TOKEN` removido → HTTP 503).

> Notas operacionais da execução: o Bundler v2 da Biconomy descontinuou Sepolia; a UserOp
> foi enviada via **bundler da Alchemy** (build/assinatura via SDK Biconomy + KMS). A guarda
> `assertChaveBrutaAusenteEmMainnet` continua a impedir a reintrodução de chave bruta.

### Pendente (follow-ups não-bloqueantes)
- ✅ **SEG 8 — concluído no MC31:** backend `defender` removido do código (ver §MC31).
- 📄 **SEG 9 — documentado no MC31:** runbook da **Gnosis Safe** (multisig 2/3) no
  `security_audit.md` (§MC31). Execução on-chain continua pendente (decisão do operador).
- `COORDENACAO_PRIVATE_KEY` permanece **apenas** no caminho `local-key` (testnet) por desenho (R3).

### Runbook — tooling e correções (2026-06-18)
- **Smoke real:** `scripts/mc302-smoke.mjs` valida o handshake KMS+Biconomy com
  credenciais **reais** (read-only; os testes em `_tests/` são mockados e NÃO validam
  creds reais). Uso: `node scripts/mc302-smoke.mjs`. Imprime owner EOA (KMS), endereço
  do Smart Account e o estado da transferência on-chain. Nunca envia transações.
- **Variável correta:** o código lê **`KMS_KEY_ID`** (o ARN é o valor), `KMS_PROVIDER=aws`,
  `AWS_REGION` — não `KMS_KEY_ARN`.
- **Alvo da transferência two-step = endereço do Smart Account** (contrato ERC-4337),
  **≠** EOA owner e ≠ coordenação atual (achado #1). O owner KMS é uma **chave nova**
  gerada no KMS (decisão do operador: isolamento máximo, R3). Não há "fazer coincidir
  com a coordenação atual".

> Detalhe completo: `desafio-gut/docs/MC30.2.1-isolamento-chave.md`.

---

## MC31 — Consolidação: remover Defender, preparar Gnosis Safe, adotar primitivos Glass UI (2026-06-20)

> Branch `feat/mc31`. Três tarefas de consolidação. `Leilao.sol` **não muda**;
> nenhuma transação on-chain executada.

### 1. Backend Defender removido (SEG 8 do MC30.2.1)
- `_lib/signer.mjs`: removido o caminho `'defender'` de `backendAssinatura()`, a função
  `criarSignerDefender()` e os imports do `@openzeppelin/defender-sdk`. **Default mainnet
  passa de `defender` para `biconomy`.** Mantidos `local-key` (testnet) e `biconomy` (mainnet).
- Consumidores atualizados (sem regressão no caminho biconomy): `consolidar-lances`,
  `ia-preditiva`, `health`, `debug-pedido`, `contract` deixam de exigir `DEFENDER_*` e
  passam a exigir `KMS_KEY_ID`/`BICONOMY_BUNDLER_URL` no caminho não-`local-key`.
- `@openzeppelin/defender-sdk` desinstalado; `.env.example` limpo do bloco `DEFENDER_*`.
- Testes `mc30-signer`: handshake Defender → guarda KMS + teste MC31 (defender deixa de
  ser reconhecido). **Reduz a superfície de confiança** (menos um backend e uma dependência).

### 2. Gnosis Safe multisig — runbook (SEG 9 do MC30.2.1)
- Apenas **documentação**: `security_audit.md` §MC31 descreve a migração da coordenação do
  Smart Account (owner único KMS) para uma **Gnosis Safe 2/3** via o two-step do contrato.
  Sem transações on-chain.

### 3. Adoção dos primitivos Glass UI (Auditoria 5 do MC23)
- Auditoria (ITEM 3.1): a adoção dos primitivos foi concluída em MC21–MC25. O **único
  duplicado ad-hoc exato** de `.gut-glass-standard` que restava — `CorporativoAnalytics`
  (objeto inline `cardStyle`) — foi migrado para `<GlassCard>` (mudança visual **nula**).
- Exceções deliberadas preservadas (converter = redesign, viola R1): os **4 cards KPI do
  Dashboard** (padrão-ouro, fonte do `.gut-glass-standard`), `BottomNav` (chrome), overlays
  e painel da página crítica `MercadoLances` (MC28), `motion.section` com tint em
  `SejaNossoParceiro`, tabelas custom (`MeusAtivos`/`DetalheProduto`), `<select>`/`<textarea>`
  (sem primitivo `<input>`-equivalente) e estilos de tipografia.

### Validação
- ✅ Suíte de funções **57/57**; `node --check` verde em todos os `.mjs`; `npm run build` verde.
- ✅ MC28 (keyperbid 4 + seguranca 6) e MC30.2.1 (guarda 5 + integração 5 + kms 6 + biconomy 3) verdes.
- ✅ Visual MCP (chrome-devtools): Dashboard 1440px + estreito, **4 KPI inalterados**, vidro
  consistente, **CLS=0**, sem novos erros de console (apenas ruído walletconnect/CSP pré-existente).
- ✅ Zero alterações em GUTO, Indique e Ganhe, edições, fluxo corporativo, `Leilao.sol`.

### 4. Proxy de imagem de produto (validação visual em produção)
A validação MCP em produção apanhou um produto com "Imagem URL" externa bloqueada pelo CSP
(`img-src`). Em vez de alargar o CSP a domínios arbitrários, adicionou-se **`netlify/functions/
img-proxy.mjs`** — proxy **same-origin** (coberto por `img-src 'self'`) com guardas SSRF (só
http(s); bloqueio de IPs privados/loopback/link-local por literal + resolução DNS fail-closed;
`redirect: "error"`; valida `content-type image/*`; limites de tamanho/tempo). Frontend: helper
`src/lib/imagem.js` (`imagemProdutoSrc`) roteia URLs externas pelo proxy nos 3 render sites
(Vitrine, CorporativoDashboard, DetalheProduto). Uploads (base64) e blob: continuam diretos.
**CSP inalterado.** Testes: `img-proxy` 4/4 → suíte **61/61**. Detalhe: `security_audit.md` §MC31.4.

> Relatório: `Desktop/MC31-final.md`. Detalhe de segurança: `desafio-gut/security_audit.md` §MC31.

---

## 8. Como contribuir (resumo operacional)
1. Branch a partir do último estado validado. Commits atómicos (1 por item/fase).
2. A cada commit: `node --check` `.mjs` + `npm run build` verde.
3. Validar via MCP (chrome-devtools) a 375px e 1440px; CLS=0.
4. Registar a alteração neste `cloud.md` e o veredicto no `security_audit.md`.
5. PR para `main` (sem merge direto).

---

## 9. MC29.1 — Modelo de Entrega Híbrido e Transparente

### 9.1 Objetivo
Permitir a distribuição nas lojas (Apple App Store / Google Play) em conformidade
com as diretrizes, SEM esconder funcionalidades (rejeitámos o modelo de
camuflagem por violar a Apple Guideline 2.3.1). Cada plataforma recebe a
experiência adequada às suas regras, de forma TRANSPARENTE:

- **PWA (versão Web):** experiência completa — leilão de menor lance único Web3.
- **iOS / Android (app das lojas):** o leilão é DECLARADO como disponível na
  versão Web; em seu lugar surge um placeholder transparente. Nada é escondido.

### 9.2 Camada de Abstração de Dados (adapters)
Preparação para trocar Netlify Blobs → Supabase sem alterar a lógica de negócio.

```
_lib/data-store.mjs          ← facade único (getConfig/setConfig/getLances/addLance)
   ├─ data-store-blobs.mjs    ← backend ATUAL (Netlify Blobs) — delega lances no
   │                            bids-store.mjs (Key-Per-Bid MC28, intacto)
   └─ data-store-supabase.mjs ← backend FUTURO (a criar no MC-Supabase)
```

- Seleção por env `DATA_STORE_BACKEND` (default `blobs`), carregada em runtime.
- Regra: código novo NUNCA importa `@netlify/blobs` diretamente — só o adapter.
- A migração dos módulos legados é incremental (fora do âmbito do MC29.1).

### 9.3 Configuração remota por plataforma
- Blob `config-experiencia:recursos_app` (via `scripts/seed-recursos-app.mjs`).
- Endpoint `GET /.netlify/functions/recursos-app?plataforma=ios|android|pwa`
  → `{ plataforma, isLeilaoAtivo, isPagamentoNativoAtivo }`.
- Hook `src/hooks/useRecursosApp.js` — deteção de plataforma honesta: browser
  puro NUNCA é classificado como nativo (sem regressão para iOS/Android em
  Safari/Chrome); só o wrapper da loja (`window.GUT_NATIVE.platform`) ou o
  override `?plataforma=` ativam o modo de conformidade. Fail-soft → PWA com
  leilão ativo (o utilizador real nunca é penalizado por falha de leitura).
- Defaults: `isLeilaoAtivo { ios:false, android:false, pwa:true }`,
  `isPagamentoNativoAtivo { ios:false, android:false, pwa:false }`.

### 9.4 Superfícies de conformidade
- `MercadoLances.jsx`: em modo loja, os componentes de leilão (CardLance,
  TabelaLances, timers, overlays) ficam DESMONTADOS; surge `MercadoConformidade`
  (Glass UI `.gut-glass-standard`, dimensões fixas → CLS=0) com aviso transparente.
- `CardLance.jsx`: rede de segurança — skeleton em modo loja; o formulário
  on-chain nunca é montado.
- GUTO (`chatbot.mjs` + `guto-perfis.mjs`): persona de loja que NUNCA nega o
  leilão — informa que está na versão Web e ajuda com produtos/entregas/trocas.
  No PWA, as 4 personas (visitante/comum/corporativo/admin) ficam intactas.

### 9.5 Desenho Conceptual Supabase (DESENHO — NÃO IMPLEMENTADO)
> ESTAS TABELAS NÃO ESTÃO IMPLEMENTADAS. São o desenho conceptual para o
> MC-Supabase. Hoje os dados vivem em Netlify Blobs atrás do adapter.

```sql
-- recursos_app: flags de funcionalidade por plataforma
create table recursos_app (
  chave          text    not null,                       -- ex: 'isLeilaoAtivo'
  plataforma     text    not null check (plataforma in ('ios','android','pwa')),
  valor_booleano boolean not null default false,
  atualizado_em  timestamptz not null default now(),
  primary key (chave, plataforma)
);
-- RLS: SELECT público (flags não são segredo); escrita só service_role.
alter table recursos_app enable row level security;
create policy recursos_app_leitura on recursos_app for select using (true);

-- lances: migração futura dos Blobs Key-Per-Bid (MC28)
create table lances (
  id              uuid primary key default gen_random_uuid(),
  edicao_id       text        not null,
  lancador        text        not null,                  -- endereço (lowercase)
  commitment_hash text        not null,                  -- prova Argon2id off-chain
  valor_centavos  integer     not null check (valor_centavos between 1 and 999999),
  criado_em       timestamptz not null default now()
);
-- RLS: leitura pública OCULTA por prazo — só revela valor_centavos após o fecho
-- da edição (anti-sniping; espelha a blindagem MC28). Inserção via Relayer/service.
alter table lances enable row level security;

-- configuracao_geografica: bloqueio regional (desenho)
create table configuracao_geografica (
  regiao      text primary key,                          -- ex: 'BR-AM', 'US'
  bloqueado   boolean not null default false,
  motivo      text
);
-- RLS: SELECT público; escrita só service_role. Política de app: se a região do
-- utilizador estiver bloqueada, o leilão é tratado como inativo (conformidade).
alter table configuracao_geografica enable row level security;
```

### 9.6 Caveats de conformidade (ler antes de submeter)
- **Gambling não é só problema de loja:** "menor lance único" pode ser jogo
  regulado em várias jurisdições independentemente da plataforma. O PWA precisa
  de parecer jurídico próprio — tirar o leilão das lojas não resolve esse risco.
- **Anti-steering da Apple:** apontar utilizadores iOS para a Web tem regras
  estritas (entitlements de external link). O CTA "Abrir versão Web" pode exigir
  revisão/entitlement; pode ter de ser texto informativo em vez de botão.
- **App genuína:** a loja (Vitrine + IAP, a implementar) tem de ser funcional.
- **Conta de teste do revisor:** documentar nas notas de revisão acesso ao fluxo
  completo — é o que torna o modelo transparente.

### 9.7 MC32.1 — Integração Supabase (IMPLEMENTADO, backend ainda em Blobs)
> O adapter Supabase existe e está testado, mas `DATA_STORE_BACKEND` continua
> `blobs` (R3.4). A escrita real ainda vai para Netlify Blobs → zero regressão.
> O flip para `supabase` é um passo operacional futuro (definir env + validar).

**Schema real** (versionado em `supabase/migrations/`, já aplicado no projeto
`vjslwowwrpcawijdiksm`). Difere do desenho conceptual §9.5 — usar este como verdade:
- `produtos(id, nome, descricao, preco, imagem, categoria, created_at)`
- `lojistas(id, endereco, cota, saldo_senhas, created_at)`
- `lances(id, edicao_id, endereco, hash_lance, valor_centavos, created_at, payload jsonb)`
- `config_remota(chave PK, valor_booleano, versao_alvo, atualizado_em, valor jsonb)`
- RLS ativa em todas; SELECT público em `produtos`/`config_remota`; escrita
  exclusiva do `service_role` em `lances`/`lojistas`/`config_remota`.

**Emenda JSONB** (`20260620_amend_jsonb_payload.sql`) — necessária para fidelidade
aos contratos existentes (R1): `config_remota.valor` guarda o objeto de config
aninhado (`recursos_app`); `lances.payload` guarda o registro imutável completo
(espelha o Key-Per-Bid MC28 — nome/saldos/lanceId não cabem em colunas planas);
`hash_lance` passou a NULLable (caminho legado Sepolia/local não tem commitment).

**Adapter** `_lib/data-store-supabase.mjs`:
- Implementa a interface da fachada (`getConfig/setConfig/getLances/addLance`).
- Cliente globalizado `_lib/supabase-client.mjs` (R10), `SERVICE_ROLE_KEY` env-only (R9).
- `getConfig` → `config_remota.valor` (fail-soft → null); `addLance`/`getLances` →
  `lances.payload` + colunas planas indexáveis; gera a key Key-Per-Bid (anti-colisão).
- Teste offline `_tests/mc321-data-store-supabase.test.mjs` (mock do client).

**Handlers roteados pela fachada** (escopo mínimo byte-idêntico, R3.4):
- `lance-relampago.mjs` (escrita mainnet KPB) → `dataStore.addLance`.
- `consolidar-lances.mjs` (leitura) → `dataStore.getLances` (markers ficam no bids-store).
- Config já passava pela fachada desde MC29.1 (`recursos-app.mjs`, `chatbot.mjs`).
- Fora de âmbito: `referral/cotas/wallet` (stores distintos, sem método na fachada);
  `lances-flash/purge-lances` (sem equivalente; não force-fit para não arriscar MC28).

**Frontend** (`src/lib/supabaseClient.js` + `useRecursosApp.js`):
- Cliente público (ANON_KEY) lazy + dynamic import (chunk async, bundle lean).
- `useRecursosApp` lê `config_remota` direto quando `VITE_SUPABASE_*` definidos;
  senão mantém o fetch da função (sem env = byte-idêntico, R1). Fail-soft.
- **Realtime ADIADO**: a escrita continua em Blobs → um canal Supabase ficaria
  inerte. Ativar junto com o flip de backend.

**Anti-Split-Brain (R11):** a fachada carrega UM só backend; nenhum módulo
escreve em Blobs e Supabase ao mesmo tempo.

### 9.8 MC33 — Runbook de flip/rollback (FASE C) + validação (FASES A/B/D)
> Estado: validações técnicas FEITAS em staging (MC33.1, PR #81). O flip de
> PRODUÇÃO permanece uma ação OPERACIONAL do operador — só com os pré-requisitos
> abaixo cumpridos e a janela certa.

**Validações já concluídas (staging `gjuelqjjhuuwnlsjyeai`):**
- FASE A (carga): 50/100/200/1500/2500 → 0 erros, persistidos==N, keys únicas,
  apuração idêntica; 2500 confirma o fix K1 (paginação) no PostgREST real.
- FASE B (RLS): anon lê `[]` e escrita bloqueada (401/42501); service_role total.
- FASE D (visual): 375/1440, CLS=0, sem novos erros de console.
- Harnesses: `netlify/functions/_tests/mc33-load.mjs` e `mc33-rls.mjs` (manuais).

**Pré-flip (checklist obrigatório):**
1. FASE A/B/D verdes (acima). 68/68 suite + build verdes.
2. Env de PRODUÇÃO no Netlify: `DATA_STORE_BACKEND=supabase`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` (backend) e, p/ o frontend, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`. Schema + emenda JSONB aplicados na BD de produção.
3. **Janela ENTRE edições** (sem lances em curso) — mitiga K2 (split-brain): com a
   escrita exclusiva por backend (R11), lances feitos em Supabase não existem nos
   Blobs; trocar a meio de uma edição deixaria lances órfãos.

**Procedimento de ATIVAÇÃO (flip):**
1. Definir `DATA_STORE_BACKEND=supabase` no painel Netlify.
2. Trigger de deploy de produção; aguardar `state=ready`.
3. Smoke: 1 lance real numa edição de teste → confirmar persistência + `getLances`
   + apuração; confirmar leitura de `config_remota` no frontend.
4. Monitorizar erro/latência (critério: latência ≤ 2× Blobs p95; 0% erro).

**Procedimento de ROLLBACK (imediato):**
1. Repor `DATA_STORE_BACKEND=blobs` no Netlify; deploy; aguardar `ready`.
2. Smoke nos Blobs.
3. K2: se a janela NÃO foi entre edições, fazer backfill dos lances gravados no
   Supabase durante a janela → Blobs (leitura de histórico pode usar os dois; a
   ESCRITA nunca). Se foi entre edições, nada fica órfão.

**Critérios de sucesso / observação:** 0% erro nos lances; apuração idêntica à
referência (Blobs); latência ≤ 2× Blobs (p95); RLS conforme; frontend CLS=0.
Observar 24h com métricas antes de considerar o flip permanente; gatilho de
rollback se qualquer critério falhar.

### 9.9 MC34 — Realtime do Supabase (config_remota)
> Decisão de escopo: realtime **apenas** de `config_remota`. `lances` ficam de fora
> de propósito — a RLS oculta-os do anon (blindagem anti-sniping MC28) e expô-los ao
> realtime público quebraria o "menor lance único". `edicoes`/`notificacoes` não
> existem como tabelas Supabase (edições vêm de `/.netlify/functions/edicoes`;
> notificações vivem em Blobs).

- **Backend:** migração `supabase/migrations/20260621_enable_realtime_config.sql`
  (aditiva/idempotente): `REPLICA IDENTITY FULL` + adiciona `config_remota` à
  publicação `supabase_realtime`. **APLICADA (2026-06-21)** em produção
  (`vjslwowwrpcawijdiksm`) e staging (`gjuelqjjhuuwnlsjyeai`) via `supabase db query
  --linked` (CLI autenticada — Management API, não a password). Validado por query:
  `config_remota` está na publicação em ambos.
- **Seed:** `config_remota.recursos_app` semeado na forma **feature-major** correta
  (`{isLeilaoAtivo:{ios,android,pwa}, isPagamentoNativoAtivo:{...}}` = defaults atuais
  → zero regressão) em prod+staging. NOTA: o seed do plano original era platform-major
  e teria sido ignorado pelo `resolverRecursos`; campos como dataEncerramento/
  modoManutencao/layoutProfile NÃO são lidos por nenhum código (seriam inertes).
- **Frontend:** `src/hooks/useRealtimeConfig.js` — subscreve `config_remota` (filtro
  por chave), reconnect com backoff exponencial (1→30s), canal removido na
  desmontagem, **inerte sem `VITE_SUPABASE_*`** (cliente lazy). `useRecursosApp` usa-o
  para re-resolver `recursos_app` por plataforma em tempo real, mantendo o
  carregamento inicial (função/Supabase one-shot) como **fallback** → zero regressão.
- **Validação:** realtime **E2E confirmado** (staging E produção): UPDATE em
  `config_remota` → evento entregue ao cliente subscrito (chave temporária, sem tocar
  no `recursos_app` real). Build verde, CLS=0, 68/68 testes, sem novos erros de console.
- **Rollback:** remover `VITE_SUPABASE_*` (ou reverter o uso no `useRecursosApp`) →
  volta ao carregamento por fetch; opcionalmente remover `config_remota` da publicação.

### 9.10 MC36/37 — Migração de cotas (corporativo) para Supabase (EM CURSO)
> Fase 1: dados corporativos (cotas). saldo-rs/wallet (fluxo de dinheiro/lance) = MC36.1.

- **Tabelas** (prod+staging): `cotas` (cliente_id PK, cnpj UNIQUE, email, categoria,
  vendida, payload jsonb), `cotas_pagas` (idempotência), `cota_fingerprints` (anti-Sybil).
- **Acesso:** `_lib/cotas-store.mjs` (Supabase, service_role). `_lib/cotas-fallback.mjs`
  (leitura legada transitória — Blob; remover após confirmar migração).
- **Handlers migrados:** `cota-ativacao.mjs` (ativação pós-pagamento) e `cotas.mjs`
  (register-corporativo, anti-duplicidade CNPJ, anti-Sybil, login/lookup, CRUD admin).
  Escrita só Supabase (R11); leitura com fallback Blob. Anti-duplicidade reforçada por
  `cnpj UNIQUE` no DB; índices `cotas-cnpj`/`cotas-indice` substituídos por colunas/queries.
- **Pendente:** `iniciar-cota.mjs`; migração dos 7 registos reais (dry-run→consistência);
  frontend corporativo; remoção do fallback. troco-senhas continua em Blobs (MC36.1).
