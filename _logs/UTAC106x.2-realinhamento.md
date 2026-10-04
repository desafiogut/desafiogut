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
| **D1** | «4 bytes de controlo (**linhas 2125-2126**)» | estão nas linhas **2047–2048** — deslocaram-se porque o UTAC106x.1 **encurtou a NORTE** (que fica acima) | **declarado**; o requisito («não introduzir nem remover bytes de controlo») é cumprido — verifico a contagem (4) no fim |
| **D2** | `MC100_MATRIZ`, «linha ~24» | o texto «Gamified Loyalty» está na **linha 32** (*row #24* da tabela) | **declarado** (já apontado no x.1, ℹ️3); anoto a linha certa |
| **D3** | FICHA: «alinhar com o **gabarito Play Console**» | `docs/gabarito-play-console.md` **NÃO EXISTE** (foi pedido no enunciado do UTAC106x e nunca criado — ℹ️7 do x.1) | **declarado**; alinho a ficha com a **definição Via B** e com os requisitos da Play já mapeados na `MC100_MATRIZ` (rows #23–#28, #40, #41) |
| — | «ESCOPO-ALVO (linha ~126-137)» | a secção vai da **126 à 237** (112 linhas); 126–137 é só o cabeçalho + a nota de precedência | **declarado**: trato a **secção inteira**, porque a ENTREGA exige «nenhuma contradição remanescente» (as contradições vivem na 147, 175, 194, 196-197) |

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

### 3.2 `_logs/MC100_MATRIZ-CONFORMIDADE.md` (+5 linhas)

- **Linha de errata** no cabeçalho (data + referências: NORTE + R14) listando as rows afectadas
  (**#1, #2, #10, #24, #32**) e dizendo explicitamente que ficam **anotadas, não apagadas**.
- **Row #24** (linha 37): + **«⛔ R-19 REVERTIDA pelo UTAC106x.1 (2026-10-04)»** com a razão (com a Via B
  o requisito *«not subject to additional gambling or gaming licensing requirements»* passa a ser
  **satisfeito**). **Texto original preservado** (verificado).
- **Untracked** → entra no git neste UTAC (resolvendo o achado ℹ️4 do x.1).

---

## §4 VALIDADOR ADVERSARIAL (SEG2)

*(preenchido no fecho)*

---

## §5 PENDÊNCIAS

*(preenchido no fecho)*
