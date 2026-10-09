# UTAC109d.1 — SEG6 — Validador adversarial

Worktree: `C:\Users\Moltbot\tmp-109d1-val\wt` (base 2c2b31d + patch, sem commit). Nada foi commitado, empurrado nem deployado. O único ficheiro escrito fora do worktree/scratch é este.

## VEREDICTO: **PARCIAL**

- **Correção 1 (play() no 1.º carregamento): APROVADA.** O teste não é vácuo, a mutação reproduz o defeito e a suíte está verde.
- **Correção 2 (bolsas brancas): REFUTADA no vídeo 4.** O passo novo `whitecut_v1` come letras do ecrã do portátil (conteúdo legítimo), no poster e nos primeiros ~0,7 s do vídeo. Ficam também bolsas brancas grandes no carrinho do vídeo 4. Os vídeos 2, 5, 6 e 7 ficaram melhores. Os vídeos 1, 3 e 8 são iguais ao mc59.

---

## ⛔ Bloqueantes

### ⛔1 — Vídeo 4: as letras do ecrã do portátil são removidas, no poster e no início do vídeo
O critério das bolsas (min-canal médio ≥ 234, saturação ≤ 9, área ≥ 150 px, sem ligação à borda) também apanha o **corpo das letras brancas** «ADQUIRA PRODUTOS / POR UM PREÇO / BEM BAIXINHO». Cada letra é um componente branco fechado, cercado pelo ecrã escuro.

Evidência (frames descodificados COM alfa: `ffmpeg -c:v libvpx-vp9 -i guto-4.webm -f rawvideo -pix_fmt rgba -`; região do portátil x40–250, y90–200; diferença de alfa contra `backup-mc59`):
- 88/300 frames têm píxeis removidos nessa região (máximo 1184 px). **17 frames têm mais de 50 px removidos: 0–10 e 14–20**, ou seja, o 1.º segundo.
- Em zoom, no frame 0 lê-se «A▢QUIRA PRODUTOS / PO▢ UM PREÇO»: o D e o R desaparecem e vê-se o navy. Num frame do `remmax` (t=6) faltam também letras de «PRODUTOS» e de «BAIXINHO».
- **Poster `guto-4.png`: 491 px removidos na região do portátil.** O poster é o fallback (onError/Safari) e o quadro de entrada.
- Impacto visível: o slide 4 entra SEMPRE em `currentTime = 0`, durante o crossfade de 1 s (`nv.currentTime = 0; nv.play()`). O utilizador vê letras a faltar ou a piscar em cada ciclo do carrossel.
- Imagens: `scratchpad/an/zoom_v4_40_90.png`, `an/v4_remmax_t6.png`, `an/poster4.png`.

### ⛔2 (ou ⚠️ forte) — Vídeo 4: continuam grandes bolsas de fundo branco opaco no carrinho
O enunciado diz «remove bolsas fechadas entre arames/rodas». No vídeo 4 sobra o «chão» branco entre as pernas do carrinho e uma faixa branca no interior do cesto, à esquerda. Estão em todos os frames.
- Métrica (opaco α > 200, min ≥ 215, sat ≤ 12, 1 em cada 10 frames): **v4 old 10108 px/frame → new 3409 px/frame; maior componente 909 px** (a 512²). Para comparar: v2 → maior componente 184 px; v6 → 129 px.
- Imagem: `scratchpad/an/zoom_v4_40_260.png`. Painel da direita, frames 30/150/260: o branco entre as rodas continua.

## ⚠️ Ressalvas

### ⚠️1 — O critério decide frame a frame, por isso a remoção pisca
O critério corre em cada frame, sem consistência temporal. Há componentes que só passam o limiar em alguns frames e alternam entre branco e transparente:

| vídeo | blob (bbox 512²) | frames removido | alternâncias |
|---|---|---|---|
| v4 | x106–146 y394–444 (1362 px) | 54/300 | 2 |
| v4 | x88–108 y119–160 (letras) | 6/300 | 2 |
| v4 | x165–180 y138–180 (letras) | 2/300 | 2 |
| v5 | x332–351 y279–311 (435 px) | 15/300 | 10 |
| v5 | x169–200 y279–356 (286 px) | 23/300 | 8 |
| v6 | x275–321 y375–389 (403 px) | 26/300 | 8 |
| v6 | x440–450 y291–352 (378 px) | 10/300 | 2 |

Média de alternâncias de alfa por frame (new vs old): v2 136 vs 98; **v4 165 vs 100 (máximo 1792 vs 387)**; v6 103 vs 70. No ecrã, uma mancha branca de ~400 px aparece e some (v6: lado do carrinho, frames 0–25).

### ⚠️2 — O sinal do vídeo 1 só escapou por pouco
O letreiro «MENOR LANCE ÚNICO» do vídeo 1 é um componente branco fechado, com cerca de 2319 px a 512². Ficou intacto, mas só porque a luminância média dele ficou abaixo de 234 neste material. Os vídeos 1, 3 e 8 não mudaram de conteúdo: diferem em apenas 16 bytes no cabeçalho, e a diferença de alfa contra o mc59 dá 0 px em todos os frames. O critério actual não tem nenhuma proteção estrutural para este tipo de conteúdo. Basta mudar o material ou o limiar para ele cair, como as letras do vídeo 4.

