# UTAC000.3 — SEG-1 · Medição e execução (2026-10-01)

**Natureza:** actualização da skill UTAC (**auto-referencial**, autorizada pelo operador — **sem UTAC
próprio**, R18 abaixo). **Fronteira:** só a skill e os ficheiros de dívida/versão. **Zero código de
produção.**

## -1.1 Estado do repositório (baseline medido)
| item | medido |
|---|---|
| `git rev-parse HEAD` | **`9f9c59d`** |
| `origin/main` | `9f9c59d` (sincronizado) |
| suíte | backend **967/973 VERDE** · frontend **25 falhas** (dívida `DEBT-004`, **não** deste UTAC) |
| working tree | 6 ficheiros do frontend (correcção parcial da regressão, **não commitada** — decisão do operador) + `package-lock.json` (pré-existente) |

## -1.2 O que este UTAC entrega
| entregável | estado |
|---|---|
| `skills/utac/protocol/regras/HI-higiene.md` | **novo** — departamento **HI**, 10 regras (HI1-HI10) |
| `skills/utac/protocol/regras/A-ambiente.md` | **+A9-A11** (armadilhas medidas no UTAC105b.3) |
| `skills/utac/protocol/regras/README.md` | 9→**10** categorias, 61→**74** regras (consistência; não pedido explicitamente — declarado) |
| `skills/utac/review/VERSAO.md` | **1.0 → 1.1** + changelog |
| `skills/utac/SKILL.md` | 10 categorias/74 regras + trigger «todo o UTAC lê `_logs/DEBT.md`» |
| `_logs/DEBT.md` | **novo** — registo único de dívida técnica (4 entradas) |
| `Desktop/UTAC000.3-RELATORIO.md` | relatório de fecho |

## -1.3 Verificações exigidas pelo spec
| verificação | esperado | medido |
|---|---|---|
| `grep -rn -i "utac01"` na skill | 0 | **0** ✅ |
| `grep -c "^## HI" HI-higiene.md` | 10 | **10** ✅ |
| `grep -c "^## A" A-ambiente.md` | 11 | **11** ✅ |
| `DEBT.md` markdown com tabela (6 colunas) | válido | **válido**, 4 entradas ✅ |
| marcadores | LF, sem BOM | **LF, sem BOM** ✅ |
| consistência de contagens | 10 categorias / 74 regras em SKILL+README+VERSAO | **coerente** ✅ |

**Nota de contagem:** o spec dizia «10 categorias em vez de 9» sem fixar o total. Como **A** passou de
A1-A8 para **A1-A11** (+3) e **HI** acrescenta **10**, o total correcto é **61 + 13 = 74** (não 71).

## -1.4 Desvio declarado (o executor não concebe)
1. **`protocol/regras/README.md` actualizado** — não constava da lista de entregáveis, mas declarava
   «9 categorias, 61 regras» e teria ficado a contradizer o `SKILL.md`. Correcção de consistência.
2. **`DEBT-004` acrescentada** ao `DEBT.md` — não constava das «entradas iniciais» pedidas (só as 3
   pendências do UTAC105b.3). É dívida de infraestrutura de severidade **alta**, descoberta no fecho
   daquele UTAC, e o `DEBT.md` é o lugar onde HI4/HI5 mandam registá-la. **Fica sujeita a veto.**

## -1.5 VEREDITO DO SEG-1: **FECHADO**
Entregáveis presentes · verificações passam · escopo respeitado (zero código de produção) ·
GATE 15 respeitado (nenhum UTAC fechado reescrito) · contratos das 61 regras existentes intactos
(só se acrescentou).
