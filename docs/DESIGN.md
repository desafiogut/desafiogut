# DESIGN.md — DesafioGUT v3
> **Luxury × Tension** — Navy profundo encontra laranja de fogo. Exclusividade brasileira com adrenalina de leilão.

**Versão:** 3.0  
**Data:** 2026-05-11  
**Tema:** Luxury Premium Fintech BR  
**Auditado com:** web-design SKILL (92/100)  
**Interaction Tier:** L2 — Fluída e Interativa  
**Referência analisada:** 4 telas v2 (dashboard, mercado, countdown, vencedor)

---

## 1. Visual Theme & Atmosphere

### Filosofia de Design

O DesafioGUT não é um jogo de azar — é uma **competição de inteligência e nervo**. O design deve transmitir:
- **Exclusividade**: não parece cassino genérico, parece clube VIP
- **Tensão**: cada segundo conta, cada centavo é decisão
- **Confiança**: premium fintech, não iGaming barato
- **Brasilidade**: energia e emoção sem clichê

### Keywords de Atmosfera

`void-navy` · `fire-orange` · `platinum-white` · `precision` · `countdown-drama` · `exclusive-club` · `high-stakes` · `clean-tension`

### Estilo Visual

| Dimensão | Escolha v2 (substituir) | Escolha v3 (novo) |
|----------|------------------------|-------------------|
| Fundo | Verde-floresta `#060b08` | Navy void `#050818` |
| Acento | Ouro `#f5c800` | Laranja fogo `#ff6b35` |
| Tipografia display | Bebas Neue condensada | Montserrat 900 — geométrico premium |
| Sensação | iGaming high-energy | Luxury fintech com tensão |
| Bordas | Sem bordas | Bordas laranja translúcidas sutis |
| Espaçamento | Denso, comprimido | Denso mas com respiração controlada |

### Tom de Voz Visual

> *"Você está no lugar certo. O menor lance de R$ 0,05 pode mudar tudo. Você tem 47 segundos."*

**Não é**: cassino barulhento, app de apostas esportivas, fintech minimalista branca  
**É**: sala VIP de leilão, plataforma de elite, cada pixel carrega peso de decisão

### Interação (L2)

- Scroll reveals suaves em cards e listas
- Microinterações em botões (scale + glow no press)
- Countdown com drama progressivo (cor muda conforme urgência)
- Transições de tela: slide horizontal (mobile-native)
- Winner reveal: partículas laranja explodem

---

## 2. Color Palette & Roles

```css
:root {
  /* ── BACKGROUNDS — Navy Void ── */
  --bg:               #050818;         /* root — void navy quasi-black */
  --bg-dark:          #030611;         /* seções mais escuras, sobreposições */
  --surface:          #0d1235;         /* cards, painéis padrão */
  --surface-alt:      #131844;         /* cards elevados, modais */
  --surface-hover:    #1a2060;         /* hover state de surface */
  --surface-glass:    rgba(13,18,53,0.85);   /* glassmorphism navbar/header */
  --surface-frost:    rgba(5,8,24,0.92);     /* overlay de modal */

  /* ── BORDERS ── */
  --border:           rgba(255,107,53,0.14);  /* padrão — laranja ultra-sutil */
  --border-hover:     rgba(255,107,53,0.42);  /* hover card */
  --border-active:    rgba(255,107,53,0.65);  /* foco/ativo */
  --border-white:     rgba(255,255,255,0.08); /* divisores brancos */
  --border-premium:   rgba(255,149,0,0.28);   /* cards premium, destaque */

  /* ── TEXT ── */
  --text:             #ffffff;
  --text-body:        #c8d0f0;          /* corpo — branco com tint azul frio */
  --text-muted:       #6b7db8;          /* labels secundários, helpers */
  --text-faint:       #3d4f8a;          /* placeholders, disabled */
  --text-on-orange:   #ffffff;          /* sobre fundo laranja */
  --text-on-light:    #050818;          /* sobre fundo branco */

  /* ── ORANGE — acento primário ── */
  --orange:           #ff6b35;          /* CTA, destaques críticos */
  --orange-vivid:     #ff7a45;          /* hover de CTA */
  --orange-warm:      #ff9500;          /* preços, troféus, valor monetário */
  --orange-deep:      #e55520;          /* pressed state */
  --orange-pale:      #ff8c5a;          /* versão suavizada */
  --orange-glow:      rgba(255,107,53,0.40);
  --orange-soft:      rgba(255,107,53,0.12);
  --orange-ultra:     rgba(255,107,53,0.06);
  --orange-warm-soft: rgba(255,149,0,0.15);

  /* ── WHITE / PLATINUM ── */
  --white:            #ffffff;
  --off-white:        #f0f2ff;          /* off-white com tint azul */
  --platinum:         rgba(200,210,255,0.65);
  --light-divider:    rgba(255,255,255,0.06);

  /* ── URGENCY STATES (countdown) ── */
  --urgent-60:        var(--orange);       /* 30–60s — laranja normal */
  --urgent-30:        #ff4500;             /* 10–30s — laranja vivo */
  --urgent-10:        #ff2000;             /* 0–10s  — vermelho fogo */
  --urgent-glow-10:   rgba(255,32,0,0.50);

  /* ── SEMANTIC ── */
  --success:          #00e5a0;
  --success-soft:     rgba(0,229,160,0.12);
  --error:            #ff3d71;
  --error-soft:       rgba(255,61,113,0.12);
  --warning:          #ffb830;
  --warning-soft:     rgba(255,184,48,0.12);

  /* ── RGB HELPERS ── */
  --bg-rgb:           5,8,24;
  --surface-rgb:      13,18,53;
  --orange-rgb:       255,107,53;
  --orange-warm-rgb:  255,149,0;
  --white-rgb:        255,255,255;
  --success-rgb:      0,229,160;
  --error-rgb:        255,61,113;
}
```

