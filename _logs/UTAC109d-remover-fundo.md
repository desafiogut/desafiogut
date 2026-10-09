# UTAC109d — Remover o fundo branco dos 8 vídeos novos (troca do carrossel GUTO)

**Owner:** Hermes (DeepSeek) · **Data:** 2026-10-09 · **HI5:** 3 h (dividível em 109d.1/109d.2)
**Depende de:** UTAC109c (`3ba5d2e`) · **Owner declarado:** Hermes · **Frentes:** 3 (descobrir + aplicar + validar)
**Validador adversarial:** obrigatório (GATE 9) — ver §SEG8.

---

## §Baseline (SEG-1)

| Item | Medido |
|---|---|
| HEAD = origin/main | **`3ba5d2e`** (o esperado) |
| Árvore | limpa (só o `?? _logs/UTAC106x.2.spec.yml` pré-existente) |
| Suíte | frontend **910/910** · backend **1095/1101** VERDE |
| Material novo | `Desktop\NOVO GUTO animado oficial\` — **8 MP4 + LEIA-ME.txt** ✓ |
| WebM actuais | `public/assets/guto/carrossel/` — 8 webm + 8 png; `guto-1.webm` 1 164 223 B md5 `28822746ed1c`; VP9 `alpha_mode=1` 512² |
| Ferramentas | ffmpeg/ffprobe · python **cv2 4.11 + scipy 1.17.1 + numpy 1.26.4 + PIL 12.3** (a stack do pipeline original) · `libvpx-vp9` presente |
| Arranque | 2026-10-09 03:20 |

---

## §SEG0 — O pipeline original (⚠️ o passo crítico: NÃO inventar)

### O que foi procurado e onde

| Onde | Como | Resultado |
|---|---|---|
| git log dos assets | `git log --all --oneline -- public/assets/guto/` | **`2e57fe2 feat(mc58.3): carrossel GUTO completo (imagens 1-8) com crossfade`** ← o commit que criou os 8 webm |
| git log por mensagem | `--grep carrossel/MC58/alpha` | `bee606b docs(mc58.3): cloud.md com o carrossel completo (1-8) executado` |
| `scripts/` e `frontend/scripts/` | grep ffmpeg/vp9/alpha_mode/yuva420p/flood/colorkey | **nada** (só um script de tempo que checa encoders) |
| `_logs/` | ls + grep | nada de MC58 (a série usava `cloud.md`) |
| `cloud.md` | grep mc58.3/carrossel/ffmpeg | **§MC58.1 e §MC58.3 — a descrição do pipeline** |
| branches `feat/mc58.*` | `git ls-tree -r` | **0 ficheiros `.py`** |
| **todos** os commits do repo | `git log --all --name-only \| grep .py` | **0** `whitecut/finalize/process_all/prevalid` |
| disco (Desktop/Downloads/Temp) | `find -iname '*finalize*'/'*whitecut*'` | só `MC18-assets/finalize_par.py` e `guto-animations/_tools/finalize.py` — **era MC18/MC20, loop sem alfa; não é este pipeline** |
| Desktop (Docs do MC58) | find MC58* | **`GUTO/GUTO-ANIMADO GLASS DASHBOARD/notas_mc58{,1,2,3}.txt`** e **`MC-HISTORICO/recuperados-lixeira/MC58{,-PLANO-EXECUCAO,1-RELATORIO,2-PLANO-MIGRACAO,3-RELATORIO}.md`** |
| `GUTO-ANIMADO GLASS DASHBOARD/_mc58work/` | ls | **VAZIO** (restos do scratchpad, sem os scripts) |

### Veredicto do SEG0

**O MÉTODO está completamente documentado; o CÓDIGO não existe.** Os scripts eram *scratchpad* de
Julho (`whitecut.py`, `whitecut2.py`, `finalize.py`, `process_all.py`, `process_batch.py`,
`prevalidacao.py`, `finalize_universal.py`) — **nunca versionados e já apagados** (nem no object store
do git, nem em nenhuma branch).

**Recepção do operador:** expus-lhe exactamente isto (método achado / código perdido) com 4 opções e um
pedido de decisão. **Não houve resposta no prazo.** Decisão tomada por melhor juízo (declarada, não
escondida): **re-implementar o ALGORITMO DOCUMENTADO** (não inventar um pipeline novo) e fazer o PILOTO
do vídeo 1 antes dos 8 — que é literalmente o que o §SEG2 deste UTAC prescreve. A calibração de
parâmetros está declarada em §SEG1.3.

### A fonte documental da receita (verbatim)

- `MC58.2-PLANO-MIGRACAO.md` **§3.1 «Receita universal»** (a fonte principal):
  1. ler frames do `N.mp4` (cv2.VideoCapture — 150 ou 300 frames)
  2. **flood-fill de bordas** (`whitecut` **v1**): remover só o branco **conectado à moldura**; mantém
     todos os objectos internos e os brancos internos do GUTO (camisa/olhos). **NÃO** usar o passo
     «remover near-white na metade direita» (**`whitecut2`**) — esse é exclusivo do vidro fosco da img 1.
  3. **downscale PREMULTIPLICADO 960→512** + RGB dos px transparentes→preto + **erode 2px** (`finalize.py`)
  4. **encode** `ffmpeg -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30` → verificar `ALPHA_MODE=1`
  5. **poster** = 1.º frame alfa → `guto-{N}.png`
- `notas_mc58.1.txt`: o flood-fill usa `scipy.ndimage.label`; «downscale PREMULTIPLICADO 960→512 + RGB
  dos px transparentes→preto + erode 2px ... mata o HALO BRANCO da borda»; a verificação obrigatória é
  `ffprobe -show_entries stream_tags=ALPHA_MODE` = **1**.
- `notas_mc58.3.txt`: «`finalize_universal.py` (usa `whitecut` v1 = SÓ flood-fill de bordas) +
  downscale premultiplicado. NÃO usar `whitecut2`... Se algum inox colar ao fundo: **subir `white_thr`
  (default 232)**. Não aconteceu nestas 7.»
- `MC58.3-RELATORIO.md` §3/§7/§8: determinístico cv2/scipy, **0 ML, ~6m40s para 7 imagens (~1500 frames)**;
  «Inox intacto (geladeira/máquina/AC/fogão nas 2,3,4,7) — não foi comido»; «rembg ≠ remoção de fundo
  (descarta objetos) → flood-fill de bordas universal».
- `cloud.md` §MC58.1: entrada do pipeline = **`1.mp4` 960² h264 30fps 300 frames com fundo BRANCO** —
  **a mesma forma do material novo** ⇒ o pipeline aplica-se 1:1.

---

## §SEG1 — Análise do pipeline e parâmetros reproduzidos

### 1.1 — O que o script fazia (reconstruído da spec, passo a passo)

| Passo | Implementação reproduzida |
|---|---|
| 1. frames | `cv2.VideoCapture` → 960×960, 30 fps, 300 frames |
| 2. máscara | `branco = min(B,G,R) >= white_thr`; `scipy.ndimage.label(branco)` (**4-conectividade**, o default do `label`); componentes que **tocam a moldura** = fundo → `alpha=0`. Só o branco *ligado à borda* cai ⇒ objectos internos e os brancos internos do GUTO ficam |
| 3. finalize | `premult = BGR * (alpha/255)`; `INTER_AREA` para 512×512 em RGB-premult e no alfa; `RGB = premult/alpha` onde `alpha>0` e **`RGB=0` (preto) onde transparente**; `erode 2px` (kernel 3×3, 2 iterações) no alfa |
| 4. encode | `-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30`, sem áudio |
| 5. poster | `guto-{N}.png` = 1.º frame (512² RGBA) |

### 1.2 — Confirmação contrária pelos assets actuais (ffprobe nos ORIGINAIS)

`guto-1.webm` original: `vp9`, **512×512**, `yuv420p` com **`TAG:alpha_mode=1`**, 30 fps, 10 s,
1 164 223 B. O comentário do `CarrosselGUTO.jsx` diz «yuva420p» — o container declara `yuv420p` +
`alpha_mode=1` e o alfa existe de facto (verificado por descodificação com `libvpx-vp9`).
**Alvo de paridade: `vp9`, 512², `alpha_mode=1`, 30 fps.**

### 1.3 — ⚠️ DESVIO DECLARADO: `white_thr` 232 → 185

O default documentado é **232**. No material novo ele **falha**: o chão dos vídeos v2 é um gradiente
claro (cinza ~180–230) que **não** é apanhado a 232 e fica como **faixa clara opaca** por baixo do GUTO.
(O material do MC58 tinha pódios/chãos escuros — nunca viu este caso; o único passo que resolvia uma
superfície clara era o `whitecut2`, exclusivo do vidro da img 1.)

**Calibração medida** (frame 150 do `1.mp4`, 960²; «resíduo claro» = px opacos com min-canal ≥ 190 na
metade inferior; «aço escuro» = px opacos com min-canal < 150):

| `white_thr` | resíduo claro na metade inf. | aço escuro preservado |
|---|---|---|
| 232 (default) | 22 879 | 54 851 |
| 215 | 11 929 | 54 851 |
| 200 | 8 271 | 54 851 |
| **185 (usado)** | **506** | **54 851** |
| 170 | 373 | 54 851 |

⇒ a 185 a faixa desaparece (22 879→506) e o **aço escuro do eletrodoméstico fica idêntico** (54 851 px).
Confirmado ao olho (sobre navy): a 232 fica uma faixa clara à direita e em baixo do aparelho; a 185 o
fundo fica limpo **e a máquina de lavar intacta** (corpo branco, porta redonda, pés).

**Declaração honesta:** é uma **calibração de um parâmetro documentado** (o próprio doc trata `white_thr`
como knob por material: «subir `white_thr`... validar a integridade da borda do aparelho por imagem»),
não uma alteração do mecanismo. A direcção aqui é **descendente**, que o doc não prevê — porque o
material do MC58 não tinha chão claro. **Fica à consideração do operador** (§SEG8 validador + §SEG9).

### 1.4 — Riscos por imagem (do doc §3.2) e o que foi feito

«Inox reflexivo ≈ branco pode colar ao fundo e o flood-fill comer a borda do aparelho» → mitigação
documentada: subir `white_thr` + **validar a integridade do aparelho por imagem**. Fez-se a validação
por imagem (§SEG3) com medição + inspecção visual das 8. O confete da imagem 8 (o caso de maior risco
do doc) foi **aceite como celebração** — decisão já tomada pelo operador no MC58.

---

## §SEG2 — PILOTO (vídeo 1) — reprovado a 232, aprovado a 185

| Tentativa | Resultado |
|---|---|
| **Piloto com `white_thr=232` (default documentado)** | ❌ **REPROVADO** — 300 frames em 29,5 s, `alpha_mode=1` ✓, mas **faixa clara no chão** (px opacos RGB ≈ (217,214,215) nas linhas 482-492, alpha parcial). Era exactamente o defeito a não repetir |
| **Bug meu encontrado no piloto** | o poster saía com **canais trocados** (`cv2.cvtColor(dstack([rgb,a8]), COLOR_RGBA2BGRA)` re-swappava R↔B, porque `rgb` já era BGR) → cara azulada. **Corrigido** para `cv2.imwrite(out, np.dstack([rgb, a8]))`; verificado visualmente (cores naturais). *O `webm` nunca teve este bug (o pipe usa RGBA explícito).* |
| **Piloto com `white_thr=185` (calibrado)** | ✅ **APROVADO** — 300 frames em 29,3 s; `codec_name=vp9`, 512×512, `TAG:alpha_mode=1`, 30 fps; 389 KB; poster 271 KB |

**Validação do piloto** (3 frames, decodificados **com** alfa) — comparado com o mesmo parâmetro no asset
**original que está em produção**:

| Métrica (3 frames) | NOVO (piloto) | ORIGINAL (produção) |
|---|---|---|
| transparência total | 0,436 / 0,437 / 0,436 | 0,449 / 0,448 / 0,450 |
| **branco opaco na BORDA** | **0,0000 / 0,0000 / 0,0000** | 0,0000 / 0,0000 / 0,0000 |
| opaco na borda | 0,106 / 0,102 / 0,104 | 0,104 / 0,105 / 0,105 |
| canto (2,2) | (0,0,0,0) | (0,0,0,0) |

⇒ o piloto fica **estatisticamente ao nível do asset em produção**. Inspecção visual sobre navy: fundo
limpo, GUTO completo, máquina de lavar íntegra.

---

## §SEG3 — Os 8 vídeos

Pipeline corrido aos 8 (mesmo `white_thr=185`, `erode=2`, 512², `crf 30`):

| Vídeo | frames | tempo | webm | poster | ffprobe |
|---|---|---|---|---|---|
| guto-1 | 300 | 29,3 s | 389 KB | 271 KB | 512×512 · **alpha_mode=1** |
| guto-2 | 300 | 27,9 s | 527 KB | 283 KB | 512×512 · alpha_mode=1 |
| guto-3 | 300 | 25,5 s | 288 KB | 137 KB | 512×512 · alpha_mode=1 |
| guto-4 | 300 | 27,1 s | 501 KB | 256 KB | 512×512 · alpha_mode=1 |
| guto-5 | 300 | 26,7 s | 671 KB | 196 KB | 512×512 · alpha_mode=1 |
| guto-6 | 300 | 27,0 s | 422 KB | 252 KB | 512×512 · alpha_mode=1 |
| guto-7 | 300 | 26,5 s | 392 KB | 193 KB | 512×512 · alpha_mode=1 |
| guto-8 | 300 | 28,9 s | 1308 KB | 303 KB | 512×512 · alpha_mode=1 |

Total ~3,5 min de CPU para os 8 (2400 frames) — coerente com o doc (~34 s/imagem). Total **4,5 MB**
(vs 8,3 MB dos antigos).

**Validação por imagem (3 frames cada = t 0 / 5 / 9,9 s, decodificados com alfa):**

| Vídeo | transparência | branco na borda | canto |
|---|---|---|---|
| 1 | 0,546 | **0,0000** | (0,0,0,0) |
| 2 | 0,591 | **0,0000** | (0,0,0,0) |
| 3 | 0,783 | **0,0000** | (0,0,0,0) |
| 4 | 0,581 | **0,0000** | (0,0,0,0) |
| 5 | 0,688–0,690 | **0,0000** | (0,0,0,0) |
| 6 | 0,586 | **0,0000** | (0,0,0,0) |
| 7 | 0,686–0,687 | **0,0000** | (0,0,0,0) |
| 8 | 0,541–0,544 | **0,0000** | (0,0,0,0) |

**Suspeitos: NENHUM.** Gate visual (composto sobre navy, os 8 lado a lado): fundo transparente em todos,
sem quadrado/faixa/halo branco, GUTO de corpo inteiro, eletrodomésticos íntegros (o confete da 8
parcialmente recortado — aceite pelo operador no MC58).

---

## §SEG4 — Posters

O `CarrosselGUTO.jsx` usa `poster` PNG como fallback (Safari/reduced-motion que não faça VP9-alfa).
O pipeline original gerava-os como **1.º frame com alfa**. Feito igual: 8 PNG **512²**, todos
**colour type 6 = RGBA** (medido no byte 25 do IHDR), fundo transparente, cores naturais (bug dos
canais corrigido — §SEG2).

---

## §SEG5 — Substituição + cache-bust

1. **Backup dos originais** (fora do repo): `C:\Users\Moltbot\tmp-109d\backup-originais\` — **16 ficheiros**, md5 conferido (`guto-1.webm` `28822746ed1c` = o que **produção serve hoje**).
2. **Substituídos** os 8 webm + 8 png em `public/assets/guto/carrossel/` — **md5 16/16 iguais** aos da pasta de saída.
3. **Cache-bust:** `src/components/CarrosselGUTO.jsx:27` `const V = "mc58"` → **`"mc59"`** — **única** alteração de código do UTAC (declarada). Necessário porque os assets são servidos `Cache-Control: public, max-age=31536000, immutable`.
4. Verificado que **nada mais** mudou no componente (`git diff` = 1 linha).

---

## §SEG6 — Testes + mutação

- **Nenhum teste existente guardava os assets nem a constante V** (a suíte estava verde antes e depois) ⇒ criado o guarda **`src/__tests__/utac109d-carrossel.test.mjs`** (4 testes): controlo positivo de vitalidade, `V === "mc59"` + URLs com `?v=${V}`, os 16 assets existem e não estão vazios, e os 8 posters continuam **RGBA** (protege contra a volta do «quadrado branco» opaco).
- **Suíte:** frontend **914/914** (910 + 4 novos) · backend **1095/1101** — **VERDE**.
- **`vite build`:** `✓ built in 17.81s`, exit 0. `dist/` = `public/` **16/16 md5**; o bundle inlina `mc59` (`var Ht=\`mc59\`,Ut=Array.from({length:8},...)`) e mantém os 8 slides.
- **Mutação (GATE 7/8):** revertido `V` para `mc58` → o teste do cache-bust **fica RED** (3 pass / 1 fail); restaurado **byte-idêntico** (md5 `fd13d1f65ad5`).

