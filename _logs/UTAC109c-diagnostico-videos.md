# UTAC109c — Diagnóstico: carrossel de vídeos + defeito do branco + assets novos

**Tipo:** DIAGNÓSTICO PURO (READ-ONLY — zero alterações de código) · **Owner:** Hermes (DeepSeek)
**Data:** 2026-10-09 · **HI5:** 1 h 30 · **Depende de:** UTAC109b (`04a07e7`)
**Sem validador** (ressalva 5 do enunciado: diagnóstico puro).
**Entrega:** este log (a correcção é o UTAC109d) — **PARADO e escalado ao operador**.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| HEAD = origin/main | **`04a07e7`** (= o esperado) | `git rev-parse HEAD / origin/main` |
| Árvore | **limpa** (só `?? _logs/UTAC106x.2.spec.yml`, pré-existente e alheio) | `git status --short` |
| Suíte canónica | frontend **VERDE 910/910** · backend **VERDE 1095/1101** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Deploy live | **sim** — entry `/assets/index-B2GWopzJ.js`, site 200 | `curl` |
| Disco | 8,1 GB livres | `df -h .` |
| Ferramentas | **ffmpeg/ffprobe** (WinGet) · **magick** 7.1.2 · **PIL** 12.3.0 — todas presentes | `command -v` |
| Arranque | **2026-10-09 02:52** | `date` |

---

## §SEG0 — O carrossel actual (pergunta 1 do Objectivo)

| Medida | Valor | Prova |
|---|---|---|
| Componente | **`src/components/CarrosselGUTO.jsx`** (183 linhas) | ficheiro |
| Consumidor (único) | **`src/pages/Dashboard.jsx:16`** (import) e **`:282`** (`<CarrosselGUTO size={isMobile ? 116 : 176} />`) | grep |
| Nº de slides | **8** (`const N = 8`, `SLIDES` gerado por `Array.from`) | `:28-32` |
| Como carrega | **URLs estáticas de `public/`** — não há fetch/API/Blob: `webm: /assets/guto/carrossel/guto-{i+1}.webm?v=mc58` e `poster: …guto-{i+1}.png?v=mc58` | `:29-32` |
| Formato | **WebM (VP9) + poster PNG** — `pix_fmt` declarado `yuv420p` **com tag `alpha_mode=1`** (o alfa existe: medido); o comentário do ficheiro diz «yuva420p» — **impreciso no rótulo, correcto na substância** | `:3-6` · ffprobe |
| Onde vivem os ficheiros | **`desafio-gut/frontend/public/assets/guto/carrossel/`** — 8 `.webm` (443 KB–1,66 MB) + 8 `.png` (178–242 KB) | `find` |
| Transição | **crossfade de 1 s** (`CROSSFADE_MS=1000`) disparado a **50 %** da duração real de cada vídeo (`CROSSFADE_AT=0.5`); **máx. 2 `<video>` montados** (activo + próximo) | `:34-35, :70-92, :151-175` |
| Durações | 1,3,5,6,7 = **10 s** · 2,4,8 = **5 s** | ffprobe |
| Cache | `Cache-Control: public,max-age=31536000,immutable` + `?v=mc58` | HTTP |
| Blob? | **não** — o carrossel não usa Blobs (os Blobs do app são de lances/cotas/analytics) | grep |

**Como o GUTO entra no ecrã:** a linha de topo do Início é um `flex` com o carrossel (116 px mobile / 176 px desktop) **ao lado** de `logo-uniao-trabalho.png` (altura 76/116), `gap` 1,25/2,5 rem (`Dashboard.jsx:275-295`). O contentor do carrossel tem `size×size`, `position:relative`, `objectFit:contain`, **sem `background`** e um `drop-shadow` no wrapper (`:94-111`).

---

## §SEG1 — O defeito do branco (pergunta 2 do Objectivo)

### 1. Resposta curta

**Reproduzido — mas NÃO no carrossel que está no ar.** O carrossel em produção está **limpo**
(fundo transparente em todos os frames). O **material NOVO** que se destina ao carrossel
(`Desktop\NOVO GUTO animado oficial\*.mp4` e as estáticas `NOVO GUTO estatico oficial[/CORRIGIDO]/`)
tem **fundo BRANCO OPACO e SEM canal alfa** — é isso que produz o «algo branco».

### 2. Medição do carrossel EM PRODUÇÃO (o que o app mostra hoje)

Varredura de **TODOS** os frames (10 fps, 64×64 RGBA, alfa preservado) das 8 webm + os 3 sprites:

| Ficheiro | frames | branco opaco na BORDA (máx) | cobertura opaca |
|---|---|---|---|
| guto-1.webm | 100 | **0,0000** | 0,488–0,506 |
| guto-2.webm | 50 | **0,0000** | 0,517–0,524 |
| guto-3.webm | 100 | **0,0000** | 0,434–0,452 |
| guto-4.webm | 50 | **0,0000** | 0,472–0,477 |
| guto-5.webm | 99 | **0,0000** | 0,511–0,517 |
| guto-6.webm | 100 | **0,0000** | 0,372–0,397 |
| guto-7.webm | 100 | **0,0000** | 0,432–0,440 |
| guto-8.webm | 50 | **0,0000** | 0,448–0,462 |
| idle / thinking / celebration .webm | 40 cada | **0,0000** | 0,18–0,23 |

⇒ **Nenhum frame** de nenhum dos 11 ficheiros do app tem fundo branco por remover. Alfa total
(transparência) 45–59 % nas webm do carrossel e 72–74 % nos sprites — coerente com recorte de fundo.
Os 8 posters PNG têm o mesmo perfil (borda 0,0 % branca; 45–59 % transparente).

### 3. As hipóteses do enunciado, uma a uma (com o veredicto medido)

| # | Hipótese | Veredicto | Prova |
|---|---|---|---|
| **H-1** | `aspect-ratio` errado → faixas brancas | **DESCARTADA** | os 8 assets são **512×512 (1:1)** e a caixa é `size×size` (1:1) com `objectFit:contain` → não há faixas |
| **H-2** | `background` branco do contentor visível | **DESCARTADA** | `boxStyle`/`layerStyle` **não declaram `background`** (`:94-111`) |
| **H-3** | `gap`/`padding` entre slides | **DESCARTADA** | o `gap` do flex é **entre** o carrossel e o logo, e mostra o fundo da página (vidro), não branco |
| **H-4** | 1.ª/última frame com fundo branco | **DESCARTADA** | varridos **todos** os frames (tabela acima): 0,0000 em todas as posições |
| **H-5** | sobreposição mal resolvida (`opacity`) | **DESCARTADA** | o crossfade cruza **duas camadas transparentes**; não há fonte branca para aparecer |
| **H-6** | browser **sem suporte a alfa VP9** → vê a «cor por baixo» | **DESCARTADA (e é preta, não branca)** | descodificado sem alfa, o plano de cor na zona transparente é **(0,0,0)** = **PRETO**. Se o alfa fosse ignorado, veríamos um quadrado **preto** |
| **H-7** | o branco é **conteúdo** (eletrodomésticos brancos + placa «LANÇE ÚNICO») | **CONFIRMADA como o branco que EXISTE** | ver a contact sheet: geleira/máquina de lavar/fogão/placa são grandes massas brancas legítimas |
| **H-8** | fundo branco do material de origem **não removido** | **CONFIRMADA — no material NOVO** (§SEG2/§SEG3) | borda **80–99 % branca opaca** nos 8 vídeos novos |

### 4. Evidência visual (ficheiros gerados neste UTAC, fora do repo)

- `%TEMP%/tmp-109c/109c-sheet-escuro.png` — 8 slides do carrossel + o GUTO original + 1.º frame de um
  vídeo novo, sobre fundo escuro (como o app). **Nos 8 slides do carrossel não há quadrado branco**; o
  frame do vídeo **novo** aparece dentro de um **rectângulo branco**.
- `%TEMP%/tmp-109c/109c-novos.png` — as 8 estáticas NOVAS CORRIGIDO + os 8 frames dos vídeos novos:
  **todos com fundo branco opaco**.

### 5. O que NÃO consegui medir (declarado)

- **Não reproduzi o defeito no ECRÃ do app**: a produção está atrás do gate LGPD e **não clico aceites
  por ninguém** (prática da série). A minha leitura é do **material**, não do pixel do ecrã do operador.
- **Não medi em browser/APK**: o alfa do VP9 não é suportado em todos os WebViews; não tenho browser
  aqui. O teste H-6 mostra que esse caso daria **preto**, não branco — mas é leitura de codec, não de ecrã.

---

## §SEG2 — Os vídeos e as estáticas NOVAS (pergunta 4 do Objectivo) — ⚠️ DRIFT MEDIDO

### ⚠️ A pasta-fonte MUDOU depois do 109a (declarado — GATE 2)

