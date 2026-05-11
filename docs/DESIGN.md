# DESIGN.md — DesafioGUT
> **Cassino Premium Brasileiro** — Navy profundo, laranja de fogo, Bebas Neue.  
> Extraído de: `public/assets/telas/reff oficial.jpeg` + design system v3  
> Data: 2026-05-11 | Score: 94/100 | Tier: L2

---

## 1. Visual Theme & Atmosphere

**Style**: Brazilian iGaming Premium / Cassino de Elite  
**Keywords**: `navy-void` · `fire-orange` · `bebas-impact` · `all-caps` · `stadium-energy` · `exclusive-club` · `countdown-drama` · `pix-speed`  

**Tone**: Urgente, explosivo, vitorioso, exclusivamente brasileiro.  
**Feel**: VIP room de cassino — não banca de jogo. Cada centavo é uma decisão de elite.

**Interaction Tier**: L2 — Fluída e Interativa  
**Deps**: CSS + IntersectionObserver + Web Animations API

### Comparativo de versões

| Dimensão | v2 (verde iGaming) | v3 (navy cassino premium) |
|----------|-------------------|--------------------------|
| Fundo | Verde-floresta `#060b08` | Navy void `#050818` |
| Acento | Ouro `#f5c800` | Laranja fogo `#ff9500` |
| Tipografia display | Bebas Neue | **Bebas Neue** (mantido) |
| Sensação | iGaming genérico | Cassino premium exclusivo |

---

## 2. Color Palette & Roles

```css
/* Extraído de reff oficial.jpeg + validado WCAG AA */
:root {
  color-scheme: dark;

  /* ── BACKGROUNDS — Navy Void ── */
  --bg:              #050818;        /* root — navy quasi-black */
  --bg-dark:         #030611;        /* seções mais escuras */
  --surface:         #0d1235;        /* cards, painéis */
  --surface-alt:     #131844;        /* elevated surfaces */
  --surface-hover:   #1a2060;        /* hover */
  --surface-glass:   rgba(13,18,53,0.85);
  --surface-frost:   rgba(5,8,24,0.92);

  /* ── BORDERS ── */
  --border:          rgba(255,149,0,0.15);
  --border-hover:    rgba(255,149,0,0.45);
  --border-active:   rgba(255,149,0,0.70);
  --border-white:    rgba(255,255,255,0.08);

  /* ── TEXT ── */
  --text:            #ffffff;
  --text-body:       #c8d0f0;
  --text-muted:      #6b7db8;
  --text-faint:      #3d4f8a;
  --text-on-orange:  #ffffff;
  --text-on-light:   #050818;

  /* ── ORANGE — acento absoluto ── */
  --orange:          #ff9500;        /* cor dominante dos CTAs */
  --orange-vivid:    #ffaa20;        /* hover */
  --orange-fire:     #ff6b35;        /* laranja vivo */
  --orange-deep:     #e08000;        /* pressed */
  --orange-glow:     rgba(255,149,0,0.45);
  --orange-soft:     rgba(255,149,0,0.12);
  --orange-ultra:    rgba(255,149,0,0.06);

  /* ── URGENCY (countdown drama) ── */
  --urgent-60s:      var(--orange);
  --urgent-30s:      #ff4500;
  --urgent-10s:      #ff2000;
  --urgent-glow:     rgba(255,32,0,0.65);

  /* ── SEMANTIC ── */
  --success:         #00c853;
  --success-soft:    rgba(0,200,83,0.12);
  --error:           #e53935;
  --error-soft:      rgba(229,57,53,0.12);
  --gold:            #ffd700;
  --gold-soft:       rgba(255,215,0,0.15);

  /* ── RGB HELPERS ── */
  --bg-rgb:          5,8,24;
  --orange-rgb:      255,149,0;
  --white-rgb:       255,255,255;
  --success-rgb:     0,200,83;

  /* ── GRADIENTS ── */
  --gradient-hero:   linear-gradient(160deg, #0d1235 0%, #050818 55%, #0a0e1f 100%);
  --gradient-orange: linear-gradient(135deg, #ff9500 0%, #ff6b35 100%);
  --gradient-surface:linear-gradient(145deg, #131844 0%, #0d1235 100%);
  --gradient-overlay:linear-gradient(180deg, rgba(5,8,24,0) 0%, rgba(5,8,24,0.97) 100%);
  --gradient-winner: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,149,0,0.30) 0%, rgba(255,107,53,0.15) 40%, transparent 70%);
  --gradient-glow:   radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,149,0,0.22) 0%, transparent 65%);
}
```

### Color Rules
1. **Navy é absoluto** — zero verde (`#060b08`, `#0a1a0e`)
2. **Laranja é escasso** — apenas CTAs, preços, countdown urgente
3. **Layered depth** — `--bg` → `--surface` → `--surface-alt` (3 camadas)
4. **1px borders** — laranja translúcido, nunca opaco