---

## §SEG7 — Verificação ponta a ponta

| Verificação | Resultado |
|---|---|
| Suíte canónica | **frontend 914/914 · backend 1095/1101 VERDE** (6 não-pass do backend = os PRÉ-EXISTENTES do baseline) |
| `vite build` | ✓ 17,81 s |
| 8 webm em `dist/` | `alpha_mode=1`, 512², borda transparente, sem branco opaco, formato igual aos originais |
| Backend tocado? | **não** (`git show --stat` do commit: só carrossel + componente + teste) |
| 5 `.bak-*` | **intactos** |
| `EM_BREVE_MODE` | continua ligado |
| MLC/OP/Carteira/Início | **não tocados** (o Início só herda o carrossel, que já era o slot existente) |
| `package-lock.json` | **não sujado** (o build local não usa `netlify deploy --build`; o deploy é por push) |

---

## §SEG8 — Validador adversarial (GATE 9)

- **Método:** subagente em **worktree isolado** (`A13`: `node scripts/worktree-helper.mjs criar C:/Users/Moltbot/tmp-109d-val/wt dd01f50`), instruído a **REFUTAR** (não a confirmar), com a checklist literal (a)–(k) do enunciado **mais** um ataque prioritário à calibração declarada do `white_thr=185`.
- **Duração:** 687 s. **Ficheiros do repo tocados pelo validador: 0** (worktree limpo, `HEAD` intacto em `dd01f50`).

