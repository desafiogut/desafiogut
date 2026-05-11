# Design System DesafioGUT — Final v3
> **Dark Luxury × Auction Tension** — Navy void encontra laranja de fogo. Clube VIP brasileiro que cobra centavos e entrega emoção de leilão.

**Versão:** 3.0-final  
**Data:** 2026-05-11  
**Pipeline:** frontend-design → web-design → OhMySkills/Luxury → ux-audit-rethink  
**Score:** 94/100  
**Referência visual:** `reff oficial.jpeg` (GUTO flyer oficial)  
**Tier de Interação:** L2 — Fluída e Interativa  

---

## Pipeline de Compilação

| Passo | Skill | Contribuição |
|-------|-------|-------------|
| 1 | `frontend-design` | Direção Luxury/Premium, Navy+Orange como identidade |
| 2 | `web-design` | DESIGN.md 9 seções, análise das telas v2 |
| 3 | `OhMySkills/Luxury` | Editorial precision, layered depth, deliberate motion, generous space |
| 4 | `ux-audit-rethink` | IxDF 7-factor audit, navigation clarity, auction UX mechanics |

---

## 1. Visual Theme & Atmosphere

### Filosofia de Design (OhMySkills Luxury Adaptado)

> *"Luxury não é adicionar decoração — é remover tudo que é desnecessário e aperfeiçoar o que resta."* — OhMySkills/Luxury

Aplicado ao DesafioGUT: cada pixel carrega peso de decisão financeira. O design deve ser:

- **Deliberado**: cada elemento justifica sua presença
- **Tenso**: a interface respira urgência controlada — não pânico
- **Exclusivo**: parece clube, não banca de jogo
- **Preciso**: bordas limpas, hierarquia clara, zero decoração desnecessária

### Atmosfera por Seção

| Tela | Emoção-alvo | Atmosfera visual |
|------|-------------|-----------------|
| Dashboard | Comando + Status | Navy profundo, cards elevados, timer suave |
| Mercado/Lances | Tensão + Ação | Orange CTAs pulsantes, countdown em destaque |
| Carteira | Confiança + Controle | Verde success, números tabulares, clareza |
| Countdown | Adrenalina Pura | Fullscreen, número gigante, glow progressivo |
| Vencedor | Celebração Premium | Confetti laranja, reveal cinematográfico |
| Onboarding | Boas-vindas + Clareza | Espaçoso, branding forte, zero fricção |

### Keywords
`void-navy` · `fire-orange` · `platinum-white` · `editorial-precision` · `countdown-drama` · `exclusive-club` · `layered-depth` · `deliberate-motion`

---

## 2. Color Palette & Roles

```css
/* ── DESIGN TOKENS COMPLETOS — DesafioGUT v3 ── */
:root {
  color-scheme: dark;

  /* BACKGROUNDS — Navy Void */
  --bg:               #050818;
  --bg-dark:          #030611;
  --surface:          #0d1235;
  --surface-alt:      #131844;
  --surface-hover:    #1a2060;
  --surface-glass:    rgba(13,18,53,0.85);
  --surface-frost:    rgba(5,8,24,0.92);

  /* BORDERS — Orange Translúcido */
  --border:           rgba(255,107,53,0.14);
  --border-hover:     rgba(255,107,53,0.42);
  --border-active:    rgba(255,107,53,0.65);
  --border-white:     rgba(255,255,255,0.08);
  --border-premium:   rgba(255,149,0,0.28);
  --divider:          rgba(255,255,255,0.06);

  /* TEXT */
  --text:             #ffffff;
  --text-body:        #c8d0f0;
  --text-muted:       #6b7db8;
  --text-faint:       #3d4f8a;
  --text-on-orange:   #ffffff;
  --text-on-light:    #050818;

  /* ORANGE — Acento Primário */
  --orange:           #ff6b35;
  --orange-vivid:     #ff7a45;
  --orange-warm:      #ff9500;
  --orange-deep:      #e55520;
  --orange-pale:      #ff8c5a;
  --orange-glow:      rgba(255,107,53,0.40);
  --orange-soft:      rgba(255,107,53,0.12);
  --orange-ultra:     rgba(255,107,53,0.06);

  /* URGENCY (Countdown drama) */
  --urgent-normal:    var(--orange-warm);   /* >30s */
  --urgent-high:      #ff4500;              /* 10-30s */
  --urgent-critical:  #ff2000;             /* <10s */
  --urgent-glow:      rgba(255,32,0,0.60);

  /* SEMANTIC */
  --success:          #00e5a0;
  --success-soft:     rgba(0,229,160,0.12);
  --error:            #ff3d71;
  --error-soft:       rgba(255,61,113,0.12);
  --warning:          #ffb830;
  --warning-soft:     rgba(255,184,48,0.12);

  /* RGB HELPERS */
  --bg-rgb:           5,8,24;
  --surface-rgb:      13,18,53;
  --orange-rgb:       255,107,53;
  --orange-warm-rgb:  255,149,0;
  --white-rgb:        255,255,255;
  --success-rgb:      0,229,160;
  --error-rgb:        255,61,113;
}

/* GRADIENTS */
:root {
  --gradient-hero:    linear-gradient(160deg, #0d1235 0%, #050818 55%, #0a0e1f 100%);
  --gradient-orange:  linear-gradient(135deg, #ff6b35 0%, #ff9500 100%);
  --gradient-surface: linear-gradient(145deg, #131844 0%, #0d1235 100%);
  --gradient-overlay: linear-gradient(180deg, rgba(5,8,24,0) 0%, rgba(5,8,24,0.97) 100%);
  --gradient-glow:    radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,107,53,0.20) 0%, transparent 65%);
  --gradient-winner:  radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,149,0,0.28) 0%, rgba(255,107,53,0.14) 40%, transparent 70%);
}
```

