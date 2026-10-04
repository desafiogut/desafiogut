# UTAC106x — Consolidação do Norte + Gabarito Play Console (logs)

**Tipo:** consolidação documental (Frente 1) · **Skill:** `skills/utac` v1.1 (protocolo) ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent)

> ⛔ **ESTADO: PARADO no SEG-1 — veredicto PARAR (aguarda decisão do operador).**
> O SEG-1 mediu o ambiente e encontrou **conflitos materiais** entre o enunciado e o repositório que o
> executor **não pode resolver sozinho** (GATE 12 / AU3, HI8, RESSALVA 2). Nada foi escrito em
> `CLAUDE.md` e o `docs/gabarito-play-console.md` **não foi criado**. Abaixo: baseline medido, desvios
> com número, conflitos, opções.

---

## §1 BASELINE (SEG-1)

### §1.1 Estado do repo
| Item | Medido | Comando |
|---|---|---|
| `HEAD` | `483576f605c05f559424dd75c26254ec7e3d821b` | `git rev-parse HEAD` |
| `origin/main` | `483576f605c05f559424dd75c26254ec7e3d821b` (== HEAD, 0/0) | `git rev-parse origin/main` · `git rev-list --left-right --count` |
| Último commit | `483576f docs(UTAC000.17bc): nota operativa do handoff da DEBT-017 …` | `git log -1 --oneline` |
| Sujeira | **30 ficheiros `??` (untracked)**, todos pré-existentes (`_logs/MC100_*.md`, `_logs/MC101_SEG-1_MEDICAO.md`, `docs/MC100_*`, `_logs/DEBT.md`?) | `git status --porcelain` |

> ⚠️ **Declaração:** o enunciado **não fixa um SHA de baseline**; o medido é o `483576f`, que coincide com
> `origin/main`. Os 30 `??` são **pré-existentes** (nenhum criado por este UTAC) — o commit deste UTAC
> terá de nomear ficheiros **um a um** (GATE 10 / G1).

### §1.2 Suíte (HARD GATE 1 · HI1)
| Alvo | Medido | Enunciado | Veredicto |
|---|---|---|---|
| frontend | **VERDE 694/694** | 694/694 | ✅ coincide |
| backend | **VERDE 992/998** | 992/998 | ✅ coincide |

Comando: `node scripts/mc966-suite-harness.mjs ambos` (da raiz). `VEREDITO: VERDE`.
⇒ **RESSALVA 5 satisfeita** (o ambiente bate com o enunciado). Nota: o cabeçalho do `CLAUDE.md` ainda
cita «967/973 backend · 535/535 frontend» (UTAC105b.3) — **desactualizado**, não é desvio deste UTAC.

### §1.3 Caminhos nomeados pelo enunciado
| Caminho | Existe? | Nota |
|---|---|---|
| `CLAUDE.md` (raiz) | ✅ | 4505 linhas, 346 100 bytes |
| `_logs/DEBT.md` | ✅ | 50 966 bytes (lido — ver §3.4) |
| `docs/` | ✅ | sem `gabarito-play-console.md` |
| `docs/gabarito-play-console.md` | ⛔ **não existe** | a criar (SEG1) |
| `_logs/UTAC106x-consolidacao.md` | ⛔ não existia | **este ficheiro** |
| `scripts/mc966-suite-harness.mjs` | ✅ | existe na raiz |
| `_logs/UTAC106*` (spec, plano 106a-h) | ⛔ **nenhum** | só há menções soltas a «UTAC106» em `spec-template.yml`, `types/produto.md`, `UTAC105b.spec.yml`, `UTAC105c_S…` (referências a «o próximo») |

### §1.4 Disco (· -1.5)
`df -h /c` → **19 GB disponíveis** (93 % usado). **≥ 5 GB ⇒ SEGUIR.**

### §1.5 Localização exacta da secção «Norte» (GATE 1)
| Secção | Linhas (início–fim) |
|---|---|
| `## 🎯 ESCOPO-ALVO v6.0 — FONTE DE VERDADE…` | **126–235** |
| `## 🎯 NORTE DO PRODUTO — Definição Consolidada (MC-NORTE-01, 2026-09-28)` | **238–468** (o `---` de fecho está na 468) |

⚠️ **A secção não se chama «Norte do DesafioGUT».** O título medido é **«NORTE DO PRODUTO»**. Não existe
qualquer cabeçalho literal «Norte do DesafioGUT» no ficheiro (`grep -an`).

