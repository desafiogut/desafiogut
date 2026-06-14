# Loops de fundo em looping — MC26.1

Camada de animação **opcional** sobre os fundos oficiais do DESAFIOGUT. 5 variações ×
2 viewports = 10 ficheiros WebM (VP9). O fundo estático oficial permanece como
fallback/poster — estes loops **não** substituem nada por defeito.

> **Par escolhido (default de produção): `v3` — Profundidade Cinemática**
> (`fundo-loop-v3-desktop.webm` + `fundo-loop-v3-mobile.webm`). As restantes 4
> variações ficam disponíveis na biblioteca para usos específicos (ver tabela).

## Assets

| Ficheiro | Viewport | Dimensões | Uso pretendido |
|---|---|---|---|
| `fundo-loop-v1-desktop.webm` / `-mobile.webm` | desktop / mobile | 1920×1288 / 1080×1935 | **Confetes Suaves** — fundo por omissão (calmo, premium) |
| `fundo-loop-v2-*.webm` | ″ | ″ | **Brilho Intenso** — evento especial (mais sparkles dourados) |
| `fundo-loop-v3-*.webm` | ″ | ″ | **Profundidade Cinemática** — parallax (camada de fundo mais lenta) |
| `fundo-loop-v4-*.webm` | ″ | ″ | **Minimalista** — páginas de formulário/lance (máximo foco) |
| `fundo-loop-v5-*.webm` | ″ | ″ | **Celebração Total** — overlay de vencedor/celebração |

Todos: **VP9 · 24 fps · 5.0 s · loop seamless · 0.19–0.58 MB** (≤ 5 MB). Proporção
nativa da fonte (sem esticar) — deixar o CSS `object-fit:cover` recortar.

## Como foram gerados (MC26.1)

Pipeline **procedural local** (não-IA): partículas (confetes, sparkles dourados,
holofotes) desenhadas em **canvas 2D (`@napi-rs/canvas`)** sobre a imagem oficial
**100% intacta**, encode VP9 via ffmpeg. Decidido em vez de ComfyUI/Nanobanana porque
Nanobanana só gera imagem estática (não vídeo); este pipeline garante zero regressão,
loop perfeito e ficheiros minúsculos.

- **Loop seamless por construção:** cada partícula segue trajetória fechada (Lissajous
  sinusoidal) com frequências inteiras sobre a fase `i/120` → frame 120 ≡ frame 0,
  sem cross-dissolve nem salto.
- **Centro limpo:** máscara de densidade reduz partículas na zona central da UI;
  o movimento vive no topo e nas margens.
- **Paleta:** navy `#050818` + laranja `#ff6b35` + dourado (`#ffcf6b`/`#ffe7a8`/`#ffb347`).
- **Seed fixo por variação** → coerência desktop/mobile.
- Gerador: `~/Desktop/mc26-tools/gen-loop.mjs` (fora do repo).
  Regenerar: `node gen-loop.mjs <1..5> <desktop|mobile>`.

## Integração sugerida (sessão futura — NÃO feita aqui)

`<video autoplay muted loop playsinline poster="background-*.webp">` como camada
opcional sobre/abaixo de `.gut-bg-layer`, com:
- `poster` = imagem estática oficial (fallback + anti-CLS).
- `@media (prefers-reduced-motion: reduce)` → esconder `<video>`, manter imagem.
- respeitar z-index atual (`.gut-bg -50` → `.gut-atmosphere -40`).