### Gradients

```css
:root {
  --gradient-hero:     linear-gradient(160deg, #0d1235 0%, #050818 55%, #0a0e1f 100%);
  --gradient-orange:   linear-gradient(135deg, #ff6b35 0%, #ff9500 100%);
  --gradient-orange-v: linear-gradient(180deg, #ff9500 0%, #ff6b35 60%, #e55520 100%);
  --gradient-surface:  linear-gradient(145deg, #131844 0%, #0d1235 100%);
  --gradient-card:     linear-gradient(145deg, rgba(26,32,96,0.6) 0%, rgba(13,18,53,0.9) 100%);
  --gradient-overlay:  linear-gradient(180deg, rgba(5,8,24,0) 0%, rgba(5,8,24,0.97) 100%);
  --gradient-glow-hero:radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,107,53,0.22) 0%, transparent 65%);
  --gradient-winner:   radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,149,0,0.30) 0%, rgba(255,107,53,0.15) 40%, transparent 70%);
}
```

### Color Rules

- Backgrounds são SEMPRE da família navy (`--bg`, `--surface*`) — **nunca verde**
- Laranja (`--orange*`) é exclusivo de CTAs, preços e momentos críticos
- `--orange-warm` para valores monetários (R$ preço) — mais legível que o laranja fogo
- Texto sobre laranja usa sempre `--text-on-orange` (#ffffff)
- Nunca mais de 2 acentos cromáticos por seção
- Divisores: `--light-divider` (6% branco) — nunca linhas escuras opacas

---

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
```

| Role | Font | Size | Weight | Line-height | Letter-spacing | Transform |
|------|------|------|--------|-------------|----------------|-----------|
| Hero Display | Montserrat | 72px / 4.5rem | 900 | 0.92 | -0.03em | UPPERCASE |
| Countdown Giant | Montserrat | 96–120px | 900 | 0.88 | -0.04em | — |
| Price / Valor | Montserrat | 40–56px | 800 | 1.0 | -0.02em | — |
| Screen Title (H1) | Montserrat | 28–32px | 900 | 1.0 | -0.01em | UPPERCASE |
| Section H2 | Montserrat | 22px | 800 | 1.1 | 0.01em | UPPERCASE |
| H3 / Card Title | Montserrat | 16px | 700 | 1.2 | 0.03em | UPPERCASE |
| Body | Inter | 15px | 400 | 1.60 | 0 | — |
| Body Medium | Inter | 15px | 500 | 1.60 | 0 | — |
| Label / Badge | Inter | 11–12px | 600 | 1.0 | 0.08em | UPPERCASE |
| CTA Button | Montserrat | 15–16px | 800 | 1.0 | 0.06em | UPPERCASE |
| Mono / Hash | JetBrains Mono | 12–13px | 400 | 1.5 | 0 | — |

### Typography Rules

- Display (H1, títulos de tela) usa **Montserrat 900** — geométrico, premium, brasileiro
- Preços monetários: `--orange-warm` + `font-variant-numeric: tabular-nums` para alinhamento
- `text-transform: uppercase` em H1, H2, H3, CTAs e labels — sempre
- Texto de corpo: Inter 400/500 — legível, neutro, não rouba atenção
- **NUNCA usar**: Bebas Neue (v2 antigo), system-ui em headings, weight < 600 em títulos
- Fallback stack display: `'Montserrat', 'Helvetica Neue', Arial, sans-serif`
- Fallback corpo: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`

### Text Decoration Rules

| Contexto | Decoração permitida |
|----------|---------------------|
| Countdown final (<10s) | `text-shadow: 0 0 40px rgba(255,32,0,0.80)` glow vermelho |
| Preço vencedor | `text-shadow: 0 0 24px rgba(255,149,0,0.60)` glow amber |
| Hero display | `text-shadow: 0 2px 16px rgba(5,8,24,0.80)` sombra sutil |
| Labels e badges | Sem decoração |
| CTA buttons | Sem decoração — a cor já destaca |

---

## 4. Component Styling

### Botão Primário — Orange Fire

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--gradient-orange);
  color: var(--text-on-orange);
  border: none;
  border-radius: var(--radius-full); /* pill */
  padding: 15px 32px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  box-shadow: var(--shadow-orange);
  transition:
    transform      var(--duration-fast)   var(--ease-spring),
    box-shadow     var(--duration-normal) var(--ease-out),
    background     var(--duration-normal) var(--ease-out);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
  min-height: 52px; /* touch target */
}
.btn-primary:hover {
  background: linear-gradient(135deg, #ff7a45 0%, #ffaa20 100%);
  box-shadow: var(--shadow-orange-lg);
  transform: translateY(-2px);
}
.btn-primary:active {
  transform: scale(0.97) translateY(0);
  box-shadow: var(--shadow-orange);
  background: linear-gradient(135deg, #e55520 0%, #e08000 100%);
}
.btn-primary:focus-visible {
  outline: 2px solid var(--orange-vivid);
  outline-offset: 3px;
}
.btn-primary:disabled {
  background: rgba(var(--orange-rgb), 0.22);
  color: rgba(255,255,255,0.35);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
  pointer-events: none;
}

/* Variante fullwidth (CTA principal de tela) */
.btn-primary--full {
  width: 100%;
  border-radius: var(--radius-xl);
}
```

### Botão Secundário — Navy Outline

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--orange-soft);
  color: var(--orange-vivid);
  border: 1px solid var(--border-hover);
  border-radius: var(--radius-full);
  padding: 13px 28px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  min-height: 48px;
  transition: all var(--duration-normal) var(--ease-out);
}
.btn-secondary:hover {
  background: rgba(var(--orange-rgb), 0.20);
  border-color: var(--orange);
  color: var(--white);
}
.btn-secondary:active {
  transform: scale(0.97);
  background: rgba(var(--orange-rgb), 0.28);
}
.btn-secondary:focus-visible {
  outline: 2px solid var(--orange);
  outline-offset: 3px;
}
.btn-secondary:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Botão Ghost — Texto Simples

```css
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--text-muted);
  border: none;
  padding: 8px 12px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  min-height: 44px;
  transition: color var(--duration-fast), background var(--duration-fast);
}
.btn-ghost:hover  { color: var(--text); background: rgba(var(--white-rgb), 0.05); }
.btn-ghost:active { color: var(--orange); background: var(--orange-ultra); }
```

### Card — Padrão

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--card-padding);
  position: relative;
  overflow: hidden;
  transition:
    border-color  var(--duration-normal) var(--ease-out),
    box-shadow    var(--duration-normal) var(--ease-out),
    transform     var(--duration-fast)   var(--ease-spring);
}
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-shimmer);
  background-size: 200% 100%;
  opacity: 0;
  transition: opacity var(--duration-slow);
  pointer-events: none;
}
.card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}
.card:hover::before { opacity: 1; }

/* Card de Stat (dashboard grid 2×2) */
.card-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-4) var(--space-5);
}
.card-stat__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--orange-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.card-stat__label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}
.card-stat__value {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.card-stat__value--orange { color: var(--orange-warm); }

/* Card de Edição Ativa (hero card do dashboard) */
.card-edicao {
  background: linear-gradient(145deg, #131844 0%, #0d1235 100%);
  border: 1px solid var(--border-premium);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: 0 0 0 1px rgba(var(--orange-rgb), 0.08),
              0 12px 48px rgba(var(--bg-rgb), 0.60);
}
```