### §1.6 Os 4 bytes de controlo (A3 / A10 / RESSALVA 4)
Medição em **bytes crus** (`open(p,'rb')`, não a ferramenta de leitura — A10):

| Linha | Offset(s) | Bytes | Total |
|---|---|---|---|
| **2125** | 13, 15 | `0x00`, `0x1F` | 2 |
| **2126** | 1, 6 | `0x00`, `0x1F` | 2 |
| | | **TOTAL** | **4** |

⚠️ **O enunciado diz «linha 1732». O medido é «linhas 2125–2126».** A linha 1732 (`sed -n '1732p'`) contém
texto de histórico do MC96 (`**HEAD** fcee691 · Relatório consolidado…`) e **zero bytes de controlo**.
Nota: os 4 bytes vivem dentro do **próprio texto que documenta** o incidente histórico dos 3 bytes crus
em `_lib/edicoes-core.mjs` (o regex `/[·-··]/` escrito com bytes literais). ⇒ **a contagem (4) confere;
a linha não.** Desvio declarado com o número.

### §1.7 Veredicto do SEG-1
**PARAR** — ver §3. Baseline medido e registado; conflitos materiais identificados que exigem decisão do
operador antes do SEG0 (GATE 6: uma frente de cada vez; não se abre o SEG0 com o alvo ambíguo).

---

## §2 DESVIOS MEDIDOS vs ENUNCIADO (GATE 1 — «o enunciado deriva do código»)

| # | Enunciado diz | Medido | Gravidade |
|---|---|---|---|
| D1 | secção «Norte do DesafioGUT» | secção «**NORTE DO PRODUTO**» (238–468) | resolver (identificável) |
| D2 | 4 bytes de controlo na **linha 1732** | 4 bytes nas linhas **2125–2126** | resolver (contagem confere) |
| D3 | suíte 694/694 + 992/998 | **694/694 + 992/998** ✅ | nenhum |
| D4 | «a consolidação já foi feita em 2026-10-04» | **nenhum artefacto** de 2026-10-04 no repo/Desktop (ver §3.2) | **GATE 2 — bloquear** |
| D5 | «o Norte do `CLAUDE.md` é a fonte de verdade» | o `CLAUDE.md` diz o **oposto**: a secção `ESCOPO-ALVO v6.0` (126) **prevalece** sobre a `NORTE` (240–242) | **bloquear (GATE 12)** |

---

## §3 CONFLITOS E AMBIGUIDADES (AU3 / HARD GATE 12 · HI8 · RESSALVA 2)

> O executor **não resolve** estes conflitos. Ficam como **perguntas ao operador**. As respostas
> tornam-se R18-(letra) e registam-se em 3 lugares (P4).

### §3.1 ⛔ CONFLITO-A — DUAS «FONTES DE VERDADE» CONTRADITÓRIAS (bloqueador)
O `CLAUDE.md` tem **duas** secções de Norte com **precedência declarada e conteúdos opostos**:

- **`ESCOPO-ALVO v6.0` (linha 126)** — declara-se **«FONTE DE VERDADE: os 2 PDFs»** e diz na **linha 133-136**:
  *«Onde divergir da secção «NORTE DO PRODUTO» … **prevalece esta**»*. Define a **Oferta Programada** como
  **«concurso de previsões»** com **autorização SPA/MF REQUERIDA** (`Lei 5.768/1971 + Dec. 70.951/1972`,
  linha 147), vendedor **MEI** (linha 175), prémio = **bem físico** adquirido pelo valor do palpite.
- **`NORTE DO PRODUTO` (linha 238)** — auto-declarada **SUPERADA** pela `ESCOPO-ALVO` (linhas 240-242).

O enunciado manda **substituir o conteúdo da secção `NORTE`** pela consolidação **Via B** (programa de
fidelidade, **sem concurso, SEM SPA/MF**) e diz **«o Norte do `CLAUDE.md` é a fonte de verdade; as outras
secções não se tocam»** (RESSALVA 3). **É impossível cumprir as duas coisas:** se a `NORTE` passa a
dizer «programa de fidelidade, sem SPA/MF» enquanto a `ESCOPO-ALVO` (que **prevalece**) continua a dizer
«concurso de previsões, SPA/MF obrigatória», o ficheiro fica **auto-contraditório** e a «fonte de
verdade» fica quebrada — exactamente o que o UTAC devia fixar.

**Agravante:** o `docs/FICHA-PLAY-PT.md` (linhas 33-61) e o `_logs/MC100_MATRIZ-CONFORMIDADE.md`
(41 linhas, coluna 24) **também** estão construídos sobre o modelo antigo («torneio de habilidade»,
«senhas», «operado pelo Grupo União e Trabalho», «Programada exige SPA/MF» → **R-19**).

