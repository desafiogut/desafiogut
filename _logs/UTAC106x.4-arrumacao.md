# UTAC106x.4 — ARRUMAÇÃO (fecho das pendências P1–P5 do x.2)

**Tipo:** saneamento documental (arranjo, zero código) · **Skill UTAC** · **Data:** 2026-10-04 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **Baseline:** `920ae4f` · **Estado:** em curso

> ⚠️ **ORIGEM DA AUTORIZAÇÃO (declarado):** este UTAC **não** nasceu de um enunciado escrito do
> operador. Nasceu de uma **escolha explícita do operador** (opção *«Fechar as pendências P1–P5 do x.2
> … num UTAC de arrumação próprio»*) depois de eu lhe apresentar a lista. O **âmbito é exactamente
> essa lista** — P1, P2, P3, P4, P5 — e **nada mais**. Registo-o aqui porque a série exige que a
> autorização seja rastreável.

> ⚠️ **DUAS SUPERFÍCIES QUE ENUNCIADOS ANTERIORES PROIBIAM** e que esta escolha volta a abrir:
> - **a NORTE DO PRODUTO** (proibida no x.1 e no x.2) — tocada **só** pela nota de rodapé da §6.3 (P2),
>   que é uma **referência cruzada desactualizada**, não a definição;
> - **`_logs/DEBT.md`** (proibido no x.1, x.2 e x.3) — tocado **só** na contagem dentro do texto do
>   DEBT-005 (P3), sem alterar estado, dono nem classificação da dívida.

---

## §1 BASELINE (SEG-1)

| Item | Medido |
|---|---|
| `HEAD` / `origin/main` | `920ae4f` (0/0) |
| Suíte | **694/694 · 992/998** (a reconfirmar no fecho) |
| Guarda da ficha | 3/3 |

### Alvos, com as linhas exactas

| Pend. | Alvo | Medido |
|---|---|---|
| **P1** | Bloco **R14 do x.2** no fim do `CLAUDE.md` | **não existe** (o último bloco é o do x.3, linha 4444) |
| **P2** | Nota do x.1 **dentro da NORTE** | `CLAUDE.md:258` — «*A secção `ESCOPO-ALVO v6.0` ainda contém a nota contrária … A sua correcção é o UTAC106x.2*» ⇒ **desactualizada** |
| **P3** | «75 regras / A1-A12» | `skills/utac/protocol/regras/README.md` **linhas 1, 12 e 18** · `CLAUDE.md:67` · `_logs/DEBT.md:33` (texto do DEBT-005) |
| **P4** | `docs/gabarito-play-console.md` | **não existe**; é **referido** pela NORTE em `CLAUDE.md:345` («ver §11 e o gabarito») e `:351` («requisitos mapeados no gabarito da Play Console») |
| **P5** | Banner do topo + refs MEI/DEC-09 dispersas | Banner em `CLAUDE.md:2` (ainda com «fonte de verdade», «concurso de previsões», «MEI como vendedor», «SPA/MF»); refs a MEI/DEC-09 fora da secção em **`:3733`, `:3771`, `:3988`** — todas **dentro de registos de UTACs fechados** |

### Desvio do meu próprio relatório (GATE 1 — declaro o meu erro)

| # | O relatório consolidado dizia | Medido |
|---|---|---|
| **D4** | P3 incluía **`README.md` (raiz do repo)** | o `README.md` da raiz **não tem nenhuma** ocorrência de `A1-A12`/`75 regras` (0 matches). Veio do validador do x.3 e eu **repeti-o sem medir**. **Declarado e corrigido** — o alvo não existe |

### Decisão de âmbito no P5 (GATE 15)

As 3 refs dispersas (`:3733` DEC-09 titular, `:3771` «teto do MEI», `:3988` «migração para o titular do
MEI») estão **dentro de registos de UTACs fechados** — e a série manda **não reescrever registos
fechados** (GATE 15). ⇒ **não se anotam linha a linha**: acrescenta-se **uma nota no banner do topo**
(que é o STATEMENT DE ESTADO, não um registo) a dizer que as referências a MEI/DEC-09/SPA-MF em secções
históricas estão superadas pela NORTE (Via B) + R14.

---

## §2 SEG0 — P3: CONTAGENS