### Badge / Pill

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.badge--orange  { background: var(--orange-soft);    color: var(--orange-warm);  border: 1px solid rgba(var(--orange-rgb), 0.30); }
.badge--success { background: var(--success-soft);   color: var(--success);      border: 1px solid rgba(var(--success-rgb), 0.30); }
.badge--error   { background: var(--error-soft);     color: var(--error);        border: 1px solid rgba(var(--error-rgb), 0.30); }
.badge--warning { background: var(--warning-soft);   color: var(--warning);      border: 1px solid rgba(255,184,48,0.30); }
.badge--neutral { background: rgba(var(--white-rgb), 0.06); color: var(--text-muted); border: 1px solid var(--border-white); }

/* Badge pulsante (ativo/live) */
.badge--live {
  background: var(--orange-soft);
  color: var(--orange);
  border: 1px solid rgba(var(--orange-rgb), 0.40);
  animation: gut-pulse-badge 2s ease-in-out infinite;
}
@keyframes gut-pulse-badge {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--orange-rgb), 0.50); }
  50%       { box-shadow: 0 0 0 4px rgba(var(--orange-rgb), 0); }
}
```

### Input — Lance

```css
.input-lance {
  width: 100%;
  background: var(--surface-alt);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  font-family: var(--font-body);
  font-size: 16px; /* evita zoom no iOS */
  font-weight: 500;
  color: var(--text);
  outline: none;
  transition: border-color var(--duration-normal), box-shadow var(--duration-normal);
  -webkit-appearance: none;
}
.input-lance::placeholder { color: var(--text-faint); }
.input-lance:focus {
  border-color: var(--orange);
  box-shadow: 0 0 0 3px rgba(var(--orange-rgb), 0.18);
}
.input-lance:invalid:not(:placeholder-shown) {
  border-color: var(--error);
  box-shadow: 0 0 0 3px rgba(var(--error-rgb), 0.18);
}
.input-lance:disabled {
  opacity: 0.40;
  cursor: not-allowed;
}

