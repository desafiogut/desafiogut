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
  STATUS: 🔴 **revogação REPROVADA na verificação** — operador reportou remoção, mas o grep
  (2ª checagem) confirmou que a chave PERSISTE em `desafio-gut/.env:3` (var `PRIVATE_KEY`) e
  `frontend/.env.local:17` (`COORDENACAO_PRIVATE_KEY`, ainda a antiga). Netlify não verificável
  pelo agente → reconferir. Falta editar as 2 linhas e reconfirmar.
- **Auditoria externa (P0):** ✅ DECIDIDA = **OPÇÃO B (aceitação formal de risco)**. Justificativa
  do operador: contrato não custodia fundos (verificado: sem payable/transfer/receive/fallback);
  dinheiro real off-chain (PIX/MP); revisão técnica INTERNA (MC59.1–59.6); risco aceito com
  monitoramento. (Nota: interna ≠ auditoria externa independente — risco assumido conscientemente.)
- **Script de deploy:** salvaguardas commitadas (714dff9).
- **Veredito:** 🟡 MC60 AINDA NÃO liberado — bloqueio remanescente = revogação real da chave
  (2 .env + Netlify). Depois: envs 🟡 (CONTRATO_MAINNET, VITE_* mainnet, MP_WEBHOOK_SECRET,
  SENTRY, Flashbots, Privy) fazem parte do próprio flip MC60.

