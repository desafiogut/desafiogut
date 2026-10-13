# UTAC110c-1b — SEG0/SEG1 · LIMPEZA DOS ESCAPES

> **Ficheiro:** `_logs/UTAC110c-1b-limpeza.md`. Script: `%TEMP%/utac110c1b-limpar.py` (fora do repo).
> Saídas cruas: `_logs/UTAC110c_SEG0_geracao.txt` (110c-1) · `_logs/UTAC110c-1b_SEG1_MUTACAO.txt` ·
> `_logs/UTAC110c-1b_SEG1_suite.txt`. Frentes: **A única** (limpeza). GATES 3, 4, 5, 7, 8, 12, 16.

---

## 1. O que foi limpo (FRENTE A)

| ficheiro | antes | depois |
|---|---|---|
| `docs/GUTO-REGULAMENTO.md` | 19 459 chars, 9 marcas no corpo (+15 na ERRATA) | **19 400 chars** · **0 marcas em todo o ficheiro** |
| `_lib/guto-regulamento.mjs` | espelho do anterior | regenerado · **22 287 B** · idêntico ao ficheiro do repo |

**Transformação aplicada — e SÓ esta**, no CORPO:
- `\text{X}` → `X` · `\$` → `$`
- o glifo `●` já tinha sido convertido a `- ` no UTAC110c-1; **0 bullets** restantes como marcador
  (o único `●` do ficheiro é a **citação** do glifo na ERRATA).

### 1.a A prova de que não se tocou no conteúdo jurídico
A limpeza tem de ser **exactamente** a transformação declarada, nada mais. Prova por igualdade
algébrica, dentro do próprio script:

```python
limpo == transformacao(corpo_original)      # asserção que ABORTA a geração
```

Ou seja: se eu tivesse acrescentado, retirado ou trocado **uma única letra** que não fosse as 9
marcas, a asserção caía e o ficheiro **não era escrito**. Complementado por:
- `backslashes == 0` no corpo;
- **12 capítulos** e **72 artigos** (`Art. 1º`..`Art. 72º`), **sem lacunas**;
- delta de tamanho: **−59 chars** (limite do enunciado: ±500; ideal ~200) — quase todo o delta é a
  diferença entre a ERRATA antiga e a nova;
- **0 CRLF**.

## 2. A ERRATA DA FONTE — o conflito e a resolução

Ver §-1.e do log de medição, com as 3 opções medidas. Resumo: o enunciado pede «zero ocorrências de
`\text{`/`R\$` **em todo o ficheiro**» **e** «não alterar a ERRATA» — impossível enquanto a ERRATA
citava os escapes. **Opção (C):** a ERRATA mantém a **função** (documentar o defeito do PDF oficial,
com a tabela `artigo → o que o PDF imprime → valor correcto`) e passa a **descrever as marcas em
palavras** em vez de as reproduzir. Consequência: o prompt do GUTO fica **100% limpo**, e a pendência
do cliente continua registada.

**Uma frase da ERRATA tinha de mudar por deixar de ser verdadeira:** «A transcrição abaixo **NÃO
corrige** o escape — mantém-no tal como está impresso». A partir do 1b é falso, e um registo que
mente é pior do que um registo que muda. O teste `mc963` guarda-o: `assert.doesNotMatch(errata,
/NÃO corrige o escape/)`.

## 3. Testes — o que mudou e porque (invariantes preservadas)

| teste | antes do 1b | depois do 1b |
|---|---|---|
| `mc963 (c2)` | **exigia** que os escapes se mantivessem no módulo | exige **ZERO** marcas no texto que vai ao prompt, **e** os valores legíveis (`R$ 2,00`, `1 ponto = R$ 0,01`, `1 ECOQUILDO = R$ 1,00`) |
| `mc963 (e)` | contava **9** escapes no corpo e exigia-os lá | **ZERO** marcas no **ficheiro inteiro** + a ERRATA a documentar o defeito |
| `mc963` (cabeçalho) | dizia «a ERRATA continua verdadeira (o defeito ainda lá está)» | actualizado para a realidade do 1b |