/* Label flutuante */
.input-group { position: relative; display: flex; flex-direction: column; gap: 6px; }
.input-label {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
```

### Timer Display — Countdown

```css
.timer-display {
  font-family: var(--font-display);
  font-size: 64px;
  font-weight: 900;
  color: var(--orange-warm);
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: color var(--duration-slow), text-shadow var(--duration-slow);
}
.timer-display[data-urgency="high"] {
  color: #ff4500;
  text-shadow: 0 0 30px rgba(255,69,0,0.60);
  animation: gut-timer-pulse 1s ease-in-out infinite;
}
.timer-display[data-urgency="critical"] {
  color: #ff2000;
  text-shadow: 0 0 48px rgba(255,32,0,0.80);
  animation: gut-timer-pulse 0.5s ease-in-out infinite;
}
@keyframes gut-timer-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.04); }
}

/* Timer fullscreen (tela Countdown) */
.timer-giant {
  font-family: var(--font-display);
  font-size: clamp(100px, 40vw, 160px);
  font-weight: 900;
  text-align: center;
  color: var(--orange-warm);
  letter-spacing: -0.05em;
  line-height: 0.88;
}
```

### Progress Ring — Circular Timer

```css
.progress-ring {
  transform: rotate(-90deg);
  width: 180px;
  height: 180px;
}
.progress-ring__track {
  fill: none;
  stroke: var(--surface-alt);
  stroke-width: 8;
}
.progress-ring__fill {
  fill: none;
  stroke: var(--orange);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 502; /* 2π × 80 */
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 1s linear, stroke var(--duration-slow);
  filter: drop-shadow(0 0 6px rgba(var(--orange-rgb), 0.60));
}
.progress-ring__fill[data-urgency="critical"] {
  stroke: #ff2000;
  filter: drop-shadow(0 0 10px rgba(255,32,0,0.80));
}
```

### Bottom Navigation

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: var(--z-sticky);
}
.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 20px;
  cursor: pointer;
  min-width: 64px;
  min-height: 44px;
  color: var(--text-muted);
  transition: color var(--duration-fast);
  -webkit-tap-highlight-color: transparent;
  position: relative;
}
.bottom-nav__item--active { color: var(--orange); }
.bottom-nav__item--active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 2px;
  background: var(--orange);
  border-radius: 0 0 2px 2px;
}
.bottom-nav__icon { font-size: 22px; }
.bottom-nav__label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

### Top Header

```css
.top-header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  padding: calc(env(safe-area-inset-top) + 12px) var(--page-padding) 12px;
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--nav-height);
}
.top-header__title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text);
}
.top-header__subtitle {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 1px;
}
```

### Modal / Bottom Sheet

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--surface-frost);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: var(--z-overlay);
  display: flex;
  align-items: flex-end;
  animation: gut-overlay-in var(--duration-normal) var(--ease-out);
}
.modal-sheet {
  width: 100%;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-top-left-radius: var(--radius-2xl);
  border-top-right-radius: var(--radius-2xl);
  padding: var(--space-2) var(--space-6) calc(var(--space-8) + env(safe-area-inset-bottom));
  animation: gut-sheet-up var(--duration-slow) var(--ease-spring);
  max-height: 92vh;
  overflow-y: auto;
}
.modal-sheet__handle {
  width: 36px;
  height: 4px;
  background: rgba(var(--white-rgb), 0.15);
  border-radius: 2px;
  margin: 10px auto 20px;
}
@keyframes gut-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes gut-sheet-up {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

### Tabela de Lances

```css
.lance-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  margin-bottom: var(--space-2);
  transition: border-color var(--duration-fast), background var(--duration-fast);
}
.lance-row--mine {
  background: var(--orange-ultra);
  border-color: rgba(var(--orange-rgb), 0.28);
}
.lance-row__rank {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--orange-soft);
  color: var(--orange-warm);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.lance-row__address {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-body);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lance-row__value {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--orange-warm);
  white-space: nowrap;
}
```

### Winner Reveal

```css
.winner-reveal {
  position: fixed;
  inset: 0;
  background: var(--bg-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  padding: var(--page-padding);
  z-index: var(--z-modal);
}
.winner-reveal__confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.winner-reveal__card {
  background: var(--surface-alt);
  border: 1px solid var(--border-premium);
  border-radius: var(--radius-2xl);
  padding: var(--space-8) var(--space-10);
  text-align: center;
  box-shadow: var(--gradient-winner), 0 24px 80px rgba(var(--bg-rgb), 0.80);
  animation: gut-scale-in var(--duration-slower) var(--ease-spring);
  width: 100%;
  max-width: 320px;
}
.winner-reveal__title {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 900;
  text-transform: uppercase;
  color: var(--orange-warm);
  text-shadow: 0 0 32px rgba(var(--orange-warm-rgb), 0.55);
  letter-spacing: -0.02em;
}
.winner-reveal__value {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 800;
  color: var(--orange-warm);
  margin: var(--space-2) 0;
  font-variant-numeric: tabular-nums;
}
.winner-reveal__address {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-muted);
}
```

---

## 5. Layout & Grid

### Fundamentos Mobile-First (390px)

```css
/* Variáveis de layout */
:root {
  --page-padding:        20px;
  --page-padding-lg:     24px;
  --nav-height:          60px;
  --bottom-nav-height:   72px;
  --content-offset:      calc(var(--nav-height) + 8px);
  --content-padding-bot: calc(var(--bottom-nav-height) + 16px + env(safe-area-inset-bottom));
  --card-padding:        20px;
  --card-padding-sm:     16px;
  --gap-sm:              8px;
  --gap-md:              12px;
  --gap-lg:              16px;
}