**Sugestão para a correção (não a apliquei):** usar o anel em volta do componente (dilatação menos componente). Uma bolsa de fundo é cercada por metal ou arame cinza claro; letras e ecrãs são cercados por escuro. Juntar a isso uma máscara temporal (mediana ou votação em ≥ X% dos frames) e/ou excluir explicitamente a bbox do ecrã do vídeo 4.

## ℹ️ Notas (o que passou)

- **(c) O teste novo não é vácuo.** Fiz eu as mutações em `CarrosselGUTO.jsx` e restaurei o ficheiro byte-idêntico (sha256 `00b45c1e…39f6` antes = depois, `cmp` OK):
  - M1: deps `[cur, reduce]`, o defeito original → **RED** («1.º carregamento»).
  - M2: código antigo completo (guarda e deps) → **RED**.
  - M4: play duplicado → **RED** (2 testes).
  - M5: play no vídeo `nxt` → **RED** (2 testes).
  - M3: tirar só a guarda `!pronto` → verde. É um mutante equivalente: sem `pronto` não há `<video>`, logo o ref é undefined e o efeito não faz nada. Não é um furo.
- **(a) Desktop, pela leitura da lógica:**
  - O efeito só volta a correr quando `cur`, `reduce` ou `pronto` mudam.
  - O `play()` sobre o vídeo que já toca, na troca de `cur`, é o mesmo comportamento de antes.
  - O crossfade (`handleTimeUpdate`) não foi tocado.
  - Com reduced-motion não se monta nenhum `<video>` e o efeito sai cedo, logo não toca.
  - No StrictMode de dev o efeito corre 2× e chama `play()` 2×, o que é inócuo.
- **(b) APK:** `Bridge.java:586` do Capacitor tem `setMediaPlaybackRequiresUserGesture(false)`. Os vídeos são `muted` e `playsInline`, portanto o `play()` programático é permitido no WebView e no Chrome Android.
- **(f) Formato:** os 8 webm são VP9, 512×512, `alpha_mode=1`, com durações iguais às do mc59 (10 s / 9,999 s). Os 8 posters são RGBA 512². Os md5 conferem com `tmp-109d1/md5-novos.txt`.
- **(g) Âmbito:** o `git status` mostra só os 13 assets, `CarrosselGUTO.jsx`, `utac109d-carrossel.test.mjs` e o teste novo (untracked). `git diff --stat` sobre backend e `*package*.json` está vazio. Não há `.bak-*` novos nem EM_BREVE alterado.
- **(h) Suíte canónica** (`node ../../scripts/mc966-suite-harness.mjs ambos < /dev/null`, foreground, 2m06s): **frontend 917/917, backend 1095/1101, VEREDITO VERDE.** Os 2 ficheiros do carrossel correm à parte: 7/7.
- **(d) Vídeos 2, 5, 6 e 7:** a camisa, a gola, os olhos, o letreiro do telemóvel do v2 («O MENOR LANCE ÚNICO VENCE»), as caixas, a sacola branca do v5 e o micro-ondas ficaram intactos nos frames inspeccionados (0, 150, frame de remoção máxima, frame de resíduo máximo). O vídeo 2 ficou limpo: o branco entre as pernas do carrinho desapareceu.

## O que NÃO medi
- Não corri o carrossel num browser real (Chrome desktop, Chrome Android ou o APK) para ver `paused=false` e a troca de slides em produção. A prova de (a)/(b) é o arnês `_hook-runner` mais a leitura do código e do Bridge do Capacitor, não uma medição em runtime.
- Não inspeccionei os 300 frames dos 8 vídeos a olho. A cobertura visual são 4 frames por vídeo mais os zooms dirigidos. O resto é métrico: diferença de alfa, mapa de calor de remoção e componentes brancos residuais com limiares que eu escolhi.
- Não validei Safari/iOS (fallback para poster). Lá o poster 4 com letras em falta ficaria permanente.
- Não verifiquei outros ecrãs visualmente (Carteira, MLC, OP). Só pelo diff, que não lhes toca.

