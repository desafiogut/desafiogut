# UTAC110i.1b — SEG5 (CONSOLIDAÇÃO E RELATÓRIO FINAL)

**Auto-contido.** Consolidação dos segmentos + fecho do UTAC. HARD GATES 10, 11, 13, 14, 16.

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16 · Commit da frente: `49eca17` · Commit de fecho: (este)

---

## 5.1 Artefactos deste UTAC (todos em `_logs/`)

| ficheiro | conteúdo |
|---|---|
| `UTAC110i.1b_SEG-1_MEDICAO.md` | RAM (938/939/939), o hang medido (≥ 90 s) e o ficheiro inteiro antes da correcção (5 ✔ + pendura) |
| `UTAC110i.1b_SEG0_FRENTE-A-DIAGNOSTICO.md` | as 5 hipóteses testadas, a sonda do ramo, a causa com `ficheiro:linha`, a PROVA POR RECONSTRUÇÃO (§0.7) e o falso verde do SEG2 do 110i.1 |
| `UTAC110i.1b_SEG1_FRENTE-B-FECHO.md` | 13/13 → 14/14, mutação 8/9 → 9/9, o teste que mata o D7, atribuição dirigida, e a nuance do RED por pendura |
| `UTAC110i.1b_SEG1_MUTACAO.txt` | as DUAS corridas do instrumento (8/9 e 9/9) |
| `UTAC110i.1b_SEG1_PROVA-D7.txt` | prova dirigida do D7 (controlo 14/14 · D7 13/14 · restauro) |
| `UTAC110i.1b_SEG2_VERIFICACAO.md` + `_SEG2_saida.txt` + `_SEG2_build.txt` | 106e 19/19 · 110d+110e 45/45 · frontend 1148/1148 · backend 1310/1316 · build ✓ |
| `UTAC110i.1b_SEG3_VALIDADOR.md` | veredicto **APROVADO COM RESSALVAS** (transcrito verbatim) + tratamento de cada achado |
| `UTAC110i.1b_SEG4_LIMPEZA.md` + `_SEG4_WRAPPER.txt` | limpeza, decisão sobre o wrapper (mantido + guarda de backup, medido 9/9 e md5 intacto) |
| `UTAC110i.1b_SEG5_VERIFICACAO.md` | este |
| `UTAC110i.1b_SEG6_VERIFICACAO.md` + `_SEG6_saida.txt` | verificação ad-hoc (46 OK / 0 FALHA, com 3 controlos positivos) |
| `UTAC110i.1_SEG2_FRENTE-D.md` (§2.8) | **errata** do UTAC110i.1: as 3 afirmações REFUTADAS, mantidas à vista (GATE 15) |
| `_logs/DEBT.md` (DEBT-037…041) | pendências declaradas |

## 5.2 Re-confirmação depois das correcções pós-veredicto

Depois de tratar os achados do SEG3 (citações de linha + nota de cobertura no ficheiro de testes):

```
md5 do ficheiro de testes: 328edc99db88a310cb3bffe80e4bd63c
ℹ tests 14 · pass 14 · fail 0
```

(antes das correcções pós-veredicto o md5 era `928ac3141e9a789da43af772465dfd3e`, também 14/14).
**Só comentário foi acrescentado — nenhuma asserção mudou**; fica declarado como **não re-validado**
por um 2.º validador (regra do `segments/seg4.md`).

## 5.3 Decisões do executor (R18-equivalente) — **os 3 lugares**

| # | decisão |
|---|---|
| D-1 | O gate repõe o contrato **já declarado** pelo UTAC110i.1 (não é decisão nova). |
| D-2 | `scripts/run-mut110i1d.sh` **MANTIDO** e com **guarda de backup** (.bak fora do repo + md5 no fim). |
| D-3 | RAM abaixo do portão A14 = **desvio declarado**, não corrigido (não é defeito de produto). |
| D-4 | As 5 pendências entram em `DEBT.md` (DEBT-037…041) em vez de serem resolvidas aqui — as autorizações deste UTAC não cobrem nenhuma. |
| D-5 | Temporários de diagnóstico **removidos** no fim (padrão do operador); o que mediram está nos logs. |

**3 lugares:** (i) `_logs/` (este log + os segmentos) · (ii) `Desktop/RELATORIO-UTAC110i.1b.txt` ·
(iii) `CLAUDE.md` (cabeçalho «Atualizado em: 2026-10-16 …»).

## 5.4 Errata no log de OUTRO UTAC (GATE 15 — manter o errado à vista)

`_logs/UTAC110i.1_SEG2_FRENTE-D.md` ganhou a **§2.8** com as três afirmações REFUTADAS por medição
(prova de mutação «FEITA» · «9/9 RED» · o gate declarado no texto que o código não tinha). O texto
antigo **não foi apagado** — ficou marcado como REFUTADO.

## 5.5 Pendências (não executadas — nunca escondidas, GATE 11)

`DEBT-037` (LGPD de `google_play_compras`) · `DEBT-038` (migração não aplicada) · `DEBT-039` (env
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ausente no Netlify) · `DEBT-040` (RAM abaixo do portão A14) ·
`DEBT-041` (instrumentos de mutação sem guarda de backup fora do processo).

**Desvios declarados (não são pendencias de produto):** RAM no arranque abaixo do portão; «12/13
testes» do enunciado não reproduzível (medido: 5 completam-se e o 6.º pendura); a prova de mutação do
SEG2 do UTAC110i.1 nunca correu.

## 5.6 Commit + push (GATE 10)

Ficheiros **individuais** (`git add <ficheiro>` um a um), **nunca `git add -A`**; push em **foreground**.
O commit `49eca17` levou o trabalho do UTAC110i.1 (que estava por commitar) + a frente deste UTAC; o
commit de fecho leva o `DEBT.md`, a errata e todos os logs do 110i.1b. Ver §5.7 do relatório do Desktop.