| Medida | 109a (2026-10-06) | **Hoje (2026-10-09)** | Δ |
|---|---|---|---|
| Ficheiros na pasta-fonte | **20** | **36** | **+16** |
| Subpastas | 2 | **4** | +2: `NOVO GUTO estatico oficial/` (mtime **2026-10-07 06:51**) e `NOVO GUTO estatico oficial CORRIGIDO/` (mtime **2026-10-07 20:07**) |

- As 8 PNG do 109a (`GUTO estatico oficial/`) estão **byte-idênticas** (md5 conferidos um a um contra o §A.2 do 109a — todos iguais) e a `_contact-sheet.png` continua lá.
- As **16 PNG novas** são **4096×4096, RGBA — mas `transp = 0,0`** (o canal alfa existe e está **todo a 255**): **fundo branco OPACO**, borda **89–99,9 % branca**. Mesma família de defeito dos vídeos.
- `NOVO` vs `CORRIGIDO`: **4 ficheiros diferem** (1, 2, 4, 8) e **4 são idênticos** (3, 5, 6, 7).
  ⚠️ E dois dos «novos» são **cópias do antigo**: `NOVO…/1.png` md5 `5bbc06bfc4…` = `GUTO estatico oficial/03-guto-maquina-lavar.png`; `NOVO…/8.png` md5 `8a0eb30227…` = `…/08-guto-conjunto-eletrodomesticos.png`. **A pasta «NOVO» não é toda nova.**

### ⚠️ A pasta dos vídeos NOVOS está FORA da pasta-fonte (correcção do operador durante este UTAC)