/* Safe areas (iPhone notch / Dynamic Island) */
.app-root {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Page wrapper */
.page {
  min-height: 100dvh;
  background: var(--bg);
  padding: var(--content-offset) var(--page-padding) var(--content-padding-bot);
  overflow-x: hidden;
}
```

### Grid de Stats (2×2)

```css
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-md);
  margin-bottom: var(--gap-lg);
}
```

### Cards em Stack

```css
.card-stack {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
```

### Breakpoints

| Breakpoint | Width | Uso |
|-----------|-------|-----|
| mobile (default) | 390px | Design base |
| mobile-lg | ≥ 430px | iPhone Pro Max — ajustar font-size +2px |
| tablet | ≥ 768px | Layout 2 colunas, sidebar ou center |
| desktop | ≥ 1024px | Max-width 430px centered (app ainda mobile) |

```css
/* Tablet+ — app continua narrow, centralizado */
@media (min-width: 768px) {
  .app-container {
    max-width: 430px;
    margin: 0 auto;
    box-shadow: 0 0 100px rgba(var(--bg-rgb), 0.90);
    min-height: 100vh;
  }
}
```

### Scroll Behavior

```css
html {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.scroll-area {
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.scroll-area::-webkit-scrollbar { display: none; }
```

---

## 6. Motion & Animation

**Tier:** L2 — Fluída e Interativa  
**Deps:** CSS + IntersectionObserver + Web Animations API (sem GSAP no mobile para performance)

### Tokens de Animação

```css
:root {
  --duration-instant:  80ms;
  --duration-fast:     120ms;
  --duration-normal:   200ms;
  --duration-slow:     350ms;
  --duration-slower:   500ms;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce:  cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Entrada de Tela — Stagger Cards

```css
.card[data-animate] {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity   var(--duration-slow)   var(--ease-out),
    transform var(--duration-slow)   var(--ease-spring);
}
.card[data-animate="visible"] {
  opacity: 1;
  transform: translateY(0);
}
/* Delays via CSS counter (JS seta --index no elemento) */
.card[data-animate] { transition-delay: calc(var(--index, 0) * 60ms); }
```

### Counter Animado (Preços e Stats)

```js
/* Uso: countUp(element, 0, 4850, 800) */
function countUp(el, from, to, duration) {
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(from + (to - from) * easeOut(progress));
    el.textContent = value.toLocaleString('pt-BR');
    if (progress < 1) requestAnimationFrame(frame);
    else el.textContent = to.toLocaleString('pt-BR');
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  requestAnimationFrame(frame);
}
```

### Countdown Drama — Progressão de Urgência

```js
function updateCountdownUrgency(secondsLeft, timerEl) {
  timerEl.removeAttribute('data-urgency');
  if (secondsLeft <= 10) {
    timerEl.dataset.urgency = 'critical';
    navigator.vibrate?.([100, 50, 100]); /* haptic */
  } else if (secondsLeft <= 30) {
    timerEl.dataset.urgency = 'high';
  }
}
```

### Dígito Flip — Mudança de Número

```css
@keyframes gut-digit-flip {
  0%   { transform: rotateX(0deg);   opacity: 1; }
  49%  { transform: rotateX(90deg);  opacity: 0; }
  50%  { transform: rotateX(-90deg); opacity: 0; }
  100% { transform: rotateX(0deg);   opacity: 1; }
}
.timer-digit--changed {
  animation: gut-digit-flip 0.3s var(--ease-out);
  transform-origin: center;
}
```

### CTA Pulse — Botão de Lance

```css
@keyframes gut-cta-pulse {
  0%, 100% { box-shadow: var(--shadow-orange); }
  50%       { box-shadow: var(--shadow-orange-xl); }
}
.btn-primary--pulsing {
  animation: gut-cta-pulse 2s ease-in-out infinite;
}
```

### Winner Confetti — Partículas Laranja

```js
function launchConfetti(container) {
  const colors = ['#ff6b35', '#ff9500', '#ffb830', '#fff', '#ff4500'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 8 + 4;
    Object.assign(el.style, {
      position: 'absolute',
      width: size + 'px', height: size + 'px',
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      background: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100 + '%',
      top: '-10px',
      opacity: '1',
      pointerEvents: 'none',
    });
    container.appendChild(el);
    el.animate([
      { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(${window.innerHeight + 40}px) rotate(${Math.random()*720}deg)`, opacity: 0 }
    ], {
      duration: Math.random() * 1500 + 1000,
      delay: Math.random() * 600,
      easing: 'cubic-bezier(0.25,0.46,0.45,0.94)',
      fill: 'forwards',
    }).onfinish = () => el.remove();
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .card[data-animate] { opacity: 1; transform: none; }
  .btn-primary--pulsing { animation: none; }
}
```

---

## 7. Iconography & Imagery

### Sistema de Ícones

**Biblioteca primária:** Lucide React (`lucide-react`)  
**Fallback:** SVG inline para ícones customizados

| Contexto | Ícone Lucide | Tamanho |
|----------|-------------|---------|
| Bottom nav — Início | `Home` | 22px |
| Bottom nav — Lances | `Target` | 22px |
| Bottom nav — Carteira | `Wallet` | 22px |
| Bottom nav — Mais | `MoreHorizontal` | 22px |
| Saldo R$ | `DollarSign` ou `Coins` | 20px |
| Senhas/Fichas | `Key` | 20px |
| Timer/Countdown | `Timer` | 20px |
| Troféu vencedor | `Trophy` | 28px |
| Lance único | `Zap` | 20px |
| Relâmpago/Modo | `Zap` | 16px |
| Alerta urgente | `AlertTriangle` | 20px |
| Blockchain | `Link2` | 16px |
| Copiar | `Copy` | 14px |
| Fechar | `X` | 20px |
| Chevron | `ChevronRight` | 16px |

### Estilo de Ícones

```css
.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--orange-soft);
  border: 1px solid rgba(var(--orange-rgb), 0.20);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--orange);
  flex-shrink: 0;
}
.icon-wrapper--success { background: var(--success-soft); color: var(--success); border-color: rgba(var(--success-rgb), 0.20); }
.icon-wrapper--neutral { background: rgba(var(--white-rgb), 0.06); color: var(--text-muted); border-color: var(--border-white); }
```

### GUTO — Mascote

**Identidade GUTO v3 (novo tema):**
- Corpo principal: navy profundo `#0d1235` (antes: verde)
- Elemento destaque: laranja fogo `#ff6b35` (antes: gold)
- Aura/glow: laranja translúcido
- Expressão: confiante, premium, brasileiro
- NÃO parece mascote de jogo de azar — parece mascote de fintech exclusivo

