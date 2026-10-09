# UTAC109d.1 — Carrossel no telemóvel: diagnóstico + correcção

**Executor:** Claude Code (Opus 5.5) · **Data:** 2026-10-09 · **Baseline:** `2c2b31d` (= origin/main, confirmado)
**Tipo:** diagnóstico + correcção (frontend + assets).

## §Baseline (SEG-1)
- HEAD = origin/main = `2c2b31d` (esperado). Suíte de partida (UTAC109d): 914/914 + 1095/1101.
- Lidos: `_logs/UTAC109d-remover-fundo.md` (incl. §Apêndice A), `CarrosselGUTO.jsx`, `useAposPrimeiraPintura.js`.
- Reprodução (Chrome DevTools, dev local vite :3000; gate LGPD passado **só no ambiente local isolado** —
  em produção o gate NÃO foi clicado por ninguém):
  - **375px + UA Android Chrome**, carregamento novo: os 2 `<video>` (`guto-1/2.webm?v=mc59`) ficam
    `paused:true · readyState:4 · currentTime:0 · error:null` durante 6 s (4 amostras).
  - **1440px desktop**, carregamento novo: **idêntico** (parado em t=0).
  - **Navegação SPA** (sair para `/carteira` e voltar a `/`): `guto-1` `paused:false, t=2,89 s` → **anima**.
  - `canPlayType('video/webm; codecs="vp9"')` = `"probably"`; `prefers-reduced-motion` = false.

## §SEG0 — Respostas do operador (R18)
- **(2) Navegador:** **Chrome / Android / APK**.
- **(1) Animava antes?** Respondida por medição: **não**, num carregamento novo, em nenhum aparelho, desde o
  **MC88.36** (`0f07456`, 2026-07-28) — ver §SEG2. Não é regressão do 109d.
- **Correcção escolhida:** «Religar o play()».
- **R18 — EXTENSÃO DE ESCOPO (registada):** o operador reportou «ainda tem muitos vídeos com o fundo branco».
  Medido (§SEG2) e escalado: corrigir exige **reprocessar os 8 vídeos e alterar o pipeline**, o que o enunciado
  deste UTAC proibia («NÃO regerar os 8 vídeos» / «NÃO alterar o pipeline do 109d»). **O operador autorizou
  explicitamente** («Autorizo aqui») e confirmou depois com 10 condições obrigatórias (backup, 1 commit + 1
  deploy, mc60, Apêndice A v2, teste + mutação, validador às 2 correcções, registar o R18, matar o vite, 3
  registos, verificação em produção com md5).
- Mensagens intermédias do operador: «no deploy no netlify não aparece o carrossel» e «não estão todos os
  vídeos, são 8» → confirmado que os **8** webm + 8 png estão em produção (curl: 8× `200 video/webm`, 8×
  `200 image/png`); o que o operador via era o defeito do play() (ver «só 1 dos 8» abaixo).

## §SEG1/SEG2 — Diagnóstico (hipóteses uma a uma)

| # | Hipótese | Evidência | Veredicto |
|---|---|---|---|
| H-1 (Hermes) | VP9 alpha não suportado em mobile → poster | decoder OK (`readyState 4`, `error null`, `canPlayType=probably`); e o **desktop também** fica parado num carregamento novo | **REFUTADA** |
| H-2 | MIME/headers errados | produção: 8× `200 video/webm`, 8× `200 image/png` | descartada |
| H-3 | lazy loading não dispara | `useAposPrimeiraPintura` dispara (os `<video>` montam, `readyState 4`) | descartada — mas é **parte** da causa (H-6) |
| H-4 | crossfade CSS falha | `opacity` 1 (activo) / 0 (próximo), correcto | descartada |
| H-5 | alfa composto a preto | alfa correcto sobre navy (folha de contacto dos 8) | descartada |
| **H-6 (nova)** | o `play()` nunca é chamado no 1.º carregamento | ver abaixo | **CONFIRMADA — causa raiz** |

**Causa raiz (H-6):** em `CarrosselGUTO.jsx:55-65` (antes), o `useEffect` que chama `v.play()` dependia de
`[cur, reduce]`. Os `<video>` só montam quando `pronto` (`useAposPrimeiraPintura`, `:125`) passa a `true`,
**depois** de o efeito já ter corrido sem vídeos. Como `cur`/`reduce` não mudam, o efeito **não volta a
correr**, e os `<video>` **não têm `autoPlay`** (nunca tiveram: `git log -S autoPlay` vazio). Depois de uma
navegação interna, o sinalizador de MÓDULO `jaPintou` já é `true`: os vídeos montam no 1.º render, o efeito
encontra-os e anima. Foi esse o caso que o 109d viu no desktop. Introduzido em `0f07456` (MC88.36-S3b,
2026-07-28). **No telemóvel/APK a app abre quase sempre de fresco, logo fica sempre parado.**

