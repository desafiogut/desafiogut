# UTAC109a — Inventário da pasta-fonte GUTO e preparação do dataset

**Tipo:** medição e preparação (READ-ONLY sobre a pasta-fonte) · **Owner:** Hermes (deepseek-v4-flash)
**Data:** 2026-10-06 · **HI5:** 1 h · **Série 109:** consistência visual do GUTO (martelo → carrinho)
**Entrega:** `_contact-sheet.png` + este log · **NÃO gera imagens, NÃO treina Soul ID, NÃO cria `GUTO-ecommerce/`.**

---

## §Baseline (SEG-1) — MEDIDO, COM 4 DESVIOS DECLARADOS

| Item | Enunciado | **Medido** | Desvio |
|---|---|---|---|
| Pasta-fonte | `GUTO/GUTO - eletrodomesticos/` | `GUTO/GUTO-Eletrodomesticos/` | **D-1**: o caminho literal **não existe** (sem espaços, `E` maiúsculo, sem o hífen isolado). `find` por `*eletrodomesticos*` em todo o Desktop devolve **exactamente 1** directório. Corroborado pelo atalho `Desktop/MC-HISTORICO/MC39.7.1-shots/GUTO-Eletrodomesticos - Atalho.lnk` |
| Onde estão as 8 imagens | «na pasta-fonte» | **numa subpasta**: `GUTO estatico oficial/` | **D-2**: não estão na raiz da pasta-fonte |
| Conteúdo da pasta-fonte | 8 imagens | **19 ficheiros**: 2 subpastas (8 PNG + 8 MP4) + um `.zip` (as mesmas 8 PNG) + `README.txt` + 1 JPEG de proporções | **D-3**: há 8 animadas (MP4) e um ZIP além das 8 estáticas |
| «8 imagens com martelo de leiloeiro» | as 8 | **martelo FÍSICO em 4 de 8** (02, 05, 06, 07); em 1 é só **gráfico no ecrã** (01); **ausente em 3** (03, 04, 08) | **D-4**: a premissa é imprecisa — ver §SEG1 |
| `HEAD` do repo | — | `740eb7e` (= `origin/main`) | — |
| Higgsfield | autenticado, Plus, 1010 | `higgsfield account status` → **desafio-gut@gmail.com — plus plan, 1010 credits** | confere |
| Skills Higgsfield | 2 instaladas | `hermes skills list` → **8** higgsfield-*, todas `enabled` | mais 6 do que o enunciado supunha |
| Ferramentas | `identify`/`montage`/`exiftool` | **AUSENTES**; usados **PIL 12.3.0** (Python) e `magick` | instrumento substituído (declarado) |

**DIRECTÓRIO CONFIRMADO COM O OPERADOR** antes de prosseguir (regra do UTAC: nome difere → PARAR e reportar).
Resposta: *«fonte = GUTO-Eletrodomesticos/GUTO estatico oficial (as 8 PNG 4K) — prosseguir o 109a»*.

**Integridade:** zero ficheiros da pasta-fonte alterados até ao SEG0 (só leitura). O único ficheiro criado
é a contact sheet (autorizada).

---

## §SEG0 — Inventário (Frente A)

### A.1 Conteúdo integral da pasta-fonte (19 ficheiros)

| # | Caminho relativo a `GUTO-Eletrodomesticos/` | Tipo | Peso | Data |
|---|---|---|---|---|
| 1 | `GUTO estatico oficial/01-guto-tv.png` | imagem | 20,44 MB | 2026-05-27 19:49 |
| 2 | `GUTO estatico oficial/02-guto-geladeira.png` | imagem | 20,70 MB | 2026-05-27 19:37 |
| 3 | `GUTO estatico oficial/03-guto-maquina-lavar.png` | imagem | 21,92 MB | 2026-05-27 19:49 |
| 4 | `GUTO estatico oficial/04-guto-ar-condicionado.png` | imagem | 22,09 MB | 2026-05-27 19:49 |
| 5 | `GUTO estatico oficial/05-guto-notebook.png` | imagem | 21,93 MB | 2026-05-27 19:49 |
| 6 | `GUTO estatico oficial/06-guto-smartphone.png` | imagem | 21,61 MB | 2026-05-27 19:49 |
| 7 | `GUTO estatico oficial/07-guto-fogao.png` | imagem | 19,44 MB | 2026-05-27 19:49 |
| 8 | `GUTO estatico oficial/08-guto-conjunto-eletrodomesticos.png` | imagem | 20,20 MB | 2026-05-27 19:40 |
| 9-16 | `GUTO animado oficial/1.mp4` … `8.mp4` | vídeo | 1,89–4,59 MB (total 27,3 MB) | 2026-07-06/07 |
| 17 | `GUTO PNG 1 AO 8.zip` | arquivo | 18,49 MB | 2026-07-06 |
| 18 | `README.txt` | documento | 2,47 kB | 2026-05-27 |
| 19 | `REFERENCIA DE PROPORÇOES GUTO E LOGO.jpeg` | imagem | 45,3 kB | 2026-07-06 |