---

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
```

| Role | Font | Size | Weight | Transform | Tracking |
|------|------|------|--------|-----------|---------|
| Hero Display | Bebas Neue | 72px | 400 (inherently heavy) | UPPERCASE | 0.02em |
| Countdown Giant | Bebas Neue | 100–160px | 400 | — | -0.02em |
| Price / Valor | Bebas Neue | 48–64px | 400 | — | 0.01em |
| Screen Title (H1) | Bebas Neue | 28–32px | 400 | UPPERCASE | 0.02em |
| Section H2 | Barlow Condensed | 20px | 800 | UPPERCASE | 0.04em |
| Card Label | Barlow Condensed | 12px | 700 | UPPERCASE | 0.10em |
| Body | Barlow | 15px | 400 | — | 0 |
| CTA Button | Barlow Condensed | 16px | 800 | UPPERCASE | 0.08em |
| Mono / Hash | JetBrains Mono | 13px | 400 | — | 0 |

### Typography Rules
- **Bebas Neue** em TODOS os títulos, valores monetários e countdown — é a assinatura visual
- **text-transform: uppercase** em H1, H2, CTAs, labels — sempre
- **tabular-nums** em timers e preços
- **NUNCA usar**: Inter em headings, Roboto, Poppins, DM Sans
- Fallback: `'Bebas Neue', Impact, 'Arial Narrow', sans-serif`

---

## 4. Component Styling

### Botão Primário — Orange CTA

```css
.btn-primary {
  background: var(--gradient-orange);
  color: var(--text-on-orange);
  border: none;
  border-radius: 9999px;
  padding: 15px 32px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 16px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.08em;
  min-height: 52px;
  box-shadow: 0 4px 24px rgba(255,149,0,0.40);
  transition: transform 120ms cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 200ms ease-out;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.btn-primary:hover  { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(255,149,0,0.55); }
.btn-primary:active { transform: scale(0.97); }
.btn-primary:focus-visible { outline: 2px solid var(--orange-vivid); outline-offset: 3px; }
.btn-primary:disabled { background: rgba(255,149,0,0.22); box-shadow: none; cursor: not-allowed; }
```

### Card Padrão

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px; padding: 16px;
  transition: border-color 200ms, box-shadow 200ms, transform 120ms cubic-bezier(0.34,1.56,0.64,1);
}
.card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 0 0 1px rgba(255,149,0,0.30), 0 12px 40px rgba(5,8,24,0.70);
  transform: translateY(-2px);
}
.card-premium {
  background: var(--gradient-surface);
  border: 1px solid rgba(255,149,0,0.28);
  border-radius: 20px; padding: 20px;
  box-shadow: 0 0 0 1px rgba(255,149,0,0.08), 0 12px 48px rgba(5,8,24,0.55);
}
```

### Timer Display

```css
.timer {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 56px; color: var(--orange);
  letter-spacing: 0.01em; line-height: 1;
  font-variant-numeric: tabular-nums;
  transform: translateZ(0);
  transition: color 350ms, text-shadow 350ms;
}
.timer[data-urgency="high"]     { color: #ff4500; text-shadow: 0 0 30px rgba(255,69,0,0.65); animation: timer-pulse 1s infinite; }
.timer[data-urgency="critical"] { color: #ff2000; text-shadow: 0 0 48px rgba(255,32,0,0.85); animation: timer-pulse 0.5s infinite; }
.timer--giant { font-size: clamp(100px,42vw,160px); letter-spacing: -0.02em; }
@keyframes timer-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
```

### Badge / Pill

```css
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 9999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.badge-orange  { background: var(--orange-soft);  color: var(--orange);  border: 1px solid rgba(255,149,0,0.30); }
.badge-success { background: var(--success-soft); color: var(--success); border: 1px solid rgba(0,200,83,0.30); }
.badge-live    { background: var(--orange-soft);  color: var(--orange);  animation: badge-pulse 2s infinite; }
@keyframes badge-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,149,0,0.50); } 50% { box-shadow: 0 0 0 4px rgba(255,149,0,0); } }
```

### Input — Lance

```css
.input-lance {
  width: 100%; background: var(--surface-alt);
  border: 1.5px solid var(--border);
  border-radius: 10px; padding: 14px 16px;
  font-size: 16px; font-weight: 500; /* 16px — sem zoom iOS */
  font-family: 'Barlow', sans-serif; color: var(--text);
  outline: none;
  transition: border-color 200ms, box-shadow 200ms;
}
.input-lance::placeholder { color: var(--text-faint); }
.input-lance:focus { border-color: var(--orange); box-shadow: 0 0 0 3px rgba(255,149,0,0.20); }
```

### Bottom Navigation

```css
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 72px; padding-bottom: env(safe-area-inset-bottom);
  background: var(--surface-glass); backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-around;
  z-index: 200;
}
.nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--text-muted); min-width: 64px; min-height: 44px; padding: 8px 20px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em; position: relative;
  -webkit-tap-highlight-color: transparent; transition: color 120ms;
}
.nav-item.active { color: var(--orange); }
.nav-item.active::before {
  content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 28px; height: 2px; background: var(--orange); border-radius: 0 0 2px 2px;
}
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
.page {
  min-height: 100dvh;
  background: var(--bg);
  padding: calc(60px + 8px) var(--page-padding) var(--content-padding-bot);
  overflow-x: hidden;
}
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
/* Tablet+ — centralizado */
@media (min-width: 768px) {
  .app-container { max-width: 430px; margin: 0 auto; box-shadow: 0 0 100px rgba(5,8,24,0.90); }
}
```

---

## 6. Motion & Animation

**Tier L2 — regras:**
- Interações: máx 200ms — nunca `width/height/top/left`
- Só `transform` + `opacity`
- `backdrop-filter: blur()` ≤ 12px
- `will-change` apenas durante animação ativa (JS toggle)

```css
:root {
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:    cubic-bezier(0, 0, 0.2, 1);
}
@keyframes scale-in  { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
@keyframes slide-up  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
@keyframes sheet-up  { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
@keyframes float     { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
@keyframes glow-pulse{ 0%,100% { box-shadow: 0 4px 20px rgba(255,149,0,0.35); } 50% { box-shadow: 0 8px 40px rgba(255,149,0,0.55); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
}
```

---

## 7. Iconography & Imagery

**Ícones**: Lucide React (stroke fino, 20–22px em nav, 28px em troféu)

| Contexto | Ícone | Cor |
|----------|-------|-----|
| Início (nav) | `Home` | active: `--orange` |
| Lances (nav) | `Target` | active: `--orange` |
| Carteira (nav) | `Wallet` | active: `--orange` |
| Mais (nav) | `MoreHorizontal` | active: `--orange` |
| Saldo | `Coins` | `--orange` |
| Timer | `Timer` | `--orange` |
| Troféu | `Trophy` | `--gold` |
| Lance | `Zap` | `--orange` |

**GUTO mascote v3**: personagem 3D em terno navy `#1a2260`, colete laranja `#ff6b35`, medalha laranja `#ff9500`. Expressão: confiante, premium, brasileiro. Assets em `public/assets/guto/v2/`.

---

## 8. Dark Mode Only

```css
:root { color-scheme: dark; }
html  { background-color: var(--bg); }
/* Meta tags obrigatórias:
   <meta name="color-scheme" content="dark">
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
*/
@media (prefers-contrast: more) {
  :root { --text-muted: #9aaad0; --border: rgba(255,149,0,0.30); }
}
```

---

## 9. Accessibility & Performance

### WCAG AA — Contrastes

| Par | Ratio | Status |
|-----|-------|--------|
| `#ffffff` / `#050818` | 19.97:1 | ✅ AAA |
| `#ff9500` / `#050818` | 9.09:1 | ✅ AAA |
| `#ff6b35` / `#050818` | 7.04:1 | ✅ AA+ |
| `#c8d0f0` / `#050818` | 13.07:1 | ✅ AAA |
| `#6b7db8` / `#050818` | 5.00:1 | ✅ AA |
| `#00c853` / `#050818` | 9.40:1 | ✅ AAA |

### Performance
```css
/* GPU-safe — nunca animar layout props */
* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
img, svg { display: block; }
.timer { transform: translateZ(0); } /* layer sem will-change */
.scroll-area { overflow-y:auto; overscroll-behavior:contain; scrollbar-width:none; }
.scroll-area::-webkit-scrollbar { display:none; }
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }
```

### Touch Targets
- Botões: `min-height: 52px`
- Inputs: `font-size: 16px` (sem zoom iOS)
- Nav items: `min-height: 44px`
- `env(safe-area-inset-*)` em header e bottom-nav

---

## Do's e Don'ts

### ✅ Do's
1. **Bebas Neue** em todos títulos, valores e countdown
2. **Navy** (`#050818`) em fundos — zero verde
3. **Laranja** só em CTAs, preços, urgência
4. **ALL-CAPS** em headings, botões, labels
5. **`h-dvh`** em vez de `h-screen`
6. **`env(safe-area-inset-*)`** obrigatório em iOS

### ❌ Don'ts
1. Verde (`#060b08`, `#0a1a0e`) — era o v2, banido
2. Hex hardcoded — sempre variáveis CSS
3. Inter/Poppins/Roboto em headings
4. Animações em `width/height/top/left`
5. `will-change` permanente
6. `font-size < 16px` em inputs