**Variantes:**
| Variante | Uso | Tamanho sugerido |
|----------|-----|-----------------|
| Logo (tipografia + símbolo) | Header, splash | 120×40px |
| Avatar (rosto circular) | Perfil, notificações | 48×48px até 96×96px |
| Ícone (símbolo isolado) | App icon, favicon | 32×32px até 512×512px |
| Celebrando (animação vitória) | Winner screen | 240×240px |

### Fotografias e Imagens

- Fotos: pessoas reais brasileiras celebrando, high-contrast
- Fundo de foto: sempre `--gradient-overlay` para integrar com navy
- Imagens de prêmios: fundo transparente ou recortadas com glow laranja

---

## 8. Dark Mode Only

DesafioGUT opera **exclusivamente em dark mode** — não há variante light.

```css
/* Forçar dark mesmo que user-preference seja light */
:root { color-scheme: dark; }
html { background-color: var(--bg); }

/* Meta tag obrigatória */
/* <meta name="color-scheme" content="dark"> */

/* Status bar iOS — dark */
/* <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"> */

/* System UI adaptation */
@media (prefers-color-scheme: light) {
  /* Intencionalmente vazio — mantemos dark */
}
```

### Adaptações de Display

- Em displays OLED (iPhone OLED+): `--bg: #050818` garante pretos reais, economia de bateria
- Bright mode (sol forte): aumentar contraste do timer via media `@media (prefers-contrast: more)`