### §3.2 ⛔ CONFLITO-B — A «CONSOLIDAÇÃO DE 2026-10-04» NÃO EXISTE EM LADO NENHUM (GATE 2)
O enunciado afirma: *«A consolidação já foi feita em 2026-10-04. Este UTAC apenas a regista — não decide
nem reinterpreta.»* **Medido: não há qualquer artefacto dessa consolidação.**

- `find ~/Desktop ~/Downloads -newermt '2026-10-04 00:00'` → **0 ficheiros**.
- `grep -riE 'via b|fidelidade|colecion|quildo'` no repo → só falsos positivos (design-system, skills).
- No `CLAUDE.md`: **0 ocorrências** de `5.910`, `5.102`, `9.532`, `9.249`, `Quildo`, `colecion`.
- A única fonte do conteúdo Via B (pontos 1-10, fiscal 5.910/5.102, cartão colecionável da Família
  Quildo, 5 pendências) é **o próprio texto do enunciado**.

⇒ Escrever a `NORTE` a partir do enunciado **cria** a consolidação; **não** a regista. Isto é material
para o GATE 2 («toda a afirmação tem de vir de uma medição ou fonte primária»): a fonte seria o enunciado
— mas o enunciado diz que **já existia** uma fonte, e ela **não existe**. Ambiguidade a esclarecer.

### §3.3 ⛔ CONFLITO-C — REVERSÃO DE TESES JURÍDICAS JÁ REGISTADAS (com R18/validador)
A consolidação Via B **inverte** conclusões que estão no repositório com validador adversarial:

| Tese no repo | Consolidação Via B |
|---|---|
| Programada = **concurso de previsões** → **SPA/MF requerida** (`CLAUDE.md:147`; `contexto.md:15`; `MC100_MATRIZ` #1/#7) | Programada = **programa de fidelidade** → **SPA/MF NÃO se aplica** |
| **R-19** (achado do validador do MC100): a categoria Gamified Loyalty exige «not subject to additional gambling or gaming licensing requirements» e o produto **exige** SPA/MF ⇒ **parecer jurídico obrigatório** (`MC100_MATRIZ` #24) | a Via B **resolve o R-19 pela raiz** (remove o concurso) — mas sem documento que o declare |
| Vendedor = **MEI** (`CLAUDE.md:175`) vs **associação** (`CLAUDE.md:253`); **DEC-09 em aberto** (titular Ruan vs Marinho) | Vendedor = **Associação Recreativa dos Nordestinos no Amazonas** (CNPJ 23.040.066/0001-00) |

Escrever isto «apenas como registo» **fecha** R-19 e DEC-09 **por acto administrativo do executor** — o
que o próprio enunciado proíbe («não decide produto»). Precisa de confirmação explícita do operador
(e, para o enquadramento jurídico, do jurista — o próprio repo o exige).

### §3.4 Dívida existente lida (`_logs/DEBT.md`, ~50 k)
Nenhuma dívida cobre o Conflito-A. As mais próximas: **DEBT-005** (`regras-legado.md` desactualizado — a
corrigir só com autorização) e a nota de que **DEBT.md é *untracked*** (`??`) num repo com trabalho não
commitado. **Não foi registada dívida nova** (RESSALVA 6: PARAR e reportar antes de registar).

---

## §4 OPÇÕES PARA O OPERADOR (medidas, para decisão)

| Opção | O que se faz | Escopo | Risco |
|---|---|---|---|
| **A — Norte prevalece, sem tocar na ESCOPO-ALVO** | Substituir o corpo da `NORTE` (238-468) pela Via B **e** acrescentar-lhe, no cabeçalho, a nota de que **ela** é a fonte de verdade do produto desde 2026-10-04 (a `ESCOPO-ALVO` fica como histórico, o **texto** dela intacto) | só a secção `NORTE` (autorizado) + R14 | deixa a frase «prevalece esta» da `ESCOPO-ALVO` (133) **contradita** no texto; mitigável por nota, não removível sem tocar na ESCOPO-ALVO (proibido) |
| **B — Norte novo + dívida declarada** | Substituir o corpo da `NORTE` pela Via B, **sem** mexer na precedência; registar a contradição `NORTE × ESCOPO-ALVO` como **DEBT nova** (exige autorização — RESSALVA 6) e abrir UTAC próprio para a precedência | só `NORTE` (+ `DEBT.md`, com autorização) | o ficheiro fica contraditório **até** ao UTAC da precedência; a Play Console veria 2 definições |
| **C — Re-alinhamento total (novo escopo)** | Via B na `NORTE` **+** actualizar a `ESCOPO-ALVO`, o `docs/FICHA-PLAY-PT.md` e a `MC100_MATRIZ` ao modelo de fidelidade | vários ficheiros (fora do autorizado) | precisa de autorização nova e validador por ficheiro; é o único que deixa **uma** fonte de verdade |
| **D — O alvo é outra secção** | Se o operador queria a definição Via B na secção que **prevalece** (`ESCOPO-ALVO v6.0`, 126), e não na `NORTE`, o SEG0 aponta para lá | `ESCOPO-ALVO` | contradiz o texto literal do enunciado («secção Norte»), mas respeita «o Norte é a fonte de verdade» |

> **Recomendação do executor:** **C** é a única que cumpre o *objectivo* (uma fonte de verdade para a
> Play Console); **A** é o máximo que se faz **dentro** do escopo autorizado. **D** é a hipótese de
> leitura alternativa que o nome «Norte» (vs «ESCOPO-ALVO») torna plausível. **PARAR** até o operador
> escolher.

---

## §5 VEREDICTO SEG-1

**PARAR (AJUSTAR de escopo).** Baseline registado; suíte verde (694/694 + 992/998); disco OK.
Três conflitos materiais impedem o SEG0 sem decisão do operador: **A** (duas fontes de verdade),
**B** (a consolidação declarada não existe como fonte), **C** (reversão de teses jurídicas com R18).
Segundo o protocolo (`segments/seg-1.md`): *«Se AJUSTAR/PARAR: parar e reportar ao operador antes do
SEG0.»* — cumprido.

### Pendências (não executadas — declaradas, não escondidas · GATE 11)
1. **SEG0** (substituir a secção `NORTE`) — **NÃO executado** (bloqueado por §3.1).
2. **SEG1** (`docs/gabarito-play-console.md`) — **NÃO criado** (GATE 6: depende do SEG0).
3. **SEG2** (validador adversarial) — não despachado.
4. **SEG3** (registo em 3 lugares + commit + push) — não executado.
5. Registo R18 em `CLAUDE.md` / `Desktop/` — não executado.

### Ficheiros criados por este segmento
- `_logs/UTAC106x-consolidacao.md` (este ficheiro). **Nenhum outro.** `CLAUDE.md` **intacto**
  (verificável: `git diff --stat CLAUDE.md` → vazio).

---

## §6 DECISÃO DO OPERADOR (R18-C, 2026-10-04) — REGISTO

**Pergunta do SEG-1:** perante os 3 conflitos (§3), como proceder? **Opções apresentadas:** A (só a `NORTE`
+ nota de precedência), B (só a `NORTE` + DEBT nova), C (re-alinhamento total), D (alvo = `ESCOPO-ALVO`).

> **RESPOSTA DO OPERADOR (verbatim):**
> «C — Re-alinhamento total (novo escopo): Via B na NORTE + actualizar ESCOPO-ALVO, docs/FICHA-PLAY-PT.md
> e MC100_MATRIZ ao modelo de fidelidade (única opção com UMA fonte de verdade)»

**Interpretação (declarada, para validação adversarial):**
1. A secção `NORTE DO PRODUTO` passa a **fonte única de verdade** e recebe a consolidação Via B (§1-10).
2. A secção `ESCOPO-ALVO v6.0` deixa de declarar precedência sobre a `NORTE` (**resolve o Conflito-A**) e
   é alinhada (texto antigo mantido **à vista**, marcado `SUPERADO` — GATE 15 / P2).
3. `docs/FICHA-PLAY-PT.md` e `_logs/MC100_MATRIZ-CONFORMIDADE.md` são alinhados (acrescentando errata; o
   texto antigo **não se apaga**) — **resolve o Conflito-C** ao nível documental.
4. O Conflito-B (§3.2: não existe artefacto-fonte da consolidação) fica **declarado** na `NORTE` como
   lacuna (a fonte é o enunciado); continua a exigir o parecer jurídico que o repo já pedia (R-19/R-02).
5. Escopo efectivo = 4 ficheiros + o novo `docs/gabarito-play-console.md` + este log + o bloco R14 no
   `CLAUDE.md`. **Zero código de produção.**

*Log do SEG-1 do UTAC106x · 2026-10-04 · PARAR → AJUSTAR (R18-C) · a executar Opção C.*