**«Só aparece 1 dos 8» é o mesmo defeito:** a troca de slide (`handleTimeUpdate`) só dispara quando o vídeo
activo passa `duration × 0,5`; como o vídeo 1 nunca toca, fica em t=0 e o carrossel **nunca avança** — os
outros 7 existem em produção mas nunca chegam a ser mostrados. A correcção do play() resolve os dois.

**Defeito 2 — bolsas de fundo branco** (medido nos 8 webm de produção, alfa descodificado com `libvpx-vp9`,
2 fps): borda **0,000** de branco em todos os frames dos 8 (o flood-fill de bordas do 109d funciona), mas
branco opaco na metade inferior: v2 **6,2 %**, v4 **7,2 %**, v6 **2,6 %**. Visualmente são **bolsas de
fundo FECHADAS** entre arames/rodas dos carrinhos, entre as pernas e entre sacos — regiões brancas **não
ligadas à moldura**, que o flood-fill a partir das bordas não alcança por construção. Perfil nos MP4-fonte
(frame 150): bolsas com luminância-min média **236–247** e saturação **1,5–7**; branco legítimo abaixo
(letreiro do v1 212,7/sat 11,9; gola/pele ~208–217/sat 17+).

## §SEG3 — Correcção

**C1 — play() (`CarrosselGUTO.jsx`):** deps `[cur, reduce]` → `[cur, reduce, pronto]` + guarda
`if (reduce || !pronto) return;`. Verificado no Chrome (desktop, carregamento novo): `guto-1` `paused:false`,
t = 1,08 → 3,09 → 5,10 s.

> ⚠️ **A 1.ª versão da C2 (abaixo, mantida à vista) foi REFUTADA pelo validador (ronda 1, PARCIAL):** apagava
> letras brancas do ecrã do portátil do **v4** («A▢QUIRA», 17 frames do 1.º segundo + poster), deixava bolsas
> grandes no carrinho do v4 (borderline lum 233–235) e **piscava** (decisão frame a frame). Corrigida pela
> **C2 v2** (mais abaixo). Erro meu: validei o critério em 1 frame (f150) por vídeo; as letras do v4 só
> passavam o limiar no 1.º segundo.