`du -sh` = **212 MB**. `find -type f | wc -l` = **19**.

### A.2 As 8 imagens — ficha técnica

| # | Nome | Formato | Dimensões | Ratio | Modo | Peso | `md5` |
|---|---|---|---|---|---|---|---|
| 1 | 01-guto-tv.png | PNG | 4096×4096 | 1:1 | RGBA | 20,44 MB | `94503eec883ef4b3f4b38fd46ee72a3a` |
| 2 | 02-guto-geladeira.png | PNG | 4096×4096 | 1:1 | RGBA | 20,70 MB | `5f46052162b2fe4ca22991400a441b9b` |
| 3 | 03-guto-maquina-lavar.png | PNG | 4096×4096 | 1:1 | RGBA | 21,92 MB | `5bbc06bfc4b75a380d2e2e303ccb1cf2` |
| 4 | 04-guto-ar-condicionado.png | PNG | 4096×4096 | 1:1 | RGBA | 22,09 MB | `fa65bbce55381aefdeadd00368900954` |
| 5 | 05-guto-notebook.png | PNG | 4096×4096 | 1:1 | RGBA | 21,93 MB | `120b641fcba8d485a9e3b50cb22d870e` |
| 6 | 06-guto-smartphone.png | PNG | 4096×4096 | 1:1 | RGBA | 21,61 MB | `d8339961ad7f9961fa4086aa025c8a4b` |
| 7 | 07-guto-fogao.png | PNG | 4096×4096 | 1:1 | RGBA | 19,44 MB | `d35d988736a661ad78d3225f615ea229` |
| 8 | 08-guto-conjunto-eletrodomesticos.png | PNG | 4096×4096 | 1:1 | RGBA | 20,20 MB | `8a0eb3022725be0c4165a9922b8b15de` |

Total = **168,3 MB**. `EXIF` (tag EXIF) = **vazio em todas as 8** — mas **não estão «limpas»**: ver A.3.

### A.3 ⚠️ METADADOS OCULTOS — cada PNG traz o grafo ComfyUI completo

Os 8 PNG têm **chunks de texto PNG** `prompt` e `workflow` (JSON). Extraído de todas as 8:

| Campo | Valor medido (idêntico estruturalmente nas 8) |
|---|---|
| Modelo | **`gemini-3-pro-image-preview`** (= «Nano Banana Pro», Gemini 3 Pro Image Preview) |
| Resolução / ratio | `4K` · `1:1` · `response_modalities = IMAGE` |
| Nós | `LoadImage #11`, `LoadImage #12`, `BatchImagesNode #36`, `GeminiImage2Node #35`, `SaveImage #30` |
| **Imagem de referência (input)** | **`0539243f4263e481ba70cdbb923b163db86fe2d32f698d3c56f1b8fea0ae915e.png`** — a **MESMA nas 8** (carregada 2×, nós #11 e #12) |
| `system_prompt` | idêntico nas 8: *«You are an expert image-generation engine. You must ALWAYS produce an image. …»* |

**Seeds (por imagem):** 01 `382486820831670` · 02 `98546480191537` · 03 `24689309965885` ·
04 `685428782691415` · 05 `1119744399741795` · 06 `1084576088474043` · 07 `819513676604073` ·
08 `623736372664363`.

**Prompts exatos (do chunk `prompt`, o que foi REALMENTE usado — difere do README, que é uma versão curta):**

| # | Prompt |
|---|---|
| 01 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, standing next to a large modern smart television displaying the text "Menor Lance Único" clearly on its screen, auction atmosphere, clean composition, white background` |
| 02 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, presenting a modern stainless steel refrigerator, auction gavel in hand, white background` |
| 03 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, next to a front-load washing machine, pointing at 'Lance Único' label, white background, auction presentation style` |
| 04 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, presenting a split air conditioner unit, thumbs up gesture, white background, professional auction display` |
| 05 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, holding a sleek laptop showing DESAFIOGUT logo on screen, auction atmosphere, white background, tech product presentation` |
| 06 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, presenting a premium smartphone with 'Menor Lance Único' on display, auction gavel nearby, white background, professional tech showcase` |
| 07 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, standing next to a modern stainless steel stove/oven, auction presentation, white background, home appliance showcase` |
| 08 | `guto_personagem, 3D premium cartoon mascot, navy blue suit, orange vest, celebrating with confetti surrounded by various home appliances (TV, fridge, washing machine), 'Arremate Já!' text, white background` |

> ⚠️ **LACUNA L-1:** a **imagem de referência** que ancorou as 8 (`0539243f…915e.png`) **não existe no
> disco**. Varridura por **sha256** de toda a árvore `Desktop/GUTO` (ficheiros ≤ 60 MB) → **0
> correspondências**. É um upload do ComfyUI; não é possível reproduzir exactamente o mesmo GUTO sem
> voltar a fornecer uma referência.

### A.4 README.txt (lido e citado)

`README.txt:1-7` → «GUTO + Eletrodomésticos — Conjunto Final · Data: 27 de maio de 2026 · Geração:
**ComfyUI Cloud Creator + Nano Banana Pro (Gemini 3 Pro Image Preview)** · Resolução: **4096 x 4096
(4K, aspect ratio 1:1)** · Formato: PNG».
`README.txt:9` → «Arquivos (8 imagens, ~20 MB cada, totais ~168 MB)».
`README.txt:21-59` → «Prompts utilizados» (versões curtas dos 8 prompts — **o README não é reprodução
fiel**: os prompts embutidos nos PNG (A.3) são os executados).
`README.txt:61-64` → «Verificação visual: Todas as 8 imagens foram inspecionadas visualmente. Cada
arquivo corresponde ao nome (eletrodoméstico correto, GUTO presente, fundo branco).»

### A.5 O ZIP e as animadas

`GUTO PNG 1 AO 8.zip` (`unzip -l`) → **8 entradas** `1.png`…`8.png`, 2,0–2,4 MB cada (total 18,5 MB),
datadas 2026-07-06. São **as mesmas 8 imagens em resolução reduzida** (provável versão para web).
`GUTO animado oficial/` → 8 MP4 (1,89–4,59 MB), datados 6-7/jul — **não inventariados em detalhe
(fora do objectivo: o dataset do 109b é de imagens estáticas)**. Registados por nome e peso.

### A.6 Contact sheet

Gerada: **`GUTO-Eletrodomesticos/_contact-sheet.png`** — 2890×1546 px, 4,14 MB, grelha 4×2,
miniatura de 700 px por imagem com o nome do ficheiro + «4096x4096» + índice `n/8`. As 8 estão
presentes (controlo: contagem programática = 8).

> Instrumentos auxiliares de leitura (folhas ampliadas `_contact-sheet-detalhe-1|2.png` e
> `_zoom-detalhes.png`) foram criados para a análise do §SEG1 e **removidos no fecho** — a autorização
> cobria apenas `_contact-sheet.png`.

---

## §SEG1 — Análise estética + dataset (Frente B)

> **Método:** descrição feita por **inspecção visual real** das imagens (não inferida dos prompts).
> Onde a leitura não foi conclusiva, está marcado **LACUNA**.

### B.1 O GUTO

- **Forma:** **não é animal nem robô — é um homem adulto estilizado** (personagem humano cartoon).
  Sem cauda, sem orelhas/chifres de animal (as orelhas são humanas).
- **Estilo de ilustração:** **render 3D de alta qualidade** (CGI glossoso, tipo Pixar/DreamWorks),
  *não* flat vector nem esboço. Acabamento polido, com sombras de contacto suaves.
- **Cabelo:** castanho-escuro, curto, repartido ao lado, com volume/queda para a frente.
  Sobrancelhas grossas e escuras.
- **Rosto:** olhos grandes, castanhos, esclerótica branca, expressão alegre/simpática; sorriso
  aberto com dentes visíveis; pele tan-clara; **barba cuidada (bigode + queixo) e barba por fazer**;
  pequeno brinco na orelha.
- **Fato:** blazer e calças **azul-marinho**, camisa **branca**, **laço azul-marinho**, lenço de bolso
  laranja, **colete (waistcoat) laranja-tijolo com padrão brocado/damask**, sapatos de couro castanho;
  punhos brancos com botão contendo um pequeno emblema.
- **Medalhão:** **medalhão dourado circular, ao peito, pendurado numa corrente dourada grossa** —
  presente nas **8 imagens**. Relevo figurativo (aparentemente uma figura humana / aperto de mãos).
  ⚠️ **LACUNA L-2:** **o símbolo do medalhão não foi legível** com a ampliação que fiz (5×). A memória
  do projecto diz que deve conter o símbolo **«União e Trabalho»** — a confirmar contra
  `Desktop/GUTO/LOGO DO MEDALHÃO.jpeg`, que está **fora do escopo autorizado** deste UTAC.
- **Proporções:** adulto estilizado — cabeça ligeiramente ampliada, tronco compacto, **mãos grandes
  de cartoon**. Está **de pé nas 8**.

### B.2 O martelo de leiloeiro — ⚠️ a premissa do enunciado não confere

| # | Martelo FÍSICO? | Onde / descrição |
|---|---|---|
| 01 | **não** | Só **gráfico dentro do ecrã da TV** (martelo dourado + bloco, ao lado do texto «Menor Lance Único») |
| 02 | **SIM** | **Na mão direita**, erguido à altura do ombro; madeira média com aros dourados |
| 03 | **não** | Nenhum martelo; segura um letreiro |
| 04 | **não** | Nenhum martelo; há um **púlpito/pedestal redondo de madeira** com placa |
| 05 | **SIM** | **Pousado** num pequeno suporte/púlpito metálico, à esquerda, à altura da cintura |
| 06 | **SIM** | **Pousado** sobre um **bloco de som de madeira** (som do martelo), à direita, à altura do joelho |
| 07 | **SIM** | **Na mão direita**, erguido à altura do peito |
| 08 | **não** | Nenhum martelo |

⇒ **Martelo físico em 4 de 8** (02, 05, 06, 07) · **gráfico em 1** (01) · **ausente em 3** (03, 04, 08).
**A «vibe de leilão» a substituir é mais larga do que o martelo** — inclui:

| Elemento de leilão | Onde |
|---|---|
| «auction atmosphere / presentation / display» no prompt | 01, 03, 04, 05, 07 |
| Púlpito de leiloeiro + microfone | 01, 07 |
| Corda de veludo com postes dourados | 01 |
| Pedestal redondo + placa «AUCTION ITEM #10: PREMIUM AC UNIT» | 04 |
| Ecrãs de valores «**BIDDING**» + montantes | 05 |
| Texto «**Arremate Já!**» | 08 |

### B.3 Enquadramento

- **Fundo:** estúdio **branco / cinza-claríssimo** nas 8. **Mas 3 têm cena montada**: 01 (púlpito,
  corda de veludo, mesa com TV, microfone), 04 (pedestal de madeira), 05 (plataforma circular
  dourada, 2 projetores, 2 ecrãs de valores). As outras 5 são fundo liso com sombra de contacto.
- **Iluminação:** de estúdio, difusa, com sombra suave sob o personagem e o eletrodoméstico.
- **Ângulo:** predominantemente **frontal, ao nível dos olhos, corpo inteiro**; variações ligeiras
  de 3/4.
- **Composição:** o GUTO está **ao lado** do eletrodoméstico, a apresentá-lo. Os gestos variam:
  palma aberta a apresentar (02, 04, 07), polegar para cima (03, 04), segurar com as duas mãos
  (05, 06), celebrar com os braços no ar (08), braços ao lado do corpo (01).

### B.4 Consistência

- **O GUTO parece o MESMO personagem nas 8?** **SIM.** Rosto, cabelo, barba, fato, colete, laço,
  medalhão e sapatos são coerentes em todas. (Nota: todas foram geradas com o **mesmo** modelo e a
  **mesma imagem de referência** — ver A.3 — o que explica a coerência.)
- **O que muda:** pose/gesto, intensidade da expressão, o eletrodoméstico, os adereços de cena,
  a escala/posição do personagem e — em 2 casos (02, 07) — o **martelo na mão**.

### B.5 Avaliação do dataset para consistência

| Critério | Medição |
|---|---|
| Nº de imagens | **8** (< 20) |
| Variedade de ângulo | **baixa** — todas corpo inteiro, frontal/3-4 ligeiro |
| Vista de perfil / costas | **0** |
| Close-up do rosto | **0** |
| Ficha de expressões | **0** (só sorriso/riso) |
| Variação de fundo | baixa (branco de estúdio; 3 com cena) |
| Variação de pose | média (6 gestos distintos) |
| Variação de escala | média |

⚠️ **ALERTA PARA O 109b (Ressalva do UTAC): 8 imagens < 20.** Para uma ficha de identidade clássica
(multi-ângulo) o conjunto é **insuficiente**. As 8 servem como **conjunto de referência estilística e
de coerência de vestuário/rosto**, não como conjunto de treino multi-ângulo.

### B.6 LACUNA DO SOUL ID PARA CARTOON — registada (não resolvida aqui)

Medido na skill instalada `higgsfield-soul-id` (e `higgsfield-generate`):

- `higgsfield-soul-id/SKILL.md:5-6` → «Train a Soul Character — a personalized model on a **person's
  face** … identity-faithful image and video generation».
- `higgsfield-soul-id/SKILL.md:44` → «**Get photos. 5–20 face photos**, varied angles and lighting.»
- `higgsfield-soul-id/SKILL.md:79` → erro previsto «Training failed — check photos quality
  (**5+ unique faces**, well-lit)».
- `higgsfield-soul-id/SKILL.md:13-14` → **«NOT for: … named-character / non-photo avatars (use
  `higgsfield-generate` with prompt)»** e «one-shot face swaps (use `higgsfield-generate` with `--image`)».

⇒ **O Soul ID é, pela sua própria documentação, para ROSTOS de PESSOAS.** O GUTO é um mascote
cartoon 3D ⇒ o caminho do Soul ID está **fora do uso declarado** e, além disso, o conjunto (8 imagens
de corpo inteiro, 0 close-ups) não cumpre o requisito «5-20 face photos».

**Alternativa que a própria skill aponta (medida, não decidida):** `higgsfield-generate` com
**imagem de referência** — «Most image models … `image`: 1+ references, often up to 8»
(`higgsfield-generate/references/media-inputs.md:36`); `nano_banana_2_lite` aceita até **14**
referências (`:37`); `gpt_image_2_5` aceita `--image-references` repetido (`:39`).
**É exactamente o que a pipeline original já fez** (1 imagem de referência + `gemini-3-pro-image-preview`).

**LACUNA L-3 — NÃO RESOLVIDA (decisão do 109b):** Soul ID **vs** referência (`--image`) **vs** prompt
de personagem nomeado. Este UTAC **só regista**.

### B.7 Proposta de prompt-base para o 109c (a validar no 109b)

**Personagem (identidade a preservar):**
> `guto_personagem, 3D premium cartoon mascot, adult man, dark brown side-parted hair, thick eyebrows,
> big brown eyes, open friendly smile, neat goatee and light stubble, light tan skin, gold medallion
> on a thick gold chain at the chest, navy blue suit, white shirt, navy bow tie, burnt-orange brocade
> waistcoat, orange pocket square, brown leather shoes`

**Carrinho de supermercado (o que substitui o martelo):**
> `pushing a cartoon supermarket shopping cart (metal wire basket, orange handle, two wheels) filled
> with small home appliances`

**Enquadramento (o mesmo das 8, só trocando o adereço):**
> `full body, standing beside <ELETRODOMÉSTICO>, presenting it with an open palm, clean white studio
> background, soft studio lighting, soft contact shadow, 1:1, 4K`

**Negativos / a retirar (o que a série 109 quer eliminar):**
> `no gavel, no auction podium, no microphone, no bidding boards, no velvet rope, no "Arremate Já!"
> text, no "Menor Lance Único" on screens`

⚠️ **Dois avisos para o 109c:**
1. **A imagem de referência original perdeu-se (L-1).** Para reproduzir o mesmo GUTO é preciso
   re-fornecer uma referência (uma das 8, ex. `02-guto-geladeira.png`, ou um GUTO de
   `Desktop/GUTO/GUTO original/` — **fora do escopo deste UTAC**).
2. **Há texto no ecrã a substituir**, não só o martelo: 01 («Menor Lance Único» na TV), 03
   (letreiro), 05 («DESAFIOGUT» + «BIDDING»), 06 («MENOR LANCE ÚNICO» no telemóvel), 08
   («Arremate Já!» + grelha Smart TV).

### B.8 Texto legível encontrado (inventário de copy a tratar)

| # | Onde | Texto transcrito | Nota |
|---|---|---|---|
| 01 | ecrã da TV | **«Menor Lance Único»** (dourado 3D) + martelo dourado gráfico | vocabulário do leilão |
| 03 | letreiro (2 linhas, azul-marinho sobre branco) | **«LANÇE»** / **«ÚNICO»** | ⚠️ **erro de grafia**: tem **cedilha** («LANÇE»); o correcto é «LANCE». Ampliado 1:1 e confirmado: vê-se o `Ç` |
| 04 | ecrã do ar-condicionado | «22°C» + ícones | — |
| 04 | placa de latão no pedestal | **«AUCTION ITEM #10: PREMIUM AC UNIT»** | **em inglês** |
| 05 | ecrã do portátil | **«DESAFIOGUT»** (logótipo dourado) | marca — a preservar |
| 05 | 2 ecrãs de valores | **«BIDDING»** + montantes (13.500.000 · 13.900.000 · 1.275.000 · 600.000 · 235.000 …) | em inglês |
| 06 | ecrã do telemóvel | **«MENOR LANCE ÚNICO»** | vocabulário do leilão |
| 07 | ecrã do fogão | «400» / «350» | — |
| 08 | fundo (topo) | **«Arremate Já!»** (dourado 3D) | vocabulário do leilão |
| 08 | ecrã da TV | grelha de Smart TV com ícones **Netflix · Prime Video · YouTube · Google** | ⚠️ **marcas de terceiros** |

### B.9 LGPD — rostos

**Nenhuma das 8 imagens contém rosto de pessoa real** (fotográfico). As 8 mostram **o mesmo
personagem cartoon 3D**. Não houve necessidade de mascarar nada na contact sheet.
⚠️ Nota para o operador: se o GUTO for a caricatura de uma **pessoa real identificável**, isso é uma
questão de direitos de imagem a decidir **fora** deste UTAC (não medido aqui).

---

## §SEG2 — Verificação

| Verificação | Resultado |
|---|---|
| Pasta-fonte alterada? | **NÃO** — nenhum ficheiro movido/renomeado/editado; só leitura |
| Ficheiros criados na pasta-fonte | **1** — `_contact-sheet.png` (autorizado). Os instrumentos auxiliares de zoom são removidos no fecho |
| Contact sheet legível | **SIM** — 2890×1546, 4 colunas, nome + dimensões por célula |
| As 8 imagens estão na sheet | **SIM** — contagem programática = 8 |
| Cada afirmação tem referência | **SIM** — `ficheiro:linha` (README, SKILL.md, media-inputs.md), `md5`, `seed`, ou marcação **LACUNA** |
| `git status --porcelain` | limpo excepto `_logs/` e `CLAUDE.md` (os do UTAC) |
| Higgsfield | consultado **só** com `account status`; **nenhuma geração, nenhum upload, nenhum crédito gasto** |

**Lacunas registadas:** **L-1** imagem de referência do ComfyUI ausente do disco ·
**L-2** símbolo do medalhão não legível → confirmar contra `LOGO DO MEDALHÃO.jpeg` (fora do escopo) ·
**L-3** Soul ID para cartoon por resolver (decisão do 109b) · **L-4** os 8 MP4 não foram analisados ao
detalhe (fora do objectivo) · **L-5** o `REFERENCIA DE PROPORÇOES GUTO E LOGO.jpeg` não foi lido
(fora do objectivo do 109a).

---

## §SEG3 — Validador adversarial

> _(veredicto + tratamento — a preencher após o despacho)_

---

## §SEG4 — Fecho

> _(a preencher)_
