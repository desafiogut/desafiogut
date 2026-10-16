# UTAC110i.1b — SEG6 (VERIFICAÇÃO AD-HOC E FECHO)

**Auto-contido.** Script ad-hoc de nome único, corrido **uma vez** (não fica no repo). Saída real em
`_logs/UTAC110i.1b_SEG6_saida.txt`.

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16
Script: `C:/Users/Moltbot/tmp-utac110i1b-31066/ad-hoc-utac110i1b-20261016.mjs` (removido no fecho)

---

## 6.1 Resultado: **46 OK / 0 FALHA**

| bloco | o que verifica | resultado |
|---|---|---|
| 1 | 20 entregáveis existem e não estão vazios | 20/20 |
| 2 | o gate tem as **duas** condições e **não** a versão mutada; `md5(hook) == 7bbc1625…`; a **reconstrução** do estado pré-correcção dá `a2cd8446…` | 4/4 |
| 3 | o ficheiro de testes tem **14 testes**; o (c) mantém a asserção «o APK actual deixou de comprar por PIX»; o teste do **estado `erro`** está lá; o **106e mudou só nos aliases** (10 inserções, 0 remoções, nenhuma asserção — contagem lida do `--numstat`) | 4/4 |
| 4 | **controlos positivos** (o script tem de saber dizer FALHA) | 3/3 |
| 5 | DEBT-037…041 registadas; `CLAUDE.md` com o registo; a **errata REFUTADA** à vista no log do 110i.1 | 7/7 |
| 6 | «nada que não devia mudar mudou»: `MinhaCarteira.jsx` e `ComprarPasseModal.jsx` **inalterados** vs baseline; os 5 ficheiros criados pelo 110i.1 **não existiam** no baseline (`git cat-file -e` falha) — logo não podem ter sido «alterados» | 8/8 |

## 6.2 Controlos positivos (o que dá valor ao verde)

1. **a verificação do gate REPROVA o texto mutado** — aplicando o D3 em memória, o check do gate falha
   (se passasse, o detector era cego e o check nº 2 não valia nada);
2. **ficheiro inexistente ⇒ `existsSync` false**;
3. **a reconstrução SEM a troca do gate DIVERGE** do md5 do pre-fix — prova que o md5 da reconstrução
   morde (sem isto, o check nº 2 poderia dar OK com qualquer conteúdo).

## 6.3 ⚠️ A 1.ª corrida do script deu 4 FALHAS — todas erros do MEU instrumento

Declaradas (não escondidas), porque um instrumento que erra 4 vezes em 46 checks **não** é um
instrumento em que se confia sem verificação:

| erro | o que estava mal | correcção |
|---|---|---|
| **E-1** | usei `11` como nº de linhas adicionadas ao 106e; o `--numstat` diz **10** | ler a contagem do git (e fixá-la em 10) |
| **E-2** | o controlo positivo nº 3 estava **invertido** (reconstruía SEM a troca do gate — que é o que **dá** o md5 do pre-fix — e eu exigia que divergisse) | reescrito: a reconstrução **sem** a troca do gate **tem** de divergir |
| **E-3** | procurei o literal `UTAC110i.1b` no `CLAUDE.md`, mas o registo diz `UTAC110i/110i.1 + 110i.1b` (o «UTAC» só precede o primeiro) → falso negativo | procura por `110i.1b` **e** `isPagamentoNativoAtivo` |
| **E-4** | tratei `scripts/mc110i1d-prova-mutacao.mjs` como «ficheiro que já existia no baseline» quando ele **não existia** (é do 110i.1) | passou a ser conferido como **NOVO** |

Depois das correcções: **46 OK / 0 FALHA**. (Nenhuma das 4 falhas era defeito do UTAC — mas
**também não se sabe isso sem as corrigir**, e é isso que o SEG6 existe para provar.)

## 6.4 Fecho

- Entregáveis: todos presentes (bloco 1) · Formatos: md/txt válidos, scripts `node --check` OK.
- Suíte: verde (SEG2).
- Disco: inalterado (não é gargalo).
- Validador adversarial: veredicto **APROVADO COM RESSALVAS** (SEG3), com os achados tratados.
- Commit final + push em foreground (GATE 10).
- O próximo UTAC pode arrancar com a skill: nenhum estado deste UTAC ficou pendente fora do `DEBT.md`.