**C2 v1 (REFUTADA) — bolsas (pipeline + 8 vídeos):** pipeline do 109d + passo novo: os componentes brancos
**não ligados à borda** com `lum ≥ 234`, `sat ≤ 9` e `área ≥ 150 px` passam a fundo. Antes de processar, o
critério foi pintado a vermelho nos 8 frames-fonte: vermelho **só** nas bolsas; letreiro (v1), camisas,
portátil (v4), frigorífico/micro-ondas brancos (v8) e máquina de lavar (v1) **intactos**. Reprocessados os 8
a partir de `Desktop\NOVO GUTO animado oficial\N.mp4` (≈ 54–69 s cada, `alpha_mode=1`, 512²).
Branco opaco na metade inferior, antes → depois: v2 6,2 % → **1,1 %** · v4 7,2 % → **1,8 %** ·
v6 2,6 % → **0,7 %** · v5 0,4 → 0,1 · v8 0,9 → 0,9 · v1/v3/v7 inalterados (sem bolsas; os posters 1/3/8
ficaram byte-idênticos). O resíduo é branco de **conteúdo** (eletrodomésticos/letreiros), não fundo.
Tamanhos: v2 539→589 KB, v4 513→583 KB, v5 688→730 KB, v6 432→468 KB.
**C2 v2 (FINAL) — critério com anel + voto temporal** (`bolsas_v2.py`, Apêndice A v2): componentes brancos
não ligados à borda com `lum ≥ 230`, `sat ≤ 10`, `área ≥ 150` **E** anel de 3 px com **< 45 % de pixels escuros
(<90)** — medido: letras do ecrã do v4 têm anel 64–71 % escuro, as bolsas reais ≤ 37 % — **E voto temporal
±3 frames (≥ 4 de 7) com o pixel branco no frame actual** (acaba com o piscar); só nos vídeos {2,4,5,6,7,8}
(o v1 tem um reflexo na máquina de lavar com perfil de bolsa e não tem bolsas). Processamento em 2 passagens.
Medido a 30 fps contra o backup mc59: ecrã do v4 **máx 7 px** opacos perdidos/frame (as letras íntegras no
1.º segundo, verificado a olho); branco na metade inferior v2 8124→**1030**, v4 9485→**1263**, v6 3370→**645**
px/frame (maior blob 2353→225, 2876→571, 1201→139); transições de opacidade máx/frame v2 417→480, v4 387→475,
v6 799→817 (≈ mc59 — sem piscar novo). v5/v7/v8 praticamente iguais (0–24 px/frame) ⇒ **só os vídeos 2, 4 e 6
mudam**; **1, 3, 5, 7, 8 repostos byte-idênticos do backup mc59** (md5 em `tmp-109d1\md5-final.txt`).
A faixa cinza sob o carrinho do v6 é sombra do chão (lum ~206–210), não fundo branco — declarada.
**Cache-bust:** `const V` `mc59` → **`mc60`** (assets `immutable, max-age=1 ano`).
**Backup** dos 16 assets anteriores: `C:\Users\Moltbot\tmp-109d1\backup-mc59\` (+ `md5-antes.txt`, 16/16 OK).

## §SEG4 — Testes + mutação
- **Novo** `src/__tests__/utac109d1-carrossel-play.test.mjs` (3 testes, **runtime**): o componente REAL corre
  no `_hook-runner` (useState/useEffect/useRef reais); um wrapper liga os refs dos `<video>` devolvidos ANTES
  dos efeitos (ordem do commit do React); o `requestIdleCallback` é controlado pelo teste. Prova: (1) antes da
  1.ª pintura só há poster; (2) **1.º carregamento**: ao montar os vídeos, o activo (`guto-1`) recebe
  exactamente 1 `play()`; (3) depois de a app ter pintado, toca na 1.ª montagem.
- **Mutação M1** (repor o código antigo: deps sem `pronto`, sem a guarda) → **teste (2) RED** (2 pass / 1 fail);
  restauro **byte-idêntico** (md5).
- `utac109d-carrossel.test.mjs`: guarda do cache-bust passou de `mc59` para `mc60` (extensão declarada).
- Suíte canónica: **frontend VERDE 917/917** (914 + 3) · **backend VERDE 1095/1101** (inalterado).
- `npx vite build` → **exit 0** (para um dir de scratch, não para o `dist/` do APK).

## §SEG6 — Validador adversarial
Subagente em worktree próprio (helper A13, `tmp-109d1-val/wt`, base `2c2b31d` + patch, sem commit). Veredicto
verbatim: `_logs/UTAC109d.1_SEG6_VALIDADOR.md` (rondas 1 e 2).
- **Ronda 1 — PARCIAL.** C1 (play) **APROVADA**: mutações próprias (tirar `pronto` das deps, repor o código
  antigo, play duplicado, play no `nxt`) → todas RED; tirar só a guarda `!pronto` = equivalente declarado; APK:
  `Bridge.java:586` `setMediaPlaybackRequiresUserGesture(false)` + `muted`/`playsInline` ⇒ play programático
  permitido. C2 v1 **REFUTADA**: ⛔ letras do ecrã do v4 apagadas (17 frames, poster −491 px); ⛔ bolsas grandes
  no carrinho do v4 (10108→3409 px/frame); ⚠️ piscar (v4 transições máx 387→1792; v5/v6 blobs a alternar);
  ⚠️ o letreiro do v1 só escapava por margem. → corrigido com a **C2 v2**.
- **Ronda 2 — APROVADO COM RESSALVAS, 0 bloqueantes.** Texto do v4/v2 íntegro em **300/300** frames (máx 3 px
  / 5 px perdidos, ruído de codec; poster 4: 0 px); bolsas: v2 7633→736, v4 10108→2398, v6 3384→721 px/frame;
  conteúdo legítimo intacto; 1/3/5/7/8 **byte-idênticos** ao mc59 (`cmp`); formato OK; suíte 917/917 +
  1095/1101; `CarrosselGUTO.jsx` com o sha256 da ronda 1.
  - ⚠️ **R2-1 (declarada, não corrigida):** no v4 ainda se vê uma faixa branca do chão entre as rodas, sob a
    prateleira de baixo do carrinho (maior blob 552 px).
  - ⚠️ **R2-2 (declarada, não corrigida):** piscar residual ligeiramente acima do mc59 (média v4 100→126);
    uma mancha de 273 px no v4 (entre o punho do carrinho e o portátil) alterna 8× em 10 s.
  - Não medido pelo validador: browser real / APK; todos os frames a olho.

## §SEG7 — Deploy + verificação em produção
- **Commit único das 2 correcções:** `ea857c6` (ficheiros individuais; nada mais por publicar em `origin/main..HEAD`).
- **Deploy único:** `git push` `2c2b31d..ea857c6` → **auto-deploy Git** do Netlify publicou a **t+160 s**
  (bundle `index-y2nUEYgn.js` → **`index-Bez_-42d.js`**). Por isso **não** se correu o `netlify deploy --build
  --prod` da CLI: correr os dois daria dois deploys (condição 2 do operador) e a CLI suja o `package-lock`.
  Desvio declarado face ao texto do enunciado.
- **Produção:** site **200**, `/.netlify/functions/health` **200**; os **16** assets com `?v=mc60` descarregados
  de produção = **md5 16/16 iguais ao repo** (`tmp-109d1\md5-prod.txt`); crawl de **183** chunks: o carrossel
  vive em `PrivyRoot-BJZw88XW.js`, que contém `mc60` e **não** `mc59`.
- **Comportamento (build de produção do MESMO commit, `vite preview` em localhost — o gate legal de produção
  não foi clicado em nome do operador):** desktop 1440px, carregamento novo → `guto-1` anima e o carrossel
  **avança** 1 → 2 → 3 em 12,5 s; emulação **375px Android Chrome** → anima no 1.º carregamento, crossfade
  com os dois vídeos a tocar, 1 → 2 → 3 → 4. **Não medido:** num telemóvel/APK real (o APK traz o frontend
  empacotado — só recebe isto com AAB novo, 106i/109j).
- `package-lock.json`/`package.json` **limpos** (o auto-deploy não toca na árvore local). vite :3000 e o
  preview :4173 mortos (incl. 2 processos `node vite.js` órfãos que o TaskStop não matava).

## §Escopo
Tocados: `CarrosselGUTO.jsx`, 6 assets do carrossel (webm + png dos vídeos 2, 4, 6),
`utac109d-carrossel.test.mjs` e o teste novo. **Intactos:** backend (`netlify/`), `package*.json`, os 5
`.bak-*`, `EM_BREVE_MODE = true`, MLC/OP/Carteira, NORTE/ESCOPO-ALVO/FICHA-PLAY/MC100_MATRIZ, bytes de
controlo do CLAUDE.md. Servidor vite :3000 **morto antes do commit** (2 processos: o do `npm run dev` e um
`node vite.js` órfão, PID 6492; porta livre confirmada por `netstat`).

## §Erros dos meus instrumentos (declarados)
1. A 1.ª tentativa de abrir o dev local por `127.0.0.1`/`localhost` foi antes de o vite estar pronto
   (`ERR_CONNECTION_REFUSED`); por `[::1]` abriu, mas o Privy rebenta fora de `localhost`/HTTPS («Embedded
   wallet is only available over HTTPS» → «Erro inesperado»). Só por `http://localhost:3000` mediu.