**VEREDICTO (verbatim, do transcript da delegação):**

> # VEREDICTO FINAL: APROVADO
> Tentei refutar por todos os 11 ângulos + o ataque prioritário ao `white_thr=185` e **não encontrei nenhum bloqueante**. Todos os critérios (a)–(k) passam, e o ataque à calibração falhou (não há material legítimo comido, medido).
> ## BLOQUEANTES
> **Nenhum.** Os 11 pontos estão verdes; o desvio `white_thr=185` […]
>
> *(Texto integral recebido na mensagem consolidada da delegação — transcrito abaixo.)*

**Citações textuais do veredicto:**

> **BLOQUEANTES: Nenhum.** Os 11 pontos estão verdes; o desvio `white_thr=232→185` não come material (provado por medição abaixo).
>
> **(a) Borda branca opaca — 0 em todos.** Descodifiquei com o instrumento correcto (`-c:v libvpx-vp9 … -pix_fmt rgba`) 4 frames (t=0,3,6,9 s) × 8 webm; píxeis «branco opaco» (minRGB>200 & alpha==255) na banda de 4 px da moldura: `g1..g8: max opaque-white border px over 4 frames = 0`. *Nota:* o ORIGINAL `guto-5.webm` **tinha** borda opaca (bottom row 100 % opaco, left/right 17 %) — o novo está **mais limpo que a referência**.
> **(b) `alpha_mode=1` — os 8.** `TAG:alpha_mode=1` nos 8; decode alfa real `min=0 max=255` (não vazio). *(Nota de instrumento: o `ffprobe` reporta `pix_fmt=yuv420p` no novo **e** no original — o alfa do VP9 vive em side-plane; não é divergência.)*
> **(c) GUTO completo — os 8.** Nenhuma tem conteúdo opaco a tocar a moldura (linhas/colunas de borda = 0 % opaco ⇒ nada cortado). Inspecção visual de `g8` sobre cinza → corpo inteiro, mãos/dedos, sapatos, TV/frigorífico/máquina/micro-ondas presentes.
> **(d) Formato vs ORIGINAIS.** codec `vp9` ✓ · `512x512` ✓ · `alpha_mode=1` ✓ · fps `30/1` ≈✓. **Duração difere**: ~10,0 s vs originais mistos `5,0/9,933/10,0` → nota menor (vem do material-fonte; o componente lê `v.duration` dinamicamente).
> **(e) Posters com alfa — os 8.** `mode=RGBA`, `alpha_min=0`, 54,2–78,3 % transparente, colour-type byte 25 = **6**.
> **(f) Constante V (fonte E bundle).** Componente: `const V = "mc59"`. Bundle: `var Ht=`mc59`,Ut=Array.from({length:8}…)` e **zero** ocorrências de `mc58` em todo o `dist/`.
> **(g) `dist/` vs `public/`.** Os 16 ficheiros **md5-idênticos**.
> **(h) Carrossel intacto.** Única mudança de código = `V mc58→mc59`; `N=8`, `layers=[cur,nxt]`, `setNxt((nxt+1)%n)` (cicla), crossfade em `0,5×duration`, `CROSSFADE_MS=1000`; guarda novo **4/4 pass**.
> **(i) Nenhum outro ecrã.** `git show --name-only dd01f50` = 16 assets + `CarrosselGUTO.jsx` + o teste; grep por `mlc|op-|carteira|inicio|backend|netlify|functions` → **NONE TOUCHED**.
> **(j) Nenhum `.bak-*`.** Os 5 existentes, todos intocados.
> **(k) Suíte canónica VERDE (tem de correr com TTY).** `frontend: VERDE 914/914` · `backend: VERDE 1095/1101` → **tests 1101, pass 1095, fail 0, skipped 6**. Ou seja, os 6 «não-pass» do backend são ***skipped*, não falhas** — e são exactamente os pré-existentes.