Artefactos: `C:\Users\Moltbot\AppData\Local\Temp\claude\C--Users-Moltbot\a6bbefbd-3f97-4b3b-945c-895c8909c732\scratchpad\an\` (scripts `an.py`, `zoom.py`, `heat.py`, `flick.py`, `resid.py`, `v4.py` um nível acima).

---

## Ronda 2

**Veredicto: APROVADO COM RESSALVAS.** 0 bloqueantes. Os 2 bloqueantes da ronda 1 estão fechados. Ficam duas ressalvas no vídeo 4: um branco residual pequeno no carrinho e um piscar de manchas pequenas, menor do que na ronda 1.

Medi com os mesmos scripts da ronda 1 (scratchpad `an.py`, `v4.py`, `flick.py`, `resid.py` e o novo `reg.py`): todos os frames descodificados **com alfa**, comparados com o `backup-mc59`, compostos sobre navy.

### (1) Texto do ecrã do v4 e do telemóvel do v2: OK em todos os frames
Pixels opacos perdidos por frame em relação ao mc59, nos 300 frames:

| região | máximo/frame | frames com > 10 px |
|---|---|---|
| ecrã do portátil v4 (x40–250, y90–200) | 3 px | 0 |
| telemóvel v2 (x30–110, y160–280) | 5 px | 0 |

- `v4.py`: **0 frames** com mais de 50 px removidos (a ronda 1 tinha 17).
- Poster `guto-4.png`: **0 px** removidos no ecrã (a ronda 1 tinha 491).
- Zoom dos frames 0, 10 e 20: «ADQUIRA PRODUTOS / POR UM PREÇO / BEM BAIXINHO» completo, igual ao mc59 (`an/zoom_v4_40_90.png`).
- Os 1–5 px que sobram são ruído de borda do codec, não letras.

### (2) Bolsas brancas grandes: as grandes saíram; sobra branco pequeno no v4
`resid.py` (opaco α > 200, min ≥ 215, sat ≤ 12; 1 em cada 10 frames):

| vídeo | média/frame (mc59 → R1 → R2) | maior componente (mc59 → R1 → R2) |
|---|---|---|
| v2 | 7633 → 1115 → **736** | 2305 → 184 → **184** |
| v4 | 10108 → 3409 → **2398** | 2744 → 909 → **552** |
| v6 | 3384 → 914 → **721** | 1203 → 129 → **131** |

- **⚠️ R2-1:** no v4 ainda se vê a faixa branca do chão sob a prateleira de baixo do carrinho, entre as rodas (`an/zoom_v4_40_240.png`, frames 30/150/255). A maior mancha tem 552 px a 512² (antes eram 2744). As bolsas entre as pernas do carrinho e as do cesto saíram. Não bloqueia.

### (3) Piscar: melhor que a ronda 1, ainda acima do mc59

Transições de opacidade por frame (média; máximo):

| vídeo | mc59 | ronda 1 | ronda 2 |
|---|---|---|---|
| v2 | 97,8; 417 | 136; 530 | **118,5; 480** |
| v4 | 99,9; 387 | 165; 1792 | **126,5; 475** |
| v6 | 70,5; 799 | 103; 823 | **80,0; 817** |

`flick.py` encontra blobs transitórios (removidos em menos de 50% dos frames):
- v4: um de 273 px (x157–228, y269–283: o branco entre o punho do carrinho e o portátil), com 8 alternâncias em 10 s; outros de 122/105/39 px, com 7–8 alternâncias.
- v2: blobs de 140/122/38 px, com 4–8 alternâncias.
- v6: nenhum blob transitório ≥ 30 px.

**⚠️ R2-2:** em 10 s, um retalho de cerca de 270 px no v4 alterna algumas vezes entre branco e transparente. No mc59 ficava sempre branco. A ronda 1 tinha um de 1362 px e letras a piscar. Não bloqueia.

### (4) Conteúdo legítimo: intacto
- Cabeça e gola: perda máxima de 5 px/frame (v2), 6 (v4) e 9 (v6), nenhum frame acima de 10 px. Ruído de borda.
- Visualmente (`an/v2_remmax_t265.png`, `an/v6_remmax_t101.png`, zooms do v4): rodas, eletrodomésticos do cesto, caixas, ferro, torradeira, olhos e medalhão intactos. As remoções (magenta) estão só no fundo entre as pernas e o cesto.

### (5) Os 5 vídeos repostos são byte-idênticos ao backup
`cmp` contra `backup-mc59`: 1, 3, 5, 7 e 8 (webm e png) **IDÊNTICOS**; 2, 4 e 6 diferem. O `git status` só mostra 2, 4 e 6 alterados.

### (6) Formato: OK
v2, v4 e v6 são VP9 512×512 com `alpha_mode=1`. Os posters são RGBA 512×512.

### (7) Suíte canónica: verde
`node ../../scripts/mc966-suite-harness.mjs ambos < /dev/null` em foreground: **frontend 917/917, backend 1095/1101, VERDE.**

### (8) play() e o seu teste: OK
- `CarrosselGUTO.jsx` tem sha256 `00b45c1e…39f6`, o mesmo da ronda 1, onde as mutações M1/M2/M4/M5 deram RED.
- Os 2 ficheiros de teste do carrossel: 7/7.
- O diff de `src/` continua com só 2 ficheiros alterados, mais o teste novo ainda não versionado (untracked).

### O que não medi (ronda 2)
- Não corri o carrossel num browser real nem no APK.
- A cobertura visual é por frames escolhidos mais zooms; o resto é métrico com limiares meus.
- Não voltei a correr as mutações do play(), porque o ficheiro é byte-idêntico ao da ronda 1.
