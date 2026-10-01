# UTAC000.2 — SEG4 Validador adversarial — commit sob teste `753e054` (só o diff próprio: 16 ficheiros, +526)

Worktree isolado (detached em `753e054`, restaurado); `828f719` (UTAC105b.1, outra sessão, intercalado) fora da avaliação.

## Veredicto: **APROVADO COM RESSALVAS** — 4 frentes presentes, só acrescenta, nada aplicado, âmbito limpo, citações do review todas correctas.
Refutações: o prompt à letra dava o diff errado; o verificador era estreito (13/14 mutantes do validador sobreviveram).

## Focos
1 Prompt completo — **REFUTADO (parcial)**: `--grep=UTAC105b` devolvia 6 commits (casa `UTAC105b.1` e o `753e054` que só menciona); «filtra por mensagem»
não se aplica a `git diff A..B`; UTACs com prefixo MC → «sem logs» falso e 0 commits; não lia `ambiente.md` nem o `CLAUDE.md`.
2 Proibições — CONFIRMADO (ressalva: a proibição de `CLAUDE.md` não era verificada — V14). 3 Template — CONFIRMADO, lacuna: sem «já coberta por?» nas lições.
4 Aplicador — CONFIRMADO no essencial; ⚠️ contagens por categoria não nomeadas; ⚠️ numeração das lições contraditória (fim da secção + contínua → 1…7, 19, 8…18).
5 Review do UTAC105b — citações **todas conferem**; L1 ok; nada aplicado; **deduplicação falhou** em T-novo-1 (T3 + lição 10), T-novo-2 (`CLAUDE.md` MC95.1),
L-novo-1 (lição 1), L-novo-2 (lição 16).
6 Verificador — **REFUTADO**: 13/14 sobreviventes (V1 ficheiro apagado, V2 hard-gates, V3 61→64, V14 CLAUDE.md, V4 §4 vazia com tabela no fim, V5 e-mail/CPF,
V6 changelog 2.0, V7 sem filtro, V8 sem reviews anteriores, V11 sem desfazer, V9/V12 template, V10 reescrever regras); «nada aplicado» ancorado em HEAD (não no
baseline) e só 11 ficheiros; verificações D ficam VERMELHAS após a 1.ª aplicação legítima (teste pontual não declarado).
7 Âmbito — CONFIRMADO (16 ficheiros autorizados; `scripts/utac0002-*` declarados). 8 AU3 — CONFIRMADO, sem excesso.
ℹ️ `/utac-review` ausente de `comandos.md` (coerente com a autorização) · R18-A ainda não no `CLAUDE.md` (fecho).

## Não medido
Review por um Opus realmente «fresco» · aplicador ponta a ponta · verificador com cwd fora do repo · suíte completa.

---

## Resposta do executor (correcções, R15)
| achado | correcção |
|---|---|
| ⚠️-1 diff errado | `prompt.md` Passo 1.3: commits por **âmbito exacto** `tipo(<P>):` (`grep -E "\(<P>\):"`, testado: `\(UTAC105b\):` → só os 4; `\(MC105a\):` não apanha `MC105a.1`); diff = **união de `git show --stat <commit>`**; lista de commits declarada no report |
| ⚠️-2 prefixo MC | `<P>` = `<UTAC>` ou com `UTAC`→`MC`; usado no Passo 0 (`ls _logs/<P>_*`), relatório, logs e grep |
| ⚠️-3 verificador estreito | D ancorado no baseline FIXO `5e7ed24`: os **30** ficheiros da skill (`git ls-tree`) iguais, ficheiro apagado = falha, `SKILL.md` = baseline + exactamente o ponteiro; §4/§5 verificadas na própria secção; L1 apanha 0x, e-mail, CPF, JWT; changelog sem nenhuma versão ≠ 1.0; B/C/A com as frases novas. Declarado no código: **D é teste pontual do UTAC000.2** |
| ⚠️-4 deduplicação | prompt manda ler `ambiente.md` + `CLAUDE.md` e preencher «já coberta por?»; review reclassificado: T-novo-1 = reforço da T3, T-novo-2 = migrar `CLAUDE.md:1816`, L-novo-1 = reforço da lição 1, L-novo-2 = refinamento da 16 → **1 regra e 1 lição realmente novas** (INDEX actualizado) |
| ⚠️-5 numeração | aplicador §2: lição nova vai para o fim da **última** secção (numeração contínua); secção sugerida entre parênteses; nunca renumerar |
| ℹ️-1 faixas | aplicador §1.6 nomeia total **e** faixa da categoria nos 3 ficheiros + `grep` de confirmação |
| ℹ️-2 | declarado no verificador (comentário) |
| ℹ️-3 | não feito (fora da autorização: `comandos.md`) — candidato |
| ℹ️-4 | no fecho (SEG5) |

Prova: verificador **VERDE 45/45**; mutação **43/43** (inclui os 14 do validador: V1–V6, V7, V8, V9, V10, V11, V12, V14 + novos V15–V17), controlo cópia intacta VERDE
(`_logs/UTAC000.2_SEG4_mutacao_saida.txt`). ⚠️ Instrumento: 2× um `node -e` com escapes falhou ANTES de escrever (nada parcial); a 1.ª corrida do D-V4 usou a
mutação antiga (inócua) e «sobreviveu» — refeita com o mutante real → morto. Edições de scripts passaram a ser feitas com a ferramenta de edição.