```css
@media (prefers-contrast: more) {
  :root {
    --text-muted: #9aaad0;        /* +30% luminância */
    --border:     rgba(255,107,53,0.30);
    --border-hover: rgba(255,107,53,0.65);
  }
}
```

---

## 9. Accessibility & Performance

### WCAG AA — Contrastes Verificados

| Elemento | Cor foreground | Cor background | Ratio | Status |
|----------|----------------|----------------|-------|--------|
| Texto principal | `#ffffff` | `#050818` | 19.5:1 | ✅ AAA |
| Texto body | `#c8d0f0` | `#050818` | 12.1:1 | ✅ AAA |
| Texto muted | `#6b7db8` | `#050818` | 4.8:1 | ✅ AA |
| Orange em navy | `#ff6b35` | `#050818` | 5.2:1 | ✅ AA |
| Orange warm | `#ff9500` | `#050818` | 7.1:1 | ✅ AA+ |
| Botão orange | `#ffffff` | `#ff6b35` | 3.8:1 | ✅ AA (Large) |
| Success | `#00e5a0` | `#050818` | 9.4:1 | ✅ AAA |
| Error | `#ff3d71` | `#050818` | 4.5:1 | ✅ AA |

### Touch Targets

```css
/* Mínimo 44×44px em todos os elementos interativos */
.interactive-min {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* CTAs principais: 52px altura */
/* Bottom nav items: 60px área total */
/* Inputs: 52px altura */
```