| Alvo | Antes | Depois |
|---|---|---|
| `skills/utac/protocol/regras/README.md` **título** | «10 categorias, **75** regras» | «10 categorias, **76** regras» |
| idem, **tabela** (linha do A) | `A1-A12` | **`A1-A13`** |
| idem, **total** | «**Total: 75 regras.**» | «**Total: 76 regras.**» |
| `_logs/DEBT.md` (**texto do DEBT-005**) | «hoje: **75 regras em 10 categorias**, A1-A12» | «hoje: **76 regras em 10 categorias**, A1-A13» |
| `CLAUDE.md:67` | «Contagem **74 → 75** regras (A1-A12);» | **ANOTADO**: «…(A1-A12; **hoje 76 / A1-A13** desde o UTAC106x.3 — nota do UTAC106x.4);» |

⚠️ **GATE 15 aplicado:** o `CLAUDE.md:67` **não** foi reescrito — é o **registo** do que o UTAC000.7 fez
(«74 → 75»). Reescrevê-lo apagaria a história; **anotou-se** ao lado.
⚠️ **DEBT-005 continua ABERTA** — ela própria pede autorização para tocar em `regras-legado.md`, que
**não** faz parte desta lista. Só se corrigiu a **contagem dentro do texto**, não o estado nem o dono.

**Alvo inexistente (D4):** o `README.md` da **raiz** **não** tinha nenhuma ocorrência — não foi tocado.

---

## §3 SEG1 — P1 / P2 / P5 NO `CLAUDE.md`

Ficheiro: **+12 linhas** (4445 → 4457). Bytes de controlo **intactos (4)**.

| Pend. | O que mudou |
|---|---|
| **P1** | **Bloco R14 do x.2** acrescentado, **antes** do bloco do x.3 ⇒ a ordem fica **x.1 → x.2 → x.3**. Um só bloco (sem duplicados). |
| **P2** | A nota do x.1 dentro da NORTE (dizia «*A sua correcção é o **UTAC106x.2***») passou a: «*✅ A nota contrária … **foi corrigida**: a secção passou a HISTÓRICA e a precedência é desta NORTE. Feito no UTAC106x.2 …; nota actualizada pelo UTAC106x.4, que só corrigiu esta referência, **sem tocar na definição**.*» A **definição da NORTE não foi alterada**. |
| **P5** | **Nota de ESTADO** logo após o banner do topo: a definição vigente é a NORTE (Via B), e as referências **históricas** a «concurso de previsões»/SPA-MF/**MEI**/**DEC-09** estão **SUPERADAS** (texto à vista, P2 · GATE 15). |

**Porque NÃO se anotou linha a linha (declarado):** as 3 refs dispersas (`:3733` DEC-09, `:3771` «teto do
MEI», `:3988` «migração para o titular do MEI») estão **dentro de registos de UTACs fechados** — a série
manda não os reescrever (GATE 15). A nota do banner cobre-as **sem apagar história**.

---

## §4 SEG2 — P4: `docs/gabarito-play-console.md`

O documento **não existia** e era referido pela NORTE (`§7.1` e `§11`). Criado como **documento DERIVADO**
— e isso está dito na primeira linha do ficheiro.

**Fonte única:** `_logs/MC100_MATRIZ-CONFORMIDADE.md` (rows citadas por número), `docs/FICHA-PLAY-PT.md` e a
NORTE. **Não introduz requisito novo, nem parecer, nem afirmação legal própria**; onde a MATRIZ diz **❓**
(não verificado), o gabarito **mantém ❓** (5+ ocorrências, contadas).