**ATAQUE AO `white_thr=185` (o prioritário) — FALHOU:**
- brancos interiores preservados: só **0,2 %** comido em g1 (o flood-fill funciona como desenhado);
- o que 185 remove a mais que 232: 2,5–10,6 % do frame, todo **cinza-claro (minRGB médio 212–229)** = o chão claro; **não** o aço escuro;
- mapa de défices por bloco 16×16: os piores blocos são manchas de 50–380 px (confete/gradiente); **nenhum** eletrodoméstico nem região do GUTO mostra remoção sistemática;
- confete retido: 15–96 ilhas opacas pequenas por frame (originais 17–152) ⇒ sem perda material;
- défice `obj(≥185 não-bg) vs alpha>0`: 2,6–7 %, essencialmente o **rim de ≤2 px** do «erode 2px» documentado.

**Notas menores do validador:** (1) duração uniforme ~10 s ≠ origem misto — inócuo; (2) fps de `guto-6/7` = `29971/999` (≈29,999) — negligenciável; (3) o «erode 2px» corta um rim de ~2 px (3–4 % da área do objecto, só periferia) — herdado da receita documentada; (4) bitrate novo bem menor (g1 397 KB vs 1 164 KB) — conteúdo diferente (fundo plano, crf 30), sem artefacto visível; (5) a suíte só mede com TTY.

