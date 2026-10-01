# UTAC000 — SEG1 · Frente B: Tipos (variações) (2026-09-30)

## 1.1 Baseline
Os 6 tipos definidos no enunciado do UTAC000: `diagnostico` · `publicacao` · `produto` · `infra` ·
`lgpd` · `saneamento`. Cada tipo = uma variação do UTAC com critérios concretos próprios.

## 1.2..1.7 Ficheiros criados
| tipo | bytes | gates extra | exemplos citados |
|---|---|---|---|
| `diagnostico.md` | 1552 | nenhum (A/B → A/B de ficheiros; mutação → controlo do medidor) | UTAC100 |
| `publicacao.md` | 1510 | A/B pareado do servido, deploy foreground, `--build` | UTAC101 |
| `produto.md` | 1739 | idempotência, E2E, concorrência, preservação fiscal | UTAC102, UTAC105a, UTAC106 |
| `infra.md` | 1809 | migração autorizada, flags default seguro, REVOKE D/T, CAS, duplo do `dist/` | UTAC102.0, UTAC103, UTAC105a.1 |
| `lgpd.md` | 2364 | exportação só do titular, sem PII em logs, anonimizar≠apagar, NF-e intacta | UTAC104, UTAC104.2, UTAC104.3 |
| `saneamento.md` | 1702 | A/B por pendência, preservação do funcional, lista fechada | UTAC105a.1 |

Cada tipo tem **estrutura uniforme de 6 secções**: descrição · gates extra · segmentos típicos ·
autorizações típicas · ficheiros típicos · exemplos · prompt de arranque (7 blocos `##` por ficheiro,
medido igual em todos).

## 1.8 Teste bidirecional
| verificação | resultado |
|---|---|
| (a) os 6 tipos existem | **OK** — `ls types/*.md` → 6 |
| (b) tipo inexistente falha | **OK** — `types/inexistente.md` ausente |
| (c) estrutura uniforme | **OK** — 6 secções `##` em cada um |
| (d) auto-contido | **OK** — cada tipo descreve o contexto que usa (não manda «ver o UTAC X» para o critério; só cita exemplos) |
| (e) fim de linha | **OK** — 6/6 LF |

## ⚠️ Nota para o operador (R20)
O enunciado mapeia **UTAC105a.1 a DOIS tipos** (`infra` e `saneamento»). Não é conflito: o
UTAC105a.1 é um saneamento **de infraestrutura** — os dois tipos descrevem-no legitimamente por
ângulos diferentes. Fica registado, sem alteração.

## 1.9 VEREDITO DO SEG1: **SEGUIR** — Frente B fechada.