2. Uma 1.ª varredura de vídeos devolveu `[]` porque a página estava no ecrã de erro (instrumento a medir o
   vazio) — apanhado pelo screenshot antes de concluir.
3. O 1.º gerador deste log, por heredoc no `bash -c`, partiu-se com os acentos graves do markdown (lição já
   registada no MC95.1); refeito por ficheiro Python.

## §Custo e duração
- Duração: ≈ 04:25 → 05:40 (≈ 1 h 15) — **dentro do HI5 (2 h)**.
- Validador: ronda 1 **368 323** + ronda 2 **389 752** = **758 075 tokens** → a 400 ¢/1M input · 2000 ¢/1M
  output · 20 ¢/1M cache (Opus 5.5): **15–1516 ¢** (303 ¢ se tudo input).
- Sessão principal: **não medida** com precisão (sem `state.db`; usar `/cost`). Estimativa ≈ 260 k tokens de
  contexto = 5–520 ¢ (104 ¢ se tudo input).

## §Apêndice A v2 — O pipeline, versionado (substitui o Apêndice A do UTAC109d)

Diferença para a v1: o passo **«bolsas de fundo fechadas»** (`bolsas_v2.py`: lum ≥ 230, sat ≤ 10, área ≥ 150,
anel com < 45 % escuro, voto temporal ±3 frames ≥ 4/7, só vídeos {2,4,5,6,7,8}), aplicado numa 1.ª passagem;
a 2.ª passagem compõe com o flood-fill de bordas da v1 (inalterado). Uso (ambos os ficheiros na mesma pasta):
`WHITE_THR=185 python pipeline_v2.py 2 4 6`. Valores calibrados para o material de 2026-10 — rever ao trocar vídeos.
Verificação obrigatória: `ffprobe -show_entries stream_tags=alpha_mode` = 1; medir o alfa SEMPRE com
`ffmpeg -c:v libvpx-vp9 -i f.webm -pix_fmt rgba` (o decode por omissão descarta-o).

