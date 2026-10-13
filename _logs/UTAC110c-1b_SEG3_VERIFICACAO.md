# UTAC110c-1b — SEG3 · VERIFICAÇÃO AD-HOC

> **Ficheiro:** `_logs/UTAC110c-1b_SEG3_VERIFICACAO.md` · saída crua: `_logs/UTAC110c-1b_SEG3_saida.txt`.
> Script: `%TEMP%/hermes-verify-utac110c-1b.mjs` (fora do repo, corrido em foreground com stdin
> definido). Método: skill `utac` (`segments/seg5-6.md`), GATES 10, 11, 13, 14, 16.

---

## 1. Resultado

```
RESULTADO: 13 PASS / 0 FAIL
```

Medido, não lido:

| # | check | resultado medido |
|---|---|---|
| 1 | ZERO marcas em `docs/GUTO-REGULAMENTO.md` | 0 marcas · **19 400 chars** · **0 backslashes** |
| 2 | ZERO marcas no export `REGULAMENTO_TEXTO` | 0 marcas · 19 400 chars |
| 3 | as duas cópias idênticas (`REGULAMENTO_TEXTO === docs`) | true · versão 5.0 |
| 4 | 12 capítulos e 72 artigos, 1..72 sem lacunas | 12 caps · 72 arts |
| 5 | os valores dos Arts. 6º/18º/37º/47º legíveis | 4/4 |
| 6 | a ERRATA DA FONTE documenta o defeito | «barra invertida», Arts. 6º e 47º, «valor correcto» |
| 7 | a ERRATA já não mente («NÃO corrige o escape») | ausente |
| 8 | os 3 needles do ponto cego estão no teste | 3/3 |
| 9 | **CONTROLO NEGATIVO** — os needles mordem o texto antigo | 2/2 no perfil corporativo + 1/1 no próprio |
| 10 | o resíduo está SÓ no `corporativo` e é o declarado | `Painel Lojista, cotas comerciais` |
| 11 | «Cotas» sozinho NÃO é needle (existe no Regulamento 5.0) | confirmado |
| 12 | `HEAD == origin/main` | `1b4d893d` |
| 13 | só o escopo autorizado mudou (vs `f665200`) | `_tests/`, `docs/GUTO-REGULAMENTO.md`, `_lib/guto-regulamento.mjs`, `_logs/`, `CLAUDE.md` |

## 2. Erros dos instrumentos APANHADOS nesta verificação (declarados)

| # | o que aconteceu | diagnóstico |
|---|---|---|
| V1 | check 9 deu **FAIL** («2/3») | **erro meu**: exigia os 3 needles num texto que só contém 2 (o «Carteira do Lojista» não está no perfil corporativo). Falso negativo do meu próprio controlo. Corrigido para uma asserção exacta: os 2 do corporativo mordem AQUI, o 3.º morde o seu próprio texto |
| V2 | `ReferenceError` latente no check 9 | **erro meu**: usava `viol` antes da sua definição (TDZ). Corrigido movendo a definição |
| V3 | check 13 tinha um filtro permissivo de mais na 1.ª leitura | endurecido para exigir que **só** os caminhos autorizados apareçam no `git diff --name-only` |

## 3. Nota de método

Tal como no 110c-1, o script ad-hoc **não deu verde à primeira**: apanhou dois defeitos **meus**, um
deles um falso negativo do próprio controlo negativo. É exactamente para isso que o controlo existe —
um «13/13» obtido à primeira teria escondido os dois.

## 4. Veredicto

**13 PASS / 0 FAIL**, com o controlo negativo a morder e todos os caminhos do escopo verificados.
O Regulamento está limpo, íntegro (12/72), com os valores legíveis, as duas cópias sincronizadas e a
ERRATA a documentar o defeito do PDF sem o propagar para o prompt.
Validador adversarial do 1b: ver `_logs/UTAC110c-1b_SEG2_VALIDADOR.md`.
