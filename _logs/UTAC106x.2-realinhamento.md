# UTAC106x.2 — REALINHAMENTO DOS DOCUMENTOS SECUNDÁRIOS (logs)

**Tipo:** realinhamento documental (Frente 1) · **Skill UTAC** · **Data:** 2026-10-04 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **Baseline:** `21c5ee9` · **Estado:** em curso

> Fecha o **Conflito-A** do UTAC106x («duas fontes de verdade opostas»). O x.1 fixou a NORTE Via B;
> este UTAC realinha os **documentos secundários** que a contradizem.

---

## §1 BASELINE (SEG-1)

| Item | Medido |
|---|---|
| `HEAD` / `origin/main` | `21c5ee9ac39cd9aeca11f65ba7fa3073265fd580` (0/0) |
| UTAC106x.1 fechado | ✅ na história (`27f8b55` NORTE Via B + R14). HEAD avançou com o x.3 (A13) |
| Suíte | **VERDE 694/694 · 992/998** |
| Secção `ESCOPO-ALVO v6.0` | **linhas 126–237** (o `## NORTE DO PRODUTO` começa na 238) |
| `docs/FICHA-PLAY-PT.md` | linhas **33–61** = os 3 blocos de copy ✅ (o enunciado acertou) |
| `_logs/MC100_MATRIZ-CONFORMIDADE.md` | achado **R-19** na **linha 32** (é a *row #24* da tabela) |

### Desvios do enunciado (GATE 1 — «o enunciado deriva do código»)

| # | Enunciado diz | Medido | Tratamento |
|---|---|---|---|
| **D1** | «4 bytes de controlo (**linhas 2125-2126**)» | os **4** bytes (2×`0x00` + 2×`0x1F`) estão nas linhas **2047–2048** no baseline (e em **2060–2061** depois do realinhamento, +13 linhas). ⚠️ Existe ainda um `0x0D` **solto e pré-existente** (linha 3871 → **3884**), que **não** faz parte dos 4 — está dentro de um texto que documenta `grep -c $'\r$'` | **declarado**; requisito cumprido — a contagem (4) e os **bytes exactos** ficam iguais (verificado byte a byte contra o baseline) |
| **D2** | `MC100_MATRIZ`, «linha ~24» | o texto «Gamified Loyalty» está na **linha 32** (*row #24* da tabela) | **declarado** (já apontado no x.1, ℹ️3); anoto a linha certa |
| **D3** | FICHA: «alinhar com o **gabarito Play Console**» | `docs/gabarito-play-console.md` **NÃO EXISTE** (foi pedido no enunciado do UTAC106x e nunca criado — ℹ️7 do x.1) | **declarado**; alinho a ficha com a **definição Via B** e com os requisitos da Play já mapeados na `MC100_MATRIZ` (rows #23–#28, #40, #41) |
| — | «ESCOPO-ALVO (linha ~126-137)» | a secção vai da **126 à 237** (112 linhas); 126–137 é só o cabeçalho + a nota de precedência | **declarado**: trato a **secção inteira**, porque a ENTREGA exige «nenhuma contradição remanescente» (as contradições vivem na 147, 175, 194, 196-197) |

---

### §1.1 RE-CONFIRMAÇÃO DO SEG-1 (medida a 2026-10-04, no HEAD actual `850aac8`)

Os 6 passos do SEG-1 foram re-medidos **depois** de o x.3 e o x.4 terem corrido, para garantir que o
baseline registado acima (`21c5ee9`) continua válido. **A suíte é verde e o estado é limpo** — o
realinhamento do x.2 não foi desfeito nem regrediu.

| Passo do SEG-1 | Medido agora |
|---|---|
| 1 · x.1 fechou, HEAD novo, 0 pendentes | ✅ `HEAD == origin/main == 850aac8` (0/0); os 3 commits do x.1 (`fddf626`/`9cbf184`/`27f8b55`) são **ancestrais de `origin/main`**; `git status` = **0 rastreados alterados**; sem órfãos. Das 5 notas ℹ️ do x.1, **3 fecharam** (ℹ️1/ℹ️4 no x.2, ℹ️7 no x.4) e **2 seguem abertas** (ℹ️5 = DEBT-006; ℹ️6 = data do banner) |
| 2 · `ESCOPO-ALVO v6.0` | **linhas 135–259** (header na **135**; a NORTE começa na **260**). O enunciado dizia «~126-137» — era a posição antiga (`21c5ee9`: 126–246); o x.4 empurrou +9 |
| 3 · `docs/FICHA-PLAY-PT.md` | **106 linhas**; copy em **53 / 58 / 63–81** (eram 33–61 no baseline, +20 do x.2); declarações em 51/56/61; guarda `mc97` **3/3** |
| 4 · `MC100_MATRIZ-CONFORMIDADE.md` | **65 linhas** · **rastreado no git** (fecha o ℹ️4 do x.1) · achado **R-19 = row #24 na LINHA 32** (a «linha ~24» do enunciado confunde *row* com *linha*; a linha 24 é a row #16) · errata do x.2 na **linha 61** |
| 5 · suíte | **VERDE 694/694 · 992/998** (`node scripts/mc966-suite-harness.mjs ambos`, exit 0) + guarda da ficha **3/3** (exit 0) |
| 6 · baseline | registado: **`850aac8`** (0/0 vs `origin/main`) |

**Integridade no HEAD actual:** `git status` = 0 rastreados alterados · `git worktree list` = 2 (repo +
scratchpad pré-existente) · `CLAUDE.md` = 4456 linhas com **4 bytes de controlo** (`2×0x00 + 2×0x1F`; há
ainda **1×`0x0D` pré-existente**, na linha 3884, que **não** faz parte dos 4).

⚠️ **Armadilha de medição (declarada):** a suíte corrida **dentro de um worktree isolado** dá **984/991**
(7 *skips*, 0 falhas) em vez de 992/998 — é a **DEBT-006** (resolução de módulos via junction), **não**
regressão. A medição válida é a do **repo principal**.

---

## §2 SEG0 — ESCOPO-ALVO REALINHADO

**Alterado:** `CLAUDE.md` linhas 126–246 (a secção inteira). **+12 linhas**. Prefixo (1–125) e a partir da
NORTE (238+) **byte-idênticos** ao `HEAD`; bytes de controlo **intactos (4)**.

| # | O que dizia | O que passou a dizer |
|---|---|---|
| 1 | Cabeçalho: `ESCOPO-ALVO v6.0 — FONTE DE VERDADE: os 2 PDFs…` | `ESCOPO-ALVO v6.0 — os 2 PDFs do Desktop (MC100, 2026-09-28) — **HISTÓRICA** (realinhada pelo UTAC106x.2)` — **auto-declaração removida** |
| 2 | — | **Nota nova no topo:** «ESTA SECÇÃO JÁ NÃO É FONTE DE VERDADE… prevalece a NORTE… **Actualizado pelo UTAC106x.2 — ver NORTE DO PRODUTO para a definição vigente**» |
| 3 | «Onde divergir da NORTE…, **prevalece esta**» | ~~riscado~~ + **⛔ REVOGADO pelo UTAC106x.2** |
| 4 | Programada = «**concurso de previsões**», critério «palpite mais próximo», «✅ **requerida** (Lei 5.768/1971…)» | **programa de fidelidade gamificado**: Passe → pontos; **50 pontos = cartão colecionável**; palpite = **bónus (+2)**, não decide; **❌ SPA/MF não se aplica**. A linha antiga fica **citada numa nota ⛔ SUPERADO** logo abaixo |
| 5 | «Vendedor legal… **MEI do DesafioGUT**» | ⛔ **SUPERADO** → **Associação Recreativa dos Nordestinos no Amazonas** (CNPJ 23.040.066/0001-00) |
| 6 | «Titular do MEI e da licença SPA/MF = **Ruan**» / «Licença SPA/MF, R$ 334,00» | ⛔ **REVERTIDO (DEC-09)** / ⛔ **NÃO SE APLICA** — texto antigo riscado, **preservado** |
| 7 | Plano (Ondas 2/3: «concurso», «MEI/SPA») | nota ⛔ **histórico**: «concurso», «MEI» e «SPA» caíram com a Via B |
| 8 | Errata dos PDFs, item 5 → «**R-19, parecer obrigatório**» | + **⛔ REVERTIDA pelo UTAC106x.1 (2026-10-04)** |
| 9 | DEC-09 (pendente) | + **⛔ REVERTIDA pelo UTAC106x.1 (R14)** |

**Consistência (passo 5):** grep a `concurso` · `SPA/MF` · `leilão` na secção 126–246 → **todas** as
ocorrências estão **anotadas** (⛔ SUPERADO / REVERTIDO / NÃO SE APLICA) ou são **negações** («Não é
leilão, não é aposta…», «sem SPA/MF») ou **cabeçalho histórico** da tabela. **0 sem anotação.**
Nada foi apagado (verificado: «concurso de previsões», «MEI do DesafioGUT», «R$ 334,00», «prevalece
esta» e «Ruan» continuam no ficheiro).

---

## §3 SEG1 — FICHA-PLAY-PT + MC100_MATRIZ REALINHADOS

### 3.1 `docs/FICHA-PLAY-PT.md` (+20 linhas)

- **Classificação nova** (secção «Classificação nas lojas»): Google Play = **programa de fidelidade**
  (*Gamified Loyalty*); **não é** concurso de previsões, aposta nem sorteio; **SPA/MF não se aplica**
  (R-19, revertida); Apple = **bem físico**; vendedor = **Associação Recreativa dos Nordestinos no
  Amazonas**.
- **Copy corrigida** (dentro dos 3 blocos cercados — o medidor exige exactamente 3):
  - «Programado: usa **senhas (tokens)** de R$ 2,00…» → «o Passe de R$ 2,00 vale 1 ponto; **50 pontos
    dão direito ao cartão colecionável físico da Família Quildo**; o palpite é bónus de +2 pontos e não
    decide o prémio».
  - «operado pelo **Grupo União e Trabalho**» → «operado pela **Associação Recreativa dos Nordestinos
    no Amazonas** (…), Grupo União e Trabalho».
- **«Concurso de previsões»:** **0 ocorrências** na ficha (medido; as 2 que existem agora são as
  **negações** da classificação nova). O enunciado pedia remover referências — não havia nenhuma.
- **Guarda `scripts/mc97-medir-ficha.mjs`: 3/3 verde** — `titulo 29/30`, `curta 74/80`,
  **`longa 1285/4000`** (a contagem **medida** substituiu os 1132 declarados, nos 2 sítios).
- ⚠️ **D3:** «alinhar com o **gabarito Play Console**» **não foi possível literalmente** — o ficheiro
  `docs/gabarito-play-console.md` **não existe**. Alinhado com a definição Via B + os requisitos da Play
  já mapeados na `MC100_MATRIZ` (rows #23–#28).

### 3.2 `_logs/MC100_MATRIZ-CONFORMIDADE.md`

- **Linha de errata no FIM** do ficheiro (data + referências: NORTE + R14) listando as rows afectadas
  (**#1, #2, #10, #24, #32**) e dizendo explicitamente que ficam **anotadas, não apagadas**.
  ⚠️ **1.ª tentativa (corrigida):** a errata foi posta no **cabeçalho** e as **+5 linhas deslocaram a
  row #24 da linha 32 para a 37** — quebrando a referência «`MC100_MATRIZ` **linha 32**» que a NORTE faz
  (`CLAUDE.md:343`). Apanhado pelo **validador (⚠️ A1)**; movida para o fim ⇒ a row #24 **volta à linha
  32** e a referência da NORTE fica **válida outra vez**.
- **Row #24** (linha **32**): + **«⛔ R-19 REVERTIDA pelo UTAC106x.1 (2026-10-04)»** com a razão (com a
  Via B o requisito *«not subject to additional gambling or gaming licensing requirements»* passa a ser
  **satisfeito**). **Texto original preservado** (verificado).
- **Untracked** → entra no git neste UTAC (resolvendo o achado ℹ️4 do x.1).

---

## §4 VALIDADOR ADVERSARIAL (SEG2)

Subagente independente em worktree próprio (criado com `scripts/worktree-helper.mjs`, A13). Instrução
literal do enunciado: *«Tenta refutar este realinhamento…»*.

### 4.1 Ronda 1 — commit `8427aa1` → **PARCIAL**

**Confirmado (não refutado):** suíte **694/694 · 992/998**; guarda da ficha **3/3**; **escopo respeitado**
(`git diff --name-status` = só os 4 ficheiros autorizados, **zero código de produção**); **NORTE
byte-idêntica**; **contradições da secção ESCOPO-ALVO todas anotadas** (0 sem anotação); **D3 confirmado**
(o gabarito Play **não existe**); control bytes **2×0x00 + 2×0x1F** intactos.

| # | Achado | Tratamento |
|---|---|---|
| **⚠️ A1** | **Ref cruzada partida — era minha:** a errata no **cabeçalho** da MATRIZ (+5 linhas) deslocou a **row #24 de 32 → 37**, quebrando «`MC100_MATRIZ` **linha 32**» (`CLAUDE.md:342`, `:4441`) | **CORRIGIDO** — errata movida para o **FIM** ⇒ row #24 **de volta à linha 32** |
| **⚠️ A2** | D1 declarava os bytes de controlo em 2047-2048; no artefacto final estão em **2060–2061** (+13) | **CORRIGIDO** no log; verificado que a **sequência de bytes é igual à do baseline** |
| ℹ️ I1 | Histórico não 100% verbatim (título antigo e o bullet `2. **Plataforma (MEI):**` não estavam como string exacta) | **CORRIGIDO** — título antigo **citado verbatim** na nota; **`~~MEI~~`** riscado |
| ℹ️ I2 | «gabarito» Play referido na NORTE (§11, §7.1) sem ficheiro | **Declarado** (pré-existente do x.1) |
| ℹ️ I3 | «ver R14» referido 3× sem bloco ancorado | **Declarado** — o R14 é o banner do x.1 (`CLAUDE.md:4441`) |
| ℹ️ I4 | Fora de escopo e não anotado: banner do topo (linha 2), `:3987`, `:3770` ainda com MEI/DEC-09 superados; o banner do x.1 **sobre-promete** que o x.2 os corrigiria | **Declarado** — o enunciado **não autoriza** tocar fora dos 3 alvos |

### 4.2 Correcções — commit `8aae4d6`

A1 (errata movida para o fim, row #24 de volta à linha **32**), A2/D1 (posições medidas: baseline
2047–2048 → **2060–2061**; `0x0D` pré-existente 3871 → 3884), I1 (histórico verbatim: título antigo +
`~~MEI~~`).

**Verificação:** suíte **694/694 · 992/998**; ficha **3/3**; auto-verificação **33/33** (com controlo
negativo a morder); **sequência de bytes de controlo idêntica** ao baseline
(`[0x0,0x1f], [0x0,0x1f], [0xd]`); prefixo 1–125 e NORTE em diante **byte-idênticos**.

### 4.3 Ronda 2 — commit `8aae4d6` → **APROVADO**

O validador **não conseguiu refutar nenhuma das correcções**. Verificado por medição:

1. **Ref cruzada** — `sed -n '32p'` da MATRIZ começa por `| 24 | Google Play |`; a errata está no **fim**
   do ficheiro; a âncora `| # | Norma |` voltou da linha 12 para a **7** (as +5 linhas saíram do
   cabeçalho); as rows `#1..#41` estão **contíguas, sem gaps**. As duas refs da NORTE
   (`CLAUDE.md:343` e `:4442`) são **verdadeiras**.
2. **Histórico verbatim** — título antigo exacto presente (linha **133**) e `~~MEI~~` presente (linha **172**).
3. **Bytes de controlo** — sequência **idêntica** ao baseline (`[0x00,0x1F,0x00,0x1F,0x0D]`), contagem 5==5,
   **nenhum byte novo**; os 4 em **2060–2061**, o `0x0D` pré-existente em 3884.
4. **Nada partido** — ficha **3/3**; suíte no repo principal **694/694 · 992/998**; nenhuma outra linha da
   MATRIZ deslocada; refs por *row number* intactas.
5. **Nada pior** — escopo respeitado (`git diff --name-only … -- desafio-gut/ scripts/ package.json` =
   **vazio**); **NORTE byte-idêntica** (1.º byte divergente no offset 54178, dentro do ESCOPO-ALVO);
   `git diff --diff-filter=D` = **vazio** (nada apagado).

ℹ️ **Cosméticos declarados:** ℹ️1 esta log citava `CLAUDE.md:342` (off-by-one — a linha real é a **343**;
corrigido); ℹ️2 markdown aninhado no bullet `~~MEI~~` (a strikethrough envolve a lista — cosmético).
ℹ️ Suíte **no worktree** = `694/694 · 984/991` (7 skips por resolução de módulos via junction) =
**DEBT-006**, não regressão.

> **Veredicto (verbatim):** *«VEREDICTO: **APROVADO** (correcções refutadas apenas em detalhes cosméticos ℹ️)»*

---

## §5 ENTREGA FINAL (checklist do enunciado)

| # | Item | Estado |
|---|---|---|
| 1 | ESCOPO-ALVO v6.0 realinhado (fidelidade, sem SPA/MF, sem auto-declaração de fonte de verdade) | ✅ |
| 2 | `docs/FICHA-PLAY-PT.md` realinhado | ✅ (guarda 3/3) |
| 3 | `MC100_MATRIZ` anotado (R-19 revertido, histórico preservado) | ✅ |
| 4 | Nenhuma contradição remanescente (grep aos termos contraditórios) | ✅ (0 sem anotação) |
| 5 | Validador adversarial despachado + veredicto | ✅ (§4) |
| 6 | Registo em 3 lugares | ✅ (log · artefactos no repo · `Desktop/UTAC106x.2-RELATORIO.md`) |
| 7 | Commit + push foreground | ✅ (ficheiros individuais; **nunca** `git add -A`) |
| 8 | Custo de API reportado | ✅ (declarado: não mensurável neste ambiente) |

### Pendências declaradas

1. ⚠️ **Sem R14 no `CLAUDE.md`** — o enunciado não autoriza alterar o `CLAUDE.md` fora da secção
   ESCOPO-ALVO (GATE 3/HI4). **Declarado, não feito.**
2. ⚠️ **A nota do x.1 dentro da NORTE** («a correcção é o UTAC106x.2») fica **desactualizada** — corrigi-la
   é alterar a NORTE ⇒ **não autorizado**.
3. **`protocol/regras/README.md`, `README.md` (raiz), `CLAUDE.md:67`** ainda «75 regras / A1-A12».
4. **`docs/gabarito-play-console.md`** continua a não existir.
5. ⚠️ **HI5:** este UTAC **excedeu 1 h** (2 rondas de validador com correcção). Declarado.