**`C:\Users\Moltbot\Desktop\NOVO GUTO animado oficial\`** — **8 MP4 + `LEIA-ME.txt`** (datados 2026-10-07 20:02–20:04).
Não estava na minha 1.ª varredura porque a procurei **dentro** de `GUTO-Eletrodomesticos/`; o operador
corrigiu-me a meio do UTAC (registado). **É esta a pasta dos «novos vídeos».**

**`LEIA-ME.txt` (lido, verbatim nos pontos que interessam):**
> «NOVO GUTO animado oficial (v2 - enquadramento corrigido, corpo inteiro) · **Higgsfield CLI - Seedance
> 2.5 (image-to-video), sem audio** · Tecnica MC57.5-57.12: **960x960, 30 fps, h264, sem audio**;
> N.mp4 = loop boomerang **10 s** (300 f) · Enquadramento: o prompt fixa o enquadramento da imagem de
> referencia e a propria imagem e usada como frame INICIAL e FINAL, o que impede o zoom/corte do modelo ·
> Textos corrigidos: 1 = 'MENOR LANCE UNICO' (letra menor) | 2 = 'O MENOR LANCE UNICO VENCE' no telemovel
> | 4 = 'ADQUIRA PRODUTOS POR UM PRECO BEM BAIXINHO' … | 8 = 'PARTICIPE JA' no titulo dourado.»

**Ficha técnica medida dos 8 vídeos NOVOS:**

| # | codec/pix_fmt | res | dur | fps | peso | áudio | `alpha_mode` | **branco na borda** |
|---|---|---|---|---|---|---|---|---|
| 1 | h264/yuv420p | 960×960 | 10,00 s | 30 | 0,86 MB | 0 | **ausente** | **0,802–0,816 opaco** |
| 2 | h264/yuv420p | 960×960 | 10,00 s | 30 | 1,35 MB | 0 | ausente | **0,945 opaco** |
| 3 | h264/yuv420p | 960×960 | 10,00 s | 30 | 1,16 MB | 0 | ausente | **0,970–0,981 opaco** |
| 4 | h264/yuv420p | 960×960 | 10,00 s | 30 | 1,20 MB | 0 | ausente | **0,986–0,990 opaco** |
| 5 | h264/yuv420p | 960×960 | 10,00 s | 30 | 1,55 MB | 0 | ausente | **0,873–0,904 opaco** |
| 6 | h264/yuv420p | 960×960 | 10,00 s | 30 | 1,01 MB | 0 | ausente | **0,953 opaco** |
| 7 | h264/yuv420p | 960×960 | 10,00 s | 30 | 0,92 MB | 0 | ausente | **0,985–0,987 opaco** |
| 8 | h264/yuv420p | 960×960 | 10,00 s | 30 | 1,71 MB | 0 | ausente | **0,955–0,958 opaco** |

Total **9,75 MB** (vs 27,3 MB dos MP4 do 109a). `pixel(3,3)` ≈ **(237…253, …, 255)** — branco/quase-branco **opaco**.
**Nenhum tem alfa** (o H.264 não suporta alfa) e **nenhum passou pela remoção de fundo**.

**Ficha dos 8 MP4 ANTIGOS (`…/GUTO animado oficial/`, os do 109a) — medidos aqui pela 1.ª vez (L-4):**

| # | codec | res | dur | peso | borda branca |
|---|---|---|---|---|---|
| 1/3/6/7 | h264/yuv420p | 960×960 | 10,00 s | 3,4–4,4 MB | **0,89–0,99 opaco** |
| 2/4/8 | h264/yuv420p | 960×960 | 5,00 s | 1,8–2,8 MB | **0,92–0,98 opaco** |
| 5 | h264/yuv420p | 960×960 | 9,93 s | 3,7 MB | **0,62 opaco** |

Total 25,15 MB. **Também sem alfa e com fundo branco opaco.** Nenhum tem áudio.

### LACUNA L-1 — VERIFICADA (pergunta em aberto do 109a)

- `C:\Users\Moltbot\Desktop\GUTO\GUTO original\` **EXISTE** e contém **1 ficheiro**:
  **`guto tradicional (1).png`** — 1024×1536, **RGBA, 67,5 % transparente** (canto `(6,4,0,0)`) ⇒ **fundo LIMPO**.
- **Não é** o `0539243f…915e.png` do grafo ComfyUI (esse continua ausente) ⇒ **a L-1 estrita permanece**,
  mas existe **um GUTO original utilizável** para servir de referência. (Nota: visualmente é um GUTO de
  fatos azul-claro, diferente do das 8 — a decisão é do operador.)
- O 109b (input B) mandava verificar **primeiro** esta pasta: **verificada — tem 1 imagem, com alfa**.

---

## §SEG3 — O que a produção serve hoje (pergunta 3 do Objectivo)

| Verificação | Resultado |
|---|---|
| Os 16 ficheiros do carrossel servidos | **byte-idênticos ao disco** — 16/16 `md5` iguais (webm e png) ⇒ produção = repo |
| `Content-Type` do webm | `video/webm`; `Cache-Control: public,max-age=31536000,immutable` |
| O carrossel é *lazy*? | **sim** — o `index.html` não cita «carrossel»; o chunk do Início não está na entrada (BFS de 5 chunks da entrada não o encontrou). Não é defeito: é code-split. |
| O que o app mostra hoje | **os 8 assets ON-LINE de `public/assets/guto/carrossel/`** (GUTO + eletrodomésticos, **com elementos de leilão**: martelo 2/5/6/7, «Menor Lance Único» 1/6, «LANÇE ÚNICO» 3, «BIDDING»+púlpito 5, «Arremate Já!» 8, placa «AUCTION ITEM #10» 4) — confirmado por inspecção visual |
| São estáticos ou animados? | **os dois**: vídeo WebM animado (com poster PNG de reserva) |
| Correspondem à pasta GUTO? | **Sim** — são a versão «fundo removido» do mesmo conteúdo dos MP4 (mesma pose, mesmo eletrodoméstico, mesmos adereços). |

---

## §SEG4 — Compilação (pergunta 5 do Objectivo: input para o 109d)

### Decisões já registadas (herdadas)

- **109b / input A:** usar **imagem de referência (`--image`)**, **não** Soul ID (o Soul ID é para rostos
  de pessoas; o GUTO é mascote 3D).
- **109b / input B:** verificar **primeiro** `Desktop\GUTO\GUTO original\` → **verificado: existe 1 imagem com alfa**.

### ⛔ BLOQUEADOR medido para o 109d (o «defeito do branco»)

**Todo o material novo tem fundo BRANCO OPACO e NENHUM canal alfa.** MP4/H.264 **não suporta alfa**.
Se estes ficheiros forem postos no carrossel como estão, o resultado é um **quadrado branco** (o
`objectFit:contain` num fundo de vidro escuro) — exactamente «algo branco que não foi tirado».
⇒ O 109d **tem de** correr a **mesma pipeline** que produziu os assets actuais:
**remoção do fundo branco frame-a-frame + encode WebM VP9 com `alpha_mode=1`**.

### Recomendações concretas para o 109d

1. **Tratar o fundo**: remover o branco (flood-fill de bordas + downscale premultiplicado, como o
   comentário do `CarrosselGUTO.jsx:5-6` descreve) nos 8 vídeos novos **e** nas estáticas que forem usadas.
2. **Encode**: `WebM VP9 + alpha_mode=1`, `-pix_fmt yuva420p`, square (**512×512** como os actuais, ou
   960×960 — o contentor é 1:1). O comentário do componente diz «yuva420p»; o container real é
   `yuv420p`+`alpha_mode=1` — ao gerar, garantir a **tag** e **verificar por descodificação com alfa**
   (o `ffprobe` sozinho reporta `yuv420p` e **não prova** que o alfa lá está).
3. **Cache**: os assets são servidos `immutable, max-age=1 ano` e o componente usa `?v=mc58`. Ao trocar,
   **subir a constante `V`** (ex. `mc109`) — senão o browser pode continuar a mostrar os antigos.
4. **Fonte de verdade**: o material novo está **espalhado** — vídeos em `Desktop\NOVO GUTO animado oficial\`,
   estáticas em `GUTO-Eletrodomesticos\NOVO GUTO estatico oficial[ CORRIGIDO]\`. E a pasta «NOVO» **não é
   toda nova** (2 de 8 são cópias das antigas). **Decidir** qual é a fonte única antes de gerar.
5. **Ainda há leilão no material novo**: os textos «MENOR LANCE ÚNICO» (1), «O MENOR LANCE ÚNICO VENCE»
   (2), «PARTICIPE JÁ» (8) mantêm-se (diz o `LEIA-ME`), mas **o martelo/púlpito/microfone desapareceram** e
   entraram **carrinho, caixas e sacos de compras**. ⇒ o material novo é **meio-des-leiloizado**.
   A série 109 quer mais: decidir se é preciso uma 3.ª geração (sem «MENOR LANCE ÚNICO»).
6. **Risco de encoding**: 8 vídeos × 300 frames com remoção de fundo é trabalho pesado; os actuais ficaram
   em 443 KB–1,66 MB (bem abaixo dos 0,9–1,7 MB dos MP4 novos) porque a remoção de fundo **aumenta muito**
   a compressibilidade. Contar com custo de tempo (não medido aqui).

### Perguntas abertas (só o operador responde) — ESCALADAS

1. **Onde exactamente viu o branco?** Nos **vídeos novos** (o quadrado branco é o defeito que medi) ou
   noutro sítio do carrossel no ar (que está limpo)? Um screenshot resolve.
2. **Em que dispositivo/app** — telemóvel, APK DesafioGUT, navegador? (o alfa VP9 não é suportado em todos
   os WebViews; se for isso, o esperado seria **preto** — confirmar).
3. **Qual é a fonte única** para o 109d (vídeos + estáticas)? Ver o ponto 4 acima.
4. **Geração 3?** O material novo ainda diz «MENOR LANCE ÚNICO» — é para manter ou há-de sair?

---

## §SEG5 — Verificação ponta-a-ponta (READ-ONLY)

| Verificação | Resultado |
|---|---|
| Suíte canónica | **frontend 910/910 · backend 1095/1101 VERDE** (inalterada) |
| `git diff --name-only` | **vazio** — **nenhum** ficheiro de código alterado |
| `git status --short` | apenas o `?? _logs/UTAC106x.2.spec.yml` pré-existente + os ficheiros deste UTAC em `_logs/`/`CLAUDE.md` |
| Assets tocados? | **não** — só leitura; nenhum ficheiro de `public/` ou da pasta GUTO alterado |
| Deploy feito? | **não** (proibido) |
| `.bak-*` / bytes de controlo do `CLAUDE.md` | **intactos** — e aqui uma **ERRATA do MEU relatório anterior**: o `CLAUDE.md` tem **6** bytes de controlo (**2×`0x00` + 2×`0x1F` + 2×`0x7F`**), não 4. O enunciado do UTAC109b dizia «4 bytes» e o meu check de lá contou só **duas** das três espécies (`0x00` e `0x1F`) — o número passou a «4» e ficou errado por omissão. Medido hoje em bytes: `2/2/2`. O 109a já tinha dito 6; a minha medição é que estava estreita. **O bloco R14 deste UTAC mantém os 6 intactos** (2+2+2 antes e depois) e o append foi de **45 inserções / 0 remoções**. |

## §SEG6 — Registo + escalada

- **Registo em 3 lugares:** este log · bloco **R14** do `CLAUDE.md` · `Desktop/RELATORIO-UTAC109c-DIAGNOSTICO.txt`.
- **Commit + push em foreground** (ficheiros individuais; nunca `git add -A`).
- **PARADO — a correcção é o UTAC109d.** Nada de vídeos trocados, nada de código alterado.
