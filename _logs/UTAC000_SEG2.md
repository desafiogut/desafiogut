# UTAC000 — SEG2 · Frente C: Segmentos + template do spec (2026-09-30)

## 2.1..2.4 Segmentos criados
| ficheiro | bytes | o que define |
|---|---|---|
| `segments/seg-1.md` | 1962 | medição: passos `-1.x`, disco, veredito SEGUIR/PARAR/AJUSTAR, secção obrigatória de conflitos (R20) |
| `segments/seg0-3.md` | 1786 | frente: PoC → correcção → bidirecional → A/B pareado → mutação → regressões → relatório |
| `segments/seg4.md` | 2017 | validador adversarial: worktree próprio, input, «TENTAR REFUTAR», foco, veredicto, tratamento |
| `segments/seg5-6.md` | 2082 | verificação em produção + fecho: script ad-hoc 1×, controlo positivo, consolidar logs, R18, R14, commit |

## 2.5 `spec-template.yml` (3183 B, YAML válido)
Campos **obrigatórios** (todos presentes): `name` · `title` · `type` · `baseline` · `motivo` ·
`frentes` · `autoriza` · `proibe` · `dependencias`.
Campos **opcionais**: `ressalvas` · `subdivisoes`.
Extra: `schema: utac/1` (versão do formato). Comentários em cada campo explicam o que preencher.

## 2.6 Teste bidirecional
| verificação | resultado |
|---|---|
| (a) os 4 segmentos existem | **OK** — 4/4 |
| (b) todos os campos obrigatórios presentes | **OK** — `all(req in present)` = True |
| (c) campo inexistente falha | **OK** — `zona` não existe (negativo) |
| (d) YAML válido | **OK** — lint `ok` no `write_file` + parse dos campos de topo |
| (e) fim de linha | **OK** — LF em todos |

## Nota (R20)
O `spec-template.yml` inclui um campo extra `schema: utac/1` que **não estava na lista** do enunciado.
É metadado de versão do próprio formato (P5/Ponytail: 1 linha, evita ambiguidade futura), não uma
feature. **Se o operador não quiser, é 1 linha a remover.**

## 2.7 VEREDITO DO SEG2: **SEGUIR** — Frente C fechada.
