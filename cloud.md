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

### Pendente (runbook do operador — `security_audit.md` §MC30.2.1)
Provisionar KMS + Biconomy reais, validar handshake real, transferir coordenação on-chain
(two-step), remover `COORDENACAO_PRIVATE_KEY`/`DEFENDER_*` do env de mainnet, remover o
backend `defender` (SEG 8) e, opcionalmente, migrar para Gnosis Safe (SEG 9).

> Detalhe completo: `desafio-gut/docs/MC30.2.1-isolamento-chave.md`.

---

## 8. Como contribuir (resumo operacional)
1. Branch a partir do último estado validado. Commits atómicos (1 por item/fase).
2. A cada commit: `node --check` `.mjs` + `npm run build` verde.
3. Validar via MCP (chrome-devtools) a 375px e 1440px; CLS=0.
4. Registar a alteração neste `cloud.md` e o veredicto no `security_audit.md`.
5. PR para `main` (sem merge direto).