⚠️ **Os dois testes foram INVERTIDOS, não apagados.** A invariante de fundo mantém-se — «o prompt
não pode afirmar um regulamento que não existe» — mas o defeito a combater passou a ser o inverso:
antes era *perder* o escape (perdia-se fidelidade), agora é *reintroduzi-lo* (o GUTO repetiria o
valor defeituoso). Está escrito no próprio teste, para quem vier depois não achar que foi descuido.

## 4. Provas

### 4.a Testes, isolados
```
mc963-guto-regulamento-v4.test.mjs   pass=10 fail=0
utac110c-guto-via-b.test.mjs         pass= 7 fail=0
mc962-fallback-vocabulario.test.mjs  pass=10 fail=0
```

### 4.b Suíte canónica — **A14 CUMPRIDA** (2 223 MB livres)
```
frontend: VERDE 979/979 pass
backend:  VERDE 1103/1109 pass
VEREDITO: VERDE
```

### 4.c Martelo de mutação — **9/9 mordem** (era 8/8; o 1b acrescentou o M9)
`_logs/UTAC110c-1b_SEG1_MUTACAO.txt`. Todos com a linha mutada impressa (o mutante **entrou**) e
restauro **sha256 idêntico**.
**M9 (novo)** repõe `R\$ 2,00` no Art. 6º do ficheiro do repo → **RED** em `(c)` (o módulo divergiu
do documento) e `(e)` (voltaram as marcas). Sem ele, o guarda novo deste UTAC não teria prova (T1).
O Regulamento foi conferido **depois** do martelo: 0 marcas, 19 400 chars.

### 4.d Prova por leitura directa do artefacto (não por regex de shell)
```
DOC   : chars 19400 | backslashes 0 | text{ precedido de barra: 0 | barra+cifrao: 0
MODULO: chars 19400 | igual ao docs: true | versao 5.0 | 12 capitulos | Art. 72º presente
MODULO: valores legiveis? [true, true, true, true] | ERRATA presente? true
```

## 5. Erros dos PRÓPRIOS instrumentos (declarados)

1. **Contagem de escapes a 0.** No heredoc, `\\text\{` chegou ao Python como `\text\{` → `\t` =
   **TAB**; o padrão nunca casou e devolveu «0 escapes» — um falso «está tudo limpo» **antes** de eu
   ter limpado nada. Corrigido com `chr(92)`.
2. **Corte do cabeçalho do módulo pela PRIMEIRA ocorrência.** A marca
   `export const REGULAMENTO_TEXTO = \`` aparece **dentro do comentário da receita «COMO
   REGENERAR»**; cortar por ela truncou o ficheiro e deixou o texto **fora** do template literal
   (`SyntaxError: Unexpected token '>'`). Apanhado por `node --test` (o módulo deixou de carregar),
   **não em produção**. Corrigido para `rindex` e **a receita foi corrigida no próprio módulo**,
   para ninguém repetir o erro.
3. **A mesma falha na VERIFICAÇÃO** (`mod_txt.index(...)` em vez de `rindex`) deu «cópia derivada
   divergiu» — falso: as cópias eram idênticas. Foi a minha própria asserção que o apanhou.
4. **Delta +499 na 1.ª tentativa.** A ERRATA nova era longa e ficou **colada ao limite** de ±500 do
   enunciado; encurtada para **−59**, perto do «ideal ~200».

**Nota de método:** os quatro foram apanhados por asserções/testes escritos **antes** de publicar o
resultado. É a diferença entre «medi» e «acho que medi».

## 6. O que NÃO foi feito (escopo do 1b)

- O **PDF do cliente** não foi tocado — é pendência dele (RTD/Cartório), registada na ERRATA e no
  relatório do 110c-1.
- O **system prompt** (`guto-perfis.mjs`) não foi tocado. Consequência declarada: o auxiliar
  `semEscapesDaFonte` (criado no 110c-1 para conferir âncoras apesar do defeito) passa a ser um
  **no-op** — fica como resíduo inofensivo, porque `guto-perfis.mjs` **não está no AUTORIZA** do 1b.
- Nenhum outro ficheiro do 110c-1 foi tocado.

## 7. Pendências

1. PDF oficial do Regulamento (cliente).
2. `semEscapesDaFonte` órfão (§6) — arrumação, UTAC próprio.
3. As pendências do 110c-1 mantêm-se (secção 12 do `RELATORIO-UTAC110c-1-GUTO.txt`).
