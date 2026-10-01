# UTAC105b.1 — SEG6 · Fecho (2026-10-01)

## 6.1 Logs consolidados
`_logs/UTAC105b.1_`: `SEG-1_MEDICAO.md` · `SEG0.md` · `SEG1.md` · `SEG2.md` · `SEG3_VALIDADOR.md` ·
`SEG4.md` · `SEG5_VERIFICACAO.md` · `SEG6_VERIFICACAO.md` (+ `SEG5_saida.txt`, `SEG6_mutacao_saida.txt`).

## 6.2 P4/R18 — decisões em 3 lugares
| lugar | conteúdo |
|---|---|
| `_logs/UTAC105b.1_SEG-1_MEDICAO.md` | P10 accionado; perguntas ao operador |
| `_logs/UTAC105b.1_SEG1.md` | decisões **R18-1** (autorizar o frontend) e **R18-2** (aceitar/documentar o 403 das cotas `cnpj:`) |
| `Desktop/UTAC105b.1-RELATORIO.md` + secção `## UTAC105b.1` do **`CLAUDE.md`** (P5 aplicado — neste UTAC o `CLAUDE.md` **é** actualizável) |

## 6.3 Confirmação de fecho — entregáveis do enunciado
| entregável | estado |
|---|---|
| Frente A: fluxo actual medido e documentado | ✅ SEG0 (PoC com o handler real, 4 casos) |
| Frente B: `update-corporativo` autenticado (MC89.38) | ✅ 401 / 403 / admin / fail-closed |
| Frente C: A/B dos consumidores verde | ✅ dono e admin 200→200; suíte inalterada em frontend |
| Testes bidireccionais + mutação (T1/T4) | ✅ **18/18** testes · **10/10** mutantes RED · md5 restaurado |
| Validador adversarial + veredicto | ✅ **APROVADO COM RESSALVAS** (transcrito; 40 casos, 18 mutantes) |
| Deploy validado | ✅ commit `828f719` em `origin/main` **+ verificação em produção do operador** (sem token → 401; `GET /cotas` → 200) |
| `_logs/UTAC105b.1_*.md` + `Desktop/UTAC105b.1_*.md` | ✅ |
| `CLAUDE.md` actualizado (P5) | ✅ |
| Zero alterações fora do escopo | ✅ 3 ficheiros fora de `_logs/` (cotas.mjs, .jsx, teste) — provado ao carácter |

## 6.4 Commit final
`828f719` (já publicado por um push de **outro thread** — declarado). O commit de fecho leva os logs
SEG3-SEG6, os testes A17/A18 e o `CLAUDE.md`. ⚠️ **Antes do push:** `git log origin/main..HEAD` para
não arrastar commits de outras sessões (instrução do operador, 2026-10-01).

## 6.5 O UTAC105c pode arrancar?
**SIM, com uma ressalva.** A vulnerabilidade que motivou este UTAC está fechada e verificada em
produção. **MAS** o validador deixou **um P0 aberto fora do escopo** — o ramo irmão
`register-corporativo` continua a permitir que um anónimo **sobrescreva a cota de outra pessoa** (F1).
Recomendação: **resolver o P0 do `register-corporativo` antes de construir UI sobre o painel**
(UTAC105c é UI do cliente, não do lojista — logo não é bloqueante estrito, mas o painel do lojista é
vizinho directo). Escalado ao operador para decisão.

## 6.6 VEREDITO DO SEG6: **FECHADO** (o UTAC105b.1) · **1 P0 escalado** (fora do escopo, alheio a este commit).
