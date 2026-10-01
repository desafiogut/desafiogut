# UTAC000 — SEG-1 · Medição (2026-09-30)

**UTAC = Unidade de Trabalho Auto Contido.** Este é o UTAC fundacional: cria a
Skill UTAC01 em `desafio-gut/frontend/skills/utac01/`. Nada foi alterado neste segmento.

## -1.1 Estado do repo
- `git log --oneline -1` → **`160bf09`** «chore(MC105a.1): SEG5 verificacao em producao…»
- Branch `main`.
- ⚠️ **DESVIO DECLARADO:** o enunciado declara baseline **`2f472c0`** («+ locais do UTAC105a.1»).
  O baseline real é **`160bf09`**: o UTAC105a.1 **fechou** com 5 commits depois do `2f472c0`:
  `4367b7d` · `e424d51` · `4a54e68` · `f515f26` · `160bf09`. O `2f472c0` existe (é o SEG5 do MC105a).
  Medido, não presumido.
- `git status --short` → **1 ficheiro modificado** (`desafio-gut/frontend/package-lock.json`,
  pré-existente, não é deste UTAC) + **30 `?? _logs/MC*` não rastreados** (logs históricos).
  Nenhuma alteração de produção pendente.

## -1.2 `skills/` não existe
- `ls desafio-gut/frontend/skills/` → **`No such file or directory`** (erro esperado).
- Observação: existe `.claude/skills/` (ecossistema Claude Code, 20+ skills genéricas) —
  **não é** o alvo e não é tocado. A skill UTAC01 nasce em `desafio-gut/frontend/skills/utac01/`.

## -1.3 UTACs disponíveis (fonte de conteúdo)
- `_logs/` tem **315 ficheiros**; a série recente (MC100+), por ordem:
  MC100 · MC101 · MC102 · MC102.0 · MC102.1a · MC102.1b · MC103 · MC104 · MC104.1 · MC104.2 ·
  MC104.3 · MC105a · MC105a.1 — **13 UTACs da série nova** (o enunciado diz 11; medido: 13).
- Relatórios de fecho em `_logs/*-RELATORIO.md` (49) e cópias em `Desktop/MC*_SEG*.md`.

## -1.4 Os 3 UTACs-fonte identificados (de onde se extrai o quê)
| UTAC | Ficheiros | Dá à skill |
|---|---|---|
| **MC105a** | `_logs/MC105a_{SEG-1_MEDICAO,SEG0,SEG1,SEG2,SEG3_VALIDADOR}.md`, `MC105a-RELATORIO.md` | **HARD GATES 1-16 + MECANISMO SEG-1..SEG6** — o exemplo mais completo da série; tabela HG1..HG16 no relatório (l.24-31) |
| **MC104.3** | `_logs/MC104.3_{SEG-1_MEDICAO,SEG0,SEG1,SEG2,SEG3,SEG4_VALIDADOR,SEG6_VERIFICACAO}.md` | **LGPD** (anonimizar ≠ apagar, NF-e preservada, pseudónimo vs anónimo, `anon:<sha256>`) + padrão do validador (achados ⚠️/ℹ️ + mutantes RED) |
| **MC102.1b** | `_logs/MC102.1b_{SEG-1_MEDICAO,SEG0_FRENTE-0,SEG1-3_FRENTES-A-B-C,SEG4_FRENTE-D,SEG5_VALIDADOR}.md` | **integração externa** (PoC com controlo positivo antes de tocar, segredo nunca impresso, fail-closed, idempotência de webhook) |

## -1.4b Suíte (medida depois, no SEG6 — declarada aqui por GATE 2)
`node scripts/mc966-suite-harness.mjs ambos` (do **raiz** do repo — o harness NÃO está em
`frontend/scripts/`) → **frontend VERDE 530/530 · backend VERDE 885/891. VEREDITO VERDE.**
⚠️ O enunciado do UTAC000 declara «backend 874/880». Esse número é o do **MC105a**; o
`MC105a.1_SEG5_VERIFICACAO.md:10` declara **885/891** (o MC105a.1 acrescentou 11 testes). O medido
agora bate com o fecho do MC105a.1 ⇒ o número do enunciado está **desactualizado**, não há regressão.

## -1.5 Disco
`df -h /c` → **17 G livres** (≥ 5 GB). **SEGUE.**

## -1.6 Ambiente medido
- `node --version` → **v24.14.1**
- `.gitattributes`: `*.md` e `*.yml` = **LF**; `*.mjs`/`*.js`/`*.cjs`/`*.json` = LF; `*.jsx` = CRLF (regra da série).
- Harness da série disponível: `scripts/mc966-suite-harness.mjs`; provas de mutação `scripts/mc*-prova-mutacao.mjs`.

## -1.7 VEREDITO DO SEG-1: **SEGUIR**
Todas as premissas confirmadas, com 1 desvio declarado (baseline `2f472c0` → real `160bf09`) e
1 correcção de contagem (11 → 13 UTACs da série). Nenhum bloqueio. Avança para SEG0 (Frente A).