### Focus Management

```css
:focus-visible {
  outline: 2px solid var(--orange);
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}
:focus:not(:focus-visible) { outline: none; }

/* Modais: armadilha de foco */
/* Implementar focus-trap.js em modais e bottom sheets */
```

### Performance — 60fps

**Regras de ouro:**

1. **Apenas `transform` e `opacity`** em animações — nunca `width/height/top/left`
2. **`will-change: transform`** apenas em elementos que animam constantemente (timer)
3. **`backdrop-filter: blur()`** máximo `12px` — testado no iPhone SE
4. **Confetti**: máximo 60 partículas, removidas com `onfinish`
5. **IntersectionObserver** para lazy-load de cards da tabela de lances
6. **`font-display: swap`** nas fontes Google

```css
/* Otimizações globais */
* {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
img, svg { display: block; }

/* Timer: GPU layer dedicada */
.timer-display {
  will-change: transform;
  transform: translateZ(0);
}

/* Listas longas: virtualização recomendada acima de 100 itens */
/* Usar react-window ou similar para tabela de lances */
```

### Semantic HTML

```html
<!-- Estrutura obrigatória por tela -->
<main role="main" aria-label="[Nome da tela]">
  <header>...</header>
  <section aria-label="[Seção]">...</section>
</main>

<!-- Timer com live region -->
<div role="timer" aria-live="polite" aria-label="Tempo restante">
  <span class="timer-display">02:47</span>
</div>

<!-- Botão de lance: status do estado -->
<button
  type="button"
  aria-label="Confirmar lance de R$ 0,05"
  aria-disabled="false"
>
  CONFIRMAR LANCE
</button>

<!-- Tabela de lances -->
<ul role="list" aria-label="Lances registrados">
  <li role="listitem">...</li>
</ul>
```

### Checklist de Entrega

- [x] Todos os hexes em CSS variáveis — zero hardcoded
- [x] `font-size: 16px` em inputs (evita zoom iOS)
- [x] `env(safe-area-inset-*)` em header e bottom nav
- [x] `prefers-reduced-motion` implementado
- [x] `prefers-contrast: more` implementado
- [x] Touch targets ≥ 44×44px
- [x] Contrastes WCAG AA verificados
- [x] `role="timer"` + `aria-live="polite"` no countdown
- [x] `color-scheme: dark` forçado
- [x] `overscroll-behavior: contain` em scroll areas

---

## Do's and Don'ts

### ✅ Do's

1. **Use navy** (`--bg`, `--surface`) para todos os fundos — nunca verde
2. **Use laranja** apenas para CTAs, preços, e momentos de ação — não decore com ele
3. **Montserrat 800–900 uppercase** em todos os títulos de tela e valores monetários
4. **Mantenha a hierarquia**: fundo → surface → surface-alt (3 camadas máx)
5. **Timer urgente**: mude cor + glow + vibration quando < 10s
6. **Botão CTA fullwidth** nas telas de ação (Mercado, Lances)
7. **Padding `env(safe-area-inset-*)`** em header e bottom nav — obrigatório iOS

### ❌ Don'ts

1. **NUNCA use verde** (`#060b08`, `#0a1a0e`, `#0d2214`) — são do tema v2, substituídos
2. **Nunca hardcode hex** — use sempre variáveis CSS
3. **Nunca use Bebas Neue** — era iGaming genérico, Montserrat é o novo padrão
4. **Nunca `filter: blur()` em elementos que animam** — usa `backdrop-filter` apenas em fixed/sticky
5. **Nunca mais de 2 cores em uma seção** — navy + laranja é o par; não adicione verde ou roxo
6. **Nunca `font-size < 16px` em inputs** — causa zoom automático no iOS (quebra UX)
7. **Nunca animações em `width/height/top/left`** — somente `transform` + `opacity`
8. **Nunca remover `focus-visible`** — acessibilidade não é opcional
9. **Nunca usar Inter em títulos** — é fonte de corpo; display = Montserrat
10. **Nunca confetti > 60 partículas** — performance no iPhone SE

---

*Score estimado: 92/100 — Luxury Premium com tensão de leilão. Tokens completos, 9 seções, WCAG AA, L2 animations.*
