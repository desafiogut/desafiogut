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
  - **MC41 (visibilidade — v2.1):** os 3 `.webm` tinham um **matte de luminância** (alfa≈luma → roupas
    escuras translúcidas) e ocupavam ~8% do quadro. Fix: descartar o alfa quebrado e **recompor a máscara
    por `colorkey` do fundo navy sobre o RGB verdadeiro** (preserva o **fato azul + colete dourado**, iguais
    ao `guto-bemvindo.png`), com `crop` ao personagem (preenche a caixa), `unsharp` (nitidez em tamanho
    pequeno) e re-encode `libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 18`. Pose de púlpito mantida.
    `?v=mc41c`. Componente: `<video>` simples (aria-hidden, reduced-motion, CLS=0) + **halo/scrim radial
    removido** (lia-se como "círculo branco"). Validado por browser-qa: opaqueFrac 0.08→0.30 (paridade
    com o estático). Backup dos originais em `Desktop\MC41-webm-backup-20260630`.

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
6. **Gate de CI on-chain (MC40-CI):** `.github/workflows/contract-security.yml` roda a cada push/PR
   que toque `desafio-gut/**` — `forge test` (Foundry) + fuzzing property-based com **Echidna**
   (`crytic/echidna-action`, harness `tests/fuzzing/LeilaoGUT.sol`, config `desafio-gut/echidna.yaml`)
   + SBOM CycloneDX. 7 invariantes: conservação de senhas, `onlyCoordenacao`, `MAX_LANCES_UNICOS`,
   **encerramento único** (`consolidarResultado` não consolida 2×), unicidade do vencedor, two-step
   transfer, coordenação ≠ 0. Pré-requisito do MC40 (deploy mainnet). Owner: Agente de Transação
   (config CI); validação: Agente de Monitoramento (RUFLO).
7. **Gate de CI de configs de agentes (MC40-AgentShield):** `.github/workflows/agentshield.yml` roda
   `npx ecc-agentshield@1.4.0 scan` a cada push/PR que toque a config de agentes (`.agents/**`,
   `.claude/**`, `.mcp.json`, `**/CLAUDE.md`). Audita segredos hardcoded, permissões perigosas, hooks,
   MCP servers auto-aprovados e prompt-injection. Reprova o PR em finding **critical/high**; relatório
   (md+json) vai p/ artifact + job summary. Scan estático/determinístico (sem `--opus`/`--injection`),
   versão fixada, `permissions: contents:read`. Escaneia a config **commitada** (não o `~/.claude/` do
   runner). Pré-requisito de segurança do MC40. Owner: Agente de Transação; validação: Agente de Monitoramento.

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

## MC39.17.2 — Hardening P1 pré-Mainnet (2026-06-29)

> Branch `feat/mc39.17.2`. Correção dos 7 P1 da auditoria MC39.17. Detalhe e validação em
> `security_audit.md` §MC39.17.2. `Leilao.sol` **não muda**; nenhuma transação on-chain executada.

### Correções de código (shipped)
- **Dependências (P1-2):** `overrides.protobufjs ^7.6.4` no `package.json` do frontend — elimina a
  única vuln *critical* do `npm audit` (39→35; 0 critical).
- **XSS de SVG (P1-3):** DOMPurify svg-profile no cliente (`BannerCard`, `CorporativoBanners`) +
  scrub server-side `_lib/svg-sanitize.mjs` em `banners.mjs` (defesa em profundidade).
- **Webhook MP (B-P1-1):** HMAC `x-signature` via `_lib/mp-signature.mjs` (`MP_WEBHOOK_SECRET`,
  fail-open enquanto o segredo não está set). **Ativação (fail-closed):** `docs/mainnet-prerequisites.md`
  §1 — `netlify env:set MP_WEBHOOK_SECRET … --context production` + redeploy (MC39.17.3).
- **PII/LGPD (B-P1-2):** GET `admin-aprovacao` exige JWT (owner-ou-admin / admin p/ listar).
- **Double-spend (B-P1-3):** débito de saldo R$ atômico via CAS (`casSaldo` em `saldoRs-store`).
- **Brute-force (B-P1-4):** rate-limit + fail-counter em `auth-lance` (espelha `auth-user`).

### P1-1 — Plano de descentralização da `coordenacao` (operacional, pós-MC40)
A maior exposição de mainnet é a **chave única da coordenação**: uma EOA controla `adicionarSenhas`
(cunha saldo), `comprometerLance` e `consolidarResultado`. **Mitigação obrigatória antes de valor real:**

1. **Deploy MC40** do `LeilaoGUT` em mainnet com `coordenacao = deployer` (EOA/Smart Account de deploy).
2. **Escolher o dono final** (decisão do operador):
   - **Opção A — Gnosis Safe 2/3 (recomendada):** multisig com 3 signatários (ex.: 2 hardware + 1 KMS),
     limiar 2. Remove o ponto único de falha; runbook em `security_audit.md` §MC31.
   - **Opção B — Owner em KMS (MC30.2.1):** Smart Account ERC-4337 com owner AWS KMS (chave nunca sai do
     KMS). Menos resiliente que multisig, mas já implementado e endurecido (guarda de mainnet no `signer.mjs`).
3. **Transferir via two-step do contrato:** `iniciarTransferenciaCoordenacao(<novoDono>)` pela coordenação
   atual → `aceitarTransferenciaCoordenacao()` pelo novo dono (Safe/KMS). O two-step evita transferir para
   um endereço errado/sem controlo.
4. **Verificar on-chain:** `coordenacao()` retorna o novo endereço; revogar/retirar a chave de deploy do ambiente.
5. **Hardening complementar (P2, registado):** considerar verificação on-chain do compromisso do vencedor em
   `consolidarResultado` e desabilitar `darLance` (valor em claro) para edições reais em mainnet.

> ⚠️ Não flipar `NETWORK_STAGE=mainnet` antes do contrato mainnet existir (ver `Desktop/MC40-checklist.md`).
> Relatório desta entrega: `Desktop/MC39.17.2-final.md`.

---

## MC39.20 — Escalabilidade Ondas 5-8 (2026-06-29)

> Branch `feat/mc39.20`. Conclui as Ondas 5-8 do plano MC39.18. Detalhe de segurança: `security_audit.md`
> §MC39.20. Mudanças seguras; migrações de BD escritas mas NÃO aplicadas (operador, R12); fila inerte até aplicar.

### O que entrou (código)
- **Onda 5 — render:** `useMemo` na ordenação/apuração de `TabelaLances` (evita re-sort por tick do timer;
  comportamento idêntico). Memo/virtualização agressivos deferidos (framer-motion no pipeline crítico, R1).
- **Onda 6 — Materialized Views:** migração `20260629_materialized_views.sql` (`mv_lances_por_edicao`,
  `mv_cotas_disponiveis`) + índices únicos (REFRESH CONCURRENTLY) + grants backend-only. Read-paths de
  relatório adotam via `getSupabaseReadOnly()` após aplicar. Particionamento deferido (transacoes N/A; lances
  prematuro).
- **Onda 7 — fila Postgres:** migração `20260629_fila_tarefas.sql` (tabela + RPC `reservar_tarefas` SKIP LOCKED
  + DLQ + RLS service_role); `_lib/fila.mjs` (enfileirar/processarLote, inerte sem migração);
  `fila-processor-scheduled.mjs` (*/5min). Nenhum fluxo síncrono reescrito — adoção sob demanda.
- **Onda 8 — RUM:** `web-vitals` → Sentry (LCP/INP/CLS/TTFB); evento só em vital "poor" (alimenta alerta),
  demais como breadcrumb.

### Ativação (operador)
- **Aplicar migrações:** `20260629_materialized_views.sql` e `20260629_fila_tarefas.sql` (`supabase db query --linked`).
- **REFRESH das MVs:** agendar via pg_cron (snippet no .sql). **Fila:** registrar handlers em
  `fila-processor-scheduled.mjs` e chamar `enfileirar()` nos produtores que se quer tornar assíncronos.
- **Alertas Sentry (item 36):** criar regras no painel — erro>5%, p95>1s, web-vital "poor", conexões Realtime.

---

## MC39.19 — Escalabilidade Ondas 1-4 (2026-06-29)

> Branch `feat/mc39.19`. Executa as Ondas 1-4 do plano MC39.18. Detalhe de segurança: `security_audit.md`
> §MC39.19. Estratégia: Onda 2 (bundle) completa; Ondas 1/3/4 **env-gated** (sobem inertes, ativam quando o
> operador provisiona a infra da Onda 0) → zero regressão.

### O que entrou (código)
- **Onda 1 — BD:** migração `20260629_indices_escalabilidade.sql` (índices compostos `(edicao_id,created_at)`
  e `(edicao_id,valor_centavos)` + parcial `cotas(categoria) WHERE vendida=false`); `getSupabaseReadOnly()`
  (env `SUPABASE_READ_REPLICA_URL`, fallback ao primário). **Migração NÃO aplicada** — operador via CLI (R12).
- **Onda 2 — bundle:** `React.lazy`+`Suspense` em 13 rotas não-críticas + `LazyBoundary` (reload em chunk-404);
  chunk `motion` (framer-motion). **Chunk inicial `index` −28% (1.137kB→819kB)**; páginas sob demanda.
- **Onda 3 — cache:** `_lib/cache.mjs` (Upstash REST, fetch nativo) + `_lib/http-cache.mjs` (ETag/SWR);
  rate-limiter com path Redis (fallback Blobs); `produtos.mjs?categoria` com cache-aside + ETag + N+1
  paralelizado + invalidação write-through. Tudo **env-gated** por `REDIS_URL`/`REDIS_TOKEN`.
- **Onda 4 — realtime:** `src/lib/realtimeMetrics.js` (contagem de canais ativos/pico); item 32 já tinha
  cleanup no unmount; item 31 confirmado (config_remota filtrado, sem `table:'*'`).

### Ativação pela Onda 0 (operador) — itens inertes até provisionar
- `REDIS_URL`+`REDIS_TOKEN` (Upstash) → ativa cache + rate-limit Redis.
- `SUPABASE_READ_REPLICA_URL` → ativa leitura na réplica (dashboards/relatórios).
- Aplicar a migração de índices (`supabase db query --linked`).
- **Netlify Pro** → itens 15 (Edge Functions) e 18 (memória/vCPU), NÃO implementados (operator-gated).

### Métricas (baseline → meta)
- Bundle inicial: índice 1.137kB → **819kB (−28%)** já medido; meta −30-40% atingível ao lazy-carregar o Privy.
- Latência leituras quentes (produtos): cache-aside Upstash 50-200ms → 1-5ms quando `REDIS_*` ativo.
- Validar p95<500ms, 10k WS, FCP<1.5s/LCP<2.5s com teste de carga (k6) em staging antes do MC40.

---

## MC39.18 — Plano de escalabilidade pré-Mainnet (read-only, 2026-06-29)

> Branch `feat/mc39.18`. Análise read-only (R1 — sem código) dos 42 itens de escalabilidade
> para 10k usuários simultâneos. Plano executável completo em `docs/MC39.18-escalabilidade.md`
> (espelho do entregável `Desktop/MC39.18-escalabilidade.txt`).
> Embasado por skills (busca no filesystem): react-performance, supabase-postgres-best-practices,
> backend-patterns, vite-patterns, redis-patterns, postgres-patterns.
> Síntese: 33 itens de código (~45-55 commits/8-10 sessões, 8 ondas), 6 de plataforma (operador),
> 3 descopes justificados (Selective Hydration / Streaming SSR / Module Federation — SPA Vite sem SSR).
> Gargalos reais priorizados: bundle Privy (~2.84MB), Supavisor transaction pooling, cache Redis
> (Upstash REST), Realtime (10k WS), índices compostos/parciais em `lances`. Implementação em
> MCs 39.18.x (cada um sob Superpers/security_audit.md). `/caveman /clog /reproduce` localizadas mas
> não aplicáveis a planeamento read-only (debugging/tooling) — reservadas aos MCs de implementação.

## MC39.17.3 — Pendências do MC39.17.2 resolvidas (2026-06-29)

> Branch `feat/mc39.17.3`. Fecha as 4 pendências antes do MC40. Detalhe: `security_audit.md` §MC39.17.3.

### P2 residuais (npm) — eliminados
Bumps **forward** (mesmo major — nunca downgrade) + overrides transitivos no `package.json` do frontend:
- diretos: `vite ^8.1.0` (era 8.0.8), `react-router-dom ^7.18.0` (era 7.14.2 → puxa react-router 7.18).
- overrides transitivos: `form-data ^4.0.6`, `hono ^4.12.27`, `js-cookie ^3.0.8`, `ws ^8.21.0`.
- **Resultado:** `npm audit` 35 (7 high) → **12 moderate, 0 high, 0 critical**. Build verde; suíte 104/104.
- **Moderates remanescentes (P3, aceitos):** cadeia de wallet (`@privy-io/*`, `@metamask/*`, `wagmi`,
  `@wagmi/connectors`, `x402`, `@gemini-wallet/core`), `aws-sdk`, `uuid` — só resolvíveis com bump **major**
  do Privy/wagmi (alto risco de regressão de auth) → adiados para uma janela dedicada de upgrade do Privy.

### Code-splitting do bundle Privy (plano P2)
O chunk `privy-*.js` (~2.84 MB / 859 KB gz) domina o bundle. **Estratégia recomendada (não-bloqueante):**
1. **Lazy-load das rotas** com `React.lazy` + `Suspense` no `App.jsx` (cada `<Route>` carrega seu chunk sob
   demanda) — separa páginas pesadas (Dashboard, MercadoLances, Corporativo) do caminho crítico de entrada.
2. **Adiar a inicialização do Privy** para quando o utilizador clica "Entrar" (o `PrivyProvider` já é montado
   no topo; avaliar mover o SDK pesado para trás de um `lazy` no fluxo de login).
3. **`build.rolldownOptions.output.codeSplitting`** / `manualChunks` para isolar `@privy-io`, `wagmi` e
   `@walletconnect` em chunks assíncronos.
> Perf, não segurança (P2). Reduz o bundle **e**, ao atualizar o Privy, abre caminho para zerar os moderates P3.

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

### 9.10 MC36/37 — Migração de cotas (corporativo) para Supabase (CONCLUÍDA — Fase 1)
> Fase 1: dados corporativos (cotas). saldo-rs/wallet (fluxo de dinheiro/lance) = MC36.1.

- **Tabelas** (prod+staging): `cotas` (cliente_id PK; `cnpj` indexado **não-único** —
  dados reais têm o mesmo CNPJ em registo direto "cnpj:" + autenticado; anti-duplicidade
  é aplicacional, como nos Blobs), `email`, `categoria`, `vendida`, `payload` jsonb;
  `cotas_pagas` (idempotência de ativação); `cota_fingerprints` (anti-Sybil). RLS role-based
  (só `service_role`; o frontend lê via funções, nunca direto).
- **Acesso:** `_lib/cotas-store.mjs` (Supabase, service_role, cliente globalizado R10).
  `_lib/cotas-fallback.mjs` (leitura legada transitória — Blob; remover após confirmar).
- **Handlers migrados:** `cota-ativacao.mjs` (ativação pós-pagamento) e `cotas.mjs`
  (register-corporativo, anti-duplicidade CNPJ, anti-Sybil, login/lookup, CRUD admin).
  Escrita só Supabase (R11); leitura com fallback Blob. Índices `cotas-cnpj`/`cotas-indice`
  substituídos por coluna `cnpj`/query `WHERE categoria=`.
- **`iniciar-cota.mjs`:** sem alteração — não lê/escreve cotas (gera pedido PIX + usa
  constantes de `cota-ativacao.mjs`). **`wallet.mjs`:** fora de âmbito (Vale-Crédito /
  fluxo de dinheiro = MC36.1; sem tabela Supabase própria).
- **Migração de dados (7 registos, Blob→Supabase via cotas-store):** executada e validada
  em **staging** e **produção** — 7/7 registos, `payload` byte-fiel (exatos=7/7),
  `cnpj`/`tipo`/`vendida` conferem; `cotas_pagas`/`cota_fingerprints` vazias (esperado).
  Backup em `Desktop\mc36-blobs-backup-20260621\` (rollback, R13). Blobs intactos.
- **Suite:** 79/79 verde (inclui `cotas-anti-fraude.test.mjs`, 5 cenários). Frontend
  byte-idêntico (consome via `functions/cotas.mjs`; contrato de resposta inalterado).
- **Pendente (MC seguinte):** remover o fallback de leitura após janela de confirmação;
  reconciliar `troco-senhas`/`saldo-rs`/`wallet` (MC36.1). ⚠️ NÃO re-executar
  `20260621_cotas_schema.sql` (faz `DROP TABLE` — apagaria os dados migrados).
- **Veredicto pós-deploy (PR #87 mergeado com `--admin` → `main` @ `758f9ae`):** deploy de
  produção `6a38525053a63a0008679bbc` (ctx=production, commit `758f9ae`) **state=ready**.
  Validação em produção: `GET /` 200; `recursos-app?plataforma=pwa` → `isLeilaoAtivo:true`;
  `GET /cotas` (resumo) e `GET /cotas?cliente_id=<migrado>` servidos **via Supabase** (código
  novo live), registo migrado retornado (corporativo, cnpj+empresa), inexistente → 404;
  `SELECT count(*) cotas` (service_role) = **7**, `payload` byte-fiel 7/7; **RLS** anon → 0
  linhas (leitura anónima bloqueada); visual MCP 1440/375 **CLS=0.00**, sem erros de consola.
- **MC38 (EXECUTADO):** fallback de leitura **removido** — leitura de cotas 100% Supabase.
  Apagado `_lib/cotas-fallback.mjs`; removidas as cláusulas `?? lerXLegado(...)` de `cotas.mjs`
  (9) e `cota-ativacao.mjs` (1); teste de cenário-fallback removido (suite 78/78). **Gate de
  segurança verificado antes da remoção** (CLI/REST service_role): os 7 `cotas` keys são
  idênticos Blob==Supabase (nenhum registo só-em-Blob → nenhum 404); o único fingerprint Blob
  tem ~27 dias (>>24h), já ignorado pelo filtro anti-Sybil — sem perda. Escrita já era
  só-Supabase (R11). Rollback: `git revert` + redeploy (Blobs e backup MC36 intactos).

### 9.11 MC36.1 — Migração financeira (saldo-rs/troco-senhas/wallet) para Supabase
> Fluxo de dinheiro/senhas off-chain. Mesma estratégia do MC37 (escrita só Supabase R11 +
> fallback de leitura transitório). É o MC mais sensível: toca o **fluxo de lance**.

- **Tabelas** (`20260621_saldo_troco_wallet_schema.sql`, prod+staging, payload jsonb fiel):
  `saldo_rs`, `saldo_rs_creditos` (idempotência crédito PIX), `saldo_rs_debitos` (opcional),
  `troco_senhas` (lotes FIFO 30d), `wallet`, `wallet_idem`. RLS role-based (só `service_role`;
  frontend lê via funções com guard owner/admin por JWT). `CREATE IF NOT EXISTS` (sem DROP).
- **Stores:** `_lib/saldoRs-store.mjs`, `troco-senhas-store.mjs`, `wallet-store.mjs`
  (cliente globalizado R10). **Fallback:** `_lib/financeiro-fallback.mjs` (leitura legada Blob).
- **Handlers refatorados:** `_lib/saldoRs.mjs` (crédito idempotente, débito, reembolso —
  consumido por `lance-relampago`), `_lib/troco-senhas.mjs` (FIFO/expiração/`resumoTrocoAdmin`
  via `listTroco`), `wallet.mjs` (saldo + transações + idempotência). Escrita só Supabase (R11);
  leitura com fallback Blob. Semântica preservada (débito checked-then-set inalterado).
- **Migração de dados:** **saldo_rs 5/5 + saldo_rs_creditos 8/8 byte-fiel** em staging e
  produção; `troco-senhas`/`wallet`/`wallet-idem`/`saldo-rs-debitos` estavam **vazios** (só schema).
  Backup fresco em `Desktop\mc36.1-blobs-backup-20260621\` (R13).
- **Suite:** 83/83 (+5 `mc361-saldo-rs.test.mjs`: crédito idempotente, débito suficiente/
  insuficiente, reembolso). Frontend byte-idêntico (sem alteração em `src/`).
- **Pendente (MC seguinte):** remover o fallback financeiro após janela de confirmação;
  (opcional) endurecer o débito com `UPDATE ... WHERE centavos >= :v` atómico.
  ⚠️ NÃO re-executar nenhuma migração com `DROP TABLE`.

### 9.12 MC39 — Mainnet Readiness (preparação SEM ativação)
> 100% operacional, zero alteração de código. **Produção mantém-se em Sepolia.**

- **Gate de ambiente:** `NETWORK_STAGE` (backend) separa Sepolia de Mainnet. Quando `=mainnet`
  ativa, de uma vez: `signer.mjs` → biconomy (Smart Account + KMS, chain `MAINNET_CHAIN_ID`);
  `lance-relampago` → blindagem MC28 (Compromisso Cego on-chain via `comprometerLanceOnchain`);
  `consolidar-lances` → consolidação EIP-712 contra `CONTRATO_MAINNET` (Flashbots por
  `CONSOLIDATION_RPC_URL`). O frontend usa `VITE_NETWORK_STAGE` (separado do backend).
- **Decisão MC39 (operador):** **NÃO** definir `NETWORK_STAGE=mainnet` agora — ativaria o modo
  mainnet no site **live** contra um contrato inexistente (placeholder `0x000…0`) e um Smart
  Account/KMS montado só na Sepolia (MC30.2.1) → quebraria o fluxo de lance real (R1). A ativação
  fica para **depois do MC40** (deploy do contrato mainnet + `CONTRATO_MAINNET` real).
- **Configurado agora (inerte até `NETWORK_STAGE=mainnet`):** `MAINNET_CHAIN_ID=1` no Netlify
  (contexto production). `CONSOLIDATION_RPC_URL` e `CONTRATO_MAINNET` ficam por definir no MC40
  (precisam de um RPC mainnet real e do endereço do contrato deployado — não fabricados).
- **Estado verificado (production):** `NETWORK_STAGE` ausente (=Sepolia); `COORDENACAO_PRIVATE_KEY`
  ausente (R9, MC30); `DATA_STORE_BACKEND=supabase`; Biconomy+KMS presentes; `SIGNER_BACKEND`
  ausente (recai no default por `NETWORK_STAGE` = local-key em Sepolia). Sem deploy nesta sessão.
- **Checklist de ativação:** `Desktop\MC40-checklist.md`.

### 9.13 MC39.1 — Hardening pré-Mainnet (5 itens da auditoria, sem deploy do contrato)
1. **Dependências:** `dompurify ^3.1.6→^3.4.11` (XSS) e override `axios ^1.14.1→^1.18.0`
   (resolvia 1.15.0 vulnerável → 1.18.0). Privy não tocado (R1). Restantes advisories do stack
   Privy/wallet/transformers (incl. 1 critical `protobufjs`) ficam como dívida (major upgrades).
2. **Secret scanning:** `SECRETS_SCAN_SMART_DETECTION_ENABLED false→true` (validado com `netlify
   build` — sem falsos-positivos). OMIT_KEYS (públicos) mantido.
3. **CSP:** `script-src` deixa de permitir `'unsafe-inline'` (mantém `'self'`+`'wasm-unsafe-eval'`+
   allowlist; `style-src` mantém `'unsafe-inline'` p/ Framer Motion/React). Validado servindo o
   `dist` com o CSP de produção no browser → app renderiza, zero violação de script-src.
4. **Runbook de incidentes:** `desafio-gut/docs/runbook-incidentes.md` (matriz P0/P1).
5. **supportedChains:** Privy passa a `[sepolia, mainnet]`; `defaultChain` continua Sepolia
   (login Sepolia até o cutover MC40).
- Suite 83/83, build verde, node --check limpo. Produção segue em Sepolia (NETWORK_STAGE ausente).

### 9.14 MC39.2 — Fallbacks de resiliência + pré-requisitos MC40 (sem deploy do contrato)
- **Fallback RPC/Flashbots e Bundler (opt-in):** `_lib/rpc-fallback.mjs` (`escolherRpc`/`escolherBundler`,
  health-probe `eth_blockNumber`/`eth_chainId`, nunca loga URLs). `consolidar-lances` usa
  `CONSOLIDATION_RPC_URL_FALLBACK`; `signer.criarSignerBiconomy` usa `BICONOMY_BUNDLER_URL_FALLBACK`.
  **Sem fallback configurado → primário sem probe (zero mudança).** Caminho mainnet inativo.
- **Pré-requisitos manuais MC40:** `desafio-gut/docs/mainnet-prerequisites.md` (auditoria externa,
  deploy do contrato, financiar Smart Account, two-step, painel Privy, vars reais, flip, rollback).
- Suite 83/83, build verde, node --check limpo. Produção segue em Sepolia.

### 9.15 MC39.3.1 — Correções de Frontend/UX (plano MC39.3 executado)
- **#5** vencedor duplicado: `EdicaoTimerCard` (edições EXTRA) deixou de montar o
  `FimLeilaoOverlay` full-screen → overlay ÚNICO ao nível da página (EDICAO_ATIVA); fim do
  empilhamento (MC23.I/D1).
- **#6** sign message: `PrivyProvider.embeddedWallets.showWalletUIs=false` → login/lance sem
  modal de confirmação (ver security_audit; trade-off aceite pelo operador).
- **#1** "Carteira Conectada": `<div>` ad-hoc → `<GlassCard>` (.gut-glass-standard).
- **#3** horários da Programação clicáveis → filtram a grade por horário (toggle + teclado +
  "Limpar filtro"); abordagem (i) (a página exibe a grade, não lances).
- **#7** checklist de segurança: `/seguranca` gated por `CorporativoRoute`; atalho removido do
  Dashboard comum; card "Segurança" no CorporativoDashboard (ver security_audit).
- **#8** vitrine: "Contrato"/"Mín. produto" (dados B2B) gateados por `corporativo` em SlotCard/
  VitrineDetalhe; utilizador final vê Cotas/Tipo/benefícios.
- **#4** GUTO legibilidade: halo/scrim radial atrás do sprite (webm alfa sobre navy); afinação
  visual fina pendente de validação autenticada.
- **#2 — DIFERIDO** (subjetivo + não-validável sem login): a convenção da app é emoji e a paleta
  do ScheduleView é coerente (gold/tier diamante); requer direção visual do operador + sessão
  autenticada. Ver `MC39.3.1-final.md`.
- Suite 83/83, build verde, node --check limpo. Frontend; produção segue em Sepolia.

### 9.16 MC39.4.1 — Pós-correção: Segurança (bounce) + GUTO (legibilidade)
- **#Segurança (regressão do #7):** a rota `/seguranca` foi gated no MC39.3.1, mas links comuns
  ficaram a apontar para lá → o utilizador comum era atirado para "/" ("travava"). Correção:
  item "Segurança" removido do nav comum (BottomNav/Sidebar — lojista acede via card do
  CorporativoDashboard); rodapé "Privacidade" repointado para a Política de Privacidade pública
  (Iubenda) mantendo o acesso LGPD ao comum; `CorporativoRoute` espera `ready` do Privy antes de
  redirecionar (sem bounce em hard-reload). `Seguranca.jsx` é estática (sem trava interna).
- **#GUTO:** GUTO do "início" 64/76 → 88/104px; halo radial mais forte + `filter`
  (drop-shadow+brightness+contrast) no `<video>` para realçar o sprite (webm alfa) sobre o navy.
- Suite 83/83, build verde. ⚠️ Afinação visual fina + fluxo corporativo de /seguranca pendentes
  de validação AUTENTICADA (login Privy via OTP/OAuth não automatizável por CDP). Produção: Sepolia.

### 9.17 MC39.4.2 — Card "Segurança" do painel corporativo agora navega
- Causa raiz: o efeito "Isolamento do mundo lojista" (AppContext MC12.3 Item 4) tinha `/seguranca`
  em `rotasProibidas` → ao clicar no card "Segurança" do CorporativoDashboard (#7), o corporativo
  era redirecionado IMEDIATAMENTE de volta para `/corporativo` (clique "não funcionava").
- Fix: `/seguranca` removida de `rotasProibidas` (a rota é exclusiva do corporativo, gated por
  CorporativoRoute desde o MC39.3.1). Demais rotas comuns mantêm o isolamento. Build verde, 83/83.

### 9.18 MC39.6 — Reposicionar "Segurança" do dashboard corporativo para o menu "Mais"
**Diagnóstico (Graphify + leitura direta dos componentes de navegação):**
- "Segurança" do painel corporativo NÃO vivia na navegação — era um **card no grid**
  `cards[]` de `CorporativoDashboard.jsx` (`{ label:"Segurança", icon:"🛡️", to:"/seguranca" }`),
  ao lado de Cota ativa / Banners / Impressões / Saldo. É esse grid que o operador chama de
  "menu principal".
- O menu **"Mais"** (canto inferior direito) existe APENAS no `BottomNav.jsx` (mobile <768px):
  botão "Mais" → sheet com `secundariosAtivos`. Para corporativo, era `[Analytics, Configurações]`.
- No desktop (≥768px) há só a `Sidebar.jsx` plana (corporativo: Painel/Cotas/Banners/Analytics/
  Configurações), sem secção "Mais".
- **Plano:** remover o card de `CorporativoDashboard.cards`; adicionar "Segurança" ao
  `secundariosAtivos` corporativo do BottomNav (sheet "Mais" mobile) e ao grupo corporativo da
  Sidebar (cauda, junto a Configurações) para manter acessível no desktop sem regredir o acesso
  ganho no MC39.4.2. Rota `/seguranca` permanece gated por CorporativoRoute.

**Execução e validação (CONCLUÍDA):**
- `CorporativoDashboard.jsx`: card "Segurança" removido de `cards[]`.
- `BottomNav.jsx`: `{ path:"/seguranca", label:"Segurança", Icon:IconShield }` no `secundariosAtivos`
  corporativo (sheet "Mais").
- `Sidebar.jsx`: `SEGURANCA_ITEM` na cauda do grupo corporativo (após Configurações).
- `AppContext.jsx`: comentário do isolamento atualizado (sem mudança de comportamento).
- `node --check` limpo; suite **83/83**; `npm run build` verde.
- Validação visual MCP autenticada (conta corporativa de teste), 1ª iteração PASS:
  - **375px (mobile):** dashboard sem o card "Segurança"; "Mais" → contém "Segurança"; clique →
    `/seguranca` renderiza (checklist), sem bounce; console limpo.
  - **1440px (desktop):** dashboard sem o card; Sidebar mostra "Segurança" na cauda; clique →
    `/seguranca` renderiza; console limpo.
- Anti-regressão: itens de menu comuns inalterados (item só nos ramos `corporativo`); demais
  cards/links intactos. Deploy de produção `6a395844` (45 functions intactas).

### 9.19 MC39.7.1 — Remover "Adesão (Consultoria)" e "Vouchers de Networking" da carteira corporativa
Execução do plano MC39.7 (decisões D1/D2: excluir ambos). Mudança **frontend-only**.
- `CorporativoCarteira.jsx`: removidos os imports + blocos JSX de `<RenovacaoCard>` e
  `<VoucherPanel>`. Ordem final da carteira: Senhas de troco → Cota atual → Contratar cota →
  **Wallet Digital (último card)**.
- Apagados os componentes órfãos `src/components/RenovacaoCard.jsx` e
  `src/components/VoucherPanel.jsx` (sem outros consumidores; grep confirmou só comentários).
- **Backend NÃO tocado** (R1): `renovacao-adesao.mjs`, `voucher.mjs`, `comprar-senhas.mjs` (REQ-26)
  e `_lib/rbac.mjs` permanecem. Conta com adesão "ativa" continua a receber papel "cliente"
  (rbac.mjs:59-70); o resgate de voucher em `comprar-senhas.mjs` segue funcional no backend.
- Infra: `.gitignore` passou a ignorar `**/supabase/.temp/` (CLI corre em desafio-gut/frontend).
- Validação: `node --check` limpo; suite **83/83**; `npm run build` verde. Loop visual MCP
  autenticado (conta corporativa), 1ª iteração PASS em **375px e 1440px**: carteira sem os dois
  cards, Wallet Digital por último, console limpo, CLS=0. Deploy de produção `6a39638c`.
- Vouchers: feature mantida no backend para reavaliação futura (ver MC39.7 §ITEM 2 — gaps de UI
  e geração admin-only documentados).

### 9.20 MC39.8 — GUTO animado: visibilidade igual ao GUTO estático (mix-blend-mode)
**Causa raiz (isolada via MCP, evidência de DOM + experimentos visuais):**
- O GUTO animado (`GutoSpritePlayer` → `<video>` webm) parecia opaco/baço vs. o GUTO estático
  (`guto-bemvindo.png`, raster sólido). NÃO era herança do Glass: a `opacity` é **1** em todos os
  ancestrais (incl. `.gut-glass-standard`), e `backdrop-filter` filtra o backdrop, não os filhos.
- A causa real é um **fundo escuro residual baked no .webm** (colorkey #050818 imperfeito) — uma
  "caixa" escura à volta do personagem. Confirmado: com a animação opaca/sem blend a caixa aparece;
  só desligar o halo não a remove.
**Correção (`GutoSpritePlayer.jsx`, frontend-only, reversível):**
- `mix-blend-mode: screen` no `<video>` → dissolve os pixels escuros residuais sobre o navy,
  eliminando a "caixa" e igualando a nitidez do raster sólido.
- `filter` suavizado para `brightness(1.1) contrast(1.1) saturate(1.2)` (drop-shadow removido —
  anulado por screen).
- halo só-claro (removido o stop navy 0.24 que pintava um anel escuro sobre a arena).
- `aria-hidden` + `pointer-events:none` → CLS=0. Sem reencode de asset.
**Validação:** build verde; `node --check` limpo; suite **83/83**. Confirmado live por DOM
(`mixBlendMode:screen`, `opacity:1`) + loop visual MCP (375px/1440px), console limpo. Deploy
`6a3970d8`. Nota: identidade pixel-perfect com o estático exigiria reencodar os .webm com alfa
limpo (decisão adiada; o operador aprovou manter o fix `screen`).

### 9.21 MC39.9 — GUTO animado: correção definitiva (diagnóstico do MC39.8 estava errado)
**Reabertura:** operador reportou "ainda esta opaco" após o MC39.8. Investigação por
`ffprobe` + MCP pixel-level revelou que o diagnóstico do MC39.8 estava **incorreto**:
- `ffprobe -show_streams` simples só mostra `pix_fmt=yuv420p` (o plano de cor) e NÃO revela
  o canal alfa. Um segundo `ffprobe -show_entries stream_tags` expôs `alpha_mode: "1"` —
  os `.webm` (idle/thinking/celebration) **sempre tiveram** alfa real via side-channel VP9
  (convenção "AlphaMode" da Matroska).
- Confirmado ao vivo via MCP: um `<video>` simples, sem nenhum CSS, já compõe esse alfa
  corretamente no Chrome (fundo do GUTO genuinamente transparente). O ficheiro nunca foi o
  problema — não havia "fundo escuro residual baked no .webm" como o MC39.8 concluiu.
- A "caixa"/opacidade reportada veio do próprio fix do MC39.8: `mix-blend-mode: screen` +
  `filter` aplicados sobre um vídeo que já tinha alfa correto interagem mal com o
  `backdrop-filter: blur()` do GlassCard por trás, produzindo o artefacto E lavando as cores.
**Correção (`GutoSpritePlayer.jsx`, frontend-only, reversível):** removidos `mix-blend-mode`,
`filter` e qualquer canvas/chroma-key — voltou a um `<video>` simples (sem CSS hacks),
exatamente o mesmo princípio "zero filtro CSS" do `GutoAvatar.jsx` estático.
**Validação:** build verde; `node --check` limpo; suite **83/83**. Loop visual MCP em
375px e 1440px, 3 moods (breathing/idle, analyzing/thinking, celebrating/celebration) —
sem caixa, cores navy/dourado saturadas, idênticas ao estático. Console limpo (só ruído
pré-existente: CSP, 404 de functions locais). CLS=0 (`aria-hidden` + `pointer-events:none`
mantidos).

### 9.23 MC39.13 — Correção do 502 `pix_provider_indisponivel` (payload PIX + script de teste) (2026-06-23)
> Numeração: §9.22 fica reservada para o MC39.12 (PR #104 em aberto). Este é §9.23.

**Sintoma:** ao comprar fichas em produção, `iniciar-pagamento` retornava
**502 `pix_provider_indisponivel`**. Causa: esse 502 é o catch-all de
`iniciar-pagamento.mjs` (≈linha 70) — qualquer falha de `gerarPedidoPix` vira 502.
Com o provider `mercadopago`, isso significa que o `POST /v1/payments` foi **rejeitado**.

**Diagnóstico (revisado — SUPERPERS):** o vídeo do MP apontou 3 faltas; a verificação
contra o código real mostrou que **uma já estava correta**:
- ❌ `payer.identification` (CPF/CNPJ) **ausente** no payload → contas de produção
  homologadas exigem; sua falta faz o MP recusar. **(causa de código — corrigida)**
- ✅ `X-Idempotency-Key` **já era enviado** — `mp-client.fetchMP` o injeta a partir de
  `idempotencyKey = pedidoId`, e `pedidoId` é um `randomUUID()` (v4). **Não duplicado.**
- ⚠️ Token `APP_USR-` possivelmente **sem KYC/chave PIX** na conta → **passo manual**.

**Correção de código (frontend/netlify/functions):**
- `_lib/pix-provider/mercadopago.mjs`: novo `montarPayer()` adiciona
  `payer.identification` (`type`+`number`) e `first_name`/`last_name`. Origem dos dados:
  o **pagador** (request) **ou** variáveis de ambiente do operador (`MP_PAYER_ID_NUMBER`,
  `MP_PAYER_ID_TYPE`, `MP_PAYER_EMAIL`, `MP_PAYER_NOME`). Documento normalizado para
  dígitos; se nenhum disponível, `identification` é **omitido** (comportamento legado) —
  **sem CPF falso hardcoded (R9)**.
- `iniciar-pagamento.mjs`: aceita `body.pagador` opcional (`email`/`cpf`/`tipoDoc`/`nome`),
  com truncagem defensiva, e encaminha ao provider. Mock ignora o campo (sem efeito).

**Ferramenta de diagnóstico:** `scripts/test-mp-token.ps1` — chama o `POST /v1/payments`
**direto** na API do MP (sem a Netlify Function), com o payload corrigido, para isolar se o
problema é token/conta vs. payload. Token via `-Token`/`$env:MP_ACCESS_TOKEN` (nunca
hardcoded, R9), mascarado nos logs (R10/R14). ASCII-only (PS 5.1 corromperia UTF-8 sem BOM).

**Passos manuais (operador):** KYC + chave PIX na conta MP, webhook de produção, definir
`MP_PAYER_ID_NUMBER` no Netlify se o frontend ainda não coleta CPF, e o teste R$ 2,00.
Runbook completo: `Desktop\MC39.13-manual-steps.txt` + relatório `Desktop\MC39.13-final.md`.

**Regressão:** `node --check` limpo nos 2 `.mjs` alterados; **suite 111/111**; `npm run build`
verde. Nenhum teste cobre o provider MP (sem snapshot de payload), e o `identification` só é
**aditivo** → zero regressão. Reversível por `git revert` (código) + rollback de token (env).

### 9.24 MC39.15 — Frontend captura o CPF do pagador no fluxo PIX (2026-06-26)
> Fecha o ciclo aberto pelo MC39.13: o backend já aceitava `body.pagador.cpf`; faltava o
> frontend coletar e enviar. (MC39.14 foi *no-op* — o backend já estava pronto desde o MC39.13.)

**Sintoma:** o backend monta `payer.identification` a partir de `body.pagador.cpf`, mas o
`ComprarFichasModal` enviava só `{ endereco, qtd }`. Sem CPF no request, `montarPayer` dependia
do fallback de env (`MP_PAYER_ID_NUMBER`) — frágil para o usuário final.

**Correção de código (`src/components/ComprarFichasModal.jsx`, único caller de `iniciar-pagamento`):**
- Campo **"CPF do pagador"** na etapa *quantia*, `type=tel`/`inputMode=numeric`, com máscara
  `000.000.000-00` (`formatarCpf`). O estado guarda **só dígitos**; o display é mascarado.
- Validação de **11 dígitos** (mesmo critério do backend, `_lib/validate`/`montarPayer` —
  anti-split-brain). Hint inline + `aria-invalid`; botão "Continuar" **desabilitado** até válido.
- `iniciarPagamento` envia o **contrato estruturado**: `{ endereco, qtd, pagador: { cpf } }`
  (dígitos). **Não** usa `body.cpf` plano (seria ignorado pelo backend). Guard antes do POST.
- Erros do backend já são exibidos pelo `postJson` (`data.error.message`).

**Cobertura:** PIX de fichas tem **um único ponto** no frontend (`ComprarFichasModal`, montado em
`MinhaCarteira`), usado por usuário comum e corporativo. O fluxo corporativo de *cotas*
(`cotas`/`voucher`/`comprar-senhas`) **não** usa PIX → fora do escopo. Uma mudança cobre tudo.

**Validação visual (375px + 1440px):** via preview isolado descartável (o gate Privy/OAuth não é
automatizável por MCP — MC39.3.1; `netlify dev` não sobe functions local). Confirmado:
vazio→botão desabilitado, `123`→hint vermelho "CPF deve ter 11 dígitos"+disabled,
`12345678909`→máscara `123.456.789-09`+botão habilitado; bottom-sheet ok no mobile; console limpo
(só 404 de favicon). Shots: `Desktop\MC39.15-shots\`.

**Regressão:** `npm run build` verde; `node --check` N/A (só `.jsx`); diff aditivo de 1 arquivo
(+60/-3); `iniciar-pagamento` segue com caller único → zero regressão. **Pendente (operador):**
smoke real R$ 2,00 em produção com CPF (geração de QR + crédito) — requer login Privy real.
Relatório: `Desktop\MC39.15-final.md`.

### 9.25 MC39.15.1 — CPF automático: campo manual removido, email do Privy (2026-06-26)
> Correção de rumo do MC39.15: o usuário **não** deve digitar o CPF.

**Achado (diagnóstico):** o sistema **não armazena CPF em lugar nenhum**. Schema Supabase sem
coluna `cpf` (`lojistas`/`saldo_rs`/`wallet`/`troco_senhas`); CNPJ só na tabela `cotas`
(corporativo, que **não** usa PIX). Usuário individual (quem usa o `ComprarFichasModal`) tem
apenas **email + carteira** via Privy. Logo, "buscar CPF do cadastro" é impossível sem antes
coletá-lo. **Decisão do operador:** usar o fallback de env já existente.

**Correção de código:**
- `ComprarFichasModal.jsx`: **removido** o campo de CPF (input/label/estado/máscara/validação e o
  gate do botão). Nova prop `email`; `iniciarPagamento` envia `pagador: { email }` quando
  disponível (senão `{ endereco, qtd }`). O documento (`payer.identification`) é resolvido no
  **backend** via `MP_PAYER_ID_NUMBER` (fallback do `montarPayer`, MC39.13).
- `MinhaCarteira.jsx`: deriva `emailPagador` de `user` (Privy: email/google/apple) e passa via prop.

**⚠️ Dependência de produção (operador):** `MP_PAYER_ID_NUMBER` **deve estar setado** no Netlify
(CPF/CNPJ do operador), senão `identification` é omitido e contas de produção homologadas voltam a
recusar o `POST /v1/payments` → **502** (o mesmo do MC39.13). `MP_PAYER_EMAIL` continua como
fallback de email. Sem credencial hardcoded (R9).

**Semântica PIX:** usar um documento fixo do operador no `payer` é comum em PIX — o pagador real é
identificado pelo banco no momento do pagamento; o `identification` da cobrança é o do recebedor/
intermediário. O `email` enviado passa a ser o do próprio usuário (melhor que o placeholder).

**Validação visual (375 + 1440):** preview isolado descartável — campo CPF **ausente**, botão
**habilitado** sem CPF, mobile bottom-sheet ok, console limpo. Shots: `Desktop\MC39.15.1-shots\`.

**Regressão:** `npm run build` verde; `node --check` N/A (`.jsx`); diff net **−39** (2 arquivos,
+22/-61); `iniciar-pagamento` caller único; corporativo intacto. **Pendente (operador):** confirmar
`MP_PAYER_ID_NUMBER` no Netlify + smoke real R$ 2,00. Relatório: `Desktop\MC39.15.1-final.md`.

### 9.26 MC39.17.1 — Hardening: correção dos 2 bloqueadores P0 da auditoria (2026-06-27)
> Sequência da auditoria read-only MC39.17. Branch `feat/mc39.17.1`. Correções cirúrgicas de
> backend (`.mjs`), baixo risco, **zero regressão**. Sem mudança visual.

**B-P0-1 — `purge-lances.mjs` estava destrutivo SEM autenticação.** O endpoint apaga todos os
lances da edição ativa (blob `lances-relampago` + entradas `lance-idem`) e qualquer pessoa na
internet podia chamá-lo (`POST {edicaoId}`) — sabotagem trivial de um leilão em curso.
- **Correção:** `import { guardAdmin } from "./_lib/admin-auth.mjs"` + guard como 1ª checagem do
  handler (`const denied = await guardAdmin(req); if (denied) return denied;`), padrão idêntico a
  `consolidar-lances.mjs`. Agora só admin (Bearer admin-jwt ou `x-admin-token` legado) executa o purge.

**B-P0-2 — `comprar-senhas.mjs` quebrado por import faltando.** A linha do kill-switch chamava
`sistemaPausado(await lerEstadoSistema())` sem o import → `ReferenceError` em **todo** POST: compra
de senhas fora do ar e o `/panic` (modo pânico) inoperante.
- **Correção:** `import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs"`.
  Compra de senhas volta a operar; kill-switch responde 503 `sistema_pausado` quando ativo.