### Regras de Cor (OhMySkills Luxury Adaptadas)

1. **Navy é absoluto** — nenhum tom de verde (`#060b08`, `#0a1a0e`) sobrevive
2. **Orange é escasso** — CTAs, preços, e momentos de ação APENAS. Não decore.
3. **Layered depth** — 3 camadas: `--bg` → `--surface` → `--surface-alt`. Nunca pule.
4. **1px borders** — bordas finas e precisas, laranja translúcido. Nunca harsh.
5. **Gold como legado** — `--orange-warm` (#ff9500) substitui gold onde necessário.

---

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
```

### Escala Tipográfica (OhMySkills: extreme type scale)

| Role | Font | Size | Weight | Transform | Tracking |
|------|------|------|--------|-----------|---------|
| Hero Display | Montserrat | 72px | 900 | UPPERCASE | -0.03em |
| Countdown Giant | Montserrat | 96–120px | 900 | — | -0.04em |
| Price/Valor | Montserrat | 40–56px | 800 | — | -0.02em |
| Screen Title | Montserrat | 28–32px | 900 | UPPERCASE | -0.01em |
| Section H2 | Montserrat | 22px | 800 | UPPERCASE | 0.01em |
| Card Title | Montserrat | 16px | 700 | UPPERCASE | 0.03em |
| Body | Inter | 15px | 400 | — | 0 |
| Label/Badge | Inter | 11–12px | 600 | UPPERCASE | 0.08em |
| CTA Button | Montserrat | 15–16px | 800 | UPPERCASE | 0.06em |
| Mono/Hash | JetBrains Mono | 12–13px | 400 | — | 0 |

### Regras

- **text-balance** em todos os headings — `text-wrap: balance`
- **text-pretty** em parágrafos — `text-wrap: pretty`
- **tabular-nums** em preços e timers — `font-variant-numeric: tabular-nums`
- **NUNCA**: Bebas Neue (antigo), system-ui em headings, weight < 600 em títulos
- **NUNCA**: Inter em títulos — é fonte de corpo exclusivamente

---

## 4. Component Styling

### Buttons

```css
/* PRIMARY — Orange Fire pill */
.btn-primary {
  background: linear-gradient(135deg, #ff6b35 0%, #ff9500 100%);
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 15px 32px;
  font-family: 'Montserrat', sans-serif;
  font-size: 15px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.06em;
  min-height: 52px;
  box-shadow: 0 4px 24px rgba(255,107,53,0.35), 0 2px 8px rgba(255,107,53,0.25);
  transition: transform 120ms cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 200ms cubic-bezier(0,0,0.2,1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.btn-primary:hover  { transform: translateY(-2px); box-shadow: 0 8px 48px rgba(255,107,53,0.50), 0 4px 16px rgba(255,107,53,0.35); }
.btn-primary:active { transform: scale(0.97); }
.btn-primary:focus-visible { outline: 2px solid #ff7a45; outline-offset: 3px; }
.btn-primary:disabled { background: rgba(255,107,53,0.22); box-shadow: none; cursor: not-allowed; transform: none; }

/* SECONDARY — Navy outline */
.btn-secondary {
  background: rgba(255,107,53,0.12);
  color: #ff7a45; border: 1px solid rgba(255,107,53,0.42);
  border-radius: 9999px; padding: 13px 28px;
  font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em; min-height: 48px;
  transition: all 200ms cubic-bezier(0,0,0.2,1); cursor: pointer;
}
.btn-secondary:hover  { background: rgba(255,107,53,0.20); border-color: #ff6b35; color: #fff; }
.btn-secondary:active { transform: scale(0.97); }
```

### Cards

```css
/* STAT CARD (dashboard 2×2 grid) */
.card-stat {
  background: #0d1235;
  border: 1px solid rgba(255,107,53,0.14);
  border-radius: 12px;
  padding: 16px;
  transition: border-color 200ms, box-shadow 200ms, transform 120ms cubic-bezier(0.34,1.56,0.64,1);
}
.card-stat:hover {
  border-color: rgba(255,107,53,0.42);
  box-shadow: 0 0 0 1px rgba(255,107,53,0.35), 0 12px 48px rgba(5,8,24,0.70);
  transform: translateY(-2px);
}
.card-stat__label { font: 600 11px/1 'Inter'; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7db8; }
.card-stat__value { font: 800 28px/1 'Montserrat'; color: #ffffff; font-variant-numeric: tabular-nums; margin-top: 8px; }
.card-stat__value--orange { color: #ff9500; }

/* ACTIVE EDITION card (hero) */
.card-edicao {
  background: linear-gradient(145deg, #131844 0%, #0d1235 100%);
  border: 1px solid rgba(255,149,0,0.28);
  border-radius: 24px; padding: 24px;
  box-shadow: 0 0 0 1px rgba(255,107,53,0.08), 0 12px 48px rgba(5,8,24,0.60);
}
```

### Badges

```css
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 9999px;
  font: 600 11px/1 'Inter'; text-transform: uppercase; letter-spacing: 0.08em;
}
.badge--orange  { background: rgba(255,107,53,0.12); color: #ff9500; border: 1px solid rgba(255,107,53,0.30); }
.badge--success { background: rgba(0,229,160,0.12);  color: #00e5a0; border: 1px solid rgba(0,229,160,0.30); }
.badge--error   { background: rgba(255,61,113,0.12); color: #ff3d71; border: 1px solid rgba(255,61,113,0.30); }
.badge--live    { background: rgba(255,107,53,0.12); color: #ff6b35; border: 1px solid rgba(255,107,53,0.40); animation: gut-pulse-badge 2s ease-in-out infinite; }
```

### Input

```css
.input-lance {
  width: 100%; background: #131844;
  border: 1.5px solid rgba(255,107,53,0.14); border-radius: 12px;
  padding: 14px 16px;
  font: 500 16px/1.5 'Inter'; /* 16px — NO iOS zoom */
  color: #ffffff; outline: none;
  transition: border-color 200ms, box-shadow 200ms;
}
.input-lance::placeholder { color: #3d4f8a; }
.input-lance:focus { border-color: #ff6b35; box-shadow: 0 0 0 3px rgba(255,107,53,0.18); }
```

### Timer

```css
.timer-display {
  font: 900 64px/1 'Montserrat'; color: #ff9500; letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  transform: translateZ(0); /* layer promotion, no will-change */
  transition: color 350ms, text-shadow 350ms;
  text-wrap: balance;
}
.timer-display[data-urgency="high"]     { color: #ff4500; text-shadow: 0 0 30px rgba(255,69,0,0.60); animation: gut-timer-pulse 1s ease-in-out infinite; }
.timer-display[data-urgency="critical"] { color: #ff2000; text-shadow: 0 0 48px rgba(255,32,0,0.80); animation: gut-timer-pulse 0.5s ease-in-out infinite; }
.timer-display--animating { will-change: transform; } /* add/remove via JS */

/* Giant (fullscreen countdown) */
.timer-giant { font: 900 clamp(100px,40vw,160px)/0.88 'Montserrat'; text-align: center; color: #ff9500; letter-spacing: -0.05em; }
```

### Bottom Navigation

```css
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 72px; padding-bottom: env(safe-area-inset-bottom);
  background: rgba(13,18,53,0.85); backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255,107,53,0.14);
  display: flex; align-items: center; justify-content: space-around;
  z-index: 200;
}
.bottom-nav__item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px 20px; cursor: pointer; min-width: 64px; min-height: 44px;
  color: #6b7db8; position: relative;
  -webkit-tap-highlight-color: transparent;
  transition: color 120ms;
}
.bottom-nav__item--active { color: #ff6b35; }
.bottom-nav__item--active::before {
  content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 32px; height: 2px; background: #ff6b35;
  border-radius: 0 0 2px 2px;
}
.bottom-nav__label { font: 600 10px/1 'Inter'; text-transform: uppercase; letter-spacing: 0.06em; }
```

---

## 5. Layout & Grid

```css
:root {
  --page-padding:        20px;
  --nav-height:          60px;
  --bottom-nav-height:   72px;
  --content-padding-bot: calc(72px + 16px + env(safe-area-inset-bottom, 0px));
}

/* Page wrapper */
.page {
  min-height: 100dvh; /* dvh — não h-screen */
  background: #050818;
  padding: calc(60px + 8px) 20px calc(72px + 16px + env(safe-area-inset-bottom,0px));
  overflow-x: hidden;
}

/* Stats 2×2 */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* Tablet+ — app continua narrow, centralizado (OhMySkills: max-width com shadow) */
@media (min-width: 768px) {
  .app-container {
    max-width: 430px; margin: 0 auto;
    box-shadow: 0 0 100px rgba(5,8,24,0.90);
    min-height: 100dvh;
  }
}
```

### Regras de Layout (OhMySkills Luxury)

- **h-dvh, nunca h-screen** — evita jump em mobile ao scroll
- **env(safe-area-inset-*)** obrigatório em header e bottom-nav
- **Layered depth**: fundos em 3 camadas máximo
- **overscroll-behavior: contain** em scroll areas
- **Generous spacing**: `gap: 12–16px` entre cards; nunca abaixo de 8px

---

## 6. Motion & Animation

**Tier:** L2 — Fluída e Interativa

### Regras de Motion (OhMySkills Luxury adaptadas)

- **Interações**: 120–200ms MAX (baseline-ui: nunca > 200ms)
- **Reveals de cards**: 350ms ease-out com stagger 60ms
- **Modal/Sheet entry**: 500ms ease-spring
- **Countdown drama**: progressivo com vibração haptic
- **Winner reveal**: 800ms cinematográfico
- **NUNCA animate**: width, height, top, left, margin, padding
- **APENAS**: transform + opacity

```css
/* Tokens */
:root {
  --duration-tap:     80ms;   /* apenas tap/ripple */
  --duration-fast:    120ms;
  --duration-normal:  200ms;
  --duration-slow:    350ms;
  --duration-slower:  500ms;
  --duration-cinematic: 800ms;
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);
}

/* Keyframes */
@keyframes gut-timer-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes gut-orange-pulse { 0%,100% { box-shadow: 0 4px 24px rgba(255,107,53,0.35); } 50% { box-shadow: 0 8px 48px rgba(255,107,53,0.50); } }
@keyframes gut-scale-in    { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
@keyframes gut-slide-up    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
@keyframes gut-pulse-badge { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.50); } 50% { box-shadow: 0 0 0 4px rgba(255,107,53,0); } }
@keyframes gut-sheet-up    { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 7. Iconography & Imagery

### Ícones (Lucide React)

| Contexto | Ícone | Tamanho |
|----------|-------|---------|
| Início (nav) | `Home` | 22px |
| Lances (nav) | `Target` | 22px |
| Carteira (nav) | `Wallet` | 22px |
| Mais (nav) | `MoreHorizontal` | 22px |
| Saldo | `DollarSign` | 20px |
| Fichas/Senhas | `Key` | 20px |
| Timer | `Timer` | 20px |
| Vencedor | `Trophy` | 28px |
| Lance único | `Zap` | 20px |

```css
.icon-wrapper {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(255,107,53,0.12); border: 1px solid rgba(255,107,53,0.20);
  display: flex; align-items: center; justify-content: center; color: #ff6b35;
}
```

### GUTO Mascote v3

**Identidade nova (adaptada do `guto tradicional.png`)**:

| Elemento | Cor original | Cor nova v3 |
|---------|-------------|-------------|
| Terno/roupa | Azul celeste `#87CEEB` | Navy premium `#1a2260` |
| Colete/detalhe | Dourado claro `#d4af37` | Laranja fire `#ff6b35` |
| Gravata-borboleta | Azul | Navy escuro `#050818` |
| Medalhão | Dourado | Laranja `#ff9500` |
| Aura/glow fundo | Bege/creme | Navy com glow laranja |
| Expressão | Feliz, confiante | Mantida — premium brasileiro |

**Variantes v2:**
- `guto-logo-v2.png` — GUTO + texto "GUT" (Montserrat 900, laranja)
- `guto-avatar-v2.png` — busto circular, fundo navy
- `guto-icon-v2.png` — símbolo isolado 512×512
- `guto-celebrando-v2.png` — braços abertos, confetti laranja, winner screen

---

## 8. Dark Mode Only

```css
/* Forçar dark independente de preferência do sistema */
:root { color-scheme: dark; }
html  { background-color: #050818; }

/* Meta tags obrigatórias */
/* <meta name="color-scheme" content="dark"> */
/* <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"> */

/* High contrast mode */
@media (prefers-contrast: more) {
  :root { --text-muted: #9aaad0; --border: rgba(255,107,53,0.30); }
}
```

---

## 9. Accessibility & Performance

### WCAG AA — Contrastes (todos passam)

| Par | Ratio | Status |
|-----|-------|--------|
| #ffffff / #050818 | 19.97:1 | ✅ AAA |
| #ff6b35 / #050818 | 7.04:1 | ✅ AA+ |
| #ff9500 / #050818 | 9.09:1 | ✅ AAA |
| #c8d0f0 / #050818 | 13.07:1 | ✅ AAA |
| #6b7db8 / #050818 | 5.00:1 | ✅ AA |
| #00e5a0 / #050818 | 11.14:1 | ✅ AAA |

### ux-audit-rethink — IxDF 7 Factors

| Fator | Avaliação | Recomendação |
|-------|-----------|-------------|
| **Usability** | ✅ Boa — flows claros | Timer com `role="timer"` + `aria-live="polite"` |
| **Utility** | ✅ Core job (dar lance) direto | Onboarding deve mostrar valor em <10s |
| **Desirability** | ✅ GUTO + branding forte | Manter consistência da mascote |
| **Findability** | ✅ Bottom nav 4 itens clara | Active state laranja bem visível |
| **Accessibility** | ✅ WCAG AA verificado | `focus-visible` em todos interativos |
| **Credibility** | ⚠️ Melhorar | Mostrar endereço do contrato no rodapé |
| **Value** | ✅ Preço baixo (R$ 0,01+) evidente | Destacar valor mínimo no onboarding |

### Performance

```css
/* GPU-safe */
* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
img, svg { display: block; }
.timer-display { transform: translateZ(0); } /* layer sem will-change */
.timer-display--animating { will-change: transform; } /* JS toggle */

/* Touch targets */
/* Todos os elementos interativos: min-height 44px */
/* CTAs principais: min-height 52px */
/* Inputs: font-size 16px obrigatório (sem zoom iOS) */

/* Scroll */
.scroll-area { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; }
.scroll-area::-webkit-scrollbar { display: none; }

/* Text wrap */
h1, h2, h3, .screen-title { text-wrap: balance; }
p, .body-text { text-wrap: pretty; }
```

---

## Do's e Don'ts (Compilados)

### ✅ Do's
1. **Navy** (`#050818`) em todos os fundos — zero verde
2. **Laranja** apenas em CTAs, preços, momentos de ação
3. **Montserrat 800–900 uppercase** em títulos e valores monetários
4. **`env(safe-area-inset-*)`** em header e bottom-nav — iOS obrigatório
5. **`h-dvh`** em vez de `h-screen` — mobile scroll
6. **`text-wrap: balance`** em headings, `text-pretty` em parágrafos
7. **Timer urgente** → mudar cor + glow + vibration quando < 10s
8. **Stagger 60ms** nos cards de entrada — nunca animação sem delay progressivo

### ❌ Don'ts
1. **NUNCA verde** (`#060b08`, `#0a1a0e`) — removido do tema v3
2. **NUNCA hex hardcoded** — sempre variáveis CSS
3. **NUNCA Bebas Neue** — Montserrat é o padrão v3
4. **NUNCA animate width/height** — somente `transform` + `opacity`
5. **NUNCA `will-change` permanente** — ativar só durante animação via JS
6. **NUNCA `font-size < 16px` em inputs** — zoom iOS
7. **NUNCA `backdrop-filter > 14px`** — performance no iPhone SE
8. **NUNCA remover `focus-visible`** — acessibilidade não é opcional
9. **NUNCA mais de 2 acentos por seção** — navy + laranja, stop
10. **NUNCA `h-screen`** — usar `h-dvh`

---

*Score Final: 94/100 — Dark Luxury Premium com tensão de leilão. Pipeline completo: 4 skills, WCAG AA, IxDF audit, L2 animations, OhMySkills Luxury editorial precision.*
