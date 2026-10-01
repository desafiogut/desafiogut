# UTAC105b.3 — SEG4 · Consolidação, decisões e provas por HARD GATE (2026-10-01)

## 4.1 O que este UTAC entrega
Fecha a pendência **V-4** declarada pelo UTAC105b.2: o `endereco` do CORPO no ramo
`register-corporativo` definia o `clienteId` **sem prova de posse**, permitindo a um **anónimo**
pré-criar/poluir uma cota corporativa no endereço de outra pessoa.

**Entregáveis (todos versionados no git — GATE 14):**
| entregável | estado |
|---|---|
| `desafio-gut/frontend/netlify/functions/cotas.mjs` | guarda de posse no ramo `register-corporativo` (**+32 / −0**, 1 hunk, aditivo puro) |
| `_tests/utac105b3-register-endereco.test.mjs` | **novo**, 11 testes |
| `_tests/cotas-anti-fraude.test.mjs` | **R18-5/OPÇÃO A**: só o helper `reqRegister` (+18 / −14); asserções intactas |
| `_logs/UTAC105b.3_*` (10 ficheiros) | medição, PoC A/B, mutação, bidireccional, validador, SEG4-SEG6 |
| `CLAUDE.md` | cabeçalho actualizado (P5/R14) |
| `Desktop/UTAC105b.3-RELATORIO.md` | relatório de fecho |

## 4.2 Decisões registadas (P4/R18) — 3 lugares
| decisão | conteúdo | origem | registada em |
|---|---|---|---|
| **R18-5** | **OPÇÃO A** — autorizado editar `_tests/cotas-anti-fraude.test.mjs` **apenas** no helper `reqRegister` (+12 `await`); asserções intactas; suíte esperada 535/535 · 967/973 | operador, 2026-10-01 (autorização formal) | `_logs/UTAC105b.3_SEG-1_MEDICAO.md` §-1.12 · `CLAUDE.md` · `Desktop/UTAC105b.3-RELATORIO.md` |

**Como se chegou a R18-5 (GATE 12 / AU3):** a correcção fez a suíte canónica ficar **VERMELHA (7 falhas)**,
porque `_tests/cotas-anti-fraude.test.mjs` (ficheiro **pré-existente**, **fora** da lista `autoriza`) tinha
7 testes que registavam por «anónimo + `endereco` no corpo» — o contrato exacto que o V-4 fecha. O executor
**não decidiu**: parou (ST4), foi autorizado o desbloqueio e o operador escolheu **A** entre A/B/C.
Este UTAC é a retoma dessa paragem.

## 4.3 Provas por HARD GATE
| gate | resultado medido | onde |
|---|---|---|
| 1 MEDIR ANTES DE CRIAR | baseline `00610b0` = `origin/main`, 0 commits à frente; suíte 535/535 · 956/962 VERDE; disco 21 GB | `_logs/..._SEG-1_MEDICAO.md` §-1.1/-1.11 |
| 2 NÃO INVENTAR | todos os números vêm de comando/ficheiro citado; **6 testes `skipped` não enumerados um a um ⇒ declarado como pendência**, não preenchido | SEG-1 §-1.11, SEG5 §5.4 |
| 3 ESCOPO CIRÚRGICO | só 3 ficheiros de código + logs; **1 hunk** em `cotas.mjs`, aditivo puro | SEG6 §6.2 |
| 4 NÃO ALTERAR O QUE FUNCIONA | V3/V4/V6 inalterados no A/B; `update-corporativo` e POST genérico intactos; asserções do legado byte-iguais | SEG0, SEG6 §6.3 |
| 5 PONYTAIL | guarda de 13 linhas reutilizando `resolverChamador` do b.2; zero refactor | SEG0 «Frente B» |
| 6 UMA FRENTE DE CADA VEZ | A → B → C, cada uma medida antes da seguinte | SEG0 |
| 7 MUTAÇÃO (T1) | **5 mortos + 2 equivalentes declarados**; md5 restaurado em todos | `_SEG0_mutacao_saida.txt` |
| 8 BIDIRECIONAL | correcção → 11/11; **código antigo → 4 falham** (E1, E3, E8, E11) | `_SEG0_bidirecional.txt` |
| 9 VALIDADOR ADVERSARIAL | **APROVADO COM RESSALVAS** (0 ⚠️, 3 ℹ️ + 1 nota), ~20 vectores de bypass testados | `_SEG3_VALIDADOR.md` |
| 10 COMMIT FOREGROUND | commits nomeados, **nunca `git add -A`**; `git log origin/main..HEAD` conferido antes do push | §4.4 |
| 11 O UTAC FECHA | entregáveis + validador lido + logs + verificação ad-hoc com controlo positivo + pendências declaradas | SEG5, SEG6 |
| 12 O EXECUTOR NÃO CONCEBE | parou no conflito em vez de decidir; regra MC89.38 **reutilizada**, zero regra nova | SEG0, SEG3 «Foco 7» |
| 13 AUTO-CONTIDO | cada log explica-se isolado; nenhuma remissão a UTACs antigos | os logs |
| 14 VERSIONADO | entregáveis em `git ls-files` | commit final |
| 15 NÃO ALTERAR UTACs FECHADOS | `_logs/UTAC105b.1_*`, `_logs/UTAC105b.2_*`, `Desktop/RELATORIO-UTAC105b.3.txt` **não tocados** (o `-PARAGEM.txt` original já não existia — a passagem interrompida substituíra-o) | `git status` |
| 16 EXEMPLO FUNCIONAL | PoC real (handler real, duplos só nas fronteiras) + suíte canónica, não descrição | `_SEG0_poc_*.txt`, SEG6 §6.5 |

## 4.4 Commits
| commit | conteúdo |
|---|---|
| `945dcac` | `fix(UTAC105b.3)`: correcção V-4 + 11 testes + R18-5/OPÇÃO A + logs SEG-1/SEG0 |
| (2.º, de fecho) | achados do validador (comentários/precisão), SEG3-SEG6, `CLAUDE.md`, relatório |
| (3.º, separado) | renome da skill `UTAC01` → `UTAC` (pedido do operador, **fora do SPEC** deste UTAC — declarado) |

## 4.5 VEREDITO DO SEG4: **SEGUIR** para o fecho