**Achado lateral do validador que eu NÃO tinha medido (e que importa):** o **`guto-5.webm` ORIGINAL tinha borda opaca** (linha de baixo 100 % opaca; laterais 17 %). Ou seja: o asset que estava em produção **tinha, ele próprio, resíduo de borda** — o novo não tem. Fica registado que a «referência de qualidade» que usei **não era perfeita**, e que este UTAC melhorou esse ponto sem o procurar.

**Ficheiros do validador:** criados fora do repo em `tmp-109d-val/work/`; **repo principal e worktree intocados** (worktree limpo, `HEAD dd01f50`).

---

## §SEG9 — Deploy + verificação em produção

### Antes
| Item | Produção |
|---|---|
| entry | `/assets/index-B2GWopzJ.js` |
| `guto-1.webm?v=mc58` | **1 164 223 B**, md5 `28822746ed1c` (o antigo) |
| `guto-1.png?v=mc58` | 228 318 B, md5 `d5b755332c5e` |

### Push
`git push origin main` → **`3ba5d2e..dd01f50`** (auto-deploy Git da Netlify). HEAD = origin/main = `dd01f50`.

### Depois (verificado por polling; mudou a t+142 s)
| Item | Produção | Esperado |
|---|---|---|
| entry | **`/assets/index-Dz3nLTfv.js`** (mudou) | ≠ `index-B2GWopzJ.js` ✓ |
| `guto-1.webm?v=mc59` | **397 840 B**, md5 `11368a8b8220` | = o novo ✓ |
| +9 assets (`guto-2..8.webm`, `guto-1.png`, `guto-8.png`) | **NENHUM divergente** | = os locais ✓ |
| site | HTTP 200 | ✓ |

