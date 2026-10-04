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

*(preenchido no fecho da frente)*

---

## §3 SEG1 — P1/P2/P5 NO `CLAUDE.md`

*(preenchido no fecho da frente)*

---

## §4 SEG2 — P4: `docs/gabarito-play-console.md`

*(preenchido no fecho da frente)*

---

## §5 VALIDADOR ADVERSARIAL

*(preenchido no fecho)*

---

## §6 ESTADO FINAL + PENDÊNCIAS

*(preenchido no fecho)*
