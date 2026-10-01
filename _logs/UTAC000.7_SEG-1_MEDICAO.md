# UTAC000.7 — SEG-1 · Medição da skill e do código — 2026-10-01

**Base:** `34b087b` = `origin/main`. **Objectivo:** escrever a regra **A12** (a lição do UTAC000.6).

## -1.1 Skill, antes
| item | valor |
|---|---|
| versão | **1.1** (`review/VERSAO.md`) |
| categorias | **10** |
| regras declaradas | **74** (`SKILL.md` ×3, `README.md` ×2) |
| `A-ambiente.md` | **A1-A11** (11 regras) |
| `HI-higiene.md` | HI1-HI10 (10) |

## -1.2 Código (a lição está aplicada e verde)
| item | valor |
|---|---|
| suíte frontend | **VERDE 535/535** |
| suíte backend | **VERDE 967/973** (6 `skipped` = DEBT-001) |
| `src/__tests__/_ponte-ssr.mjs` | **existe** |
| `_render.mjs` | carrega a ponte antes de qualquer componente (linha 74) |

## -1.3 Evidência preservada ANTES (HI10/GATE 5)
`_logs/UTAC000.7_SEG-1_EVIDENCIA.txt` — md5 e conteúdo integral de `A-ambiente.md` antes da alteração.
md5: `A-ambiente.md 0798b6e6e7df…` · `VERSAO.md d975f5a9e87c…` · `SKILL.md 681b8bbac21e…` · `README.md 093c411ad2dc…`

## -1.4 Saúde global (HI1)
Disco **18 GB** livres · suíte do backend intacta · nenhuma junction em uso · nenhum processo em execução ·
nenhum ficheiro de produção tocado.

## -1.5 VEREDITO DO SEG-1: **SEGUIR**
A skill está consistente antes da alteração e a lição está aplicada e verificada no código.