```python
# ---- bolsas_v2.py ----
# UTAC109d.1 — criterio v2 das bolsas de fundo fechadas (pos-validador).
import cv2, numpy as np
from scipy import ndimage

POCKET_LUM, POCKET_SAT, POCKET_AREA = 230, 10, 150
ANEL_PX, ANEL_ESCURO_LUM, ANEL_ESCURO_MAX = 3, 90, 0.45
VOTO_JANELA, VOTO_MIN = 3, 4          # +-3 frames, maioria de 4 em 7
VIDEOS_COM_BOLSAS = {2, 4, 5, 6, 7, 8}  # v1/v3 sem bolsas (v1: reflexo da maquina tem perfil de bolsa)
_K = np.ones((2 * ANEL_PX + 1, 2 * ANEL_PX + 1), np.uint8)

def bolsas_frame(bgr, thr):
    """Mascara (bool) das bolsas de fundo fechadas de UM frame (sem voto temporal)."""
    mn = bgr.min(axis=2)
    lab, n = ndimage.label(mn >= thr)
    out = np.zeros(mn.shape, bool)
    if n == 0:
        return out
    borda = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    mnf = mn.astype(np.float32)
    satf = bgr.max(axis=2).astype(np.float32) - mnf
    for k, sl in enumerate(ndimage.find_objects(lab), start=1):
        if sl is None or k in borda:
            continue
        y0, y1 = max(sl[0].start - ANEL_PX, 0), sl[0].stop + ANEL_PX
        x0, x1 = max(sl[1].start - ANEL_PX, 0), sl[1].stop + ANEL_PX
        m = lab[y0:y1, x0:x1] == k
        a = int(m.sum())
        if a < POCKET_AREA:
            continue
        sub = mnf[y0:y1, x0:x1]
        if sub[m].mean() < POCKET_LUM or satf[y0:y1, x0:x1][m].mean() > POCKET_SAT:
            continue
        anel = cv2.dilate(m.astype(np.uint8), _K).astype(bool) & ~m
        if anel.any() and (sub[anel] < ANEL_ESCURO_LUM).mean() >= ANEL_ESCURO_MAX:
            continue  # cercado de escuro = letra/ecra/conteudo, nao fundo
        out[y0:y1, x0:x1] |= m
    return out

def votar(mascaras, brancos):
    """Voto temporal: pixel e bolsa se for bolsa em >= VOTO_MIN de 2*VOTO_JANELA+1 frames E branco agora."""
    n = len(mascaras)
    votos = np.zeros(mascaras[0].shape, np.uint8)  # soma deslizante (sem empilhar: 300 frames = 1 GiB)
    for j in range(min(n, VOTO_JANELA + 1)):
        votos += mascaras[j]
    fora = []
    for i in range(n):
        a, b = max(0, i - VOTO_JANELA), min(n, i + VOTO_JANELA + 1)
        need = min(VOTO_MIN, b - a)
        fora.append((votos >= need) & brancos[i])
        if i + VOTO_JANELA + 1 < n:
            votos += mascaras[i + VOTO_JANELA + 1]
        if i - VOTO_JANELA >= 0:
            votos -= mascaras[i - VOTO_JANELA]
    return fora

# ---- pipeline_v2.py ----
# -*- coding: utf-8 -*-
"""UTAC109d — PIPELINE (v2: white_thr calibrado + poster com canais corrigidos).
Mecanismo = o do MC58.2 §3.1 (flood-fill de bordas -> premult 960->512 -> erode 2px -> VP9 yuva420p).
DESVIO DECLARADO: white_thr 232 (default documentado) -> 185, calibrado para o material novo
(o chao claro do video v2 nao e apanhado a 232; a 185 o aco escuro da maquina fica identico).
"""
import os, subprocess, sys, time
import cv2, numpy as np
from scipy import ndimage
from bolsas_v2 import bolsas_frame, votar, VIDEOS_COM_BOLSAS  # UTAC109d.1 (criterio v2)

WHITE_THR = int(os.environ.get("WHITE_THR", "185"))
ERODE_PX = 2
ALVO = 512
CRF = 30

def whitecut_v1(bgr, thr=WHITE_THR):
    mn = bgr.min(axis=2)
    branco = mn >= thr
    lab, n = ndimage.label(branco)
    if n == 0:
        return np.full(branco.shape, 255, np.uint8)
    borda = np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])
    ids = np.unique(borda); ids = ids[ids != 0]
    return np.where(np.isin(lab, ids), 0, 255).astype(np.uint8)

def finalize(bgr, alpha):
    a = alpha.astype(np.float32) / 255.0
    prem = bgr.astype(np.float32) * a[..., None]
    ps = cv2.resize(prem, (ALVO, ALVO), interpolation=cv2.INTER_AREA)
    as_ = cv2.resize(a, (ALVO, ALVO), interpolation=cv2.INTER_AREA)
    rgb = np.zeros_like(ps); m = as_ > 1e-6
    rgb[m] = ps[m] / as_[m][:, None]
    a8 = cv2.erode(np.clip(as_ * 255 + 0.5, 0, 255).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=ERODE_PX)
    return np.clip(rgb, 0, 255).astype(np.uint8), a8

def processa(mp4, out_webm, out_png, rel):
    cap = cv2.VideoCapture(mp4)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{ALVO}x{ALVO}",
         "-r", str(fps), "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0",
         "-crf", str(CRF), "-an", out_webm],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    t0 = time.time(); i = 0
    num = int(os.path.basename(mp4).split(".")[0])
    mascaras, brancos = [], []
    if num in VIDEOS_COM_BOLSAS:  # 1.a passagem: bolsas por frame (UTAC109d.1)
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            mascaras.append(bolsas_frame(bgr, WHITE_THR)); brancos.append(bgr.min(axis=2) >= WHITE_THR)
        mascaras = votar(mascaras, brancos); brancos = None
        cap.release(); cap = cv2.VideoCapture(mp4)
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        alpha = whitecut_v1(bgr)
        if mascaras:
            alpha[mascaras[i]] = 0
        rgb, a8 = finalize(bgr, alpha)
        if i == 0:
            # CORRIGIDO: rgb esta em BGR -> dstack da BGRA directo (antes havia um swap R<->B)
            cv2.imwrite(out_png, np.dstack([rgb, a8]))
        rgba = np.dstack([rgb[:, :, 2], rgb[:, :, 1], rgb[:, :, 0], a8])  # -> RGBA para o pipe
        p.stdin.write(rgba.tobytes()); i += 1
    p.stdin.close(); err = p.stderr.read().decode("utf-8", "replace"); rc = p.wait(); cap.release()
    rel.append(f"  [{os.path.basename(mp4)}] {w}x{h} {fps:.0f}fps {i} frames em {time.time()-t0:.1f}s rc={rc} "
               f"| webm {os.path.getsize(out_webm)/1024:.0f}KB | poster {os.path.getsize(out_png)/1024:.0f}KB"
               + (f" | stderr: {err.strip()[:150]}" if err.strip() else ""))

if __name__ == "__main__":
    SRC = r"C:\Users\Moltbot\Desktop\NOVO GUTO animado oficial"
    OUT = r"C:\Users\Moltbot\tmp-109d1\output-v2"
    os.makedirs(OUT, exist_ok=True)
    rel = [f"white_thr={WHITE_THR} erode={ERODE_PX} alvo={ALVO} crf={CRF}"]
    for v in (sys.argv[1:] or [str(i) for i in range(1, 9)]):
        processa(os.path.join(SRC, f"{v}.mp4"), os.path.join(OUT, f"guto-{v}.webm"),
                 os.path.join(OUT, f"guto-{v}.png"), rel)
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height:stream_tags=alpha_mode", "-of", "default=nw=1",
                            os.path.join(OUT, f"guto-{v}.webm")], capture_output=True, text=True)
        rel.append("      " + " | ".join(l for l in r.stdout.splitlines() if l.strip()))
    txt = "\n".join(rel)
    print(txt)
    open(r"C:\Users\Moltbot\tmp-109d1\pipeline-log.txt", "a", encoding="utf-8").write(txt + "\n")
```