⚠️ **Previsão minha que estava errada (declarada):** esperava que `?v=mc58` continuasse a devolver o ficheiro **antigo**. Não devolve — devolve o **novo** (397 840 B), porque a Netlify serve o mesmo caminho e a **query não é chave de CDN**. Consequência real (e a razão de ser da constante): o `?v=` invalida apenas a **cache do browser**. Como os assets são servidos `Cache-Control: public, max-age=31536000, immutable`, um browser que já tenha em cache `/…/guto-1.webm?v=mc58` continuaria a mostrar os vídeos **antigos durante 1 ano** — por isso a constante tinha de subir para `mc59` (§SEG5/§SEG6). O mecanismo está agora **medido**, não suposto.

### `package-lock.json`
O **commit/push não o suja** (o auto-deploy Git constrói no ambiente da Netlify). Mas o **deploy pela CLI** (pedido depois pelo operador) corre o build LOCAL — `npm install --legacy-peer-deps` ×2 — e **ensujou-o**, como previsto: foi guardado em `tmp-109d\package-lock.frontend.bak` antes e **restaurado byte-idêntico ao HEAD** (md5 `dd3bec4c3971` nos três: backup, ficheiro restaurado, blob do HEAD).

### Redeploy pela CLI (pedido do operador depois do push)
O operador reportou o carrossel **estático no telemóvel** e pediu para usar a CLI. Corrido `netlify deploy --build --prod -m "UTAC109d: redeploy via CLI…"`:

