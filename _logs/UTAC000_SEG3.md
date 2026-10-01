# UTAC000 — SEG3 · Frente D: Comandos + documentação + teste (2026-09-30)

## 3.1..3.3 Ficheiros criados
| ficheiro | bytes | conteúdo |
|---|---|---|
| `SKILL.md` | 4390 | entry point: o que é a Skill UTAC01, como se usa, árvore das pastas, como compor, como evoluir, regras herdadas |
| `comandos.md` | 2290 | `/utac-run` · `/utac-validate` · `/utac-close` · `/utac-new` · `/utac-types` (lê/faz/escreve/PARA-se) |
| `exemplo.spec.yml` | 1659 | spec `UTAC999-demo`, tipo `diagnostico`, ~40 linhas, YAML válido |
| `exemplo.UTAC.md` | 8498 | UTAC completo **gerado** do spec (CONTEXTO → HARD GATES → REGRAS → FRENTES → SEG-1 → SEG0-3 → SEG4 → SEG5-6 → entrega) |

## 3.5 Teste bidirecional + mutação da própria skill
Script ad-hoc `C:/Users/Moltbot/tmp-utac000/utac000-valida-spec.mjs` (fora do repo, corre 1×).

**Bidirecional do spec:**
| caso | esperado | medido |
|---|---|---|
| `exemplo.spec.yml` | VÁLIDO | **VALIDO** ✅ |
| estrutura do `exemplo.UTAC.md` | 8/8 secções | **8/8 OK** ✅ |
| o `type` do spec tem ficheiro em `types/` | existe | **`types/diagnostico.md` OK** ✅ |

**Mutação (HARD GATE 7 adaptado — a skill TEM de detectar o spec adulterado):**
| mutante | introduzido | resultado |
|---|---|---|
| M1 | removido `baseline` | **INVALIDO: campo obrigatorio ausente: baseline** ✅ |
| M2 | `type: inventado` | **INVALIDO: tipo desconhecido: inventado** ✅ |
| M3 | removido `proibe` | **INVALIDO: campo obrigatorio ausente: proibe** ✅ |
Saída: `todos os casos como esperado`, exit 0. Controlo positivo: o spec original passa a VÁLIDO
(o medidor não diz «INVALIDO» a tudo).

## 3.6 Completude da skill (medida)
`find skills/utac01 -type f` → **20 ficheiros** = 5 protocolo + 6 tipos + 4 segmentos + 5 de topo
(`SKILL.md`, `comandos.md`, `spec-template.yml`, `exemplo.spec.yml`, `exemplo.UTAC.md`).
Bate com a ENTREGA FINAL do enunciado.

## 3.7 VEREDITO DO SEG3: **SEGUIR** — Frente D fechada. Skill completa (20/20 ficheiros).