**Secções:** definição Via B · classificação (loyalty / 18+ / IARC a refazer) · ficha da loja (medidor
mc97) · declarações obrigatórias (Data Safety, analytics, financial features, IARC, exclusão de conta,
política de privacidade) · pagamentos (**R-01 / DEC-01**; row #40 ❓) · Real-Money Gambling → **Gamified
Loyalty** (com a **R-19 REVERTIDA** anotada) · App Store (3.1.1, **3.1.3(e)** — errata do PDF, 5.3.x) ·
**checklist de submissão** · pendências herdadas (DEC-01, R-01, R-02, R-17, DEC-04, DEC-08).

---

## §5 VALIDADOR ADVERSARIAL

Subagente independente em worktree próprio (criado com `scripts/worktree-helper.mjs`, A13).

### 5.1 Ronda 1 — commit `59400b6` → **APROVADO** (só ℹ️)

**Nenhum dos 5 alvos de refutação pegou.** Medido pelo validador:

- **(a) Fora do âmbito:** `git diff --name-status 920ae4f 59400b6` = **exactamente 5 ficheiros**, todos
  `.md`, **zero código de produção**. A **NORTE** só tem a nota P2 alterada — a **definição fica
  byte-idêntica**.
- **(b) Histórico preservado:** `--diff-filter=D` e `--diff-filter=R` = **vazios**. Contagens de
  «prevalece esta» 2→2 · «concurso de previsões» 6→**9** · «MEI do DesafioGUT» 1→1 · «R$ 334,00» 1→1 ·
  «senhas (tokens)» na ficha 1→1 (ficheiro byte-idêntico).
- **(c) Refs cruzadas:** blocos R14 — **1 cada**, na ordem **x.1 → x.2 → x.3**, sem duplicados. O gabarito
  **resolve** as referências da NORTE §7.1 e §11.
- **(d) Gabarito:** cita as rows #23–#31, #40, #41 (todas conferidas na MATRIZ); **mantém os ❓**; declara
  «não é parecer jurídico». **Nada inventado.**
- **(e) Contagens:** coerentes (76 / A1-A13) onde são **correntes**; os «75 / A1-A12» que restam estão só em
  **logs históricos**. **D4 confirmado honesto** (o `README.md` da raiz tem **0** ocorrências).
- Suíte no **repo real** (mesmo HEAD): **694/694 · 992/998**; no worktree `984/991` (efeito-junction =
  DEBT-006). Ficha **3/3**. Control bytes `[0x00,0x1F,0x00,0x1F,0x0D]` **intactos**.

| # | Achado | Tratamento |
|---|---|---|
| ℹ️ 1 | O log `_logs/UTAC106x.4-arrumacao.md` não consta da lista literal P1–P5 | **Declarado** — é o meta-artefacto do próprio UTAC (R18) |
| ℹ️ 2 | 2 linhas substituídas (a de contagens sobrevive como prefixo; a nota antiga da NORTE) | **Declarado** — o objectivo do P2 era exactamente reformular essa frase |
| ℹ️ 3 | O bloco do **x.3** termina «Próximo: **UTAC106x.2**» e agora fica **depois** do bloco do x.2 ⇒ o ponteiro lê-se ao contrário | **Declarado** — texto de **registo fechado** (GATE 15), não reescrito |
| ℹ️ 4 | Gabarito: «NORTE §7.1» é uma linha de tabela da §7; o item 9 vem da NORTE e o DEC-04 de `MC100_DECISOES-PENDENTES.md` (fora das fontes declaradas) | **CORRIGIDO** — «§7 (linha da tabela §7.1)» e a fonte `MC100_DECISOES-PENDENTES.md` passou a estar **declarada** |

> **Veredicto (verbatim):** *«VEREDICTO: **APROVADO** (só achados ℹ️; nenhum ⚠️ bloqueante)»*

---

## §6 ESTADO FINAL + PENDÊNCIAS

| Item | Estado |
|---|---|
| P1 · P2 · P3 · P4 · P5 | ✅ **fechadas** |
| Suíte | **694/694 · 992/998** (repo real) |
| Guarda da ficha | **3/3** |
| `CLAUDE.md` | 4456 linhas · bytes de controlo **intactos (4)** |
| Validador | **APROVADO** |
| Commits | `59400b6` (+ o commit de fecho) — push em foreground |

### Pendências que **permanecem** (declaradas, fora do âmbito P1–P5)

1. **DEBT-005 continua aberta:** `skills/utac/protocol/regras-legado.md` (linha 45) ainda declara
   «61 regras em 9 categorias» e `A8`; o próprio registo pede **autorização** para lhe tocar.
2. **A nota do x.1 na NORTE e o bloco do x.3** mantêm ponteiros históricos (GATE 15 — registos fechados).
3. **`docs/gabarito-play-console.md`** criado, mas as pendências que ele **mapeia** continuam abertas
   (DEC-01, R-01, R-02, R-17, DEC-04, DEC-08) — **mapear não é resolver**.
4. **HI5:** este UTAC de arrumação também **excedeu 1 h** (validador + correcções). Declarado.
