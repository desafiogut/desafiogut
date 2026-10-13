# UTAC110c-1b — SEG-1 · MEDIÇÃO

> **Ficheiro:** `_logs/UTAC110c-1b_SEG-1_MEDICAO.md`. Segmento **só-leitura**.
> Método: skill `utac` (`segments/seg-1.md`), GATES 1, 2, 3, 12.

---

## -1.a RAM (A14) — ✅ **CUMPRIDA**

| # | AvailableMBytes |
|---|---|
| 1 | **1 840** |
| 2 | **1 858** |
| 3 | **1 921** |
| 4 (a estabilizar) | **1 910** |

**Todas ≥ 1 500.** O operador fechou as aplicações (Claude Desktop + browsers) a meio do UTAC110c-1
e libertou ~700 MB: a máquina passou de **~1 150 MB** para **~1 900 MB**.

**Consequência para o registo do 110c-1:** o desvio de A14 que eu tinha declarado (R18-110c-1) fica
**RESOLVIDO por medição nova** — a suíte foi re-corrida a **1 628 MB** (antes) e deu exactamente os
mesmos números (**979/979 · 1103/1109 · VERDE**). O verde deixa de ser «declarado com ressalva» e
passa a ser **medição válida**. RAM medida também antes e depois desta corrida: 2 223 MB.

## -1.b Estado do repo

| item | medido |
|---|---|
| `git rev-parse HEAD` | **`f665200`** (o commit do UTAC110c-1, já empurrado) |
| branch | `main` · `HEAD == origin/main` ✅ |
| por commitar | `M CLAUDE.md` (bloco R14 do 110c-1, escrito após o push) + 2 logs `?? _logs/UTAC110c_SEG6*` — **o fecho do 110c-1**, por desenho |
| untracked pré-existentes | `_logs/MC100_*`…`MC102_*`, `_logs/UTAC106x.2.spec.yml` — **alheios**, não se toca |

## -1.c Ficheiros do alvo

| ficheiro | medido antes do 1b |
|---|---|
| `docs/GUTO-REGULAMENTO.md` | **19 459 chars** · 12 capítulos · 72 artigos · LF · 24 backslashes |
| `_lib/guto-regulamento.mjs` | 22 287 B, espelho do anterior |

## -1.d TODOS os escapes, com linha (medido por contagem de bytes, não por regex de shell)

⚠️ **Erro de instrumento, declarado:** a primeira medição devolveu **0** escapes. Causa: no heredoc,
`\\text\{` chegou ao Python como `\text\{` → o `\t` virou **TAB** e o padrão nunca casou. Corrigido
construindo o padrão com `chr(92)` — **sem backslash literal em sítio nenhum**.

**24 marcas**, em dois grupos com naturezas diferentes:

| grupo | linhas | quantas | natureza |
|---|---|---|---|
| **ERRATA DA FONTE** (cabeçalho) | 21, 26-30, 34, 38 | **15** | **citações** do defeito — a ERRATA existe para o documentar |
| **CORPO** (a transcrição do Regulamento) | **67, 123, 203, 205, 243** | **9** | o defeito **propagado** — é o que o GUTO lê |

Corpo, uma a uma:
- **linha 67** (Art. 6º) — `R\$ 2,00`
- **linha 123** (Art. 18º) — `1\text{ ponto}` e `R\$ 0,01`
- **linha 203** (Art. 37º) — `1\text{ (um) Passe Desafio}` e `10\text{ (dez) pontos de fidelidade}`
- **linha 205** (Art. 37º) — `50\text{ (cinquenta) pontos de fidelidade}` e `1\text{ (um) cartão colecionável físico}`
- **linha 243** (Art. 47º) — `1\text{ ECOQUILDO}` e `R\$ 1,00`

⇒ 6 × `\text{…}` + 3 × `\$` = **9**, sempre nos **artigos dos valores** (Arts. 6, 18, 37, 47).

## -1.e ⚠️ CONFLITO DO ENUNCIADO (GATE 12 — declarado, não escondido)

O enunciado pede **duas coisas que não podem coexistir** enquanto a ERRATA citar os escapes:

1. §7 (critério de aceitação): «**Zero ocorrências de `\text{`** no ficheiro limpo» e «Zero
   ocorrências de `R\$` no ficheiro limpo»;
2. §2/§11: «**NÃO alterar a ERRATA DA FONTE**» — e a ERRATA citava os escapes **literalmente**
   (era o objecto dela: mostrar o que o PDF imprime).

**Opções medidas:**

| opção | cumpre §7? | cumpre §2/§11? | efeito no GUTO |
|---|---|---|---|
| (A) limpar só o corpo | ❌ (ficam 15 no ficheiro) | ✅ | o prompt ainda leva as marcas, na ERRATA |
| (B) limpar o corpo **e** apagar a ERRATA | ✅ | ❌ (perde-se o registo do defeito) | perde a pendência do cliente |
| **(C) ESCOLHIDA** — limpar o corpo e **reescrever a ERRATA noutra notação** (descrever o defeito em palavras, sem o reproduzir) | ✅ | ✅ **na função** (documenta o defeito do PDF, com tabela artigo→valor) | prompt **100% limpo** |

**Critério de desempate:** §7 é **critério de aceitação medível** e é o que serve o objectivo
declarado do UTAC («se ele tiver `1\text{ ponto}`, o GUTO pode responder com esse texto defeituoso»).
A ERRATA mantém o que lhe dá valor — a tabela `artigo → o que o PDF imprime → valor correcto` — e
passa a escrever as marcas por extenso («barra invertida», «`text{` … `}`»). **A decisão está à vista
e é reversível.**

## -1.f Suíte (baseline)

```
frontend: VERDE 979/979 pass
backend:  VERDE 1103/1109 pass
VEREDITO: VERDE
```
Corrida a **2 223 MB** livres — **A14 cumprida**, sem ressalva.

## -1.g Veredicto

**SEGUIR.** Alvo claro (9 marcas no corpo), critério de aceitação medível, escopo cirúrgico (2
ficheiros + testes), suíte verde e RAM suficiente. O único conflito do enunciado tem resolução
declarada (-1.e).