**Cobertura de teste:** `_tests/mc39171-p0-fixes.test.mjs` (5 casos, offline com module-mocks).
Suíte total **116/116** verde; `node --check` limpo (111 `.mjs`); `npm run build` verde.

**Modelo de confiança (inalterado):** `purge-lances` agora compartilha a mesma porta admin de
`consolidar-lances`/demais mutações sensíveis. Os 7 P1 da auditoria seguem em aberto para o pré-MC40.
Relatório: `Desktop\MC39.17.1-final.md`.

### 9.27 MC39.22.1 — Enxugamento Ponytail, cortes P0 (consolidação estrutural) (2026-06-29)
> Execução dos 3 cortes P0 do plano MC39.22. Branch `feat/mc39.22.1`. Refactors
> behavior-preserving (zero regressão) + cobertura de teste nova. **Achado honesto
> (SUPERPERS): as estimativas de LOC do plano estavam erradas** — o código já era
> enxuto, então o ganho real é ESTRUTURAL (DRY/declarativo), não redução de linhas.

**P0-1 — `chatbot.mjs`: despacho de intents declarativo.** A cadeia de ~16 `if (intent
=== ...)` em `tratarIntentEdicoes` virou a tabela `INTENT_HANDLERS` (cada intent declara
`gate` de perfil, `recusaRole`, `rl` de rate-limit, e `run`). O shape de resposta (antes
39× inline) é o helper `intentResp()`; a recusa-perfil (antes 12× verbatim) é o helper
`recusa()`. LOC ~flat (1009→1002), NÃO −359 (a maior parte é lógica de negócio irredutível).
Ganho: gate RBAC declarativo e único. Novo `_tests/chatbot-dispatch.test.mjs` (14 casos de
caracterização capturados contra o código original → golden → re-verde pós-refactor).

**P0-2 — `src/lib/api.js`: cliente HTTP centralizado.** `apiGet`/`apiPost` (fetch nativo)
centralizam BASE + headers (Content-Type/Bearer) + `JSON.stringify` + parse tolerante,
devolvendo `{ ok, status, data }` e **nunca lançando** (tratamento de erro fica no caller).
Migrados 13 de 27 call-sites (7 ficheiros). Os 14 restantes (auth-admin lifecycle, cadeia de
perfil do AppContext, `.then()`/`Promise.all`, analytics keepalive, DELETE) **diferidos para
MC39.22.2** por exigirem gate de runtime inexistente nesta sessão (sem harness de teste de
frontend; MCP não automatiza OAuth Privy — MC39.3.1). Lote ~neutro em LOC (não −200).

**P0-3 — `src/widgets/layout/navModel.jsx`: ícones de navegação em fonte única.** Os 7 ícones
SVG estavam duplicados verbatim em `Sidebar.jsx` e `BottomNav.jsx`; extraídos para `<NavIcon>`.
Cada componente mantém os seus rótulos/agrupamento (rail desktop vs 3 tabs + "Mais" mobile —
divergência de superfície, não duplicação). DOM idêntico por construção (+`aria-hidden`, melhoria
de a11y). Net ~+57 LOC (módulo partilhado custa mais que a dedupe), ganho = DRY.

**Validação:** `node --check` limpo (122 `.mjs`); suíte **124/124** verde; `npm run build` verde;
**MCP visual 1440 + 375** (Dashboard público: Sidebar e BottomNav renderizam todos os `NavIcon`,
active indicator OK, console só com ruído pré-existente CSP/favicon). Nav corporativo (auth-gated)
não validável por MCP, mas usa o MESMO conjunto `NavIcon` já provado.

**Resultado honesto:** MC39.22.1 ADICIONA ~+78 linhas de produção (+ teste de 95) em vez de cortar
−679. As estimativas do MC39.22 não se concretizaram porque o codebase já estava enxuto; o entregue
é consolidação estrutural (declarativo/DRY) + nova cobertura, com zero regressão. Relatório:
`Desktop\MC39.22.1-final.md`. Pendências P1 + restante da migração HTTP → MC39.22.2.

### 9.27.1 MC39.22.1 (2ª parte) — conclusão dos P0 pendentes (2026-06-30)
> Continuação na mesma branch `feat/mc39.22.1`. Escopo aprovado pelo operador:
> **subset seguro + EX-5 + EX-7**. Tudo behavior-preserving, zero regressão.

**EX-4 (remover `financeiro-fallback`) — BLOQUEADO, NÃO executado.** O módulo NÃO é
código morto: tem **3 consumidores vivos** (`wallet.mjs`, `_lib/saldoRs.mjs`,
`_lib/troco-senhas.mjs`) como read-fallback da transição Supabase. O gate do MC39.22
(`caller=0`) NÃO está satisfeito → remover arriscaria saldos financeiros legados.
Fica para MC39.22.2 após auditoria de dados confirmar migração 100% (nunca DROP).

**EX-5 — `<StatTile>` (`src/components/StatTile.jsx`).** Tile de KPI no padrão único
(Button `variant="secondary"` = `.gut-glass-standard`). Refatorados os 2 usos reais:
Dashboard (era `<button>` glass cru responsivo) e CorporativoDashboard (era Button
secondary inline). MCP 1440+375: KPIs renderizam igual ao original, sem overflow.
(Demais páginas Corporativo* NÃO tinham o tile — plano superestimou "várias páginas".)

**EX-7 — `src/lib/leilaoTimer.js`.** Extraídos os helpers PUROS de persistência do
prazo (`LS_PRAZO_*`, `lerPrazoStorage`, `gravarPrazoStorage`) de AppContext, sem mudar
comportamento. MCP: timer persiste e conta (imune a F5). A máquina de estado do timer
NÃO foi movida — está entrelaçada com notificações/on-chain/`encerrado` e NÃO é
duplicação; extraí-la seria reescrita do núcleo (deferido).

**HTTP (Segmento 1).** Migrados ~27 call-sites (15 ficheiros) para `apiGet`/`apiPost`
(+`apiDelete`): reads, `.then`/`Promise.all` e POST público (ChatbotWidget). Total
acumulado: **40 de ~54** sites em `api.js`. EXCLUÍDOS por fidelidade/segurança (não são
fetch trivial): headers anti-fraude `X-Visitor-ID`/`X-Device-Tracked` (ReferralRegistrar,
saldo-rs, notificações, register-corporativo), leitura de header de resposta/`resp.text()`
(saldo-rs, CorporativoAnalytics), e o núcleo fora de escopo (CardLance lance on-chain,
ComprarFichasModal pagamento, auth-user sessão, auth-admin lifecycle + `chamarAdmin`,
analytics keepalive, mutações de produto do CorporativoDashboard, BannerUpload). Estes
vão para MC39.22.2 (apiPost precisaria suportar headers custom + leitura de resposta crua).

**Validação:** `node --check` 122 `.mjs`; suíte **124/124**; `npm run build` verde; MCP
1440+375 (Dashboard/StatTile/nav/timer OK; network confirma URLs corretas de
`edicoes`/`lances-flash`/`chatbot`; console só ruído pré-existente). Relatório:
`Desktop\MC39.22.1-final-v2.md`. Restante (EX-4, headers custom, núcleo) → MC39.22.2.

### 9.27.2 MC39.22.2 — api.js evoluído + 6 migrações + auditoria EX-4 (2026-06-30)
> Branch `feat/mc39.22.2`. Conclui o viável das pendências, com fidelidade e zero regressão.

**api.js evoluído (backward-compatible).** `montarHeaders(token, temBody, extra)` aceita headers
custom por chamada; `lerResposta(resp, fallback)` lê o corpo UMA vez (texto) → `data` + expõe `text`
(corpo cru) e `headers` (Headers da resposta). Retorno: `{ ok, status, data, text, headers }`. Os 46
call-sites continuam usando `{ok,status,data}` (campos novos aditivos).

**6 sites HTTP migrados (não-críticos):** ReferralRegistrar (`X-Device-Tracked`+`X-Visitor-ID`),
AppContext saldo-rs (`X-Visitor-ID` + lê `x-ratelimit-limit` no 429 → `checkRateLimit`), notificações
GET+POST (`X-Visitor-ID`), SejaNossoParceiro register-corporativo (`X-Visitor-ID`), CorporativoAnalytics
(lê `resp.text()` no erro). **Anti-fraude e rate-limit PRESERVADOS.** **46 de ~54** sites em `api.js`.

