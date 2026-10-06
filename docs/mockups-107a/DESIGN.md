---
version: alpha
name: DesafioGUT
description: Navy profundo com vidro sólido e um acento laranja; dourado reservado a valores.
colors:
  primary: "#ff6b35"
  secondary: "#f5a623"
  neutral: "#050818"
  surface: "#0c1132"
  text: "#e8f0fe"
  text-body: "#c8d0f0"
  muted: "#6b7db8"
  muted-strong: "#8fa0d8"
  on-gold: "#0a0f1a"
  pix: "#00d4ff"
  senhas: "#a78bfa"
  success: "#10b981"
  danger: "#ff5a5f"
typography:
  display:
    fontFamily: Orbitron
    fontSize: 18px
    fontWeight: 800
    letterSpacing: "0.04em"
  section:
    fontFamily: Orbitron
    fontSize: 14px
    fontWeight: 800
  value-xl:
    fontFamily: Inter
    fontSize: 38px
    fontWeight: 900
    lineHeight: 1.05
  body-md:
    fontFamily: Inter
    fontSize: 15px
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  sm: 10px
  md: 12px
  lg: 14px
spacing:
  gap: 12px
  pad: 16px
  pad-wide: 20px
  gutter: 16px
  gutter-wide: 24px
  touch: 48px
  column: 640px
components:
  glass:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 16px
  glass-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-strong}"
    typography: "{typography.label}"
  glass-secondary-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
  glass-body:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-body}"
  glass-value:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.value-xl}"
  glass-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.display}"
  button-gold:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.md}"
    height: 48px
  button-pix:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.pix}"
    rounded: "{rounded.md}"
    height: 48px
  text-senhas:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.senhas}"
  text-success:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.success}"
  text-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
  page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text}"
---

## Overview

Mockups do UTAC107a-front. A fonte dos valores é o código no HEAD `536c9cb`: `globals.css` (@theme e `.gut-glass-standard`), `glassTokens.js` e os `COR` locais das páginas. `surface` não é uma cor declarada no código. É o vidro `rgba(13,18,53,0.88)` já composto sobre o navy `#050818`, ou seja, a cor que o texto tem atrás de si.

## Colors

- **Primary (#ff6b35):** título de aba e laranja de marca.
- **Secondary (#f5a623):** proposta de dourado único. Hoje coexistem `#f5a623` e `#ff9500`.
- **On-gold (#0a0f1a):** texto sobre dourado. O texto branco de hoje dá 2,03:1 e falha o AA.
- **Muted (#6b7db8):** 4,60:1 sobre o vidro. Só para texto ≥ 14 px.
- **Muted-strong (#8fa0d8):** proposta para rótulos pequenos.

## Typography

Orbitron só em títulos (display e secção). O resto é Inter. O menor texto passa a 12 px (hoje há rótulos a ≈ 9 px).

## Layout

Coluna única de 640 px nas 4 abas. Margem lateral de 16 px no mobile e 24 px a partir de 700 px. Padding interno de 16/20 px em **todo** o vidro. Área de toque mínima de 48 px.

## Components

`glass` é a única superfície de conteúdo (Regra 1). As exceções são a barra inferior, os modais, os botões e o rodapé. `button-gold` é o CTA principal, um por vista.

## Do's and Don'ts

- Não reintroduzir `backdrop-filter` (MC82.1).
- Não escrever texto do conteúdo fora de `glass`.
- Não pôr texto branco sobre dourado.
