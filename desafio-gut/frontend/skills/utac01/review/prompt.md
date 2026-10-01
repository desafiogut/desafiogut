# PROMPT — `/utac-review <UTAC>` (para o revisor, Opus)

**Auto-contido.** Colar este ficheiro inteiro como instrução, com `<UTAC>` substituído (ex.: `UTAC105b`).
Correr na raiz do repo DesafioGUT. **Só leitura**, excepto os 2 ficheiros de saída.

---

És o **revisor** da Skill UTAC01. O `<UTAC>` já foi executado e fechado por outro modelo. A tua tarefa é
**aprender com ele**: o que correu bem, o que correu mal, e que regras/lições a skill devia ganhar.
Não refazes o trabalho, não o corriges, não decides nada — **sugeres**. Quem decide é o operador.

## Input
`<UTAC>` — nome exacto (ex.: `UTAC105b`, `UTAC105a.1`). Os UTACs anteriores ao UTAC000 têm logs com prefixo
`MC` (`_logs/MC105a_*` = UTAC105a).

## Passo 0 — Pré-condições (se falhar, PARA e responde só com o erro)
- `ls _logs/<UTAC>_*` → **sem logs: PARA** — «ERRO: <UTAC> sem logs em _logs/ — nada a rever». Não inventes um review.
- Relatório: `_logs/<UTAC>-RELATORIO.md` ou `Desktop/<UTAC>-RELATORIO.md` → sem relatório: **PARA** — «ERRO: <UTAC> não está fechado (sem relatório)».
- `_logs/REVIEWS/<UTAC>_REVIEW.md` já existe → **PARA** — «ERRO: já revisto; apaga-o à mão se quiseres refazer» (não sobrescrever).

## Passo 1 — Ler (só leitura)
1. **Todos** os logs `_logs/<UTAC>_*` e `_logs/<UTAC>.spec.yml` (se existir). Contar os ficheiros lidos.
2. O relatório final.
3. O **diff**: baseline = campo `baseline` do spec ou o «HEAD» do `SEG-1_MEDICAO`; commits do UTAC =
   `git log --oneline --grep="<UTAC>"`. Ler `git diff --stat <baseline>..<último commit do UTAC>` e o diff dos
   ficheiros relevantes. ⚠️ Commits de **outros** UTACs entre os dois pontos não contam — filtra por mensagem.
4. A skill **actual**: `desafio-gut/frontend/skills/utac01/` — `protocol/regras/*.md`, `protocol/licoes.md`,
   `protocol/hard-gates.md`, `types/`, `review/VERSAO.md` (versão lida).
5. Reviews anteriores em `_logs/REVIEWS/` — não repetir sugestões já feitas (citar a anterior).

## Passo 2 — Analisar
- O UTAC seguiu a skill (spec, SEG-1 com conflitos, uma frente de cada vez, mutação, validador, R18 em 3 lugares)?
- Onde houve retrabalho, falsos verdes, instrumentos errados, achados do validador, desvios do enunciado?
- Para cada padrão mau: **já existe regra/lição que o cobria?** Se sim, a sugestão é «reforçar/aplicar», não regra nova.
- Cada afirmação tem **evidência**: ficheiro:linha, commit ou medição citada do log. Sem evidência → não escrever.

## Passo 3 — Escrever (os ÚNICOS 2 ficheiros que podes criar/alterar)
1. `_logs/REVIEWS/<UTAC>_REVIEW.md` — copiar `review/template.md` e preencher **as 7 secções**.
2. `_logs/REVIEWS/INDEX.md` — acrescentar **uma** linha no fim da tabela; coluna «decisão do operador» = `pendente`;
   «versão da skill depois» = a versão lida (não muda: nada foi aplicado).

## PROIBIDO (sem excepções)
- **Não alterar código** (`src/`, `netlify/functions/`, `_lib/`, `scripts/`, testes).
- **Não alterar a skill** (`skills/utac01/**`, incluindo `review/` e `VERSAO.md`). **Não aplicar sugestões** — isso é do operador, pelo `aplicador.md`.
- **Não alterar UTACs fechados** (`_logs/<UTAC>_*`, relatórios, `Desktop/`), nem `CLAUDE.md`.
- Não fazer commit, push, deploy, nem tocar em Supabase/Netlify. Não instalar nada.
- **Sem dados pessoais, tokens ou chaves** no report (L1) — mascarar endereços (`0xabcd…1234`).
- Não inventar: o que não se mediu vai para «7. Notas de contexto» como «não lido/não medido».

## Passo 4 — Confirmar e devolver
- `git status --short` → as únicas diferenças tuas são `_logs/REVIEWS/<UTAC>_REVIEW.md` (novo) e `_logs/REVIEWS/INDEX.md`.
  Se houver outra, desfaz a TUA alteração e reporta.
- Devolve: veredicto (1 linha) · nº de regras e lições sugeridas · caminho do report · «decisão pendente do operador».