**Núcleo crítico NÃO tocado** (objetivo #4; exige gate de runtime/smoke login): CardLance (lance),
ComprarFichasModal (pagamento), auth-user, purge-lances, auth-admin lifecycle + `chamarAdmin`, mutações
de produto, BannerUpload, analytics keepalive. → MC futuro.

**EX-4 — auditado, BLOQUEADO.** `Desktop\EX-4-auditoria.md`: 3 consumidores (Supabase-first ??
Blob-fallback). Removê-lo agora arriscaria saldo indisponível e — pior — **double-credit** (reads de
idempotência `lerCreditoLegado`/`lerDebitoLegado`/`lerWalletIdemLegado` falhariam p/ registros só-Blob).
Plano: instrumentar HIT → backfill idempotente (operador) → janela HIT=0 (≥30d) → remover + re-auditar;
**nunca DROP** (R13). Nenhuma alteração no módulo.

**Validação:** `node --check` 122 `.mjs`; suíte **129/129**; `npm run build` verde; MCP prod (sessão
logada) pós-deploy. Relatório: `Desktop\MC39.22.2-final.md`.

### 9.27.3 MC39.22.3 — EX-4 Fase A: instrumentação do financeiro-fallback (2026-06-30)
> Branch `feat/mc39.22.3`. Instrumentação ADITIVA e fail-soft (zero regressão) para medir o uso
> real dos fallbacks financeiros em produção — pré-requisito do plano de remoção EX-4 (Fases B–D).

`_lib/financeiro-fallback.mjs` ganhou `registrarFallback(fn, store, hit)`: como cada `lerXLegado` só
é chamado após um miss do Supabase (`getX() ?? lerXLegado()`), um retorno **não-nulo = HIT** (o Blob
legado serviu um dado que o Supabase não tinha) — o sinal que **bloqueia a remoção**. No HIT:
`console.warn("[EX-4] fallback-hit", {fn, store, hit, ts})` (greppável nos logs Netlify, canal primário
de medição) + `Sentry.addBreadcrumb` warning (best-effort, sem flush). Miss não loga no console (evita
ruído no hot path do saldo-rs, polled a 5s). **Sem PII** nos logs (só fn/store/hit/ts — nunca endereço/
chave; R9). try/catch interno garante que a instrumentação **nunca lança nem altera o valor lido** (R1).

**Como medir (Fase A → C):** após o deploy, greppar `[EX-4]` nos logs das Netlify Functions por ≥30
dias (cobre o ciclo de troco FIFO). HIT=0 sustentado + backfill idempotente (operador, Fase B) →
habilita a Fase D (remover o módulo + re-auditar). Achado: `lerDebitoLegado` é export morto (sem
consumidor) → remover na Fase D.

**Cobertura/validação:** `_tests/ex4-instrumentacao.test.mjs` (3 casos). Suíte **132/132**; `node
--check` 122 `.mjs`; `npm run build` verde. Relatório: `Desktop\MC39.22.3-final.md` (plano de coleta
em `Desktop\EX-4-auditoria.md`).

## 10. Planejamento Estratégico — MC39.23 (improve)
> Branch `feat/mc39.23` (read-only). A skill `improve` (shadcn, variante `plan`) gerou 3 planos de
> implementação **autocontidos** em `plans/` — handoff para outro agente/operador executar. **Nenhum
> código alterado** (R1). Cada plano: objetivo, estado atual (`arquivo:linha`), passos com comandos de
> verificação, done criteria machine-checkable, STOP conditions, esforço; passos com segredo/serviço
> externo/dinheiro real marcados `[OPERADOR]`.

- **`plans/001-mc40-mainnet-deploy.md`** (P1) — deploy do `LeilaoGUT` em mainnet + two-step transfer da
  coordenação p/ Smart Account (KMS). Aterrado em `Leilao.sol:130-140` (two-step), `hardhat.config.js`
  (só sepolia → add mainnet), Ignition `LeilaoModule`, `MC40-checklist.md`, `docs/mainnet-prerequisites.md`.
- **`plans/002-playstore-submission.md`** (P2) — empacotar a PWA como app Android (Capacitor → AAB) e
  submeter à Play Store. Greenfield (sem `android/`); injeta `window.GUT_NATIVE.platform` (consumido por
  `useRecursosApp.js`); keystore, targetSdk≥36, data-safety/Web3, closed testing 12 testadores/14d.
- **`plans/003-launch-campaign.md`** (P2) — campanha de lançamento E-mail+WhatsApp. Segmentos derivados
  dos perfis (`AppContext.tipoUsuario`: corporativo/comum + leads); opt-in LGPD, SPF/DKIM/DMARC + HSM
  WhatsApp, cronograma 4 semanas, métricas (abertura/CTR/conversão via UTM).

Índice + dependências em `plans/README.md` (ordem 001 → 002/003; 001 é a raiz). **Execução = MCs
futuros, cada um com seu gate `security_audit.md`** (ver §MC39.23 lá). Relatório consolidado:
`Desktop\MC39.23-planejamento.md`.

### 10.1 MC40 — PREPARADO, ainda NÃO live (2026-06-30)
> Branch `feat/mc40`. O contrato **NÃO** está em mainnet ainda — não há endereço/tx para registar.
> Esta sessão fez só a PREPARAÇÃO segura; o deploy/flip é OPERADOR-ONLY (ETH real, irreversível, KMS).

- **Feito (agente):** review do `plans/001` (`improve review-plan`, achados críticos incorporados) +
  rede `mainnet` (chainId 1) adicionada ao `hardhat.config.js` (inerte sem segredos/flag). Wiring do
  flip já existe (`NETWORK_STAGE`/`CONTRATO_MAINNET`/`MAINNET_CHAIN_ID`; `/health` reporta `CHAVE_BRUTA_EM_MAINNET`).
- **Pendente (operador):** auditoria externa sem HIGH/CRITICAL → financiar/confirmar Smart Account KMS →
  deploy (Ignition `LeilaoModule`) → two-step transfer (aceitar = **UserOp KMS/Biconomy**, não `cast
  --private-key`) → `CONTRATO_MAINNET` no Netlify → flip `NETWORK_STAGE=mainnet` → validação on-chain.
  Runbook completo: `Desktop\MC40-final.md` + `plans/001-mc40-mainnet-deploy.md`.
- Quando o deploy ocorrer, registar AQUI o endereço mainnet + tx do two-step (hoje inexistentes).

---

## Transições Suaves — MC43 (2026-07-01)
> Branch `feat/mc43` (de `origin/main`). Padroniza a transição de ENTRADA de todas
> as abas ao padrão do ícone “Indique e Ganhe” (`components/PainelIndicacao.jsx`):
> `opacity 0→1`, `y 8→0`, `duration 0.35s` (framer-motion, ease default).

- **Fonte única (design system):** `src/lib/motion.js` — `GUT_ENTRANCE`,
  `GUT_ENTRANCE_STATIC`, `gutEntrance(reduce)`, `GUT_STAGGER_CONTAINER`,
  `GUT_STAGGER_ITEM`. Regra: *transição de entrada = helper, nunca ad-hoc*.
- **Todas as abas num único ponto:** `widgets/layout/Layout.jsx` envolve o
  `<Outlet/>` num `motion.div` chaveado pelo 1º segmento da rota. Trocar de aba
  re-dispara a entrada; navegar por parâmetro dentro da mesma aba (`/vitrine/:slot`,
  `/produto/:id`) NÃO re-monta (sem flash / sem perda de estado — R1).
- **Menu “Mais” (BottomNav):** os itens internos entram em cascata (stagger 50ms,
  `GUT_STAGGER_*`). A ABERTURA do sheet (`gut-slide-up 0.22s`) e o spring do Active
  Indicator do dock permanecem **inalterados** (protegidos).
- **Normalização de divergências:** `SejaNossoParceiro.jsx` (2 headers y:20/0.4s →
  estáticos; a entrada passa a ser a da página) e reveals condicionais y:16→y:8;
  `Dashboard.jsx` (header y:-12/0.5s → estático).
- **Acessibilidade:** `prefers-reduced-motion` → entrada instantânea (medido:
  wrapper mantém `opacity 1 / transform none`). CLS=0 (só opacity+transform).

**Prova (chrome-devtools, amostragem ao vivo):** ao trocar de aba, o wrapper anima
`opacity 0.08→1` e `translateY 6.2px→0` em ~0.35s; em reduced-motion fica estático;
itens do “Mais” abrem escalonados (`[0.61,0.44,0.24,0.01]` a 225ms). Relatório:
`Desktop\MC43-final.md`; protótipo: `Desktop\MC43-proto\transicoes.html`.

---

## Glass UI — Correções MC42 (2026-07-01)
> Branch `feat/mc42`. Agente de Interface (RUFLO Pilar 3). Padronização de 3 pontos
> do frontend ao `.gut-glass-standard`. Validação visual @375/768/1440 (chrome-devtools,
> guest/mock) com `getComputedStyle` ao vivo. `npm run build` verde em cada commit.

- **P1 — Header da Aba Lances (`pages/MercadoLances.jsx`).** As 3 barras empilhadas
  (cabeçalho/timer, modo, disclaimer) usavam `!rounded-none border-0 border-b`; o
  `border-0` não vence o shorthand `border:1px` do standard → borda+shadow completos
  por barra ("costuras"). **Solução final (após feedback):** envolver as 3 secções num
  ÚNICO `GlassCard` arredondado (`rounded-[14px]` + border + shadow, `overflow-hidden`),
  com divisores internos finos (`border-b border-white/10`) entre secções. Fica coerente
  com o card "Dar Lance". (Uma 1ª tentativa com modificador `.gut-glass--bar` app-bar flat
  foi descartada — o padrão é arredondado.)
- **P2 — Vitrine (`pages/Vitrine.jsx`).** A secção "Oportunidade Agora" (Prata/Bronze) em
  mobile usava carrossel horizontal (`overflowX:auto` + `scrollSnapType:x mandatory`,
  scrollWidth 791 > client 453). Trocado por stack vertical (`flexDirection:column`);
  slots empilham como Diamante/Ouro. Página passa a ter apenas scroll vertical. Desktop
  (grid 1fr 1fr) intacto.
- **P3 — Programado (`components/ScheduleView.jsx`).** Painéis eram `rgba(5,15,40,0.4/0.55)`
  inline SEM `backdrop-filter` → fundo animado (MC26.1) atravessava o texto (a11y, WCAG 1.4.3).
  Migrados para `.gut-glass-standard`: cabeçalho + seletor de semana + seletor de dia (blur 24px);
  grelha de horários + cartões de cotas usam `.gut-glass--solid` (navy 0.92, regra MC25.7 —
  texto denso). Estados ativo/selecionado mantêm o tint de acento sobre o blur.

**Conformidade (`@skill-comply`):** todas as superfícies passam a usar a classe do design
system — nada de `rgba` inline ad-hoc. Regra reforçada: *painel de vidro = classe, nunca rgba solto*.
**Ficheiros:** `MercadoLances.jsx`, `Vitrine.jsx`, `ScheduleView.jsx`, `globals.css` (limpeza do
modificador `--bar` não usado). Relatório: `Desktop\MC42-final.md` + shots em `Desktop\MC42-shots\`.

---

## Padrão de Edição — MC45 (2026-07-01)
> Branch `feat/mc45`. Banner da edição em formato QUADRADO e CLICÁVEL, em TODAS as edições.

- **`components/EdicaoBanner.jsx`** (novo) — banner quadrado 1:1 CLICÁVEL. Só o quadrado
  é o alvo (`<Link to="/edicao/:id">`), não o card. Mostra `edicao.imagem_url` (object-fit:
  cover) quando existir; senão placeholder padrão (🎁 em gradiente âmbar) — nunca vazio/quebrado.
  A11y: `aria-label`, foco visível (`.gut-edicao-banner:focus-visible`), hover sutil.
  Prop `clicavel={false}` para uso estático (página de detalhe).
- **`components/EdicaoCard.jsx`** (novo) — card reutilizável de edição (GlassCard + caixa
  âmbar com EdicaoBanner + info + cronómetro por edição + CTA). Substitui o antigo
  `EdicaoTimerCard` inline do Dashboard (removido, junto com os helpers órfãos).
- **`pages/EdicaoDetalhe.jsx`** + rota **`/edicao/:id`** (App.jsx, lazy) — destino do clique:
  info da edição (tipo, estado, cronómetro, produto, banner) + CTA → /mercado; estado
  "não encontrada" gracioso se o id não estiver na grelha (nunca 404/branco). Só leitura.
- **Dashboard** — a "Edição Ativa" passa a usar o EdicaoBanner clicável no lugar do 🎁
  estático (resto do card intacto); as "Outras Edições" passam a usar EdicaoCard (ganham o banner).
- **`hooks/useEdicoes.js`** — passa `imagem_url` (aliases banner_url/imagem; aditivo) para o
  banner ser real quando o backend fornecer a imagem; `null` → placeholder.

Regra: card de edição = `EdicaoCard`; banner de edição = `EdicaoBanner` (quadrado, clicável).
Relatório: `Desktop\MC45-final.md`; shots em `Desktop\MC45-shots\`.

---

## Performance — MC44 (2026-07-01)
> Branch `feat/mc44` (sobre main = MC42+MC43 mergeados). Diagnóstico medido + P0.

- **Causa-raiz da lentidão (P0 — corrigido):** `AppContext` tinha `tempoRestante`
  (250ms) e `edicoesTick` (1s) no `value` não-memoizado → cada tick recriava o value
  e re-renderizava TODOS os consumidores de `useAppContext` (~1–2×/s, contínuo).
  **Fix:** novo `AppTimerContext` + `useAppTimer` + `TimerProvider` aninhado que possui
  o estado de timer; o `AppProvider` mantém só a máquina de fim de leilão. Os 4
  consumidores de timer (MercadoLances/Dashboard/Vitrine/DetalheProduto) usam `useAppTimer`.
  **Provado ao vivo:** em `/configuracoes` idle 4s, `BottomNav` (consumidor de
  `useAppContext`, sem timer) re-renderizou **0×** enquanto o React fez 8 commits (o
  tick isolado); timer conta e o overlay de fim de leilão dispara. Regra: *estado de
  alta frequência vai em contexto próprio, nunca no value partilhado*.
- **Bundle (P1 — investigado, sem alteração):** o "total 5.4MB" é enganoso. No arranque
  carregam só ~1.26MB (raw): `privy` 821KB + `index` 276KB + 1 dep 120KB + `motion` 44KB
  (~400KB gzip no Netlify). O grosso do WalletConnect/Reown (~760KB: w3m-modal, wui-ux,
  core, ApiController) já é **lazy** (nunca carrega — login é Google/Email/Apple, sem
  wallet externa). Remover o WC transitivo do Privy seria arriscado (auth, R1) e daria
  ~0 de ganho no arranque; reverter o eager de Vitrine reintroduz o flash removido no
  MC39.19. Conclusão: bundle NÃO é o gargalo; o P0 foi a correção real.

---

## Banner na página de detalhes — MC46 (2026-07-01)
> Branch `feat/mc46`. Na página `/edicao/:id`, o banner passa a abrir a imagem num
> MODAL (lightbox) SOBRE a página, sem navegar para outra rota.

- **`components/ImageModal.jsx`** (novo) — lightbox via **portal** em `document.body`
  (escapa ao wrapper com `transform` do MC43 no Layout, garantindo `position:fixed`
  a cobrir o viewport real). Imagem ampliada (`max 90vw/90vh`, `object-fit:contain`)
  OU placeholder gracioso quando `imagem_url` é `null`. Fecha por: **X**, **clique fora**
  (overlay) e **ESC**. A11y: `role="dialog"` + `aria-modal`, foco inicial no X, focus-trap
  (Tab cicla), restauro do foco ao banner ao fechar, scroll do body bloqueado.
- **`components/EdicaoBanner.jsx`** — novo modo: prop `onClick` → renderiza `<button>`
  (dispara ação sem navegar). Sem `onClick`, mantém o `<Link>` (Dashboard → `/edicao/:id`)
  ou o quadrado estático. Ou seja: mesmo banner, 3 modos (Link / ação / estático).
- **`pages/EdicaoDetalhe.jsx`** — o banner usa `onClick` para abrir o `ImageModal`
  (antes era `clicavel={false}`), passando `edicao.imagem_url`.

Regra: ampliar imagem = `ImageModal` (portal + a11y); banner com `onClick` = ação, não rota.
Relatório: `Desktop\MC46-final.md`; shots em `Desktop\MC46-shots\`.

---

## Banner/ícone — MC47 (2026-07-01)
> Branch `feat/mc47`. Comportamento UNIFICADO: clicar em QUALQUER banner de edição
> abre o `ImageModal` (lightbox) SOBRE a página — nunca navega para outra rota/aba.

- **`components/EdicaoBanner.jsx`** — agora AUTO-CONTIDO: removido o `<Link>` (navegação)
  e o prop `onClick`. O banner clicável é sempre um `<button>` que abre o seu próprio
  `ImageModal` (imagem da edição ou placeholder), sem mudar de rota. `clicavel={false}`
  mantém o quadrado estático. Unifica os 3 contextos: Dashboard "Edição Ativa",
  `EdicaoCard` ("Outras Edições") e a página `/edicao/:id`.
- **`pages/EdicaoDetalhe.jsx`** — removida a fiação redundante do MC46 (state +
  ImageModal + onClick); o `EdicaoBanner` gere o modal internamente.
- **`Dashboard.jsx` / `EdicaoCard.jsx`** — sem alteração: herdam o novo comportamento
  (deixam de navegar para `/edicao/:id`, passam a abrir o modal).

Regra: banner de edição = ver a imagem num modal (nunca navegar). A rota `/edicao/:id`
continua acessível por URL direta, mas deixa de ser destino do clique no banner.
Relatório: `Desktop\MC47-final.md`; shots em `Desktop\MC47-shots\`.

---

## Padronização visual — MC48 (2026-07-02)
> Branch `feat/mc48`. 4 correções de consistência visual (decisões do operador em P2/P4).

- **P1 — Dashboard (topo em Glass):** a saudação (`<motion.header>`, GUTO + "Bem-vindo")
  passou a usar `.gut-glass-standard` (+ padding) — antes assentava no fundo animado.
  `pages/Dashboard.jsx`.
- **P2 — Carteira (cores dos botões):** "Depositar PIX" → azul suave (#00d4ff), "Lance
  Relâmpago" e "Usar no Mercado" → laranja suave (#f5a623) no idioma glass (translúcido
  + borda, sem glow). "Trocar por senhas" e "Atualizar saldo" **mantêm o roxo** (#a78bfa)
  — cor semântica de senhas em todo o app (decisão do operador). `pages/MinhaCarteira.jsx`.
  ⚠️ Validação visual exige LOGIN (Privy) — página auth-gated.
- **P3 — Vitrine (ícones de plano):** os recortes do GUTO (`GutoAvatar custom
  vitrine-slot-*`) foram substituídos por um badge com o `slot.emoji` (💎🥇🥈🥉) na cor
  do tier. O avatar do CABEÇALHO da página (`vitrine-header-confiante`) mantém-se.
  `pages/Vitrine.jsx`.
- **P4 — Vitrine (scroll Diamante/Ouro):** removido o `position:sticky` do SlotCard
  (Diamante e Ouro eram ambos sticky `top:0.5rem` → sobrepunham-se ao rolar). Agora
  `position:relative` sempre → rolam normalmente. `pages/Vitrine.jsx`.

Validado ao vivo 390/1440 (getComputedStyle + DOM): saudação com bg 0.25/blur; 0 imagens
GUTO nos cards da Vitrine + emojis presentes; 0 slot-cards sticky (o único sticky é a
sidebar desktop, pré-existente). P2 medido por código (auth-gated). Relatório:
`Desktop\MC48-final.md`; shots em `Desktop\MC48-shots\`.

## Compra de Senhas — MC49.3 (2026-07-02)
> Branch `feat/mc49.3`. Ficheiro: `netlify/functions/comprar-senhas.mjs`.

**O quê:** a conversão R$ → senha (`POST /comprar-senhas`) deixou de exigir papel
`cliente` (cota ativa ou adesão ativa). Qualquer carteira autenticada com saldo R$
suficiente (≥ R$ 2,00/senha) pode agora converter o próprio saldo em senhas on-chain.

**Antes:** `getRole(endereco)` + `if (!requireRole(role, "cliente")) → 403
"compra de fichas requer cota ativa ou adesão ativa — papel atual: <role>"`. Papéis
'user' (qualquer autenticado sem cota/adesão) eram bloqueados.

**Depois:** o gate foi removido. Mantêm-se intactos: JWT lance-auth (posse da carteira),
MFA gate, anti-IDOR (`endereco` do JWT == body), rate-limit, kill-switch e o débito
atómico de saldo (CAS). `getRole()` continua a rodar só para registar o papel no log de
início (auditoria) — não bloqueia.

**Modelo de saldo (recap):** PIX → +R$ (centavos); Lance Relâmpago → −R$; **Trocar R$
por Senhas (comprar-senhas) → −R$ 2,00/senha, +1 senha on-chain**; Lance Programado →
−1 senha on-chain. O mínimo de conversão (R$ 2,00 = 1 senha) não mudou.

**Nota:** o mesmo gate ainda existe em `lance-relampago.mjs` (fora do escopo desta MC).
Suite 132/132, build verde. Deploy/merge pendentes de validação viva + go do operador.
Relatório: `Desktop\MC49.3-final.md`.

## MC54.1 — Resolução final (Opção D: redeploy com EOA) (2026-07-04)
> Relatório completo: `Desktop\MC56-RELATORIO-FINAL.md`. Verificado on-chain no bloco 11204184.

**Contexto.** O caminho de coordenação dependia de uma Smart Account ERC-4337 (Biconomy,
EP v0.6) como `coordenacao()`. O bundler partilhado `bundler.biconomy.io` foi **desativado**
(MC52.1: `-32003 not supported` para todas as chains), bloqueando compra de senhas e todo o
fluxo da coordenação. As rotas de reparação (trocar URL, Pimlico, script local KMS — MC53/54/55)
falharam por acoplamento ao SDK Biconomy v2 e por a autoridade estar presa no próprio SA.

**Solução (Opção D).** Redeploy limpo do contrato com uma **EOA como coordenação**
(o construtor faz `coordenacao = msg.sender`, e o deployer é a EOA → nasce coordenador,
sem two-step). Backend migrado para `SIGNER_BACKEND=local-key` (a EOA assina tudo direto,
sem bundler/paymaster/KMS no caminho de coordenação).

| Item | Valor |
|---|---|
| Contrato NOVO (ativo) | `0x825bBd3F064979a5F750DBB6aED421b37AA3eF06` |
| Coordenador (EOA) | `0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E` (`coordenacao()` ✅) |
| Contrato ANTIGO A (abandonado) | `0x59A73Acc…F6D5` (coord = SA `0xdEbe63…2D92`) |
| Backend | `local-key`; health `SIGNER_READY=set`, `CHAVE_BRUTA_EM_MAINNET=ok` |
| Script de deploy | `desafio-gut/scripts/deploy-direct.cjs` (untracked) |

**Compra de senhas.** É 100% backend (`useTrocarPorSenhas` → `POST /comprar-senhas` →
signer local-key EOA → contrato novo via `CONTRATO_SEPOLIA`). **Funcional.**

**⚠️ Pendências abertas (NÃO fechadas no MC56 — só documentadas):**
1. **Frontend aponta para o contrato ANTIGO** — `VITE_CONTRATO_SEPOLIA` (`.env.production`/`.env.local`),
   `web3.js:26` (fallback) e `Seguranca.jsx:11` (hardcoded) ainda usam `0x59A7…`. O bundle
   deployado não contém `0x825b…`. Leituras diretas (`saldoSenhas`/`darLance`) podem estar a
   ler o contrato antigo → **regressão de UI latente**. Requer atualizar refs + rebuild + redeploy
   + validação visual R4.
2. **Redeploy por versionar** — `deploy-direct.cjs`, `ignition/`, `hardhat.config.cjs`, artifacts
   estão untracked em `feat/mc54.1`; `main` não tem nada. A registar em PR próprio.
3. **Segurança** — rotacionar API key Pimlico (vazou); `transferir.mjs` inseguro removido no MC56.

---

## MC57.5 — GUTO animado (idle) — piloto de estilo

**Objetivo.** Definir o estilo de micro-animação "idle" (respiração + piscar + aceno,
simultâneos) da 1ª imagem do GUTO, como piloto para as 8 imagens. Design MC, **sem
alteração de código do app** (R1).

**Pasta (fora do repo).** `Desktop\GUTO-ANIMADO GLASS DASHBOARD\` — contém o padrão
`GUTO_ANIMADO_PADRAO.mp4`, `variacao_B_*` (mp4/loop/webm), `1.png`/`guto_mc575_1_rgb.png`
(fonte), `notas_mc57.5_corrigido.txt`, `escolha.txt`. Relatório em `Desktop\MC57.5-RELATORIO.md`.

**Workflow rastreável (PILAR 2).**
- Interface: MCP `comfyui-cloud` (produção v0.28.1). Fallback chrome-devtools ficou **indisponível** na sessão.
- Motor: **WAN 2.6 i2v** (`api_wan2_6_i2v`). O OSS **WAN 2.2 14B** (`03_video_wan2_2_14B_i2v_subgraphed`)
  **não executa via `run_template`** (erro opaco 4×) — evitar; usar WAN 2.6 API.
- Input: imagem **achatada para RGB** (WAN API **rejeita PNG RGBA/transparente**). Nó imagem=`LoadImage 42`, prompt=nó `41` (`WanImageToVideoApi`), `generate_audio=false`, `prompt_extend=false`, 720P, 5s.
- Pós: loop **boomerang** (ffmpeg `reverse+concat`, 10s) + webm VP9.

**Resultado.** 3 variações A/B/C, GUTO 100% fiel; **B (Equilibrada, seed 102)** escolhida
pelo operador como oficial (A/C removidas). Prompt trava o fundo (TV/texto/púlpito) —
funciona bem, mas o **martelo pode vazar leve movimento**; reforçar negativo nas próximas.
Fundo do vídeo é branco (fonte transparente achatada) → compositing sobre o glass fica
para o MC de integração (frontend).

### MC57.6 — imagem 2 (padrão B, pose adaptada)
2ª imagem do carrossel animada com o **mesmo pipeline** (WAN 2.6 i2v, RGB flatten, 720P→960²,
5s, seed 102, boomerang loop). **Pose diferente:** GUTO à direita, mão esquerda apresenta a
**geladeira inox**, mão direita segura o **martelo** (parte do personagem) → prompt adaptado
(gesto de apresentação + leve balanço do martelo em vez do aceno). **Aprovado na 1ª geração:**
GUTO 100% fiel; **geladeira inox totalmente estática** (sem warping/reflexos — risco evitado),
melhor trava de fundo que a img1. Ficheiros `imagem2_*` na pasta. prompt_id `bfcba269…4b7a`.

### MC57.7 — imagem 3 (padrão B, pose adaptada)
3ª imagem: GUTO à esquerda segura placa **"LANCE ÚNICO"** e aponta; fundo = **máquina de
lavar inox** (porta de vidro + painel). Prompt adaptado (ênfase de apontar em vez de aceno)
com trava forte de texto+máquina. **Aprovado na 1ª geração:** GUTO fiel; **texto da placa
nítido e estático** (warping evitado — o maior risco); placa imóvel. ⚠️ leve *shimmer* no
vidro do tambor (menor, não gira). Ficheiros `imagem3_*`. prompt_id `8e3d8a9f…55fe`, seed 102.
**Carrossel: 3/8 imagens prontas** (1=oficial B, 2, 3). Falta: imagens 4–8.

### MC57.8 — imagem 4 (padrão B, pose adaptada) + fix sem custo
4ª imagem: GUTO à esquerda apresenta um **ar-condicionado split** (display "22°C" + unidade
externa com **ventilador**) e faz "joinha"; placa "PREMIUM AC UNIT". Prompt adaptado com trava
de ventilador+2 textos. Resultado: GUTO fiel, **"22°C" e placa nítidos/estáticos**, mas o
**ventilador girou uns graus**. Orçamento WAN esgotado (6/6) → corrigido **sem custo por ffmpeg**
(sobreposição da região estática do ventilador do frame 0; diff pós-fix = 100% preto, sem costura).
prompt_id `024efbf3…6db6`, seed 102. ⚠️ Nota: `reverse` do ffmpeg falhou por memória → boomerang
feito via re-sequência de frames + `-threads 1`. **Carrossel: 4/8 prontas.** Imagens 5–8 exigem
**recarga de créditos WAN**.

### MC57.9 — imagem 5 (padrão B, pose adaptada)
5ª imagem: GUTO segura um **laptop com o logo DESAFIOGUT**; fundo = martelo + 2 holofotes +
**2 painéis "BIDDING" cheios de números** (maior risco de warping). 1 geração **extra
autorizada** pelo operador (total 7). **Aprovado na 1ª geração:** GUTO fiel; **painéis BIDDING
100% estáticos** (diff preto); **logo DESAFIOGUT legível** (só leve tilt natural do laptop, sem
scramble); martelo/holofotes estáticos. Sem freeze necessário. prompt_id `a77da026…d60d`, seed 102.
**Carrossel: 5/8 prontas** (1 oficial B, 2, 3, 4, 5). Faltam 6–8.

### MC57.10 — imagem 6 (padrão B, pose adaptada)
6ª imagem: GUTO à esquerda segura um **smartphone "MENOR LANCE ÚNICO"** e apresenta com a
outra mão; fundo = **martelo em pedestal** (prop fixo). Crédito recarregado. **Aprovado na 1ª
geração:** GUTO fiel; **texto do telefone nítido/legível** (mesmo no frame extremo, sem warp);
**martelo+pedestal 100% estáticos** (diff preto); phone com tilt natural (é segurado). Sem freeze.
prompt_id `6ef20078…a856`, seed 102. **Carrossel: 6/8 prontas** (1 oficial B, 2, 3, 4, 5, 6). Faltam 7–8.

### MC57.11 — imagem 7 (padrão B, pose adaptada)
7ª imagem: GUTO à esquerda com **martelo** numa mão, outra apresenta um **fogão inox**
(2 displays "350"/"258", botões) + **microfone em pé**. **Aprovado na 1ª geração:** GUTO fiel;
**fogão inox 100% estático** (diff preto — risco de reflexo evitado); microfone estático; displays
estáveis no clip (levemente mais suaves que a fonte, legíveis). Sem freeze. prompt_id `7183984e…7ebb`,
seed 102. **Carrossel: 7/8 prontas** (1 oficial B, 2, 3, 4, 5, 6, 7). Falta só a **imagem 8**.

### MC57.12 — imagem 8 (finale celebração) + FECHO DO CONJUNTO
8ª imagem: GUTO ao centro **celebrando** (braços erguidos); fundo = título dourado
**"Arremate Já!"** + confete + **Smart TV (grade de apps)** + geladeira + lavadora + micro-ondas
(cena mais texto-pesada). Versão conservadora. **Aprovado pelo operador:** GUTO fiel; **título
nítido**; eletrodomésticos e logos da TV **estáticos** (prioridade de proteção de texto cumprida);
⚠️ confete derivou (WAN não congela; aceite como natural na celebração). prompt_id `6d15fa85…c55e`, seed 102.

> ✅ **CONJUNTO COMPLETO — 8/8 imagens GUTO animadas** (padrão B, WAN 2.6 i2v, seed 102, loop boomerang 10s + webm).
> Ficheiros `imagem{1..8}_*` + `GUTO_ANIMADO_PADRAO.mp4` em `Desktop\GUTO-ANIMADO GLASS DASHBOARD\`.
> Freeze ffmpeg aplicado onde prop fixo vazou (img4 ventilador). **Próximo: integração no app (MC58)** —
> copiar loops/webm para `public/`, trocar o carrossel estático (design brief MC57.4) por vídeos, `prefers-reduced-motion`, validação R4 375/1440.

### MC58 — PLANO de integração (imagem 1) no Glass do Dashboard (planeamento, R10)
Plano completo: `Desktop\MC58-PLANO-EXECUCAO.md`; levantamento: `GUTO-ANIMADO GLASS DASHBOARD\notas_mc58.txt`.
**Ponto de integração:** `Dashboard.jsx` L129-168 (`<motion.header className="gut-glass-standard">`,
bloco Saudação) — trocar o `<img guto-bemvindo.png>` (L137) por `<CarrosselGUTO/>` + divisor +
texto + logo (flex row horizontal, referência C3). **Reuso:** padrão `<video>` do
`GutoSpritePlayer.jsx` (lição MC39.9: sem canvas/blend-mode/filter). **⚠️ Risco central:** os
vídeos MC57.5-57.12 têm **fundo branco opaco**. **Decisão D1 (operador): Opção B — GUTO
transparente a flutuar.** ⚠️ Exige **pré-processar os vídeos para ALFA** (§1B do plano): rembg
per-frame → VP9-alfa (0 créditos, método MC57.4; cuidado geladeira/inox) OU green-screen regen
(+8 gerações WAN). **Operador: "usar o mesmo padrão do GUTO animado que o app já tem"** →
formato-alvo = o `idle.webm` do app (ffprobe: **VP9 512², yuv420p + ALPHA_MODE=1**, ~600KB); logo
os novos assets = `-c:v libvpx-vp9 -pix_fmt yuva420p`, **512²**, em `public/assets/guto/animations/`,
e **reusar o primitivo `GutoVideo`** do `GutoSpritePlayer.jsx` (sem blend/filter, lição MC39.9).
Escopo MC58.1 = **só imagem 1** (MVP), extensível às 8 (MC58.2). Nada codado neste MC (R10).

### MC58.1 — EXECUTADO ✅ (Glass animado GUTO img1 + logo, em produção)
Branch `feat/mc58.1-execucao-carrossel` · deploy prod live (`silly-stardust-ca71bc.netlify.app`).
- **Gate §1B (alfa) — RESOLVIDO sem rembg.** O vídeo `1.mp4` (`GUTO animado oficial\`, 960² h264
  30fps 300 frames) é uma **cena completa** (GUTO + TV "Menor Lance Único" + gavel + pódio, fundo
  BRANCO). Decisão do operador: **cena inteira, consertada** (não só o personagem). rembg (u2net)
  **descartava o pódio/base de vidro** (recorte por saliência) → trocado por método **determinístico
  cv2/scipy** (0 ML, ~50ms/frame): (1) flood-fill de bordas remove só o branco **conectado à moldura**
  (preserva brancos internos = camisa/olhos do GUTO); (2) remoção do **vidro fosco branco** só na
  região direita (protege os brancos do GUTO à esquerda) → vidro fica transparente (navy); (3)
  **downscale premultiplicado 960²→512²** + decontaminação (RGB dos px transparentes→preto) + erode
  2px → **elimina o halo branco** da borda. Feedback do operador atendido: sem fundo/halo branco,
  **brancos da roupa e dos olhos preservados**.
- **Asset:** `public/assets/guto/carrossel/guto-1.webm` (VP9 `yuva420p`/**ALPHA_MODE=1**, 512², 30fps,
  **1.16MB**, paridade `idle.webm`) + poster `guto-1.png` (1º frame alfa, Safari fallback).
  `logo-uniao-trabalho.png` otimizado **2.15MB→57KB** (480×320, transparente).
- **`CarrosselGUTO.jsx`** (novo): `<video>` simples (lição MC39.9 — sem canvas/blend/filter),
  `useReducedMotion` congela 1º frame, fallback poster, dimensões reservadas (zero CLS). MVP 1 vídeo,
  prop `slides` pronta p/ carrossel 2–8 (MC58.2).
- **`Dashboard.jsx`** L128-*: layout final segue a `REFERENCIA DE PROPORÇOES GUTO E LOGO`
  (aprovado pelo operador): **linha de cima = GUTO (esq) + logo (dir)** com larguras semelhantes
  (GUTO 176/116, logo h116/76, logo centrado na vertical); **saudação horizontal ABAIXO de ambos**
  (não entre eles), largura total, centrada (h1 1.3/1.0rem, p 0.85/0.75). Sem divisor. Preserva
  `isMobile`/`COR`/`motion.header`/texto condicional. Não toca web3/AppContext → **compra de
  senhas e leitura de saldo inalteradas**.
- **Validação:** build verde; MCP 1440 + 375 (público local + logado prod) sem overflow/corte;
  assets 200 em prod (webm `video/webm` immutable, logo `image/png`); console sem erros novos;
  saldo R$2.00/3 senhas renderizam em prod (sem regressão). Screenshots em
  `GUTO-ANIMADO GLASS DASHBOARD\` (`val-`/`prod-mc58-{375,1440}.png`). Relatório:
  `Desktop\MC58.1-RELATORIO.md`.
- **Próximo (MC58.2):** estender às imagens 2–8 (crossfade, 1 ativo + preload, `frontend-slides`).

### MC58.3 — EXECUTADO ✅ (carrossel completo 1–8 com crossfade, em produção)
Branch `feat/mc58.3-execucao-migracao-carrossel` (de `e81169c`) · deploy prod live. Plano: `Desktop\
MC58.2-PLANO-MIGRACAO.md`. Validação pré-migração aprovada: `GUTO-ANIMADO GLASS DASHBOARD\
validacao-pre-migracao\`.
- **Alfa das 7 imagens (2–8)** pelo **método universal**: flood-fill de bordas + downscale
  premultiplicado (`finalize_universal.py` usa `whitecut` v1), **SEM** o passo do vidro fosco da
  img1 (esse apagaria os eletrodomésticos). Independente da posição do GUTO (esq/dir/centro).
  Inox (2,3,4,7) intacto; **imagem 5 incluída**; **confete da img 8 aceite** (decisão do operador).
  `guto-2..8.webm` VP9-alfa 512² (ALPHA_MODE=1, 442KB–1.7MB) + posters. Total ~8.3MB.
- **`CarrosselGUTO.jsx`** evolui para carrossel: **crossfade lê a duração real** de cada vídeo
  (5s ou 10s) e cruza no **ponto médio**; o próximo arranca do 1º frame (pose neutra do boomerang).
  **Máx 2 `<video>` vivos** (ativo + próximo), `React.memo`, reduced-motion estático, poster fallback.
  `<video>` simples (MC39.9). **Dashboard inalterado** (o slot já existia do MC58.1; default = 8 slides).
- **Validação:** build verde; MCP 375/1440 (carrossel cicla, crossfade confirmado no DOM — sempre 2
  vídeos, próximo em t=0; alfa limpo; sem overflow); prod assets 200; console sem erros novos; saldo
  R$2.00/3 senhas em prod → **sem regressão** (header não toca web3/AppContext). Relatório:
  `Desktop\MC58.3-RELATORIO.md`.

### MC59 — Revisão técnica profunda pré-mainnet (DIAGNÓSTICO, R1: zero código)
Branch `feat/mc59-revisao-tecnica` (docs-only). Metodologia: **Opus 4.8 + ECC**
(skills `ai-first-engineering` + `verification-loop`; revisão manual profunda no
papel de `/code-review`+`/security-scan`; `/quality-gate` = aferição R1-R7).
Deliverables: `Desktop\MC59-RELATORIO.txt`, `Desktop\MC59-RELATORIO-BRUTO.txt`,
`desafio-gut/docs/MC59-relatorio.txt`.
- **Escopo profundo:** `contracts/Leilao.sol` (100%), 8 libs críticas
  (signer/contract/credito/saldoRs/jwt/rate-limiter/mp-signature), `webhook-mercadopago`
  + `comprar-senhas`, e o caminho de lance do frontend (`web3.js`). ~30 functions e
  a maioria do frontend ficam para uma **onda 2** automatizada.
- **20 achados** (proposta, pendente validação humana — Pilar 3): **1 CRÍTICO,
  4 ALTOS, 6 MÉDIOS, 8 BAIXOS, 1 INFO**. Veredito: 🔴 **NÃO liberar mainnet**
  até fechar o crítico + 4 altos.
- **🔴 CRÍTICO (B-1):** `signer.mjs:41-45` força backend `biconomy` em
  `NETWORK_STAGE=mainnet`, mas o bundler Biconomy está morto (MC52.1) e
  `assertChaveBrutaAusenteEmMainnet` (`signer.mjs:64-95`) proíbe a chave bruta —
  que a arquitetura viva (MC56 local-key/EOA) exige. Setar mainnet hoje quebra
  crédito de senhas e PIX. Decisão de arquitetura é pré-requisito do flip.
- **🟡 ALTOS:** `tx.wait(1)` síncrono no handler (timeout mainnet, `contract.mjs:122`);
  chainId/contrato Sepolia hardcoded no frontend + fallback p/ contrato antigo
  (`web3.js:26,32`, drift MC56); crédito/reembolso de saldo R$ **não atómicos**
  vs. débito atómico (`saldoRs.mjs:50-106,178-192` — lost update); HMAC de webhook
  ainda **fail-open** (`MP_WEBHOOK_SECRET` não setado, MC39.17).
- **Positivos confirmados:** contrato sem custódia de fundos (sem reentrância),
  débito de saldo atómico (CAS), assinatura centralizada, MFA/IDOR/kill-switch.
- Sem alterações de código. Plano de ação priorizado (P0/P1/P2) no relatório final.

### MC59.1 — Correção do B-1 (signer.mjs) com loop de validação ✅ (B-1 resolvido)
Branch `feat/mc59.1-correcao-signer` (de `feat/mc59-revisao-tecnica`). Stack:
Opus 4.8 + ECC (ai-first-engineering, tdd-workflow, verification-loop,
santa-method). **Escopo R1: produção só em `_lib/signer.mjs`.** Deliverables:
`Desktop\MC59.1-RELATORIO.txt`, `Desktop\MC59.1-notas.txt`, teste
`_tests/mc591-signer-localkey-mainnet.test.mjs`, `security_audit.md` (secção MC59.1).
- **Correção (Opção B, minimal):** `assertChaveBrutaAusenteEmMainnet()` permite
  `COORDENACAO_PRIVATE_KEY` em mainnet **só** com `SIGNER_BACKEND=local-key`
  explícito (opt-in EOA/MC56; `console.warn` de hot key, não `throw`). Default
  mainnet segue `biconomy`; chave bruta **acidental** continua rejeitada. A
  "Alteração 1" do rascunho (trocar o default) foi DESCARTADA por ser redundante
  e um downgrade de segurança (hot-key silenciosa).
- **TDD:** 2 testes RED→GREEN (novo comportamento) + 3 regressões de segurança
  GREEN. **Validação:** node --check limpo; signer 27/27; integração+dinheiro
  18/18; build verde; secret-scan limpo. **Mainnet-simulado:** signer assina
  EIP-191+EIP-712 com recuperação de EOA correta (prova sem tx real).
- **Revisão adversarial (santa-method):** ECC security-reviewer → **NICE**, sem
  findings CRIT/HIGH/MED (fail-closed, guards biconomy intactos, sem vazamento).
- **Veredito honesto (diverge do R8):** B-1 ✅ desbloqueado, mas **NÃO** "liberado
  para mainnet" — B-2 (tx.wait síncrono), B-4 (chainId hardcoded/drift), C-1
  (crédito não-atómico), D-1 (webhook fail-open) **permanecem abertos**. Tx
  on-chain real e flip = operador (segredos + envs). Próximo: MC59.2+ p/ os 4 altos.

### MC59.2 — Correção dos altos (C-1/D-1/B-4 ✅ · B-2 ⚠️ revertido)
Branch `feat/mc59.2-correcao-altos`. Stack: Opus 4.8 + ECC (tdd-workflow,
verification-loop, security-scan). Deliverables: `Desktop\MC59.2-RELATORIO.txt`,
`docs/MC59.2-relatorio.txt`, `security_audit.md` (secção MC59.2), testes mc592-*.
Escopo decidido **com o operador** (perguntas respondidas): D-1 seguro sem quebrar
prod; B-4 só centralizar config.
- **C-1 ✅** (`saldoRs.mjs`): crédito e reembolso agora ATÓMICOS via CAS
  (`ajustarSaldoRsAtomico`), fechando o lost-update vs. débito concorrente. TDD com
  testes de lost-update determinísticos. Revisão: núcleo NICE. Follow-up MEDIUM
  (MC59.3): bootstrap de endereço novo → INSERT..DO NOTHING.
- **D-1 ✅** (`mp-signature.mjs`/`webhook`): flag opt-in `MP_WEBHOOK_ENFORCE`
  (fail-closed sem segredo) + fail-open observável (alerta). SEM janela de replay
  (MP reenvia com ts antigo; idempotência por pedidoId cobre). Gate: operador setar
  `MP_WEBHOOK_SECRET`.
- **B-4 ✅** (`src/lib/network.js` novo + call-sites): fonte única derivada de env;
  remove fallback p/ contrato ANTIGO e literais Sepolia; chainId/explorer
  sobrescrevíveis por env. **Não vira o endereço implantado** (fica no env do
  operador). Sem runner frontend → validado por build verde.
- **B-2 ⚠️ revertido:** a tentativa de "re-verificar on-chain antes de reembolsar"
  foi reprovada por **revisão de segurança (HIGH)** — comparava saldo agregado, e
  sob concorrência no mesmo endereço podia NÃO reembolsar (perda ao usuário).
  Voltou ao reembolso-seguro + alerta C-4 de reembolso falho. Fix real (atribuição
  por tx-hash ou fila assíncrona) → **MC59.3**.
- **Veredito honesto (diverge do R8):** 3 de 4 endereçados; **B-2 aberto**; mainnet
  ainda NÃO liberada. Validação: 54/54 na superfície afetada, build verde,
  secret-scan limpo. Pendências de operador em `Desktop\MC59.2-RELATORIO.txt`.

### MC59.3 — B-2 (tx-hash) + follow-up C-1 (bootstrap atómico) ✅✅
Branch `feat/mc59.3-correcao-b2-c1`. Stack: Opus 4.8 + ECC (search-first,
tdd-workflow, verification-loop, security-review). Deliverables:
`Desktop\MC59.3-RELATORIO.txt`, `docs/MC59.3-relatorio.txt`, `security_audit.md`,
testes mc593-*.
- **B-2 ✅** (`contract.mjs::creditarSenhas` + `comprar-senhas.mjs`): abordagem
  CORRETA por **tx-hash específico** (substitui o guard delta-based reprovado no
  MC59.2). Se `tx.wait` falha, re-verifica o receipt DAQUELA tx: status 1→sucesso;
  status 0→TX_REVERTED (reembolsa); ausente→TX_PENDENTE (NÃO reembolsa cegamente,
  evita double-benefit, alerta level=error + 502 credito_pendente). Retry curto no
  getTransactionReceipt (blip RPC). Elimina a atribuição cruzada entre requisições.
- **C-1 follow-up ✅** (`saldoRs-store.mjs` + `saldoRs.mjs`): `inserirSaldoSeAusente`
  = INSERT ON CONFLICT DO NOTHING (ignoreDuplicates); bootstrap de crédito/reembolso/
  débito deixa de sobrescrever linha criada concorrentemente. Garantia pelo PRIMARY
  KEY, sem janela residual.
- **Revisão adversarial (security-reviewer): VEREDITO NICE** — HIGH do MC59.2
  eliminado; recs aplicadas (retry + alerta error). Follow-ups: SENTRY_DSN em prod,
  runbook de reconciliação `credito_pendente`, e **serialização de nonce por
  endereço** no backend local-key (causa das colisões → candidato a MC59.4).
- **Validação:** TDD RED→GREEN em cada fix; superfície afetada **58/58**; build
  verde; secret-scan limpo. Tx on-chain real = operador (segredos).
- **Veredito:** ✅ B-2 e follow-up C-1 resolvidos — mainnet mais próxima; restam
  gates de operador (envs/segredos/migrações) e MC59.4 (nonce) antes do flip.

### MC60 — Flip para mainnet: 🔴 NO-GO (mainnet NÃO ativada)
Branch `feat/mc60-flip-mainnet` (doc-only). Nenhuma env setada, nenhum deploy,
nenhuma chave tocada. Deliverables: `Desktop\MC60-NOGO-RELATORIO.txt`,
`docs/MC60-NOGO-relatorio.txt`.
- **Bloqueadores (com prova):** (B1) **contrato NÃO existe na mainnet** — `eth_getCode`
  de `0x825bBd3F…eF06` na mainnet = `0x` (vazio) vs. 9.648 chars de bytecode na
  Sepolia → flip bricaria o fluxo on-chain; (B2) **chave privada real colada no
  prompt** → comprometida, precisa rotação, operador seta manualmente; (B3) nonce
  não serializado; (B4) `MP_WEBHOOK_SECRET` placeholder + `SENTRY_DSN` não
  confirmado; (B5) regra do projeto: não flipar antes do deploy do contrato na
  mainnet. O critério "0x = contrato existe" do plano estava INVERTIDO.
- **Pré-requisitos documentados** (deploy mainnet do contrato, rotação de chave,
  MC59.4, segredos reais, gás na EOA, validação viva do operador).
- Próximo: **MC59.4** (retry de nonce + runbook + ADR do fix assíncrono) + script
  de flip parametrizado sem segredos.

### MC59.4 — retry de nonce + runbook + ADR (rumo ao fix definitivo)
Branch `feat/mc59.4-nonce-runbook`. Stack: Opus 4.8 + ECC (tdd-workflow,
verification-loop, search-first, security-review). Deliverables:
`Desktop\MC59.4-RELATORIO.txt`, `docs/MC59.4-relatorio.txt`,
`docs/runbook-credito-pendente.md`, `docs/adr-2026-07-08-confirmacao-assincrona.md`,
`scripts/flip-mainnet.sh`.
- **Re-diagnóstico honesto:** o "lock de nonce por endereço" é impróprio no
  serverless (mutex em memória inútil entre instâncias Lambda; nonce colide na EOA
  única). Colisão de nonce falha no broadcast → **já reembolsa** (não fica preso).
  O `TX_PENDENTE` "dinheiro preso" vem do **wait síncrono vs timeout**, não do nonce.
- **Código** (`_lib/contract.mjs`, R1): `enviarAdicionarSenhasComRetry` reenvia com
  nonce fresco em colisão (jitter); erros não-nonce propagam (reembolso seguro).
  Mantém tx-hash do MC59.3. TDD 4/4; suíte afetada 57/57; build verde.
- **Runbook** (`docs/runbook-credito-pendente.md`): reconciliação por txHash.
- **ADR** (`docs/adr-2026-07-08-confirmacao-assincrona.md`): o fix DEFINITIVO é a
  **confirmação assíncrona** (fila MC39.20 + resposta 202 + worker confirma/
  reembolsa) — recomendado como pré-requisito de mainnet, acima de qualquer lock.
- **`scripts/flip-mainnet.sh`**: flip parametrizado SEM segredos, com preflight
  `eth_getCode` (aborta se o contrato não existir na rede — a checagem que faltou
  no MC60). Não seta a chave privada (operador injeta manualmente).
- **Segurança:** a chave vazada no prompt do MC60 NÃO foi persistida (grep confirmou).
- **Veredito:** mitigação entregue e testada; a mainnet ainda depende do ADR
  (assíncrono) + gates do operador do MC60 NO-GO.

### MC59.5 — confirmação assíncrona do crédito (ADR implementado, DORMANT) ✅
Branch `feat/mc59.5-adr-assincrono`. Stack: Opus 4.8 + ECC (search-first,
tdd-workflow, verification-loop, security-review). Deliverables:
`Desktop\MC59.5-RELATORIO.txt`, `docs/MC59.5-adr-assincrono.txt`, testes mc595-*.
- **Implementa o ADR do MC59.4:** `submeterCredito` (submete adicionarSenhas sem
  aguardar o wait → remove o timeout do handler) + `confirmarReceiptOnchain`
  (read-only) em `contract.mjs`; `_lib/worker-credito.mjs` (novo) confirma em
  background e reembolsa se revertido (claim-before-refund, idempotente);
  `fila-processor` registra o handler; `comprar-senhas` ganha ramo **flag-gated**
  (`CREDITO_ASSINCRONO`, OFF por default) que responde **202** (sem voucher).
  `creditarSenhas`/PIX e o path síncrono **intactos**.
- **DORMANT por design:** flag OFF + fila MC39.20 inerte. Habilitar exige migração
  da fila + polling no frontend + follow-ups (reaper, idempotência client-side).
- **Revisão adversarial (money-path): NAUGHTY → resolvido.** Sem double-submit/
  double-credit. Corrigidos: double-refund cross-path (fallback não reembolsa),
  confirm frio (removido), claim-before-refund no worker.
- **Validação:** TDD 10/10; suíte afetada **72/72**; build verde; sem secrets;
  flag não setada no repo.
- **Veredito:** ADR implementado e validado; mainnet mais próxima, mas a feature
  fica dormant até os pré-requisitos do operador (migração/frontend) + gates do MC60.

### MC59.6 — frontend polling do 202 (crédito assíncrono) ✅ (dormant)
Branch `feat/mc59.6-frontend-polling`. Stack real: React/JSX (NÃO TS). Deliverables:
`Desktop\MC59.6-RELATORIO.txt`, `docs/MC59.6-frontend-polling.txt`, teste
`src/lib/creditoPolling.test.mjs`.
- **Completa o par do MC59.5:** o frontend passa a lidar com a resposta **202**.
  `src/lib/creditoPolling.js` (lógica PURA, testada node:test 6/6) + hook
  `useCreditoStatus` (polling on-chain do receipt via txHash, **cancela no unmount**)
  + `CreditoStatus.jsx` (feedback processing/confirmed/reverted/timeout, usa
  `explorerTx` da config) + `web3.verificarCreditoOnchain` + `useTrocarPorSenhas`
  detecta 202. Wirado em `MinhaCarteira` (inerte com flag OFF → renderiza null).
- **Desvios do plano (justificados):** JS/JSX (projeto não usa TS); **poll on-chain
  por txHash** em vez de jobId+endpoint (o backend não devolve jobId nem há store de
  status); timeout é estado próprio (≠ "failed"). Sem runner React → lógica pura
  testada com node:test; hook/componente validados por build + esbuild.
- **Segurança:** superfície read-only (txHash público), sem secrets; checklist sem
  findings. Build verde; backend intacto (MC59.5 72/72).
- **Veredito:** frontend polling implementado; feature dormant até
  CREDITO_ASSINCRONO=ON + migração da fila + validação viva do operador (Sepolia),
  além dos gates do MC60 NO-GO.

### MC59.7 — migração da fila (MC39.20): 🟡 ação do OPERADOR (agente não aplicou)
Branch `feat/mc59.7-migracao-fila` (doc-only). Deliverables:
`Desktop\MC59.7-RELATORIO.txt`, `docs/MC59.7-migracao-fila.txt`.
- **Correção grave do plano:** a tabela **NÃO é `fila_credito`** (não existe no
  código). O worker/`_lib/fila.mjs` usam a tabela genérica **`fila_tarefas`** + RPC
  **`reservar_tarefas`** (FOR UPDATE SKIP LOCKED). A migração **REAL já está no
  repo**: `supabase/migrations/20260629_fila_tarefas.sql` (idempotente).
- **Por que o agente não aplicou:** DDL em produção (Supabase) é outward-facing/
  difícil de reverter e exige credenciais do operador; a própria migração diz
  "Execução pelo OPERADOR (R12)". CLI existe (v2.107.0) mas `db push`/`link` precisa
  do token do operador. Sem acesso ao banco, o agente também não faz a verificação.
- **Runbook** (no relatório): pré-check (`to_regclass`/`to_regprocedure`), aplicar
  (`supabase db push` OU colar a migração no SQL Editor), pós-validação (colunas,
  `idx_fila_elegiveis`, RLS, RPC, smoke `reservar_tarefas(1)`=0 linhas).
- **Impacto de aplicar com flag OFF:** SEGURO — comprar-senhas não enfileira; o cron
  encontra a fila vazia (no-op). Habilitar o async é passo separado (staging).

### MC59.8 — `supabase db push`: 🔴 ABORTADO (risco de perda de dados em produção)
Branch `feat/mc59.8-migracao-fila-cli` (doc-only). Deliverables:
`Desktop\MC59.8-RELATORIO.txt`, `docs/MC59.8-migracao-fila-cli.txt`.
- **Probe read-only `supabase migration list`** (projeto linkado `vjslwowwrpcawijdiksm`)
  revelou o **histórico do remoto VAZIO** (as 8 migrações locais sem registro no
  remoto), embora as tabelas já existam em produção há meses.
- **`db push` aplicaria TODAS as 8** → incluindo `20260621_cotas_schema.sql` que faz
  **`DROP TABLE ... CASCADE`** em cotas/cotas_pagas/cota_fingerprints (dados
  corporativos reais). Memória do projeto: *"nunca re-rodar migrações com DROP TABLE"*.
  → Rodar db push aqui = **perda permanente de dados de produção**. ABORTADO.
- **Caminho seguro (operador):** aplicar SÓ `20260629_fila_tarefas.sql` (idempotente,
  sem DROP) via SQL Editor; e, antes de qualquer `db push` futuro, `supabase migration
  repair --status applied <versões já aplicadas>` para sincronizar o histórico SEM
  re-rodar o SQL. **Nunca** `db push`/`db reset` com o histórico vazio.
- Nenhum comando mutante rodado; nenhum código alterado. Fila segue não aplicada
  (async dormant, sem regressão).

### MC59.10 / MC59.11 — decisão da EOA coordenadora p/ mainnet: 🟢 diagnóstico (agente) + 🟡 execução (OPERADOR)
Branches `feat/mc59.11-execucao-nova-eoa`. Deliverables:
`Desktop\MC59.10-RELATORIO.txt`, `Desktop\MC59.11-RELATORIO.txt`,
`docs/MC59.10-relatorio.txt`, `docs/MC59.11-relatorio.txt`.
- **Correção crítica de selector:** `coordenacao()` = **0xe06f9dbf**;
  `coordenacaoPendente()` = **0x0956e76e**. Comandos anteriores usaram 0x0956e76e como
  se fosse coordenacao() → liam 0x0 e geravam falso alarme de "coordenador zerado".
  Zero em coordenacaoPendente() é o estado **NORMAL** (sem transfer two-step em curso).
- **Contrato saudável:** leitura correta em `0x825bBd3F…eF06` (Sepolia):
  `coordenacao()` = **0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E** (sempre esteve setado);
  `MAX_LANCES_UNICOS()` = 10000 confirma identidade LeilaoGUT. Não houve two-step
  incompleto nem deploy zerado.
- **Autorização (contracts/Leilao.sol):** `address public coordenacao`; modifier
  `apenasCoordenacao` = `require(msg.sender==coordenacao)`; constructor faz
  `coordenacao = msg.sender` → **quem deploya vira coordenador automaticamente** (sem
  passo manual de "setar"). Corrige o passo 3.1 do comando MC59.11.
- **Decisão: Opção B (nova EOA).** A chave privada do coordenador foi exposta em texto
  puro numa sessão de chat → COMPROMETIDA. Financiar na mainnet endereço controlado por
  ela = perda quase certa por sweeper bots; rotação vem **antes** do ETH real, não depois.
  Para mainnet: gerar EOA nova offline, deployar a partir dela (coordenacao=nova auto),
  depois migrar custódia para KMS (MC30.2, 0xAEFe11…EdFF) ou Safe.
- **Plano operador (Segmentos 1–5, manual):** gerar EOA → financiar só o gás → deploy
  a partir da EOA nova → smoke de crédito/lance → revogar chave antiga (.env, segredos
  Netlify, scripts, histórico git). Agente NÃO executa transação com ETH real (Pilar 1).

### MC59.12 — avaliação MC60-NOGO + pré-requisitos mainnet: 🔴 NO-GO PERMANECE
Branch `feat/mc59.12-leitura-nogo` (doc-only, read-only). Deliverables:
`Desktop\MC59.12-RELATORIO.txt`, `docs/MC59.12-relatorio.txt`.
- **Verificado agora:** mainnet `eth_getCode(0x825b…)` = **"0x"** (contrato NÃO existe
  na mainnet — B1 aberto). signer.mjs (MC59.1) já aceita `local-key` em mainnet SE
  `SIGNER_BACKEND=local-key` explícito (default mainnet = biconomy, rejeita chave bruta).
- **⚠️ Desatualização grave:** `mainnet-prerequisites.md` descreve Smart Account/Biconomy
  (passos 3–5) — arquitetura ABANDONADA na Opção D. Passos 8–9 contradizem a Opção B
  (pedem "COORDENACAO_PRIVATE_KEY ausente"/`chaveBrutaEmMainnet=false`, mas em local-key
  a chave é NECESSÁRIA/presente). Doc precisa ser reescrito p/ Opção B.
- **Bloqueadores 🔴 restantes:** (1) auditoria externa P0 sem evidência; (2) EOA nova não
  gerada/rotacionada (B2); (3) contrato ausente na mainnet (B1/B5); (4) setar
  SIGNER_BACKEND=local-key + CONTRATO_MAINNET real. 🟡: MP_WEBHOOK_SECRET/SENTRY,
  Flashbots CONSOLIDATION_RPC_URL, hardening Privy. 🟢: fila async (nonce fix definitivo).
- **Veredito:** NÃO revogar o NO-GO. Ordem: auditoria → reconciliar doc → MC59.11 Seg.1–5
  → segredos/Flashbots/Privy → reavaliar flip. ETH real sempre com o OPERADOR.

### MC59.13 — reescrita do mainnet-prerequisites.md p/ Opção B: ✅ doc atualizado
Branch `feat/mc59.13-reescrita-prerequisitos` (doc-only). Deliverables:
`docs/mainnet-prerequisites.md` (reescrito, 98+/65−), `Desktop\MC59.13-RELATORIO.txt`,
`docs/MC59.13-relatorio.txt`.
- Removeu Smart Account/Biconomy/bundler como passos operacionais (mantidos só como nota
  histórica/contexto). Corrigiu o gate: `COORDENACAO_PRIVATE_KEY` PRESENTE/NECESSÁRIA +
  `SIGNER_BACKEND=local-key` explícito; pós-deploy espera `chaveBrutaEmMainnet=true`.
- Corrigiu envs de frontend (via src/lib/network.js MC59.2): além de `VITE_CONTRATO_SEPOLIA`
  = endereço mainnet, exige `VITE_CHAIN_ID=1`, `VITE_EXPLORER_URL=https://etherscan.io`,
  `VITE_NETWORK_STAGE=mainnet`. KMS/Safe rebaixados a hardening futuro; +seção nonce hot-key.
- Não altera o veredito de prontidão: NO-GO do MC60 permanece (auditoria P0 + EOA nova).

### MC59.14 — revogação da chave + decisão de auditoria + prep MC60: 🟡 PARCIALMENTE PRONTO
Branch `feat/mc59.14-revogacao-preparacao`. Deliverables: `Desktop\MC59.14-RELATORIO.txt`,
`docs/MC59.14-relatorio.txt`, `docs/mainnet-prerequisites.md` (§3 marcado como executado).
- **Deploy mainnet CONFIRMADO on-chain:** contrato **0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd**
  (getCode≠0x; MAX_LANCES_UNICOS=10000), `coordenacao()` = EOA nova
  **0xFea436f74059F885ea50D48aBbE21ef6665d1E67** (nonce=1, deploy a partir dela; chave antiga
  NÃO usada; saldo ~0,00475 ETH).
- **Chave antiga (0x1394492e…):** completa NÃO está em arquivo tracked nem no histórico git
  (só prefixo truncado em docs). → NÃO precisa reescrever histórico git.
  STATUS: ✅ **revogada nos .env locais (VERIFICADO na 3ª checagem)** — 1ª/2ª reprovaram
  (chave presente apesar de reportada removida); o agente (autorizado) removeu os valores de
  `desafio-gut/.env:3` (`PRIVATE_KEY`) e `frontend/.env.local:17` (`COORDENACAO_PRIVATE_KEY`),
  grep "1394492e" → vazio. .env são gitignored (não commitados). ⚠️ Netlify não verificável
  pelo agente → operador precisa RECONFIRMAR (chave antiga fora, nova dentro).
- **Auditoria externa (P0):** ✅ DECIDIDA = **OPÇÃO B (aceitação formal de risco)**. Justificativa
  do operador: contrato não custodia fundos (verificado: sem payable/transfer/receive/fallback);
  dinheiro real off-chain (PIX/MP); revisão técnica INTERNA (MC59.1–59.6); risco aceito com
  monitoramento. (Nota: interna ≠ auditoria externa independente — risco assumido conscientemente.)
- **Script de deploy:** salvaguardas commitadas (714dff9).
- **Veredito:** 🟢 pré-condições críticas do MC60 resolvidas (deploy ✅, auditoria=B ✅,
  revogação local ✅) — liberado para INICIAR o MC60. Ressalvas (dentro do MC60): reconfirmar
  Netlify; envs CONTRATO_MAINNET + VITE_* mainnet + MP_WEBHOOK_SECRET + SENTRY + Flashbots +
  hardening Privy; flip (NETWORK_STAGE) por último.

### MC59.15 — correção da config mainnet (RPCs): 🟡 diagnóstico OK, aguardando operador
Branch `feat/mc59.15-correcao-config-mainnet`. Deliverables: `frontend/notas_mc59.15.txt`,
`Desktop\MC59.15-RELATORIO.txt`, `docs/MC59.15-relatorio.txt`. ZERO alteração de código.
- **Premissa original REFUTADA:** as variáveis de ENDEREÇO do contrato já estavam corretas
  (`VITE_CONTRATO_SEPOLIA`=`CONTRATO_MAINNET`=**0x0052477A…16cd**, `VITE_CHAIN_ID`=1,
  `*_NETWORK_STAGE`=mainnet, `SIGNER_BACKEND`=local-key). On-chain: contrato saudável
  (9648 bytes), `coordenacao()`=nova EOA **0xFea436…1E67** ✅.
- **Causa raiz real** dos erros `saldoSenhas` (0x/BAD_DATA) e `comprar-senhas` (502) =
  RPCs ainda em SEPOLIA: `RPC_URL` e `VITE_ALCHEMY_URL`=`eth-sepolia…` (frontend lê
  contrato mainnet via RPC Sepolia → 0x); e `CONTRATO_SEPOLIA`=**0x825b…eF06** (contrato
  ANTIGO), que `_lib/contract.mjs:44` resolve ANTES de `VITE_CONTRATO_SEPOLIA` → todo o
  backend usava o contrato velho. Vars mortas confirmadas (sem leitores): `VITE_RPC_URL_SEPOLIA`,
  `VITE_CONTRACT_ADDRESS`(=0x000…0).
- **Correção = 3 env:set (operador):** `RPC_URL` e `VITE_ALCHEMY_URL` → `eth-mainnet…`
  (mesma API key funciona trocando subdomínio — VERIFICADO por probe read-only: chainId 0x1,
  getCode 9648, coordenacao()=nova EOA); `CONTRATO_SEPOLIA` → 0x0052477A…16cd.
- **Pré-condição:** confirmar `COORDENACAO_PRIVATE_KEY` de prod = nova EOA 0xFea436…1E67
  (é a ressalva "reconfirmar Netlify" do MC59.14). Enquanto RPC_URL for mainnet, comprar-senhas
  submete ETH real → validação da compra (R$1) é MANUAL/operador.
- **Veredito:** correção pronta e validada no lado de leitura; comunicação on-chain restaurada
  quando o operador aplicar os 3 env:set + rebuild/deploy + validar V1–V3.

### MC60 — MARCO DEFINITIVO: MAINNET ATIVA (encerramento e consolidação): ✅ EM PRODUÇÃO
Data do marco: **2026-07-09**. Branch `feat/mc60-marco-mainnet` (doc-only; R1: zero código,
zero transação, zero manuseio de segredos). Deliverables: `Desktop\MC60-RELATORIO.txt`,
`desafio-gut/docs/MC60-marco-mainnet.txt`, esta seção.
- **VEREDITO: ✅ MAINNET ATIVA — SISTEMA EM PRODUÇÃO NA ETHEREUM MAINNET.** Sustentado por
  evidência coletada AO VIVO (read-only) em 2026-07-09, não apenas pelos relatórios.
- **Evidência on-chain** (RPC público ethereum-rpc.publicnode.com, contrato 0x0052477A…16cd):
  `eth_chainId`=**0x1** (mainnet); `eth_getCode`=**9648 chars** de bytecode (contrato EXISTE);
  `coordenacao()` (selector 0xe06f9dbf)=**0xFea436…1E67** (nova EOA). Etherscan:
  https://etherscan.io/address/0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd
- **Evidência de config** (health ao vivo `…/functions/health`): `ok:true`,
  `SIGNER_BACKEND=local-key`, `SIGNER_READY=set`, `RPC_URL=set`, `MP_ACCESS_TOKEN=set`,
  `PIX_PROVIDER=mercadopago`, e **`CHAVE_BRUTA_EM_MAINNET=ALERT`** — alerta que só dispara com
  local-key em MAINNET → confirma que o sistema opera em modo mainnet.
- **NO-GO superado (não ignorado):** o MC60-NOGO (2026-07-08) era correto no ESTADO ANTERIOR
  (contrato antigo 0x825b… sem código na mainnet). B1/B5 resolvidos pelo deploy do novo contrato
  (MC59.11/59.14); B2 pela nova EOA + revogação da chave antiga; B3 mitigado (MC59.4, retry de
  nonce; fix definitivo async dormente); B4 parcial (MP token set; MP_WEBHOOK_SECRET/SENTRY = operador).
- **Linha do tempo:** MC52.1→MC56 crise do bundler → Opção D (EOA+local-key); MC59.1→59.6
  bloqueadores + ADR async; MC59.10→59.14 EOA nova + deploy + revogação + auditoria=B; MC59.15
  RPCs corrigidos; MC60 consolidação.
- **Pendências (não bloqueantes):** 🔴 nenhuma. 🟡 validação manual da compra de R$1 (OPERADOR,
  ETH real, fora do alcance do agente por R1); reconfirmar `COORDENACAO_PRIVATE_KEY` de prod =
  nova EOA no Netlify; MP_WEBHOOK_SECRET/SENTRY_DSN; ativar `CREDITO_ASSINCRONO=ON` após migração
  da fila. 🟢 migrar custódia local-key→KMS/Safe (encerra o alerta), Flashbots, hardening Privy.
- **Status final:** o DESAFIOGUT está oficialmente registrado como **EM PRODUÇÃO NA MAINNET**.

### MC61 — PLANEJAMENTO: remover login Apple/Email (só Google): 📋 PLANO PRONTO (Opção A)
Branch `feat/mc61-remocao-login-apple-email` (doc-only; R1: ZERO código). Deliverables:
`Desktop\MC61.txt`, `desafio-gut/docs/MC61-plan-login.txt`, esta seção.
- **Achado-chave:** "email" tem DOIS consumidores independentes. (1) modal público
  (`main.jsx:258 loginMethods:["google","email","apple"]`); (2) **login CORPORATIVO** de
  lojistas em `SejaNossoParceiro.jsx:73` via `useLoginWithEmail` (OTP headless — sendCode/
  loginWithCode). Remover "email" GLOBALMENTE (`loginMethods:["google"]`) muito provavelmente
  QUEBRA o cadastro/login corporativo → risco ALTO que o comando original não previu.
- **"apple":** config MORTA — desabilitado no painel Privy (CLAUDE.md); remover é cosmético.
- **Decisão do validador (humano, 2026-07-09) = OPÇÃO A** (preservar corporativo):
  ① `main.jsx:258` → `loginMethods:["google","email"]` (remove só "apple");
  ② `AppContext.jsx:746-768` (abrirModal, funil único do login público) → default
     `login({loginMethods:["google"]})` quando o caller não passa loginMethods → modal
     público só Google; corporativo (sendCode direto, sem abrirModal) intacto;
  ③ painel Privy: confirmar Google/Email ativos, Apple off (sem código);
  ④ testes: nenhum referencia loginMethods → sem ajuste.
- **Esforço BAIXO** (2 arquivos, ~4 linhas), **risco BAIXO-MODERADO** (reversível).
- **Verificação obrigatória no MC62 (V1):** confirmar que no Privy **v3.22** o
  `login({loginMethods})` por chamada realmente restringe o modal; senão, plano B (UI
  custom só-Google ou global só se corporativo migrar). + V2 e2e corporativo OTP.
- **Próximo:** MC62 executa a mudança após aprovação.

### MC62 — EXECUÇÃO: login público apenas Google (Opção A): ✅ código+validação; ⏸️ deploy operador
Branch `feat/mc62-execucao-login-google`. Commit de código: **1517686**. Deliverables:
`Desktop\MC62-RELATORIO.txt`, `Desktop\MC62-modal-{1440,375}.png`, `desafio-gut/docs/MC62-relatorio.txt`.
- **V1 (obrigatória) PASSOU** por typedef do Privy instalado (`react-auth/dist/dts/index.d.ts:8307`):
  `login(options.loginMethods)` "overwrite the value provided to the client config" → o
  `login({loginMethods:["google"]})` por chamada restringe o modal. Sem Plano B.
- **2 arquivos (MC61):** `main.jsx:258` `["google","email","apple"]`→`["google","email"]` (apple
  morto); `AppContext.jsx` abrirModal → `base.loginMethods=["google"]` quando o caller não define
  (overrides preservados). Corporativo `useLoginWithEmail` (SejaNossoParceiro) NÃO tocado.
- **Build vite verde** (8.88s; avisos PURE são de node_modules). **Validação MCP local**
  (localhost:3000, gate 4-checkboxes→dashboard→abrirModal): modal Privy exibe **SÓ "Google"**
  em 1440px e 375px (V3/V4); `/seja-nosso-parceiro` monta o hook de email-OTP sem erro (V2;
  envio real de OTP = operador). Console: só ruído CSP/404 pré-existente de dev.
- **Deploy em produção NÃO executado pelo agente (⏸️):** prod vivo na MAINNET + drift conhecido
  do frontend (`main.jsx:281 defaultChain: sepoliaChain`; cutover visual pendente MC56/MC59.15).
  Deploy é ação externa em prod com dinheiro real → decisão/execução do OPERADOR, garantindo
  build com env mainnet correto. Comando e validação pós-deploy no relatório (seção 6).
- **Veredito:** ✅ modal público só Google, corporativo preservado (validado local); deploy pendente.


### MC63 — PLANO: reforma visual do Glass superior (aba Lances): ✅ diagnóstico+plano
Deliverable `Desktop\MC63.txt`. Alvo = **/mercado (MercadoLances.jsx)** — NÃO o Dashboard
(o briefing citou CarrosselGUTO+logo União, que vivem no Glass do Dashboard). 3 alterações
mapeadas: (1) desabilitar overlay de vencedor no choke-point `AppContext.jsx:718`; (2) tarja
"EM BREVE" no cronômetro; (3) reforma visual (paleta oficial #ff6b35/#050818 vs COR local
#f5a623 desatualizado, sem glow neon, respiro). Achado forte = drift de paleta.

### MC64 — EXECUÇÃO: reforma visual do Glass (aba Lances): ✅ código+validação; ⏸️ deploy operador
Branch `feat/mc64-execucao-reforma-glass`. Commit **36b46c7**. Deliverables:
`Desktop\MC64-RELATORIO.txt`, `Desktop\GUTO-ANIMADO GLASS DASHBOARD\validação-mc64\mc64-{desktop-1440,mobile-375}.png`,
`desafio-gut/docs/MC64-reforma-glass.txt`. 2 arquivos:
- **AppContext.jsx:718** — comentado o único `setShowOverlay(true)` (choke-point): OverlayVencedor
  (Lances) + FimLeilaoOverlay (Dashboard) + Confetti não disparam mais; encerrado/lightning intactos.
- **MercadoLances.jsx** — (2) tarja "EM BREVE" (div absoluto navy 0.62, pointerEvents:none, número
  atrás → reversível) no anel do cronômetro; (3) COR local → tokens oficiais (#ff6b35/#ff9500/#050818),
  título sem glow neon (900→800, ls 0.06→0.04), py-2.5→py-3, AuthArea realinhada. Literais fora do
  Glass superior não tocados.
- **Build vite verde** (19.13s; OOM no heap default → NODE_OPTIONS=--max-old-space-size=8192; avisos
  PURE são de node_modules). **Validação MCP local** (localhost:3001/mercado, gate 4-checkboxes→Glass):
  tarja "EM BREVE" centrada no anel, título laranja sem glow, paleta coerente, sem overlay de vencedor,
  em 1440px e 375px. Console = só ruído CSP/404 pré-existente.
- **Deploy em produção NÃO executado pelo agente (⏸️):** prod vivo na MAINNET; deploy é ação externa/
  irreversível → operador executa com env mainnet. Comando/validação no relatório (seção Deploy).
- **Veredito:** ✅ GLASS REFORMADO — minimalista e profissional (validado local); deploy pendente.

### MC65 — PLANO: redesign completo do Glass superior (aba Lances): ✅ diagnóstico+plano
Deliverables `Desktop\MC65-PLANO-REDESIGN-GLASS.txt` + `desafio-gut/docs/MC65-redesign-glass.txt`.
Vai ALÉM do MC64 (que foi cirúrgico/pontual): reestrutura layout+componentes+estado.
- **Achados críticos** (MercadoLances.jsx pós-MC64, header 297-451): [A] `<div/>` vazio
  (:407) como espaçador de uma secção inteira só p/ o seletor; [B] seletor "Programado"
  usa `#a78bfa` ROXO (:413) fora da paleta (drift que escapou do MC64); [C] logo/timer/auth
  no mesmo nível de flex → hierarquia plana; [D] **paradoxo do cronômetro**: a tarja
  "EM BREVE" permanente MASCARA todo o timer vivo por baixo (conic-gradient, cor por
  urgência, pulso, barra) = código morto visual; [E] disclaimer legal com peso de conteúdo
  primário; [G] JSX monólito inline + cronômetro DUPLICADO no Dashboard (264-285).
- **Decisão de produto que trava a direção:** "EM BREVE" é permanente ou o timer volta a
  contar? (estados i pré-lançamento / ii ao vivo / iii encerrado).
- **3 direções:** A Editorial (grid 2col, minimalista), B Dashboard (barra + timer
  segmentado, à prova de estado), C Hero "EM BREVE" (assume coming-soon, remove timer).
- **Recomendação:** HÍBRIDO A+B (visual editorial + timer estado-aware) — resolve [A][C][D][E]
  sem apostar contra o futuro (risco da C). C só se "EM BREVE" for definitivo.
- **Arquitetura:** extrair components/glass/{GlassHeader,AuctionTimer,ModeSelector,
  AuctionStatusBar,AuthArea}.jsx; MercadoLances vira compositor fino. Execução em 2 fases
  (extração pura → redesign) p/ risco controlado. Esforço ALTO, risco MÉDIO (sem lógica nova).
- **Dashboard NÃO usa o mesmo cronômetro** (implementação própria) → refactor da aba Lances
  não o afeta. Deploy = operador (MAINNET). Execução = **MC66** após aprovação + direção travada.

**MC65 — DECISÃO TRAVADA (operador, 2026-07-09):** Direção **C (Hero "EM BREVE")** +
**"EM BREVE" é PERMANENTE**. MC66 vai REMOVER o cronômetro vivo da aba Lances (agora
código morto sob a tarja: anel/barra/derivação timerCor/timerDisplay em MercadoLances.jsx)
e entregar um HERO "EM BREVE" (selo R-1, modo, "menor lance único vence", pulsação com
prefers-reduced-motion). Corrige [A] div vazio, [B] roxo #a78bfa→token, [E] legal→rodapé.
Dashboard intocado (timer próprio). Deploy = operador (MAINNET).

### MC66 — EXECUÇÃO: redesign do Glass (Direção C — Hero EM BREVE): ✅ código+build; ⏳ MCP visual; ⏸️ deploy operador
Branch `feat/mc66-execucao-redesign-glass`. Deliverables `Desktop\MC66-RELATORIO.txt` +
`desafio-gut/docs/MC66-redesign-glass.txt`. MercadoLances.jsx: −315/+28 linhas (monólito→compositor).
- **Removido:** cronômetro vivo (anel/barra/tarja MC64 + derivações timerCor/timerDisplay/
  tempoRestanteEdicao/duracao/ratio/timerUrgente) = código morto sob EM BREVE permanente;
  imports órfãos (useAppTimer/DURACAO/edicoes/lightningActive/LABEL_LOGIN) e helpers mortos
  (saldo*Style/chipBtnStyle).
- **Criado** `frontend/src/components/glass/`: GlassHeader (compositor), ComingSoonHero
  (hero EM BREVE, pulsação c/ prefers-reduced-motion, role=status), ModeSelector (corrige
  roxo #a78bfa→tokens flash=gold/programado=primary, aria-pressed), AuctionStatusBar
  (rodapé legal), AuthArea (movido), glassTokens.js (COR compartilhado). Removido <div/>
  vazio [A]. MercadoLances renderiza só <GlassHeader/>.
- **Intocado:** overlays dormentes (anim. vencedor segue OFF do MC64), CardLance/TabelaLances,
  Dashboard (timer próprio), AppContext.
- **Build vite verde** (7.38s); 6 módulos glass transformam HTTP 200 no dev (sem erro import/JSX).
- **⏳ Validação visual MCP 375/1440 PENDENTE:** MCP de browser (chrome-devtools+claude-eyes)
  DESCONECTOU na sessão → screenshots não capturados. NÃO validado visualmente (honesto).
  Concluir quando o MCP voltar / manualmente antes do deploy.
- **⏸️ Deploy = operador** (MAINNET), após a validação visual.
- **Veredito:** ✅ Hero EM BREVE implementado e verificado por build+runtime; ⏳ falta o MCP visual.

### MC67 — EXECUÇÃO: refinamentos frontend (11 itens): ✅ código+build; ⏳ MCP visual; ⏸️ deploy operador
Branch `feat/mc67-execucao-refinamentos`. Commit **a6db336**. Deliverables `Desktop\MC67-RELATORIO.txt`
+ `docs/MC67-refinamentos.txt`. 20 arquivos + novo `src/lib/leilaoLock.js`.
- [1] MinhaCarteira cabeçalho→GlassCard. [2/3] remove GutoAvatar (Vitrine/Parceiro). [4] "Beta" removido
  (7 telas, sweep=0). [5] jargão técnico (Stack/Sepolia em Configuracoes, cripto em CardLance/TabelaLances,
  §spec na Vitrine, (MC3) em PainelIndicacao). [6] Vitrine topo em Glass + on-palette. [7] ScheduleView
  Junho/2026 SUBSTITUÍDA por "EM BREVE" (grade removida; dados programacao-junho-2026.js preservados p/ Vitrine).
  [8] card "Segurança e Transparência" movido MercadoLances→Configuracoes (jargão cripto→copy de confiança).
  [9] cronômetros travados via `lib/leilaoLock.js` (EM_BREVE_MODE flag) em Dashboard/EdicaoCard/EdicaoDetalhe/
  Vitrine (Lances já Hero; ScheduleView substituída) — trava de apresentação, não mexe contagem.
  [10] nome→"DesafioGUT" (ChatbotWidget/GutoAvatar alt/SejaNossoParceiro); ⛔ DESAFIOGUT-AUTH/ADMIN (3) e URLs
  INTACTOS. [11] Privy logo same-origin (/assets/logos/v2/gut-logo-icon-v2.png) + favicon index.html +
  accentColor #00d4aa→#ff6b35.
- **Build vite verde** (55s, 3590 módulos); 12 módulos transformam 200 no dev. Sweep: Beta=0, auth const=3 intactas.
- **⏳ Validação visual MCP 375/1440 PENDENTE** (chrome-devtools+claude-eyes desconectados). **⏸️ Deploy=operador (MAINNET).**
- **Veredito:** ✅ 11 refinamentos executados e verificados por build+runtime; falta o MCP visual.

## MC69 — Artes promocionais oficiais (3 variações com GUTO) — 2026-07-10
- MC de ATIVOS (zero código). Método: Opção B (Cloud Comfy puro), Nano Banana Pro (gemini-3-pro-image-preview), 9:16 2K.
- 3 variações 1080×1920 em `Desktop\ARTES-PROMOCIONAIS\variação-{1,2,3}-final.png`:
  - V1 comprador (troféu+moedas), V2 lojista (placa "ANUNCIE AQUI"+vitrine), V3 ambos (balões COMPRAR/ANUNCIAR).
- Identidade do GUTO ancorada pela MESMA referência (base/guto-ref.png ← 02-guto-geladeira) nas 3 → mesmo personagem ✅.
- Correção: enunciado dizia "porco"; GUTO é mascote HUMANO 3D — prompts corrigidos.
- Termos obrigatórios ("leilão de menor lance único" + "e-commerce por dropshipping") e martelo presentes nas 3; sem jargão técnico.
- Texto PT-BR com acentos correto nas finais (v2 regenerada 1x no boulder loop; v2-tentativa-2 descartada).
- Relatório: `Desktop\MC69-RELATORIO.txt` e `desafio-gut/docs/MC69-artes-promocionais.txt`.
- ⚠️ Artes aguardam APROVAÇÃO do operador antes de qualquer uso em produção (SUPERPERS/RUFLO).

## MC69.1 — Correção/elevação das artes promocionais (V2) — 2026-07-10
- MC de ATIVOS (zero código). Reversão do MC69 com 3 melhorias: cenário REAL do app + vibrante + consistência via dupla ref.
- Método: Cloud Comfy + Nano Banana Pro (gemini-3-pro-image-preview), DUPLA referência via ImageBatch (GUTO `ce8b646c` + cenário real `6ca8d340` = background-mobile.webp), 9:16 2K.
- 3 finais 1080×1920 em `Desktop\ARTES-PROMOCIONAIS-V2\variação-{1,2,3}-final.png` (palco navy real + holofotes/confete/eletrodomésticos; V1 troféu, V2 ANUNCIE AQUI+storefront, V3 balões COMPRAR/ANUNCIAR).
- Skills ECC do enunciado: só `fal-ai-media` existe; demais (nano-banana/space-GPT-image2-design/token-aware-image/claude-art-skill/@aeriox-co) NÃO instaladas — capacidade entregue pelo pipeline validado, sem invocar skills inexistentes.
- "Porco" do enunciado = alucinação confirmada pelo operador; GUTO é humano.
- Termos obrigatórios + martelo nas 3; acentos corretos; sem jargão; boulder loop 0.
- Relatório `Desktop\MC69.1-RELATORIO.txt` + `desafio-gut/docs/MC69.1-artes-promocionais-v2.txt`.
- ⚠️ Aguardam APROVAÇÃO do operador antes do uso (SUPERPERS/RUFLO). Segmento 3 (animação) não executado.

## MC69.5 — Correção pontual de texto na arte oficial (V2) — 2026-07-10
- MC de ATIVOS (zero código). Edição LOCALIZADA de UMA linha via Cloud Comfy image-to-image (NÃO text2img).
- Troca na tarja laranja inferior: "BAIXE o app DesafioGUT - cadastre-se, compre senhas e participe." → "Em breve na Playstore e Applestore."
- Método: LoadImage → GeminiImage2Node (Nano Banana Pro, gemini-3-pro-image-preview, auto/2K/IMAGE, seed 695) → SaveImage; prompt_id 4c6a422e; boulder loop 0.
- Fonte real na pasta é `versao2-final.png` (enunciado dizia "imagem versao2-final.png"); backup em `versao2-final-backup.png`.
- Saída: `Desktop\ARTES-PROMOCIONAIS-V2\versao 1 2 e 3\Nova pasta\imagem versao2-final-corrigida.png`.
- Certificação APROVADA (agente): GUTO/fundo/cores/composição/telefone/ANUNCIE AQUI/demais textos preservados; só a tarja alvo mudou. Ressalva: image-to-image re-renderiza o raster (visualmente fiel, não pixel-idêntico).
- Relatório `Desktop\MC69.5-RELATORIO.txt` + `desafio-gut/docs/MC69.5-correcao-texto.txt`.
- ⚠️ Aprovação FINAL de produção é do OPERADOR (RUFLO Pilar 3).

## MC69.5 (bis) — Levantamento do domínio e status para e-mail (Resend) — 2026-07-10
- MC de DIAGNÓSTICO (zero código/DNS). Levantamento nos arquivos + verificação ao vivo read-only na Netlify.
- Domínio pretendido: `desafiogut.com.br` (citado em regulamento/incident-response/disaster-recovery/ia-cognitiva como suporte@ e em cloudflare-waf-setup.md como zona-alvo). REGISTRAR **não documentado** (só exemplos genéricos); COMPRA **não comprovada** nos arquivos → confirmar com operador.
- Status ao vivo: site Netlify `silly-stardust-ca71bc` com custom_domain=None, domain_aliases=[], getDnsZones=[], getDNSForSite=[] → domínio NÃO vinculado, sem DNS gerenciado. Cloudflare WAF (MC4/MC6) é só PLANO (checklist 100% desmarcado).
- Resend: **zero integração** (nenhuma API key/remetente/código). SPF/DKIM/DMARC/MX: nenhum. E-mail atual = Privy SMTP (login/OTP).
- Conclusão: config de e-mail por domínio próprio = 0% iniciada; bloqueante nº1 = operador confirmar compra+registrar e liberar painel DNS. Plano Resend (6 passos) e próximos passos no relatório.
- Relatório `Desktop\MC69.5-DOMINIO-STATUS.txt` + `desafio-gut/docs/MC69.5-dominio-status.txt`. Execução = MC69.6.

## Exclusão de Conta (Play Store) — MC72 (2026-07-11)
> Branch `feat/mc72-delete-account` (de `main`). Novos: `netlify/functions/delete-account.mjs`,
> `netlify/functions/_lib/conta-delete.mjs`, `src/components/ExcluirContaModal.jsx`,
> `src/pages/ExcluirConta.jsx`. Modificados: `src/pages/Configuracoes.jsx`, `src/App.jsx`,
> `src/widgets/layout/Layout.jsx`.

**O quê:** funcionalidade de exclusão de conta exigida pela política "Exclusão de conta e
dados" da Google Play Store. In-app (Configurações → "Excluir conta" → modal com checkbox
irreversível) e web pública (`/excluir-conta`, link no rodapé) para solicitar fora do app.

**Arquitetura real (corrige premissa do plano):** auth é Privy + JWT próprio do app
(user-session), identidade = endereço da carteira; NÃO há Supabase `auth.users`. Dados
espalhados em Netlify Blobs + Supabase.

**Estratégia de dados:** (1) HARD-DELETE dos pessoais — Supabase (saldo_rs, troco_senhas,
wallet, lances, lojistas, cotas) + Blobs (saldo-rs, wallet, cotas, renovacao-adesao,
voucher, consent-log, lance-idem). (2) ANONIMIZAR + RETER os fiscais (saldo_rs_creditos/
debitos + Blobs pedidos/pedidos-pagos/pedidos-meta) por obrigação fiscal BR — endereço→
token, chaves PII removidas, valor/data preservados. (3) ON-CHAIN declarado como retido
(imutável). Sem PRIVY_APP_SECRET, exclusão da identidade Privy fica p/ follow-up MC72.1.

**Segurança:** guard owner-ou-admin (anti-IDOR, espelha exportar-dados), rate-limit 3/janela,
endereço validado (0x+40hex → filtro PostgREST `.or()` não injetável), service-role só
backend, modo `dryRun` para o operador simular antes da execução real.

**Validação:** 14 testes novos (6 lib + 8 auth); suíte functions 146/146 (baseline 132),
0 regressão (flag `--experimental-test-module-mocks`); `npm run build` verde; smoke visual
de `/excluir-conta` OK (render standalone fora do gate LGPD; ruído de CSP pré-existente).

**Pendente do operador (Segmento 5):** merge do PR, dry-run em prod, deploy, teste ao vivo
e marcar o formulário "Segurança dos dados" da Play Store com a URL
`https://silly-stardust-ca71bc.netlify.app/excluir-conta`. Relatório: `Desktop\MC72-RELATORIO.txt`
e `desafio-gut/docs/MC72-delete-account.txt`.

## Correção de Deploy — MC73 (2026-07-11)
> Branch de release `feat/mc73-correcao-deploy` (de `feat/mc69.5-dominio-status`).
> DIAGNÓSTICO + CONSOLIDAÇÃO (deploy vivo = operador; deploy é manual).

**Diagnóstico (refuta a premissa):** a produção NÃO roda uma `main` antiga — roda a
linhagem MAINNET (MC60). Evidência: health de prod com `SIGNER_BACKEND=local-key` +
`CHAVE_BRUTA_EM_MAINNET=ALERT` (mainnet). `origin/main` está em d42b4ae (mc56) e NÃO
contém MC57–MC60; a produção está À FRENTE da main (linhagem `feat/mc60-marco-mainnet`,
01f6889, nunca mesclada). MC67 e MC69 nascem sobre a mainnet (base 01f6889); a branch
mais nova `feat/mc69.5-dominio-status` já os contém. **MC72 estava na base ERRADA**
(main mc56, sem mainnet) → deploy direto REGREDIRIA a produção. **MC68 não existe.**

**Perigo evitado:** as duas opções do plano original (merge na main + deploy main; ou
deploy de feat/mc72) derrubariam a produção da mainnet (contrato/RPC/coordenação de
mc56). Não executadas.

**Correção:** `feat/mc73-correcao-deploy` criada de `feat/mc69.5-dominio-status`
(=mainnet+MC67+MC69) + cherry-pick dos 5 commits do MC72. Conflito só em cloud.md
(resolvido mantendo mainnet + bloco MC72). Resultado = MAINNET(MC60)+MC67+MC69+MC72.

**Validação:** contém mc59.15 + mc60 marco; arquivos MC72 presentes; `npm run build`
verde; suíte functions 182/182 (inclui 14 do MC72), 0 falhas. Deploy ao vivo = operador
(`netlify deploy --prod` a partir da branch).

**Root cause:** produção publicada manualmente de branches feature (MC57–60) que nunca
voltaram para `main` → `main` drifta da produção e cada MC herda base errada. Recomendado
reconciliar `main` com a produção (MC próprio) e/ou adotar CI/CD. Relatório:
`Desktop\MC73-RELATORIO.txt` + `desafio-gut/docs/MC73-correcao-deploy.txt`.

## Screenshots Play Store — Devices fotorrealistas via OpenAI — MC80.4.1 (2026-07-19)
> Continuação do MC80.3 (que NÃO conseguiu devices fotorrealistas: geração OSS no
> Comfy Cloud falhou por falta de subscription). Aqui o caminho que FUNCIONOU: OpenAI
> `gpt-image-1`. Custo autorizado ~US$0,08 (2 imagens medium). Assets/finais ficam em
> `Desktop/playstore-screenshots/Nova pasta/` — FORA do repo, nunca commitados.

**Geração:** `gerar_assets.py` → `gpt-image-1` (1024², medium, `background=transparent`)
produziu `assets/tv_generated.png` + `assets/iphone17_generated.png` com **canal alfa
real** (cantos alfa=0; recorte quase binário). Chave só no ambiente (o agente nunca a
manuseia). DALL·E 3 não tem transparência — por isso `gpt-image-1`.

**Composição:** `compor_finais.py` reusa as finais existentes (cronômetros/dados já em
PIL nítido) e troca **só a região do ícone**: pedestal navy OPACO + gradiente + borda
laranja (mascara o vetorial antigo) → device fotorrealista + glow + sombra + reflexo.
Fonte limpa em `_orig_vectorial/` → recomposição idempotente. Posições: imagem_1 topo =
iPhone (02:30), imagem_1 baixo = TV (01:15), imagem_4 = TV (AO VIVO 00:45).

**Boulder Loop (2 it.):** it.1 pedestal a 93% deixava o ícone antigo vazar ("R-1",
"DESAFIOGUT"); it.2 pedestal opaco + TV inferior alargada → limpo. APROVADO.

**Entrega:** `finais/imagem_{1,4}_final.png` (com devices fotorrealistas); imagens 2 e 3
intactas do MC80.3. Próximo passo: emoldurar em 1080×1920 e subir à Play Store (operador).
Relatório: `Desktop\MC80.4.1-RELATORIO.txt` + `desafio-gut/docs/MC80.4.1-openai-assets.txt`.

**Lição:** device fotorrealista com fundo transparente = `gpt-image-1` (barato, alfa
real); texto/dados de UI = sempre PIL. Comfy Cloud OSS precisava de subscription (MC80.3).

## Screenshots Play Store — Emolduramento 1080×1920 — MC80.4.1.1 (2026-07-19)
> Fecha o ciclo MC80.4.x: pega as finais suaves (MC80.4.1) e entrega as ARTES finais
> prontas p/ a ficha da Play Store. **100% PIL local, custo US$0** (sem APIs). Artes
> ficam em `Desktop/playstore-screenshots/` — FORA do repo, nunca commitadas.

**editadas/** = cópia das finais já validadas (MC80.4.1) — são as versões "suaves"
(sombra/glow/reflexo, cards integrados, texto PIL nítido). Nenhuma reedição destrutiva.

**Emolduramento (`emoldurar.py` → artes/arte_{1..4}.png, 1080×1920):** canvas navy
gradiente + glow laranja radial; device frame (corpo arredondado + notch + sombra
GaussianBlur, tela com cantos arredondados); faixa inferior de legenda (navy 90% +
borda laranja, Segoe UI Bold 46px laranja `#ff6b35`); rosto do GUTO (`guto-login.png`)
150² a 85% no canto inf.-dir.; wordmark "DesafioGUT" no topo. Boulder Loop 2 it.
(ajuste de telefone maior + legenda reposicionada p/ equilíbrio vertical). APROVADO.

**Legendas:** 1="Participe de leilões com lances únicos" · 2="Ganhe prêmios incríveis
com o menor lance" · 3="Acompanhe seus lances e ativos em tempo real" · 4="Edições ao
vivo com cronômetro e vencedor". Cópia p/ upload em `playstore-screenshots/artes-prontas/`
+ `legendas.txt`. Nota: imagem 3 mantém Menor Lance **R$5,00** (bate com a tabela) e não
o "R$0,15" citado no plano, p/ não contradizer a própria imagem (R4 — dados fictícios).

**Próximo passo:** operador sobe as 4 artes na Play Store (ordem sugerida 1→4→3→2).
Relatório: `Desktop\MC80.4.1.1-RELATORIO.txt` + `desafio-gut/docs/MC80.4.1.1-artes-final.txt`.

## Ícone oficial Play Store + adaptável Android — MC80.5 (2026-07-19)
> Cabeça do GUTO (`Desktop/GUTO/EXPRESSÕES/1.png`, 2059×1321 RGBA transparente) sobre
> navy. **100% PIL, custo US$0.** Ícones ficam em `Desktop/playstore-screenshots/icone/`
> — FORA do repo, nunca commitados.

**Método — PIL, não ComfyUI generativo (decisão consciente):** o plano pedia ComfyUI,
mas (1) `comfyui-cloud` é cloud PAGO → gerar consome créditos e VIOLA R2 (custo zero);
o MC80.3 já documentou que a execução no Comfy Cloud FALHA nesta conta (sem subscription);
(2) ícone é composição DETERMINÍSTICA — generativo REGENERARIA outro rosto (quebra a
identidade do GUTO). PIL preserva identidade, é pixel-preciso e grátis. Refazível via
nós de composição (não-generativos) do ComfyUI se o operador autorizar créditos.

**Entrega (`icone.py`):** `icone_playstore.png` 512 (navy gradiente + glow laranja sutil
+ cabeça 282×360 centralizada + sombra) · `icone_adaptavel_background.png` 512 (navy,
bleed) · `icone_adaptavel_foreground.png` 512 RGBA (cabeça transparente) · `icone_round.png`
192 (círculo). Cabeça ~70% do canvas, dentro da safe-zone (~66%) → sem clipping em
círculo E squircle (validado em 512/96/48 sobre fundo claro e cinza). Boulder Loop 2 it.
(cabeça 330→360 + glow mais presente p/ legibilidade a 48px). Paleta navy `#050818` +
laranja `#ff6b35`. Sem texto/bordas. `especificacoes.txt` no diretório.

**Próximo passo:** operador sobe o ícone 512 na Play Store e empacota o adaptável
(mipmap-anydpi-v26). Relatório: `Desktop\MC80.5-RELATORIO.txt` + `desafio-gut/docs/MC80.5-icone.txt`.

## Build do AAB assinado (Capacitor) — MC81 (2026-07-19)
> App Bundle Android assinado, pronto p/ Play Store. **Custo US$0** (local). Keystore,
> AAB e scaffolding do Capacitor ficam FORA do git (protegidos no `.gitignore`).

**Setup:** Capacitor 8.4.2 (`@capacitor/core|cli|android`) em `desafio-gut/frontend`;
`cap init "DesafioGUT" "com.desafiogut.app" --web-dir dist`; `cap add android` + `sync`
→ pasta `android/` (WebView wrapper do build Vite `dist/`). versionCode 1, versionName 1.0.0.

**Assinatura:** keystore RSA-2048 (`keystore/desafiogut.keystore`, alias `desafiogut`,
validade 10000d) gerada via keytool não-interativo; senha em `keystore/credenciais.txt`
(⚠️ NÃO commitado). `android/app/build.gradle` lê `keystore.properties` (sem hardcode)
e assina o `release`. **Guardar keystore+senha em backup** (perda = não atualiza o app).

**Build (armadilhas resolvidas — Boulder Loop):** (1) `local.properties` precisa de
barras normais (barra invertida = escape inválido em .properties); (2) **Capacitor 8
exige Java 21** → usar o JBR do Android Studio como JAVA_HOME (o JDK 17 dá "invalid
source release: 21"); (3) máquina com pouca RAM (commit do Windows ~96%, ~240MB livres)
→ JVM crashava por OOM nativo; solução = `gradle.properties` de baixo footprint
(`-Xmx512m -XX:+UseSerialGC`, sem daemon/paralelismo) + pular lint
(`-x lintVitalRelease -x lintVitalAnalyzeRelease`, não afeta o AAB). `gradlew bundleRelease`
→ BUILD SUCCESSFUL.

**Entrega/validação:** `builds/DesafioGUT-v1.0.0.aab` (34.344.316 bytes; jarsigner
"jar verified"; SHA-256 dd167d02…dc405) + `builds/build-info.txt`. SDK usado:
`%LOCALAPPDATA%/Android/Sdk` (android-34, build-tools 34.0.0). Só docs commitados
(scaffolding android/ + package.json ficam locais — R1). Relatório:
`Desktop\MC81-RELATORIO.txt` + `desafio-gut/docs/MC81-build.txt`.

**Próximo passo:** operador testa o AAB e sobe na Play Console após verificação de
identidade; buildar via CI/máquina com mais RAM no futuro.

---

## MC82 — Diagnóstico de performance do app Android (WebView)

**Data:** 2026-07-20 · **Natureza:** DIAGNÓSTICO + PLANO. Zero alteração de código.
**Custo:** US$ 0,00 (R2 — só ferramentas locais).

**⚠️ CORREÇÃO DE ROTA:** o MC82 foi reexecutado como diagnóstico+plano, sem
alterações de código. As otimizações A1, A2 e A5 chegaram a ser aplicadas numa
primeira passagem, foram REVERTIDAS (`git checkout HEAD`), e serão aplicadas no
MC83 com validação em dispositivo real. Estado restaurado e conferido: dist/ e
assets do APK em 35 MB / 21 webm; working tree dos ficheiros de código limpo.

**Três premissas do plano refutadas por evidência:** (1) `android:hardwareAccelerated`
está ausente do Manifest mas o seu **default é TRUE** desde a API 14 para targetSdk>=14
(android-34) → aceleração JÁ ATIVA, a ação "PRIORIDADE ALTA nº1" era no-op;
(2) `capacitor.plugins.json` = `[]` e zero imports de `@capacitor` em `src/` → não há
plugins para lazy-load nem bridge calls para agrupar; (3) não há canvas no render e o
único listener de scroll (`AppContext.jsx:228`) já é `{passive:true}`. **O app é um
WebView puro a servir um SPA React local — todo o gargalo é web, nenhum é nativo.**

**Gargalos reais (medidos):**
- **G1** `BackgroundCanvas` monta os DOIS `<video>` e esconde um com `opacity:0`, que
  não impede decode. Em viewport mobile o vídeo **1920×1288 invisível decodificou 335
  frames** contra 341 do visível — um decoder Full-HD gasto em todas as rotas.
- **G2** `PrivyProvider` (import estático, main.jsx:5) envolve o gate LGPD →
  **4.003 KB de JS** para desenhar 4 checkboxes que não usam Privy. LCP 3.091 ms @CPU 4×
  com TTFB de 6 ms ⇒ ~100% CPU de JS, não rede. Caminho crítico 1.139 KB gz vs alvo 500 KB.
- **G3** Dashboard monta `2 (fundo) + 2 (carrossel) + 1 (sprite) + N (1 por EdicaoCard)`
  `<video>`. ffprobe confirma **`alpha_mode=1`** ⇒ dois streams VP9 por vídeo, e o plano
  alfa **não tem caminho de hardware no Android** → software (libvpx) na CPU. Com 3
  edições: ~14 streams VP9, ~6 por software. Candidato nº1 ao jank de scroll.
- **G4** Sentry Session Replay ATIVO em produção (DSN no bundle + rrweb): MutationObserver
  a serializar o DOM na main thread. ⚠️ **R4**: `maskAllText:false` gravava texto do ecrã
  sem máscara num app com saldos e valores de lance.
- **G5** `backdrop-filter blur(24px)` sobre fundo em vídeo → re-blur 24×/s por painel
  mesmo com a página parada (INFERIDO, não medido).
- **G6** 35 MB no APK, incluindo **8 loops de fundo órfãos** (v1/v2/v4/v5, ~2,9 MB) que
  nenhum código referencia — resíduo do MC26.1.

**Limitação declarada:** `adb devices` vazio + build release sem
`webContentsDebuggingEnabled` ⇒ chrome://inspect impossível, **nenhuma métrica de FPS/TTI
no aparelho foi coletada**. Medições feitas por proxy (mesmo dist/ em localhost + CDP),
que mede main thread com fidelidade mas é **cego ao decode de vídeo e ao compositor**.

**Plano para o MC83** (detalhe em `Desktop\MC82-PLANO-ACAO.txt`), ordem por impacto:
`A0` build debug inspecionável + telemóvel ligado (PRÉ-REQUISITO) → `A3` lazy do Privy
(alvo LCP < 1.500 ms) → `A4` IntersectionObserver a pausar vídeos fora do viewport
(alvo ≤3 vídeos a tocar) → `A1` montar só o vídeo da largura atual → `A2` Replay
mascarado e só-em-erro → `A5` remover webm órfãos → `A6` custo do glass (só após medir).

**Relatórios:** `Desktop\MC82-RELATORIO.txt` + `desafio-gut/docs/MC82-performance.txt`
(+ apoio: `MC82-DIAGNOSTICO.txt`, `MC82-GARGALOS.txt`, `MC82-PLANO-ACAO.txt`).

**Próximo passo:** operador liga o telemóvel (Depuração USB) e gera `assembleDebug`;
MC83 executa A1–A6 uma de cada vez, medindo antes/depois no aparelho.

---

## MC83 — Relatório dos disparos (e-mail + WhatsApp)

**Data:** 2026-07-20 · **Natureza:** LEITURA E CONSOLIDAÇÃO. Zero alteração de código.
**Custo:** US$ 0,00 (R2 — só leitura via MCP PythonAnywhere).

**Status geral:** automação ESTÁVEL. Cron 1465157 (diário 15:00 UTC = 11:00 Manaus,
`enabled:true`, sem expiração) com **5/5 execuções `return code 0`** entre 17 e 20/07 —
zero falhas de execução.

**Progresso:**
- **E-mail:** checkpoint **400 / 1623 (24,6%)**, 100/dia, 0 erros nos dias auditáveis
  (19 e 20/07). Previsão de conclusão **~02/08/2026** (1223 restantes).
- **WhatsApp:** **198 / 198 = 100% CONCLUÍDO** (terminou em/antes de 18/07). Desde então
  o script roda e envia 0 ("Enviando 0 mensagens (do 199 ao 198)") — inócuo, sem custo.

**Anomalias do MC76 — atualização:**
- **A4.1** logs sem contagem → ✅ **RESOLVIDA** (orquestrador novo captura STDOUT completo
  desde 18/07). Resíduo: dias 16-17/07 sem contagem, buraco de auditoria irrecuperável.
- **A4.2** checkpoint por tentados → ❌ **PERSISTE (CRÍTICA)**. Confirmado no código dos
  DOIS scripts: `f.write(str(inicio + len(lote)))` usa TENTADOS, não `enviados`. Falhas
  são perdidas silenciosamente e nunca retentadas. Agravante: `ultimo_enviado.txt` conta
  tentativas e `enviados_hoje.txt` conta sucessos — divergem se houver erro.
- **A4.3** histórico não durável → ⚠️ PARCIAL (logs persistem; só 1 resumo, e com
  denominador errado "198/200").
- **A4.4** segredos em texto plano → ❌ PERSISTE (configs JSON + cópias `.bak`; conteúdo
  NÃO aberto pelo agente, R5).
- **A4.5** WhatsApp sandbox → ❓ NÃO VERIFICADO (exigiria ler credenciais Twilio, R5).
- **A4.6** arquivos legados → ❌ PERSISTE e **agravado**: `checkpoint_twilio_corrigido.txt`
  contém **360**, maior que a lista inteira (198) — checkpoint órfão divergente.
- **A4.7** WhatsApp no-op → ✅ CONFIRMADO, a lista está 100% enviada.

**Anomalias NOVAS:**
- **N1 (ALTO, maior risco do relatório)** — qualidade da lista de e-mail: o lote 301-400 é
  dominado por endereços com forte aparência de inválidos/sintéticos. Hard bounces em massa
  degradam a reputação do remetente e podem **suspender a conta SendGrid**, matando os 1223
  registos ainda por enviar.
- **N2 (MÉDIO)** — `202 aceite` é tratado como "entregue". Sem Event Webhook, a **taxa de
  entrega real é desconhecida**: "400 enviados" é na verdade "400 aceites pela API".
- **N3 (BAIXO)** — rótulo "Total acumulado" mostra o total do DIA, não o acumulado (logs de
  19-20/07 dizem "100" quando o real era 300 e 400).
- **N4 (BAIXO)** — scripts usam caminhos relativos; execução manual de outro diretório pode
  criar checkpoint 0 e **reenviar tudo**.

**Ação imediata do operador:** verificar no painel SendGrid a taxa de bounce dos 400 já
enviados — é o dado que decide se a campanha continua ou pausa (N1). Cron: não mexer.

**Relatórios:** `Desktop\MC83-RELATORIO.txt` + `desafio-gut/docs/MC83-disparos.txt`.

**Pendências → MC84:** corrigir avanço de checkpoint por sucessos + fila de retentativa
(A4.2); sanear os 1223 e-mails restantes (N1); Event Webhook SendGrid (N2); resumo
estruturado por execução (A4.3/N3); limpeza de legados (A4.6); segredos para env vars (A4.4).

⚠️ **Numeração:** o MC82 designou "MC83" para executar as otimizações do app Android
(A1-A6). Este MC83 tratou dos disparos. **A execução das otimizações do app segue PENDENTE**
e precisa de número próprio (sugestão: MC85).

---

## MC82.1 — Correção do gargalo de glass (backdrop-filter)

**Data:** 2026-07-21 · **Custo:** US$ 0,00 · Validado no dispositivo real.

**Resultado: 17,5 → 59,6 fps (+42,1 fps, +241%)** no Dashboard em repouso, mesmo
aparelho e cenário do baseline MC82 (Redmi 21091116UG, Android 13, WebView Chrome 150).
Alvo do MC (≥45 fps) atingido com folga. Frames acima de 32 ms: 97,7% → 0,3%.

**⚠️ A correção prevista no plano FALHOU.** A Opção B (blur 24px → 8px) foi aplicada,
buildada, instalada e medida: **20,7 fps** — apenas +3,2 sobre o baseline. Em vez de
tentar blur(4px) às cegas, levantei a curva completa em runtime no aparelho (CSS
injetado via CDP, sem rebuild):

| camadas · filtro | fps |
|---|---|
| 11 · blur 24px | 17,5 (baseline) |
| 11 · blur 8px | 19,8 |
| 11 · blur 4px | 23,1 |
| **11 · blur 0px (filtro ainda declarado)** | **31,2** ← raio ZERO |
| 1 · blur 8px (gate LGPD) | 59,8 |
| 0 · fundo sólido 0.88 | 60,2 |

**★ Lição:** o custo do `backdrop-filter` vem do **NÚMERO DE CAMADAS**, não do raio —
cada elemento com a propriedade força um read-back do backdrop na GPU. Baixar 24→8px
rendeu +2 fps; remover as camadas rendeu +40. Isso também explica por que o gate LGPD
já rodava a 59,8 fps *com* blur: tem 1 camada, não 11. A Opção C do plano (congelar o
fundo) também foi medida e também falha: **29,5 fps**. Nenhuma saída prevista no plano
atingiria o alvo.

**Solução (commit 936b724):** `.gut-glass-standard` sem `backdrop-filter`, com navy
0.25 → **0.88** assumindo a separação; sheet do BottomNav no mesmo padrão;
`AtmosphereFilter` emite `none` em vez de `blur(0px)` em repouso (é `fixed inset-0`,
100% do ecrã — com raio zero ainda mantinha uma camada de backdrop de tela cheia).
Uma versão híbrida (vidro real só no painel hero) deu 56,2 fps e funcionava, mas o
operador preferiu o **tom navy uniforme** em todo o app — que ainda melhora o número.

**Não alterados** (fora do cenário medido, ficam para um MC de coerência visual):
TabelaLances (20px), SejaNossoParceiro (16px), LanceStatusBadge, Toast.

**Método:** medição por CDP direto no WebView via `adb forward` (o MCP chrome-devtools
não anexa a alvo remoto). Uma primeira leitura deu 46,9 fps com uma amostra em 35,1;
repetida com 8 amostras estabilizou em ~56-60 — as primeiras apanhavam o arranque do
app. O número reportado é o de regime estacionário. Evidência visual em
`Desktop\MC82.1-shots\` (5 variantes capturadas no aparelho).

**Relatórios:** `Desktop\MC82.1-RELATORIO.txt` + `desafio-gut/docs/MC82.1-performance.txt`.

**Pendências (MC seguinte):** o gargalo de ARRANQUE continua intacto — A3 (Privy fora do
caminho crítico: 4.002 KB de JS antes do gate, LCP 2.220 ms) é a maior; A1 (vídeo
invisível 1920×1288 ainda decodifica ~460 frames/6s), A4 (vídeos fora do viewport),
A2 (Sentry Replay, confirmado ativo no aparelho pelo `processMutation` no perfil de CPU).
⚠️ O APK atual é DEBUG — a Play Store exige `assembleRelease` assinado.

**REGRA DE OURO:** `backdrop-filter` cobra por CAMADA, não por raio. Orçamento medido
neste aparelho: 1 camada ≈ 1-7 fps · 11 camadas ≈ 40 fps. NÃO reintroduzir
`backdrop-filter` no `.gut-glass-standard` sem medir no aparelho.

---

## MC82.2 — Privy fora do caminho crítico + correção do chunking do React

**Data:** 2026-07-21 · **Custo:** US$ 0,00 · Validado no dispositivo real.

**Ambos os alvos atingidos com folga** (gate LGPD, Redmi 21091116UG, Android 13):

| | baseline (MC82) | MC82.2 | alvo |
|---|---|---|---|
| **JS no arranque** | 4.002 KB | **617 KB** (−85%) | < 1.300 ✅ |
| **LCP** | 2.220 ms | **980 ms** (−56%) | < 1.500 ✅ |
| FCP | 1.292 ms | 556 ms (−57%) | — |
| TTI (aprox) | 1.727 ms | 556 ms | — |
| domInteractive | 557 ms | 180 ms | — |
| Heap JS | 16 MB | 9,5 MB | — |

**⚠️ O lazy-load do Privy SOZINHO não daria ganho nenhum.** Duas descobertas por medição:

1. **`AppContext.jsx` importa `@privy-io` estaticamente** e `App.jsx` importa o `AppProvider` —
   o chunk vinha na mesma por esse caminho. Por isso o `PrivyRoot` carrega o `<App/>` **inteiro**,
   e o gate LGPD saiu do `App.jsx` para um `Boot.jsx` leve.

2. **★ BUG DE CHUNKING PRÉ-EXISTENTE:** o `react-*.js` tinha **0,2 KB** — era só um shim
   (`import{cn}from"./privy-*.js"`). O **React inteiro estava dentro do chunk `privy`**, logo
   qualquer ecrã tinha de baixar 2.745 KB só para ter React. Causa: o `manualChunks` era
   **silenciosamente ignorado pelo Rolldown** (bundler do Vite 8) — a função devolvia "react"
   para react/react-dom (verificado por log) e o Rolldown não obedecia. Corrigido migrando para
   **`advancedChunks`** (API nativa do Rolldown).

**⚠️ A ordem dos grupos importa:** com `privy` antes de `motion`, o framer-motion (usado pelo gate)
importava utilitários partilhados do chunk do Privy e **arrastava os 2.618 KB de volta ao arranque**.
`motion` tem de vir ANTES. Um grupo `vendor` catch-all foi testado e **piorou** (arranque 5.117 KB) — revertido.

**Ficheiros (commit c03f6cd):** novos `src/Boot.jsx` e `src/PrivyRoot.jsx`; `main.jsx` (−187 linhas,
já não importa privy/viem/App); `App.jsx` (gate removido); `vite.config.js` (`advancedChunks`).
⚠️ O `vite.config.js` **não constava do escopo aprovado**, mas sem ele o objetivo era inatingível.

**Também removido:** um prefetch em `requestIdleCallback` que eu próprio pusera — `import()` não
só descarrega, **avalia**: os 2,6 MB voltavam a ser parseados logo após o gate (17 chunks, medido).

**Validação:** gate renderiza sem Privy (617 KB, 6 chunks); 4 checkboxes → aceitar → chunk carrega,
app monta (5 vídeos, Dashboard), consentimento persiste. **FPS do MC82.1 sem regressão: 59,3** (era 59,6).
Erros de consola no preview (WalletConnect/CSP, 404 das functions) são pré-existentes do ambiente local.

**Composição dos 617 KB restantes:** sentry 257,8 · react 136,6 · motion 125,7 · index 55,0 · router 41,0.
O **Sentry é agora o maior item do arranque** — candidato natural ao próximo lazy-load.

**Relatórios:** `Desktop\MC82.2-RELATORIO.txt` + `desafio-gut/docs/MC82.2-arranque.txt`.

**Pendências:** A1 (vídeo invisível ainda decodifica ~460 frames/6s), A4 (vídeos fora do viewport),
A2 (Sentry Replay + lazy do chunk sentry), A6 (glass restante). ⚠️ APK é DEBUG — Play Store exige
`assembleRelease`. ⚠️ **O login real (OAuth Google) não foi exercitado ponta-a-ponta** — validou-se
que o chunk carrega e o provider monta; recomenda-se um login manual antes de publicar.

**Lições:** (1) em Vite 8/Rolldown, `manualChunks` pode ser ignorado — um chunk `react` de 0,2 KB é
o sintoma; usar `advancedChunks`. (2) A ordem dos grupos é significativa. (3) `import()` para prefetch
também avalia; para só baixar, `<link rel="prefetch">`. (4) Lazy-load só funciona se TODO o caminho
estático for cortado — um único import (AppContext → @privy-io) anula o esforço.

---

## MC82.3 — Sentry fora do caminho crítico de arranque

**Data:** 2026-07-21 · **Custo:** US$ 0,00 · Validado no dispositivo real.

**Ambos os alvos atingidos** (gate LGPD, Redmi 21091116UG, 5 execuções com consentimento limpo):

| | MC82.2 | MC82.3 | alvo |
|---|---|---|---|
| **JS no arranque** | 617,0 KB | **360,5 KB** (−42%) | < 400 ✅ |
| **LCP (mediana)** | 980 ms | **748 ms** (−24%) | < 900 ✅ |
| FCP (mediana) | 556 ms | 308 ms (−45%) | — |
| TTI (aprox) | 556 ms | 364 ms | — |
| Long tasks | 2 (193 ms) | 0 | — |
| Chunks | 6 | 5 | — |

**Como:** novo `src/lib/sentryLazy.js` importa `@sentry/react` dinamicamente e faz o init (config
movida do `main.jsx` **intacta**). Até o SDK subir, `captureException`/`captureMessage`/`addBreadcrumb`
**enfileiram em memória** (limite 50) e a fila é drenada no init. O `<Sentry.ErrorBoundary>` deu lugar a
um `RaizErrorBoundary` local com a mesma UI. Os listeners globais só enfileiram enquanto `!sentryPronto()`
— depois o SDK instala os seus e capturar aqui duplicaria. O `Boot.jsx` sobe o Sentry em
`requestIdleCallback` quando a app vai montar, nunca no gate.

**⚠️ Separar SUBSCRIÇÃO de ENVIO:** o `webVitals.js` continua a subscrever os Core Web Vitals **no
arranque** (é preciso subscrever cedo ou perdem-se LCP/TTFB, e a lib é pequena); só o envio espera pelo SDK.

**Fila validada por EXPERIMENTO, não por inspeção:** erro disparado no gate (Sentry ausente) → aceitar →
no log, por ordem: `[GUT-DEBUG] window.error` → `Connecting to '…ingest.us.sentry.io/…/envelope/'` →
`[GUT-DEBUG] boot`. Enfileirou, o SDK subiu e drenou. O envio foi bloqueado pela CSP do **preview local**;
verificado que o `netlify.toml` de **produção já permite** `*.ingest.us.sentry.io`.

**⚠️ Trade-off assumido:** se o utilizador abandonar no gate sem aceitar, os eventos em fila não chegam ao
Sentry (antes chegariam). Trocou-se cobertura de uma janela curta por −256,5 KB. Os listeners `[GUT-DEBUG]`
continuam a registar tudo no console.

**⚠️ Nota de método:** a 1ª leitura deu LCP 904 ms (4 ms acima do alvo) — era o primeiro load pós-instalação,
cache frio. Com 5 execuções a mediana assentou em 748 ms e **5/5 ficaram abaixo de 900**.

**Validação:** gate sem sentry/privy (5 chunks); ao aceitar, app monta, Sentry carrega **e inicializa**,
5 vídeos. **FPS sem regressão: 59,5** (MC82.1: 59,6 · MC82.2: 59,3).

**⚠️ PENDÊNCIA DE PRIVACIDADE QUE RESSURGIU (R4):** o `replayIntegration` continua com
`maskAllText: false` e `replaysSessionSampleRate: 0.1` — 10% das sessões gravam texto do ecrã **sem máscara**
num app com saldos e valores de lance. Foi levantado no MC82, o operador escolheu "manter mascarado", a
alteração foi **revertida junto com o resto na correção de rota do MC82 e nunca reaplicada**. Movi a config
intacta de propósito. Correção de uma linha quando aprovar:
`replayIntegration({ maskAllText: true, blockAllMedia: true })` + `replaysSessionSampleRate: 0`.

**PROGRAMA DE PERFORMANCE — CONSOLIDADO:** fluidez 17,5 → 59,6 fps · JS de arranque 4.002 → 360,5 KB
(−91%) · LCP 2.220 → 748 ms (−66%) · FCP 1.292 → 308 ms (−76%).

**Relatórios:** `Desktop\MC82.3-RELATORIO.txt` + `desafio-gut/docs/MC82.3-sentry.txt`.

**Pendências (baixa prioridade):** A1 (vídeo invisível ~460 frames/6s), A4 (vídeos fora do viewport),
A6 (glass restante), R4 (mascarar o Replay). ⚠️ APK é DEBUG — Play Store exige `assembleRelease`.
⚠️ Login OAuth real ainda sem teste ponta-a-ponta.

---

## MC82.4 — Correção da violação R4: mascaramento do Sentry Session Replay

**Data:** 2026-07-21 · **Custo:** US$ 0,00 · Verificado em runtime no dispositivo.

**Violação R4 corrigida.** O Session Replay passa a mascarar todo o texto, todos os inputs e
bloquear toda a mídia, e deixa de gravar sessões normais (só as que contêm erro).

| | antes | depois |
|---|---|---|
| `maskAllText` | **false** | **true** |
| `blockAllMedia` | **false** | **true** |
| `maskAllInputs` | implícito | **true** (explícito) |
| `replaysSessionSampleRate` | 0.1 | **0** |
| `replaysOnErrorSampleRate` | 1.0 | 1.0 (mantido) |

**★ Agravante descoberto neste MC:** aqueles valores não eram "o default" — eram uma **desativação
explícita** de proteções que o SDK traz ligadas. Verificado em `node_modules/@sentry-internal/replay`
(SDK 10.51.0): `maskAllText`, `maskAllInputs` e `blockAllMedia` têm **default `true`**. Alguém teve de
escrever a negação. Por isso os três flags ficam agora **explícitos**, para que uma futura alteração
tenha de os negar de propósito.

**Histórico:** levantado no MC82 (G4); o operador escolheu "manter mascarado"; a alteração foi
**revertida junto com o resto na correção de rota do MC82 e nunca reaplicada**; movida intacta no MC82.3
e re-levantada no relatório. Este MC fecha.

**Verificado em RUNTIME no aparelho** (não só no código), lendo as opções do cliente já inicializado via
CDP — `window.__SENTRY__[version].defaultCurrentScope.getClient()`:
`MASK_ALL_TEXT true` · `MASK_ALL_INPUTS true` · `BLOCK_ALL_MEDIA true` · `sessionSampleRate 0` ·
`onErrorSampleRate 1` · Replay ativo. R5 respeitado: só verificada a **existência** do DSN (booleano).

**⚠️ ISTO NÃO REDUZ O CUSTO DE CPU.** Com `onErrorSampleRate > 0` o SDK entra em **buffer mode**: o rrweb
continua gravando mutações do DOM em memória para poder enviar os segundos antes do erro. Medido no
perfil de CPU **depois** da alteração: `ET.processMutation` = **229 ms em 6 s (3,6%)**. Este MC resolve
**privacidade**, não performance — eliminar o custo exigiria remover a integração. Nota deixada no
próprio `sentryLazy.js`.

**Performance sem regressão:** arranque 360,5 KB (idêntico), FPS 59,8, UI inalterada. LCP mediana 780 ms
vs 748 do MC82.3 — não é regressão causal (o Sentry nem carrega no gate), é ruído; 4/5 runs abaixo de 900.

**SÉRIE MC82 CONCLUÍDA:** FPS 17,5 → **59,6** (+241%) · JS do gate 4.002 → **360,5 KB** (−91%) ·
LCP 2.220 → **~780 ms** (−65%) · FCP 1.292 → **~372 ms** (−71%) · violação R4 fechada.

**Relatórios:** `Desktop\MC82.4-RELATORIO.txt` + `desafio-gut/docs/MC82.4-replay.txt`.

**Pendências (baixa prioridade):** A1 (vídeo invisível ~460 frames/6s), A4 (vídeos fora do viewport),
A6 (glass restante em TabelaLances/SejaNossoParceiro). ⚠️ **Bloqueios para publicar:** APK é DEBUG
(Play Store exige `assembleRelease`); produção roda a linhagem MAINNET, não esta branch; **login OAuth
real ainda sem teste ponta-a-ponta**.

**Lição:** quando um SDK traz defaults seguros, uma config que os **nega** é sinal de alarme, não
preferência — verificar o default no pacote instalado antes de assumir que apenas "não foi configurado".
E taxa de amostragem 0 ≠ custo 0: conferir no perfil de CPU o que continua a correr.

---

## MC86 — Auditoria de Segurança (RLS · validação · IDOR · logs · webhooks)

**Natureza:** MC de diagnóstico. **Zero alteração de código-fonte (R1)** — o entregável é documento;
a execução das correções fica para o MC seguinte.

**Escopo auditado:** 14/14 tabelas Supabase · 2/2 funções SQL · 47/47 Netlify Functions ·
31 endpoints sondados ao vivo em produção (read-only) · 6 superfícies de log · 3 webhooks previstos.

**Veredito:** postura acima da média. **RLS ativo em 100% das tabelas com default-deny**, provado ao
vivo com a chave anon real: `cotas` (7 linhas) e `saldo_rs` (5 linhas) devolvem `[]` a um chamador
anónimo. O helper anti-IDOR `validarOwnerOuAdmin` é aplicado de forma consistente nos endpoints
financeiros — `/saldo-rs`, `/wallet`, `/notificacoes`, `/backup-blobs`, `/purge-logs` devolvem 401 sem
token. `img-proxy` tem defesa SSRF de qualidade (DNS + IP literal + `redirect:"error"` + content-type).

**15 achados: 2 P0 · 4 P1 · 5 P2 · 4 P3.** Os dois problemas reais concentram-se em (a) um endpoint
legado que nunca recebeu o guard que os outros receberam, e (b) endpoints de diagnóstico que ficaram
no ar depois de o seu MC terminar.

**P0-1 — `/cotas` GET não tem autenticação nenhuma.** Enquanto POST/DELETE exigem `ADMIN_TOKEN`, o GET
é anónimo em quatro ramos: `?cliente_id=`, `?email=`, `?cnpj=` e `?categoria=` (este último lista
**todas** as cotas da categoria). Hoje devolve vazio porque produção ainda lê Blobs — mas o Supabase
**já tem 7 cotas com CNPJ e e-mail reais**. No dia do flip `DATA_STORE_BACKEND=supabase`, isto passa a
divulgar CNPJ + e-mail + carteira de todos os lojistas sem autenticação. É uma violação de LGPD à
espera de um deploy de configuração, não de um ataque. **Gate: não flipar antes de corrigir.**

**P0-2 — chave privada bruta em mainnet.** `GET /health` responde `"CHAVE_BRUTA_EM_MAINNET":"ALERT"`,
`"SIGNER_BACKEND":"local-key"` — o próprio código classifica isto como violação da R9.

**P1:** HMAC do Mercado Pago em **fail-open** (sem `MP_WEBHOOK_SECRET` a validação é pulada; o
interruptor `MP_WEBHOOK_ENFORCE` existe mas é opt-in) · `reservar_tarefas` é `SECURITY DEFINER` com
`EXECUTE` para PUBLIC → **ignora o RLS de `fila_tarefas`** e responde 200 a um chamador anónimo (fila
vazia hoje) · `/debug-pedido` **fail-open por desenho** e aberto em produção (o próprio corpo confirma:
`"DEBUG_TOKEN_set": false`) · a **EOA queimada** do MC59.11 continua listada como admin e coordenação
(`GET /admin-list` → 200, público), embora `auth-admin` ainda exija `ADMIN_TOKEN` **e** assinatura
EIP-191.

**P2:** webhook MP sem anti-replay (o `ts` entra no manifest mas o frescor nunca é verificado) · a
assinatura MP cobre o `data.id` da **query** enquanto `extrairPaymentId` dá precedência ao **body** —
falha de cobertura, não de criptografia · `/admin-list` GET público · `pagador.cpf` aceito sem qualquer
validação (`iniciar-pagamento.mjs:68` só verifica "é string" e trunca em 32) · endpoints `mc302-*`
vivos após o fim do MC30.2.1 (`mc302-aceitar` envia transação **irreversível**; hoje fail-closed 503).

**P3:** ~25 pontos logam carteira e, em `saldoRs.mjs`/`wallet.mjs`, carteira **junto com o saldo** —
na prática, um extrato · `vite.config.js` não tem `drop_console` e o bundle vivo carrega 14 `console.` ·
`/health` expõe versão do Node e mapa de configuração · `search_path` mutável em 2 funções SQL.

**O que já estava certo e merece registo:** nenhum segredo é logado (só booleanos `set`/`MISSING`);
CNPJ mascarado em `cotas.mjs`; e-mail deliberadamente omitido dos logs; CPF nunca persistido em
`pedidos-meta`; `delete-account.mjs` é exemplar (JWT + owner-check + rate-limit 3 + `dryRun`);
o valor em R$ é **calculado no servidor** a partir da quantidade, nunca aceito do cliente.

**Correção do enquadramento do briefing:** o MC pressupunha 3 webhooks (MP, Twilio, SendGrid). Só
existe **1** — Twilio e SendGrid são apenas **saída**, pelo ORQUESTRADOR. E as políticas RLS não usam
`auth.uid()` **por estarem certas**: o projeto não usa Supabase Auth (é Privy + JWT HS256 próprio nas
Functions), logo o modelo correto é negar tudo a `anon`/`authenticated` e autorizar no backend.

**⚠️ Não auditado:** o ORQUESTRADOR (PythonAnywhere) — `www.pythonanywhere.com` deu `ConnectTimeout`
em 3 tentativas. É onde há maior probabilidade de PII em claro (e-mails e números de WhatsApp de
destinatários). Fica como MC87-A, primeiro alvo da continuação.

**Relatórios:** `Desktop\MC86-RELATORIO.txt` · `Desktop\MC86-MAPEAMENTO.txt` ·
`desafio-gut/docs/MC86-seguranca.txt`.

**Lição:** guards de segurança propagam-se por imitação, e por isso deixam buracos onde ninguém copiou.
`/cotas` GET não é um erro de conceção — é o endpoint que já existia quando o padrão `validarOwnerOuAdmin`
foi criado, e que ninguém voltou para atualizar. Ao introduzir um guard novo, auditar quem **não** o
adotou vale mais do que verificar quem adotou. O mesmo vale para endpoints de diagnóstico: `debug-pedido`
foi escrito fail-open "modo dev" e nunca foi reavaliado, enquanto `mc302-diagnostico`, escrito depois,
já nasceu fail-closed.

---

## MC87 — Correção de Segurança (execução dos achados do MC86)

**Natureza:** MC de execução. Três commits separados por prioridade:
`c6ee96a` (P0) · `8f341f7` (P1) · `0ec7d13` (P2/P3) — 29 ficheiros, +1008/−329.

**Resultado:** dos 15 achados do MC86, **13 fechados em código**; 2 dependem de ação exclusiva do
operador (segredos/KMS — R5). Suíte **209/209** (baseline 191), build verde.

**A prova mais forte é ao vivo, contra produção, com a mesma chave anon que explorava o problema:**
`POST /rest/v1/rpc/reservar_tarefas` passou de **HTTP 200 → HTTP 401 permission denied**. A RPC era
`SECURITY DEFINER` com `EXECUTE` para PUBLIC e ignorava o RLS de `fila_tarefas`; agora é
`SECURITY INVOKER` + `search_path` fixo + `EXECUTE` só para `service_role`. **Advisors do Supabase: 4 → 0.**
É a única correção já ativa — o resto é código e entra com o deploy, que é manual e do operador.

**P0-1 `/cotas` GET** — fechado sem 401 cego, que partiria cadastro e login (`?cnpj=` é consultado por
quem ainda não tem carteira). Minimização por ramo: `?cliente_id=` exige JWT + owner-check (401/403) ·
`?email=` exige sessão + rate-limit · `?cnpj=` só confirma duplicidade, e o contacto exige que `empresa`
bata (mesma barreira do `verificar-login` que já existia) · `?categoria=` devolve projeção pública sem
cnpj/email · o resumo perde os `cliente_ids`. Admin continua a ver tudo. 9 testes novos cobrem a matriz.

**P1** — `debug-pedido` passou a fail-closed (503); o webhook do MP teve o **default invertido** para
fail-closed, com `MP_WEBHOOK_ALLOW_UNSIGNED` como válvula de rollback explícita; a assinatura do MP
deixou de cobrir a query enquanto se processava o body (corpo divergente → 401).

**P2/P3** — `validarCPF`/`validarEmail` com dígitos verificadores · `mc302-*` respondem **410 Gone**
(o `mc302-aceitar` enviava transação **irreversível** por uma via superada três vezes) · `/admin-list`
separou o contrato (`?endereco=` público, lista completa admin-only) · logs mascarados onde
emparelhavam carteira com saldo, pedido ou grafo social do referral · `console.log/info/debug` fora do
bundle (`warn`/`error` ficam, alimentam o Sentry).

**⚠️ Drift descoberto ao corrigir a fila:** a função em produção **não é a de**
`20260629_fila_tarefas.sql` — assinatura `p_limit` vs `p_limite`, corpo `SELECT` vs `UPDATE`, e o schema
não tem `agendado_para`/`max_tentativas`. A migração versionada nunca foi aplicada; aplicaram outra à
mão. `_lib/fila.mjs` chama com `p_limite`, o erro cai no ramo `pareceTabelaAusente` e é reportado como
`inerte: true` — **a fila não está dormente, está silenciosamente partida.** Pendência funcional, fora
do âmbito deste MC; por isso a migração de correção é cirúrgica e preserva o que está de facto em produção.

**Quatro desvios deliberados do briefing**, todos para não partir funcionalidade nem desfazer decisão
informada anterior: (1) `CHAVE_BRUTA_EM_MAINNET` **não** foi removido do `/health` — é um booleano de
alarme, não a chave; apagá-lo silenciaria o alarme sem corrigir nada, então foi movido para trás de auth
admin (o `/health` público agora é só `{ok, service, timestamp}`); (2) a EOA comprometida **não** foi
removida à força — em produção o Blob `admin-list` está vazio, logo a constante é a **única** admin e
trocá-la às cegas trancaria o operador fora sem recuperação; virou `COORDENACAO_ADDRESS` com alerta
recorrente; (3) o anti-replay foi implementado mas **desligado por omissão**, porque o MC59.2 regista
decisão do operador contra ele com motivo concreto (o MP reenvia com o `ts` original por horas → uma
janela fixa rejeitaria retentativas legítimas); (4) o endereço citado no briefing para a EOA
(`0x1394492e…`) não corresponde a nada no sistema — a EOA em causa é `0xDa3a83…e84E`.

**Descoberta colateral:** verificado on-chain, `coordenacao()` do contrato ativo devolve
`0xFea436…1E67`. A constante hardcoded no backend estava **desatualizada além de comprometida**.

**Gate do MC86:** `P1-2` fechado e ativo; `P0-1` fechado em código. O gate sobre
`DATA_STORE_BACKEND=supabase` **levanta quando esta branch estiver em produção** e a reverificação passar.

**Operador (3 env vars, sem deploy):** `MP_WEBHOOK_SECRET` (⚠️ **definir ANTES do deploy** — o código
já é fail-closed, e deployar sem o segredo faz o webhook responder 401) · `COORDENACAO_ADDRESS` ·
migração para KMS + apagar `COORDENACAO_PRIVATE_KEY` (único achado ainda totalmente aberto).

**Relatórios:** `Desktop\MC87-RELATORIO.txt` · `Desktop\MC87-VALIDACAO.txt` · `Desktop\MC87-BASELINE.txt` ·
`desafio-gut/docs/MC87-seguranca-correcao.txt`.

**Lição:** endurecer um endpoint é a parte fácil; a parte difícil é descobrir quem depende dele **sem
credencial**. `/cotas` e `/admin-list` eram ambos consumidos em fluxos pré-autenticação — cadastro,
login e o próprio gate que decide se o utilizador é admin — e nos dois casos a resposta certa não era
bloquear, era **devolver menos**. Um 401 cego teria passado nos testes de segurança e partido o produto.
Antes de fechar uma porta, vale mais listar quem entra por ela do que confirmar que ela fecha.

---

## MC89 — Relatório Final da Jornada (consolidação MC15 → MC88)

**Data:** 2026-07-23 · **Tipo:** documentação e consolidação · **R1:** zero alteração de código-fonte.

Síntese de **193 documentos** de Mega Comando: os 103 relatórios da raiz do Desktop mais **90
documentos recuperados da Lixeira** — que guardava a única cópia de toda a fase inicial do projeto
(MC15 → MC45), incluindo a unificação do vidro, a blindagem anti-bot dos lances, o isolamento da
chave mestra e a migração completa para Supabase.

**Estado consolidado.** Sistema em produção na Ethereum mainnet (MC60) com coordenação por EOA e
assinatura `local-key`; Supabase ativo desde o MC33; performance do WebView em 59,6 fps com LCP de
748 ms e 360,5 KB de JS no gate; AAB assinado pronto; automação de divulgação com WhatsApp concluído
(198/198) e e-mail em curso (400/1623); 13 dos 15 achados de segurança fechados, suíte 209/209.

**Pendências que sobrevivem a este MC.** Allowlist do Privy para `https://localhost` (bloqueia o
login OAuth no WebView — MC88), `MP_WEBHOOK_SECRET`, a fila do Supabase (partida, não dormente),
a migração para KMS, o upload na Play Store e o drift de deploy entre a linhagem MAINNET e as
branches de trabalho.

**Achado de segurança novo.** Um ficheiro na Lixeira contém uma chave de API DeepSeek em texto
claro, hardcoded num script que a grava em `~/.claude/settings.json`. Valor não transcrito (R4).
Exige revogação no fornecedor **antes** de qualquer eliminação — apagar o ficheiro não invalida a
chave.

**Limpeza.** O plano previa apagar os relatórios; durante a execução o operador informou que a
Lixeira tinha sido esvaziada por engano, o que confirmou o risco. A limpeza foi convertida de
destrutiva em arquivística: 90 documentos recuperados da Lixeira e 102 do Desktop movidos para
`Desktop\MC-HISTORICO\`. **Nada foi apagado.**

**Relatórios:** `Desktop\MC89-RELATORIO-FINAL.txt` · `desafio-gut/docs/MC89-relatorio-final.txt` ·
arquivo histórico em `Desktop\MC-HISTORICO\`.

**Lição:** a história técnica de um projeto não pode viver na raiz do Desktop nem na Lixeira. Setenta
relatórios — toda a fase MC15→MC45, incluindo as decisões que explicam por que o sistema é como é —
estiveram a um clique de desaparecerem para sempre. Documentos que justificam decisões arquiteturais
pertencem ao repositório versionado, não ao ambiente de trabalho de uma máquina.

---

## MC88.2 — Depuração no WebView: premissa refutada (2026-07-23)

**Tipo:** diagnóstico · **R1:** zero alteração de código do app · **Custo:** US$ 0,00.

O MC pedia para ativar `setWebContentsDebuggingEnabled(true)` no `MainActivity`, recompilar o APK
debug e reinstalar, partindo do princípio de que o DevTools estava indisponível. **A medição
refutou a premissa: a depuração já estava ativa.**

**Causa real do sintoma.** O comando de diagnóstico apontava para o socket errado:
`localabstract:chrome_devtools_remote` é o socket do **navegador Chrome**. Um WebView de aplicação
expõe-se em `webview_devtools_remote_<PID>`. O `adb forward` não valida o destino, por isso o túnel
monta-se na mesma e o `/json/list` falha — sintoma indistinguível de "depuração desativada".

**Teste A/B, mesma máquina e mesmo instante:** `chrome_devtools_remote` → conexão fechada;
`webview_devtools_remote_13349` → HTTP 200 com a página `https://localhost/` listada. O pacote está
marcado `flags=[ DEBUGGABLE ... ]` e o socket existe em `/proc/net/unix`.

**Porque já funciona sem a linha.** `MainActivity.java` é o `BridgeActivity` de fábrica do Capacitor,
sem corpo. O próprio Capacitor chama `setWebContentsDebuggingEnabled(true)` quando a app tem
`FLAG_DEBUGGABLE`. A prova mais forte, porém, é histórica: o **MC88.1 conversou com este WebView por
CDP durante toda a sessão** — leu `location.origin`, capturou 185 mensagens de console e os
cabeçalhos do `auth.privy.io`. Isso é impossível num WebView não-depurável.

**Armadilha no script proposto.** O `-replace "(onCreate.*?){"` não encontraria nada (o ficheiro não
tem `onCreate`), mas o script imprimia `✅ Flag adicionada` de forma incondicional — só verificava se
o ficheiro *existia*, nunca se a troca *acontecera*. Teria reportado sucesso sem alterar uma linha.

**Entregue em vez da alteração:** `desafio-gut/scripts/webview-devtools.ps1` — descobre o PID, monta
o nome do socket, valida que existe (e, se não existir, lê as flags do pacote e diz que aí sim é caso
para `assembleDebug`), abre o túnel e confirma com `/json/list`. Validado ponta a ponta.

**Relatório:** `Desktop\MC88.2-RELATORIO.txt`.

**Lição:** o PID entra no nome do socket, portanto o alvo muda a cada arranque do app — descobri-lo
em tempo de execução é correção, não conveniência. E, mais geral: um passo de automação tem de
validar o **efeito**, não a existência do alvo; um sucesso falso é pior que uma falha, porque encerra
a investigação. Vale reler o MC anterior antes de aceitar o diagnóstico do seguinte — aqui, o
relatório do MC88.1 era, por si só, o certificado de que a premissa do MC88.2 não se sustentava.

---

## MC88.1 validado + MC88.3 refutado — allowlist do Privy resolvida (2026-07-24)

**Tipo:** validação e diagnóstico · **R1:** zero alteração de código · **Custo:** US$ 0,00.

**A correção do MC88.1 funcionou.** O operador acrescentou `https://localhost`, `http://localhost` e
`capacitor://localhost` às Allowed Origins da app Privy `cmo51f3v300l90clgzksivvad` (de 7 para 10
origens, lidas ao vivo do `frame-ancestors` do `auth.privy.io`). Resultado medido no aparelho: o
iframe `embedded-wallets` deixou de dar `ERR_BLOCKED_BY_RESPONSE` e passou a descarregar a sua própria
aplicação (CSS + 12 chunks do Next.js, todos 200). Desapareceram o erro "Framing … violates
frame-ancestors", a tempestade de 178 avisos de `postMessage` em 60 s e o "Privy iframe failed:
Exceeded max attempts". Falta só o critério 6 — o JWT —, que exige um login Google humano.

**Nota:** o painel do Privy **aceitou** `capacitor://localhost`. A suposição de que só aceita
http/https não se confirma.

**MC88.3 não executado — premissas refutadas.** Propunha trocar `androidScheme` para `desafiogut://`
e acrescentar `redirectUri` à config do Privy. Medição: (a) `https://localhost/carteira` resolve com
HTTP 200 e renderiza — o WebView resolve a rota; (b) `capacitor://` É aceite pela Privy; (c)
`capacitor.config.json` não existe (o projeto usa `capacitor.config.ts`, e criar o JSON ao lado
produziria uma config fantasma que a CLI ignora); (d) `redirectUri` não é chave do `PrivyProvider` —
seria ignorada em silêncio. Pior: mudar a origem para `desafiogut://localhost` **desfaria** a correção
recém-aplicada, já que essa origem não está na allowlist, e quebraria os pressupostos same-origin do
logo do modal (MC67/MC78).

**A origem da cadeia.** Um `MC88.1-VALIDACAO.txt` pré-existente, das 00:48Z, registava
`❌ Erro: socket hang up`. Esse era o sintoma do socket errado (MC88.2), não de um login falhado — a
validação nunca chegou a ligar-se ao WebView. Duas rondas de diagnóstico (MC88.2 e MC88.3) foram
construídas sobre uma ligação falhada interpretada como sintoma da aplicação.

**Relatórios:** `Desktop\MC88.1-VALIDACAO.txt` · `Desktop\MC88.3-RELATORIO.txt`.

**Lição:** uma falha de FERRAMENTA disfarça-se de falha de PRODUTO. Antes de acreditar num sintoma,
confirmar que o instrumento estava ligado. E antes de perseguir a falha seguinte, confirmar que a
correção anterior chegou a ser validada — correr o Segmento 2 pendente do MC88.1 respondeu ao MC88.3
inteiro em minutos.

**MC88.7 — o esquema custom é recusado pelo Privy, não pelo Android.** O objetivo era tornar o
retorno do OAuth independente do browser padrão, trocando o App Link HTTPS por um esquema custom.
Duas tentativas (`desafiogut://oauth` e `capacitor://localhost/oauth`), ambas mortas pelo mesmo
erro do backend — `Redirect URL scheme is not allowed` — disparado no clique em "Google", antes
sequer de abrir o browser. Em ambas o intent-filter estava presente e o roteamento Android
verificado (`am start -d "desafiogut://oauth"` → `com.desafiogut.app/.MainActivity`), pelo que a
recusa é 100% do lado do Privy. Confirma o recipe oficial (Capacitor exige App Link HTTPS) e
**refuta o docstring do próprio SDK 3.22.1**, que recomenda esquema custom.

**A confusão que sustentava o plano.** "Allowed Origins" (`capacitor://localhost`,
`http://localhost`) autorizam o SDK a CORRER a partir dessas origens; não são destinos de redirect.
Ver `capacitor://localhost` na allowlist não o torna um `customOAuthRedirectUrl` válido. Pelo mesmo
motivo, `http://localhost/oauth` era impossível por construção: o browser externo carregaria o
localhost DELE, não o da app — não foi executado.

**Duas causas raiz no MC88.6, ambas corrigidas.** (a) O `customOAuthRedirectUrl` já apontava para
`desafiogut://oauth`, mas faltava o intent-filter no AndroidManifest — e `android/` é untracked, por
isso o commit nem podia incluí-lo. (b) O commit `0f7b392` corrompeu dois ficheiros via
`Set-Content -Encoding utf8` do PS 5.1: 39 linhas de mojibake no `PrivyRoot.jsx` e, no
`capacitor.config.ts`, a string `` `n `` LITERAL mais um `androidScheme: "desafiogut"` — alteração
explicitamente vetada, que quebraria origens/secure-context/storage. Os Segmentos 1/4/5 do plano
repetiam esses mesmos comandos; foram substituídos por edição UTF-8 e restauro de `516b8a1`.

**O que fica.** App Link HTTPS + `allowOAuthInEmbeddedBrowsers: true`, revalidado end-to-end às
19:05. Limite conhecido: só fecha em browsers que cedem a navegação (Chrome sim, Opera não), porque
o Android só resolve App Links para intents vindos de FORA do browser e o redirect final do OAuth é
navegação interna. Desbloqueio = uma ação do operador no dashboard Privy (registar o esquema em
"allowed URL schemes"); o intent-filter já está no manifest à espera, e depois é trocar uma linha.

**Relatório:** `Desktop\MC88.7-RELATORIO.txt`.

**Lição:** quando um redirect falha, separar QUEM recusou — o Android (roteamento) ou o provedor
(allowlist). Um `am start` com o esquema responde a isso em segundos e teria poupado o MC88.6
inteiro. E allowlist de ORIGEM nunca é allowlist de DESTINO.

**MC88.8 — o critério 6 nunca podia passar: media a chave errada.** O `capturar-token.mjs` lia
`sessionStorage.getItem("gut_auth_user")` — chave que a app NUNCA escreve. Enumerado ao vivo:
sessionStorage tem `gut_admin_check`, `gut_consentimento`, `sentryReplaySession`; o Privy guarda a
sessão em `privy:token`/`privy:refresh_token`, no localStorage. O script reportava "token não
encontrado" mesmo com o login concluído, e arrastou essa pendência por vários MCs. Segundo defeito
no mesmo ficheiro: `chrome-remote-interface` resolve localhost para ::1 enquanto o `adb forward`
escuta em 127.0.0.1 → o mesmo `socket hang up` já registado no MC88.2. E o `fetch()`/undici também
não serve: o DevTools remoto do Android fecha a ligação por causa dos headers que ele acrescenta,
embora o curl passe — é preciso `node:http` com headers mínimos.

**Reescrito, e o critério 6 fechou:** `✅ Token JWT gerado e válido`, emissor `privy.io`, audiência
`cmo51f3v300l90clgzksivvad`, refresh presente. Armadilha a lembrar: o socket do CDP inclui o PID
(`webview_devtools_remote_<PID>`), portanto matar a app derruba o túnel — e a captura tem de correr
na MESMA instância do login.

**Terceira corrupção do PrivyRoot.jsx pelo mesmo comando.** O working tree voltara a
`desafiogut://oauth` com 43 linhas de mojibake, de novo via
`Get-Content -Raw | -replace | Set-Content -Encoding utf8`. Reposto com `git checkout HEAD --`, que
corrige valor e encoding de uma vez. Em PS 5.1 esse `-Encoding utf8` grava BOM e a releitura do
conteúdo mal-interpretado perpetua o dano — o padrão está proibido neste ficheiro.

**Pista que pode acabar com a dependência do Chrome.** `PrivyProviderProps` tem `clientId?: string`
("Your Privy App Client ID"), e nunca foi passado. Criar o app client no dashboard com o URL scheme
não basta: sem o `clientId`, o SDK continua a autenticar-se como o cliente web por omissão, cujo
allowlist não tem o esquema — o que explica a recusa persistir mesmo depois de o operador criar o
cliente. MC88.9 = 1 linha (`clientId=`) + voltar a `desafiogut://oauth`; o intent-filter já está no
manifest e o roteamento Android já foi verificado.

**Relatório:** `Desktop\MC88.8-RELATORIO.txt`.

**Lição:** antes de dar um critério por falhado, verificar que ele mede o que diz medir. Uma
enumeração de `Object.keys(sessionStorage)` responderia em segundos ao que custou vários MCs.

**MC88.9 — a hipótese do `clientId` era minha, e estava errada.** Levantei-a no MC88.8 a partir do
docstring ("Your Privy App Client ID"); testada, falsificou-se. Passar
`clientId="client-WY6YV…"` faz o SDK NUNCA ficar `ready`: o modal fica preso em "⏳ Carregando…"
para sempre, sem um único erro no console. Isolamento em 3 builds: (1) clientId + `desafiogut://oauth`
→ preso; (2) clientId + App Link HTTPS → preso, logo o culpado é o clientId e não o esquema;
(3) sem clientId → ready imediato, sessão restaurada e JWT válido.

**O campo que realmente comanda o bloqueio.** Interrogando
`GET https://auth.privy.io/api/v1/apps/<appId>` de dentro da WebView, a config tem DOIS campos de
nomes parecidos e papéis diferentes — e era aí que a confusão vivia desde o MC88.6:
`allowed_domains` (tem `capacitor://localhost`, `https://localhost`, os netlify) e
**`allowed_native_app_url_schemes: []` — vazio**. É o segundo que autoriza redirects nativos, e é
essa a única razão do `Redirect URL scheme is not allowed`. Dois factos medidos, não deduzidos:
criar o App Client no dashboard com o scheme NÃO preencheu esse campo, e a resposta da API é
IDÊNTICA com e sem o header `privy-client-id` — o clientId nunca poderia ter desbloqueado o esquema,
mesmo que não partisse o arranque.

**Ação do operador, agora precisa:** acrescentar `desafiogut://` ao campo que alimenta
`allowed_native_app_url_schemes` — não é onde estão as Allowed Origins, e não é criar um App Client
(já feito, não bastou). Confirma-se relendo a API: o campo deixa de ser `[]`. Só então voltar a
`customOAuthRedirectUrl: "desafiogut://oauth"` — uma linha; intent-filter, listener e roteamento já
estão prontos e testados. E sem o clientId junto.

**Relatório:** `Desktop\MC88.9-RELATORIO.txt`.

**Lição:** perguntar à API do provedor o que ele acha da própria config vale mais do que ler o
dashboard — dois campos de nome parecido custaram quatro MCs. E falha silenciosa é a pior de todas:
o "Carregando…" eterno não gerou um erro sequer; só o isolamento de variável a apanhou.

**MC88.10 — o PIX não está partido; o backend inteiro é inalcançável a partir do APK.** Mercado
Pago, webhook, Supabase e variáveis de ambiente estão todos inocentes: a requisição nunca sai do
telemóvel. `src/lib/api.js:24` usa `const BASE = "/.netlify/functions/"` — caminho RELATIVO. No APK
a origem é `https://localhost`, servida do sistema de ficheiros pelo Capacitor, que aplica o
fallback de SPA. Medido com um POST real de dentro da WebView:

    POST /.netlify/functions/iniciar-pagamento
    → status 200 · ok: true · content-type: text/html · corpo: o index.html

**O status 200 é o que torna a falha silenciosa:** `resp.ok` é true, todo o tratamento de erro
baseado em ok/status passa, o `lerResposta()` faz JSON.parse do HTML, apanha a exceção e devolve o
fallback — como foi desenhado. Daí os quatro sintomas mudos: `R$ —`, `IND-??????`,
`useEdicoes fallback R-1: payload_invalido` e o modal PIX a avançar para um passo 2 vazio sem erro.

**Apontar para o domínio absoluto também não basta — falta CORS.** `fetch` ao netlify.app dá
`Failed to fetch`; distinguido de CSP por experiência: não há meta CSP no APK (a do netlify.toml é
header HTTP, que o Capacitor não serve) e o MESMO pedido com `mode:'no-cors'` PASSA (`type: opaque`)
— a rede sai e chega ao servidor. Se fosse CSP, ambos falhariam. E não existe configuração de CORS
em lado nenhum: nunca foi precisa, porque na web frontend e functions são same-origin.

**Bug exclusivo do empacotamento Capacitor** — nasceu quando a app virou APK, não com nenhuma
alteração do fluxo de pagamento. Correção exige DUAS partes (uma sozinha não resolve): base absoluta
quando `Capacitor.isNativePlatform()`, varrendo os call-sites que montam URL à mão fora do api.js
(ComprarFichasModal.jsx:22 é um deles); e CORS nas functions com `Authorization` nos allow-headers
(preflight obrigatório por causa do JWT do Privy), com allowlist explícita — nunca `*`, são funções
que movimentam dinheiro.

**Relatório:** `Desktop\MC88.10-RELATORIO.txt`. Execução fica para o MC88.11 (R1: diagnóstico não
altera código; e a Parte B exige deploy, que é do operador, com o drift da produção a pesar).

**Lição:** um 200 pode ser a pior resposta possível. Vale a pena `lerResposta()` recusar corpos que
não sejam `application/json` — teria transformado quatro sintomas mudos num erro explícito no
primeiro segundo.

**MC88.11 — Parte A: as chamadas passaram a sair do telemóvel.** Um único ponto de reescrita
(`src/lib/apiOrigin.js` + 1 import no `main.jsx`) em vez de editar os 24 call-sites com o literal
`/.netlify/functions/…` — só 13 dos 27 passam pelo `api.js`, e qualquer call-site novo voltaria a
partir em silêncio. O shim substitui o `fetch` global e reescreve apenas strings que começam
exatamente por esse prefixo; Privy, Sentry, Alchemy e assets passam intocados, e na web é no-op
absoluto (o fetch nem chega a ser substituído).

**Detalhe de ESM que quase escapava:** os `import` são hoisted e avaliados antes de qualquer
statement do módulo importador, portanto chamar a instalação a partir do `main.jsx` correria DEPOIS
de toda a árvore de imports. O módulo auto-instala como side-effect e o `main.jsx` faz só
`import "./lib/apiOrigin.js"` — que tem de continuar a ser o primeiro import a seguir ao CSS.

**Antes → depois, medido via CDP:** `GET /.netlify/functions/edicoes` passou de
`200 · ok:true · text/html` (o index.html a fingir sucesso) para `TypeError: Failed to fetch`, e os
logs `Handling local request: …/netlify/…` desapareceram por completo. A chamada agora SAI e é
recusada por CORS na resposta. Ganho real mesmo antes da Parte B: a falha deixou de ser silenciosa.
Zero regressão — UI renderiza igual, sem crash, login Privy intacto.

⚠️ O Segmento 2 do plano teria destruído 15 ficheiros: o `-replace` para
`'getBaseUrl() + "..."'` escreve `"..."` LITERALMENTE, trocando o nome de cada endpoint por três
pontos. Não foi usado.

**Falta a Parte B** (CORS nas functions, com `Authorization` nos allow-headers por causa do JWT do
Privy, allowlist explícita e nunca `*`) — exige deploy, que é do operador, e a produção tem o drift
da linhagem MAINNET. Só então o QR Code do PIX pode aparecer.

**Relatório:** `Desktop\MC88.11-RELATORIO.txt`.

**MC88.12 — Parte B: CORS implementado e provado sem deploy.** Duas premissas do plano caíram no
Segmento 0. (a) O MCP do Netlify não existe nesta sessão — procurado com três queries diferentes,
nenhuma ferramenta `mcp__netlify__*`, e o `.mcp.json` do projeto está vazio; foi instalado a meio,
mas servidores MCP carregam no ARRANQUE, logo só depois de reiniciar. (b) O middleware proposto é
**Netlify Functions v1** (`event.httpMethod`, `{statusCode, headers, body}`) e o projeto é 100% **v2**
(`export default async (req) => Response`) — medido: zero das 47 usam v1. Em v2 `event.httpMethod`
seria `undefined`, `handlePreflight` devolveria sempre null e o retorno seria inválido: não teria
funcionado em function nenhuma, e teria falhado em silêncio — o mesmo modo de falha que o MC88.10
acabara de desenterrar.

**Implementado em dois mecanismos, porque o preflight não passa pelo caminho da resposta.** As
RESPOSTAS: `jsonResponse()` em `_lib/validate.mjs` injeta os cabeçalhos — uma edição cobre as 41
functions que devolvem JSON. O PREFLIGHT: guard de 2 linhas na primeira linha de 40 handlers (o
OPTIONS não leva corpo nem Authorization, logo auth/parse/rate-limit responderiam 4xx e o browser
abortaria a chamada real). Os 7 ficheiros ignorados são legítimos: 5 `*-scheduled` (crons, sem
browser) e 2 `mc302-*` (diagnóstico).

**Origem única em vez de reflexão**, por decisão: `jsonResponse(body, status, extraHeaders)` não
recebe a `Request`, e mudar a assinatura obrigaria a tocar nos 41 call-sites. Só existe uma origem
cross-origin legítima — `https://localhost`, a do APK. Nunca `*`: são funções que movimentam
dinheiro. Com `Vary: Origin` e `authorization` em allow-headers (é o Bearer do Privy que torna o
preflight obrigatório).

**Provado sem deploy**, invocando os handlers com Requests reais: `OPTIONS iniciar-pagamento` → 204
com allow-origin/headers/methods; `GET` → 405 **com** allow-origin (via jsonResponse); `OPTIONS
edicoes` → 204. São as duas condições que o browser exige. 209/209 testes verdes, 47/47 passam
`node --check`.

⚠️ Percalço registado: a 1.ª passagem do script partiu `cotas.mjs` e `referral.mjs` — nesses o
último import é multi-linha e a deteção apanhou a linha `import {`, inserindo no meio da declaração.
Apanhado pelo `node --check` e corrigido. Lição: validar sintaxe SEMPRE depois de edição por script.

**Falta o deploy** — e é aí que mora o risco: a produção roda a linhagem MAINNET, não esta branch.
Deployar a errada regride a mainnet. Preferir `netlify deploy --build` (preview) antes do `--prod`.
Até lá o APK continua com `Failed to fetch` e sem QR Code, o que é esperado.

**Relatório:** `Desktop\MC88.12-RELATORIO.txt`.

---

## MC88.12.1 — Deploy do CORS e validação da cadeia do APK

**Deploy de produção:** `6a655e3d762856623f4b6401` · branch `docs/mc89-relatorio-final` @ `7b560f9`

O MCP do Netlify **não existe** — nunca foi escrito em nenhuma config (`~/.mcp.json` só tem
aidesigner e supabase; o `.mcp.json` do projeto está vazio). Feito pelo CLI 26.1.0, já autenticado.

⚠️ **O comando do plano teria regredido a mainnet.** `netlify deploy --prod --dir=dist` assa no
bundle o `.env.production` LOCAL, que ainda aponta para o contrato Sepolia abandonado
`0x59A73Acc…F6D5`; produção precisa do mainnet `0x0052477A…16cd`, que só existe no dashboard.
Trocado por `--build`. Verificado no bundle servido por produção: mainnet 1 ocorrência, Sepolia 0.
A regra "não deployar branch baseada em main" já estava desatualizada — mc60/mc73/mc78/mc87 são
todos ancestrais do HEAD. Validado primeiro em draft (`6a655cae…`), promovido depois; assets
idênticos, portanto foi o artefacto validado que subiu.

**CORS aprovado nos 4 critérios**, e nos dois mecanismos (que são caminhos independentes):
preflight `OPTIONS → 204` e `jsonResponse` a levar os cabeçalhos no `GET → 405`. Baseline antes
era 405 com zero cabeçalhos. Estendido a confirmar-pagamento, webhook-mercadopago, comprar-senhas,
saldo-rs e wallet — todos 204 com `allow-origin: https://localhost`.

**Cadeia do APK provada sem login e sem custo**, por fetch real disparado de dentro do WebView
(sonda com payload inválido de propósito). O sintoma do MC88.10 está extinto:

| | MC88.10 | agora |
|---|---|---|
| status | `200` | `400` |
| `ok` | `true` (mentira) | `false` |
| content-type | `text/html` | `application/json` |
| corpo | `<!DOCTYPE html>…` | `{"error":{"code":"endereco_invalido"…}}` |

O 400 é o handler real a rejeitar a sonda; sob a falha de CORS anterior teria sido
`TypeError: Failed to fetch` sem corpo nenhum. `shimInstalado: true` e o log do aparelho mostra
`[GUT] MC88.11 — functions apontadas para https://silly-stardust-ca71bc.netlify.app`.

Nota para quem vier a seguir: os timestamps sugerem que o APK não teria o MC88.11 (instalado
21:14:26, commit 21:17:30). Sugerem mal — o APK foi construído 21:14:19 de assets de 21:13:39 e o
commit só registou depois. Provar por **conteúdo** (`__gutApiOrigin` no bundle), não por hora.

**⏳ Falta** ver o QR Code na UI. A app está autenticada mas no gate LGPD. Não avancei: aceitar o
regulamento é afirmação legal do operador, gerar PIX cria cobrança real em produção (R2), e ler o
`privy:token` seria manusear credencial (R5).

**Relatório:** `Desktop\MC88.12.1-RELATORIO.txt`

---

## MC88.13 — Diagnóstico do "Failed to fetch" no PIX: a allow-list do CORS está incompleta

**Causa raiz:** faltam `sentry-trace` e `baggage` no `access-control-allow-headers`. A app envia-os
sem que ninguém tenha escrito código para isso — é o `browserTracingIntegration` do Sentry.

```
Access to fetch at '…/iniciar-pagamento' from origin 'https://localhost' has been blocked by
CORS policy: Request header field sentry-trace is not allowed by Access-Control-Allow-Headers
in preflight response.
```

**O mecanismo é a composição de duas coisas certas.** O `main.jsx` importa `apiOrigin.js` primeiro,
logo o shim embrulha o `fetch` nativo. O Sentry carrega depois (lazy, MC82.3) e embrulha o SHIM.
A ordem fica `app → Sentry → shim → fetch`. A app chama com URL **relativa**; o Sentry vê relativa,
conclui same-origin e anexa os cabeçalhos de tracing; só **depois** o shim reescreve para absoluta e
a chamada vira cross-origin — já a levar dois cabeçalhos não autorizados. Nenhum dos dois está
errado sozinho. Por isso não existe na web (same-origin, sem preflight) e só aparece no APK.

⚠️ **Porque é que o MC88.12.1 deu verde** — lição que vale mais do que o bug: testei o preflight com
os cabeçalhos que **assumi** (`authorization, content-type`), não com os que a app **envia**. O
servidor devolve 204 nos dois casos; quem rejeita é o browser, ao comparar a lista pedida com a
autorizada. **Um teste de CORS que não reproduza o `Access-Control-Request-Headers` real dá falso
verde.** E a minha sonda passou porque a app tinha acabado de reiniciar e o Sentry, sendo lazy,
ainda não carregara.

Reprodução determinística:

| `Access-Control-Request-Headers` | resultado |
|---|---|
| `content-type` | 204 ✅ (o falso verde) |
| `content-type, sentry-trace, baggage` | 204 mas allow-headers **não** os contém → browser aborta |

**Alcance maior do que o PIX:** no APK está partido todo o tráfego para as functions —
`iniciar-pagamento`, `auth-user`, `edicoes`, `lances-flash`, `cotas`, `admin-list`, `analytics`.
Daí `obterAuthToken falhou` e `useEdicoes fallback R-1`: a app corre em dados de fallback.

**Correção (MC88.14), 1 linha em `_lib/cors.mjs:39`** — acrescentar `sentry-trace, baggage` ao
allow-headers. Server-side, portanto **não exige recompilar o APK**, preserva o tracing e não toca
no shim nem no Sentry. Descartada a alternativa de mexer em `tracePropagationTargets` (obrigaria a
reinstalar o APK e perderia o tracing). Verificado que a app não envia mais nenhum cabeçalho custom
além de Content-Type/Authorization/X-Visitor-ID/X-Device-Tracked (todos já autorizados) — logo estas
duas adições fecham o conjunto, não haverá 3.ª ronda.

Nota: o teste do plano (`window.__gutApiOrigin`) daria falso negativo — o marcador vive em
`window.fetch.__gutApiOrigin`. Ruído não relacionado: `auth.privy.io/analytics_events` bloqueado por
falta de allow-origin é telemetria de terceiros, não perseguir.

**Relatório:** `Desktop\MC88.13-RELATORIO.txt` · evidências `MC88.13-LOGCAT.txt`, `MC88.13-CDP-CONSOLE.txt`

---

## MC88.14 — Correção da allow-list de CORS: `sentry-trace` + `baggage`

**Deploy de produção:** `6a6569231eee4c0f4426e95d` (draft `6a6567af…` validado antes)

Uma linha em `_lib/cors.mjs`: `, sentry-trace, baggage` no fim do `access-control-allow-headers`.
Server-side, portanto **sem recompilar o APK**. `node --check` OK, **209/209 testes** (baseline do
MC88.12, zero regressão). Ficou também um comentário a explicar o mecanismo, para que o próximo a
ler a lista não "limpe" dois cabeçalhos que não estão em call-site nenhum.

**Produção**, preflight com os cabeçalhos reais → allow-headers com os dois. Verificado nos 8
endpoints que o MC88.13 mostrou partidos (`iniciar-pagamento`, `auth-user`, `edicoes`,
`lances-flash`, `cotas`, `analytics`, `confirmar-pagamento`, `comprar-senhas`) — todos OK.
Anti-regressão mainnet: contrato `0x0052…16cd` 1 ocorrência, Sepolia 0.

**No aparelho**, após reload (essencial — o Sentry é lazy; sem ele carregado o teste não reproduz a
condição): 8 functions com resposta HTTP e **0 erros de CORS** nas nossas. O `auth-user 200` é o
sinal decisivo — era o que estava bloqueado por `baggage` e causava `obterAuthToken falhou`; o
`useEdicoes fallback R-1` desapareceu.

⚠️ **Erro de método que apanhei a meio, e que quase me fazia concluir mal:** a 1.ª medição acusou 75
erros de CORS *depois* do fix, ao mesmo tempo que as mesmas functions respondiam 200 — impossível
para o mesmo pedido. Causa: **`Log.enable` do CDP despeja o histórico de logs acumulado**, eu estava
a contar os erros de antes do fix. Repetido com `Log.enable` → **`Log.clear`** → só então
`Page.reload`. Resultado limpo: 0. **No CDP, `Log.enable` sem `Log.clear` mede o passado.**

**⏳ Falta** o QR Code na UI — gerar PIX cria cobrança real (R2) e o plano atribui o passo ao
operador. O bloqueio técnico está removido e provado.

**Recomendação não executada (decisão do operador):** não existe nenhum teste que cubra o CORS — os
209 passam sem tocar em `_lib/cors.mjs`. Um teste a afirmar que o allow-headers contém o que a app
envia teria apanhado isto no MC88.12 e poupado dois MCs de diagnóstico.

Ruído não relacionado: 2 erros de CORS em `auth.privy.io/analytics_events` (telemetria de
terceiros). Observação separada: `cotas` responde **404** — o CORS passou, logo não é este defeito;
pode ser o item que o MC86 deixou em aberto.

**Relatório:** `Desktop\MC88.14-RELATORIO.txt` · evidência `MC88.14-VALIDACAO.txt`

## MC88.15 — Diagnóstico de latência do PIX (APK)

O PIX funciona desde o MC88.14, mas demora "vários segundos" entre "Continuar para pagamento" e o QR
Code. Medi cada segmento do hot path e o "vários segundos" são **duas coisas diferentes**, com a pior
a ser a menos óbvia.

**Caso quente: ~1,06 s.** Decomposto correlacionando `curl` (cliente) com `netlify logs` (servidor):
rede ~210 ms · rate-limiter+validação ~70 ms · **API do Mercado Pago ~780 ms** · resposta 3,7 KB
~10 ms. O MP é ~73% do tempo de servidor e é externo — não se optimiza, contorna-se.

**Caso frio: ~2,9 s.** `Duration: 2062 ms` só de cold start. E a causa é corrigível e evitável:
`iniciar-pagamento` importa `gravarMetaPedido` de `_lib/credito.mjs`, que importa estaticamente
`_lib/contract.mjs`, que importa **`ethers` (16 MB)**. Gerar um QR Code PIX nunca toca na blockchain
— o cold start carrega o ethers por absolutamente nada. Imports ESM são hoisted e avaliados de forma
eager, logo não há sorte possível aqui: paga-se sempre.

**Três hipóteses que matei com medição, e que valia a pena matar antes de optimizar:**
a **rede móvel** (233 ms p50 no aparelho vs 266 ms no PC — o 4G não é o problema); o **preflight
CORS** (`max-age=86400` já está certo, paga-se 1x e não por chamada); e o **tamanho do payload**
(3,7 KB, dos quais 3 KB de QR em base64 — a 9,1 Mbps é ruído). Cortar o `qrCodeImage` pouparia ~10 ms
ao custo de uma dependência nova no cliente: rejeitado.

⚠️ **Erro de método que apanhei a meio:** o plano mandava medir com `ping`. O Netlify responde por
anycast e **descarta ICMP** — 100% de perda para `2600:1f1e:7c1:c300::258`. Um `ping` a falhar aqui
não diz nada sobre latência; se eu tivesse relatado "rede com 100% de perda" era uma conclusão
inventada. Substituí pelo handshake TCP+TLS do `curl`, que mede o que se queria medir.

⚠️ **Segunda armadilha, esta de execução:** o payload sugerido no plano (`{quantidade, valor}`) não é
o que o endpoint aceita (`{endereco, qtd}`) — daria 400. Em vez de o corrigir e seguir, usei o 400
**de propósito** como sonda: o rate-limiter corre antes da validação, logo o caminho 400 mede a
função inteira **sem chamar o Mercado Pago** e sem criar cobrança. Foi o que permitiu isolar os
780 ms do MP por subtracção, gastando só 3 cobranças reais (não pagas, expiram em 15 min).

**Nota de coordenação:** as minhas sondas `POST` partilham o bucket de rate-limit (5/min por IP) com
o PIX real do operador. Tirei-as da medição no aparelho para não lhe dar um 429 a meio do teste.

**⏳ Falta** a latência **pós-pagamento** (pagamento → saldo no ecrã). O monitor CDP está construído e
provado a capturar (`latencia-monitor.mjs` → `Desktop\MC88.15-LATENCIA.txt`), mas o pagamento real é
do operador e não chegou nesta sessão. Hipótese pré-registada: o polling é `setInterval` de 3 s e o
operador **sai da app** para pagar no banco — o Chrome estrangula timers em background, logo o saldo
pode só aparecer quando ele VOLTA. Se for isso, a latência não é do backend nem do webhook, é do
timer congelado, e a correcção é acordar em `visibilitychange`. O monitor registra `visibilityState`
precisamente para decidir isto com dados.

**Lacuna de observabilidade encontrada:** sem `Timing-Allow-Origin`, o `PerformanceResourceTiming`
devolve `ttfb=0` e `transferSize=0` dentro do APK. Hoje é impossível medir TTFB no aparelho — foi por
isso que esta medição precisou de correlacionar duas fontes. Uma linha em `_lib/cors.mjs` fecha isto.

**Relatório:** `Desktop\MC88.15-RELATORIO.txt` (plano P1–P6 com skills por ponto, execução = MC88.16)

### MC88.15 (cont.) — pós-pagamento medido com pagamento real: o gargalo é o nosso próprio rate-limiter

O operador pagou R$ 2,00 e o monitor CDP capturou o fluxo inteiro. O resultado inverteu a minha
hipótese e encontrou um defeito novo.

**O backend é rápido; a espera é artificial.** Crédito → resposta ao cliente: **374 ms**. Resposta →
UI actualizada: **≤1,7 s**. Crédito → saldo no ecrã: **~2,1 s**. Nada disto é um problema.

**O gargalo é uma colisão entre duas constantes nossas.** O cliente sonda `confirmar-pagamento` a cada
3 s (`POLL_INTERVALO_MS`, ComprarFichasModal.jsx:52) = **20 req/min**. O endpoint limita a **5/min**
(confirmar-pagamento.mjs:98), em **janela fixa**. Logo, em cada minuto as ~5 primeiras chamadas
verificam o MP e as outras ~15 são rejeitadas: **até ~45 s de cada minuto sem qualquer verificação
real**. Vê-se nos `Duration` do servidor a cair de 159–440 ms (chamada real ao MP) para **38–40 ms**
(429 imediato) às 14:25:46. O pagamento só foi descoberto às 14:26:02 — assim que a janela do minuto
seguinte abriu. Atraso evitável: **até ~21 s**.

**Agravante:** o `webhook-mercadopago` teve **0 invocações em 20 min** durante um pagamento real. Não
é rejeição fail-closed (isso registaria uma invocação) — o MP não chama. Confirma
[[desafiogut-webhook-mp-nunca-disparou]]. Portanto este polling estrangulado é o **único** caminho
para creditar: não há rede de segurança.

**🐞 Defeito novo, severidade alta — o 429 não leva CORS.** `montar429()` em
`_lib/rate-limiter.mjs:68-87` constrói a resposta com `new Response(...)` e só os cabeçalhos de
rate-limit. Verificado em produção: a 6.ª chamada devolve `429` com `Retry-After: 37` e
`X-Ratelimit-Limit: 5` e **nenhum `access-control-allow-origin`**. No APK a origem é
`https://localhost`, logo o browser descarta a resposta e o `fetch` estoura com `TypeError: Failed to
fetch` — o app **não vê o 429 nem o `Retry-After`**, e não pode fazer backoff. É a mesma classe de bug
do MC88.13, no único caminho que o MC88.12/88.14 não cobriram: eles trataram `jsonResponse`/
`jsonError`, não o 429. No log CDP o sintoma é inconfundível: `REQ →` sem `RESP ←`.

⚠️ **A minha hipótese principal estava errada, e os dados mataram-na.** Eu previ que o Chrome
estrangularia os timers com a app em background (o operador sai para o app do banco) e que o saldo só
apareceria ao voltar. **Falso:** o log mostra polling a correr normalmente durante todo o período
oculto (pedidos às :22, :27, :32, :37, :42, :47 com `visibilityState=hidden`, e `hidden → visible` só
às 14:25:48.995). A WebView do Capacitor não congelou nada. Se eu tivesse implementado o "acordar em
`visibilitychange`" que planeei, teria optimizado um problema inexistente — fica **cancelado** e
registado para não ser reproposto.

⚠️ **A marca manual do pagamento é inútil como referência:** o "paguei agora" chegou às 14:26:22.904Z,
**20 s depois** do crédito (14:26:02.963Z). E os polls que cobririam a janela da aprovação estavam
estrangulados. Sei que a aprovação caiu entre 14:25:38 e 14:26:02, e não mais que isso — os ~21 s são
um **limite superior** do atraso evitável, não o valor exacto. Fechar isso exigia o `date_approved` da
API do MP, que precisa de `MP_ACCESS_TOKEN` (R5: não manuseio).

**Ordem de execução no MC88.16:** P0 (CORS no 429) → P0c (webhook, operador, em paralelo) → P0b
(reconciliar polling×limite) → P1 (ethers fora do cold start) → P2 (esconder os 780 ms do MP). O P0 vai
primeiro porque sem ele qualquer ajuste de polling é medido às cegas.

**Recomendação não executada:** continua a não existir teste de CORS — o MC88.14 já o registou, e este
429 é a prova do custo. Um teste a afirmar que **toda** resposta de function (200/4xx/**429**) traz
`allow-origin` teria apanhado isto sem precisar de um pagamento real.

**Relatório:** `Desktop\MC88.15-RELATORIO.txt` · evidência `Desktop\MC88.15-LATENCIA.txt`

## MC88.16 — Otimização da latência do PIX: o que funcionou, e a estimativa que eu errei

Cinco frentes do MC88.15 implementadas em 4 commits isolados, 224/224 testes (209 + 15 novos),
validadas num **deploy preview** contra infraestrutura real. Duas correcções ao plano e uma correcção
a mim mesmo.

**⚠️ P1 — eu errei a estimativa, e a atribuição do MC88.15 estava mal feita.** Prometi −1,5 a −2,0 s
tirando o `ethers` do cold start; entreguei **~−100 ms** (2062 → 1960 ms). O ethers saiu de facto do
grafo (garantido por teste: só restam `@netlify/blobs` 145K, `@sentry/node` 2,1M, `jose` 1,2M), mas o
experimento de controlo matou a hipótese: primeira invocação de functions que **não** importam ethers
nem sentry deu `troco` 2,93 s, `voucher` 2,55 s, `notificacoes` 2,77 s — enquanto
`iniciar-pagamento` está agora a ~1,96 s. **~2,5–2,9 s é o piso da plataforma Netlify**, quase
independente do grafo de imports; o PIX está entre as functions mais RÁPIDAS a frio, não as mais
lentas. O P1 continua a valer (desfaz acoplamento morto, protegido por teste, −16 MB no bundle) mas
**não é a alavanca do cold start** — essa é a plataforma, e é decisão de custo do operador.
*(Nota metodológica: o meu 1.º controlo usou `health` e deu 0,81 s — mas eu já tinha chamado `health`
antes, logo estava quente. Controlo inválido, repetido com functions virgens.)*

**Arqueologia que mudou o P1 para melhor:** `creditarPedidoIdempotente` e `lerCreditoPedido` **não são
importados por ninguém** — o crédito passou a ir por `creditarSaldoRsIdempotente` (saldoRs.mjs). Todo o
custo de acoplamento ao ethers vinha de **código morto legado**. Não removido (fora do âmbito).

**🐞 P0 — encontrei um segundo caminho sem CORS, fora do plano.** Ao procurar outros `new Response`
crus: `GET /produtos?categoria=bronze` devolvia **200 + ETag sem `allow-origin`** (é `jsonCacheavel`,
em `_lib/http-cache.mjs`). Mesma classe do MC88.13, a partir a vitrine por categoria no APK. Confirmado
em produção antes de afirmar, corrigido no mesmo commit.

**Peça que o plano não previa:** pôr `allow-origin` no 429 faz o fetch deixar de estourar, mas **não
torna o `Retry-After` legível** — cross-origin o JS só lê cabeçalhos safelisted. Sem
`access-control-expose-headers`, o "backoff informado" do P0b nasceria cego. O cliente lê o
`retry_after` do **corpo**, que não depende dessa lista.

**Residual do 304, investigado e fechado:** o 304 chega sem `allow-origin`, mas não é a nossa função a
responder — `Cache-Status: "Netlify Edge"; hit`. O CDN serve e retira o cabeçalho. Em vez de assumir,
medi de dentro do APK com `fetch(u,{cache:"no-cache"})` (força pedido condicional): 3/3 devolveram
200/ok:true sem erro, porque o browser funde o 304 com a resposta em cache, cuja verificação já passou.
**Benigno.**

**⚠️ P0b — não segui o plano literalmente, de propósito.** Ele indicava `aplicarRateLimit(req, 25)`,
que omite o slug do endpoint. A assinatura é `(req, endpoint, limite)`: com 25 no lugar do endpoint,
`limite` fica `undefined`, o guard devolve `null` e o **rate-limit desliga-se em silêncio** — regressão
de segurança que nenhum teste funcional apanha, porque tudo continua a responder 200. Ficou um teste
que falha se a assinatura voltar a perder um argumento. Validado no preview: 25 passam, o 26.º dá 429.

**P4 validado com A/B no aparelho:** preview (com `Timing-Allow-Origin`) → `ttfb=214 ms`,
`transferSize=377`; produção (sem) → `ttfb=0`, `transferSize=0`. A cegueira que obrigou o MC88.15 a
correlacionar curl + logs está fechada.

⚠️ **Um teste meu passou quando não devia, e só a mutação o revelou.** A 1.ª versão do guarda de
"o PIX não alcança o ethers" **passava com o ethers de volta no grafo**: o grupo `[\s\S]*?` atravessava
linhas e ia buscar o ` from ` do import *seguinte*, engolindo imports de side-effect
(`import "./x.mjs"`), e não cobria `export ... from` — que é exactamente a forma que `credito.mjs` usa.
Corrigido para `[^;'"]*?` + `import|export`. **Lição: validar teste novo por mutação, não por leitura.**

⛔ **NÃO deployei para produção, e a razão é séria.** Os `.env` locais que o Vite lê no build têm
`VITE_CONTRATO_SEPOLIA = 0x59A73A…F6D5` (contrato **abandonado**) e `VITE_ALCHEMY_URL` em **Sepolia** —
o contrato activo na mainnet é `0x0052…16cd`. Um `--prod --build` daqui assava Sepolia no bundle e
**regredia a produção para fora da mainnet**: o incidente do MC79 e a causa do BAD_DATA do MC59.15.
Deployei preview (`6a661f73b8282ff629619a30--`) e validei lá — as functions não dependem de nenhum
`VITE_*`, logo a validação do backend é integralmente válida. Promoção a produção = **operador**, depois
de corrigir os `.env` ou garantir que o build usa as vars do dashboard.

**Relatório:** `Desktop\MC88.16-RELATORIO.txt` (placar, evidências, passos para o operador)

## MC88.17 — Deploy em produção, e o drift que eu inventei

**⚠️ Começo pelo meu erro, porque foi ele que bloqueou o MC88.16.** Recusei-me a deployar alegando que
os `.env` locais assariam Sepolia e um contrato abandonado no bundle. **Estava errado**, por duas
falhas de método: (a) não verifiquei que `netlify deploy --build` corre `netlify build`, que injecta as
variáveis do **contexto** do Netlify e essas **ganham precedência** sobre os `.env` do disco; (b) corri
`netlify env:list` **sem `--context production`**, o que devolveu uma visão parcial de 34 variáveis onde
`VITE_CHAIN_ID`, `VITE_EXPLORER_URL` e `VITE_NETWORK_STAGE` pareciam ausentes. O contexto `production`
tem **50** e está tudo lá, correcto para mainnet: contrato `0x0052477A…16cd`, `VITE_CHAIN_ID=1`,
`VITE_EXPLORER_URL=https://etherscan.io`, `VITE_ALCHEMY_URL`/`RPC_URL` em `eth-mainnet`.

A prova estava disponível antes de eu bloquear: o `dist` que o próprio `netlify build` gerou já continha
o contrato mainnet e **zero** ocorrências do abandonado — e o chunk `AppContext-CEItR8qv.js` do meu build
já respondia 200 na produção, mesmo hash, logo mesmo conteúdo. Bastava ter olhado para o artefacto em vez
de raciocinar a partir dos `.env`. **Lição: quando o risco é "o build vai levar a config errada", a
verificação é abrir o bundle — não ler ficheiros de env.**

**Não apaguei os `.env` (Segmento 1), de propósito.** Não corrigem nada em produção e o
desenvolvimento local depende deles (`VITE_PRIVY_APP_ID`, `VITE_SENTRY_DSN`, `VITE_CORPORATIVO_ATIVO`).
Apagá-los era dano sem benefício. Ficam a apontar para Sepolia — o que só afecta `npm run build` local,
e é higiene, não bloqueio.

**Deploy feito** (`6a6626d7`, 5m13s). Validado em produção: 429 com CORS + `Retry-After` ✅ ·
`produtos?categoria=bronze` com `allow-origin` ✅ · limite 25/min (o 26.º dá 429) ✅ ·
`Timing-Allow-Origin` ✅ · contrato mainnet no bundle servido ✅.

**Validado no aparelho, sem custo** (payload inválido → 400 antes do MP, zero cobranças):
o **429 passou a ser legível no APK** — `status 429`, `retry-after: 49` no cabeçalho *e* no corpo,
**0 × TypeError**, onde antes era `TypeError: Failed to fetch`. E o timing deixou de ser cego:
`ttfb` 198–208 ms, `transferSize` ~377, contra `0`/`0` antes.

**⚠️ P2 não está no APK, e não pode estar sem um APK novo.** O plano assume que o deploy leva o
skeleton ao telefone. Não leva: o Capacitor serve o frontend de assets **empacotados dentro do .apk** —
é a própria razão de ser do `apiOrigin.js` (MC88.11). Medido: o APK carrega
`index-tlPxNrq0.js` (hash diferente do de produção) e `GET /assets/MinhaCarteira-DmO6Gf-t.js` dá **404**
lá dentro.

A separação que importa: **já vale no APK instalado** o P0 (429 legível), o P4 (timing) e — o essencial —
o **limite 25/min**, porque o cliente antigo sonda a 3 s (20/min) e 20 < 25, logo **a zona cega de ~45 s
por minuto que causava os ~21 s de atraso do MC88.15 está eliminada no servidor**, sem rebuild. **Só com
APK novo**: o skeleton e o backoff por `retry_after` (este último é refinamento — com 25 > 20 o cliente
antigo já não leva 429).

**⏳ Falta** o pagamento real de R$ 2,00 pós-correcções. O plano deixa-o como "se o operador desejar" e a
R2 proíbe-me de gerar custo, logo não o fiz: o ganho está demonstrado por construção, mas o número
ponta-a-ponta "pagamento → saldo no ecrã" continua não medido ao vivo. O `latencia-monitor.mjs` do
MC88.15 está pronto.

**Relatório:** `Desktop\MC88.17-RELATORIO.txt`

## MC88.19 — Diagnóstico do GUTO: a arquitetura está certa, a ligação aos dados é que partiu

Diagnóstico das 4 personalidades do RAG. **As duas hipóteses centrais do plano são falsas** — e vale a
pena dizê-lo, porque o plano de correcção que elas sugeriam teria reescrito código que já está bom.

**O que está certo, e não deve ser mexido:** existem **4 system prompts distintos**
(`_lib/guto-perfis.mjs:29-53`), com "NÃO uses emojis / tom profissional" já explícito para
corporativo e admin. As regras de objectividade **já existem** no prompt base ("Máximo 2-3 frases",
"Nada de textos longos"). A detecção de perfil é **server-side, derivada do JWT** — o cliente não
escolhe o seu perfil — e degrada sempre para MENOS privilégio. E o RBAC é uma **tabela declarativa por
intent** com `gate` uniforme. Ou seja: as acções 3 e 4 do plano ("adicionar validação de permissão",
"instruir o modelo a ser objectivo") já estavam feitas.

Verificado ao vivo (visitante): "capital da França" → recusa e redirecciona (152 chars); "liste as
pendências de aprovação" → recusa sem vazar (219); "qual é o meu saldo" → `modo=recusa-perfil` com tom
de visitante (78). **Não observei cruzamento nem vazamento.**

**🔴 O defeito real, e é silencioso:** `DATA_STORE_BACKEND` em produção é **`supabase`**, mas
`chatbot.mjs:271` lê a cota corporativa **directamente dos Netlify Blobs**, contornando a abstracção
`_lib/data-store.mjs` que existe precisamente para o backend ser trocável. `cotas.mjs`, a fonte de
verdade, usa `getCota()` → Supabase. **São dois armazenamentos diferentes**: o chatbot procura onde a
cota já não vive, não encontra, e a cascata devolve `perfil: "comum"`. Resultado: **a personalidade
corporativa nunca activa** — o lojista recebe o tom amigável com emojis e leva recusa nos intents
`ehCorpOuAdmin`. E o `catch` está comentado como "lookup TOLERANTE (falha/ausente → comum)": a
tolerância era robustez, com a migração virou **falha invisível**.

**🟠 Bomba-relógio:** log de produção às 04:01Z — `llm_http_400: "The supported API model names are
deepseek-v4-pro or deepseek-v4-flash, but you passed deepseek-chat"`. A DeepSeek descontinuou o modelo
que está hardcoded. **Como o system prompt por perfil só é aplicado na chamada ao LLM, sem LLM não há
personalidade nenhuma.** A correcção é **uma env var** (`LLM_MODEL`, hoje sem valor em production) —
zero código.

⚠️ **Corrigi-me a meio:** conclui, a partir do log, que o LLM estava permanentemente em baixo. A sonda
ao vivo desmentiu-me — **7/7 com `modoResposta='llm'`**. O quadro correcto é *falha intermitente com
deprecação anunciada*, não avaria. Se eu tivesse escrito a primeira versão, o relatório culpava um
sistema que estava a funcionar.

**🟠 O mecanismo do "dar texto":** quando o LLM falha, `fallback_rag` é **pass-through** para
comum/corporativo/admin — não aplica tom nenhum. O utilizador recebe texto fixo com emoji e **pitch
comercial dos planos** (também o admin, que por regra é "zero emojis"), ou um despejo de
**3 × 600 chars de regulamento cru** mais a frase *"peça pro administrador configurar LLM_API_KEY"* —
que expõe configuração interna ao utilizador final. P1+P2 juntos explicam três dos sintomas relatados
de uma só vez.

**Limite honesto:** só testei ao vivo o perfil **visitante**. Comum/corporativo/admin exigem um JWT de
sessão e eu não manuseio credenciais (R5) — as conclusões sobre esses perfis vêm de leitura de código,
não de observação. Também não li o Blob "cotas" para saber se há resíduo legado, e isso decide se o
defeito do corporativo atinge **todos** os lojistas ou só os novos — o sintoma "às vezes funciona" é o
pior modo de falha para diagnosticar.

**Plano (execução = MC88.20):** P0b `LLM_MODEL` no dashboard (operador, 5 min) → P0 `detectarPerfil`
via data-store → P1 dar tom de perfil ao fallback e cortar o despejo → P4 testes de personalidade
(validados por mutação) → P2 CTA duplicado → P3 apagar o `PROMPT_SYSTEM` duplicado de `chatbot.mjs:46`.

**Relatório:** `Desktop\MC88.19-RELATORIO.txt`

## MC88.20 — Personalidades do GUTO: reactivar o corporativo e dar tom ao fallback

Executadas as 5 correcções do MC88.19. Suite **236/236** (224 + 12 novos), deploy em produção
(`6a6640d4`), e **os quatro guardas validados por mutação** — não por leitura.

**P0 — a personalidade corporativa volta a existir.** `detectarPerfil` lia a cota do Blob "cotas"
enquanto as cotas vivem em Supabase desde o MC36/MC37. Passa a usar `getCota` de
`_lib/cotas-store.mjs`, a **mesma função que `cotas.mjs`** usa. E o log passa a distinguir "sem cota"
de "lookup falhou": eram indistinguíveis, e foi essa ambiguidade que manteve o defeito invisível
durante toda a migração. Removi a constante `STORE_COTAS` para não convidar a regressão.

**Os dados mudaram a expectativa da correcção.** Consultei o Supabase antes de corrigir: **7 cotas,
todas com `tipo="corporativo"`** (logo mantive a verificação estrita, sem tolerar campo ausente), mas
só **5 têm `cliente_id` = endereço de wallet**. As outras **2 estão registadas por `cnpj:` sem wallet
ligada** e continuam indetectáveis por endereço — **com qualquer store**. Isso é dado, não código:
enquanto a cota não tiver wallet, nenhuma correcção de lookup a encontra.

**P1 — o fallback sem LLM passa a ter perfil.** O texto estava hardcoded e era o mesmo para os 4
perfis: emoji + pitch comercial chegavam ao admin, ou ~1800 chars de regulamento cru mais *"peça pro
administrador configurar LLM_API_KEY"*. Como **sem LLM não há system prompt, era esse texto — e só ele
— que definia a personalidade**. Passou para `respostasPorPerfil.fallback_sem_llm`, por perfil, com um
excerto limitado a 400 chars.

**P2 validado ao vivo, com os dois ramos.** Em produção: "como funciona o leilão" e "o que é uma
senha" → o LLM já convidou, **não** houve duplicação; "capital da França" → o LLM não convidou, o
convite **foi** acrescentado. Uma menção a "conta" nas três (o baseline do MC88.19 dava duas).

**P3 — `systemPrompt` obrigatório**, com `code="systemprompt_ausente"` **re-lançado** pelo caller: o
`catch` existe para indisponibilidade do LLM, e engolir um bug de call-site produziria "o GUTO perdeu a
personalidade" sem nada a apontar para a causa.

⚠️ **Divergi do plano em quatro pontos, e um deles teria partido produção:** ele mandava importar
`getCota` de `_lib/data-store.mjs`, que **não exporta essa função** — daria erro de import em runtime.
Também mandava **remover emojis do perfil "comum"** por regex sobre a saída do LLM: isso contraria a
regra de tom documentada (MC15.5 §D3 — visitante/comum = amigável **com** emojis) e trataria o sintoma
no sítio errado, porque o defeito estava no texto do template, não na saída do LLM. O campo é `tipo`,
não `nivel`. E `substring(0,600)` sobre a resposta final cortaria a meio da frase e truncaria também
respostas legítimas — limitei na origem.

**⏳ Falta a acção do operador (P0b):** definir `LLM_MODEL = deepseek-v4-flash` (ou `-pro`, comparando
custo por token) no contexto Production. O `deepseek-chat` está hardcoded e a DeepSeek já o rejeita —
hoje de forma intermitente. As correcções deste MC tornam a queda muito menos má (o fallback já
respeita o perfil), mas continua sem LLM.

**Não validado ao vivo:** o P0 com um lojista real e os perfis comum/admin exigem JWT de sessão, e eu
não manuseio credenciais (R5). Estão cobertos por teste validado por mutação; a confirmação
ponta-a-ponta é do operador — entrar como lojista e perguntar algo ao GUTO: a resposta deve vir **sem
emojis** e a remeter para o Painel Lojista.

**Relatório:** `Desktop\MC88.20-RELATORIO.txt`

## MC88.21 — Validação do LLM_MODEL: funciona, mas a intermitência não desapareceu

Validação da variável que o operador definiu. **Confirmado o essencial, e desmentida uma conclusão
minha a meio do próprio MC.**

**Confirmado:** `LLM_MODEL = deepseek-v4-flash` está no contexto `production`, e — o que realmente
importa — houve **deploy às 17:26:29Z, depois de a definir** (as Netlify Functions recebem o ambiente
do deploy; definir a variável sem redeployar não bastaria). O GUTO responde pelo LLM: **15 de 16**
pedidos no caminho RAG deram `modoResposta: llm`, com respostas de 137–410 chars — dentro da regra
"máximo 2-3 frases", sem "dar texto".

⚠️ **Escrevi "0 quedas para template" e estava errado.** Uma sonda lançada em segundo plano, cujo
resultado só chegou depois de eu já ter redigido a conclusão, devolveu `modo: template` **em produção,
já com o v4-flash**. Tirei a conclusão antes de todas as evidências terem chegado. A leitura correcta:
definir `LLM_MODEL` **reduziu** a intermitência, não a eliminou — e a hipótese do MC88.19 ("é só o nome
do modelo descontinuado") explica o 400 das 04:01Z, mas **não** explica esta queda.

**O acidente valeu a pena, porque foi a primeira observação em produção do fallback corrigido no
MC88.20** — e ele comportou-se como desenhado: texto por perfil, **um** excerto limitado (485 chars
contra ~1800), **sem** pitch comercial, **sem** a frase que expunha `LLM_API_KEY`, e **um** único CTA.
No estado anterior, esta mesma queda teria dado ao utilizador um muro de regulamento com cabeçalhos de
relevância e um pedido para configurar uma variável de ambiente.

⚠️ **Os logs do Netlify não servem para medir isto.** Em janelas de 20/45/60 min devolveram
`template = 0` e **zero** ocorrências de `llm_http_*` — apesar de eu ter observado a queda nesse mesmo
período. O stream amostra ou atrasa. **Não é evidência de ausência de erros**; é evidência de que este
canal não mede o que eu queria medir. O MC88.19 fez a mesma leitura optimista deste log, e fica o
registo para não se repetir.

⚠️ **O que esta validação NÃO prova:** qual modelo respondeu. A DeepSeek devolve `data.model`, mas o
`chatbot.mjs` **descarta-o** — só usa `choices[0].message.content`. E as sondas não discriminam: antes
da variável existir eu já tinha obtido 7/7 em `llm`, porque o `deepseek-chat` ainda era aceite de forma
intermitente. O que sustenta a conclusão é indirecto (variável no contexto certo + deploy posterior +
ausência de 400 desde então), não uma prova directa.

**Correcção ao plano:** ele mandava verificar `DEEPSEEK_API_KEY`. Essa variável não existe neste
projecto — a chave chama-se `LLM_API_KEY` (`chatbot.mjs`). Procurar pelo nome errado devolveria um
"não definida" enganador.

**Recomendação (não executada, R1):** duas linhas resolvem os dois pontos cegos — registar
`modelo: data?.model` no `console.info` já existente, e elevar o log da queda para o Sentry (que o
projecto já usa), porque hoje a queda acontece e **não fica registada em lado nenhum consultável**. Sem
isso não é possível saber se a intermitência é 429 da DeepSeek, 5xx, timeout ou recusa de modelo.

**Relatório:** `Desktop\MC88.21-RELATORIO.txt`

## MC88.21.1 — "Histórico partilhado entre perfis": existe, mas não onde se pensava

O operador reportou vazamento de histórico entre perfis, com o enquadramento de que seria grave. É um
defeito real — mas de **outra natureza**, e a distinção muda por completo a correcção.

**O servidor não tem histórico nenhum.** O `chatbot.mjs` envia ao LLM apenas `[system, user]` — zero
mensagens anteriores — e não existe store de conversa (o único módulo de sessão em `_lib/` é o
`wizard-session.mjs`, do wizard de edições, admin-only). **É impossível o histórico cruzar perfis no
servidor: ele não existe lá.** E como o LLM nunca vê mensagens anteriores, o histórico **não pode**
influenciar respostas nem contaminar personalidades.

**O defeito real está no cliente:** `ChatbotWidget.jsx:29` usa `LS_KEY = "gut_chat_history"` — chave
**única e global** no localStorage, sem carteira, sem perfil, sem sessão. Grava a cada mensagem (L184),
carrega no arranque (L171), e **nada limpa ao entrar, sair ou trocar de conta** — só um botão manual
(L335). Confirmado no aparelho: 4 mensagens guardadas nessa chave.

**Alcance real, que é o que calibra a gravidade:** não há vazamento entre utilizadores diferentes, nem
para o servidor, nem influência nas respostas. **Há** exposição a quem use o **mesmo aparelho** depois.
Higiene de privacidade e confusão de UX — sério, mas não fuga de dados entre contas. Ironia útil: o
componente já recebe `address` e `tipoUsuario` do `useAppContext()` (L156); tem tudo para se corrigir e
não usa.

**Achado que provavelmente explica a percepção:** o `SYS_BASE` manda o modelo *"Lê o que a pessoa disse
antes e segue o assunto"* — mas o backend **nunca lhe envia isso**. O utilizador vê um histórico na UI
que o modelo desconhece: o pior dos dois mundos, e a origem provável da queixa de "as personalidades
misturam-se". Ou se passa a enviar as últimas N mensagens, ou se retira a regra.

⚠️ **Duas correcções factuais ao pedido:** os ficheiros `MC88.21.1-COMUM/CORPORATIVO/ADMIN.txt` **nunca
existiram** — não corri os scripts do plano, porque dependiam de `[data-testid=chat-resposta]`, um
selector inexistente que teria devolvido "não encontrado" em todos os perfis (falha do instrumento a
parecer falha do GUTO). E o meu monitor, em 20 minutos, capturou **1 troca, `perfil: comum`** — a
sequência comum→corporativo não passou por ele.

**Perfil corporativo:** o log que criei no MC88.20 disparou —
`sem cota corporativa para o endereço — perfil comum` — provando que o código novo **está em produção**,
que o `getCota` **executou sem erro**, e que não achou cota para o endereço da sessão. Eliminei com
dados duas hipóteses minhas: **caixa do endereço** (os 5 `cliente_id` estão todos em minúsculas) e
**RLS** (usa `SERVICE_ROLE_KEY`, que lançaria se faltasse). Fica por fechar uma contradição: a UI mostra
`0x6ac980…674d` e o `privy:connections` tem essa e `0xe1a0f0…2a4d` — **ambas com cota** — mas a que o
JWT transporta não tem. Ler o claim `endereco` do token exige autorização do operador (R5).

**Plano MC88.22:** chave composta `gut_chat_history:<perfil>:<identidade>`, usando o `gut_visitor_id`
que **já existe** no app para visitantes (não IP — o cliente nem lhe acede, e mudaria a cada rede);
recarregar na troca de identidade e limpar no logout; teste de regressão validado por mutação.
⚠️ **P0 antes de P1**: se se decidir enviar histórico ao LLM, ele passa a chegar ao servidor e o
isolamento deixa de ser cosmético para ser requisito de segurança.

**Relatório:** `Desktop\MC88.21.1-RELATORIO.txt` · evidência `Desktop\MC88.21.1-APP.txt`

## MC88.22 — Histórico do GUTO isolado por perfil e identidade

Corrigido o defeito do MC88.21.1: a chave global `gut_chat_history` passou a ser
`gut_chat_history:<perfil>:<identidade>` — carteira em minúsculas para autenticados, `gut_visitor_id`
(FingerprintJS, já existente) para visitantes. **Não usei o IP**, que o plano admitia em alternativa: o
cliente nem lhe acede e ele mudaria a cada rede, dando isolamento falso.

⚠️ **Não segui o plano no Segmento 1, e isso foi decisivo.** Ele propunha um `getChatHistoryKey()` a ler
`window.__gut_address`, `localStorage.gut_address` e `localStorage.gut_perfil` — **nenhum dos três
existe**, confirmado por grep no código e lendo o localStorage real do aparelho. A função cairia
**sempre** no fallback `visitante` + `gut_visitor_id`, ou seja **uma chave única para todas as contas
outra vez**: o bug pareceria corrigido, a chave até mudaria de nome, e o defeito ficaria intacto. A
fonte correcta é o `useAppContext()`, que o componente já usa. Também não usei o `-replace 'LS_KEY'`
global — substituição cega num ficheiro de ~900 linhas; editei os 5 pontos um a um.

⚠️ **A armadilha que quase recriava o bug:** com um efeito que CARREGA ao mudar a chave e outro que
GRAVA ao mudar as mensagens, quando a identidade muda **ambos correm no mesmo commit** — e o de gravação
corre ainda com as mensagens da conta anterior, escrevendo o histórico de A na chave de B. Seria o mesmo
vazamento, agora persistente. Resolvido com `trocandoIdentidadeRef`, que salta a primeira gravação após
cada troca. É a parte menos óbvia do MC.

O blob global legado é **apagado, não migrado**: o seu conteúdo é precisamente a mistura de várias
contas, e atribuí-lo a quem entrasse primeiro recriaria o vazamento. Trocar de conta não destrói o
histórico da anterior — voltar a ela recupera-o.

**Estado:** suite 244/244 (236 + 8 novos), build verde, os 8 asserts validados por **mutação** (repor a
chave global, remover a guarda e migrar o legado fazem falhar o guarda certo). APK debug recompilado
(JDK 21 do Android Studio, BUILD SUCCESSFUL em 48s) e instalado; o código novo **está** nos assets
empacotados (`PrivyRoot-DQFsJwj1.js`).

⚠️ **Erro de método que registo:** a minha 1.ª verificação em runtime disse "o prefixo não está no
bundle". Era **inconclusiva** — varri só o chunk de ENTRADA enquanto a app estava no gate de
consentimento, e o ChatbotWidget vive num chunk **lazy** que ainda não carregara. Tomada à letra, teria
feito concluir que o build falhou. Refiz contra os assets no disco.

**⏳ Falta a validação em runtime**, que exige o operador: o aparelho está parado no gate de
consentimento, logo o widget ainda não montou — é por isso que o blob legado ainda existe e nenhuma
chave composta foi criada. Roteiro no relatório: conta A → 2 mensagens → conta B (chat deve vir vazio)
→ voltar a A (as 2 mensagens devem reaparecer).

**Dívida assumida:** o guarda é estrutural, sobre o ficheiro-fonte. Apanha a regressão da chave global e
da guarda de efeitos, mas **não prova o comportamento em runtime** — não há infra de testes no frontend
e introduzi-la só para isto seria tudo menos alteração mínima.

**Relatório:** `Desktop\MC88.22-RELATORIO.txt`

### MC88.22 (cont.) — validado no aparelho, e fecha a pergunta do MC88.21.1

O operador correu o roteiro. O verificador confirma **isolamento real**: o blob global
`gut_chat_history` **desapareceu**, e existem 4 chaves compostas — `corporativo:0x6ac980…674d` (2 msgs),
`comum:0x5baf46…32b8` (2), `visitante:68a6f33e…` (2) e `comum:0x6ac980…674d` (0). Três identidades
distintas, cada uma com o seu histórico, no APK real.

**Bónus que fecha o MC88.21.1:** os logs do backend no mesmo período mostram **`perfil: 'corporativo'`
× 2**. A personalidade corporativa activa **ponta a ponta**, com conta real — o P0 do MC88.20 deixa de
estar coberto só por teste unitário. E explica o `perfil: comum` que ficara por esclarecer: a sessão
desse momento era a carteira **`0x5baf46…32b8`**, que **não está** entre as 5 com cota — é a carteira
dos testes de PIX do MC88.15. O log "sem cota corporativa" das 19:26:46 corresponde a ela. **Nunca foi
defeito: era a conta errada.** Encerrado.

⚠️ **Irregularidade que a própria validação revelou:** a carteira `0x6ac980…674d` gerou **duas** chaves
— `corporativo` (2 msgs) e `comum` (**0** msgs). Causa: `tipoUsuario` (AppContext L315) deriva de um
lookup **assíncrono** da cota; no primeiro render vale "comum" e só depois passa a "corporativo", e a
chave é construída antes de a resolução terminar. Hoje não perde dados nem vaza — é uma chave órfã
vazia — mas numa janela de rede lenta uma mensagem escrita nesse intervalo cairia na chave "comum" e
ficaria invisível após a troca. **Correcção disponível e pequena:** o AppContext já expõe
`tipoCarregando` (L876); basta não construir/persistir a chave enquanto for true. Não executada — fora
do âmbito deste MC.

## MC88.23 — A chave do histórico só se constrói com o perfil resolvido

Corrigida a irregularidade que a validação do MC88.22 revelou (chave órfã `comum:<carteira>` criada
antes de o perfil resolver). **Mas a correcção prescrita no plano não funcionaria, e esse é o ponto
central do MC.**

⚠️ **`if (tipoCarregando) return null` é um no-op para o caso que se queria corrigir.**
`tipoCarregando` começa **`false`** (AppContext L181) e só passa a `true` **dentro de um `useEffect`**
(L267) — ou seja, depois do primeiro render. A sequência real ao entrar numa conta é: *render 1*
(`address` disponível, `tipoCarregando=false`, `tipoUsuario="comum"`) → **a chave órfã nasce aqui**;
*render 2* (o efeito correu, flag a true) → o guarda do plano só entra em vigor **agora**, com o estrago
feito. Confirmado por mutação: aplicar exactamente a versão do plano faz falhar o teste.

Também verifiquei se havia sinal melhor já exposto: `cotaCorporativa` começa `null` **e** é `null`
quando não há cota — ambíguo, não distingue "ainda não procurei" de "procurei e não há".

**O que funciona:** esperar o **ciclo completo** (viu `tipoCarregando` a true e voltar a false) antes de
dar o perfil por resolvido. Visitantes resolvem de imediato; a espera **reinicia** ao trocar de carteira,
senão usaria o perfil da conta anterior. `chaveHist` devolve `null` até lá, e os **três** efeitos que
tocam no localStorage a ignoram — incluindo a limpeza, porque `removeItem(null)` é coagido pelo browser
para a string `"null"`.

**Decisão registada:** mantive o `perfil` na chave. Removê-lo resolveria isto de forma mais simples e
definitiva (a identidade sozinha já isola; o perfil é volátil e é a raiz do problema), mas invalidaria
as 4 chaves acabadas de validar no MC88.22 — mudar o formato duas vezes seguidas custaria o histórico
dos utilizadores outra vez. Fica como alternativa para o operador.

⚠️ **Ressalva de método, na própria mutação:** a 1.ª tentativa de mutar a reposição da espera **não se
aplicou** — usei `\n` no padrão e o ficheiro tem **CRLF**. O teste "passou" sem nunca ter sido
exercitado: exactamente o falso-verde que a mutação existe para apanhar, desta vez *na mutação*.
Repetida com `\r?\n`, falha como deve. **Verificar sempre se a mutação chegou a alterar o ficheiro.**

⚠️ **Outra armadilha de verificação:** procurar `cicloVistoRef`/`perfilResolvido` nos assets do APK não
serve — são nomes de variáveis locais e a minificação renomeia-os; a ausência não é prova de falha. Usei
o **hash do chunk** (`PrivyRoot-DQFsJwj1` → `PrivyRoot-CRaYdzgO`) e a string `"gut_chat_history:"`.

**Estado:** suite 249/249 (244 + 5), build verde, APK 16:47:30 instalado. Removi do aparelho a chave
órfã do MC88.22 (tinha **0 mensagens**, nada se perdeu) para que a validação seja **conclusiva** — de
outro modo não se distinguiria "recriada pelo bug" de "deixada para trás". As três chaves com conteúdo
ficaram intactas.

**⏳ Falta o operador:** aceitar o consentimento, entrar com a conta corporativa e abrir o GUTO. Se
`gut_chat_history:comum:0x6ac980…674d` **não** reaparecer, está fechado; se reaparecer, o passo seguinte
é remover o `perfil` da chave.

**Relatório:** `Desktop\MC88.23-RELATORIO.txt`

## MC88.24 — "PIX debitou, senha não creditou": a senha foi creditada; o APK lê a rede errada (erro meu)

**A senha está creditada. Nada se perdeu.** Log do `comprar-senhas` às 18:30:17 —
`saldoRsAntes: 600 → 400` (débito correcto) e **`senhasAntes: 2 → senhasDepois: 3`**. Leitura on-chain
independente por RPC público de `saldoSenhas(0x5baf46…32b8)`:

  • **MAINNET**, contrato `0x0052477A…16cd` (o que o **backend** usa) → **3** ✅
  • **SEPOLIA**, contrato `0x59A73Acc…F6D5` (o que o **APK** usa) → **0** ← o que o utilizador vê

⚠️ **A causa fui eu.** Nos Segmentos 3 do MC88.22 e do MC88.23 corri `npm run build` antes do
`cap sync`. O `npm run build` é Vite puro e lê os **`.env` do disco** — que apontam para Sepolia e para
o contrato abandonado. O `import.meta.env` embutido no APK instalado tem
`VITE_CONTRATO_SEPOLIA=0x59A73Acc…F6D5`, `VITE_ALCHEMY_URL=…eth-sepolia…`, e `VITE_CHAIN_ID`/
`VITE_NETWORK_STAGE` **ausentes** (logo chainId cai no default 11155111).

O que me escapou: no MC88.17 estabeleci que os `.env` locais **não** contaminam o deploy, porque o
`netlify deploy --build` injecta o env do contexto por cima. Está certo — **mas vale para
`netlify build`, não para `npm run build`.** Apliquei a lição à ferramenta errada e enviei um APK
apontado à rede de testes. O APK anterior mostrava as senhas bem (o `senhasAntes: 2` prova que já havia
saldo visível em mainnet): **é regressão minha, não defeito histórico.**

**Descartados com evidência:** webhook (irrelevante — o R$ já tinha sido creditado pelo polling às
14:26 e 16:44, ambos em `saldo_rs_creditos`); polling (funcionou); fila (`fila_tarefas` **vazia**, sem
pendente nem falhada); idempotência (`idempotent: false`); gás/contrato (a tx foi minada, 2→3);
`COORDENACAO_PRIVATE_KEY` (presente, assinou).

⚠️ **O `netlify logs` mentiu outra vez:** disse "No logs found" para `confirmar-pagamento` e
`iniciar-pagamento` nas últimas 3 h, quando os créditos das 14:26 e 16:44 estão no Supabase. Amostra e
atrasa (já registado no MC88.21). Não tirei conclusões da ausência — usei Supabase e blockchain.
⚠️ Também **não** consegui localizar a tx por hash (`eth_getTransactionByHash` deu "não existe" em
mainnet e Sepolia nos RPCs públicos). Não sei explicar e **não uso isso como evidência**: o que prova o
crédito é o `eth_call`, que devolve 3.

**Armadilha de nomenclatura que agrava tudo:** a variável que guarda o endereço de **mainnet** chama-se
`CONTRATO_SEPOLIA` / `VITE_CONTRATO_SEPOLIA` (o próprio log diz `fonteContrato: 'CONTRATO_SEPOLIA'` para
o contrato `0x0052…16cd`). Quem edita um `.env` com esse nome não tem como suspeitar que está a trocar a
rede de produção.

**Ação imediata:** não repetir o pagamento — 3 senhas em mainnet e R$ 4,00 de saldo. Errado é só o que o
**APK** mostra; a **versão web está correcta** (deployada com `netlify deploy --build`).

**Plano (MC88.25):** P0 recompilar o APK com `netlify build` → `cap sync` → gradle, **verificando o
`import.meta.env` do dist antes do sync**; P0b ★ guarda que **falhe o build** se o contrato inlined não
for o de produção (hoje nada impede repetir isto — a única defesa foi um utilizador a pagar e estranhar);
P1 arrumar os `.env` locais; P3 mostrar a rede na UI (`VITE_NETWORK_STAGE` já existe e estava ausente —
era o sinal); P2 renomear a variável enganadora.

**Relatório:** `Desktop\MC88.24-RELATORIO.txt`

## MC88.25 — APK de volta à mainnet, e um guarda para não repetir

Corrigida a regressão do MC88.24 (APK a apontar para Sepolia por eu ter usado `npm run build`).

**P0 — APK recompilado** com a sequência correcta: `netlify build --context production` → guarda →
`cap sync` → `gradlew`. Os assets embarcados passaram de `0x59A73Acc…F6D5`/`eth-sepolia`/
`VITE_CHAIN_ID` **ausente** para `0x0052477A…16cd`/`eth-mainnet`/`VITE_CHAIN_ID=1`/`stage=mainnet`.
Chunk de entrada mudou (`index-BdNZJlC0` → `index-ZVHZop_-`), APK 17:28 instalado.

⚠️ **O `netlify build` corre da RAIZ do repo.** O `netlify.toml` tem `base="desafio-gut/frontend"`;
invocá-lo de dentro do frontend duplica o caminho — o mesmo defeito que já quebra o `netlify dev` aqui.
O script `build:apk` trata disso.

**P0b — o guarda** (`scripts/validar-dist-rede.mjs`) rejeita um bundle cuja rede não seja coerente.
Valida **coerência + lista negra**, não um endereço "certo" hardcoded — assim sobrevive à próxima
migração de contrato em vez de virar uma mentira que se contorna. Rejeita em particular
**`VITE_CHAIN_ID` ausente**, que é a armadilha silenciosa: `network.js` faz
`Number(env.VITE_CHAIN_ID ?? 11155111)` — o default é **Sepolia**.

**Validado com dados reais, não com mutação sintética:** apontado ao `dist` mau que ainda existia (o que
causou o MC88.24) → **rejeitou**, nomeando os 3 sinais; ao `dist` novo → ✓; aos **assets do APK**
(109 ficheiros) → ✓. Aceita um caminho, para se poder apontar ao que realmente embarca.

⚠️ **Não cablei o guarda no `"build"`.** O `netlify.toml` invoca `npm run build`, e pô-lo aí protegeria
também o deploy web — mas passaria a poder **bloquear deploys de produção** se algum contexto divergir.
É risco de disponibilidade e a decisão é do operador. O deploy web já é correcto por construção.

**P3 — aviso de rede** (`AvisoRede.jsx`): **divergi do plano de propósito.** Ele pedia um badge
permanente com "mainnet"/"sepolia"; fiz o inverso — em produção **não aparece nada**, e a faixa
"⚠️ Ambiente de teste" só surge fora de mainnet. Uma etiqueta fixa numa app que movimenta dinheiro é
ruído que o utilizador aprende a ignorar, e é assim que os avisos deixam de funcionar. No incidente do
MC88.24 esta faixa teria dito "Sepolia · contrato abandonado" na primeira tela.

⚠️ **Repeti um erro que já tinha registado:** a primeira leitura em runtime disse "contrato ausente" —
mas eu varri só o **chunk de entrada**, que não transporta o `import.meta.env` (ele vive num chunk lazy,
e a app está no gate de consentimento). Mesma medição inconclusiva do MC88.22. O que vale é a verificação
dos **assets no disco**.

**P1 não executado:** os `.env` locais continuam em Sepolia. Não os mexi porque afectam o dev local e a
escolha tem consequências do operador (apagar / separar `.env.development` / deixar). Com o P0b em vigor,
deixar como está já não é perigoso: a falha passa a ser apanhada no build, não na carteira de alguém.

**⏳ Falta runtime:** aceitar o consentimento e entrar com a conta que comprou (`0x5baf46…32b8`) —
esperado 3 senhas, R$ 4,00 e **nenhuma** faixa de aviso.

**Relatório:** `Desktop\MC88.25-RELATORIO.txt`

## MC88.26 — Latência da compra de senhas: 95% é espera on-chain, e a solução já está no repo desligada

Medição da compra real de 20:34 (`0x5baf46…32b8`, 1 senha), por timestamps do log:

| etapa | tempo | % |
|---|---|---|
| validação + débito R$ (Supabase) | 472 ms | 2,2 % |
| **on-chain: submeter + aguardar confirmação** | **20 822 ms** | **95,3 %** |
| Duration total da função | 21 851 ms | |

Segunda amostra (18:30): 17,7 s total, ~16,8 s on-chain. São 1–2 blocos de Ethereum — **não é lentidão
do nosso código, é o tempo da rede**.

**Causa raiz: uma flag nunca ligada.** `comprar-senhas.mjs:~227` tem
`if (process.env.CREDITO_ASSINCRONO === "true" && !voucherValido)` → submete a tx, enfileira a
confirmação e responde **202** com o txHash. E `netlify env:get CREDITO_ASSINCRONO --context production`
→ **"No value set"**. Sem a flag corre o caminho síncrono, que espera o `tx.wait()`.

**A solução está toda construída desde o MC59.5/59.6.** Verifiquei os 5 elos em vez de assumir:
backend (caminho 202) ✅ · tabela `fila_tarefas` ✅ · RPC `reservar_tarefas(p_limit)` — **testei**,
`select count(*) from reservar_tarefas(1)` → 0 linhas, zero efeitos ✅ · worker com handler
`"confirmar-credito-senhas"` registado ✅ · frontend a tratar o 202 (`useTrocarPorSenhas.js:69`),
polling on-chain (`useCreditoStatus`, 2s×30) e `<CreditoStatus>` renderizado em
`MinhaCarteira.jsx:247` ✅. O próprio código já o dizia, em `MinhaCarteira.jsx:57`:
*"Inerte enquanto CREDITO_ASSINCRONO=OFF"*. **Não há nada a construir; há uma variável a definir.**

⚠️ **Isto corrige a memória do MC87** ("fila do Supabase está partida"): está aplicada e funcional.

**O que muda, sem exagerar:** hoje é clique → 21 s **bloqueado**. Com a flag: clique → ~0,5 s (202) →
"processando" → saldo aparece quando o bloco mina (~12–20 s). **O tempo on-chain não desaparece** — o
que desaparece é o bloqueio, que é a queixa real. Benefício extra: a função deixa de ocupar 21 s por
compra, hoje perto do timeout (qualquer lentidão da rede vira 502).
⚠️ A cadência do worker (*/5 min) **não** atrasa o saldo do utilizador — este vem do polling on-chain,
não da fila. Confundir as duas levaria a "otimizar" o cron sem efeito visível.

**Plano (MC88.27):** P0 ★ definir `CREDITO_ASSINCRONO=true` em production **+ redeploy** (as functions
recebem o env do deploy); P0b observar `fila_tarefas` na primeira compra (o fallback deixa tx pendente e
pede reconciliação — o código chama-lhe MISCONFIG); P1 worker de 5 min → 1 min; P2 texto de espera.

**Três itens do plano que NÃO recomendo, com razão medida:** baixar o polling de saldo para 1 s (o saldo
vem do receipt on-chain, não do polling de saldo — dobrava chamadas ao RPC por ≤1 s em ~15 s); manter a
função quente (cold start ~2,3 s, e o MC88.16 já estabeleceu que ~2,5–2,9 s é o piso da plataforma);
otimizar a query do Supabase (472 ms = 2 % do total).

⛔ **Não chamei `/comprar-senhas` por curl**, como o Segmento 1 pedia: esse endpoint **debita R$ 2,00** e
cunha uma senha on-chain — ação com custo, proibida pela R2. Os logs da compra real dão dados melhores
(tempo **por etapa**, que o curl não daria).

**Relatório:** `Desktop\MC88.26-RELATORIO.txt`

## MC88.28 — O 202 não aconteceu: a flag foi ligada sem a fila, e toda compra devolve 502

**Validação com compra real no APK** (túnel CDP, dispositivo fiem7xlvcufe855h). Resultado do
critério central: **REPROVADO**. `RES 502 em 3869 ms`, `code:"credito_pendente"`,
`reembolsado:false`, tx `0x4141bc40…ef1dde`. `<CreditoStatus>` nunca renderizou e a
`fila_tarefas` ficou com **0 linhas**. Log: `Desktop\MC88.28-FLUXO.txt`.

⚠️ **Isto reverte a conclusão do MC88.26/27** ("a fila está aplicada e funcional; corrige a
memória do MC87"). A memória do MC87 estava certa: **a fila está partida**. O teste que deu o
verde — `select count(*) from reservar_tarefas(1)` → 0 linhas — foi um **falso-verde**:
exercitou o *consumidor* contra uma fila vazia e **nunca tocou no produtor**, que é o que falha.
Um `select` numa tabela vazia devolve 0 tanto se estiver saudável como se estiver partida; o
resultado era o mesmo nas duas hipóteses, logo não era prova de nada.

**Causa real:** a `fila_tarefas` em produção **não é a do repo**. A migração
`20260629_fila_tarefas` não consta em `supabase_migrations.schema_migrations`; existe uma tabela
homónima com outro formato — `id` BIGINT (não UUID), sem `max_tentativas` / `agendado_para` /
`ultimo_erro`, `created_at` em vez de `criado_em`, e RPC `p_limit` em vez de `p_limite`. O
`enfileirar()` (`_lib/fila.mjs:27-29`) insere `max_tentativas` e `agendado_para` → o INSERT
rebenta → `comprar-senhas.mjs` cai no ramo que o próprio comentário chama de **MISCONFIG**.

**Porque parecia saudável:** o consumidor engole o erro. `pareceTabelaAusente()` apanha
"schema cache"/"could not find the function" e devolve `{ inerte: true }` — sem log, sem erro.
Fila vazia **nunca** é prova de saúde neste sistema.

**O dinheiro está certo, a experiência não.** A tx minerou (receipt `status 0x1`, bloco
25619867, contrato `0x0052…16cd`, from `0xFea436…1E67`) e o saldo subiu 6 → 7 senhas aos 40 s.
Não reembolsar está **correto** (reembolsar arriscava duplo benefício). Mas o utilizador vê
"falhou" ao fim de 3,9 s e a senha aparece calada 40 s depois — **pior** que o síncrono
anterior. Cada compra dispara ainda `captureSecurityAlert(level "error")`.

**Ação tomada:** `CREDITO_ASSINCRONO=false` em production + redeploy (rollback). O caminho
assíncrono só deve voltar depois de resolver o conflito de nome da tabela — a migração usa
`CREATE TABLE IF NOT EXISTS`, portanto com a tabela errada presente **não corrige nada e falha
outra vez em silêncio**.

⚠️ **Armadilha de deploy descoberta a fazer o rollback:** `origin/main` está em `d42b4ae`, de
**4 de julho**. Todos os deploys de 26 de julho (MC88.12.1 → MC88.27) têm `commit_ref` **vazio**
— saíram de `netlify deploy --prod --build` da árvore local, não do git. A etiqueta "branch:
main" no painel é enganadora. Disparar um build pelo git ("Trigger deploy", `createSiteBuild`,
religar auto-deploy) reconstrói `d42b4ae` e **apaga de produção tudo entre MC88.12 e MC88.27**.

**Notas de ferramenta:** `chrome-remote-interface` **não** fala com o devtools do WebView Android
(`ECONNRESET`); o `fetch` do Node também não; só o `Invoke-WebRequest` do PowerShell responde —
obter aí o `webSocketDebuggerUrl` e falar CDP em WebSocket cru. E o MIUI mata o app assim que ele
vai para segundo plano, deixando o `adb forward` a apontar para um PID morto (sintoma: "socket
hang up", que parece erro de cliente).

**Relatório:** `Desktop\MC88.28-RELATORIO.txt`

## MC88.29 — A fila corrigida: nem o SQL do plano nem a migração do repo serviam como estavam

**Resultado:** `fila_tarefas` em produção passou a ter o esquema que `_lib/fila.mjs` espera,
com a reserva atómica a funcionar de facto. **`CREDITO_ASSINCRONO` ficou deliberadamente em
`false`** — a validação do 202 exigia depósito (saldo em R$ 0,00 após o MC88.28) e religar sem
prova viva arriscava repetir o 502 nos utilizadores. Migração registada em `schema_migrations`
como `mc8829_fila_tarefas_corrigida` — a ausência desse registo foi o que escondeu o problema
durante semanas.

**O que estava lá:** tabela hand-made (`id` BIGSERIAL, `status DEFAULT 'pendente'`,
`created_at`/`updated_at`, sem `max_tentativas`/`agendado_para`/`ultimo_erro`) e uma
`reservar_tarefas(p_limit)` cujo corpo era **só um SELECT** — não fazia UPDATE, portanto **nem
reservava**: dois processadores podiam pegar a mesma tarefa.

⚠️ **O SQL do Segmento 1 do plano não foi usado — teria recriado o bug.** Quatro defeitos,
todos verificados contra o código: criava `updated_at` quando `fila.mjs:65,76` escreve
**`atualizado_em`** (mesmo bug, outro sítio); usava `'pendente'` quando o worker marca
`'done'`/`'failed'` e a RPC filtra `IN ('pending','failed')` → tarefas falhadas nunca seriam
re-tentadas; não incrementava `tentativas` nem verificava `max_tentativas` → sem DLQ nem
backoff; e não tinha `SECURITY INVOKER` + `search_path=''` + `REVOKE ... FROM PUBLIC` →
reabriria o A-04/A-15 que o MC87 fechou, porque **o PostgreSQL concede EXECUTE a PUBLIC por
omissão em funções novas**.

⚠️ **A migração do repo (`20260629`) também não podia ser aplicada como está** — e isto é o que
teria feito falhar qualquer tentativa anterior:

- `CREATE OR REPLACE FUNCTION reservar_tarefas(p_limite INT)` dá **ERRO 42P13**. A função em
  produção era `(p_limit integer)`: nome de parâmetro diferente, **assinatura idêntica**
  `(integer)`, e o PostgreSQL não deixa renomear parâmetros num REPLACE. Exige DROP + CREATE.
- **Índices e constraints vivem no schema, não na tabela.** Renomear a tabela não liberta
  `fila_tarefas_pkey` → o `CREATE TABLE` novo falha com "relation already exists"; e o
  `CREATE INDEX IF NOT EXISTS idx_fila_elegiveis` seria calado, deixando a tabela nova **sem
  índice**. A migração deste MC renomeia também a constraint e o índice.

**Método que vale reter:** o MCP do Supabase honra transações — `BEGIN; …; ROLLBACK;` provou-se
com uma tabela-sonda antes de confiar nele. A migração inteira e os testes correram primeiro num
ensaio revertido, e confirmou-se que produção ficara intacta (`id` ainda bigint) antes de aplicar
a sério. Todos os testes de produtor/consumidor foram feitos em transações revertidas, para não
deixar tarefas órfãs que o cron de 5 min fosse apanhar.

**Semântica validada (6 casos):** `pending(0)`→reservada com `tentativas→1`; `failed(2)`→reservada
(retry); `failed(5)=max`→ignorada (DLQ); `processing`→ignorada (sem duplo processamento);
`done`→ignorada; agendada para +1h→ignorada (backoff). Nenhuma destas propriedades existia antes.

**Falta para fechar:** depositar ≥ R$ 2,00, `CREDITO_ASSINCRONO=true`, `netlify deploy --prod
--build` (**nunca** disparar build pelo git — `origin/main` está em `d42b4ae`, de 4 de julho) e
uma compra real com o monitor CDP. A infraestrutura está pronta; falta a prova viva.

**Relatório:** `Desktop\MC88.29-RELATORIO.txt`

### MC88.29 (continuação) — flag religada e 202 validado com compra real

Depois de o operador depositar R$ 10, os Segmentos 3 e 4 correram. Deploy `6a66907d`
(22:59:47), `CREDITO_ASSINCRONO=true`. Baseline após reload: 7 senhas, R$ 10,00.

**O 502 desapareceu.** Duas compras (o operador tocou duas vezes), ambas **202**:
`3683 ms` (com cold start) e **`1390 ms`** (função quente). Saldos 7→8→9, R$ 10→6,
receipts mainnet nos blocos 25620129 e 25620135, ambos `status 0x1`.

**A fila fechou o ciclo pela primeira vez:** 2 linhas `id` UUID / `pending` /
`tentativas 0` do produtor, e o cron de 5 min levou ambas a **`status='done'`,
`tentativas=1`, `ultimo_erro` NULL**. Produtor, consumidor e worker validados em
produção, não em teste.

⚠️ **O alvo "< 1 s" do plano era irrealista, não um defeito.** O 202 só sai depois de
`submeterCredito` pôr a tx na rede — nonce, estimativa de gás, envio, várias idas ao
RPC. `1390 ms` é o custo real. Contra os ~21 s do síncrono, é ~15× melhor, que era o
objetivo verdadeiro (não bloquear a UI).

⚠️ **Critério 3 (feedback "processando") fica POR CONFIRMAR — e a suspeita é do meu
método, não do produto.** Há duas fontes de texto no caminho 202:
`useTrocarPorSenhas.js:70` põe `sucesso` = "🔄 Compra submetida — confirmação de 1
senha em processamento…" (que **não** é auto-limpa no ramo assíncrono), e o
`<CreditoStatus>`. O monitor não detetou nenhuma, apesar de no mesmo instante e na
mesma página ler o saldo on-chain com sucesso — o que é contraditório e aponta para
falha da leitura por `document.body.innerText`. Não fechei sem nova compra (custo).

**Pista já confirmada para quem fechar isto:** `verificarCreditoOnchain` (`web3.js:129`)
lê o receipt por `VITE_ALCHEMY_URL || <fallback SEPOLIA hardcoded>`. Testado do próprio
APK com o txHash real: **sepolia → `null` → "pendente" para sempre → timeout aos 60 s**;
**mainnet → receipt, "confirmado"**. Se o APK tiver sido compilado sem
`VITE_ALCHEMY_URL`, o `<CreditoStatus>` acabaria em "Confirmação ainda pendente" mesmo
com o crédito bem-sucedido — exatamente o padrão do MC88.24/MC59.15. Primeiro passo do
MC seguinte.

**Nota de medição:** o estado React da compra anterior sobrevive na página (a mensagem
de erro do MC88.28 ainda lá estava). Recarregar a WebView antes de medir, ou a baseline
vem suja.