```
✔ Finished hashing 256 files and 84 functions | CDN requesting 38 files | Uploading 38 files | ✔ Deploy is live!
Netlify Build completed in 4m 52.6s · deploy id 6ac894658390ce0cc6c4d4f1
```

Verificação logo depois: entry **`index-y2nUEYgn.js`** (o build local da CLI; nota: o build da CLI ≠ o build da Netlify — hashes de chunk diferentes, já era assim no 109b); `guto-{1,2,5,8}.webm` e `guto-{1,8}.png` a **6/6 md5 iguais** aos locais; carrossel presente em `/assets/PrivyRoot-DV4TdCfR.js` com `mc59`; site 200.
**Isto NÃO resolveu o «estático no telemóvel»** — e não era de esperar que resolvesse: a causa provável é o suporte de alfa de VP9 no browser do telemóvel (§13 do relatório), não o canal de deploy.

---

## §Apêndice A — O pipeline, versionado (para NÃO se perder outra vez)

**Porque existe este apêndice:** o pipeline original (`whitecut.py` v1, `finalize.py`, `process_all.py`,
`finalize_universal.py`) era *scratchpad* e **perdeu-se** — foi o custo de SEG0 neste UTAC. Esta é a
re-implementação fiel da receita do `MC58.2-PLANO-MIGRACAO.md` §3.1, aqui **versionada** para que o
próximo UTAC não tenha de a reconstruir de memória.

Uso: `WHITE_THR=185 python pipeline.py 1 2 3 … 8` (lê `Desktop\NOVO GUTO animado oficial\N.mp4`,
escreve `guto-N.webm` + `guto-N.png` em `--out`).

```python
# -*- coding: utf-8 -*-
"""UTAC109d — PIPELINE (v2: white_thr calibrado + poster com canais corrigidos).
Mecanismo = o do MC58.2 §3.1 (flood-fill de bordas -> premult 960->512 -> erode 2px -> VP9 yuva420p).
DESVIO DECLARADO: white_thr 232 (default documentado) -> 185, calibrado para o material novo
(o chao claro do video v2 nao e apanhado a 232; a 185 o aco escuro da maquina fica identico).
"""
import os, subprocess, sys, time
import cv2, numpy as np
from scipy import ndimage

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
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        alpha = whitecut_v1(bgr)
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
    OUT = r"C:\Users\Moltbot\tmp-109d\output"
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
    open(r"C:\Users\Moltbot\tmp-109d\pipeline-log.txt", "a", encoding="utf-8").write(txt + "\n")
```

**Comando de encode equivalente (uma linha, para referência):**
`ffmpeg -f rawvideo -pix_fmt rgba -s 512x512 -r 30 -i - -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -an guto-N.webm`
**Verificação obrigatória (a do doc):** `ffprobe -show_entries stream_tags=alpha_mode` tem de dar **1**.
⚠️ Ao medir o alfa, o decode **por omissão descarta-o** (dá `yuv420p` e pixels pretos opacos). Obrigatório:
`ffmpeg -c:v libvpx-vp9 -i f.webm -pix_fmt rgba f.png`.

---

## §Custo e HI5

| Item | Valor |
|---|---|
| Arranque → fim do trabalho de vídeo | 03:20 → ~04:12 = **~52 min** (limite 3 h) |
| CPU de processamento | 8 × ~27 s = **~3,5 min** (2400 frames) |
| Custo de API | ver §Entrega (medido no `state.db`, Hermes em USD) |

## §Entrega

| Artefacto | Onde |
|---|---|
| Log completo | `_logs/UTAC109d-remover-fundo.md` (este ficheiro) |
| Registo R14 | `CLAUDE.md` |
| Relatório | `Desktop/RELATORIO-UTAC109d-REMOVER-FUNDO.txt` |
| Assets novos | `desafio-gut/frontend/public/assets/guto/carrossel/` (16 ficheiros) |
| Guarda | `src/__tests__/utac109d-carrossel.test.mjs` (4 testes) |
| Backup dos originais | `C:\Users\Moltbot\tmp-109d\backup-originais\` (16 ficheiros; md5 do `guto-1.webm` = `28822746ed1c`) |
| Provas visuais | `tmp-109d\piloto-comparacao.png`, `tradeoff-thr.png`, `saida-8.png`, `posters-8.png` |
| Commits | `dd01f50` (troca) · registo no commit seguinte |

> 🔁 **Substituido pelo Apendice A v2 (UTAC109d.1, 2026-10-09)** — `_logs/UTAC109d.1-mobile.md` §Apendice A v2: acrescenta a remocao das bolsas de fundo fechadas (anel + voto temporal). O texto acima fica como registo da v1.
